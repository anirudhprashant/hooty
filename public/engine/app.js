// The app shell. Screens: home, path (skill trail), lesson player, parent view,
// settings, theme picker, pack picker. Vanilla, no framework.

import { el, clear, button, confetti, sparkle, speak, stopSpeech, isSpeaking } from './core/dom.js';
import { sfx, unlockAudio, configureSfx, haptic } from './core/sfx.js';
import { realise } from './core/gen.js';
import { renderModel } from './core/models.js';
import { state, boot, activeLearner, persist, addXP,
  heartsRegenerated, touchStreak, recordActivity, recordLesson, weakSpots,
  unlockReward, todayKey, exportSave, importSave } from './core/state.js';
import { applyTheme, getTheme, themeAsset, assetFor, mascotImage, mascotAvatar, themeCopy, setGuide, currentGuide, guideAvatarSrc } from './core/theme.js';
// Brand art (tools/brand/make.sh): blob Hooty as the logo mark.
const BRAND_MARK = './characters/blob/hooty-mark.webp';
import { t, setLocale, getLocale, availableLocales } from './core/i18n.js';
import { getActivityModule } from './activities/index.js';
import { icon } from './core/icons.js';
import { bookWord } from './core/bookwords.js';
import { saveBook, getBook, deleteBook, listBooks } from './core/mybooks.js';
import { buildMatcher, annotate, openTermCard, markKeys, plain } from './core/glossary.js';

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

let themes = [];
let packs = [];
let currentThemeId = null;
let router = { screen: 'home', args: {} };

// --- helpers ---------------------------------------------------------------

export function toast(msg, ms = 2200) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-visible');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('is-visible'), ms);
}

// Sound effects are synthesised (core/sfx.js) and follow the child's Sound switch in Settings.
configureSfx({ speaking: isSpeaking });
function sound(kind, arg) {
  if (!activeLearner()?.sound) return;
  sfx(kind, arg);
  if (kind === 'wrong' || kind === 'correct' || kind === 'win') haptic(kind);
}

// Settings lets each child pick their guide: Hooty or Lumi.
const SHOW_GUIDE_PICKER = true;

function applyLearnerPrefs() {
  const l = activeLearner();
  if (!l) return;
  document.documentElement.style.setProperty('--font-scale', String(l.fontScale || 1));
  document.body.classList.toggle('dyslexia-font', !!l.dyslexiaFont);
  document.body.classList.toggle('hl-on', l.highlight !== false);
  setLocale(l.lang || 'en');
  setGuide(l.guide2);
}

async function setTheme(id) {
  const theme = themes.find((x) => x.id === id);
  if (!theme) return;
  currentThemeId = id;
  applyTheme(theme);
  const l = activeLearner();
  if (l) { l.theme = id; await persist(); }
  render();
}

// --- content loading -------------------------------------------------------

// One retry covers a dropped connection; a book that still will not load is skipped so the others stay usable.
async function getJson(url) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) {
      if (attempt >= 1) throw e;
      await new Promise((go) => setTimeout(go, 400));
    }
  }
}

let packIndex = [];   // every book's small card from content/index.json (id, subject, grade): no book text
const loadedGrades = new Set();

async function loadPack(p) {
  try {
    if (p.local) {
      const own = await getBook(p.id);
      return own ? { ...own, base: '', glossary: own.glossaryData, matcher: buildMatcher(own.glossaryData) } : null;
    }
    const full = await getJson(`./content/packs/${p.id}/pack.json`);
    const pack = { ...full, base: `./content/packs/${p.id}`, glossary: null, matcher: buildMatcher(null) };
    // A pack opts in with "glossary": "glossary.json" in pack.json. Word meanings arrive just after the book:
    // nothing on the home screen needs them, so the child does not wait for them.
    if (full.glossary) getJson(`${pack.base}/${full.glossary}`).then((g) => { pack.glossary = g; pack.matcher = buildMatcher(g); }).catch(() => {});
    return pack;
  } catch (e) {
    console.warn('book skipped:', p.id, e.message);
    return null;
  }
}

function addPacks(got) {
  packs = [...packs, ...got.filter((g) => !packById(g.id))].sort((x, y) => packIndex.findIndex((i) => i.id === x.id) - packIndex.findIndex((i) => i.id === y.id));
}

// Books load one class at a time, so a child on Class 6 never downloads Class 10.
async function loadGrade(grade) {
  if (loadedGrades.has(grade)) return;
  const want = packIndex.filter((p) => String(p.grade) === grade && !packById(p.id));
  const got = (await Promise.all(want.map(loadPack))).filter(Boolean);
  addPacks(got);
  if (got.length === want.length) loadedGrades.add(grade);
}

// Only the book on screen is worth waiting for. The rest of the class follows quietly once the home screen is up,
// so review questions and grown-up progress fill in moments later.
async function ensurePack(id) {
  if (packById(id)) return true;
  const card = packIndex.find((p) => p.id === id);
  const got = card ? await loadPack(card) : null;
  if (got) addPacks([got]);
  return !!got;
}

function loadRestInBackground(grade) {
  const go2 = () => loadGrade(grade).then(() => {
    if (['practice', 'parent'].includes(router.screen)) render();   // these two screens read every book of the class
  }).catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(go2, { timeout: 1500 }); else setTimeout(go2, 300);
}

function gradeList() {
  return [...new Set(packIndex.map((p) => String(p.grade)))].sort((x, y) => (x === 'mine') - (y === 'mine') || Number(x) - Number(y));
}

// The class the child is in: the one they last picked, else Class 6 (the first class built), else the lowest.
function activeGrade() {
  const g = String(activeLearner()?.grade || '');
  const all = gradeList();
  return all.includes(g) ? g : (all.includes('6') ? '6' : all[0]);
}

async function loadContent() {
  const [themeIdx, packIdx] = await Promise.all([getJson('./themes/index.json'), getJson('./content/index.json')]);
  themes = await Promise.all(themeIdx.themes.map(async (t) => {
    const full = await getJson(`./themes/${t.id}/theme.json`);
    return { ...full, base: './themes' };
  }));
  packIndex = [...packIdx.packs, ...await listBooks()];
  const grade = activeGrade();
  const mine = packIndex.filter((p) => String(p.grade) === grade);
  const saved = activeLearner()?.packId;
  const first = mine.find((p) => p.id === saved) || mine[0];
  if (first) await ensurePack(first.id);
  if (!packs.length) await loadGrade(grade);   // the first book failed: try the rest before giving up
  if (!packs.length) throw new Error('No books could be loaded.');
}

function packById(id) { return packs.find((p) => p.id === id); }

// The subject the child is working in: the one they last picked, else the first book.
// Read-aloud language: the book's own (a Hindi book is read in Hindi), else the app language.
function speechLang() {
  const book = packById(session?.lesson?.packId)?.language;
  if (book === 'hi') return 'hi-IN';
  return getLocale() === 'kn' ? 'kn-IN' : getLocale() === 'hi' ? 'hi-IN' : 'en-IN';
}

function gradePacks() { const g = activeGrade(); return packs.filter((p) => String(p.grade) === g); }

function currentPack() {
  const l = activeLearner();
  const mine = gradePacks();
  const ok = (p) => p && mine.includes(p) ? p : null;
  return ok(packById(router.packId)) || ok(packById(l?.packId)) || mine[0] || packs[0];
}

async function switchGrade(g) {
  const l = activeLearner();
  const subject = currentPack()?.subject;
  if (l) l.grade = g;
  const mine = packIndex.filter((p) => String(p.grade) === g);
  const next = mine.find((p) => p.subject === subject) || mine[0];
  if (next) await ensurePack(next.id);
  router.packId = next?.id;
  if (l && next) l.packId = next.id;
  await persist();
  render();
  loadRestInBackground(g);
}

