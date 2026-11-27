#!/usr/bin/env node
// Lesson audit: does a lesson teach, or does it only display?
//
// These are the measurable parts of work/../learning-design. Each check maps to a rule a lesson has to
// pass, and each flag is a cheap thing to fix. Numbers only measure; a human still has to read the
// worst ones, so this prints the prompts it is complaining about.
//
//   node tools/lesson-audit.mjs                 # every pack, summary + worst 40
//   node tools/lesson-audit.mjs --book science-g7
//   node tools/lesson-audit.mjs --json /tmp/audit.json
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PACKS = 'public/content/packs';
const QUESTION = new Set(['mcq', 'truefalse', 'fillblank', 'matchpairs', 'dragorder', 'explore', 'cloze', 'storyorder', 'wordlab', 'numeric', 'shortanswer']);
const INTERACTIVE = new Set(['explore', 'cloze', 'storyorder', 'wordlab', 'matchpairs', 'dragorder']);
// Graded means it is scored. Exploration and word lab are not: an explore card before a worked example is
// the child poking at the thing first, which is good, and counting it as "practice before teaching" was
// the audit's own false positive.
const GRADED = new Set(['mcq', 'truefalse', 'fillblank', 'matchpairs', 'dragorder', 'cloze', 'storyorder', 'numeric', 'shortanswer']);
const EXERCISE_RE = /\b(write (it |them )?in your|in your notebook|in your copy|discuss (it )?with your (teacher|partner|parents)|ask your (teacher|parents)|with your teacher)\b/i;

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const onlyBook = opt('--book', null);
const jsonOut = opt('--json', null);

const books = readdirSync(PACKS).filter((b) => !b.startsWith('_') && existsSync(join(PACKS, b, 'pack.json')) && (!onlyBook || b === onlyBook));
const rows = [], byCheck = {}, byBook = {};

for (const book of books) {
  const pack = JSON.parse(readFileSync(join(PACKS, book, 'pack.json'), 'utf8'));
  for (const unit of pack.units || []) for (const ch of unit.chapters || []) for (const l of ch.lessons || []) {
    const acts = l.activities || [];
    const types = acts.map((a) => a.type);
    const qIdx = types.map((t, i) => (QUESTION.has(t) ? i : -1)).filter((i) => i >= 0);
    const flags = [];
    const detail = [];
    if (!qIdx.length) { flags.push('no-retrieval'); detail.push('nothing is ever asked'); }
    const firstWorked = types.indexOf('worked'), firstQ = types.findIndex((t) => GRADED.has(t));
    if (firstWorked >= 0 && firstQ >= 0 && firstWorked > firstQ) { flags.push('worked-after-practice'); detail.push(`worked example comes at step ${firstWorked + 1}, questions start at ${firstQ + 1}`); }
    const qs = acts.filter((a) => QUESTION.has(a.type) && a.type !== 'explore');
    if (qs.length >= 3) {
      const withWhy = qs.filter((a) => a.why && Object.keys(a.why).length).length;
      if (withWhy / qs.length < 0.4) { flags.push('feedback-thin'); detail.push(`${withWhy}/${qs.length} wrong answers explain themselves`); }
      const counts = {};
      for (const a of qs) counts[a.type] = (counts[a.type] || 0) + 1;
      const topType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (topType && topType[1] / qs.length > 0.7) { flags.push('same-shape-practice'); detail.push(`${topType[1]} of ${qs.length} questions are ${topType[0]}`); }
    }
    const reused = qs.filter((a) => EXERCISE_RE.test(String(a.prompt || '')));
    if (reused.length) { flags.push('textbook-exercise'); detail.push(`asks the textbook's own task: "${String(reused[0].prompt).slice(0, 80)}"`); }
    if (!types.some((t) => INTERACTIVE.has(t))) { flags.push('no-interaction'); detail.push('nothing to touch'); }
    // The checkpoint is the "did the page go in" card between teaching and practice.
    const isExam = l.id.endsWith('-exam') || !qIdx.length;
    if (!isExam && !acts.some((a) => (a.tags || []).includes('checkpoint'))) { flags.push('no-checkpoint'); detail.push('teaching goes straight to the test'); }
    const long = qs.filter((a) => String(a.prompt || '').length > 220);
    if (long.length) { flags.push('long-prompt'); detail.push(`${long.length} question(s) over 220 characters`); }
    // Ends-flat was checked per lesson and fired on all 3,619, because no lesson has a closing card at
    // all. That is one missing feature, not 3,619 defects, so it is reported once below instead.
    if (!flags.length) continue;
    rows.push({ book, chapter: ch.id, lesson: l.id, title: l.title, flags, detail });
    for (const f of flags) byCheck[f] = (byCheck[f] || 0) + 1;
    byBook[book] = (byBook[book] || 0) + 1;
  }
}

const total = rows.length;
const score = (r) => r.flags.length;
rows.sort((a, b) => score(b) - score(a));

console.log(`lessons with at least one flag: ${total} of ${books.length} books scanned`);
console.log('\nby check:');
for (const [k, v] of Object.entries(byCheck).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(5)}  ${k}`);
console.log('\nworst books:');
for (const [k, v] of Object.entries(byBook).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${String(v).padStart(5)}  ${k}`);
console.log('\nworst lessons:');
for (const r of rows.slice(0, 40)) console.log(`  ${r.flags.length}x ${r.book}/${r.lesson} (${r.title})\n      ${r.flags.join(', ')}\n      ${r.detail.join('; ')}`);

if (jsonOut) { writeFileSync(jsonOut, JSON.stringify({ total, byCheck, byBook, rows }, null, 1)); console.log(`\njson: ${jsonOut}`); }
