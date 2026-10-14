#!/usr/bin/env node
// Saves the 2.0 skill tree into vendor/skill-tree.json, which build-data.mjs reads.
//
//   node scripts/fetch-skill-tree.mjs
//
// 2.0 (Frozen Trail) rebuilt the skill tree, and neither RaidTheory/arcraiders-data
// (stopped at 1.42) nor the arctracker.io API has the new one. baschny/arcraiders-
// raider-tools generates it from the game's own data, with every language's names
// and descriptions; its author also made the 1.42 update in RaidTheory's repo.
// Only en and zh-CN are kept.
//
// The data has the tree's links, levels and choice groups but no positions;
// build-data.mjs lays the nodes out (SKILL_ORDER there).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'vendor/skill-tree.json');
const SOURCE = 'https://github.com/baschny/arcraiders-raider-tools/tree/main/public/data/game';
const RAW = 'https://raw.githubusercontent.com/baschny/arcraiders-raider-tools/main/public/data/game';

async function get(name, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(`${RAW}/${name}`, {
        headers: { 'user-agent': 'ArcRaidersWiki data sync (+https://github.com/HedgehogsGX/ArcRaidersWiki)' },
      });
      if (!res.ok) throw new Error(`${res.status} ${name}`);
      return await res.json();
    } catch (err) {
      if (i >= tries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

async function main() {
  const [tree, en, zh] = await Promise.all(['skilltree.json', 'skilltree.text.en.json', 'skilltree.text.zh-CN.json'].map(get));
  const nodes = Object.values(tree.nodes);
  if (!nodes.length) throw new Error('The skill tree is empty upstream; keeping the saved one.');

  const local = (id, key) => {
    const v = { en: en[id]?.[key], 'zh-CN': zh[id]?.[key] };
    return v.en || v['zh-CN'] ? v : undefined;
  };
  const list = nodes
    .map((n) => ({
      id: n.id,
      name: local(n.id, 'name') || { en: n.nameEn },
      description: local(n.id, 'description'),
      category: n.category,
      root: n.root || undefined,
      parents: n.parents || [],
      maxLevel: n.maxLevel,
      minTotalInvestment: n.minTotalInvestment,
      requireAllParents: n.requireAllParents,
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.en.localeCompare(b.name.en));
  const groups = Object.values(tree.groups || {}).sort((a, b) => a.id.localeCompare(b.id));

  // One node per line, so a diff shows what changed.
  const lines = (xs) => `[\n${xs.map((x) => `    ${JSON.stringify(x)}`).join(',\n')}\n  ]`;
  const body =
    `{\n  "source": ${JSON.stringify(SOURCE)},\n  "gameVersion": ${JSON.stringify(tree.gameVersion)},\n` +
    `  "generatedFrom": ${JSON.stringify(tree.generatedFrom)},\n  "nodes": ${lines(list)},\n  "groups": ${lines(groups)}\n}\n`;
  fs.writeFileSync(OUT, body);
  console.log(`  vendor/skill-tree.json: ${list.length} nodes, ${groups.length} choice groups (game ${tree.gameVersion})`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
