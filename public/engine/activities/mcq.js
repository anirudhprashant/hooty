import { el } from '../core/dom.js';

export default {
  type: 'mcq',
  render(activity, ctx) {
    const root = el('div', { class: 'activity activity--mcq' });
    const options = el('div', { class: 'options', role: 'radiogroup', 'aria-label': activity.prompt || 'Choices' });

    // Shown in a fresh order each time: authors put the right answer first far too often, and children notice.
    const order = activity.options.map((_, i) => i);
    for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
    const buttons = [];
    order.forEach((i, shown) => {
      const text = activity.options[i];
      const b = el('button', {
        class: 'option',
        type: 'button',
        role: 'radio',
        'aria-checked': 'false',
      }, [
        el('span', { class: 'option__key', 'aria-hidden': 'true', text: String.fromCharCode(65 + shown) }),
        el('span', { class: 'option__text', text }),
      ]);
      b.addEventListener('click', () => {
        if (ctx.locked) return;
        ctx.submit({ choice: i });
      });
      options.append(b);
      buttons[i] = b;
    });

    root.append(el('p', { class: 'activity__prompt', text: activity.prompt }), options);

    return {
      root,
      check(response) {
        const correct = response.choice === activity.answer;
        buttons.forEach((b, i) => {
          if (i === activity.answer) b.classList.add('option--correct');
          else if (i === response.choice) b.classList.add('option--wrong');
          b.disabled = true;
        });
        return correct;
      },
    };
  },
};
