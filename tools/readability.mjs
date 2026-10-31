#!/usr/bin/env node
/**
 * Reading-level check for lesson text. A Class 6 child (about 11) should be able
 * to read every question without help. Reports the Flesch-Kincaid grade for each
 * activity and flags long sentences and long words.
 *
 * Targets (tunable): grade <= 6.5 per activity, sentences <= 20 words.
 * Subject words a lesson teaches (equator, latitude) are expected to be long;
 * list them in the pack's glossary and they are not counted against the lesson.
 *
 * Usage: node tools/readability.mjs <pack.json | lesson.json> [--glossary glossary.json] [--max-grade 6.5]
 */
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : def; };
const glossaryPath = opt('--glossary', null);
const MAX_GRADE = Number(opt('--max-grade', 6.5));
const MAX_SENT = 20;

const taught = new Set();
if (glossaryPath) for (const t of JSON.parse(readFileSync(glossaryPath, 'utf8')).terms || []) for (const w of [t.term, ...(t.aka || [])]) for (const x of w.toLowerCase().split(/\s+/)) taught.add(x);

function syllables(w) {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

function grade(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => /\w/.test(s));
  const words = (text.match(/[A-Za-z][A-Za-z'’-]*/g) || []).filter((w) => !taught.has(w.toLowerCase().replace(/(?:'s|s)$/, '')));
  if (!sentences.length || !words.length) return { grade: 0, long: [] };
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const g = 0.39 * (words.length / sentences.length) + 11.8 * (syl / words.length) - 15.59;
  return { grade: g, long: sentences.filter((s) => s.split(/\s+/).length > MAX_SENT) };
}

function text(a) {
  const out = [];
  for (const k of ['prompt', 'title', 'body', 'explanation', 'note']) if (typeof a[k] === 'string') out.push(a[k]);
  for (const k of ['keyPoints']) if (Array.isArray(a[k])) out.push(...a[k]);
  return out.map((s) => s.replace(/\*\*/g, '')).map((s) => (/[.!?]$/.test(s.trim()) ? s : s + '.')).join(' ');
}

let worst = 0, n = 0, over = 0, sum = 0;
for (const f of args) {
  const pack = JSON.parse(readFileSync(f, 'utf8'));
  const lessons = [];
  if (pack.units) for (const u of pack.units) for (const c of u.chapters) { for (const l of c.lessons || []) lessons.push([`${c.id}/${l.id}`, l]); if (c.boss) lessons.push([`${c.id}/boss`, c.boss]); }
  else lessons.push([f, pack]);
  for (const [lid, l] of lessons) for (const a of l.activities || []) {
    const { grade: g, long } = grade(text(a));
    n++; sum += g; worst = Math.max(worst, g);
    if (g > MAX_GRADE || long.length) {
      if (g > MAX_GRADE) over++;
      console.log(`${lid}/${a.id}: grade ${g.toFixed(1)}${long.length ? `, ${long.length} long sentence(s): "${long[0].slice(0, 70)}..."` : ''}`);
    }
  }
}
console.log(`\n${n} activities, average grade ${(sum / (n || 1)).toFixed(1)}, worst ${worst.toFixed(1)}, ${over} over ${MAX_GRADE}`);
process.exit(over ? 1 : 0);
