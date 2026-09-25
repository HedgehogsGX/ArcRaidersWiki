#!/usr/bin/env node
// Builds the site's data bundles from the upstream RaidTheory/arcraiders-data
// submodule in vendor/arcraiders-data.
//
//   node scripts/build-data.mjs            data bundles only (any OS)
//   node scripts/build-data.mjs --images   also regenerate game images (macOS, uses sips)
//
// Output goes to data/*.js. Each bundle assigns into window.ARC_DATA so pages can
// load it with a plain <script> tag and still work when opened from disk.
// Upstream ships 20 locales; only en and zh-CN are kept.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOTS, BOT_TYPES, EFFECT_VALUES, MOD_SLOTS, THREATS, TRADERS } from './glossary.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'vendor/arcraiders-data');
const OUT = path.join(ROOT, 'data');
const IMG_OUT = path.join(ROOT, 'assets/img/game');
const WITH_IMAGES = process.argv.includes('--images');

if (!fs.existsSync(path.join(SRC, 'items'))) {
  console.error('vendor/arcraiders-data is empty. Run: git submodule update --init');
  process.exit(1);
}

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(SRC, rel), 'utf8'));
const readDir = (rel) =>
  fs.readdirSync(path.join(SRC, rel))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => readJson(path.join(rel, f)));

const ui = readJson('arctracker-ui/zh-CN.json');

// ---- helpers -------------------------------------------------------------

// Upstream text is either a locale map or a plain English string.
function text(v) {
  if (v == null || v === '') return undefined;
  if (typeof v === 'string') return { en: clean(v) };
  const en = clean(v.en);
  const zh = clean(v['zh-CN']);
  if (!en && !zh) return undefined;
  return zh && zh !== en ? { en, zh } : { en };
}

function clean(s) {
  return typeof s === 'string' ? s.replace(/\r\n/g, '\n').trim() : undefined;
}

// {id: qty} or [{itemId, quantity}] → [[id, qty], …]
function pairs(v) {
  if (!v) return undefined;
  const list = Array.isArray(v)
    ? v.map((r) => [r.itemId, r.quantity])
    : Object.entries(v);
  return list.length ? list : undefined;
}

const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const withZh = (en, zh) => (zh && zh !== en ? { en, zh } : { en });

// Drop undefined / empty values so bundles stay small.
function compact(obj) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined || v === null || v === false || (Array.isArray(v) && !v.length)) delete obj[k];
  }
  return obj;
}

// ---- items -----------------------------------------------------------------

const rawItems = readDir('items');
const itemNameByEn = new Map(rawItems.map((i) => [i.name.en, i.name['zh-CN']]));

function effects(raw) {
  if (!raw) return undefined;
  const out = [];
  for (const [key, e] of Object.entries(raw)) {
    if (!e || typeof e !== 'object') continue;
    let value = e.value;
    if (typeof value === 'string') {
      const zh = value.split(', ').map((part) => EFFECT_VALUES[part] || itemNameByEn.get(part) || part).join('、');
      value = withZh(value, zh === value ? undefined : zh);
    }
    out.push(compact({ label: withZh(e.en || key, e['zh-CN']), value }));
  }
  return out.length ? out : undefined;
}

const items = rawItems.map((i) =>
  compact({
    id: i.id,
    name: text(i.name),
    desc: text(i.description),
    type: i.type,
    rarity: i.rarity,
    value: i.value,
    weight: i.weightKg,
    stack: i.stackSize,
    img: i.imageFilename,
    bench: i.craftBench ? list(i.craftBench) : undefined,
    level: i.stationLevelRequired,
    recipe: pairs(i.recipe),
    craftQty: i.craftQuantity,
    recycles: pairs(i.recyclesInto),
    salvages: pairs(i.salvagesInto),
    upgradeCost: pairs(i.upgradeCost),
    repairCost: pairs(i.repairCost),
    upgradesTo: i.upgradesTo,
    effects: effects(i.effects),
    foundIn: i.foundIn ? i.foundIn.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    compatible: i.compatibleWith,
    mods: i.modSlots,
    vendors: i.vendors?.map((v) =>
      compact({ trader: v.trader, cost: pairs(v.cost), limit: v.limit, level: v.requiredLevel })
    ),
    blueprint: i.blueprintLocked,
    questItem: i.questItem,
    tip: text(i.tip),
    added: i.addedIn,
  })
);
const itemIds = new Set(items.map((i) => i.id));

