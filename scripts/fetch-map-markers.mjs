#!/usr/bin/env node
// Pulls the community map markers (ARC spawns, containers, plants, extractions,
// quest spots …) from MetaForge into content/map-markers/, for the interactive
// map at pages/map.html.
//
//   node scripts/fetch-map-markers.mjs
//
// MetaForge's API (https://metaforge.app/arc-raiders/api) may be used in public
// projects that credit it with a link to metaforge.app/arc-raiders; the map page
// and README do. Its markers are placed on MetaForge's own map images, so each
// map's AFFINE below converts them onto this site's tiles (the arctracker images
// from arcraiders-data). The coefficients come from matching the two sites' map
// images with SIFT features (thousands of matches per map, about half a unit of
// error on the 1000-unit grid). MetaForge's coordinates are world positions and
// stay put when they re-render their images, so only a change to our tiles calls
// for recalibrating.
//
// Output: one file per map with its markers, and index.js with the marker types,
// condition names and per-map counts. Chinese names come from the game client
// (glossary-client.json), then this site's data (ARC, items, quests), then the
// site's own wording in TYPES.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { CLIENT } from './glossary.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'content/map-markers');
const API = 'https://metaforge.app/api/game-map-data?tableID=arc_map_data&mapID=';
const CREDIT = 'https://metaforge.app/arc-raiders';

// MetaForge map id, [x, y] = AFFINE · [lng, lat, 1], what each bit of a marker's
// `zlayers` means, and what each bit of its `eventConditionMask` means (bit 0 is
// a raid with no condition). Stella Montis uses one grid for both floors: its top
// floor image spans x 0–1000 (see MAP_LEVELS in build-data.mjs).
const MAPS = {
  dam_battlegrounds: {
    mf: 'dam',
    affine: [[0.160053, -0.000004, -135.969276], [0.000004, 0.160083, 60.561896]],
    conditions: { 1: 'prospecting-probes', 2: 'harvester', 3: 'uncovered-caches', 4: 'husk-graveyard', 5: 'electromagnetic-storm', 6: 'lush-blooms', 7: 'night-raid', 8: 'matriarch', 9: 'cold-snap', 12: 'hurricane', 14: 'close-scrutiny' },
  },
  the_spaceport: {
    mf: 'spaceport',
    affine: [[0.194795, 0, -270.417172], [0, 0.194884, 36.065436]],
    layers: { 0: 'under', 1: 'surface' },
    conditions: { 1: 'prospecting-probes', 2: 'harvester', 3: 'uncovered-caches', 4: 'husk-graveyard', 5: 'launch-tower-loot', 6: 'lush-blooms', 7: 'night-raid', 8: 'electromagnetic-storm', 9: 'hidden-bunker', 10: 'matriarch', 11: 'cold-snap', 12: 'hurricane', 14: 'close-scrutiny' },
  },
  buried_city: {
    mf: 'buried-city',
    affine: [[0.177146, -0.00008, -764.39901], [0.00008, 0.177146, -357.772417]],
    conditions: { 1: 'prospecting-probes', 3: 'uncovered-caches', 4: 'husk-graveyard', 6: 'lush-blooms', 7: 'night-raid', 8: 'cold-snap', 12: 'hurricane', 14: 'close-scrutiny' },
  },
  the_blue_gate: {
    mf: 'blue-gate',
    affine: [[0.094005, 0.000002, -182.535519], [-0.000002, 0.094073, 37.183327]],
    layers: { 0: 'under', 1: 'surface' },
    conditions: { 2: 'harvester', 3: 'uncovered-caches', 4: 'husk-graveyard', 6: 'lush-blooms', 7: 'night-raid', 8: 'electromagnetic-storm', 9: 'cold-snap', 10: 'matriarch', 12: 'hurricane', 13: 'locked-gate', 14: 'close-scrutiny' },
  },
  stella_montis: {
    mf: 'stella-montis',
    affine: [[0.210437, 0.000003, -374.491374], [-0.000003, 0.210275, -220.034676]],
    layers: { 0: 'bottom', 1: 'top' },
    conditions: { 7: 'night-raid' },
  },
  riven_tides: {
    mf: 'riven-tides',
    affine: [[0.113281, -0.000048, -340.295046], [0.000048, 0.113281, -107.61198]],
    conditions: { 7: 'night-raid', 15: 'beachcombing' },
  },
};

