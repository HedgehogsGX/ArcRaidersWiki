import { b64url, sendPush, vapid } from './webpush.js';

// Files in dist/ are served before this runs, so it only sees requests with no
// matching file. With html_handling "none" that includes "/", mapped here to
// index.html; everything else falls through to the normal 404.
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') return env.ASSETS.fetch(new URL('/index.html', url));
    if (url.pathname.startsWith(NEWS_FULL)) return newsFull(request);
    if (url.pathname.startsWith(ALERTS_API)) return alertsApi(request, env);
    return env.ASSETS.fetch(request);
  },
  // The cron trigger in wrangler.jsonc, every 5 minutes.
  scheduled(controller, env) {
    return sendAlerts(env, controller.scheduledTime / 1000);
  },
};

const NEWS_FULL = '/news-full/';
const MEDIA = 'https://assets.arcraiders.com/media/';
const MONTH = 30 * 24 * 3600;

// /news-full/<file>: a full-size news image from assets.arcraiders.com/media/
// (the data-full links in content/news.js), served from this site. That host
// sends no CORS headers, so the image viewer couldn't save or share the file,
// and it doesn't load in mainland China. ?download makes the browser save it.
// Cloudflare Pages runs this through functions/news-full/[name].js.
export async function newsFull(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } });
  const url = new URL(request.url);
  const name = url.pathname.slice(NEWS_FULL.length);
  let file = '';
  try {
    file = decodeURIComponent(name);
  } catch {
    /* malformed escape: not found */
  }
  if (!/^[^/\\]+\.(jpe?g|png|webp|gif)$/i.test(file)) return new Response('Not found', { status: 404 });

  const upstream = await fetch(MEDIA + encodeURIComponent(file), { cf: { cacheEverything: true, cacheTtl: MONTH } });
  const type = upstream.headers.get('content-type') || '';
  if (!upstream.ok || !type.startsWith('image/')) return new Response('Not found', { status: upstream.status >= 500 ? 502 : 404 });

  const headers = new Headers({ 'content-type': type, 'cache-control': `public, max-age=${MONTH}`, 'x-content-type-options': 'nosniff' });
  for (const key of ['content-length', 'etag', 'last-modified']) if (upstream.headers.has(key)) headers.set(key, upstream.headers.get(key));
  if (url.searchParams.has('download')) headers.set('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file)}`);
  return new Response(request.method === 'HEAD' ? null : upstream.body, { headers });
}

// ---- map condition alerts by Web Push ------------------------------------------------
//
// assets/js/conditions.js posts a browser's push subscription and alerts to
// /api/alerts/subscribe (and /unsubscribe when the last alert goes); they are kept
// in the ALERTS KV namespace, one key per browser. Every 5 minutes the cron reads
// the published schedule and pushes each occurrence an alert covers whose moment to
// notify (its start, less the alert's lead) fell in those 5 minutes, after the
// server got the alerts; conditions.js leaves those to the push and notifies for
// the rest itself while a page is open. sw.js shows the pushed notification.
//
// Without the ALERTS binding the API answers 404, and conditions.js keeps alerts to
// open pages. Cloudflare Pages runs the API through functions/api/alerts/[action].js
// with the same namespace bound; only this Worker has the cron and the private key.

const ALERTS_API = '/api/alerts/';
const SUBJECT = 'https://github.com/HedgehogsGX/ArcRaidersWiki';
const LEADS = [0, 5, 10, 15, 30]; // minutes, as offered in conditions.js
const WINDOW = 5 * 60;
// conditions.js posts again at least weekly while its reader visits; a browser not
// seen for this long is dropped.
const KEEP = 90 * 86400;
const ID = /^[a-z0-9_-]{1,40}$/;
const MAX_ALERTS = 16;
// Push services of the browsers that support Web Push; anything else is refused so
// the cron only ever posts to them.
const PUSH_HOSTS = /(^|\.)(fcm\.googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;

const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const keyOf = async (endpoint) => `sub:${b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)))}`;

function pushEndpoint(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && PUSH_HOSTS.test(url.hostname) && value.length <= 1024 ? url.href : null;
  } catch {
    return null;
  }
}

const decodedLength = (s) => {
  try {
    return typeof s === 'string' && /^[\w-]+=*$/.test(s) ? atob(s.replace(/-/g, '+').replace(/_/g, '/')).length : 0;
  } catch {
    return 0;
  }
};

// The rules the cron matches, kept as the key's metadata so it can list them all
// without reading every value: region, lead (minutes) and [map, cond, since] per
// alert ('' for any; since in unix seconds).
function rules(body) {
  const alerts = Array.isArray(body.alerts) ? body.alerts : [];
  const valid = (s) => s === '' || ID.test(s);
  const list = alerts.filter((a) => a && valid(a.map) && valid(a.cond) && (a.map || a.cond)).map((a) => [a.map, a.cond, Math.floor(Number(a.since)) || 0]);
  if (!list.length || list.length !== alerts.length || list.length > MAX_ALERTS) return null;
  if (!LEADS.includes(body.lead) || !ID.test(body.region)) return null;
  return { r: body.region, l: body.lead, a: list };
}

