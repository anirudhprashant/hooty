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

const URL = process.argv[2];
const browser = await chromium.launch({ executablePath: findChrome() });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['iPhone 13'].userAgent,
});
const page = await ctx.newPage();

const bad = [];
const consoleErrors = [];
page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const steps = [];
async function clickText(label) {
  const btn = page.locator(`button:has-text("${label}")`).first();
  if (!(await btn.count())) return false;
  await btn.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
  return true;
}

steps.push('home: ' + (await page.locator('.hero__title, h1, h2').first().textContent().catch(() => '?')).trim());

// Enter the "Trail" (chapter trail) and open the first chapter.
await clickText('Trail');
steps.push('after Trail: ' + (await page.locator('h1, h2').first().textContent().catch(() => '?')).trim());

const chapter = page.locator('button:has-text("Mauryan"), button:has-text("Chapter")').first();
if (await chapter.count()) {
  await chapter.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  steps.push('after chapter: ' + (await page.locator('h1, h2').first().textContent().catch(() => '?')).trim());
}

// Walk forward through up to 8 activities, answering whatever is asked.
for (let i = 0; i < 8; i++) {
  const acted = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const ans = btns.find((b) => b.className.match(/option|choice|answer/) && b.offsetParent);
    if (ans) { ans.click(); return 'option'; }
    const go = btns.find((b) => /continue|next|got it|check|submit|start|begin/i.test(b.textContent) && b.offsetParent);
    if (go) { go.click(); return 'continue:' + go.textContent.trim().slice(0, 24); }
    return null;
  });
  steps.push(`step${i}: ${acted}`);
  if (!acted) break;
  await page.waitForTimeout(1100);
}

const visible = await page.evaluate(() => {
  const t = document.body.innerText.replace(/\s+/g, ' ').trim();
  return t.slice(0, 400);
});

console.log('=== STEPS ===');
console.log(steps.join('\n'));
console.log('=== FINAL VISIBLE TEXT ===');
console.log(visible);
console.log('=== 4xx/5xx ===');
console.log(bad.length ? bad.join('\n') : 'none');
console.log('=== CONSOLE ERRORS ===');
console.log(consoleErrors.length ? consoleErrors.join('\n') : 'none');

await browser.close();
