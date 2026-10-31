#!/usr/bin/env node
// Assemble a content pack from loose lesson/boss files into pack.json.
//
// Usage: node tools/build-pack.mjs <pack-dir> <unit-spec.json> <file.json ...>
//
// The unit spec is:
//   { "id": "history", "title": "History", "icon": "🏛️",
//     "chapters": [ { "id": "ch1-...", "title": "...", "summary": "...",
//                     "lessons": ["lesson-1.json", "lesson-2.json"],
//                     "boss": "boss-1.json" } ] }

import { readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const [packDir, specPath, ...files] = process.argv.slice(2);
if (!packDir || !specPath || !files.length) {
  console.error('usage: build-pack.mjs <pack-dir> <unit-spec.json> <file.json ...>');
  process.exit(2);
}

const spec = JSON.parse(await readFile(specPath, 'utf8'));
const byName = new Map(files.map((f) => [basename(f), f]));

async function load(name) {
  const path = byName.get(name);
  if (!path) throw new Error(`missing file: ${name}`);
  return JSON.parse(await readFile(path, 'utf8'));
}

const units = [];
for (const u of spec.units) {
  const chapters = [];
  for (const c of u.chapters) {
    const lessons = [];
    for (const name of c.lessons) lessons.push(await load(name));
    const chapter = {
      id: c.id,
      title: c.title,
      summary: c.summary || '',
      lessons,
    };
    if (c.boss) {
      const boss = await load(c.boss);
      chapter.boss = { ...boss };
    }
    chapters.push(chapter);
  }
  const unit = { id: u.id, title: u.title, chapters };
  if (u.icon) unit.icon = u.icon;
  units.push(unit);
}

const packPath = join(resolve(packDir), 'pack.json');
const existing = JSON.parse(await readFile(packPath, 'utf8').catch(() => '{}'));
const pack = { ...existing, units };

await writeFile(packPath, `${JSON.stringify(pack, null, 2)}\n`);

const nLessons = units.reduce((n, u) => n + u.chapters.reduce((m, c) => m + c.lessons.length, 0), 0);
const nBoss = units.reduce((n, u) => n + u.chapters.filter((c) => c.boss).length, 0);
console.log(`built ${packPath}: ${units.length} units, ${nLessons} lessons, ${nBoss} boss challenges`);
