#!/usr/bin/env node
// Builds the site's data bundles from two sources: items, quests, workshop
// stations and projects from arctracker.io (vendor/arctracker/, saved by
// scripts/fetch-arctracker.mjs), and the skill tree, ARC, traders and maps from
// the RaidTheory/arcraiders-data submodule in vendor/arcraiders-data, which
// stopped at game version 1.42. Content newer than both comes from
// scripts/additions.mjs.
//
//   node scripts/build-data.mjs            data bundles only (any OS)
//   node scripts/build-data.mjs --images   also regenerate game images (macOS, uses sips)
//
// Output goes to data/*.js. Each bundle assigns into window.ARC_DATA so pages can
// load it with a plain <script> tag and still work when opened from disk.
// Upstream ships 20 locales; only en and zh-CN are kept.
//
// Chinese comes from three places, in this order: the client's own names
// (glossary-client.json via glossary.mjs), this site's translations keyed by the
// English source text (translations.mjs), then upstream zh-CN with the glossary's
// wording swapped in (TERM_FIXES).

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOT_ALIASES,
  BOT_TYPES,
  CLIENT,
  EFFECT_LABELS,
  EFFECT_VALUES,
  LOCATIONS,
  MOD_SLOTS,
  NAMES,
  THREATS,
  TRADERS,
} from './glossary.mjs';
import { PATTERNS, TERM_FIXES, TEXT } from './translations.mjs';
import { BOTS as ADDED_BOTS, MAPS as ADDED_MAPS } from './additions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'vendor/arcraiders-data');
const AT = path.join(ROOT, 'vendor/arctracker');
const OUT = path.join(ROOT, 'data');
const IMG_OUT = path.join(ROOT, 'assets/img/game');
const WITH_IMAGES = process.argv.includes('--images');

if (!fs.existsSync(path.join(SRC, 'items'))) {
  console.error('vendor/arcraiders-data is empty. Run: git submodule update --init');
  process.exit(1);
}
if (!fs.existsSync(path.join(AT, 'items.json'))) {
  console.error('vendor/arctracker is empty. Run: node scripts/fetch-arctracker.mjs');
  process.exit(1);
}

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(SRC, rel), 'utf8'));
const readDir = (rel) =>
  fs.readdirSync(path.join(SRC, rel))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => readJson(path.join(rel, f)));
const readAt = (name) => JSON.parse(fs.readFileSync(path.join(AT, `${name}.json`), 'utf8'));

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
// Entries from additions.mjs that the data doesn't have yet, by id or English name.
const missingFrom = (list, added) => added.filter((a) => !list.some((x) => x.id === a.id || x.name.en === a.name.en));

function compact(obj) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined || v === null || v === false || (Array.isArray(v) && !v.length)) delete obj[k];
  }
  return obj;
}

// ---- Chinese -----------------------------------------------------------------

// Upstream zh-CN with the glossary's wording swapped in.
const fixTerms = (zh) => (zh ? TERM_FIXES.reduce((s, [from, to]) => s.replaceAll(from, to), zh) : zh);

// The game's own Chinese for an English name. Also resolves "<name> Blueprint"
// and weapon tiers ("Kettle II"), which the glossary lists once.
function clientName(en) {
  if (!en) return undefined;
  const zh = CLIENT.get(en.toLowerCase()) || NAMES[en];
  if (zh) return zh;
  const blueprint = /^(.+) Blueprint$/.exec(en);
  if (blueprint) {
    const base = clientName(blueprint[1]);
    // "直角握把 II 蓝图", "烟雾手雷蓝图"
    return base && `${base}${/[\w.]$/.test(base) ? ' ' : ''}蓝图`;
  }
  const tier = /^(.+) (I|II|III|IV)$/.exec(en);
  const base = tier && clientName(tier[1]);
  return base ? `${base} ${tier[2]}` : undefined;
}

const gameName = (v) => {
  const t = text(v);
  return t && withZh(t.en, clientName(t.en) ?? fixTerms(t.zh));
};

