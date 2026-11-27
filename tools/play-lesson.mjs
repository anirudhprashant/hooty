#!/usr/bin/env node
/**
 * Full-lesson walk: play a lesson from the first activity to the celebration,
 * handling every activity type the engine ships. Reports dead ends, failed
 * requests and console errors along the way.
 *
 *   node tools/play-lesson.mjs [url]
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { answerFor, loadAnswers, loadOrders, loadQuestionCandidates, questionKey } from './qa-answers.mjs';

const URL = process.argv[2] || 'http://127.0.0.1:8111/sparkle/';
const OUT = '/tmp/sparkle-shots';
const answers = loadAnswers();
const orders = loadOrders();   // prompt -> the item order the pack calls correct
const questions = loadQuestionCandidates();   // prompt -> every pack's candidate for it, in pack order

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
// SEED=/path/save.json starts the walk with that progress already on the device, which is the only way to reach the
// lesson that finishes a book without playing every lesson before it.
if (process.env.SEED || process.env.LOCALE) {
  // LOCALE=hi runs the whole player in Hindi, which is how the chrome a Hindi child sees gets checked. The app reads
  // the language from the learner, so it is written there rather than as a separate setting.
  const save = process.env.SEED
    ? JSON.parse(readFileSync(process.env.SEED, 'utf8'))
    : { learners: { me: { name: 'Learner', grade: '1', packId: 'class6-sst', xp: 0, lessonsDone: {} } }, activeLearnerId: 'me' };
  if (process.env.LOCALE) {
    const active = save.learners?.[save.activeLearnerId] || Object.values(save.learners || {})[0];
    if (active) active.lang = process.env.LOCALE;
  }
  await page.addInitScript((state) => {
    try { localStorage.setItem('sparkle-state-v1', JSON.stringify(state)); } catch { /* ignore */ }
  }, { ...save, savedAt: Date.now() });
}

const problems = [];
page.on('response', (r) => {
  if (r.status() < 400) return;
  // The first-party page-view script is deployed beside the build, not in it: a local run cannot serve it.
  if (/\/js\/pp\.js$/.test(r.url())) return;
  problems.push(`HTTP ${r.status()} ${r.url()}`);
});
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  if (/Failed to load resource/i.test(m.text())) return;   // the response handler names the URL
  problems.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => {
  // The message alone leaves you guessing which file threw: an undefined helper in one module looks the same as a
  // stale cached copy of another. Keep the first stack frame next to the message.
  const at = String(e.stack || '').split('\n').find((l) => /\bat .*\.js/.test(l));
  problems.push(`pageerror: ${e.message}${at ? ` | ${at.trim()}` : ''}`);
});

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

const TRACE = !!process.env.TRACE;
const t0 = Date.now();
const trace = (m) => { if (TRACE) console.log(`  [${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`); };

const seen = [];
const activityIds = new Map();
let steps = 0;
let lastActivity = '';

