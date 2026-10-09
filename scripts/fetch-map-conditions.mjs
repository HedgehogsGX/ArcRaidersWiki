#!/usr/bin/env node
// Pulls the Map Conditions schedule from https://arcraiders.com/map-conditions
// into content/map-conditions.js, which the home page counts down from.
//
//   node scripts/fetch-map-conditions.mjs          write only when needed
//   node scripts/fetch-map-conditions.mjs --force  always write
//
// The official page embeds its schedule in the page's React payload: about the
// next 24 hours for every server region, as absolute timestamps. Because the
// times are absolute, the site stays correct between syncs, so the file is only
// rewritten when the official schedule differs from ours, or ours has less than
// REFRESH_BELOW left. The hourly workflow therefore commits a few times a day,
// and within the hour when Embark changes the schedule.
//
// Condition icons are copied once from the official site into
// assets/img/game/conditions/. Chinese names come from CLIENT_ZH, then
// data/events.js.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://arcraiders.com';
const SOURCE = `${SITE}/map-conditions`;
const OUT = path.join(ROOT, 'content/map-conditions.js');
const ICONS = 'assets/img/game/conditions';
const REFRESH_BELOW = 12 * 3600;
// The official page shows these region times as is; other regions come with their own timestamps.
const BASE_REGION = 'europe';
const FORCE = process.argv.includes('--force');

// The game client's zh-CN names (the "地图条件" table of the ARC Raiders subtitle
// glossary) for conditions that data/events.js has no Chinese for yet. Lush Blooms
// is translated from its internal name, Harvest Season, not literally.
const CLIENT_ZH = {
  'arc-frigate': 'ARC护卫者',
  'close-scrutiny': '严密排查',
  'lush-blooms': '收获季节',
  'prospecting-probes': '四处窥探的探测器',
  redirection: '航向重定向',
  'uncovered-caches': '暴露的奇袭者箱',
};

// Maps the wiki has no page for yet.
const MAP_ZH = {
  'Pendola Pass': '彭多拉山口',
};

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'ArcRaidersWiki map conditions sync (+https://github.com/HedgehogsGX/ArcRaidersWiki)' } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.text();
    } catch (err) {
      if (i >= tries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

// ---- parsing ---------------------------------------------------------------

// Next.js streams the page data as self.__next_f.push([1, "<JS string>"]) calls.
function flightPayload(html) {
  let out = '';
  const marker = 'self.__next_f.push([1,"';
  for (let at = html.indexOf(marker); at >= 0; at = html.indexOf(marker, at + 1)) {
    let i = at + marker.length;
    while (i < html.length && html[i] !== '"') i += html[i] === '\\' ? 2 : 1;
    out += JSON.parse(html.slice(at + marker.length - 1, i + 1));
  }
  return out;
}

// The JSON value that follows "key": in the payload, read up to its matching bracket.
function valueAfter(text, key) {
  const at = text.indexOf(`"${key}":`);
  if (at < 0) return undefined;
  const start = at + key.length + 3;
  if (!'[{'.includes(text[start])) return JSON.parse(/^[^,}\]]+/.exec(text.slice(start))[0]);
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      for (i++; text[i] !== '"'; i++) if (text[i] === '\\') i++;
    } else if (c === '[' || c === '{') depth++;
    else if ((c === ']' || c === '}') && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  return undefined;
}

// Same as the official site's URL slugs, which also match data/events.js ids.
const slug = (name) =>
  name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

function parseSchedule(html) {
  const payload = flightPayload(html);
  const entries = valueAfter(payload, 'liveEntries');
  const types = valueAfter(payload, 'conditionItems') || [];
  const now = valueAfter(payload, 'serverNow');
  const lookAhead = valueAfter(payload, 'lookAheadMs');
  const valid =
    Array.isArray(entries) &&
    entries.length &&
    typeof now === 'number' &&
    typeof lookAhead === 'number' &&
    entries.every(
      (e) =>
        typeof e.conditionName === 'string' &&
        typeof e.mapDisplayName === 'string' &&
        Number.isFinite(e.startTimestamp) &&
        e.endTimestamp > e.startTimestamp
    );
  if (!valid) throw new Error('Schedule not found on the map conditions page; the site layout may have changed.');
  return { entries, types, now, lookAhead };
}

// ---- names and icons -----------------------------------------------------------

function loadData(names) {
  const context = { window: {} };
  for (const name of names) {
    const file = path.join(ROOT, 'data', `${name}.js`);
    if (fs.existsSync(file)) vm.runInNewContext(fs.readFileSync(file, 'utf8'), context);
  }
  return context.window.ARC_DATA || {};
}

// Map names differ slightly between the two sites ("Spaceport" / "The Spaceport").
const mapKey = (name) => name.toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]/g, '');

// The page writes "$undefined" instead of an object when an entry has no
// per-region times (seen on Pendola Pass); every region then uses the base time.
const regionTimes = (e) => (e.regionTimestamps && typeof e.regionTimestamps === 'object' ? e.regionTimestamps : {});

async function icon(id) {
  const rel = `${ICONS}/${id}.svg`;
  const file = path.join(ROOT, rel);
  if (fs.existsSync(file)) return rel;
  try {
    const svg = await get(`${SITE}/icons/map-conditions/${id}.svg`);
    // Shown through <img>, where scripts never run; still keep only plain drawings.
    if (!/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/.test(svg) || /<script|<foreignObject|\son\w+\s*=/i.test(svg)) throw new Error('not a plain SVG');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, svg);
    console.log(`  saved icon ${rel}`);
    return rel;
  } catch (err) {
    console.log(`  no icon for ${id}: ${err.message}`);
    return null;
  }
}