// A row of class chips (only once more than one class exists) above a row of subject pills for that class.
function subjectTabs() {
  const grades = gradeList();
  // Tabs come from the index, so a subject whose book is still on its way is already there to tap.
  const mine = packIndex.filter((p) => String(p.grade) === activeGrade());
  if (mine.length < 2 && grades.length < 2) return null;
  const cur = currentPack();
  const swipe = (row) => requestAnimationFrame(() => {
    // The chosen chip may sit off-screen to the right: bring it into view once the row is in the page.
    const on = row.querySelector('.is-on');
    if (on) row.scrollLeft = on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2;
  });
  const wrap = el('div', { class: 'tabs-block' });
  {
    const g = activeGrade();
    const row = el('div', { class: 'subject-tabs grade-tabs', role: 'tablist', 'aria-label': 'Class' }, grades.map((x) => el('button', {
      class: `subject-tab grade-tab${x === g ? ' is-on' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(x === g),
      onclick: () => switchGrade(x),
    }, [x === 'mine' ? 'My books' : `Class ${x}`])));
    row.append(el('button', { class: 'subject-tab grade-tab grade-tab--add', type: 'button', onclick: () => go('addbook') }, ['+ Add my book']));
    wrap.append(row); swipe(row);
  }
  if (mine.length >= 1) {
    const row = el('div', { class: 'subject-tabs', role: 'tablist', 'aria-label': 'Subject' }, mine.map((p) => el('button', {
      class: `subject-tab${p.id === cur?.id ? ' is-on' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(p.id === cur?.id),
      onclick: async () => {
        if (!(await ensurePack(p.id))) { toast('Could not load that book. Check your connection.'); return; }
        router.packId = p.id; const l = activeLearner(); if (l) { l.packId = p.id; await persist(); } render();
      },
    }, [p.subject])));
    wrap.append(row); swipe(row);
  }
  return wrap;
}

// Mark the glossary words in a piece of lesson text and wire the taps.
function markWords(root, { hint = true } = {}) {
  if (!root) return;
  markKeys(root);
  const pack = session?.lesson?.packId ? packById(session.lesson.packId) : null;
  if (!pack?.matcher) return;
  const n = annotate(root, pack.matcher, (entry, from) => {
    const l = activeLearner();
    if (l) { l.wordsLooked = l.wordsLooked || {}; l.wordsLooked[entry.term] = (l.wordsLooked[entry.term] || 0) + 1; l.seenWordHint = true; persist(); }
    openTermCard(entry, { from, say: (txt) => speak(plain(txt), speechLang()) });
  });
  // A quiet one-line hint above the text for the first few cards, until the learner taps a word.
  const l = activeLearner();
  if (hint && n && l && !l.seenWordHint && (l.wordHintShown || 0) < 3) {
    l.wordHintShown = (l.wordHintShown || 0) + 1;
    persist();
    root.prepend(el('p', { class: 'term-hint' }, [icon('highlight', { size: 18 }), bookWord(pack.language, 'Tap a highlighted word to see what it means.')]));
  }
}

// --- top bar ---------------------------------------------------------------

// --- top bar and navigation ------------------------------------------------

const NAV = [
  { id: 'home', icon: 'home', label: () => t('home') },
  { id: 'path', icon: 'trail', label: () => t('path') },
  { id: 'practice', icon: 'practice', label: () => t('practiseTab') },
  { id: 'rewards', icon: 'rewards', label: () => t('rewards') },
  { id: 'parent', icon: 'grownups', label: () => t('parent') },
];
const NAV_FOR = { home: 'home', packs: 'path', path: 'path', practice: 'practice', rewards: 'rewards', themes: 'rewards', parent: 'parent', addbook: 'path' };
const SUBSCREENS = new Set(['packs', 'themes', 'settings']);

function topBar(title) {
  const l = activeLearner();
  const bar = el('header', { class: `topbar${SUBSCREENS.has(router.screen) ? ' topbar--sub' : ''}` });
  if (SUBSCREENS.has(router.screen)) {
    bar.append(el('button', {
      class: 'icon-btn', type: 'button', 'aria-label': t('back'),
      onclick: () => go(router.screen === 'themes' ? 'rewards' : 'home'),
    }, [icon('back')]));
  }
  bar.append(el('h1', { class: 'topbar__title', text: title || t('appName') }));
  const stat = (cls, name, value, label) => el('span', { class: `stat ${cls}`, title: label, 'aria-label': `${label}: ${value}` }, [
    icon(name, { size: 24 }), el('span', { text: String(value) }),
  ]);
  // No lives: a wrong answer just comes back later. Stats appear once there is something to show.
  bar.append(el('div', { class: 'topbar__stats' }, [
    l?.streak ? stat('stat--streak', 'flame', l.streak, t('streak')) : null,
    l?.xp ? stat('stat--xp', 'star', l.xp, t('xp')) : null,
    router.screen === 'settings' ? null : el('button', { class: 'icon-btn icon-btn--settings', type: 'button', 'aria-label': t('settings'), onclick: () => go('settings') }, [icon('settings')]),
  ]));
  return bar;
}

function navBar() {
  const nav = el('nav', { class: 'nav', 'aria-label': 'Main' });
  nav.append(el('div', { class: 'nav__brand' }, [el('img', { src: BRAND_MARK, alt: '' }), t('appName')]));
  const active = NAV_FOR[router.screen];
  const due = practiceSet(10).length;
  for (const item of NAV) {
    const b = el('button', {
      class: `nav__item${item.id === active ? ' is-active' : ''}`, type: 'button',
      'aria-current': item.id === active ? 'page' : undefined,
      onclick: () => go(item.id),
    }, [icon(item.icon, { size: 26 }), el('span', { text: item.label() })]);
    if (item.id === 'practice' && due) b.append(el('span', { class: 'nav__badge', 'aria-label': `${due} to try again`, text: String(due) }));
    nav.append(b);
  }
  return nav;
}

// --- review cards (spaced repetition) -----------------------------------------

function bossId(chapter) { return chapter.boss?.id || `${chapter.id}-boss`; }

// Every graded activity in every pack, keyed by the SRS card id that
// recordActivity() writes: "<lessonId>::<activityId>".
function activityIndex() {
  const map = new Map();
  for (const pack of packs) {
    for (const unit of pack.units) {
      for (const chapter of unit.chapters) {
        const groups = [...(chapter.lessons || []).map((x) => [x.id, x])];
        if (chapter.boss) groups.push([bossId(chapter), chapter.boss]);
        for (const [lessonId, lesson] of groups) {
          for (const a of lesson.activities || []) {
            if (getActivityModule(a.type)?.graded === false) continue;
            const cardId = `${lessonId}::${a.id}`;
            map.set(cardId, { ...a, cardId, lessonId, packId: pack.id });
          }
        }
      }
    }
  }
  return map;
}

// Practice is only for mistakes: questions whose latest answer was wrong. Right once and it is gone. Wrong again in a
// practice session and it waits until tomorrow, so finishing practice really does finish it for today.
const isMistake = (c) => (c.lapses || 0) > 0 && !c.box;
function practiceSet(size = 10) {
  const l = activeLearner();
  if (!l) return [];
  const index = activityIndex(), now = Date.now();
  return Object.values(l.cards).filter((c) => isMistake(c) && (c.due || 0) <= now).sort((x, y) => (y.lapses || 0) - (x.lapses || 0))
    .map((c) => index.get(c.id)).filter(Boolean).slice(0, size);
}

// A short mixed quiz from what the child already got right, oldest first: remembering is what makes it stick.
function quickQuiz(size = 5) {
  const l = activeLearner();
  if (!l) return [];
  const index = activityIndex();
  return Object.values(l.cards).filter((c) => c.box >= 1).sort((x, y) => (x.due || 0) - (y.due || 0))
    .map((c) => index.get(c.id)).filter(Boolean).slice(0, size);
}

// --- screens ---------------------------------------------------------------

function ringMeter(pct, label) {
  const r = 28, c = 2 * Math.PI * r;
  const wrap = el('div', { class: 'tile__figure' });
  wrap.innerHTML = `<svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="ring__track" cx="32" cy="32" r="${r}" fill="none" stroke-width="8"/><circle class="ring__fill" cx="32" cy="32" r="${r}" fill="none" stroke-width="8" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}"/></svg>`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    wrap.querySelector('.ring__fill')?.setAttribute('stroke-dashoffset', (c * (1 - pct / 100)).toFixed(1));
  }));
  if (label) wrap.append(el('span', { class: 'visually-hidden', text: label }));
  return wrap;
}

function nextRewardFor(l) {
  const rewards = [...(getTheme()?.rewards || [])].sort((a, b) => a.unlockAt - b.unlockAt);
  return rewards.find((r) => !l?.rewards?.includes(r.id) && (l?.xp || 0) < r.unlockAt) || null;
}

// The name Hooty greets the child with. Kept short, trimmed, and never empty.
async function saveName(raw) {
  const l = activeLearner();
  if (!l) return;
  // Room for a full first and second name; if it still runs long, cut at a word boundary, never mid-word.
  let name = String(raw || '').replace(/\s+/g, ' ').trim();
  if (name.length > 24) { name = name.slice(0, 24); if (name.includes(' ')) name = name.slice(0, name.lastIndexOf(' ')); }
  l.name = name || 'Learner';
  await persist();
}

function nameCard() {
  const input = el('input', { class: 'text-input', type: 'text', maxlength: '24', autocomplete: 'given-name', 'aria-label': 'Your name', placeholder: 'Type your name' });
  const form = el('form', { class: 'name-card' }, [
    el('p', { class: 'name-card__ask', text: 'What should Hooty call you?' }),
    el('div', { class: 'input-row' }, [input, el('button', { class: 'btn btn--primary', type: 'submit', text: 'Save' })]),
  ]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!input.value.trim()) { input.focus(); return; }
    await saveName(input.value);
    render();
  });
  return form;
}

// Links from book data may only be ordinary web links.
const safeLink = (u) => (/^https?:\/\//i.test(String(u)) ? u : '#');

// A small copy of a lesson's picture for cards (tools/publish.py makes them); the full picture if there is none.
function thumbImage(lesson) {
  const full = resolveMediaPath(lesson.topicScene, lesson);
  const img = el('img', { class: 'feature__art', alt: '', loading: 'lazy', decoding: 'async', src: full.replace(/\/media\/([^/]+\.webp)$/, '/media/thumbs/$1') });
  img.addEventListener('error', () => { if (img.getAttribute('src') !== full) img.src = full; }, { once: true });
  return img;
}

function screenHome() {
  const l = activeLearner();
  const wrap = el('div', { class: 'page screen screen--home' });
  { const tabs = subjectTabs(); if (tabs) wrap.append(tabs); }
  const next = nextLesson();
  const started = Object.keys(l?.lessonsDone || {}).length > 0;
  const named = l?.name && !/^learner$/i.test(l.name);
  const due = practiceSet(10);

  const stage = el('section', { class: 'stage' });
  const art = el('div', { class: 'stage__art' });
  const mascot = mascotImage('idle');
  if (mascot) art.append(el('img', { class: 'stage__mascot', src: mascot, alt: '' }));

  const copy = el('div', { class: 'stage__copy' });
  copy.append(
    el('h2', { class: 'stage__title', text: named ? `Hi, ${l.name}!` : 'Ready to learn?' }),
    el('p', { class: 'stage__sub', text: next ? (started ? 'Your next adventure is waiting.' : 'Your first lesson takes about four minutes.') : 'Every lesson done. Time to revise!' }),
  );
  const actions = el('div', { class: 'stage__actions' });
  const cta = el('button', { class: 'btn big-cta', type: 'button' }, [
    el('span', { class: 'big-cta__play' }, [icon('play', { size: 24 })]),
    el('span', { class: 'big-cta__text' }, [
      el('span', { class: 'big-cta__label', text: next ? (started ? t('continue') : t('start')) : t('practiseTab') }),
      next ? el('span', { class: 'big-cta__sub', text: next.title }) : null,
    ]),
  ]);
  cta.addEventListener('click', () => (next ? startLesson(next) : go(due.length ? 'practice' : 'path')));
  actions.append(cta);
  if (due.length && next) {
    actions.append(el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => go('practice') },
      [icon('practice', { size: 22 }), t('reviewN', { n: due.length })]));
  }
  copy.append(actions);
  stage.append(art, copy);
  wrap.append(stage);
  if (!named) wrap.append(nameCard());

  // today: goal ring, streak, next sticker. Rewards are visible from day one.
  const goal = l?.dailyGoal || 50;
  const goalPct = Math.min(100, Math.round(((l?.dailyXp || 0) / goal) * 100));
  const goalTile = el('div', { class: 'tile' }, [
    ringMeter(goalPct, `${goalPct}%`),
    el('div', { class: 'tile__body' }, [
      el('span', { class: 'tile__value', text: `${Math.min(l?.dailyXp || 0, goal)}/${goal}` }),
      el('span', { class: 'tile__label', text: 'XP today' }),
    ]),
  ]);
  const streakTile = el('div', { class: 'tile tile--streak' }, [
    el('div', { class: 'tile__figure' }, [icon('flame', { size: 56 })]),
    el('div', { class: 'tile__body' }, [
      el('span', { class: 'tile__value', text: String(l?.streak || 0) }),
      el('span', { class: 'tile__label', text: (l?.streak || 0) === 1 ? 'day streak' : 'days in a row' }),
    ]),
  ]);
  const nr = nextRewardFor(l);
  const rewardPct = nr ? Math.min(100, Math.round(((l?.xp || 0) / nr.unlockAt) * 100)) : 100;
  const showReward = nr || (getTheme()?.rewards || []).slice(-1)[0];
  const rewardTile = el('button', {
    class: `tile tile--reward feature${nr ? ' is-locked' : ''}`, type: 'button', onclick: () => go('rewards'), style: { minHeight: '96px' },
  }, [
    el('div', { class: 'tile__figure' }, showReward ? [el('img', { src: themeAsset(showReward.art), alt: '' })] : []),
    el('div', { class: 'tile__body', style: { flex: '1' } }, [
      el('span', { class: 'tile__value', style: { fontSize: 'var(--fs-md)' }, text: nr ? nr.name : 'All collected!' }),
      el('span', { class: 'tile__label', text: nr ? `${nr.unlockAt - (l?.xp || 0)} XP to unlock` : 'You have every sticker' }),
      nr ? el('div', { class: 'meter meter--primary' }, [el('span', { style: { width: rewardPct + '%' } })]) : null,
    ]),
  ]);
  wrap.append(el('section', { class: 'today', 'aria-label': 'Today' }, [goalTile, streakTile, rewardTile]));

  // review + trail
  const pack = currentPack();
  const bookIds = pack ? pack.units.flatMap((u) => u.chapters.flatMap((c) => [...c.lessons.map((x) => x.id), ...(c.boss ? [bossId(c)] : [])])) : [];
  const done = bookIds.filter((id) => l?.lessonsDone?.[id]).length;
  const totalLessons = pack ? pack.units.reduce((n, u) => n + u.chapters.reduce((m, c) => m + c.lessons.length + (c.boss ? 1 : 0), 0), 0) : 0;
  const reviewCard = el('button', { class: 'feature', type: 'button', onclick: () => go('practice') }, [
    el('span', { class: 'feature__badge' }, [icon('practice', { size: 34 })]),
    el('span', {}, [
      el('span', { class: 'feature__title', text: due.length ? `${due.length} to try again` : 'No mistakes to fix' }),
      el('span', { class: 'feature__sub', text: due.length ? 'Questions you got wrong.' : 'Questions you get wrong wait here.' }),
    ]),
  ]);
  const trailCard = el('button', { class: 'feature', type: 'button', onclick: () => go('path') }, [
    next?.topicScene
      ? thumbImage(next)
      : el('span', { class: 'feature__badge' }, [icon('trail', { size: 34 })]),
    el('span', {}, [
      el('span', { class: 'feature__title', text: t('path') }),
      el('span', { class: 'feature__sub', text: `${done} of ${totalLessons} lessons done` }),
    ]),
  ]);
  wrap.append(el('section', { class: 'pair' }, [reviewCard, trailCard]));
  wrap.append(el('p', { class: 'footer-note', text: t('privacy') }));
  return wrap;
}