for (; steps < 60; steps++) {
  const state = await page.evaluate(() => {
    const act = document.querySelector('.activity');
    if (!act) return { kind: null };
    const cls = [...act.classList].find((c) => c.startsWith('activity--')) || 'activity';
    // A worked example or a concept card changes as the child clicks Next, without changing the prompt.
    // Counting the lines shown and the button's own label makes "the same page" mean the same page.
    const shown = act.querySelectorAll('.worked__step, .concept-talk__line, .worked__steps li').length;
    const label = (act.querySelector('.activity__actions .btn--primary, .activity__actions .btn--block')?.textContent || '').trim();
    // The words on the card are part of what makes "this page" this page: a concept card stepped through five bubbles
    // keeps the same id, prompt and button label, and used to be reported as stuck after the third.
    const words = (act.querySelector('.concept-talk__bubble, .worked__step, .activity__prompt, .passage__body')?.textContent || '').trim().slice(0, 40);
    return {
      kind: cls.replace('activity--', ''),
      id: act.getAttribute('data-activity-id') || '',
      prompt: (act.querySelector('.activity__prompt')?.textContent || '').slice(0, 60),
      progress: `${shown}|${label}|${words}`,
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
    console.log(`  step ${steps}: ${state.kind} [${state.id}] - ${state.prompt}`);
  }

  // The same activity rendering three times in a row means the walker is
  // stuck in a loop rather than progressing.
  const marker = `${state.kind}|${state.id}|${state.prompt}|${state.progress || ''}`;
  activityIds.set(marker, (activityIds.get(marker) || 0) + 1);
  if (activityIds.get(marker) >= 3) {
    problems.push(`stuck on activity (repeated ${activityIds.get(marker)}x): ${state.kind} - ${state.prompt}`);
    break;
  }

  trace(`step ${steps}: ${state.kind} ${state.progress || ''}`);
  // --- answer whatever is on screen -------------------------------
  trace('  text input');
  // 1. text input (fill blank / type answer)
  const input = page.locator('.text-input:visible:not([disabled])').first();
  if (await input.count()) {
    // Type the answer the pack expects (tools/qa-answers.mjs), not a fixed word, so a
    // fill-in-the-blank is passed and the walk reaches the celebration.
    const prompt = (await page.locator('.activity__prompt').first().textContent().catch(() => '')) || '';
    const answer = answerFor(answers, prompt);
    if (answer != null) await input.fill(answer).catch(() => {});
    // A checkpoint disables its reveal until something is written, so the walk has to write something or it
    // sits on a disabled button and reports a false stuck-lesson.
    else if (state.kind === 'explain') await input.fill('I read the page and this is my answer.').catch(() => {});
    else problems.push(`no answer on file for text input: ${prompt.trim().slice(0, 80)}`);
  }

  trace('  match pairs');
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

  trace('  drag label');
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

  trace('  choice');
  // 3. multiple choice / true-false / listen / watch. Answer the option the pack calls right, so a walk
  //    represents a child who knows, instead of tripping the re-teach on every question.
  const choicePrompt = await page.evaluate(() => document.querySelector('.activity__prompt')?.textContent || '').catch(() => '');
  // The prompt does not always identify the card: about seventy short prompts ("Which statement is correct?",
  // "Which sentence is correct?") appear in several books with a different right answer, and answering one book's
  // question with the first book's answer marked the card wrong and sent the walk round the re-teach until it
  // reported a stuck lesson. Pick the candidate whose options are the ones on screen.
  const choiceCandidates = questions.get(questionKey(choicePrompt)) || [];
  const options = page.locator('.option:not([disabled])');
  const tfs = page.locator('.tf-btn:not([disabled])');
  if (await options.count()) {
    const texts = (await options.allTextContents()).map((x) => x.trim().toLowerCase());
    const onScreen = (label) => texts.some((t) => t && (t === label || t.includes(label) || label.includes(t)));
    let best = null;
    let bestScore = 0;
    for (const cand of choiceCandidates) {
      if (cand.type !== 'mcq' || !Array.isArray(cand.options)) continue;
      const score = cand.options.filter((o) => onScreen(String(o).trim().toLowerCase())).length;
      if (score > bestScore) { best = cand; bestScore = score; }
    }
    let idx = 0;
    if (best && bestScore >= 2) {
      const want = String(best.options[best.answer] ?? '').trim().toLowerCase();
      const hit = texts.findIndex((x) => x === want);
      const near = hit >= 0 ? hit : texts.findIndex((x) => x.includes(want) && want.length > 1);
      if (near >= 0) idx = near;
    }
    await options.nth(idx).click().catch(() => {});
    await page.waitForTimeout(500);
  } else if (await tfs.count()) {
    // True/false shows the same two buttons whatever the card asks, so the only guide is the packs that use the
    // prompt; when they disagree the majority is the least-wrong guess and the card reports itself if it is wrong.
    const tf = choiceCandidates.filter((c) => c.type === 'truefalse');
    const trues = tf.filter((c) => c.answer).length;
    const idx = tf.length && trues * 2 < tf.length ? 1 : 0;
    await tfs.nth(idx).click().catch(() => {});
    await page.waitForTimeout(500);
  }

  trace('  ordering');
  // 4. ordering: place every chip in the order the pack says is right. The app shuffles the pool, so
  //    clicking it blindly builds a wrong order, the question comes back and the walk looked stuck.
  // Read it without waiting: most activities (passage, concept, worked) have no .activity__prompt, and a
  // locator read on a missing element blocks for the 30-second action timeout on every step.
  const orderPrompt = (await page.evaluate(() => document.querySelector('.activity__prompt')?.textContent || '').catch(() => '')) || '';
  const candidates = orders.get(String(orderPrompt).replace(/\s+/g, ' ').trim()) || [];
  const onScreen = await page.evaluate(() => [...document.querySelectorAll('.order-pool .order-chip')].map((b) => (b.textContent || '').trim())).catch(() => []);
  const sameSet = (a, b) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
  const wanted = candidates.find((list) => sameSet(list, onScreen)) || (candidates.length === 1 ? candidates[0] : null);
  if (TRACE) trace(`    order: ${candidates.length} candidate(s), picked=${wanted ? 'yes' : 'no'}, chips=${JSON.stringify(onScreen).slice(0, 140)}`);
  if (wanted) {
    for (const text of wanted) {
      const placed = await page.evaluate((t) => {
        const chip = [...document.querySelectorAll('.order-pool .order-chip')].find((b) => (b.textContent || '').trim() === t);
        if (!chip) return false;
        chip.click();
        return true;
      }, text);
      if (!placed) break;
      await page.waitForTimeout(160);
    }
  }
  for (let k = 0; k < 12; k++) {
    const pool = page.locator('.order-pool .order-chip').first();
    if (!(await pool.count())) break;
    await pool.click().catch(() => {});
    await page.waitForTimeout(180);
  }

  trace('  submit');
  // 5. submit / continue. Text activities put their Check button in
  //    .input-row, not .activity__actions.
  // Prefer an enabled button. After a graded answer the "Check" button in
  // .input-row is disabled and the Continue button in .activity__actions is
  // the live one, so :not([disabled]) keeps us on the right control.
  const submit = page
    .locator('.activity__actions .btn--primary:not([disabled]), .input-row .btn--primary:not([disabled])')
    .first();
  // A feedback sheet covers the activity and owns the next step ("Next", "Try a different question"). Its button
  // comes after the activity's own in the DOM, so .first() picked the activity's Check again and again: the app
  // ignored it because the answer was already graded, and the walk looked stuck on the same question forever.
  const sheetUp = (await page.locator('.sheet').count()) > 0;
  const sheetBtn = page.locator('.sheet .btn--primary:not([disabled])').first();
  // A concept card is a conversation: tap Next through Hooty's lines until the button reads "Got it".
  for (let n = 0; n < 12 && state.kind === 'concept'; n++) {
    const b = page.locator('.activity--concept .btn--primary').first();
    if (!(await b.count()) || !/^\s*next\s*$/i.test((await b.textContent().catch(() => '')) || '')) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(250);
  }
  if (sheetUp && (await sheetBtn.count())) {
    await sheetBtn.click().catch(() => {});
    await page.waitForTimeout(600);
  } else if (await submit.count()) {
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
if (celebrated) {
  const text = await page.evaluate(() => (document.querySelector('.celebrate')?.innerText || '').replace(/\s+/g, ' ').trim());
  console.log(`celebration: ${text.slice(0, 400)}`);
}

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
