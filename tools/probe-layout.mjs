#!/usr/bin/env node
// Ad-hoc layout probe. Prints bounding boxes and the element sitting on top
// of a given selector's centre, so overlap bugs are facts rather than guesses.

import { chromium, devices } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';

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

const URL = process.argv[2] || 'http://127.0.0.1:8111';
const browser = await chromium.launch({ executablePath: findChrome() });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['iPhone 13'].userAgent,
});
const page = await ctx.newPage();

const missing = [];
page.on('response', (r) => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const report = await page.evaluate(() => {
  const out = { boxes: [], overlaps: [], hero: null };

  const hero = document.querySelector('.hero__mascot');
  if (hero) {
    const r = hero.getBoundingClientRect();
    const cs = getComputedStyle(hero);
    out.hero = {
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      natural: { w: hero.naturalWidth, h: hero.naturalHeight },
      position: cs.position, objectFit: cs.objectFit,
      viewport: { w: innerWidth, h: innerHeight },
    };
  }

  const names = ['.hero', '.hero__mascot', '.hero__title', '.big-cta', '.pick-grid', '.pick-card', '.app', '.topbar'];
  for (const sel of names) {
    for (const node of document.querySelectorAll(sel)) {
      const r = node.getBoundingClientRect();
      out.boxes.push({
        sel,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        text: (node.textContent || '').trim().slice(0, 40),
      });
    }
  }

  // what covers the centre of each pick-card / cta?
  for (const sel of ['.big-cta', '.pick-card']) {
    for (const node of document.querySelectorAll(sel)) {
      const r = node.getBoundingClientRect();
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const top = document.elementFromPoint(cx, cy);
      out.overlaps.push({
        sel,
        text: (node.textContent || '').trim().slice(0, 40),
        topElement: top ? `${top.tagName}.${top.className}`.slice(0, 80) : null,
        isSelf: top === node || node.contains(top),
      });
    }
  }
  return out;
});

console.log(JSON.stringify(report, null, 2));
console.log('--- 4xx/5xx ---');
console.log(missing.length ? missing.join('\n') : 'none');
await browser.close();
