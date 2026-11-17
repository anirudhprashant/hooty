// Tap a word to hear just that word. Passages know their words because each one is a span; the concept cards are
// plain paragraphs that the read-along highlights by wrapping text nodes, so the word under the finger is found from
// the caret position instead. Punctuation is dropped before speaking and the language comes from the book.
import { speak, stopSpeech } from './dom.js';

// \p{M} matters: a vowel sign in Devanagari, Kannada or Tamil is a combining mark, so "भारत" splits without it.
const WORD = /[\p{L}\p{N}\p{M}'’]/u;

export function speakLangFor(bookLang) {
  // Either a book language (hi, kn, en) or a full voice code from the app (hi-IN), because practice sessions have no
  // pack to read a language from and the app already knows the right voice for them.
  if (/^[a-z]{2,3}-[A-Z]{2}$/.test(String(bookLang || ''))) return bookLang;
  if (bookLang === 'hi') return 'hi-IN';
  if (bookLang === 'kn') return 'kn-IN';
  return 'en-IN';
}

function caretAt(x, y) {
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (pos?.offsetNode) return { node: pos.offsetNode, offset: pos.offset };
  }
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    if (range?.startContainer) return { node: range.startContainer, offset: range.startOffset };
  }
  return null;
}

// The word that touches this caret, or '' when the tap landed on a space or punctuation.
export function wordAt(node, offset) {
  if (!node || node.nodeType !== 3) return '';
  const text = node.nodeValue || '';
  let start = Math.min(Math.max(offset, 0), text.length);
  let end = start;
  while (start > 0 && WORD.test(text[start - 1])) start -= 1;
  while (end < text.length && WORD.test(text[end])) end += 1;
  const word = text.slice(start, end).trim();
  if (!word || !/\p{L}/u.test(word)) return '';
  return word.replace(/^['’]+|['’]+$/g, '').normalize('NFC');
}

export function attachWordTap(root, bookLang) {
  if (!root) return;
  const lang = speakLangFor(bookLang);
  root.addEventListener('click', (event) => {
    if (event.target.closest('button, a, input, textarea, select')) return;
    const at = caretAt(event.clientX, event.clientY);
    if (!at || !root.contains(at.node)) return;
    const word = wordAt(at.node, at.offset);
    if (!word) return;
    stopSpeech();
    speak(word, lang);
  });
}
