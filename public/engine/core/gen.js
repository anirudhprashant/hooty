// Fresh numbers for computed Maths problems. A problem carries a "gen" recipe (a sentence with {placeholders}, the values
// each may take, constraints, and a formula for the answer). Every time it is shown, realise() draws new numbers, works out
// the answer with a small safe evaluator (no eval), and builds the question, so a child cannot memorise answers and
// "More problems" never runs dry. The recipe was verified at build time (tools/calc-problems.py); if no valid draw is
// found the stored example is shown instead.

const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|(\*\*|\/\/|<=|>=|==|!=|[-+*/%<>(),])|([A-Za-z_]\w*))/y;

function tokenize(src) {
  const out = [];
  TOKEN.lastIndex = 0;
  let m;
  while (TOKEN.lastIndex < src.length && (m = TOKEN.exec(src))) {
    if (m[1] !== undefined) out.push({ t: 'num', v: Number(m[1]) });
    else if (m[2] !== undefined) out.push({ t: 'op', v: m[2] });
    else out.push({ t: 'id', v: m[3] });
  }
  if (TOKEN.lastIndex < src.trimEnd().length) throw new Error('bad expression');
  return out;
}

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const FUNCS = {
  sqrt: Math.sqrt, abs: Math.abs, min: Math.min, max: Math.max, round: Math.round,
  gcd, lcm: (a, b) => (a && b ? Math.abs(a * b) / gcd(a, b) : 0),
};
const pmod = (a, b) => { if (!b) throw new Error('mod by zero'); return ((a % b) + b) % b; };

// Evaluate an arithmetic / comparison expression such as "2*(l+w)" or "a > b and n % d == 0".
export function evaluate(src, env) {
  const toks = tokenize(String(src).replace(/&&/g, ' and ').replace(/\|\|/g, ' or '));
  let i = 0;
  const peek = () => toks[i];
  const isOp = (...ops) => peek() && peek().t === 'op' && ops.includes(peek().v);
  const isWord = (w) => peek() && peek().t === 'id' && peek().v === w;

  function orExpr() { let v = andExpr(); while (isWord('or')) { i++; const r = andExpr(); v = (v !== 0 || r !== 0) ? 1 : 0; } return v; }
  function andExpr() { let v = cmp(); while (isWord('and')) { i++; const r = cmp(); v = (v !== 0 && r !== 0) ? 1 : 0; } return v; }
  function cmp() {
    let left = add(), compared = false;
    while (isOp('<', '>', '<=', '>=', '==', '!=')) {
      compared = true;
      const op = toks[i++].v, right = add();
      const ok = { '<': left < right, '>': left > right, '<=': left <= right, '>=': left >= right, '==': left === right, '!=': left !== right }[op];
      if (!ok) { while (isOp('<', '>', '<=', '>=', '==', '!=')) { i++; add(); } return 0; }
      left = right;
    }
    return compared ? 1 : left;
  }
  function add() { let v = mul(); while (isOp('+', '-')) { const op = toks[i++].v, r = mul(); v = op === '+' ? v + r : v - r; } return v; }
  function mul() {
    let v = unary();
    while (isOp('*', '/', '//', '%')) {
      const op = toks[i++].v, r = unary();
      if (op === '*') v *= r;
      else if (op === '/') { if (!r) throw new Error('divide by zero'); v /= r; }
      else if (op === '//') { if (!r) throw new Error('divide by zero'); v = Math.floor(v / r); }
      else v = pmod(v, r);
    }
    return v;
  }
  function unary() { if (isOp('-')) { i++; return -unary(); } if (isOp('+')) { i++; return unary(); } return power(); }
  function power() { const b = atom(); if (isOp('**')) { i++; const e = unary(); if (!Number.isInteger(e)) throw new Error('fractional power'); return b ** e; } return b; }
  function atom() {
    const tk = toks[i++];
    if (!tk) throw new Error('unexpected end');
    if (tk.t === 'num') return tk.v;
    if (tk.t === 'op' && tk.v === '(') { const v = orExpr(); if (!isOp(')')) throw new Error('missing )'); i++; return v; }
    if (tk.t === 'id') {
      if (isOp('(')) {
        i++;
        const args = [];
        if (!isOp(')')) { do { args.push(orExpr()); if (isOp(',')) i++; else break; } while (true); }
        if (!isOp(')')) throw new Error('missing )'); i++;
        if (!Object.hasOwn(FUNCS, tk.v)) throw new Error('unknown function ' + tk.v);
        return FUNCS[tk.v](...args);
      }
      if (!Object.hasOwn(env, tk.v)) throw new Error('unknown name ' + tk.v);
      return env[tk.v];
    }
    throw new Error('unexpected ' + tk.v);
  }
  const v = orExpr();
  if (i !== toks.length) throw new Error('trailing input');
  if (!Number.isFinite(v) || Math.abs(v) > 1e9) throw new Error('out of range');
  return v;
}

