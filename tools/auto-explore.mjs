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
  let s = 0;
  for (const p of kit.match) { const re = new RegExp(p.source, 'i'); if (re.test(title)) s += 3; else if (!kit.titleOnly && re.test(text)) s += 1; }
  return s;
};

// which simulations suit which kind of book (a kit's `subjects` adds more, e.g. the ruler is in maths and science books)
const KIND = { Mathematics: ['maths'], Science: ['science'], 'Social Science': ['social'], 'The World Around Us': ['science', 'social'], Physics: ['science', 'maths'], Chemistry: ['science'], Biology: ['science'], Geography: ['social'], History: ['social'] };
let added = 0, looked = 0;
const tally = {};
for (const slug of books) {
  const sub = SUBJECTS[slug];
  if (!sub) { console.error(`unknown book ${slug}`); continue; }
  const grade = Number(sub.grade) || 6, work = join(ROOT, sub.work), kinds = KIND[sub.name] || [];
  if (!kinds.length || sub.language && sub.language !== 'en') continue;   // literature and Hindi books have no simulations
  for (const ch of readdirSync(work).filter((d) => /^ch\d\d$/.test(d) && (!only || Number(d.slice(2)) === only)).sort()) {
    const factsFile = join(work, ch, 'facts.json'), out = join(work, ch, 'explore.json');
    if (!existsSync(factsFile)) continue;
    const facts = JSON.parse(readFileSync(factsFile, 'utf8')), have = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
    const used = {};
    // the per-chapter limit counts each mode of a widget apart (weighing and pouring, winnowing and settling)
    const slot = (id, params) => (params?.kind ? `${id}:${params.kind}` : id);
    for (const v of Object.values(have)) if (v?.widget) used[slot(v.widget, v.params)] = (used[slot(v.widget, v.params)] || 0) + 1;
    for (const lesson of facts.lessons || []) {
      const key = lesson.id.slice(1);
      if (have[key]?.widget || have[key]?.skip) continue;   // skip: true marks a lesson a person decided has no fitting simulation
      looked++;
      const title = lesson.title || '', text = (lesson.facts || []).map((f) => f.say).join(' ');
      const ranked = Object.entries(KITS)
        .filter(([id, k]) => WIDGETS[id] && [WIDGETS[id].subject, ...(k.subjects || [])].some((x) => kinds.includes(x)) && grade >= k.grades[0] && grade <= k.grades[1])
        .map(([id, k]) => [id, k, score(k, title, text)]).filter((x) => x[2] >= (typeof x[1].minScore === 'object' ? (x[1].minScore[grade] ?? 3) : (x[1].minScore || 3)))   // minScore: a number, or { grade: n } to ask for more evidence in one class.sort((a, b) => b[2] - a[2]);
      for (const [id, kit] of ranked) {
        const params = kit.params ? kit.params(`${title} ${text}`.toLowerCase(), lesson.facts || [], (facts.lessons || []).flatMap((l) => l.facts || [])) : {};
        if (kit.usable && !kit.usable(params)) continue;
        const cap = typeof kit.perChapter === 'object' ? (kit.perChapter[grade] ?? 2) : (kit.perChapter || 2);   // a number, or { grade: number } to raise it for one class
        if ((used[slot(id, params)] || 0) >= cap) continue;
        const full = { ...(WIDGETS[id].params || {}), ...params };
        const tasks = (typeof kit.tasks === 'function' ? kit.tasks(params) : kit.tasks).filter((t) => { try { return canReach(id, full, t.when); } catch { return false; } });
        if (!tasks.length) continue;
        have[key] = { widget: id, ...(kit.params ? { params } : {}), title: kit.title, tasks, takeaway: kit.takeaway, auto: true };
        used[slot(id, params)] = (used[slot(id, params)] || 0) + 1; added++; tally[id] = (tally[id] || 0) + 1;
        console.log(`${slug} ${ch} lesson ${key} "${title.slice(0, 50)}": ${id}`);
        break;
      }
      if (!have[key]) have[key] = { widget: null };
    }
    if (!dry) writeFileSync(out, JSON.stringify(have, null, 1));
  }
}
console.log(`\n${added} of ${looked} lessons without a simulation got one${dry ? ' (dry run, nothing written)' : ''}:`, tally);
