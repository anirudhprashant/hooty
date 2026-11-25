#!/usr/bin/env node
// Why has this chapter no simulation? For every lesson without one, scores every kit and says the best
// near-misses and why each was refused. Read-only; it writes nothing.
//   node tools/explain-explore.mjs english-g6 [social-science-g10 ...]
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { WIDGETS, slidersOf } from '../public/engine/core/explorables.js';
import { KITS } from './explore-kits.mjs';
import { reachable } from './reach.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUBJECTS = JSON.parse(execFileSync('python3', ['-c', 'import sys,json; sys.path.insert(0, "tools"); from subjects import SUBJECTS; print(json.dumps(SUBJECTS))'], { cwd: ROOT, encoding: 'utf8' }));
const KIND = { Mathematics: ['maths'], Science: ['science'], 'Social Science': ['social'], 'The World Around Us': ['science', 'social'], Physics: ['science', 'maths'], Chemistry: ['science'], Biology: ['science'], Geography: ['social'], History: ['social'], English: ['english'], Hindi: ['hindi'], Kannada: ['kannada'] };
const pick = (v, lang) => (v && typeof v === 'object' && !Array.isArray(v) && (lang in v || 'en' in v) ? (v[lang] ?? v.en) : v);
const canReach = (widget, params, when) => reachable(slidersOf(widget, params), when);
const books = process.argv.slice(2).filter((a) => !a.startsWith('--'));

for (const slug of books) {
  const sub = SUBJECTS[slug];
  if (!sub) continue;
  const grade = Number(sub.grade) || 6, work = join(ROOT, sub.work), kinds = KIND[sub.name] || [], lang = sub.language || 'en';
  console.log(`\n### ${slug} (${sub.name}, class ${grade}, ${lang}) kinds=${kinds.join(',') || 'none'}`);
  for (const ch of readdirSync(work).filter((d) => /^ch\d\d$/.test(d)).sort()) {
    const factsFile = join(work, ch, 'facts.json');
    if (!existsSync(factsFile)) continue;
    const facts = JSON.parse(readFileSync(factsFile, 'utf8'));
    const have = existsSync(join(work, ch, 'explore.json')) ? JSON.parse(readFileSync(join(work, ch, 'explore.json'), 'utf8')) : {};
    const open = (facts.lessons || []).filter((l) => !have[l.id.slice(1)]?.widget);
    if (!open.length) continue;
    console.log(`\n ${ch}: ${open.length} lesson(s) with no simulation`);
    for (const lesson of open.slice(0, 3)) {
      const title = lesson.title || '', text = (lesson.facts || []).map((f) => f.say).join(' ');
      const rows = Object.entries(KITS).map(([id, k]) => {
        const w = WIDGETS[id];
        const score = (() => { let s = 0; for (const p of k.match) { const re = new RegExp(p.source, 'i'); if (re.test(title)) s += 3; else if (!k.titleOnly && re.test(text)) s += 1; } return s; })();
        const want = typeof k.minScore === 'object' ? (k.minScore[grade] ?? 3) : (k.minScore || 3);
        let why = '';
        if (!w) why = 'no widget';
        else if (!(k.languages || ['en']).includes(lang)) why = `language ${lang} not offered`;
        else if (![w.subject, ...(k.subjects || [])].some((x) => kinds.includes(x))) why = `subject ${w.subject}/${(k.subjects || []).join(',')} vs ${kinds.join(',')}`;
        else if (grade < k.grades[0] || grade > k.grades[1]) why = `grades ${k.grades.join('-')}`;
        else if (score < want) why = `score ${score} < ${want}`;
        else why = 'FIT';
        return { id, score, want, why, k };
      }).filter((r) => r.why === 'FIT' || r.score >= Math.max(1, r.want - 2)).sort((a, b) => b.score - a.score).slice(0, 6);
      console.log(`   "${title.slice(0, 60)}"`);
      for (const r of rows) console.log(`      ${r.id}: score ${r.score}/${r.want} ${r.why}`);
    }
  }
}
