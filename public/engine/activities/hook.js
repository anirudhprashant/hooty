import { el } from '../core/dom.js';
import { bookWord } from '../core/bookwords.js';

// "Think about it": one curiosity question before the lesson teaches the answer. Asking first makes the
// child read to find out. It is not graded and has no wrong answer.
export default {
  type: 'hook',
  graded: false,
  render(activity, ctx) {
    const w = (t) => bookWord(ctx.bookLang, t);
    const root = el('div', { class: 'activity activity--hook' });
    const next = el('button', { class: 'btn btn--primary btn--block', type: 'button' }, [w("Let's find out")]);
    next.addEventListener('click', () => ctx.submit({ read: true }));
    const back = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, [w('Back')]);
    back.hidden = !ctx.canGoBack?.();
    back.addEventListener('click', () => ctx.back?.());
    root.append(
      el('div', { class: 'hook' }, [
        el('img', { class: 'hook__face', src: ctx.mascot?.("idle") || '', alt: '', 'aria-hidden': 'true' }),
        el('div', { class: 'hook__bubble' }, [
          el('p', { class: 'hook__lead', text: w('Think about it…') }),
          el('p', { class: 'hook__text', text: activity.prompt || activity.title || '' }),
        ]),
      ]),
      el('p', { class: 'hook__hint', text: w('No need to answer yet. Read on and you will find out.') }),
      el('div', { class: 'activity__actions' }, [back, next]),
    );
    return { root, check() { return true; } };
  },
};
