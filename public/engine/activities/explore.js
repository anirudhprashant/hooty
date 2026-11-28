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
    // Which controls the child has actually moved. A slider whose position 0 is a real choice (the first word,
    // the first meaning) must not look chosen before it is touched, or the card pre-judges an answer.
    const touched = new Set();
    const sync = Object.create(null);   // key -> how to move the matching control when the drawing itself is tapped

    const draw = (t = 0) => {
      const out = widget.draw(v, params, still ? 0 : t, sl, touched);
      svg.replaceChildren(...out.kids.filter(Boolean));
      if (readout.textContent !== out.say) readout.textContent = out.say;
    };
    // Challenges that belong to different positions of the first slider ("choose what each of four words means") are
    // independent, so the row shown has to be the one the child is on, not always the first in the list: a banner that
    // says "choose what fun means" under a card showing "climb" contradicts the card. A word the pack gave no challenge
    // for gets no row at all, rather than somebody else's row.
    const driver = widget.taskPer || (sl[0] ? sl[0][0] : null);
    const keyed = !!widget.taskPer && !!driver && tasks.some((t) => String(t.when || '').replace(/ /g, '').includes(`${driver}==`));
    const aimAt = (val) => tasks.findIndex((t) => {
      const when = String(t.when || '').replace(/ /g, ''), want = `${driver}==${val}`;
      const at = when.indexOf(want);
      return at >= 0 && !/[0-9.]/.test(when.charAt(at + want.length) || ' ');
    });
    const paintTasks = () => {
      const left = tasks.findIndex((t) => !t.done);
      const aimed = keyed ? aimAt(v[driver]) : -1;
      const cur = keyed ? aimed : left;
      // One challenge is already written in big words above the card: repeating it as a numbered list is noise.
      list.hidden = tasks.length <= 1 || (keyed && aimed < 0 && left >= 0);
      list.replaceChildren(...tasks.map((t, i) => (t.done || i === cur ? el('li', { class: `explore__task${t.done ? ' is-done' : ' is-now'}` }, [
        el('span', { class: 'explore__mark', 'aria-hidden': 'true' }, t.done ? [icon('check', { size: 18 })] : [String(i + 1)]),
        el('span', {}, [el('span', { class: 'explore__ask', text: t.say }), t.done && t.then ? el('span', { class: 'explore__then', text: t.then }) : null]),
      ]) : null)).filter(Boolean));
      finished.hidden = left >= 0;
    };
    // A widget can say which controls belong to the current position of another one ("the meaning choice belongs to
    // the word you are on"): moving the word then starts from a clean choice instead of judging the old one against
    // the new word.
    const resetSiblings = () => {
      for (const k of widget.resets || []) {
        if (!sync[k]) continue;
        touched.delete(k);
        v[k] = Number(sync[k].input.min);
        sync[k].input.value = String(v[k]);
        sync[k].fill(); sync[k].paintName();
      }
    };
    const check = () => {
      const cur = tasks.find((t) => !t.done);
      if (!cur) return;
      let hit = false;
      try { hit = evaluate(cur.when, v) !== 0; } catch { hit = false; }
      if (hit) { cur.done = true; ctx.sfx?.(tasks.every((t) => t.done) ? 'halfway' : 'pair'); paintTasks(); check(); }   // one move can finish the next challenge too
    };
    // A widget can draw a control instead of asking for a slider (tiles a child taps, a page-turner for the sentences
    // in a pack). Its range input stays in the page as the state holder but hidden, so the child meets only the drawn
    // thing while the QA walker can still drive a task by setting a value on it.
    const drawn = new Set(widget.drawnControls || []);
    // A card whose parts are buttons is not one picture: role="img" would hide everything inside it from a screen
    // reader, so the stage becomes a group of labelled controls instead.
    if (drawn.size) { svg.setAttribute('role', 'group'); }
    const pagers = [];
    // The ranges of drawn controls stay in the page (hidden) as their state: the QA walker solves a task by setting
    // a value on them, and the screen reader meets the drawn buttons instead.
    const ghosts = el('div', { hidden: true, 'aria-hidden': 'true' });
    // One way in for every kind of choice: a tap on the drawing, a page turn, or the range itself.
    const choose = (key, val) => {
      const st = sync[key];
      if (!st || !Number.isFinite(val)) return;
      const now = Math.max(st.min, Math.min(st.max, val));
      touched.add(key);
      v[key] = now;
      if (key === driver) { resetSiblings(); paintTasks(); }
      if (st.input) st.input.value = String(now);
      if (st.out) st.out.textContent = String(now);
      st.fill(); st.paintName();
      for (const paint of pagers) paint();
      draw(performance.now() / 1000); check();
    };
    const chevron = (left) => s('svg', { viewBox: '0 0 24 24', width: '22', height: '22', 'aria-hidden': 'true', focusable: 'false', class: 'explore__chev' },
      [s('path', { d: left ? 'M 15.5 4 L 7.5 12 L 15.5 20' : 'M 8.5 4 L 16.5 12 L 8.5 20', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })]);
    // A page-turner for a slider that moves between things a child reads (sentences, words). Dragging a slider to
    // pick the second of four sentences is a form field; two big arrows and a row of dots is how a child turns a page.
    const pager = (key, label, min, max, step) => {
      const lo = Number(min), hi = Number(max), inc = Math.max(1, Number(step) || 1);
      const stops = Math.round((hi - lo) / inc) + 1;
      const dots = el('span', { class: 'explore__dots', 'aria-hidden': 'true' });
      const before = el('button', { class: 'explore__step', type: 'button', 'aria-label': `${label}: previous`, onclick: () => choose(key, v[key] - inc) }, [chevron(true)]);
      const after = el('button', { class: 'explore__step', type: 'button', 'aria-label': `${label}: next`, onclick: () => choose(key, v[key] + inc) }, [chevron(false)]);
      const paint = () => {
        const at = Math.round((v[key] - lo) / inc);
        dots.replaceChildren(...Array.from({ length: stops }, (_, i) => el('span', { class: `explore__dot${i === at ? ' is-on' : ''}` })));
        before.disabled = at <= 0; after.disabled = at >= stops - 1;
      };
      paint(); pagers.push(paint);
      return el('div', { class: 'explore__pager', role: 'group', 'aria-label': label }, [before, dots, after]);
    };
    const controls = sl.filter(([, , min, max]) => Number(max) > Number(min)).map(([key, label, min, max, step]) => {
      const own = drawn.has(key);
      // A small set of positions is a choice, not a measurement: the number means nothing to a child and the
      // old "label 0" row read like a form field. Only show the value when the range is wide enough to matter.
      const showVal = (Number(max) - Number(min)) > 6;
      const out = !own && showVal ? el('output', { class: 'explore__val', text: String(v[key]) }) : null;
      const input = el('input', { class: 'range explore__range', type: 'range', min: String(min), max: String(max), step: String(step), value: String(v[key]), 'aria-label': label, ...(own ? { hidden: true, tabindex: '-1' } : {}) });
      const fill = () => {
        const lo = Number(min), hi = Number(max), now = Number(input.value);
        const pct = hi > lo ? Math.round(((now - lo) / (hi - lo)) * 100) : 0;
        input.style.setProperty('--fill', `${pct}%`);
      };
      fill();
      // A slider whose positions are sentences or choices has to say which one is chosen: a bare
      // "Which sentence?" with an empty track tells a child nothing.
      const name = !own && widget.sliderText ? el('span', { class: 'explore__pick' }) : null;
      const paintName = () => { if (name) name.textContent = widget.sliderText(v, key, params, touched.has(key)) || ''; };
      paintName();
      sync[key] = { input, out, fill, paintName, min: Number(min), max: Number(max) };
      // The range stays the state holder even when the card is the control, so a value set on it (by a keyboard,
      // or by the QA walker solving a task) still moves the drawing.
      input.addEventListener('input', () => choose(key, Number(input.value)));
      if (own) { ghosts.append(input); return widget.pagedControl === key ? pager(key, label, min, max, step) : null; }
      return el('label', { class: 'explore__control' }, [el('span', { class: 'explore__label' }, [label, out]), input, name]);
    }).filter(Boolean);
    // A widget can draw its own choices as tappable things (a meaning card, a word tile): the drawn object is the
    // control, and the slider that shares its key follows along, so both ways of choosing stay in step.
    svg.addEventListener('click', (ev) => {
      const hit = ev.target?.closest?.('[data-choice]');
      if (!hit) return;
      const raw = String(hit.getAttribute('data-choice') || '');
      const cut = raw.indexOf(':');
      if (cut < 0) return;
      choose(raw.slice(0, cut), Number(raw.slice(cut + 1)));
    });
    // When the card is the only control, it has to answer the keyboard too: Enter or Space on a drawn tile.
    svg.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
      const hit = ev.target?.closest?.('[data-choice]');
      if (!hit) return;
      ev.preventDefault();
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    draw(); paintTasks();
    if (widget.animated && !still) {
      const tick = (ms) => { if (!root.isConnected && ms > 2000 && root.dataset.seen) return; if (root.isConnected) { root.dataset.seen = '1'; draw(ms / 1000); } requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
    const next = el('button', { class: 'btn btn--primary btn--block', type: 'button', text: t('next'), onclick: () => { stopSpeech(); ctx.submit({ read: true }); } });
    const nodes = [el('p', { class: 'worked__kicker', text: t('tryItYourself') }), el('h2', { class: 'concept-card__title', text: activity.title || '' }), ghosts, svg, readout, ...controls, list, finished, el('div', { class: 'activity__actions' }, [next])];
    root.append(...nodes);
    return { root, check() { return true; } };
  },
};
