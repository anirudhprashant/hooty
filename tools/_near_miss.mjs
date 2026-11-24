// Lessons in sim-less chapters that a kit almost matches (score 2 against a bar of 3), scored exactly as
// tools/auto-explore.mjs scores them, so a regex quirk cannot disagree with the real matcher.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { WIDGETS } from '../public/engine/core/explorables.js';
import { KITS } from './explore-kits.mjs';

const ROOT = join(process.cwd());
const SUBJECTS = JSON.parse(execFileSync('python3', ['-c', 'import sys,json; sys.path.insert(0,"tools"); from subjects import SUBJECTS; print(json.dumps(SUBJECTS))'], { cwd: ROOT, encoding: 'utf8' }));
const KIND = { Mathematics: ['maths'], Science: ['science'], 'Social Science': ['social'], 'The World Around Us': ['science', 'social'], Physics: ['science', 'maths'], Chemistry: ['science'], Biology: ['science'], Geography: ['social'], History: ['social'], English: ['english'], Hindi: ['hindi'], Kannada: ['kannada'] };

const rows = [];
for (const [slug, sub] of Object.entries(SUBJECTS)) {
  const kinds = KIND[sub.name] || [];
  if (!kinds.length) continue;
  const grade = Number(sub.grade) || 6;
  const lang = sub.language || 'en';
  const work = join(ROOT, sub.work);
  if (!existsSync(work)) continue;
  for (const ch of readdirSync(work).filter((d) => /^ch\d\d$/.test(d)).sort()) {
    const factsFile = join(work, ch, 'facts.json');
    if (!existsSync(factsFile)) continue;
    const facts = JSON.parse(readFileSync(factsFile, 'utf8'));
    const exFile = join(work, ch, 'explore.json');
    const have = existsSync(exFile) ? JSON.parse(readFileSync(exFile, 'utf8')) : {};
    if (Object.values(have).some((v) => v?.widget)) continue;   // chapter already has one
    for (const lesson of facts.lessons || []) {
      const key = (lesson.id || '?').slice(1);
      if (have[key]?.skip) continue;
      const title = lesson.title || '';
      const text = (lesson.facts || []).map((f) => f.say).join(' ');
      const best = [];
      for (const [kid, kit] of Object.entries(KITS)) {
        if (!WIDGETS[kid]) continue;
        if (!(kit.languages || ['en']).includes(lang)) continue;
        if (![WIDGETS[kid].subject, ...(kit.subjects || [])].some((x) => kinds.includes(x))) continue;
        if (!(grade >= kit.grades[0] && grade <= kit.grades[1])) continue;
        let s = 0;
        for (const p of kit.match) {
          const re = new RegExp(p.source, 'i');
          if (re.test(title)) s += 3;
          else if (!kit.titleOnly && re.test(text)) s += 1;
        }
        if (s === 2) best.push(kid);
      }
      if (best.length) rows.push({ slug, ch, title, best, text: text.slice(0, 110) });
    }
  }
}
console.log(`${rows.length} lessons in sim-less chapters that a kit almost matches`);
for (const r of rows) console.log(`  ${r.slug.padEnd(16)} ${r.ch} ${r.title.slice(0, 54).padEnd(54)} ${r.best.slice(0, 3).join(',')} | ${r.text}`);
