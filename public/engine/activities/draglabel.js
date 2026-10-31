import { el } from '../core/dom.js';

// Drag a label onto a marked place on an image or map.
// Pointer events, so it works with touch and mouse. Also keyboard friendly:
// select a label with Enter, then select a target.

export default {
  type: 'draglabel',
  render(activity, ctx) {
    const root = el('div', { class: 'activity activity--draglabel' });
    const stage = el('div', { class: 'label-stage' });

    const img = el('img', {
      class: 'label-stage__img',
      src: activity.image,
      alt: activity.alt || activity.prompt || 'Diagram to label',
      draggable: 'false',
    });
    stage.append(img);

    const labels = activity.labels || [];
    let placedCount = 0;
    let activeLabel = null;

    const labelBar = el('div', { class: 'label-bar', role: 'list', 'aria-label': 'Labels' });

    const makeLabel = (label) => {
      const node = el('button', { class: 'label-chip', type: 'button', role: 'listitem' }, [label.text]);
      node.dataset.labelId = label.text;
      node.addEventListener('click', () => {
        if (ctx.locked || node.classList.contains('label-chip--placed')) return;
        activeLabel = node;
        labelBar.querySelectorAll('.label-chip--selected').forEach((n) => n.classList.remove('label-chip--selected'));
        node.classList.add('label-chip--selected');
        ctx.say(label.text);
      });
      node.addEventListener('dragstart', (e) => {
        activeLabel = node;
        e.dataTransfer.setData('text/plain', label.text);
      });
      return node;
    };

    labels.forEach((label) => {
      const target = el('button', {
        class: 'label-target',
        type: 'button',
        'aria-label': `Drop point ${label.text}`,
        style: { left: label.x + '%', top: label.y + '%' },
      });
      target.dataset.targetId = label.text;

      const drop = () => {
        if (ctx.locked || !activeLabel) return;
        if (activeLabel.dataset.labelId !== label.text) {
          target.classList.add('label-target--wrong');
          setTimeout(() => target.classList.remove('label-target--wrong'), 700);
          ctx.matchFeedback(false);
          return;
        }
        target.classList.add('label-target--filled');
        target.append(el('span', { class: 'label-target__text', text: label.text }));
        activeLabel.classList.add('label-chip--placed');
        activeLabel.classList.remove('label-chip--selected');
        activeLabel = null;
        placedCount += 1;
        ctx.matchFeedback(true);
        if (placedCount === labels.length) ctx.submit({ done: true });
      };

      target.addEventListener('click', drop);
      target.addEventListener('dragover', (e) => e.preventDefault());
      target.addEventListener('drop', (e) => { e.preventDefault(); drop(); });
      stage.append(target);
      labelBar.append(makeLabel(label));
    });

    root.append(
      el('p', { class: 'activity__prompt', text: activity.prompt }),
      stage,
      labelBar,
    );

    return {
      root,
      check() { return true; },
    };
  },
};
