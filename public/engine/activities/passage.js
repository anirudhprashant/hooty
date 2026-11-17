import { el, speak, stopSpeech } from '../core/dom.js';
import { bookWord } from '../core/bookwords.js';

// A short passage to read at your own pace, written in the book's own spirit, in plain words. Reading comes
// first; Listen is the backup, and lights up each word as it is spoken. Questions follow in the next steps.
export default {
  type: 'passage',
  graded: false,
  render(activity, ctx) {
    const w = (t) => bookWord(ctx.bookLang, t);
    const root = el('div', { class: 'activity activity--passage' });
    const paras = String(activity.body || '').split(/\n\s*\n/).filter(Boolean);
    // Every word is its own span, so a child who is stuck on one can tap it and hear it. The paragraph still reads
    // as running text to a screen reader, because the spans carry no roles and the spaces stay between them.
    const canTap = typeof window !== 'undefined' && !!(window.speechSynthesis || true);
    const words = (text) => {
      const out = [];
      const parts = String(text).split(/(\s+)/).filter((x) => x.length);
      for (const part of parts) {
        if (!part.trim()) { out.push(part); continue; }
        const bare = part.replace(/[^\p{L}\p{N}']/gu, '');
        if (!bare) { out.push(part); continue; }
        const span = el('span', { class: 'word', text: part });
        span.addEventListener('click', () => { stopSpeech(); speak(bare); });
        out.push(span);
      }
      return out;
    };
    const body = el('div', { class: 'passage__body' }, paras.map((t) => el('p', {}, canTap ? words(t) : [t])));
    const listen = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, [w('Listen')]);
    listen.addEventListener('click', () => {
      const ps = [...body.querySelectorAll('p')];
      ctx.say(paras.map((text, k) => ({ text: text.replace(/\*\*/g, ''), along: ps[k] })));
    });
    const done = el('button', { class: 'btn btn--primary btn--block', type: 'button' }, [w('I have read it')]);
    done.addEventListener('click', () => ctx.submit({ read: true }));
    const back = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, [w('Back')]);
    back.hidden = !ctx.canGoBack?.();
    back.addEventListener('click', () => ctx.back?.());
    root.append(
      el('p', { class: 'passage__kicker', text: w('Read') }),
      el('h3', { class: 'passage__title', text: activity.title || '' }),
      body,
      canTap ? el('p', { class: 'passage__hint', text: 'Tap any word to hear it on its own.' }) : null,
      el('div', { class: 'activity__actions' }, [back, listen, done]),
    );
    return { root, check() { return true; } };
  },
};
