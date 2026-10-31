import { el } from '../core/dom.js';
import { icon } from '../core/icons.js';

export default {
  type: 'truefalse',
  render(activity, ctx) {
    const root = el('div', { class: 'activity activity--truefalse' });
    const row = el('div', { class: 'tf-row', role: 'radiogroup', 'aria-label': activity.prompt || 'True or false' });

    const make = (label, value) => {
      const b = el('button', { class: 'tf-btn', type: 'button', role: 'radio', 'aria-checked': 'false' }, [
        el('span', { class: 'tf-btn__icon', 'aria-hidden': 'true' }, [icon(value ? 'check' : 'cross')]),
        el('span', { text: label }),
      ]);
      b.addEventListener('click', () => {
        if (ctx.locked) return;
        ctx.submit({ value });
      });
      return b;
    };

    const yes = make('True', true);
    const no = make('False', false);
    row.append(yes, no);
    root.append(el('p', { class: 'activity__prompt', text: activity.prompt }), row);

    return {
      root,
      check(response) {
        const correct = response.value === activity.answer;
        (activity.answer ? yes : no).classList.add('tf-btn--correct');
        if (!correct) (activity.answer ? no : yes).classList.add('tf-btn--wrong');
        yes.disabled = no.disabled = true;
        return correct;
      },
    };
  },
};
