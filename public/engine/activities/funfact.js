import { el } from '../core/dom.js';
import { bookWord } from '../core/bookwords.js';

// "Did you know?": a small surprise in the middle of a lesson, added when the lesson starts. Not graded.
export default {
  type: 'funfact',
  graded: false,
  render(activity, ctx) {
    const w = (t) => bookWord(ctx.bookLang, t);
    const root = el('div', { class: 'activity activity--funfact' });
    const next = el('button', { class: 'btn btn--primary btn--block', type: 'button' }, [w('Wow!')]);
    next.addEventListener('click', () => ctx.submit({ read: true }));
    root.append(
      el('div', { class: 'hook' }, [
        el('img', { class: 'hook__face', src: ctx.mascot?.('happy') || '', alt: '', 'aria-hidden': 'true' }),
        el('div', { class: 'hook__bubble' }, [
          el('p', { class: 'hook__lead', text: w('Did you know?') }),
          el('p', { class: 'hook__text', text: activity.prompt }),
        ]),
      ]),
      el('div', { class: 'activity__actions' }, [next]),
    );
    return { root, check() { return true; } };
  },
};
