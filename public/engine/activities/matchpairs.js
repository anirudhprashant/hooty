import { el, shuffle } from '../core/dom.js';

export default {
  type: 'matchpairs',
  render(activity, ctx) {
    const root = el('div', { class: 'activity activity--match' });
    const pairs = activity.pairs || [];
    const lefts = pairs.map((p) => p[0]);
    const rights = shuffle(pairs.map((p) => p[1]));

    const leftCol = el('div', { class: 'match-col', role: 'list', 'aria-label': 'Left column' });
    const rightCol = el('div', { class: 'match-col', role: 'list', 'aria-label': 'Right column' });

    let selectedLeft = null;
    const matchedRight = new Set();
    const matchedLeft = new Set();

    const leftNodes = lefts.map((text, i) => {
      const node = el('button', { class: 'match-item', type: 'button', role: 'listitem' }, [text]);
      node.addEventListener('click', () => {
        if (ctx.locked || matchedLeft.has(i)) return;
        if (selectedLeft === i) { node.classList.remove('match-item--selected'); selectedLeft = null; return; }
        leftCol.querySelectorAll('.match-item--selected').forEach((n) => n.classList.remove('match-item--selected'));
        node.classList.add('match-item--selected');
        selectedLeft = i;
        ctx.say(text);
      });
      leftCol.append(node);
      return node;
    });

    const rightNodes = rights.map((text) => {
      const node = el('button', { class: 'match-item', type: 'button', role: 'listitem' }, [text]);
      node.addEventListener('click', () => {
        if (ctx.locked || matchedRight.has(text)) return;
        if (selectedLeft === null) {
          ctx.flash('Pick an item on the left first.');
          return;
        }
        // The two columns hold DIFFERENT strings (e.g. "Rajagriha" on the
        // left, "First capital of Magadha" on the right). Comparing the two
        // labels can never succeed, so compare the right-hand text against
        // the right-hand half of the pair the left item belongs to.
        const expectedRight = pairs[selectedLeft][1];
        if (expectedRight === text) {
          node.classList.add('match-item--matched');
          leftNodes[selectedLeft].classList.add('match-item--matched');
          matchedRight.add(text);
          matchedLeft.add(selectedLeft);
          selectedLeft = null;
          leftCol.querySelectorAll('.match-item--selected').forEach((n) => n.classList.remove('match-item--selected'));
          ctx.matchFeedback(true);
          if (matchedRight.size === pairs.length) ctx.submit({ done: true });
        } else {
          node.classList.add('match-item--wrong');
          leftNodes[selectedLeft].classList.add('match-item--wrong');
          setTimeout(() => {
            node.classList.remove('match-item--wrong');
            leftNodes[selectedLeft]?.classList.remove('match-item--wrong');
          }, 700);
          ctx.matchFeedback(false);
        }
      });
      rightCol.append(node);
      return node;
    });

    root.append(el('p', { class: 'activity__prompt', text: activity.prompt }), el('div', { class: 'match-grid' }, [leftCol, rightCol]));
    return {
      root,
      check() { return true; },
    };
  },
};
