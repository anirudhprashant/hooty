// The app shell. Screens: home, path (skill trail), lesson player, parent view,
// settings, theme picker, pack picker. Vanilla, no framework.

import { el, clear, button, confetti, sparkle, speak, stopSpeech, isSpeaking, warmClips } from './core/dom.js';
import { attachWordTap } from './core/wordtap.js';
import { sfx, unlockAudio, configureSfx, haptic } from './core/sfx.js';
import { realise } from './core/gen.js';
import { renderModel } from './core/models.js';
import { state, boot, activeLearner, persist, addXP,
  heartsRegenerated, touchStreak, recordActivity, recordLesson, weakSpots,
  unlockReward, todayKey, exportSave, importSave, setActiveLearner, learnerList, createLearner, wipe } from './core/state.js';
import { applyTheme, getTheme, themeAsset, assetFor, mascotImage, mascotAvatar, themeCopy, setGuide, currentGuide, guideAvatarSrc } from './core/theme.js';
// Brand art (tools/brand/make.sh): blob Hooty as the logo mark.
const BRAND_MARK = './characters/blob/hooty-mark.webp';
import { t, setLocale, getLocale, availableLocales } from './core/i18n.js';
import { getActivityModule } from './activities/index.js';
import { revealFor, pickAlt, variantOf } from './core/concepts.js';
import { icon } from './core/icons.js';
import { bookWord } from './core/bookwords.js';
import { saveBook, getBook, deleteBook, listBooks } from './core/mybooks.js';
import { buildMatcher, annotate, openTermCard, markKeys, plain } from './core/glossary.js';
import { loadWidgets, widgetsLoaded } from './core/widgets.js';

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

let themes = [];
let packs = [];
let currentThemeId = null;
let router = { screen: 'home', args: {} };
// The link this page was opened with. Captured now, because the very first render writes the hash and
// would overwrite an incoming #/lesson/... before we have had a chance to open it.
let bootHash = location.hash;
let linkPending = /^#\/(book|chapter|lesson)\//i.test(bootHash);

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
  // boot.js starts the book the child was last in while the engine loads; take that copy instead of asking twice.
  const early = window.__earlyPacks && window.__earlyPacks[url];
  if (early) {
    delete window.__earlyPacks[url];
    try {
      return await early;
    } catch (e) { /* fall through to a normal fetch */ }
  }
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
    // ?v is the book's content hash, so a published book is cached hard at the edge and a new one is a new URL.
    const full = await getJson(`./content/packs/${p.id}/pack.json${p.v ? `?v=${p.v}` : ''}`);
    const pack = { ...full, base: `./content/packs/${p.id}`, glossary: null, glossaryFile: full.glossary || 'glossary.json', matcher: buildMatcher(null) };
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