// POST /api/alerts/subscribe { subscription, alerts, lead, region, lang } → { at }
// POST /api/alerts/unsubscribe { endpoint }
// `at` is when the server took over these alerts: it pushes what is due after it.
// Posting the same alerts again keeps `at`, so nothing is pushed twice or missed.
export async function alertsApi(request, env) {
  const action = new URL(request.url).pathname.slice(ALERTS_API.length);
  if (!env.ALERTS || (action !== 'subscribe' && action !== 'unsubscribe')) return json({ error: 'not found' }, 404);
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
  let body = null;
  try {
    const text = await request.text();
    if (text.length <= 8192) body = JSON.parse(text);
  } catch {
    /* not JSON: bad request */
  }
  const sub = body && action === 'subscribe' ? body.subscription : null;
  const endpoint = body && pushEndpoint(action === 'subscribe' ? sub && sub.endpoint : body.endpoint);
  if (!endpoint) return json({ error: 'bad request' }, 400);
  const key = await keyOf(endpoint);
  if (action === 'unsubscribe') {
    await env.ALERTS.delete(key);
    return json({ ok: true });
  }

  const meta = rules(body);
  const keys = (sub && sub.keys) || {};
  if (!meta || decodedLength(keys.p256dh) !== 65 || decodedLength(keys.auth) !== 16) return json({ error: 'bad request' }, 400);
  const old = await env.ALERTS.getWithMetadata(key);
  const same = old.metadata && old.metadata.r === meta.r && old.metadata.l === meta.l && JSON.stringify(old.metadata.a) === JSON.stringify(meta.a);
  meta.u = same ? old.metadata.u : Math.floor(Date.now() / 1000);
  // KV metadata holds at most 1024 bytes.
  if (JSON.stringify(meta).length > 1000) return json({ error: 'too many alerts' }, 413);
  const value = { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, lang: body.lang === 'zh' ? 'zh' : 'en' };
  await env.ALERTS.put(key, JSON.stringify(value), { metadata: meta, expirationTtl: KEEP });
  return json({ at: meta.u });
}

// content/map-conditions.js as this deploy published it; Workers Builds deploys
// every commit to main, the hourly schedule sync among them.
async function loadSchedule(env) {
  const res = await env.ASSETS.fetch('https://assets.local/content/map-conditions.js');
  if (!res.ok) return null;
  const text = await res.text();
  try {
    return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  } catch {
    return null;
  }
}

const named = (text, lang) => (text ? (lang === 'zh' && text.zh) || text.en : '');

// What sw.js turns into the same notification as notify() in conditions.js: the
// title is ready, the body is worked out when it shows, so its countdown and times
// are right for that moment and the reader's time zone.
function message(data, o, region, lang) {
  const query = new URLSearchParams({ map: o.map, cond: o.id });
  return JSON.stringify({
    title: `${named(data.conditions[o.id] && data.conditions[o.id].name, lang) || o.id} · ${named(data.maps[o.map], lang) || o.map}`,
    start: o.start,
    end: o.end,
    region,
    lang,
    tag: `${o.id}|${o.map}|${o.start}`,
    url: `pages/maps.html?${query}#conditions`,
  });
}

// One cron run: `at` is its scheduled time (unix seconds), and the window is the
// 5 minutes up to it, so consecutive runs neither overlap nor leave gaps.
export async function sendAlerts(env, at) {
  if (!env.ALERTS || !env.VAPID_PRIVATE_KEY) return;
  const data = await loadSchedule(env);
  if (!data || !Array.isArray(data.entries)) return;

  // Occurrences due in this window, per region and lead; most runs have none and
  // stop here without touching KV.
  const due = new Map();
  for (const [id, map, duration, starts] of data.entries)
    data.regions.forEach((region, r) => {
      const start = starts[r];
      if (!(start < data.until)) return;
      for (const lead of LEADS) {
        const moment = start - lead * 60;
        if (moment <= at - WINDOW || moment > at) continue;
        const key = `${region} ${lead}`;
        if (!due.has(key)) due.set(key, []);
        due.get(key).push({ id, map, start, end: start + duration, moment });
      }
    });
  if (!due.size) return;

  const jwk = JSON.parse(env.VAPID_PRIVATE_KEY);
  const headers = new Map(); // one VAPID header per push service
  const authorization = (endpoint) => {
    const audience = new URL(endpoint).origin;
    if (!headers.has(audience)) headers.set(audience, vapid(audience, jwk, SUBJECT, at));
    return headers.get(audience);
  };

  const counts = { sent: 0, gone: 0, failed: 0 };
  async function deliver(name, list, region) {
    const sub = await env.ALERTS.get(name, 'json');
    if (!sub) return;
    for (const o of list) {
      const res = await sendPush(sub, message(data, o, region, sub.lang), { authorization: await authorization(sub.endpoint), ttl: Math.max(60, o.end - at) });
      if (res.status === 404 || res.status === 410) {
        counts.gone += 1;
        return env.ALERTS.delete(name);
      }
      if (res.ok) counts.sent += 1;
      else {
        counts.failed += 1;
        console.log(`push ${res.status} from ${new URL(sub.endpoint).host}: ${(await res.text()).slice(0, 200)}`);
      }
    }
  }

  const sends = [];
  let cursor = null;
  do {
    const page = await env.ALERTS.list({ prefix: 'sub:', cursor });
    for (const { name, metadata: m } of page.keys) {
      if (!m || !Array.isArray(m.a)) continue;
      const list = (due.get(`${m.r} ${m.l}`) || []).filter(
        (o) => o.moment > m.u && m.a.some(([map, cond, since]) => (!cond || cond === o.id) && (!map || map === o.map) && o.start > since)
      );
      if (list.length)
        sends.push(
          deliver(name, list, m.r).catch((err) => {
            counts.failed += 1;
            console.log(`push failed: ${err}`);
          })
        );
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  await Promise.all(sends);
  if (sends.length) console.log(`alerts at ${new Date(at * 1000).toISOString()}: ${counts.sent} sent, ${counts.gone} gone, ${counts.failed} failed`);
}
