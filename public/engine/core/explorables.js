// Explorables: small simulations a child plays with. Each has sliders and a draw function that turns the slider values into a
// picture and a read-out, using the real rule (the law of reflection, T = 2*pi*sqrt(L/g), local time = longitude / 15), so what
// the child sees is right by construction. A lesson only chooses a widget and sets challenges (tools/add-explore.py).
// All drawing is SVG built in code; no files, no network.

const NS = 'http://www.w3.org/2000/svg';
const INK = '#2a1a4a', C = { o: '#ff7a59', y: '#ffb703', b: '#3a86ff', g: '#06a77d', p: '#8338ec', sky: '#bde0fe', cream: '#fff7e8' };
export const W = 600, H = 300;

export function s(tag, attrs = {}, kids = []) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  for (const c of [].concat(kids)) if (c != null) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
}
const T = (x, y, str, o = {}) => s('text', { x, y, 'text-anchor': o.a || 'middle', 'font-size': o.z || 18, 'font-weight': o.w || 700, fill: o.f || INK, 'font-family': 'sans-serif' }, str);
const L = (x1, y1, x2, y2, c = INK, w = 4, extra = {}) => s('line', { x1, y1, x2, y2, stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', ...extra });
const CIRC = (cx, cy, r, f, o = {}) => s('circle', { cx, cy, r, fill: f, stroke: o.s || INK, 'stroke-width': o.w ?? 2, ...(o.x || {}) });
const R = (x, y, w, h, f, o = {}) => s('rect', { x, y, width: w, height: h, fill: f, stroke: o.s || INK, 'stroke-width': o.w ?? 2, rx: o.r ?? 0, ...(o.x || {}) });
const rad = (d) => (d * Math.PI) / 180;
const num = (x, p = 2) => String(+Number(x).toFixed(p));
const year = (y) => (y < 0 ? `${-y} BCE` : y === 0 ? '1 CE' : `${y} CE`);

function arc(cx, cy, r, a0, a1) {   // angles in degrees, counter-clockwise from the +x axis
  const x0 = cx + r * Math.cos(rad(a0)), y0 = cy - r * Math.sin(rad(a0)), x1 = cx + r * Math.cos(rad(a1)), y1 = cy - r * Math.sin(rad(a1));
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 0 ${x1} ${y1}`;
}

// Each widget: about (what it can teach, read by the model that picks one), sliders [key, label, min, max, step, start], draw(v, p).
// draw returns { kids: svg nodes, say: the read-out sentence }. p holds lesson-specific settings, listed in "params".
export const WIDGETS = {
  angle: {
    subject: 'maths', about: 'An angle that opens as the slider moves, named acute, right, obtuse, straight or reflex. For angles, turning, measuring with a protractor.',
    sliders: [['angle', 'Turn the arm', 0, 360, 5, 40]],
    draw(v) {
      const a = v.angle, cx = 300, cy = 170, x = cx + 170 * Math.cos(rad(a)), y = cy - 170 * Math.sin(rad(a));
      const name = a === 0 ? 'a zero angle' : a < 90 ? 'an acute angle' : a === 90 ? 'a right angle' : a < 180 ? 'an obtuse angle' : a === 180 ? 'a straight angle' : a < 360 ? 'a reflex angle' : 'a complete turn';
      return { kids: [
        a > 0 ? s('path', { d: a >= 360 ? `M ${cx + 46} ${cy} A 46 46 0 1 0 ${cx - 46} ${cy} A 46 46 0 1 0 ${cx + 46} ${cy}` : `${arc(cx, cy, 46, 0, a)} L ${cx} ${cy} Z`, fill: C.y, stroke: INK, 'stroke-width': 2, opacity: 0.8 }) : null,
        L(cx, cy, cx + 170, cy, INK, 6), L(cx, cy, x, y, C.o, 6), CIRC(cx, cy, 8, INK),
      ], say: `${a} degrees: ${name}.` };
    },
  },
  fraction: {
    subject: 'maths', about: 'A bar cut into equal parts with some shaded, and equal fractions lined up. For fractions, equivalent fractions, comparing fractions.',
    sliders: [['d', 'Equal parts in each bar', 2, 12, 1, 4], ['n', 'Parts shaded', 0, 12, 1, 1]],
    draw(v) {
      const bars = Math.max(1, Math.ceil(v.n / v.d)), bw = 540, kids = [], h = Math.min(70, 200 / bars), pw = bw / v.d;
      for (let b = 0; b < bars; b++) for (let i = 0; i < v.d; i++) kids.push(R(30 + i * pw, 30 + b * (h + 10), pw, h, b * v.d + i < v.n ? C.g : '#fff', { w: 3 }));
      const dec = v.n / v.d;
      return { kids, say: `${v.n}/${v.d} is ${v.n === v.d ? 'one whole' : v.n > v.d ? 'more than one whole' : 'less than one whole'}, which is ${num(dec, 3)} as a decimal.` };
    },
  },
  rectangle: {
    subject: 'maths', about: 'A rectangle of unit squares whose length and width change, showing area and perimeter. For area, perimeter, multiplication as rows.',
    sliders: [['l', 'Length', 1, 14, 1, 6], ['b', 'Width', 1, 8, 1, 3]],
    draw(v) {
      const c = Math.min(34, 460 / v.l, 220 / v.b), x0 = (W - c * v.l) / 2, y0 = 30, kids = [];
      for (let i = 0; i < v.b; i++) for (let j = 0; j < v.l; j++) kids.push(R(x0 + j * c, y0 + i * c, c, c, C.sky, { w: 1 }));
      kids.push(R(x0, y0, c * v.l, c * v.b, 'none', { w: 5, s: C.o }));
      return { kids, say: `Area = ${v.l} x ${v.b} = ${v.l * v.b} square unit${v.l * v.b === 1 ? '' : 's'}. Perimeter = 2 x (${v.l} + ${v.b}) = ${2 * (v.l + v.b)} units.` };
    },
  },
  integers: {
    subject: 'maths', about: 'A number line from -15 to 15 with a jump showing adding a positive or negative number. For integers, negative numbers, zero.',
    sliders: [['start', 'Start at', -10, 10, 1, 3], ['add', 'Add', -5, 5, 1, -5]],
    draw(v) {
      const X = (n) => 300 + n * 18, y = 170, kids = [L(20, y, 580, y)], end = v.start + v.add;
      for (let n = -15; n <= 15; n++) { kids.push(L(X(n), y - 8, X(n), y + 8, INK, n === 0 ? 4 : 2)); if (n % 5 === 0) kids.push(T(X(n), y + 32, n, { z: 16 })); }
      if (v.add) kids.push(s('path', { d: `M ${X(v.start)} ${y - 12} Q ${(X(v.start) + X(end)) / 2} ${y - 30 - Math.abs(v.add) * 10} ${X(end)} ${y - 12}`, fill: 'none', stroke: v.add > 0 ? C.g : C.o, 'stroke-width': 5, 'stroke-linecap': 'round' }));
      kids.push(CIRC(X(v.start), y, 9, '#fff', { w: 4 }), CIRC(X(end), y, 10, C.y, { w: 3 }));
      return { kids, say: `${v.start} ${v.add < 0 ? '-' : '+'} ${Math.abs(v.add)} = ${end}. ${v.add === 0 ? 'Adding zero changes nothing.' : `Adding a ${v.add < 0 ? 'negative moves left' : 'positive moves right'}.`}` };
    },
  },
  balance: {
    subject: 'maths', about: 'A balance scale with a*x + b on one side and c on the other; it levels when x is right. For algebra, equations, the equals sign. Set a, b, c so the answer is a whole number from 1 to 20.',
    params: { a: 2, b: 3, c: 11 },
    sliders: [['x', 'Try a value of x', 0, 20, 1, 1]],
    draw(v, p) {
      const left = p.a * v.x + p.b, diff = left - p.c, tilt = Math.max(-14, Math.min(14, diff * 2)), cx = 300, cy = 90;
      const dx = 170 * Math.cos(rad(tilt)), dy = 170 * Math.sin(rad(tilt));
      return { kids: [
        s('polygon', { points: `${cx - 30},280 ${cx + 30},280 ${cx},${cy}`, fill: C.p, stroke: INK, 'stroke-width': 3 }),
        L(cx - dx, cy + dy, cx + dx, cy - dy, INK, 8),
        R(cx - dx - 70, cy + dy + 6, 140, 56, C.y, { r: 10, w: 3 }), T(cx - dx, cy + dy + 42, `${p.a}x + ${p.b} = ${left}`, { z: 17 }),
        R(cx + dx - 60, cy - dy + 6, 120, 56, C.sky, { r: 10, w: 3 }), T(cx + dx, cy - dy + 42, p.c, { z: 22 }),
      ], say: diff === 0 ? `Balanced! When x = ${v.x}, both sides equal ${p.c}.` : `Not balanced: ${left} is ${diff > 0 ? 'more' : 'less'} than ${p.c}.` };
    },
  },
  pattern: {
    subject: 'maths', about: 'A growing dot pattern. Param rule is one of "square", "triangle", "odd", "even", "power2". For number patterns and sequences.',
    params: { rule: 'square' },
    sliders: [['n', 'Term number', 1, 8, 1, 3]],
    draw(v, p) {
      const count = { square: v.n * v.n, triangle: (v.n * (v.n + 1)) / 2, odd: 2 * v.n - 1, even: 2 * v.n, power2: 2 ** (v.n - 1) }[p.rule] ?? v.n * v.n, kids = [];
      if (p.rule === 'triangle') { const g = Math.min(28, 230 / v.n); for (let r = 0; r < v.n; r++) for (let i = 0; i <= r; i++) kids.push(CIRC(300 + (i - r / 2) * g, 30 + r * g, g * 0.38, C.b)); }
      else { const per = p.rule === 'square' ? v.n : Math.ceil(Math.sqrt(count * 2)), g = Math.min(30, 500 / per, 230 / Math.ceil(count / per)); for (let i = 0; i < count; i++) kids.push(CIRC(300 + ((i % per) - (per - 1) / 2) * g, 30 + Math.floor(i / per) * g, g * 0.38, C.o)); }
      return { kids, say: `Term ${v.n} has ${count} dot${count === 1 ? '' : 's'}.` };
    },
  },
  particles: {
    subject: 'science', about: 'Particles of water that are held in place, slide past each other, or fly apart as temperature changes (ice below 0 C, steam above 100 C). For states of matter, melting, boiling, evaporation, particle nature of matter.',
    sliders: [['temp', 'Temperature (C)', -20, 140, 5, 20]], animated: true,
    draw(v, p, t = 0) {
      const state = v.temp <= 0 ? 'solid' : v.temp < 100 ? 'liquid' : 'gas', kids = [R(90, 20, 420, 250, C.cream, { w: 4, r: 12 })], n = 42;
      for (let i = 0; i < n; i++) {
        const col = i % 7, row = Math.floor(i / 7), hx = 150 + col * 50, hy = state === 'liquid' ? 135 + row * 24 : 75 + row * 34, ph = i * 1.7;
        let x = hx, y = hy;
        if (state === 'solid') { x += Math.sin(t * 6 + ph) * 1.5; y += Math.cos(t * 6 + ph) * 1.5; }
        else if (state === 'liquid') { x = 112 + ((hx + t * 22 * (1 + (i % 3)) + Math.sin(t + ph) * 18) % 376); y = Math.min(254, hy + Math.sin(t * 2 + ph) * 8); }
        else { x = 300 + 195 * Math.sin(t * 1.3 * (1 + (i % 5) / 4) + ph); y = 145 + 110 * Math.cos(t * 1.7 * (1 + (i % 4) / 5) + ph * 2); }
        kids.push(CIRC(x, y, 10, state === 'solid' ? C.b : state === 'liquid' ? '#4cc9f0' : C.o, { w: 1.5 }));
      }
      return { kids, say: `${v.temp} C: water is a ${state}. ${{ solid: 'Particles are held in place and only jiggle.', liquid: 'Particles slide past each other.', gas: 'Particles fly far apart, fast.' }[state]}` };
    },
  },
  reflection: {
    subject: 'science', about: 'A light ray hitting a mirror; the reflected ray leaves at the same angle to the normal. For light, mirrors, law of reflection.',
    sliders: [['i', 'Angle of the incoming ray', 0, 80, 5, 40]],
    draw(v) {
      const cx = 300, cy = 240, r = 210, a = rad(v.i), ix = cx - r * Math.sin(a), iy = cy - r * Math.cos(a), ox = cx + r * Math.sin(a), oy = iy;
      return { kids: [
        R(90, cy, 420, 14, C.sky, { w: 3 }), L(cx, cy, cx, 20, INK, 2, { 'stroke-dasharray': '8 6' }), T(cx, 16, 'normal', { z: 14 }),
        L(ix, iy, cx, cy, C.y, 6), L(cx, cy, ox, oy, C.o, 6),
        T(cx - 44, cy - 64, `${v.i}`, { z: 18 }), T(cx + 44, cy - 64, `${v.i}`, { z: 18 }),
      ], say: `Angle in = ${v.i} degrees, angle out = ${v.i} degrees. They are always equal.` };
    },
  },
  pendulum: {
    subject: 'science', about: 'A pendulum whose string length changes; a longer string swings more slowly. For time and motion, periodic motion, measuring time.',
    sliders: [['len', 'String length (cm)', 10, 100, 5, 40]], animated: true,
    draw(v, p, t = 0) {
      const T0 = 2 * Math.PI * Math.sqrt(v.len / 100 / 9.8), th = rad(24) * Math.cos((2 * Math.PI * t) / T0), L0 = 40 + v.len * 2.2, x = 300 + L0 * Math.sin(th), y = 20 + L0 * Math.cos(th);
      return { kids: [R(200, 8, 200, 12, INK), L(300, 20, x, y, INK, 3), CIRC(x, y, 20, C.o, { w: 3 })], say: `A ${v.len} cm pendulum takes about ${num(T0, 1)} seconds for one full swing.` };
    },
  },
  daynight: {
    subject: 'science', about: 'Earth spinning with the Sun on one side; a marked place moves from day into night over 24 hours. For rotation, day and night, sunrise and sunset, time.',
    sliders: [['hour', 'Time of day (hour)', 0, 24, 1, 12]],
    draw(v) {
      const cx = 360, cy = 150, r = 110, a = rad(((v.hour - 12) / 24) * 360), px = cx - r * Math.cos(a), py = cy + r * Math.sin(a) * 0.15 - 0, day = v.hour >= 6 && v.hour <= 18;
      const rays = []; for (let i = -2; i <= 2; i++) rays.push(L(90, 150 + i * 40, 215, 150 + i * 40, C.y, 4));
      return { kids: [
        R(0, 0, W, H, '#101437', { w: 0 }), CIRC(40, 150, 40, C.y, { s: C.y }), ...rays,
        CIRC(cx, cy, r, '#0b1b4a', { w: 2 }), s('path', { d: `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`, fill: C.b }),
        CIRC(px, py, 11, C.o, { s: '#fff', w: 3 }),
      ], say: `${v.hour === 24 ? 0 : v.hour}:00. The marked place is in ${day ? 'daylight, facing the Sun' : 'night, facing away from the Sun'}. One full spin takes 24 hours.` };
    },
  },
  seasons: {
    subject: 'science', about: 'Earth at four places on its yearly path with its tilted axis; the northern half leans toward the Sun in June. For revolution, tilt, seasons.',
    sliders: [['month', 'Month (1 = January)', 1, 12, 1, 6]],
    draw(v) {
      const a = rad(((v.month - 6) / 12) * 360), cx = 300 + 210 * Math.cos(a), cy = 150 + 80 * Math.sin(a);
      const north = [12, 1, 2].includes(v.month) ? 'winter' : v.month < 6 ? 'spring' : v.month < 9 ? 'summer' : 'autumn';
      return { kids: [
        R(0, 0, W, H, '#101437', { w: 0 }), s('ellipse', { cx: 300, cy: 150, rx: 210, ry: 80, fill: 'none', stroke: '#fff', 'stroke-dasharray': '6 6' }), CIRC(300, 150, 34, C.y, { s: C.y }),
        CIRC(cx, cy, 30, C.b, { s: '#fff' }), L(cx + 11, cy + 38, cx - 11, cy - 38, '#fff', 3), T(cx - 15, cy - 44, 'N', { f: '#fff', z: 14 }),
      ], say: `Month ${v.month}: the northern half of the Earth has ${north}. The tilt, not distance, makes seasons.` };
    },
  },
  circuit: {
    subject: 'science', about: 'A simple circuit with a switch, cells and bulbs in a row; the bulb lights only in a closed circuit and dims with more bulbs. For electricity, circuits, conductors, switches.',
    sliders: [['closed', 'Switch (0 open, 1 closed)', 0, 1, 1, 0], ['cells', 'Cells', 1, 3, 1, 1], ['bulbs', 'Bulbs', 1, 3, 1, 1]],
    draw(v) {
      const on = v.closed === 1, bright = on ? Math.min(1, v.cells / v.bulbs / 1.5) : 0, kids = [s('rect', { x: 80, y: 50, width: 440, height: 190, fill: 'none', stroke: on ? C.y : INK, 'stroke-width': 6, rx: 14 })];
      for (let i = 0; i < v.cells; i++) kids.push(R(120 + i * 44, 225, 36, 30, C.g, { r: 4 }));
      for (let i = 0; i < v.bulbs; i++) { const x = 300 + (i - (v.bulbs - 1) / 2) * 110; kids.push(CIRC(x, 50, 28, bright ? `rgba(255,214,10,${0.3 + bright * 0.7})` : '#ddd', { w: 3 })); }
      kids.push(on ? L(400, 240, 470, 240, C.y, 8) : L(400, 240, 462, 200, INK, 8));
      return { kids, say: on ? `Closed circuit: current flows and the bulb${v.bulbs > 1 ? 's glow' : ' glows'}${v.bulbs > v.cells ? ', dimly because more bulbs share the cells' : ''}.` : 'Open circuit: there is a gap, so no current flows and nothing lights.' };
    },
  },
  floatsink: {
    subject: 'science', about: 'A block in water; compared with water (1 g per cubic cm), a lighter-for-its-size block floats and a denser one sinks. For density, floating and sinking, materials.',
    sliders: [['d', 'How dense the block is (tenths of g per cubic cm)', 2, 20, 1, 5]],
    draw(v) {
      const rho = v.d / 10, floats = rho < 1, top = 110, sub = floats ? rho : 1, by = floats ? top - 70 * (1 - sub) : rho === 1 ? top + 40 : 200;
      return { kids: [R(90, 40, 420, 240, '#fff', { w: 4 }), R(92, top, 416, 168, '#a9def9', { w: 0 }), R(260, by, 80, 70, C.o, { w: 3 })],
        say: `Density ${num(rho, 1)}: the block ${rho < 1 ? 'floats, with part of it above the water' : rho === 1 ? 'hangs in the water, neither rising nor sinking' : 'sinks, being denser than water'}.` };
    },
  },
  magnets: {
    subject: 'science', about: 'Two bar magnets that can be flipped and moved; unlike poles attract and like poles repel, more strongly when close. For magnets and poles.',
    sliders: [['flip', 'Flip the right magnet (0 or 1)', 0, 1, 1, 0], ['gap', 'Gap between them', 10, 150, 10, 80]],
    draw(v) {
      const mag = (x, nLeft) => [R(x, 120, 75, 60, nLeft ? '#e63946' : C.b, { w: 3 }), R(x + 75, 120, 75, 60, nLeft ? C.b : '#e63946', { w: 3 }), T(x + 37, 158, nLeft ? 'N' : 'S', { f: '#fff', z: 24 }), T(x + 112, 158, nLeft ? 'S' : 'N', { f: '#fff', z: 24 })];
      const x0 = 300 - v.gap / 2 - 150, x1 = 300 + v.gap / 2, attract = v.flip === 0;
      const dir = attract ? 1 : -1, arrow = (x, d) => [L(x, 90, x + d * 26, 90, attract ? C.g : C.o, 5), s('polygon', { points: `${x + d * 34},90 ${x + d * 22},82 ${x + d * 22},98`, fill: attract ? C.g : C.o })];
      return { kids: [...mag(x0, false), ...mag(x1, v.flip === 1), ...arrow(x0 + 75, dir), ...arrow(x1 + 75, -dir)],
        say: `${attract ? 'North faces south: they pull together' : 'North faces north: they push apart'}${v.gap <= 40 ? ', strongly because they are close' : v.gap >= 120 ? ', weakly because they are far apart' : ''}.` };
    },
  },
  timeline: {
    subject: 'social', about: 'A timeline you scrub through BCE and CE, with the lesson\'s own dated events marked. For history, chronology, BCE and CE. Param events is a list of {"year": number (negative for BCE), "label": short text} taken from the facts. Sliders span from just before the first event to just after the last.',
    params: { events: [] }, dynamicSliders: (p) => { const y = (p.events || []).map((e) => e.year); const lo = Math.min(...y), hi = Math.max(...y), pad = Math.max(50, Math.round((hi - lo) / 10)); return [['y', 'Move through time', lo - pad, hi + pad, Math.max(1, Math.round((hi - lo) / 100)), lo - pad]]; },
    draw(v, p, t, sl) {
      const [, , lo, hi] = sl[0], X = (y) => 30 + ((y - lo) / (hi - lo)) * 540, kids = [L(30, 180, 570, 180, INK, 6)];
      const events = (p.events || []).slice().sort((a, b) => a.year - b.year);
      if (lo < 0 && hi > 0) { kids.push(L(X(0), 165, X(0), 195, C.p, 4), T(X(0), 215, 'BCE | CE', { z: 14 })); }
      events.forEach((e, i) => { const past = v.y >= e.year; kids.push(CIRC(X(e.year), 180, 9, past ? C.g : '#fff', { w: 3 })); if (past) kids.push(T(Math.min(520, Math.max(80, X(e.year))), 40 + (i % 5) * 25, e.label.slice(0, 32), { z: 14 })); });
      kids.push(L(X(v.y), 150, X(v.y), 210, C.o, 5));
      const last = events.filter((e) => e.year <= v.y).pop();
      return { kids, say: `${year(v.y)}.${last ? ` Most recent event: ${last.label} (${year(last.year)}).` : ' No event yet.'}` };
    },
  },
  timezone: {
    subject: 'social', about: 'A world strip of longitudes; local time is 4 minutes earlier or later per degree, 1 hour per 15 degrees, from Greenwich. For longitude, time zones, standard time, the Prime Meridian.',
    sliders: [['lon', 'Longitude (negative = west)', -180, 180, 15, 0], ['gmt', 'Time at Greenwich (hour)', 0, 23, 1, 12]],
    draw(v) {
      const X = (d) => 300 + d * (270 / 180), kids = [R(30, 60, 540, 150, C.sky, { w: 3, r: 6 })];
      for (let d = -180; d <= 180; d += 45) { kids.push(L(X(d), 60, X(d), 210, d === 0 ? C.o : INK, d === 0 ? 4 : 1.5)); kids.push(T(X(d), 236, d === 0 ? '0' : `${Math.abs(d)}${d < 0 ? 'W' : 'E'}`, { z: 14 })); }
      kids.push(CIRC(X(v.lon), 135, 13, C.y, { w: 3 }));
      const hr = (((v.gmt + v.lon / 15) % 24) + 24) % 24;
      return { kids, say: `At ${Math.abs(v.lon)} degrees ${v.lon < 0 ? 'West' : v.lon > 0 ? 'East' : '(Greenwich)'}, it is ${num(hr, 2)}:00 when Greenwich shows ${v.gmt}:00. Each 15 degrees is one hour.` };
    },
  },
  latlong: {
    subject: 'social', about: 'A grid of latitude and longitude with the Equator, Tropics, Arctic and Antarctic Circles and Prime Meridian marked; a dot moves and its hemisphere and zone are named. For maps, coordinates, heat zones.',
    sliders: [['lat', 'Latitude (negative = south)', -90, 90, 5, 20], ['lon', 'Longitude (negative = west)', -180, 180, 5, 80]],
    draw(v) {
      const X = (d) => 300 + d * 1.5, Y = (d) => 150 - d * 1.5, kids = [R(30, 15, 540, 270, C.sky, { w: 3 })];
      for (const [d, n, c] of [[0, 'Equator', C.o], [23.5, 'Tropic of Cancer', C.g], [-23.5, 'Tropic of Capricorn', C.g], [66.5, 'Arctic Circle', C.p], [-66.5, 'Antarctic Circle', C.p]]) { kids.push(L(30, Y(d), 570, Y(d), c, 2)); kids.push(T(36, Y(d) - 4, n, { a: 'start', z: 12, f: c })); }
      kids.push(L(X(0), 15, X(0), 285, C.o, 2), CIRC(X(v.lon), Y(v.lat), 10, C.y, { w: 3 }));
      const a = Math.abs(v.lat), zone = a <= 23.5 ? 'Torrid (hot) Zone' : a <= 66.5 ? 'Temperate Zone' : 'Frigid (cold) Zone';
      return { kids, say: `${a} degrees ${v.lat < 0 ? 'S' : v.lat > 0 ? 'N' : ''}, ${Math.abs(v.lon)} degrees ${v.lon < 0 ? 'W' : v.lon > 0 ? 'E' : ''}: the ${zone}.` };
    },
  },
  mapscale: {
    subject: 'social', about: 'A ruler on a map where the scale sets how many kilometres each centimetre stands for. For maps, scale, distance.',
    sliders: [['cm', 'Distance on the map (cm)', 1, 10, 1, 3], ['km', 'Scale: 1 cm stands for (km)', 5, 100, 5, 50]],
    draw(v) {
      const kids = [R(30, 40, 540, 170, '#e9f5db', { w: 3 }), CIRC(70, 125, 10, C.o), CIRC(70 + v.cm * 48, 125, 10, C.b), L(70, 125, 70 + v.cm * 48, 125, INK, 3, { 'stroke-dasharray': '6 5' })];
      for (let c = 0; c <= 10; c++) { kids.push(L(70 + c * 48, 225, 70 + c * 48, c % 5 === 0 ? 250 : 240, INK, 2)); kids.push(T(70 + c * 48, 272, c, { z: 13 })); }
      return { kids, say: `${v.cm} cm x ${v.km} km = ${v.cm * v.km} km on the ground.` };
    },
  },
  symmetry: {
    subject: 'maths', about: 'A regular polygon with its lines of symmetry drawn; a regular shape has as many lines as sides. For lines of symmetry.',
    sliders: [['n', 'Number of sides', 3, 8, 1, 4]],
    draw(v) {
      const cx = 300, cy = 150, r = 115, pt = (i) => [cx + r * Math.sin((2 * Math.PI * i) / v.n), cy - r * Math.cos((2 * Math.PI * i) / v.n)], pts = [...Array(v.n).keys()].map(pt), kids = [];
      kids.push(s('polygon', { points: pts.map((q) => q.join(',')).join(' '), fill: C.sky, stroke: INK, 'stroke-width': 4 }));
      for (let i = 0; i < v.n; i++) { const a = (Math.PI * i) / v.n; kids.push(L(cx + 135 * Math.sin(a), cy - 135 * Math.cos(a), cx - 135 * Math.sin(a), cy + 135 * Math.cos(a), C.o, 2.5, { 'stroke-dasharray': '7 5' })); }
      return { kids, say: `A regular shape with ${v.n} sides has ${v.n} lines of symmetry.` };
    },
  },
  rotation: {
    subject: 'maths', about: 'A shape with arms that you rotate; it looks the same at certain angles, which gives its order of rotational symmetry. Param arms is 2, 3, 4, 5 or 6. For rotational symmetry.',
    params: { arms: 3 }, sliders: [['turn', 'Turn the shape (degrees)', 0, 360, 10, 0]],
    draw(v, p) {
      const n = p.arms, cx = 300, cy = 150, kids = [], step = 360 / n, same = Math.abs(v.turn % step) < 1e-6 || Math.abs((v.turn % step) - step) < 1e-6;
      for (let i = 0; i < n; i++) { const a = rad(v.turn + i * step - 90), x = cx + 110 * Math.cos(a), y = cy + 110 * Math.sin(a); kids.push(L(cx, cy, x, y, same ? C.g : C.o, 16), CIRC(x, y, 16, same ? C.g : C.o, { w: 3 })); }
      kids.push(CIRC(cx, cy, 14, INK), s('path', { d: `M 300 12 l -8 14 h 16 z`, fill: INK }));
      return { kids, say: same ? `${v.turn} degrees: it looks exactly as it did at the start. This shape has order ${n}.` : `${v.turn} degrees: it does not match yet. It matches every ${num(step)} degrees.` };
    },
  },
  decimal: {
    subject: 'maths', about: 'Place value blocks for ones, tenths and hundredths building a decimal number. For decimals, tenths, hundredths, comparing decimals.',
    sliders: [['o', 'Ones', 0, 3, 1, 1], ['t', 'Tenths', 0, 9, 1, 2], ['h', 'Hundredths', 0, 9, 1, 5]],
    draw(v) {
      const kids = []; let x = 24;
      for (let i = 0; i < v.o; i++) { kids.push(R(x, 40, 100, 100, C.b, { w: 3 })); x += 106; }
      for (let i = 0; i < v.t; i++) { kids.push(R(x, 40, 10, 100, C.g, { w: 1.5 })); x += 13; }
      x += 8; for (let i = 0; i < v.h; i++) { kids.push(R(x + (i % 3) * 13, 40 + Math.floor(i / 3) * 13, 10, 10, C.o, { w: 1.5 })); }
      const val = v.o + v.t / 10 + v.h / 100;
      kids.push(T(300, 215, val.toFixed(2), { z: 46 }));
      return { kids, say: `${v.o} one${v.o === 1 ? '' : 's'}, ${v.t} tenth${v.t === 1 ? '' : 's'} and ${v.h} hundredth${v.h === 1 ? '' : 's'} make ${val.toFixed(2)}.` };
    },
  },
  bargraph: {
    subject: 'maths', about: 'A bar graph of three days of a count, whose bars and scale can change. For reading and drawing bar graphs, choosing a scale.',
    sliders: [['a', 'Monday', 0, 100, 10, 40], ['b', 'Tuesday', 0, 100, 10, 70], ['c', 'Wednesday', 0, 100, 10, 20], ['scale', 'Scale: 1 mark stands for', 10, 50, 10, 20]],
    draw(v) {
      const base = 250, h = 2.1, kids = [L(70, 20, 70, base), L(70, base, 560, base)];
      for (let m = 0; m <= 100; m += v.scale) { const y = base - m * h; kids.push(L(62, y, 560, y, '#c9c4d6', 1), T(54, y + 5, m, { a: 'end', z: 13 })); }
      [['a', 'Monday', C.o], ['b', 'Tuesday', C.b], ['c', 'Wednesday', C.g]].forEach(([k, l, c], i) => { const x = 110 + i * 150; kids.push(R(x, base - v[k] * h, 90, v[k] * h, c, { w: 3 }), T(x + 45, base + 24, l, { z: 15 })); });
      const m = Math.max(v.a, v.b, v.c), day = v.a === m ? 'Monday' : v.b === m ? 'Tuesday' : 'Wednesday';
      return { kids, say: `The tallest bar is ${day} with ${m}. In all: ${v.a + v.b + v.c}. One mark on the side stands for ${v.scale}.` };
    },
  },
  speed: {
    subject: 'science', about: 'A race between two cars over the same time; speed is distance divided by time. For speed, slow and fast, uniform motion.',
    sliders: [['a', 'Red car speed (m per second)', 5, 40, 5, 10], ['b', 'Blue car speed (m per second)', 5, 40, 5, 20], ['t', 'Time (seconds)', 1, 10, 1, 5]],
    draw(v) {
      const X = (d) => 40 + (d / 400) * 520, da = v.a * v.t, db = v.b * v.t, kids = [L(40, 100, 560, 100, '#c9c4d6', 2), L(40, 200, 560, 200, '#c9c4d6', 2)];
      kids.push(R(X(da) - 30, 70, 44, 26, '#e63946', { r: 6, w: 3 }), R(X(db) - 30, 170, 44, 26, C.b, { r: 6, w: 3 }), T(X(da), 124, `${da} m`, { z: 15 }), T(X(db), 224, `${db} m`, { z: 15 }));
      return { kids, say: `In ${v.t} second${v.t === 1 ? '' : 's'} red goes ${v.a} x ${v.t} = ${da} m and blue goes ${v.b} x ${v.t} = ${db} m. ${da === db ? 'They are level.' : `${da > db ? 'Red' : 'Blue'} is faster.`}` };
    },
  },
  shadow: {
    subject: 'science', about: 'A lamp, an object and a screen; moving the object nearer the lamp makes its shadow bigger because light travels in straight lines. For light, shadows.',
    sliders: [['d', 'Distance of the object from the lamp', 10, 45, 5, 25]],
    draw(v) {
      const lx = 60, ly = 150, sx = 540, x = lx + v.d * 10, hh = 35, sh = hh * ((sx - lx) / (x - lx)), top = Math.max(10, ly - sh), bot = Math.min(290, ly + sh);
      return { kids: [
        s('polygon', { points: `${lx},${ly} ${sx},${top} ${sx},${bot}`, fill: '#fff3b0' }), CIRC(lx, ly, 18, C.y),
        R(sx, top, 14, bot - top, INK, { w: 0 }), R(sx, 10, 14, 280, 'none'), R(x - 6, ly - hh, 12, hh * 2, C.o),
      ], say: `The shadow is ${num(sh / hh, 1)} times as tall as the object. Nearer the lamp, the shadow grows.` };
    },
  },
  eclipse: {
    subject: 'science', about: 'The Moon going round the Earth with the Sun on one side; lined up between Sun and Earth gives a solar eclipse, behind the Earth gives a lunar eclipse. For eclipses and the Moon.',
    sliders: [['moon', 'Move the Moon round the Earth (degrees)', 0, 360, 15, 90]],
    draw(v) {
      const cx = 400, cy = 150, a = rad(v.moon), mx = cx + 95 * Math.cos(a), my = cy - 95 * Math.sin(a), m = v.moon % 360, solar = m === 180, lunar = m === 0;
      return { kids: [R(0, 0, W, H, '#101437', { w: 0 }), CIRC(40, 150, 46, C.y, { s: C.y }), s('polygon', { points: `${cx},${cy - 32} ${cx},${cy + 32} 590,${cy}`, fill: '#000', opacity: 0.55 }), s('circle', { cx, cy, r: 95, fill: 'none', stroke: '#fff', 'stroke-dasharray': '5 6' }), CIRC(cx, cy, 32, C.b, { s: '#fff' }), CIRC(mx, my, 14, lunar ? '#b5503c' : '#ddd', { s: '#fff' })],
        say: solar ? 'Sun, Moon and Earth in line with the Moon in the middle: a solar eclipse.' : lunar ? 'Sun, Earth and Moon in line with the Earth in the middle: a lunar eclipse.' : 'Not in line, so there is no eclipse here.' };
    },
  },
  watercycle: {
    subject: 'science', about: 'The water cycle in steps: evaporation, cooling into clouds, rain and water returning to the sea. For the water cycle.',
    sliders: [['step', 'Step of the cycle', 1, 4, 1, 1]],
    draw(v) {
      const kids = [R(0, 0, W, H, '#dff3ff', { w: 0 }), R(0, 220, W, 80, C.b, { w: 0 }), s('polygon', { points: '380,220 600,70 600,220', fill: '#7a9e7e', stroke: INK }), CIRC(70, 60, 34, C.y)];
      const arrows = (x0, y0, y1, c) => [0, 1, 2].map((i) => L(x0 + i * 50, y0, x0 + i * 50, y1, c, 4, { 'stroke-dasharray': '6 6' }));
      if (v.step === 1) kids.push(...arrows(130, 210, 120, '#4cc9f0'));
      if (v.step >= 2 && v.step <= 3) kids.push(...[300, 340, 380, 330].map((x, i) => CIRC(x, i === 3 ? 50 : 70, 30, '#fff', { w: 2 })));
      if (v.step === 3) kids.push(...arrows(305, 105, 190, C.b));
      if (v.step === 4) kids.push(s('path', { d: 'M 560 110 Q 480 200 340 228', fill: 'none', stroke: '#0077b6', 'stroke-width': 8 }));
      return { kids, say: ['Evaporation: the Sun heats water and it rises as vapour.', 'Condensation: vapour cools high up and forms clouds.', 'Precipitation: drops grow heavy and fall as rain.', 'Collection: rivers carry the water back to the sea, and it all begins again.'][v.step - 1] };
    },
  },
  neutral: {
    subject: 'science', about: 'A beaker where drops of an acid and a base of equal strength are added, with a litmus colour: acid red, base blue, neutral in between. For acids, bases, indicators, neutralisation.',
    sliders: [['acid', 'Drops of acid', 0, 10, 1, 4], ['base', 'Drops of base', 0, 10, 1, 1]],
    draw(v) {
      const d = v.acid - v.base, col = d > 0 ? '#e63946' : d < 0 ? '#3a86ff' : '#9d6bb8', name = d > 0 ? 'acidic' : d < 0 ? 'basic' : 'neutral';
      return { kids: [s('path', { d: 'M 210 40 V 260 Q 210 280 230 280 H 370 Q 390 280 390 260 V 40', fill: '#fff', stroke: INK, 'stroke-width': 5 }), R(213, 110, 174, 167, col, { w: 0, r: 8, x: { opacity: 0.8 } })],
        say: `${v.acid} drops of acid and ${v.base} of base: the solution is ${name}, so litmus shows ${d > 0 ? 'red' : d < 0 ? 'blue' : 'neither colour change'}.` };
    },
  },
};

export function slidersOf(id, params) { const w = WIDGETS[id]; return w?.dynamicSliders ? w.dynamicSliders(params || w.params || {}) : w?.sliders || []; }
export const CATALOG = Object.entries(WIDGETS).map(([id, w]) => ({ id, subject: w.subject, about: w.about, params: w.params || null, sliders: w.dynamicSliders ? 'set from the events' : w.sliders.map(([key, label, min, max, step, start]) => ({ key, label, min, max, step, start })) }));