function screenPacks() {
  const wrap = el('div', { class: 'page screen' });
  wrap.append(el('h2', { class: 'section-title', text: t('choosePack') }));
  const list = el('div', { class: 'pair' });
  for (const pack of packs) {
    list.append(el('button', { class: 'feature', type: 'button', onclick: () => { router.packId = pack.id; go('path'); } }, [
      el('span', { class: 'feature__badge' }, [icon('book', { size: 34 })]),
      el('span', {}, [
        el('span', { class: 'feature__title', text: pack.title }),
        el('span', { class: 'feature__sub', text: `${pack.subject} · Class ${pack.grade}` }),
      ]),
    ]));
  }
  wrap.append(list);
  return wrap;
}

// --- screens ---------------------------------------------------------------

function nextLesson() {
  const l = activeLearner();
  const pack = currentPack();
  if (!pack) return null;
  for (const unit of pack.units) {
    for (const chapter of unit.chapters) {
      for (const lesson of chapter.lessons) {
        const rec = l.lessonsDone[lesson.id];
        if (!rec) return { ...lesson, packId: pack.id, unitId: unit.id, chapterId: chapter.id, lessonId: lesson.id };
      }
      if (chapter.boss && !l.lessonsDone[bossId(chapter)]) {
        return { ...chapter.boss, title: chapter.boss.title || t('bossChallenge'), packId: pack.id, unitId: unit.id, chapterId: chapter.id, lessonId: bossId(chapter), isBoss: true };
      }
    }
  }
  return null;
}

function screenPath() {
  const l = activeLearner();
  const pack = currentPack();
  const wrap = el('div', { class: 'page screen' });

  if (!pack) {
    wrap.append(el('div', { class: 'empty' }, [el('p', { text: 'No content packs installed yet.' })]));
    return wrap;
  }
  const tabs = subjectTabs(); if (tabs) wrap.append(tabs);
  wrap.append(el('h2', { class: 'section-title', text: pack.title }));
  wrap.append(el('p', { class: 'section-sub', text: 'Follow the path. Every lesson is a few minutes, and you can play any of them.' }));

  let currentMarked = false;
  let upNextShown = false;
  for (const unit of pack.units) {
    const items = [];
    for (const chapter of unit.chapters) {
      for (const lesson of chapter.lessons) items.push({ kind: 'lesson', lesson, chapter, id: lesson.id });
      if (chapter.boss) items.push({ kind: 'boss', lesson: chapter.boss, chapter, id: bossId(chapter) });
    }
    const doneCount = items.filter((x) => l.lessonsDone[x.id]).length;
    const unitIcon = getTheme()?.unitIcons?.[unit.id];

    const block = el('section', { class: 'unit-block' });
    block.append(el('div', { class: 'unit-head' }, [
      el('span', { class: 'unit-head__icon' }, [unitIcon ? el('img', { src: themeAsset(unitIcon), alt: '' }) : icon('book', { size: 34 })]),
      el('div', {}, [
        el('h3', { class: 'unit-head__name', text: unit.title }),
        el('span', { class: 'unit-head__meta', text: `${doneCount} of ${items.length} done` }),
      ]),
    ]));

    // A snake: left to right along a straight row, a U-turn down, right to left along the next row, and so on.
    // Every cell is 100 wide and CELL_H tall in SVG units, and the CSS cells keep the same proportions at any
    // window width, so the dotted line always runs through the middle of each badge.
    const COLS = window.innerWidth < 560 ? 3 : 4;
    const CELL_H = 160, BADGE_Y = 38, BULGE = 64;
    const rows = Math.ceil(items.length / COLS);
    const cellOf = (i) => {
      const row = Math.floor(i / COLS), k = i % COLS;
      return { row, col: row % 2 === 0 ? k : COLS - 1 - k };
    };
    const pts = items.map((_, i) => { const c = cellOf(i); return [c.col * 100 + 50, c.row * CELL_H + BADGE_Y]; });
    let d = pts.length ? `M${pts[0][0]} ${pts[0][1]}` : '';
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      if (y0 === y1) d += ` L${x1} ${y1}`;
      else { const out = x0 > COLS * 50 ? BULGE : -BULGE; d += ` C${x0 + out} ${y0} ${x1 + out} ${y1} ${x1} ${y1}`; }
    }
    const doneRun = items.findIndex((x) => !l.lessonsDone[x.id]);
    const reached = doneRun === -1 ? items.length - 1 : Math.max(0, doneRun);
    const path = el('div', { class: 'path', style: { '--cols': String(COLS) } });
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    line.setAttribute('class', 'path__line');
    line.setAttribute('viewBox', `0 0 ${COLS * 100} ${rows * CELL_H}`);
    line.setAttribute('preserveAspectRatio', 'none');
    line.setAttribute('aria-hidden', 'true');
    line.innerHTML = `<path class="path__rail" d="${d}"/><path class="path__done" pathLength="1" stroke-dasharray="${items.length > 1 ? (reached / (items.length - 1)).toFixed(4) : 0} 2" d="${d}"/>`;
    path.append(line);

    items.forEach((it, i) => {
      const rec = l.lessonsDone[it.id];
      const isCurrent = !rec && !currentMarked;
      if (isCurrent) currentMarked = true;
      const c = cellOf(i);
      path.append(trailNode(it, rec, isCurrent, c, pack, unit));
    });
    const body = el('div', { class: 'unit-body' }, [path]);
    const upNext = items.find((x) => !l.lessonsDone[x.id]);
    if (upNext && !upNextShown) {
      upNextShown = true;
      const lessonLike = { packId: pack.id };
      body.append(el('aside', { class: 'trail-side' }, [
        upNext.lesson.topicScene ? el('img', { class: 'trail-side__art', src: resolveMediaPath(upNext.lesson.topicScene, lessonLike), alt: upNext.lesson.sceneAlt || '' }) : null,
        el('div', { class: 'trail-side__body' }, [
          el('span', { class: 'trail-side__kicker', text: 'Up next' }),
          el('h3', { text: upNext.chapter.title }),
          upNext.chapter.summary ? el('p', { text: upNext.chapter.summary }) : null,
        ]),
      ]));
    } else {
      body.classList.add('unit-body--plain');
    }
    block.append(body);
    wrap.append(block);
  }
  return wrap;
}

const questionCount = (lesson) => lesson.activities.filter((a) => !['concept', 'hook', 'passage', 'media', 'funfact'].includes(a.type)).length;

function trailNode(it, rec, isCurrent, cell, pack, unit) {
  const boss = it.kind === 'boss';
  const title = boss ? (it.lesson.title || t('bossChallenge')) : it.lesson.title;
  const meta = boss
    ? `Chapter boss · ${questionCount(it.lesson)} questions`
    : `${it.lesson.estimatedMinutes || 4} ${t('minutes')} · ${questionCount(it.lesson)} questions`;
  const glyph = rec ? icon('check', { size: 40 }) : boss ? icon('crown', { size: 40 }) : isCurrent ? icon('play', { size: 44 }) : icon('star', { size: 40 });
  const node = el('button', {
    class: `node${rec ? ' node--done' : ''}${boss ? ' node--boss' : ''}${isCurrent ? ' node--current' : ''}`,
    type: 'button', style: { gridColumn: String(cell.col + 1), gridRow: String(cell.row + 1) },
    'aria-label': `${title}${rec ? ', done' : isCurrent ? ', next up' : ''}`,
  }, [
    el('span', { class: 'node__badge', 'aria-hidden': 'true' }, [glyph]),
    el('span', { class: 'node__body' }, [
      el('span', { class: 'node__title', text: title }),
      el('span', { class: 'node__meta', text: meta }),
    ]),
    isCurrent ? el('span', { class: 'node__start', 'aria-hidden': 'true', text: rec ? '' : t('start') }) : null,
  ]);
  node.addEventListener('click', () => startLesson({
    ...it.lesson, title, packId: pack.id, unitId: unit.id, chapterId: it.chapter.id, lessonId: it.id, isBoss: boss,
  }));
  return node;
}

// --- lesson player ---------------------------------------------------------

let session = null;

// Content packs store media as "media/thing.jpg" relative to the pack folder.
// Rewrite those to a URL the browser can actually load, without touching
// absolute paths or data URIs.
function resolveMediaPath(path, lesson) {
  // Resolve a pack-relative media path to a URL the browser can load.
  const pack = lesson?.packId ? packById(lesson.packId) : null;
  const base = pack?.base;
  if (!base || typeof path !== 'string') return path;
  if (/^(https?:|data:|blob:|\/)/.test(path)) return path;
  return `${base}/${path.replace(/^\.?\//, '')}`;
}

function resolveMedia(activity, lesson) {
  const pack = lesson?.packId ? packById(lesson.packId) : null;
  const base = pack?.base;
  if (!base || !activity) return activity;

  const fix = (path) => {
    if (typeof path !== 'string') return path;
    if (/^(https?:|data:|blob:|\/)/.test(path)) return path;
    return `${base}/${path.replace(/^\.?\//, '')}`;
  };

  const out = { ...activity };
  if (out.image) out.image = fix(out.image);
  if (out.src) out.src = fix(out.src);
  if (out.video?.src) out.video = { ...out.video, src: fix(out.video.src) };
  return out;
}

function startLesson(lesson) {
  router.backScreen = lesson.isPractice ? 'practice' : 'path';
  router.lesson = lesson;
  go('lesson');
}

