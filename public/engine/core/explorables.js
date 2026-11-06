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
  fractionadd: {
    subject: 'maths', about: 'Two fractions as bars, both re-cut into the same size of piece (a common denominator) and then added into a total bar, with which one is bigger. For adding and subtracting fractions, like and unlike denominators, comparing fractions, equivalent fractions, common denominators.',
    sliders: [['a1', 'First: parts taken', 0, 12, 1, 1], ['d1', 'First: equal parts', 2, 12, 1, 2], ['a2', 'Second: parts taken', 0, 12, 1, 1], ['d2', 'Second: equal parts', 2, 12, 1, 3]],
    draw(v) {
      const g = (p, q) => (q ? g(q, p % q) : p), { a1, d1, a2, d2 } = v, den = (d1 * d2) / g(d1, d2), n1 = (a1 * den) / d1, n2 = (a2 * den) / d2, sum = n1 + n2;
      const x0 = 30, bw = 380, kids = [], fine = den <= 24;
      const bar = (y, n, d, cut, col, label) => {
        const wholes = Math.max(1, Math.ceil(n / d)), h = 30;
        for (let w = 0; w < wholes; w++) {
          const by = y + w * (h + 6), filled = Math.min(d, n - w * d);
          kids.push(R(x0, by, bw, h, '#fff', { w: 2.5 }), R(x0, by, (Math.max(0, filled) / d) * bw, h, col, { w: 0 }));
          if (d <= 24) for (let i = 1; i < d; i++) kids.push(L(x0 + (i / d) * bw, by, x0 + (i / d) * bw, by + h, INK, 2));   // too many pieces would be a smudge
          if (cut && fine) for (let i = 1; i < den; i++) if ((i * d) % den) kids.push(L(x0 + (i / den) * bw, by + 3, x0 + (i / den) * bw, by + h - 3, INK, 1, { 'stroke-dasharray': '3 3', opacity: 0.7 }));
          kids.push(R(x0, by, bw, h, 'none', { w: 3 }));
        }
        kids.push(T(x0 + bw + 16, y + 21, label, { z: 18, a: 'start' }));
        return wholes * (h + 6);
      };
      let y = 18;
      y += bar(y, a1, d1, true, C.b, `${a1}/${d1} = ${n1}/${den}`) + 8;
      y += bar(y, a2, d2, true, C.o, `${a2}/${d2} = ${n2}/${den}`) + 18;
      kids.push(L(x0, y - 9, x0 + bw, y - 9, INK, 2));
      const sg = g(sum, den) || 1, simp = den / sg === 1 ? `${sum / sg}` : `${sum / sg}/${den / sg}`;
      bar(y, sum, den, false, C.g, `${sum}/${den}${sg > 1 && sum ? ` = ${simp}` : ''}`);
      const cmp = n1 === n2 ? `${a1}/${d1} and ${a2}/${d2} are equal` : `${n1 > n2 ? `${a1}/${d1}` : `${a2}/${d2}`} is bigger`;
      return { kids, say: `Cut both into pieces of size 1/${den}: ${a1}/${d1} = ${n1}/${den} and ${a2}/${d2} = ${n2}/${den}, so ${a1}/${d1} + ${a2}/${d2} = ${sum}/${den}${sg > 1 && sum ? ` = ${simp}` : ''}${sum > den ? `, which is more than one whole` : sum === den ? ', exactly one whole' : ''}. ${cmp}.` };
    },
  },
  placevalue: {
    subject: 'maths', about: 'Build a large number from crores, lakhs, thousands and ones. It is written with Indian commas (12,34,567) and international commas (1,234,567), shown in a place-value chart, and named in both systems (lakh and crore, million). For large numbers, place value, the Indian and international number systems, number names, lakhs and crores.',
    sliders: [['crores', 'Crores', 0, 9, 1, 0], ['lakhs', 'Lakhs', 0, 99, 1, 3], ['thousands', 'Thousands', 0, 99, 1, 45], ['ones', 'Ones (0 to 999)', 0, 999, 1, 678]],
    draw(v) {
      const n = v.crores * 1e7 + v.lakhs * 1e5 + v.thousands * 1e3 + v.ones, str = String(n);
      const indian = str.length > 3 ? `${str.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${str.slice(-3)}` : str;
      const intl = str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const U = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'], TY = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
      const two = (k) => (k < 20 ? U[k] : TY[Math.floor(k / 10)] + (k % 10 ? `-${U[k % 10]}` : ''));
      const three = (k) => [k >= 100 ? `${U[Math.floor(k / 100)]} hundred` : '', two(k % 100)].filter(Boolean).join(' ');
      const say = (parts) => parts.filter(([k]) => k).map(([k, w]) => `${w === 'ones' ? three(k) : `${three(k)} ${w}`}`).join(' ') || 'zero';
      const nameIn = say([[v.crores, 'crore'], [v.lakhs, 'lakh'], [v.thousands, 'thousand'], [v.ones, 'ones']]);
      const nameInt = say([[Math.floor(n / 1e9), 'billion'], [Math.floor(n / 1e6) % 1000, 'million'], [Math.floor(n / 1e3) % 1000, 'thousand'], [n % 1000, 'ones']]);
      const kids = [T(300, 42, indian, { z: 30 }), T(300, 70, `International: ${intl}`, { z: 16, w: 600, f: '#6b5a8a' })];
      const cols = [['Crore', 'crore'], ['Ten lakh', 'lakh'], ['Lakh', 'lakh'], ['Ten thousand', 'thousand'], ['Thousand', 'thousand'], ['Hundred', 'one'], ['Ten', 'one'], ['One', 'one']];
      const fill = { crore: '#e8dbff', lakh: '#d6ecff', thousand: '#fff0c8', one: '#d9f5e8' }, digits = str.padStart(8, '0'), cw = 66, x0 = 300 - (cols.length * cw) / 2;
      cols.forEach(([lab, g], i) => { const x = x0 + i * cw, lead = digits.slice(0, i + 1).replace(/0/g, '') === '' && i < 7; const words = lab.split(' '); kids.push(R(x, 100, cw - 6, 74, fill[g], { r: 8, w: 2 }), ...words.map((w, k) => T(x + (cw - 6) / 2, 116 + k * 13 - (words.length - 1) * 3, w, { z: 11, w: 600, f: '#6b5a8a' })), T(x + (cw - 6) / 2, 162, lead ? '' : digits[i], { z: 26, f: lead ? '#bbb' : INK })); });
      kids.push(T(300, 214, nameIn, { z: nameIn.length > 60 ? 13 : 15 }), T(300, 240, `(international: ${nameInt})`, { z: nameInt.length > 60 ? 11 : 13, w: 600, f: '#6b5a8a' }));
      return { kids, say: `${indian} in the Indian system (${nameIn}) is ${intl} in the international system (${nameInt}). Indian commas group in twos after the first three digits; international commas group in threes.` };
    },
  },
  percent: {
    subject: 'maths', about: 'A hundred-square grid with p squares shaded, the same amount as a fraction and a decimal, and p percent of an amount worked out on a bar. For percentages, per cent, converting fractions, decimals and percentages, percentage of a quantity, discount, profit and loss.',
    sliders: [['p', 'Percent', 0, 100, 1, 25], ['whole', 'The whole amount', 20, 500, 10, 200]],
    draw(v) {
      const { p, whole } = v, g = (a, b) => (b ? g(b, a % b) : a), k = g(p, 100) || 1, cell = 22, gx = 24, gy = 24, kids = [];
      for (let i = 0; i < 100; i++) kids.push(R(gx + (i % 10) * cell, gy + Math.floor(i / 10) * cell, cell, cell, i < p ? C.b : '#fff', { w: 1 }));
      kids.push(R(gx, gy, 10 * cell, 10 * cell, 'none', { w: 3 }));
      const part = (p * whole) / 100, frac = p === 0 ? '0' : p === 100 ? '1' : `${p / k}/${100 / k}`;
      kids.push(T(275, 50, `${p}% = ${p}/100`, { a: 'start', z: 24 }), T(275, 84, frac === `${p}/100` ? `= ${num(p / 100, 2)}` : `= ${frac} = ${num(p / 100, 2)}`, { a: 'start', z: 20, w: 600 }));
      kids.push(R(275, 130, 300, 34, '#fff', { w: 2.5, r: 6 }), R(275, 130, (300 * p) / 100, 34, C.o, { w: 0, r: 6 }), R(275, 130, 300, 34, 'none', { w: 2.5, r: 6 }));
      kids.push(T(275, 190, `${p}% of ${whole} = ${p}/100 × ${whole}`, { a: 'start', z: 16, w: 600 }), T(275, 222, `= ${num(part, 2)}`, { a: 'start', z: 26, f: '#058a68' }));
      return { kids, say: `${p}% means ${p} out of every 100, which is ${frac} or ${num(p / 100, 2)}. ${p}% of ${whole} is ${p} ÷ 100 × ${whole} = ${num(part, 2)}.` };
    },
  },
  solarsystem: {
    subject: 'science', about: 'The eight planets going round the Sun at their real speeds as time passes (distances not to scale). Mercury races round in 88 days, Earth in a year, Saturn in about 29 years. For the solar system, planets, orbits, revolution, years on other planets.',
    sliders: [['days', 'Days that pass', 0, 12000, 10, 0]],
    draw(v) {
      const cx = 300, cy = 150, P = [['Mercury', 88, 34, 4, '#b5a99a'], ['Venus', 225, 52, 6, '#e8c07d'], ['Earth', 365, 72, 6.5, '#3a86ff'], ['Mars', 687, 92, 5, '#e2583e'], ['Jupiter', 4333, 150, 13, '#d9a066'], ['Saturn', 10759, 196, 11, '#e6cf8f'], ['Uranus', 30687, 236, 8, '#7fd1d8'], ['Neptune', 60190, 272, 8, '#4a63d9']];
      const kids = [R(0, 0, W, H, '#0e1233', { w: 0 })];
      for (const [, , r] of P) kids.push(s('ellipse', { cx, cy, rx: r, ry: r * 0.44, fill: 'none', stroke: '#3c4479', 'stroke-width': 1.5 }));
      kids.push(CIRC(cx, cy, 16, '#ffcc33', { s: '#ffb000', w: 3 }));
      const start = [20, 140, 250, 330, 100, 210, 300, 60];   // spread out at day 0 so the names never pile up
      for (const [k, [name, per, r, size, col]] of P.entries()) {
        const a = (2 * Math.PI * v.days) / per + (start[k] * Math.PI) / 180, x = cx + r * Math.cos(a), y = cy + r * 0.44 * Math.sin(a);
        kids.push(CIRC(x, y, size, col, { s: '#0e1233', w: 1.5 }));
        if (r >= 72) kids.push(T(x, y - size - 5, name, { z: 11, w: 600, f: '#dfe3ff' }));
      }
      kids.push(T(12, 22, `${v.days} days = ${num(v.days / 365, 1)} Earth year${num(v.days / 365, 1) === '1' ? '' : 's'}`, { a: 'start', z: 15, f: '#ffffff' }), T(588, 290, 'distances not to scale', { a: 'end', z: 11, w: 600, f: '#9aa3d6' }));
      const laps = (per) => { const n = num(v.days / per, 1); return n === '1' ? 'once' : n === '0' ? '0 times' : `${n} times`; };
      return { kids, say: `${v.days} days have passed. Earth has gone round the Sun ${laps(365)}, Mercury ${laps(88)}, Mars ${laps(687)} and Jupiter ${laps(4333)}. The further a planet is from the Sun, the longer its year.` };
    },
  },
  photosynthesis: {
    subject: 'science', about: 'A leaf making food from light, carbon dioxide and water. Each input is a slider; the leaf works only as fast as its scarcest input allows (the limiting factor), shown by the oxygen bubbles it gives off and the sugar it makes. No light, no food. For photosynthesis, leaves as food factories, chlorophyll, stomata, oxygen and carbon dioxide.',
    sliders: [['light', 'Sunlight', 0, 10, 1, 3], ['co2', 'Carbon dioxide', 0, 10, 1, 6], ['water', 'Water', 0, 10, 1, 8]],
    draw(v) {
      const rate = Math.min(v.light, v.co2, v.water), names = { light: 'sunlight', co2: 'carbon dioxide', water: 'water' };
      const limit = Object.keys(names).filter((k) => v[k] === rate);
      const kids = [CIRC(70, 60, 30, v.light ? '#ffcc33' : '#d9d9d9', { s: v.light ? '#ffb000' : '#aaa', w: 3 })];
      for (let i = 0; i < v.light; i++) { const a = rad(18 + (i - (v.light - 1) / 2) * 8); kids.push(L(70 + 38 * Math.cos(a), 60 + 38 * Math.sin(a), 70 + 115 * Math.cos(a), 60 + 115 * Math.sin(a), '#ffcc33', 3)); }   // rays fan out towards the leaf
      kids.push(s('path', { d: 'M 300 250 C 200 230 190 120 300 60 C 410 120 400 230 300 250 Z', fill: rate ? '#3fb36b' : '#8fbf9f', stroke: INK, 'stroke-width': 4 }), L(300, 250, 300, 70, '#246b40', 3), L(300, 290, 300, 250, '#7a5230', 6));
      for (let i = 1; i <= 4; i++) kids.push(L(300, 250 - i * 40, 300 - 45 + i * 4, 250 - i * 40 - 30, '#246b40', 2), L(300, 250 - i * 40, 300 + 45 - i * 4, 250 - i * 40 - 30, '#246b40', 2));
      for (let i = 0; i < v.co2; i++) kids.push(T(150 + (i % 2) * 22, 130 + i * 14, 'CO₂', { z: 11, w: 600, f: '#6b5a8a' }));
      for (let i = 0; i < v.water; i++) kids.push(CIRC(282 - (i % 2) * 10, 285 - i * 3, 4, '#3a86ff', { w: 0 }));
      if (v.water) kids.push(T(262, 292, 'water from the roots', { a: 'end', z: 11, w: 600, f: '#1f63d9' }));
      for (let i = 0; i < rate; i++) kids.push(CIRC(400 + (i % 3) * 18, 210 - i * 18, 6 + (i % 2), '#e9f7ff', { s: '#7fbfff', w: 2 }));
      kids.push(T(400, 30, rate ? `O₂ bubbles: ${rate} a minute` : 'No bubbles', { a: 'start', z: 14 }), T(520, 280, rate ? `sugar made: ${rate}` : 'no sugar made', { a: 'end', z: 13, w: 600, f: '#7a5230' }));
      const say = !v.light ? 'With no light, the leaf cannot make food at all, however much carbon dioxide and water it has.' : rate === 10 ? 'Everything is at the top, so the leaf works at full speed: the most sugar and oxygen. Carbon dioxide + water, with light, become sugar + oxygen.' : `The leaf makes food at speed ${rate} out of 10. It is held back by ${limit.map((k) => names[k]).join(' and ')}, ${limit.length > 1 ? 'the inputs' : 'the input'} in shortest supply. Carbon dioxide + water, with light, become sugar + oxygen.`;
      return { kids, say };
    },
  },
  conduction: {
    subject: 'science', about: 'The wax-and-pins experiment: a strip heated by a candle at one end, with four pins stuck on by wax. Heat travels along the strip and the pins drop one by one, fast on copper, slower on steel, and not at all on wood in two minutes. For conduction, conductors and insulators, heat transfer.',
    sliders: [['material', 'Strip: 0 copper, 1 steel, 2 wood', 0, 2, 1, 0], ['t', 'Seconds of heating', 0, 120, 5, 0]],
    draw(v) {
      const mats = [['copper', 0.1, '#d98c5f'], ['steel', 0.04, '#9aa5b1'], ['wood', 0.003, '#b07a45']], [name, speed, col] = mats[v.material];
      const reach = Math.min(4.6, v.t * speed), x0 = 110, len = 440, X = (d) => x0 + (d / 5) * len, kids = [];
      kids.push(R(30, 250, 560, 10, '#e8e0f0', { w: 0 }), R(70, 210, 18, 40, '#fff6dd', { w: 2 }), s('path', { d: 'M 79 210 Q 64 186 79 166 Q 94 186 79 210 Z', fill: v.t ? '#ff9d2e' : '#ccc', stroke: INK, 'stroke-width': 2 }));
      kids.push(R(x0 - 30, 150, len + 30, 18, col, { w: 3, r: 3 }));
      if (reach > 0) kids.push(s('rect', { x: x0 - 30, y: 150, width: 30 + (reach / 5) * len, height: 18, fill: 'url(#heatgrad)', rx: 3 }), s('defs', {}, [s('linearGradient', { id: 'heatgrad' }, [s('stop', { offset: '0%', 'stop-color': '#ff3b2f', 'stop-opacity': 0.95 }), s('stop', { offset: '100%', 'stop-color': '#ff3b2f', 'stop-opacity': 0 })])]));
      let fallen = 0;
      ['I', 'II', 'III', 'IV'].forEach((lab, i) => {
        const d = i + 1, down = reach >= d, x = X(d);
        if (down) fallen++;
        const py = down ? 238 : 182;
        kids.push(L(x, py - 22, x, py + 8, INK, 3), CIRC(x, py - 24, 6, '#5a6b7c', { w: 1.5 }), T(x, 140, lab, { z: 14, w: 600, f: '#6b5a8a' }));
        if (!down) kids.push(R(x - 8, 168, 16, 10, '#fff3a6', { w: 1.5, r: 3 }));
      });
      kids.push(T(300, 40, `${name} strip, ${v.t} seconds`, { z: 20 }), T(300, 72, fallen ? `${fallen} pin${fallen > 1 ? 's' : ''} fallen` : 'no pins fallen yet', { z: 16, w: 600, f: '#058a68' }));
      return { kids, say: `After ${v.t} seconds on the ${name} strip, ${fallen ? `${fallen} pin${fallen > 1 ? 's have' : ' has'} fallen, nearest the candle first` : 'no pin has fallen yet'}. ${v.material === 2 ? 'Wood is an insulator: heat hardly travels through it.' : `${name[0].toUpperCase()}${name.slice(1)} is a metal, a conductor: heat travels along it from the hot end.`}` };
    },
  },
  seabreeze: {
    subject: 'science', about: 'A coast through the day and night. By day the land heats up faster than the sea, warm air rises over the land and cool air flows in from the sea (a sea breeze); at night the land cools faster and the breeze blows from land to sea (a land breeze). For convection, land and sea breezes, wind, heat transfer by air.',
    sliders: [['hour', 'Time of day (hour)', 0, 23, 1, 7]],
    draw(v) {
      const h = v.hour, day = h >= 10 && h <= 17, night = h >= 21 || h <= 5, kids = [R(0, 0, W, H, day || (!night && h > 5 && h < 21) ? '#d9efff' : '#1d2350', { w: 0 })];
      kids.push(s('path', { d: 'M 0 210 L 270 210 Q 300 212 320 230 L 320 300 L 0 300 Z', fill: '#c8a26b', stroke: INK, 'stroke-width': 2 }), R(320, 230, 280, 70, '#3a86ff', { w: 0 }), T(130, 270, day ? 'land: hotter' : night ? 'land: cooler' : 'land', { z: 14, w: 600 }), T(460, 270, day ? 'sea: cooler' : night ? 'sea: warmer' : 'sea', { z: 14, w: 600, f: '#fff' }));
      kids.push(day || (!night && h > 5 && h < 21) ? CIRC(520, 50, 26, '#ffcc33', { s: '#ffb000', w: 3 }) : CIRC(520, 50, 22, '#f2f2f2', { s: '#ccc', w: 2 }));
      const arrow = (x1, y1, x2, y2) => { const a = Math.atan2(y2 - y1, x2 - x1); return [L(x1, y1, x2, y2, night ? '#ffffff' : '#e2583e', 5), s('polygon', { points: `${x2},${y2} ${x2 - 14 * Math.cos(a - 0.45)},${y2 - 14 * Math.sin(a - 0.45)} ${x2 - 14 * Math.cos(a + 0.45)},${y2 - 14 * Math.sin(a + 0.45)}`, fill: night ? '#ffffff' : '#e2583e' })]; };
      if (day) kids.push(...arrow(470, 190, 200, 190), ...arrow(160, 180, 160, 90), ...arrow(200, 70, 470, 70), ...arrow(510, 90, 510, 170));
      else if (night) kids.push(...arrow(150, 190, 430, 190), ...arrow(470, 180, 470, 90), ...arrow(430, 70, 160, 70), ...arrow(120, 90, 120, 170));
      kids.push(T(20, 28, `${String(h).padStart(2, '0')}:00`, { a: 'start', z: 18, f: day || (!night && h > 5 && h < 21) ? INK : '#fff' }));
      const say = day ? 'Daytime: the land heats up faster than the sea. Warm air over the land rises and cooler air from the sea flows in to take its place: a sea breeze.' : night ? 'Night: the land cools down faster than the sea. Warm air over the sea rises and cooler air from the land flows out to sea: a land breeze.' : 'Morning or evening: land and sea are at about the same temperature, so the breeze is weak while it changes direction.';
      return { kids, say };
    },
  },
  radiation: {
    subject: 'science', about: 'Two cans of water in the sunshine: a white one and one whose colour you choose. Over time the darker can warms faster because dark surfaces absorb more of the Sun\'s radiation and light ones reflect it. For radiation, heat from the Sun, absorbing and reflecting heat, light and dark clothes.',
    sliders: [['colour', 'Paint the can: 0 white ... 3 black', 0, 3, 1, 2], ['t', 'Minutes in the sun', 0, 30, 5, 0]],
    draw(v) {
      const shades = [['white', '#f7f7f7', 0.2], ['light grey', '#c8c8c8', 0.45], ['dark grey', '#6d6d6d', 0.7], ['black', '#222222', 0.92]];
      const temp = (k) => Math.min(60, 25 + k * 1.1 * v.t), [name, fillc, absorb] = shades[v.colour], tw = temp(0.2), tc = temp(absorb);
      const kids = [CIRC(300, 34, 24, '#ffcc33', { s: '#ffb000', w: 3 })];
      for (let i = 0; i < 7; i++) kids.push(L(250 + i * 17, 64, 160 + i * 47, 140, '#ffcc33', 2.5));
      const can = (x, col, t, label) => [R(x, 150, 90, 110, col, { r: 8, w: 3 }), s('ellipse', { cx: x + 45, cy: 150, rx: 45, ry: 10, fill: col, stroke: INK, 'stroke-width': 3 }), T(x + 45, 286, label, { z: 13, w: 600 }), T(x + 45, 210, `${num(t, 0)} °C`, { z: 20, f: col === '#222222' || col === '#6d6d6d' ? '#ffffff' : INK })];
      kids.push(...can(140, '#f7f7f7', tw, 'white can'), ...can(370, fillc, tc, `${name} can`));
      kids.push(T(14, 24, v.t ? `after ${v.t} minutes (about)` : 'both start at 25 °C', { a: 'start', z: 14, w: 600, f: '#6b5a8a' }));
      return { kids, say: v.t ? `After ${v.t} minutes in the sun the white can is about ${num(tw, 0)} °C and the ${name} can about ${num(tc, 0)} °C. ${v.colour ? 'Darker surfaces absorb more of the Sun’s heat; white reflects most of it.' : 'Both are white, so they warm the same: white reflects most of the heat.'}` : 'Both cans start at 25 °C. Let time pass in the sunshine.' };
    },
  },
  seepage: {
    subject: 'science', about: 'Water poured through gravel, sand and clay in three funnels. Gravel lets it through fastest because the gaps between its particles are widest; clay lets through the least. For seepage, infiltration, groundwater, soil types, water conservation.',
    sliders: [['t', 'Minutes since pouring', 0, 10, 1, 0]],
    draw(v) {
      const soils = [['gravel', 30, '#9a9a9a', 9], ['sand', 12, '#e6c88a', 4], ['clay', 2, '#a0522d', 1.5]], kids = [];
      soils.forEach(([name, rate, col, grain], i) => {
        const x = 70 + i * 180, got = Math.min(100, rate * v.t), left = 100 - got;
        kids.push(s('path', { d: `M ${x} 40 L ${x + 120} 40 L ${x + 70} 130 L ${x + 50} 130 Z`, fill: col, stroke: INK, 'stroke-width': 3 }));
        for (let k = 0; k < 18; k++) kids.push(CIRC(x + 22 + (k % 6) * 14 + (Math.floor(k / 6) * 5), 52 + Math.floor(k / 6) * 16, grain, '#ffffff', { w: 0, x: { opacity: 0.35 } }));
        if (left > 0) kids.push(R(x + 10, 40 - (left / 100) * 26, 100, (left / 100) * 26, '#7fbfff', { w: 0, x: { opacity: 0.8 } }));
        kids.push(L(x + 60, 130, x + 60, 160, INK, 3), R(x + 25, 160, 70, 100, '#fff', { w: 3, r: 4 }), R(x + 27, 258 - (got / 100) * 96, 66, (got / 100) * 96, '#3a86ff', { w: 0 }));
        kids.push(T(x + 60, 285, `${name}: ${got} ml`, { z: 14, w: 600 }));
      });
      return { kids, say: v.t ? `After ${v.t} minute${v.t > 1 ? 's' : ''}, about ${Math.min(100, 30 * v.t)} ml has seeped through the gravel, ${Math.min(100, 12 * v.t)} ml through the sand and ${Math.min(100, 2 * v.t)} ml through the clay. Bigger gaps between particles let water through faster.` : 'The same 100 ml of water has just been poured onto gravel, sand and clay.' };
    },
  },
  airpath: {
    subject: 'science', about: 'Follow a breath of air through the respiratory system step by step: nostrils, nasal passages (hair and mucus trap dust), windpipe, the two branches into the lungs, the tiny air sacs called alveoli where oxygen goes into the blood and carbon dioxide comes out, and breathing out. The rib cage protects the lungs. For breathing, the respiratory system, lungs, alveoli.',
    sliders: [['step', 'Step along the path', 1, 6, 1, 1]],
    draw(v) {
      const on = (k) => (v.step === k ? C.o : '#e8dff5'), edge = (k) => (v.step === k ? INK : '#9b8db8'), kids = [];
      kids.push(CIRC(170, 50, 34, '#ffe0c7', { w: 3 }), s('path', { d: 'M 160 58 Q 170 74 180 58', fill: on(1), stroke: edge(1), 'stroke-width': 3 }));
      kids.push(s('path', { d: 'M 170 70 L 170 92', stroke: v.step === 2 ? C.o : '#c9b8e8', 'stroke-width': 10, 'stroke-linecap': 'round', fill: 'none' }));
      kids.push(L(170, 92, 170, 150, v.step === 3 ? C.o : '#c9b8e8', 12));
      kids.push(s('ellipse', { cx: 120, cy: 210, rx: 42, ry: 62, fill: v.step >= 4 && v.step <= 5 ? '#ffd2c2' : '#f6c9c9', stroke: INK, 'stroke-width': 3 }), s('ellipse', { cx: 220, cy: 210, rx: 42, ry: 62, fill: v.step >= 4 && v.step <= 5 ? '#ffd2c2' : '#f6c9c9', stroke: INK, 'stroke-width': 3 }));
      // the rib cage over the lungs, which it protects
      for (let r = 0; r < 5; r++) kids.push(s('path', { d: `M 80 ${165 + r * 22} Q 170 ${150 + r * 22} 260 ${165 + r * 22}`, fill: 'none', stroke: '#b9a27a', 'stroke-width': 4, opacity: 0.55 }));
      kids.push(s('path', { d: 'M 170 150 L 130 185 M 170 150 L 210 185 M 130 185 L 115 215 M 130 185 L 140 225 M 210 185 L 225 215 M 210 185 L 200 225', fill: 'none', stroke: v.step === 4 ? C.o : '#a58fcf', 'stroke-width': 5, 'stroke-linecap': 'round' }));
      kids.push(CIRC(470, 150, 92, '#fff', { w: 3, s: v.step === 5 ? C.o : '#c9b8e8' }), T(470, 52, 'zoom: alveoli', { z: 12, w: 600, f: '#6b5a8a' }));
      for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; kids.push(CIRC(470 + 46 * Math.cos(a), 150 + 46 * Math.sin(a), 22, '#ffd2c2', { w: 2.5 })); }
      if (v.step === 5) kids.push(T(470, 262, 'O₂ → blood', { z: 13, w: 700, f: '#c0392b' }), T(470, 280, 'CO₂ ← blood', { z: 13, w: 700, f: '#1f63d9' }));
      if (v.step === 6) kids.push(L(200, 40, 280, 20, C.b, 4), T(286, 20, 'out', { a: 'start', z: 14, f: '#1f63d9' }));
      const say = ['', 'Air comes in through the two nostrils.', 'In the nasal passages, tiny hair and mucus trap dust and dirt from the air.', 'The air travels down the windpipe.', 'The windpipe divides into branches, one into each lung. The rib cage protects the lungs.', 'The branches end in tiny balloon-like sacs called alveoli. Here oxygen passes into the blood and carbon dioxide passes out of it.', 'The air, now carrying more carbon dioxide, is breathed out.'][v.step];
      kids.push(T(300, 290, `Step ${v.step} of 6`, { z: 13, w: 600, f: '#6b5a8a' }));
      return { kids, say };
    },
  },
  separate: {
    subject: 'science', about: 'Separating a mixture. Param kind "winnow": blow wind across threshed wheat falling from a tray, heavy grains drop close and light husk blows away. "sieve": change the size of the holes, small particles fall through and bigger ones stay on top. "settle": let tea stand, the leaves settle at the bottom (sedimentation), then tilt the cup to pour off the liquid (decantation). For separation of substances, winnowing, sieving, sedimentation, decantation.',
    params: { kind: 'winnow' },
    dynamicSliders: (p) => (p.kind === 'sieve' ? [['hole', 'Size of the holes (mm)', 1, 10, 1, 1]] : p.kind === 'settle' ? [['min', 'Minutes left standing', 0, 10, 1, 0], ['tilt', 'Tilt the cup (0 = upright, 1 = pour)', 0, 1, 1, 0]] : [['wind', 'Wind strength', 0, 10, 1, 0]]),
    draw(v, p) {
      const kids = [], rnd = seeded(11);
      if (p.kind === 'sieve') {
        const bits = [['flour', 0.5, '#f4ead2', 3], ['bran', 2, '#c99a5b', 5], ['small stones', 5, '#8a8a8a', 8], ['big stones', 9, '#5d5d5d', 12]], h = v.hole;
        kids.push(L(100, 140, 500, 140, INK, 4, { 'stroke-dasharray': `${Math.max(4, 30 - h * 2.4)} ${h * 2.4}` }), R(120, 230, 360, 50, '#f3f0ff', { w: 2.5, r: 6 }), T(300, 300 - 4, 'what fell through', { z: 12, w: 600, f: '#6b5a8a' }));
        const thru = bits.filter(([, size]) => size < h).map((b) => b[0]), stay = bits.filter(([, size]) => size >= h).map((b) => b[0]);
        bits.forEach(([name, size, col, r], i) => { for (let k = 0; k < 6; k++) { const x = 140 + i * 90 + rnd() * 50, fell = size < h; kids.push(CIRC(x, fell ? 255 + rnd() * 18 : 128 - rnd() * 22, r, col, { w: 1.2 })); } kids.push(T(165 + i * 90, size < h ? 222 : 80, name, { z: 11, w: 600 })); });
        return { kids, say: `With ${h} mm holes, ${thru.length ? thru.join(', ') : 'nothing'} ${thru.length === 1 ? 'falls' : 'fall'} through and ${stay.length ? stay.join(', ') : 'nothing'} ${stay.length === 1 ? 'stays' : 'stay'} on top. A sieve separates particles by size.` };
      }
      if (p.kind === 'settle') {
        const settled = Math.min(1, v.min / 6), cx = 300, ang = v.tilt ? -32 : 0;
        const leaves = []; for (let k = 0; k < 26; k++) { const x = -60 + rnd() * 120, yTop = 40 + rnd() * 110, y = yTop + (150 - yTop) * settled; leaves.push(CIRC(x, y, 3.5, '#5a3b1e', { w: 0 })); }
        kids.push(s('g', { transform: `translate(${cx} 80) rotate(${ang})` }, [R(-80, 20, 160, 150, '#fff', { w: 3, r: 6 }), R(-77, v.tilt ? 80 : 40, 154, v.tilt ? 87 : 127, `rgba(150, 90, 40, ${0.75 - 0.5 * settled})`, { w: 0 }), ...leaves]));
        if (v.tilt) kids.push(s('path', { d: 'M 210 120 Q 160 170 150 280', stroke: settled >= 1 ? '#c98a4a' : '#7a4a22', 'stroke-width': 10, fill: 'none', opacity: 0.8 }), R(100, 250, 100, 40, '#fff', { w: 2.5 }), R(102, 266, 96, 22, settled >= 1 ? '#c98a4a' : '#7a4a22', { w: 0, x: { opacity: 0.8 } }));
        const say = !v.tilt ? (settled >= 1 ? 'The tea leaves have settled at the bottom: this is sedimentation. Now tilt the cup to pour off the tea.' : `After ${v.min} minute${v.min === 1 ? '' : 's'} the leaves are still settling. Heavier bits that do not dissolve sink to the bottom if the tea is left undisturbed.`) : settled >= 1 ? 'Tilting the cup pours off the tea and leaves the settled leaves behind: this is decantation.' : 'Pouring before the leaves settle carries them along too. Let it stand first.';
        return { kids, say };
      }
      const w = v.wind; kids.push(R(70, 30, 120, 16, '#c8a26b', { w: 2.5, r: 6 }), T(130, 24, 'tray', { z: 11, w: 600 }), L(40, 280, 580, 280, INK, 3));
      for (let k = 0; k < Math.round(w / 2); k++) kids.push(s('path', { d: `M 20 ${80 + k * 30} q 30 -10 60 0 t 60 0`, stroke: '#7fbfff', 'stroke-width': 3, fill: 'none' }));
      for (let k = 0; k < 14; k++) { const gx = 120 + w * 3 + rnd() * 30, hx = 120 + w * 34 + rnd() * 40 * (w / 10 + 0.2); kids.push(s('ellipse', { cx: gx, cy: 270 - rnd() * 6, rx: 6, ry: 4, fill: '#d9a441', stroke: INK, 'stroke-width': 1 }), s('ellipse', { cx: hx, cy: 268 - rnd() * 8, rx: 7, ry: 2, fill: '#efe3b5', stroke: '#b79f5a', 'stroke-width': 1 })); }
      // the falling stream: grain drops nearly straight, husk drifts with the wind
      for (let k = 0; k < 9; k++) { const f = (k + 1) / 10, y = 50 + f * 210; kids.push(CIRC(130 + w * 3 * f, y, 3, '#d9a441', { w: 0.8 }), CIRC(130 + w * 34 * f * f + (w ? 6 : 10), y, 2.5, '#efe3b5', { s: '#b79f5a', w: 0.8 })); }
      kids.push(T(140, 250, 'grain', { z: 12, w: 600 }), T(Math.min(560, 150 + w * 36) + (w < 3 ? 46 : 0), w < 3 ? 232 : 240, 'husk', { z: 12, w: 600 }));
      return { kids, say: w ? `With wind strength ${w}, the heavy grains fall almost straight down while the light husk is blown ${w > 6 ? 'far' : 'a little'} away. Winnowing separates the heavier and lighter parts of a mixture.` : 'With no wind, grain and husk fall into the same heap. Blow some air!' };
    },
  },
  seethrough: {
    subject: 'science', about: 'Hold different sheets between your eye and a picture. Through transparent materials (glass, water, cellophane) the picture is clear; through translucent ones (butter paper, frosted glass) it is seen but not clearly; through opaque ones (wood, cardboard, metal) it cannot be seen at all. For transparent, translucent and opaque materials, light, properties of materials.',
    sliders: [['m', 'Pick a sheet', 0, 7, 1, 0]],
    draw(v) {
      const mats = [['glass', 0, '#cfeaf7'], ['water', 0, '#9fd3f2'], ['cellophane paper', 0, '#f7c9e4'], ['butter paper', 1, '#f4ecd6'], ['frosted glass', 1, '#e3eef3'], ['wood', 2, '#b07a45'], ['cardboard', 2, '#c9a46a'], ['metal', 2, '#9aa5b1']];
      const [name, kind, col] = mats[v.m], word = ['transparent', 'translucent', 'opaque'][kind];
      const star = (op, blur) => s('g', { opacity: op, filter: blur ? 'url(#seeblur)' : null }, [s('polygon', { points: '450,90 466,135 514,135 476,163 490,208 450,181 410,208 424,163 386,135 434,135', fill: '#ffcc33', stroke: INK, 'stroke-width': 3 })]);
      const kids = [s('defs', {}, [s('filter', { id: 'seeblur' }, [s('feGaussianBlur', { stdDeviation: 7 })])]), star(1, kind === 1)];
      // the eye on the left, the sheet in the middle, the picture behind it
      kids.push(s('ellipse', { cx: 80, cy: 150, rx: 34, ry: 20, fill: '#fff', stroke: INK, 'stroke-width': 3 }), CIRC(92, 150, 10, '#3a2560', { w: 0 }), L(116, 150, 240, 150, '#9b8db8', 2, { 'stroke-dasharray': '6 6' }));
      kids.push(R(250, 40, 40, 220, col, { w: 3, r: 4, x: { opacity: kind === 2 ? 1 : kind === 1 ? 0.92 : 0.55 } }));
      if (kind === 2) kids.push(R(330, 60, 240, 180, '#ffffff', { w: 0 }), T(450, 156, '?', { z: 54, f: '#c9b8e8' }));
      kids.push(T(270, 284, name, { z: 15, w: 600 }), T(450, 284, word, { z: 16, w: 700, f: ['#058a68', '#c27c0e', '#c0392b'][kind] }));
      return { kids, say: [`Through ${name} the star is seen clearly: ${name} is transparent.`, `Through ${name} the star can be seen, but not clearly: ${name} is translucent.`, `Through ${name} the star cannot be seen at all: ${name} is opaque.`][kind] };
    },
  },
  solids: {
    subject: 'maths', about: 'Turn a 3D shape (cube, cuboid, triangular prism, square pyramid, triangular pyramid) and count its faces, corners and edges. The counts come from the shape itself, and F + V - E is always 2. For 3D shapes, faces, edges, vertices or corners, prisms and pyramids, nets.',
    sliders: [['shape', 'Shape: cube, cuboid, triangular prism, square pyramid, triangular pyramid', 0, 4, 1, 0], ['turn', 'Turn it (degrees)', 0, 345, 15, 30]],
    draw(v) {
      const tri = [[0, -1], [0.87, 0.5], [-0.87, 0.5]], box = (a, b, c) => [[-a, -b, -c], [a, -b, -c], [a, b, -c], [-a, b, -c], [-a, -b, c], [a, -b, c], [a, b, c], [-a, b, c]];
      const boxFaces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
      const shapes = [
        ['cube', box(1, 1, 1), boxFaces],
        ['cuboid', box(1.5, 0.8, 0.8), boxFaces],
        ['triangular prism', [...tri.map(([u, w]) => [-1.3, w * 0.9, u * 0.9]), ...tri.map(([u, w]) => [1.3, w * 0.9, u * 0.9])], [[0, 1, 2], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]]],
        ['square pyramid', [[-1, 0.8, -1], [1, 0.8, -1], [1, 0.8, 1], [-1, 0.8, 1], [0, -1.1, 0]], [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]]],
        ['triangular pyramid', [...tri.map(([x, z]) => [x * 1.2, 0.7, z * 1.2]), [0, -1.1, 0]], [[0, 1, 2], [0, 1, 3], [1, 2, 3], [2, 0, 3]]],
      ];
      const [name, pts, faces] = shapes[v.shape], edges = new Set();
      for (const f of faces) f.forEach((a, i) => { const b = f[(i + 1) % f.length]; edges.add(a < b ? `${a}-${b}` : `${b}-${a}`); });
      const F = faces.length, V = pts.length, E = edges.size, a = (v.turn * Math.PI) / 180, tilt = 0.6;
      const proj = ([x, y, z]) => { const x1 = x * Math.cos(a) + z * Math.sin(a), z1 = -x * Math.sin(a) + z * Math.cos(a); const y1 = y * Math.cos(tilt) - z1 * Math.sin(tilt); return [200 + x1 * 80, 150 + y1 * 80]; };
      const P = pts.map(proj), kids = [];
      for (const f of faces) kids.push(s('polygon', { points: f.map((i) => P[i].join(',')).join(' '), fill: C.p, 'fill-opacity': 0.12, stroke: 'none' }));
      for (const e of edges) { const [i, j] = e.split('-').map(Number); kids.push(L(P[i][0], P[i][1], P[j][0], P[j][1], INK, 3)); }
      for (const p of P) kids.push(CIRC(p[0], p[1], 5.5, C.o, { w: 1.5 }));
      kids.push(T(470, 40, name, { z: 18 }), T(470, 92, `faces: ${F}`, { z: 17, w: 600, f: '#6b45c8' }), T(470, 128, `corners: ${V}`, { z: 17, w: 600, f: '#c2510e' }), T(470, 164, `edges: ${E}`, { z: 17, w: 600 }));
      kids.push(T(470, 222, `${F} + ${V} − ${E} = ${F + V - E}`, { z: 17, w: 700, f: '#058a68' }));
      return { kids, say: `A ${name} has ${F} faces, ${V} corners and ${E} edges. Faces + corners − edges = ${F} + ${V} − ${E} = ${F + V - E}.` };
    },
  },
  compass: {
    subject: 'maths', about: 'Draw a circle with a compass: open the compass to a radius and every point on the circle is that far from the centre. Turn a fold line: every diameter passes through the centre and is twice the radius. For circles, centre, radius, diameter, using a compass (no pi).',
    sliders: [['r', 'Open the compass (radius in cm)', 1, 6, 1, 3], ['fold', 'Turn the fold line (degrees)', 0, 165, 15, 0]],
    draw(v) {
      const cx = 220, cy = 150, k = 20, rad = v.r * k, a = (v.fold * Math.PI) / 180, kids = [];
      for (let i = 0; i < 24; i++) { const t = (i / 24) * Math.PI * 2; kids.push(CIRC(cx + rad * Math.cos(t), cy + rad * Math.sin(t), 2.5, '#9b8db8', { w: 0 })); }
      kids.push(CIRC(cx, cy, rad, 'none', { s: C.p, w: 3 }));
      const dx = rad * Math.cos(a), dy = -rad * Math.sin(a);
      kids.push(L(cx - dx, cy - dy, cx + dx, cy + dy, C.o, 4, { 'stroke-dasharray': '10 6' }), L(cx, cy, cx + rad, cy, '#058a68', 4));
      // the compass: needle on the centre, pencil on the circle
      kids.push(L(cx, cy, cx + rad / 2, cy - 70, INK, 4), L(cx + rad / 2, cy - 70, cx + rad, cy, '#e2583e', 4), CIRC(cx + rad / 2, cy - 72, 6, INK, { w: 0 }));
      kids.push(CIRC(cx, cy, 5, INK, { w: 0 }), T(cx - 14, cy + 20, 'centre', { z: 12, w: 600 }));
      kids.push(T(470, 70, `radius: ${v.r} cm`, { z: 18, w: 700, f: '#058a68' }), T(470, 110, `diameter: ${2 * v.r} cm`, { z: 18, w: 700, f: '#c2510e' }), T(470, 150, `${v.r} + ${v.r} = ${2 * v.r}`, { z: 16, w: 600 }));
      return { kids, say: `With the compass open to ${v.r} cm, every point on the circle is ${v.r} cm from the centre: that is the radius. The fold line is a diameter. Wherever it is turned it passes through the centre and is ${2 * v.r} cm long, twice the radius.` };
    },
  },
  gridwalk: {
    subject: 'maths', about: 'Walk on a 4 by 4 grid from the bottom-left square. Move right and up (no diagonal moves) and count the steps to reach the flower, the mango or the orange. Rows and columns are counted from the bottom-left corner. For grids, positions, rows and columns, directions, maps and paths.',
    sliders: [['right', 'Steps to the right', 0, 3, 1, 0], ['up', 'Steps up', 0, 3, 1, 0]],
    draw(v) {
      const x0 = 90, y0 = 270, sz = 60, cell = (c, r) => [x0 + c * sz + sz / 2, y0 - r * sz - sz / 2], kids = [];
      const things = [['flower', 2, 3, '\u{1F33C}'], ['mango', 3, 1, '\u{1F96D}'], ['orange', 1, 2, '\u{1F34A}']];
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) kids.push(R(x0 + c * sz, y0 - (r + 1) * sz, sz, sz, (c + r) % 2 ? '#f3f0ff' : '#ffffff', { w: 2 }));
      for (let i = 0; i < 4; i++) kids.push(T(x0 + i * sz + sz / 2, y0 + 20, `col ${i + 1}`, { z: 11, w: 600, f: '#6b5a8a' }), T(x0 - 26, y0 - i * sz - sz / 2 + 4, `row ${i + 1}`, { z: 11, w: 600, f: '#6b5a8a' }));
      for (const [, c, r, e] of things) { const [x, y] = cell(c, r); kids.push(T(x, y + 10, e, { z: 30 })); }
      let path = `M ${cell(0, 0).join(' ')}`; for (let i = 1; i <= v.right; i++) path += ` L ${cell(i, 0).join(' ')}`; for (let j = 1; j <= v.up; j++) path += ` L ${cell(v.right, j).join(' ')}`;
      kids.push(s('path', { d: path, fill: 'none', stroke: C.o, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      const [mx, my] = cell(v.right, v.up); kids.push(CIRC(mx, my, 25, 'none', { s: C.p, w: 5 }));
      const here = things.find(([, c, r]) => c === v.right && r === v.up), steps = v.right + v.up;
      kids.push(T(470, 80, `row ${v.up + 1}, column ${v.right + 1}`, { z: 17, w: 700 }), T(470, 116, `${steps} step${steps === 1 ? '' : 's'}`, { z: 17, w: 700, f: '#c2510e' }));
      if (here) kids.push(T(470, 156, `found the ${here[0]}!`, { z: 17, w: 700, f: '#058a68' }));
      return { kids, say: `${steps ? `${v.right} step${v.right === 1 ? '' : 's'} right and ${v.up} step${v.up === 1 ? '' : 's'} up` : 'Start'}: you are in row ${v.up + 1}, column ${v.right + 1}${here ? `, on the ${here[0]}` : ''}. ${steps} step${steps === 1 ? '' : 's'} in all, with no diagonal moves.` };
    },
  },
  jumps: {
    subject: 'maths', about: 'Two animals jump along a number line from 0: a frog jumps 3, a squirrel 4, a rabbit 6 and a kangaroo 8. Each lands on the multiples of its jump; where both land are the common multiples. For multiples, common multiples, skip counting, times tables.',
    sliders: [['a', 'First animal: frog, squirrel, rabbit, kangaroo', 0, 3, 1, 0], ['b', 'Second animal: frog, squirrel, rabbit, kangaroo', 0, 3, 1, 1]],
    draw(v) {
      const zoo = [['frog', 3, '#2fa84f'], ['squirrel', 4, '#c2510e'], ['rabbit', 6, '#6b45c8'], ['kangaroo', 8, '#1f63d9']], top = 48;
      const [an, ja, ca] = zoo[v.a], [bn, jb, cb] = zoo[v.b], x = (n) => 30 + (n / top) * 540, y = 160, kids = [L(x(0), y, x(top), y, INK, 3)];
      for (let n = 0; n <= top; n++) kids.push(L(x(n), y - (n % 6 ? 5 : 9), x(n), y + (n % 6 ? 5 : 9), INK, n % 6 ? 1.2 : 2), ...(n % 6 ? [] : [T(x(n), y + (v.a === v.b ? 28 : 34 + jb * 7), String(n), { z: 12, w: 600 })]));
      const arcs = (j, col, up) => { for (let n = 0; n + j <= top; n += j) kids.push(s('path', { d: `M ${x(n)} ${y} Q ${(x(n) + x(n + j)) / 2} ${y + (up ? -1 : 1) * (14 + j * 7)} ${x(n + j)} ${y}`, fill: 'none', stroke: col, 'stroke-width': 2.5 })); };
      arcs(ja, ca, true); if (v.b !== v.a) arcs(jb, cb, false);
      const both = []; for (let n = 1; n <= top; n++) if (n % ja === 0 && n % jb === 0) both.push(n);
      for (const n of both) kids.push(CIRC(x(n), y, 9, '#ffcc33', { w: 2.5 }));
      kids.push(T(20, 30, `${an} jumps ${ja}`, { a: 'start', z: 16, w: 700, f: ca }), T(20, 286, v.a === v.b ? 'pick a different second animal' : `${bn} jumps ${jb}`, { a: 'start', z: 16, w: 700, f: v.a === v.b ? '#6b5a8a' : cb }), T(580, 30, both.length ? `both land on ${both.join(', ')}` : '', { a: 'end', z: 14, w: 700, f: '#a86b00' }));
      return { kids, say: v.a === v.b ? `The ${an} lands on the multiples of ${ja}: ${Array.from({ length: Math.floor(top / ja) }, (_, i) => (i + 1) * ja).join(', ')}.` : `The ${an} lands on multiples of ${ja} and the ${bn} on multiples of ${jb}. Up to ${top}, they both land on ${both.join(', ')}: these are common multiples of ${ja} and ${jb}, and the first is ${both[0]}.` };
    },
  },
  clock: {
    subject: 'maths', about: 'Set an analogue clock and see the same time as AM/PM and on a 24-hour digital clock: 8:00 PM is 20:00, 12:00 AM is 00:00. For telling time, hours and minutes, AM and PM, 24-hour clock, quarter and half past.',
    sliders: [['hour', 'Hour of the day (0 = midnight)', 0, 23, 1, 8], ['minute', 'Minutes', 0, 55, 5, 0]],
    draw(v) {
      const cx = 160, cy = 150, rr = 105, h12 = v.hour % 12 === 0 ? 12 : v.hour % 12, ampm = v.hour < 12 ? 'AM' : 'PM', pad = (n) => String(n).padStart(2, '0'), kids = [];
      const night = v.hour < 6 || v.hour >= 19;
      kids.push(CIRC(cx, cy, rr, '#ffffff', { w: 4 }));
      for (let i = 1; i <= 12; i++) { const t = (i / 12) * Math.PI * 2; kids.push(T(cx + 82 * Math.sin(t), cy - 82 * Math.cos(t) + 6, String(i), { z: 16, w: 700 })); }
      for (let i = 0; i < 60; i++) { const t = (i / 60) * Math.PI * 2, r1 = i % 5 ? 98 : 93; kids.push(L(cx + r1 * Math.sin(t), cy - r1 * Math.cos(t), cx + rr * Math.sin(t), cy - rr * Math.cos(t), INK, i % 5 ? 1 : 2.5)); }
      const ha = ((h12 % 12) + v.minute / 60) / 12 * Math.PI * 2, ma = (v.minute / 60) * Math.PI * 2;
      kids.push(L(cx, cy, cx + 55 * Math.sin(ha), cy - 55 * Math.cos(ha), INK, 7), L(cx, cy, cx + 82 * Math.sin(ma), cy - 82 * Math.cos(ma), C.o, 4), CIRC(cx, cy, 6, INK, { w: 0 }));
      kids.push(T(440, 70, night ? '\u{1F319}' : '☀️', { z: 34 }), T(440, 128, `${h12}:${pad(v.minute)} ${ampm}`, { z: 26, w: 700 }));
      kids.push(R(350, 158, 180, 58, '#1d2350', { w: 3, r: 8 }), T(440, 198, `${pad(v.hour)}:${pad(v.minute)}`, { z: 30, w: 700, f: '#7dffb0' }), T(440, 240, '24-hour digital clock', { z: 12, w: 600, f: '#6b5a8a' }));
      const words = v.minute === 0 ? `${h12} o’clock` : v.minute === 15 ? `quarter past ${h12}` : v.minute === 30 ? `half past ${h12}` : v.minute === 45 ? `quarter to ${h12 % 12 + 1}` : `${v.minute} minutes past ${h12}`;
      return { kids, say: `It is ${words}, ${h12}:${pad(v.minute)} ${ampm}${v.hour === 12 && v.minute === 0 ? ' (noon)' : v.hour === 0 && v.minute === 0 ? ' (midnight)' : ''}. A 24-hour digital clock shows ${pad(v.hour)}:${pad(v.minute)}.` };
    },
  },
  makeone: {
    subject: 'maths', about: 'Make 1 kilogram (or 1 litre) from smaller packets (or bottles) of 500, 250, 100 and 50: a pan balance against a 1 kg packet, or a 1-litre bottle being filled. 1 kg = 1000 g, 1 l = 1000 ml; 250 is a quarter and 100 a tenth. Param kind "g" or "ml". For weight, capacity, grams and kilograms, millilitres and litres, measurement.',
    params: { kind: 'g' },
    sliders: [['h', 'Packs of 500', 0, 2, 1, 0], ['q', 'Packs of 250', 0, 4, 1, 0], ['t', 'Packs of 100', 0, 10, 1, 0], ['f', 'Packs of 50', 0, 20, 1, 0]],
    draw(v, p) {
      const ml = p.kind === 'ml', unit = ml ? 'ml' : 'g', big = ml ? '1 litre' : '1 kg', total = 500 * v.h + 250 * v.q + 100 * v.t + 50 * v.f, kids = [];
      const packs = [[500, v.h, '#e2583e'], [250, v.q, '#f2a33a'], [100, v.t, '#2fa84f'], [50, v.f, '#1f63d9']];
      if (ml) {
        // the 1-litre bottle with a 1000 ml mark, filled by the small bottles
        const bx = 90, by = 50, bw = 120, bh = 220, lvl = Math.min(total, 1000) / 1000;
        kids.push(R(bx, by, bw, bh, '#ffffff', { w: 3, r: 10 }), R(bx + 3, by + bh - 3 - lvl * (bh - 6), bw - 6, lvl * (bh - 6), '#7fbfff', { w: 0 }), L(bx - 10, by + 3, bx + bw + 10, by + 3, '#c0392b', 2, { 'stroke-dasharray': '6 4' }), T(bx + bw / 2, by - 10, '1 litre = 1000 ml', { z: 13, w: 700, f: '#c0392b' }));
        if (total > 1000) kids.push(T(bx + bw / 2, by + 40, 'overflowing!', { z: 15, w: 700, f: '#c0392b' }));
      } else {
        const tilt = Math.max(-1, Math.min(1, (total - 1000) / 1000)) * 14, a = (tilt * Math.PI) / 180, cx = 190, cy = 100, arm = 125;
        const lx = cx - arm * Math.cos(a), ly = cy - arm * Math.sin(a), rx = cx + arm * Math.cos(a), ry = cy + arm * Math.sin(a);
        kids.push(s('polygon', { points: `${cx - 26},270 ${cx + 26},270 ${cx},${cy}`, fill: '#d8cff0', stroke: INK, 'stroke-width': 3 }), L(lx, ly, rx, ry, INK, 6));
        for (const [px, py] of [[lx, ly], [rx, ry]]) kids.push(L(px, py, px - 40, py + 60, INK, 1.5), L(px, py, px + 40, py + 60, INK, 1.5), s('path', { d: `M ${px - 55} ${py + 60} Q ${px} ${py + 85} ${px + 55} ${py + 60} Z`, fill: '#f3f0ff', stroke: INK, 'stroke-width': 3 }));
        kids.push(R(lx - 32, ly + 22, 64, 38, '#8a6bd1', { w: 2.5, r: 5 }), T(lx, ly + 47, '1 kg', { z: 15, w: 700, f: '#fff' }));
        let k = 0; for (const [, n, col] of packs) for (let i = 0; i < n; i++, k++) kids.push(R(rx - 48 + (k % 8) * 12, ry + 50 - Math.floor(k / 8) * 10, 11, 9, col, { w: 1 }));
      }
      // the count of each pack, and the total
      packs.forEach(([size, n, col], i) => kids.push(R(400, 40 + i * 34, 22, 22, col, { w: 2, r: 4 }), T(430, 57 + i * 34, `${n} × ${size} ${unit}`, { a: 'start', z: 15, w: 600 })));
      kids.push(T(470, 200, `${total} ${unit}`, { z: 22, w: 700, f: total === 1000 ? '#058a68' : total > 1000 ? '#c0392b' : INK }), T(470, 230, total === 1000 ? `exactly ${big}!` : total > 1000 ? `${total - 1000} ${unit} too much` : `${1000 - total} ${unit} more to go`, { z: 14, w: 700, f: '#6b5a8a' }));
      const used = packs.filter(([, n]) => n).map(([size, n]) => `${n} × ${size} ${unit}`).join(' + ');
      return { kids, say: total === 1000 ? `${used} = 1000 ${unit} = ${big}. ${ml ? 'The bottle is full.' : 'The pans balance.'}` : total ? `${used} = ${total} ${unit}. ${total > 1000 ? `That is more than ${big}.` : `${1000 - total} ${unit} more makes ${big}.`}` : `Add packs to make ${big}, which is 1000 ${unit}.` };
    },
  },
  calendar: {
    subject: 'maths', about: 'A real calendar: pick a year and a month and see its days laid out by weekday. February has 29 days in a leap year (every four years: 2016, 2020, 2024, 2028) and 28 otherwise; a leap year has 366 days. For calendars, dates, days of the week, months, leap years.',
    sliders: [['year', 'Year', 2016, 2032, 1, 2025], ['month', 'Month', 1, 12, 1, 2]],
    draw(v) {
      const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], wk = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const leap = (v.year % 4 === 0 && v.year % 100 !== 0) || v.year % 400 === 0, first = new Date(Date.UTC(v.year, v.month - 1, 1)).getUTCDay(), days = new Date(Date.UTC(v.year, v.month, 0)).getUTCDate();
      const x0 = 40, y0 = 70, cw = 46, ch = 34, kids = [T(x0 + 3.5 * cw, 32, `${names[v.month - 1]} ${v.year}`, { z: 20 })];
      wk.forEach((d, i) => kids.push(T(x0 + i * cw + cw / 2, y0 - 8, d, { z: 12, w: 700, f: i === 0 ? '#c0392b' : '#6b5a8a' })));
      for (let d = 1; d <= days; d++) {
        const k = first + d - 1, c = k % 7, r = Math.floor(k / 7), extra = v.month === 2 && d === 29;
        kids.push(R(x0 + c * cw + 2, y0 + r * ch + 2, cw - 4, ch - 4, extra ? '#ffcc33' : '#f3f0ff', { w: extra ? 2.5 : 1, r: 5 }), T(x0 + c * cw + cw / 2, y0 + r * ch + ch / 2 + 5, String(d), { z: 14, w: 600, f: c === 0 ? '#c0392b' : INK }));
      }
      kids.push(T(470, 90, `${days} days`, { z: 22, w: 700, f: '#c2510e' }), T(470, 130, leap ? `${v.year} is a leap year` : `${v.year} is not a leap year`, { z: 15, w: 700, f: leap ? '#058a68' : INK }), T(470, 158, `${leap ? 366 : 365} days in the year`, { z: 14, w: 600, f: '#6b5a8a' }), T(470, 200, `1 ${names[v.month - 1]} is a ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][first]}`, { z: 13, w: 600 }));
      return { kids, say: `${names[v.month - 1]} ${v.year} has ${days} days and starts on a ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][first]}. ${v.month === 2 ? (leap ? `${v.year} is a leap year, so February has an extra day, the 29th.` : `${v.year} is not a leap year, so February has 28 days.`) : `${v.year} has ${leap ? 366 : 365} days${leap ? ': it is a leap year' : ''}.`}` };
    },
  },
  money: {
    subject: 'maths', about: 'Make an amount of money from Rs 100, Rs 50 and Rs 10 notes and Rs 5 and Rs 1 coins: Rs 36, Rs 125, Rs 163 or Rs 183. There is more than one way to make the same amount. For money, rupees, counting money, notes and coins, shopping and change.',
    sliders: [['amt', 'Amount to make: 36, 125, 163, 183', 0, 3, 1, 0], ['h', 'Rs 100 notes', 0, 2, 1, 0], ['f', 'Rs 50 notes', 0, 3, 1, 0], ['t', 'Rs 10 notes', 0, 9, 1, 0], ['v', 'Rs 5 coins', 0, 9, 1, 0], ['o', 'Rs 1 coins', 0, 9, 1, 0]],
    draw(v) {
      const want = [36, 125, 163, 183][v.amt], pieces = [[100, v.h, '#7fb3d5', true], [50, v.f, '#5fc9b8', true], [10, v.t, '#c9a46a', true], [5, v.v, '#e0c050', false], [1, v.o, '#c8c8c8', false]];
      const got = pieces.reduce((a, [val, n]) => a + val * n, 0), kids = [T(300, 32, `Make ₹${want}`, { z: 22 })];
      // lay the notes and coins out in rows, smaller when there are many so they stay above the total
      const many = pieces.reduce((a, [, n]) => a + n, 0), sc = many > 24 ? 0.6 : many > 14 ? 0.78 : 1, shown = [];
      let x = 30, y = 60;
      for (const [val, n, col, note] of pieces) for (let i = 0; i < n; i++) {
        if (x > 30 + 490 / sc) { x = 30; y += 54; }
        if (note) shown.push(R(x, y, 74, 40, col, { w: 2, r: 4 }), T(x + 37, y + 26, `₹${val}`, { z: 14, w: 700 }));
        else shown.push(CIRC(x + 20, y + 20, 19, col, { w: 2 }), T(x + 20, y + 26, `₹${val}`, { z: 12, w: 700 }));
        x += note ? 82 : 46;
      }
      kids.push(s('g', { transform: `translate(30 60) scale(${sc}) translate(-30 -60)` }, shown));
      const left = want - got, count = pieces.reduce((a, [, n]) => a + n, 0);
      kids.push(T(300, 262, `₹${got}`, { z: 24, w: 700, f: left === 0 ? '#058a68' : left < 0 ? '#c0392b' : INK }), T(300, 290, left === 0 ? `exactly ₹${want} with ${count} note${count === 1 ? '' : 's'} and coin${count === 1 ? '' : 's'}` : left > 0 ? `₹${left} more to go` : `₹${-left} too much`, { z: 14, w: 700, f: '#6b5a8a' }));
      const used = pieces.filter(([, n]) => n).map(([val, n]) => `${n} × ₹${val}`).join(' + ');
      return { kids, say: got ? `${used} = ₹${got}. ${left === 0 ? `That makes ₹${want}.` : left > 0 ? `₹${left} more makes ₹${want}.` : `That is ₹${-left} more than ₹${want}.`}` : `Add notes and coins to make ₹${want}.` };
    },
  },
  blocks: {
    subject: 'maths', about: 'Dienes blocks: a cube for 1000, a flat for 100, a rod for 10 and a unit for 1. Build a number from thousands, hundreds, tens and ones, and see 10 ones swap for 1 ten, 10 tens for 1 hundred, 10 hundreds for 1 thousand. For place value, tens and ones, hundreds, thousands, grouping, regrouping.',
    sliders: [['th', 'Thousands', 0, 3, 1, 0], ['hu', 'Hundreds', 0, 9, 1, 2], ['te', 'Tens', 0, 9, 1, 3], ['on', 'Ones', 0, 19, 1, 4]],
    draw(v) {
      const total = 1000 * v.th + 100 * v.hu + 10 * v.te + v.on, kids = [];
      // each kind of block in its own column: a thousand is a big square, a hundred a flat, a ten a rod, a one a dot
      for (let i = 0; i < v.th; i++) kids.push(R(24 + i * 30, 30, 26, 26, '#9fd3f2', { w: 2.5, r: 3 }), T(37 + i * 30, 48, '1000', { z: 9, w: 700 }));
      for (let i = 0; i < v.hu; i++) { const c = i % 5, r = Math.floor(i / 5); kids.push(R(24 + c * 34, 70 + r * 34, 30, 30, '#7fb3d5', { w: 2, r: 3 })); for (let g = 1; g < 3; g++) kids.push(L(24 + c * 34 + g * 10, 70 + r * 34, 24 + c * 34 + g * 10, 100 + r * 34, '#4f84ad', 1), L(24 + c * 34, 70 + r * 34 + g * 10, 54 + c * 34, 70 + r * 34 + g * 10, '#4f84ad', 1)); }
      for (let i = 0; i < v.te; i++) { const c = i % 5, r = Math.floor(i / 5); kids.push(R(200 + c * 14, 70 + r * 66, 11, 60, '#5fc9b8', { w: 2, r: 2 })); for (let g = 1; g < 6; g++) kids.push(L(200 + c * 14, 70 + r * 66 + g * 10, 211 + c * 14, 70 + r * 66 + g * 10, '#2f8f82', 1)); }
      for (let i = 0; i < v.on; i++) { const c = i % 5, r = Math.floor(i / 5); kids.push(R(300 + c * 16, 70 + r * 16, 12, 12, '#f2a33a', { w: 2, r: 2 })); }
      kids.push(T(60, 224, 'hundreds', { z: 11, w: 600, f: '#6b5a8a' }), T(228, 224, 'tens', { z: 11, w: 600, f: '#6b5a8a' }), T(335, 224, 'ones', { z: 11, w: 600, f: '#6b5a8a' }));
      kids.push(T(480, 90, String(total), { z: 40, w: 700 }), T(480, 128, `${v.th ? v.th + ' thousand' + (v.th > 1 ? 's' : '') + ', ' : ''}${v.hu} hundred${v.hu === 1 ? '' : 's'}`, { z: 13, w: 600, f: '#4f84ad' }), T(480, 148, `${v.te} ten${v.te === 1 ? '' : 's'}, ${v.on} one${v.on === 1 ? '' : 's'}`, { z: 13, w: 600, f: '#2f8f82' }));
      if (v.on >= 10) kids.push(T(480, 190, `${v.on} ones = 1 ten and ${v.on - 10} one${v.on - 10 === 1 ? '' : 's'}`, { z: 14, w: 700, f: '#c2510e' }));
      const nm = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`, parts = [v.th && nm(v.th, 'thousand'), v.hu && nm(v.hu, 'hundred'), v.te && nm(v.te, 'ten'), v.on && nm(v.on, 'one')].filter(Boolean);
      return { kids, say: total ? `${parts.join(', ')} make ${total}.${v.on >= 10 ? ` ${v.on} ones can be grouped as 1 ten and ${nm(v.on - 10, 'one')}.` : ''}` : 'Add some blocks to make a number.' };
    },
  },
  column: {
    subject: 'maths', about: 'Add or subtract three-digit numbers in columns, one column at a time from the ones: carrying 1 ten or 1 hundred when a column reaches 10 (regrouping), or borrowing when the top digit is too small. Param kind "add" or "sub". For addition, subtraction, regrouping, carrying, column method, taking away.',
    params: { kind: 'add' },
    dynamicSliders: (p) => (p.kind === 'sub' ? [['a', 'Start with', 0, 999, 1, 438], ['b', 'Take away', 0, 999, 1, 215], ['step', 'Columns done', 0, 3, 1, 1]] : [['a', 'First number', 0, 499, 1, 438], ['b', 'Second number', 0, 499, 1, 476], ['step', 'Columns done', 0, 3, 1, 1]]),
    draw(v, p) {
      const sub = p.kind === 'sub', kids = [], cx = [95, 165, 235], nm = ['ones', 'tens', 'hundreds'];
      const A = [v.a % 10, Math.floor(v.a / 10) % 10, Math.floor(v.a / 100)], B = [v.b % 10, Math.floor(v.b / 10) % 10, Math.floor(v.b / 100)];
      if (sub && v.b > v.a) return { kids: [T(300, 150, `${v.b} is more than ${v.a}`, { z: 20, f: '#c0392b' }), T(300, 184, 'you cannot take away more than you have', { z: 14, w: 600, f: '#6b5a8a' })], say: `You cannot take ${v.b} away from ${v.a}: it is more than you have. Make the second number smaller.` };
      // work each column from the ones: carry (add) or borrow (subtract) moves to the next column
      const res = [0, 0, 0], mark = [0, 0, 0];
      let c = 0;
      for (let i = 0; i < 3; i++) {
        if (sub) { let top = A[i] - c; c = 0; if (top < B[i]) { top += 10; c = 1; } res[i] = top - B[i]; mark[i] = c; }
        else { const t = A[i] + B[i] + c; res[i] = t % 10; c = t >= 10 ? 1 : 0; mark[i] = c; }
      }
      const total = sub ? v.a - v.b : v.a + v.b, lead = (i) => i === 2 && !res[2] && !A[2] && !B[2];
      kids.push(T(60, 84, sub ? '' : '', { z: 10 }), L(50, 196, 280, 196, INK, 4), T(62, 178, sub ? '−' : '+', { z: 34, w: 700, f: C.o }));
      for (let i = 0; i < 3; i++) {
        const x = cx[2 - i];
        kids.push(T(x, 112, A[i] || i === 0 || v.a >= 10 ** i ? String(A[i]) : '', { z: 34, w: 700 }), T(x, 168, B[i] || i === 0 || v.b >= 10 ** i ? String(B[i]) : '', { z: 34, w: 700, f: '#1f63d9' }), T(x, 40, nm[i], { z: 11, w: 600, f: '#6b5a8a' }));
      }
      for (let i = 0; i < 3; i++) {
        if (v.step > i) {
          const x = cx[2 - i];
          if (!lead(i)) kids.push(T(x, 246, String(res[i]), { z: 34, w: 700, f: '#058a68' }), R(x - 30, 214, 60, 44, 'none', { s: '#058a68', w: 2.5, r: 6 }));
          if (mark[i] && i < 2) kids.push(T(cx[2 - i - 1], 80, sub ? '−1' : '1', { z: 18, w: 700, f: '#c2510e' }), T(x + 26, 100, sub ? '+10' : '', { z: 12, w: 700, f: '#c2510e' }));
        }
      }
      const i = Math.min(v.step, 3) - 1, lines = [];
      for (let k = 0; k <= i; k++) lines.push(sub ? `${nm[k]}: ${A[k] - (k && mark[k - 1] ? 1 : 0) + (mark[k] ? 10 : 0)} − ${B[k]} = ${res[k]}` : `${nm[k]}: ${A[k]} + ${B[k]}${k && mark[k - 1] ? ' + 1' : ''} = ${A[k] + B[k] + (k && mark[k - 1] ? 1 : 0)}${mark[k] ? `, write ${res[k]} and carry 1` : ''}`);
      lines.forEach((t, k) => kids.push(T(310, 76 + k * 30, t, { a: 'start', z: 12, w: 600 })));
      kids.push(T(440, 262, v.step >= 3 ? `${v.a} ${sub ? '−' : '+'} ${v.b} = ${total}` : '', { z: 22, w: 700, f: '#058a68' }));
      const done = v.step >= 3;
      return { kids, say: v.step === 0 ? `${v.a} ${sub ? 'take away' : 'plus'} ${v.b}: start with the ones.` : done ? `${v.a} ${sub ? '−' : '+'} ${v.b} = ${total}.${mark[0] || mark[1] ? (sub ? ' Regrouping 1 ten as 10 ones (or 1 hundred as 10 tens) made the subtraction possible.' : ' Regrouping 10 ones as 1 ten (or 10 tens as 1 hundred) carried the 1 along.') : ' No regrouping was needed.'}` : `After the ${nm.slice(0, v.step).join(' and ')} column${v.step > 1 ? 's' : ''}: ${lines[lines.length - 1]}.` };
    },
  },
  numberjump: {
    subject: 'maths', about: 'A frog hops along a number line from 0 to 100: pick where it starts, how big each jump is, how many jumps, and forward (adding) or back (taking away). It lands on each number in turn, e.g. from 7 jumping 10 at a time: 7, 17, 27, 37. For number lines, counting on and back, jumps, addition and subtraction, skip counting, tens.',
    sliders: [['start', 'Start at', 0, 99, 1, 7], ['jump', 'Jump size', 1, 20, 1, 10], ['hops', 'Number of jumps', 0, 9, 1, 3], ['back', 'Direction: 0 forward, 1 back', 0, 1, 1, 0]],
    draw(v) {
      const x = (n) => 30 + n * 5.4, y = 190, dir = v.back ? -1 : 1, stops = [v.start];
      for (let k = 1; k <= v.hops; k++) { const n = stops[k - 1] + dir * v.jump; if (n < 0 || n > 100) break; stops.push(n); }
      const stuck = stops.length - 1 < v.hops, kids = [L(x(0), y, x(100), y, INK, 3)];
      for (let n = 0; n <= 100; n++) kids.push(L(x(n), y - (n % 10 ? 4 : 9), x(n), y + (n % 10 ? 4 : 9), INK, n % 10 ? 1 : 2.2), ...(n % 10 ? [] : [T(x(n), y + 28, String(n), { z: 12, w: 600 })]));
      for (let k = 1; k < stops.length; k++) kids.push(s('path', { d: `M ${x(stops[k - 1])} ${y} Q ${(x(stops[k - 1]) + x(stops[k])) / 2} ${y - 52} ${x(stops[k])} ${y}`, fill: 'none', stroke: C.o, 'stroke-width': 3 }));
      const everyLabel = v.jump >= 5;
      stops.forEach((n, k) => { const end = k === stops.length - 1; kids.push(CIRC(x(n), y, end ? 9 : 6, end ? C.p : '#ffcc33', { w: 2.5 })); if (everyLabel || k === 0 || end) kids.push(T(x(n), y - 40, String(n), { z: 14, w: 700, f: end ? '#6b45c8' : INK })); });
      kids.push(T(300, 34, stops.length > 1 ? `${v.start} ${v.back ? '−' : '+'} ${stops.length - 1} × ${v.jump} = ${stops[stops.length - 1]}` : `start at ${v.start}`, { z: 22, w: 700 }));
      if (stuck) kids.push(T(300, 270, 'the next jump would leave the number line', { z: 13, w: 600, f: '#c0392b' }));
      const last = stops[stops.length - 1], n = stops.length - 1;
      return { kids, say: n === 0 ? (v.hops === 0 ? `The frog starts at ${v.start}.` : `The frog starts at ${v.start}, but a jump of ${v.jump} ${v.back ? 'back' : 'forward'} would go off the number line.`) : `Starting at ${v.start}, ${n} jump${n === 1 ? '' : 's'} of ${v.jump} ${v.back ? 'back' : 'forward'} land${n === 1 ? 's' : ''} on ${last}: ${stops.join(', ')}.${stuck ? ' The next jump would go off the line.' : ''}` };
    },
  },
};

export function slidersOf(id, params) { const w = WIDGETS[id]; return w?.dynamicSliders ? w.dynamicSliders(params || w.params || {}) : w?.sliders || []; }
export const CATALOG = Object.entries(WIDGETS).map(([id, w]) => ({ id, subject: w.subject, about: w.about, params: w.params || null, sliders: w.dynamicSliders ? 'set from the events' : w.sliders.map(([key, label, min, max, step, start]) => ({ key, label, min, max, step, start })) }));
