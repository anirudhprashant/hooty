#!/usr/bin/env node
/**
 * Large-format check: a few key scenes at big size, so fine detail survives
 * downsampling and the critique is actually about the art.
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
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

const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const files = want.length ? want : readdirSync(MEDIA).filter((f) => f.endsWith('.svg')).sort();

mkdirSync(OUT, { recursive: true });
const html = ["<html><body style='margin:0;background:#2a2a35;font-family:sans-serif'>"];
for (const f of files) {
  const isComic = f.startsWith('comic-');
  html.push(
    `<div style='padding:10px'><div style='color:#fff;font-size:14px;padding:4px 0'>${f}</div>` +
      `<img src='${MEDIA}/${f}' style='width:${isComic ? 1300 : 760}px;display:block;border-radius:10px'></div>`
  );
}
html.push("</body></html>");

const hp = join(OUT, 'big.html');
writeFileSync(hp, html.join('\n'));
const png = join(OUT, 'big.png');

const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
await page.goto(`file://${hp}`);
await page.waitForTimeout(700);
await page.screenshot({ path: png, fullPage: true });
await browser.close();
console.log(png);
