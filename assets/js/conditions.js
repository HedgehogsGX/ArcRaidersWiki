/* Map conditions: a live panel in the home hero, so they show without scrolling,
   and the full schedule on the maps page, with what is on now and what comes next
   per condition. A page can have either or both. Countdowns tick in the reader's
   server region. The schedule comes from content/map-conditions.js
   (scripts/fetch-map-conditions.mjs).

   On the maps page a reader can focus on a map, a condition or both: the schedule
   then lists every time it comes up (?map= and ?cond= keep the choice), and
   "Alert me" saves an alert for it in the browser. Once notifications are allowed,
   the alerts also go to the server (worker.js), which sends them by Web Push, so
   they arrive while the site is closed; sw.js shows them. Where that isn't
   available (no push API on this host, or the browser can't subscribe) alerts
   notify while any page of the site is open, which is why site.js loads this
   script on every page once one is set, and go to the reader's calendar for when
   it isn't. */

(function () {
  const { html, mount, t, L, url, link } = ARC;
  const REGION_KEY = 'arc-wiki-region';
  const ALERTS_KEY = 'arc-wiki-alerts';
  const LEAD_KEY = 'arc-wiki-alert-lead';
  const SENT_KEY = 'arc-wiki-alerts-sent';
  const PUSH_KEY = 'arc-wiki-push';
  // The VAPID public key from scripts/vapid-keys.mjs; empty turns push off.
  const VAPID_KEY = '';
  const REGIONS = ['europe', 'north-america', 'brazil', 'east-asia', 'oceania'];
  const LEADS = [0, 5, 10, 15, 30];
  let root = null;
  let hero = null;
  let region = null;
  let nextChange = Infinity;
  const focus = { map: '', cond: '' };

  const schedule = () => window.ARC_MAP_CONDITIONS;
  const now = () => Date.now() / 1000;

  const BELL = html`<svg class="icon-bell" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v.6A7 7 0 0 1 19 11v4.5l2 2.5v1H3v-1l2-2.5V11a7 7 0 0 1 5.5-6.9v-.6A1.5 1.5 0 0 1 12 2zm-2.5 18h5a2.5 2.5 0 0 1-5 0z" fill="currentColor"/></svg>`;
  const CALENDAR = html`<svg class="icon-bell" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zM5 9v10h14V9zm2 2h4v4H7z" fill="currentColor"/></svg>`;

  // JSON in localStorage; the fallback when storage is blocked or holds something else.
  function stored(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }
  function store(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* not saved; still works for this visit */
    }
  }

  // Saved choice first, then a guess from the time zone, as the official page has no Chinese region.
  function pickRegion(available) {
    try {
      const saved = localStorage.getItem(REGION_KEY);
      if (available.includes(saved)) return saved;
    } catch (e) {
      /* storage blocked */
    }
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').replace(/^America\/Argentina\/.*/, 'America/Argentina');
    const guess = /^Asia\//.test(tz)
      ? 'east-asia'
      : /^(Australia|Pacific)\//.test(tz) && tz !== 'Pacific/Honolulu'
        ? 'oceania'
        : /^America\/(Sao_Paulo|Argentina|Santiago|Bogota|Lima|Caracas|Montevideo|Asuncion|La_Paz|Guayaquil|Belem|Fortaleza|Recife|Manaus|Bahia|Maceio|Cuiaba|Campo_Grande|Porto_Velho|Rio_Branco|Boa_Vista|Araguaina|Santarem|Noronha)$/.test(tz)
          ? 'brazil'
          : /^America\//.test(tz)
            ? 'north-america'
            : 'europe';
    return available.includes(guess) ? guess : available[0];
  }

  const availableRegions = (data) => REGIONS.filter((r) => data.regions.includes(r)).concat(data.regions.filter((r) => !REGIONS.includes(r)));
  const currentRegion = () => {
    const available = availableRegions(schedule());
    if (!available.includes(region)) region = pickRegion(available);
    return region;
  };

  const regionName = (id) => {
    const key = `cond.region.${id}`;
    const text = t(key);
    return text === key ? id : text;
  };

  // 1:29:24 or 29:24, like the official countdowns.
  function clock(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const pad = (n) => String(n).padStart(2, '0');
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
  }

  const countdown = (at, kind) => t(kind === 'end' ? 'cond.endsIn' : 'cond.startsIn', { t: clock(at - now()) });
  const ticking = (at, kind) => html`<span class="num" data-at="${at}" data-kind="${kind}">${countdown(at, kind)}</span>`;

  const locale = () => (ARC.lang === 'zh' ? 'zh-CN' : 'en-US');
  const clockTime = (s) =>
    new Date(s * 1000).toLocaleTimeString(locale(), ARC.lang === 'zh' ? { hour: '2-digit', minute: '2-digit', hour12: false } : { hour: 'numeric', minute: '2-digit' });

  // "", "Tomorrow " or "Oct 23 ", for times not today.
  function dayPrefix(s) {
    const day = new Date(s * 1000);
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return day.toDateString() === today.toDateString()
      ? ''
      : day.toDateString() === tomorrow.toDateString()
        ? `${t('cond.tomorrow')} `
        : `${day.toLocaleDateString(locale(), { month: 'short', day: 'numeric' })} `;
  }

  const timeRange = (start, end, withDay) => `${withDay ? dayPrefix(start) : ''}${clockTime(start)} – ${clockTime(end)}`;

  // ---- the schedule ------------------------------------------------------------------

  const conditionName = (id) => {
    const c = schedule().conditions[id];
    return c ? L(c.name) : id;
  };
  const mapName = (id) => {
    const m = schedule().maps[id];
    return m ? L(m) : id;
  };

  // A focus or an alert: { map, cond }, either of them '' for any.
  const matches = (rule, id, map) => (!rule.cond || rule.cond === id) && (!rule.map || rule.map === map);

  // Each time a condition is on a map, from now to the end of the schedule, in the
  // reader's region, soonest first.
  function occurrences(test) {
    const data = schedule();
    if (!data || now() >= data.until) return [];
    const r = data.regions.indexOf(currentRegion());
    const at = now();
    return data.entries
      .filter(([id, map]) => test(id, map))
      .map(([id, map, duration, starts]) => ({ id, map, start: starts[r], end: starts[r] + duration }))
      .filter((o) => o.end > at && o.start < data.until)
      .sort((a, b) => a.start - b.start);
  }

  // Occurrences grouped by condition and start time. Unless `all`, only the next
  // start of each condition is kept, for the overview.
  function groups(test, all) {
    const data = schedule();
    const at = now();
    const active = new Map();
    const next = new Map();
    for (const o of occurrences(test)) {
      const live = o.start <= at;
      const target = live ? active : next;
      const key = live || all ? `${o.id} ${o.start}` : o.id;
      const found = target.get(key);
      if (!found) target.set(key, { id: o.id, start: o.start, end: o.end, maps: [o.map] });
      else if (found.start === o.start && !found.maps.includes(o.map)) found.maps.push(o.map);
    }
    const major = (id) => (data.conditions[id] ? data.conditions[id].major : false);
    const order = (a, b) => a.start - b.start || major(b.id) - major(a.id) || a.id.localeCompare(b.id);
    return { active: [...active.values()].sort(order), next: [...next.values()].sort(order) };
  }

  // In focus, a card leads with what differs from card to card: the time when both
  // a map and a condition are picked, else the maps or the condition.
  function card(g, live) {
    const data = schedule();
    const c = data.conditions[g.id] || { name: { en: g.id } };
    const at = live ? g.end : g.start;
    const kind = live ? 'end' : 'start';
    const focused = focus.map || focus.cond;
    const name = html`${L(c.name)}${c.major ? html`<span class="tag">${t('cond.major')}</span>` : ''}`;
    const maps = g.maps.map((m, i) => html`${i ? ' · ' : ''}<a href="${link('map', m)}">${mapName(m)}</a>`);
    const time = (withDay) => html`<time class="num" datetime="${new Date(g.start * 1000).toISOString()}">${timeRange(g.start, g.end, withDay)}</time>`;
    const main = !focus.cond ? name : focus.map ? time(false) : maps;
    const sub = !focused ? maps : focus.map && focus.cond ? dayPrefix(g.start).trim() : time(!live);
    return html`<li class="condition${live ? ' condition--live' : ''}${focused ? ' condition--focus' : ''}">
      ${c.icon ? html`<img class="condition__icon" src="${ARC.asset(c.icon)}" alt="" loading="lazy" data-fallback>` : html`<span class="condition__icon"></span>`}
      <div class="condition__body">
        <span class="condition__name">${main}</span>
        ${sub ? html`<span class="condition__maps">${sub}</span>` : ''}
      </div>
      <div class="condition__when">
        <span class="condition__count num" data-at="${at}" data-kind="${kind}">${countdown(at, kind)}</span>
        ${focused ? '' : html`<span class="condition__time">${time(!live)}</span>`}
      </div>
    </li>`;
  }

  // ---- alerts --------------------------------------------------------------------------

  // [{ map, cond, since }]: `since` (unix seconds) keeps a new alert from firing
  // for what was already on when it was set.
  const alerts = () => {
    const list = stored(ALERTS_KEY, []);
    return Array.isArray(list) ? list.filter((a) => a && (a.map || a.cond)) : [];
  };
  const lead = () => {
    const n = stored(LEAD_KEY, 5);
    return LEADS.includes(n) ? n : 5;
  };
  const alertOf = (f) => alerts().findIndex((a) => a.map === f.map && a.cond === f.cond);
  const alertName = (a) => `${a.cond ? conditionName(a.cond) : t('cond.focus.anyCond')} · ${a.map ? mapName(a.map) : t('cond.focus.anyMap')}`;

  const focusUrl = (f) => {
    const query = new URLSearchParams();
    if (f.map) query.set('map', f.map);
    if (f.cond) query.set('cond', f.cond);
    return url(`pages/maps.html${query.toString() ? `?${query}` : ''}#conditions`);
  };

  const permission = () => ('Notification' in window ? Notification.permission : 'unsupported');

  // The service worker shows notifications where a page can't (Android) and opens
  // the wiki when one is clicked. Only registered once notifications are allowed.
  let worker = null;
  function registerWorker() {
    if (!worker && permission() === 'granted' && 'serviceWorker' in navigator && window.isSecureContext)
      worker = navigator.serviceWorker
        .register(url('sw.js'))
        .then(() => Promise.race([navigator.serviceWorker.ready, new Promise((resolve) => setTimeout(() => resolve(null), 4000))]))
        .catch(() => null);
    return worker || Promise.resolve(null);
  }

  function pageNotification(title, options) {
    try {
      const n = new Notification(title, options);
      n.onclick = () => {
        window.focus();
        location.href = options.data.url;
        n.close();
      };
    } catch (e) {
      /* this browser only notifies through a service worker */
    }
  }

  async function notify(o) {
    const title = `${conditionName(o.id)} · ${mapName(o.map)}`;
    const when = o.start > now() ? countdown(o.start, 'start') : countdown(o.end, 'end');
    const options = {
      body: `${when} · ${timeRange(o.start, o.end, true)} · ${regionName(currentRegion())}`,
      // One notification per occurrence, however many tabs are open.
      tag: `${o.id}|${o.map}|${o.start}`,
      icon: url('assets/img/brand/logo.png'),
      data: { url: new URL(focusUrl({ map: o.map, cond: o.id }), location.href).href },
    };
    const reg = await registerWorker();
    if (reg) return reg.showNotification(title, options).catch(() => pageNotification(title, options));
    pageNotification(title, options);
  }

  // Notify once for each occurrence an alert covers, `lead` minutes before it
  // starts, or as soon as a page is open if that moment passed while it is still on.
  // What the server pushes is only marked as done here.
  function checkAlerts() {
    const list = alerts();
    if (!list.length || permission() !== 'granted' || !schedule()) return;
    const sent = stored(SENT_KEY, {});
    const at = now();
    const ahead = lead() * 60;
    const after = pushedAfter();
    let changed = false;
    for (const o of occurrences((id, map) => list.some((a) => matches(a, id, map)))) {
      const key = `${o.id}|${o.map}|${o.start}`;
      if (sent[key] || o.start - ahead > at || !list.some((a) => matches(a, o.id, o.map) && o.start > (a.since || 0))) continue;
      sent[key] = o.end;
      changed = true;
      if (o.start - ahead <= after) notify(o);
    }
    for (const [key, end] of Object.entries(sent))
      if (end < at - 86400) {
        delete sent[key];
        changed = true;
      }
    if (changed) store(SENT_KEY, sent);
  }

  // ---- push ----------------------------------------------------------------------------

  // What the server holds for this browser once it has confirmed it:
  // { endpoint, sig, rules, at, posted }, `at` being when it took over these rules.
  const pushed = () => stored(PUSH_KEY, null);
  const rules = () => JSON.stringify([alerts(), lead(), currentRegion()]);

  // The server pushes what is due after `at`; open pages notify for anything due
  // before then, and for everything when it doesn't hold the current alerts.
  function pushedAfter() {
    const p = pushed();
    return p && p.at && p.rules === rules() ? p.at : Infinity;
  }

  async function api(action, body) {
    const res = await fetch(url(`api/alerts/${action}`), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    // Hosts without the API answer 404, or a page.
    if (!res.ok || !/json/.test(res.headers.get('content-type') || '')) throw new Error(`alerts API: ${res.status}`);
    return res.json();
  }

  // Back to open pages only: the server forgets this browser if it can.
  function dropPush() {
    const p = pushed();
    if (!p) return;
    store(PUSH_KEY, null);
    if (p.endpoint) return api('unsubscribe', { endpoint: p.endpoint }).catch(() => {});
  }

  const vapidBytes = () => Uint8Array.from(atob(VAPID_KEY.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const sameKey = (sub) => {
    const key = sub.options && sub.options.applicationServerKey;
    return !key || String(new Uint8Array(key)) === String(vapidBytes());
  };

  // Subscribes this browser to push and gives the server its alerts. Posts only
  // when something changed, and weekly, as the server forgets a browser after 90
  // days without one.
  async function syncPush() {
    const list = alerts();
    const reg = VAPID_KEY && list.length && 'PushManager' in window ? await registerWorker() : null;
    if (!reg || !reg.pushManager) return dropPush();
    let sub = await reg.pushManager.getSubscription();
    if (sub && !sameKey(sub)) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidBytes() });
    const body = { subscription: sub.toJSON(), alerts: list, lead: lead(), region: currentRegion(), lang: ARC.lang };
    const sig = JSON.stringify(body);
    const state = pushed();
    if (state && state.sig === sig && now() - state.posted < 7 * 86400) return;
    if (state && state.endpoint !== sub.endpoint) await dropPush();
    const { at } = await api('subscribe', body);
    store(PUSH_KEY, { endpoint: sub.endpoint, sig, rules: rules(), at, posted: Math.floor(now()) });
  }

  // One sync at a time; a failure leaves alerts to open pages until the next one.
  let pushing = Promise.resolve();
  function updatePush() {
    if (!schedule()) return;
    pushing = pushing
      .then(syncPush)
      .catch(dropPush)
      .then(() => {
        const status = root && root.querySelector('.cond-alerts__status');
        if (status) status.textContent = statusText();
      });
  }

  // Asks from the click that set the first alert, so the browser shows its prompt.
  async function askToNotify() {
    if (permission() === 'default')
      try {
        await Notification.requestPermission();
      } catch (e) {
        /* older Safari takes a callback; the next click can try again */
      }
    await registerWorker();
    renderAlerts();
    checkAlerts();
    updatePush();
  }

  function toggleAlert() {
    if (!focus.map && !focus.cond) return;
    const list = alerts();
    const i = alertOf(focus);
    if (i >= 0) list.splice(i, 1);
    else list.push({ map: focus.map, cond: focus.cond, since: Math.floor(now()) });
    store(ALERTS_KEY, list);
    if (i < 0) askToNotify();
    else updatePush();
    renderFocus();
    renderAlerts();
    renderLists();
  }

  function removeAlert(i) {
    const list = alerts();
    list.splice(i, 1);
    store(ALERTS_KEY, list);
    updatePush();
    renderFocus();
    renderAlerts();
    renderLists();
  }

  // ---- calendar --------------------------------------------------------------------------

  const icsTime = (s) => new Date(s * 1000).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const icsText = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  // Lines longer than 75 bytes continue on the next line after a space (RFC 5545).
  function fold(line) {
    const out = [];
    let part = '';
    let bytes = 0;
    for (const ch of line) {
      const size = new TextEncoder().encode(ch).length;
      if (bytes + size > 74) {
        out.push(part);
        part = ' ';
        bytes = 1;
      }
      part += ch;
      bytes += size;
    }
    return out.concat(part).join('\r\n');
  }

  function untilText() {
    const until = schedule().until;
    return `${dayPrefix(until)}${clockTime(until)}`;
  }

  // An .ics file with every occurrence the alerts cover, each with a reminder.
  function addToCalendar() {
    const list = alerts();
    const items = occurrences((id, map) => list.some((a) => matches(a, id, map)));
    const status = root && root.querySelector('.cond-alerts__status');
    if (!items.length) {
      if (status) status.textContent = t('alerts.calendar.none', { until: untilText() });
      return;
    }
    const minutes = lead();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ARC Raiders Wiki//Map condition alerts//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${icsText(t('alerts.ics.name'))}`,
    ];
    for (const o of items) {
      const summary = `${conditionName(o.id)} · ${mapName(o.map)}`;
      const page = new URL(focusUrl({ map: o.map, cond: o.id }), location.href).href;
      lines.push(
        'BEGIN:VEVENT',
        // The same UID again on a later import updates the event instead of adding one.
        `UID:${o.id}.${o.map}.${o.start}@arc-raiders-wiki`,
        `DTSTAMP:${icsTime(now())}`,
        `DTSTART:${icsTime(o.start)}`,
        `DTEND:${icsTime(o.end)}`,
        `SUMMARY:${icsText(summary)}`,
        `DESCRIPTION:${icsText(`${t('alerts.ics.desc', { region: regionName(currentRegion()) })}\n${page}`)}`,
        `URL:${page}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${icsText(summary)}`,
        `TRIGGER:${minutes ? `-PT${minutes}M` : 'PT0M'}`,
        'END:VALARM',
        'END:VEVENT'
      );
    }
    lines.push('END:VCALENDAR');
    const file = new Blob([`${lines.map(fold).join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = 'arc-raiders-map-conditions.ics';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  // ---- rendering ---------------------------------------------------------------------------

  // The soonest occurrence an alert covers, for the hero.
  function heroAlert() {
    const list = alerts();
    if (!list.length) return '';
    const o = occurrences((id, map) => list.some((a) => matches(a, id, map)))[0];
    if (!o)
      return html`<a class="now__alert" href="${focusUrl(list[0])}">${BELL}<span class="now__alert-text">${t('alerts.title')} · ${t('alerts.notSoon')}</span></a>`;
    const live = o.start <= now();
    return html`<a class="now__alert" href="${focusUrl({ map: o.map, cond: o.id })}">${BELL}<span class="now__alert-text">${conditionName(o.id)} · ${mapName(o.map)}</span>
      ${ticking(live ? o.end : o.start, live ? 'end' : 'start')}</a>`;
  }

  // Compact version for the hero: what is on, then the next start and what it brings.
  // Conditions usually rotate together on the hour; then one countdown in the head does.
  function heroBody(active, next) {
    const data = schedule();
    const soonest = next.length ? Math.min(...next.map((g) => g.start)) : null;
    const coming = next.filter((g) => g.start === soonest);
    const shared = active.length && active.every((g) => g.end === active[0].end) ? active[0].end : null;
    mount(hero.querySelector('.now__count'), shared ? ticking(shared, 'end') : '');
    return html`${active.length
      ? html`<ul class="now__list">${active.map((g) => {
          const c = data.conditions[g.id] || { name: { en: g.id } };
          return html`<li class="now__item">
            ${c.icon ? html`<img class="now__icon" src="${ARC.asset(c.icon)}" alt="" data-fallback>` : html`<span class="now__icon"></span>`}
            <span class="now__text"><span class="now__name">${L(c.name)}</span>
              <span class="now__meta">${g.maps.map(mapName).join(' · ')}${shared ? '' : html` · ${ticking(g.end, 'end')}`}</span></span>
          </li>`;
        })}</ul>`
      : html`<p class="note">${t('cond.none')}</p>`}
    <a class="now__next" href="${url('pages/maps.html#conditions')}">
      ${coming.length
        ? html`<span class="now__next-names">${t('cond.next')} · ${ticking(soonest, 'start')}${
            ARC.lang === 'zh' ? '：' : ': '
          }${coming.map((g) => conditionName(g.id)).join(ARC.lang === 'zh' ? '、' : ', ')}</span>`
        : html`<span class="now__next-names"></span>`}
      <span class="now__next-all">${t('cond.all')}</span></a>
    ${heroAlert()}`;
  }

  // Under the pickers: how often the focus comes up in the schedule, or what they are for.
  function focusNote(list) {
    const note = root && root.querySelector('.cond-focus__note');
    if (!note) return;
    note.textContent = !(focus.map || focus.cond)
      ? t('cond.focus.hint')
      : list.length
        ? t(list.length === 1 ? 'cond.focus.once' : 'cond.focus.count', { n: list.length, until: untilText() })
        : t('cond.focus.none', { until: untilText() });
  }

  function renderLists() {
    const data = schedule();
    if (!data) return;
    const lists = root && root.querySelector('.conditions');
    const heroList = hero && hero.querySelector('.now__body');
    if (now() >= data.until) {
      nextChange = Infinity;
      const stale = html`<p class="empty">${t('cond.stale')} <a href="${data.source}" target="_blank" rel="noopener">${t('cond.source')}</a></p>`;
      if (lists) mount(lists, stale);
      if (heroList) {
        mount(hero.querySelector('.now__count'), '');
        mount(heroList, stale);
      }
      return;
    }
    const at = now();
    nextChange = Math.min(data.until, ...occurrences(() => true).map((o) => (o.start > at ? o.start : o.end)));
    if (heroList) {
      const { active, next } = groups(() => true, false);
      mount(heroList, heroBody(active, next));
    }
    if (!lists) return;
    const focused = focus.map || focus.cond;
    const test = focused ? (id, map) => matches(focus, id, map) : () => true;
    const { active, next } = groups(test, !!focused);
    focusNote(occurrences(test));
    mount(
      lists,
      html`<div class="conditions__group">
        <h3><span class="live-dot" aria-hidden="true"></span>${t('cond.active')}</h3>
        ${active.length ? html`<ul class="conditions__list">${active.map((g) => card(g, true))}</ul>` : html`<p class="note">${t('cond.none')}</p>`}
      </div>
      ${next.length
        ? html`<div class="conditions__group">
            <h3>${t('cond.upcoming')}</h3>
            <ul class="conditions__list">${next.map((g) => card(g, false))}</ul>
          </div>`
        : ''}`
    );
  }

  // Map and condition pickers. With a map chosen, the conditions list only those
  // that have come up on it (`seen`), and the other way round.
  function renderFocus() {
    const box = root && root.querySelector('.cond-focus');
    const data = schedule();
    if (!box || !data) return;
    const seen = data.seen || {};
    const mapIds = Object.keys(data.maps).filter((m) => !focus.cond || !seen[focus.cond] || seen[focus.cond].includes(m) || m === focus.map);
    const condIds = Object.keys(data.conditions)
      .filter((c) => !focus.map || !data.seen || (seen[c] || []).includes(focus.map) || c === focus.cond)
      .sort((a, b) => conditionName(a).localeCompare(conditionName(b), locale()));
    const option = (id, name, selected) => html`<option value="${id}"${selected ? ' selected' : ''}>${name}</option>`;
    const group = (major) => {
      const ids = condIds.filter((c) => !!data.conditions[c].major === major);
      return ids.length
        ? html`<optgroup label="${t(major ? 'maps.major' : 'maps.minor')}">${ids.map((c) => option(c, conditionName(c), c === focus.cond))}</optgroup>`
        : '';
    };
    const chosen = focus.map || focus.cond;
    const on = chosen && alertOf(focus) >= 0;
    mount(
      box,
      html`<label class="cond-focus__field"><span class="note">${t('cond.focus.map')}</span>
        <select class="select" data-focus="map">${option('', t('cond.focus.allMaps'), !focus.map)}${mapIds.map((m) => option(m, mapName(m), m === focus.map))}</select></label>
      <label class="cond-focus__field"><span class="note">${t('cond.focus.cond')}</span>
        <select class="select" data-focus="cond">${option('', t('cond.focus.allConds'), !focus.cond)}${group(true)}${group(false)}</select></label>
      <button type="button" class="button cond-focus__alert" data-alert-toggle aria-pressed="${String(!!on)}"${chosen ? '' : html` disabled`}>${BELL}${t(on ? 'alerts.on' : 'alerts.add')}</button>
      <p class="note cond-focus__note" aria-live="polite"></p>`
    );
  }

  function renderAlerts() {
    const box = root && root.querySelector('.cond-alerts');
    if (!box || !schedule()) return;
    const list = alerts();
    box.hidden = !list.length;
    if (!list.length) return mount(box, '');
    const state = permission();
    mount(
      box,
      html`<div class="cond-alerts__head">
        <h3>${BELL}${t('alerts.title')}</h3>
        <label class="cond-alerts__lead"><span class="note">${t('alerts.lead')}</span>
          <select class="select" data-alert-lead>${LEADS.map(
            (n) => html`<option value="${n}"${n === lead() ? ' selected' : ''}>${n ? t('alerts.lead.n', { n }) : t('alerts.lead.0')}</option>`
          )}</select></label>
      </div>
      <ul class="cond-alerts__list">${list.map((a, i) => {
        const o = occurrences((id, map) => matches(a, id, map))[0];
        return html`<li class="cond-alert">
          <a class="cond-alert__name" href="${focusUrl(a)}" data-focus-map="${a.map}" data-focus-cond="${a.cond}">${alertName(a)}</a>
          <span class="cond-alert__when">${o ? ticking(o.start <= now() ? o.end : o.start, o.start <= now() ? 'end' : 'start') : t('alerts.notSoon')}</span>
          <button type="button" class="cond-alert__remove" data-alert-remove="${i}" aria-label="${t('alerts.remove')}: ${alertName(a)}">
            <svg width="10" height="10" viewBox="0 0 14 14" aria-hidden="true"><path d="M1 1l12 12M13 1 1 13" stroke="currentColor" stroke-width="1.8"/></svg></button>
        </li>`;
      })}</ul>
      <div class="cond-alerts__actions">
        ${state === 'default' ? html`<button type="button" class="button" data-alert-enable>${BELL}${t('alerts.enable')}</button>` : ''}
        <button type="button" class="button" data-alert-ics>${CALENDAR}${t('alerts.calendar')}</button>
      </div>
      <p class="note cond-alerts__status">${statusText()}</p>`
    );
  }

  // How the alerts will arrive: pushed, only while a page is open, or not at all.
  function statusText() {
    const state = permission();
    return t(`alerts.status.${state === 'granted' && pushedAfter() < Infinity ? 'push' : state}`);
  }

  function render() {
    const data = schedule();
    if ((!root && !hero) || !data) return;
    const options = availableRegions(data).map((r) => html`<option value="${r}"${r === currentRegion() ? ' selected' : ''}>${regionName(r)}</option>`);
    if (hero)
      mount(
        hero,
        html`<div class="now__head">
          <span class="now__title"><span class="live-dot" aria-hidden="true"></span>${t('home.conditions')} · ${t('cond.active')}</span>
          <span class="now__count"></span>
          <select class="select now__region" data-region aria-label="${t('cond.region')}">${options}</select>
        </div>
        <div class="now__body"></div>`
      );
    if (root)
      mount(
        root,
        html`<div class="section__head">
          <h2>${t('cond.schedule')}</h2>
          <label class="conditions__region"><span class="note">${t('cond.region')}</span>
            <select class="select" data-region>${options}</select></label>
        </div>
        <div class="cond-focus"></div>
        <div class="cond-alerts" hidden></div>
        <div class="conditions"></div>
        <p class="note conditions__note">${t('cond.note')}
          <a href="${data.source}" target="_blank" rel="noopener">${t('cond.source')}</a></p>`
      );
    renderFocus();
    renderAlerts();
    renderLists();
  }

  // A choice that never comes up together (from a link, or after picking the other
  // half) drops the half that wasn't just picked.
  function setFocus(next, picked) {
    const data = schedule();
    focus.map = data.maps[next.map] ? next.map : '';
    focus.cond = data.conditions[next.cond] ? next.cond : '';
    const seen = data.seen && data.seen[focus.cond];
    if (focus.map && seen && !seen.includes(focus.map)) focus[picked === 'map' ? 'cond' : 'map'] = '';
    const query = new URLSearchParams(location.search);
    for (const key of ['map', 'cond']) (focus[key] ? query.set(key, focus[key]) : query.delete(key));
    history.replaceState(history.state, '', `${location.pathname}${query.toString() ? `?${query}` : ''}#conditions`);
    renderFocus();
    renderLists();
  }

  function tick() {
    if ((!root && !hero) || !schedule()) return;
    if (now() >= nextChange) return renderLists();
    [root, hero].forEach((scope) =>
      scope?.querySelectorAll('[data-at]').forEach((el) => {
        el.textContent = countdown(Number(el.dataset.at), el.dataset.kind);
      })
    );
  }

  // Tabs left open pick up the newest published schedule once an hour.
  function reload() {
    const script = document.createElement('script');
    script.src = url(`content/map-conditions.js?t=${Date.now()}`);
    script.onload = script.onerror = () => {
      script.remove();
      render();
      checkAlerts();
    };
    document.head.append(script);
  }

  // `el` holds the full schedule, `heroEl` the live panel in the hero; either can be null.
  function start(el, heroEl) {
    root = el || null;
    hero = heroEl || null;
    if (!schedule()) {
      if (root) root.hidden = true;
      return;
    }
    if (hero) hero.hidden = false;
    if (root) {
      const query = new URLSearchParams(location.search);
      const data = schedule();
      focus.map = data.maps[query.get('map')] ? query.get('map') : '';
      focus.cond = data.conditions[query.get('cond')] ? query.get('cond') : '';
    }
    render();
    document.addEventListener('change', (e) => {
      const target = e.target;
      // Both panels have a region picker; changing either one moves both.
      if (target.matches('[data-region]')) {
        region = target.value;
        try {
          localStorage.setItem(REGION_KEY, region);
        } catch (err) {
          /* not saved; still switch for this visit */
        }
        document.querySelectorAll('[data-region]').forEach((select) => (select.value = region));
        renderAlerts();
        renderLists();
        updatePush();
      } else if (target.matches('[data-focus]')) {
        setFocus({ ...focus, [target.dataset.focus]: target.value }, target.dataset.focus);
      } else if (target.matches('[data-alert-lead]')) {
        store(LEAD_KEY, Number(target.value));
        checkAlerts();
        updatePush();
      }
    });
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-alert-toggle], [data-alert-remove], [data-alert-enable], [data-alert-ics], [data-focus-map]');
      if (!target || !root || !root.contains(target)) return;
      if (target.matches('[data-alert-toggle]')) toggleAlert();
      else if (target.matches('[data-alert-remove]')) removeAlert(Number(target.dataset.alertRemove));
      else if (target.matches('[data-alert-enable]')) askToNotify();
      else if (target.matches('[data-alert-ics]')) addToCalendar();
      else {
        e.preventDefault();
        setFocus({ map: target.dataset.focusMap, cond: target.dataset.focusCond });
        root.scrollIntoView({ behavior: 'smooth' });
      }
    });
    setInterval(tick, 1000);
    document.addEventListener('arc:lang', render);
  }

  // What is on a map right now in the reader's region, for the interactive map:
  // [{ id, end }], or null when there is no current schedule.
  function activeOn(map) {
    const data = schedule();
    if (!data || now() >= data.until) return null;
    const at = now();
    return occurrences((id, m) => m === map)
      .filter((o) => o.start <= at)
      .map((o) => ({ id: o.id, end: o.end }));
  }

  // Alerts run on every page this script is on.
  setInterval(reload, 3600 * 1000);
  setInterval(checkAlerts, 15 * 1000);
  document.addEventListener('visibilitychange', checkAlerts);
  // Pushed alerts are in the reader's language.
  document.addEventListener('arc:lang', updatePush);
  // Alerts set or removed in another tab, which updates the server itself.
  window.addEventListener('storage', (e) => {
    if (e.key !== ALERTS_KEY && e.key !== LEAD_KEY && e.key !== PUSH_KEY) return;
    renderFocus();
    renderAlerts();
    renderLists();
  });
  if (alerts().length && schedule()) {
    registerWorker();
    setTimeout(checkAlerts, 1000);
  }
  if (alerts().length || pushed()) updatePush();

  ARC.conditions = { start, activeOn };
})();