function screenLesson() {
  const lesson = router.lesson;
  const wrap = el('div', { class: 'screen lesson' });
  // Before a chapter is taught: a few of its challenge questions, to see what the child already knows. Compared with the challenge
  // at the end, this is the before-and-after that shows whether Hooty taught anything. Trying before being taught helps too.
  let activities = lesson.activities || [];
  const learner = activeLearner();
  const inChapter = lesson.chapterId && /-l1$/.test(lesson.lessonId || lesson.id || '') && !lesson.isPractice
    ? packById(lesson.packId)?.units.flatMap((u) => u.chapters).find((c) => c.id === lesson.chapterId) : null;
  if (inChapter?.boss && learner && !learner.pre?.[lesson.chapterId]) {
    const pool = (inChapter.boss.activities || []).filter((a) => ['mcq', 'truefalse'].includes(a.type)).slice(0, 3);
    if (pool.length === 3) {
      learner.pre ||= {};
      activities = [{ type: 'hook', id: `${lesson.id}-prehook`, prompt: 'Three quick questions first, just to see what you already know. It is fine not to know yet!', explanation: '' },
        ...pool.map((a) => ({ ...a, id: `${a.id}-pre`, pre: true })), ...activities];
    }
  }

  // A fun fact halfway through, between two questions, and a different one on the finish screen. Replays show new ones.
  const facts = lesson.funFacts || [], plays = learner?.lessonsDone?.[lesson.lessonId]?.count || 0;
  if (facts.length && !lesson.isPractice && activities.length >= 6) {
    const mid = Math.floor(activities.length / 2);
    activities = [...activities.slice(0, mid), { type: 'funfact', id: `${lesson.id}-fact`, prompt: facts[plays % facts.length] }, ...activities.slice(mid)];
  }

  session = {
    lesson,
    queue: activities.slice(),
    index: 0,
    correct: 0,
    total: 0,
    wrongIds: [],
    startedAt: Date.now(),
    locked: false,
  };

  wrap.append(lessonBar(activities.length));

  // A picture of what this lesson is about, so the child sees the topic
  // before reading a word of it.
  // The picture and Hooty share one column, so on wide screens they scroll as one piece and can never overlap.
  const side = el('div', { class: 'lesson__side' });
  wrap.append(side);
  if (lesson.topicScene) {
    side.append(el('figure', { class: 'lesson__scene' }, [
      el('img', {
        class: `lesson__scene-img${/-diagram-[0-9a-f]+\.svg$/.test(lesson.topicScene) ? ' lesson__scene-img--diagram' : ''}`,
        src: resolveMediaPath(lesson.topicScene, lesson),
        alt: lesson.sceneAlt || '',
        loading: 'eager',
        decoding: 'async',
      }),
      lesson.sceneCaption || lesson.sceneCredit ? el('figcaption', { class: 'lesson__scene-cap' }, [
        lesson.sceneCaption ? el('span', { text: lesson.sceneCaption }) : null,
        lesson.sceneCredit ? (lesson.sceneCredit.url
          ? el('a', { class: 'credit-link', href: safeLink(lesson.sceneCredit.url), target: '_blank', rel: 'noopener noreferrer', text: `Picture: ${lesson.sceneCredit.text}` })
          : el('span', { class: 'credit-note', text: lesson.sceneCredit.text })) : null,
      ]) : null,
    ]));
  }

  const strip = el('div', { class: 'mascot-strip' });
  const mascotImg = el('img', { class: 'mascot-strip__img', src: mascotAvatar('idle'), alt: '', 'aria-hidden': 'true' });
  const bubble = el('div', { class: 'mascot-strip__bubble', text: lesson.title });
  strip.append(mascotImg, bubble);
  side.append(strip);

  const stage = el('div', { class: 'lesson__stage' });
  wrap.append(stage);

  // The comic recap sits at the bottom of the lesson. It is revealed once
  // the child finishes, so it works as a reward and a revision aid.
  if (lesson.comic) {
    const wide = resolveMediaPath(lesson.comic, lesson);
    const tall = resolveMediaPath(lesson.comic.replace(/\.svg$/, '-stack.svg'), lesson);
    // A four-panel row is unreadable on a phone, so the vertical version is
    // served there and the wide one everywhere else.
    const recap = el('figure', { class: 'lesson__comic', hidden: true }, [
      el('picture', {}, [
        el('source', { srcset: tall, media: '(max-width: 719px)' }),
        el('img', {
          class: 'lesson__comic-img',
          src: wide,
          alt: lesson.comicAlt || 'A comic strip recapping this lesson.',
          loading: 'eager',
          decoding: 'async',
        }),
      ]),
    ]);
    wrap.append(recap);
    session.recap = recap;
  }

  session.wrap = wrap;
  session.stage = stage;
  session.bubble = bubble;
  session.mascotImg = mascotImg;
  session.progressFill = wrap.querySelector('.lesson__progress span');
  session.progressText = wrap.querySelector('.lesson__count');

  setTimeout(() => renderActivity(), 30);
  return wrap;
}