// ---- quests ----------------------------------------------------------------

const rawQuests = readDir('quests');
const quests = rawQuests.map((q) =>
  compact({
    id: q.id,
    name: text(q.name),
    desc: text(q.description),
    trader: q.trader,
    maps: q.map,
    objectives: q.objectives?.map(text),
    oneRound: q.objectivesOneRound,
    required: pairs(q.requiredItemIds),
    rewards: pairs(q.rewardItemIds),
    granted: pairs(q.grantedItemIds),
    other: q.otherRequirements,
    xp: q.xp || undefined,
    prev: q.previousQuestIds,
    next: q.nextQuestIds,
  })
);

// Depth in the quest chain: roots are 1, everything else is one past its deepest prerequisite.
{
  const byId = new Map(quests.map((q) => [q.id, q]));
  const depth = (q, seen = new Set()) => {
    if (q.depth) return q.depth;
    if (seen.has(q.id)) return 1;
    seen.add(q.id);
    const parents = (q.prev || []).map((id) => byId.get(id)).filter(Boolean);
    q.depth = parents.length ? 1 + Math.max(...parents.map((p) => depth(p, seen))) : 1;
    return q.depth;
  };
  quests.forEach((q) => depth(q));
  quests.sort((a, b) => a.depth - b.depth || a.name.en.localeCompare(b.name.en));
}

// ---- skills ----------------------------------------------------------------

const skillCats = ui.SkillTreePage.categories;
const skills = readJson('skillNodes.json').map((s) =>
  compact({
    id: s.id,
    name: text(s.name),
    desc: text(s.description),
    category: s.category,
    major: s.isMajor,
    max: s.maxPoints,
    impact: text(s.impactedSkill),
    known: s.knownValue,
    x: s.position.x,
    y: s.position.y,
    prereq: s.prerequisiteNodeIds,
  })
);
const skillCategories = Object.keys(skillCats).map((id) => ({
  id,
  name: withZh(titleCase(id), skillCats[id]),
}));

// ---- hideout ---------------------------------------------------------------

const STATION_IMAGES = {
  weapon_bench: 'gunsmith',
  equipment_bench: 'gearbench',
  explosives_bench: 'explosivesstation',
  med_station: 'medicallab',
  refiner: 'refiner',
  utility_bench: 'utilitystation',
};
const STATION_ORDER = ['workbench', 'weapon_bench', 'equipment_bench', 'utility_bench', 'explosives_bench', 'med_station', 'refiner', 'scrappy', 'stash'];

const hideout = readDir('hideout')
  .map((h) =>
    compact({
      id: h.id,
      name: text(h.name),
      img: STATION_IMAGES[h.id] && `assets/img/game/stations/${h.id}.png`,
      maxLevel: h.maxLevel,
      levels: h.levels.map((l) =>
        compact({ level: l.level, items: pairs(l.requirementItemIds), desc: l.description, other: l.otherRequirements })
      ),
    })
  )
  .sort((a, b) => STATION_ORDER.indexOf(a.id) - STATION_ORDER.indexOf(b.id));
// What each station level lets you craft: { level: [itemId, …] }. Items without
// a level requirement count as level 1.
for (const station of hideout) {
  const byLevel = {};
  for (const i of items) {
    if (!(i.bench || []).includes(station.id)) continue;
    (byLevel[i.level || 1] ||= []).push(i.id);
  }
  if (Object.keys(byLevel).length) station.crafts = byLevel;
}
// Crafting in the field, not at a station.
const benchNames = { in_raid: { en: 'In-raid', zh: ui.ItemDetailPage.inRaidCrafting } };

// ---- ARC -------------------------------------------------------------------

const THREAT_RANK = Object.keys(THREATS);
const bots = readJson('bots.json')
  .map((b) =>
    compact({
      id: b.id,
      name: withZh(titleCase(b.name), BOTS[b.id]),
      type: withZh(b.type, BOT_TYPES[b.type]),
      threat: b.threat,
      desc: text(b.description),
      weakness: text(b.weakness),
      maps: b.maps,
      xp: { destroy: b.destroyXp, loot: b.lootXp },
      drops: b.drops,
      img: `assets/img/game/arc/${b.id}.jpg`,
    })
  )
  .sort((a, b) => THREAT_RANK.indexOf(b.threat) - THREAT_RANK.indexOf(a.threat) || a.name.en.localeCompare(b.name.en));