// Site translation for an English sentence or short pattern ("64 slots").
function translate(en) {
  if (!en) return undefined;
  if (Object.hasOwn(TEXT, en)) return TEXT[en];
  for (const [re, fn] of PATTERNS) {
    const m = re.exec(en);
    if (m) return fn(m);
  }
  return undefined;
}

const zhFor = (en, zh) => translate(en) ?? fixTerms(zh);
const localize = (v) => {
  const t = text(v);
  return t && withZh(t.en, zhFor(t.en, t.zh));
};

// English names that lists and effects mention but that have no Chinese; reported at the end.
const unnamed = new Set();
const itemZh = new Map();
function zhName(en) {
  const zh = clientName(en) ?? itemZh.get(en);
  if (!zh) unnamed.add(en);
  return zh;
}

// ---- items -----------------------------------------------------------------

const rawItems = readAt('items');
const itemNames = new Map(rawItems.map((i) => [i.id, gameName(i.name)]));
for (const name of itemNames.values()) if (name.zh) itemZh.set(name.en, name.zh);

// arctracker appends generated lists to some descriptions ("… Compatible with:
// Kettle, Ferro"). Their Chinese copies are inconsistent and often keep the English
// names, so the list is rebuilt from the names.
const DESC_LISTS = { 'Compatible with': '兼容武器', 'Used to craft': '可用于制作' };
function itemDesc(v) {
  const t = text(v);
  const list = t && !Object.hasOwn(TEXT, t.en) && /^(.*?)\s*(Compatible with|Used to craft):\s*(.+)$/s.exec(t.en);
  if (!list) return t && withZh(t.en, zhFor(t.en, t.zh));
  const [, base, kind, rest] = list;
  // A sentence can follow the list ("Used to craft: Shield Recharger. Can be used to …");
  // "Mk. 3" inside a name is not a sentence end.
  const [, names, after] = /^(.*?)(?:\.\s+([A-Z][^]*)|\.?)$/.exec(rest);
  const upstream = t.zh?.split(/\s*(?:兼容武器|适配|用于制作|可用于制作|可制作)\s*[:：]/)[0];
  const zhNames = names.split(/,\s*/).map((n) => zhName(n.trim()) || n.trim());
  const tail = after ? `。${translate(after) ?? after}` : '';
  return withZh(t.en, `${(base && zhFor(base, upstream)) || ''}${DESC_LISTS[kind]}：${zhNames.join('、')}${tail}`);
}

// Stat labels and values: "26% Reduced Reload Time" and "+8 Magazine Size" reuse the labels.
function statZh(s) {
  const own = EFFECT_LABELS[s] ?? EFFECT_VALUES[s];
  if (own) return own;
  const m = /^([+-]?[\d.]+%?) (.+)$/.exec(s);
  const label = m && (EFFECT_LABELS[m[2]] ?? CLIENT.get(m[2].toLowerCase()));
  return label ? `${label} ${m[1]}` : undefined;
}

function effectValue(value) {
  if (Array.isArray(value)) value = value.join(', ');
  if (typeof value !== 'string') return value;
  if (!value) return undefined;
  const zh =
    translate(value) ??
    statZh(value) ??
    value
      .split(', ')
      .map((part) => statZh(part) ?? (/[a-z]{3}/i.test(part) ? zhName(part) : undefined) ?? part)
      .join('、');
  return withZh(value, zh);
}

function effects(raw) {
  if (!raw) return undefined;
  const out = [];
  for (const [key, e] of Object.entries(raw)) {
    if (!e || typeof e !== 'object') continue;
    const label = e.en || key;
    out.push(
      compact({
        label: withZh(label, statZh(label) ?? clientName(label) ?? fixTerms(e['zh-CN'])),
        value: effectValue(e.value),
      })
    );
  }
  return out.length ? out : undefined;
}

// Item icons are served from assets/img/game/items/ (written with the bundles
// below) so pages don't depend on the arctracker CDN, which is slow from
// mainland China. They come from the submodule, else from vendor/arctracker/items/;
// an icon neither has keeps its CDN URL.
const upstreamIcons = new Set(
  execFileSync('git', ['-C', SRC, 'ls-tree', '--name-only', 'HEAD', 'images/items/'], { encoding: 'utf8' })
    .split('\n')
    .map((p) => p.slice('images/items/'.length))
);
const icons = new Set();
function icon(src) {
  const file = src && src.slice(src.lastIndexOf('/') + 1);
  if (!file || !(upstreamIcons.has(file) || fs.existsSync(path.join(AT, 'items', file)))) return src;
  icons.add(file);
  return `assets/img/game/items/${file}`;
}

