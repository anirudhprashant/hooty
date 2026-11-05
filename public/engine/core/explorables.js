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

// A coordinate plane with a light grid and numbered axes. Returns the maps from maths to screen and the drawn parts.
function plane(xmin, xmax, ymin, ymax, u, ox, oy) {
  const X = (x) => ox + x * u, Y = (y) => oy - y * u, kids = [];
  for (let x = xmin; x <= xmax; x++) kids.push(L(X(x), Y(ymin), X(x), Y(ymax), x === 0 ? INK : '#ddd6ee', x === 0 ? 3 : 1.5));
  for (let y = ymin; y <= ymax; y++) kids.push(L(X(xmin), Y(y), X(xmax), Y(y), y === 0 ? INK : '#ddd6ee', y === 0 ? 3 : 1.5));
  for (let x = xmin; x <= xmax; x++) if (x && x % 2 === 0) kids.push(T(X(x), Y(0) + 17, x, { z: 12, w: 600, f: '#6b5a8a' }));
  for (let y = ymin; y <= ymax; y++) if (y && y % 2 === 0) kids.push(T(X(0) - 8, Y(y) + 4, y, { z: 12, w: 600, f: '#6b5a8a', a: 'end' }));
  return { X, Y, kids };
}
const clipTo = (id, x, y, w, h, kids) => [s('clipPath', { id }, R(x, y, w, h, '#000', { w: 0 })), s('g', { 'clip-path': `url(#${id})` }, kids)];
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const signed = (n) => (n < 0 ? `- ${num(-n)}` : `+ ${num(n)}`);

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
      events.forEach((e) => kids.push(CIRC(X(e.year), 180, 9, v.y >= e.year ? C.g : '#fff', { w: 3 })));
      // the events reached so far, newest last, as dated lines across the top (at most four, each cut at a whole word)
      const fit = (str) => (str.length > 54 ? `${str.slice(0, 54).replace(/\s+\S*$/, '')}...` : str);
      events.filter((e) => v.y >= e.year).slice(-4).forEach((e, i) => kids.push(T(30, 34 + i * 26, `${year(e.year)}: ${fit(e.label)}`, { z: 14, a: 'start', w: 600 })));
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
  linegraph: {
    subject: 'maths', about: 'A straight line y = m x + c on a coordinate grid, with a rise-over-run step. m is the slope (steepness) and c is where the line crosses the y-axis. For graphs of linear equations, slope, coordinate geometry, y = mx + c.',
    sliders: [['m', 'Slope (m)', -4, 4, 0.5, 1], ['c', 'Crosses the y-axis at (c)', -3, 3, 1, 1]],
    draw(v) {
      const u = 34, P = plane(-8, 8, -4, 4, u, 300, 150), { X, Y } = P, m = v.m, c = v.c;
      const sp = m === 0 ? '' : m === 1 ? 'x' : m === -1 ? '-x' : `${num(m)}x`;
      const eq = sp && c ? `${sp} ${signed(c)}` : sp || String(num(c));
      const kids = [...P.kids, ...clipTo('xp-line', X(-8), Y(4), 16 * u, 8 * u, [L(X(-8), Y(-8 * m + c), X(8), Y(8 * m + c), C.o, 6)])];
      if (m !== 0) kids.push(L(X(0), Y(c), X(1), Y(c), C.b, 4, { 'stroke-dasharray': '6 5' }), L(X(1), Y(c), X(1), Y(c + m), C.g, 5), T(X(0.5), Y(c) + (m > 0 ? 22 : -10), '1', { z: 16, f: C.b }), T(X(1) + 8, Y(c + m / 2) + 5, `${num(Math.abs(m))} ${m > 0 ? 'up' : 'down'}`, { z: 13, f: '#058a68', a: 'start' }));
      kids.push(CIRC(X(0), Y(c), 7, C.y, { w: 3 }));
      return { kids, say: `y = ${eq}. ${m === 0 ? 'The slope is 0, so the line is flat.' : `For every 1 step right, the line goes ${num(Math.abs(m))} ${m > 0 ? 'up' : 'down'}.`} It crosses the y-axis at ${num(c)}.` };
    },
  },
  parabola: {
    subject: 'maths', about: 'A parabola y = a(x - h)^2 + k. a opens it up or down and makes it wide or narrow, h slides it sideways, k lifts it. Shows the vertex, the axis of symmetry and where it crosses the x-axis. For quadratic equations, quadratic graphs, squares, roots.',
    sliders: [['a', 'Opening (a)', -2, 2, 0.5, 1], ['h', 'Slide right (h)', -4, 4, 1, 0], ['k', 'Lift up (k)', -4, 4, 1, -2]],
    draw(v) {
      const u = 26, P = plane(-10, 10, -4, 7, u, 300, 190), { X, Y } = P, { a, h, k } = v, pts = [];
      for (let x = -10; x <= 10.001; x += 0.2) pts.push(`${X(x).toFixed(1)},${Y(a * (x - h) ** 2 + k).toFixed(1)}`);
      const kids = [...P.kids, ...clipTo('xp-par', X(-10), Y(7), 20 * u, 11 * u, [s('polyline', { points: pts.join(' '), fill: 'none', stroke: C.p, 'stroke-width': 6, 'stroke-linejoin': 'round' })])];
      const hx = h === 0 ? 'x' : `(x ${h < 0 ? '+' : '-'} ${Math.abs(h)})`;
      let say;
      if (a === 0) say = `With a = 0 there is no curve: y = ${num(k)}, a flat line.`;
      else {
        kids.push(L(X(h), Y(7), X(h), Y(-4), C.o, 2.5, { 'stroke-dasharray': '7 6' }), CIRC(X(h), Y(k), 7, C.y, { w: 3 }));
        const d = -k / a, sq = Math.sqrt(Math.max(d, 0)); let roots;
        if (d > 1e-9) { kids.push(CIRC(X(h - sq), Y(0), 6, C.g, { w: 2.5 }), CIRC(X(h + sq), Y(0), 6, C.g, { w: 2.5 })); roots = `It crosses the x-axis at x = ${num(h - sq)} and x = ${num(h + sq)}.`; }
        else if (Math.abs(d) <= 1e-9) { kids.push(CIRC(X(h), Y(0), 6, C.g, { w: 2.5 })); roots = `It just touches the x-axis at x = ${num(h)}.`; }
        else roots = 'It never reaches the x-axis, so there are no roots.';
        say = `y = ${a === 1 ? '' : a === -1 ? '-' : num(a)}${hx === 'x' ? 'x²' : `${hx}²`}${k ? ` ${signed(k)}` : ''}. It opens ${a > 0 ? 'upwards' : 'downwards'}, the vertex is (${h}, ${k}). ${roots}`;
      }
      return { kids, say };
    },
  },
  pythagoras: {
    subject: 'maths', about: 'A right-angled triangle with a square drawn on each side. The two small squares always add up to the big one: a^2 + b^2 = c^2. For the Pythagoras theorem, squares and square roots, right triangles, areas.',
    sliders: [['a', 'Short side a', 1, 8, 1, 3], ['b', 'Short side b', 1, 8, 1, 4]],
    draw(v) {
      const { a, b } = v, u = Math.min(24, 560 / (2 * a + b), 280 / (a + 2 * b)), c = Math.hypot(a, b), rx = 300 - (b * u) / 2, ry = 150 + (a * u) / 2, au = a * u, bu = b * u;
      const kids = [], poly = (pts, f) => s('polygon', { points: pts.map((p) => p.join(',')).join(' '), fill: f, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' });
      kids.push(poly([[rx, ry], [rx, ry - au], [rx - au, ry - au], [rx - au, ry]], C.sky), poly([[rx, ry], [rx + bu, ry], [rx + bu, ry + bu], [rx, ry + bu]], '#ffe3a3'));
      kids.push(poly([[rx, ry - au], [rx + bu, ry], [rx + bu + au, ry - bu], [rx + au, ry - au - bu]].map(([x, y], i) => (i === 3 ? [rx + au, ry - au - bu] : i === 2 ? [rx + bu + au, ry - bu] : [x, y])), '#c9f0dc'));
      for (let i = 1; i < a; i++) { kids.push(L(rx - i * u, ry, rx - i * u, ry - au, INK, 0.8, { opacity: 0.35 }), L(rx, ry - i * u, rx - au, ry - i * u, INK, 0.8, { opacity: 0.35 })); }
      for (let i = 1; i < b; i++) { kids.push(L(rx + i * u, ry, rx + i * u, ry + bu, INK, 0.8, { opacity: 0.35 }), L(rx, ry + i * u, rx + bu, ry + i * u, INK, 0.8, { opacity: 0.35 })); }
      kids.push(poly([[rx, ry], [rx + bu, ry], [rx, ry - au]], C.cream), R(rx, ry - 12, 12, 12, 'none', { w: 2 }));
      kids.push(T(rx - au / 2, ry - au / 2 + 6, `${a * a}`, { z: 20 }), T(rx + bu / 2, ry + bu / 2 + 6, `${b * b}`, { z: 20 }), T(rx + (bu + au) / 2 + 0, ry - (au + bu) / 2 - 0 + 6 + (au - bu) / 2 * 0, `${num(a * a + b * b)}`, { z: 22 }));
      const whole = Math.abs(c - Math.round(c)) < 1e-9;
      return { kids, say: `${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}. So the long side c has c² = ${a * a + b * b}, and c = ${whole ? Math.round(c) : `about ${num(c, 2)}`}.${whole ? ` ${a}, ${b}, ${Math.round(c)} is a Pythagorean triple!` : ''}` };
    },
  },
  trig: {
    subject: 'maths', about: 'A right triangle inside a circle of radius 1 whose angle you turn from 0 to 90 degrees. The height is sin, the width is cos, and tan is the length of the line standing on the right edge. For trigonometry, sine, cosine, tangent, trigonometric ratios, angles of elevation.',
    sliders: [['t', 'Angle in degrees', 0, 90, 5, 30]],
    draw(v) {
      const r = 120, cx = 150, cy = 215, th = rad(v.t), px = cx + r * Math.cos(th), py = cy - r * Math.sin(th), sin = Math.sin(th), cos = Math.cos(th), tan = v.t === 90 ? null : Math.tan(th);
      const kids = [s('path', { d: `M ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx} ${cy - r}`, fill: 'none', stroke: '#c9b8e8', 'stroke-width': 3 }), L(cx - 10, cy, cx + r + 40, cy, INK, 3), L(cx, cy + 10, cx, cy - r - 25, INK, 3), L(cx + r, cy, cx + r, cy - r - 30, '#c9b8e8', 2, { 'stroke-dasharray': '5 5' })];
      kids.push(s('polygon', { points: `${cx},${cy} ${px},${cy} ${px},${py}`, fill: C.cream, stroke: 'none' }), L(cx, cy, px, cy, C.g, 7), L(px, cy, px, py, C.o, 7), L(cx, cy, px, py, INK, 4));
      if (tan !== null && v.t > 0) kids.push(L(cx + r, cy, cx + r, Math.max(cy - r * tan, cy - r - 30), C.b, 7));
      kids.push(CIRC(px, py, 8, C.y, { w: 3 }), s('path', { d: `M ${cx + 34} ${cy} A 34 34 0 0 0 ${cx + 34 * Math.cos(th)} ${cy - 34 * Math.sin(th)}`, fill: 'none', stroke: INK, 'stroke-width': 3 }));
      kids.push(T(370, 100, `sin ${v.t}° = ${num(sin, 3)}`, { a: 'start', f: '#d9531e', z: 22 }), T(370, 150, `cos ${v.t}° = ${num(cos, 3)}`, { a: 'start', f: '#058a68', z: 22 }), T(370, 200, `tan ${v.t}° = ${tan === null ? 'not defined' : num(tan, 3)}`, { a: 'start', f: '#1f63d9', z: 22 }));
      kids.push(T(370, 240, 'height  ·  width  ·  steepness', { a: 'start', z: 13, w: 600, f: '#6b5a8a' }));
      return { kids, say: `At ${v.t}°: sin (the height) is ${num(sin, 3)}, cos (the width) is ${num(cos, 3)}${tan === null ? ', and tan is not defined because the line goes straight up' : `, and tan (the steepness) is ${num(tan, 3)}`}. Notice sin² + cos² = ${num(sin * sin + cos * cos, 2)}.` };
    },
  },
  probability: {
    subject: 'maths', about: 'Flipping a coin or rolling a die many times, with a graph of the fraction of times the event happens settling towards the true chance. Param kind is "coin" (chance of heads is 1/2) or "dice" (chance of a six is 1/6). For probability, chance, experiments, fairness.',
    params: { kind: 'coin' },
    sliders: [['n', 'Number of tries', 5, 500, 5, 10]],
    draw(v, p) {
      const dice = p.kind === 'dice', sides = dice ? 6 : 2, rnd = seeded(2026), hit = [];
      for (let i = 0; i < 500; i++) hit.push(Math.floor(rnd() * sides) === 0 ? 1 : 0);
      const X = (i) => 50 + (i / v.n) * 520, Y = (f) => 260 - f * 220, pr = 1 / sides, kids = [L(50, Y(0), 575, Y(0), INK, 3), L(50, Y(0), 50, Y(1), INK, 3), L(50, Y(pr), 575, Y(pr), C.o, 3, { 'stroke-dasharray': '8 6' }), T(560, Y(pr) - 8, dice ? 'true chance 1/6' : 'true chance 1/2', { a: 'end', z: 13, f: '#d9531e' }), T(34, Y(1) + 4, '1', { z: 13, a: 'end' }), T(34, Y(0) + 4, '0', { z: 13, a: 'end' }), T(310, 288, 'number of tries', { z: 13, w: 600, f: '#6b5a8a' }), T(570, 280, v.n, { z: 13, a: 'end' })];
      let h = 0; const pts = [];
      for (let i = 0; i < v.n; i++) { h += hit[i]; pts.push(`${X(i + 1).toFixed(1)},${Y(h / (i + 1)).toFixed(1)}`); }
      kids.push(s('polyline', { points: pts.join(' '), fill: 'none', stroke: C.b, 'stroke-width': 4, 'stroke-linejoin': 'round' }));
      const frac = h / v.n;
      return { kids, say: `After ${v.n} ${dice ? 'rolls' : 'flips'}: ${h} ${dice ? 'sixes' : 'heads'}, which is ${num(frac, 3)} of the tries. The true chance is ${dice ? '1/6 = 0.167' : '1/2 = 0.5'}. The more you try, the closer the blue line gets to it.` };
    },
  },
  similar: {
    subject: 'maths', about: 'A small triangle with sides 3, 4 and 5 and a bigger copy made by a scale factor. Lengths grow by the scale factor, angles stay the same, and the area grows by the scale factor squared. For similar figures, scaling, enlargement, ratio and proportion, similar triangles.',
    sliders: [['k', 'Scale factor', 0.5, 3, 0.5, 2]],
    draw(v) {
      const u = 16, k = v.k, x0 = 40, y0 = 268, tri = (x, sc, f) => s('polygon', { points: `${x},${y0} ${x + 4 * u * sc},${y0} ${x},${y0 - 3 * u * sc}`, fill: f, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' });
      const x1 = 200, kids = [tri(x0, 1, C.sky), tri(x1, k, '#ffe3a3'), R(x0, y0 - 12, 12, 12, 'none', { w: 2 }), R(x1, y0 - 12, 12, 12, 'none', { w: 2 }),
        T(x0 + 2 * u, y0 + 20, '4', { z: 15 }), T(x0 - 14, y0 - 1.5 * u, '3', { z: 15 }), T(x0 + 2.4 * u + 8, y0 - 1.5 * u - 6, '5', { z: 15 }),
        T(x1 + 2 * u * k, y0 + 20, num(4 * k), { z: 15 }), T(x1 - 18, y0 - 1.5 * u * k, num(3 * k), { z: 15 }), T(x1 + 2 * u * k + 10, y0 - 1.5 * u * k - 8, num(5 * k), { z: 15 })];
      return { kids, say: `Every length is ${num(k)} times as long (3, 4, 5 become ${num(3 * k)}, ${num(4 * k)}, ${num(5 * k)}), and every angle stays the same. The area is ${num(k)} × ${num(k)} = ${num(k * k)} times as big: ${num(6 * k * k)} instead of 6.` };
    },
  },
  circle: {
    subject: 'maths', about: 'A circle whose radius you change, with its circumference unrolled next to the diameter to show the circumference is a little more than 3 diameters (pi). Shows circumference and area. For circles, pi, circumference, area of a circle, radius and diameter.',
    sliders: [['r', 'Radius', 1, 8, 1, 4]],
    draw(v) {
      const u = 9, r = v.r, d = 2 * r * u, cx = 300, cy = 100, total = Math.PI * d, x0 = (600 - total) / 2, kids = [CIRC(cx, cy, r * u, C.sky, { w: 4 }), L(cx - r * u, cy, cx + r * u, cy, C.o, 5), CIRC(cx, cy, 5, INK)];
      kids.push(T(cx, cy - 8, `${2 * r}`, { z: 16, f: '#d9531e' }));
      const cols = [C.y, C.g, C.b];
      for (let i = 0; i < 3; i++) kids.push(R(x0 + i * d, 215, d, 34, cols[i], { w: 3 }), T(x0 + i * d + d / 2, 238, 'd', { z: 17 }));
      kids.push(R(x0 + 3 * d, 215, (Math.PI - 3) * d, 34, C.p, { w: 3 }), T(300, 275, `circumference = ${num(2 * Math.PI * r, 1)}  (3 diameters and a bit more)`, { z: 15, w: 600 }));
      return { kids, say: `Radius ${r}, diameter ${2 * r}. Circumference = 2 × π × ${r} ≈ ${num(2 * Math.PI * r, 1)}, a bit more than 3 diameters. Area = π × ${r}² ≈ ${num(Math.PI * r * r, 1)}.` };
    },
  },
  dotplot: {
    subject: 'maths', about: 'Five numbers as dots on a number line from 0 to 10, with the mean (balance point) and the median (middle value) marked, and the range. Change any number and watch what moves. For data handling, statistics, mean, median, mode, range, average.',
    sliders: [['v1', 'Number 1', 0, 10, 1, 2], ['v2', 'Number 2', 0, 10, 1, 4], ['v3', 'Number 3', 0, 10, 1, 5], ['v4', 'Number 4', 0, 10, 1, 6], ['v5', 'Number 5', 0, 10, 1, 8]],
    draw(v) {
      const vals = [v.v1, v.v2, v.v3, v.v4, v.v5], sorted = [...vals].sort((x, y) => x - y), mean = vals.reduce((x, y) => x + y, 0) / 5, med = sorted[2], X = (n) => 50 + n * 50, y = 190;
      const kids = [L(X(0), y, X(10), y, INK, 4)];
      for (let n = 0; n <= 10; n++) kids.push(L(X(n), y - 7, X(n), y + 7, INK, 2), T(X(n), y + 30, n, { z: 15 }));
      const seen = {};
      for (const val of sorted) { seen[val] = (seen[val] || 0) + 1; kids.push(CIRC(X(val), y - 20 - (seen[val] - 1) * 34, 15, C.b, { w: 3 })); }
      kids.push(CIRC(X(med), y - 20 - ((seen[med] || 1) - 1) * 34, 20, 'none', { s: C.y, w: 5 }), s('polygon', { points: `${X(mean)},${y + 40} ${X(mean) - 14},${y + 70} ${X(mean) + 14},${y + 70}`, fill: C.o, stroke: INK, 'stroke-width': 3 }), T(X(mean), y + 90, 'mean', { z: 14, f: '#d9531e' }));
      return { kids, say: `Numbers in order: ${sorted.join(', ')}. Mean = ${num(vals.reduce((x, y2) => x + y2, 0))} ÷ 5 = ${num(mean, 2)} (the balance point). Median = ${med} (the middle one, ringed). Range = ${sorted[4]} − ${sorted[0]} = ${sorted[4] - sorted[0]}.` };
    },
  },
  squarecube: {
    subject: 'maths', about: 'A square grid of n by n and a cube built from n by n by n small cubes, with the counts. For perfect squares, perfect cubes, squares and square roots, cubes and cube roots, powers, exponents.',
    sliders: [['n', 'Side length n', 1, 7, 1, 3]],
    draw(v) {
      const n = v.n, E = 100, dx = E * 0.866, dy = E * 0.5, cx = 430, cy = 255, kids = [], gx = 70, gy = 100, cell = E / n;
      kids.push(R(gx, gy, E, E, C.sky, { w: 3 }));
      for (let i = 1; i < n; i++) kids.push(L(gx + i * cell, gy, gx + i * cell, gy + E, INK, 1.2), L(gx, gy + i * cell, gx + E, gy + i * cell, INK, 1.2));
      const P = (x, y) => `${(cx + x).toFixed(1)},${(cy - y).toFixed(1)}`;
      kids.push(s('polygon', { points: [P(0, 0), P(dx, dy), P(dx, dy + E), P(0, E)].join(' '), fill: '#ffe3a3', stroke: INK, 'stroke-width': 3 }), s('polygon', { points: [P(0, 0), P(-dx, dy), P(-dx, dy + E), P(0, E)].join(' '), fill: C.sky, stroke: INK, 'stroke-width': 3 }), s('polygon', { points: [P(0, E), P(dx, dy + E), P(0, 2 * dy + E), P(-dx, dy + E)].join(' '), fill: '#c9f0dc', stroke: INK, 'stroke-width': 3 }));
      for (let i = 1; i < n; i++) {
        const f = i / n;
        kids.push(L(cx + dx * f, cy - dy * f, cx + dx * f, cy - dy * f - E, INK, 1.2), L(cx, cy - E * f, cx + dx, cy - dy - E * f, INK, 1.2));
        kids.push(L(cx - dx * f, cy - dy * f, cx - dx * f, cy - dy * f - E, INK, 1.2), L(cx, cy - E * f, cx - dx, cy - dy - E * f, INK, 1.2));
        kids.push(L(cx + dx * f, cy - dy * f - E, cx + dx * f - dx, cy - dy * f - E - dy, INK, 1.2), L(cx - dx * f, cy - dy * f - E, cx - dx * f + dx, cy - dy * f - E - dy, INK, 1.2));
      }
      kids.push(T(gx + E / 2, gy + E + 28, `${n} × ${n} = ${n * n}`, { z: 20 }), T(cx, cy + 32, `${n} × ${n} × ${n} = ${n ** 3}`, { z: 20 }));
      return { kids, say: `A square with side ${n} has ${n}² = ${n * n} small squares, so ${n * n} is a perfect square and its square root is ${n}. A cube with side ${n} has ${n}³ = ${n ** 3} small cubes, so ${n ** 3} is a perfect cube and its cube root is ${n}.` };
    },
  },
  ap: {
    subject: 'maths', about: 'An arithmetic progression drawn as bars: first term a, common difference d, and how many terms. Shows each term, the nth term a + (n - 1)d and the sum of the terms. For arithmetic progressions, sequences and series, nth term, sum of n terms.',
    sliders: [['a', 'First term (a)', -5, 10, 1, 2], ['d', 'Difference (d)', -3, 5, 1, 3], ['n', 'Number of terms (n)', 1, 10, 1, 5]],
    draw(v) {
      const { a, d, n } = v, terms = Array.from({ length: n }, (_, i) => a + i * d), big = Math.max(1, ...terms.map(Math.abs)), k = 105 / big, y0 = 170, bw = Math.min(44, 520 / n - 8), x0 = (600 - n * (bw + 8)) / 2;
      const kids = [L(20, y0, 580, y0, INK, 3)];
      terms.forEach((t, i) => { const x = x0 + i * (bw + 8), h = t * k; kids.push(R(x, h >= 0 ? y0 - h : y0, bw, Math.abs(h), t >= 0 ? C.b : C.o, { w: 2.5, r: 4 }), T(x + bw / 2, h >= 0 ? y0 - h - 8 : y0 - h + 20, t, { z: 15 })); });
      const sum = (n / 2) * (2 * a + (n - 1) * d), last = a + (n - 1) * d;
      return { kids, say: `Terms: ${terms.join(', ')}. Each term ${d === 0 ? 'stays the same' : `${d > 0 ? 'adds' : 'takes away'} ${Math.abs(d)}`}. The ${n}th term = ${a} + (${n} − 1) × ${d} = ${last}. Sum of the ${n} terms = ${n}/2 × (${a} + ${last}) = ${num(sum)}.` };
    },
  },
  triarea: {
    subject: 'maths', about: 'A triangle whose top corner slides along a line parallel to the base, so the shape changes but the area stays the same, next to the rectangle of the same base and height that is twice as big. For area of a triangle, base and height, area of parallelograms and triangles.',
    sliders: [['b', 'Base', 2, 10, 1, 6], ['h', 'Height', 2, 6, 1, 4], ['p', 'Slide the top corner', -4, 12, 1, 3]],
    draw(v) {
      const { b, h, p } = v, u = 26, minX = Math.min(0, p), maxX = Math.max(b, p), x0 = 300 - ((minX + maxX) / 2) * u, y0 = 250, X = (x) => x0 + x * u, Y = (y) => y0 - y * u;
      const kids = [R(X(0), Y(h), b * u, h * u, 'none', { w: 2.5, s: '#c9b8e8', x: { 'stroke-dasharray': '8 6' } }), L(X(Math.min(-4, minX) - 0.5), Y(h), X(Math.max(maxX, 12) + 0.5), Y(h), C.o, 2.5, { 'stroke-dasharray': '4 6' }),
        s('polygon', { points: `${X(0)},${Y(0)} ${X(b)},${Y(0)} ${X(p)},${Y(h)}`, fill: '#ffe3a3', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }), L(X(p), Y(h), X(p), Y(0), C.g, 3, { 'stroke-dasharray': '6 5' }), CIRC(X(p), Y(h), 8, C.y, { w: 3 }),
        T(X(b / 2), Y(0) + 24, `base ${b}`, { z: 15 }), T(X(p) + 10, Y(h / 2), `height ${h}`, { z: 15, a: 'start', f: '#058a68' })];
      return { kids, say: `Area of the triangle = ½ × base × height = ½ × ${b} × ${h} = ${num((b * h) / 2)} square units, exactly half of the rectangle (${b * h}). Slide the top corner along the dashed line: the shape changes but the area does not.` };
    },
  },
  factors: {
    subject: 'maths', about: 'A number shown as every rectangle of dots it can make: each rectangle is a factor pair. A prime number can only make one long row. Shows all factors and the prime factorisation. For factors, multiples, prime and composite numbers, prime factorisation, divisibility.',
    sliders: [['n', 'Number', 2, 40, 1, 12]],
    draw(v) {
      const n = v.n, pairs = [];
      for (let a = 1; a * a <= n; a++) if (n % a === 0) pairs.push([a, n / a]);
      const rows = pairs.reduce((t, [a]) => t + a, 0), cell = Math.min(24, 490 / n, 256 / (rows + pairs.length)), kids = [];
      let y = 24;
      for (const [a, b] of pairs) {
        kids.push(T(12, y + (a * cell) / 2 + 6, `${a} × ${b}`, { a: 'start', z: 17 }));
        for (let r = 0; r < a; r++) for (let c = 0; c < b; c++) kids.push(CIRC(92 + c * cell + cell / 2, y + r * cell + cell / 2, cell * 0.38, pairs.length === 1 ? C.o : C.b, { w: 1 }));
        y += a * cell + Math.max(8, cell * 0.8);
      }
      const fs = []; for (let d = 1; d <= n; d++) if (n % d === 0) fs.push(d);
      const pf = []; let m = n; for (let d = 2; d * d <= m; d++) while (m % d === 0) { pf.push(d); m /= d; } if (m > 1) pf.push(m);
      const prime = fs.length === 2;
      return { kids, say: prime ? `${n} can only make one rectangle, 1 × ${n}. Its only factors are 1 and ${n}, so ${n} is a prime number.` : `${n} = ${pairs.map(([a, b]) => `${a} × ${b}`).join(' = ')}. Factors: ${fs.join(', ')} (${fs.length} of them), so ${n} is composite. In primes: ${n} = ${pf.join(' × ')}.` };
    },
  },
  algebratiles: {
    subject: 'maths', about: 'An expression a x + b drawn as algebra tiles: a long bars, each x units long, and b small unit squares. Change x and the bars stretch and the value updates. For algebraic expressions, variables, letter-numbers, evaluating expressions, like terms.',
    params: { a: 3, b: 2 },
    sliders: [['x', 'Value of x', 1, 10, 1, 2]],
    draw(v, p) {
      const { a, b } = p, u = 22, x0 = 30, kids = [];
      for (let i = 0; i < a; i++) {
        kids.push(R(x0, 26 + i * 34, v.x * u, 26, C.b, { r: 6, w: 2.5 }), T(x0 + (v.x * u) / 2, 26 + i * 34 + 19, 'x', { z: 16, f: '#fff' }));
        for (let k = 1; k < v.x; k++) kids.push(L(x0 + k * u, 26 + i * 34 + 4, x0 + k * u, 26 + i * 34 + 22, '#ffffff', 1, { opacity: 0.45 }));
      }
      const yb = 36 + a * 34;
      for (let j = 0; j < b; j++) kids.push(R(x0 + j * (u + 6), yb, u, u, C.y, { r: 4, w: 2.5 }));
      const val = a * v.x + b, expr = `${a === 1 ? '' : a}x${b ? ` + ${b}` : ''}`;
      kids.push(T(570, 120, expr, { a: 'end', z: 30 }), T(570, 160, `= ${a} × ${v.x}${b ? ` + ${b}` : ''}`, { a: 'end', z: 20, w: 600 }), T(570, 196, `= ${val}`, { a: 'end', z: 30, f: '#058a68' }));
      return { kids, say: `When x = ${v.x}, ${expr} = ${a} × ${v.x}${b ? ` + ${b}` : ''} = ${val}. Each blue bar is one x, so all ${a} bars grow when x grows; the ${b} small squares always stay ${b}.` };
    },
  },
  ruler: {
    subject: 'science', about: 'A pencil laid along a 15 cm ruler marked in centimetres and millimetres. Slide where it starts and how long it is, and read its length by subtracting the start from the end. For measuring length, standard units, centimetres and millimetres, measuring correctly from the zero mark.',
    sliders: [['start', 'Where the pencil starts (cm mark)', 0, 4, 1, 2], ['len', 'Length of the pencil (mm)', 10, 110, 5, 55]],
    draw(v) {
      const u = 36, x0 = 30, y = 170, X = (mm) => x0 + (mm / 10) * u, kids = [R(x0 - 10, y, 15 * u + 20, 64, '#ffe9a8', { r: 6, w: 3 })];
      for (let mm = 0; mm <= 150; mm++) { const big = mm % 10 === 0, mid = mm % 5 === 0; kids.push(L(X(mm), y, X(mm), y + (big ? 24 : mid ? 16 : 9), INK, big ? 2.5 : 1.2)); if (big) kids.push(T(X(mm), y + 44, mm / 10, { z: 15 })); }
      kids.push(T(x0 + 15 * u - 2, y + 58, 'cm', { z: 12, a: 'end', w: 600 }));
      const a = v.start * 10, b = a + v.len;
      kids.push(s('polygon', { points: `${X(a)},${y - 30} ${X(b) - 24},${y - 30} ${X(b)},${y - 18} ${X(b) - 24},${y - 6} ${X(a)},${y - 6}`, fill: C.o, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }), R(X(a), y - 30, 18, 24, '#f4b6c2', { w: 3 }));
      kids.push(L(X(a), y - 40, X(a), y + 2, C.b, 2.5, { 'stroke-dasharray': '4 4' }), L(X(b), y - 40, X(b), y + 2, C.b, 2.5, { 'stroke-dasharray': '4 4' }));
      const cm = (mm) => num(mm / 10, 1);
      kids.push(T(300, 70, `${cm(b)} cm − ${cm(a)} cm = ${cm(v.len)} cm`, { z: 24 }), T(300, 104, `= ${v.len} mm`, { z: 18, w: 600, f: '#058a68' }));
      return { kids, say: `The pencil starts at ${cm(a)} cm and ends at ${cm(b)} cm, so it is ${cm(b)} − ${cm(a)} = ${cm(v.len)} cm long, which is ${v.len} mm (1 cm = 10 mm).${a ? ' Starting at 0 makes reading easier, but subtracting works from any mark.' : ''}` };
    },
  },
  thermometer: {
    subject: 'science', about: 'A thermometer whose reading you set. Param kind "clinical" shows 35 to 42 degrees Celsius in tenths, for body temperature and fever; "lab" shows -10 to 110 degrees, for ice, water and air. For temperature, thermometers, reading a scale, range and divisions, degrees Celsius.',
    params: { kind: 'lab' },
    dynamicSliders: (p) => (p.kind === 'clinical' ? [['t', 'Temperature (degrees C)', 35, 42, 0.1, 36]] : [['t', 'Temperature (degrees C)', -10, 110, 1, 25]]),
    draw(v, p) {
      const clin = p.kind === 'clinical', lo = clin ? 35 : -10, hi = clin ? 42 : 110, x0 = 40, x1 = 540, y = 130, X = (d) => x0 + ((d - lo) / (hi - lo)) * (x1 - x0);
      const kids = [R(x0 - 22, y - 22, x1 - x0 + 44, 44, '#f3f7ff', { r: 22, w: 3 }), CIRC(x0 - 6, y, 26, '#e63946', { w: 3 }), R(x0, y - 8, X(v.t) - x0, 16, '#e63946', { r: 8, w: 0 })];
      const step = clin ? 0.1 : 1, major = clin ? 1 : 10, midv = clin ? 0.5 : 5;
      for (let d = lo; d <= hi + 1e-9; d = +(d + step).toFixed(2)) { const big = Math.abs(d / major - Math.round(d / major)) < 1e-6, mid = Math.abs(d / midv - Math.round(d / midv)) < 1e-6; kids.push(L(X(d), y + 24, X(d), y + 24 + (big ? 20 : mid ? 13 : 7), INK, big ? 2.5 : 1)); if (big) kids.push(T(X(d), y + 64, num(d, 1), { z: 14 })); }
      kids.push(T(300, 54, `${num(v.t, 1)} °C`, { z: 30 }));
      const what = clin ? (v.t >= 38 ? 'This is a fever.' : v.t >= 36.1 && v.t <= 37.5 ? 'This is a normal body temperature (about 37 °C).' : v.t < 36.1 ? 'This is lower than normal.' : 'Slightly above normal.') : (v.t <= 0 ? 'Water freezes into ice at 0 °C.' : v.t >= 100 ? 'Water boils at 100 °C.' : '');
      return { kids, say: `The thermometer reads ${num(v.t, 1)} °C. Each small mark is ${clin ? '0.1' : '1'} degree. ${what}`.trim() };
    },
  },
  coordplane: {
    subject: 'maths', about: 'A point you move on a coordinate plane, showing its coordinates (x, y), which quadrant or axis it is on, its distance from the origin, and its mirror image in the y-axis. For coordinate geometry, the Cartesian plane, quadrants, ordered pairs, plotting points, distance from the origin.',
    sliders: [['x', 'x (across)', -6, 6, 1, 2], ['y', 'y (up)', -4, 4, 1, 3]],
    draw(v) {
      const u = 34, P = plane(-8, 8, -4, 4, u, 300, 150), { X, Y } = P, { x, y } = v, d = Math.hypot(x, y);
      const kids = [...P.kids, T(X(7.6), Y(0) - 8, 'x', { z: 15, a: 'end' }), T(X(0) + 10, Y(3.7), 'y', { z: 15, a: 'start' })];
      for (const [q, qx, qy] of [['I', 6, 3.3], ['II', -6, 3.3], ['III', -6, -3.3], ['IV', 6, -3.3]]) kids.push(T(X(qx), Y(qy), q, { z: 20, f: '#c9b8e8' }));
      kids.push(L(X(x), Y(0), X(x), Y(y), C.b, 2.5, { 'stroke-dasharray': '6 5' }), L(X(0), Y(y), X(x), Y(y), C.g, 2.5, { 'stroke-dasharray': '6 5' }), L(X(0), Y(0), X(x), Y(y), C.o, 3));
      if (x) kids.push(CIRC(X(-x), Y(y), 7, '#fff', { w: 3, s: C.p }));
      kids.push(CIRC(X(x), Y(y), 9, C.y, { w: 3 }), T(X(x) + (x >= 0 ? 12 : -12), Y(y) - 12, `(${x}, ${y})`, { z: 16, a: x >= 0 ? 'start' : 'end' }));
      const where = x === 0 && y === 0 ? 'at the origin' : x === 0 ? 'on the y-axis' : y === 0 ? 'on the x-axis' : `in quadrant ${x > 0 ? (y > 0 ? 'I' : 'IV') : y > 0 ? 'II' : 'III'}`;
      const dist = Math.abs(d - Math.round(d)) < 1e-9 ? `${Math.round(d)}` : `√${x * x + y * y} ≈ ${num(d, 2)}`;
      const lr = x === 0 ? '' : x > 0 ? `${x} right` : `${-x} left`, ud = y === 0 ? '' : y > 0 ? `${y} up` : `${-y} down`, sq = (n) => (n < 0 ? `(${n})` : n);
      return { kids, say: `The point (${x}, ${y}) is ${[lr, ud].filter(Boolean).join(' and ') || 'at the centre'}: it is ${where}. Its distance from the origin is √(${sq(x)}² + ${sq(y)}²) = ${dist}.${x ? ` Its mirror image in the y-axis (hollow dot) is (${-x}, ${y}).` : ''}` };
    },
  },
};

export function slidersOf(id, params) { const w = WIDGETS[id]; return w?.dynamicSliders ? w.dynamicSliders(params || w.params || {}) : w?.sliders || []; }
export const CATALOG = Object.entries(WIDGETS).map(([id, w]) => ({ id, subject: w.subject, about: w.about, params: w.params || null, sliders: w.dynamicSliders ? 'set from the events' : w.sliders.map(([key, label, min, max, step, start]) => ({ key, label, min, max, step, start })) }));
