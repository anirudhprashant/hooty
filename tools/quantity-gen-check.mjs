#!/usr/bin/env node
/**
 * Every generated sentence, not just the one a walk happened to draw.
 *
 * A computed Maths problem carries a `gen` recipe; the engine draws new numbers each time it is shown, so a
 * "1 children" that appears for one draw is invisible in the pack JSON. This realises every recipe in a book
 * many times with a fixed seed and reads the rendered text, which is the only way to measure the class of bug
 * rather than one instance of it.
 *
 *   node tools/quantity-gen-check.mjs [pack]        # default: every built pack
 *   DRAWS=400 node tools/quantity-gen-check.mjs mathematics-g1
 *
 * Exit 0 when no rendered sentence says "1 <plural>", 1 when one does.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { realise, PLURAL_NOUNS } from '../public/engine/core/gen.js';

const ONLY = process.argv[2];
const DRAWS = Number(process.env.DRAWS || 200);
const PACKS = '/home/ubuntu/agent-workspace/hooty-wt/fix/public/content/packs';
const DETECT = new RegExp(
  '(?<![A-Za-z0-9.])1 (' + Object.keys(PLURAL_NOUNS).sort((a, b) => b.length - a.length).join('|') + ')\\b', 'i'
);

// deterministic rng so a run can be repeated exactly
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const books = ONLY ? [ONLY] : readdirSync(PACKS).filter((d) => !d.includes('.'));
let bad = 0, checked = 0, recipes = 0;
const samples = [];

for (const book of books) {
  let pack;
  try { pack = JSON.parse(readFileSync(`${PACKS}/${book}/pack.json`, 'utf8')); } catch { continue; }
  const acts = [];
  for (const u of pack.units || []) for (const c of u.chapters || []) for (const l of c.lessons || []) for (const a of l.activities || []) if (a.gen) acts.push({ id: l.id, a });
  if (!acts.length) continue;
  recipes += acts.length;
  const rnd = mulberry32(0xc0ffee);
  for (const { id, a } of acts) {
    for (let i = 0; i < DRAWS; i++) {
      const out = realise(a, rnd);
      if (out === a) continue;                       // recipe could not draw; stored example is shown
      const fields = [out.prompt, out.explanation, out.hint, ...(out.steps || []), ...Object.values(out.why || {})];
      for (const f of fields) {
        if (typeof f !== 'string') continue;
        checked++;
        if (DETECT.test(f) && samples.length < 10) samples.push(`${id} [draw ${i}]: ...${f.match(new RegExp('.{0,50}' + DETECT.source + '.{0,30}', 'i'))?.[0]}...`);
        if (DETECT.test(f)) bad++;
      }
    }
  }
}

console.log(`${recipes} gen recipes in ${books.length} packs, ${checked} rendered sentences checked, ${bad} say "1 <plural>"`);
for (const s of samples) console.log('  x', s);
process.exit(bad ? 1 : 0);
