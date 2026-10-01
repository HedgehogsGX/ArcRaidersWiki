#!/usr/bin/env node
// Pulls the latest announcements from https://arcraiders.com/news into
// content/news.js, with full text, images and YouTube videos.
//
//   node scripts/fetch-news.mjs            fetch English; reuse cached Chinese
//   node scripts/fetch-news.mjs --limit 20 how many recent posts to keep (default 12)
//
// The official site is English only. When TRANSLATE_API_KEY is set, new or
// changed posts are translated into Simplified Chinese through an
// OpenAI-compatible chat API, using the game's official zh-CN terms from
// scripts/glossary-client.json and data/. The default is DeepSeek
// (deepseek-v4-pro); TRANSLATE_BASE_URL and TRANSLATE_MODEL point it at another
// provider. Translations are cached in content/news-zh.json, so each post is
// translated once. Without a key the Chinese side falls back to English.
//
// Article HTML is reduced to a small whitelist of tags before it is stored,
// and translated HTML goes through the same filter. Images are copied into
// content/news-img/ as WebP (needs sharp from npm install).

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { CLIENT_TERMS, NEWS_TERMS } from './glossary.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://arcraiders.com';
const OUT = path.join(ROOT, 'content/news.js');
const CACHE = path.join(ROOT, 'content/news-zh.json');
const IMG_DIR = path.join(ROOT, 'content/news-img');
const TRANSLATE = {
  key: process.env.TRANSLATE_API_KEY,
  base: (process.env.TRANSLATE_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, ''),
  model: process.env.TRANSLATE_MODEL || 'deepseek-v4-pro',
};
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : 12;

