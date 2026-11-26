#!/usr/bin/env node
// Walk a lesson to its explore card, then SOLVE each task: read the task's `when` from the pack, enumerate the slider
// values that satisfy it, set them, and check the card ticks. Unlike the blind sweep this can set three or four
// sliders at once and can hit a narrow window on a wide slider.
//
//   node tools/solve-explore.mjs mathematics-g2 mathematics-g2-ch1-l2
//   SITE=http://127.0.0.1:8123 node tools/solve-explore.mjs <book> <lesson>
//
// It reads the pack from public/content/packs, so run it after a build; the site under test can be anything.
import { chromium } from 'playwright';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { slidersOf } from '../public/engine/core/explorables.js';

const packId = process.argv[2] || 'mathematics-g2';
const lessonId = process.argv[3] || 'mathematics-g2-ch1-l2';
const SITE = process.env.SITE || 'https://hooty.org';
const pack = JSON.parse(readFileSync(`public/content/packs/${packId}/pack.json`, 'utf8'));
let lesson = null;
for (const u of pack.units || []) for (const c of u.chapters || []) for (const l of c.lessons || []) if (l.id === lessonId) lesson = l;
if (!lesson) { console.log('FAIL no such lesson', lessonId); process.exit(1); }
const act = (lesson.activities || []).find((a) => a.type === 'explore');
if (!act) { console.log('FAIL no explore activity'); process.exit(1); }
const tasks = act.tasks || [];
const sliders = slidersOf(act.widget, act.params || {});
const domains = sliders.map(([key, , min, max, step]) => {
  const vals = [];
  for (let v = min; v <= max; v += step) vals.push(Math.round(v * 1000) / 1000);
  return { key, vals };
});

// a tiny reader for "a == 1 and b >= 2 and c <= 3"
const parse = (when) => {
  const terms = String(when).split(/\s+and\s+/).map((t) => t.trim());
  const out = [];
  for (const t of terms) {
    const m = t.match(/^(\w+)\s*(==|>=|<=|>|<)\s*(-?[\d.]+)$/);
    if (!m) return null;
    out.push({ key: m[1], op: m[2], value: Number(m[3]) });
  }
  return out;
};
const ok = (terms, state) => terms.every(({ key, op, value }) => {
  const v = state[key];
  if (v === undefined) return false;
  if (op === '==') return v === value;
  if (op === '>=') return v >= value;
  if (op === '<=') return v <= value;
  if (op === '>') return v > value;
  if (op === '<') return v < value;
  return false;
});
const solve = (terms) => {
  const keys = [...new Set(terms.map((t) => t.key))];
  const idx = keys.map((k) => domains.findIndex((d) => d.key === k));
  if (idx.some((i) => i < 0)) return [];
  const out = [];
  const walk = (n, state) => {
    if (out.length >= 3000) return;
    if (n === keys.length) { if (ok(terms, state)) out.push({ ...state }); return; }
    for (const v of domains[idx[n]].vals) { state[keys[n]] = v; walk(n + 1, state); if (out.length >= 3000) return; }
  };
  walk(0, {});
  return out;
};

const root = `${process.env.HOME}/.cache/ms-playwright`;
let exe = '';
for (const d of readdirSync(root).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
  const bin = `${root}/${d}/chrome-linux/chrome`;
  if (existsSync(bin)) { exe = bin; break; }
}
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${SITE}/#/lesson/${packId}/${lessonId}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2400);
let found = false;
for (let i = 0; i < 30; i++) {
  const cls = await page.evaluate(() => document.querySelector('.activity')?.className || '');
  if (cls.includes('explore')) { found = true; break; }
  await page.keyboard.press('1').catch(() => {});
  await page.waitForTimeout(220);
  await page.keyboard.press('Enter').catch(() => {});
  await page.waitForTimeout(750);
}
if (!found) { console.log('FAIL explore not found'); await browser.close(); process.exit(1); }

const ranges = page.locator('.explore__range');
const n = await ranges.count();
const set = async (state) => {
  for (let k = 0; k < n; k++) {
    const key = sliders[k][0];
    if (state[key] === undefined) continue;
    await ranges.nth(k).evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, state[key]);
  }
  await page.waitForTimeout(60);
};
let solved = 0;
for (let t = 0; t < tasks.length; t++) {
  const terms = parse(tasks[t].when);
  if (!terms) { console.log(`task ${t}: condition not understood -> ${tasks[t].when}`); continue; }
  const combos = solve(terms);
  if (!combos.length) { console.log(`task ${t}: no combination satisfies ${tasks[t].when}`); continue; }
  let ticked = false;
  for (const state of combos.slice(0, 400)) {
    await set(state);
    const done = await page.evaluate(() => document.querySelectorAll('.explore__task.is-done').length);
    if (done > solved) { solved = done; ticked = true; break; }
  }
  console.log(`task ${t} ${tasks[t].when} -> ${ticked ? 'ticked' : 'NOT ticked'} (${combos.length} combinations)`);
}
console.log(`solved ${solved}/${tasks.length}`);
console.log('errors:', errors.slice(0, 3));
await browser.close();
process.exit(solved === tasks.length ? 0 : 1);
