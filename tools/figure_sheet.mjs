#!/usr/bin/env node
/**
 * Figure sheet: render the human/character elements large on their own, so
 * arms, poses and faces can be judged properly instead of guessed at from a
 * thumbnail where they are a few pixels tall.
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
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

// Pull the element functions straight out of the Python module and render
// each one on its own, with a ground line and a 100px grid ruler.
const py = `
import sys, json
sys.path.insert(0, "tools")
import svg_scenes as S
names = ["worshipper", "warrior", "court-king", "pillar", "stupa", "elephant", "battle", "gift", "market", "hut", "torana", "offerings"]
out = {}
for n in names:
    if n in S.ELEMENTS:
        out[n] = S.ELEMENTS[n]()
print(json.dumps(out))
`;
writeFileSync('/tmp/svgcheck/_figs.py', py);
// execFile with an argument array: no shell, so nothing is interpolated into
// a command string.
const figs = JSON.parse(
  execFileSync('/usr/bin/python3', ['/tmp/svgcheck/_figs.py'], {
    cwd: resolve(HERE, '..'),
    maxBuffer: 8e6,
  }).toString()
);

const items = Object.entries(figs);
const html = [
  "<html><body style='margin:0;background:#f2efe6;font-family:sans-serif'>",
  "<div style='display:flex;flex-wrap:wrap;gap:6px;padding:8px'>",
];
for (const [name, svg] of items) {
  const inner = svg.replace(/<g /, '<g transform="translate(140 300) scale(1.6)" ');
  html.push(
    `<div style='width:300px;background:#fff;border:2px solid #ccc;border-radius:8px;padding:4px'>` +
      `<div style='font:13px sans-serif;color:#333;padding:2px'>${name}</div>` +
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 280 320' width='280' height='320'>` +
      `<rect width='280' height='320' fill='#ffffff'/>` +
      `<path d='M 0 300 L 280 300' stroke='#bbb' stroke-width='2'/>` +
      `<path d='M 140 0 L 140 320' stroke='#f0d0d0' stroke-width='1'/>` +
      inner +
      `</svg></div>`
  );
}
html.push("</div></body></html>");

mkdirSync(OUT, { recursive: true });
const hp = join(OUT, 'figs.html');
writeFileSync(hp, html.join('\n'));
const png = join(OUT, 'figs.png');

const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 1200 } });
await page.goto(`file://${hp}`);
await page.waitForTimeout(500);
await page.screenshot({ path: png, fullPage: true });
await browser.close();
console.log(png);
