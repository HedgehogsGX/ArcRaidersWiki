#!/usr/bin/env node
// Copies the files the browser actually loads into dist/, which is what the
// hosts publish. The upstream submodule, scripts, the translation cache and
// node_modules stay out of the upload.
//
//   node scripts/build-site.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const PUBLIC = ['index.html', 'pages', 'assets', 'data', 'content/news.js', 'content/news-img'];
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

let files = 0;
let bytes = 0;
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      files += 1;
      bytes += fs.statSync(full).size;
    }
  }
})(OUT);
console.log(`dist/: ${files} files, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
