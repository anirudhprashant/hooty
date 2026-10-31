import { el, stopSpeech } from '../core/dom.js';
import { renderModel } from '../core/models.js';
import { bookWord } from '../core/bookwords.js';

// A worked example: the problem, a picture of it, and the solution revealed one step at a time. The child watches the
// reasoning unfold before trying a problem of their own ("I do, then we do, then you do"). It is not graded.
export default {
  type: 'worked',
  graded: false,
  render(activity, ctx) {
    const w = (t) => bookWord(ctx.bookLang, t);
    const root = el('div', { class: 'activity activity--worked' });
    const steps = activity.steps?.length ? activity.steps : [activity.explanation || `The answer is ${activity.result ?? ''}.`];
    const model = activity.modelSpec ? renderModel(activity.modelSpec) : null;

    const list = el('ol', { class: 'worked__steps', 'aria-live': 'polite' });
    const answer = el('p', { class: 'worked__answer', hidden: true }, [`Answer: ${activity.result ?? ''}`]);
    const dots = el('div', { class: 'concept-talk__dots', 'aria-hidden': 'true' }, steps.map(() => el('span')));
    const next = el('button', { class: 'btn btn--primary btn--block', type: 'button' });
    const back = el('button', { class: 'btn btn--ghost btn--sm', type: 'button', 'data-sfx': 'back' }, [w('Back')]);
    const listen = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, [w('Listen')]);

    let shown = 0;
    const paint = () => {
      list.replaceChildren(...steps.slice(0, shown).map((t, i) => el('li', { class: `worked__step${i === shown - 1 ? ' is-new' : ''}` }, [t])));
      [...dots.children].forEach((d, i) => d.classList.toggle('is-on', i < shown));
      const done = shown >= steps.length;
      answer.hidden = !(done && activity.result != null);
      next.textContent = w(done ? 'Got it, my turn' : shown === 0 ? 'Show me how' : 'Next step');
      back.hidden = shown === 0 && !ctx.canGoBack?.();
      ctx.markWords?.(list);
    };
    next.addEventListener('click', () => { stopSpeech(); if (shown < steps.length) { shown += 1; paint(); } else ctx.submit({ read: true }); });
    back.addEventListener('click', () => { stopSpeech(); if (shown > 0) { shown -= 1; paint(); } else ctx.back?.(); });
    listen.addEventListener('click', () => ctx.say([activity.prompt, ...steps.slice(0, Math.max(shown, 1))].map((t) => ({ text: t }))));

    root.append(
      el('p', { class: 'worked__kicker', text: w(activity.kicker || 'Let us solve one together') }),
      el('p', { class: 'worked__problem', text: activity.prompt }),
      ...(model ? [el('figure', { class: 'model-fig' }, [model])] : []),
      list, answer, dots,
      el('div', { class: 'activity__actions' }, [back, listen, next]),
    );
    paint();
    return { root, check() { return true; } };
  },
};
