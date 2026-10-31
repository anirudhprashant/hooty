#!/usr/bin/env node
/**
 * Fact check: does every lesson claim point at the textbook, and does the
 * textbook actually say it?
 *
 * For each activity (and each glossary term) in a pack.json or a loose
 * lesson file:
 *   1. `src` must exist: [{ "ch": 3, "p": 45, "ev": "a short phrase from the book" }]
 *   2. `ev` must appear in chapter `ch` (on page `p`, or on `p`+1 if the text
 *      runs over) after normalising case, accents, quotes and line breaks.
 *   3. `ev` must be short (12 words or fewer): we point at the book, we do not copy it.
 *   4. NUMBER AUDIT: every number in the prompt, options and explanation
 *      must appear somewhere in the cited chapters. This is the check that
 *      catches an invented date such as the "261 BCE" that once slipped in.
 *   5. NAME AUDIT (warning): capitalised words that are not in the cited chapters
 *      are listed for a human to look at.
 *
 * Exit 1 on any error. Warnings are listed but do not fail the run.
 *
 * Usage:
 *   node tools/verify-sources.mjs <pack.json | lesson.json ...> [--glossary glossary.json]
 */

import { readFileSync } from 'node:fs';
import { chapterNorm, findPages, normalise, loadChapter } from './lib/source.mjs';

const args = process.argv.slice(2);
const gi = args.indexOf('--glossary');
const glossaryPath = gi >= 0 ? args.splice(gi, 2)[1] : null;
const files = args;
if (!files.length && !glossaryPath) { console.error('usage: verify-sources.mjs <file.json ...> [--glossary g.json]'); process.exit(2); }

const errors = [];
const warnings = [];
const notes = [];
let checked = 0;

const UNGRADED_OK_WITHOUT_SRC = new Set(['media', 'hook']);
const COMMON_CAPS = new Set(['The', 'A', 'An', 'In', 'On', 'It', 'He', 'She', 'They', 'We', 'You', 'I', 'This', 'That', 'These', 'Those', 'Which', 'What', 'Who', 'Where', 'When', 'Why', 'How', 'Is', 'Are', 'Was', 'Were', 'Do', 'Does', 'Did', 'True', 'False', 'Not', 'Yes', 'No', 'And', 'But', 'Or', 'So', 'If', 'Put', 'Match', 'Choose', 'Read', 'Look', 'Think', 'Remember', 'Correct', 'Great', 'Well', 'Try', 'Each', 'Both', 'All', 'Some', 'Many', 'Most', 'After', 'Before', 'Because', 'India', 'Indian', 'Class', 'Chapter']);

function strings(a) {
  const out = [];
  for (const k of ['prompt', 'title', 'body', 'explanation', 'note', 'answerText', 'front', 'back', 'question']) if (typeof a[k] === 'string') out.push(a[k]);
  for (const k of ['options', 'keyPoints', 'items', 'accept']) if (Array.isArray(a[k])) for (const x of a[k]) if (typeof x === 'string') out.push(x);
  if (Array.isArray(a.pairs)) for (const p of a.pairs) out.push(...p.filter((x) => typeof x === 'string'));
  if (Array.isArray(a.labels)) for (const l of a.labels) if (l?.text) out.push(l.text);
  return out.map((x) => x.replace(/\*\*/g, ''));
}

function checkClaim(where, item, texts) {
  const src = item.src;
  if (!Array.isArray(src) || !src.length) { errors.push(`${where}: no "src" (chapter, page, evidence)`); return; }
  const chapters = new Set();
  for (const s of src) {
    if (!Number.isInteger(s.ch) || !Number.isInteger(s.p) || typeof s.ev !== 'string') { errors.push(`${where}: src needs integer ch, integer p, and an "ev" phrase`); continue; }
    chapters.add(s.ch);
    const words = s.ev.trim().split(/\s+/).length;
    if (words > 12) errors.push(`${where}: evidence is ${words} words; keep it to 12 or fewer (point at the book, do not copy it)`);
    let pages;
    try { pages = findPages(s.ch, s.ev); } catch (e) { errors.push(`${where}: ${e.message}`); continue; }
    if (!pages.length) errors.push(`${where}: evidence "${s.ev}" not found in chapter ${s.ch}`);
    else if (!pages.some((p) => Math.abs(p - s.p) <= 1)) errors.push(`${where}: evidence found on page ${pages.join('/')} not ${s.p}`);
  }
  // number + name audits against everything the item cites
  let hay = '';
  try { hay = [...chapters].map(chapterNorm).join(' '); } catch { return; }
  const hayWords = new Set(hay.split(' '));
  const blob = texts.join(' \n ');
  // Numbers the author worked out (not printed in the book) must be declared in
  // "derived", e.g. "derived": ["2 hours = 30 / 15"]. They pass the audit but are
  // listed so a human can re-do the arithmetic.
  const derivedText = (item.derived || []).join(' ');
  if (item.derived?.length) notes.push(`${where}: derived ${JSON.stringify(item.derived)}`);
  for (const m of blob.matchAll(/\b\d[\d,]*(?:\.\d+)?(?:\/\d+)?\b/g)) {
    const n = normalise(m[0]);
    const inBook = ` ${hay} `.includes(` ${n} `);
    const inDerived = derivedText && ` ${normalise(derivedText)} `.includes(` ${n} `);
    if (!inBook && !inDerived) errors.push(`${where}: number "${m[0]}" does not appear in cited chapter(s) ${[...chapters].join(', ')} (if you worked it out, declare it in "derived")`);
  }
  const seen = new Set();
  for (const m of blob.matchAll(/(?<![.!?]\s)(?<!^)\b([A-Z][a-zA-ZĀ-ſ]{2,})\b/g)) {
    const w = m[1];
    if (COMMON_CAPS.has(w) || seen.has(w)) continue;
    seen.add(w);
    if (!hayWords.has(normalise(w))) warnings.push(`${where}: name/word "${w}" not found in cited chapter(s) ${[...chapters].join(', ')}; check it`);
  }
}

function walkActivities(pack, fileLabel) {
  const lessons = [];
  if (pack.units) {
    for (const u of pack.units) for (const c of u.chapters) {
      for (const l of c.lessons || []) lessons.push([`${c.id}/${l.id}`, l]);
      if (c.boss) lessons.push([`${c.id}/boss`, c.boss]);
    }
  } else if (pack.activities) lessons.push([fileLabel, pack]);
  for (const [lid, l] of lessons) {
    for (const a of l.activities || []) {
      if (UNGRADED_OK_WITHOUT_SRC.has(a.type) && !a.src) continue;
      checked++;
      checkClaim(`${lid}/${a.id}`, a, strings(a));
    }
  }
}

for (const f of files) walkActivities(JSON.parse(readFileSync(f, 'utf8')), f);

if (glossaryPath) {
  const g = JSON.parse(readFileSync(glossaryPath, 'utf8'));
  for (const t of g.terms || []) {
    checked++;
    if (!t.meaning) errors.push(`glossary/${t.term}: missing "meaning"`);
    if (t.meaning && t.meaning.split(/\s+/).length > 30) warnings.push(`glossary/${t.term}: meaning is long; aim for one short sentence`);
    checkClaim(`glossary/${t.term}`, t, [t.meaning || '']);
  }
}

for (const n of notes) console.log(`check ${n}`);
for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`\nchecked ${checked} items: ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
