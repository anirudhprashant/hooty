#!/usr/bin/env node
/**
 * Bounds check: render every generated SVG and report any drawn content that
 * falls outside the viewBox. Clipped art is invisible to a thumbnail review,
 * so it gets checked mechanically instead.
 */
import { chromium } from 'playwright';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MEDIA = resolve(HERE, '..', 'public', 'content', 'packs', 'class6-sst', 'media');

function findChrome() {
  const root = `${process.env.HOME}/.cache/ms-playwright`;
  if (!existsSync(root)) return undefined;
  const dirs = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    const bin = `${root}/${d}/chrome-linux/chrome`;
    if (existsSync(bin)) return bin;
  }
  return undefined;
}

const files = existsSync(MEDIA) ? readdirSync(MEDIA).filter((f) => f.endsWith('.svg')).sort() : [];
if (!files.length) console.log('note: no SVG media in', MEDIA, '(art pending)');
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
const page = await browser.newPage();

let bad = 0;
for (const f of files) {
  const svg = readFileSync(join(MEDIA, f), 'utf8');
  // Inline the SVG into the live DOM so getBBox reflects real layout.
  await page.setContent(`<body style="margin:0">${svg}</body>`);
  await page.waitForTimeout(120);
  const info = await page.evaluate(() => {
    const root = document.querySelector('svg');
    const vb = root.viewBox.baseVal;
    const W = vb.width || 512;
    const H = vb.height || 320;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const culprits = [];
    // getBBox() ignores an element's own transform, so it reports local
    // coordinates and gives false clipping reports. Client rects reflect the
    // real painted position, so use those instead.
    const frame = root.getBoundingClientRect();
    const groups = [...root.querySelectorAll('g')];
    for (const g of groups) {
      const r = g.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Ignore the root-level group that wraps the whole drawing.
      if (g.parentElement === root && r.width >= frame.width * 0.98 && r.height >= frame.height * 0.98) continue;
      const x = r.left - frame.left;
      const y = r.top - frame.top;
      const w = r.width;
      const h = r.height;
      // Skip groups that are pure decorative frames drawn edge to edge.
      if (x <= -1 && y <= -1 && x + w >= frame.width - 1 && y + h >= frame.height - 1) continue;
      const tag = (g.getAttribute('transform') || 'no-transform').slice(0, 60);
      const over = [];
      if (x < -1) over.push(`left ${x.toFixed(0)}`);
      if (y < -1) over.push(`top ${y.toFixed(0)}`);
      if (x + w > frame.width + 1) over.push(`right +${(x + w - frame.width).toFixed(0)}`);
      if (y + h > frame.height + 1) over.push(`bottom +${(y + h - frame.height).toFixed(0)}`);
      if (over.length) culprits.push(`${over.join(', ')} [${tag}]`);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
    return { W: frame.width, H: frame.height, minX, minY, maxX, maxY, culprits };
  });
  const over = [];
  if (info.minX < -1) over.push(`left ${info.minX.toFixed(0)}`);
  if (info.minY < -1) over.push(`top ${info.minY.toFixed(0)}`);
  if (info.maxX > info.W + 1) over.push(`right +${(info.maxX - info.W).toFixed(0)}`);
  if (info.maxY > info.H + 1) over.push(`bottom +${(info.maxY - info.H).toFixed(0)}`);
  if (over.length) {
    bad++;
    console.log(`CLIPPED  ${f}: ${over.join(', ')}`);
    for (const c of info.culprits.slice(0, 6)) console.log(`          ${c}`);
  }
}
await browser.close();
console.log(bad ? `\n${bad} file(s) with clipped art` : '\nno clipped art');
process.exit(bad ? 1 : 0);