const threats = THREAT_RANK.map((id) => ({ id, name: withZh(id, THREATS[id]) }));

// ---- maps & events -----------------------------------------------------------

// Upstream uses different ids for the tile folders than for maps.json.
const MAP_TILES = {
  dam_battlegrounds: 'dam-battleground',
  the_spaceport: 'the-spaceport',
  buried_city: 'buried-city',
  the_blue_gate: 'blue-gate',
  riven_tides: 'riven-tides',
};
const MAP_SINGLE = {
  stella_montis_upper: 'images/maps/stella_montis_upper.png',
  stella_montis_lower: 'images/maps/stella_montis_lower.png',
};
const LEVEL_SUFFIX = {
  stella_montis_upper: { en: 'Upper', zh: '上层' },
  stella_montis_lower: { en: 'Lower', zh: '下层' },
};

const maps = readJson('maps.json').map((m) => {
  const suffix = LEVEL_SUFFIX[m.id];
  const name = text(m.name);
  if (suffix) {
    name.en = `${name.en} (${suffix.en})`;
    if (name.zh) name.zh = `${name.zh}（${suffix.zh}）`;
  }
  return compact({
    id: m.id,
    name,
    tiles: MAP_TILES[m.id] && [0, 1, 2, 3].map((n) => `assets/img/game/maps/${m.id}/${n}.webp`),
    img: MAP_SINGLE[m.id] && `assets/img/game/maps/${m.id}.jpg`,
  });
});

const rawEvents = readJson('map-events/map-events.json').eventTypes;
const events = Object.entries(rawEvents)
  .filter(([id, e]) => id !== 'none' && !e.disabled)
  .map(([id, e]) =>
    compact({
      id,
      name: withZh(e.displayName, e.localizations?.['zh-CN']),
      category: e.category,
      icon: e.icon,
    })
  );

// ---- traders -----------------------------------------------------------------

const trades = readJson('trades.json');
const traders = Object.keys(TRADERS).map((name) => {
  const id = name.toLowerCase().replace(/\s+/g, '');
  return {
    id,
    name: withZh(name, TRADERS[name]),
    img: `assets/img/game/traders/${id}.jpg`,
    quests: quests.filter((q) => q.trader === name).length,
    shop: trades
      .filter((t) => t.trader === name)
      .map((t) =>
        compact({
          item: t.itemId,
          qty: t.quantity,
          cost: [t.cost.itemId, t.cost.quantity],
          daily: t.dailyLimit,
          level: t.requiredLevel,
        })
      ),
  };
});

// ---- projects ------------------------------------------------------------------

const CATEGORY_LABELS = {
  ArcDamage: { en: 'Damage dealt to ARC', zh: '对 ARC 造成伤害' },
  InteractTask: { en: 'Complete the task in raid', zh: '在战局中完成任务' },
};

const projects = readJson('projects.json').map((p) =>
  compact({
    id: p.id,
    name: text(p.name),
    desc: text(p.description),
    active: !p.disabled,
    start: p.startDate,
    end: p.endDate,
    phases: p.phases.map((ph) =>
      compact({
        n: ph.phase,
        name: text(ph.name),
        desc: text(ph.description),
        items: ph.requirementItemIds?.map((r) => compact({ id: r.itemId, qty: r.quantity, rewards: pairs(r.rewardItemIds) })),
        categories: ph.requirementCategories?.map((c) =>
          compact({ label: text(c.localizations) || CATEGORY_LABELS[c.category] || { en: c.category }, value: c.valueRequired })
        ),
      })
    ),
  })
);

// ---- labels shared by several pages ---------------------------------------------

const labelsFrom = (section, keys) =>
  Object.fromEntries(keys.map((k) => [k, withZh(k, section[k])]));

const itemTypes = [...new Set(items.map((i) => i.type))].sort();

