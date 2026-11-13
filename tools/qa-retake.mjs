#!/usr/bin/env node
/**
 * The retake walk: miss a question twice on purpose, and check the app
 *   1. offers the line that taught it (the re-teach), not the whole lesson,
 *   2. then asks a different question about the same idea, under the same activity id,
 *   3. credits the idea, not the wording: a right answer on the new question puts the missed card in tomorrow's box.
 *
 *   node tools/qa-retake.mjs [url]
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { loadQuestions, questionKey } from './qa-answers.mjs';

const URL = process.argv[2] || 'http://127.0.0.1:8123/';
const OUT = '/tmp/hooty-retake';
const Q = loadQuestions();
mkdirSync(OUT, { recursive: true });

const problems = [];
const notes = [];
const fail = (m) => problems.push(m);

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

const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
page.on('response', (r) => {
  if (r.status() < 400) return;
  if (/\/js\/pp\.js$/.test(r.url())) { notes.push('pp.js is deployed separately from the repo, missing here'); return; }
  problems.push(`HTTP ${r.status()} ${r.url()}`);
});
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

const wait = (ms = 450) => page.waitForTimeout(ms);

async function current() {
  return page.evaluate(() => {
    const a = document.querySelector('.activity');
    if (!a) return null;
    const c = [...a.classList].find((x) => x.startsWith('activity--'));
    return {
      type: c ? c.replace('activity--', '') : '',
      id: a.getAttribute('data-activity-id') || '',
      prompt: (a.querySelector('.activity__prompt')?.textContent || '').trim(),
      sheet: document.querySelector('.sheet')?.className || '',
      remember: (document.querySelector('.remember')?.innerText || '').trim(),
      buttons: [...document.querySelectorAll('.sheet .btn')].map((b) => (b.textContent || '').trim()),
    };
  });
}

async function primary() {
  const b = page.locator('.sheet .btn--primary, .activity__actions .btn--primary:not([disabled]), .input-row .btn--primary:not([disabled])').first();
  if (!(await b.count())) return null;
  const label = ((await b.textContent().catch(() => '')) || '').trim();
  await b.click().catch(() => {});
  await wait(400);
  return label;
}

async function tapThroughConcept() {
  for (let i = 0; i < 14; i++) {
    const b = page.locator('.activity--concept .btn--primary').first();
    if (!(await b.count())) return;
    const label = ((await b.textContent().catch(() => '')) || '').trim();
    if (!/^next$/i.test(label)) return;
    await b.click().catch(() => {});
    await wait(180);
  }
}

async function answerCorrect(k) {
  const info = Q.get(questionKey(k.prompt));
  if (!info) return `no answer on file for: ${k.prompt.slice(0, 70)}`;
  if (info.type === 'mcq') {
    await page.locator(`.option[data-choice="${info.answer}"]`).first().click().catch(() => {});
  } else if (info.type === 'truefalse') {
    await page.locator('.tf-btn').nth(info.answer ? 0 : 1).click().catch(() => {});
  } else if (info.type === 'fillblank' || info.type === 'typeanswer') {
    await page.locator('.text-input').first().fill(String(info.answers[0])).catch(() => {});
    await page.locator('.input-row .btn--primary').first().click().catch(() => {});
  } else {
    return `unsupported type ${info.type}`;
  }
  await wait(600);
  return null;
}

// ---------------------------------------------------------------- enter a lesson
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => document.querySelector('.big-cta')?.click());
await wait(900);
if (!(await page.locator('.lesson').count())) {
  console.log('FAIL: did not enter a lesson');
  await browser.close();
  process.exit(1);
}

// ------------------------------------------------- walk to the first mcq we can answer
let target = null;
for (let step = 0; step < 30 && !target; step++) {
  const k = await current();
  if (!k) break;
  if (k.sheet) { await primary(); continue; }
  if (k.type === 'mcq' && Q.has(questionKey(k.prompt))) { target = k; break; }
  if (k.type === 'concept') { await tapThroughConcept(); await primary(); continue; }
  if (['hook', 'passage', 'media', 'worked', 'funfact', 'explore', 'explain', 'flashcard'].includes(k.type)) {
    if (!(await primary())) break;
    continue;
  }
  // another graded type before the mcq: pass it correctly and carry on
  const why = await answerCorrect(k);
  if (why) { notes.push(`passed ${k.type} blindly: ${why}`); await primary(); }
}
if (!target) {
  console.log('FAIL: never reached an answerable multiple-choice question');
  await browser.close();
  process.exit(1);
}

const info = Q.get(questionKey(target.prompt));
const wrong = (info.answer + 1) % info.options.length;
console.log(`question: ${target.prompt.slice(0, 80)}`);
console.log(`  id=${target.id} answer=${info.answer} deliberately picking ${wrong}`);

// ---------------------------------------------------------------- first miss
await page.locator(`.option[data-choice="${wrong}"]`).first().click();
await wait(700);
let k = await current();
if (!/sheet--hint/.test(k.sheet)) fail(`first miss did not offer a hint (sheet="${k.sheet}")`);

// ---------------------------------------------------------------- second miss
await primary();                    // "Try again"
k = await current();
if (k.prompt !== target.prompt) fail('the hint retry showed a different question instead of the same one');
await page.locator(`.option[data-choice="${wrong}"]`).first().click();
await wait(700);
k = await current();
const different = k.buttons.find((b) => /different question/i.test(b));
if (!k.remember) fail('the second miss showed no re-teach (no .remember block)');
else console.log(`re-teach shown: ${k.remember.replace(/\s+/g, ' ').slice(0, 140)}`);
if (!different) fail(`the second miss did not offer a different question (buttons: ${JSON.stringify(k.buttons)})`);
if (k.buttons.some((b) => /^next$/i.test(b)) && different) fail('the second miss still offered plain Next as well');

await page.screenshot({ path: `${OUT}/retake-sheet.png`, fullPage: true });

// ---------------------------------------------------------------- the different question
if (different) {
  await primary();                  // "Try a different question"
  k = await current();
  if (k.prompt === target.prompt) fail('the different question was the same question again');
  if (k.id !== target.id) fail(`the different question lost the idea's id (${k.id} vs ${target.id})`);
  if (k.remember) fail('the re-teach sheet stayed on screen after starting the new question');
  console.log(`different question (${k.type}): ${k.prompt.slice(0, 90)}`);
  await page.screenshot({ path: `${OUT}/different-question.png`, fullPage: true });

  const why = await answerCorrect(k);
  if (why) {
    notes.push(`could not answer the different question: ${why}`);
  } else {
    const after = await current();
    if (!/sheet--correct/.test(after.sheet)) fail(`answering the different question right showed "${after.sheet}"`);
  }
}

// ---------------------------------------------------------------- was the idea credited?
await wait(800);
const saved = await page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('sparkle-state-v1') || 'null'); } catch { return null; }
});
if (!saved) {
  notes.push('no localStorage save to read (IndexedDB only)');
} else {
  const l = saved.learners?.[saved.activeLearnerId];
  const card = Object.values(l?.cards || {}).find((c) => String(c.id).endsWith(`::${target.id}`));
  if (!card) fail(`no review card was written for ${target.id}`);
  else {
    console.log(`card ${card.id}: box=${card.box} lapses=${card.lapses} due=+${Math.round((card.due - Date.now()) / 3600000)}h`);
    if (!(card.lapses >= 1)) fail('the first miss was not counted as a lapse');
    if (notes.some((n) => n.startsWith('could not answer'))) notes.push('recovery not checked (different question unanswered)');
    else if (!(card.box >= 1)) fail(`a right answer on the different question did not recover the card (box=${card.box})`);
  }
  if (!(l?.retakes?.n >= 1)) fail('the retake counter did not record the retake');
  else console.log(`retakes: shown=${l.retakes.n} fixed=${l.retakes.fixed}`);
}

await browser.close();
if (problems.length) {
  console.log('\nPROBLEMS:');
  for (const p of [...new Set(problems)]) console.log('  x', p);
  for (const n of notes) console.log('  note:', n);
  process.exit(1);
}
for (const n of notes) console.log('note:', n);
console.log('\nretake flow is good');
