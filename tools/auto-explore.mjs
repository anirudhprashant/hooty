#!/usr/bin/env node
// Attach simulations to lessons by rule, with no model: each kit in tools/explore-kits.mjs says what words mean a lesson is
// about its idea and which classes learn it. A lesson gets the best-scoring kit (title words count 3, fact words 1, at least 3
// needed), at most two lessons per chapter share a simulation, and every challenge is checked: false at the start and reachable.
// Lessons that already have a simulation, or are marked { "skip": true }, are left alone.
//   node tools/auto-explore.mjs mathematics-g8 [mathematics-g9 ...] [--ch=3] [--dry]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WIDGETS, slidersOf } from '../public/engine/core/explorables.js';
import { evaluate } from '../public/engine/core/gen.js';
import { KITS } from './explore-kits.mjs';
import { reachable } from './reach.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
import { execFileSync } from 'node:child_process';
// the same book list the Python tools use (tools/subjects.py: two built-ins plus tools/subjects.json)
const SUBJECTS = JSON.parse(execFileSync('python3', ['-c', 'import sys,json; sys.path.insert(0, "tools"); from subjects import SUBJECTS; print(json.dumps(SUBJECTS))'], { cwd: ROOT, encoding: 'utf8' }));
const dry = process.argv.includes('--dry');
const books = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const only = Number((process.argv.find((a) => a.startsWith('--ch=')) || '').slice(5)) || 0;   // one chapter, so parallel chapters never write each other's files

// a challenge must be false at the start and reachable with the sliders (tools/reach.mjs)
const canReach = (widget, params, when) => reachable(slidersOf(widget, params), when);

const score = (kit, title, text) => {
  if ((kit.avoid || []).some((p) => new RegExp(p.source, 'i').test(title))) return -1;   // a word that means this kit is the wrong idea here
  let s = 0;
  for (const p of kit.match) { const re = new RegExp(p.source, 'i'); if (re.test(title)) s += 3; else if (!kit.titleOnly && re.test(text)) s += 1; }
  return s;
};