// Browsing groups for the Items page and the navigation. zh names are the
// official type names, combined where a group spans several types.
const T = ui.ItemTypes;
const ITEM_CATEGORIES = [
  ['weapons', 'Weapons', T.Weapon, ['Assault Rifle', 'Battle Rifle', 'SMG', 'Pistol', 'Shotgun', 'LMG', 'Sniper Rifle', 'Hand Cannon', 'Special']],
  ['ammo', 'Ammo', T.Ammunition, ['Ammunition']],
  ['mods', 'Mods', T.Modification, ['Modification']],
  ['quick-use', 'Quick use', T['Quick Use'], ['Quick Use']],
  ['shields', 'Shields & augments', `${T.Shield}与${T.Augment}`, ['Shield', 'Augment']],
  ['keys', 'Keys', T.Key, ['Key']],
  ['blueprints', 'Blueprints', T.Blueprint, ['Blueprint']],
  ['materials', 'Materials', T.Material, ['Basic Material', 'Topside Material', 'Refined Material', 'Nature', 'Misc']],
  ['recyclables', 'Recyclables', T.Recyclable, ['Recyclable']],
  ['trinkets', 'Trinkets', T.Trinket, ['Trinket']],
].map(([id, en, zh, types]) => ({
  id,
  name: withZh(en, zh),
  types,
  count: items.filter((i) => types.includes(i.type)).length,
}));
const uncategorized = itemTypes.filter((type) => !ITEM_CATEGORIES.some((c) => c.types.includes(type)));
if (uncategorized.length) console.warn(`Item types missing from ITEM_CATEGORIES: ${uncategorized.join(', ')}`);

