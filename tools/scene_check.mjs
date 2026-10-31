#!/usr/bin/env node
/**
 * Contact sheet for the scene + comic illustrations, so the art can be judged.
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

mkdirSync(OUT, { recursive: true });
const files = readdirSync(MEDIA).filter((f) => f.endsWith('.svg')).sort();
const html = ["<html><body style='margin:0;background:#3c3c48;font-family:sans-serif'>"];
html.push("<div style='display:flex;flex-wrap:wrap;gap:10px;padding:12px'>");
for (const f of files.filter((f) => f.startsWith('scene-'))) {
  html.push(
    `<div style='background:#22222c;border-radius:12px;padding:6px;width:330px'>` +
      `<img src='${MEDIA}/${f}' style='width:318px;display:block;border-radius:8px'>` +
      `<div style='color:#eee;font-size:11px;padding-top:4px;text-align:center'>${f}</div></div>`
  );
}
html.push("</div>");
html.push("<div style='padding:12px'>");
for (const f of files.filter((f) => f.startsWith('comic-'))) {
  html.push(
    `<div style='color:#eee;font-size:12px;padding:6px 0'>${f}</div>` +
      `<img src='${MEDIA}/${f}' style='width:100%;display:block;border-radius:10px;margin-bottom:16px'>`
  );
}
html.push("</div></body></html>");

const hp = join(OUT, 'scenes.html');
writeFileSync(hp, html.join('\n'));
const png = join(OUT, 'scenes.png');

const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
await page.goto(`file://${hp}`);
await page.waitForTimeout(700);
await page.screenshot({ path: png, fullPage: true });
await browser.close();
console.log(png);
