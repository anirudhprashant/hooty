import { el, stopSpeech } from '../core/dom.js';
import { bookWord } from '../core/bookwords.js';

// A written answer, the way school papers ask for one. The child answers in their own words, then sees a good answer and the
// points a marker looks for, and ticks the ones they covered. Hooty does not pretend a computer can mark it; checking your
// own answer against the points is itself strong practice. Nothing typed here is stored or sent anywhere.
export default {
  type: 'explain',
  graded: false,
  render(activity, ctx) {
    const w = (t) => bookWord(ctx.bookLang, t);
    const root = el('div', { class: 'activity activity--explain' });
    const box = el('textarea', { class: 'text-input explain__box', rows: '5', maxlength: '1500', 'aria-label': w('Write your answer'), placeholder: w('Write your answer') });
    const reveal = el('div', { class: 'explain__reveal', hidden: true }, [
      el('h4', { class: 'explain__head', text: w('A good answer') }),
      el('p', { class: 'explain__answer', text: activity.answer }),
      el('h4', { class: 'explain__head', text: w('Did you say these?') }),
      el('ul', { class: 'explain__points' }, (activity.points || []).map((p) => el('li', {}, [
        el('label', {}, [el('input', { type: 'checkbox' }), el('span', { text: p })]),
      ]))),
    ]);
    const next = el('button', { class: 'btn btn--primary btn--block', type: 'button', text: w('Show a good answer') });
    let shown = false;
    next.addEventListener('click', () => {
      stopSpeech();
      if (!shown) { shown = true; reveal.hidden = false; box.readOnly = true; next.textContent = w('Next'); ctx.markWords?.(reveal); reveal.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
      else ctx.submit({ read: true });
    });
    root.append(
      el('p', { class: 'worked__kicker', text: w('Answer in your own words') }),
      el('p', { class: 'activity__prompt', text: activity.prompt }),
      box, reveal,
      el('div', { class: 'activity__actions' }, [next]),
    );
    return { root, check() { return true; } };
  },
};
