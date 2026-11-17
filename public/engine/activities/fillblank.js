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

    // Little children type numbers on a phone keyboard that covers half the screen. The early classes get a keypad.
    const numericAnswers = (activity.answers || []).every((x) => /^-?[\d./]+$/.test(String(x)));
    const young = /^[1-4]$/.test(String(ctx.grade || ''));
    let keypad = null;
    if (numericAnswers && young) {
      const press = (key) => input.value = key === 'del' ? input.value.slice(0, -1) : key === '.' && input.value.includes('.') ? input.value : input.value + key;
      keypad = el('div', { class: 'keypad' }, [
        ...['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map((key) => el('button', {
          class: 'keypad__key', type: 'button', 'aria-label': key === 'del' ? 'Delete' : key,
          onclick: () => { press(key); input.focus(); },
        }, [key === 'del' ? '⌫' : key])),
      ]);
    }
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
      keypad || '',
    );
    // Focus after the card settles, except when the pad is showing: on a phone that pops the keyboard up over the
    // card and hides the pad the child was given instead.
    if (!keypad) setTimeout(() => input.focus(), 60);

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
