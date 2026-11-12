#!/usr/bin/env node
/**
 * Full-lesson walk: play a lesson from the first activity to the celebration,
 * handling every activity type the engine ships. Reports dead ends, failed
 * requests and console errors along the way.
 *
 *   node tools/play-lesson.mjs [url]
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { answerFor, loadAnswers } from './qa-answers.mjs';

const URL = process.argv[2] || 'http://127.0.0.1:8111/sparkle/';
const OUT = '/tmp/sparkle-shots';
const answers = loadAnswers();

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
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
const VW = Number(process.env.VW || 1280), VH = Number(process.env.VH || 900);
const SHOTS = process.env.SHOTS || '';
const ctx = await browser.newContext({ viewport: { width: VW, height: VH } });
const page = await ctx.newPage();

const problems = [];
page.on('response', (r) => {
  if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`);
});
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// Enter the first lesson.
await page.evaluate(() => {
  const cta = document.querySelector('.big-cta');
  if (cta) cta.click();
});
await page.waitForTimeout(900);

if (!(await page.locator('.lesson').count())) {
  console.log('FAIL: did not enter a lesson');
  await browser.close();
  process.exit(1);
}

// The topic illustration must be on screen and actually loaded.
const scene = await page.evaluate(() => {
  const img = document.querySelector('.lesson__scene-img');
  if (!img) return { present: false };
  return {
    present: true,
    src: img.getAttribute('src'),
    loaded: img.complete && img.naturalWidth > 0,
    w: img.naturalWidth,
    h: img.naturalHeight,
  };
});
console.log('topic scene:', JSON.stringify(scene));
if (!scene.present) console.log('note: this lesson declares no topic scene (art pending)');
if (scene.present && !scene.loaded) problems.push(`topic scene failed to load: ${scene.src}`);

const seen = [];
const activityIds = new Map();
let steps = 0;
let lastActivity = '';

for (; steps < 60; steps++) {
  const state = await page.evaluate(() => {
    const act = document.querySelector('.activity');
    if (!act) return { kind: null };
    const cls = [...act.classList].find((c) => c.startsWith('activity--')) || 'activity';
    return {
      kind: cls.replace('activity--', ''),
      id: act.getAttribute('data-activity-id') || '',
      prompt: (act.querySelector('.activity__prompt')?.textContent || '').slice(0, 60),
    };
  });
  if (!state.kind) break;
  if (SHOTS && state.kind !== lastActivity) await page.screenshot({ path: `${SHOTS}-${steps}-${state.kind}.png` });
  if (SHOTS && (await page.locator('.sheet').count()) && !globalThis.__sheetShot?.has(state.kind)) {
    (globalThis.__sheetShot ||= new Set()).add(state.kind);
    await page.screenshot({ path: `${SHOTS}-${steps}-${state.kind}-sheet.png` });
  }
  if (state.kind !== lastActivity) {
    seen.push(state.kind);
    lastActivity = state.kind;
    console.log(`  step ${steps}: ${state.kind} - ${state.prompt}`);
  }

  // The same activity rendering three times in a row means the walker is
  // stuck in a loop rather than progressing.
  const marker = `${state.kind}|${state.id}|${state.prompt}`;
  activityIds.set(marker, (activityIds.get(marker) || 0) + 1);
  if (activityIds.get(marker) >= 3) {
    problems.push(`stuck on activity (repeated ${activityIds.get(marker)}x): ${state.kind} - ${state.prompt}`);
    break;
  }

  // --- answer whatever is on screen -------------------------------
  // 1. text input (fill blank / type answer)
  const input = page.locator('.text-input:visible:not([disabled])').first();
  if (await input.count()) {
    // Type the answer the pack expects (tools/qa-answers.mjs), not a fixed word, so a
    // fill-in-the-blank is passed and the walk reaches the celebration.
    const prompt = (await page.locator('.activity__prompt').first().textContent().catch(() => '')) || '';
    const answer = answerFor(answers, prompt);
    if (answer != null) await input.fill(answer).catch(() => {});
    else if (state.kind !== 'explain') problems.push(`no answer on file for text input: ${prompt.trim().slice(0, 80)}`);
  }

  // 2a. match pairs: pick a left-column item, then try the right-hand items
  //     one at a time until the correct partner is found. The right column is
  //     shuffled, so the partner cannot be assumed to be the first one.
  const leftSel = '.match-col:first-child .match-item:not(.match-item--matched)';
  const rightSel = '.match-col:last-child .match-item:not(.match-item--matched)';
  if (await page.locator(leftSel).count()) {
    for (let pair = 0; pair < 10; pair++) {
      const l = page.locator(leftSel).first();
      if (!(await l.count())) break;
      await l.click().catch(() => {});
      await page.waitForTimeout(200);

      const before = await page.locator('.match-item--matched').count();
      const rCount = await page.locator(rightSel).count();
      let paired = false;
      for (let j = 0; j < rCount; j++) {
        // Click by index: a wrong click only flashes, it does not remove the
        // item, so ".first()" would click the same wrong item forever.
        const r = page.locator(rightSel).nth(j);
        if (!(await r.count())) break;
        await r.click().catch(() => {});
        await page.waitForTimeout(320);
        const after = await page.locator('.match-item--matched').count();
        if (after > before) { paired = true; break; }
        // The left item stays selected after a wrong click. Do not re-click
        // it: the handler toggles the selection off on a second click.
      }
      if (!paired) break;
    }
  }

  // 2b. drag-label: pick a chip, then click its target on the picture.
  const chip = page.locator('.label-chip:not(.label-chip--placed)').first();
  if (await chip.count()) {
    await chip.click().catch(() => {});
    await page.waitForTimeout(200);
    const target = page.locator('.label-target:not(.is-placed)').first();
    if (await target.count()) {
      await target.click().catch(() => {});
      await page.waitForTimeout(250);
    }
  }

  // 3. multiple choice / true-false / listen / watch
  const choice = page.locator('.option:not([disabled]), .tf-btn:not([disabled])').first();
  if (await choice.count()) {
    await choice.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  // 4. ordering: place EVERY pool chip, otherwise the Check button stays
  //    disabled and the activity looks like a dead end.
  for (let k = 0; k < 12; k++) {
    const pool = page.locator('.order-pool .order-chip').first();
    if (!(await pool.count())) break;
    await pool.click().catch(() => {});
    await page.waitForTimeout(180);
  }

  // 5. submit / continue. Text activities put their Check button in
  //    .input-row, not .activity__actions.
  // Prefer an enabled button. After a graded answer the "Check" button in
  // .input-row is disabled and the Continue button in .activity__actions is
  // the live one, so :not([disabled]) keeps us on the right control.
  const submit = page
    .locator('.activity__actions .btn--primary:not([disabled]), .input-row .btn--primary:not([disabled])')
    .first();
  // A concept card is a conversation: tap Next through Hooty's lines until the button reads "Got it".
  for (let n = 0; n < 12 && state.kind === 'concept'; n++) {
    const b = page.locator('.activity--concept .btn--primary').first();
    if (!(await b.count()) || !/^\s*next\s*$/i.test((await b.textContent().catch(() => '')) || '')) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(250);
  }
  if (await submit.count()) {
    const label = (await submit.textContent().catch(() => '')) || '';
    await submit.click().catch(() => {});
    await page.waitForTimeout(600);
    if (/celebrat|quest complete|well done/i.test(label)) break;
  } else {
    // no submit button: the activity should have auto-submitted
    await page.waitForTimeout(700);
    const stuck = await page.evaluate(
      () => document.querySelectorAll('.activity').length > 0
    );
    if (stuck) {
      const again = await page.locator(
        '.activity__actions .btn--primary:not([disabled]), .input-row .btn--primary:not([disabled])'
      ).count();
      if (!again) {
        problems.push(`dead end on activity: ${state.kind} - ${state.prompt}`);
        break;
      }
    }
  }

  if (await page.locator('.celebrate').count()) break;
}

if (SHOTS) { await page.waitForTimeout(900); await page.screenshot({ path: `${SHOTS}-celebrate.png` }); }
// Did the lesson finish?
const celebrated = await page.locator('.celebrate').count();
console.log(`\nsteps=${steps} celebrated=${celebrated} activityTypes=[${seen.join(', ')}]`);

// The comic recap must be revealed at the end.
await page.waitForTimeout(600);
const comic = await page.evaluate(() => {
  const fig = document.querySelector('.lesson__comic');
  if (!fig) return { present: false };
  const img = fig.querySelector('img');
  return {
    present: true,
    hidden: fig.hidden,
    src: img?.getAttribute('src'),
    loaded: !!img && img.complete && img.naturalWidth > 0,
    w: img?.naturalWidth,
    h: img?.naturalHeight,
  };
});
console.log('comic recap:', JSON.stringify(comic));
if (!comic.present) console.log('note: this lesson declares no comic recap (art pending)');
if (comic.present && comic.hidden) problems.push('comic recap stayed hidden after the lesson');
if (comic.present && !comic.loaded) problems.push(`comic recap failed to load: ${comic.src}`);

await page.screenshot({ path: join(OUT, 'lesson-complete.png'), fullPage: true });

if (!celebrated) problems.push(`lesson did not reach the celebration (${steps} steps)`);

await browser.close();
if (problems.length) {
  console.log('\nPROBLEMS:');
  for (const p of [...new Set(problems)]) console.log('  x', p);
  process.exit(1);
}
console.log('\nlesson played through cleanly');
