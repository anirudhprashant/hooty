import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '..');

function norm(s) {
  return String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

const NUM = '-?\\d+(?:\\.\\d+)?';

function templateRegex(template) {
  const parts = norm(template).split(/\{(\w+)\}/);
  const names = [];
  let src = '';
  parts.forEach((part, i) => {
    if (i % 2 === 0) src += part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    else { names.push(part); src += '(' + NUM + ')'; }
  });
  return { re: new RegExp('^' + src + '$'), names };
}

/**
 * Every typed answer the packs expect, keyed by the question the child sees, plus the
 * generated-maths recipes so a question whose numbers change each time still resolves.
 *
 * The QA walkers used to type a fixed word into every text box, so any lesson with a
 * fill-in-the-blank reported "stuck on activity" and never reached the celebration.
 */
export function loadAnswers(root = DEFAULT_ROOT) {
  const map = new Map();
  const gens = [];
  let packs = [];
  try {
    packs = readdirSync(join(root, 'public/content/packs'));
  } catch {
    return { answers: map, gens };
  }
  for (const slug of packs) {
    let pack;
    try {
      pack = JSON.parse(readFileSync(join(root, 'public/content/packs', slug, 'pack.json'), 'utf8'));
    } catch {
      continue;
    }
    for (const unit of pack.units || []) {
      for (const chapter of unit.chapters || []) {
        for (const lesson of [...(chapter.lessons || []), chapter.boss].filter(Boolean)) {
          for (const a of lesson.activities || []) {
            if (a.type !== 'fillblank' && a.type !== 'typeanswer') continue;
            const answers = (a.answers || []).map((x) => String(x).trim()).filter(Boolean);
            if (!answers.length) continue;
            const key = norm(a.prompt);
            if (!map.has(key)) map.set(key, answers);
            if (a.gen && a.gen.template && a.gen.answer) gens.push({ ...templateRegex(a.gen.template), answer: a.gen.answer });
          }
        }
      }
    }
  }
  return { answers: map, gens };
}

/** The answer to type for this on-screen question, or null when the packs cannot work it out. */
export function answerFor(loaded, prompt) {
  const question = norm(prompt);
  const exact = loaded?.answers?.get(question);
  if (exact && exact.length) return exact[0];
  for (const g of loaded?.gens || []) {
    const m = question.match(g.re);
    if (!m) continue;
    const vals = g.names.map((_, i) => Number(m[i + 1]));
    if (vals.some((v) => !Number.isFinite(v))) continue;
    try {
      const value = Function(...g.names, `return (${g.answer});`)(...vals);
      if (Number.isFinite(value)) return String(value);
    } catch {
      /* a recipe we cannot evaluate: fall through to the next one */
    }
  }
  return null;
}
