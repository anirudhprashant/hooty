import { el } from '../core/dom.js';
import { matches } from '../core/answers.js';

function normalise(s) {
  return String(s).normalize('NFC').toLowerCase().replace(/[.,!?;:'"()]/g, '').replace(/\s+/g, ' ').trim();
}

export default {
  type: 'fillblank',
  render(activity, ctx) {
    const root = el('div', { class: 'activity activity--fillblank' });
    const input = el('input', {
      class: 'text-input',
      type: 'text',
      inputmode: (activity.answers || []).every((x) => /^-?[\d./]+$/.test(String(x))) ? 'decimal' : 'text',
      autocomplete: 'off',
      'aria-label': activity.prompt || 'Your answer',
      placeholder: activity.placeholder || 'Type your answer',
    });

    const submit = el('button', { class: 'btn btn--primary', type: 'button' }, ['Check']);
    submit.addEventListener('click', () => {
      if (ctx.locked) return;
      ctx.submit({ value: input.value });
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit.click();
      }
    });

    const hint = activity.hint
      ? el('button', {
          class: 'btn btn--ghost btn--sm',
          type: 'button',
          onclick: () => { input.placeholder = activity.hint; ctx.say(activity.hint); },
        }, ['Hint'])
      : null;

    root.append(
      el('p', { class: 'activity__prompt', text: activity.prompt }),
      el('div', { class: 'input-row' }, [input, submit, hint].filter(Boolean)),
    );
    setTimeout(() => input.focus(), 60);

    return {
      root,
      check(response) {
        // fair marking: units the question uses, other ways of writing the number, and small typos are accepted (core/answers.js)
        const correct = matches(response.value || '', activity.answers || [], activity.prompt || '');
        input.disabled = true;
        submit.disabled = true;
        if (hint) hint.disabled = true;
        input.classList.add(correct ? 'text-input--correct' : 'text-input--wrong');
        return correct;
      },
    };
  },
};
