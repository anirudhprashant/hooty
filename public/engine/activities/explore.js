import { el, stopSpeech } from '../core/dom.js';
import { WIDGETS, W, H, s, slidersOf } from '../core/explorables.js';
import { evaluate } from '../core/gen.js';
import { icon } from '../core/icons.js';

// A simulation to play with: move the sliders, watch what changes, and meet Lumi's challenges one by one. A challenge ticks itself
// when the child gets there, and then says what it means. Nothing is graded and nothing blocks moving on: this is for playing.
export default {
  type: 'explore',
  graded: false,
  render(activity, ctx) {
    const root = el('div', { class: 'activity activity--explore' });
    const widget = WIDGETS[activity.widget];
    if (!widget) { root.append(el('p', { text: activity.title || '' }), el('div', { class: 'activity__actions' }, [el('button', { class: 'btn btn--primary btn--block', type: 'button', text: 'Next', onclick: () => ctx.submit({}) })])); return { root, check() { return true; } }; }
    const params = { ...(widget.params || {}), ...(activity.params || {}) };
    const sl = slidersOf(activity.widget, params);
    const v = Object.fromEntries(sl.map(([key, , , , , start]) => [key, start]));
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'explore__stage', role: 'img', 'aria-label': activity.title || 'A simulation' });
    const readout = el('p', { class: 'explore__say', 'aria-live': 'polite' });
    const tasks = (activity.tasks || []).map((t) => ({ ...t, done: false }));
    const list = el('ol', { class: 'explore__tasks' });
    const finished = el('p', { class: 'explore__done', hidden: true, text: activity.takeaway || 'Well explored!' });
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const draw = (t = 0) => {
      const out = widget.draw(v, params, still ? 0 : t, sl);
      svg.replaceChildren(...out.kids.filter(Boolean));
      if (readout.textContent !== out.say) readout.textContent = out.say;
    };
    const paintTasks = () => {
      const cur = tasks.findIndex((t) => !t.done);
      list.replaceChildren(...tasks.map((t, i) => (i > cur && cur >= 0 ? null : el('li', { class: `explore__task${t.done ? ' is-done' : ' is-now'}` }, [
        el('span', { class: 'explore__mark', 'aria-hidden': 'true' }, t.done ? [icon('check', { size: 18 })] : [String(i + 1)]),
        el('span', {}, [el('span', { class: 'explore__ask', text: t.say }), t.done && t.then ? el('span', { class: 'explore__then', text: t.then }) : null]),
      ]))).filter(Boolean));
      finished.hidden = cur >= 0;
    };
    const check = () => {
      const cur = tasks.find((t) => !t.done);
      if (!cur) return;
      let hit = false;
      try { hit = evaluate(cur.when, v) !== 0; } catch { hit = false; }
      if (hit) { cur.done = true; ctx.sfx?.(tasks.every((t) => t.done) ? 'halfway' : 'pair'); paintTasks(); }
    };
    const controls = sl.map(([key, label, min, max, step]) => {
      const out = el('output', { class: 'explore__val', text: String(v[key]) });
      const input = el('input', { class: 'range explore__range', type: 'range', min: String(min), max: String(max), step: String(step), value: String(v[key]), 'aria-label': label });
      input.addEventListener('input', () => { v[key] = Number(input.value); out.textContent = input.value; draw(performance.now() / 1000); check(); });
      return el('label', { class: 'explore__control' }, [el('span', { class: 'explore__label' }, [label, ' ', out]), input]);
    });
    draw(); paintTasks();
    if (widget.animated && !still) {
      const tick = (ms) => { if (!root.isConnected && ms > 2000 && root.dataset.seen) return; if (root.isConnected) { root.dataset.seen = '1'; draw(ms / 1000); } requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
    const next = el('button', { class: 'btn btn--primary btn--block', type: 'button', text: 'Next', onclick: () => { stopSpeech(); ctx.submit({ read: true }); } });
    const nodes = [el('p', { class: 'worked__kicker', text: 'Try it yourself' }), el('h3', { class: 'concept-card__title', text: activity.title || '' }), svg, readout, ...controls, list, finished, el('div', { class: 'activity__actions' }, [next])];
    root.append(...nodes);
    return { root, check() { return true; } };
  },
};
