#!/usr/bin/env node
// Play one lesson from every book, or every lesson in a list, and report what did not reach the celebration.
// The walker already knows how to answer every card type; this just runs it widely and quickly.
//
//   node tools/sweep-lessons.mjs                       one lesson per book, 3 at a time
//   node tools/sweep-lessons.mjs --book science-g9     every lesson in one book
//   node tools/sweep-lessons.mjs --limit 5 --jobs 2    a small sample while changing the engine
//
// Exit code is 1 when any lesson failed, so it can guard a publish.
import { execFile } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const BASE = process.env.BASE || 'https://hooty.org/';
const JOBS = Math.max(1, Number(flag('--jobs', 3)));
const LIMIT = Number(flag('--limit', 0)) || 0;
const ONLY_BOOK = flag('--book');
const PER_CHAPTER = args.includes('--per-chapter');

function lessonsOf(pack, perChapter = false) {
  const out = [];
  for (const unit of pack.units) for (const chapter of unit.chapters) {
    const chapterLessons = [];
    for (const lesson of chapter.lessons || []) {
      const id = lesson.id || '';
      if (id.endsWith('-exam')) continue;
      const kinds = new Set((lesson.activities || []).map((a) => a.type));
      if (kinds.size >= 3) chapterLessons.push(id);
    }
    if (!chapterLessons.length) continue;
    if (perChapter) out.push(chapterLessons[Math.floor(Math.random() * chapterLessons.length)]);
    else out.push(...chapterLessons);
  }
  return out;
}

const packsDir = join(ROOT, 'public/content/packs');
const packs = readdirSync(packsDir).filter((slug) => !ONLY_BOOK || slug === ONLY_BOOK).sort();
const targets = [];
for (const slug of packs) {
  let pack;
  try {
    pack = JSON.parse(readFileSync(join(packsDir, slug, 'pack.json'), 'utf8'));
  } catch { continue; }
  const lessons = lessonsOf(pack, PER_CHAPTER);
  if (!lessons.length) continue;
  // One per book by default (a spread, so different chapters get touched across runs), or one per chapter.
  if (PER_CHAPTER) for (const lesson of lessons) targets.push({ slug, lesson });
  else targets.push({ slug, lesson: lessons[Math.floor(Math.random() * lessons.length)] });
}
const queue = LIMIT ? targets.slice(0, LIMIT) : targets;
console.log(`sweeping ${queue.length} lesson${queue.length === 1 ? '' : 's'} with ${JOBS} at a time against ${BASE}`);

const walk = ({ slug, lesson }) => new Promise((done) => {
  const url = `${BASE}?x=${Math.floor(Math.random() * 1e9)}#/lesson/${slug}/${lesson}`;
  execFile('node', ['tools/play-lesson.mjs', url], {
    cwd: ROOT, timeout: 240000, env: { ...process.env, VW: '390', VH: '844' }, maxBuffer: 8 << 20,
  }, (err, stdout, stderr) => {
    const out = `${stdout || ''}${stderr || ''}`;
    const ok = out.includes('celebrated=1') && out.includes('lesson played through cleanly');
    const steps = (out.split('\n').find((l) => l.includes('steps=')) || '').trim();
    const problems = out.split('\n').filter((l) => l.trim().startsWith('x ')).slice(0, 1);
    done({ slug, lesson, ok, steps, problems, timedOut: err?.killed || false });
  });
});

const failures = [];
let next = 0;
async function worker() {
  while (next < queue.length) {
    const item = queue[next++];
    const result = await walk(item);
    if (result.ok) console.log(`ok   ${result.slug.padEnd(20)} ${result.lesson}`);
    else {
      failures.push(result);
      console.log(`FAIL ${result.slug.padEnd(20)} ${result.lesson} ${result.timedOut ? '(timed out)' : ''} ${result.problems[0] || ''}`);
    }
  }
}
await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, worker));

console.log(`\nclean: ${queue.length - failures.length} of ${queue.length}`);
for (const f of failures) console.log(`  ${f.slug} ${f.lesson}: ${f.steps || 'no steps'} ${f.problems[0] || ''}`);
process.exit(failures.length ? 1 : 0);
