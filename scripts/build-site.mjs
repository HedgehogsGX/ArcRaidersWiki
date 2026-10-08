#!/usr/bin/env node
// Copies the files the browser actually loads into dist/, which is what the
// hosts publish. The upstream submodule, scripts, the translation cache and
// node_modules stay out of the upload.
//
//   node scripts/build-site.mjs
//
// Hosts don't all cache alike: arcraiderswiki.cn's Cloudflare zone tells browsers
// to keep scripts for 4 hours, so after a deploy a browser could show the new
// pages with its old data. Pages themselves are never cached, so each script and
// stylesheet they link gets ?v=<hash of the file>: a changed file gets a new URL
// and an unchanged one stays cached. Scripts loaded on demand (the search index,
// map markers) use the build's version in <html data-build>; see fresh() in core.js.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const PUBLIC = ['index.html', 'pages', 'assets', 'data', 'content/news.js', 'content/news-img', 'content/map-conditions.js', 'content/map-markers'];
const SKIP = new Set(['pages/_template.html']);

fs.rmSync(OUT, { recursive: true, force: true });
for (const entry of PUBLIC) {
  fs.cpSync(path.join(ROOT, entry), path.join(OUT, entry), {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(ROOT, src).split(path.sep).join('/');
      return !SKIP.has(rel) && path.basename(src) !== '.DS_Store';
    },
  });
}

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
})(OUT);

const rel = (file) => path.relative(OUT, file).split(path.sep).join('/');
const hash = (buf) => createHash('sha1').update(buf).digest('hex').slice(0, 8);
const versions = new Map(files.filter((f) => /\.(js|css|svg)$/.test(f)).map((f) => [rel(f), hash(fs.readFileSync(f))]));
// The map conditions are always fetched fresh (conditions.js), and the hourly sync
// changes them; leaving them out keeps the build version steady between real changes.
const build = hash([...versions].filter(([file]) => file !== 'content/map-conditions.js').sort().join('\n'));

let versioned = 0;
for (const file of files.filter((f) => f.endsWith('.html'))) {
  const dir = path.posix.dirname(rel(file));
  const page = fs
    .readFileSync(file, 'utf8')
    .replace(/<html\b/, `<html data-build="${build}"`)
    .replace(/\b(src|href)="([^"?#:]+\.(?:js|css|svg))"/g, (m, attr, ref) => {
      const v = versions.get(path.posix.normalize(path.posix.join(dir, ref)));
      if (!v) return m;
      versioned += 1;
      return `${attr}="${ref}?v=${v}"`;
    });
  fs.writeFileSync(file, page);
}

const bytes = files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
console.log(`dist/: ${files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB; ${versioned} script and style links versioned, build ${build}`);
