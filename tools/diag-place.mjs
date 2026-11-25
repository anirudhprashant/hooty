#!/usr/bin/env node
// Why did auto-explore refuse a kit for one lesson? Prints each candidate and the exact gate it failed.
//   node tools/diag-place.mjs mathematics-g4 ch10
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { WIDGETS, slidersOf } from '../public/engine/core/explorables.js';
import { KITS } from './explore-kits.mjs';
import { reachable } from './reach.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUBJECTS = JSON.parse(execFileSync('python3', ['-c', 'import sys,json; sys.path.insert(0, "tools"); from subjects import SUBJECTS; print(json.dumps(SUBJECTS))'], { cwd: ROOT, encoding: 'utf8' }));
const KIND = { Mathematics: ['maths'], Science: ['science'], 'Social Science': ['social'], 'The World Around Us': ['science', 'social'], English: ['english'], Hindi: ['hindi'] };
const [slug, ch] = process.argv.slice(2);
const sub = SUBJECTS[slug], grade = Number(sub.grade) || 6, work = join(ROOT, sub.work), kinds = KIND[sub.name] || [], lang = sub.language || 'en';
const glossFile = join(ROOT, 'public/content/packs', sub.pack, 'glossary.json');
const gloss = existsSync(glossFile) ? JSON.parse(readFileSync(glossFile, 'utf8')).terms || [] : [];
const facts = JSON.parse(readFileSync(join(work, ch, 'facts.json'), 'utf8'));
const words = gloss.filter((t) => (t.src || []).some((x) => x && Number(x.ch) === Number(ch.slice(2))));
const pick = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? (v[lang] ?? v.en) : v);
for (const lesson of facts.lessons || []) {
  const title = lesson.title || '', text = (lesson.facts || []).map((f) => f.say).join(' ');
  console.log(`\n"${title}"`);
  for (const [id, kit] of Object.entries(KITS)) {
    if (!WIDGETS[id]) continue;
    if (!(kit.languages || ['en']).includes(lang)) continue;
    if (![WIDGETS[id].subject, ...(kit.subjects || [])].some((x) => kinds.includes(x))) continue;
    if (grade < kit.grades[0] || grade > kit.grades[1]) continue;
    let score = 0;
    for (const p of kit.match) { const re = new RegExp(p.source, 'i'); if (re.test(title)) score += 3; else if (!kit.titleOnly && re.test(text)) score += 1; }
    const want = typeof kit.minScore === 'object' ? (kit.minScore[grade] ?? 3) : (kit.minScore || 3);
    if (score < want || kit.fallback) continue;
    let why = '';
    let params = {};
    try { params = kit.params ? kit.params(`${title} ${text}`.toLowerCase(), lesson.facts || [], (facts.lessons || []).flatMap((l) => l.facts || []), grade, lang, words) : {}; } catch (e) { why = 'params threw ' + e.message; }
    if (!why && kit.usable && !kit.usable(params)) why = 'usable() false ' + JSON.stringify(params).slice(0, 80);
    const full = { ...(WIDGETS[id].params || {}), ...params };
    let tasks = [];
    if (!why) {
      try {
        tasks = (typeof kit.tasks === 'function' ? kit.tasks(params, lang) : kit.tasks).map((t) => ({ ...t, say: pick(t.say), then: pick(t.then) })).filter((t) => { try { return t.ok || reachable(slidersOf(id, full), t.when); } catch { return false; } });
      } catch (e) { why = 'tasks threw ' + e.message; }
      if (!why && !tasks.length) why = 'no reachable task';
    }
    console.log(`  ${id}: score ${score}/${want} ${why || 'PLACEABLE (' + tasks.length + ' tasks)'}`);
  }
}