// A book is text, pictures and diagrams. The text arrives with the book; the pictures are fetched per lesson, so a
// book that has never been read on this phone shows blank frames offline. This walks the whole book once and asks the
// browser for every picture, which the service worker keeps, so the book then works with no connection at all.
function bookMediaUrls(pack) {
  const urls = new Set();
  const add = (p) => {
    if (typeof p !== 'string' || !p) return;
    if (/^(https?:|data:|blob:)/.test(p)) return;
    const rel = p.replace(/^\.?\//, '');
    urls.add(`${pack.base}/${rel}`);
    // Diagrams ship a tall version for phones; keep it too, so a narrow screen offline is not the one that breaks.
    if (p.endsWith('.svg')) urls.add(`${pack.base}/${rel.replace(/\.svg$/, '-stack.svg')}`);
  };
  for (const unit of pack.units || []) {
    for (const chapter of unit.chapters || []) {
      for (const lesson of [...(chapter.lessons || []), chapter.boss].filter(Boolean)) {
        add(lesson.topicScene);
        add(lesson.comic);
      }
    }
  }
  return [...urls];
}

async function saveBookOffline(pack, onProgress) {
  const queue = bookMediaUrls(pack);
  const total = queue.length;
  let done = 0;
  const pull = async () => {
    while (queue.length) {
      const url = queue.shift();
      try {
        await fetch(url, { credentials: 'same-origin' });
      } catch {
        // a picture that will not come is not worth stopping the rest for
      }
      done += 1;
      if (onProgress) onProgress(done, total);
    }
  };
  await Promise.all([0, 1, 2, 3].map(pull));
  return { total };
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

// A child on a metered phone should not download a whole class because they opened one lesson. Save-Data and a
// 2G link both mean: fetch only the book being read, and let the rest arrive when it is opened.
function dataFrugal() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return false;
  if (c.saveData) return true;
  return /(^|-)2g$/.test(String(c.effectiveType || ''));
}

// Practice and Grown-ups read every book of the class. They ask for the rest of it when opened, and this re-renders
// once the books arrive, so the screen fills in instead of staying half empty.
function needWholeClass() {
  const g = activeGrade();
  const want = packIndex.filter((p) => String(p.grade) === g);
  if (want.length && want.every((p) => packById(p.id))) return;
  loadRestInBackground(g);
}

function loadRestInBackground(grade) {
  if (dataFrugal()) return;
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

// The shell is tiny (two index files and the themes); the book is 1.7 MB. They load in two steps so the
// first screen can paint before the book arrives instead of waiting for it. See main().
async function loadShell() {
  const [themeIdx, packIdx] = await Promise.all([getJson('./themes/index.json'), getJson('./content/index.json')]);
  themes = await Promise.all(themeIdx.themes.map(async (t) => {
    const full = await getJson(`./themes/${t.id}/theme.json`);
    return { ...full, base: './themes' };
  }));
  packIndex = [...packIdx.packs, ...await listBooks()];
}

// The book named in a shared link, so a visitor arriving at a lesson fetches that book only. Without this the
// default class book downloads first and is thrown away a moment later.
function packFromHash(hash) {
  const m = /^#\/(?:book|chapter|lesson)\/([^/?#]+)/i.exec(String(hash || ''));
  return m ? m[1] : null;
}

async function loadFirstBook(preferId = null) {
  const grade = activeGrade();
  const mine = packIndex.filter((p) => String(p.grade) === grade);
  const saved = activeLearner()?.packId;
  const prefer = preferId ? packIndex.find((p) => p.id === preferId) : null;
  const first = prefer || mine.find((p) => p.id === saved) || mine[0];
  if (first) await ensurePack(first.id);
  if (!packs.length && !prefer) await loadGrade(grade);   // the first book failed: try the rest before giving up
  if (!packs.length) throw new Error('No books could be loaded.');
}

function packById(id) { return packs.find((p) => p.id === id); }

// The subject the child is working in: the one they last picked, else the first book.
// Read-aloud language: the book's own (a Hindi book is read in Hindi), else the app language.
// The words the lesson player itself says, in the language of the book being read.
const bw = (text) => bookWord(packById(session?.lesson?.packId)?.language, text);

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
  if (next && !(await ensurePack(next.id))) { toast(t('bookNotHere')); }
  router.packId = next?.id;
  if (l && next) l.packId = next.id;
  await persist();
  render();
  warmServiceWorker();   // the class just chosen should load offline next time too
  loadRestInBackground(g);
}

// A row of class chips (only once more than one class exists) above a row of subject pills for that class.
// Subject names are book metadata in English; a Hindi child should still see them in Hindi.
// A theme names its rewards in English; each may carry translations, so a Hindi child reads a Hindi sticker name.
function rewardName(r) {
  const lang = getLocale();
  return (lang !== 'en' && r?.names?.[lang]) || r?.name || '';
}

function subjectName(name) {
  const key = { Science: 'subjScience', 'Social Science': 'subjSocial', Mathematics: 'subjMaths', English: 'subjEnglish', Hindi: 'subjHindi', 'The World Around Us': 'subjTwau' }[name];
  return key ? t(key) : name;
}

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
    const row = el('div', { class: 'subject-tabs grade-tabs', role: 'group', 'aria-label': t('classGroup') }, grades.map((x) => el('button', {
      class: `subject-tab grade-tab${x === g ? ' is-on' : ''}`, type: 'button', 'aria-pressed': String(x === g),
      onclick: () => switchGrade(x),
    }, [x === 'mine' ? t('myBooks') : t('classN', { n: x })])));
    row.append(el('button', { class: 'subject-tab grade-tab grade-tab--add', type: 'button', onclick: () => go('addbook') }, [t('addMyBook')]));
    wrap.append(row); swipe(row);
  }
  // The catalogue at /books/ is the only place a lesson can be found by what it teaches ('photosynthesis') instead of
  // by class and subject. It is a real page, so it opens in the same tab and the back button returns here.
  wrap.append(el('a', { class: 'catalogue-link', href: '/books/' }, [
    icon('search', { size: 18 }),
    el('span', {}, [el('b', {}, [t('searchAllBooks')]), el('span', { class: 'catalogue-link__sub' }, [t('searchAllHint')])]),
  ]));
  if (mine.length >= 1) {
    const row = el('div', { class: 'subject-tabs', role: 'tablist', 'aria-label': t('subjectGroup') }, mine.map((p) => el('button', {
      class: `subject-tab${p.id === cur?.id ? ' is-on' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(p.id === cur?.id),
      onclick: async () => {
        if (!(await ensurePack(p.id))) { toast(t('bookNotHere')); return; }
        router.packId = p.id; const l = activeLearner(); if (l) { l.packId = p.id; followBookLanguage(p); await persist(); } render(); warmServiceWorker();
      },
    }, [subjectName(p.subject)])));
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

// --- the bottom bar and the browser's own toolbar ---------------------------
// A phone's URL bar slides away as the page scrolls down and comes back at the top. While it moves, the layout viewport
// and the visible area disagree by its height, and a `position: fixed; bottom: 0` bar is painted against the layout one,
// so it appears to ride up and back with every scroll. Measuring the gap and lifting the bar by exactly that keeps it
// still. On a desktop, and in the installed app, the gap is always 0 and nothing is written.
function keepNavStill() {
  const vv = window.visualViewport;
  if (!vv) return;
  let last = '';
  const place = () => {
    const gap = Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)));
    const value = `${gap}px`;
    if (value === last) return;
    last = value;
    document.documentElement.style.setProperty('--nav-lift', value);
  };
  place();
  vv.addEventListener('resize', place, { passive: true });
  vv.addEventListener('scroll', place, { passive: true });
  window.addEventListener('resize', place, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(place, 250), { passive: true });
}

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
  const nav = el('nav', { class: 'nav', 'aria-label': t('mainNav') });
  nav.append(el('div', { class: 'nav__brand' }, [el('img', { src: BRAND_MARK, alt: '' }), t('appName')]));
  const active = NAV_FOR[router.screen];
  const due = practiceSet(10).length;
  for (const item of NAV) {
    const b = el('button', {
      class: `nav__item${item.id === active ? ' is-active' : ''}`, type: 'button',
      'aria-current': item.id === active ? 'page' : undefined,
      onclick: () => go(item.id),
    }, [icon(item.icon, { size: 26 }), el('span', { text: item.label() })]);
    if (item.id === 'practice' && due) b.append(el('span', { class: 'nav__badge', 'aria-label': t('nToTry', { n: due }), text: String(due) }));
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
            map.set(cardId, { ...a, cardId, lessonId, packId: pack.id, chapterId: chapter.id });
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
  const input = el('input', { class: 'text-input', type: 'text', maxlength: '24', autocomplete: 'given-name', 'aria-label': t('nameLabel'), placeholder: t('namePlaceholder') });
  const form = el('form', { class: 'name-card' }, [
    el('p', { class: 'name-card__ask', text: t('whatCallYou') }),
    el('div', { class: 'input-row' }, [input, el('button', { class: 'btn btn--primary', type: 'submit', text: t('save') })]),
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
  const ready = !!currentPack();   // the book is still downloading on a slow connection: paint the stage, not a lie
  const started = Object.keys(l?.lessonsDone || {}).length > 0;
  const named = l?.name && !/^learner$/i.test(l.name);
  const due = practiceSet(10);

  const stage = el('section', { class: 'stage' });
  const art = el('div', { class: 'stage__art' });
  const mascot = mascotImage('idle');
  // fetchpriority: the home mascot is the largest paint on the screen; nothing else there should delay it.
  if (mascot) art.append(el('img', { class: 'stage__mascot', src: mascot, alt: '', fetchpriority: 'high', decoding: 'async' }));

  const copy = el('div', { class: 'stage__copy' });
  copy.append(
    el('h2', { class: 'stage__title', text: named ? t('hiName', { name: l.name }) : t('readyToLearn') }),
    el('p', { class: 'stage__sub', text: !ready ? t('bookLoading') : next ? (started ? t('nextAdventure') : t('firstLesson')) : t('allDone') }),
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
  if (ready) actions.append(cta); else actions.append(el('span', { class: 'stage__loading', text: t('bookLoading') }));
  if (due.length && next) {
    actions.append(el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => go('practice') },
      [icon('practice', { size: 22 }), t('reviewN', { n: due.length })]));
  }
  copy.append(actions);
  stage.append(art, copy);
  wrap.append(stage);
  if (!named && ready) wrap.append(nameCard());   // not while the book is still loading: the second render would wipe a name half typed

  // today: goal ring, streak, next sticker. Rewards are visible from day one.
  const goal = l?.dailyGoal || 50;
  const goalPct = Math.min(100, Math.round(((l?.dailyXp || 0) / goal) * 100));
  const goalTile = el('div', { class: 'tile' }, [
    ringMeter(goalPct, `${goalPct}%`),
    el('div', { class: 'tile__body' }, [
      el('span', { class: 'tile__value', text: `${Math.min(l?.dailyXp || 0, goal)}/${goal}` }),
      el('span', { class: 'tile__label', text: t('xpToday') }),
    ]),
  ]);
  const streakTile = el('div', { class: 'tile tile--streak' }, [
    el('div', { class: 'tile__figure' }, [icon('flame', { size: 56 })]),
    el('div', { class: 'tile__body' }, [
      el('span', { class: 'tile__value', text: String(l?.streak || 0) }),
      el('span', { class: 'tile__label', text: (l?.streak || 0) === 1 ? t('dayStreakOne') : t('dayStreakMany') }),
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
      el('span', { class: 'tile__value', style: { fontSize: 'var(--fs-md)' }, text: nr ? rewardName(nr) : t('allCollected') }),
      el('span', { class: 'tile__label', text: nr ? t('xpToUnlock', { n: nr.unlockAt - (l?.xp || 0) }) : t('everySticker') }),
      nr ? el('div', { class: 'meter meter--primary' }, [el('span', { style: { width: rewardPct + '%' } })]) : null,
    ]),
  ]);
  wrap.append(el('section', { class: 'today', 'aria-label': t('todayGroup') }, [goalTile, streakTile, rewardTile]));

  // review + trail
  const pack = currentPack();
  const bookIds = pack ? pack.units.flatMap((u) => u.chapters.flatMap((c) => [...c.lessons.map((x) => x.id), ...(c.boss ? [bossId(c)] : [])])) : [];
  const done = bookIds.filter((id) => l?.lessonsDone?.[id]).length;
  const totalLessons = pack ? pack.units.reduce((n, u) => n + u.chapters.reduce((m, c) => m + c.lessons.length + (c.boss ? 1 : 0), 0), 0) : 0;
  const reviewCard = el('button', { class: 'feature', type: 'button', onclick: () => go('practice') }, [
    el('span', { class: 'feature__badge' }, [icon('practice', { size: 34 })]),
    el('span', {}, [
      el('span', { class: 'feature__title', text: due.length ? t('nToTry', { n: due.length }) : t('noMistakes') }),
      el('span', { class: 'feature__sub', text: due.length ? t('wrongQuestions') : t('wrongWait') }),
    ]),
  ]);
  const trailCard = el('button', { class: 'feature', type: 'button', onclick: () => go('path') }, [
    next?.topicScene
      ? thumbImage(next)
      : el('span', { class: 'feature__badge' }, [icon('trail', { size: 34 })]),
    el('span', {}, [
      el('span', { class: 'feature__title', text: t('path') }),
      el('span', { class: 'feature__sub', text: t('lessonsDoneOf', { done, total: totalLessons }) }),
    ]),
  ]);
  if (ready) wrap.append(el('section', { class: 'pair' }, [reviewCard, trailCard]));
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

// A child whose book is in Hindi should not read English buttons. Until someone picks a language in Settings, opening a
// book in another language switches the app to it.
function followBookLanguage(pack) {
  const l = activeLearner();
  const lang = pack?.language;
  if (!l || l.langChosen || !lang || lang === l.lang) return false;
  if (!availableLocales().includes(lang)) return false;
  l.lang = lang;
  setLocale(lang);
  return true;
}

function screenPath() {
  const l = activeLearner();
  const pack = currentPack();
  const wrap = el('div', { class: 'page screen' });

  if (!pack) {
    wrap.append(el('div', { class: 'empty' }, [el('p', { text: t('noPacks') })]));
    return wrap;
  }
  const tabs = subjectTabs(); if (tabs) wrap.append(tabs);
  // The index carries the English title ("Social Science, Class 6"); a Hindi app should not print the English
  // subject name next to a Hindi trail.
  const bookTitle = getLocale() === 'en'
    ? pack.title
    : t('bookTitle', { subject: subjectName(String(pack.subject || '').replace(/\bScience\b/, 'Science')) || pack.subject, n: pack.grade });
  wrap.append(el('h2', { class: 'section-title', text: bookTitle }));
  wrap.append(el('p', { class: 'section-sub', text: t('trailIntro') }));
  // A parent about to travel can keep the whole book here, in one tap, and the button says how far it got.
  {
    const kept = !!l?.offlineBooks?.[pack.id];
    const label = el('span', { text: kept ? t('savedOffline') : t('saveOffline') });
    const btn = el('button', { class: `btn ${kept ? 'btn--primary' : 'btn--ghost'} offline-btn`, type: 'button' }, [
      icon(kept ? 'check' : 'download', { size: 20 }), label,
    ]);
    btn.addEventListener('click', async () => {
      if (btn.disabled || l?.offlineBooks?.[pack.id]) return;
      btn.disabled = true;
      label.textContent = t('savingOffline', { done: 0, total: bookMediaUrls(pack).length });
      await saveBookOffline(pack, (done, all) => { label.textContent = t('savingOffline', { done, total: all }); });
      if (l) {
        l.offlineBooks = { ...(l.offlineBooks || {}), [pack.id]: Date.now() };
        await persist();
      }
      label.textContent = t('savedOffline');
      btn.classList.remove('btn--ghost');
      btn.classList.add('btn--primary');
      btn.disabled = false;
      toast(t('savedOfflineToast'));
      warmServiceWorker();
    });
    wrap.append(el('div', { class: 'offline-row' }, [btn]));
  }

  // A big book is fifteen screens of trail. A row of unit chips at the top lets a child jump to the part they want
  // instead of scrolling past everything they have already done.
  if (pack.units.length > 1) {
    const chips = el('div', { class: 'unit-jump', role: 'navigation', 'aria-label': t('jumpToUnit') },
      pack.units.map((unit) => el('button', {
        class: 'unit-jump__chip', type: 'button', text: unit.title,
        onclick: () => {
          const at = document.getElementById(`unit-${unit.id}`);
          if (at) at.scrollIntoView({ block: 'start', behavior: 'smooth' });
        },
      })));
    wrap.append(chips);
  }

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

    const block = el('section', { class: 'unit-block', id: `unit-${unit.id}` });
    block.append(el('div', { class: 'unit-head' }, [
      el('span', { class: 'unit-head__icon' }, [unitIcon ? el('img', { src: themeAsset(unitIcon), alt: '' }) : icon('book', { size: 34 })]),
      el('div', {}, [
        el('h3', { class: 'unit-head__name', text: unit.title }),
        el('span', { class: 'unit-head__meta', text: t('nOfMDone', { done: doneCount, total: items.length }) }),
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
          el('span', { class: 'trail-side__kicker', text: t('upNext') }),
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

// "N questions" must mean questions the app marks: explore cards, flashcards, watched answers and written answers are
// teaching, not questions, so a parent counting the cards found the number too high on 3,513 of 3,618 lessons.
const QUESTIONS = new Set(['mcq', 'truefalse', 'fillblank', 'matchpairs', 'dragorder', 'draglabel', 'typeanswer', 'listenpick']);
const questionCount = (lesson) => lesson.activities.filter((a) => QUESTIONS.has(a.type)).length;

// The trail is a grid of narrow cells: on a phone the third line of a node is one word too long, so the words are
// dropped there and a play badge says the same thing at a glance.
const narrowTrail = () => window.matchMedia?.('(max-width: 560px)')?.matches ?? false;

function trailNode(it, rec, isCurrent, cell, pack, unit) {
  const boss = it.kind === 'boss';
  const title = boss ? (it.lesson.title || t('bossChallenge')) : it.lesson.title;
  const nQuestions = questionCount(it.lesson);
  // A lesson with something to play says so on the trail: a child choosing between two lessons had no way to know which
  // one had a simulation in it, and the trail is where that choice is made.
  const hasTry = (it.lesson.activities || []).some((a) => a.type === 'explore');
  const questionsWord = t(nQuestions === 1 ? 'question' : 'questions');
  const savedAt = !rec && activeLearner()?.inProgress?.[it.id];
  // A chapter test is 18 cards and is not a quick five minutes; its own line says so instead of a minute count.
  const isTest = /-exam$/i.test(it.lesson.lessonId || it.id || '');
  const meta = boss
    ? `${t('bossLabel')} · ${nQuestions} ${questionsWord}`
    : isTest
      ? `${t('branchTest')} · ${nQuestions} ${questionsWord}`
      : savedAt
      ? `${t('startedWord')} · ${it.lesson.estimatedMinutes || 4} ${t('minutes')} · ${nQuestions} ${questionsWord}`
      : `${it.lesson.estimatedMinutes || 4} ${t('minutes')} · ${nQuestions} ${questionsWord}${hasTry && !narrowTrail() ? ` · ${t('tryItYourself')}` : ''}`;
  // A lesson the child started and left: it keeps its place, and says so.
  const started = !rec && !!activeLearner()?.inProgress?.[it.id];
  const glyph = rec ? icon('check', { size: 40 }) : boss ? icon('crown', { size: 40 }) : isCurrent ? icon('play', { size: 44 }) : icon('star', { size: 40 });
  const node = el('button', {
    class: `node${rec ? ' node--done' : ''}${started ? ' node--started' : ''}${boss ? ' node--boss' : ''}${isCurrent ? ' node--current' : ''}${hasTry ? ' node--try' : ''}`,
    type: 'button', style: { gridColumn: String(cell.col + 1), gridRow: String(cell.row + 1) },
  }, [
    el('span', { class: 'node__badge', 'aria-hidden': 'true' }, [glyph]),
    el('span', { class: 'node__body' }, [
      el('span', { class: 'node__title', text: title }),
      el('span', { class: 'node__meta', text: meta }),
      hasTry ? el('span', { class: 'node__play', 'aria-hidden': 'true' }, [icon('play', { size: 12 })]) : null,
      hasTry ? el('span', { class: 'visually-hidden', text: t('tryItYourself') }) : null,
      rec ? el('span', { class: 'visually-hidden', text: t('doneA11y') })
        : started ? el('span', { class: 'visually-hidden', text: t('startedA11y') })
          : isCurrent ? el('span', { class: 'visually-hidden', text: t('nextUpA11y') }) : null,
    ]),
    isCurrent ? el('span', { class: 'node__start', 'aria-hidden': 'true', text: rec ? '' : started ? t('continue') : t('start') }) : null,
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
  router.packId = packOfLesson(lesson)?.id || router.packId || currentPack()?.id;
  // The clip list (238 KB) is not fetched here: it is only needed when a child taps a speaker, and speak() loads
  // it on demand. Warming it on every lesson open cost every reader half a megabyte they may never use.
  go('lesson');
}

// The words this lesson actually uses, as revision cards near the end of it. A card asks what a word means and the child
// flips it, which is the one moment in a lesson where recalling a meaning is the whole task. The words come from the
// book's own glossary and only from words readable in this lesson's text, so a card never asks about something the child
// has not just met. Two a lesson, rotating on a replay, and silent: the meaning is read, not spoken.
const CARD_PROMPT = {
  en: (w) => `What does "${w}" mean?`,
  hi: (w) => `"${w}" का अर्थ क्या है?`,
  kn: (w) => `"${w}" ಎಂದರೆ ಏನು?`,
};

function lessonWords(pack, lesson, activities) {
  const terms = pack?.glossary?.terms;
  if (!terms?.length || lesson.isPractice || (activities || []).length < 6) return [];
  const text = activities.map((a) => `${a.title || ''} ${a.body || ''} ${a.prompt || ''} ${a.explanation || ''}`).join(' ');
  // A book's glossary is shared by every chapter, and common words such as "work" and "matter" appear in most science
  // lessons: matching the text alone named four words a child had not met in that lesson ("theory, work, matter, ion"
  // on a reproduction lesson). The glossary records the chapter each word came from, so only that chapter's words count.
  const chapterNo = Number((String(lesson.chapterId || '').match(/(?:^|-)ch(\d+)/) || [])[1]);
  const fromChapter = (x) => !chapterNo || !x.src?.length || x.src.some((s) => Number(s.ch) === chapterNo);
  const usable = terms.filter((x) => x.term && x.meaning && x.term.length > 2 && text.includes(x.term));
  const own = usable.filter(fromChapter);
  // Some lessons, mostly in the literature books, use only one or two of their chapter's glossary words, and one word
  // card is not a word card. Below three, top up with the rest of the chapter's words: the chapter teaches them, even
  // where this one lesson does not spell them out. Words the lesson does use stay first.
  if (own.length >= 3 || !chapterNo) return own;
  const seen = new Set(own.map((x) => x.term));
  const rest = terms.filter((x) => x.term && x.meaning && x.term.length > 2 && fromChapter(x) && !seen.has(x.term));
  return [...own, ...rest].slice(0, 3);
}

function wordCards(pack, lesson, activities, plays) {
  const found = lessonWords(pack, lesson, activities);
  if (!found.length) return [];
  const start = (plays * 2) % found.length;
  const prompt = CARD_PROMPT[pack.language] || CARD_PROMPT.en;
  return [found[start], found[(start + 1) % found.length]]
    .filter((x, i, all) => x && all.indexOf(x) === i)
    .map((x, i) => ({
      type: 'flashcard',
      id: `${lesson.id}-word-${i}`,
      silent: true,
      prompt: prompt(x.term),
      back: x.meaning,
    }));
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
      activities = [{ type: 'hook', id: `${lesson.id}-prehook`, prompt: t('preHook'), explanation: '' },
        ...pool.map((a) => ({ ...a, id: `${a.id}-pre`, pre: true })), ...activities];
    }
  }

  // A fun fact halfway through, between two questions, and a different one on the finish screen. Replays show new ones.
  const facts = lesson.funFacts || [], plays = learner?.lessonsDone?.[lesson.lessonId]?.count || 0;
  if (facts.length && !lesson.isPractice && activities.length >= 6) {
    const mid = Math.floor(activities.length / 2);
    activities = [...activities.slice(0, mid), { type: 'funfact', id: `${lesson.id}-fact`, prompt: facts[plays % facts.length] }, ...activities.slice(mid)];
  }

  // The revision cards go in near the end, after the last teaching beat and before the closing question, so the lesson
  // still finishes on something with a right answer.
  const cards = wordCards(packById(lesson.packId), lesson, activities, plays);
  if (cards.length) {
    const at = Math.max(1, activities.length - 2);
    activities = [...activities.slice(0, at), ...cards, ...activities.slice(at)];
  }

  session = {
    lesson,
    queue: activities.slice(),
    index: 0,
    correct: 0,
    total: 0,
    wrongIds: [],
    shown: new Set(),         // prompts already on screen this session, so a re-ask cannot repeat one
    recoveredIds: [],         // ideas answered right on a different question after a re-teach
    startedAt: Date.now(),
    locked: false,
  };

  // Coming back to a lesson they did not finish: pick it up at the card they were on. The saved card is an id, not a
  // number, because the list is rebuilt each time (a pre-hook on the first lesson of a chapter, a fun fact halfway),
  // and an id either exists in the new list or safely falls back to the beginning.
  const saved = lesson.isPractice ? null : learner?.inProgress?.[lesson.lessonId];
  const resumeAt = saved?.activityId ? session.queue.findIndex((a) => a.id === saved.activityId) : -1;
  if (resumeAt > 0) {
    session.index = resumeAt;
    session.correct = saved.correct || 0;
    session.total = saved.total || 0;
    session.wrongIds = Array.isArray(saved.wrongIds) ? saved.wrongIds : [];
    session.resumed = true;
  }

  wrap.append(el('h1', { class: 'visually-hidden', text: lesson.title || t('path') }));
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
        // Credit, not a door: a lesson never sends a child out of the app. The licence and its link are on the
        // grown-ups screen, where someone can follow it.
        lesson.sceneCredit ? el('span', { class: 'credit-note', text: lesson.sceneCredit.url ? `${t('pictureCredit')}: ${lesson.sceneCredit.text}` : lesson.sceneCredit.text }) : null,
      ]) : null,
    ]));
  }

  const strip = el('div', { class: 'mascot-strip' });
  const mascotImg = el('img', { class: 'mascot-strip__img', src: mascotAvatar('idle'), alt: '', 'aria-hidden': 'true' });
  const bubble = el('div', { class: 'mascot-strip__bubble', text: lesson.title });
  strip.append(mascotImg, bubble);
  side.append(strip);

  session.side = side;
  const stage = el('div', { class: 'lesson__stage' });
  // Declare the language of the lesson itself. A child can read a Hindi or Kannada book with the app's buttons
  // in English, and without this a screen reader pronounces the lesson as English.
  const bookLang = packById(lesson.packId)?.language;
  if (bookLang && bookLang !== getLocale()) stage.setAttribute('lang', bookLang);
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
    session.side = side;
  }

  session.wrap = wrap;
  session.stage = stage;
  session.bubble = bubble;
  session.mascotImg = mascotImg;
  session.progressFill = wrap.querySelector('.lesson__progress span');
  session.progressText = wrap.querySelector('.lesson__count');
  if (session.resumed) updateProgress();

  setTimeout(() => renderActivity(), 30);
  return wrap;
}

// The chapter a lesson or a review card belongs to: concept links live inside one chapter.
function chapterFor(activity, lesson = session?.lesson) {
  const pack = packById(activity?.packId || lesson?.packId);
  const id = activity?.chapterId || lesson?.chapterId;
  if (!pack || !id) return null;
  return pack.units.flatMap((u) => u.chapters).find((c) => c.id === id) || null;
}

// A review proves the idea, not the wording: after the first exposure, practice serves a different question from the
// same card. A requeued mistake does the same later in its lesson (advance() marks it altLook).
function variantFor(item) {
  const s = session;
  if (!item || item.pre) return item;
  const l = activeLearner();
  const card = item.cardId ? l?.cards?.[item.cardId] : null;
  const rotate = (s.lesson?.isPractice && (card?.reps || 0) >= 1) || item.altLook;
  if (!rotate) return item;
  const chapter = chapterFor(item);
  if (!chapter) return item;
  const queued = new Set(s.queue.slice(s.index + 1).map((x) => x.id));
  const alt = pickAlt(item, chapter, { stats: l?.activityStats, shown: s.shown, queued, seed: card?.reps || 0 });
  return alt ? variantOf(alt, item) : item;
}

function renderActivity() {
  const s = session;
  if (!s) return;
  // A computed Maths problem draws new numbers every time it is shown (core/gen.js); anything else comes back as it is.
  // A retry after a hint shows the very same question again, numbers and all. A re-ask after a re-teach is a different
  // question from the same card, carrying the identity of the one that was missed so the idea is what gets credited.
  let activity;
  if (s.retry) activity = s.retry.activity;
  else if (s.reask) activity = s.reask.activity;
  else activity = realise(variantFor(s.queue[s.index]));
  s.current = activity;   // feedback must explain THIS draw of the numbers, not the stored example
  if (activity?.prompt && s.shown) s.shown.add(activity.prompt);
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

  if (activity?.type === 'explore' && !widgetsLoaded()) {
    loadWidgets().then(() => { if (session === s && s.current === activity) renderActivity(); }).catch(() => {});
  }
  const rendered = mod.render(resolveMedia(activity, s.lesson), {
    locked: false,
    locale: getLocale(),
    mascot: mascotAvatar,
    markWords: (r) => markWords(r, { hint: false }),
    bookLang: packById(s.lesson.packId)?.language || 'en',
    grade: String(activeLearner()?.grade ?? ''),
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

  // A screen-reader user gets no clue that the question changed, because the card is replaced without a page load and
  // nothing on it is announced. This polite live region says what the new card is.
  const announced = el('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
  const cardWords = (activity.prompt || activity.title || activity.promptText || '').toString().replace(/\s+/g, ' ').trim();
  const kindWord = activity.type === 'passage' ? t('readAloud') : activity.type === 'mcq' || activity.type === 'truefalse' ? t('question') : '';
  announced.textContent = `${s.index + 1} / ${s.queue.length}${kindWord ? `, ${kindWord}` : ''}${cardWords ? `: ${cardWords.slice(0, 160)}` : ''}`;
  s.stage.append(announced);

  // render() may call submit synchronously for pair activities that auto-complete
  s.stage.append(rendered.root);
  if (!rendered.root.isConnected) s.stage.append(rendered.root);
  // A keyboard or switch user should land on the first thing to press, not on the page body: on a question that is
  // the first answer, on a reading card the button that moves on.
  requestAnimationFrame(() => {
    if (!s || s.current !== activity) return;   // the card changed again before this ran
    const live = (sel) => [...rendered.root.querySelectorAll(sel)].filter((b) => !b.disabled && b.offsetParent);
    const first = live('.option, .tf-btn, .match-item, .order-chip, .label-chip, .text-input, .activity__actions .btn--primary, .hook__cta')[0];
    if (first) first.focus({ preventScroll: true });
  });
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
  // Everywhere a child reads in a lesson can be tapped for a single word. Concept cards and passages attach their own
  // listener (they draw their text themselves), so the shell covers the question-facing cards.
  if (!['concept', 'passage'].includes(activity.type)) {
    attachWordTap(rendered.root, speechLang());
  }
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

  // The different question asked after a re-teach. One go: the idea is either recovered or it comes back tomorrow.
  if (s.reask) { finishReask(rendered, response); return; }

  // The second go after a hint. A right answer now earns half the points. A second miss is not the end of the question:
  // the child sees the one line that taught it, then gets a different question about the same idea.
  if (s.retry) {
    s.retry = null;
    if (correct) {
      addXP(5);
      react(s, true);
      showFeedback(s, activity, true, response);
    } else {
      react(s, false);
      retakeOffer(s, activity, response);
    }
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
    s.bubble.textContent = themeCopy('correct', 'correct', t('correct'), getLocale());
    s.bubble.classList.remove('is-wrong');
    s.mascotImg.src = mascotAvatar('happy') || '';
    s.mascotImg.classList.add('is-happy');
    s.streak = (s.streak || 0) + 1;
    sound('correct', s.streak);
    sparkle(s.wrap);
  } else {
    s.bubble.textContent = themeCopy('wrong', 'wrong', t('wrong'), getLocale());
    s.bubble.classList.add('is-wrong');
    s.mascotImg.src = mascotAvatar('wrong') || '';
    s.mascotImg.classList.add('is-wrong');
    s.streak = 0;
    sound('wrong');
  }
  setTimeout(() => {
    s.mascotImg.classList.remove('is-happy', 'is-wrong');
  }, 700);

  // Question types with no fair hint (true or false, two choices, a matching board) get the re-teach and a different
  // question straight away, so no wrong answer is ever met with just "no" and nothing to do about it.
  if (!correct) { retakeOffer(s, activity, response); persist(); return; }

  showFeedback(s, activity, true, response);

  persist();
}

function advance() {
  const s = session;
  if (!s) return;
  s.retry = null;
  s.reask = null;
  s.index += 1;

  // Ideas that never came right, even after a different question, come back later in the session, once, as another
  // question from the same card. Never the exact wording the child has already seen twice.
  if (s.index === Math.ceil(s.queue.length / 2) && s.wrongIds.length && !s.requeued) {
    s.requeued = true;
    const open = s.queue.filter((a) => s.wrongIds.includes(a.id) && !s.recoveredIds.includes(a.id));
    const requeue = open.slice(0, 2).map((a) => ({ ...a, altLook: true }));
    s.queue.splice(s.index, 0, ...requeue);
  }

  updateProgress();
  if (s.index >= s.queue.length) {
    renderCelebration();
  } else {
    renderActivity();
  }
}

// The position is written after every card, so a child who closes the tab mid-lesson comes back to the same card.
function saveLessonPosition() {
  const l = activeLearner();
  const s = session;
  if (!l || !s || s.lesson?.isPractice || s.done) return;
  const cur = s.queue[s.index];
  if (!cur?.id) return;
  l.inProgress = l.inProgress || {};
  l.inProgress[s.lesson.lessonId] = {
    activityId: cur.id, correct: s.correct || 0, total: s.total || 0,
    wrongIds: (s.wrongIds || []).slice(0, 24), at: Date.now(),
  };
  persist();
}

function clearLessonPosition(lessonId) {
  const l = activeLearner();
  if (!l?.inProgress || !lessonId) return;
  delete l.inProgress[lessonId];
  persist();
}

function updateProgress() {
  const s = session;
  saveLessonPosition();
  const pct = Math.round((s.index / s.queue.length) * 100);
  s.progressFill.style.width = pct + '%';
  s.progressText.textContent = `${s.index}/${s.queue.length}`;
  if (pct >= 50 && !s.halfway) { s.halfway = true; sound('halfway'); }
  // The topic picture is the same on every card. On a phone, where it is stacked above the card rather than beside it,
  // it has done its job by the end of the opening card, so it steps aside and the question gets the screen.
  if (s.side) s.side.classList.toggle('lesson__side--opened', s.index >= 1);
}

// After a lesson: how far through the chapter the child is, and where to read this in the real book.
// Is this the lesson that finishes the whole book? Shared by the note and the buttons under it.
function bookCompletion(lesson) {
  const l = activeLearner();
  const pack = lesson.packId ? packById(lesson.packId) : null;
  if (!pack || !l) return null;
  const ids = pack.units.flatMap((u) => u.chapters.flatMap((c) => [
    ...c.lessons.map((x) => x.id), ...(c.boss ? [bossId(c)] : []),
  ]));
  const done = ids.filter((id) => l.lessonsDone[id] || id === lesson.lessonId).length;
  return done >= ids.length ? { pack, total: ids.length } : null;
}

function finishedNotes(lesson) {
  const out = [];
  const l = activeLearner();
  const pack = lesson.packId ? packById(lesson.packId) : null;
  const chapter = pack?.units.flatMap((u) => u.chapters).find((c) => c.id === lesson.chapterId);
  // The lesson being celebrated is not in lessonsDone yet, so count it in: the child has just finished it.
  const isDone = (id) => !!(l?.lessonsDone?.[id] || id === lesson.lessonId);
  if (chapter && l) {
    const ids = [...chapter.lessons.map((x) => x.id), ...(chapter.boss ? [bossId(chapter)] : [])];
    const done = ids.filter(isDone).length;
    out.push(el('div', { class: 'finished' }, [
      el('b', { text: done === ids.length ? t('chapterDone', { title: chapter.title }) : t('chapterStep', { done, total: ids.length }) }),
      el('div', { class: 'finished__bar' }, [el('span', { style: { width: `${Math.round((done / ids.length) * 100)}%` } })]),
    ]));
    // The chapter bar was the largest thing a child could finish. A whole book deserves its own moment, and it only
    // exists on the lesson that completes it.
    const wholeBook = bookCompletion(lesson);
    if (wholeBook) {
      out.push(el('div', { class: 'finished finished--book' }, [
        el('b', { text: t('finishedBook', { title: pack.title, n: wholeBook.total }) }),
        el('span', { class: 'finished__hint', text: t('bookDoneHint') }),
      ]));
    }
  }
  const pages = new Map();
  for (const a of lesson.activities || []) for (const x of a.src || []) { const arr = pages.get(x.ch) || []; arr.push(x.p); pages.set(x.ch, arr); }
  if (pages.size && !lesson.isPractice) {
    const [ch, ps] = [...pages.entries()][0];
    const lo = Math.min(...ps), hi = Math.max(...ps);
    out.push(el('p', { class: 'in-book', text: lo === hi ? t('inBookOne', { chapter: chapter?.title || `Chapter ${ch}`, page: lo }) : t('inBookMany', { chapter: chapter?.title || `Chapter ${ch}`, from: lo, to: hi }) }));
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

  // The day's goal is the one number a child can move by themselves, and until now only Grown-ups knew about it. It is
  // said once, on the lesson that crosses it, so it reads as an occasion rather than a counter.
  const goalXp = l?.dailyGoal || 50;
  const goalFresh = !!l && (l.dailyXp || 0) >= goalXp && l.goalDay !== todayKey();
  if (goalFresh) { l.goalDay = todayKey(); persist(); }
  const praise = accuracy >= 90 ? t('praiseHigh') : accuracy >= 60 ? t('praiseMid') : t('praiseLow');
  const box = el('div', { class: 'celebrate' }, [
    el('img', { class: 'celebrate__art', src: mascotImage(accuracy >= 60 ? 'happy' : 'idle') || '', alt: '' }),
    el('h2', { class: 'celebrate__title', text: s.lesson.isFix ? t('practiceCompleteFix') : s.lesson.isPractice ? t('practiceDone') : (getLocale() === 'en' ? (getTheme()?.copy?.celebrateTitle || t('lessonComplete')) : t('lessonComplete')) }),
    (() => {
      // The number counts up: the child watches the reward arrive instead of reading a finished total. A child who has
      // asked their phone for less motion gets the final number straight away.
      const label = el('span', { text: `+${xpGained} ${t('xp')}` });
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      if (xpGained > 0 && !reduced) {
        label.textContent = `+0 ${t('xp')}`;
        const started = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - started) / 700);
          const eased = 1 - (1 - k) ** 3;
          label.textContent = `+${Math.round(xpGained * eased)} ${t('xp')}`;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        setTimeout(() => { label.textContent = `+${xpGained} ${t('xp')}`; }, 900);
      }
      return el('div', { class: 'xp-pill' }, [icon('star', { size: 26 }), label]);
    })(),
    goalFresh ? el('p', { class: 'celebrate__goal' }, [icon('crown', { size: 20 }), el('span', { text: t('goalReached', { n: goalXp }) })]) : null,
    el('p', { class: 'celebrate__body', text: praise }),
    el('div', { class: 'celebrate__stats' }, [
      el('div', { class: 'celebrate__stat' }, [el('b', { text: `${s.correct}/${s.total}` }), el('span', { text: t('statCorrect') })]),
      el('div', { class: 'celebrate__stat' }, [el('b', { text: `${accuracy}%` }), el('span', { text: t('accurate') })]),
      el('div', { class: 'celebrate__stat' }, [el('b', { text: `${minutes}m` }), el('span', { text: t('statTime') })]),
    ]),
    s.recoveredIds?.length ? el('p', { class: 'celebrate__fixed', text: s.recoveredIds.length === 1
      ? 'One tricky idea is fixed, because you thought about it again.'
      : `${s.recoveredIds.length} tricky ideas are fixed, because you thought about them again.` }) : null,
  ]);

  const facts = s.lesson.funFacts || [];
  if (facts.length) {
    const plays = l?.lessonsDone?.[s.lesson.lessonId]?.count || 1;
    box.append(el('p', { class: 'fun-fact' }, [el('b', { text: `${bookWord(packById(s.lesson.packId)?.language, 'Did you know?')} ` }), facts[plays % facts.length]]));
  }
  // The words this lesson used, said again at the end where they are freshest, and the whole book's words one tap away:
  // the word bank is the page they live on, and this is the moment a child knows which ones they just met.
  {
    const pack = packById(s.lesson.packId);
    const learnt = lessonWords(pack, s.lesson, s.lesson.activities).slice(0, 4);
    if (pack && learnt.length) {
      box.append(el('div', { class: 'celebrate__words' }, [
        el('p', { class: 'celebrate__words-title', text: t('wordsThisLesson') }),
        el('ul', { class: 'celebrate__word-list' }, learnt.map((w) => el('li', {}, [
          el('b', { text: w.term }),
          el('span', { text: w.meaning }),
        ]))),
        el('a', { class: 'catalogue-link', href: `/books/${pack.id}/glossary.html`, text: t('wordBankOpen') }),
      ]));
    }
  }
  box.append(...finishedNotes(s.lesson));

  for (const r of unlocked) {
    box.append(el('div', { class: 'unlock' }, [
      el('img', { src: themeAsset(r.art), alt: '' }),
      el('div', {}, [el('b', { text: rewardName(r) }), el('span', { text: t('rewardUnlocked') })]),
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
  const replayMissed = () => {
    session = null;
    startLesson({ id: 'replay-' + Date.now(), lessonId: 'practice', title: s.lesson.title, activities: missed, estimatedMinutes: Math.max(1, Math.round(missed.length / 2)), isPractice: true, packId: s.lesson.packId, topicScene: s.lesson.topicScene, sceneAlt: s.lesson.sceneAlt });
  };
  const missedLabel = missed.length === 1 ? bw('Try the one you missed') : bw('Try the {n} you missed').replace('{n}', missed.length);
  const replay = accuracy < 60 && missed.length ? el('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: replayMissed }, [missedLabel]) : null;
  // A lesson that went well can still be tidied up: the same offer, quietly, so the misses do not have to wait for
  // the practice queue to resurface them.
  const replayOffer = !replay && missed.length ? el('button', { class: 'btn btn--ghost btn--block', type: 'button', onclick: replayMissed }, [missedLabel]) : null;
  if (replay) box.querySelector('.celebrate__body').textContent = bw('Good effort! Have another go at the ones that were tricky, and they will stick.');
  const finishedBook = bookCompletion(s.lesson);
  box.append(el('div', { class: 'activity__actions' }, [
    replay,
    upNext ? el('button', { class: `btn${replay ? ' btn--ghost' : ' btn--primary'} btn--block`, type: 'button', onclick: () => { session = null; startLesson(upNext); } }, [
      el('span', { text: `${t('nextLesson')}: ${upNext.title}` }),
    ]) : null,
    replayOffer,
    more,
    // A lesson that went badly is worth reading again, but only ever as an offer: trying just the questions missed
    // stays the main next step, so the child is never sent back through ten minutes of reading as a punishment.
    !s.lesson.isPractice && accuracy < 50 ? el('button', { class: 'btn btn--ghost btn--block', type: 'button', text: t('readAgain'), onclick: () => {
      const again = s.lesson;
      session = null;
      startLesson(again);
    } }) : null,
    el('button', { class: `btn${upNext || more || replay ? ' btn--ghost' : ''} btn--block`, type: 'button', text: t('backHome'), onclick: () => { session = null; go('home'); } }),
    // Finishing a book is the only time the trail is the right next step, so give it the main button and say why.
    finishedBook
      ? el('button', { class: 'btn btn--primary btn--block', type: 'button', text: t('pickAnotherClass'), onclick: () => { session = null; go('path'); } })
      : el('button', { class: 'btn btn--ghost btn--block', type: 'button', text: t('path'), onclick: () => { session = null; go('path'); } }),
  ]));
  // On a phone the words card fills the screen, so the buttons that carry the child onward are placed above it: the
  // next lesson is one tap from the stats, and the words are there for whoever wants to read them.
  if (window.matchMedia?.('(max-width: 720px)')?.matches) {
    const wordsBlock = box.querySelector('.celebrate__words');
    const actionsBlock = box.querySelector('.activity__actions');
    if (wordsBlock && actionsBlock) box.insertBefore(actionsBlock, wordsBlock);
  }

  s.done = true;
  clearLessonPosition(s.lesson.lessonId);
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
      class: 'icon-btn', type: 'button', 'aria-label': t('leaveLesson'),
      onclick: () => { session = null; go(router.backScreen || 'home'); },
    }, [icon('close')]),
    el('div', { class: 'lesson__progress', role: 'progressbar', 'aria-label': t('lessonProgress'), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, [el('span', { style: { width: '0%' } })]),
    el('div', { class: 'lesson__count', text: `0/${count}` }),
    highlightToggle(),
    el('button', { class: 'icon-btn', type: 'button', 'aria-label': t('readAloud'), title: t('readAloud'), onclick: readQuestion }, [icon('speaker')]),
    el('button', { class: 'icon-btn', type: 'button', 'aria-label': t('shareLesson'), title: t('shareLesson'), onclick: shareLesson }, [icon('share')]),
  ]);
}

// Questions are the one part of a lesson with no voice of their own: a child who is still learning to read (or
// reading a Hindi book with an English interface) can hear the question and the choices read out. Clips exist
// only for concept and passage text, so this path uses the device voice.
function readQuestion() {
  const root = document.querySelector('.activity');
  if (!root) return;
  const prompt = (root.querySelector('.activity__prompt')?.textContent || '').trim();
  const options = [...root.querySelectorAll('.option .option__text')].map((x) => (x.textContent || '').trim()).filter(Boolean);
  const said = [];
  if (prompt) said.push(prompt);
  options.forEach((text, i) => said.push(`${String.fromCharCode(65 + i)}. ${text}`));
  // True or false, matching and ordering cards have their choices outside .option, and a child who cannot read yet
  // hears nothing of them without this.
  if (!options.length) {
    const pairs = [...root.querySelectorAll('.tf-btn')].map((b) => (b.textContent || '').trim()).filter(Boolean);
    if (pairs.length) said.push(pairs.join('. '));
    const left = [...root.querySelectorAll('.match-col:first-child .match-item')].map((b) => (b.textContent || '').trim());
    const right = [...root.querySelectorAll('.match-col:last-child .match-item')].map((b) => (b.textContent || '').trim());
    if (left.length) said.push(left.slice(0, 6).join(', '), '.', right.slice(0, 6).join(', '));
    const chips = [...root.querySelectorAll('.order-chip, .label-bar .label-chip')].map((b) => (b.textContent || '').trim()).filter(Boolean);
    if (chips.length) said.push(chips.slice(0, 8).join(', '));
  }
  // A reading card has its own player: it reads every paragraph with the words lighting up as it goes. Use it rather
  // than sending the whole passage through the header's single speak call, which stops after the first clip.
  const passageListen = root.querySelector('.activity--passage .passage__listen');
  if (passageListen) { passageListen.click(); return; }
  if (!said.length) {
    // a hook or a card without a question box: read the words on the card itself, without the buttons
    const copy = root.cloneNode(true);
    copy.querySelectorAll('button, .btn, .activity__actions, .option, .hook__cta, .passage__hint, .passage__kicker').forEach((node) => node.remove());
    copy.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px';
    document.body.append(copy);
    const words = (copy.innerText || copy.textContent || '').replace(/\s+/g, ' ').trim();
    copy.remove();
    if (!words) { toast(t('nothingToRead')); return; }
    said.push(words.slice(0, 320));
  }
  speak(said.map((text) => ({ text: plain(text) })), speechLang());
}

// A lesson now has an address of its own (see the deep-link block). A teacher or a parent can send it on:
// the phone share sheet where there is one, otherwise the address goes to the clipboard.
async function shareLesson() {
  const url = location.href;
  const title = router.lesson?.title ? `${router.lesson.title} | Hooty` : 'Hooty';
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
  } catch {
    // the share sheet was dismissed: fall through and copy instead
  }
  try {
    await navigator.clipboard.writeText(url);
    toast(t('linkCopied'));
  } catch {
    toast(url);   // no clipboard (or blocked): show the address so it can be copied by hand
  }
}

// Marker-pen button: switches key-word highlighting on or off without leaving the lesson.
function highlightToggle() {
  const l = activeLearner();
  const on = () => document.body.classList.contains('hl-on');
  const b = el('button', { class: 'icon-btn icon-btn--hl', type: 'button', 'aria-label': t('highlightToggleLabel'), 'aria-pressed': String(on()) }, [icon('highlight')]);
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
    s.bubble.textContent = themeCopy('correct', 'correct', t('correct'), getLocale());
    s.bubble.classList.remove('is-wrong');
    s.mascotImg.src = mascotAvatar('happy') || '';
    s.mascotImg.classList.add('is-happy');
    sound('correct', 1);
    sparkle(s.wrap);
  } else {
    s.bubble.textContent = themeCopy('wrong', 'wrong', t('wrong'), getLocale());
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
    el('div', { class: 'sheet__head' }, [el('span', { class: 'sheet__mark' }, [icon('cross')]), el('h2', { class: 'sheet__title', text: bw('Not quite. Have another go!') })]),
    el('p', { class: 'sheet__body', text: hint.text }),
  ]);
  const again = el('button', { class: 'btn btn--primary btn--block', type: 'button', text: bw('Try again') });
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
    if (b) { b.disabled = true; b.classList.add('option--out'); b.setAttribute('aria-label', `${b.textContent} ${bw('(ruled out)')}`); }
  }
  root.querySelector('.activity__prompt')?.after(el('p', { class: 'hint-note', role: 'note' }, [el('b', { text: bw('Hint: ') }), hint.text]));
  s.bubble.textContent = bw('Have another go!');
}

// What taught this question, shown again beside the explanation: one line when the link is sure, the card's own
// remember-list when it is not, so the re-reading always covers what the next question may ask.
function rememberBlock(reveal, w) {
  const box = el('div', { class: 'remember' }, [el('p', { class: 'remember__kick', text: w('Read this again') })]);
  if (reveal.title) box.append(el('p', { class: 'remember__title', text: reveal.title }));
  if (reveal.one) box.append(el('p', { class: 'remember__line', text: reveal.lines[0] }));
  else box.append(el('ul', { class: 'remember__list' }, reveal.lines.map((text) => el('li', { text }))));
  const read = el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: w('Listen') });
  read.addEventListener('click', () => speak(reveal.lines.map((text) => ({ text: plain(text) })), speechLang()));
  box.append(read);
  return box;
}

// A second miss: show what the question was really asking, then offer a different question about the same idea.
function retakeOffer(s, activity, response) {
  const chapter = chapterFor(activity);
  const l = activeLearner();
  const queued = new Set(s.queue.slice(s.index + 1).map((x) => x.id));
  const alt = chapter ? pickAlt(activity, chapter, { stats: l?.activityStats, shown: s.shown, queued }) : null;
  // whole: the different question tests another line of the same card, so re-reading one line would not cover it.
  showFeedback(s, activity, false, response, { retake: alt ? { base: activity, activity: variantOf(alt, activity), whole: alt.focus !== activity.focus } : true });
}

// Answered the different question: credit the idea, not the wording. Right means the idea is known, so the card lands
// in tomorrow's box and leaves Practise today; the first-try miss still shows in the grown-ups view. Wrong means it
// stays a mistake and comes back tomorrow.
function finishReask(rendered, response) {
  const s = session;
  const { base, activity } = s.reask;
  s.reask = null;
  const correct = rendered.check(response);
  const l = activeLearner();
  if (l) {
    l.retakes = l.retakes || { n: 0, fixed: 0 };
    l.retakes.n += 1;
    if (correct) l.retakes.fixed += 1;
  }
  // The same card id the miss wrote: a lesson question carries no cardId of its own, so the lesson id has to be added
  // here exactly as the first attempt added it, or the recovery lands on a different card and Practise never clears.
  recordActivity({ ...base, lessonId: s.lesson.lessonId || base.lessonId }, correct);
  if (correct) { s.recoveredIds.push(base.id); addXP(5); }
  react(s, correct);
  showFeedback(s, activity, correct, response);
  persist();
}

function showFeedback(s, activity, correct, response = {}, opts = {}) {
  // A wrong answer teaches: say what that particular mistake usually is, then walk through the solution with a picture.
  const slip = !correct && activity.why && activity.options ? activity.why[activity.options[response.choice]] : '';
  const steps = !correct && activity.steps?.length ? activity.steps : null;
  const model = !correct && activity.modelSpec ? renderModel(activity.modelSpec) : null;
  const w = (text) => bookWord(packById(s?.lesson?.packId)?.language, text);
  const retake = opts.retake?.activity || null;
  // The different question can test another line of the same card. When it does, the child needs the whole
  // remember-list, not just the line the missed question asked about.
  const reveal = opts.retake ? revealFor(activity, chapterFor(activity), { whole: !!opts.retake.whole }) : null;
  // The sheet is where the teaching happens, so it can be read out: the verdict, the note about the slip, the working,
  // and the explanation. Clips do not exist for feedback, so this uses the device voice like the question button.
  const teach = [correct ? t('correct') : t('wrong'), slip || '', ...(steps || []), !steps && activity.explanation ? activity.explanation : '']
    .map((x) => (x || '').trim()).filter(Boolean).join('. ');
  const saySheet = el('button', { class: 'icon-btn icon-btn--sm', type: 'button', 'aria-label': t('readFeedback'), title: t('readFeedback'), onclick: () => speak([{ text: plain(teach) }], speechLang()) }, [icon('speaker')]);
  // Focus lands inside this panel, so it needs a name: without one a screen reader announces "Continue, button" with no
  // hint of what it is continuing. role="status" stays, because the whole panel should be read out as it appears.
  const sheet = el('div', {
    class: `sheet sheet--${correct ? 'correct' : 'wrong'}`, role: 'status', 'aria-labelledby': 'sheet-title',
  }, [
    el('div', { class: 'sheet__head' }, [
      el('span', { class: 'sheet__mark' }, [icon(correct ? 'check' : 'cross')]),
      el('h2', { class: 'sheet__title', id: 'sheet-title', text: correct ? t('correct') : t('wrong') }),
      saySheet,
    ]),
    slip ? el('p', { class: 'sheet__why', text: slip }) : null,
    model ? el('figure', { class: 'model-fig' }, [model]) : null,
    steps ? el('ol', { class: 'sheet__steps' }, steps.map((x) => el('li', { text: x })))
      : (activity.explanation ? el('p', { class: 'sheet__body', text: activity.explanation }) : null),
    reveal ? rememberBlock(reveal, w) : null,
  ]);
  const actions = el('div', { class: 'activity__actions' });
  if (retake) {
    // One more go, on a question that is new to the child. Skipping stays possible, quietly, so a stuck child is never
    // trapped in a loop.
    const again = el('button', { class: 'btn btn--primary btn--block', type: 'button', text: w('Try a different question') });
    again.addEventListener('click', () => { s.reask = opts.retake; renderActivity(); });
    const later = el('button', { class: 'btn btn--ghost btn--block', type: 'button', text: w('Later') });
    later.addEventListener('click', advance);
    actions.append(again, later);
  } else {
    const cont = el('button', { class: 'btn btn--primary btn--block', type: 'button', text: correct ? t('keepGoing') : t('next') });
    cont.addEventListener('click', advance);
    actions.append(cont);
  }
  sheet.append(actions);
  s.stage.append(sheet);
  markWords(sheet);
  attachWordTap(sheet, speechLang());
  // Escape is what a keyboard user reaches for to dismiss a panel that took over the screen. It does what the main
  // button does, so nobody is stuck holding the keyboard to get past feedback.
  sheet.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    (actions.querySelector('button') || sheet).click();
  });
  (actions.querySelector('button') || sheet).focus({ preventScroll: true });
  requestAnimationFrame(() => sheet.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
}

function screenPractice() {
  const l = activeLearner();
  const wrap = el('div', { class: 'page screen' });
  // The screens carry their title in the top bar, which is decoration for a screen reader: the page needs a real h2
  // so the "No mistakes to fix" h3 underneath it is not an orphan.
  wrap.append(el('h2', { class: 'visually-hidden', text: t('practiseTab') }));
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
      el('p', { class: 'review-card__label', text: t(picked.length === 1 ? 'reviewOne' : 'reviewMany') }),
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
    el('h3', { text: finished ? t('practiceComplete') : t('noMistakes') }),
    el('p', { text: later ? t(later === 1 ? 'trickyOne' : 'trickyMany', { n: later })
      : finished ? t('allFixed') : t('mistakesWait') }),
    el('div', { class: 'empty__next' }, [
      next ? el('button', { class: 'btn btn--primary', type: 'button', onclick: () => startLesson(next) }, [`${t('nextLesson')}: ${next.title}`]) : null,
      quiz.length >= 3 ? el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => startLesson({ id: 'quiz-' + Date.now(), lessonId: 'practice', title: t('quickQuiz'), activities: quiz, estimatedMinutes: 2, isPractice: true }) }, [t('quickQuizN', { n: quiz.length })]) : null,
    ]),
  ]));
  return wrap;
}

// --- a family's own textbook ------------------------------------------------

function screenAddBook() {
  const wrap = el('div', { class: 'page screen addbook' });
  const input = el('input', { class: 'addbook__file', type: 'file', accept: 'application/pdf,.pdf', multiple: true, id: 'book-file' });
  const name = el('input', { class: 'text-input', type: 'text', maxlength: 60, placeholder: t('bookNamePlaceholder'), 'aria-label': t('bookNameLabel') });
  const status = el('p', { class: 'addbook__status', role: 'status' });
  const bar = el('span');
  const meter = el('div', { class: 'finished__bar', hidden: true }, [bar]);
  const go2 = el('button', { class: 'btn btn--primary btn--block', type: 'button', disabled: true }, [t('addBookMake')]);
  const WHY = {
    'no-text': t('addBookNoText'),
    'too-little-text': t('addBookLittleText'),
    unreadable: t('addBookUnreadable'),
    'no-lessons': t('addBookNoLessons'),
  };
  input.addEventListener('change', () => {
    go2.disabled = !input.files.length;
    if (input.files.length && !name.value) name.value = input.files[0].name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').slice(0, 60);
  });
  go2.addEventListener('click', async () => {
    const files = [...input.files];
    if (files.reduce((n, f) => n + f.size, 0) > 400 * 1048576) { status.textContent = t('addBookTooBig'); return; }
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
      status.textContent = WHY[e.code] || (e.name === 'PasswordException' ? t('addBookLocked') : t('addBookUnread'));
      go2.disabled = false; meter.hidden = true;
    }
  });
  wrap.append(el('section', { class: 'addbook__card' }, [
    el('h2', { class: 'section-title', text: t('addBookTitle') }),
    el('p', { text: t('addBookIntro') }),
    el('label', { class: 'btn btn--ghost btn--block', for: 'book-file', text: t('addBookChoose') }),
    input, name, go2, meter, status,
    el('p', { class: 'credit-note', text: t('addBookNote') }),
  ]));
  const own = packIndex.filter((p) => p.local);
  if (own.length) wrap.append(el('section', { class: 'addbook__card' }, [
    el('h3', { text: t('myBooks') }),
    ...own.map((b) => el('div', { class: 'addbook__row' }, [
      el('span', { text: b.title }),
      el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: async () => {
        if (!confirm(`Remove ${b.title} from this device?`)) return;
        await deleteBook(b.id);
        packIndex = packIndex.filter((p) => p.id !== b.id); packs = packs.filter((p) => p.id !== b.id);
        const l = activeLearner(); if (l?.grade === 'mine' && !packIndex.some((p) => p.local)) l.grade = '6';
        render();
      } }, [t('remove')]),
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
  const stage = el('div', { class: 'board__stage', role: 'group', 'aria-label': t('stickerBoard') });
  const removeBtn = el('button', { class: 'btn btn--ghost', type: 'button', hidden: true, onclick: async () => { if (selected >= 0) { items.splice(selected, 1); selected = -1; await save(); draw(); } } }, [t('takeItOff')]);
  const clearBtn = el('button', { class: 'btn btn--ghost', type: 'button', onclick: async () => { items = []; selected = -1; await save(); draw(); } }, [t('clearBoard')]);
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
    hint.textContent = !owned.length ? t('boardEmpty') : !items.length ? t('boardPick') : t('boardDrag');
  };
  const tray = el('div', { class: 'board__tray' }, owned.map((r) => el('button', {
    class: 'board__pick', type: 'button', 'aria-label': t('stickReward', { reward: rewardName(r) }),
    onclick: async () => { if (items.length >= 40) { toast(t('boardFull')); return; } items.push({ id: r.id, x: 25 + Math.random() * 50, y: 25 + Math.random() * 50 }); selected = -1; sound('tap'); await save(); draw(); },
  }, [el('img', { src: themeAsset(r.art), alt: '' })])));
  draw();
  return el('section', { class: 'board' }, [el('h2', { class: 'section-title', text: t('boardTitle') }), hint, stage, owned.length ? tray : null, el('div', { class: 'board__actions' }, [removeBtn, clearBtn])]);
}

function screenRewards() {
  const l = activeLearner();
  const wrap = el('div', { class: 'page screen' });
  const rewards = getTheme()?.rewards || [];
  const owned = rewards.filter((r) => l?.rewards?.includes(r.id)).length;

  const next = nextRewardFor(l);
  const xpNow = l?.xp || 0;
  wrap.append(el('h2', { class: 'section-title', text: t('stickers') }));
  wrap.append(el('p', { class: 'section-sub', text: t('stickerSub', { owned, total: rewards.length }) }));
  // A child looks at this page wondering how far the next sticker is; say the number instead of making them subtract.
  if (next) wrap.append(el('p', { class: 'reward-next', text: t('nextSticker', { n: Math.max(0, next.unlockAt - xpNow) }) }));
  const grid = el('div', { class: 'reward-grid' });
  for (const r of rewards) {
    const got = l?.rewards?.includes(r.id);
    const isNext = !got && next && r.id === next.id;
    grid.append(el('div', { class: `reward${got ? '' : ' is-locked'}${isNext ? ' is-next' : ''}` }, [
      el('img', { class: 'reward__art', src: themeAsset(r.art), alt: got ? rewardName(r) : '' }),
      el('span', { class: 'reward__name', text: got ? rewardName(r) : '???' }),
      el('span', { class: 'reward__need', text: got ? t('collected') : `${r.unlockAt} XP` }),
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
          // A theme carries translations of its own name and line, so a Hindi child reads about a Hindi world.
          el('div', { class: 'theme-card__name', text: theme.names?.[getLocale()]?.name || theme.name }),
          el('div', { class: 'theme-card__desc', text: theme.names?.[getLocale()]?.description || theme.description || '' }),
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

// --- install ----------------------------------------------------------------
// Chrome fires beforeinstallprompt once the app meets its criteria. Keep it until a grown-up asks, so the
// prompt comes from a real tap (the browser requires one) and a child never sees a marketing banner. Hooty is
// a static app, so once it is on the home screen it opens without a connection.
let installEvent = null;
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installEvent = event; });
const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function installCard() {
  if (isInstalled()) return null;
  if (installEvent) {
    return el('section', { class: 'install-card' }, [
      el('div', {}, [
        el('b', { text: t('keepHooty') }),
        el('span', { text: t('keepHootyBody') }),
      ]),
      el('button', {
        class: 'btn btn--primary', type: 'button',
        onclick: async () => {
          const event = installEvent;
          installEvent = null;
          try {
            event.prompt();
            const choice = await event.userChoice.catch(() => null);
            if (choice && choice.outcome === 'accepted') toast(t('addedToHome'));
          } catch { /* the browser withdrew the prompt */ }
          render();
        },
      }, [t('addToHome')]),
    ]);
  }
  // iPhone and iPad have no install event at all: the only route is the share sheet.
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    return el('p', { class: 'install-hint', text: t('installHintIos') });
  }
  return null;
}

function screenParent() {
  const l = activeLearner();
  const wrap = el('div', { class: 'page screen' });
  wrap.append(el('div', { class: 'privacy-note', style: { marginTop: 'var(--s2)' } }, [icon('lock', { size: 22 }), t('privacyNote')]));
  // What a parent wants to know before handing over the phone, in four lines rather than a policy page.
  wrap.append(el('section', { class: 'growth-card safety' }, [
    el('h2', { class: 'section-title', text: t('safetyTitle') }),
    el('ul', { class: 'growth-list' }, [
      el('li', { text: t('safetyNoAccount') }),
      el('li', { text: t('safetyNoTracking') }),
      el('li', { text: t('safetyNoExit') }),
      el('li', { text: t('safetyData') }),
      // A free app still needs a way to hear about a mistake: one mail link, on the grown-ups screen only, so a child
      // never sees it and no form or account is needed.
      el('li', {}, [el('span', { text: t('reportProblem') }), ' ', el('a', { class: 'credit-link', href: `mailto:anirudhprashant@gmail.com?subject=${encodeURIComponent('Hooty feedback')}`, text: 'anirudhprashant@gmail.com' })]),
    ]),
  ]));
  const install = installCard();
  if (install) wrap.append(install);

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
    statCard(String(l?.streak || 0), t('streak'), undefined, t('bestStreak', { n: l?.bestStreak || 0 })),
    statCard(`${accuracy}%`, t('accurate')),
    statCard(`${minutes}m`, t('timeLearned')),
    statCard(String(Object.keys(l?.lessonsDone || {}).length), t('lessonsDone')),
    statCard(String(totalAttempts), t('attempts')),
  ]));

  wrap.append(weekStrip(l));

  // The honest measure: of the questions missed on the first try and tried again, how many does the child now get right?
  const retried = stats.filter((x) => x.first === false && x.seen > 1);
  const fixed = retried.filter((x) => x.last).length;
  const pairs = Object.entries(l?.post || {}).filter(([id]) => l?.pre?.[id]?.n);
  if (pairs.length) wrap.append(el('section', { class: 'growth-card' }, [
    el('h2', { class: 'section-title', text: t('beforeAfter') }),
    el('ul', { class: 'growth-list' }, pairs.map(([id, p]) => el('li', { text: t('chapterGrowth', { chapter: p.title, before: Math.round((100 * l.pre[id].c) / l.pre[id].n), after: p.pct }) }))),
    el('p', { class: 'growth-note', text: t('beforeAfterNote') }),
  ]));
  // A parent's first question is usually "which subject", so answer it before the finer detail.
  const bySubject = new Map();
  const lessonToPack = new Map();
  for (const p of packs) {
    for (const u of p.units || []) for (const c of u.chapters || []) {
      for (const l of c.lessons || []) lessonToPack.set(l.id, p);
      if (c.boss) lessonToPack.set(bossId(c), p);
    }
  }
  for (const [id, s] of Object.entries(l?.activityStats || {})) {
    const pack = lessonToPack.get(String(id).split('::')[0]);
    if (!pack) continue;
    const cur = bySubject.get(pack.id) || { name: subjectName(pack.subject) || pack.subject || pack.title, seen: 0, correct: 0 };
    cur.seen += s.seen || 0;
    cur.correct += s.correct || 0;
    bySubject.set(pack.id, cur);
  }
  const subjectRows = [...bySubject.values()].filter((r) => r.seen >= 5).sort((a, b) => b.seen - a.seen).slice(0, 6);
  if (subjectRows.length >= 2) {
    wrap.append(el('section', { class: 'growth-card' }, [
      el('h2', { class: 'section-title', text: t('subjectAccuracy') }),
      el('ul', { class: 'growth-list' }, subjectRows.map((r) => el('li', {}, [
        el('span', { text: r.name }),
        el('span', { text: ` · ${r.seen ? Math.round((100 * r.correct) / r.seen) : 0}% · ${t('answersWord', { n: r.seen })}` }),
      ]))),
      el('p', { class: 'growth-note', text: t('subjectAccuracyNote') }),
    ]));
  }
  wrap.append(el('section', { class: 'growth-card' }, [
    el('h2', { class: 'section-title', text: t('isItSticking') }),
    el('p', { text: retried.length
      ? t(retried.length === 1 ? 'stickingOne' : 'stickingSome', { n: retried.length, fixed })
      : t('stickingSoon') }),
    l?.retakes?.n ? el('p', { class: 'growth-note', text: t('retakeNote', { fixed: l.retakes.fixed, n: l.retakes.n }) }) : null,
  ]));

  // The same words are a page on the site, so a parent can read them without opening a lesson. It sits here because
  // this is where a grown-up looks, and the count is the book's own glossary once it has arrived.
  const thisBook = currentPack();
  if (thisBook) {
    const wordCount = thisBook.glossary?.terms?.length || 0;
    wrap.append(el('section', { class: 'growth-card' }, [
      el('h2', { class: 'section-title', text: t('wordBankTitle') }),
      el('p', { text: wordCount ? `${wordCount.toLocaleString()} · ${t('wordBankNote')}` : t('wordBankNote') }),
      el('p', {}, [el('a', {
        class: 'catalogue-link',
        href: `/books/${thisBook.id}/glossary.html`,
        text: t('wordBankOpen'),
      })]),
    ]));
  }

  wrap.append(el('h2', { class: 'section-title', text: t('progressByUnit') }));
  const list = el('div', { class: 'unit-list' });
  // A child in Class 6 was shown the units of all five Class 6 books, most of them sitting at 0%, so a parent read a
  // page of zeroes for books the child has never opened. Show the book they are in, plus any other book of theirs that
  // actually has finished lessons, and name the book when there is more than one.
  const finishedIn = (p) => p.units.reduce((n, u) => n + u.chapters.reduce((m, c) => {
    const ids = [...(c.lessons || []).map((x) => x.id), ...(c.boss ? [bossId(c)] : [])];
    return m + ids.filter((id) => l?.lessonsDone?.[id]).length;
  }, 0), 0);
  const here = currentPack();
  const shownPacks = gradePacks().filter((p) => p.id === here?.id || finishedIn(p) > 0);
  const nameTheBook = shownPacks.length > 1;
  for (const pack of shownPacks) {
    for (const unit of pack.units) {
      let total = 0, done = 0;
      for (const chapter of unit.chapters) {
        const ids = [...(chapter.lessons || []).map((x) => x.id), ...(chapter.boss ? [bossId(chapter)] : [])];
        total += ids.length;
        done += ids.filter((id) => l?.lessonsDone?.[id]).length;
      }
      const pct = total ? Math.round((done / total) * 100) : 0;
      list.append(el('div', { class: 'unit-row' }, [
        el('span', { class: 'unit-row__name', text: nameTheBook ? `${pack.title} · ${unit.title}` : unit.title }),
        el('div', { class: 'meter', role: 'progressbar', 'aria-label': t('unitProgress', { unit: unit.title }), 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' }, [el('span', { style: { width: pct + '%' } })]),
        el('span', { class: 'unit-row__pct', text: `${done}/${total}` }),
      ]));
    }
  }
  wrap.append(list);

  wrap.append(el('h2', { class: 'section-title', text: t('weakSpots') }));
  const weak = weakSpots(10);
  if (!weak.length) {
    wrap.append(el('div', { class: 'empty' }, [el('p', { text: t('noWeakSpots') })]));
  } else {
    wrap.append(el('div', { class: 'chip-list' }, weak.map((w) => el('span', { class: 'chip' }, [w.tag, ' ', el('b', { text: `×${w.lapses}` })]))));
    wrap.append(el('div', { class: 'activity__actions' }, [el('button', { class: 'btn', type: 'button', onclick: () => go('practice') }, [t('practiseTab')])]));
  }

  // Two children, one phone: who is learning now, and a way to switch. Each learner keeps its own progress.
  const people = learnerList();
  const cur = activeLearner();
  const section = el('section', { class: 'growth-card' }, [
    el('h2', { class: 'section-title', text: t('whoIsLearning') }),
    el('ul', { class: 'growth-list' }, people.map((p) => el('li', {}, [
      p.id === state.activeLearnerId
        ? el('span', { text: `${t('learnerNow', { name: p.name })} · ${p.lessons} · ${p.xp} XP` })
        : el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: t('switchTo', { name: p.name }), onclick: async () => {
          setActiveLearner(p.id);
          await persist();
          applyLearnerPrefs();
          render();
        } }),
    ]))),
    el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: t('addLearner'), onclick: async () => {
      const name = window.prompt(t('namePlaceholder'));
      createLearner((name || '').slice(0, 24) || 'Learner');
      await persist();
      applyLearnerPrefs();
      render();
    } }),
    el('p', { class: 'growth-note', text: t('addLearnerHint') }),
  ]);
  if (people.length > 1) wrap.append(section);
  else wrap.append(el('section', { class: 'growth-card' }, [
    el('h2', { class: 'section-title', text: t('whoIsLearning') }),
    el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: t('addLearner'), onclick: async () => {
      const name = window.prompt(t('namePlaceholder'));
      createLearner((name || '').slice(0, 24) || 'Learner');
      await persist();
      applyLearnerPrefs();
      render();
    } }),
    el('p', { class: 'growth-note', text: t('addLearnerHint') }),
  ]));

  wrap.append(el('h2', { class: 'section-title', text: t('yourData') }));
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
    fileInput.value = '';   // picking the same file twice must work
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast(t('importTooBig')); return; }
    let text = '';
    try {
      text = await f.text();
    } catch {
      toast(t('importUnreadable'));
      return;
    }
    // An import replaces everything on this device, so a family with two children should not lose the other one by
    // accident. Ask only when there is something to lose.
    const done = Object.values(activeLearner()?.lessonsDone || {}).length;
    if (done && !window.confirm(t('importReplace'))) return;
    try {
      await importSave(text);
      const l2 = activeLearner();
      const count = Object.keys(l2?.lessonsDone || {}).length;
      const who = l2?.name && !/^learner$/i.test(l2.name) ? l2.name : 'this learner';
      toast(count === 1 ? t('importDoneOne', { who, xp: l2?.xp || 0 }) : t('importDoneMany', { who, n: count, xp: l2?.xp || 0 }));
      render();
    } catch (e) {
      toast(e instanceof SyntaxError ? t('importBadFile') : (e.message || t('importUnreadable')));
    }
  });
  dl.append(el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => fileInput.click() }, [icon('upload', { size: 22 }), t('importData')]), fileInput);
  // The last word on data staying on this device: a family can take it away, and can also erase it here without
  // hunting through browser settings. Two asks, because there is no undo.
  dl.append(el('button', {
    class: 'btn btn--ghost btn--danger', type: 'button', onclick: async () => {
      if (!window.confirm(t('eraseAsk'))) return;
      if (!window.confirm(t('eraseConfirm'))) return;
      await wipe();
      toast(t('eraseDone'));
      location.reload();
    },
  }, [icon('cross', { size: 22 }), t('eraseData')]));
  // A parent taking the numbers to a school meeting: the browser's own print dialog, which every phone and computer has,
  // and which can save a PDF. No extra download, and it keeps working offline.
  dl.append(el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => window.print() }, [icon('download', { size: 22 }), t('printReport')]));
  wrap.append(dl);
  wrap.append(el('p', { class: 'section-sub', text: t('importNote') }));
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
    days.push({ xp, name: d.toLocaleDateString(getLocale() === 'hi' ? 'hi-IN' : getLocale() === 'kn' ? 'kn-IN' : 'en-GB', { weekday: 'short' }).slice(0, 4), today: i === 0 });
  }
  const top = Math.max(goal, ...days.map((x) => x.xp));
  const met = days.filter((x) => x.xp >= goal).length;
  return el('section', { class: 'growth-card week' }, [
    el('h2', { class: 'section-title', text: t('last7') }),
    el('p', { class: 'week__sum', text: met ? t('weekGoalMet', { n: met }) : t('weekGoalHint') }),
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
  const hlSwitch = toggle(l?.highlight !== false, t('highlightLabel'), async (v) => {
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

  const nameField = el('input', { class: 'text-input', type: 'text', maxlength: '24', autocomplete: 'given-name', 'aria-label': t('nameLabel'), value: /^learner$/i.test(l?.name || '') ? '' : (l?.name || ''), placeholder: t('namePlaceholder') });
  nameField.addEventListener('change', () => saveName(nameField.value));

  const langSel = el('select', { class: 'text-input', 'aria-label': t('language') });
  availableLocales().forEach((code) => {
    const opt = el('option', { value: code, text: code === 'en' ? 'English' : code === 'hi' ? 'हिन्दी' : 'ಕನ್ನಡ' });
    if (code === (l?.lang || 'en')) opt.selected = true;
    langSel.append(opt);
  });
  langSel.addEventListener('change', async () => {
    l.lang = langSel.value;
    l.langChosen = true;   // a deliberate choice: never override it from the book again
    setLocale(l.lang);
    await persist();
    render();
  });

  const guidePicker = el('div', { class: 'guide-picker', role: 'radiogroup', 'aria-label': t('yourGuide') },
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
    row(t('nameLabel'), null, nameField),
    row(t('sound'), t('soundHint'), soundSwitch),
    row(t('textSize'), t('textSizeHint'), range),
    row(t('highlightLabel'), t('highlightHint'), hlSwitch),
    row(t('dyslexiaFont'), t('fontHint'), dysSwitch),
    SHOW_GUIDE_PICKER ? row(t('guideLabel'), t('guideHint'), guidePicker) : null,
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
    wrap.append(el('h2', { class: 'section-title', text: t('creditsTitle') }));
    wrap.append(el('p', { class: 'section-sub', text: t('creditsFull') }));
    wrap.append(el('ul', { class: 'credit-list' }, credits.map((c) => el('li', {}, [
      el('a', { class: 'credit-link', href: safeLink(c.url), target: '_blank', rel: 'noopener noreferrer', text: c.text }),
    ]))));
  }

  return wrap;
}

// --- router ----------------------------------------------------------------

function go(screen) {
  router.screen = screen;
  // Seed the book from the child's own saved book, not from whichever book happens to be first in the index.
  // currentPack() trusts router.packId whenever that book is in the child's class, so seeding it with the wrong
  // book made Practice and the home cards talk about a different book than the one on the trail.
  if (screen !== 'path') router.packId = router.packId || activeLearner()?.packId || packs[0]?.id;
  render();
}

// --- deep links -------------------------------------------------------------
// Before this, the address bar never changed: a lesson could not be linked, shared with a class, or
// found by a search engine. #/book/<pack>, #/chapter/<pack>/<chapter> and #/lesson/<pack>/<lesson>
// now open that screen directly, and the hash is written as the child moves.

function packOfLesson(lesson) {
  for (const p of packs) {
    for (const u of p.units || []) {
      for (const c of u.chapters || []) {
        for (const x of c.lessons || []) if (x.id === lesson.id) return p;
        if (c.boss && (c.boss.id === lesson.id || bossId(c) === lesson.id)) return p;
      }
    }
  }
  return null;
}

function hashFor() {
  if (router.screen === 'lesson' && router.lesson?.id) {
    const p = packOfLesson(router.lesson) || (router.packId ? packById(router.packId) : null);
    if (p) return `#/lesson/${p.id}/${router.lesson.id}`;
  }
  if (router.screen === 'path') {
    const p = currentPack();
    if (p) return `#/book/${p.id}`;
  }
  if (router.screen === 'home' || router.screen === 'packs') return '#/';
  return null;
}

let hashWriting = false;
function syncHash() {
  if (linkPending) return;
  const next = hashFor();
  if (!next || location.hash === next) return;
  hashWriting = true;
  try { history.replaceState(null, '', next); } finally { hashWriting = false; }
}

// Open whatever the address bar names. Returns true when it took over the screen.
async function openDeepLink(href = location.hash) {
  const m = href.match(/^#\/(book|chapter|lesson)\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/i);
  if (!m) return false;
  const kind = m[1].toLowerCase(), packId = m[2], itemId = m[3];
  const known = packIndex.some((p) => p.id === packId) || !!packById(packId);
  if (!known) return false;
  if (!(await ensurePack(packId))) { toast(t('bookNotHere')); return false; }
  const pack = packById(packId);
  if (!pack) return false;
  const l = activeLearner();
  if (l) {
    if (pack.grade != null) l.grade = String(pack.grade);
    l.packId = pack.id;
    followBookLanguage(pack);   // a shared link into a Hindi book should open a Hindi app
    await persist();
  }
  router.packId = pack.id;
  if (kind === 'book') { go('path'); return true; }

  let chapter = null, lesson = null, unitId = null, chapterId = null, isBoss = false;
  for (const u of pack.units || []) {
    for (const c of u.chapters || []) {
      if (kind === 'chapter' && c.id === itemId) { chapter = c; unitId = u.id; chapterId = c.id; }
      for (const x of c.lessons || []) {
        if (kind === 'lesson' && x.id === itemId) { lesson = x; unitId = u.id; chapterId = c.id; }
      }
      // A chapter challenge is a page of its own (the trail calls it a boss) and carries its own id.
      if (kind === 'lesson' && c.boss && bossId(c) === itemId) {
        lesson = c.boss; unitId = u.id; chapterId = c.id; isBoss = true;
      }
    }
  }
  if (kind === 'chapter' && chapter) {
    const done = activeLearner()?.lessonsDone || {};
    const list = chapter.lessons || [];
    lesson = list.find((x) => !done[x.id]) || list[0] || null;
  }
  if (!lesson) { go('path'); toast(t('linkMoved'), 3200); return true; }
  // Stamp the book on the lesson the way the trail does, or its picture and audio paths resolve wrong.
  const lessonId = isBoss ? itemId : lesson.id;
  const title = isBoss ? (lesson.title || t('bossChallenge')) : lesson.title;
  startLesson({ ...lesson, title, packId: pack.id, unitId, chapterId, lessonId, isBoss: isBoss || undefined });
  return true;
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
    case 'practice': screen = screenPractice(); title = t('practiseTab'); needWholeClass(); break;
    case 'rewards': screen = screenRewards(); title = t('rewards'); break;
    case 'parent': screen = screenParent(); title = t('parent'); needWholeClass(); break;
    case 'themes': screen = screenThemes(); title = t('chooseTheme'); break;
    case 'settings': screen = screenSettings(); title = t('settings'); break;
    case 'addbook': screen = screenAddBook(); title = t('addMyBook'); break;
    default: screen = screenHome(); title = '';
  }

  // The tab, the history entry and the screen-reader announcement all use the page title. It said the site name on
  // every screen; it now names where you are, in the app's language.
  document.title = title ? `${title} · ${t('appName')}` : document.title.replace(/^.*? · /, '');

  // A lesson with a simulation in it needs the widget file; start that download now, while the child reads the opening
  // cards, instead of when the simulation card appears.
  if (session?.queue?.some((a) => a.type === 'explore') && !widgetsLoaded()) loadWidgets().catch(() => {});

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
  syncHash();
}

// --- parent view -----------------------------------------------------------



// --- themes + settings -----------------------------------------------------



// --- router ----------------------------------------------------------------



// --- boot ------------------------------------------------------------------

// On the very first visit the app's data is fetched before the service worker controls the page, so it is
// not cached and going offline afterwards shows "Hooty could not start". Hand the addresses the app used to
// the worker once it is in charge; every later visit, including an offline one, then works.
async function warmServiceWorker() {
  keepNavStill();
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return;
  let ctrl = navigator.serviceWorker.controller;
  if (!ctrl) {
    // The worker claims the page just after it activates; wait for the takeover instead of giving up.
    ctrl = await new Promise((resolve) => {
      const done = () => { navigator.serviceWorker.removeEventListener('controllerchange', done); resolve(navigator.serviceWorker.controller); };
      navigator.serviceWorker.addEventListener('controllerchange', done);
      setTimeout(done, 5000);
    });
  }
  if (!ctrl) return;
  const urls = ['./content/index.json', './themes/index.json'];
  for (const t of themes) if (t && t.id) {
    urls.push(`./themes/${t.id}/theme.json`);
    urls.push(`./themes/${t.id}/theme.css`);   // without it the offline app loses the theme's colours
  }
  const pack = currentPack();
  if (pack) {
    const card = packIndex.find((p) => p.id === pack.id);
    urls.push(`./content/packs/${pack.id}/pack.json${card && card.v ? `?v=${card.v}` : ''}`);
    urls.push(`./content/packs/${pack.id}/${pack.glossaryFile || 'glossary.json'}`);
  }
  ctrl.postMessage({ type: 'warm', urls });
}

async function main() {
  await boot();
  await loadShell();
  const l = activeLearner();
  const themeId = l?.theme || themes[0]?.id;
  currentThemeId = themeId;
  applyTheme(themes.find((x) => x.id === themeId) || themes[0]);
  const linkedPack = linkPending ? packFromHash(bootHash) : null;
  if (linkPending) {
    // A shared lesson link is about to replace the home screen: do not paint home at all, and fetch its book first.
    await loadFirstBook(linkedPack);
    render();
  } else {
    render();                 // first paint: theme, stage and mascot, without waiting for the book
    await loadFirstBook();
    render();                 // the book is in: progress, next lesson and the cards
  }
  const fromLink = await openDeepLink(bootHash);
  linkPending = false;
  if (fromLink === false && bootHash && bootHash !== '#/') {
    history.replaceState(null, '', '#/');
    // A link to a book that no longer exists used to land on Home with no word about why.
    if (/^#\/(book|chapter|lesson)\//i.test(bootHash)) toast(t('linkGone'), 3600);
  }
  syncHash();   // a chapter link opens its first unplayed lesson: name that lesson in the address bar
  // The rest of the class used to be fetched here, right after the home screen painted: six books, 1.2 MB on a phone,
  // for screens the child had not opened. Only Practice and Grown-ups read every book of a class, so they ask for them
  // (see render), and switching class still fetches the class the child actually chose.

  if ('serviceWorker' in navigator) {
    // Registered after first paint: precaching the app must not compete with the first load.
    const reg = () => navigator.serviceWorker.register('./sw.js').catch(() => {});
    if ('requestIdleCallback' in window) requestIdleCallback(reg, { timeout: 4000 }); else setTimeout(reg, 2000);
    warmServiceWorker();
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

window.addEventListener('hashchange', () => { if (hashWriting) return; linkPending = false; openDeepLink(); });

main().catch((err) => {
  console.error(err);
  clear(app);
  app.append(el('div', { class: 'empty fatal' }, [
    el('h2', { text: t('bootFailed') }),
    el('p', { text: navigator.onLine === false ? t('offlineLine') : t('loadFailedLine') }),
    el('button', { class: 'btn btn--primary', type: 'button', onclick: () => location.reload() }, [t('tryAgain')]),
  ]));
});
