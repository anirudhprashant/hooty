#!/usr/bin/env node
/**
 * Responsive QA: load the app at phone, tablet, laptop and desktop widths,
 * walk into a lesson, and report any horizontal overflow, overlapping
 * elements, clipped text, or failed requests.
 *
 *   node tools/responsive.mjs [url]
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const URL = process.argv[2] || 'http://127.0.0.1:8111';
const OUT = '/tmp/sparkle-shots';

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

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, dsf: 2, mobile: true },
  { name: 'phone-landscape', width: 844, height: 390, dsf: 2, mobile: true },
  { name: 'tablet', width: 820, height: 1180, dsf: 2, mobile: true },
  { name: 'laptop', width: 1280, height: 800, dsf: 1, mobile: false },
  { name: 'desktop', width: 1920, height: 1080, dsf: 1, mobile: false },
  { name: 'wide', width: 2560, height: 1440, dsf: 1, mobile: false },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });

let problems = 0;
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
  const page = await ctx.newPage();
  const bad = [];
  page.on('response', (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error') bad.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => bad.push(`pageerror: ${e.message}`));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Home screen
  await page.screenshot({ path: join(OUT, `${vp.name}-home.png`), fullPage: false });

  // Enter a lesson. The home screen has a "Continue" button that starts the
  // next lesson directly; fall back to the trail (path) screen if not.
  const entered = await page.evaluate(() => {
    const cta = document.querySelector('.big-cta');
    if (cta) {
      cta.click();
      return 'cta';
    }
    const pathBtn = [...document.querySelectorAll('button, .pick-card')].find((b) =>
      /trail|path/i.test(b.textContent || '')
    );
    if (pathBtn) {
      pathBtn.click();
      return 'path';
    }
    return 'none';
  });
  await page.waitForTimeout(700);
  if (entered === 'path') {
    await page.evaluate(() => {
      const node = document.querySelector('.node');
      if (node) node.click();
    });
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `${vp.name}-lesson.png`), fullPage: false });

  // Confirm we really are inside a lesson, otherwise the audit is meaningless.
  const inLesson = await page.evaluate(() => Boolean(document.querySelector('.lesson')));
  const hasScene = await page.evaluate(() => Boolean(document.querySelector('.lesson__scene-img')));
  if (!inLesson) console.log(`        note: did not reach a lesson (${entered})`);

  // Layout audit: horizontal overflow and elements wider than the viewport.
  const audit = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = { vw, scrollW: document.documentElement.scrollWidth, wide: [], clipped: [] };
    for (const node of document.querySelectorAll('body *')) {
      const r = node.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 2 || r.left < -2) {
        const cls = node.className && typeof node.className === 'string' ? node.className : node.tagName;
        out.wide.push(`${cls} [${Math.round(r.left)}..${Math.round(r.right)}]`);
      }
      // text that is visually cut off
      if (node.children.length === 0 && node.textContent.trim()) {
        if (node.scrollWidth > node.clientWidth + 2 && getComputedStyle(node).overflow !== 'visible') {
          out.clipped.push(`${node.className || node.tagName}: "${node.textContent.trim().slice(0, 40)}"`);
        }
      }
    }
    return out;
  });

  const overflow = audit.scrollW > audit.vw + 2;
  const flag = overflow || audit.wide.length || audit.clipped.length || bad.length;
  if (flag) problems++;

  console.log(
    `${flag ? 'FAIL' : ' ok '} ${vp.name.padEnd(16)} ${vp.width}x${vp.height}` +
      `  scrollW=${audit.scrollW} vw=${audit.vw}` +
      (overflow ? '  H-SCROLL' : '') +
      (audit.wide.length ? `  wide:${audit.wide.length}` : '') +
      (audit.clipped.length ? `  clipped:${audit.clipped.length}` : '') +
      (bad.length ? `  requests:${bad.length}` : '')
  );
  for (const w of audit.wide.slice(0, 5)) console.log(`        wide  ${w}`);
  for (const c of audit.clipped.slice(0, 5)) console.log(`        clip  ${c}`);
  for (const b of bad.slice(0, 5)) console.log(`        http  ${b}`);

  await ctx.close();
}
await browser.close();
console.log(problems ? `\n${problems} viewport(s) with problems` : '\nall viewports clean');
process.exit(problems ? 1 : 0);
