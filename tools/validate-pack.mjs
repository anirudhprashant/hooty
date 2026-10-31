#!/usr/bin/env node
/**
 * Content pack validator.
 *
 * Checks a pack against the schema in docs/SCHEMA.md so a bad pack fails on the
 * author's machine instead of in a child's lesson. Exits 1 on any error.
 *
 * Usage:
 *   node tools/validate-pack.mjs content/packs/class6-sst-term2/pack.json
 *   pass several pack.json paths to check them all at once
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';

const KNOWN_TYPES = new Set([
  'mcq', 'truefalse', 'fillblank', 'matchpairs', 'dragorder',
  'draglabel', 'typeanswer', 'listenpick', 'flashcard', 'concept',
  'watchanswer', 'media', 'hook', 'passage', 'worked', 'explain', 'explore',
]);

const errors = [];
const warnings = [];

const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

function checkActivity(a, where, seenIds) {
  if (!a || typeof a !== 'object') { err(where, 'activity is not an object'); return; }
  if (!a.type) { err(where, 'missing "type"'); return; }
  if (!KNOWN_TYPES.has(a.type)) { err(where, `unknown activity type "${a.type}"`); }
  if (!a.id) { err(where, 'missing "id"'); }
  else if (seenIds.has(a.id)) { err(where, `duplicate activity id "${a.id}"`); }
  else seenIds.add(a.id);

  if (!a.explanation) err(where, 'missing "explanation" (every activity teaches something)');
  // **key word** markers are for explanatory text only; answer buttons must stay plain.
  for (const o of [...(a.options || []), ...(a.items || []), ...(a.pairs || []).flat()]) {
    if (typeof o === 'string' && o.includes('**')) err(where, `"**" key-word marker inside an answer: ${o}`);
  }
  if (a.difficulty !== undefined && ![1, 2, 3].includes(a.difficulty)) {
    err(where, `difficulty must be 1, 2 or 3 (got ${a.difficulty})`);
  }
  if (a.tags && !Array.isArray(a.tags)) err(where, '"tags" must be an array');

  switch (a.type) {
    case 'mcq': {
      if (!Array.isArray(a.options) || a.options.length < 2) { err(where, 'mcq needs at least 2 options'); break; }
      if (typeof a.answer !== 'number') { err(where, 'mcq "answer" must be the index of the correct option'); break; }
      if (a.answer < 0 || a.answer >= a.options.length) err(where, `mcq answer index ${a.answer} out of range`);
      if (!a.prompt) err(where, 'missing "prompt"');
      break;
    }
    case 'truefalse':
      if (typeof a.answer !== 'boolean') err(where, 'truefalse "answer" must be true or false');
      if (!a.prompt) err(where, 'missing "prompt"');
      break;
    case 'fillblank':
      if (!Array.isArray(a.answers) || !a.answers.length) err(where, 'fillblank needs a non-empty "answers" array');
      if (!a.prompt || (!a.prompt.includes('_') && !(a.tags || []).includes('computed'))) err(where, 'fillblank prompt needs a ______ blank');
      break;
    case 'matchpairs': {
      if (!Array.isArray(a.pairs) || a.pairs.length < 2) { err(where, 'matchpairs needs at least 2 pairs'); break; }
      for (const p of a.pairs) {
        if (!Array.isArray(p) || p.length !== 2) { err(where, 'each matchpairs pair must be [left, right]'); break; }
      }
      const rights = a.pairs.map((p) => p[1]);
      if (new Set(rights).size !== rights.length) err(where, 'matchpairs right-hand values must be unique');
      break;
    }
    case 'dragorder':
      if (!Array.isArray(a.items) || a.items.length < 3) err(where, 'dragorder needs at least 3 items');
      if (new Set(a.items || []).size !== (a.items || []).length) err(where, 'dragorder items must be unique');
      break;
    case 'draglabel': {
      if (!Array.isArray(a.labels) || !a.labels.length) { err(where, 'draglabel needs "labels"'); break; }
      for (const l of a.labels) {
        if (typeof l.x !== 'number' || typeof l.y !== 'number') err(where, 'each draglabel needs numeric x and y');
      }
      if (a.image) checkMedia(a.image, where);
      break;
    }
    case 'typeanswer':
      if (!Array.isArray(a.answers) || !a.answers.length) err(where, 'typeanswer needs a non-empty "answers" array');
      break;
    case 'listenpick': {
      if (!a.speech) err(where, 'listenpick needs "speech" to read aloud');
      if (!Array.isArray(a.options) || a.options.length < 2) { err(where, 'listenpick needs options'); break; }
      if (typeof a.answer !== 'number' || a.answer < 0 || a.answer >= a.options.length) err(where, 'listenpick answer index out of range');
      break;
    }
    case 'flashcard':
      if (!a.front || !a.back) err(where, 'flashcard needs "front" and "back"');
      break;
    case 'concept':
      if (!a.title || !a.body) err(where, 'concept needs "title" and "body"');
      break;
    case 'explore':
      if (!a.widget) err(where, 'explore needs a "widget"');
      break;
    case 'explain':
      if (!a.prompt || !a.answer || !Array.isArray(a.points) || a.points.length < 2) err(where, 'explain needs "prompt", "answer" and at least two "points"');
      break;
    case 'worked':
      if (!a.prompt || !Array.isArray(a.steps) || a.steps.length < 2) err(where, 'worked needs a "prompt" and at least two "steps"');
      break;
    case 'hook':
      if (!a.prompt) err(where, 'hook needs a "prompt" (the curiosity question)');
      break;
    case 'passage':
      if (!a.title || !a.body) err(where, 'passage needs "title" and "body"');
      break;
    case 'watchanswer': {
      if (!a.video || !a.video.id) { err(where, 'watchanswer needs a "video" with an id'); break; }
      if (!a.video.reviewedBy) err(where, 'watchanswer video must be reviewed by a human (video.reviewedBy)');
      if (!a.video.reason) warn(where, 'watchanswer video should record why it was chosen (video.reason)');
      if (a.video.start === undefined || a.video.end === undefined) warn(where, 'watchanswer video should have start/end seconds');
      if (!Array.isArray(a.options) || !a.answers) err(where, 'watchanswer needs a question after the clip');
      break;
    }
    case 'media':
      if (!a.src) err(where, 'media needs "src"');
      else checkMedia(a.src, where);
      break;
    default:
      break;
  }
}

function checkMedia(rel, where) {
  // resolved against the pack folder, which the caller sets on packRoot
  if (!packRoot) return;
  const p = resolve(packRoot, rel);
  if (!existsSync(p)) err(where, `media file not found: ${rel}`);
}

function checkLesson(lesson, where, seenIds) {
  if (!lesson.id) err(where, 'missing lesson "id"');
  if (!lesson.title) err(where, 'missing lesson "title"');
  const acts = lesson.activities || [];
  if (acts.length < 8) warn(where, `only ${acts.length} activities (8-12 recommended)`);
  if (acts.length > 12) warn(where, `${acts.length} activities (8-12 recommended)`);

  let lastDiff = 0;
  let sawTeach = false;
  acts.forEach((a, i) => {
    const w = `${where} > ${a.id || `activity[${i}]`}`;
    checkActivity(a, w, seenIds);
    const d = a.difficulty || 1;
    if (d < lastDiff) warn(w, `difficulty drops from ${lastDiff} to ${d}; lessons should go easy -> hard`);
    lastDiff = Math.max(lastDiff, d);
    if (a.type === 'concept') sawTeach = true;
  });
  if (!sawTeach) warn(where, 'no "concept" activity: the lesson should teach before it tests');
}

let packRoot = null;

function checkPack(pack, path) {
  packRoot = dirname(resolve(path));
  if (!pack.id) err('pack', 'missing "id"');
  if (!pack.title) err('pack', 'missing "title"');
  if (!pack.language) err('pack', 'missing "language"');
  if (!Array.isArray(pack.sources) || !pack.sources.length) {
    err('pack', 'missing "sources": every pack must record where the facts came from');
  } else {
    for (const s of pack.sources) {
      if (!s.title) warn('pack.sources', 'a source is missing "title"');
      if (!s.url) warn('pack.sources', `source "${s.title || '?'}" is missing "url"`);
    }
  }
  if (pack.review && pack.review.status === 'approved' && !pack.review.reviewedBy) {
    err('pack.review', 'approved pack must record who reviewed it');
  }

  if (!Array.isArray(pack.units) || !pack.units.length) { err('pack', 'no "units"'); return; }

  const seenIds = new Set();
  const lessonIds = new Set();
  for (const unit of pack.units) {
    if (!unit.id) err('pack.units', 'missing unit "id"');
    if (!Array.isArray(unit.chapters) || !unit.chapters.length) {
      err(`unit ${unit.id}`, 'no "chapters"');
      continue;
    }
    for (const chapter of unit.chapters) {
      const cw = `chapter ${chapter.id || '?'}`;
      if (!chapter.title) err(cw, 'missing "title"');
      const groups = [...(chapter.lessons || [])];
      if (chapter.boss) groups.push({ ...chapter.boss, id: chapter.boss.id || `${chapter.id}-boss` });
      if (!groups.length) { err(cw, 'chapter has no lessons'); continue; }
      for (const lesson of groups) {
        const lw = `${cw} > ${lesson.id || '?'}`;
        if (lessonIds.has(lesson.id)) err(lw, 'duplicate lesson id');
        lessonIds.add(lesson.id);
        checkLesson(lesson, lw, seenIds);
      }
    }
  }
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node tools/validate-pack.mjs <pack.json> [...]');
  process.exit(2);
}

for (const f of files) {
  const p = resolve(f);
  if (!existsSync(p)) {
    errors.push(`${f}: file not found`);
    continue;
  }
  let pack;
  try {
    pack = JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    errors.push(`${basename(p)}: invalid JSON - ${e.message}`);
    continue;
  }
  const before = errors.length;
  checkPack(pack, p);
  const added = errors.length - before;
  console.log(`${added ? 'FAIL' : ' OK '} ${f}`);
}

if (warnings.length) {
  console.log('\nWarnings:');
  for (const w of warnings) console.log('  ~ ' + w);
}
if (errors.length) {
  console.log('\nErrors:');
  for (const e of errors) console.log('  x ' + e);
  console.log(`\n${errors.length} error(s).`);
  process.exit(1);
}
console.log('\nAll good.');