function renderActivity() {
  const s = session;
  if (!s) return;
  // A computed Maths problem draws new numbers every time it is shown (core/gen.js); anything else comes back as it is.
  // A retry after a hint shows the very same question again, numbers and all; otherwise draw it afresh.
  const activity = s.retry ? s.retry.activity : realise(s.queue[s.index]);
  s.current = activity;   // feedback must explain THIS draw of the numbers, not the stored example
  stopSpeech();
  clear(s.stage);
  s.locked = false;
  // The last answer's "Yes!" or "Oops" belongs to that question only: Hooty goes back to her calm self.
  s.bubble.textContent = s.lesson.title;
  s.bubble.classList.remove('is-wrong');
  s.mascotImg.src = mascotAvatar('idle') || '';

  if (!activity) { renderCelebration(); return; }

  const mod = getActivityModule(activity.type);
  if (!mod) {
    s.stage.append(el('div', { class: 'empty', text: `Unknown activity type: ${activity.type}` }));
    return;
  }

  const rendered = mod.render(resolveMedia(activity, s.lesson), {
    locked: false,
    locale: getLocale(),
    mascot: mascotAvatar,
    markWords: (r) => markWords(r, { hint: false }),
    bookLang: packById(s.lesson.packId)?.language || 'en',
    progress: () => s.index / Math.max(1, s.queue.length),
    // Teaching cards can be stepped back through. A question already answered cannot be answered twice,
    // so Back stops at the first reading card after the last question.
    canGoBack: () => s.index > 0 && ['concept', 'hook', 'passage'].includes(s.queue[s.index - 1]?.type),
    startAtEnd: () => { const v = s.fromBack; s.fromBack = false; return v; },
    back: () => { s.fromBack = true; s.index -= 1; updateProgress(); renderActivity(); },
    say: (text) => speak(Array.isArray(text) ? text.map((p) => ({ ...p, text: plain(p.text) })) : plain(text), speechLang()),
    flash: (msg) => toast(msg),
    sfx: (k) => sound(k),
    matchFeedback: (good) => sound(good ? 'pair' : 'pairwrong'),
    submit: (response) => handleSubmit(rendered, response),
  });

  // Modules declare whether their activity is graded. Pass it through so the
  // player can tell a teaching card from a real question.
  rendered.graded = mod.graded !== false;

  // Tag the DOM node with the activity id so QA tools can tell one
  // activity apart from another.
  if (activity?.id) rendered.root.setAttribute('data-activity-id', activity.id);

  // render() may call submit synchronously for pair activities that auto-complete
  s.stage.append(rendered.root);
  if (!rendered.root.isConnected) s.stage.append(rendered.root);
  // A case study: the same short passage sits above each of its questions.
  if (activity.context) rendered.root.querySelector('.activity__prompt')?.before(el('div', { class: 'case-box' }, [
    el('p', { class: 'worked__kicker', text: bookWord(packById(s.lesson.packId)?.language, 'Read this first') }),
    el('p', { class: 'case-box__text', text: activity.context }),
  ]));
  // Warm-up problems come with a picture of the situation; harder ones show it afterwards, with the worked steps.
  if (activity.modelSpec && activity.type !== 'worked' && activity.difficulty === 1) {
    const m = renderModel(activity.modelSpec);
    if (m) rendered.root.querySelector('.activity__prompt')?.after(el('figure', { class: 'model-fig' }, [m]));
  }
  markWords(rendered.root);
  if (s.retry) applyHint(s, rendered.root, s.retry.hint);
  // Every new card starts at its top: a long passage leaves the page scrolled, and the next
  // card's picture and question would otherwise open half hidden under the header.
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function handleSubmit(rendered, response) {
  const s = session;
  if (!s || s.locked) return;
  s.locked = true;
  const activity = s.current || s.queue[s.index];
  const correct = rendered.check(response);

  // Ungraded activities (concept cards, flashcards, media) teach rather than
  // test. They must not count towards accuracy or create review cards, and
  // they show their own explanation on the card, so just move on.
  if (rendered.graded === false) {
    advance();
    return;
  }

  if (activity.pre) {      // a look at what is already known: no score, no XP, no review card
    const lp = activeLearner();
    const rec = (lp.pre[s.lesson.chapterId] ||= { n: 0, c: 0 });
    rec.n += 1; if (correct) rec.c += 1;
    sound(correct ? 'pair' : 'pairwrong');
    showFeedback(s, activity, correct, response);
    persist();
    return;
  }

  // The second go after a hint. The first miss is already counted and the question is already in Practise; a right
  // answer now earns half the points, and either way the full explanation follows.
  if (s.retry) {
    s.retry = null;
    if (correct) addXP(5);
    react(s, correct);
    showFeedback(s, activity, correct, response);
    persist();
    return;
  }

  // A first miss on a question with a fair hint: count the mistake, then offer one more go with the hint.
  const hint = correct ? null : hintFor(activity, response);
  if (hint) {
    s.total += 1;
    s.wrongIds.push(activity.id);
    recordActivity({ ...activity, lessonId: s.lesson.lessonId }, false);
    react(s, false);
    showHint(s, activity, hint);
    persist();
    return;
  }

  s.total += 1;
  if (correct) s.correct += 1;
  else s.wrongIds.push(activity.id);

  recordActivity({ ...activity, lessonId: s.lesson.lessonId }, correct);

  const l = activeLearner();
  if (correct) {
    addXP(10);
    s.bubble.textContent = themeCopy('correct', 'correct', t('correct'));
    s.bubble.classList.remove('is-wrong');
    s.mascotImg.src = mascotAvatar('happy') || '';
    s.mascotImg.classList.add('is-happy');
    s.streak = (s.streak || 0) + 1;
    sound('correct', s.streak);
    sparkle(s.wrap);
  } else {
    s.bubble.textContent = themeCopy('wrong', 'wrong', t('wrong'));
    s.bubble.classList.add('is-wrong');
    s.mascotImg.src = mascotAvatar('wrong') || '';
    s.mascotImg.classList.add('is-wrong');
    s.streak = 0;
    sound('wrong');
  }
  setTimeout(() => {
    s.mascotImg.classList.remove('is-happy', 'is-wrong');
  }, 700);

  showFeedback(s, activity, correct, response);

  persist();
}

function advance() {
  const s = session;
  if (!s) return;
  s.retry = null;
  s.index += 1;

  // A wrong item comes back later in the same session, once.
  if (s.index === Math.ceil(s.queue.length / 2) && s.wrongIds.length && !s.requeued) {
    s.requeued = true;
    const requeue = s.queue.filter((a) => s.wrongIds.includes(a.id)).slice(0, 2);
    s.queue.splice(s.index, 0, ...requeue);
  }

  updateProgress();
  if (s.index >= s.queue.length) {
    renderCelebration();
  } else {
    renderActivity();
  }
}

function updateProgress() {
  const s = session;
  const pct = Math.round((s.index / s.queue.length) * 100);
  s.progressFill.style.width = pct + '%';
  s.progressText.textContent = `${s.index}/${s.queue.length}`;
  if (pct >= 50 && !s.halfway) { s.halfway = true; sound('halfway'); }
}

// After a lesson: how far through the chapter the child is, and where to read this in the real book.
function finishedNotes(lesson) {
  const out = [];
  const l = activeLearner();
  const pack = lesson.packId ? packById(lesson.packId) : null;
  const chapter = pack?.units.flatMap((u) => u.chapters).find((c) => c.id === lesson.chapterId);
  if (chapter && l) {
    const ids = [...chapter.lessons.map((x) => x.id), ...(chapter.boss ? [bossId(chapter)] : [])];
    const done = ids.filter((id) => l.lessonsDone[id]).length;
    out.push(el('div', { class: 'finished' }, [
      el('b', { text: done === ids.length ? `You finished the whole chapter: ${chapter.title}!` : `${done} of ${ids.length} steps finished in this chapter` }),
      el('div', { class: 'finished__bar' }, [el('span', { style: { width: `${Math.round((done / ids.length) * 100)}%` } })]),
    ]));
  }
  const pages = new Map();
  for (const a of lesson.activities || []) for (const x of a.src || []) { const arr = pages.get(x.ch) || []; arr.push(x.p); pages.set(x.ch, arr); }
  if (pages.size && !lesson.isPractice) {
    const [ch, ps] = [...pages.entries()][0];
    const lo = Math.min(...ps), hi = Math.max(...ps);
    out.push(el('p', { class: 'in-book', text: `Read it in your book: ${chapter?.title || `Chapter ${ch}`}, ${lo === hi ? 'page ' + lo : `pages ${lo} to ${hi}`}.` }));
  }
  return out;
}

function renderCelebration() {
  const s = session;
  const l = activeLearner();
  const accuracy = s.total ? Math.round((s.correct / s.total) * 100) : 0;
  const minutes = Math.max(1, Math.round((Date.now() - s.startedAt) / 60000));

  touchStreak();
  if (l) {
    l.secondsLearned = (l.secondsLearned || 0) + Math.round((Date.now() - s.startedAt) / 1000);
  }
  if (!s.lesson.isPractice) recordLesson(s.lesson.lessonId, accuracy);
  if (s.lesson.isFix && l) {
    l.practiceDay = todayKey();
    for (const a of s.lesson.activities) { const c = l.cards[a.cardId]; if (c && isMistake(c)) c.due = Date.now() + 86400000; }
  }
  if (s.lesson.isBoss && s.lesson.chapterId && l) { l.post ||= {}; l.post[s.lesson.chapterId] ||= { pct: accuracy, title: packById(s.lesson.packId)?.units.flatMap((u) => u.chapters).find((c) => c.id === s.lesson.chapterId)?.title || '' }; }
  const xpGained = s.correct * 10;
  addXP(0);

  // unlock any themed rewards the child has earned
  const unlocked = [];
  for (const r of getTheme()?.rewards || []) {
    if ((l?.xp || 0) >= (r.unlockAt || 0) && unlockReward(r.id)) unlocked.push(r);
  }

  // The celebration brings its own Hooty: drop the topic picture and the speech strip so nothing from the last question lingers.
  s.wrap?.classList.add('is-finished');

  const praise = accuracy >= 90 ? 'Brilliant work!' : accuracy >= 60 ? 'Well done!' : 'Good effort. Practice makes it stick.';
  const box = el('div', { class: 'celebrate' }, [
    el('img', { class: 'celebrate__art', src: mascotImage(accuracy >= 60 ? 'happy' : 'idle') || '', alt: '' }),
    el('h2', { class: 'celebrate__title', text: s.lesson.isFix ? 'Practice complete!' : s.lesson.isPractice ? t('practiceDone') : (getTheme()?.copy?.celebrateTitle || t('lessonComplete')) }),
    el('div', { class: 'xp-pill' }, [icon('star', { size: 26 }), `+${xpGained} ${t('xp')}`]),
    el('p', { class: 'celebrate__body', text: praise }),
    el('div', { class: 'celebrate__stats' }, [
      el('div', { class: 'celebrate__stat' }, [el('b', { text: `${s.correct}/${s.total}` }), el('span', { text: 'correct' })]),
      el('div', { class: 'celebrate__stat' }, [el('b', { text: `${accuracy}%` }), el('span', { text: t('accurate') })]),
      el('div', { class: 'celebrate__stat' }, [el('b', { text: `${minutes}m` }), el('span', { text: 'time' })]),
    ]),
  ]);

  const facts = s.lesson.funFacts || [];
  if (facts.length) {
    const plays = l?.lessonsDone?.[s.lesson.lessonId]?.count || 1;
    box.append(el('p', { class: 'fun-fact' }, [el('b', { text: `${bookWord(packById(s.lesson.packId)?.language, 'Did you know?')} ` }), facts[plays % facts.length]]));
  }
  box.append(...finishedNotes(s.lesson));

  for (const r of unlocked) {
    box.append(el('div', { class: 'unlock' }, [
      el('img', { src: themeAsset(r.art), alt: '' }),
      el('div', {}, [el('b', { text: r.name }), el('span', { text: t('rewardUnlocked') })]),
    ]));
  }

  // Keep the momentum: the very next lesson is one tap away, so finishing is not a place to stop.
  const upNext = s.lesson.isPractice && !s.lesson.isFix ? null : nextLesson();
  // Maths with generated problems: as many fresh rounds as the child wants, with new numbers each time.
  const gens = (s.lesson.activities || []).filter((a) => a.gen);
  const more = gens.length >= 3 ? el('button', { class: `btn${upNext ? ' btn--ghost' : ''} btn--block`, type: 'button', onclick: () => {
    const pool = gens.slice().sort(() => Math.random() - 0.5).slice(0, 6).sort((x, y) => (x.difficulty || 2) - (y.difficulty || 2));
    session = null;
    startLesson({ id: 'more-' + Date.now(), lessonId: 'practice', title: s.lesson.title, activities: pool, estimatedMinutes: 3, isPractice: true, topicScene: s.lesson.topicScene, sceneAlt: s.lesson.sceneAlt, sceneCredit: s.lesson.sceneCredit, sceneCaption: s.lesson.sceneCaption, packId: s.lesson.packId });
  } }, [t('moreProblems')]) : null;
  // A hard lesson (under 60% right first time): the strongest next step is a short round of just the questions missed,
  // so that is the main button. Maths problems come back with new numbers. Moving on stays one tap away.
  const missed = s.lesson.isPractice ? [] : (s.lesson.activities || []).filter((a, i, all) => s.wrongIds.includes(a.id) && all.findIndex((b) => b.id === a.id) === i);
  const replay = accuracy < 60 && missed.length ? el('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: () => {
    session = null;
    startLesson({ id: 'replay-' + Date.now(), lessonId: 'practice', title: s.lesson.title, activities: missed, estimatedMinutes: Math.max(1, Math.round(missed.length / 2)), isPractice: true, packId: s.lesson.packId, topicScene: s.lesson.topicScene, sceneAlt: s.lesson.sceneAlt });
  } }, [missed.length === 1 ? 'Try the one you missed' : `Try the ${missed.length} you missed`]) : null;
  if (replay) box.querySelector('.celebrate__body').textContent = 'Good effort! Have another go at the ones that were tricky, and they will stick.';
  box.append(el('div', { class: 'activity__actions' }, [
    replay,
    upNext ? el('button', { class: `btn${replay ? ' btn--ghost' : ' btn--primary'} btn--block`, type: 'button', onclick: () => { session = null; startLesson(upNext); } }, [
      el('span', { text: `${t('nextLesson')}: ${upNext.title}` }),
    ]) : null,
    more,
    el('button', { class: `btn${upNext || more || replay ? ' btn--ghost' : ''} btn--block`, type: 'button', text: t('backHome'), onclick: () => { session = null; go('home'); } }),
    el('button', { class: 'btn btn--ghost btn--block', type: 'button', text: t('path'), onclick: () => { session = null; go('path'); } }),
  ]));

  clear(s.stage);
  s.stage.append(box);
  window.scrollTo(0, 0);
  s.progressFill.style.width = '100%';
  s.progressText.textContent = `${s.queue.length}/${s.queue.length}`;

  // Reveal the comic recap now the lesson is done, so the child can read the
  // story of what they just learned.
  if (s.recap) {
    s.recap.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const cs = getComputedStyle(document.documentElement);
  confetti(app, ['--primary', '--secondary', '--success', '--primary-edge'].map((v) => cs.getPropertyValue(v).trim()).filter(Boolean));
  sound('win');
  if (xpGained > 0) setTimeout(() => sound('coin'), 700);
  if (unlocked.length) setTimeout(() => sound('unlock'), 1500);
  persist();
}

// --- practice weak spots ---------------------------------------------------

