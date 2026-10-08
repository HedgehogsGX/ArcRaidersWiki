#!/usr/bin/env node
// Saves arctracker.io's public game data into vendor/arctracker/, which
// build-data.mjs reads for items, quests, workshop stations and projects.
//
//   node scripts/fetch-arctracker.mjs
//
// arctracker.io is the site behind the RaidTheory/arcraiders-data repo in
// vendor/arcraiders-data. The repo stopped at game version 1.42 (August 2026)
// while the site kept updating, so these four now come from its API. The skill
// tree, ARC, traders and maps aren't in the API and still come from the repo.
//
// Each file is a list with one entry per line, so a diff shows what changed.
// Only en and zh-CN are kept of the 20 locales, as build-data.mjs uses no others.
// The API gives quests the game's internal ids (ss10a …); the site keeps the
// readable ids from their slugs, which match the repo's, so links keep working.
// Item icons the repo doesn't have are saved to vendor/arctracker/items/, so
// pages don't depend on the arctracker CDN, which is slow from mainland China.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'vendor/arctracker');
const REPO = path.join(ROOT, 'vendor/arcraiders-data');
const API = 'https://arctracker.io/api';
const KEEP = new Set(['en', 'zh-CN']);
const LOCALES = new Set(['da', 'de', 'en', 'es', 'fr', 'he', 'hr', 'it', 'ja', 'ko-KR', 'no', 'pl', 'pt', 'pt-BR', 'ru', 'sr', 'tr', 'uk', 'zh-CN', 'zh-TW']);

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'ArcRaidersWiki data sync (+https://github.com/HedgehogsGX/ArcRaidersWiki)' } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res;
    } catch (err) {
      if (i >= tries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}
const getJson = async (name) => (await get(`${API}/${name}`)).json();

// Drops the other locales from every { en, de, … } map, at any depth.
function slim(v) {
  if (Array.isArray(v)) return v.map(slim);
  if (!v || typeof v !== 'object') return v;
  const localized = Object.hasOwn(v, 'en');
  return Object.fromEntries(
    Object.entries(v)
      .filter(([k]) => !localized || !LOCALES.has(k) || KEEP.has(k))
      .map(([k, x]) => [k, slim(x)])
  );
}

function write(name, list) {
  const body = `[\n${list.map((x) => JSON.stringify(x)).join(',\n')}\n]\n`;
  fs.writeFileSync(path.join(OUT, `${name}.json`), body);
  console.log(`  vendor/arctracker/${name}.json`.padEnd(40), `${String(list.length).padStart(4)} entries`);
}

const byId = (a, b) => a.id.localeCompare(b.id);

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const [items, quests, hideout, projects] = await Promise.all(['items', 'quests', 'hideout', 'projects'].map(getJson));
  const generated = [items, quests, hideout, projects].map((d) => d.generatedAt).filter(Boolean).sort().at(-1);

  write('items', items.items.map(slim).sort(byId));

  const questId = new Map(Object.values(quests.quests).map((q) => [q.id, q.slug ? q.slug.replace(/-/g, '_') : q.id]));
  const remap = (ids) => ids && ids.map((id) => questId.get(id) || id);
  write(
    'quests',
    Object.values(quests.quests)
      .map((q) => slim({ ...q, id: questId.get(q.id), gameId: q.id, previousQuestIds: remap(q.previousQuestIds), nextQuestIds: remap(q.nextQuestIds) }))
      .sort(byId)
  );
  write('hideout', Object.values(hideout.hideoutModules).map(slim).sort(byId));
  write('projects', Object.values(projects.projects).map(slim));

  // Icons the repo already has are taken from it by build-data.mjs.
  const repoIcons = new Set(
    execFileSync('git', ['-C', REPO, 'ls-tree', '--name-only', 'HEAD', 'images/items/'], { encoding: 'utf8' })
      .split('\n')
      .map((p) => p.slice('images/items/'.length))
  );
  const iconDir = path.join(OUT, 'items');
  fs.mkdirSync(iconDir, { recursive: true });
  const wanted = new Set();
  for (const item of items.items) {
    const src = item.imageFilename;
    const file = src && src.slice(src.lastIndexOf('/') + 1);
    if (!file || repoIcons.has(file) || !/^https:\/\/cdn\.arctracker\.io\//.test(src)) continue;
    wanted.add(file);
    const out = path.join(iconDir, file);
    if (fs.existsSync(out)) continue;
    try {
      fs.writeFileSync(out, Buffer.from(await (await get(src)).arrayBuffer()));
      console.log(`  saved vendor/arctracker/items/${file}`);
    } catch (err) {
      console.log(`  no icon for ${item.id}: ${err.message}`);
    }
  }
  for (const file of fs.readdirSync(iconDir)) if (!wanted.has(file)) fs.rmSync(path.join(iconDir, file));

  fs.writeFileSync(path.join(OUT, 'source.json'), `${JSON.stringify({ source: API, generatedAt: generated }, null, 1)}\n`);
  console.log(`arctracker.io data generated ${generated}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