// which simulations suit which kind of book (a kit's `subjects` adds more, e.g. the ruler is in maths and science books)
const KIND = { Mathematics: ['maths'], Science: ['science'], 'Social Science': ['social'], 'The World Around Us': ['science', 'social'], Physics: ['science', 'maths'], Chemistry: ['science'], Biology: ['science'], Geography: ['social'], History: ['social'], English: ['english'], Hindi: ['hindi'], Kannada: ['kannada'] };
// A kit is written in one language unless it says otherwise. `languages` lets a kit serve a Hindi book, and its
// title, takeaway and task wording are given per language as { en: ..., hi: ... }.
const pick = (v, lang) => (v && typeof v === 'object' && !Array.isArray(v) && (lang in v || 'en' in v) ? (v[lang] ?? v.en) : v);
let added = 0, looked = 0;
const tally = {};
for (const slug of books) {
  const sub = SUBJECTS[slug];
  if (!sub) { console.error(`unknown book ${slug}`); continue; }
  const grade = Number(sub.grade) || 6, work = join(ROOT, sub.work), kinds = KIND[sub.name] || [];
  const lang = sub.language || 'en';
  // A chapter's words and their meanings, as the book defines them. Only the fallback kit uses them (the word lab):
  // the entry carries the sentence the book uses the word in, so the meaning can be read in its own context.
  const glossFile = join(ROOT, 'public/content/packs', sub.pack, 'glossary.json');
  const gloss = existsSync(glossFile) ? (JSON.parse(readFileSync(glossFile, 'utf8')).terms || []) : [];
  // Literature books still get nothing, but a Hindi book now gets a simulation when a kit is written for Hindi.
  if (!kinds.length) continue;
  for (const ch of readdirSync(work).filter((d) => /^ch\d\d$/.test(d) && (!only || Number(d.slice(2)) === only)).sort()) {
    const factsFile = join(work, ch, 'facts.json'), out = join(work, ch, 'explore.json');
    if (!existsSync(factsFile)) continue;
    const facts = JSON.parse(readFileSync(factsFile, 'utf8')), have = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
    const used = {};
    const chapterNo = Number(ch.slice(2));
    const words = gloss.filter((t) => (t.src || []).some((x) => x && Number(x.ch) === chapterNo));
    // the per-chapter limit counts each mode of a widget apart (weighing and pouring, winnowing and settling)
    const slot = (id, params) => (params?.kind ? `${id}:${params.kind}` : id);
    for (const v of Object.values(have)) if (v?.widget) used[slot(v.widget, v.params)] = (used[slot(v.widget, v.params)] || 0) + 1;
    const allowed = ([id, k]) => WIDGETS[id] && (k.languages || ['en']).includes(lang)
      && [WIDGETS[id].subject, ...(k.subjects || [])].some((x) => kinds.includes(x)) && grade >= k.grades[0] && grade <= k.grades[1];
    // Try one kit on one lesson: build its params, refuse a cap that is full and a challenge that cannot be reached,
    // and write the record when everything holds. Returns true when it was placed.
    const place = (lesson, key, title, text, id, kit) => {
      const params = kit.params ? kit.params(`${title} ${text}`.toLowerCase(), lesson.facts || [], (facts.lessons || []).flatMap((l) => l.facts || []), grade, lang, words) : {};
      if (kit.usable && !kit.usable(params)) { if (process.env.AE_DEBUG) console.log('   x', id, 'usable'); return false; }
      const cap = typeof kit.perChapter === 'object' ? (kit.perChapter[grade] ?? 2) : (kit.perChapter || 2);   // a number, or { grade: number } to raise it for one class
      if ((used[slot(id, params)] || 0) >= cap) { if (process.env.AE_DEBUG) console.log('   x', id, 'cap', cap); return false; }
      const full = { ...(WIDGETS[id].params || {}), ...params };
      const tasks = (typeof kit.tasks === 'function' ? kit.tasks(params, lang) : kit.tasks).map((t) => ({ ...t, say: pick(t.say, lang), then: pick(t.then, lang) })).filter((t) => { try { return t.ok || canReach(id, full, t.when); } catch { return false; } });   // t.ok: true = checked by hand (the search is a sample, so an exact sum over many sliders can be missed)
      if (!tasks.length) { if (process.env.AE_DEBUG) console.log('   x', id, 'no tasks'); return false; }
      have[key] = { widget: id, ...(kit.params ? { params } : {}), title: pick(kit.title, lang), tasks: tasks.map(({ ok, ...t }) => t), takeaway: pick(kit.takeaway, lang), auto: true };
      used[slot(id, params)] = (used[slot(id, params)] || 0) + 1; added++; tally[id] = (tally[id] || 0) + 1;
      console.log(`${slug} ${ch} lesson ${key} "${title.slice(0, 50)}": ${id}`);
      return true;
    };
    const open = (facts.lessons || []).filter((l) => !have[l.id.slice(1)]?.widget && !have[l.id.slice(1)]?.skip);
    // First pass: the kits that are about an idea. A fallback kit is never chosen on words.
    for (const lesson of open) {
      const key = lesson.id.slice(1);
      looked++;
      const title = lesson.title || '', text = (lesson.facts || []).map((f) => f.say).join(' ');
      const ranked = Object.entries(KITS)
        .filter(([id, k]) => allowed([id, k]) && !k.fallback)
        .map(([id, k]) => [id, k, score(k, title, text)]).filter((x) => x[2] >= (typeof x[1].minScore === 'object' ? (x[1].minScore[grade] ?? 3) : (x[1].minScore || 3))).sort((a, b) => b[2] - a[2]);   // best score first. minScore: a number, or { grade: n } to ask for more evidence in one class
      for (const [id, kit] of ranked) if (place(lesson, key, title, text, id, kit)) break;
    }
    // Second pass: only a chapter with no idea to play with gets the word lab. A chapter that already has a real
    // simulation is left alone, so literature and civics get their words and maths and science keep their laws.
    const hasIdea = Object.entries(have).some(([, v]) => v?.widget && !KITS[v.widget]?.fallback);
    if (!hasIdea) for (const lesson of open.filter((l) => !have[l.id.slice(1)]?.widget)) {
      const key = lesson.id.slice(1), title = lesson.title || '', text = (lesson.facts || []).map((f) => f.say).join(' ');
      for (const [id, kit] of Object.entries(KITS)) if (kit.fallback && allowed([id, kit]) && place(lesson, key, title, text, id, kit)) break;
    }
    for (const lesson of facts.lessons || []) {
      const key = lesson.id.slice(1);
      if (!have[key]) have[key] = { widget: null };
    }
    if (!dry) writeFileSync(out, JSON.stringify(have, null, 1));
  }
}
console.log(`\n${added} of ${looked} lessons without a simulation got one${dry ? ' (dry run, nothing written)' : ''}:`, tally);
