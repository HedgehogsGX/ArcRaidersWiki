#!/usr/bin/env node
// Copies the game's official zh-CN terms from the ARC Raiders subtitle glossary
// (video-chinese-subtitles skill) into scripts/glossary-client.json, so the build
// and the news translator use the same names players see in the client.
//
//   node scripts/import-glossary.mjs [path/to/arc-raiders.md]
//
// Only the term tables are imported: world, raid flow, systems, maps and map
// conditions, every map location, ARC, weapons, mods, quick-use items, materials,
// keys, ARC parts, skills and UI verbs. Update names, community slang and the
// "common mistakes" table are left out.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scripts/glossary-client.json');
const SOURCE =
  process.argv[2] || path.join(os.homedir(), '.claude/skills/video-chinese-subtitles/references/glossaries/arc-raiders.md');

// Sections are numbered "## 2. …" and "### 6.1 …"; sub-tables without a number
// ("### 地图", "### 材料") belong to the numbered section above them.
const INCLUDE = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);

// Rows that pack several names into one cell in a way the generic split can't read.
const SPECIAL = {
  'Combat Mk. 1／2': { 'Combat Mk. 1': '战斗 Mk. 1', 'Combat Mk. 2': '战斗 Mk. 2' },
  'Combat Mk. 3（Aggressive／Flanking）': {
    'Combat Mk. 3 (Aggressive)': '战斗 Mk. 3（进攻型）',
    'Combat Mk. 3 (Flanking)': '战斗 Mk. 3（侧翼突击）',
  },
  'Looting Mk. 1／2': { 'Looting Mk. 1': '搜刮 Mk. 1', 'Looting Mk. 2': '搜刮 Mk. 2' },
  'Looting Mk. 3（Cautious／Safekeeper／Survivor）': {
    'Looting Mk. 3 (Cautious)': '搜刮 Mk. 3（谨慎型）',
    'Looting Mk. 3 (Safekeeper)': '搜刮 Mk. 3（守护者）',
    'Looting Mk. 3 (Survivor)': '搜刮 Mk. 3（生存型）',
  },
  'Tactical Mk. 1／2': { 'Tactical Mk. 1': '战术 Mk. 1', 'Tactical Mk. 2': '战术 Mk. 2' },
  'Tactical Mk. 3（Defensive／Healing／Revival／Smoke）': {
    'Tactical Mk. 3 (Defensive)': '战术 Mk. 3（防御型）',
    'Tactical Mk. 3 (Healing)': '战术 Mk. 3（治疗型）',
    'Tactical Mk. 3 (Revival)': '战术 Mk. 3（复苏）',
    'Tactical Mk. 3 (Smoke)': '战术 Mk. 3（烟雾）',
  },
  'Simple／Light／Medium／Heavy／Complex Gun Parts': {
    'Simple Gun Parts': '简易枪械零件',
    'Light Gun Parts': '轻型枪械零件',
    'Medium Gun Parts': '中型枪械零件',
    'Heavy Gun Parts': '重型枪械零件',
    'Complex Gun Parts': '复杂枪械零件',
  },
  'Blue／Green／Red／Yellow Light Stick': {
    'Blue Light Stick': '蓝色荧光棒',
    'Green Light Stick': '绿色荧光棒',
    'Red Light Stick': '红色荧光棒',
    'Yellow Light Stick': '黄色荧光棒',
  },
  'Broken／Locked Return Point': { 'Broken Return Point': '损坏的返回点', 'Locked Return Point': '锁定的返回点' },
  'loot value（low／medium／high）': {},
  'weapon tier I–IV': {},
};

const md = fs.readFileSync(SOURCE, 'utf8');
const updated = /^updated:\s*(\S+)/m.exec(md)?.[1];
const scope = /^source_scope:\s*(.+)$/m.exec(md)?.[1];

const sections = {};
const conflicts = [];
const seen = new Map();
let number = 0;
let title = '';

function add(en, zh) {
  en = en.replace(/^the\s+/, '').trim();
  zh = zh.trim();
  if (!en || !zh) return;
  const before = seen.get(en.toLowerCase());
  if (before && before.zh !== zh) conflicts.push(`${en}: ${before.zh} (${before.title}) / ${zh} (${title})`);
  if (before) return;
  seen.set(en.toLowerCase(), { zh, title });
  (sections[title] ||= {})[en] = zh;
}

for (const line of md.split('\n')) {
  const head = /^(#{2,3})\s+(.*)$/.exec(line);
  if (head) {
    const n = /^(\d+)[.\s]/.exec(head[2]);
    if (n) number = Number(n[1]);
    else if (head[1] === '##') number = 0;
    title = head[2].trim();
    continue;
  }
  if (!INCLUDE.has(number) || !line.startsWith('|') || /^\|\s*-/.test(line)) continue;
  const [en, zh] = line.slice(1, -1).split('|').map((c) => c.trim());
  if (!zh || ['英文或缩写', '英文'].includes(en) || /^["“]/.test(en)) continue;

  if (en in SPECIAL) {
    Object.entries(SPECIAL[en]).forEach(([e, z]) => add(e, z));
    continue;
  }
  const name = en.replace(/^[a-z]+：/, '').replace(/（[^）]*）/g, '').trim();
  const range = /^(.*) I–III$/.exec(name);
  const zhRange = /^(.*) I–III$/.exec(zh);
  if (range && zhRange) {
    ['I', 'II', 'III'].forEach((n) => add(`${range[1]} ${n}`, `${zhRange[1]} ${n}`));
    continue;
  }
  const names = name.split('／');
  const zhs = zh.split('／');
  if (names.length === zhs.length) names.forEach((e, i) => add(e, zhs[i]));
  else if (zhs.length === 1) names.forEach((e) => add(e, zh));
  else console.warn(`Skipped (can't pair names): ${en} = ${zh}`);
}

const total = Object.values(sections).reduce((n, s) => n + Object.keys(s).length, 0);
fs.writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      source: 'video-chinese-subtitles skill, references/glossaries/arc-raiders.md',
      scope,
      updated,
      sections,
    },
    null,
    1
  )}\n`
);
console.log(`Wrote ${total} terms from ${Object.keys(sections).length} tables to scripts/glossary-client.json`);
if (conflicts.length) console.log(`Kept the first translation for:\n  ${conflicts.join('\n  ')}`);