// A child can type a whole number or a decimal with at most two places.
const shortNumber = (x) => Math.abs(x * 100 - Math.round(x * 100)) < 1e-6;
const fmt = (x) => String(+x.toFixed(2));
const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];

function valuesOf(spec) {
  if (Array.isArray(spec)) return spec;
  const lo = Number(spec.min), hi = Number(spec.max), st = Number(spec.step) || 1, out = [];
  for (let v = lo; v <= hi; v += st) out.push(v);
  return out;
}

function shuffle(list, rnd) { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; }

// Model specs hold numbers as expressions over the problem's values (for example {"type":"array","rows":"b","cols":"a"}).
// These keys are words, not numbers, so they are filled in like the sentence; everything else is evaluated.
const TEXT_KEYS = new Set(['type', 'label', 'total', 'unit']);
function resolveSpec(spec, num, vars) {
  if (Array.isArray(spec)) return spec.map((x) => resolveSpec(x, num, vars));
  if (spec && typeof spec === 'object') return Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, TEXT_KEYS.has(k) ? (typeof v === 'string' ? fill(v, vars) : v) : resolveSpec(v, num, vars)]));
  if (typeof spec === 'string') return evaluate(spec, num);
  return spec;
}

// Return a copy of the activity with newly drawn numbers; an activity with no recipe comes back unchanged.
// Besides the question it builds the worked steps, the visual model and, for multiple choice, a note on each common mistake.
export function realise(activity, rnd = Math.random) {
  const g = activity?.gen;
  if (!g) return activity;
  try {
    const lists = Object.fromEntries(Object.entries(g.params).map(([k, v]) => [k, valuesOf(v)]));
    for (let tries = 0; tries < 80; tries++) {
      const env = Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, pick(v, rnd)]));
      const num = Object.fromEntries(Object.entries(env).filter(([, v]) => typeof v === 'number'));
      if (Object.values(num).some((v) => v === 1)) continue;              // never "1 children"
      if ((g.where || []).some((c) => evaluate(c, num) === 0)) continue;
      const ans = evaluate(g.answer, num);
      if (!(ans > 0) || !shortNumber(ans)) continue;
      const truth = fmt(ans);
      // named in-between values ("vals") are available to the steps and the model, in order
      const mid = {};
      for (const [k, expr] of Object.entries(g.vals || {})) { mid[k] = evaluate(expr, { ...num, ...mid, answer: ans }); }
      const nums = { ...num, ...mid, answer: ans };
      const shown = Object.fromEntries(Object.entries(mid).map(([k, v]) => [k, fmt(v)]));
      const vars = { ...env, ...shown, answer: truth };
      const text = fill(g.template, vars);
      if (text === activity.prompt && tries < 20) continue;               // a different question from the one just shown
      const steps = (g.steps || []).map((x) => fill(x, vars));
      const out = { ...activity, prompt: text };
      out.explanation = steps.length ? steps.join(' ') : (g.explain ? fill(g.explain, vars) : activity.explanation);
      if (steps.length) out.steps = steps;
      out.result = truth;
      if (g.hint) out.hint = fill(g.hint, vars);
      if (g.model) { try { out.modelSpec = resolveSpec(g.model, nums, vars); } catch { /* no picture, still a good question */ } }
      if (activity.type === 'mcq') {
        const others = [], why = {};
        (g.wrong || []).forEach((w, wi) => {
          try {
            const v = fmt(evaluate(w, nums));
            if (v !== truth && !others.includes(v)) { others.push(v); if ((g.wrongWhy || [])[wi]) why[v] = fill(g.wrongWhy[wi], vars); }
          } catch { /* skip */ }
        });
        for (const extra of [ans + 1, ans - 1, ans * 2, ans + 10]) { if (others.length >= 3) break; const v = fmt(extra); if (extra >= 0 && v !== truth && !others.includes(v)) others.push(v); }
        if (others.length < 3) continue;
        const options = shuffle([truth, ...others.slice(0, 3)], rnd);
        out.options = options; out.answer = options.indexOf(truth); out.why = why;
      } else {
        out.answers = [truth];
      }
      return out;
    }
  } catch { /* fall back to the stored example below */ }
  return activity;
}
