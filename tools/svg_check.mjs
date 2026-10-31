#!/usr/bin/env node
/**
 * Render a contact sheet of every generated SVG asset per theme so the art
 * can actually be looked at. Valid SVG is not the same as good art.
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', 'public', 'themes');
const OUT = '/tmp/svgcheck';

function findChrome() {
  const root = `${process.env.HOME}/.cache/ms-playwright`;
  if (!existsSync(root)) return undefined;
  const dirs = readdirSync(root)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort()
    .reverse();
  for (const d of dirs) {
    const bin = `${root}/${d}/chrome-linux/chrome`;
    if (existsSync(bin)) return bin;
  }
  return undefined;
}

const themes = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const list = themes.length ? themes : readdirSync(ROOT).filter((d) => existsSync(join(ROOT, d, 'assets')));

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });

for (const theme of list) {
  const adir = join(ROOT, theme, 'assets');
  if (!existsSync(adir)) continue;
  const files = readdirSync(adir).filter((f) => f.endsWith('.svg')).sort();
  const html = [
    "<html><body style='margin:0;background:#4a4a58;font-family:sans-serif'>",
    "<div style='display:flex;flex-wrap:wrap;gap:10px;padding:12px'>",
  ];
  for (const f of files.filter((f) => !/^(background|preview)/.test(f))) {
    html.push(
      `<div style='text-align:center;background:linear-gradient(160deg,#33333f,#1c1c26);border-radius:14px;padding:8px;width:196px'>` +
        `<img src='${adir}/${f}' style='width:180px;height:180px'>` +
        `<div style='color:#eee;font-size:11px;padding-top:4px'>${f}</div></div>`
    );
  }
  html.push('</div>');
  for (const f of files.filter((f) => /^(background|preview)/.test(f))) {
    html.push(
      `<div style='padding:12px'><div style='color:#eee;font-size:11px;padding-bottom:4px'>${f}</div>` +
        `<img src='${adir}/${f}' style='width:780px;display:block;border-radius:10px'></div>`
    );
  }
  html.push('</body></html>');

  const hp = join(OUT, `${theme}.html`);
  writeFileSync(hp, html.join('\n'));
  const png = join(OUT, `${theme}.png`);
  const page = await browser.newPage({ viewport: { width: 840, height: 1400 } });
  await page.goto(`file://${hp}`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: png, fullPage: true });
  await page.close();
  console.log(png);
}

await browser.close();
