import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { evaluate } from '../public/engine/core/gen.js';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '..');

function norm(s) {
  return String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

const NUM = '-?\\d+(?:\\.\\d+)?';
const NUM_RE = /^-?\d+(?:\.\d+)?$/;

function templateRegex(template, params) {
  const parts = norm(template).split(/\{(\w+)\}/);
  const names = [];
  let src = '';
  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      src += part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      return;
    }
    names.push(part);
    const values = params ? params[part] : undefined;
    const numeric = Array.isArray(values) && values.length > 0 && values.every((v) => typeof v === 'number');
    const ranged = values && !Array.isArray(values) && typeof values === 'object' && 'min' in values;
    src += numeric || ranged ? '(' + NUM + ')' : '(.+?)';
  });
  return { re: new RegExp('^' + src + '$'), names };
}

/** Every typed answer the packs expect, keyed by the question the child sees, plus the
 * generated-maths recipes so a question whose numbers change each time still resolves.
 *
 * The QA walkers used to type a fixed word into every text box, so any lesson with a
 * fill-in-the-blank reported "stuck on activity" and never reached the celebration.
 */
export function loadAnswers(root = DEFAULT_ROOT) {
  const answers = new Map();
  const gens = [];
  let packs = [];
  try {
    packs = readdirSync(join(root, 'public/content/packs'));
  } catch {
    return { answers, gens };
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
            const list = (a.answers || []).map((x) => String(x).trim()).filter(Boolean);
            if (!list.length) continue;
            const key = norm(a.prompt);
            if (!answers.has(key)) answers.set(key, list);
            if (a.gen && a.gen.template && a.gen.answer) {
              gens.push({
                ...templateRegex(a.gen.template, a.gen.params),
                template: a.gen.template,
                answer: a.gen.answer, vals: a.gen.vals || {},
                params: a.gen.params || {}, where: a.gen.where || [],
              });
            }
          }
        }
      }
    }
  }
  return { answers, gens };
}

/** The answer to type for this on-screen question, or null when the packs cannot work it out. */
/** The correct order for every tap-to-order activity, keyed by the question the child sees.
 * The pack stores `items` in the right order; the app shuffles the pool on screen, so a walker that
 * clicks the pool in whatever order it appears answers wrong and loops on the same question.
 */
export function loadOrders(root = DEFAULT_ROOT) {
  const orders = new Map();
  let packs = [];
  try {
    packs = readdirSync(join(root, 'public/content/packs'));
  } catch {
    return orders;
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
        // the chapter challenge (chapter.boss) holds its own dragorder questions and is a page of its own
        const pages = [...(chapter.lessons || []), ...(chapter.boss ? [chapter.boss] : [])];
        for (const lesson of pages) {
          for (const a of lesson.activities || []) {
            if (a.type !== 'dragorder' || !a.prompt || !Array.isArray(a.items) || a.items.length < 2) continue;
            const key = norm(a.prompt);
            const list = a.items.map((x) => norm(x));
            // "Put these numbers in order" appears in several lessons with different numbers, so keep every
            // order for a prompt and let the walker pick the one whose items match what is on screen.
            const all = orders.get(key) || [];
            if (!all.some((x) => x.length === list.length && x.every((v, i) => v === list[i]))) all.push(list);
            orders.set(key, all);
          }
        }
      }
    }
  }
  return orders;
}

export function answerFor(loaded, prompt) {
  const question = norm(prompt);
  const exact = loaded?.answers?.get(question);
  if (exact && exact.length) return exact[0];
  for (const g of loaded?.gens || []) {
    const m = question.match(g.re);
    if (!m) continue;
    const env = Object.fromEntries(g.names.map((name, i) => [name, NUM_RE.test(m[i + 1]) ? Number(m[i + 1]) : m[i + 1]]));
    // A recipe can ask for a value it never prints (the "greatest common size" style). Recover the hidden
    // parameters from their declared candidates and the recipe's own constraints.
    const candidates = (name) => {
      const spec = g.params?.[name];
      if (Array.isArray(spec) && spec.every((v) => typeof v === 'number')) return [...spec];
      if (spec && typeof spec === 'object' && typeof spec.min === 'number') {
        const step = spec.step || 1, out = [];
        for (let v = spec.min; v <= (spec.max ?? spec.min + 50); v += step) out.push(v);
        return out;
      }
      return Array.from({ length: 60 }, (_, i) => i + 1);
    };
    const hidden = Object.keys(g.params || {}).filter((name) => !(name in env));
    if (hidden.length) {
      const pick = (i, acc) => {
        if (i >= hidden.length) {
          return (g.where || []).every((cond) => { try { return evaluate(cond, acc) !== 0; } catch { return false; } }) ? acc : null;
        }
        for (const value of candidates(hidden[i])) {
          const next = { ...acc, [hidden[i]]: value };
          const ok = pick(i + 1, next);
          if (ok) return ok;
        }
        return null;
      };
      const solved = pick(0, { ...env });
      if (solved) Object.assign(env, solved);
    }
    try {
      // the recipe's named in-between values first (the engine does the same), then the answer itself
      const mid = {};
      for (const [name, expr] of Object.entries(g.vals || {})) mid[name] = evaluate(expr, { ...env, ...mid });
      // Several rod recipes share a shape ("One rod is {a} m {b} cm ..."), and binding one recipe's numbers to
      // another recipe's names gives a confidently wrong answer (60 instead of 160 on the two-metre-part question).
      // A recipe is only used when it reproduces the prompt word for word from its own values.
      const vars = { ...env, ...mid };
      let rendered = g.template;
      for (let pass = 0; pass < 3; pass++) rendered = rendered.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
      if (norm(rendered) !== question) continue;
      const value = evaluate(g.answer, { ...env, ...mid });
      if (Number.isFinite(value)) return String(Math.round(value * 1e6) / 1e6);
    } catch {
      /* a recipe we cannot evaluate: fall through to the next one */
    }
  }
  return null;
}

/**
 * Every question whose prompt the packs can tell apart, with the answer in the form its activity checks. The retake
 * walker (tools/qa-retake.mjs) answers the different question correctly after a re-teach, which is the only way to
 * prove the idea is credited to the card that was missed and not to the new wording.
 */
export function loadQuestions(root = DEFAULT_ROOT) {
  const map = new Map();
  let packs = [];
  try {
    packs = readdirSync(join(root, 'public/content/packs'));
  } catch {
    return map;
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
            if (!a.prompt) continue;
            const key = norm(a.prompt);
            if (map.has(key)) continue;
            if (a.type === 'mcq' && Array.isArray(a.options) && typeof a.answer === 'number') {
              map.set(key, { type: 'mcq', answer: a.answer, options: a.options });
            } else if (a.type === 'truefalse' && typeof a.answer === 'boolean') {
              map.set(key, { type: 'truefalse', answer: a.answer });
            } else if ((a.type === 'fillblank' || a.type === 'typeanswer') && Array.isArray(a.answers) && a.answers.length) {
              map.set(key, { type: a.type, answers: a.answers });
            }
          }
        }
      }
    }
  }
  return map;
}

/** The same whitespace-stable key loadQuestions uses. */
export function questionKey(prompt) {
  return norm(prompt);
}