// ---- fetching --------------------------------------------------------------

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'ArcRaidersWiki news sync (+https://github.com/HedgehogsGX/ArcRaidersWiki)' } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.text();
    } catch (err) {
      if (i >= tries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

const decode = (s) =>
  s
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

const isoDate = (text) => {
  const d = new Date(`${decode(text)} UTC`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

// Cards are served as "<name>-<size>-<size>.png"; the first size is the original.
const fullCard = (src) => src.replace(/-(\d+x\d+)-\d+x\d+(\.\w+)$/, '-$1-$1$2');

function parseListing(html) {
  const rows = [];
  const re = /<a class="news-article-row_row[^"]*"[^>]*href="\/news\/([^"#?]+)"[^>]*>([\s\S]*?)<\/a>/g;
  for (const [, slug, inner] of html.matchAll(re)) {
    const title = inner.match(/news-article-row_title[^"]*">([\s\S]*?)<\/span>/);
    const date = inner.match(/news-article-row_date[^"]*">([\s\S]*?)<\/span>/);
    const img = inner.match(/<img[^>]*src="([^"]+)"/);
    const tags = [...inner.matchAll(/data-text="([^"]+)"/g)].map((m) => decode(m[1]));
    rows.push({
      id: slug,
      title: title ? decode(title[1].replace(/<[^>]+>/g, '')) : slug,
      date: date ? isoDate(date[1].replace(/<[^>]+>/g, '')) : null,
      tags,
      thumb: img ? fullCard(img[1]) : null,
    });
  }
  return rows;
}

// ---- HTML handling ----------------------------------------------------------

const TOKEN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|[^<]+|</g;
const VOID = new Set(['br', 'img', 'hr']);

// Returns the inner HTML of the element that opens at `start`, tracking nesting.
function innerOf(html, start) {
  const open = html.indexOf('>', start) + 1;
  const tag = /^<([a-zA-Z0-9]+)/.exec(html.slice(start))[1];
  let depth = 1;
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
  re.lastIndex = open;
  for (let m; (m = re.exec(html)); ) {
    depth += m[1] ? -1 : 1;
    if (!depth) return html.slice(open, m.index);
  }
  return html.slice(open);
}

// Splits HTML into its top-level elements.
function children(html) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (const m of html.matchAll(TOKEN)) {
    const [text, closing, tag, , selfClose] = m;
    if (!tag) {
      if (depth === 0 && text.trim()) out.push(text);
      continue;
    }
    const name = tag.toLowerCase();
    if (!closing) {
      if (depth === 0) from = m.index;
      if (VOID.has(name) || selfClose) {
        if (depth === 0) out.push(html.slice(from, m.index + text.length));
      } else depth++;
    } else {
      depth--;
      if (depth === 0) out.push(html.slice(from, m.index + text.length));
    }
  }
  return out;
}

const ALLOWED = {
  p: [], h2: [], h3: [], h4: [], strong: [], b: [], em: [], i: [], u: [], s: [], sup: [], sub: [], code: [],
  br: [], hr: [], ul: [], ol: ['start'], li: [], blockquote: [], figure: [], figcaption: [],
  table: [], thead: [], tbody: [], tr: [], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'],
  a: ['href'], img: ['src', 'alt', 'width', 'height'],
};
const RENAME = { h1: 'h2', h5: 'h4', h6: 'h4' };
// Removed together with everything inside them.
const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'textarea', 'select', 'button', 'form']);
const UNWRAPPED = Symbol('unwrapped link');

const attrs = (raw) =>
  Object.fromEntries(
    [...(raw || '').matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map((m) => [
      m[1].toLowerCase(),
      m[2] ?? m[3] ?? m[4] ?? '',
    ])
  );

function safeUrl(value, { image } = {}) {
  try {
    const url = new URL(decode(value), SITE);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (image && !/(^|\.)arcraiders\.com$/.test(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escText = (s) => s.replace(/&(?![a-zA-Z]+;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Keeps only whitelisted tags and attributes. In-page anchor links (the site's
// heading permalinks) are unwrapped; other links open in a new tab.
function sanitize(html) {
  let out = '';
  const stack = [];
  let dropping = null;
  let dropDepth = 0;
  for (const m of html.matchAll(TOKEN)) {
    const [text, closing, rawTag, rawAttrs, selfClose] = m;
    const lower = rawTag && rawTag.toLowerCase();
    if (dropping) {
      if (lower === dropping) dropDepth += closing ? -1 : 1;
      if (!dropDepth) dropping = null;
      continue;
    }
    if (lower && !closing && DROP.has(lower)) {
      if (!selfClose) {
        dropping = lower;
        dropDepth = 1;
      }
      continue;
    }
    if (!rawTag) {
      if (!text.startsWith('<!--')) out += escText(text);
      continue;
    }
    const tag = RENAME[rawTag.toLowerCase()] || rawTag.toLowerCase();
    if (!ALLOWED[tag]) continue;
    if (closing) {
      // An unwrapped link leaves a marker so its closing tag is dropped too.
      const at = Math.max(stack.lastIndexOf(tag), tag === 'a' ? stack.lastIndexOf(UNWRAPPED) : -1);
      if (at < 0) continue;
      while (stack.length > at) {
        const open = stack.pop();
        if (open !== UNWRAPPED) out += `</${open}>`;
      }
      continue;
    }
    const a = attrs(rawAttrs);
    let kept = '';
    if (tag === 'a') {
      const href = a.href && !a.href.startsWith('#') ? safeUrl(a.href) : null;
      if (!href) {
        stack.push(UNWRAPPED);
        continue;
      }
      kept = ` href="${escAttr(href)}" target="_blank" rel="noopener"`;
    } else if (tag === 'img') {
      const src = a.src && safeUrl(a.src, { image: true });
      if (!src) continue;
      kept = ` src="${escAttr(src)}" alt="${escAttr(decode(a.alt || ''))}" loading="lazy"`;
      for (const k of ['width', 'height']) if (/^\d+$/.test(a[k] || '')) kept += ` ${k}="${a[k]}"`;
    } else {
      for (const k of ALLOWED[tag]) if (/^\d+$/.test(a[k] || '')) kept += ` ${k}="${a[k]}"`;
    }
    out += `<${tag}${kept}>`;
    if (!VOID.has(tag)) stack.push(tag);
  }
  while (stack.length) {
    const open = stack.pop();
    if (open !== UNWRAPPED) out += `</${open}>`;
  }
  return out.replace(/<p>\s*<\/p>/g, '').trim();
}

const textOf = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function parseArticle(html) {
  const start = html.indexOf('<div class="payload-richtext">');
  if (start < 0) throw new Error('article body not found');
  // Video ids live in the page's React payload, in the same order as the embeds.
  const videos = [...html.matchAll(/youtube-embed[\s\S]{0,400}?videoId\\?"\s*:\s*\\?"([\w-]{11})\\?"[\s\S]{0,400}?title\\?"\s*:\s*\\?"([^"\\]*)/g)].map(
    (m) => ({ id: m[1], title: decode(m[2]) })
  ).filter((v, i, all) => all.findIndex((x) => x.id === v.id) === i);
  const blocks = [];
  for (const el of children(innerOf(html, start))) {
    if (/^<div[^>]*youtube-embed/.test(el)) {
      const v = videos.shift();
      if (v) blocks.push({ type: 'video', id: v.id, title: v.title });
      continue;
    }
    const clean = sanitize(el);
    if (!clean) continue;
    const imageOnly = !textOf(clean) && /<img/.test(clean);
    blocks.push(imageOnly ? { type: 'image', html: clean } : { type: 'html', html: clean });
  }
  return blocks;
}

// ---- translation ------------------------------------------------------------------

function loadData() {
  const context = { window: {} };
  for (const name of ['labels', 'itemIndex', 'quests', 'skills', 'hideout', 'arc', 'maps', 'events', 'traders', 'projects']) {
    const file = path.join(ROOT, 'data', `${name}.js`);
    if (fs.existsSync(file)) vm.runInNewContext(fs.readFileSync(file, 'utf8'), context);
  }
  return context.window.ARC_DATA || {};
}

// The client's zh-CN terms (scripts/glossary-client.json: names, map locations,
// systems), names from the news that are newer than the client (NEWS_TERMS), then
// the names in the game data, which include items and quests the glossary doesn't list.
function buildGlossary(data) {
  const terms = new Map([['Raiders', '奇袭者']]);
  const add = (t) => t && t.en && t.zh && t.en.length > 2 && !terms.has(t.en) && terms.set(t.en, t.zh);
  CLIENT_TERMS.forEach(([en, zh]) => add({ en, zh }));
  Object.entries(NEWS_TERMS).forEach(([en, zh]) => add({ en, zh }));
  Object.values(data.itemIndex || {}).forEach(([en, zh]) => add({ en, zh }));
  (data.quests || []).forEach((q) => add(q.name));
  (data.skills || []).forEach((s) => add(s.name));
  (data.hideout || []).forEach((h) => add(h.name));
  (data.arc || []).forEach((b) => add(b.name));
  (data.events || []).forEach((e) => add(e.name));
  (data.projects || []).forEach((p) => add(p.name));
  Object.values(data.labels?.maps || {}).forEach(add);
  Object.values(data.labels?.traders || {}).forEach(add);
  Object.values(data.labels?.itemTypes || {}).forEach(add);
  return terms;
}

// Only the glossary entries that occur in this text as whole words.
function glossaryFor(text, terms) {
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...terms]
    .filter(([en]) => new RegExp(`(^|[^A-Za-z])${escape(en)}(?![A-Za-z])`, 'i').test(text))
    .sort((a, b) => b[0].length - a[0].length)
    .map(([en, zh]) => `${en} = ${zh}`)
    .join('\n');
}

const SYSTEM = `You translate official ARC Raiders news posts from English into Simplified Chinese for a Chinese player wiki.

Each input block is HTML wrapped in <block id="N"> ... </block>. Return every block, in the same order, wrapped in the same <block id="N"> tags, with only the human-readable text translated. Keep every HTML tag and attribute exactly as given, including href and src. Keep numbers, dates, times, time zones, version numbers, prices and platform names intact. Keep "ARC Raiders", "Embark Studios" and other brand names in English.

Use the glossary's Chinese for any game term it lists, exactly as written. Write natural, concise Chinese that reads like official patch notes; don't add commentary. Output only the blocks.`;

function chunks(blocks, budget = 12000) {
  const out = [];
  let current = [];
  let size = 0;
  for (const b of blocks) {
    if (current.length && size + b.html.length > budget) {
      out.push(current);
      current = [];
      size = 0;
    }
    current.push(b);
    size += b.html.length;
  }
  if (current.length) out.push(current);
  return out;
}

// One chat completion. DeepSeek's thinking mode is turned off: translation
// doesn't need it, and it would multiply the tokens.
async function complete(system, user, tries = 3) {
  const body = {
    model: TRANSLATE.model,
    max_tokens: 16000,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
  if (new URL(TRANSLATE.base).hostname === 'api.deepseek.com') body.thinking = { type: 'disabled' };
  for (let i = 1; ; i++) {
    let retry = true;
    try {
      const res = await fetch(`${TRANSLATE.base}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${TRANSLATE.key}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // Rate limits and server errors are worth another try; a bad key or request isn't.
        retry = res.status === 429 || res.status >= 500;
        throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
      }
      const choice = (await res.json()).choices?.[0];
      retry = false;
      if (choice?.finish_reason === 'length') throw new Error('translation truncated');
      if (choice?.finish_reason === 'content_filter') throw new Error('translation declined');
      return choice?.message?.content || '';
    } catch (err) {
      if (!retry || i >= tries) throw err;
      await new Promise((r) => setTimeout(r, 3000 * i));
    }
  }
}

async function translateBlocks(items, terms) {
  const input = items.map((b) => `<block id="${b.i}">${b.html}</block>`).join('\n');
  const glossary = glossaryFor(textOf(input), terms);
  const text = await complete(SYSTEM, `Glossary:\n${glossary || '(none)'}\n\nBlocks:\n${input}`);
  const found = new Map([...text.matchAll(/<block id="(\d+)">([\s\S]*?)<\/block>/g)].map((m) => [Number(m[1]), sanitize(m[2])]));
  return items.map((b) => found.get(b.i) || null);
}

async function translatePost(post, terms) {
  const items = post.blocks.map((b, i) => ({ ...b, i })).filter((b) => b.type === 'html');
  const out = new Array(post.blocks.length).fill(null);
  const [title] = await translateBlocks([{ i: 0, html: post.title }], terms);
  for (const group of chunks(items)) {
    const done = await translateBlocks(group, terms);
    group.forEach((b, n) => (out[b.i] = done[n]));
  }
  return { title: title && textOf(title), blocks: out };
}

// ---- images -----------------------------------------------------------------------

// assets.arcraiders.com is served by Google and doesn't load in mainland China,
// so thumbnails and article images are copied into content/news-img/ as WebP
// and linked relative to the site root. Existing copies are reused and copies
// no longer linked are deleted. An image that can't be fetched or converted
// keeps its original URL.
async function localizeImages(news) {
  let sharp = null;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch (err) {
    console.log(`New images stay remote: ${err.message.split('\n')[0]} (run npm install)`);
  }
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const linked = new Set();
  const done = new Map();

  async function copy(src) {
    const name = `${path.basename(new URL(src).pathname).replace(/\.\w+$/, '').replace(/[^\w.-]+/g, '-')}.webp`;
    const file = path.join(IMG_DIR, name);
    if (!fs.existsSync(file)) {
      if (!sharp) return src;
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`${res.status}`);
        const input = Buffer.from(await res.arrayBuffer());
        await sharp(input).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 78 }).toFile(file);
        console.log(`  saved content/news-img/${name}`);
      } catch (err) {
        console.log(`  kept remote image ${src}: ${err.message}`);
        return src;
      }
    }
    linked.add(name);
    return `content/news-img/${name}`;
  }
  const local = (src) => {
    if (src.startsWith('content/news-img/')) linked.add(src.slice('content/news-img/'.length));
    if (!/^https?:/.test(src)) return src;
    if (!done.has(src)) done.set(src, copy(src));
    return done.get(src);
  };

  const IMG_SRC = /(<img\b[^>]*?\ssrc=")([^"]+)"/g;
  async function rewrite(html) {
    const srcs = [...html.matchAll(IMG_SRC)].map((m) => m[2]);
    const to = new Map();
    for (const src of srcs) to.set(src, await local(src.replace(/&amp;/g, '&')));
    return html.replace(IMG_SRC, (m, before, src) => `${before}${escAttr(to.get(src))}"`);
  }

  for (const post of news) {
    if (post.thumb) post.thumb = await local(post.thumb);
    for (const b of post.body) for (const key of ['html', 'en', 'zh']) if (b[key]) b[key] = await rewrite(b[key]);
  }
  let removed = 0;
  for (const name of fs.readdirSync(IMG_DIR))
    if (!linked.has(name)) {
      fs.rmSync(path.join(IMG_DIR, name));
      removed += 1;
    }
  console.log(`Images: ${linked.size} in content/news-img/${removed ? `, ${removed} old ones removed` : ''}.`);
}

// ---- main -------------------------------------------------------------------------

const hash = (post) => createHash('sha1').update(JSON.stringify([post.title, post.blocks])).digest('hex').slice(0, 16);

async function main() {
  const listing = parseListing(await get(`${SITE}/news`)).slice(0, LIMIT);
  if (!listing.length) throw new Error('No articles found on the news page; the site layout may have changed.');

  const posts = [];
  for (const row of listing) {
    const html = await get(`${SITE}/news/${row.id}`);
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    posts.push({ ...row, title: h1 ? textOf(h1[1]) : row.title, url: `${SITE}/news/${row.id}`, blocks: parseArticle(html) });
    console.log(`  fetched ${row.date}  ${row.id}`);
  }

  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
  const stale = posts.filter((p) => cache[p.id]?.source !== hash(p));
  if (stale.length && !TRANSLATE.key) console.log(`${stale.length} post(s) need Chinese; set TRANSLATE_API_KEY to translate them.`);
  if (stale.length && TRANSLATE.key) {
    console.log(`Translating ${stale.length} post(s) with ${TRANSLATE.model} at ${TRANSLATE.base}`);
    const terms = buildGlossary(loadData());
    for (const post of stale) {
      try {
        const zh = await translatePost(post, terms);
        cache[post.id] = { source: hash(post), ...zh };
        console.log(`  translated ${post.id}`);
      } catch (err) {
        console.log(`  kept English for ${post.id}: ${err.message}`);
      }
    }
  }

  // Keep cache entries only for posts still listed.
  const listed = new Set(posts.map((p) => p.id));
  for (const id of Object.keys(cache)) if (!listed.has(id)) delete cache[id];

  const news = posts.map((p) => {
    const zh = cache[p.id]?.source === hash(p) ? cache[p.id] : null;
    return {
      id: p.id,
      url: p.url,
      date: p.date,
      tags: p.tags,
      thumb: p.thumb,
      title: zh?.title ? { en: p.title, zh: zh.title } : { en: p.title },
      body: p.blocks.map((b, i) =>
        b.type === 'video'
          ? b
          : b.type === 'image'
            ? { type: 'image', html: b.html }
            : zh?.blocks?.[i]
              ? { type: 'html', en: b.html, zh: zh.blocks[i] }
              : { type: 'html', en: b.html }
      ),
    };
  });
  await localizeImages(news);

  fs.writeFileSync(CACHE, `${JSON.stringify(cache, null, 2)}\n`);
  fs.writeFileSync(
    OUT,
    `// Generated by scripts/fetch-news.mjs from ${SITE}/news. Do not edit.\n` +
      `window.ARC_NEWS = ${JSON.stringify(news, null, 1)};\n`
  );
  const translated = news.filter((n) => n.title.zh).length;
  console.log(`Wrote ${news.length} posts to content/news.js (${translated} with Chinese).`);
}

export { parseListing, parseArticle, sanitize, translatePost, buildGlossary, glossaryFor, loadData, localizeImages };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
