import { el, stopSpeech } from '../core/dom.js';
import { bookWord } from '../core/bookwords.js';

// A concept card is a short conversation: Hooty says one thing at a time and the
// child taps Next to hear the following line. The lines come from the card's own
// paragraphs, then its key points, then its closing note, so authors write one card.
export default {
  type: 'concept',
  // A concept card teaches. It is not a question, so it must not be graded
  // as a correct answer or it inflates accuracy and pollutes the review deck.
  graded: false,
  render(activity, ctx) {
    const w = (t) => bookWord(ctx.bookLang, t);
    const root = el('div', { class: 'activity activity--concept' });
    const title = activity.title || activity.prompt || '';

    // Reading stamina grows through the lesson: early cards give Hooty's lines one paragraph at a time,
    // later ones give two together, so the child reads a little more each time.
    const paras = String(activity.body || '').split(/\n\s*\n/).filter(Boolean);
    const chunk = (ctx.progress?.() ?? 0) < 0.34 ? 1 : 2;
    const steps = [];
    for (let k = 0; k < paras.length; k += chunk) steps.push({ kind: 'say', text: paras.slice(k, k + chunk).join('\n\n') });
    if (activity.keyPoints?.length) steps.push({ kind: 'points', items: activity.keyPoints });
    if (activity.explanation) steps.push({ kind: 'note', text: activity.explanation });

    const head = el('div', { class: 'concept-card' }, [el('h3', { class: 'concept-card__title', text: title })]);
    if (activity.image) {
      head.append(el('img', { class: 'concept-card__img', src: activity.image, alt: activity.alt || title, loading: 'lazy' }));
    }

    const face = el('img', { class: 'concept-talk__face', src: ctx.mascot?.('idle') || '', alt: '', 'aria-hidden': 'true' });
    const bubble = el('div', { class: 'concept-talk__bubble', 'aria-live': 'polite' });
    const dots = el('div', { class: 'concept-talk__dots', 'aria-hidden': 'true' },
      steps.map(() => el('span')));
    const talk = el('div', { class: 'concept-talk' }, [face, el('div', { class: 'concept-talk__col' }, [bubble, dots])]);

    const read = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, [w('Listen')]);
    const next = el('button', { class: 'btn btn--primary btn--block', type: 'button' });

    let i = 0;
    const back = el('button', { class: 'btn btn--ghost btn--sm', type: 'button', 'data-sfx': 'back' }, [w('Back')]);
    back.addEventListener('click', () => { stopSpeech(); if (i > 0) { i -= 1; show(); } else ctx.back?.(); });
    // What Listen says for the current line: one part per paragraph so each has its own recording.
    const lineParts = () => {
      const st = steps[i];
      const ps = st.kind === 'points' ? [{ text: st.items.join('. ') }]
        : st.text.split(/\n\s*\n/).map((text) => ({ text }));
      return ps.map((p) => ({ ...p, text: p.text.replace(/\*\*/g, '') }));
    };
    const show = () => {
      const s = steps[i];
      const content = el('div', { class: `concept-line concept-line--${s.kind}` });
      if (s.kind === 'say') content.append(el('div', { class: 'concept-card__body' }, s.text.split(/\n\s*\n/).map((t) => el('p', { text: t }))));
      else if (s.kind === 'note') content.append(el('p', { class: 'concept-card__note', text: s.text }));
      else {
        content.append(el('p', { class: 'concept-line__lead', text: w('Remember:') }));
        const ul = el('ul', { class: 'concept-card__points' });
        s.items.forEach((p) => ul.append(el('li', { text: p })));
        content.append(ul);
      }
      bubble.replaceChildren(content);
      ctx.markWords?.(bubble);
      dots.childNodes.forEach((d, n) => d.classList.toggle('is-on', n <= i));
      next.textContent = i === steps.length - 1 ? w('Got it, continue') : w('Next');
      back.hidden = i === 0 && !ctx.canGoBack?.();
      face.classList.remove('is-talk'); void face.offsetWidth; face.classList.add('is-talk');
    };

    read.addEventListener('click', () => {
      const parts = lineParts();
      const els = [...bubble.querySelectorAll('.concept-card__body p, .concept-card__points, .concept-card__note')];
      ctx.say(parts.map((p, k) => ({ ...p, along: els[k] })));
    });
    next.addEventListener('click', () => {
      stopSpeech();
      if (i < steps.length - 1) { i += 1; show(); } else ctx.submit({ read: true });
    });

    if (!steps.length) steps.push({ kind: 'say', text: title });
    if (ctx.startAtEnd?.()) i = steps.length - 1;
    show();
    root.append(head, talk, el('div', { class: 'activity__actions' }, [back, read, next]));
    return {
      root,
      check() { return true; },
    };
  },
};
