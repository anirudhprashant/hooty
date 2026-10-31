// Visual models for Maths problems, drawn from the problem's own numbers, so the picture is correct by construction
// for whatever numbers were drawn. renderModel(spec) returns an <svg> (or null if the numbers are too big to draw
// clearly). The idea is concrete before abstract: the child sees WHY a sum works before meeting the symbols.
//   array      rows x cols dots                      (multiplication, area as counting)
//   groups     n groups of k dots                    (sharing, grouping, division with remainders)
//   tape       a bar of parts with a total bracket   (totals, differences, change, "how many more")
//   numberline ticks with equal jumps                (counting on, skip counting, multiples, negatives)
//   area       a rows x cols grid with side labels   (area and perimeter)
//   fraction   a bar cut into equal parts, some shaded
//   compare    horizontal bars side by side          (which is more, and by how much)

const NS = 'http://www.w3.org/2000/svg';
const INK = '#2a1a4a', CREAM = '#fff7e8';
const COLOURS = ['#ff7a59', '#ffb703', '#3a86ff', '#06a77d', '#8338ec'];

function s(tag, attrs = {}, kids = []) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  for (const c of [].concat(kids)) if (c != null) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
}
const text = (x, y, str, o = {}) => s('text', { x, y, 'text-anchor': o.anchor || 'middle', 'font-size': o.size || 22, 'font-weight': o.weight || 700, fill: o.fill || INK, 'font-family': 'sans-serif' }, str);
const int = (v) => Math.round(Number(v));

function frame(w, h, label, kids) {
  return s('svg', { viewBox: `0 0 ${w} ${h}`, class: 'model', role: 'img', 'aria-label': label, preserveAspectRatio: 'xMidYMid meet' },
    [s('rect', { x: 0, y: 0, width: w, height: h, rx: 18, fill: CREAM }), ...kids]);
}

