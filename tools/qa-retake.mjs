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
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  // A failed fetch is already reported above with its URL, which is the useful part.
  if (/Failed to load resource/i.test(m.text())) return;
  problems.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

const wait = (ms = 450) => page.waitForTimeout(ms);

// PACK=english-g2 GRADE=2 runs the walk in another book, so the flow is proved in a second language and a different
// shape of content, not only in the first book a new child gets.
if (process.env.PACK) {
  await page.addInitScript(([packId, grade]) => {
    localStorage.setItem('sparkle-state-v1', JSON.stringify({
      learners: { 'qa-learner': { name: 'QA', grade, packId } },
      activeLearnerId: 'qa-learner',
      savedAt: Date.now(),
    }));
  }, [process.env.PACK, process.env.GRADE || '6']);
}

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
  // Matching boards and ordering strips submit themselves once complete; passActivity knows how to drive them.
  if (k.type === 'match' || k.type === 'matchpairs' || k.type === 'dragorder') return passActivity(k);
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

// Answer a question the wrong way on purpose, in the form its activity checks.
async function answerWrong(k) {
  const info = Q.get(questionKey(k.prompt));
  if (!info) return `no answer on file for: ${k.prompt.slice(0, 70)}`;
  if (info.type === 'mcq') {
    const idx = (info.answer + 1) % info.options.length;
    await page.locator(`.option[data-choice="${idx}"]`).first().click().catch(() => {});
  } else if (info.type === 'truefalse') {
    await page.locator('.tf-btn').nth(info.answer ? 1 : 0).click().catch(() => {});
  } else if (info.type === 'fillblank' || info.type === 'typeanswer') {
    await page.locator('.text-input').first().fill('zzzz').catch(() => {});
    await page.locator('.input-row .btn--primary').first().click().catch(() => {});
  } else {
    return `unsupported type ${info.type}`;
  }
  await wait(600);
  return null;
}

// Get past a question the walker has no tidy answer for: matching boards and ordering strips complete themselves.
async function passActivity(k) {
  if (k.type === 'matchpairs' || k.type === 'match') {
    const left = '.match-col:first-child .match-item:not(.match-item--matched)';
    const right = '.match-col:last-child .match-item:not(.match-item--matched)';
    for (let pair = 0; pair < 10; pair++) {
      const l = page.locator(left).first();
      if (!(await l.count())) break;
      await l.click().catch(() => {});
      await wait(200);
      const before = await page.locator('.match-item--matched').count();
      let paired = false;
      const n = await page.locator(right).count();
      for (let j = 0; j < n; j++) {
        await page.locator(right).nth(j).click().catch(() => {});
        await wait(280);
        if ((await page.locator('.match-item--matched').count()) > before) { paired = true; break; }
      }
      if (!paired) break;
    }
    await wait(600);
    return null;
  }
  if (k.type === 'dragorder') {
    for (let i = 0; i < 14; i++) {
      const chip = page.locator('.order-pool .order-chip').first();
      if (!(await chip.count())) break;
      await chip.click().catch(() => {});
      await wait(150);
    }
    await wait(300);
    await primary();
    return null;
  }
  return answerCorrect(k);
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
  if (k.type === 'mcq' && !/-pre$/.test(k.id) && Q.has(questionKey(k.prompt))) { target = k; break; }
  if (k.type === 'concept') { await tapThroughConcept(); await primary(); continue; }
  if (['hook', 'passage', 'media', 'worked', 'funfact', 'explore', 'explain', 'flashcard'].includes(k.type)) {
    if (!(await primary())) break;
    continue;
  }
  // another graded type before the mcq: pass it correctly and carry on
  const why = await passActivity(k);
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
// The hint crosses out the option just picked, so the second deliberate miss has to choose another wrong one.
const again = await page.evaluate((ans) => {
  const b = [...document.querySelectorAll('.option:not([disabled])')].find((x) => Number(x.dataset.choice) !== ans);
  return b ? Number(b.dataset.choice) : null;
}, info.answer);
if (again === null) fail('no wrong option left after the hint crossed one out');
else await page.locator(`.option[data-choice="${again}"]`).first().click();
await wait(700);
k = await current();
// The offer is the sheet's primary button when the re-teach is shown: two choices, whatever the book's language.
const different = k.remember && k.buttons.length >= 2 ? k.buttons[0] : undefined;
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

// ---------------------------------------------------------------- practice asks a new question, not the old one
// A second mistake, answered wrong on its different question so the card stays a mistake, then Practise: it must serve
// a different question about the same card rather than the exact wording that was missed.
if (different && !problems.length) {
  await primary();                  // continue past the recovered question
  await wait(500);
  let second = null;
  for (let step = 0; step < 25 && !second; step++) {
    const kk = await current();
    if (!kk) break;
    if (kk.sheet) { await primary(); continue; }
    if (kk.type === 'concept') { await tapThroughConcept(); await primary(); continue; }
    if (['hook', 'passage', 'media', 'worked', 'funfact', 'explore', 'explain', 'flashcard'].includes(kk.type)) {
      if (!(await primary())) break;
      continue;
    }
    if (kk.type === 'mcq' && !/-pre$/.test(kk.id) && Q.has(questionKey(kk.prompt))) { second = kk; break; }
    const why = await passActivity(kk);
    if (why) { notes.push(`passed ${kk.type} before the second test: ${why}`); await primary(); }
  }

  if (!second) {
    notes.push('never found a second mcq to make a fresh mistake on');
  } else {
    const info2 = Q.get(questionKey(second.prompt));
    const wrong2 = (info2.answer + 1) % info2.options.length;
    await page.locator(`.option[data-choice="${wrong2}"]`).first().click();
    await wait(700);
    await primary();                // try again
    const again2 = await page.evaluate((ans) => {
      const b = [...document.querySelectorAll('.option:not([disabled])')].find((x) => Number(x.dataset.choice) !== ans);
      return b ? Number(b.dataset.choice) : null;
    }, info2.answer);
    if (again2 !== null) await page.locator(`.option[data-choice="${again2}"]`).first().click();
    await wait(700);
    await primary();                // try a different question
    const alt2 = await current();
    const answered = await answerWrong(alt2);
    if (answered) {
      notes.push(`could not answer the second different question: ${answered}`);
    } else {
      const wrongSheet = await current();
      if (!/sheet--(wrong|correct)/.test(wrongSheet.sheet)) fail('the second different question gave no feedback');
      await primary();              // next
      await wait(500);
      // out of the lesson and into Practise
      await page.locator('.lesson__bar .icon-btn').first().click().catch(() => {});
      await wait(700);
      const nav = page.locator('.nav__item').filter({ hasText: /practi[sc]e/i }).first();
      if (!(await nav.count())) fail('no practice tab in the nav');
      else { await nav.click(); await wait(700); }
      const start = page.locator('.big-cta').first();
      if (!(await start.count())) fail('the mistake did not appear in Practise');
      else { await start.click(); await wait(900); }
      const pk = await current();
      if (!pk) fail('Practise opened no question');
      else {
        if (pk.prompt === second.prompt) fail('Practise served the exact question that was missed again');
        if (pk.id !== second.id) fail(`Practise lost the card identity (${pk.id} vs ${second.id})`);
        console.log(`practice question (${pk.type}): ${pk.prompt.slice(0, 90)}`);
      }
    }
  }
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
