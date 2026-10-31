import { chromium } from 'playwright';
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

const browser = await chromium.launch({ executablePath: findChrome() });
const page = await (await browser.newContext()).newPage();

page.on('request', (r) => {
  if (r.url().includes('/engine/app.js')) console.log('REQ', r.resourceType(), r.url());
});
page.on('response', (r) => {
  if (r.url().includes('/engine/app.js')) console.log('RES', r.status(), r.url());
});
page.on('requestfailed', (r) => {
  if (r.url().includes('/engine/app.js')) console.log('FAIL', r.failure()?.errorText, r.url());
});

await page.goto(process.argv[2], { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

console.log('base href =', await page.evaluate(() => document.querySelector('base')?.getAttribute('href')));
console.log('sw scope  =', await page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  return r ? r.scope : 'none';
}));

await browser.close();