function lessonBar(count) {
  return el('div', { class: 'lesson__bar' }, [
    el('button', {
      class: 'icon-btn', type: 'button', 'aria-label': 'Leave lesson',
      onclick: () => { session = null; go(router.backScreen || 'home'); },
    }, [icon('close')]),
    el('div', { class: 'lesson__progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, [el('span', { style: { width: '0%' } })]),
    el('div', { class: 'lesson__count', text: `0/${count}` }),
    highlightToggle(),
  ]);
}

// Marker-pen button: switches key-word highlighting on or off without leaving the lesson.
function highlightToggle() {
  const l = activeLearner();
  const on = () => document.body.classList.contains('hl-on');
  const b = el('button', { class: 'icon-btn icon-btn--hl', type: 'button', 'aria-label': 'Highlight key words', 'aria-pressed': String(on()) }, [icon('highlight')]);
  b.addEventListener('click', async () => {
    const v = !on();
    document.body.classList.toggle('hl-on', v);
    b.setAttribute('aria-pressed', String(v));
    if (l) { l.highlight = v; await persist(); }
    toast(v ? 'Key words are highlighted.' : 'Highlighting is off.', 1600);
  });
  return b;
}

// Hooty's face, words and sound for an answer (the full feedback sheet is separate).
function react(s, correct) {
  if (correct) {
    s.bubble.textContent = themeCopy('correct', 'correct', t('correct'));
    s.bubble.classList.remove('is-wrong');
    s.mascotImg.src = mascotAvatar('happy') || '';
    s.mascotImg.classList.add('is-happy');
    sound('correct', 1);
    sparkle(s.wrap);
  } else {
    s.bubble.textContent = themeCopy('wrong', 'wrong', t('wrong'));
    s.bubble.classList.add('is-wrong');
    s.mascotImg.src = mascotAvatar('wrong') || '';
    s.mascotImg.classList.add('is-wrong');
    s.streak = 0;
    sound('wrong');
  }
  setTimeout(() => s.mascotImg.classList.remove('is-happy', 'is-wrong'), 700);
}

// A hint for one more go, made by code from the question itself, or null when a second go would only be a guess
// (true or false, two choices) or no fair hint exists. Returns { text, out: option numbers to cross out }.
function hintFor(activity, response = {}) {
  const type = activity.type;
  if ((type === 'mcq' || type === 'listenpick') && Array.isArray(activity.options) && activity.options.length >= 3) {
    const out = [response.choice];
    if (activity.options.length >= 4) {
      const other = activity.options.map((_, i) => i).find((i) => i !== activity.answer && i !== response.choice);
      if (other != null) out.push(other);
    }
    const why = activity.why?.[activity.options[response.choice]];
    return { text: why || `Not that one. ${out.length > 1 ? 'Two wrong answers are crossed out' : 'It is crossed out'}, so think again about what the question asks.`, out };
  }
  if (type === 'fillblank' || type === 'typeanswer') {
    if (activity.steps?.length) return { text: `First step: ${activity.steps[0]}` };
    const a = String((activity.answers || [])[0] ?? '').trim();
    if (!a) return null;
    if (/^-?\d+$/.test(a)) {
      const n = Number(a), digits = String(Math.abs(n)).length, step = Math.max(5, 10 ** (digits - 1)), lo = Math.floor(n / step) * step;
      return { text: `The answer is a whole number between ${lo} and ${lo + step}.` };
    }
    if (/^-?[\d./]+$/.test(a)) return null;
    const words = a.split(/\s+/);
    return { text: words.length > 1 ? `The answer is ${words.length} words and begins with "${a[0].toUpperCase()}".` : `The answer begins with "${a[0].toUpperCase()}" and has ${a.length} letters.` };
  }
  if (type === 'dragorder' && activity.items?.length > 2) return { text: `Start with "${activity.items[0]}".` };
  return null;
}

function showHint(s, activity, hint) {
  const sheet = el('div', { class: 'sheet sheet--hint', role: 'status' }, [
    el('div', { class: 'sheet__head' }, [el('span', { class: 'sheet__mark' }, [icon('cross')]), el('h3', { class: 'sheet__title', text: 'Not quite. Have another go!' })]),
    el('p', { class: 'sheet__body', text: hint.text }),
  ]);
  const again = el('button', { class: 'btn btn--primary btn--block', type: 'button', text: 'Try again' });
  again.addEventListener('click', () => { s.retry = { activity, hint }; renderActivity(); });
  sheet.append(el('div', { class: 'activity__actions' }, [again]));
  s.stage.append(sheet);
  markWords(sheet);
  again.focus({ preventScroll: true });
  requestAnimationFrame(() => sheet.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
}

// On the second go: cross out the ruled-out choices and keep the hint in view above the question.
function applyHint(s, root, hint) {
  for (const i of hint.out || []) {
    const b = root.querySelector(`.option[data-choice="${i}"]`);
    if (b) { b.disabled = true; b.classList.add('option--out'); b.setAttribute('aria-label', `${b.textContent} (ruled out)`); }
  }
  root.querySelector('.activity__prompt')?.after(el('p', { class: 'hint-note', role: 'note' }, [el('b', { text: 'Hint: ' }), hint.text]));
  s.bubble.textContent = 'Have another go!';
}

function showFeedback(s, activity, correct, response = {}) {
  const l = activeLearner();
  // A wrong answer teaches: say what that particular mistake usually is, then walk through the solution with a picture.
  const slip = !correct && activity.why && activity.options ? activity.why[activity.options[response.choice]] : '';
  const steps = !correct && activity.steps?.length ? activity.steps : null;
  const model = !correct && activity.modelSpec ? renderModel(activity.modelSpec) : null;
  const sheet = el('div', { class: `sheet sheet--${correct ? 'correct' : 'wrong'}`, role: 'status' }, [
    el('div', { class: 'sheet__head' }, [
      el('span', { class: 'sheet__mark' }, [icon(correct ? 'check' : 'cross')]),
      el('h3', { class: 'sheet__title', text: correct ? t('correct') : t('wrong') }),
    ]),
    slip ? el('p', { class: 'sheet__why', text: slip }) : null,
    model ? el('figure', { class: 'model-fig' }, [model]) : null,
    steps ? el('ol', { class: 'sheet__steps' }, steps.map((x) => el('li', { text: x })))
      : (activity.explanation ? el('p', { class: 'sheet__body', text: activity.explanation }) : null),
  ]);
  const cont = el('button', { class: 'btn btn--primary btn--block', type: 'button', text: correct ? t('keepGoing') : t('next') });
  cont.addEventListener('click', advance);
  sheet.append(el('div', { class: 'activity__actions' }, [cont]));
  s.stage.append(sheet);
  markWords(sheet);
  cont.focus({ preventScroll: true });
  requestAnimationFrame(() => sheet.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
}

function screenPractice() {
  const l = activeLearner();
  const wrap = el('div', { class: 'page screen' });
  const picked = practiceSet(10);
  if (picked.length) {
    const start = el('button', { class: 'btn big-cta', type: 'button', style: { width: '100%', maxWidth: '420px' } }, [
      el('span', { class: 'big-cta__play' }, [icon('play', { size: 24 })]),
      el('span', { class: 'big-cta__text' }, [el('span', { class: 'big-cta__label', text: t('startReview', { n: picked.length }) })]),
    ]);
    start.addEventListener('click', () => {
      startLesson({ id: 'practice-' + Date.now(), lessonId: 'practice', title: t('practiseTab'), activities: picked, estimatedMinutes: 3, isPractice: true, isFix: true });
    });
    wrap.append(el('section', { class: 'review-card' }, [
      el('span', { class: 'review-card__count', text: String(picked.length) }),
      el('p', { class: 'review-card__label', text: picked.length === 1 ? 'question you got wrong. Try it again.' : 'questions you got wrong. Try them again.' }),
      start,
    ]));
    return wrap;
  }

  const finished = l?.practiceDay === todayKey();
  const later = Object.values(l?.cards || {}).filter(isMistake).length;
  const mascot = mascotImage('happy');
  const next = nextLesson();
  const quiz = quickQuiz(5);
  wrap.append(el('div', { class: 'empty' }, [
    mascot ? el('img', { src: mascot, alt: '' }) : null,
    el('h3', { text: finished ? 'Practice complete!' : 'No mistakes to fix' }),
    el('p', { text: later ? `${later === 1 ? '1 tricky question comes' : `${later} tricky questions come`} back tomorrow. What next?`
      : finished ? 'You fixed all your mistakes. What next?' : 'Any question you get wrong will wait for you here.' }),
    el('div', { class: 'empty__next' }, [
      next ? el('button', { class: 'btn btn--primary', type: 'button', onclick: () => startLesson(next) }, [`${t('nextLesson')}: ${next.title}`]) : null,
      quiz.length >= 3 ? el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => startLesson({ id: 'quiz-' + Date.now(), lessonId: 'practice', title: 'Quick quiz', activities: quiz, estimatedMinutes: 2, isPractice: true }) }, [`Quick quiz: ${quiz.length} questions you know`]) : null,
    ]),
  ]));
  return wrap;
}

// --- a family's own textbook ------------------------------------------------

function screenAddBook() {
  const wrap = el('div', { class: 'page screen addbook' });
  const input = el('input', { class: 'addbook__file', type: 'file', accept: 'application/pdf,.pdf', multiple: true, id: 'book-file' });
  const name = el('input', { class: 'text-input', type: 'text', maxlength: 60, placeholder: 'Book name, like Science Class 5', 'aria-label': 'Book name' });
  const status = el('p', { class: 'addbook__status', role: 'status' });
  const bar = el('span');
  const meter = el('div', { class: 'finished__bar', hidden: true }, [bar]);
  const go2 = el('button', { class: 'btn btn--primary btn--block', type: 'button', disabled: true }, ['Make my lessons']);
  const WHY = {
    'no-text': 'This PDF looks like photos of pages, with no text inside. Hooty needs a PDF whose words you can select.',
    unreadable: 'The words in this PDF are stored in an old font code, so they come out as nonsense. Try a newer copy of the book.',
    'no-lessons': 'Hooty could not find enough lessons in this PDF. Is it a textbook, and not an answer key or a workbook?',
  };
  input.addEventListener('change', () => {
    go2.disabled = !input.files.length;
    if (input.files.length && !name.value) name.value = input.files[0].name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').slice(0, 60);
  });
  go2.addEventListener('click', async () => {
    const files = [...input.files];
    if (files.reduce((n, f) => n + f.size, 0) > 400 * 1048576) { status.textContent = 'That is too big for this device. Try one PDF at a time.'; return; }
    go2.disabled = true; meter.hidden = false; status.textContent = 'Reading your book…';
    try {
      const { readPdf, makeBook } = await import('./core/bookmaker.js');
      const docs = await readPdf(files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })), (f) => { bar.style.width = `${Math.round(f * 100)}%`; });
      status.textContent = 'Making your lessons…';
      await new Promise((r) => setTimeout(r, 30));
      const pack = makeBook(docs, { title: name.value.trim() || 'My book' });
      await saveBook(pack);
      const card = { id: pack.id, title: pack.title, subject: pack.subject, grade: 'mine', language: pack.language, description: pack.description, local: true };
      packIndex = [...packIndex, card];
      loadedGrades.delete('mine');
      addPacks([{ ...pack, base: '', glossary: pack.glossaryData, matcher: buildMatcher(pack.glossaryData) }]);
      const l = activeLearner(); if (l) { l.grade = 'mine'; l.packId = pack.id; await persist(); }
      router.packId = pack.id;
      sound('next');
      go('path');
    } catch (e) {
      console.warn('book failed', e);
      status.textContent = WHY[e.code] || (e.name === 'PasswordException' ? 'This PDF is locked with a password.' : 'Hooty could not read this file. Is it a PDF?');
      go2.disabled = false; meter.hidden = true;
    }
  });
  wrap.append(el('section', { class: 'addbook__card' }, [
    el('h2', { class: 'section-title', text: 'Turn your textbook into lessons' }),
    el('p', { text: 'Choose the PDF of a school book. One file for the whole book, or one for each chapter. It stays on this device: nothing is uploaded.' }),
    el('label', { class: 'btn btn--ghost btn--block', for: 'book-file', text: 'Choose PDF' }),
    input, name, go2, meter, status,
    el('p', { class: 'credit-note', text: 'Hooty makes reading cards and questions using the words printed in your book, with the page for each. Use books you have the right to use.' }),
  ]));
  const own = packIndex.filter((p) => p.local);
  if (own.length) wrap.append(el('section', { class: 'addbook__card' }, [
    el('h3', { text: 'My books' }),
    ...own.map((b) => el('div', { class: 'addbook__row' }, [
      el('span', { text: b.title }),
      el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: async () => {
        if (!confirm(`Remove ${b.title} from this device?`)) return;
        await deleteBook(b.id);
        packIndex = packIndex.filter((p) => p.id !== b.id); packs = packs.filter((p) => p.id !== b.id);
        const l = activeLearner(); if (l?.grade === 'mine' && !packIndex.some((p) => p.local)) l.grade = '6';
        render();
      } }, ['Remove']),
    ])),
  ]));
  return wrap;
}

// --- rewards and worlds ----------------------------------------------------

