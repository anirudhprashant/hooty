// Can a simulation challenge be reached by moving the sliders? Shared by tools/auto-explore.mjs and tools/explore-check.mjs.
// It must be false at the start. Then it tries, in order: one slider at a time through all its values; every combination of
// the interesting values (each slider's min, start and max, plus any number written in the challenge itself); and 20000 fixed
// random positions. That finds every real challenge quickly, where trying all positions of four big sliders took minutes.
import { evaluate } from '../public/engine/core/gen.js';

function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function reachable(sliders, when) {
  const start = Object.fromEntries(sliders.map((x) => [x[0], x[5]]));
  const hit = (pos) => { try { return evaluate(when, pos) !== 0; } catch { return false; } };
  if (hit(start)) return false;
  const values = sliders.map(([, , min, max, step]) => { const out = []; for (let x = min; x <= max + 1e-9; x += step) out.push(+x.toFixed(4)); return out; });
  // one slider at a time
  for (let i = 0; i < sliders.length; i++) for (const x of values[i]) if (hit({ ...start, [sliders[i][0]]: x })) return true;
  // interesting values in every combination
  const nums = (String(when).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  const picks = sliders.map(([, , min, max, , st], i) => {
    if (values[i].length <= 25) return values[i];
    const keep = new Set([min, max, st]);
    for (const n of nums) if (values[i].includes(n)) keep.add(n);
    return [...keep];
  });
  let combos = [{}];
  for (let i = 0; i < sliders.length && combos.length <= 300000; i++) combos = combos.flatMap((c) => picks[i].map((x) => ({ ...c, [sliders[i][0]]: x })));
  if (combos.length <= 300000 && combos.some(hit)) return true;
  // random positions, the same every run
  const rnd = seeded(7);
  for (let k = 0; k < 20000; k++) if (hit(Object.fromEntries(sliders.map(([key], i) => [key, values[i][Math.floor(rnd() * values[i].length)]])))) return true;
  return false;
}
