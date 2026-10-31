// Tap-a-word. A pack may ship glossary.json:
//   { "terms": [ { "term": "Equator", "aka": ["equatorial"], "meaning": "...", "src": [{ "ch": 1, "p": 14 }] } ] }
// Words in explanatory text that match a term become small buttons; tapping
// one opens a plain-language meaning. Only the first mention per question is
// marked, so the screen stays calm. Words inside answer buttons are never
// marked: a button inside a button is not valid and would fight the answer tap.

import { el } from './dom.js';

const TEXT_SELECTOR = [
  '.activity__prompt', '.passage__body', '.concept-card__body', '.concept-card__points li', '.concept-card__note',
  '.activity__note', '.sheet__body', '.media-caption', '.video-note',
].join(',');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Key words: authors wrap them like **this** in lesson text. They always render
// as <mark class="key"> (so the asterisks never show); whether they look
// highlighted is a learner setting (body.hl-on), so one lesson serves both.
export const plain = (s) => String(s ?? '').replace(/\*\*/g, '');

export function markKeys(root) {
  if (!root) return 0;
  let count = 0;
  for (const container of root.querySelectorAll(TEXT_SELECTOR)) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (walker.currentNode.nodeValue.includes('**')) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const parts = node.nodeValue.split(/\*\*(.+?)\*\*/g);
      if (parts.length < 3) { node.nodeValue = plain(node.nodeValue); continue; }
      const frag = document.createDocumentFragment();
      parts.forEach((p, i) => {
        if (!p) return;
        if (i % 2) { frag.append(el('mark', { class: 'key' }, [p])); count += 1; } else frag.append(p);
      });
      node.replaceWith(frag);
    }
  }
  return count;
}

export function buildMatcher(glossary) {
  const map = new Map();
  for (const t of glossary?.terms || []) {
    for (const form of [t.term, ...(t.aka || [])]) map.set(form.toLowerCase(), t);
  }
  if (!map.size) return null;
  const forms = [...map.keys()].sort((a, b) => b.length - a.length).map(esc);
  // whole words only, with an optional plural / possessive ending
  const re = new RegExp(`(?<![\\w'])(${forms.join('|')})(?:'s|s|es)?(?![\\w])`, 'gi');
  return { re, map };
}

export function annotate(root, matcher, onTap) {
  if (!matcher || !root) return 0;
  const seen = new Set();
  let count = 0;
  for (const container of root.querySelectorAll(TEXT_SELECTOR)) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest('button, a, .term') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue;
      matcher.re.lastIndex = 0;
      let last = 0;
      let m;
      const frag = document.createDocumentFragment();
      let changed = false;
      while ((m = matcher.re.exec(text))) {
        const entry = matcher.map.get(m[1].toLowerCase());
        if (!entry || seen.has(entry.term)) continue;
        seen.add(entry.term);
        count += 1;
        changed = true;
        frag.append(text.slice(last, m.index));
        const shown = m[0];
        frag.append(el('button', {
          class: 'term', type: 'button', 'aria-haspopup': 'dialog',
          'aria-label': `${shown}: tap to see what it means`,
          onclick: (e) => { e.preventDefault(); onTap(entry, e.currentTarget); },
        }, [shown]));
        last = m.index + m[0].length;
      }
      if (changed) {
        frag.append(text.slice(last));
        node.replaceWith(frag);
      }
    }
  }
  return count;
}

// The meaning card. Returns nothing; closes itself.
export function openTermCard(entry, { say, from, hint } = {}) {
  document.querySelector('.term-pop')?.remove();
  const prev = from || document.activeElement;
  const close = () => {
    pop.remove();
    document.removeEventListener('keydown', onKey);
    prev?.focus?.({ preventScroll: true });
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const src = (entry.src || [])[0];
  const pop = el('div', { class: 'term-pop', role: 'dialog', 'aria-modal': 'true', 'aria-label': entry.term }, [
    el('div', { class: 'term-pop__scrim', onclick: close }),
    el('div', { class: 'term-pop__card' }, [
      el('h3', { class: 'term-pop__word', text: entry.term }),
      el('p', { class: 'term-pop__meaning', text: entry.meaning }),
      entry.example ? el('p', { class: 'term-pop__example', text: entry.example }) : null,
      src ? el('p', { class: 'term-pop__src', text: `In your book: Chapter ${src.ch}, page ${src.p}` }) : null,
      el('div', { class: 'term-pop__actions' }, [
        say ? el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => say(`${entry.term}. ${entry.meaning}`) }, ['Read to me']) : null,
        el('button', { class: 'btn btn--sm term-pop__close', type: 'button', onclick: close }, ['Got it']),
      ]),
    ]),
  ]);
  document.body.append(pop);
  document.addEventListener('keydown', onKey);
  pop.querySelector('.term-pop__close').focus({ preventScroll: true });
  hint?.(entry);
}