// The sticker board: earned stickers can be put anywhere on the child's chosen world, moved with a finger and kept.
// Saved on the learner as 'id@x,y' strings, x and y in percent of the board.
const parseBoard = (l) => (l?.board || []).map((b) => { const m = /^([\w-]+)@(\d+),(\d+)$/.exec(b); return m ? { id: m[1], x: +m[2], y: +m[3] } : null; }).filter(Boolean);
function stickerBoard(l, rewards) {
  const owned = rewards.filter((r) => l?.rewards?.includes(r.id)), byId = Object.fromEntries(owned.map((r) => [r.id, r]));
  let items = parseBoard(l).filter((i) => byId[i.id]), selected = -1;
  const save = async () => { if (l) { l.board = items.map((i) => `${i.id}@${Math.round(i.x)},${Math.round(i.y)}`); await persist(); } };
  const stage = el('div', { class: 'board__stage', role: 'group', 'aria-label': 'Sticker board' });
  const removeBtn = el('button', { class: 'btn btn--ghost', type: 'button', hidden: true, onclick: async () => { if (selected >= 0) { items.splice(selected, 1); selected = -1; await save(); draw(); } } }, ['Take it off']);
  const clearBtn = el('button', { class: 'btn btn--ghost', type: 'button', onclick: async () => { items = []; selected = -1; await save(); draw(); } }, ['Clear the board']);
  const hint = el('p', { class: 'section-sub' });
  const draw = () => {
    clear(stage);
    items.forEach((it, i) => {
      const node = el('img', { class: `board__sticker${i === selected ? ' is-selected' : ''}`, src: themeAsset(byId[it.id].art), alt: byId[it.id].name, draggable: 'false', style: { left: it.x + '%', top: it.y + '%' } });
      node.addEventListener('pointerdown', (e) => {
        e.preventDefault(); node.setPointerCapture(e.pointerId);
        const box = stage.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, sx = it.x, sy = it.y; let moved = false;
        const move = (ev) => {
          if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 5) moved = true;
          if (!moved) return;
          it.x = Math.min(96, Math.max(4, sx + ((ev.clientX - x0) / box.width) * 100)); it.y = Math.min(94, Math.max(6, sy + ((ev.clientY - y0) / box.height) * 100));
          node.style.left = it.x + '%'; node.style.top = it.y + '%';
        };
        const up = async () => {
          node.removeEventListener('pointermove', move); node.removeEventListener('pointerup', up); node.removeEventListener('pointercancel', up);
          if (moved) { items.push(items.splice(i, 1)[0]); selected = -1; await save(); draw(); sound('tap'); }
          else { selected = selected === i ? -1 : i; draw(); }
        };
        node.addEventListener('pointermove', move); node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up);
      });
      stage.append(node);
    });
    removeBtn.hidden = selected < 0; clearBtn.hidden = !items.length;
    hint.textContent = !owned.length ? 'Collect a sticker and you can stick it here.' : !items.length ? 'Tap a sticker below to stick it on the board.' : 'Drag a sticker to move it. Tap one to take it off.';
  };
  const tray = el('div', { class: 'board__tray' }, owned.map((r) => el('button', {
    class: 'board__pick', type: 'button', 'aria-label': `Stick ${r.name}`,
    onclick: async () => { if (items.length >= 40) { toast('The board is full. Take a sticker off first.'); return; } items.push({ id: r.id, x: 25 + Math.random() * 50, y: 25 + Math.random() * 50 }); selected = -1; sound('tap'); await save(); draw(); },
  }, [el('img', { src: themeAsset(r.art), alt: '' })])));
  draw();
  return el('section', { class: 'board' }, [el('h2', { class: 'section-title', text: 'Your sticker board' }), hint, stage, owned.length ? tray : null, el('div', { class: 'board__actions' }, [removeBtn, clearBtn])]);
}

function screenRewards() {
  const l = activeLearner();
  const wrap = el('div', { class: 'page screen' });
  const rewards = getTheme()?.rewards || [];
  const owned = rewards.filter((r) => l?.rewards?.includes(r.id)).length;

  wrap.append(el('h2', { class: 'section-title', text: t('stickers') }));
  wrap.append(el('p', { class: 'section-sub', text: `${owned} of ${rewards.length} collected. Earn XP by answering questions to unlock the next one.` }));
  const grid = el('div', { class: 'reward-grid' });
  for (const r of rewards) {
    const got = l?.rewards?.includes(r.id);
    grid.append(el('div', { class: `reward${got ? '' : ' is-locked'}` }, [
      el('img', { class: 'reward__art', src: themeAsset(r.art), alt: got ? r.name : '' }),
      el('span', { class: 'reward__name', text: got ? r.name : '???' }),
      el('span', { class: 'reward__need', text: got ? 'Collected' : `${r.unlockAt} XP` }),
    ]));
  }
  wrap.append(grid);
  wrap.append(stickerBoard(l, rewards));

  wrap.append(el('h2', { class: 'section-title', text: t('chooseTheme') }));
  wrap.append(el('p', { class: 'section-sub', text: t('chooseThemeSub') }));
  const themeGrid = el('div', { class: 'theme-grid' });
  for (const theme of themes) {
    const active = theme.id === currentThemeId;
    themeGrid.append(el('button', {
      class: `theme-card${active ? ' is-active' : ''}`, type: 'button', 'aria-pressed': String(active),
      onclick: () => setTheme(theme.id),
    }, [
      el('img', { class: 'theme-card__art', src: assetFor(theme, currentGuide() === 'hooty' && theme.heroHooty ? theme.heroHooty : theme.preview || theme.hero), alt: '' }),
      el('div', { class: 'theme-card__body' }, [
        el('div', { class: 'theme-card__text' }, [
          el('div', { class: 'theme-card__name', text: theme.name }),
          el('div', { class: 'theme-card__desc', text: theme.description || '' }),
        ]),
        active ? el('span', { class: 'theme-card__tick' }, [icon('check', { size: 20 })]) : null,
      ]),
    ]));
  }
  wrap.append(themeGrid);
  return wrap;
}

function screenThemes() { return screenRewards(); }

// --- parent view -----------------------------------------------------------

function screenParent() {
  const l = activeLearner();
  const wrap = el('div', { class: 'page screen' });
  wrap.append(el('div', { class: 'privacy-note', style: { marginTop: 'var(--s2)' } }, [icon('lock', { size: 22 }), 'All data stays on this device. Nothing is sent anywhere.']));

  const stats = Object.values(l?.activityStats || {});
  const totalAttempts = stats.reduce((a, s) => a + s.seen, 0);
  const totalCorrect = stats.reduce((a, s) => a + s.correct, 0);
  const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const secs = l?.secondsLearned || 0;
  const minutes = secs ? Math.max(1, Math.round(secs / 60)) : 0; // any time at all reads as at least 1m, never 0m

  const goal = l?.dailyGoal || 50;
  const goalPct = Math.min(100, Math.round(((l?.dailyXp || 0) / goal) * 100));
  wrap.append(el('div', { class: 'stat-grid' }, [
    statCard(`${l?.dailyXp || 0}/${goal}`, t('goal'), goalPct),
    statCard(String(l?.streak || 0), t('streak'), undefined, `Best: ${l?.bestStreak || 0}`),
    statCard(`${accuracy}%`, t('accurate')),
    statCard(`${minutes}m`, t('timeLearned')),
    statCard(String(Object.keys(l?.lessonsDone || {}).length), 'Lessons done'),
    statCard(String(totalAttempts), t('attempts')),
  ]));

  wrap.append(weekStrip(l));

  // The honest measure: of the questions missed on the first try and tried again, how many does the child now get right?
  const retried = stats.filter((x) => x.first === false && x.seen > 1);
  const fixed = retried.filter((x) => x.last).length;
  const pairs = Object.entries(l?.post || {}).filter(([id]) => l?.pre?.[id]?.n);
  if (pairs.length) wrap.append(el('section', { class: 'growth-card' }, [
    el('h3', { class: 'section-title', text: 'Before and after each chapter' }),
    el('ul', { class: 'growth-list' }, pairs.map(([id, p]) => el('li', { text: `${p.title}: ${Math.round((100 * l.pre[id].c) / l.pre[id].n)}% before, ${p.pct}% on the chapter challenge` }))),
    el('p', { class: 'growth-note', text: 'A small sample of questions, so treat this as a guide, not a grade.' }),
  ]));
  wrap.append(el('section', { class: 'growth-card' }, [
    el('h3', { class: 'section-title', text: 'Is it sticking?' }),
    el('p', { text: retried.length
      ? `Of ${retried.length} question${retried.length === 1 ? '' : 's'} missed the first time and tried again, ${fixed} ${fixed === 1 ? 'is' : 'are'} now right.`
      : 'Questions missed the first time come back later. This will show how many are now right.' }),
  ]));

  wrap.append(el('h3', { class: 'section-title', text: t('progressByUnit') }));
  const list = el('div', { class: 'unit-list' });
  for (const pack of gradePacks()) {
    for (const unit of pack.units) {
      let total = 0, done = 0;
      for (const chapter of unit.chapters) {
        const ids = [...(chapter.lessons || []).map((x) => x.id), ...(chapter.boss ? [bossId(chapter)] : [])];
        total += ids.length;
        done += ids.filter((id) => l?.lessonsDone?.[id]).length;
      }
      const pct = total ? Math.round((done / total) * 100) : 0;
      list.append(el('div', { class: 'unit-row' }, [
        el('span', { class: 'unit-row__name', text: unit.title }),
        el('div', { class: 'meter', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' }, [el('span', { style: { width: pct + '%' } })]),
        el('span', { class: 'unit-row__pct', text: `${done}/${total}` }),
      ]));
    }
  }
  wrap.append(list);

  wrap.append(el('h3', { class: 'section-title', text: t('weakSpots') }));
  const weak = weakSpots(10);
  if (!weak.length) {
    wrap.append(el('div', { class: 'empty' }, [el('p', { text: t('noWeakSpots') })]));
  } else {
    wrap.append(el('div', { class: 'chip-list' }, weak.map((w) => el('span', { class: 'chip' }, [w.tag, ' ', el('b', { text: `×${w.lapses}` })]))));
    wrap.append(el('div', { class: 'activity__actions' }, [el('button', { class: 'btn', type: 'button', onclick: () => go('practice') }, [t('practiseTab')])]));
  }

  wrap.append(el('h3', { class: 'section-title', text: 'Your data' }));
  const dl = el('div', { class: 'activity__actions' });
  dl.append(el('button', {
    class: 'btn btn--ghost', type: 'button',
    onclick: () => {
      const blob = new Blob([exportSave()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'hooty-progress.json';
      a.click();
    },
  }, [icon('download', { size: 22 }), t('exportData')]));
  const fileInput = el('input', { type: 'file', accept: 'application/json', style: { display: 'none' } });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast('That file is too big to be a Hooty save.'); return; }
    try {
      await importSave(await f.text());
      toast('Progress imported.');
      render();
    } catch (e) {
      toast(e.message || 'Could not read that file.');
    }
  });
  dl.append(el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => fileInput.click() }, [icon('upload', { size: 22 }), t('importData')]), fileInput);
  wrap.append(dl);
  return wrap;
}

