#!/usr/bin/env node
/**
 * Screenshot QA for Sparkle.
 *
 * Drives the real app in a real browser at phone and tablet widths, walks the
 * screens a child actually touches, and writes PNGs to shots/. This is the
 * only way to know the layout is right: the CSS lies otherwise.
 *
 * Usage:
 *   node tools/shoot.mjs --url http://127.0.0.1:8111 --out shots
 */

import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync, readdirSync } from 'node:fs';

// The npm playwright version wants a browser build that is not downloaded here,
// but other builds are. Point at whichever full chromium is on disk.
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
const CHROME_BIN = findChrome();

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) => (a.startsWith('--') ? [[a.slice(2), arr[i + 1]]] : [])),
);

const URL = args.url || 'http://127.0.0.1:8111';
const OUT = args.out || 'shots';

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, dsf: 2, mobile: true },
  { name: 'tablet', width: 820, height: 1180, dsf: 2, mobile: true },
];

const problems = [];

async function shoot(page, name) {
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path });
  console.log('shot', path);
  return path;
}

async function run(vp) {
  const browser = await chromium.launch({ executablePath: CHROME_BIN });
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    userAgent: vp.mobile ? devices['iPhone 13'].userAgent : undefined,
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  // home
  await shoot(page, `${vp.name}-01-home`);

  // the boot spinner must be gone
  const booting = await page.locator('.boot').count();
  if (booting) problems.push(`${vp.name}: boot spinner still on screen`);

  const empty = await page.locator('.empty').first().textContent().catch(() => null);
  if (empty && /wrong|error/i.test(empty)) problems.push(`${vp.name}: app shows "${empty}"`);

  // packs
  const packs = page.locator('.pick-card');
  if (await packs.count() === 0) {
    problems.push(`${vp.name}: home has no cards, content did not load`);
  }

  // open the first pack -> path
  await page.getByText('Trail', { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  await shoot(page, `${vp.name}-02-path`);

  const nodes = page.locator('.node');
  const nodeCount = await nodes.count();
  if (nodeCount === 0) problems.push(`${vp.name}: trail has no lesson nodes`);

  // open the first lesson -> player
  if (nodeCount > 0) {
    await nodes.first().click();
    await page.waitForTimeout(900);
    await shoot(page, `${vp.name}-03-lesson`);

    // answer the first activity so the feedback card shows
    const option = page.locator('.option, .tf-btn, .order-chip, .label-chip').first();
    if (await option.count()) {
      await option.click();
      await page.waitForTimeout(700);
      await shoot(page, `${vp.name}-04-feedback`);
    } else {
      // A concept card or flashcard has no choice to make, but it must still
      // offer a way forward. That is a valid first activity.
      const forward = page.locator('.activity__actions .btn--primary').first();
      if (await forward.count()) {
        await forward.click();
        await page.waitForTimeout(700);
        await shoot(page, `${vp.name}-04-feedback`);
      } else {
        problems.push(`${vp.name}: no answerable control found in the first activity`);
      }
    }

    // Walk the whole lesson. Every activity must offer a way forward, or a
    // child gets stuck with no way to continue.
    const deadline = Date.now() + 45000;
    let steps = 0;
    while (Date.now() < deadline && steps < 40) {
      steps += 1;
      const advance = page.locator(
        '.activity__actions .btn--primary, .feedback ~ .activity__actions .btn--primary',
      ).last();
      if (!(await advance.count())) break;
      const label = (await advance.textContent().catch(() => '')) || '';
      if (/celebrat|quest complete|well done/i.test(label)) break;
      await advance.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(450);

      // If a choice is on screen, answer it so we can keep walking.
      const choice = page.locator('.option:not([disabled]), .tf-btn:not([disabled])').first();
      if (await choice.count()) {
        await choice.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
      const done = await page.locator('.celebrate').count();
      if (done) { await shoot(page, `${vp.name}-07-celebration`); break; }
    }
    if (steps >= 40) problems.push(`${vp.name}: lesson did not finish in 40 steps, something is blocking progress`);
    if (steps < 3) problems.push(`${vp.name}: lesson advanced only ${steps} steps, activities may be dead ends`);
  }

  // parent view
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const grown = page.getByText('Grown-ups', { exact: false }).first();
  if (await grown.count()) {
    await grown.click();
    await page.waitForTimeout(600);
    await shoot(page, `${vp.name}-05-parent`);
  }

  // theme picker
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const themeBtn = page.getByText('Change your world', { exact: false }).first();
  if (await themeBtn.count()) {
    await themeBtn.click();
    await page.waitForTimeout(600);
    await shoot(page, `${vp.name}-06-themes`);
  }

  // horizontal overflow check: nothing should push the page sideways
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const overflow = await page.evaluate(() => {
    const d = document.documentElement;
    return { scroll: d.scrollWidth, client: d.clientWidth };
  });
  if (overflow.scroll > overflow.client + 2) {
    problems.push(`${vp.name}: horizontal overflow, scrollWidth ${overflow.scroll} > clientWidth ${overflow.client}`);
  }

  if (consoleErrors.length) {
    for (const e of consoleErrors.slice(0, 8)) problems.push(`${vp.name}: console error - ${e}`);
  }

  await browser.close();
}

mkdirSync(OUT, { recursive: true });
for (const vp of VIEWPORTS) {
  console.log(`--- ${vp.name} ${vp.width}x${vp.height} ---`);
  try {
    await run(vp);
  } catch (e) {
    problems.push(`${vp.name}: run failed - ${e.message}`);
  }
}

if (problems.length) {
  console.log('\nPROBLEMS:');
  for (const p of problems) console.log('  x ' + p);
  process.exit(1);
}
console.log('\nno problems found');
