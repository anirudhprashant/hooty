#!/usr/bin/env node
// Prints the widget catalogue, or checks challenges: node tools/explore-check.mjs <file.json> where the file is
// {"widget":"angle","params":{},"tasks":[{"when":"angle == 90"}]}. A challenge must be false at the start and reachable with the sliders.
import { readFileSync } from 'node:fs';
import { CATALOG, WIDGETS, slidersOf } from '../public/engine/core/explorables.js';
import { evaluate } from '../public/engine/core/gen.js';
import { reachable } from './reach.mjs';
if (!process.argv[2]) { console.log(JSON.stringify(CATALOG)); process.exit(0); }
const a = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const w = WIDGETS[a.widget];
if (!w) { console.log(JSON.stringify({ ok: false, why: 'unknown widget' })); process.exit(0); }
const params = { ...(w.params || {}), ...(a.params || {}) };
let sl; try { sl = slidersOf(a.widget, params); } catch { sl = null; }
if (!sl?.length || sl.some((x) => !Number.isFinite(x[2]) || !Number.isFinite(x[3]))) { console.log(JSON.stringify({ ok: false, why: 'bad sliders' })); process.exit(0); }
const start = Object.fromEntries(sl.map((x) => [x[0], x[5]]));
const bad = [];
(a.tasks || []).forEach((t, i) => {
  try {
    if (evaluate(t.when, start) !== 0) bad.push(`task ${i} already true at the start`);
    else if (!reachable(sl, t.when)) bad.push(`task ${i} cannot be reached`);
  } catch (e) { bad.push(`task ${i}: ${e.message}`); }
});
try { w.draw; } catch {}
console.log(JSON.stringify({ ok: !bad.length, why: bad.join('; ') }));
