// Source-of-truth helpers. The textbook text lives in sources/ncert-class6-ss
// (git-ignored: NCERT's text is not ours to redistribute). Every fact in a
// lesson points back to it by chapter and book page, with a short verbatim
// phrase ("evidence") that this module can find mechanically.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const SOURCE_DIR = resolve(HERE, '..', '..', 'sources', process.env.SPARKLE_SOURCE || 'ncert-class6-ss');

// Lower-case, strip accents/macrons, unify quotes and dashes, undo hyphenation
// across line breaks, drop punctuation, collapse whitespace.
export function normalise(s) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’‚′']/g, "'")
    .replace(/[“”„"]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/-\s*\n\s*/g, '')
    .replace(/[^\p{L}\p{M}\p{N}%/.' -]+/gu, ' ')
    .replace(/[.'"-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const cache = new Map();

// Returns [{ page, raw, norm }] for a chapter, one entry per book page.
export function loadChapter(n) {
  if (cache.has(n)) return cache.get(n);
  const file = join(SOURCE_DIR, 'chapters', `ch${String(n).padStart(2, '0')}.txt`);
  if (!existsSync(file)) throw new Error(`no source text for chapter ${n} (${file})`);
  const text = readFileSync(file, 'utf8');
  const pages = text.split(/^=== BOOK PAGE (\d+) ===$/m);
  const out = [];
  for (let i = 1; i < pages.length; i += 2) {
    out.push({ page: Number(pages[i]), raw: pages[i + 1], norm: normalise(pages[i + 1]) });
  }
  cache.set(n, out);
  return out;
}

export function chapterNorm(n) {
  return loadChapter(n).map((p) => p.norm).join(' ');
}

// Find which book pages contain a phrase. Text flowing across a page break is
// matched against the joined chapter and reported as the page it starts on.
export function findPages(n, phrase) {
  const want = normalise(phrase);
  if (!want) return [];
  const pages = loadChapter(n);
  const hits = pages.filter((p) => p.norm.includes(want)).map((p) => p.page);
  if (hits.length) return hits;
  for (let i = 0; i < pages.length - 1; i++) {
    const joined = `${pages[i].norm} ${pages[i + 1].norm}`;
    if (joined.includes(want)) return [pages[i].page];
  }
  // Scripts whose PDF text comes out with stray spaces (Devanagari conjuncts: "झक ु ,") match if spaces are ignored.
  if (/[^\u0000-\u024f]/.test(want)) {
    const squash = (t) => t.replace(/\s+/g, '');
    const w = squash(want);
    if (w.length >= 8) {
      for (let i = 0; i < pages.length; i++) {
        const joined = squash(`${pages[i].norm} ${pages[i + 1]?.norm || ''}`);
        if (joined.includes(w)) return [pages[i].page];
      }
    }
  }
  return [];
}
