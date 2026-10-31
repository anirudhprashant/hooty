import { el } from '../core/dom.js';

function normalise(s) {
  return String(s).toLowerCase().replace(/[.,!?;:'"()]/g, '').replace(/\s+/g, ' ').trim();
}

export default {
  type: 'typeanswer',
  render(activity, ctx) {
    const root = el('div', { class: 'activity activity--type' });
    const input = el('input', {
      class: 'text-input text-input--wide',
      type: 'text',
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
      if (e.key === 'Enter') { e.preventDefault(); submit.click(); }
    });

    root.append(
      el('p', { class: 'activity__prompt', text: activity.prompt }),
      el('div', { class: 'input-row' }, [input, submit]),
    );
    setTimeout(() => input.focus(), 60);

    return {
      root,
      check(response) {
        const given = normalise(response.value || '');
        const answers = (activity.answers || []).map(normalise);
        // A typed answer counts as correct if every accepted answer word appears in it.
        const correct = given.length > 0 && answers.some((a) => {
          if (a === given) return true;
          const words = a.split(' ').filter((w) => w.length > 2);
          return words.length > 0 && words.every((w) => given.includes(w));
        });
        input.disabled = true;
        submit.disabled = true;
        input.classList.add(correct ? 'text-input--correct' : 'text-input--wrong');
        return correct;
      },
    };
  },
};
