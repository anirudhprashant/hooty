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
 * Boxes are measured after every group transform, so a widget that scales its own drawing down is
 * judged where its text actually lands, and a scaled label counts at its on-card size.
 * Marks that belong to the drawing itself (the words inside the food packets, hatch grains) are
 * listed once in BY_DESIGN and printed separately; they do not count as flags.
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
        // Pin the card at 600x300 so one CSS pixel is one card unit; measure what lands on the card rather
        // than what a child element says before its group transform. A widget that scales its own group
        // down (money's dense rows do) used to report text far outside the card that is drawn inside it.
        svg.setAttribute('width', '600');
        svg.setAttribute('height', '300');
        for (const k of res.kids) svg.append(k);
        document.body.innerHTML = ''; document.body.append(svg);
        const sr = svg.getBoundingClientRect(), rootA = (svg.getScreenCTM() || { a: 1 }).a || 1;
        for (const t of svg.querySelectorAll('text')) {
          const txt = (t.textContent || '').slice(0, 18);
          if (!txt.trim()) continue;   // an empty <text> has a zero box and is not a design problem
          let scale = 1; try { scale = ((t.getScreenCTM() || { a: rootA }).a || rootA) / rootA; } catch { /* identity */ }
          const fs = (parseFloat(getComputedStyle(t).fontSize) || 0) * scale;
          if (fs && fs < min) r.small.push(`${Math.round(fs * 10) / 10}:${txt}`);
          let bb; try { bb = t.getBoundingClientRect(); } catch { continue; }
          if (!bb.width && !bb.height) continue;
          const x = bb.left - sr.left, y = bb.top - sr.top, w = bb.width, h = bb.height;
          if (x < -1 || y < -1 || x + w > 601 || y + h > 301) r.outside.push(txt);
          else if (fs && (x < 8 || 592 < x + w)) r.tight.push(`${txt}@${Math.round(x)}-${Math.round(x + w)}`);
        }
      }
    } catch (e) { r.err = e.message.slice(0, 40); }
    r.small = [...new Set(r.small)]; r.outside = [...new Set(r.outside)]; r.tight = [...new Set(r.tight)];
    out.push(r);
  }
  return out;
}, min);

// Marks that are part of the drawing, not words a child has to read: the pictogram words inside the
// junk-food packets and the hatch grains on the friction card. Anything not listed here still fails,
// so the audit can be a gate without hiding a new small label behind an old exception.
const BY_DESIGN = { plate: ['chips', 'drink'], friction: ['\\'] };
for (const r of report) {
  const keep = [];
  for (const s of r.small) {
    const txt = s.slice(s.indexOf(':') + 1);
    if ((BY_DESIGN[r.id] || []).some((a) => txt.includes(a))) (r.byDesign ||= []).push(s);
    else keep.push(s);
  }
  r.small = keep;
}

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
const designed = report.filter((r) => r.byDesign && r.byDesign.length);
if (designed.length) console.log(`by design (drawing marks, not labels): ${designed.map((r) => `${r.id} ${r.byDesign.join(' ')}`).join(' | ')}`);
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