const labels = {
  itemCategories: ITEM_CATEGORIES,
  itemTypes: labelsFrom(ui.ItemTypes, itemTypes),
  rarities: labelsFrom(ui.Rarity, ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']),
  locations: labelsFrom(ui.Locations, [...new Set(items.flatMap((i) => i.foundIn || []))].sort()),
  benches: {
    ...Object.fromEntries(hideout.map((h) => [h.id, h.name])),
    ...benchNames,
  },
  // Referenced like items (costs, rewards) but have no item file upstream.
  currencies: {
    coins: withZh('Coins', ui.TraderPage.coins),
    creds: withZh('Creds', ui.StashPage.currencies.cred),
    raider_tokens: withZh('Raider Tokens', ui.StashPage.currencies.raiderTokens),
  },
  traders: Object.fromEntries(Object.entries(TRADERS).map(([en, zh]) => [en, withZh(en, zh)])),
  // Quests refer to Stella Montis as a whole; maps.json lists its two levels.
  maps: {
    ...Object.fromEntries(maps.map((m) => [m.id, m.name])),
    stella_montis: text(readJson('maps.json').find((m) => m.id === 'stella_montis_upper').name),
  },
  modSlots: MOD_SLOTS,
  skillCategories,
  threats,
};

// ---- search index -----------------------------------------------------------------

// Rows are [kind, id, en, zh, image]; trailing empty fields are dropped.
const search = [
  ...items.map((i) => ['item', i.id, i.name.en, i.name.zh, i.img]),
  ...quests.map((q) => ['quest', q.id, q.name.en, q.name.zh]),
  ...skills.map((s) => ['skill', s.id, s.name.en, s.name.zh]),
  ...hideout.map((h) => ['station', h.id, h.name.en, h.name.zh]),
  ...bots.map((b) => ['arc', b.id, b.name.en, b.name.zh]),
  ...maps.map((m) => ['map', m.id, m.name.en, m.name.zh]),
  ...traders.map((t) => ['trader', t.id, t.name.en, t.name.zh]),
  ...projects.map((p) => ['project', p.id, p.name.en, p.name.zh]),
].map((row) => {
  if (row[3] === row[2]) row[3] = '';
  row = row.map((v) => v || '');
  while (row.at(-1) === '') row.pop();
  return row;
});

// Slim lookup for pages that show item names and icons but not full item details:
// { id: [en, zh, img, rarity, type] }
const itemIndex = Object.fromEntries(
  items.map((i) => [i.id, [i.name.en, i.name.zh || '', i.img || '', i.rarity, i.type]])
);

// ---- metadata ----------------------------------------------------------------------

const git = (...args) => execFileSync('git', ['-C', SRC, ...args], { encoding: 'utf8' }).trim();
const versions = items.map((i) => i.added).filter((v) => /^\d+\.\d+$/.test(v || ''));
const latest = versions.sort((a, b) => {
  const [a1, a2] = a.split('.').map(Number);
  const [b1, b2] = b.split('.').map(Number);
  return a1 - b1 || a2 - b2;
}).at(-1);

const meta = {
  gameVersion: latest,
  recent: items.filter((i) => i.added === latest).map((i) => i.id),
  updated: git('log', '-1', '--format=%cs'),
  commit: git('rev-parse', '--short', 'HEAD'),
  counts: {
    items: items.length,
    quests: quests.length,
    skills: skills.length,
    hideout: hideout.length,
    arc: bots.length,
    maps: maps.length,
    events: events.length,
    traders: traders.length,
    trades: trades.length,
    projects: projects.length,
  },
};

// ---- integrity ---------------------------------------------------------------------

// Currencies and a few retired ids are referenced but have no item file upstream.
const refs = [
  ...quests.flatMap((q) => [...(q.required || []), ...(q.rewards || []), ...(q.granted || [])]),
  ...hideout.flatMap((h) => (h.levels || []).flatMap((l) => l.items || [])),
  ...items.flatMap((i) => [...(i.recipe || []), ...(i.recycles || []), ...(i.salvages || [])]),
  ...projects.flatMap((p) => p.phases.flatMap((ph) => (ph.items || []).flatMap((r) => [[r.id], ...(r.rewards || [])]))),
  ...traders.flatMap((t) => t.shop.flatMap((s) => [[s.item], s.cost])),
].map(([id]) => id);
const missing = [...new Set(refs.filter((id) => !itemIds.has(id) && !labels.currencies[id]))].sort();

// ---- write -------------------------------------------------------------------------

const bundles = { meta, labels, items, itemIndex, quests, skills, hideout, arc: bots, maps, events, traders, projects, search };

fs.mkdirSync(OUT, { recursive: true });
for (const file of fs.readdirSync(OUT)) if (file.endsWith('.js')) fs.rmSync(path.join(OUT, file));

let total = 0;
for (const [name, value] of Object.entries(bundles)) {
  const body =
    `// Generated by scripts/build-data.mjs from arcraiders-data@${meta.commit}. Do not edit.\n` +
    `(window.ARC_DATA = window.ARC_DATA || {}).${name} = ${JSON.stringify(value)};\n`;
  fs.writeFileSync(path.join(OUT, `${name}.js`), body);
  total += body.length;
  console.log(`  data/${name}.js`.padEnd(24), `${(body.length / 1024).toFixed(1).padStart(7)} KB`);
}
console.log(`  ${'total'.padEnd(22)} ${(total / 1024).toFixed(1).padStart(7)} KB`);
console.log(`Game ${meta.gameVersion}, upstream ${meta.commit} (${meta.updated})`);
if (missing.length) console.log(`Referenced ids without an item file: ${missing.join(', ')}`);

// ---- images (optional) --------------------------------------------------------------

if (WITH_IMAGES) buildImages();

function buildImages() {
  if (process.platform !== 'darwin') {
    console.error('--images needs macOS (sips). Images are committed, so this step is optional.');
    process.exit(1);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arc-img-'));
  // Read straight from git objects so the large images/ folder never needs checking out.
  const extract = (rel) => {
    const file = path.join(tmp, rel.replace(/\//g, '_'));
    fs.writeFileSync(file, execFileSync('git', ['-C', SRC, 'show', `HEAD:${rel}`], { maxBuffer: 64 << 20 }));
    return file;
  };
  const sips = (input, output, maxSize, jpeg) => {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    const args = ['-Z', String(maxSize)];
    if (jpeg) args.push('-s', 'format', 'jpeg', '-s', 'formatOptions', '78');
    execFileSync('sips', [...args, input, '--out', output], { stdio: 'ignore' });
  };

  for (const b of bots) sips(extract(`images/bots/${b.id}.png`), path.join(IMG_OUT, `arc/${b.id}.jpg`), 640, true);
  for (const t of traders) sips(extract(`images/traders/${t.id}.png`), path.join(IMG_OUT, `traders/${t.id}.jpg`), 480, true);
  for (const [id, file] of Object.entries(STATION_IMAGES))
    sips(extract(`images/workshop/${file}.png`), path.join(IMG_OUT, `stations/${id}.png`), 320, false);
  for (const [id, dir] of Object.entries(MAP_TILES)) {
    // Zoom level 0 is a 2×2 grid stored as {x}/{y}; write it in reading order.
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([x, y], n) => {
      const out = path.join(IMG_OUT, `maps/${id}/${n}.webp`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(extract(`images/maps/${dir}/v2/low/0/${x}/${y}.webp`), out);
    });
  }
  for (const [id, rel] of Object.entries(MAP_SINGLE)) sips(extract(rel), path.join(IMG_OUT, `maps/${id}.jpg`), 1024, true);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('Images written to assets/img/game/');
}