const BUILD = {
  array(m) {
    const rows = int(m.rows), cols = int(m.cols);
    if (rows < 1 || cols < 1 || rows > 10 || cols > 14) return null;
    const gap = Math.min(46, 520 / cols, 230 / rows), r = gap * 0.36;
    const w = 600, h = rows * gap + 90, x0 = (w - (cols - 1) * gap) / 2;
    const dots = [];
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) dots.push(s('circle', { cx: x0 + j * gap, cy: 40 + i * gap, r, fill: COLOURS[i % COLOURS.length], stroke: INK, 'stroke-width': 2 }));
    return frame(w, h, `${rows} rows of ${cols} dots`, [...dots, text(w / 2, h - 26, `${rows} rows of ${cols}`, { size: 24 })]);
  },
  groups(m) {
    const n = int(m.groups), k = int(m.size);
    if (n < 1 || k < 1 || n > 8 || k > 12) return null;
    const cols = Math.min(n, 4), rowsN = Math.ceil(n / cols), cw = 600 / cols, ch = 150, w = 600, h = rowsN * ch + 70;
    const kids = [];
    for (let g = 0; g < n; g++) {
      const cx = cw * (g % cols) + cw / 2, cy = Math.floor(g / cols) * ch + 80;
      kids.push(s('circle', { cx, cy, r: 62, fill: '#fff', stroke: COLOURS[g % COLOURS.length], 'stroke-width': 6 }));
      const per = Math.ceil(Math.sqrt(k)), gap = 22;
      for (let i = 0; i < k; i++) kids.push(s('circle', { cx: cx + ((i % per) - (per - 1) / 2) * gap, cy: cy + (Math.floor(i / per) - (Math.ceil(k / per) - 1) / 2) * gap, r: 8, fill: COLOURS[g % COLOURS.length], stroke: INK, 'stroke-width': 1.5 }));
    }
    return frame(w, h, `${n} groups of ${k}`, [...kids, text(w / 2, h - 22, `${n} groups of ${k}`, { size: 24 })]);
  },
  tape(m) {
    const parts = (m.parts || []).map((p) => ({ v: Number(p.v), label: p.label != null ? String(p.label) : String(p.v) })).filter((p) => p.v > 0);
    if (!parts.length || parts.length > 8) return null;
    const sum = parts.reduce((a, p) => a + p.v, 0), w = 600, x0 = 30, span = w - 60;
    let x = x0; const kids = [];
    parts.forEach((p, i) => {
      const pw = Math.max(40, (p.v / sum) * span);
      kids.push(s('rect', { x, y: 70, width: pw, height: 64, fill: COLOURS[i % COLOURS.length], stroke: INK, 'stroke-width': 4, rx: 6 }));
      kids.push(text(x + pw / 2, 111, p.label, { size: 26, fill: '#fff' }));
      x += pw;
    });
    const xe = Math.min(x, w - 30);
    kids.push(s('path', { d: `M ${x0} 56 v -14 H ${xe} v 14`, fill: 'none', stroke: INK, 'stroke-width': 4 }));
    kids.push(text((x0 + xe) / 2, 32, m.total != null ? String(m.total) : '?', { size: 28 }));
    return frame(w, 160, 'a bar model of the parts and the total', kids);
  },
  numberline(m) {
    const from = Number(m.from), to = Number(m.to), tick = Number(m.step) || 1;
    if (!(to > from) || (to - from) / tick > 60) return null;
    const w = 600, x0 = 40, span = w - 80, X = (v) => x0 + ((v - from) / (to - from)) * span, y = 110, kids = [];
    kids.push(s('line', { x1: x0 - 10, y1: y, x2: w - 30, y2: y, stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }));
    const every = (to - from) / tick > 30 ? 5 : 1;
    for (let v = from, i = 0; v <= to + 1e-9; v += tick, i++) {
      kids.push(s('line', { x1: X(v), y1: y - 9, x2: X(v), y2: y + 9, stroke: INK, 'stroke-width': 3 }));
      if (i % every === 0) kids.push(text(X(v), y + 36, +v.toFixed(2), { size: 19, weight: 600 }));
    }
    const j = m.jumps;
    if (j && Number(j.count) > 0 && Number(j.size) > 0 && Number(j.count) <= 20) {
      let a = Number(j.start) || from;
      for (let i = 0; i < Number(j.count); i++) {
        const b = a + Number(j.size); if (b > to + 1e-9) break;
        const mid = (X(a) + X(b)) / 2, lift = Math.min(70, 26 + (X(b) - X(a)) * 0.25);
        kids.push(s('path', { d: `M ${X(a)} ${y - 12} Q ${mid} ${y - 12 - lift * 1.6} ${X(b)} ${y - 12}`, fill: 'none', stroke: COLOURS[i % COLOURS.length], 'stroke-width': 5, 'stroke-linecap': 'round' }));
        kids.push(s('circle', { cx: X(b), cy: y, r: 7, fill: COLOURS[i % COLOURS.length], stroke: INK, 'stroke-width': 2 }));
        a = b;
      }
      kids.push(s('circle', { cx: X(Number(j.start) || from), cy: y, r: 9, fill: '#fff', stroke: INK, 'stroke-width': 4 }));
    }
    for (const v of m.mark || []) if (v >= from && v <= to) kids.push(s('circle', { cx: X(v), cy: y, r: 10, fill: '#ffb703', stroke: INK, 'stroke-width': 3 }));
    return frame(w, 170, 'a number line', kids);
  },
  area(m) {
    const rows = int(m.rows), cols = int(m.cols);
    if (rows < 1 || cols < 1 || rows > 12 || cols > 16) return null;
    const cell = Math.min(34, 460 / cols, 190 / rows), gw = cell * cols, gh = cell * rows, x0 = (600 - gw) / 2, y0 = 36;
    const kids = [];
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) kids.push(s('rect', { x: x0 + j * cell, y: y0 + i * cell, width: cell, height: cell, fill: '#bde0fe', stroke: INK, 'stroke-width': 1.5 }));
    kids.push(s('rect', { x: x0, y: y0, width: gw, height: gh, fill: 'none', stroke: INK, 'stroke-width': 4 }));
    const u = m.unit ? ' ' + m.unit : '';
    kids.push(text(x0 + gw / 2, y0 + gh + 30, `${cols}${u}`, { size: 22 }));
    kids.push(text(x0 - 12, y0 + gh / 2 + 7, `${rows}${u}`, { anchor: 'end', size: 22 }));
    return frame(600, y0 + gh + 52, `a grid ${cols} wide and ${rows} tall`, kids);
  },
  fraction(m) {
    const parts = int(m.parts), shaded = int(m.shaded);
    if (parts < 2 || parts > 16 || shaded < 0 || shaded > parts) return null;
    const w = 600, x0 = 40, span = w - 80, pw = span / parts, kids = [];
    for (let i = 0; i < parts; i++) kids.push(s('rect', { x: x0 + i * pw, y: 40, width: pw, height: 80, fill: i < shaded ? '#06a77d' : '#fff', stroke: INK, 'stroke-width': 3 }));
    kids.push(text(w / 2, 160, `${shaded} of ${parts} equal parts`, { size: 24 }));
    return frame(w, 190, `a bar cut into ${parts} equal parts with ${shaded} shaded`, kids);
  },
  compare(m) {
    const bars = (m.bars || []).map((b) => ({ v: Number(b.v), label: String(b.label ?? b.v) })).filter((b) => b.v > 0);
    if (bars.length < 2 || bars.length > 5) return null;
    const max = Math.max(...bars.map((b) => b.v)), kids = [];
    bars.forEach((b, i) => {
      const y = 24 + i * 56, bw = Math.max(30, (b.v / max) * 400);
      kids.push(s('rect', { x: 150, y, width: bw, height: 38, fill: COLOURS[i % COLOURS.length], stroke: INK, 'stroke-width': 3, rx: 5 }));
      kids.push(text(138, y + 27, b.label, { anchor: 'end', size: 20, weight: 600 }));
      kids.push(text(158 + bw, y + 27, b.v, { anchor: 'start', size: 20 }));
    });
    return frame(600, 24 + bars.length * 56, 'bars to compare', kids);
  },
};

export function renderModel(spec) {
  try {
    const build = spec && Object.hasOwn(BUILD, spec.type) ? BUILD[spec.type] : null;
    return build ? build(spec) : null;
  } catch { return null; }
}

export const MODEL_TYPES = Object.keys(BUILD);
