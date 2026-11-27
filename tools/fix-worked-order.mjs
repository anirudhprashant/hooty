#!/usr/bin/env node
// Move each lesson's worked example in front of its first question.
//
// Learning-design rule 3: show one fully worked example, then practice. 857 lessons currently ask a
// question and only explain afterwards, which is the order that teaches least. This is a pure
// reordering inside each lesson: no text is written or deleted, so it is safe to apply to every pack.
//
//   node tools/fix-worked-order.mjs --dry
//   node tools/fix-worked-order.mjs --apply
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PACKS = 'public/content/packs';
const QUESTION = new Set(['mcq', 'truefalse', 'fillblank', 'matchpairs', 'dragorder', 'explore', 'cloze', 'storyorder', 'wordlab', 'numeric', 'shortanswer']);
const apply = process.argv.includes('--apply');
const touched = [];

for (const book of readdirSync(PACKS).filter((b) => !b.startsWith('_') && existsSync(join(PACKS, b, 'pack.json')))) {
  const file = join(PACKS, book, 'pack.json');
  const pack = JSON.parse(readFileSync(file, 'utf8'));
  let changed = 0;
  for (const unit of pack.units || []) for (const ch of unit.chapters || []) for (const l of ch.lessons || []) {
    const acts = l.activities || [];
    const w = acts.findIndex((a) => a.type === 'worked');
    const q = acts.findIndex((a) => QUESTION.has(a.type));
    if (w < 0 || q < 0 || w < q) continue;
    // pull the worked example out and drop it immediately before the first question
    const [worked] = acts.splice(w, 1);
    const qNow = acts.findIndex((a) => QUESTION.has(a.type));
    acts.splice(qNow, 0, worked);
    l.activities = acts;
    changed++;
    touched.push(`${book}/${l.id}`);
  }
  if (changed && apply) writeFileSync(file, JSON.stringify(pack, null, 1) + '\n');
  if (changed) console.log(`${apply ? 'fixed' : 'would fix'} ${String(changed).padStart(4)}  ${book}`);
}
console.log(`\n${apply ? 'fixed' : 'would fix'} ${touched.length} lessons in total`);