// English names of the conditions, for the client's Chinese.
const CONDITIONS = {
  'prospecting-probes': 'Prospecting Probes',
  harvester: 'Harvester',
  'uncovered-caches': 'Uncovered Caches',
  'husk-graveyard': 'Husk Graveyard',
  'electromagnetic-storm': 'Electromagnetic Storm',
  'lush-blooms': 'Lush Blooms',
  'night-raid': 'Night Raid',
  matriarch: 'Matriarch',
  'cold-snap': 'Cold Snap',
  hurricane: 'Hurricane',
  'close-scrutiny': 'Close Scrutiny',
  'launch-tower-loot': 'Launch Tower Loot',
  'hidden-bunker': 'Hidden Bunker',
  'locked-gate': 'Locked Gate',
  beachcombing: 'Beachcombing',
};

// Marker types, in the order the map lists them. `mf` is MetaForge's
// category/subcategory; `arc`, `item` and `quest` take the name from the site's
// data and link to it. Other names are the client's where it has one (CLIENT),
// else `zh` here. source: site for every `zh` below.
const TYPES = [
  // ARC, by the threat order of the ARC page.
  ...[
    ['matriarch', 'arc_matriarch'],
    ['queen', 'arc_the_queen'],
    ['bastion', 'arc_bastion'],
    ['bombardier', 'arc_bombardier'],
    ['bison', 'arc_leaper'], // MetaForge's key for the Leaper
    ['rocketeer', 'arc_rocketeer'],
    ['fireball', 'arc_fireball'],
    ['hornet ', 'arc_hornet'], // sic, with the space
    ['sentinel', 'arc_sentinel'],
    ['shredder', 'arc_shredder'],
    ['spotter', 'arc_spotter'],
    ['pop', 'arc_pop'],
    ['snitch', 'arc_snitch'],
    ['tick', 'arc_tick'],
    ['turret', 'arc_turret'],
    ['wasp', 'arc_wasp'],
    ['rollbot', 'arc_surveyor'], // MetaForge's key for the Surveyor
  ].map(([mf, id]) => ({ id, group: 'arc', mf: `arc/${mf}`, arc: id })),
  // ARC the site has no page for yet (not in arcraiders-data 1.42).
  { id: 'arc_comet', group: 'arc', mf: 'arc/comet', en: 'Comet' },
  { id: 'arc_firefly', group: 'arc', mf: 'arc/firefly', en: 'Firefly' },
  { id: 'arc_vaporizer', group: 'arc', mf: 'arc/vaporizer', en: 'Vaporizer' },
  { id: 'arc_turbine', group: 'arc', mf: 'arc/turbine', en: 'ARC Turbine' },

  { id: 'weapon_case', group: 'loot', mf: 'containers/weapon_case', en: 'Weapon Case', zh: '武器箱', glyph: 'case' },
  { id: 'ammo_crate', group: 'loot', mf: 'containers/ammo_crate', en: 'Ammo Crate', zh: '弹药箱', glyph: 'ammo' },
  { id: 'med_crate', group: 'loot', mf: 'containers/med_crate', en: 'Med Crate', zh: '医疗箱', glyph: 'med' },
  { id: 'utility_crate', group: 'loot', mf: 'containers/utility_crate', en: 'Grenade Tube', zh: '手雷筒', glyph: 'grenade' },
  { id: 'combat_supplies', group: 'loot', mf: 'containers/combat_supplies', en: 'Combat Supplies', zh: '战斗补给', glyph: 'case' },
  { id: 'raider_cache', group: 'loot', mf: 'containers/raider_cache', en: 'Raider Cache', glyph: 'cache' },
  { id: 'hurricane_cache', group: 'loot', mf: 'containers/hurricane_cache', en: 'Hurricane Cache', zh: '飓风物资箱', glyph: 'cache' },
  { id: 'security_breach', group: 'loot', mf: 'containers/security_breach', en: 'Security Breach safe', zh: '保险柜（安防突破）', glyph: 'safe' },
  { id: 'breachable_container', group: 'loot', mf: 'containers/breachable_container', en: 'Breachable Container', zh: '可突破的容器', glyph: 'breach' },
  { id: 'locker', group: 'loot', mf: 'containers/locker', en: 'Lockers', glyph: 'locker' },
  { id: 'container', group: 'loot', mf: ['containers/base_container', 'containers/electrical_container', 'containers/industrial_container'], en: 'Container', glyph: 'box' },
  { id: 'box', group: 'loot', mf: 'containers/box', en: 'Boxes', zh: '盒子', glyph: 'box' },
  { id: 'car', group: 'loot', mf: 'containers/car', en: 'Cars', zh: '车辆', glyph: 'car' },
  { id: 'bag', group: 'loot', mf: 'containers/bag', en: 'Bags', zh: '袋子', glyph: 'bag' },
  { id: 'basket', group: 'loot', mf: 'containers/basket', en: 'Baskets', zh: '篮子', glyph: 'bag' },
  { id: 'arc_probe', group: 'loot', mf: 'containers/arc_probe', en: 'ARC Probe', glyph: 'probe' },
  { id: 'arc_courier', group: 'loot', mf: 'containers/arc_courier', en: 'ARC Courier', glyph: 'probe' },
  { id: 'baron_husk', group: 'loot', mf: 'containers/baron_husk', en: 'Baron Husk', glyph: 'husk' },
  { id: 'rocketeer_husk', group: 'loot', mf: 'containers/rocketeer_husk', en: 'Rocketeer Husk', zh: '“火箭手”残骸', glyph: 'husk' },
  { id: 'wasp_husk', group: 'loot', mf: 'containers/wasp_husk', en: 'Wasp Husk', zh: '“黄蜂”残骸', glyph: 'husk' },
  { id: 'deforester_husk', group: 'loot', mf: 'containers/deforester_husk', en: 'Deforester Husk', zh: '“伐林者”残骸', glyph: 'husk' },
  { id: 'arc_husk', group: 'loot', mf: 'containers/arc_husk', en: 'ARC Husk', zh: 'ARC残骸', glyph: 'husk' },
  { id: 'android', group: 'loot', mf: 'containers/android', en: 'Android', zh: '仿生人', glyph: 'android' },

  ...[
    ['great-mullein', 'great_mullein'],
    ['candleberries', 'candleberries'],
    ['moss', 'moss'],
    ['mushroom', 'mushroom'],
    ['agave', 'agave'],
    ['prickly-pear', 'prickly_pear'],
    ['apricot', 'apricot'],
    ['lemons', 'lemon'],
    ['olive', 'olives'],
    ['roots', 'roots'],
    ['fertilizer', 'fertilizer'],
  ].map(([mf, id]) => ({ id, group: 'nature', mf: `nature/${mf}`, item: id })),

  { id: 'extraction', group: 'place', mf: 'locations/extraction', en: 'Extraction point', zh: '撤离点', glyph: 'exit' },
  { id: 'hatch', group: 'place', mf: 'locations/hatch', en: 'Raider Hatch', glyph: 'hatch' },
  { id: 'metro_station', group: 'place', mf: 'locations/metro_station', en: 'Metro Station', glyph: 'metro' },
  { id: 'metro_entrance', group: 'place', mf: 'locations/metro_entrance', en: 'Metro entrance', zh: '地铁入口', glyph: 'metro' },
  { id: 'locked_room', group: 'place', mf: 'locations/locked_room', en: 'Locked room', glyph: 'key' },
  { id: 'breach_room', group: 'place', mf: 'locations/breach_room', en: 'Breach room', zh: '可突破的房间', glyph: 'breach' },
  { id: 'supply_station', group: 'place', mf: 'locations/supply_station', en: 'Supply Call Station', glyph: 'supply' },
  { id: 'field_depot', group: 'place', mf: 'locations/field_depot', en: 'Field Depot', glyph: 'depot' },
  { id: 'field_crate', group: 'place', mf: 'locations/field_crate', en: 'Field Crate', glyph: 'box' },
  { id: 'raider_camp', group: 'place', mf: 'locations/raider_camp', en: 'Raider Camp', glyph: 'camp' },
  { id: 'fuel_cell', group: 'place', mf: 'locations/fuel-cell', en: 'Fuel cell', zh: '燃料电池', glyph: 'bolt' },
  { id: 'button', group: 'place', mf: 'locations/button', en: 'Button', zh: '按钮', glyph: 'button' },
  { id: 'antenna', group: 'place', mf: ['locations/antenna', 'events/antenna'], en: 'Antenna', zh: '天线', glyph: 'antenna' },
  { id: 'player_spawn', group: 'place', mf: 'locations/player_spawn', en: 'Raider spawn', zh: '出生点', glyph: 'spawn' },

  { id: 'harvester', group: 'event', mf: 'events/harvester', en: 'Harvester', glyph: 'star' },
  { id: 'hidden_bunker', group: 'event', mf: 'events/bunker', en: 'Hidden Bunker', glyph: 'star' },
  { id: 'locked_gate_key', group: 'event', mf: 'events/locked_gate_key', en: 'Locked Gate key', zh: '上锁的大门钥匙', glyph: 'key' },
  { id: 'assessor', group: 'event', mf: 'events/assessor', en: 'Assessor', zh: '评估者', glyph: 'star' },
  { id: 'snow_pile', group: 'event', mf: 'events/snow_pile', en: 'Snow pile', zh: '雪堆', glyph: 'snow' },
  { id: 'ship_model', group: 'event', mf: 'events/ship_model', en: 'Ship model', zh: '船模', glyph: 'ship' },
  { id: 'bird_nest', group: 'event', mf: 'events/bird', en: 'Bird nest', zh: '鸟巢', glyph: 'bird' },
  { id: 'dig_spot', group: 'event', mf: 'events/dig_spot', en: 'Dig spot', zh: '挖掘点', glyph: 'dig' },
  { id: 'mine', group: 'event', mf: 'events/mine', en: 'Mine', zh: '地雷', glyph: 'mine' },
  { id: 'puzzle_button', group: 'event', mf: 'events/puzzle_button', en: 'Puzzle button', zh: '谜题按钮', glyph: 'button' },

  // Every quest shares one type; each marker says which quest.
  { id: 'quest', group: 'quest', mf: 'quests/*', en: 'Quest location', zh: '任务地点', glyph: 'quest' },
];

