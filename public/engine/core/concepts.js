// Concept links. Every question in the packs carries two small fields, written by tools/concepts.py:
//   anchor   the id of the teaching card (concept, passage or worked) that taught it
//   focus    which line of that card it tests (a key point, a paragraph, a worked step), or -1 for the whole card
//
// With those, a question answered wrong twice is re-taught at that one line and then re-asked as a different question
// from the same card. The child is tested on the idea, not on the wording they just saw.

import { getActivityModule } from '../activities/index.js';

const TEACH = new Set(['concept', 'passage', 'worked']);

export const isGraded = (a) => !!a && getActivityModule(a.type)?.graded !== false;

export function lessonsOf(chapter) {
  if (!chapter) return [];
  return [...(chapter.lessons || []), ...(chapter.boss ? [chapter.boss] : [])];
}

export function cardById(chapter, id) {
  if (!chapter || !id) return null;
  for (const lesson of lessonsOf(chapter)) {
    for (const a of lesson.activities || []) {
      if (a.id === id && TEACH.has(a.type)) return a;
    }
  }
  return null;
}

// The separately rememberable lines of a teaching card: its key points, paragraphs, or worked steps.
export function pointsOf(card) {
  if (!card) return [];
  if (card.type === 'concept') {
    const pts = (card.keyPoints || []).filter((p) => typeof p === 'string' && p.trim());
    if (pts.length) return pts;
  }
  if (card.type === 'passage' || card.type === 'concept') {
    const pts = String(card.body || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (pts.length) return pts;
  }
  if (card.type === 'worked') {
    const pts = (card.steps || []).filter((s) => typeof s === 'string' && s.trim());
    if (pts.length) return pts;
  }
  return [card.title || card.kicker || card.prompt || ''].filter(Boolean);
}

function trimSentences(text, max = 300) {
  const parts = String(text || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?।])\s+/);
  let out = '';
  for (const p of parts) {
    if (out && (out + ' ' + p).length > max) break;
    out = out ? `${out} ${p}` : p;
  }
  return (out || String(text || '').slice(0, max)).trim();
}

// What to show the child who missed this question: the one line that taught it when the link is sure, otherwise the
// card's own remember-list, so the re-reading always covers what the next question may ask. `whole` forces the list,
// for when the different question that follows tests a different line of the same card.
export function revealFor(activity, chapter, { whole = false } = {}) {
  const card = cardById(chapter, activity?.anchor);
  if (!card) return null;
  const pts = pointsOf(card);
  const f = Number.isInteger(activity.focus) ? activity.focus : -1;
  const title = card.title || card.kicker || '';
  if (!whole && f >= 0 && pts[f]) return { title, lines: [pts[f]], one: true };
  if (card.type === 'concept' && (card.keyPoints || []).length) {
    return { title, lines: card.keyPoints.filter((p) => typeof p === 'string').slice(0, 3), one: false };
  }
  const body = card.type === 'worked' ? (card.steps || []).join(' ') : card.body;
  if (!body) return null;
  return { title, lines: [trimSentences(body)], one: false };
}

// Every other question taught by the same card.
export function siblingsFor(activity, chapter) {
  if (!activity?.anchor) return [];
  const out = [];
  for (const lesson of lessonsOf(chapter)) {
    for (const a of lesson.activities || []) {
      if (a.id === activity.id || a.anchor !== activity.anchor) continue;
      if (!isGraded(a)) continue;
      if ((a.prompt || '') === (activity.prompt || '')) continue;
      out.push(a);
    }
  }
  return out;
}

// A stable pseudo-random number, so the same miss always offers the same alternative (QA can rely on it) and two
// equally good alternatives do not always resolve the same way across a whole lesson.
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) { h ^= String(s).charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Pick the different question to ask after the re-teach. Same idea first, then a fresh question, then one that was not
// already asked in this session, a different format, and a similar difficulty.
export function pickAlt(activity, chapter, ctx = {}) {
  const alts = siblingsFor(activity, chapter);
  if (!alts.length) return null;
  const stats = ctx.stats || {};
  const shown = ctx.shown || new Set();
  const queued = ctx.queued || new Set();
  let best = null, bestScore = -Infinity;
  for (const a of alts) {
    let s = 0;
    if (activity.focus >= 0 && a.focus >= 0) s += a.focus === activity.focus ? 50 : -12;
    if (shown.has(a.prompt)) s -= 120;   // a question already on screen this session is not a different question
    if (queued.has(a.id)) s -= 60;
    if (!(stats[a.id]?.seen)) s += 14;
    if (a.type !== activity.type) s += 6;
    if ((a.tags || []).includes('deep')) s += 4;
    const dd = Math.abs((a.difficulty || 2) - (activity.difficulty || 2));
    s += dd === 0 ? 3 : dd === 1 ? 0 : -3;
    s += (hash(activity.id + a.id + (ctx.seed || 0)) % 100) / 1000;   // tie-break only
    if (s > bestScore) { bestScore = s; best = a; }
  }
  return best;
}

// The alternative question, wearing the identity of the one it stands in for: the answer counts for that card, the
// review deck keeps one entry per idea, and a question cannot shadow another's progress.
export function variantOf(alt, base) {
  return {
    ...alt,
    id: base.id,
    cardId: base.cardId,
    lessonId: base.lessonId,
    packId: base.packId,
    chapterId: base.chapterId,
    anchor: base.anchor,
    focus: base.focus,
    variantOff: alt.id,
  };
}