async function build({ entries, types, now, lookAhead }) {
  const data = loadData(['labels', 'events']);
  const eventNames = Object.fromEntries((data.events || []).map((e) => [e.id, e.name]));
  const mapIds = Object.fromEntries(Object.entries(data.labels?.maps || {}).map(([id, name]) => [mapKey(name.en), [id, name]]));
  const major = new Set(types.filter((c) => c.type === 'major').map((c) => c.name));

  const conditions = {};
  for (const name of [...new Set(entries.map((e) => e.conditionName))].sort()) {
    const id = slug(name);
    const zh = CLIENT_ZH[id] || eventNames[id]?.zh;
    if (!zh) console.log(`  no Chinese name for "${name}"; add the game's wording to CLIENT_ZH`);
    conditions[id] = { name: zh ? { en: name, zh } : { en: name }, major: major.has(name), icon: await icon(id) };
  }

  const maps = {};
  const mapOf = {};
  for (const name of [...new Set(entries.map((e) => e.mapDisplayName))].sort()) {
    // The wiki's own names, so the home page reads like the rest of the site.
    const [id, label] = mapIds[mapKey(name)] || [slug(name).replace(/-/g, '_'), MAP_ZH[name] ? { en: name, zh: MAP_ZH[name] } : { en: name }];
    if (!mapIds[mapKey(name)]) console.log(`  map "${name}" is not in data/labels.js${MAP_ZH[name] ? '' : '; add its Chinese name to MAP_ZH'}`);
    maps[id] = label;
    mapOf[name] = id;
  }

  const regions = [BASE_REGION, ...new Set(entries.flatMap((e) => Object.keys(regionTimes(e))))];
  const sec = (ms) => Math.round(ms / 1000);
  return {
    source: SOURCE,
    fetched: sec(now),
    until: sec(now + lookAhead),
    regions,
    conditions,
    maps,
    // [condition, map, duration, start in each region, in `regions` order]
    entries: entries
      .map((e) => [
        slug(e.conditionName),
        mapOf[e.mapDisplayName],
        sec(e.endTimestamp - e.startTimestamp),
        regions.map((r) => sec(r === BASE_REGION ? e.startTimestamp : regionTimes(e)[r]?.[0] ?? e.startTimestamp)),
      ])
      .sort((a, b) => a[3][0] - b[3][0] || a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])),
  };
}

// ---- deciding whether to write -------------------------------------------------------

function loadPublished() {
  if (!fs.existsSync(OUT)) return null;
  try {
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(OUT, 'utf8'), context);
    return context.window.ARC_MAP_CONDITIONS || null;
  } catch {
    return null;
  }
}

// Occurrences that are running or start before `until`, per region, as comparable strings.
function occurrences(schedule, from, until) {
  return schedule.regions
    .flatMap((region, r) =>
      schedule.entries
        .filter(([, , duration, starts]) => starts[r] + duration > from && starts[r] < until)
        .map(([condition, map, duration, starts]) => `${region} ${condition} ${map} ${starts[r]} ${duration}`)
    )
    .sort()
    .join('\n');
}

function reasonToWrite(old, next) {
  if (FORCE) return 'forced';
  if (!old?.regions || !old.entries) return 'no published schedule';
  if (old.regions.join() !== next.regions.join()) return 'server regions changed';
  // Which conditions and maps are listed follows the rolling window; only a change to a shared one counts.
  const renamed = (a, b) => Object.keys(b).some((id) => a[id] && JSON.stringify(a[id]) !== JSON.stringify(b[id]));
  if (renamed(old.conditions, next.conditions) || renamed(old.maps, next.maps)) return 'names or icons changed';
  const until = Math.min(old.until, next.until);
  if (occurrences(old, next.fetched, until) !== occurrences(next, next.fetched, until)) return 'official schedule changed';
  const left = old.until - next.fetched;
  if (left < REFRESH_BELOW) return `published schedule runs out in ${(left / 3600).toFixed(1)} h`;
  return null;
}

async function main() {
  const next = await build(parseSchedule(await get(SOURCE)));
  const old = loadPublished();
  const reason = reasonToWrite(old, next);
  const span = `${next.entries.length} entries, ${next.regions.length} regions, until ${new Date(next.until * 1000).toISOString()}`;
  if (!reason) {
    console.log(`Schedule matches the official page (${span}); ${((old.until - next.fetched) / 3600).toFixed(1)} h left. Nothing written.`);
    return;
  }
  // One entry per line, so each sync's diff shows what moved.
  const { entries, ...head } = next;
  const lines = [
    ...Object.entries(head).map(([k, v]) => ` ${JSON.stringify(k)}: ${JSON.stringify(v)}`),
    ` "entries": [\n${entries.map((e) => `  ${JSON.stringify(e)}`).join(',\n')}\n ]`,
  ];
  fs.writeFileSync(
    OUT,
    `// Generated by scripts/fetch-map-conditions.mjs from ${SOURCE}. Do not edit.\n` +
      `window.ARC_MAP_CONDITIONS = {\n${lines.join(',\n')}\n};\n`
  );
  console.log(`Wrote content/map-conditions.js (${reason}): ${span}.`);
}

export { parseSchedule, build, reasonToWrite };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
