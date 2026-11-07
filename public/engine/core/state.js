// Global app state. One learner by default, but the shape allows more.
// Hearts are forgiving: they never block, they just slow the celebration.

import { loadState, saveState, clearState, exportState, importState, requestPersistence } from './store.js';
import { newCard, gradeCard, pickDueCards, weakTags } from './srs.js';

export const HEARTS_MAX = 5;
export const DAILY_GOAL_XP = 50;

export function todayKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function freshLearner(name = 'Learner') {
  return {
    name,
    createdAt: Date.now(),
    xp: 0,
    hearts: HEARTS_MAX,
    heartsUpdatedAt: Date.now(),
    streak: 0,
    bestStreak: 0,
    lastActiveDay: null,
    dailyXp: 0,
    dailyGoal: DAILY_GOAL_XP,
    theme: null,
    guide2: 'hooty',        // which character walks beside the child: 'hooty' (blob mascot, default for new learners) or 'lumi' (explorer); saved learners keep theirs
    lang: 'en',
    fontScale: 1,
    dyslexiaFont: false,
    highlight: true,
    sound: true,
    reducedMotion: false,
    lessonsDone: {},        // lessonId -> { count, lastAt, bestAccuracy }
    activityStats: {},      // activityId -> { seen, correct, wrong, tags: [] }
    cards: {},              // srs itemId -> card
    rewards: [],            // unlocked reward ids
    board: [],              // stickers placed on the sticker board, 'id@x,y' with x and y in percent
    secondsLearned: 0,
    days: {},               // 'YYYY-MM-DD' -> xp earned that day (last 60), for the Grown-ups week strip
    pre: {},                // chapterId -> { n, c } score before the chapter was taught
    post: {},               // chapterId -> { pct, title } first score on the chapter challenge
  };
}

// A save can be old, corrupted or hand-edited. Everything read from one is forced into the shape the app expects, so a
// bad file can neither break the app on every open nor smuggle odd values into it.
const plainObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
function normaliseLearner(raw, id) {
  const base = freshLearner(), l = plainObject(raw), out = { ...base };
  for (const k of Object.keys(base)) {
    if (!Object.hasOwn(l, k)) continue;
    const want = base[k], v = l[k];
    if (typeof want === 'number') { const n = Number(v); if (Number.isFinite(n) && n >= 0) out[k] = n; }
    else if (typeof want === 'boolean') out[k] = !!v;
    else if (Array.isArray(want)) out[k] = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    else if (want && typeof want === 'object') out[k] = plainObject(v);
    else if (v === null || typeof v === 'string') out[k] = v === null ? null : v.slice(0, 200);
  }
  out.name = String(l.name ?? 'Learner').slice(0, 24) || 'Learner';
  out.days = Object.fromEntries(Object.entries(out.days).filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(v) && v >= 0).slice(-60));
  out.board = out.board.filter((b) => /^[\w-]{1,40}@\d{1,3},\d{1,3}$/.test(b)).slice(0, 40);
  if (out.guide2 !== 'hooty' && out.guide2 !== 'lumi') out.guide2 = 'hooty';
  out.fontScale = Math.min(1.5, Math.max(0.85, out.fontScale || 1));
  // fields added after the first release
  if (typeof l.grade === 'string' || typeof l.grade === 'number') out.grade = String(l.grade).slice(0, 4);
  if (typeof l.packId === 'string') out.packId = l.packId.slice(0, 80);
  for (const k of Object.keys(plainObject(raw))) if (!(k in out) && /^[a-zA-Z]{1,30}$/.test(k) && ['number', 'boolean', 'string'].includes(typeof l[k])) out[k] = typeof l[k] === 'string' ? l[k].slice(0, 200) : l[k];
  return out;
}
function normaliseLearners(raw) {
  const out = {};
  for (const [id, l] of Object.entries(plainObject(raw)).slice(0, 20)) if (/^[\w-]{1,40}$/.test(id) && id !== '__proto__') out[id] = normaliseLearner(l, id);
  return out;
}

export const state = {
  ready: false,
  learners: {},
  activeLearnerId: null,
  packs: [],
  themes: [],
  ui: { screen: 'home', route: null },
};

export function activeLearner() {
  return state.learners[state.activeLearnerId];
}

export function createLearner(name) {
  const id = 'learner-' + Math.random().toString(36).slice(2, 8);
  state.learners[id] = freshLearner(name);
  state.activeLearnerId = id;
  return state.learners[id];
}

export async function boot() {
  const saved = await loadState();
  if (saved && saved.learners && Object.keys(saved.learners).length) {
    state.learners = normaliseLearners(saved.learners);
    if (!Object.keys(state.learners).length) createLearner('Learner');
    state.activeLearnerId = saved.activeLearnerId || Object.keys(saved.learners)[0];
  } else {
    const l = createLearner('Learner');
    l.theme = 'enchanted-kingdom';
  }
  // A save with a missing or dangling active learner would leave the app with nobody to show.
  if (!state.learners[state.activeLearnerId]) state.activeLearnerId = Object.keys(state.learners)[0];
  state.ready = true;
  await persist();
  requestPersistence();
  return state;
}

