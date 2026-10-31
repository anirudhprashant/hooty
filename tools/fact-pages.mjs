#!/usr/bin/env node
// Fill in the book page for each fact/glossary term from its evidence phrase, and drop any whose phrase
// is not in the chapter (or is over 12 words). Usage: node tools/fact-pages.mjs <chapter-number> <facts.json>
// Rewrites the file in place; prints how many survived. The model never gets to choose a page number.
import { readFileSync, writeFileSync } from 'node:fs';
import { findPages } from './lib/source.mjs';

const [ch, path] = process.argv.slice(2);
const d = JSON.parse(readFileSync(path, 'utf8'));
let kept = 0, dropped = 0;
const fix = (item) => {
  const ev = String(item.ev || '').trim();
  const words = ev.split(/\s+/).length;
  let pages = [];
  try { pages = words >= 2 && words <= 12 ? findPages(Number(ch), ev) : []; } catch { pages = []; }
  if (!pages.length) { dropped++; return false; }
  item.ev = ev; item.p = pages[0]; kept++; return true;
};
for (const l of d.lessons) l.facts = l.facts.filter(fix);
d.glossary = (d.glossary || []).filter(fix);
d.lessons = d.lessons.filter((l) => l.facts.length >= 6);
writeFileSync(path, JSON.stringify(d, null, 1));
console.log(JSON.stringify({ kept, dropped, lessons: d.lessons.map((l) => l.facts.length) }));
