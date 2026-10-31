import { el, shuffle } from '../core/dom.js';

// Tap-to-order. Works on a phone with a thumb, no drag library needed.
// Every tap places an item into the answer row; tap again in the row to remove.

export default {
  type: 'dragorder',
  render(activity, ctx) {
    const root = el('div', { class: 'activity activity--order' });
    const pool = el('div', { class: 'order-pool', role: 'list', 'aria-label': 'Items to arrange' });
    const answerRow = el('div', { class: 'order-answer', role: 'list', 'aria-label': 'Your answer' });
    const checkBtn = el('button', { class: 'btn btn--primary', type: 'button' }, ['Check order']);

    const items = activity.items || [];
    const placed = [];

    function renderPool() {
      pool.replaceChildren();
      shuffle(items).forEach((text) => {
        if (placed.includes(text)) return;
        const b = el('button', { class: 'order-chip', type: 'button', role: 'listitem' }, [text]);
        b.addEventListener('click', () => {
          if (ctx.locked) return;
          placed.push(text);
          renderPool();
          renderAnswer();
        });
        pool.append(b);
      });
    }

    function renderAnswer() {
      answerRow.replaceChildren();
      placed.forEach((text, i) => {
        const b = el('button', { class: 'order-chip order-chip--placed', type: 'button', 'aria-label': `Position ${i + 1}: ${text}` }, [
          el('span', { class: 'order-num', 'aria-hidden': 'true', text: String(i + 1) }),
          text,
        ]);
        b.addEventListener('click', () => {
          if (ctx.locked) return;
          placed.splice(i, 1);
          renderPool();
          renderAnswer();
        });
        answerRow.append(b);
      });
      checkBtn.disabled = placed.length !== items.length;
    }

    checkBtn.addEventListener('click', () => {
      if (ctx.locked) return;
      ctx.submit({ order: placed.slice() });
    });

    renderPool();
    renderAnswer();
    root.append(
      el('p', { class: 'activity__prompt', text: activity.prompt }),
      answerRow,
      pool,
      el('div', { class: 'activity__actions' }, [checkBtn]),
    );

    return {
      root,
      check(response) {
        const given = response.order || [];
        const correct = given.length === items.length && given.every((v, i) => v === items[i]);
        checkBtn.disabled = true;
        pool.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        const nodes = answerRow.querySelectorAll('.order-chip');
        nodes.forEach((node, i) => {
          if (given[i] !== items[i]) node.classList.add('order-chip--wrong');
          else node.classList.add('order-chip--correct');
        });
        return correct;
      },
    };
  },
};
