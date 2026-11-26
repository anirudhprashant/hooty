import { el, stopSpeech } from '../core/dom.js';
import { widgets, loadWidgets } from '../core/widgets.js';
import { evaluate } from '../core/gen.js';
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';

// A simulation to play with: move the sliders, watch what changes, and meet Hooty's challenges one by one. A challenge ticks itself
// when the child gets there, and then says what it means. Nothing is graded and nothing blocks moving on: this is for playing.
export default {
  type: 'explore',
  graded: false,
  render(activity, ctx) {
    const root = el('div', { class: 'activity activity--explore' });
    // The widget file arrives on demand. app.js starts that load when a lesson containing a simulation opens, so this
    // fallback is only seen in the first moments of a cold load.
    const kit = widgets();
    if (!kit) {
      loadWidgets().then(() => ctx.rerender?.()).catch(() => {});
      root.append(el('p', { class: 'explore__say', text: activity.title || t('tryItYourself') }),
        el('div', { class: 'activity__actions' }, [el('button', { class: 'btn btn--primary btn--block', type: 'button', text: t('next'), onclick: () => ctx.submit({}) })]));
      return { root, check() { return true; } };
    }
    const { WIDGETS, W, H, s, slidersOf } = kit;
    const widget = WIDGETS[activity.widget];
    if (!widget) { root.append(el('p', { text: activity.title || '' }), el('div', { class: 'activity__actions' }, [el('button', { class: 'btn btn--primary btn--block', type: 'button', text: t('next'), onclick: () => ctx.submit({}) })])); return { root, check() { return true; } }; }
    const params = { ...(widget.params || {}), ...(activity.params || {}) };
    const sl = slidersOf(activity.widget, params);
    const v = Object.fromEntries(sl.map(([key, , , , , start]) => [key, start]));
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'explore__stage', role: 'img', 'aria-label': activity.title || 'A simulation' });
    const readout = el('p', { class: 'explore__say', 'aria-live': 'polite' });
    const tasks = (activity.tasks || []).map((t) => ({ ...t, done: false }));
    const list = el('ol', { class: 'explore__tasks' });
    const finished = el('p', { class: 'explore__done', hidden: true, text: activity.takeaway || t('wellExplored') });
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
      if (hit) { cur.done = true; ctx.sfx?.(tasks.every((t) => t.done) ? 'halfway' : 'pair'); paintTasks(); check(); }   // one move can finish the next challenge too
    };
    const controls = sl.map(([key, label, min, max, step]) => {
      // A small set of positions is a choice, not a measurement: the number means nothing to a child and the
      // old "label 0" row read like a form field. Only show the value when the range is wide enough to matter.
      const showVal = (Number(max) - Number(min)) > 6;
      const out = showVal ? el('output', { class: 'explore__val', text: String(v[key]) }) : null;
      const input = el('input', { class: 'range explore__range', type: 'range', min: String(min), max: String(max), step: String(step), value: String(v[key]), 'aria-label': label });
      const fill = () => {
        const lo = Number(min), hi = Number(max), now = Number(input.value);
        const pct = hi > lo ? Math.round(((now - lo) / (hi - lo)) * 100) : 0;
        input.style.setProperty('--fill', `${pct}%`);
      };
      fill();
      // A slider whose positions are sentences or choices has to say which one is chosen: a bare
      // "Which sentence?" with an empty track tells a child nothing.
      const name = widget.sliderText ? el('span', { class: 'explore__pick' }) : null;
      const paintName = () => { if (name) name.textContent = widget.sliderText(v, key, params) || ''; };
      paintName();
      input.addEventListener('input', () => { v[key] = Number(input.value); if (out) out.textContent = input.value; fill(); paintName(); draw(performance.now() / 1000); check(); });
      return el('label', { class: 'explore__control' }, [el('span', { class: 'explore__label' }, [label, out]), input, name]);
    });
    draw(); paintTasks();
    if (widget.animated && !still) {
      const tick = (ms) => { if (!root.isConnected && ms > 2000 && root.dataset.seen) return; if (root.isConnected) { root.dataset.seen = '1'; draw(ms / 1000); } requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
    const next = el('button', { class: 'btn btn--primary btn--block', type: 'button', text: t('next'), onclick: () => { stopSpeech(); ctx.submit({ read: true }); } });
    const nodes = [el('p', { class: 'worked__kicker', text: t('tryItYourself') }), el('h2', { class: 'concept-card__title', text: activity.title || '' }), svg, readout, ...controls, list, finished, el('div', { class: 'activity__actions' }, [next])];
    root.append(...nodes);
    return { root, check() { return true; } };
  },
};
