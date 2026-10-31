import { el } from '../core/dom.js';

export default {
  type: 'flashcard',
  // A flashcard is a recall prompt, not a question with a wrong answer, so it
  // is not graded for accuracy and does not create a review card.
  graded: false,
  render(activity, ctx) {
    const root = el('div', { class: 'activity activity--flash' });
    const card = el('button', { class: 'flashcard', type: 'button', 'aria-label': 'Tap to flip the card' });

    const front = el('div', { class: 'flashcard__face flashcard__face--front' }, [
      el('p', { class: 'flashcard__prompt', text: activity.prompt || activity.front }),
      el('span', { class: 'flashcard__hint', text: 'Tap to flip' }),
    ]);
    const back = el('div', { class: 'flashcard__face flashcard__face--back' }, [
      el('p', { class: 'flashcard__answer', text: activity.back }),
    ]);
    card.append(front, back);
    card.addEventListener('click', () => {
      card.classList.toggle('is-flipped');
      ctx.say(activity.back || activity.front || '');
    });

    root.append(el('p', { class: 'activity__prompt', text: activity.prompt ? '' : '' }), card);
    if (activity.prompt && activity.front) {
      root.prepend(el('p', { class: 'activity__prompt', text: activity.prompt }));
    }
    root.querySelector('.activity__prompt')?.remove();

    // A flashcard is a self-contained recall prompt, so it always counts as
    // correct. It still needs a way forward or the lesson dead-ends here.
    if (activity.explanation) {
      root.append(el('p', { class: 'activity__note', text: activity.explanation }));
    }

    const next = el('button', { class: 'btn btn--primary btn--block', type: 'button' }, ['Continue']);
    next.addEventListener('click', () => ctx.submit({ flipped: true }));

    root.append(el('div', { class: 'activity__actions' }, [next]));

    return {
      root,
      check() { return true; },
    };
  },
};