const items = rawItems.map((i) =>
  compact({
    id: i.id,
    name: itemNames.get(i.id),
    desc: itemDesc(i.description),
    type: i.type,
    rarity: i.rarity,
    value: i.value,
    weight: i.weightKg,
    stack: i.stackSize,
    img: icon(i.imageFilename),
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
    compatible: i.compatibleWith?.map((w) => withZh(w, zhName(w))),
    mods: i.modSlots,
    vendors: i.vendors?.map((v) =>
      compact({ trader: v.trader, cost: pairs(v.cost), limit: v.limit, level: v.requiredLevel })
    ),
    blueprint: i.blueprintLocked,
    questItem: i.questItem,
    tip: localize(i.tip),
    added: i.addedIn,
  })
);
const itemIds = new Set(items.map((i) => i.id));

// ---- quests ----------------------------------------------------------------

// arctracker's API leaves out which objectives must be done in one round and the
// other requirements; the submodule's copy of the same quest still has them.
const repoQuests = new Map(readDir('quests').map((q) => [q.id, q]));
// arctracker's id for Riven Tides differs from the submodule's, which the site uses.
const QUEST_MAPS = { riven_tide: 'riven_tides' };
const rawQuests = readAt('quests').map((q) => ({
  objectivesOneRound: repoQuests.get(q.id)?.objectivesOneRound,
  otherRequirements: repoQuests.get(q.id)?.otherRequirements,
  ...q,
}));
const quests = rawQuests.map((q) =>
  compact({
    id: q.id,
    name: localize(q.name),
    desc: localize(q.description),
    trader: q.trader,
    maps: q.map?.map((id) => QUEST_MAPS[id] || id),
    objectives: q.objectives?.map(localize),
    oneRound: q.objectivesOneRound,
    required: pairs(q.requiredItemIds),
    rewards: pairs(q.rewardItemIds),
    granted: pairs(q.grantedItemIds),
    other: q.otherRequirements?.map(localize),
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
    name: gameName(s.name),
    desc: localize(s.description),
    category: s.category,
    major: s.isMajor,
    max: s.maxPoints,
    impact: localize(s.impactedSkill),
    known: s.knownValue?.map(localize),
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

const hideout = readAt('hideout')
  .map((h) =>
    compact({
      id: h.id,
      name: gameName(h.name),
      img: STATION_IMAGES[h.id] && `assets/img/game/stations/${h.id}.png`,
      maxLevel: h.maxLevel,
      levels: h.levels.map((l) =>
        compact({ level: l.level, items: pairs(l.requirementItemIds), desc: localize(l.description), other: l.otherRequirements })
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
const benchNames = { in_raid: withZh('In-raid', clientName('In-Round Crafting')) };

// ---- maps & events -----------------------------------------------------------

// Upstream uses different ids for the tile folders than for maps.json. Its tiles
// are 512px WebP on a 1000-unit grid, zoom z being 1000·2^z px across. The site
// keeps zooms 0–2: the renders behind them are 4096px, so zoom 3 only upscales.
const MAP_TILES = {
  dam_battlegrounds: 'dam-battleground',
  the_spaceport: 'the-spaceport',
  buried_city: 'buried-city',
  the_blue_gate: 'blue-gate',
  riven_tides: 'riven-tides',
};
const TILE_ZOOMS = [['low', 0], ['low', 1], ['high', 2]];

// maps.json lists each Stella Montis floor as its own map; the site shows one map
// with both, under the id quests already use. Upstream's file names have the floors
// the wrong way round: "upper" is the floor with the Seed Vault and the Sandbox,
// which lies below the Lobby. `at` places each image on one grid shared by both
// floors, in which the top floor spans x 0–1000 and both images have the same
// scale. It comes from matching both images to MetaForge's map, which has one
// grid for both floors; scripts/fetch-map-markers.mjs puts the markers on it too.
const MAP_LEVELS = {
  stella_montis: [
    { id: 'top', file: 'stella_montis_lower', en: 'Top floor', zh: '顶层', size: [5120, 3072], at: [0, 0] },
    { id: 'bottom', file: 'stella_montis_upper', en: 'Bottom floor', zh: '底层', size: [4096, 3072], at: [172.27, 64.04] },
  ],
};
const levelOf = Object.fromEntries(
  Object.entries(MAP_LEVELS).flatMap(([map, levels]) => levels.map((l) => [l.file, map]))
);
const mapId = (id) => levelOf[id] || id;

const repoMaps = readJson('maps.json')
  .filter((m, i, all) => all.findIndex((x) => mapId(x.id) === mapId(m.id)) === i)
  .map((m) => {
    const id = mapId(m.id);
    const dir = `assets/img/game/maps/${id}`;
    return compact({
      id,
      name: gameName(m.name),
      // {dir}/{z}/{x}/{y}.webp for z 0 to `zoom`
      tiles: MAP_TILES[id] && dir,
      zoom: MAP_TILES[id] && TILE_ZOOMS.length - 1,
      levels: MAP_LEVELS[id]?.map((l) => {
        const units = 1000 / MAP_LEVELS[id][0].size[0];
        const [x, y] = l.at;
        return {
          id: l.id,
          name: { en: l.en, zh: l.zh },
          img: `${dir}/${l.id}.jpg`,
          full: `${dir}/${l.id}-full.jpg`,
          bounds: [[x, y], [x + l.size[0] * units, y + l.size[1] * units]].map((p) => p.map((v) => Math.round(v * 100) / 100)),
        };
      }),
    });
  });
const maps = [...repoMaps, ...missingFrom(repoMaps, ADDED_MAPS)];

const rawEvents = readJson('map-events/map-events.json').eventTypes;
const events = Object.entries(rawEvents)
  .filter(([id, e]) => id !== 'none' && !e.disabled)
  .map(([id, e]) =>
    compact({
      id,
      name: withZh(e.displayName, clientName(e.displayName) ?? fixTerms(e.localizations?.['zh-CN'])),
      category: e.category,
      icon: e.icon,
    })
  );

// ---- ARC -------------------------------------------------------------------

const THREAT_RANK = Object.keys(THREATS);
const repoBots = readJson('bots.json').map((b) =>
    compact({
      id: b.id,
      name: withZh(titleCase(b.name), clientName(BOT_ALIASES[titleCase(b.name)] || titleCase(b.name))),
      type: withZh(b.type, BOT_TYPES[b.type]),
      threat: b.threat,
      desc: localize(b.description),
      weakness: localize(b.weakness),
      maps: b.maps && [...new Set(b.maps.map(mapId))],
      xp: { destroy: b.destroyXp, loot: b.lootXp },
      drops: b.drops,
      img: `assets/img/game/arc/${b.id}.jpg`,
    })
);
// Units without a threat level (additions.mjs) go last.
const bots = [...repoBots, ...missingFrom(repoBots, ADDED_BOTS)].sort((a, b) => THREAT_RANK.indexOf(b.threat) - THREAT_RANK.indexOf(a.threat) || a.name.en.localeCompare(b.name.en));
const threats = THREAT_RANK.map((id) => ({ id, name: withZh(id, THREATS[id]) }));

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
  InteractTask: { en: 'Complete the task in raid', zh: '在局内完成任务' },
};

// arctracker lists only current projects; the submodule's ended ones stay listed.
// Their items use the submodule's ids; arctracker renamed the Colorful Shoes, and
// its ids name the other colour (matched here by name and rarity).
const RENAMED_ITEMS = {
  colorful_shoes_green: 'football_shoes_red',
  colorful_shoes_red: 'football_shoes_green',
  colorful_shoes_silver: 'football_shoes_silver',
};
const renamed = (list) => list?.map((r) => ({ ...r, itemId: RENAMED_ITEMS[r.itemId] || r.itemId }));
const rawProjects = readAt('projects');
const endedProjects = readJson('projects.json')
  .filter((p) => !rawProjects.some((x) => x.id === p.id))
  .map((p) => ({
    ...p,
    phases: p.phases.map((ph) => ({
      ...ph,
      requirementItemIds: ph.requirementItemIds?.map((r) => ({ ...r, itemId: RENAMED_ITEMS[r.itemId] || r.itemId, rewardItemIds: renamed(r.rewardItemIds) })),
    })),
  }));
const projects = [...rawProjects, ...endedProjects].map((p) =>
  compact({
    id: p.id,
    name: gameName(p.name),
    desc: localize(p.description),
    active: !p.disabled,
    start: p.startDate,
    end: p.endDate,
    phases: p.phases.map((ph) =>
      compact({
        n: ph.phase,
        name: localize(ph.name),
        desc: localize(ph.description),
        items: ph.requirementItemIds?.map((r) => compact({ id: r.itemId, qty: r.quantity, rewards: pairs(r.rewardItemIds) })),
        categories: ph.requirementCategories?.map((c) =>
          compact({ label: localize(c.localizations) || CATEGORY_LABELS[c.category] || { en: c.category }, value: c.valueRequired })
        ),
      })
    ),
  })
);

// ---- labels shared by several pages ---------------------------------------------

// Client names first, then upstream arctracker text (whose wording differs from
// the game for several of these: 快捷使用物品, 背包强化, 地表材料, 硬币 …).
const labelsFrom = (section, keys) => Object.fromEntries(keys.map((k) => [k, withZh(k, clientName(k) ?? section[k])]));

const itemTypes = [...new Set(items.map((i) => i.type))].sort();
const typeZh = (type) => clientName(type) ?? ui.ItemTypes[type];

// Browsing groups for the Items page and the navigation. zh names are the
// official type names, combined where a group spans several types.
const ITEM_CATEGORIES = [
  ['weapons', 'Weapons', ui.ItemTypes.Weapon, ['Assault Rifle', 'Battle Rifle', 'SMG', 'Pistol', 'Shotgun', 'LMG', 'Sniper Rifle', 'Hand Cannon', 'Special']],
  ['ammo', 'Ammo', typeZh('Ammunition'), ['Ammunition']],
  ['mods', 'Mods', typeZh('Modification'), ['Modification']],
  ['quick-use', 'Quick use', typeZh('Quick Use'), ['Quick Use']],
  ['shields', 'Shields & augments', `${typeZh('Shield')}与${typeZh('Augment')}`, ['Shield', 'Augment']],
  ['keys', 'Keys', typeZh('Key'), ['Key']],
  ['blueprints', 'Blueprints', typeZh('Blueprint'), ['Blueprint']],
  ['materials', 'Materials', ui.ItemTypes.Material, ['Basic Material', 'Topside Material', 'Refined Material', 'Nature', 'Misc']],
  ['recyclables', 'Recyclables', typeZh('Recyclable'), ['Recyclable']],
  ['trinkets', 'Trinkets', typeZh('Trinket'), ['Trinket']],
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
  // Loot area types; client names here would be map locations ("Security" = 安保区).
  locations: Object.fromEntries(
    [...new Set(items.flatMap((i) => i.foundIn || []))].sort().map((k) => [k, withZh(k, LOCATIONS[k] ?? ui.Locations[k])])
  ),
  benches: {
    ...Object.fromEntries(hideout.map((h) => [h.id, h.name])),
    ...benchNames,
  },
  // Referenced like items (costs, rewards) but have no item file upstream.
  currencies: {
    coins: withZh('Coins', clientName('Coins')),
    creds: withZh('Creds', clientName('Cred')),
    raider_tokens: withZh('Raider Tokens', clientName('Raider Tokens')),
  },
  traders: Object.fromEntries(Object.entries(TRADERS).map(([en, zh]) => [en, withZh(en, zh)])),
  maps: Object.fromEntries(maps.map((m) => [m.id, m.name])),
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

const arctracker = readAt('source').generatedAt.slice(0, 10);
const meta = {
  gameVersion: latest,
  recent: items.filter((i) => i.added === latest).map((i) => i.id),
  updated: [arctracker, git('log', '-1', '--format=%cs')].sort().at(-1),
  arctracker,
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

// Files are overwritten in place and only stale ones deleted: deleting and
// recreating a file in an iCloud Drive folder leaves copies named "items 2.js".
fs.mkdirSync(OUT, { recursive: true });
for (const file of fs.readdirSync(OUT)) if (file.endsWith('.js') && !Object.hasOwn(bundles, file.slice(0, -3))) fs.rmSync(path.join(OUT, file));

let total = 0;
for (const [name, value] of Object.entries(bundles)) {
  const body =
    `// Generated by scripts/build-data.mjs from arctracker.io (${meta.arctracker}) and arcraiders-data@${meta.commit}. Do not edit.\n` +
    `(window.ARC_DATA = window.ARC_DATA || {}).${name} = ${JSON.stringify(value)};\n`;
  fs.writeFileSync(path.join(OUT, `${name}.js`), body);
  total += body.length;
  console.log(`  data/${name}.js`.padEnd(24), `${(body.length / 1024).toFixed(1).padStart(7)} KB`);
}
console.log(`  ${'total'.padEnd(22)} ${(total / 1024).toFixed(1).padStart(7)} KB`);

// Icons of removed items are deleted so they don't linger.
const ICON_OUT = path.join(IMG_OUT, 'items');
fs.mkdirSync(ICON_OUT, { recursive: true });
for (const file of fs.readdirSync(ICON_OUT)) if (!icons.has(file)) fs.rmSync(path.join(ICON_OUT, file));
for (const file of icons) {
  const png = upstreamIcons.has(file)
    ? execFileSync('git', ['-C', SRC, 'show', `HEAD:images/items/${file}`], { maxBuffer: 64 << 20 })
    : fs.readFileSync(path.join(AT, 'items', file));
  fs.writeFileSync(path.join(ICON_OUT, file), png);
}
const cdnIcons = items.filter((i) => /^https?:/.test(i.img || '')).map((i) => i.id);
console.log(`  ${icons.size} item icons in assets/img/game/items/; still on the CDN: ${cdnIcons.join(', ') || 'none'}`);
console.log(`Game ${meta.gameVersion}; arctracker.io ${meta.arctracker}, upstream ${meta.commit} (${git('log', '-1', '--format=%cs')})`);
if (missing.length) console.log(`Referenced ids without an item file: ${missing.join(', ')}`);
if (unnamed.size) console.log(`Names without Chinese (add to NAMES in scripts/glossary.mjs): ${[...unnamed].sort().join(', ')}`);

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

  for (const b of repoBots) sips(extract(`images/bots/${b.id}.png`), path.join(IMG_OUT, `arc/${b.id}.jpg`), 640, true);
  for (const t of traders) sips(extract(`images/traders/${t.id}.png`), path.join(IMG_OUT, `traders/${t.id}.jpg`), 480, true);
  for (const [id, file] of Object.entries(STATION_IMAGES))
    sips(extract(`images/workshop/${file}.png`), path.join(IMG_OUT, `stations/${id}.png`), 320, false);
  for (const [id, dir] of Object.entries(MAP_TILES)) {
    const out = path.join(IMG_OUT, 'maps', id);
    fs.rmSync(out, { recursive: true, force: true });
    for (const [set, z] of TILE_ZOOMS)
      for (let x = 0; x < 2 ** (z + 1); x++)
        for (let y = 0; y < 2 ** (z + 1); y++) {
          fs.mkdirSync(path.join(out, `${z}/${x}`), { recursive: true });
          fs.copyFileSync(extract(`images/maps/${dir}/v2/${set}/${z}/${x}/${y}.webp`), path.join(out, `${z}/${x}/${y}.webp`));
        }
  }
  // A small image that loads first, and the full one the map swaps in on top.
  for (const [id, levels] of Object.entries(MAP_LEVELS))
    for (const l of levels) {
      const src = extract(`images/maps/${l.file}.png`);
      sips(src, path.join(IMG_OUT, `maps/${id}/${l.id}.jpg`), 1024, true);
      sips(src, path.join(IMG_OUT, `maps/${id}/${l.id}-full.jpg`), 3072, true);
    }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('Images written to assets/img/game/');
}
