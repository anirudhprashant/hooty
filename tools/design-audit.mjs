#!/usr/bin/env node
/**
 * Design audit for every simulation widget: measures what a phone cannot forgive.
 *
 *   node tools/design-audit.mjs [url] [--shots DIR] [--all] [--min 14]
 *
 * url defaults to the local build on http://127.0.0.1:8124/ (started by this script's docs, see
 * work/qa/DESIGN-BAR.md); pass https://hooty.org/ to audit what children actually get.
 *
 * For each widget it draws the default, maximum and middle slider positions into a 600x300 card
 * and reports, per widget:
 *   - any text under `--min` SVG units (14 is the phone floor: the card is drawn at 600 and shown
 *     at about 340 on a phone, so 14 units reads as roughly 8 pixels)
 *   - text whose box runs past the card's safe area (8 units inside each edge)
 *   - text outside the card entirely
 * It exits 1 when anything is flagged, so a publish gate can refuse on it.
 *
 * --shots DIR writes a 390-wide PNG of every flagged widget (or of every widget with --all), for a
 * human or a vision model to look at. A measurement is not a design review: look at the pictures.
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';

async function playwright() {
  for (const p of ['playwright', '/home/ubuntu/node_modules/playwright/index.mjs']) {
    try { return await import(p); } catch { /* try the next */ }
  }
  throw new Error('playwright not found: npm i playwright in ~ or in the project');
}

function findChrome() {
  const root = `${process.env.HOME}/.cache/ms-playwright`;
  if (!existsSync(root)) return undefined;
  for (const d of readdirSync(root).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
    const bin = `${root}/${d}/chrome-linux/chrome`;
    if (existsSync(bin)) return bin;
  }
  return undefined;
}

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:\/\//.test(a)) || 'http://127.0.0.1:8124/';
const min = Number(args[args.indexOf('--min') + 1]) || 14;
const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : '';
const all = args.includes('--all');
if (shots) mkdirSync(shots, { recursive: true });

const { chromium } = await playwright();
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.goto(url, { waitUntil: 'domcontentloaded' });

const report = await page.evaluate(async (min) => {
  const m = await import('/engine/core/explorables.js');
  const out = [];
  for (const [id, w] of Object.entries(m.WIDGETS)) {
    const r = { id, small: [], outside: [], tight: [], drew: 0 };
    try {
      const sl = w.dynamicSliders ? w.dynamicSliders(w.params || {}) : w.sliders;
      if (!sl || !sl.length) { r.err = 'no sliders'; out.push(r); continue; }
      const combos = [
        Object.fromEntries(sl.map((s) => [s[0], s[5]])),
        Object.fromEntries(sl.map((s) => [s[0], s[3]])),
        Object.fromEntries(sl.map((s) => [s[0], Math.round((s[2] + s[3]) / 2)])),
      ];
      for (const v of combos) {
        let res; try { res = w.draw(v, w.params || {}); } catch { continue; }
        r.drew++;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 600 300');
        for (const k of res.kids) svg.append(k);
        document.body.innerHTML = ''; document.body.append(svg);
        for (const t of svg.querySelectorAll('text')) {
          const txt = (t.textContent || '').slice(0, 18);
          if (!txt.trim()) continue;   // an empty <text> has a zero box and is not a design problem
          const fs = parseFloat(getComputedStyle(t).fontSize) || 0;
          if (fs && fs < min) r.small.push(`${fs}:${txt}`);
          let b; try { b = t.getBBox(); } catch { continue; }
          if (b.x < -1 || b.y < -1 || b.x + b.width > 601 || b.y + b.height > 301) r.outside.push(txt);
          else if (fs && (b.x < 8 || 592 < b.x + b.width)) r.tight.push(`${txt}@${Math.round(b.x)}-${Math.round(b.x + b.width)}`);
        }
      }
    } catch (e) { r.err = e.message.slice(0, 40); }
    r.small = [...new Set(r.small)]; r.outside = [...new Set(r.outside)]; r.tight = [...new Set(r.tight)];
    out.push(r);
  }
  return out;
}, min);

const bad = report.filter((r) => r.err || r.small.length || r.outside.length || r.tight.length);
console.log(`widgets: ${report.length}, drawn: ${report.filter((r) => r.drew).length}, flagged: ${bad.length}`);
for (const r of bad) {
  const bits = [];
  if (r.err) bits.push(`ERR ${r.err}`);
  if (r.small.length) bits.push(`small<${min}: ${r.small.join(' | ')}`);
  if (r.outside.length) bits.push(`off-card: ${r.outside.join(' | ')}`);
  if (r.tight.length) bits.push(`near-edge: ${r.tight.join(' | ')}`);
  console.log(`  ${r.id.padEnd(16)} ${bits.join('  //  ')}`);
}
if (!bad.length) console.log(`clean: every widget's text is ${min} units or more and inside the safe area`);

if (shots) {
  const shoot = all ? report : bad;
  for (const r of shoot) {
    await page.evaluate(async ({ id }) => {
      const m = await import('/engine/core/explorables.js');
      const w = m.WIDGETS[id];
      const sl = w.dynamicSliders ? w.dynamicSliders(w.params || {}) : w.sliders;
      const v = Object.fromEntries(sl.map((s) => [s[0], s[5]]));
      const res = w.draw(v, w.params || {});
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 600 300');
      svg.setAttribute('width', '390'); svg.setAttribute('height', '195'); svg.setAttribute('id', 'shot');
      for (const k of res.kids) svg.append(k);
      document.body.innerHTML = ''; document.body.style.margin = '0'; document.body.append(svg);
    }, { id: r.id });
    await page.locator('#shot').screenshot({ path: `${shots}/${r.id}.png` });
  }
  console.log(`shots: ${shoot.length} cards in ${shots} (390 wide, first slider position)`);
}

await browser.close();
process.exit(bad.length ? 1 : 0);
