#!/usr/bin/env node
/**
 * Every picture a child can see, checked where it is seen.
 *
 *   node tools/check-media.mjs                 # the packs on disk: file, thumbnail and alt text
 *   node tools/check-media.mjs --live          # also open the live site in a phone-sized Chrome and look
 *   node tools/check-media.mjs --live --book english-g6
 *
 * The live pass opens one lesson per book through its shared link (the path that used to lose the book and
 * 404 the picture), plus Home, and fails on any image the browser could not draw.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(ROOT, 'public');
const SITE = process.env.SITE || 'https://hooty.org';
const wantLive = process.argv.includes('--live');
const bookArg = process.argv.indexOf('--book');
const one = (process.argv.find((a) => a.startsWith('--book=')) || '').slice(7) || (bookArg >= 0 ? process.argv[bookArg + 1] || '' : '');

const packs = readdirSync(join(PUB, 'content/packs')).filter((d) => existsSync(join(PUB, 'content/packs', d, 'pack.json')));
const problems = [];
let scenes = 0, thumbs = 0;

for (const id of packs) {
  if (one && id !== one) continue;
  const pack = JSON.parse(readFileSync(join(PUB, 'content/packs', id, 'pack.json'), 'utf8'));
  const base = join(PUB, 'content/packs', id);
  const see = (holder, where) => {
    const t = holder?.topicScene;
    if (!t) return;
    scenes += 1;
    if (!existsSync(join(base, t))) problems.push(`${id} ${where}: missing ${t}`);
    if (!(holder.sceneAlt || '').trim()) problems.push(`${id} ${where}: no alt text for ${t}`);
    if (t.endsWith('.webp')) {
      const th = join(base, 'media/thumbs', basename(t));
      if (existsSync(th)) thumbs += 1;
      else problems.push(`${id} ${where}: no thumbnail for ${t}`);
    }
  };
  for (const unit of pack.units) {
    for (const ch of unit.chapters) {
      see(ch, ch.id);
      for (const ls of ch.lessons) see(ls, ls.id);
      if (ch.boss) see(ch.boss, ch.boss.id);
    }
  }
}

console.log(`on disk: ${scenes} pictures, ${thumbs} thumbnails, ${problems.length} problems`);
for (const p of problems.slice(0, 40)) console.log('  ' + p);

if (wantLive) {
  const { chromium } = await import('playwright');
  const findChrome = () => {
    const root = `${process.env.HOME}/.cache/ms-playwright`;
    if (!existsSync(root)) return undefined;
    for (const d of readdirSync(root).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
      const bin = `${root}/${d}/chrome-linux/chrome`;
      if (existsSync(bin)) return bin;
    }
    return undefined;
  };
  const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  let failed = [];
  page.on('requestfailed', (r) => { if (/\/media\//.test(r.url())) failed.push(`request failed ${r.url()}`); });
  page.on('response', (r) => { if (r.status() >= 400 && /\/media\//.test(r.url())) failed.push(`${r.status()} ${r.url()}`); });

  const look = async (url, label) => {
    failed = [];
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2600);
    const images = await page.evaluate(() => [...document.images].map((i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, alt: i.alt })));
    const broken = images.filter((i) => !i.ok);
    for (const b of broken) failed.push(`${label}: not drawn ${b.src} (alt "${b.alt}")`);
    return { label, n: images.length };
  };

  const results = [await look(`${SITE}/`, 'home')];
  const index = JSON.parse(readFileSync(join(PUB, 'content/index.json'), 'utf8'));
  for (const b of index.packs) {
    if (one && b.id !== one) continue;
    const pack = JSON.parse(readFileSync(join(PUB, 'content/packs', b.id, 'pack.json'), 'utf8'));
    const lesson = pack.units[0].chapters[0].lessons[0];
    results.push(await look(`${SITE}/#/lesson/${b.id}/${lesson.id}`, b.id));
    if (failed.length) problems.push(...failed);
  }
  await browser.close();
  const total = results.reduce((n, r) => n + r.n, 0);
  console.log(`live: ${results.length} pages, ${total} images drawn`);
  for (const p of problems.slice(0, 40)) console.log('  ' + p);
}

if (problems.length) { console.log(`FAIL: ${problems.length} problems`); process.exit(1); }
console.log('OK: every picture is on disk, has alt text, and (with --live) is drawn by the browser.');
