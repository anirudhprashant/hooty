#!/usr/bin/env node
/**
 * Expand a hand-written lesson ("f": ["1.4", "1.5"]) into a shippable one:
 * each fact id becomes a src entry { ch, p, ev } taken from the chapter's facts.json.
 *
 * Usage: node tools/compile-lessons.mjs <facts.json> <lessons-dir> <out-dir> [--strip-ev]
 *   --strip-ev   drop the evidence phrase (ship only chapter + page)
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const strip = args.includes('--strip-ev');
const [factsPath, inDir, outDir] = args.filter((a) => !a.startsWith('--'));
const facts = JSON.parse(readFileSync(factsPath, 'utf8'));
const byId = new Map([...facts.lessons.flatMap((l) => l.facts), ...(facts.extra || [])].map((f) => [f.id, f]));
mkdirSync(outDir, { recursive: true });
let bad = 0;
for (const name of readdirSync(inDir).filter((n) => n.endsWith('.json'))) {
  const lesson = JSON.parse(readFileSync(join(inDir, name), 'utf8'));
  for (const a of lesson.activities) {
    const src = [];
    for (const id of a.f || []) {
      const f = byId.get(id);
      if (!f) { console.error(`${name}/${a.id}: unknown fact ${id}`); bad++; continue; }
      src.push(strip ? { ch: facts.chapter, p: f.p } : { ch: facts.chapter, p: f.p, ev: f.ev });
    }
    delete a.f;
    a.src = src;
  }
  writeFileSync(join(outDir, name), `${JSON.stringify(lesson, null, 2)}\n`);
}
process.exit(bad ? 1 : 0);
