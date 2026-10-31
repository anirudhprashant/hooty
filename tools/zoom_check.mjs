#!/usr/bin/env node
/**
 * Zoom check: crop a region of an SVG and render it big, so fine detail
 * (a lion's face, a folded pair of hands) is actually legible.
 *
 *   node tools/zoom_check.mjs <file.svg> <x> <y> <w> <h> [scale]
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MEDIA = resolve(HERE, '..', 'public', 'content', 'packs', 'class6-sst-term2', 'media');
const OUT = '/tmp/svgcheck';

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

const [file, x, y, w, h, scale = '3'] = process.argv.slice(2);
if (!file) {
  console.error('usage: zoom_check.mjs <file.svg> <x> <y> <w> <h> [scale]');
  process.exit(1);
}

const svg = readFileSync(join(MEDIA, file), 'utf8');
// Inline the SVG so the viewBox can be cropped by a nested viewport.
const inner = svg.replace(/<\?xml[^>]*\?>/, '').replace(/<svg([^>]*)>/, '<svg$1>');
const html = `<html><body style="margin:0;background:#222">
<div style="width:${Math.round(w * scale)}px;height:${Math.round(h * scale)}px;overflow:hidden;position:relative">
  <div style="position:absolute;left:${-x * scale}px;top:${-y * scale}px;width:${512 * scale}px;height:${320 * scale}px">
    <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="width:${512 * scale}px;height:${320 * scale}px;display:block">
  </div>
</div></body></html>`;

mkdirSync(OUT, { recursive: true });
const hp = join(OUT, 'zoom.html');
writeFileSync(hp, html);
const png = join(OUT, 'zoom.png');

const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: Math.round(w * scale), height: Math.round(h * scale) } });
await page.goto(`file://${hp}`);
await page.waitForTimeout(400);
await page.screenshot({ path: png });
await browser.close();
console.log(png, `${w}x${h} @${scale}x`);