let persistTimer = null;
let persistWaiters = [];
const writeNow = async () => {
  persistTimer = null;
  const waiters = persistWaiters;
  persistWaiters = [];
  const ok = await saveState({
    learners: state.learners,
    activeLearnerId: state.activeLearnerId,
  });
  waiters.forEach((done) => done(ok));
};
export function persist() {
  if (persistTimer) clearTimeout(persistTimer);
  return new Promise((resolve) => {
    persistWaiters.push(resolve);
    persistTimer = setTimeout(writeNow, 120);
  });
}

// A save still waiting out its debounce would be lost if the tab closes or the phone switches apps.
function flushPending() {
  if (!persistTimer) return;
  clearTimeout(persistTimer);
  writeNow();
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushPending(); });
  window.addEventListener('pagehide', flushPending);
}

export async function wipe() {
  await clearState();
  state.learners = {};
  state.activeLearnerId = null;
  createLearner('Learner');
  await persist();
}

// --- progress helpers -------------------------------------------------------

export function addXP(amount) {
  const l = activeLearner();
  if (!l) return;
  l.xp = Math.max(0, l.xp + amount);
  l.dailyXp = Math.max(0, l.dailyXp + amount);
  if (amount > 0) {
    // XP per day, kept for the Grown-ups week strip; older saves simply start the record now.
    const days = l.days || (l.days = {});
    const key = todayKey();
    days[key] = (days[key] || 0) + amount;
    const keys = Object.keys(days).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete days[k];
  }
}

export function loseHeart() {
  const l = activeLearner();
  if (!l) return;
  l.hearts = Math.max(0, l.hearts - 1);
  l.heartsUpdatedAt = Date.now();
}

export function refillHearts() {
  const l = activeLearner();
  if (!l) return;
  l.hearts = HEARTS_MAX;
  l.heartsUpdatedAt = Date.now();
}

export function heartsRegenerated() {
  // One heart every 25 minutes, capped at max. Never takes hearts away.
  const l = activeLearner();
  if (!l || l.hearts >= HEARTS_MAX) return 0;
  const elapsed = Date.now() - (l.heartsUpdatedAt || Date.now());
  const gained = Math.floor(elapsed / (25 * 60 * 1000));
  if (gained <= 0) return 0;
  const before = l.hearts;
  l.hearts = Math.min(HEARTS_MAX, l.hearts + gained);
  if (l.hearts !== before) l.heartsUpdatedAt = Date.now();
  return l.hearts - before;
}

export function touchStreak() {
  const l = activeLearner();
  if (!l) return;
  const today = todayKey();
  if (l.lastActiveDay === today) return;
  const y = new Date(Date.now() - 86400000);
  const yesterday = todayKey(y);
  if (l.lastActiveDay === yesterday) l.streak += 1;
  else l.streak = 1;
  l.lastActiveDay = today;
  l.bestStreak = Math.max(l.bestStreak || 0, l.streak);
}

export function recordActivity(activity, correct) {
  const l = activeLearner();
  if (!l) return;
  const id = activity.id;
  const s = l.activityStats[id] || { seen: 0, correct: 0, wrong: 0, tags: [] };
  if (!s.seen) s.first = !!correct;   // the first try and the latest are what show whether anything was learned
  s.last = !!correct;
  s.seen += 1;
  if (correct) s.correct += 1; else s.wrong += 1;
  const tags = activity.tags || [];
  s.tags = [...new Set([...s.tags, ...tags])];
  l.activityStats[id] = s;

  const cardId = activity.cardId || `${activity.lessonId || 'x'}::${id}`;
  const card = l.cards[cardId] || newCard(cardId, { tags });
  l.cards[cardId] = gradeCard(card, correct ? 2 : 0);
}

export function recordLesson(lessonId, accuracy) {
  const l = activeLearner();
  if (!l) return;
  const prev = l.lessonsDone[lessonId] || { count: 0, bestAccuracy: 0 };
  prev.count += 1;
  prev.lastAt = Date.now();
  prev.bestAccuracy = Math.max(prev.bestAccuracy, accuracy);
  l.lessonsDone[lessonId] = prev;
}

export function dueCards(limit = 12) {
  const l = activeLearner();
  if (!l) return [];
  return pickDueCards(Object.values(l.cards), limit);
}

export function weakSpots(limit = 6) {
  const l = activeLearner();
  if (!l) return [];
  return weakTags(Object.values(l.cards), limit);
}

export function unlockReward(id) {
  const l = activeLearner();
  if (!l || l.rewards.includes(id)) return false;
  l.rewards.push(id);
  return true;
}

export function exportSave() {
  return exportState({ learners: state.learners, activeLearnerId: state.activeLearnerId });
}

export async function importSave(text) {
  const parsed = importState(text);
  const learners = normaliseLearners(parsed.learners);
  if (!Object.keys(learners).length) throw new Error('That save file has no learners in it.');
  state.learners = learners;
  state.activeLearnerId = learners[parsed.activeLearnerId] ? parsed.activeLearnerId : Object.keys(learners)[0];
  await persist();
}
