import { el } from '../core/dom.js';

// A media block between activities. Never blocks progress.

export default {
  type: 'media',
  // Scenery between activities. Never graded.
  graded: false,
  render(activity, ctx) {
    const root = el('div', { class: 'activity activity--media' });
    const kind = activity.kind || 'image';

    if (kind === 'image') {
      root.append(el('img', {
        class: 'media-img',
        src: activity.src,
        alt: activity.alt || activity.caption || 'Lesson image',
        loading: 'lazy',
      }));
    } else if (kind === 'audio') {
      const audio = el('audio', { class: 'media-audio', src: activity.src, controls: true, preload: 'none' });
      audio.addEventListener('play', () => ctx.onMediaPlay?.());
      root.append(audio);
    } else if (kind === 'video') {
      root.append(el('video', {
        class: 'media-video',
        src: activity.src,
        controls: true,
        playsinline: true,
        preload: 'metadata',
      }));
    }

    if (activity.caption) {
      root.append(el('p', { class: 'media-caption', text: activity.caption }));
    }

    if (activity.explanation) {
      root.append(el('p', { class: 'activity__note', text: activity.explanation }));
    }

    // A media block is scenery between activities. It must never block
    // progress, so it gets a plain way forward.
    const next = el('button', { class: 'btn btn--primary btn--block', type: 'button' }, ['Continue']);
    next.addEventListener('click', () => ctx.submit({ seen: true }));

    root.append(el('div', { class: 'activity__actions' }, [next]));
    return { root, check() { return true; } };
  },
};
