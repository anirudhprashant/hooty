// Theme loader. A theme is data + one stylesheet + art. The engine never
// hard-codes a colour, a font or a mascot.

import { el } from './dom.js';

let current = null;

export async function loadThemes(base = './themes') {
  const index = await fetch(`${base}/index.json`).then((r) => r.json());
  return index;
}

export function applyTheme(theme, { root = document.documentElement } = {}) {
  current = theme;
  const p = theme.palette || {};
  const set = (k, v) => v && root.style.setProperty(k, v);
  set('--bg', p.bg);
  set('--surface', p.surface);
  set('--surface-alt', p.surfaceAlt || p.bgAlt);
  set('--text', p.text);
  set('--text-muted', p.textMuted);
  set('--primary', p.primary);
  set('--primary-text', p.primaryText);
  set('--primary-edge', p.primaryEdge);
  set('--secondary', p.secondary);
  set('--success', p.success);
  set('--success-soft', p.successSoft);
  set('--danger', p.danger);
  set('--danger-soft', p.dangerSoft);
  set('--hero', p.hero);
  set('--hero-text', p.heroText);
  set('--locked', p.locked);
  root.dataset.dark = String(!!theme.dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && p.bg) meta.setAttribute('content', p.bg);

  set('--font-display', theme.fonts?.display || 'system-ui, sans-serif');
  set('--font-body', theme.fonts?.body || 'system-ui, sans-serif');

  const r = theme.radii || {};
  set('--radius-sm', r.sm);
  set('--radius-md', r.md);
  set('--radius-lg', r.lg);
  set('--radius-xl', r.xl);
  set('--radius-pill', r.pill);

  if (theme.id) root.setAttribute('data-theme', theme.id);

  // A url() inside a CSS custom property resolves against the stylesheet that
  // uses it (css/ui.css), not the document. So build an absolute URL.
  setHero(theme);

  // The theme stylesheet lives beside theme.json. theme.css may be named
  // explicitly, otherwise it is always <theme-id>/theme.css. Falling back to
  // '' would unload the shared ui.css and leave the app unstyled.
  const link = document.getElementById('theme-css');
  if (link) {
    const href = theme.css || `${theme.base || './themes'}/${theme.id}/theme.css`;
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  }
}

export function getTheme() {
  return current;
}

export function themeAsset(path) {
  if (!current) return path;
  const base = current.base || './themes';
  return `${base}/${current.id}/${path}`;
}

// Asset belonging to a specific theme object (used by the theme picker grid).
export function assetFor(theme, path) {
  if (!theme || !path) return '';
  const base = theme.base || './themes';
  return `${base}/${theme.id}/${path}`;
}

// Two guides walk beside the child, picked in Settings: Hooty (the blob mascot, art from tools/brand) or Lumi
// the explorer. The theme's own mascot paths describe Lumi, so a theme can bring its own art without touching Hooty.
// With Hooty, painted themes swap their hero for a flat one in Hooty's style (theme.json `heroHooty`).
let guide = 'lumi';
function setHero(theme) {
  if (!theme) return;
  const file = guide === 'hooty' && theme.heroHooty ? theme.heroHooty : theme.hero;
  if (!file) return;
  const abs = new URL(`${theme.base || './themes'}/${theme.id}/${file}`, document.baseURI).href;
  document.documentElement.style.setProperty('--hero-image', `url("${abs}")`);
}
export function setGuide(g) { guide = g === 'hooty' ? 'hooty' : 'lumi'; setHero(current); }
export function currentGuide() { return guide; }
export function guideName() { return guide === 'lumi' ? 'Lumi' : 'Hooty'; }
export function guideAvatarSrc(which, mood = 'idle') {
  return which === 'lumi' ? `./characters/lumi/avatar-${mood}.webp` : `./characters/blob/hooty-avatar-${mood}.webp`;
}

export function mascotImage(mood = 'idle') {
  if (!current) return null;
  if (guide === 'hooty') return themeAsset(`../../characters/blob/hooty-${mood === 'happy' || mood === 'wrong' ? mood : 'idle'}.webp`);
  if (!current.mascot) return null;
  const src = current.mascot[mood] || current.mascot.idle;
  return src ? themeAsset(src) : null;
}

// Round head-and-shoulders version of the same pose (avatar-<mood>.webp beside explorer-<mood>.webp, or
// snowy3-avatar-<mood>.webp beside snowy3-<mood>.webp), padded so a circular frame never clips the hair or the ears.
export function mascotAvatar(mood = 'idle') {
  const full = mascotImage(mood);
  if (!full) return null;
  return guide === 'hooty' ? full.replace(/hooty-(idle|happy|wrong)/, 'hooty-avatar-$1') : full.replace(/explorer-/, 'avatar-');
}

export function themeCopy(tone, key, fallback = '') {
  const c = current?.copy?.[tone];
  if (Array.isArray(c) && c.length) return c[Math.floor(Math.random() * c.length)];
  return c || fallback || key;
}
