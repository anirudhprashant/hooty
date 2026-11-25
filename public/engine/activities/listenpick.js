import { el, speak } from '../core/dom.js';
import { t } from '../core/i18n.js';

export default {
  type: 'listenpick',
  render(activity, ctx) {
    const root = el('div', { class: 'activity activity--listen' });

    const play = el('button', { class: 'speak-btn', type: 'button', 'aria-label': t('playAudio') }, [
      el('span', { class: 'speak-btn__icon', 'aria-hidden': 'true' }),
      el('span', { text: t('playClip') }),
    ]);
    const playAgain = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, [t('playAgain')]);

    const doSpeak = () => {
      const ok = speak(activity.speech || activity.prompt, ctx.locale || 'en-IN');
      if (!ok) ctx.flash(t('audioUnavailable', { text: activity.speech || activity.prompt || '' }));
    };
    play.addEventListener('click', doSpeak);
    playAgain.addEventListener('click', doSpeak);

    const options = el('div', { class: 'options', role: 'radiogroup', 'aria-label': activity.prompt || 'Choices' });
    const buttons = (activity.options || []).map((text, i) => {
      const b = el('button', { class: 'option', type: 'button', role: 'radio', 'aria-checked': 'false', 'data-choice': String(i) }, [
        el('span', { class: 'option__key', 'aria-hidden': 'true', text: String.fromCharCode(65 + i) }),
        el('span', { class: 'option__text', text }),
      ]);
      b.addEventListener('click', () => { if (!ctx.locked) ctx.submit({ choice: i }); });
      options.append(b);
      return b;
    });

    root.append(
      el('p', { class: 'activity__prompt', text: activity.prompt }),
      el('div', { class: 'listen-row' }, [play, playAgain]),
      options,
    );
    setTimeout(doSpeak, 350);

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