const BY_MF = new Map(TYPES.flatMap((t) => [t.mf].flat().map((mf) => [mf, t])));

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'ArcRaidersWiki map markers sync (+https://github.com/HedgehogsGX/ArcRaidersWiki)' } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (err) {
      if (i >= tries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

function loadData(names) {
  const context = { window: {} };
  for (const name of names) vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data', `${name}.js`), 'utf8'), context);
  return context.window.ARC_DATA;
}

const withZh = (en, zh) => (zh && zh !== en ? { en, zh } : { en });
const client = (en) => CLIENT.get(en.toLowerCase());
const plain = (s) => s.toLowerCase().replace(/[^a-z]/g, '').replace(/s$/, '');

// ---- types ---------------------------------------------------------------------

function typeTable(data) {
  const bots = new Map(data.arc.map((b) => [b.id, b]));
  const out = {};
  for (const t of TYPES) {
    const entry = { group: t.group };
    if (t.arc) {
      const b = bots.get(t.arc);
      if (!b) throw new Error(`No ARC ${t.arc} in data/arc.js`);
      Object.assign(entry, { name: b.name, threat: b.threat, link: ['arc', b.id] });
    } else if (t.item) {
      const row = data.itemIndex[t.item];
      if (!row) throw new Error(`No item ${t.item} in data/itemIndex.js`);
      const [en, zh, img] = row;
      Object.assign(entry, { name: withZh(en, zh), img, link: ['item', t.item] });
    } else {
      const zh = client(t.en) ?? t.zh;
      if (!zh) console.log(`  no Chinese for marker type "${t.en}"`);
      entry.name = withZh(t.en, zh);
    }
    if (t.group === 'arc' && !t.arc) entry.name = withZh(t.en, client(t.en));
    if (t.glyph) entry.glyph = t.glyph;
    out[t.id] = entry;
  }
  return out;
}

// ---- markers -------------------------------------------------------------------

// A MetaForge note is free text from whoever placed the marker. Keep it when it
// says more than the type name; use the client's Chinese when it is a place name.
function noteFor(raw, type, mfSub) {
  const text = raw?.trim().replace(/\s+/g, ' ');
  if (!text) return null;
  const p = plain(text);
  if (p === plain(type.name.en) || p === plain(mfSub) || (type.name.zh && text === type.name.zh)) return null;
  return withZh(text, client(text));
}

function convert(mapId, conf, rows, types, quests) {
  const [[a, b, c], [d, e, f]] = conf.affine;
  const notes = [];
  const noteIndex = new Map();
  const questNames = {};
  const skipped = {};
  const out = [];
  for (const m of rows) {
    const key = `${m.category}/${m.subcategory}`;
    const def = BY_MF.get(key) || (m.category === 'quests' ? BY_MF.get('quests/*') : null);
    if (!def) {
      skipped[key] = (skipped[key] || 0) + 1;
      continue;
    }
    const x = Math.round((a * m.lng + b * m.lat + c) * 10) / 10;
    const y = Math.round((d * m.lng + e * m.lat + f) * 10) / 10;
    const extra = {};

    if (def.id === 'quest') {
      const id = m.subcategory.replace(/-/g, '_');
      const q = quests.get(id);
      extra.q = q ? id : m.subcategory;
      if (!q && !questNames[extra.q]) console.log(`  ${mapId}: no quest "${id}" in data/quests.js; shown without a link`);
      questNames[extra.q] = q ? q.name : { en: m.subcategory.replace(/-/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase()) };
    }

    // On one layer only: say which. On every layer (or a map with one): nothing.
    if (conf.layers) {
      const on = Object.keys(conf.layers).filter((bit) => m.zlayers & (1 << bit));
      if (on.length === 1) extra.l = conf.layers[on[0]];
    }

    // Conditions it is tied to; "normal" means it is also there without one.
    const mask = m.eventConditionMask ?? 1;
    if (mask !== 1) {
      const list = [];
      for (let bit = 0; bit < 16; bit++) {
        if (!(mask & (1 << bit))) continue;
        if (bit === 0) list.push('normal');
        else if (conf.conditions[bit]) list.push(conf.conditions[bit]);
        else console.log(`  ${mapId}: unknown condition bit ${bit}`);
      }
      if (list.length && !(list.length === 1 && list[0] === 'normal')) extra.c = list;
    }

    if (m.behindLockedDoor) extra.k = 1;
    const areas = (m.lootAreas || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (areas.length) extra.a = areas;

    const note = noteFor(m.instanceName, types[def.id], m.subcategory);
    if (note) {
      const k = JSON.stringify(note);
      if (!noteIndex.has(k)) noteIndex.set(k, notes.push(note) - 1);
      extra.n = noteIndex.get(k);
    }
    out.push({ sort: `${def.id} ${m.id}`, row: Object.keys(extra).length ? [x, y, def.id, extra] : [x, y, def.id] });
  }
  for (const [key, n] of Object.entries(skipped)) console.log(`  ${mapId}: skipped ${n} "${key}" (add it to TYPES)`);
  // Stable order, so each sync's diff shows only what moved.
  out.sort((p, q) => (p.sort < q.sort ? -1 : 1));
  return { markers: out.map((o) => o.row), notes, quests: questNames };
}

function write(file, variable, key, head, markers) {
  const lines = [
    ...Object.entries(head).map(([k, v]) => ` ${JSON.stringify(k)}: ${JSON.stringify(v)}`),
    ` "markers": [\n${markers.map((m) => `  ${JSON.stringify(m)}`).join(',\n')}\n ]`,
  ];
  fs.writeFileSync(
    file,
    `// Generated by scripts/fetch-map-markers.mjs from ${CREDIT}. Do not edit.\n` +
      `(window.${variable} = window.${variable} || {})[${JSON.stringify(key)}] = {\n${lines.join(',\n')}\n};\n`
  );
}

async function main() {
  const data = loadData(['arc', 'itemIndex', 'quests']);
  const quests = new Map(data.quests.map((q) => [q.id, q]));
  const types = typeTable(data);
  const fetched = Math.round(Date.now() / 1000);
  const counts = {};
  const questMaps = {};
  const used = new Set();
  fs.mkdirSync(OUT, { recursive: true });

  for (const [mapId, conf] of Object.entries(MAPS)) {
    const rows = (await get(API + conf.mf)).allData;
    if (!Array.isArray(rows) || !rows.length) throw new Error(`No markers for ${conf.mf}; the API may have changed.`);
    const { markers, notes, quests: questNames } = convert(mapId, conf, rows, types, quests);
    counts[mapId] = {};
    for (const [, , type, extra] of markers) {
      counts[mapId][type] = (counts[mapId][type] || 0) + 1;
      extra?.c?.forEach((c) => used.add(c));
      if (extra?.q) (questMaps[extra.q] ||= {})[mapId] = (questMaps[extra.q][mapId] || 0) + 1;
    }
    write(path.join(OUT, `${mapId}.js`), 'ARC_MARKERS', mapId, { fetched, notes, quests: questNames }, markers);
    console.log(`  ${mapId}: ${markers.length} markers`);
  }

  const conditions = {};
  for (const [id, en] of Object.entries(CONDITIONS)) {
    if (!used.has(id)) continue;
    const zh = client(en);
    if (!zh) console.log(`  no Chinese for condition "${en}"`);
    conditions[id] = withZh(en, zh);
  }
  // One type, map or quest per line.
  const lines = (obj) => `{\n${Object.entries(obj).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n }`;
  const index = { source: CREDIT, fetched, types, conditions, counts, quests: questMaps };
  fs.writeFileSync(
    path.join(OUT, 'index.js'),
    `// Generated by scripts/fetch-map-markers.mjs from ${CREDIT}. Do not edit.\n` +
      `window.ARC_MARKER_INDEX = {\n${Object.entries(index)
        .map(([k, v]) => ` ${JSON.stringify(k)}: ${v && typeof v === 'object' ? lines(v) : JSON.stringify(v)}`)
        .join(',\n')}\n};\n`
  );
  const total = Object.values(counts).reduce((n, c) => n + Object.values(c).reduce((a, b) => a + b, 0), 0);
  console.log(`Wrote content/map-markers/ (${total} markers on ${Object.keys(MAPS).length} maps).`);
}

export { MAPS, TYPES, convert };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
