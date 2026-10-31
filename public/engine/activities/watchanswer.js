import { el } from '../core/dom.js';

// Watch a YouTube clip from youtube-nocookie.com, then answer.
// The clip is embedded with start/end seconds. A question always follows.

export default {
  type: 'watchanswer',
  render(activity, ctx) {
    const root = el('div', { class: 'activity activity--watch' });
    const v = activity.video || {};

    if (v.provider !== 'youtube' || !v.id) {
      root.append(el('p', { class: 'activity__prompt', text: 'This video is not available right now.' }));
      return { root, check() { return true; } };
    }

    const params = new URLSearchParams({
      autoplay: '0',
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
    });
    if (v.start) params.set('start', String(v.start));
    if (v.end) params.set('end', String(v.end));

    const iframe = el('iframe', {
      class: 'video-frame',
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?${params.toString()}`,
      title: activity.prompt || 'Lesson video',
      loading: 'lazy',
      referrerpolicy: 'strict-origin-when-cross-origin',
      allow: 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
      allowfullscreen: true,
    });

    const wrap = el('div', { class: 'video-wrap' }, [iframe]);
    if (v.reason) {
      wrap.append(el('p', { class: 'video-note', text: v.reason }));
    }

    const options = el('div', { class: 'options', role: 'radiogroup', 'aria-label': activity.prompt || 'Choices' });
    const buttons = (activity.options || []).map((text, i) => {
      const b = el('button', { class: 'option', type: 'button', role: 'radio', 'aria-checked': 'false' }, [
        el('span', { class: 'option__key', 'aria-hidden': 'true', text: String.fromCharCode(65 + i) }),
        el('span', { class: 'option__text', text }),
      ]);
      b.addEventListener('click', () => { if (!ctx.locked) ctx.submit({ choice: i }); });
      options.append(b);
      return b;
    });

    root.append(
      el('p', { class: 'activity__prompt', text: activity.prompt }),
      wrap,
      options,
    );

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