// The last seven days, one bar each; a day that met the goal is filled in the accent colour.
function weekStrip(l) {
  const goal = l?.dailyGoal || 50;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = todayKey(d);
    const xp = key === todayKey() ? Math.max(l?.dailyXp || 0, l?.days?.[key] || 0) : (l?.days?.[key] || 0);
    days.push({ xp, name: d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }).slice(0, 3), today: i === 0 });
  }
  const top = Math.max(goal, ...days.map((x) => x.xp));
  const met = days.filter((x) => x.xp >= goal).length;
  return el('section', { class: 'growth-card week' }, [
    el('h3', { class: 'section-title', text: 'Last 7 days' }),
    el('p', { class: 'week__sum', text: met ? `Daily goal reached on ${met} of the last 7 days.` : 'Reach the daily goal to light up a day.' }),
    el('div', { class: 'week__bars', role: 'img', 'aria-label': days.map((x) => `${x.name} ${x.xp} points`).join(', ') },
      days.map((x) => el('div', { class: `week__day${x.xp >= goal ? ' is-met' : ''}${x.today ? ' is-today' : ''}` }, [
        el('div', { class: 'week__bar' }, [el('span', { style: { height: x.xp ? Math.max(8, Math.round((x.xp / top) * 100)) + '%' : '0%' } })]),
        el('span', { class: 'week__name', text: x.name }),
      ]))),
  ]);
}

function statCard(value, label, pct, note) {
  return el('div', { class: 'stat-card' }, [
    el('div', { class: 'stat-card__value', text: value }),
    el('div', { class: 'stat-card__label', text: label }),
    note ? el('div', { class: 'stat-card__note', text: note }) : null,
    pct !== undefined ? el('div', { class: 'meter meter--primary' }, [el('span', { style: { width: pct + '%' } })]) : null,
  ]);
}

// --- settings --------------------------------------------------------------

function screenSettings() {
  const l = activeLearner();
  const wrap = el('div', { class: 'page screen' });
  const row = (label, hint, control) => el('div', { class: 'setting-row' }, [
    el('span', { class: 'setting-row__label' }, [label, hint ? el('span', { class: 'setting-row__hint', text: hint }) : null]),
    control,
  ]);
  const toggle = (on, label, onChange) => {
    const sw = el('button', { class: `switch${on ? ' is-on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String(!!on), 'aria-label': label });
    sw.addEventListener('click', async () => {
      const v = !sw.classList.contains('is-on');
      sw.classList.toggle('is-on', v);
      sw.setAttribute('aria-checked', String(v));
      await onChange(v);
    });
    return sw;
  };

  const soundSwitch = toggle(l?.sound, t('sound'), async (v) => { l.sound = v; await persist(); sound('tap'); });
  const hlSwitch = toggle(l?.highlight !== false, 'Highlight key words', async (v) => {
    l.highlight = v;
    document.body.classList.toggle('hl-on', v);
    await persist();
  });
  const dysSwitch = toggle(l?.dyslexiaFont, t('dyslexiaFont'), async (v) => {
    l.dyslexiaFont = v;
    document.body.classList.toggle('dyslexia-font', v);
    await persist();
  });

  const range = el('input', { class: 'range', type: 'range', min: '0.85', max: '1.5', step: '0.05', value: String(l?.fontScale || 1), 'aria-label': t('textSize') });
  range.addEventListener('input', () => {
    l.fontScale = Number(range.value);
    document.documentElement.style.setProperty('--font-scale', String(l.fontScale));
  });
  range.addEventListener('change', () => persist());

  const nameField = el('input', { class: 'text-input', type: 'text', maxlength: '24', autocomplete: 'given-name', 'aria-label': 'Your name', value: /^learner$/i.test(l?.name || '') ? '' : (l?.name || ''), placeholder: 'Type your name' });
  nameField.addEventListener('change', () => saveName(nameField.value));

  const langSel = el('select', { class: 'text-input', 'aria-label': t('language') });
  availableLocales().forEach((code) => {
    const opt = el('option', { value: code, text: code === 'en' ? 'English' : code === 'hi' ? 'हिन्दी' : 'ಕನ್ನಡ' });
    if (code === (l?.lang || 'en')) opt.selected = true;
    langSel.append(opt);
  });
  langSel.addEventListener('change', async () => {
    l.lang = langSel.value;
    setLocale(l.lang);
    await persist();
    render();
  });

  const guidePicker = el('div', { class: 'guide-picker', role: 'radiogroup', 'aria-label': 'Your guide' },
    [['hooty', 'Hooty'], ['lumi', 'Lumi']].map(([id, label]) => {
      const on = (l?.guide2 || 'hooty') === id;
      const b = el('button', { class: `guide-pick${on ? ' is-on' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(on), 'aria-label': label }, [
        el('img', { src: guideAvatarSrc(id), alt: '', width: '64', height: '64' }),
        el('span', { text: label }),
      ]);
      b.addEventListener('click', async () => { l.guide2 = id; setGuide(id); await persist(); sound('tap'); render(); });
      return b;
    }));

  wrap.append(el('div', { class: 'settings' }, [
    row('Your name', null, nameField),
    row(t('sound'), 'Taps, chimes and a fanfare when you finish', soundSwitch),
    row(t('textSize'), 'Make everything bigger or smaller', range),
    row('Highlight key words', 'Important words get a marker-pen colour', hlSwitch),
    row(t('dyslexiaFont'), 'Wider, clearer letters', dysSwitch),
    SHOW_GUIDE_PICKER ? row('Your guide', 'Who walks beside you through every lesson', guidePicker) : null,
    row(t('language'), null, langSel),
  ]));

  // Picture credits: every real picture in the lessons, with its licence.
  const credits = [];
  for (const pack of packs) for (const unit of pack.units) for (const chapter of unit.chapters) {
    for (const lesson of [...chapter.lessons, ...(chapter.boss ? [chapter.boss] : [])]) {
      const c = lesson.sceneCredit;
      if (c && c.url && !credits.some((x) => x.url === c.url)) credits.push(c);
    }
  }
  if (credits.length) {
    wrap.append(el('h3', { class: 'section-title', text: 'Picture credits' }));
    wrap.append(el('p', { class: 'section-sub', text: 'The photographs and old maps in the lessons come from Wikimedia Commons. Tap one to see its page and licence.' }));
    wrap.append(el('ul', { class: 'credit-list' }, credits.map((c) => el('li', {}, [
      el('a', { class: 'credit-link', href: safeLink(c.url), target: '_blank', rel: 'noopener noreferrer', text: c.text }),
    ]))));
  }

  return wrap;
}

// --- router ----------------------------------------------------------------

function go(screen) {
  router.screen = screen;
  if (screen !== 'path') router.packId = router.packId || packs[0]?.id;
  render();
}

function render() {
  const l = activeLearner();
  if (l) {
    heartsRegenerated();
    applyLearnerPrefs();
  }
  clear(app);

  let screen;
  let title = '';
  switch (router.screen) {
    case 'packs': screen = screenPacks(); title = t('choosePack'); break;
    case 'path': screen = screenPath(); title = t('path'); break;
    case 'lesson': screen = screenLesson(); title = router.lesson?.title || ''; break;
    case 'practice': screen = screenPractice(); title = t('practiseTab'); break;
    case 'rewards': screen = screenRewards(); title = t('rewards'); break;
    case 'parent': screen = screenParent(); title = t('parent'); break;
    case 'themes': screen = screenThemes(); title = t('chooseTheme'); break;
    case 'settings': screen = screenSettings(); title = t('settings'); break;
    case 'addbook': screen = screenAddBook(); title = 'Add my book'; break;
    default: screen = screenHome(); title = '';
  }

  const focus = router.screen === 'lesson';
  const shell = el('div', { class: `shell${focus ? ' shell--focus' : ''}` });
  const main = el('main', { class: `main${focus ? ' main--focus' : ''}`, id: 'main' });
  if (!focus) main.append(topBar(title));
  main.append(screen);
  if (!focus) shell.append(navBar());
  shell.append(main);
  app.append(shell);
  window.scrollTo({ top: 0, behavior: 'instant' });
  // Back on the Trail after some progress: open at the next lesson, not at the very top of the book.
  if (router.screen === 'path' && document.querySelector('.node--done')) document.querySelector('.node--current')?.scrollIntoView({ block: 'center', behavior: 'instant' });
}

// --- parent view -----------------------------------------------------------



// --- themes + settings -----------------------------------------------------



// --- router ----------------------------------------------------------------



// --- boot ------------------------------------------------------------------

async function main() {
  await boot();
  await loadContent();
  const l = activeLearner();
  const themeId = l?.theme || themes[0]?.id;
  currentThemeId = themeId;
  applyTheme(themes.find((x) => x.id === themeId) || themes[0]);
  render();
  loadRestInBackground(activeGrade());

  if ('serviceWorker' in navigator) {
    // Registered after first paint: precaching the app must not compete with the first load.
    const reg = () => navigator.serviceWorker.register('./sw.js').catch(() => {});
    if ('requestIdleCallback' in window) requestIdleCallback(reg, { timeout: 4000 }); else setTimeout(reg, 2000);
  }
}

// On a PC the letters on the answers are real keys: A to D (or 1 to 4) pick an answer, T and F answer true or false, and Enter moves on.
document.addEventListener('keydown', (e) => {
  if (!session || e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.target.closest?.('input, textarea, select, a') || document.querySelector('.term-pop')) return;
  const live = (sel) => [...document.querySelectorAll(sel)].filter((b) => !b.disabled && b.offsetParent);
  if (e.key === 'Enter') {
    if (e.target.closest?.('button') && !e.target.closest('.option, .tf-btn')) return;
    const go = live('.sheet .btn--primary, .activity__actions .btn--primary, .input-row .btn--primary')[0];
    if (go) { e.preventDefault(); go.click(); }
    return;
  }
  const k = e.key.toLowerCase(), opts = live('.lesson__stage .option');
  const tf = live('.lesson__stage .tf-btn');
  const hit = opts.length ? opts[/^[1-9]$/.test(k) ? +k - 1 : k.length === 1 ? k.charCodeAt(0) - 97 : -1]
    : tf.length && (k === 't' || k === 'f') ? tf[k === 't' ? 0 : 1] : null;
  if (hit) { e.preventDefault(); hit.click(); hit.focus(); }
});

// Sound: the browser only allows audio after a tap, so the first gestures wake it up; after that every control gets
// its own small sound. Answer buttons are left out because the answer itself plays a right or wrong sound.
for (const evt of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(evt, unlockAudio, { capture: true, passive: true });
document.addEventListener('click', (e) => {
  const hit = e.target.closest?.('button, [role="tab"], .node, .nav__item, .match-item, .order-chip, .label-chip');
  if (!hit || hit.disabled || hit.closest('.option, .tf-btn')) return;
  if (hit.dataset.sfx) sound(hit.dataset.sfx);
  else if (hit.matches('.order-chip, .label-chip, .match-item')) sound('pop');
  else if (hit.matches('.activity__actions .btn--primary, .activity__actions .btn--block, .celebrate .btn')) sound('next');
  else sound('tap');
}, true);

// Anything that escapes a handler should not leave a child staring at a frozen screen.
window.addEventListener('error', (e) => console.error('uncaught:', e.message));
window.addEventListener('unhandledrejection', (e) => console.error('unhandled:', e.reason));

main().catch((err) => {
  console.error(err);
  clear(app);
  app.append(el('div', { class: 'empty fatal' }, [
    el('h2', { text: 'Hooty could not start' }),
    el('p', { text: navigator.onLine === false ? 'You seem to be offline. Connect to the internet once, then open Hooty again.' : 'Something went wrong while loading. Your progress is safe.' }),
    el('button', { class: 'btn btn--primary', type: 'button', onclick: () => location.reload() }, ['Try again']),
  ]));
});
