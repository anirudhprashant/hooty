// Tiny DOM helpers. No framework. Everything is a function returning real elements.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) node.style.setProperty(prop, val);
        else node.style[prop] = val;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function button(label, opts = {}) {
  const b = el('button', {
    class: 'btn ' + (opts.variant ? `btn--${opts.variant}` : 'btn--primary'),
    type: 'button',
    'aria-label': opts.ariaLabel || undefined,
  }, [label]);
  if (opts.onClick) b.addEventListener('click', opts.onClick);
  return b;
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

// Spoken lines are pre-recorded (tools/make-audio.py) with one consistent woman's voice (American, friendly).
// Browsers' own voices vary a lot, so they are only the fallback for lines with no recording.
const AUDIO_BASE = new URL('../../audio/', import.meta.url);
let clips = null;
let player = null;

export function clipKey(text) {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(text)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

function loadClips() {
  if (!clips) clips = fetch(new URL('manifest.json', AUDIO_BASE)).then((r) => (r.ok ? r.json() : { keys: [] })).then((m) => new Set(m.keys)).catch(() => new Set());
  return clips;
}
loadClips();

function browserSpeak(text, lang) {
  if (typeof speechSynthesis === 'undefined') return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.92;
    u.pitch = 1.08;
    const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
    const woman = voices.find((v) => /female|woman|neerja|heera|zira|samantha|susan|veena|google (uk|us) english female/i.test(v.name));
    if (woman) u.voice = woman;
    speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

// Karaoke-style reading: wrap the words of `root` and light up the one being spoken, following the time of each
// word recorded with the clip. Marks and on-screen words are lined up by counting letters, so "1,300" or a hyphenated
// word stays in step however the voice splits it.
const letters = (t) => t.normalize('NFC').replace(/[^\p{L}\p{M}\p{N}]/gu, '');

function readAlong(root, audio, marks) {
  if (!root || !marks?.length) return;
  if (!root.querySelector('.rw')) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const frag = document.createDocumentFragment();
      for (const part of node.nodeValue.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) frag.append(part);
        else frag.append(el('span', { class: 'rw' }, [part]));
      }
      node.replaceWith(frag);
    }
  }
  const words = [...root.querySelectorAll('.rw')];
  if (!words.length) return;
  const ends = [];
  let total = 0;
  for (const w of words) { total += letters(w.textContent).length; ends.push(total); }
  let pos = 0, at = 0;
  const steps = marks.map(([ms, text]) => {
    while (at < words.length - 1 && pos >= ends[at]) at += 1;
    pos += letters(text).length;
    return { ms, word: at };
  });
  let current = -1;
  const clear = () => { words.forEach((w) => w.classList.remove('is-now')); current = -1; };
  const tick = () => {
    if (player !== audio || audio.paused || audio.ended) { clear(); return; }
    const now = audio.currentTime * 1000;
    let i = 0;
    while (i + 1 < steps.length && steps[i + 1].ms <= now) i += 1;
    const idx = now >= steps[0].ms ? steps[i].word : -1;
    if (idx !== current) { words[current]?.classList.remove('is-now'); words[idx]?.classList.add('is-now'); current = idx; }
    requestAnimationFrame(tick);
  };
  audio.addEventListener('playing', () => requestAnimationFrame(tick), { once: true });
  audio.addEventListener('ended', clear);
}

// True while a recorded line is playing, so sound effects can stay out of its way.
export function isSpeaking() { return !!(player && !player.paused && !player.ended); }

// Silence the voice, for moving on to another line or card.
export function stopSpeech() {
  speak.token = null;
  if (player) { player.pause(); player = null; }
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

// speak(text) or speak([{ text, along }, ...]): the second form plays one clip per part in order, lighting up
// each part's words as it goes. Any part with no recording sends the whole thing to the browser voice instead.
export function speak(input, lang = 'en-IN', opts = {}) {
  if (player) { player.pause(); player = null; }
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  const parts = typeof input === 'string' ? [{ text: input, along: opts.along }] : input;
  const all = parts.map((p) => p.text).join(' ');
  loadClips().then((set) => {
    if (!parts.every((p) => set.has(clipKey(p.text)))) { browserSpeak(all, lang); return; }
    const token = {};
    speak.token = token;
    const play = async (i) => {
      if (i >= parts.length || speak.token !== token) return;
      const key = clipKey(parts[i].text);
      const a = new Audio(new URL(`${key}.mp3`, AUDIO_BASE));
      const marks = parts[i].along ? await fetch(new URL(`${key}.json`, AUDIO_BASE)).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
      if (speak.token !== token) return;
      player = a;
      readAlong(parts[i].along, a, marks);
      a.addEventListener('ended', () => play(i + 1));
      a.play().catch(() => browserSpeak(all, lang));
    };
    play(0);
  });
  return true;
}

export function confetti(host, colors = ['#f0b429', '#ff7ab8', '#3ddc97', '#7bb7ff']) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = el('div', { class: 'confetti', 'aria-hidden': 'true' });
  const n = 34;
  for (let i = 0; i < n; i++) {
    const p = el('i', {
      style: {
        left: Math.random() * 100 + '%',
        background: colors[i % colors.length],
        animationDelay: (Math.random() * 0.35).toFixed(2) + 's',
        transform: `rotate(${Math.random() * 360}deg)`,
      },
    });
    layer.append(p);
  }
  host.append(layer);
  setTimeout(() => layer.remove(), 1800);
}

export function sparkle(host) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = el('div', { class: 'sparkles', 'aria-hidden': 'true' });
  for (let i = 0; i < 12; i++) {
    layer.append(el('i', {
      style: {
        left: (10 + Math.random() * 80) + '%',
        top: (10 + Math.random() * 60) + '%',
        animationDelay: (Math.random() * 0.5).toFixed(2) + 's',
      },
    }));
  }
  host.append(layer);
  setTimeout(() => layer.remove(), 1500);
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}
