// Explorables: small simulations a child plays with. Each has sliders and a draw function that turns the slider values into a
// picture and a read-out, using the real rule (the law of reflection, T = 2*pi*sqrt(L/g), local time = longitude / 15), so what
// the child sees is right by construction. A lesson only chooses a widget and sets challenges (tools/add-explore.py).
// All drawing is SVG built in code; no files, no network.

import { t as words } from './i18n.js';   // `t` is already a draw() parameter name

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
const year = (y) => (y < 0 ? `${-y} ${words('bce')}` : y === 0 ? `1 ${words('ce')}` : `${y} ${words('ce')}`);

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
  rhyme: {
    subject: 'english', about: 'Word families that rhyme: the same ending gives the same sound. Cat, bat, hat and mat all end in -at; cake, lake, make and take in -ake. For rhyming words, word families, and hearing the ending of a word.',
    sliders: [['family', 'Choose a word family', 0, 3, 1, 0]],
    draw(v) {
      const fam = Math.max(0, Math.min(3, v.family | 0));
      const families = [
        ['-at', ['cat', 'bat', 'hat', 'mat'], '#ffd166'],
        ['-ake', ['cake', 'lake', 'make', 'take'], '#a0e7a0'],
        ['-ing', ['ring', 'sing', 'king', 'wing'], '#9ad0f5'],
        ['-ock', ['clock', 'rock', 'sock', 'lock'], '#f5a9c8'],
      ];
      const [ending, words, accent] = families[fam];
      const kids = [R(0, 0, W, H, '#fffdf7', { w: 0 })];
      kids.push(T(24, 40, 'Same ending, same sound.', { z: 15, a: 'start', f: '#6b6a60', w: 600 }));
      // the family's ending, big, as a pill
      kids.push(R(430, 12, 146, 46, accent, { w: 3, s: '#2a1a4a', r: 23 }));
      kids.push(T(503, 43, ending, { z: 24, f: '#2a1a4a' }));
      // four word cards in a two-by-two, with every word split at the same seam so the endings line up
      const cardW = 252, cardH = 74, seam = 116;
      words.forEach((word, i) => {
        const x = 24 + (i % 2) * (cardW + 24), y = 78 + Math.floor(i / 2) * (cardH + 18);
        kids.push(R(x, y, cardW, cardH, '#ffffff', { w: 3, s: '#e3dccb', r: 14 }));
        const stem = word.slice(0, word.length - (ending.length - 1));
        // the shared ending, in the family colour, so the eye lands on what makes the rhyme
        kids.push(T(x + seam, y + 46, stem, { z: 26, a: 'end', f: '#2a1a4a' }));
        const endW = 8 + (ending.length - 1) * 15;
        kids.push(R(x + seam + 6, y + 20, endW, 40, accent, { w: 0, r: 10 }));
        kids.push(T(x + seam + 12, y + 46, word.slice(stem.length), { z: 26, a: 'start', f: '#2a1a4a' }));
      });
      kids.push(T(300, 268, 'say them aloud: the last part sounds the same in every card', { z: 15, f: '#7d7a70', w: 600 }));
      const say = `${words.slice(0, 3).map((w) => w[0].toUpperCase() + w.slice(1)).join(', ')} and ${words[3]} all end with the same sound, ${ending}. Words that end with the same sound rhyme.`;
      return { kids, say };
    },
  },
  organs: {
    subject: 'social', about: 'The three organs of government and what each one does with a law: the legislature makes it, the executive carries it out, and the judiciary decides whether it has been followed and whether it is fair. For the three organs of government, the legislature, executive and judiciary, separation of powers, and how each organ checks the others.',
    sliders: [['stage', 'Follow one law through the government', 0, 2, 1, 0]],
    draw(v) {
      const stage = Math.max(0, Math.min(2, v.stage | 0));
      const cases = [
        ['A new kind of digital fraud is hurting people.', 'Someone has to make a law against it.'],
        ['The law has been passed.', 'Now the offices of government must act on it.'],
        ['A person is accused of breaking the new law.', 'Someone has to judge the case fairly.'],
      ];
      const names = ['Legislature', 'Executive', 'Judiciary'];
      const roles = ['makes the law', 'carries it out', 'judges by it'];
      const kids = [R(0, 0, W, H, '#fbf9f2', { w: 0 })];
      // the case for this step of the journey
      kids.push(R(36, 12, 528, 64, '#ffffff', { w: 2, s: '#e3d9c6', r: 12 }));
      kids.push(T(48, 30, 'One law, three organs', { z: 15, a: 'start', f: '#8a6d3b', w: 700 }));
      kids.push(T(48, 51, cases[stage][0], { z: 18, a: 'start' }));
      kids.push(T(48, 70, cases[stage][1], { z: 18, a: 'start' }));
      // the journey: three stops on one line
      const xs = [70, 240, 410], bw = 152, bh = 112, y0 = 106;
      kids.push(L(30, y0 + bh / 2, 570, y0 + bh / 2, '#d8cdb8', 3, { 'stroke-dasharray': '7 6' }));
      for (let i = 0; i < 3; i++) {
        const on = i === stage;
        const x = xs[i], y = y0;
        kids.push(R(x, y, bw, bh, on ? '#fff4cf' : '#f4f2ea', { w: on ? 4 : 2, s: on ? '#e09f00' : '#d5cdbd', r: 14 }));
        kids.push(T(x + bw / 2, y + 20, names[i], { z: 17, f: on ? '#5c4300' : '#5d6b63', w: 700 }));
        kids.push(T(x + bw / 2, y + 102, roles[i], { z: 14.5, f: '#8a7a5c', w: 600 }));
        const ink = on ? '#b98600' : '#8fa08f';
        const mid = x + bw / 2, cy = y + 58;
        if (i === 0) {
          // an assembly: a dome on top of columns
          kids.push(s('path', { d: `M ${mid - 30} ${cy - 10} Q ${mid} ${cy - 42} ${mid + 30} ${cy - 10}`, fill: 'none', stroke: ink, 'stroke-width': 4 }));
          for (const dx of [-22, -8, 8, 22]) kids.push(L(mid + dx, cy - 8, mid + dx, cy + 22, ink, 3.5));
          kids.push(L(mid - 32, cy + 24, mid + 32, cy + 24, ink, 3.5));
        } else if (i === 1) {
          // a government building with a flag: the part that carries the law out
          kids.push(R(mid - 26, cy - 8, 44, 32, 'none', { w: 3.5, s: ink, r: 3 }));
          kids.push(L(mid + 24, cy - 34, mid + 24, cy + 24, ink, 3.5));
          kids.push(s('path', { d: `M ${mid + 24} ${cy - 34} L ${mid + 46} ${cy - 28} L ${mid + 24} ${cy - 20} Z`, fill: ink, stroke: ink, 'stroke-width': 1 }));
          kids.push(T(mid - 4, cy + 12, '↑', { z: 15, f: ink, w: 700 }));
        } else {
          // scales: the courts weigh the case
          kids.push(L(mid, cy - 30, mid, cy + 22, ink, 3.5));
          kids.push(L(mid - 34, cy - 22, mid + 34, cy - 22, ink, 3.5));
          kids.push(L(mid - 34, cy - 22, mid - 34, cy - 6, ink, 2), L(mid + 34, cy - 22, mid + 34, cy - 6, ink, 2));
          kids.push(s('path', { d: `M ${mid - 46} ${cy - 6} Q ${mid - 34} ${cy + 14} ${mid - 22} ${cy - 6} Z`, fill: 'none', stroke: ink, 'stroke-width': 3 }));
          kids.push(s('path', { d: `M ${mid + 22} ${cy - 6} Q ${mid + 34} ${cy + 14} ${mid + 46} ${cy - 6} Z`, fill: 'none', stroke: ink, 'stroke-width': 3 }));
          kids.push(L(mid - 12, cy + 22, mid + 12, cy + 22, ink, 3.5));
        }
      }
      kids.push(T(300, 246, 'each organ can check the other two, and none may take over their work', { z: 15, f: '#5d6b63', w: 600 }));
      kids.push(T(300, 272, 'a court can strike down a law; the assembly can question the government', { z: 13.5, f: '#8a7a5c', w: 600 }));
      const say = [
        'The legislature is the assembly of elected representatives. It debates the problem, writes the law against digital fraud and passes it. Making the law is its job alone.',
        'The executive is the part of government that carries laws out: the ministries, the police, the tax offices. It puts the new law to work, but it does not write the law.',
        'The judiciary is the courts. They hear the case, decide whether the law has been broken and whether it is fair, and they can strike down a law that breaks the Constitution.',
      ][stage];
      return { kids, say };
    },
  },
  nagar: {
    subject: 'social', about: 'Who runs a town or a city: the bigger the place, the bigger the body. A town has a Nagar Panchayat, a city of one to ten lakh people has a Municipal Council (Nagar Palika), and a city above ten lakh has a Municipal Corporation (Mahanagar Nigam). For urban local bodies, wards, municipal corporations and councils, and the services a city body looks after.',
    sliders: [['size', 'How big is the place?', 0, 2, 1, 0]],
    draw(v) {
      const size = Math.max(0, Math.min(2, v.size | 0));
      const bands = ['under 20,000 people', '1 to 10 lakh people', 'over 10 lakh people'];
      const bodies = [['Nagar Panchayat'], ['Municipal Council', '(Nagar Palika)'], ['Municipal Corporation', '(Mahanagar Nigam)']];
      const kids = [R(0, 0, W, H, '#f4f8ff', { w: 0 })];
      kids.push(T(24, 28, 'Who runs a town or a city?', { z: 19, a: 'start', f: '#2a1a4a', w: 700 }));
      kids.push(T(24, 48, 'The bigger the place, the bigger the body.', { z: 15, a: 'start', f: '#6b7a8a', w: 600 }));
      const panelW = 168, y0 = 58, panelH = 168;
      for (let i = 0; i < 3; i++) {
        const on = i === size;
        const x = 24 + i * (panelW + 18);
        kids.push(R(x, y0, panelW, panelH, on ? '#fff4cf' : '#ffffff', { w: on ? 4 : 2, s: on ? '#e09f00' : '#cfd8e6', r: 12 }));
        kids.push(T(x + panelW / 2, y0 + 18, bands[i], { z: 14, f: on ? '#5c4300' : '#6b7a8a', w: 600 }));
        const base = y0 + 112;
        const fill = on ? '#f0cf85' : '#cfdcf0', edge = on ? '#b98e12' : '#94a9c4';
        if (i === 0) {
          for (const [hx, hw, hh] of [[22, 30, 22], [58, 34, 30], [98, 26, 18], [130, 24, 25]]) kids.push(R(x + hx, base - hh, hw, hh, fill, { w: 1.6, s: edge, r: 2 }));
        } else if (i === 1) {
          for (const [hx, hw, hh] of [[16, 26, 40], [46, 24, 56], [74, 30, 46], [108, 24, 62], [136, 20, 38]]) kids.push(R(x + hx, base - hh, hw, hh, fill, { w: 1.6, s: edge, r: 2 }));
          for (const [wx, wy] of [[56, 22], [84, 34], [116, 46]]) kids.push(R(x + wx, base - wy, 4, 4, on ? '#b98e12' : '#8fa6c4', { w: 0 }));
        } else {
          for (const [hx, hw, hh] of [[12, 22, 52], [40, 26, 70], [72, 22, 60], [100, 28, 80], [134, 24, 64]]) kids.push(R(x + hx, base - hh, hw, hh, fill, { w: 1.6, s: edge, r: 2 }));
          // a couple of aerials on the tallest tower, kept below the panel's own label
          for (const ax of [108, 114]) kids.push(L(x + ax, base - 80, x + ax, base - 92, edge, 2));
        }
        kids.push(L(x + 10, base, x + panelW - 10, base, edge, 2));
        kids.push(T(x + panelW / 2, y0 + 138, bodies[i][0], { z: 14, f: on ? '#5c4300' : '#3d4a56', w: 700 }));
        if (bodies[i][1]) kids.push(T(x + panelW / 2, y0 + 155, bodies[i][1], { z: 12.5, f: '#7d8a96', w: 600 }));
      }
      kids.push(T(300, 250, 'roads · water · drains · garbage · street lights · markets · property tax', { z: 14.5, f: '#4a5a6a', w: 600 }));
      kids.push(T(300, 272, 'each ward elects a councillor, and the ward committee speaks for that neighbourhood', { z: 12.5, f: '#7d8a96', w: 600 }));
      const say = [
        'A town has a Nagar Panchayat. It keeps the streets, the drains, the water and the street lights working, and it collects local taxes to pay for them.',
        'A city of one to ten lakh people has a Municipal Council, also called a Nagar Palika. It looks after the same services for a much larger area, through its elected councillors.',
        'A city of more than ten lakh people has a Municipal Corporation, also called a Mahanagar Nigam. It is the biggest urban body, with the most services to run and the most taxes to collect. Every ward elects a councillor who speaks for that neighbourhood.',
      ][size];
      return { kids, say };
    },
  },
  panchayat: {
    subject: 'social', about: 'Who decides what, from the village up: the Gram Sabha and Gram Panchayat for a village, the Panchayat Samiti for a group of villages, the Zila Parishad for the district, and the State legislature for a rule that covers everyone. Shows how village plans and funds move up the chain. For Panchayati Raj, local self-government, the three levels of rural local government, and democracy at the grass roots.',
    sliders: [['level', 'Climb the chain, from the village up', 0, 3, 1, 0]],
    draw(v) {
      const level = Math.max(0, Math.min(3, v.level | 0));
      const cases = [
        ['The lanes need cleaning and the', 'school needs a safer wall.'],
        ['Three villages want one road', 'and an ambulance to share.'],
        ['Every school and health centre', 'in the district needs money.'],
        ['A rule about single-use plastic', 'for the whole State.'],
      ];
      const names = [['Gram Panchayat', 'the village'], ['Panchayat Samiti', 'the block'], ['Zila Parishad', 'the district'], ['State legislature', 'the State']];
      const kids = [R(0, 0, W, H, '#fffaf0', { w: 0 })];
      // the case for this level, in a card at the top
      kids.push(R(40, 16, 520, 58, '#ffffff', { w: 2, s: '#e3d9c6', r: 12 }));
      kids.push(T(52, 40, 'Who decides?', { z: 16, a: 'start', f: '#8a6d3b', w: 700 }));
      kids.push(T(52, 62, cases[level][0], { z: 19, a: 'start' }));
      kids.push(T(52, 82, cases[level][1], { z: 19, a: 'start' }));
      // four platforms, rising left to right: name, tier, and a little council of three people
      const bw = 132, bh = 74, gap = 16;
      for (let i = 0; i < 4; i++) {
        const on = i === level;
        const x = 12 + i * (bw + gap), y = 274 - bh - i * 34;
        kids.push(R(x, y, bw, bh, on ? '#ffe9a8' : '#f1f4ee', { w: on ? 4 : 2, s: on ? '#e09f00' : '#cfd8cc', r: 12 }));
        // big enough to read once the card is the width of a phone
        kids.push(T(x + bw / 2, y + 22, names[i][0], { z: 16, f: on ? '#5c4300' : '#5d6b63', w: 700 }));
        kids.push(T(x + bw / 2, y + 40, names[i][1], { z: 14, f: '#8a978f', w: 600 }));
        for (let k = 0; k < 3; k++) {
          const px = x + bw / 2 - 22 + k * 22;
          kids.push(CIRC(px, y + 54, 5.5, on ? '#e09f00' : '#9fb3a6', { w: 0 }));
          kids.push(s('path', { d: `M ${px - 8} ${y + 68} Q ${px} ${y + 58} ${px + 8} ${y + 68}`, fill: 'none', stroke: on ? '#e09f00' : '#9fb3a6', 'stroke-width': 3.5 }));
        }
      }
      kids.push(T(12, 294, 'plans and money move up this stair; decisions come back down it', { z: 15, a: 'start', f: '#8a7a5c', w: 600 }));
      const say = [
        'A village decides for itself. All the adults on the voters list meet in the Gram Sabha and say what the village needs; the Gram Panchayat, with its Sarpanch and Panchayat Secretary, carries the work out.',
        'Several villages together make a block. The Panchayat Samiti collects the plans of all the Gram Panchayats in the block, joins them, and sends them up so the road and the ambulance can be paid for together.',
        'The district body is the Zila Parishad. It receives the block plans, decides what the whole district will do this year, and passes the money down to the blocks and villages.',
        'A rule for the whole State is not made by a panchayat. It is made in the State legislature, where the MLAs elected from each area sit. Local bodies carry those rules out; they do not write them.',
      ][level];
      return { kids, say };
    },
  },
  germs: {
    subject: 'science', about: 'A room of a hundred and forty-four people, three of them ill: move the day forward and the illness passes from neighbour to neighbour by contact. People who wash their hands do not pick it up, so the more who wash, the sooner the chain breaks. For communicable diseases, how they spread, and how handwashing and cleanliness prevent them.',
    sliders: [['wash', 'People who wash their hands (in 100)', 0, 100, 1, 0], ['day', 'Day', 0, 14, 1, 0]],
    draw(v) {
      const wash = Math.max(0, Math.min(100, v.wash));
      const day = Math.max(0, Math.min(14, v.day));
      const N = 12, CELL = 21, RAD = 8.2;
      const x0 = (W - N * CELL) / 2 + CELL / 2 - 9, y0 = 26;
      const kids = [R(0, 0, W, H, '#fbfdff', { w: 0 })];
      // The three who start ill, spread out so the illness has room to travel from more than one corner.
      const seeds = [0, 6 * N + 6, N * N - 1];
      // Who washes: a seeded shuffle so the room looks the same every time, and a higher count only adds washers.
      let seedNo = 7;
      const rand = () => { seedNo = (seedNo + 0x6d2b79f5) >>> 0; let t = seedNo; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const pool = [...Array(N * N).keys()].filter((i) => !seeds.includes(i));
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const washers = new Set(pool.slice(0, Math.round((wash / 100) * (N * N - seeds.length))));
      // The illness passes by contact to the four neighbours; a person who washes does not take it in.
      const state = new Array(N * N).fill(0);   // 0 well, 1 ill now, 2 was ill
      const since = new Array(N * N).fill(-1);
      for (const s of seeds) { state[s] = 1; since[s] = 0; }
      for (let d = 1; d <= day; d++) {
        for (let i = 0; i < N * N; i++) if (state[i] === 1 && d - since[i] >= 5) state[i] = 2;
        for (let i = 0; i < N * N; i++) {
          if (state[i] !== 1 || d - since[i] >= 5) continue;
          const x = i % N, y = (i / N) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx > N - 1 || ny < 0 || ny > N - 1) continue;
            const j = ny * N + nx;
            if (state[j] === 0 && !washers.has(j)) { state[j] = 1; since[j] = d; }
          }
        }
      }
      const ill = state.filter((s) => s === 1).length;
      const ever = state.filter((s) => s > 0).length;
      for (let i = 0; i < N * N; i++) {
        const cx = x0 + (i % N) * CELL, cy = y0 + ((i / N) | 0) * CELL;
        const washed = washers.has(i);
        const fill = washed ? '#8ecae6' : state[i] === 1 ? '#ff7a59' : state[i] === 2 ? '#f8d3c8' : '#d5dde1';
        kids.push(CIRC(cx, cy, RAD, fill, { w: 1.6, s: washed ? '#3a86ff' : '#9aa6ad' }));
        if (state[i] === 1) kids.push(CIRC(cx, cy, 2.8, '#7a1f0f', { w: 0 }));
      }
      kids.push(T(300, 18, `day ${day}: ${ill} ill now, ${ever} of ${N * N} have been ill`, { z: 19, f: '#2a1a4a' }));
      const legend = [['washes hands', '#8ecae6', '#3a86ff'], ['ill now', '#ff7a59', '#9aa6ad'], ['was ill', '#f8d3c8', '#9aa6ad'], ['no wash, well', '#d5dde1', '#9aa6ad']];
      legend.forEach(([label, fill, stroke], i) => {
        // Phone screens shrink the whole drawing to about 57 per cent, so the small print has to start bigger than it
        // looks on a laptop: a 16px label reads at about 9px on a 390 wide phone.
        const lx = 26 + i * 146, ly = 288;
        kids.push(CIRC(lx, ly, 7, fill, { w: 1.6, s: stroke }));
        kids.push(T(lx + 11, ly + 5.5, label, { z: 16, a: 'start', f: '#4a5a6a', w: 600 }));
      });
      const say = day === 0
        ? 'Three of these people are ill. The germs of a communicable disease leave a sick person by contact, water, food or air, so move the day forward and watch who catches it.'
        : wash <= 10
          ? `By day ${day}, ${ever} of the ${N * N} have been ill. Hardly anyone washes their hands, so the germs move from neighbour to neighbour almost without stopping.`
          : wash >= 70
            ? `By day ${day}, only ${ever} of the ${N * N} have been ill. Most people here wash their hands, so the germs keep meeting people who do not take them in, and the chain breaks.`
            : `By day ${day}, ${ever} of the ${N * N} have been ill. Each person who washes their hands breaks one link, so the illness spreads more slowly and stops sooner.`;
      return { kids, say };
    },
  },
  levels: {
    subject: 'science', about: 'The levels of organisation in a plant, one step at a time: a cell, a group of similar cells that is a tissue, an organ such as a leaf, an organ system such as the shoot, and the whole plant as an organism. For tissues, organs, organ systems, cells working together, and plant tissues such as the epidermis, xylem and phloem.',
    sliders: [['stage', 'Climb from one cell to the whole plant', 0, 4, 1, 0]],
    draw(v) {
      const stage = Math.max(0, Math.min(4, v.stage | 0));
      const names = ['cell', 'tissue', 'organ', 'organ system', 'organism'];
      const kids = [R(0, 0, W, H, '#fbfdf7', { w: 0 })];
      const boxW = 108, gap = 12, x0 = (W - (boxW * 5 + gap * 4)) / 2, y0 = 40, boxH = 168;
      const panel = (i, draw) => {
        const x = x0 + i * (boxW + gap), y = y0;
        const on = i === stage;
        kids.push(R(x, y, boxW, boxH, on ? '#fff4cf' : '#f2f5ee', { w: on ? 4 : 2, s: on ? '#ffb703' : '#cfd8cc', r: 12 }));
        // "organ system" does not fit five panels at phone size, so the panel names stay modest
        kids.push(T(x + boxW / 2, y + boxH - 10, names[i], { z: 14, f: on ? '#2a1a4a' : '#6b7a72', w: 700 }));
        draw(x + boxW / 2, y + 64, on);
      };
      // 1. a plant cell: stiff wall, nucleus inside
      panel(0, (cx, cy) => {
        kids.push(R(cx - 26, cy - 26, 52, 52, '#e7f5d9', { w: 4, s: '#3f7d3a', r: 4 }));
        kids.push(CIRC(cx + 4, cy - 2, 8, '#3a86ff', { w: 1.5 }));
        kids.push(T(cx, cy + 40, 'wall', { z: 14, f: '#3f7d3a' }));
      });
      // 2. a tissue: similar cells packed together
      panel(1, (cx, cy) => {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
          kids.push(R(cx - 40 + c * 28, cy - 42 + r * 28, 24, 24, '#e7f5d9', { w: 1.5, s: '#3f7d3a', r: 3 }));
        }
      });
      // 3. an organ: a leaf, made of those tissues
      panel(2, (cx, cy) => {
        kids.push(s('ellipse', { cx, cy, rx: 40, ry: 22, fill: '#8fd18a', stroke: '#2f6b2c', 'stroke-width': 2.5, transform: `rotate(-26 ${cx} ${cy})` }));
        kids.push(L(cx - 34, cy + 18, cx + 34, cy - 18, '#2f6b2c', 2));
        for (let k = 0; k < 4; k++) {
          const t = -26 + k * 16;
          kids.push(L(cx + t, cy - t * 0.52, cx + t + 12, cy - t * 0.52 - 12, '#2f6b2c', 1.2));
        }
      });
      // 4. an organ system: the shoot, with stem and leaves
      panel(3, (cx, cy) => {
        kids.push(L(cx, cy + 46, cx, cy - 44, '#3f7d3a', 4));
        kids.push(s('ellipse', { cx: cx - 22, cy: cy - 16, rx: 22, ry: 11, fill: '#8fd18a', stroke: '#2f6b2c', 'stroke-width': 2, transform: `rotate(-28 ${cx - 22} ${cy - 16})` }));
        kids.push(s('ellipse', { cx: cx + 22, cy: cy + 8, rx: 22, ry: 11, fill: '#8fd18a', stroke: '#2f6b2c', 'stroke-width': 2, transform: `rotate(28 ${cx + 22} ${cy + 8})` }));
        kids.push(T(cx, cy + 56, 'stem + leaves', { z: 13, f: '#2f6b2c' }));
      });
      // 5. the whole plant: an organism
      panel(4, (cx, cy) => {
        kids.push(L(cx, cy + 52, cx, cy - 40, '#3f7d3a', 5));
        for (const [dy, dir] of [[-24, -1], [-2, 1], [20, -1]]) {
          kids.push(s('ellipse', { cx: cx + dir * 20, cy: cy + dy, rx: 20, ry: 10, fill: '#8fd18a', stroke: '#2f6b2c', 'stroke-width': 1.8, transform: `rotate(${dir * 30} ${cx + dir * 20} ${cy + dy})` }));
        }
        kids.push(CIRC(cx, cy - 50, 11, '#ffd166', { w: 2 }));
        for (const dx of [-14, -6, 6, 14]) kids.push(L(cx, cy + 52, cx + dx, cy + 72, '#a9743d', 2.5));
      });
      kids.push(T(300, 22, 'the same plant, five sizes', { z: 17, f: '#4a5a6a' }));
      const say = [
        'A cell is the basic unit of life: a stiff wall around the living parts, with a nucleus inside. One cell on its own is the smallest level.',
        'A tissue is a group of similar cells that do the same job together. The epidermis, xylem and phloem are plant tissues.',
        'An organ is different tissues working together to do a bigger job. A leaf is an organ: its epidermis covers it and its veins carry water and food.',
        'An organ system is several organs working together. The shoot, with its stem and leaves, is one system; the root is another.',
        'An organism is all its organ systems working together: here, the whole plant, from root to flower.',
      ][stage];
      return { kids, say };
    },
  },
  microscope: {
    subject: 'science', about: 'A drop of pond water seen through a microscope: moving the slide finds the different groups and turning the magnification up makes them out. Rod-shaped bacteria, yeast that buds, green microalgae and a shape-changing amoeba, all single cells. For the invisible living world, microscopes, microorganisms, bacteria, yeast, algae and amoeba.',
    sliders: [['zoom', 'Magnification', 0, 100, 1, 0], ['at', 'Move the slide', 0, 100, 1, 0]],
    draw(v) {
      const zoom = Math.max(0, Math.min(100, v.zoom));
      const at = Math.max(0, Math.min(100, v.at));
      const mag = Math.round(50 + zoom * 3.5);
      const scale = 6 + zoom * 0.34;
      const p = at * 6;                                  // where the eyepiece is looking, in slide coordinates
      const sx = (home) => home - p + 300;               // slide position -> place on the 600 wide frame
      const kids = [R(0, 0, W, H, '#eef4fa', { w: 0 })];
      const uid = `mc${Math.round(zoom)}-${Math.round(at)}`;
      const field = [];
      const big = zoom > 18;
      // At low magnification a drop still reads as full of life: a scatter of specks in four colours, which is what a
      // child actually sees before turning the lens up.
      if (!big) {
        const specks = [[120, 96, '#7b3fa0'], [180, 124, '#d9a441'], [236, 168, '#3fa34d'], [300, 198, '#3a86ff'],
          [356, 92, '#3fa34d'], [420, 112, '#7b3fa0'], [478, 140, '#d9a441'], [524, 186, '#3fa34d'],
          [560, 210, '#7b3fa0'], [92, 62, '#3a86ff'], [280, 62, '#3a86ff'], [500, 96, '#3a86ff'],
          [548, 170, '#d9a441'], [110, 232, '#3a86ff'], [404, 232, '#7b3fa0']];
        for (const [dx, dy, col] of specks) field.push(CIRC(sx(dx), dy, 2.4, col, { w: 0 }));
      }
      // bacteria: tiny rods, in pairs and short chains
      for (const [bx, by] of [[64, 104], [76, 146], [68, 188], [128, 116], [140, 158], [132, 200]]) {
        const x = sx(bx);
        if (big) {
          field.push(R(x - scale * 0.9, by - scale * 0.35, scale * 1.8, scale * 0.7, '#7b3fa0', { w: 1.5, r: scale * 0.35 }));
          if (zoom > 70) field.push(R(x + scale * 0.9, by - scale * 0.35, scale * 1.8, scale * 0.7, '#9a5cbd', { w: 1.5, r: scale * 0.35 }));
        } else field.push(CIRC(x, by, 2.2, '#7b3fa0'));
      }
      // yeast: round cells, one with a bud
      for (const [yx, yy, bud] of [[300, 116, 0], [296, 152, 1], [304, 186, 0]]) {
        const x = sx(yx);
        if (big) {
          field.push(CIRC(x, yy, scale * 0.55, '#d9a441', { w: 2 }));
          if (bud) field.push(CIRC(x + scale * 0.75, yy - scale * 0.5, scale * 0.26, '#e8c27a', { w: 1.5 }));
        } else field.push(CIRC(x, yy, 2.2, '#d9a441'));
      }
      // microalgae: green cells in a small colony
      for (const [gx, gy] of [[498, 120], [524, 138], [504, 160], [530, 178], [498, 188]]) {
        const x = sx(gx);
        if (big) field.push(CIRC(x, gy, scale * 0.42, '#3fa34d', { w: 1.5 }));
        else field.push(CIRC(x, gy, 2.2, '#3fa34d'));
      }
      // amoeba: one cell whose shape changes as it moves
      {
        const x = sx(620), y = 150;
        if (big) {
          const pts = [];
          for (let i = 0; i < 40; i++) {
            const a = (i / 40) * Math.PI * 2;
            const rr = scale * (1 + 0.2 * Math.sin(3 * a + 1) + 0.08 * Math.sin(5 * a));
            pts.push(`${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`);
          }
          field.push(s('polygon', { points: pts.join(' '), fill: '#bde0fe', stroke: INK, 'stroke-width': 2 }));
          field.push(CIRC(x, y, scale * 0.22, '#3a86ff', { w: 1.5 }));
        } else field.push(CIRC(x, y, 2.2, '#3a86ff'));
      }
      kids.push(s('clipPath', { id: uid }, [CIRC(300, 150, 118, '#fff')]));
      kids.push(s('g', { 'clip-path': `url(#${uid})` }, [CIRC(300, 150, 118, '#f7fcff', { w: 0 }), ...field]));
      kids.push(CIRC(300, 150, 118, 'none', { w: 6, s: '#2a1a4a' }));
      kids.push(T(300, 292, `about ${mag}x`, { z: 18, f: '#4a5a6a' }));
      const group = p < 200 ? 0 : p < 400 ? 1 : p < 560 ? 2 : 3;
      const say = !big
        ? `At ${mag}x a drop of pond water looks almost empty: only tiny specks. Your eyes could never see these at all. Turn the magnification up to make them out.`
        : [
          `Bacteria at ${mag}x: single cells shaped like tiny rods, some in pairs or chains. They are far too small to see without a lens.`,
          `Yeast at ${mag}x: a fungus that is one round cell. The small bump is a bud growing out of it, which can break off as a new cell.`,
          `Microalgae at ${mag}x: green single cells that make their own food from sunlight, as a leaf does.`,
          `Amoeba at ${mag}x: a single cell that keeps changing shape as it moves, with its nucleus inside.`,
        ][group];
      return { kids, say };
    },
  },
  landform: {
    subject: 'social', about: 'A walk across the land from a snow-capped mountain, over a plateau, across a river plain and into a desert, with the read-out saying what makes each landform what it is. For landforms, mountains, plateaus, plains and deserts, and how people live on them.',
    sliders: [['x', 'Walk across the land', 0, 100, 1, 0]],
    draw(v) {
      // The ground line the child walks on, in the 600 x 300 frame: peak at 60, plateau top 170..255, plain, desert dunes.
      const PROFILE = [
        [0, 242], [30, 230], [55, 168], [72, 108], [90, 168], [112, 228], [140, 236],
        [160, 210], [178, 141], [255, 141],
        [272, 205], [300, 205], [420, 197], [452, 206], [480, 199], [520, 209], [560, 201], [600, 210],
      ];
      const groundAt = (px) => {
        for (let i = 1; i < PROFILE.length; i++) {
          if (px <= PROFILE[i][0]) {
            const [x0, y0] = PROFILE[i - 1], [x1, y1] = PROFILE[i];
            return y0 + ((y1 - y0) * (px - x0)) / (x1 - x0 || 1);
          }
        }
        return PROFILE[PROFILE.length - 1][1];
      };
      const px = Math.max(0, Math.min(100, v.x)) * 6;
      const kids = [R(0, 0, W, H, '#eaf6ff', { w: 0 })];
      const outline = [[0, H], ...PROFILE, [W, H]].map(([a, b]) => `${a},${b}`).join(' ');
      kids.push(s('polygon', { points: outline, fill: '#cfe8c2', stroke: INK, 'stroke-width': 3 }));
      // sand over the dry end of the walk
      kids.push(s('polygon', { points: '452,300 452,206 480,199 520,209 560,201 600,210 600,300', fill: '#f0dfb2', stroke: INK, 'stroke-width': 3 }));
      // snow on the summit, where it never melts
      kids.push(s('polygon', { points: '56,152 72,108 88,152', fill: '#ffffff', stroke: INK, 'stroke-width': 2 }));
      // the river that carries sediment across the plain
      kids.push(s('path', { d: 'M 250 146 C 292 172 310 192 344 198 T 440 200', fill: 'none', stroke: '#4a90d9', 'stroke-width': 5, 'stroke-linecap': 'round' }));
      for (const [fx, fw, col] of [[300, 34, '#9cc46f'], [340, 30, '#b8d489'], [386, 32, '#9cc46f'], [420, 26, '#b8d489']]) {
        kids.push(R(fx, groundAt(fx) + 3, fw, 14, col, { w: 1.5, s: '#7f9b5c' }));
      }
      kids.push(s('path', { d: 'M 470 210 Q 490 192 512 208', fill: 'none', stroke: '#c9ab6a', 'stroke-width': 3 }));
      kids.push(s('path', { d: 'M 528 212 Q 552 194 578 210', fill: 'none', stroke: '#c9ab6a', 'stroke-width': 3 }));
      kids.push(T(26, 198, 'mountain', { z: 16, a: 'start', f: '#4a5a6a' }));
      kids.push(T(212, 122, 'plateau', { z: 16, f: '#4a5a6a' }));
      kids.push(T(370, 182, 'plain', { z: 16, f: '#4a5a6a' }));
      kids.push(T(530, 186, 'desert', { z: 16, f: '#4a5a6a' }));
      // the child, standing on the ground at this point of the walk
      const gy = groundAt(px);
      kids.push(CIRC(px, gy - 30, 7, C.y, { w: 2 }));
      kids.push(L(px, gy - 23, px, gy - 8, INK, 3));
      kids.push(L(px, gy - 8, px - 7, gy, INK, 3), L(px, gy - 8, px + 7, gy, INK, 3));
      const zone = px < 150 ? 0 : px < 272 ? 1 : px < 452 ? 2 : 3;
      const say = [
        'A mountain is much higher than the land around it, with a broad base, steep slopes and a narrow summit. At very high altitude snow never melts, so the top stays snowcapped.',
        'A plateau is raised land with a broad top that is more or less flat. Some are a few hundred metres high and some are several thousand.',
        'A plain is low and flat: it rises no more than about 300 metres above sea level. Rivers carry sediment and spread it, and those deposits make very fertile soil, which is why the first civilisations grew beside rivers.',
        'A desert gets very little rain. The Sahara and the Thar are hot deserts and the Gobi is a cold one, and people have adapted to living in all of them.',
      ][zone];
      return { kids, say };
    },
  },
  reproduce: {
    subject: 'science', about: 'How one parent makes more of itself: an amoeba splits in two (binary fission), yeast grows a bud that breaks off (budding), spirogyra breaks into pieces that each grow (fragmentation), rhizopus lets spores drift away, and a potato sprouts new plants from its eyes (vegetative propagation). For how organisms reproduce, asexual reproduction, fission, budding, fragmentation, spores, vegetative propagation.',
    sliders: [['mode', 'Choose the living thing', 0, 4, 1, 0], ['grown', 'Let it grow', 0, 10, 1, 0]],
    draw(v) {
      const names = ['Amoeba', 'Yeast', 'Spirogyra', 'Rhizopus', 'Potato'];
      const how = ['binary fission', 'budding', 'fragmentation', 'spore formation', 'vegetative propagation'];
      const m = Math.max(0, Math.min(4, v.mode | 0)), t = Math.max(0, Math.min(10, v.grown | 0)) / 10;
      const kids = [R(0, 0, W, H, '#fbfdf9', { w: 0 })];
      kids.push(T(16, 30, names[m], { z: 22, a: 'start' }), T(584, 30, how[m], { z: 15, a: 'end', f: '#6b5a8a', w: 600 }));
      const cell = (cx, cy, r, fill) => kids.push(CIRC(cx, cy, r, fill, { w: 3 }));
      // An amoeba has no fixed shape: a wobbly outline reads as one far better than a circle does.
      const blob = (cx, cy, r, phase) => {
        const pts = [];
        for (let i = 0; i < 44; i++) {
          const a = (i / 44) * Math.PI * 2;
          const rr = r * (1 + 0.15 * Math.sin(3 * a + phase) + 0.07 * Math.sin(5 * a - phase));
          pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
        }
        kids.push(s('polygon', { points: pts.join(' '), fill: '#e8f7ff', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }));
      };
      let say = '';
      if (m === 0) {
        // Binary fission: the one cell copies what is inside it, then the middle pinches until there are two.
        const d = t * 72, r = 62 - t * 13;
        if (t < 0.05) {
          blob(300, 172, 62, 0.4);
          kids.push(CIRC(300, 172, 21, C.b, { w: 2 }));
        } else {
          blob(300 - d, 172, r, 0.4);
          blob(300 + d, 172, r, 2.1);
          kids.push(CIRC(300 - d, 172, 18, C.b, { w: 2 }), CIRC(300 + d, 172, 18, C.b, { w: 2 }));
        }
        say = t >= 0.8
          ? 'One amoeba has become two identical amoebas. One parent made both and no partner was needed: that is binary fission.'
          : 'The amoeba copies the nucleus inside it, then the one cell pinches in the middle.';
      } else if (m === 1) {
        // Budding: a small bud grows out of the parent and then lives on its own.
        const br = 8 + t * 26, bx = 300 + 58 + t * 22, by = 172 - 20 * t;
        cell(300, 172, 62, '#fff6e0');
        kids.push(CIRC(300, 172, 18, C.y, { w: 2 }), CIRC(bx, by, br, '#ffe9b3', { w: 3 }));
        if (br > 16) kids.push(CIRC(bx, by, br * 0.42, C.y, { w: 2 }));
        say = t >= 0.8
          ? 'The bud is nearly as big as its parent and will break off as a new yeast cell. One parent made it: that is budding.'
          : 'A small bud grows out of the yeast cell and slowly gets bigger.';
      } else if (m === 2) {
        // Fragmentation: the green thread breaks, and each piece grows into a new thread.
        const gap = t * 52;
        for (let i = 0; i < 4; i++) {
          const x = 108 + i * 96 + (i > 1 ? gap : -gap * 0.5);
          kids.push(R(x, 146, 90, 52, '#dcf2c8', { w: 3, r: 8 }));
          const pts = [];
          for (let k = 0; k <= 10; k++) pts.push(`${x + 6 + k * 7.8},${k % 2 ? 156 : 188}`);
          kids.push(s('polyline', { points: pts.join(' '), fill: 'none', stroke: '#3f7d3a', 'stroke-width': 2.5 }));
        }
        say = t >= 0.8
          ? 'The thread has broken into pieces, and each piece can grow into a whole new spirogyra. That is fragmentation.'
          : 'Spirogyra is a green thread of cells. When the thread breaks, each piece can grow on its own.';
      } else if (m === 3) {
        // Spore formation: the spore case opens and the spores drift away to grow wherever they land.
        kids.push(L(300, 250, 300, 132, '#7a5c3e', 6), L(268, 250, 300, 214, '#7a5c3e', 4), L(332, 250, 300, 214, '#7a5c3e', 4));
        kids.push(CIRC(300, 118, 32, '#f0d3a0', { w: 3 }), CIRC(300, 118, 13, '#b98c4a', { w: 2 }));
        for (let i = 0; i < 5; i++) {
          // Keep every spore inside the frame: the ones that drift straight up would leave the picture at full stretch.
          const a = ((-160 + i * 35) * Math.PI) / 180, dist = 34 + t * 62;
          kids.push(CIRC(300 + Math.cos(a) * dist, 118 + Math.sin(a) * dist, 6, C.o, { w: 2 }));
        }
        say = t >= 0.8
          ? 'The case at the top holds spores. Each spore can grow into a new rhizopus when it lands on food.'
          : 'Rhizopus grows a stalk with a round case on top, and the case fills with spores.';
      } else {
        // Vegetative propagation: a potato's eyes sprout into new plants.
        kids.push(s('ellipse', { cx: 286, cy: 208, rx: 104, ry: 58, fill: '#d9b48a', stroke: INK, 'stroke-width': 3 }));
        for (const [ex, ey] of [[226, 196], [280, 232], [340, 190], [382, 224]]) kids.push(CIRC(ex, ey, 8, '#a97c4d', { w: 2 }));
        const sh = t * 104, x0 = 340, y0 = 190, ly = y0 - sh;
        kids.push(L(x0, y0, x0 + sh * 0.18, ly, '#3f7d3a', 5));
        if (sh > 26) {
          kids.push(s('ellipse', { cx: x0 + sh * 0.18 - 26, cy: ly + 22, rx: 26, ry: 12, fill: '#5fae4f', stroke: INK, 'stroke-width': 2, transform: `rotate(-24 ${x0 + sh * 0.18 - 26} ${ly + 22})` }));
          kids.push(s('ellipse', { cx: x0 + sh * 0.18 + 26, cy: ly + 44, rx: 26, ry: 12, fill: '#5fae4f', stroke: INK, 'stroke-width': 2, transform: `rotate(24 ${x0 + sh * 0.18 + 26} ${ly + 44})` }));
        }
        say = t >= 0.8
          ? 'The eyes of the potato have sprouted into new plants. Each sprout can become a whole potato plant: that is vegetative propagation.'
          : 'The potato has eyes. Left in the soil, each eye can sprout into a new plant.';
      }
      return { kids, say };
    },
  },

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
    params: { events: [] }, dynamicSliders: (p) => { const y = (p.events || []).map((e) => e.year); const lo = Math.min(...y), hi = Math.max(...y), pad = Math.max(50, Math.round((hi - lo) / 10)); // Start on the first event, not before it: opening on an empty timeline tells a child "No event yet" at the one
      // moment it is meant to interest them. Scrubbing back is still possible.
      return [['y', words('moveThroughTime'), lo - pad, hi + pad, Math.max(1, Math.round((hi - lo) / 100)), Math.min(...y)]]; },
    draw(v, p, t, sl) {
      sl = sl && sl.length ? sl : (this.dynamicSliders ? this.dynamicSliders(p) : []);
      const [, , lo, hi] = sl[0], X = (y) => 30 + ((y - lo) / (hi - lo)) * 540, kids = [L(30, 180, 570, 180, INK, 6)];
      const events = (p.events || []).slice().sort((a, b) => a.year - b.year);
      if (lo < 0 && hi > 0) { kids.push(L(X(0), 165, X(0), 195, C.p, 4), T(X(0), 216, `${words('bce')} | ${words('ce')}`, { z: 17 })); }
      events.forEach((e) => kids.push(CIRC(X(e.year), 180, 9, v.y >= e.year ? C.g : '#fff', { w: 3 })));
      // the events reached so far, newest last, as dated lines across the top (at most four, each cut at a whole word)
      const fit = (str) => (str.length > 54 ? `${str.slice(0, 54).replace(/\s+\S*$/, '')}...` : str);
      events.filter((e) => v.y >= e.year).slice(-4).forEach((e, i) => kids.push(T(30, 30 + i * 30, `${year(e.year)}: ${fit(e.label)}`, { z: 17, a: 'start', w: 600 })));
      kids.push(L(X(v.y), 150, X(v.y), 210, C.o, 5));
      const last = events.filter((e) => e.year <= v.y).pop();
      // 'ई.' already ends in a full stop, so it takes a space instead of another dot
      return { kids, say: `${year(v.y)}${/\.$/.test(year(v.y)) ? ' ' : '. '}${last ? words('mostRecentEvent', { label: last.label, year: year(last.year) }) : words('noEventYet')}` };
    },
  },
  timezone: {
    subject: 'social', about: 'A world strip of longitudes; local time is 4 minutes earlier or later per degree, 1 hour per 15 degrees, from Greenwich. For longitude, time zones, standard time, the Prime Meridian.',
    sliders: [['lon', 'Longitude (negative = west)', -180, 180, 15, 0], ['gmt', 'Time at Greenwich (hour)', 0, 23, 1, 12]],
    draw(v) {
      const X = (d) => 300 + d * (270 / 180), kids = [R(30, 60, 540, 150, C.sky, { w: 3, r: 6 })];
      for (let d = -180; d <= 180; d += 45) { kids.push(L(X(d), 60, X(d), 210, d === 0 ? C.o : INK, d === 0 ? 4 : 1.5)); kids.push(T(X(d), 238, d === 0 ? '0' : `${Math.abs(d)}${d < 0 ? 'W' : 'E'}`, { z: 16 })); }
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
      for (const [d, n, c] of [[0, 'Equator', C.o], [23.5, 'Tropic of Cancer', C.g], [-23.5, 'Tropic of Capricorn', C.g], [66.5, 'Arctic Circle', C.p], [-66.5, 'Antarctic Circle', C.p]]) { kids.push(L(30, Y(d), 570, Y(d), c, 2)); kids.push(T(36, Y(d) - 5, n, { a: 'start', z: 15, f: c })); }
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
      for (let c = 0; c <= 10; c++) { kids.push(L(70 + c * 48, 225, 70 + c * 48, c % 5 === 0 ? 250 : 240, INK, 2)); kids.push(T(70 + c * 48, 274, c, { z: 16 })); }
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
  motiongraph: {
    subject: 'science', about: 'A car moving in a straight line with its position-time graph drawn as it goes. The slope of the graph is the speed: a flat line means stopped, a straight climbing line means steady speed, and a bend means the car is speeding up or slowing down. For motion, position-time and velocity-time graphs, uniform and non-uniform motion, acceleration and the kinematic equations.',
    sliders: [['u', 'Starting speed (metres per second)', 0, 12, 2, 6], ['acc', 'Acceleration (metres per second squared)', -2, 2, 1, 1], ['t', 'Time shown (seconds)', 1, 10, 1, 5]],
    draw(v) {
      const u = v.u, acc = v.acc, tf = v.t, pos = (x) => u * x + 0.5 * acc * x * x, now = pos(tf), vNow = u + acc * tf;
      const lo = Math.min(0, Math.floor(now / 50) * 50), hi = Math.max(50, Math.ceil(Math.max(now, 0) / 50) * 50);
      const X = (x) => 64 + x * 47, Y = (m) => 268 - ((m - lo) / (hi - lo)) * 220, kids = [];
      for (let x = 0; x <= 10; x++) kids.push(L(X(x), Y(hi), X(x), Y(lo), x === 0 ? '#8a7aa8' : '#ece8f5', 1.5));
      for (let m = Math.ceil(lo / 50) * 50; m <= hi; m += 50) kids.push(L(X(0), Y(m), X(10), Y(m), m === 0 ? '#8a7aa8' : '#ece8f5', 1.5));
      for (let x = 0; x <= 10; x += 2) kids.push(T(X(x), Y(lo) + 20, x, { z: 15, w: 600, f: '#6b5a8a' }));
      for (let m = Math.ceil(lo / 50) * 50; m <= hi; m += 50) kids.push(T(X(0) - 8, Y(m) + 5, m, { z: 15, w: 600, f: '#6b5a8a', a: 'end' }));
      kids.push(T(X(10) - 6, Y(lo) - 14, 'time (s)', { z: 15, f: '#6b5a8a', a: 'end' }), T(X(0) - 44, Y(hi) - 10, 'position (m)', { z: 15, f: '#6b5a8a', a: 'start' }));
      const pts = [];
      for (let x = 0; x <= tf + 1e-9; x += 0.1) pts.push(`${X(x).toFixed(1)},${Y(pos(x)).toFixed(1)}`);
      pts.push(`${X(tf)},${Y(now)}`);
      kids.push(...clipTo('xp-motion', X(0), Y(hi) - 4, X(10) - X(0), Y(lo) - Y(hi) + 8, [s('polyline', { points: pts.join(' '), fill: 'none', stroke: C.p, 'stroke-width': 6, 'stroke-linejoin': 'round' })]));
      kids.push(CIRC(X(tf), Y(now), 8, C.o, { w: 3 }));
      if (tf >= 1) {
        const p0 = pos(tf - 1);
        kids.push(L(X(tf - 1), Y(p0), X(tf), Y(p0), C.g, 3, { 'stroke-dasharray': '6 5' }), L(X(tf), Y(p0), X(tf), Y(now), C.b, 3, { 'stroke-dasharray': '6 5' }));
        kids.push(T(X(tf - 0.5), Y(p0) + (now >= p0 ? 22 : -12), '1 s', { z: 15, f: '#058a68' }), T(X(tf) + 8, Y((p0 + now) / 2), `${num(now - p0)} m`, { z: 15, f: '#3a86ff', a: 'start' }));
      }
      const shape = u === 0 && acc === 0 ? 'The line is flat, so the car is standing still.' : acc === 0 ? 'The line is straight, so the speed is steady.' : acc > 0 ? 'The line bends upward, so the car is speeding up.' : 'The line bends downward, so the car is slowing down.';
      return { kids, say: `After ${tf} second${tf === 1 ? '' : 's'} the car is ${num(now)} m from its start and moving at ${num(vNow)} m/s. ${shape}` };
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
  moonphase: {
    subject: 'science', about: 'The Moon going round the Earth lit by the Sun, with the shape seen from Earth beside it. Half the Moon is always lit; as the Moon moves round we see more or less of that lit half, so it grows from new Moon to full Moon and shrinks back again. For the phases of the Moon, new Moon, full Moon, waxing and waning, crescent and gibbous, Shukla Paksha, Krishna Paksha, Purnima, Amavasya, the lunar month, calendars and Moon festivals.',
    sliders: [['day', 'Days after the new Moon', 0, 29, 1, 3]],
    draw(v) {
      const day = Math.max(0, Math.min(29, v.day));
      const e = (day / 29.5) * 360;                 // how far the Moon has gone round since the new Moon
      const k = (1 - Math.cos(rad(e))) / 2;         // the part of the face we see that is lit
      const waning = e > 180;
      const cx = 306, cy = 172, orbit = 104, sx = 44, sy = 172;
      const mx = cx - orbit * Math.cos(rad(e));     // at the new Moon the Moon sits between Earth and Sun, on the left
      const my = cy + orbit * Math.sin(rad(e));
      const kids = [R(0, 0, W, H, '#12123a', { w: 0 })];
      kids.push(CIRC(sx, sy, 44, C.y, { s: C.y }), T(sx, sy + 60, 'Sun', { z: 14, f: '#ffe9a8' }));
      kids.push(s('circle', { cx, cy, r: orbit, fill: 'none', stroke: '#8f9bd6', 'stroke-width': 2, 'stroke-dasharray': '6 8' }));
      kids.push(CIRC(cx, cy, 33, C.b, { s: '#dbe9ff' }), T(cx, cy + 50, 'Earth', { z: 14, f: '#cfe0ff' }));
      kids.push(CIRC(mx, my, 14, '#4b4b66', { s: '#fff', w: 1.5 }));
      kids.push(...clipTo(`mpMoon${Math.round(mx)}_${Math.round(my)}`, mx - 14, my - 14, 14, 28, [CIRC(mx, my, 14, '#f5f1e6', { s: 'none', w: 0 })]));
      // the same Moon as a child sees it from Earth
      const ix = 514, iy = 96, ir = 52, litSide = waning ? -1 : 1;
      kids.push(T(ix, iy + ir + 20, 'the Moon seen from Earth', { z: 12, f: '#cfd6ff', w: 600 }));
      kids.push(CIRC(ix, iy, ir, '#232347', { s: '#cfd6ff', w: 2 }));
      kids.push(...clipTo(`mpLit${day}`, litSide < 0 ? ix - ir : ix, iy - ir, ir, 2 * ir, [CIRC(ix, iy, ir, '#f5f1e6', { s: 'none', w: 0 })]));
      if (k > 0.5) {
        kids.push(...clipTo(`mpBulge${day}`, litSide < 0 ? ix : ix - ir, iy - ir, ir, 2 * ir, [s('ellipse', { cx: ix, cy: iy, rx: (2 * k - 1) * ir, ry: ir, fill: '#f5f1e6' })]));
      } else if (k < 0.5) {
        kids.push(...clipTo(`mpDark${day}`, litSide < 0 ? ix - ir : ix, iy - ir, ir, 2 * ir, [s('ellipse', { cx: ix, cy: iy, rx: (1 - 2 * k) * ir, ry: ir, fill: '#232347' })]));
      }
      const pct = Math.round(k * 100);
      const name = e < 11.25 ? 'new Moon' : e < 78.75 ? 'waxing crescent' : e < 101.25 ? 'first quarter' : e < 168.75 ? 'waxing gibbous' : e < 191.25 ? 'full Moon' : e < 258.75 ? 'waning gibbous' : e < 281.25 ? 'last quarter' : e < 348.75 ? 'waning crescent' : 'new Moon';
      const local = e < 11.25 || e > 348.75 ? 'Amavasya' : e < 168.75 ? 'Shukla Paksha, the growing half' : e < 191.25 ? 'Purnima' : e < 348.75 ? 'Krishna Paksha, the shrinking half' : 'Amavasya';
      kids.push(T(300, 26, `Day ${day} after the new Moon: ${name}`, { z: 19, f: '#f4f2ff' }));
      kids.push(T(300, 292, pct === 0 ? 'None of the face we see is lit.' : pct === 100 ? 'The whole face we see is lit.' : `${pct}% of the face we see is lit, on the ${waning ? 'left' : 'right'}.`, { z: 15, w: 600, f: '#cfd6ff' }));
      const say = day === 0
        ? 'This is the new Moon: the lit half faces away from us, so we cannot see the Moon at all. This day is called Amavasya.'
        : day === 15
          ? 'This is the full Moon: the lit half faces us completely, so we see a full circle. This day is called Purnima, and the Moon is nearly opposite the Sun.'
          : `On day ${day} after the new Moon we see the ${name}. Half of the Moon is always lit by the Sun, and ${pct}% of the face turned towards us is lit, on the ${waning ? 'left' : 'right'}. ${waning ? 'The bright part is shrinking: this is the waning half, Krishna Paksha.' : 'The bright part is growing: this is the waxing half, Shukla Paksha.'} The Moon's own shape never changes. (${local}.)`;
      return { kids, say };
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
  energysource: {
    subject: 'science', about: 'A small power station fed by one source at a time: the Sun, wind, water or coal. Sun, wind and water make electricity with no smoke, while burning coal sends up smoke and dirty air. For sources of energy, clean energy, solar panels, windmills and hydel power.',
    sliders: [['source', 'Where the energy comes from (1 Sun, 2 Wind, 3 Water, 4 Coal)', 1, 4, 1, 3]],
    draw(v) {
      const k = v.source, kids = [R(0, 0, W, H, k === 4 ? '#e6e2e8' : '#e8f6ff', { w: 0 }), R(0, 236, W, 64, '#cdeac0', { w: 0 })];
      if (k === 1) {
        for (let i = 0; i < 12; i++) { const a = i * 30; kids.push(L(120 + Math.cos(rad(a)) * 46, 92 - Math.sin(rad(a)) * 46, 120 + Math.cos(rad(a)) * 64, 92 - Math.sin(rad(a)) * 64, C.y, 5)); }
        kids.push(CIRC(120, 92, 38, C.y, { w: 3 }), T(120, 154, 'Sun', { z: 17 }));
      }
      if (k === 2) {
        kids.push(L(120, 232, 120, 108, '#8d99ae', 9));
        for (const a of [90, 210, 330]) kids.push(L(120, 104, 120 + Math.cos(rad(a)) * 62, 104 - Math.sin(rad(a)) * 62, C.b, 8, { 'stroke-linecap': 'round' }));
        kids.push(CIRC(120, 104, 9, INK), R(92, 140, 56, 24, '#fff', { w: 0, r: 5 }), T(120, 157, 'Wind', { z: 17 }));
        for (let i = 0; i < 3; i++) kids.push(L(16 + i * 8, 66 + i * 18, 82 + i * 8, 66 + i * 18, C.b, 4, { 'stroke-dasharray': '9 7' }));
      }
      if (k === 3) {
        kids.push(R(16, 168, 210, 34, '#a9def9', { w: 0 }));
        kids.push(s('path', { d: 'M 16 180 Q 54 166 92 180 T 168 180 T 226 180', fill: 'none', stroke: '#0077b6', 'stroke-width': 5 }));
        kids.push(CIRC(120, 180, 34, '#dff3ff', { w: 5 }));
        for (let i = 0; i < 6; i++) { const a = i * 60; kids.push(L(120, 180, 120 + Math.cos(rad(a)) * 30, 180 - Math.sin(rad(a)) * 30, '#0077b6', 4)); }
        kids.push(T(120, 152, 'Water', { z: 17 }));
      }
      if (k === 4) {
        kids.push(R(62, 190, 116, 42, '#3d3d3d', { r: 8 }), CIRC(96, 190, 20, '#3d3d3d'), CIRC(142, 190, 18, '#3d3d3d'));
        kids.push(s('polygon', { points: '146,188 168,140 190,188', fill: C.o, stroke: INK }), CIRC(120, 206, 8, C.y, { w: 0 }));
        kids.push(CIRC(168, 168, 16, '#b8b8c0', { w: 0 }), CIRC(190, 138, 21, '#c9c9d1', { w: 0 }), CIRC(166, 106, 25, '#dadade', { w: 0 }), T(120, 154, 'Coal', { z: 17 }));
        kids.push(T(196, 232, 'smoke and dirty air', { z: 13, w: 600, a: 'start' }));
      }
      kids.push(R(258, 116, 104, 96, '#fff', { r: 12 }), T(310, 154, 'power', { z: 16 }), T(310, 176, 'station', { z: 16 }));
      kids.push(L(362, 164, 414, 164, INK, 5), L(414, 164, 414, 126, INK, 5), L(414, 126, 434, 126, INK, 5));
      kids.push(R(434, 132, 18, 26, '#b9b9c6', { r: 3 }), CIRC(468, 118, 32, k === 4 ? '#ffe28a' : '#ffd60a', { w: 3 }));
      for (let i = 0; i < 8; i++) { const a = i * 45; kids.push(L(468 + Math.cos(rad(a)) * 38, 118 - Math.sin(rad(a)) * 38, 468 + Math.cos(rad(a)) * 50, 118 - Math.sin(rad(a)) * 50, C.y, 4)); }
      kids.push(T(468, 172, 'light', { z: 15 }));
      kids.push(T(300, 280, k === 4 ? 'Burning coal: smoke and harmful gases' : 'Clean energy: no smoke', { z: 16, f: k === 4 ? '#8a4b1f' : '#067a4e' }));
      return { kids, say: [
        'Sunlight gives light and heat, and solar panels turn it into electricity without any smoke. The Sun is the main source of energy for life on Earth.',
        'Moving air turns the blades of a windmill, and the turning makes electricity. Wind is clean energy: it gives no smoke.',
        'Fast rivers and falling water turn machines that make electricity. In hilly areas, gharaats use flowing water to grind grain. Water power is clean energy.',
        'Burning coal makes most of our electricity, but it sends up smoke and harmful gases that dirty the air. Coal is not clean energy.',
      ][k - 1] };
    },
  },
  spinner: {
    subject: 'science', about: 'A card on a spindle spun by hand, at any speed from still to fast. As it turns, the corners of a square or triangle card sweep round and the card looks round, and the colours painted on it blur into one mixed colour. For spinners, spinning tops, the charkha, why a spinning square card looks circular and mixing colours by spinning.',
    sliders: [['turn', 'How fast it spins', 0, 10, 1, 0], ['shape', 'Card shape: square, triangle or hexagon', 0, 2, 1, 0], ['colours', 'Number of colours: two, four or six', 0, 2, 1, 0]],
    draw(v) {
      const cx = 185, cy = 155, rr = 108, sides = [4, 3, 6][v.shape], shapeName = ['square', 'triangle', 'hexagon'][v.shape];
      const pal = [['#e63946', '#fff7e8'], ['#e63946', '#ffb703', '#06a77d', '#3a86ff'], ['#e63946', '#ff9505', '#ffd60a', '#06a77d', '#3a86ff', '#8338ec']][v.colours];
      const ncols = pal.length, pt = (i) => { const a = rad(-90 + (360 * i) / sides); return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
      const polyStr = [...Array(sides).keys()].map((i) => pt(i).join(',')).join(' ');
      const clipId = `spinner-card-${sides}-${ncols}`;
      const wedge = (i) => { const a0 = rad(-90 + (360 * i) / ncols), a1 = rad(-90 + (360 * (i + 1)) / ncols), big = rr * 2.2; return `M ${cx} ${cy} L ${cx + big * Math.cos(a0)} ${cy + big * Math.sin(a0)} A ${big} ${big} 0 0 1 ${cx + big * Math.cos(a1)} ${cy + big * Math.sin(a1)} Z`; };
      const wedges = () => pal.map((col, i) => s('path', { d: wedge(i), fill: col, stroke: 'none' }));
      const cardAt = (angle, op) => s('g', { transform: `rotate(${angle} ${cx} ${cy})`, opacity: op }, [s('g', { 'clip-path': `url(#${clipId})` }, wedges()), s('polygon', { points: polyStr, fill: 'none', stroke: INK, 'stroke-width': 3.5 })]);
      const mix = pal.reduce((acc, h) => { const q = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return acc.map((z, i) => z + q[i]); }, [0, 0, 0]).map((z) => Math.round(z / ncols));
      const mixed = `rgb(${mix[0]},${mix[1]},${mix[2]})`;
      const kids = [R(0, 0, W, H, '#fbf8ff', { w: 0 }), s('clipPath', { id: clipId }, s('polygon', { points: polyStr }))];
      const spread = Math.min(24, v.turn * 2.6);
      if (v.turn > 0) for (let k = 4; k >= 1; k--) kids.push(cardAt(k * spread, 0.28 - k * 0.045), cardAt(-k * spread, 0.28 - k * 0.045));
      kids.push(cardAt(0, v.turn > 0 ? 0.9 : 1));
      if (v.turn > 0) kids.push(CIRC(cx, cy, rr, mixed, { w: 0, s: 'none', x: { opacity: 0.72 * (v.turn / 10) } }));
      kids.push(CIRC(cx, cy, 7, '#b9c2cf', { w: 2, s: '#6b7280' }), L(cx, cy + 8, cx, cy + 46, '#6b7280', 5));
      kids.push(T(cx, 292, 'spun by hand', { z: 12, w: 600, f: '#6b5a8a' }));
      kids.push(T(370, 58, v.turn === 0 ? 'Standing still' : v.turn < 6 ? 'Turning slowly' : 'Spinning fast', { z: 19, a: 'start', f: v.turn < 6 ? INK : '#c2510e' }));
      kids.push(T(370, 96, `shape: ${shapeName}`, { z: 15, w: 600, a: 'start', f: '#6b5a8a' }), T(370, 122, `colours: ${ncols}`, { z: 15, w: 600, a: 'start', f: '#6b5a8a' }));
      if (v.turn >= 6) kids.push(CIRC(384, 176, 22, mixed, { w: 2 }), T(384, 225, 'one mixed colour', { z: 13, w: 600 }));
      const say = v.turn === 0 ? `The card is still, so you see its real shape: a ${shapeName} with ${ncols} colours on it.` : v.turn < 6 ? `The ${shapeName} card is turning. Its corners are beginning to smear and its ${ncols} colours are starting to blur.` : `Spinning fast, the ${shapeName} card's corners sweep round too quickly for your eyes to follow, so the card looks like a circle, and its ${ncols} colours blur into one mixed colour. The card itself has not changed shape or colour.`;
      return { kids, say };
    },
  },
  lever: {
    subject: 'science', about: 'A lever: a beam on a fulcrum with a load on one arm and an effort pushing down on the other. The beam tips according to load times load arm against effort times effort arm, and the read-out gives the effort needed to balance and the mechanical advantage. For levers, simple machines, effort, load, fulcrum and mechanical advantage.',
    sliders: [['effortArm', 'Effort arm (metres)', 1, 5, 1, 3], ['loadArm', 'Load arm (metres)', 1, 5, 1, 2], ['load', 'Load (newtons)', 20, 100, 20, 60], ['effort', 'Effort you push with (newtons)', 10, 120, 10, 60]],
    draw(v) {
      const px = 44, pivot = 300, beamY = 150, loadX = pivot - v.loadArm * px, effortX = pivot + v.effortArm * px;
      const loadM = v.load * v.loadArm, effortM = v.effort * v.effortArm, diff = effortM - loadM, balanced = Math.abs(diff) < 0.5;
      const tilt = Math.max(-10, Math.min(10, diff / 30)), need = v.load * v.loadArm / v.effortArm, ma = v.load / v.effort;
      const beam = s('g', { transform: `rotate(${tilt} ${pivot} ${beamY})` }, [
        R(pivot - v.loadArm * px - 22, beamY - 9, (v.loadArm + v.effortArm) * px + 44, 18, '#d4a72c', { w: 3, r: 5 }),
        R(loadX - 24, beamY - 58, 48, 48, '#8338ec', { w: 3, r: 4 }),
        T(loadX, beamY - 27, `${v.load} N`, { z: 14, f: '#fff' }),
        L(effortX, beamY - 96, effortX, beamY - 24, C.b, 6),
        s('polygon', { points: `${effortX},${beamY - 10} ${effortX - 11},${beamY - 34} ${effortX + 11},${beamY - 34}`, fill: C.b }),
        T(effortX, beamY - 106, `effort ${v.effort} N`, { z: 13, f: '#2f5fd0' }),
      ]);
      const kids = [R(0, 0, W, H, '#fbf8ff', { w: 0 }), s('polygon', { points: `${pivot},${beamY + 4} ${pivot - 44},${beamY + 88} ${pivot + 44},${beamY + 88}`, fill: '#b9a7d6', stroke: INK, 'stroke-width': 3 }), beam];
      const dim = (x0, x1, label, col) => [L(x0, 268, x1, 268, col, 2, { 'stroke-dasharray': '5 4' }), T((x0 + x1) / 2, 290, label, { z: 12, f: col })];
      kids.push(...dim(loadX, pivot, `load arm ${v.loadArm} m`, '#6b45c8'), ...dim(pivot, effortX, `effort arm ${v.effortArm} m`, '#2f5fd0'));
      kids.push(T(pivot, beamY + 104, 'fulcrum', { z: 12, f: '#6b5a8a' }), T(300, 32, balanced ? 'balanced' : diff > 0 ? 'the effort end goes down' : 'the load end stays down', { z: 18, f: balanced ? '#058a68' : '#c2510e' }));
      const say = `The ${v.load} N load, ${v.loadArm} m from the fulcrum, turns the beam with ${loadM} N m. Pushing ${v.effort} N at ${v.effortArm} m gives ${effortM} N m. ${balanced ? 'The two turning effects are equal, so the beam stays level.' : diff > 0 ? 'The effort turns harder, so the effort end goes down.' : 'The load turns harder, so the beam will not lift.'} To balance, push with ${num(need, 1)} N. Load divided by effort is ${num(ma, 2)}.`;
      return { kids, say };
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
  phscale: {
    subject: 'science', about: 'A pH scale from 0 to 14 with the universal indicator colours: the slider sets the pH and the solution turns red for a strong acid, green at neutral 7 and purple for a strong base, with the litmus colour. For acids, bases, pH, strength of acids and bases, indicators.',
    sliders: [['ph', 'pH of the solution', 0, 14, 1, 5]],
    draw(v) {
      const cols = ['#d00000', '#e63946', '#f4511e', '#fb8c00', '#fdd835', '#d4e157', '#9ccc65', '#43a047', '#26a69a', '#29b6f6', '#1e88e5', '#3949ab', '#5e35b1', '#8e24aa', '#6a1b9a'];
      const ph = v.ph, x0 = 30, seg = 36, y0 = 110, hh = 58, px = x0 + (ph + 0.5) * seg, kids = [];
      for (let i = 0; i <= 14; i++) {
        kids.push(R(x0 + i * seg, y0, seg, hh, cols[i], { w: 1, s: '#fff' }));
        kids.push(T(x0 + (i + 0.5) * seg, y0 + hh + 22, i, { z: 16, w: 600 }));
      }
      kids.push(s('polygon', { points: `${px},${y0 - 4} ${px - 12},${y0 - 26} ${px + 12},${y0 - 26}`, fill: INK }));
      kids.push(T(px, y0 - 36, `pH ${ph}`, { z: 22 }));
      kids.push(T(x0 + 2.6 * seg, y0 + hh + 52, 'more acidic', { z: 14, w: 600, f: '#b23a48' }));
      kids.push(T(x0 + 7.5 * seg, y0 + hh + 52, 'neutral', { z: 14, w: 600, f: '#2f7d32' }));
      kids.push(T(x0 + 12.4 * seg, y0 + hh + 52, 'more basic', { z: 14, w: 600, f: '#5e35b1' }));
      const name = ph === 7 ? 'neutral' : ph < 7 ? (ph <= 2 ? 'a strong acid' : 'a weak acid') : (ph >= 12 ? 'a strong base' : 'a weak base');
      const litmus = ph < 7 ? 'Blue litmus paper turns red.' : ph > 7 ? 'Red litmus paper turns blue.' : 'Neither litmus paper changes colour.';
      return { kids, say: `pH ${ph} is ${name}. ${litmus} ${ph === 7 ? 'A neutral solution, like pure water, has pH 7.' : ph < 7 ? 'Below 7 the solution is acidic.' : 'Above 7 the solution is basic.'}` };
    },
  },
  solidvol: {
    subject: 'maths', about: 'A cylinder, a cone or a sphere whose radius and height change, with the volume and surface area worked out from the formula. For surface areas and volumes of solids, right circular cylinders, cones, spheres and hemispheres, and combined solids.',
    sliders: [['pick', 'Choose the solid', 0, 2, 1, 0], ['rr', 'Radius r (cm)', 1, 8, 1, 3], ['ht', 'Height h (cm)', 2, 16, 2, 6]],
    draw(v) {
      const cx = 300, base = 244, k = 10, rr = v.rr * k, hh = v.ht * k, top = base - hh, kids = [];
      const names = ['cylinder', 'cone', 'sphere'];
      kids.push(L(40, base + 8, 560, base + 8, '#ddd6ee', 2));
      if (v.pick === 0) {
        kids.push(s('ellipse', { cx, cy: base, rx: rr, ry: rr * 0.3, fill: '#cfeeff', stroke: INK, 'stroke-width': 3 }));
        kids.push(R(cx - rr, top, 2 * rr, hh, '#bfe3ff', { w: 0 }));
        kids.push(L(cx - rr, top, cx - rr, base, INK, 3), L(cx + rr, top, cx + rr, base, INK, 3));
        kids.push(s('ellipse', { cx, cy: top, rx: rr, ry: rr * 0.3, fill: '#e6f6ff', stroke: INK, 'stroke-width': 3 }));
        kids.push(L(cx, top, cx + rr, top, C.o, 3), T(cx + rr / 2, top - 10, `r = ${v.rr}`, { z: 16, f: '#c2510e' }));
        kids.push(L(cx + rr + 16, top, cx + rr + 16, base, C.g, 3), T(cx + rr + 30, (top + base) / 2 + 5, `h = ${v.ht}`, { z: 16, f: '#058a68', a: 'start' }));
      } else if (v.pick === 1) {
        kids.push(s('polygon', { points: `${cx},${top} ${cx - rr},${base} ${cx + rr},${base}`, fill: '#ffe3a3', stroke: INK, 'stroke-width': 3 }));
        kids.push(s('ellipse', { cx, cy: base, rx: rr, ry: rr * 0.3, fill: '#ffd27a', stroke: INK, 'stroke-width': 3 }));
        kids.push(L(cx, top, cx, base, INK, 2, { 'stroke-dasharray': '6 6' }));
        kids.push(L(cx, base, cx + rr, base, C.o, 3), T(cx + rr / 2, base + 23, `r = ${v.rr}`, { z: 16, f: '#c2510e' }));
        kids.push(T(cx + 10, (top + base) / 2 + 5, `h = ${v.ht}`, { z: 16, f: '#058a68', a: 'start' }));
      } else {
        kids.push(CIRC(cx, 150, rr, '#cfeeff', { w: 3 }));
        kids.push(s('ellipse', { cx, cy: 150, rx: rr, ry: rr * 0.35, fill: 'none', stroke: '#8ecae6', 'stroke-width': 2 }));
        kids.push(L(cx, 150, cx + rr, 150, C.o, 3), T(cx + rr / 2, 140, `r = ${v.rr}`, { z: 16, f: '#c2510e' }));
      }
      const vol = v.pick === 0 ? Math.PI * v.rr ** 2 * v.ht : v.pick === 1 ? (Math.PI * v.rr ** 2 * v.ht) / 3 : (4 * Math.PI * v.rr ** 3) / 3;
      const area = v.pick === 0 ? 2 * Math.PI * v.rr * (v.rr + v.ht) : v.pick === 1 ? Math.PI * v.rr * (v.rr + Math.hypot(v.rr, v.ht)) : 4 * Math.PI * v.rr ** 2;
      const rule = v.pick === 0 ? 'V = pi x r x r x h' : v.pick === 1 ? 'V = one third of pi x r x r x h' : 'V = four thirds of pi x r x r x r';
      kids.push(T(300, 286, `${rule}, so volume = ${num(vol, 1)} cm3 and surface area = ${num(area, 1)} cm2.`, { z: 15, f: '#4b3a6b' }));
      const say = v.pick === 2
        ? `The sphere has radius ${v.rr} cm. Volume = 4/3 x pi x ${v.rr} x ${v.rr} x ${v.rr} = ${num(vol, 1)} cm3. Surface area = 4 x pi x ${v.rr} x ${v.rr} = ${num(area, 1)} cm2. The height slider does not change a sphere.`
        : `The ${names[v.pick]} has radius ${v.rr} cm and height ${v.ht} cm. Volume = ${num(vol, 1)} cm3 and surface area = ${num(area, 1)} cm2.`;
      return { kids, say };
    },
  },
  reaction: {
    subject: 'science', about: 'Four reactions from the Class 10 chemistry chapter, one at a time: magnesium burning in oxygen, calcium oxide joining water to make slaked lime, calcium carbonate breaking up on heating, and iron pushing copper out of copper sulphate. Shows the reactants on the left and the products on the right, and names the kind of reaction. For chemical reactions, combination, decomposition, displacement, reactants and products, exothermic and endothermic.',
    sliders: [['pick', 'Choose a reaction', 0, 3, 1, 1]],
    draw(v) {
      const E = [
        { type: 'Combination reaction', heat: 'gives out heat', col: '#058a68',
          left: [{ t: 'magnesium', c: '#b0bec5' }, { t: 'oxygen', c: '#90caf9' }], right: [{ t: 'magnesium oxide', c: '#eceff1' }],
          say: 'Magnesium burns in oxygen and the white powder magnesium oxide is formed. Two substances join into one product, so this is a combination reaction, and it gives out heat and light.' },
        { type: 'Combination reaction', heat: 'gives out a large amount of heat', col: '#058a68',
          left: [{ t: 'calcium oxide', c: '#e0e0e0' }, { t: 'water', c: '#90caf9' }], right: [{ t: 'slaked lime', c: '#fff3e0' }],
          say: 'Calcium oxide reacts vigorously with water and makes slaked lime, which is calcium hydroxide. Two substances join into one product: a combination reaction that gives out a large amount of heat.' },
        { type: 'Decomposition reaction', heat: 'needs heating', col: '#c2510e',
          left: [{ t: 'calcium carbonate', c: '#d7ccc8' }], right: [{ t: 'calcium oxide', c: '#e0e0e0' }, { t: 'carbon dioxide', c: '#b3e5fc' }],
          say: 'On heating, calcium carbonate breaks into calcium oxide and carbon dioxide. One substance breaking into simpler products is a decomposition reaction, and this one happens only when it is heated.' },
        { type: 'Displacement reaction', heat: 'happens in solution', col: '#1f6fb8',
          left: [{ t: 'iron', c: '#b0bec5' }, { t: 'copper sulphate', c: '#64b5f6' }], right: [{ t: 'iron sulphate', c: '#a5d6a7' }, { t: 'copper', c: '#c0703a' }],
          say: 'Iron is more reactive than copper, so iron takes the sulphate from copper sulphate. Iron sulphate forms and copper is left behind: one element displacing another from its compound is a displacement reaction.' },
      ];
      const e = E[v.pick] || E[0];
      const chip = (x, y, item) => {
        const at = item.t.lastIndexOf(' ', 17), lines = at > 0 ? [item.t.slice(0, at), item.t.slice(at + 1)] : [item.t];
        return [R(x, y, 164, 56, '#fff', { w: 2.5, r: 10 }), R(x, y, 8, 56, item.c, { w: 0, r: 4 }),
          ...lines.map((ln, i) => T(x + 88, y + 27 + i * 18 - (lines.length - 1) * 9, ln, { z: 15, w: 700 }))];
      };
      const kids = [], leftY = e.left.length === 1 ? [122] : [74, 162], rightY = e.right.length === 1 ? [122] : [74, 162];
      e.left.forEach((it, i) => kids.push(...chip(24, leftY[i], it)));
      e.right.forEach((it, i) => kids.push(...chip(410, rightY[i], it)));
      kids.push(L(196, 150, 388, 150, INK, 4), s('path', { d: 'M 388 150 l -14 -8 l 0 16 Z', fill: INK, stroke: INK, 'stroke-width': 1 }));
      kids.push(T(300, 28, e.type, { z: 21, f: e.col }), T(300, 50, e.heat, { z: 14, w: 600, f: '#6b5a8a' }), T(300, 286, 'Move the slider to try another reaction.', { z: 13, w: 600, f: '#8a7aa8' }));
      return { kids, say: e.say };
    },
  },
  masskeep: {
    subject: 'science', about: 'A flask of vinegar and baking soda on a digital balance, before the reaction, with the flask open so gas escapes, and with a balloon trapping the gas. The reading falls when the gas escapes and stays the same when it is trapped, so mass is conserved. For conservation of mass, open and closed systems, gas produced in a reaction.',
    sliders: [['pick', 'Set up the flask', 0, 2, 1, 0]],
    draw(v) {
      const mass = [250.0, 248.6, 250.0][v.pick] || 250.0;
      const label = ['Before the reaction', 'After, flask open', 'After, gas trapped'][v.pick] || 'Before the reaction';
      const trapped = v.pick === 2, running = v.pick > 0;
      const kids = [
        R(120, 214, 360, 52, '#37474f', { w: 3, r: 6 }),
        R(150, 198, 300, 18, '#cfd8dc', { w: 3, r: 4 }),
        T(300, 246, 'digital balance', { z: 14, w: 600, f: '#eceff1' }),
      ];
      kids.push(R(400, 30, 170, 66, '#12321e', { w: 3, r: 8 }), T(485, 60, `${mass.toFixed(1)} g`, { z: 26, f: '#7dff9b' }), T(485, 84, label, { z: 12, w: 600, f: '#b9f6ca' }));
      kids.push(s('path', { d: 'M 262 104 L 262 140 L 214 190 Q 206 198 218 198 L 382 198 Q 394 198 386 190 L 338 140 L 338 104 Z', fill: '#e3f2fd', stroke: INK, 'stroke-width': 4 }));
      kids.push(s('path', { d: 'M 248 150 L 240 193 L 360 193 L 352 150 Z', fill: '#b9e6fb', stroke: 'none' }));
      kids.push(R(258, 92, 84, 14, '#d7ccc8', { w: 3, r: 4 }));
      kids.push(T(300, 176, 'vinegar + baking soda', { z: 11, w: 600, f: '#1f6fb8' }));
      if (running) for (const [bx, by, br] of [[282, 166, 5], [314, 158, 4], [296, 148, 6], [320, 176, 4], [272, 154, 4]]) kids.push(CIRC(bx, by, br, 'none', { s: '#90caf9', w: 2 }));
      if (trapped) {
        kids.push(s('path', { d: 'M 300 92 L 300 78', stroke: INK, 'stroke-width': 3 }));
        kids.push(s('ellipse', { cx: 300, cy: 54, rx: 26, ry: 30, fill: C.o, stroke: INK, 'stroke-width': 3 }));
        kids.push(s('path', { d: 'M 300 84 l -7 10 l 14 0 Z', fill: C.o, stroke: INK, 'stroke-width': 2 }));
        kids.push(T(300, 58, 'gas', { z: 12, f: '#fff' }));
      } else if (running) {
        kids.push(L(300, 88, 300, 52, '#90caf9', 3), s('path', { d: 'M 300 50 l -8 12 l 16 0 Z', fill: '#90caf9', stroke: '#90caf9', 'stroke-width': 1 }));
        kids.push(T(300, 40, 'carbon dioxide escapes', { z: 13, w: 600, f: '#1f6fb8' }));
      }
      const say = v.pick === 0
        ? 'The balance reads 250.0 g with the vinegar and baking soda in the flask, before anything happens.'
        : v.pick === 1
          ? 'The reaction made carbon dioxide. With the flask open the gas leaves, so the balance now reads 248.6 g. Nothing was destroyed: the missing mass is the gas in the air.'
          : 'With a balloon over the neck the carbon dioxide cannot escape. The balance still reads 250.0 g, so the mass before and after the reaction is the same.';
      return { kids, say };
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
      const X = (i) => 50 + (i / v.n) * 520, Y = (f) => 260 - f * 220, pr = 1 / sides, kids = [L(50, Y(0), 575, Y(0), INK, 3), L(50, Y(0), 50, Y(1), INK, 3), L(50, Y(pr), 575, Y(pr), C.o, 3, { 'stroke-dasharray': '8 6' }), T(560, Y(pr) - 10, dice ? 'true chance 1/6' : 'true chance 1/2', { a: 'end', z: 16, f: '#d9531e' }), T(34, Y(1) + 5, '1', { z: 16, a: 'end' }), T(34, Y(0) + 5, '0', { z: 16, a: 'end' }), T(310, 290, 'number of tries', { z: 16, w: 600, f: '#6b5a8a' }), T(570, 278, v.n, { z: 16, a: 'end' })];
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
  quadtile: {
    subject: 'maths', about: 'One quadrilateral you reshape with sliders, its four angles added up to 360, and then copies of the same four-sided shape fitted edge to edge all around it with no gaps or overlaps. For quadrilaterals, the angle sum of a quadrilateral, tiling and tessellation, 4-gons, parallelograms and the midpoint theorem.',
    sliders: [['push', 'Push the top corner sideways', -3, 3, 1, 1], ['lift', 'Lift the top corner', 2, 6, 1, 4], ['wide', 'Move the right corner', 5, 9, 1, 7], ['tiles', 'Fit copies around it', 0, 2, 1, 1]],
    draw(v) {
      const cx = v.wide, cy = v.lift, dx = v.push;
      const base = [[0, 0], [8, 0], [cx, cy], [dx, cy * 0.7]];
      const cen = (q) => [q.reduce((t, p) => t + p[0], 0) / 4, q.reduce((t, p) => t + p[1], 0) / 4];
      const turn = (q, m) => q.map(([x, y]) => [2 * m[0] - x, 2 * m[1] - y]);
      const seen = new Map(), key = (q) => { const c = cen(q); return `${Math.round(c[0] * 20)}:${Math.round(c[1] * 20)}`; };
      let ring = [base]; seen.set(key(base), base);
      for (let k = 0; k < v.tiles; k++) {
        const next = [];
        for (const q of ring) for (let i = 0; i < 4; i++) {
          const a = q[i], b = q[(i + 1) % 4], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], nq = turn(q, m);
          if (!seen.has(key(nq))) { seen.set(key(nq), nq); next.push(nq); }
        }
        ring = next;
      }
      const all = [...seen.values()], xs = all.flat().map((p) => p[0]), ys = all.flat().map((p) => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const u = Math.min(540 / (maxX - minX || 1), 250 / (maxY - minY || 1));
      const ox = 300 - ((minX + maxX) / 2) * u, oy = 158 + ((minY + maxY) / 2) * u;
      const X = (x) => ox + x * u, Y = (y) => oy - y * u;
      const pts = (q) => q.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
      const fills = ['#ffe3a3', '#cfe8ff', '#d9f2e3', '#ffe0ea', '#e6ddff', '#fff0c2'];
      const kids = [];
      all.forEach((q, i) => { if (q !== base) kids.push(s('polygon', { points: pts(q), fill: fills[i % fills.length], stroke: '#b9a8d8', 'stroke-width': 2, 'stroke-linejoin': 'round', opacity: 0.95 })); });
      kids.push(s('polygon', { points: pts(base), fill: '#ffd06b', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }));
      const c0 = cen(base), ang = (i) => {
        const p = base[i], q = base[(i + 3) % 4], r = base[(i + 1) % 4];
        const u1 = [q[0] - p[0], q[1] - p[1]], u2 = [r[0] - p[0], r[1] - p[1]];
        return (Math.acos((u1[0] * u2[0] + u1[1] * u2[1]) / (Math.hypot(...u1) * Math.hypot(...u2))) * 180) / Math.PI;
      };
      const angs = [0, 1, 2, 3].map(ang), names = ['A', 'B', 'C', 'D'];
      base.forEach((p, i) => {
        const lx = X(p[0] + (c0[0] - p[0]) * 0.26), ly = Y(p[1] + (c0[1] - p[1]) * 0.26);
        kids.push(CIRC(X(p[0]), Y(p[1]), u > 15 ? 7 : 5, C.b, { w: 2.5 }));
        if (u > 15) {
          kids.push(T(lx, ly + 5, `${num(angs[i], 0)}°`, { z: 15, f: '#2a1a4a' }));
          kids.push(T(X(p[0]) + (p[0] < c0[0] ? -18 : 18), Y(p[1]) + (p[1] > c0[1] ? -14 : 18), names[i], { z: 14, w: 600, f: '#6b5a8a' }));
        }
      });
      const parts = angs.map((a) => num(a, 1));
      const tail = v.tiles === 0
        ? 'Move the sliders: however you bend the shape, the four angles still add up to 360 degrees.'
        : `Copies of this same shape fit all around it with no gaps and no overlaps, because four corners meeting at a point make one full turn (${num(360, 0)} degrees).`;
      return { kids, say: `The four angles are ${parts.join('° + ')}° = 360°, the same as one full turn. ${tail}` };
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
  identity: {
    subject: 'maths', about: 'A square of side a + b cut into an a-by-a square, a b-by-b square and two a-by-b rectangles, so the child sees that (a + b) squared is a squared plus two ab plus b squared. For algebraic identities, the square of a sum, expanding and factorising perfect squares.',
    sliders: [['a', 'a', 1, 10, 1, 3], ['b', 'b', 1, 10, 1, 2]],
    draw(v) {
      const side = v.a + v.b, u = Math.min(230 / side, 36), x0 = 40, y0 = 32, z = Math.max(11, Math.min(22, u * 0.5)), kids = [];
      const A = v.a * u, B = v.b * u, fc = { a: 'middle', z, f: '#fff' };
      kids.push(R(x0, y0, A, A, C.sky, { w: 3 }), T(x0 + A / 2, y0 + A / 2 + z / 3, `a² = ${v.a * v.a}`, fc));
      kids.push(R(x0 + A, y0 + A, B, B, C.y, { w: 3 }), T(x0 + A + B / 2, y0 + A + B / 2 + z / 3, `b² = ${v.b * v.b}`, { ...fc, f: INK }));
      kids.push(R(x0 + A, y0, B, A, C.g, { w: 3 }), T(x0 + A + B / 2, y0 + A / 2 + z / 3, B > 52 ? `ab = ${v.a * v.b}` : 'ab', fc));
      kids.push(R(x0, y0 + A, A, B, C.o, { w: 3 }), T(x0 + A / 2, y0 + A + B / 2 + z / 3, A > 52 ? `ab = ${v.a * v.b}` : 'ab', fc));
      kids.push(R(x0, y0, A + B, A + B, 'none', { w: 5 }), T(x0 + (A + B) / 2, y0 + A + B + 26, `side = ${v.a} + ${v.b} = ${side}`, { z: 16 }));
      const total = side * side, tx = 580, eq = [`(a + b)² = ${side} × ${side} = ${total}`, `a² + 2ab + b²`, `${v.a * v.a} + ${2 * v.a * v.b} + ${v.b * v.b} = ${total}`];
      kids.push(T(tx, 92, eq[0], { a: 'end', z: 22 }), T(tx, 136, eq[1], { a: 'end', z: 20, w: 600 }), T(tx, 180, eq[2], { a: 'end', z: 20, w: 600, f: '#058a68' }));
      return { kids, say: `The square has side ${v.a} + ${v.b} = ${side}, so its area is ${total}. Its four parts are ${v.a * v.a} + ${v.a * v.b} + ${v.a * v.b} + ${v.b * v.b} = ${total}. The two rectangles each have area ${v.a} × ${v.b} = ${v.a * v.b}, and that is why there is a 2ab in the identity.` };
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
  dissolve: {
    subject: 'science', about: 'A glass of water with spoons of sugar stirred in, and a temperature slider. Water can dissolve only a certain amount at each temperature: warm water holds more, and any extra sugar settles at the bottom as crystals, leaving a saturated solution. For solutions, solutes and solvents, solubility, saturation, concentration, dissolving and crystallization.',
    sliders: [['spoons', 'Spoons of sugar added', 0, 14, 1, 5], ['temp', 'Temperature of the water (°C)', 10, 80, 10, 20]],
    draw(v) {
      const lim = 2 + v.temp / 10, dis = Math.min(v.spoons, lim), extra = v.spoons - dis;
      const bx = 190, bw = 220, wtop = 150, floor = 262, strength = Math.min(1, dis / 10);
      const kids = [R(0, 0, W, H, '#f7f4ff', { w: 0 })];
      kids.push(R(bx, wtop, bw, floor - wtop, '#e6f6ff', { w: 4, r: 8 }));
      kids.push(R(bx + 2, floor - 92, bw - 4, 90, `rgba(255, 183, 3, ${0.10 + 0.5 * strength})`, { w: 0, r: 6 }));
      kids.push(L(bx, floor, bx + bw, floor, INK, 4));
      for (let i = 0; i < extra; i++) { const gx = bx + 42 + (i % 6) * 26, gy = floor - 8 - Math.floor(i / 6) * 10; kids.push(s('rect', { x: gx, y: gy, width: 9, height: 7, rx: 1.5, fill: '#ffffff', stroke: '#c9a227', 'stroke-width': 1.2, transform: `rotate(${(i % 3) * 12 - 12} ${gx + 4} ${gy + 3})` })); }
      const tx = 466, ttop = 120, tbot = 250, frac = (v.temp - 10) / 70;
      kids.push(R(tx, ttop, 18, tbot - ttop, '#ffffff', { w: 3, r: 9 }), R(tx + 4, tbot - 4 - (tbot - ttop - 8) * frac, 10, (tbot - ttop - 8) * frac, C.o, { w: 0, r: 5 }), CIRC(tx + 9, tbot + 8, 14, C.o, { w: 3 }), T(tx + 9, ttop - 12, `${v.temp}°C`, { z: 15, f: C.o }));
      kids.push(T(300, 34, `Water at ${v.temp}°C can dissolve ${num(lim, 0)} spoons of sugar`, { z: 20 }));
      kids.push(T(300, 62, `You added ${v.spoons} spoon${v.spoons === 1 ? '' : 's'}`, { z: 15, w: 600, f: '#6b5a8a' }));
      kids.push(T(300, 285, v.spoons === 0 ? `No sugar yet: this water can still take ${num(lim, 0)} spoons` : extra > 0 ? `${num(dis, 0)} dissolve, ${num(extra, 0)} ${extra === 1 ? 'stays' : 'stay'} at the bottom: the solution is saturated` : `${num(dis, 0)} dissolve and none is left over: the solution can still take ${num(lim - dis, 0)} more`, { z: 16, f: extra > 0 ? '#c2510e' : '#058a68' }));
      const say = v.spoons === 0 ? `There is no sugar in the water yet. At ${v.temp}°C this water could dissolve up to ${num(lim, 0)} spoons.`
        : extra > 0 ? `At ${v.temp}°C the water can dissolve ${num(lim, 0)} spoons. You added ${v.spoons}, so ${num(dis, 0)} dissolve and ${num(extra, 0)} ${extra === 1 ? 'settles' : 'settle'} at the bottom as sugar crystals. The solution is saturated: no more sugar will dissolve unless you warm the water.`
        : `At ${v.temp}°C the water can dissolve up to ${num(lim, 0)} spoons. You added ${v.spoons}, and all of it dissolved, so ${num(lim - v.spoons, 0)} more spoon${lim - v.spoons === 1 ? '' : 's'} could still dissolve. The solution is unsaturated.`;
      return { kids, say };
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
  plantparts: {
    subject: 'science', about: 'Tap each part of a plant and see it light up: roots under the soil, the stem, a leaf, the flower, the fruit and a seed. Each part has its own job. For parts of a plant, roots, stem, leaves, flowers, fruits and seeds, getting to know plants.',
    sliders: [['part', 'Tap a part of the plant', 0, 5, 1, 0]],
    draw(v) {
      const names = ['roots', 'stem', 'leaf', 'flower', 'fruit', 'seed'];
      const jobs = ['Roots hold the plant in the soil and take in water.', 'The stem holds the plant up and carries water to the leaves.', 'Leaves make food for the plant using sunlight.', 'The flower makes the fruit and the seeds.', 'The fruit protects the seeds inside it.', 'A seed can grow into a new plant.'];
      const on = (n) => v.part === n, hot = C.o, calm = '#3f7d3a';
      const kids = [R(0, 0, 600, 300, C.cream, { w: 0 }), R(0, 222, 600, 78, '#c9a46a', { w: 0 }), L(0, 222, 600, 222, '#8a5a2b', 3)];
      for (let i = 0; i < 7; i++) { const bx = 300 + (i - 3) * 7, by = 222, bx2 = 300 + (i - 3) * 34; kids.push(L(bx, by, bx2, by + 46 + (i % 3) * 12, on(0) ? hot : '#a9743d', on(0) ? 5 : 3)); }
      kids.push(R(296, 90, 9, 135, on(1) ? hot : calm, { w: 2, r: 4 }));
      kids.push(s('ellipse', { cx: 262, cy: 158, rx: 38, ry: 19, fill: on(2) ? hot : '#5fae4f', stroke: INK, 'stroke-width': 2, transform: 'rotate(-24 262 158)' }));
      kids.push(s('ellipse', { cx: 341, cy: 128, rx: 36, ry: 18, fill: on(2) ? hot : '#5fae4f', stroke: INK, 'stroke-width': 2, transform: 'rotate(22 341 128)' }));
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; kids.push(CIRC(300 + 23 * Math.cos(a), 71 + 23 * Math.sin(a), 12, on(3) ? hot : '#f4a3c8', { w: 1.5 })); }
      kids.push(CIRC(300, 71, 9, on(3) ? '#ffe08a' : C.y, { w: 2 }));
      kids.push(L(303, 178, 352, 184, on(4) ? hot : calm, 4), CIRC(365, 191, 19, on(4) ? hot : '#e2583e', { w: 2 }));
      kids.push(s('ellipse', { cx: 238, cy: 253, rx: 12, ry: 8, fill: on(5) ? hot : '#b07a45', stroke: INK, 'stroke-width': 2, transform: 'rotate(-20 238 253)' }));
      kids.push(T(300, 22, 'A plant and its parts', { z: 18 }), T(14, 24, `You tapped: ${names[v.part]}`, { z: 15, w: 700, f: hot, a: 'start' }));
      return { kids, say: jobs[v.part] };
    },
  },
  eatenparts: {
    subject: 'science', about: 'A plant with roots, stem, leaves, fruit and seeds, and six foods from the book: spinach, carrot, potato, mango, rice and onion. Pick a food, then tap the part of the plant it is, and that part lights up on the plant. For food from plants, the parts of a plant we eat: leaves, roots, stems, fruits and seeds.',
    sliders: [['item', 'Pick a food', 0, 5, 1, 0], ['part', 'Which part of the plant is it?', 0, 4, 1, 0]],
    draw(v) {
      const foods = ['spinach', 'carrot', 'potato', 'mango', 'rice', 'onion'];
      const partNames = ['roots', 'stem', 'leaves', 'fruit', 'seeds'];
      const right = [2, 0, 1, 3, 4, 1];
      const notes = ['Spinach leaves are leaves: we eat the green leaves of the plant.', 'A carrot is a root that grows under the soil.', 'A potato is a swollen stem that grows underground.', 'A mango is a fruit, and the fruit holds the seeds.', 'Rice grains are seeds: each grain can grow into a new plant.', 'An onion is a stem that stores food for the plant.'];
      const food = foods[v.item], want = right[v.item], ok = v.part === want, hot = C.o, calm = '#3f7d3a';
      const on = (n) => v.part === n;
      const kids = [R(0, 0, 600, 300, C.cream, { w: 0 }), R(0, 210, 600, 90, '#c9a46a', { w: 0 }), L(0, 210, 600, 210, '#8a5a2b', 3)];
      for (let i = 0; i < 7; i++) { const bx = 300 + (i - 3) * 7, bx2 = 300 + (i - 3) * 34; kids.push(L(bx, 210, bx2, 210 + 46 + (i % 3) * 12, on(0) ? hot : '#a9743d', on(0) ? 5 : 3)); }
      kids.push(R(294, 88, 12, 122, on(1) ? hot : calm, { w: 2, r: 4 }));
      kids.push(s('ellipse', { cx: 262, cy: 150, rx: 36, ry: 18, fill: on(2) ? hot : '#5fae4f', stroke: INK, 'stroke-width': 2, transform: 'rotate(-24 262 150)' }));
      kids.push(s('ellipse', { cx: 338, cy: 122, rx: 34, ry: 17, fill: on(2) ? hot : '#5fae4f', stroke: INK, 'stroke-width': 2, transform: 'rotate(22 338 122)' }));
      kids.push(L(304, 176, 352, 188, on(3) ? hot : calm, 4), CIRC(362, 196, 18, on(3) ? hot : '#e2583e', { w: 2 }));
      kids.push(L(294, 148, 250, 136, on(4) ? hot : calm, 4), s('ellipse', { cx: 234, cy: 133, rx: 18, ry: 10, fill: on(4) ? hot : '#b07a45', stroke: INK, 'stroke-width': 2, transform: 'rotate(-14 234 133)' }));
      for (let i = 0; i < 3; i++) kids.push(CIRC(226 + i * 8, 133, 2.6, INK, { w: 0 }));
      kids.push(T(300, 22, 'Which part of the plant is it?', { z: 18 }), T(300, 46, `Food: ${food}`, { z: 17, w: 800, f: C.p }));
      kids.push(T(16, 292, `You chose: ${partNames[v.part]}`, { z: 14, w: 600, f: ok ? '#1d7a45' : '#7a6b99', a: 'start' }));
      const say = ok ? `Yes. ${notes[v.item]}` : `Not the ${partNames[v.part]}. ${notes[v.item]}`;
      return { kids, say };
    },
  },
  twobins: {
    subject: 'science', about: 'Throw six everyday things into the right dustbin: the green bin for peels, leaves and eggshells that rot into compost, the blue bin for glass, plastic and paper that can be recycled. For waste, separating waste, green and blue dustbins, compost and recycling.',
    sliders: [['item', 'Pick a thing to throw away', 0, 5, 1, 0], ['bin', 'Which bin? (0 green, 1 blue, 2 not chosen)', 0, 2, 1, 2]],
    draw(v) {
      const items = ['banana peel', 'glass bottle', 'dry leaves', 'plastic bag', 'eggshell', 'newspaper'];
      const kinds = ['green', 'blue', 'green', 'blue', 'green', 'blue'];
      const name = items[v.item], kind = kinds[v.item], chosen = v.bin !== 2, right = chosen && (v.bin === (kind === 'green' ? 0 : 1));
      const kids = [R(0, 0, 600, 300, C.cream, { w: 0 }), T(300, 22, 'Which bin does it go in?', { z: 19 })];
      kids.push(R(180, 34, 240, 84, '#ffffff', { w: 2.5, r: 12 }));
      if (v.item === 0) {
        kids.push(s('path', { d: 'M 264 106 Q 276 56 300 52 Q 324 56 336 106 Q 316 88 300 100 Q 284 88 264 106 Z', fill: '#f2c94c', stroke: INK, 'stroke-width': 2 }), CIRC(265, 106, 4, '#8a5a2b', { w: 1 }), CIRC(336, 106, 4, '#8a5a2b', { w: 1 }));
      } else if (v.item === 1) {
        kids.push(R(288, 50, 24, 52, '#bfe6f5', { w: 2, r: 5 }), R(294, 38, 12, 16, '#bfe6f5', { w: 2, r: 2 }), R(293, 62, 14, 26, '#7fbfff', { w: 0, r: 2 }));
      } else if (v.item === 2) {
        kids.push(s('ellipse', { cx: 284, cy: 76, rx: 24, ry: 12, fill: '#c98b3a', stroke: INK, 'stroke-width': 2, transform: 'rotate(-20 284 76)' }), s('ellipse', { cx: 318, cy: 86, rx: 22, ry: 11, fill: '#a9743d', stroke: INK, 'stroke-width': 2, transform: 'rotate(18 318 86)' }));
      } else if (v.item === 3) {
        kids.push(s('path', { d: 'M 280 56 h 40 l 6 48 h -52 Z', fill: '#dfe9f5', stroke: INK, 'stroke-width': 2 }), s('path', { d: 'M 288 56 q 4 -14 12 -14 q 8 0 12 14', fill: 'none', stroke: INK, 'stroke-width': 3 }));
      } else if (v.item === 4) {
        kids.push(s('path', { d: 'M 274 94 Q 274 54 300 52 Q 326 54 326 94 Q 313 84 300 92 Q 287 84 274 94 Z', fill: '#fff7e8', stroke: INK, 'stroke-width': 2 }));
      } else {
        kids.push(R(272, 54, 56, 42, '#f0ede6', { w: 2, r: 3 }));
        for (let r = 0; r < 3; r++) kids.push(L(280, 65 + r * 10, 320, 65 + r * 10, '#9aa5b1', 2));
      }
      kids.push(T(300, 136, name, { z: 16, w: 700 }));
      const binAt = (x, col, label, lit, ring) => {
        kids.push(R(x - 8, 184, 166, 13, lit ? col : '#d8d3e8', { w: 3, r: 5 }), R(x + 52, 190, 46, 7, lit ? '#ffffff' : '#b7b0cc', { w: 0, r: 3 }));
        kids.push(s('path', { d: `M ${x} 202 L ${x + 16} 274 L ${x + 134} 274 L ${x + 150} 202 Z`, fill: lit ? col : '#f8f5ee', stroke: ring ? '#c0392b' : INK, 'stroke-width': ring ? 6 : 3 }));
        kids.push(T(x + 75, 244, label, { z: 17, w: 700, f: lit ? '#ffffff' : '#3d2d5e' }));
        kids.push(T(x + 75, 288, lit ? 'yes, here' : ring ? 'not here' : 'choose me', { z: 13, w: 600, f: lit ? '#1d7a45' : ring ? '#c0392b' : '#7a6b99' }));
      };
      const wantGreen = kind === 'green';
      binAt(70, '#2e9e5b', 'GREEN BIN', right && wantGreen, chosen && !right && v.bin === 0);
      binAt(365, '#1f63d9', 'BLUE BIN', right && !wantGreen, chosen && !right && v.bin === 1);
      let msg;
      if (!chosen) msg = 'Pick a bin: green eats plant and food scraps, blue takes glass, plastic and paper.';
      else if (right) msg = `Yes. The ${name} goes in the ${kind} bin. ${wantGreen ? 'It rots and becomes compost, food for plants.' : 'It is washed and made into new things: recycling.'}`;
      else msg = `Not that one. The ${name} does not belong there. ${wantGreen ? 'It is a plant or food scrap, so it rots into compost.' : 'It is glass, plastic or paper, so it can be made again.'}`;
      return { kids, say: msg };
    },
     },
  mattersort: {
    subject: 'science', about: 'Sort eight substances into mixture, element or compound: air, brass and sand with water are mixtures, oxygen and iron are elements, and water, salt and sugar are compounds. For mixtures and their components, pure substances, elements, compounds and alloys.',
    sliders: [['item', 'Pick a substance', 0, 7, 1, 0], ['group', 'Which group? (0 mixture, 1 element, 2 compound, 3 not chosen)', 0, 3, 1, 3]],
    draw(v) {
      const items = [
        ['air', 0, 'Air is a uniform mixture of gases, mostly nitrogen, and each gas keeps its own properties.'],
        ['brass', 0, 'Brass is an alloy: copper and zinc mixed so evenly that it looks like one metal, yet it is still a mixture.'],
        ['water', 2, 'Water is a compound of hydrogen and oxygen in a 2:1 ratio, and current can break it back into the two gases.'],
        ['oxygen', 1, 'Oxygen is an element: every particle is an oxygen atom, one kind throughout.'],
        ['salt', 2, 'Sodium chloride is a compound of sodium and chlorine in a 1:1 ratio.'],
        ['iron', 1, 'Iron is an element, a metal. It cannot be broken down into a simpler substance.'],
        ['sugar', 2, 'Sugar is a compound of carbon, hydrogen and oxygen; heating it gives carbon and water.'],
        ['sand and water', 0, 'Sand and water is a non-uniform mixture: you can still see the sand and the water.'],
      ];
      const names = ['MIXTURE', 'ELEMENT', 'COMPOUND'];
      const [name, kind, why] = items[v.item];
      const chosen = v.group !== 3, right = chosen && v.group === kind;
      const kids = [R(0, 0, 600, 300, C.cream, { w: 0 })];
      kids.push(R(150, 18, 300, 86, '#ffffff', { w: 3, r: 14 }));
      kids.push(T(300, 58, name, { z: 24, w: 700 }));
      kids.push(T(300, 86, 'what is it made of?', { z: 14, w: 600, f: '#6b5a8a' }));
      const boxAt = (x, label, idx) => {
        const lit = chosen && v.group === idx, ok = lit && idx === kind, wrong = lit && idx !== kind;
        const fill = ok ? '#d8f3e0' : wrong ? '#fde3e3' : '#ffffff';
        kids.push(R(x, 150, 170, 110, fill, { w: ok || wrong ? 6 : 3, s: ok ? '#1d7a45' : wrong ? '#c0392b' : INK, r: 12 }));
        kids.push(T(x + 85, 194, label, { z: 18, w: 700, f: ok ? '#1d7a45' : wrong ? '#c0392b' : INK }));
        kids.push(T(x + 85, 226, ok ? 'yes' : wrong ? 'no' : 'choose me', { z: 13, w: 600, f: ok ? '#1d7a45' : wrong ? '#c0392b' : '#7a6b99' }));
      };
      boxAt(30, names[0], 0);
      boxAt(215, names[1], 1);
      boxAt(400, names[2], 2);
      const say = !chosen
        ? `What is ${name} made of? Slide to a group: a mixture keeps its parts, an element is one kind of particle, a compound is elements joined in a fixed ratio.`
        : right ? `Yes. ${why}`
        : `Not that one. ${why}`;
      return { kids, say };
    },
  },
  plate: {
    subject: 'science', about: 'Fill a plate with servings from the three food groups: energy food (roti, rice), body-building food (dal, egg, milk) and protective food (vegetables, fruit), plus junk food on the side. The pieces of the plate grow with the servings, so protective food as the biggest part shows what a balanced plate looks like. For food groups, energy-giving, body-building and protective food, a balanced plate, junk food and healthy eating.',
    sliders: [['grain', 'Energy food: roti, rice (servings)', 0, 4, 1, 0], ['protein', 'Body-building food: dal, egg (servings)', 0, 4, 1, 0], ['veg', 'Protective food: vegetables, fruit (servings)', 0, 4, 1, 0], ['junk', 'Junk food on the side: chips, soft drink (pieces)', 0, 4, 1, 0]],
    draw(v) {
      const cx = 230, cy = 165, rr = 100, kids = [], groups = [
        ['grain', 'Energy food', '#fbeccd', '#f2c14e'],
        ['protein', 'Body-building food', '#fde3d3', '#e76f51'],
        ['veg', 'Protective food', '#e6f4d8', '#43a047'],
      ];
      const total = v.grain + v.protein + v.veg;
      const point = (a, dist) => [cx + dist * Math.sin(rad(a)), cy - dist * Math.cos(rad(a))];
      kids.push(CIRC(cx, cy + 3, rr + 9, '#e9e2f5', { w: 0 }), CIRC(cx, cy, rr + 8, '#ffffff', { w: 4 }));
      const foodAt = (kind, x, y, k) => {
        if (kind === 'grain') {
          kids.push(CIRC(x, y, 15, '#f2c14e', { w: 2 }));
          kids.push(CIRC(x - 4, y - 3, 1.7, '#b07d18', { w: 0 }), CIRC(x + 4, y - 1, 1.7, '#b07d18', { w: 0 }), CIRC(x, y + 5, 1.7, '#b07d18', { w: 0 }));
        } else if (kind === 'protein') {
          kids.push(s('path', { d: `M ${x - 15} ${y - 4} Q ${x} ${y + 20} ${x + 15} ${y - 4} Z`, fill: '#f4a261', stroke: INK, 'stroke-width': 2 }), CIRC(x - 5, y + 1, 2.6, '#d97706', { w: 0 }), CIRC(x + 5, y + 2, 2.6, '#d97706', { w: 0 }), CIRC(x, y + 7, 2.6, '#d97706', { w: 0 }));
        } else if (k % 2 === 0) {
          kids.push(s('polygon', { points: `${x},${y - 15} ${x + 12},${y + 11} ${x - 12},${y + 11}`, fill: '#e2583e', stroke: INK, 'stroke-width': 2 }), s('polygon', { points: `${x},${y - 15} ${x + 13},${y - 18} ${x + 8},${y - 9}`, fill: '#43a047', stroke: INK, 'stroke-width': 2 }));
        } else {
          kids.push(CIRC(x, y + 2, 13, '#ffb703', { w: 2 }), s('path', { d: `M ${x} ${y - 10} Q ${x + 12} ${y - 20} ${x + 16} ${y - 10} Q ${x + 8} ${y - 5} ${x} ${y - 10}`, fill: '#43a047', stroke: INK, 'stroke-width': 2 }));
        }
      };
      let a0 = 0;
      for (const [key, label, pale, strong] of groups) {
        const n = v[key];
        if (!n) continue;
        const span = (n / total) * 360, a1 = a0 + span, mid = a0 + span / 2;
        if (span > 359.5) kids.push(CIRC(cx, cy, rr, pale, { w: 2 }));
        else { const [x0, y0] = point(a0, rr), [x1, y1] = point(a1, rr); kids.push(s('path', { d: `M ${cx} ${cy} L ${x0} ${y0} A ${rr} ${rr} 0 ${span > 180 ? 1 : 0} 1 ${x1} ${y1} Z`, fill: pale, stroke: INK, 'stroke-width': 2 })); }
        for (let k = 0; k < n; k++) {
          const a = n === 1 ? mid : a0 + (span * (k + 0.5)) / n, [x, y] = point(a, rr * 0.56);
          foodAt(key, x, y, k);
        }
        a0 = a1;
      }
      if (!total) kids.push(T(cx, cy + 6, 'put some food', { z: 18, w: 700, f: '#8a7fa8' }), T(cx, cy + 28, 'on the plate', { z: 18, w: 700, f: '#8a7fa8' }));
      else kids.push(CIRC(cx, cy, 5, '#ffffff', { w: 2 }));
      kids.push(T(cx, 40, 'a thali: fill the plate', { z: 16, w: 700 }));
      // the junk food sits on its own small tray, off the plate
      kids.push(R(24, 108, 92, 104, '#fff7e8', { w: 3, r: 10 }), T(70, 96, 'sometimes food', { z: 15, w: 700, f: '#c2510e' }));
      for (let k = 0; k < v.junk; k++) {
        const x = 47 + (k % 2) * 44, y = 140 + Math.floor(k / 2) * 42;
        if (k % 2 === 0) kids.push(s('polygon', { points: `${x - 14},${y - 16} ${x + 14},${y - 14} ${x + 13},${y + 17} ${x - 13},${y + 16}`, fill: '#e2583e', stroke: INK, 'stroke-width': 2 }), T(x, y + 6, 'chips', { z: 10.5, w: 700, f: '#fff' }));
        else kids.push(s('polygon', { points: `${x - 11},${y - 14} ${x + 11},${y - 14} ${x + 8},${y + 16} ${x - 8},${y + 16}`, fill: '#3a86ff', stroke: INK, 'stroke-width': 2 }), L(x + 2, y - 14, x + 12, y - 26, '#e2583e', 3), T(x, y + 6, 'drink', { z: 10.5, w: 700, f: '#fff' }));
      }
      const balanced = v.grain >= 1 && v.protein >= 1 && v.veg >= 2 && v.veg > v.grain && v.veg > v.protein;
      const missing = [v.grain < 1 ? 'energy food' : null, v.protein < 1 ? 'body-building food' : null, v.veg < 1 ? 'protective food' : null].filter(Boolean);
      const verdict = !total && !v.junk ? 'an empty plate' : !total ? 'only junk food' : balanced ? 'a balanced plate' : missing.length ? `add ${missing.join(' and ')}` : v.veg <= v.grain || v.veg <= v.protein ? 'add more protective food' : 'keep adding food';
      kids.push(T(cx, 288, verdict, { z: 15, w: 700, f: balanced ? '#058a68' : total ? '#c2510e' : '#8a7fa8' }));
      const x0 = 372;
      kids.push(T(x0 + 60, 62, 'on the plate', { z: 16, w: 700 }));
      groups.forEach(([key, label, pale, strong], i) => {
        const y = 92 + i * 30;
        kids.push(CIRC(x0 + 8, y, 8, pale, { w: 2, s: strong }), T(x0 + 24, y + 5, `${label}: ${v[key]}`, { z: 15, w: 700, a: 'start' }));
      });
      kids.push(L(x0, 186, x0 + 190, 186, '#ddd6ee', 2), T(x0 + 95, 208, 'A balanced plate has', { z: 14.5, w: 600, f: '#6b5a8a' }), T(x0 + 95, 230, 'protective food as the', { z: 14.5, w: 600, f: '#6b5a8a' }), T(x0 + 95, 252, 'biggest part.', { z: 14.5, w: 600, f: '#6b5a8a' }));
      if (v.junk) kids.push(T(x0 + 95, 276, 'junk food is not every day', { z: 14, w: 700, f: '#c2510e' }));
      const say = !total && !v.junk ? 'The plate is empty. Put some roti, dal, vegetables or fruit on it.' : !total ? `There are ${v.junk} pieces of junk food and nothing on the plate. Chips and soft drinks have a lot of oil, salt and sugar: they are sometimes food, not a meal.` : `${balanced ? 'This is a balanced plate' : 'This plate is not balanced yet'}: ${v.grain} of energy food, ${v.protein} of body-building food and ${v.veg} of protective food. ${balanced ? 'Protective food is the biggest part, so it has vitamins to fight illness, with some energy food and body-building food.' : missing.length ? `Add ${missing.join(' and ')}.` : 'Make protective food the biggest part of the plate.'}${v.junk ? ' The junk food on the side is a sometimes food.' : ''}`;
      return { kids, say };
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
    subject: 'maths', about: 'Make an amount of money from Rs 100, Rs 50 and Rs 10 notes and Rs 5 and Rs 1 coins: Rs 20, 28, 30, 36, 55, 125, 163 or 183. There is more than one way to make the same amount. For money, rupees, counting money, notes and coins, shopping and change.',
    params: { kind: 'rupees' },   // 'small' is Class 2's money: Rs 50, 20, 10 notes and Rs 5, 2, 1 coins
    dynamicSliders: (p) => (p.kind === 'small' ? [['amt', 'Amount to make: 66, 54, 85, 50, 65, 25, 40, 20, 15', 0, 8, 1, 0], ['f', 'Rs 50 notes', 0, 3, 1, 0], ['tw', 'Rs 20 notes', 0, 4, 1, 0], ['t', 'Rs 10 notes', 0, 9, 1, 0], ['v', 'Rs 5 coins', 0, 9, 1, 0], ['two', 'Rs 2 coins', 0, 9, 1, 0], ['o', 'Rs 1 coins', 0, 9, 1, 0]] : WIDGETS.money.sliders),
    sliders: [['amt', 'Amount to make: 36, 125, 163, 183, 20, 28, 30, 55', 0, 7, 1, 0], ['h', 'Rs 100 notes', 0, 2, 1, 0], ['f', 'Rs 50 notes', 0, 3, 1, 0], ['t', 'Rs 10 notes', 0, 9, 1, 0], ['v', 'Rs 5 coins', 0, 9, 1, 0], ['o', 'Rs 1 coins', 0, 9, 1, 0]],
    draw(v, p) {
      const small = !!p && p.kind === 'small', want = (small ? [66, 54, 85, 50, 65, 25, 40, 20, 15] : [36, 125, 163, 183, 20, 28, 30, 55])[v.amt];
      const pieces = small ? [[50, v.f, '#5fc9b8', true], [20, v.tw, '#b794f4', true], [10, v.t, '#c9a46a', true], [5, v.v, '#e0c050', false], [2, v.two, '#d9b3a0', false], [1, v.o, '#c8c8c8', false]] : [[100, v.h, '#7fb3d5', true], [50, v.f, '#5fc9b8', true], [10, v.t, '#c9a46a', true], [5, v.v, '#e0c050', false], [1, v.o, '#c8c8c8', false]];
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
    sliders: [['th', 'Thousands', 0, 3, 1, 0], ['hu', 'Hundreds', 0, 9, 1, 2], ['te', 'Tens', 0, 12, 1, 3], ['on', 'Ones', 0, 19, 1, 4]],
    draw(v) {
      const total = 1000 * v.th + 100 * v.hu + 10 * v.te + v.on, kids = [];
      // each kind of block in its own column: a thousand is a big square, a hundred a flat, a ten a rod, a one a dot
      for (let i = 0; i < v.th; i++) kids.push(R(24 + i * 30, 26, 26, 26, '#9fd3f2', { w: 2.5, r: 3 }), T(37 + i * 30, 45, '1000', { z: 11, w: 700 }));
      for (let i = 0; i < v.hu; i++) { const c = i % 5, r = Math.floor(i / 5); kids.push(R(24 + c * 34, 70 + r * 34, 30, 30, '#7fb3d5', { w: 2, r: 3 })); for (let g = 1; g < 3; g++) kids.push(L(24 + c * 34 + g * 10, 70 + r * 34, 24 + c * 34 + g * 10, 100 + r * 34, '#4f84ad', 1), L(24 + c * 34, 70 + r * 34 + g * 10, 54 + c * 34, 70 + r * 34 + g * 10, '#4f84ad', 1)); }
      for (let i = 0; i < v.te; i++) { const c = i % 5, r = Math.floor(i / 5); kids.push(R(200 + c * 14, 70 + r * 66, 11, 60, '#5fc9b8', { w: 2, r: 2 })); for (let g = 1; g < 6; g++) kids.push(L(200 + c * 14, 70 + r * 66 + g * 10, 211 + c * 14, 70 + r * 66 + g * 10, '#2f8f82', 1)); }
      for (let i = 0; i < v.on; i++) { const c = i % 5, r = Math.floor(i / 5); kids.push(R(300 + c * 16, 70 + r * 16, 12, 12, '#f2a33a', { w: 2, r: 2 })); }
      kids.push(T(60, 282, 'hundreds', { z: 16, w: 600, f: '#6b5a8a' }), T(228, 282, 'tens', { z: 16, w: 600, f: '#6b5a8a' }), T(335, 282, 'ones', { z: 16, w: 600, f: '#6b5a8a' }));
      kids.push(T(480, 90, String(total), { z: 40, w: 700 }), T(480, 128, `${v.th ? v.th + ' thousand' + (v.th > 1 ? 's' : '') + ', ' : ''}${v.hu} hundred${v.hu === 1 ? '' : 's'}`, { z: 15, w: 600, f: '#4f84ad' }), T(480, 150, `${v.te} ten${v.te === 1 ? '' : 's'}, ${v.on} one${v.on === 1 ? '' : 's'}`, { z: 15, w: 600, f: '#2f8f82' }));
      if (v.on >= 10) kids.push(T(480, 192, `${v.on} ones = 1 ten and ${v.on - 10} one${v.on - 10 === 1 ? '' : 's'}`, { z: 15, w: 700, f: '#c2510e' }));
      if (v.te >= 10) kids.push(T(480, 218, `${v.te} tens = 1 hundred${v.te > 10 ? ` and ${v.te - 10} ten${v.te - 10 === 1 ? '' : 's'}` : ''}`, { z: 15, w: 700, f: '#c2510e' }));
      const nm = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`, parts = [v.th && nm(v.th, 'thousand'), v.hu && nm(v.hu, 'hundred'), v.te && nm(v.te, 'ten'), v.on && nm(v.on, 'one')].filter(Boolean);
      return { kids, say: total ? `${parts.join(', ')} make ${total}.${v.on >= 10 ? ` ${v.on} ones can be grouped as 1 ten and ${nm(v.on - 10, 'one')}.` : ''}${v.te >= 10 ? ` ${v.te} tens can be grouped as 1 hundred${v.te > 10 ? ` and ${nm(v.te - 10, 'ten')}` : ''}.` : ''}` : 'Add some blocks to make a number.' };
    },
  },
  column: {
    subject: 'maths', about: 'Add or subtract three-digit numbers in columns, one column at a time from the ones: carrying 1 ten or 1 hundred when a column reaches 10 (regrouping), or borrowing when the top digit is too small. Param kind "add" or "sub". For addition, subtraction, regrouping, carrying, column method, taking away.',
    params: { kind: 'add' },
    dynamicSliders: (p) => (p.kind === 'sub' ? [['a', 'Start with', 0, 999, 1, 438], ['b', 'Take away', 0, 999, 1, 215], ['step', 'Columns done', 0, 3, 1, 1]] : [['a', 'First number', 0, 499, 1, 438], ['b', 'Second number', 0, 499, 1, 476], ['step', 'Columns done', 0, 3, 1, 1]]),
    draw(v, p) {
      const sub = p.kind === 'sub', kids = [], cx = [95, 165, 235], nm = ['ones', 'tens', 'hundreds'];
      const A = [v.a % 10, Math.floor(v.a / 10) % 10, Math.floor(v.a / 100)], B = [v.b % 10, Math.floor(v.b / 10) % 10, Math.floor(v.b / 100)];
      if (sub && v.b > v.a) return { kids: [T(300, 150, `${v.b} is more than ${v.a}`, { z: 20, f: '#c0392b' }), T(300, 184, 'you cannot take away more than you have', { z: 17, w: 600, f: '#6b5a8a' })], say: `You cannot take ${v.b} away from ${v.a}: it is more than you have. Make the second number smaller.` };
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
        kids.push(T(x, 112, A[i] || i === 0 || v.a >= 10 ** i ? String(A[i]) : '', { z: 34, w: 700 }), T(x, 168, B[i] || i === 0 || v.b >= 10 ** i ? String(B[i]) : '', { z: 34, w: 700, f: '#1f63d9' }), T(x, 40, nm[i], { z: 16, w: 600, f: '#6b5a8a' }));
      }
      for (let i = 0; i < 3; i++) {
        if (v.step > i) {
          const x = cx[2 - i];
          if (!lead(i)) kids.push(T(x, 246, String(res[i]), { z: 34, w: 700, f: '#058a68' }), R(x - 30, 214, 60, 44, 'none', { s: '#058a68', w: 2.5, r: 6 }));
          if (mark[i] && i < 2) kids.push(T(cx[2 - i - 1], 80, sub ? '−1' : '1', { z: 18, w: 700, f: '#c2510e' }), T(x + 26, 102, sub ? '+10' : '', { z: 15, w: 700, f: '#c2510e' }));
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
      for (let n = 0; n <= 100; n++) kids.push(L(x(n), y - (n % 10 ? 4 : 9), x(n), y + (n % 10 ? 4 : 9), INK, n % 10 ? 1 : 2.2), ...(n % 10 ? [] : [T(x(n), y + 29, String(n), { z: 15, w: 600 })]));
      for (let k = 1; k < stops.length; k++) kids.push(s('path', { d: `M ${x(stops[k - 1])} ${y} Q ${(x(stops[k - 1]) + x(stops[k])) / 2} ${y - 52} ${x(stops[k])} ${y}`, fill: 'none', stroke: C.o, 'stroke-width': 3 }));
      const everyLabel = v.jump >= 5;
      stops.forEach((n, k) => { const end = k === stops.length - 1; kids.push(CIRC(x(n), y, end ? 9 : 6, end ? C.p : '#ffcc33', { w: 2.5 })); if (everyLabel || k === 0 || end) kids.push(T(x(n), y - 42, String(n), { z: 16, w: 700, f: end ? '#6b45c8' : INK })); });
      kids.push(T(300, 34, stops.length > 1 ? `${v.start} ${v.back ? '−' : '+'} ${stops.length - 1} × ${v.jump} = ${stops[stops.length - 1]}` : `start at ${v.start}`, { z: 22, w: 700 }));
      if (stuck) kids.push(T(300, 272, 'the next jump would leave the number line', { z: 15, w: 600, f: '#c0392b' }));
      const last = stops[stops.length - 1], n = stops.length - 1;
      return { kids, say: n === 0 ? (v.hops === 0 ? `The frog starts at ${v.start}.` : `The frog starts at ${v.start}, but a jump of ${v.jump} ${v.back ? 'back' : 'forward'} would go off the number line.`) : `Starting at ${v.start}, ${n} jump${n === 1 ? '' : 's'} of ${v.jump} ${v.back ? 'back' : 'forward'} land${n === 1 ? 's' : ''} on ${last}: ${stops.join(', ')}.${stuck ? ' The next jump would go off the line.' : ''}` };
    },
  },
  between: {
    subject: 'maths', about: 'Place a three-digit number on a number line between two hundreds, like 387 between 300 and 400, and see how far it is from each end (13 to 400, 87 from 300). For number lines, three-digit numbers, hundreds and tens, how far, distance between numbers, estimating where a number sits.',
    sliders: [['n', 'The number', 100, 999, 1, 387]],
    draw(v) {
      const lo = Math.floor(v.n / 100) * 100, hi = lo + 100, x = (m) => 40 + ((m - lo) / 100) * 520, y = 170, kids = [L(x(lo), y, x(hi), y, INK, 4)];
      for (let m = lo; m <= hi; m += 10) kids.push(L(x(m), y - (m % 50 ? 7 : 12), x(m), y + (m % 50 ? 7 : 12), INK, m % 50 ? 2 : 3), ...(m % 50 === 0 ? [T(x(m), y + 34, String(m), { z: 15, w: 700 })] : []));
      const left = v.n - lo, right = hi - v.n;
      kids.push(L(x(lo), y - 52, x(v.n), y - 52, '#1f63d9', 4), L(x(v.n), y - 52, x(hi), y - 52, '#c2510e', 4), T((x(lo) + x(v.n)) / 2, y - 62, `${left} from ${lo}`, { z: 13, w: 700, f: '#1f63d9' }), T((x(v.n) + x(hi)) / 2, y - 62, `${right} to ${hi}`, { z: 13, w: 700, f: '#c2510e' }));
      kids.push(L(x(v.n), y - 52, x(v.n), y, '#6b45c8', 2, { 'stroke-dasharray': '4 4' }), CIRC(x(v.n), y, 10, C.p, { w: 3 }), T(x(v.n), y + 62, String(v.n), { z: 26, w: 700, f: '#6b45c8' }));
      kids.push(T(300, 40, `${v.n} is between ${lo} and ${hi}`, { z: 18 }));
      return { kids, say: `${v.n} sits between ${lo} and ${hi}. It is ${left} more than ${lo}, and ${right} more makes ${hi}.` };
    },
  },
  flatshape: {
    subject: 'maths', about: 'Build a flat shape from sticks and count its sides and corners: a triangle, a four-sided shape that is a square when both sides are the same length and a rectangle when they differ (four square corners, opposite sides equal), and a circle with its centre. For squares, rectangles, triangles, circles, sides, corners, square corner, equal sides.',
    sliders: [['shape', 'Shape: 0 triangle, 1 four-sided, 2 circle', 0, 2, 1, 1], ['w', 'Width (sticks)', 2, 8, 1, 6], ['h', 'Height (sticks)', 2, 8, 1, 3]],
    draw(v) {
      const u = 26, ox = 70, oy = 250, kids = [];
      for (let i = 0; i <= 10; i++) for (let j = 0; j <= 8; j++) kids.push(CIRC(ox + i * u, oy - j * u, 1.8, '#c9b8e8', { w: 0 }));
      let title, facts = [];
      if (v.shape === 1) {
        const sq = v.w === v.h, W = v.w * u, Hh = v.h * u;
        kids.push(R(ox, oy - Hh, W, Hh, sq ? '#ffe9a8' : '#cfe9ff', { w: 4 }));
        for (const [cx, cy, dx, dy] of [[ox, oy, 1, -1], [ox + W, oy, -1, -1], [ox, oy - Hh, 1, 1], [ox + W, oy - Hh, -1, 1]]) kids.push(s('path', { d: `M ${cx + dx * 12} ${cy} L ${cx + dx * 12} ${cy + dy * 12} L ${cx} ${cy + dy * 12}`, fill: 'none', stroke: '#c0392b', 'stroke-width': 2.5 }));
        const tick = (x1, y1, x2, y2, n) => { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, vert = x1 === x2; for (let k = 0; k < n; k++) kids.push(L(vert ? mx - 6 : mx + (k - (n - 1) / 2) * 6, vert ? my + (k - (n - 1) / 2) * 6 : my - 6, vert ? mx + 6 : mx + (k - (n - 1) / 2) * 6, vert ? my + (k - (n - 1) / 2) * 6 : my + 6, '#058a68', 2.5)); };
        tick(ox, oy, ox + W, oy, 1); tick(ox, oy - Hh, ox + W, oy - Hh, 1); tick(ox, oy, ox, oy - Hh, sq ? 1 : 2); tick(ox + W, oy, ox + W, oy - Hh, sq ? 1 : 2);
        title = sq ? 'a square' : 'a rectangle';
        facts = sq ? ['4 sides, all the same length', '4 corners, all square corners'] : ['4 sides: opposite sides are equal', '4 corners, all square corners'];
      } else if (v.shape === 0) {
        const bx = ox, by = oy, W = v.w * u, Hh = v.h * u;
        kids.push(s('polygon', { points: `${bx},${by} ${bx + W},${by} ${bx + W / 2},${by - Hh}`, fill: '#ffd2c2', stroke: INK, 'stroke-width': 4 }), ...[[bx, by], [bx + W, by], [bx + W / 2, by - Hh]].map(([px, py]) => CIRC(px, py, 6, C.o, { w: 2 })));
        title = 'a triangle'; facts = ['3 sides', '3 corners'];
      } else {
        const r = Math.min(v.w, 4.5) * u, cx = ox + 4 * u, cy = oy - 4 * u;
        kids.push(CIRC(cx, cy, r, '#d9f2e6', { w: 4 }), L(cx - r, cy, cx + r, cy, '#6b45c8', 3, { 'stroke-dasharray': '8 5' }), L(cx, cy - r, cx, cy + r, '#6b45c8', 3, { 'stroke-dasharray': '8 5' }), CIRC(cx, cy, 6, '#c0392b', { w: 0 }), T(cx + 16, cy - 10, 'centre', { a: 'start', z: 13, w: 700, f: '#c0392b' }));
        title = 'a circle'; facts = ['no straight sides, no corners', 'two folds meet at the centre'];
      }
      kids.push(T(470, 70, title, { z: 22, w: 700 }), ...facts.map((f, i) => T(470, 108 + i * 28, f, { z: 13, w: 600, f: '#6b5a8a' })));
      return { kids, say: v.shape === 1 ? (v.w === v.h ? `Both sticks are ${v.w} long, so the four sides are equal: this is a square, with 4 square corners.` : `The sides are ${v.w} and ${v.h} sticks. Opposite sides are equal and all 4 corners are square corners: this is a rectangle. Make both the same and it becomes a square.`) : v.shape === 0 ? 'A triangle has 3 sides and 3 corners.' : 'A circle has no straight sides and no corners. Folding it in half twice makes two lines that meet at its centre.' };
    },
  },
  arrays: {
    subject: 'maths', about: 'Equal groups in rows: g groups with e in each, counted by repeated addition (3 + 3 + 3), written as a multiplication fact (3 x 3 = 9) and shared back out as division (9 / 3 = 3). Turn the groups round and the total stays the same. For multiplication, times tables, equal groups, repeated addition, sharing, division facts, arrays.',
    sliders: [['g', 'Number of groups', 1, 10, 1, 3], ['e', 'In each group', 1, 10, 1, 3]],
    draw(v) {
      const total = v.g * v.e, cell = Math.min(340 / v.e, 230 / v.g, 36), x0 = 30, y0 = 40, hue = (r) => ['#e2583e', '#f2a33a', '#2fa84f', '#1f63d9', '#6b45c8'][r % 5], kids = [];
      for (let r = 0; r < v.g; r++) {
        kids.push(R(x0 - 4, y0 + r * cell - 1, v.e * cell + 6, cell - 2, 'none', { s: hue(r), w: 1.5, r: 6, x: { opacity: 0.55 } }));
        for (let c = 0; c < v.e; c++) kids.push(CIRC(x0 + c * cell + cell / 2 - 1, y0 + r * cell + cell / 2 - 1, cell * 0.34, hue(r), { w: 1 }));
      }
      const sum = v.g <= 6 ? Array(v.g).fill(v.e).join(' + ') : `${v.g} groups of ${v.e}`;
      kids.push(T(480, 66, `${v.g} × ${v.e} = ${total}`, { z: 30, w: 700 }), T(480, 108, `${v.g} group${v.g === 1 ? '' : 's'} of ${v.e}`, { z: 14, w: 600, f: '#6b5a8a' }), T(480, 142, v.g > 1 ? `${sum} = ${total}` : `${v.e} = ${total}`, { z: 14, w: 600 }), T(480, 192, `${total} ÷ ${v.g} = ${v.e}`, { z: 18, w: 700, f: '#058a68' }), T(480, 220, `${total} ÷ ${v.e} = ${v.g}`, { z: 18, w: 700, f: '#058a68' }));
      const one = v.g === 1;
      return { kids, say: `${v.g} group${one ? '' : 's'} of ${v.e} make${one ? 's' : ''} ${total}: ${v.g} \u00d7 ${v.e} = ${total}. ${one ? `One group of ${v.e} is just ${total}` : `Shared equally into ${v.g} groups, ${total} gives ${v.e} each`}: ${total} \u00f7 ${v.g} = ${v.e}. Turn it round and ${v.e} \u00d7 ${v.g} is also ${total}.` };
    },
  },
  metrerope: {
    subject: 'maths', about: 'A one-metre rod above ropes you lay end to end: a whole metre, a half-metre (the rope folded in half) or a quarter-metre (folded in half again). Lay several and see how long they make compared with one metre. For measuring length, metre, half a metre, quarter of a metre, comparing lengths, longer and shorter.',
    sliders: [['piece', 'Rope: 0 whole metre, 1 half-metre, 2 quarter-metre', 0, 2, 1, 1], ['count', 'How many ropes end to end', 1, 8, 1, 1]],
    draw(v) {
      const qs = [4, 2, 1][v.piece], name = ['one-metre', 'half-metre', 'quarter-metre'][v.piece], px = 270, kids = [];
      const count = Math.min(v.count, Math.floor(8 / qs)), q = count * qs, x0 = 30, len = (n) => (n / 4) * px;
      kids.push(R(x0, 60, len(4), 18, '#e8d7a8', { w: 3, r: 4 }), T(x0 + len(4) / 2, 52, 'metre rod: 1 metre', { z: 14, w: 700 }));
      for (const k of [1, 2, 3]) kids.push(L(x0 + len(k), 60, x0 + len(k), 78, '#a98c4a', 2));
      kids.push(L(x0 + len(4), 40, x0 + len(4), 164, '#c0392b', 2, { 'stroke-dasharray': '6 5' }), T(x0 + len(4), 180, '1 metre', { z: 12, w: 700, f: '#c0392b' }));
      const cols = ['#e2583e', '#f2a33a', '#2fa84f', '#1f63d9', '#6b45c8', '#e2583e', '#f2a33a', '#2fa84f'];
      for (let i = 0; i < count; i++) { const a = x0 + len(i * qs), w = len(qs); kids.push(R(a, 130, w, 22, cols[i % 8], { w: 2.5, r: 6 }), CIRC(a, 141, 5, INK, { w: 0 }), CIRC(a + w, 141, 5, INK, { w: 0 })); }
      const words = ['', 'a quarter of a metre', 'half a metre', 'three quarters of a metre', 'one metre', 'one and a quarter metres', 'one and a half metres', 'one and three quarters metres', 'two metres'][q];
      kids.push(T(300, 30, `${count} ${name} rope${count === 1 ? '' : 's'}`, { a: 'middle', z: 18 }), T(300, 224, words, { z: 20, w: 700, f: q === 4 ? '#058a68' : q > 4 ? '#c2510e' : INK }), T(300, 248, q < 4 ? 'shorter than one metre' : q === 4 ? 'exactly one metre' : 'longer than one metre', { z: 13, w: 600, f: '#6b5a8a' }));
      return { kids, say: `${count} ${name} rope${count === 1 ? '' : 's'} laid end to end ${count === 1 ? 'is' : 'make'} ${words}${q === 4 ? ': exactly one metre' : `, which is ${q < 4 ? 'shorter than' : 'longer than'} one metre`}. ${v.piece === 1 ? 'Folding a metre in half makes a half-metre.' : v.piece === 2 ? 'Folding the half-metre in half again makes a quarter-metre: four of them make one metre.' : 'This is the whole metre.'}` };
    },
  },
  wholeparts: {
    subject: 'maths', about: 'Make one litre from half-litre mugs and quarter-litre glasses poured into a one-litre bottle, or one kilogram from half-kilogram and quarter-kilogram packets on a pan balance against a one-kilogram packet. Param kind "litre" or "kg". For capacity, litres, weight, kilograms, half and quarter, comparing amounts.',
    params: { kind: 'litre' },
    sliders: [['piece', 'Pieces: 0 halves, 1 quarters', 0, 1, 1, 0], ['count', 'How many', 1, 8, 1, 1]],
    draw(v, p) {
      const kg = p.kind === 'kg', unit = kg ? 'kilogram' : 'litre', ab = kg ? 'kg' : 'l', qs = v.piece === 0 ? 2 : 1, count = Math.min(v.count, Math.floor(8 / qs)), q = count * qs, kids = [];
      const words = ['', `a quarter of a ${unit}`, `half a ${unit}`, `three quarters of a ${unit}`, `one ${unit}`, `one and a quarter ${unit}s`, `one and a half ${unit}s`, `one and three quarters ${unit}s`, `two ${unit}s`][q];
      if (kg) {
        const tilt = Math.max(-1, Math.min(1, (q - 4) / 4)) * 12, a = (tilt * Math.PI) / 180, cx = 140, cy = 90, arm = 80, lx = cx - arm * Math.cos(a), ly = cy - arm * Math.sin(a), rx = cx + arm * Math.cos(a), ry = cy + arm * Math.sin(a);
        kids.push(s('polygon', { points: `${cx - 24},250 ${cx + 24},250 ${cx},${cy}`, fill: '#d8cff0', stroke: INK, 'stroke-width': 3 }), L(lx, ly, rx, ry, INK, 6));
        for (const [px, py] of [[lx, ly], [rx, ry]]) kids.push(L(px, py, px - 36, py + 52, INK, 1.5), L(px, py, px + 36, py + 52, INK, 1.5), s('path', { d: `M ${px - 48} ${py + 52} Q ${px} ${py + 76} ${px + 48} ${py + 52} Z`, fill: '#f3f0ff', stroke: INK, 'stroke-width': 3 }));
        kids.push(R(lx - 28, ly + 22, 56, 30, '#8a6bd1', { w: 2.5, r: 5 }), T(lx, ly + 43, `1 ${ab}`, { z: 14, w: 700, f: '#fff' }));
        for (let i = 0; i < count; i++) kids.push(R(rx - 34 + (i % 4) * 18, ry + 44 - Math.floor(i / 4) * 12, 16, 10, v.piece === 0 ? '#e2583e' : '#f2a33a', { w: 1.5, r: 2 }));
      } else {
        const bx = 55, by = 50, bw = 100, bh = 200, lvl = Math.min(q, 4) / 4;
        kids.push(R(bx, by, bw, bh, '#ffffff', { w: 3, r: 10 }), R(bx + 3, by + bh - 3 - lvl * (bh - 6), bw - 6, lvl * (bh - 6), '#7fbfff', { w: 0 }));
        for (const [k, lab] of [[1, '¼'], [2, '½'], [3, '¾'], [4, '1 l']]) kids.push(L(bx + bw - 18, by + bh - 3 - (k / 4) * (bh - 6), bx + bw, by + bh - 3 - (k / 4) * (bh - 6), INK, 2), T(bx - 16, by + bh - 3 - (k / 4) * (bh - 6) + 5, lab, { z: 13, w: 700 }));
        if (q > 4) kids.push(T(bx + bw / 2, by + 36, 'overflowing!', { z: 14, w: 700, f: '#c0392b' }));
      }
      // the pieces laid out on the right: bigger for halves, smaller for quarters
      const w = v.piece === 0 ? 62 : 44, h = v.piece === 0 ? 56 : 40;
      for (let i = 0; i < count; i++) { const x = 270 + (i % 4) * (w + 12), y = 60 + Math.floor(i / 4) * (h + 18); kids.push(R(x, y, w, h, v.piece === 0 ? '#e2583e' : '#f2a33a', { w: 2.5, r: 8 }), T(x + w / 2, y + h / 2 + 5, v.piece === 0 ? `½ ${ab}` : `¼ ${ab}`, { z: v.piece === 0 ? 17 : 14, w: 700, f: '#fff' })); }
      kids.push(T(430, 226, words, { z: 18, w: 700, f: q === 4 ? '#058a68' : q > 4 ? '#c2510e' : INK }), T(430, 250, q < 4 ? `less than one ${unit}` : q === 4 ? `exactly one ${unit}` : `more than one ${unit}`, { z: 13, w: 600, f: '#6b5a8a' }));
      const nm = v.piece === 0 ? `half-${unit}` : `quarter-${unit}`;
      return { kids, say: `${count} ${nm} ${kg ? 'packet' : 'vessel'}${count === 1 ? '' : 's'} make ${words}${q === 4 ? `: exactly one ${unit}` : `, which is ${q < 4 ? 'less' : 'more'} than one ${unit}`}. ${v.piece === 0 ? `Two half-${unit}s equal one ${unit}.` : `Four quarter-${unit}s equal one ${unit}.`}` };
    },
  },
  halfdouble: {
    subject: 'maths', about: 'Two children and their marbles: the first child has some marbles, the second has half as many or double as many. Half of 6 is 3 and 6 is double 3; an odd number such as 5 or 13 cannot be shared into two equal whole halves. For half, double, halving and doubling, odd and even, comparing numbers of things.',
    sliders: [['n', 'Marbles the first child has', 1, 20, 1, 6], ['who', 'Second child has: 0 half, 1 double', 0, 1, 1, 0]],
    draw(v) {
      const kids = [], r = 8, sp = 21, dots = (count, y, col, x0 = 30) => { for (let i = 0; i < count; i++) kids.push(CIRC(x0 + (i % 10) * sp, y + Math.floor(i / 10) * sp, r, col, { w: 1.5 })); };
      const odd = v.n % 2 === 1, second = v.who === 0 ? Math.floor(v.n / 2) : v.n * 2;
      kids.push(T(30, 40, `First child: ${v.n}`, { a: 'start', z: 15, w: 700, f: '#1f63d9' }));
      dots(v.n, 62, '#1f63d9');
      const y2 = 62 + Math.ceil(v.n / 10) * sp + 44;
      kids.push(T(30, y2 - 22, v.who === 0 ? (odd ? 'Half is not a whole number' : `Second child (half): ${second}`) : `Second child (double): ${second}`, { a: 'start', z: 15, w: 700, f: odd && v.who === 0 ? '#c0392b' : '#c2510e' }));
      if (!(v.who === 0 && odd)) dots(second, y2, '#f2a33a');
      else { dots(second, y2, '#f2a33a'); kids.push(CIRC(30 + (second % 10) * sp + 0, y2 + Math.floor(second / 10) * sp, r, 'none', { s: '#c0392b', w: 2, x: { 'stroke-dasharray': '3 3' } }), T(30 + (second % 10) * sp + 20, y2 + Math.floor(second / 10) * sp + 5, 'one left over', { a: 'start', z: 12, w: 600, f: '#c0392b' })); }
      const lines = v.who === 0 ? (odd ? [`${v.n} is odd`, 'it cannot be shared', 'into two equal halves'] : [`half of ${v.n} is ${second}`, `${v.n} is double ${second}`]) : [`double ${v.n} is ${second}`, `${v.n} is half of ${second}`];
      lines.forEach((t, i) => kids.push(T(470, 70 + i * 34, t, { z: 17, w: 700, f: i === 0 ? '#058a68' : INK })));
      return { kids, say: v.who === 0 ? (odd ? `${v.n} is an odd number: share it between two and one marble is left over, so it has no whole half.` : `Half of ${v.n} is ${second}, and ${v.n} is double ${second}.`) : `Double ${v.n} is ${second}: twice as many. And ${v.n} is half of ${second}.` };
    },
  },
  roundsolids: {
    subject: 'maths', about: 'The solid shapes of everyday objects: cube, cuboid, cone, cylinder and sphere. Pick a shape and highlight its flat faces, its curved surface or its corners, and read the counts: a cube and a cuboid have 6 flat faces, 12 edges and 8 corners; a cone has 1 flat face, 1 curved surface and 1 corner; a cylinder has 2 flat faces, 1 curved surface and no corners; a sphere has only a curved surface. For solid shapes, faces, edges, corners, boxes, balls, drums and cones.',
    sliders: [['shape', 'Shape: 0 cube, 1 cuboid, 2 cone, 3 cylinder, 4 sphere', 0, 4, 1, 0], ['look', 'Show: 0 shape, 1 flat faces, 2 corners, 3 curved surface', 0, 3, 1, 0]],
    draw(v) {
      const names = ['cube', 'cuboid', 'cone', 'cylinder', 'sphere'], info = [[6, 0, '12 straight', 8], [6, 0, '12 straight', 8], [1, 1, '1 curved', 1], [2, 1, '2 curved', 0], [0, 1, 'none', 0]][v.shape];
      const [flat, curved, edges, corners] = info, kids = [], base = '#e7defa', flatC = v.look === 1 ? '#ffb86b' : base, curvC = v.look === 3 ? '#8fd3ff' : base;
      if (v.shape <= 1) {
        const W = v.shape === 0 ? 110 : 160, H = v.shape === 0 ? 110 : 80, d = 38, x = 70, y = 110 + d;
        kids.push(s('polygon', { points: `${x},${y} ${x + d},${y - d} ${x + d + W},${y - d} ${x + W},${y}`, fill: flatC, stroke: INK, 'stroke-width': 3 }), s('polygon', { points: `${x + W},${y} ${x + d + W},${y - d} ${x + d + W},${y - d + H} ${x + W},${y + H}`, fill: flatC, stroke: INK, 'stroke-width': 3 }), R(x, y, W, H, flatC, { w: 3 }));
        if (v.look === 2) for (const [px, py] of [[x, y], [x + W, y], [x, y + H], [x + W, y + H], [x + d, y - d], [x + d + W, y - d], [x + d + W, y - d + H]]) kids.push(CIRC(px, py, 8, '#c0392b', { w: 2 }));
        if (v.look === 2) kids.push(CIRC(x + d, y - d + H, 8, '#c0392b', { w: 2, x: { opacity: 0.45 } }));
      } else if (v.shape === 2) {
        kids.push(s('path', { d: 'M 190 55 L 120 205 A 70 22 0 0 0 260 205 Z', fill: curvC, stroke: INK, 'stroke-width': 3 }), s('ellipse', { cx: 190, cy: 205, rx: 70, ry: 22, fill: flatC, stroke: INK, 'stroke-width': 3 }));
        if (v.look === 2) kids.push(CIRC(190, 55, 9, '#c0392b', { w: 2 }));
      } else if (v.shape === 3) {
        kids.push(s('path', { d: 'M 128 90 L 128 210 A 62 20 0 0 0 252 210 L 252 90 Z', fill: curvC, stroke: INK, 'stroke-width': 3 }), s('ellipse', { cx: 190, cy: 90, rx: 62, ry: 20, fill: flatC, stroke: INK, 'stroke-width': 3 }));
        if (v.look === 1) kids.push(T(190, 262, 'the bottom is flat too', { z: 12, w: 600, f: '#c2510e' }));
      } else {
        kids.push(CIRC(190, 150, 88, curvC, { w: 3 }), s('ellipse', { cx: 160, cy: 112, rx: 22, ry: 13, fill: '#ffffff', opacity: 0.55 }));
      }
      kids.push(T(440, 60, names[v.shape], { z: 24, w: 700 }), T(440, 112, `flat faces: ${flat}`, { z: 15, w: 700, f: '#c2510e' }), T(440, 142, `curved surfaces: ${curved}`, { z: 15, w: 700, f: '#1f6fb8' }), T(440, 172, `edges: ${edges}`, { z: 15, w: 600 }), T(440, 202, `corners: ${corners}`, { z: 15, w: 700, f: '#c0392b' }));
      const sayLook = ['', flat ? ` The ${flat === 1 ? 'flat face is' : `${flat} flat faces are`} lit up.` : ' It has no flat faces.', corners ? ` The ${corners === 1 ? 'corner is' : `${corners} corners are`} marked.` : ' It has no corners.', ' The curved surface is lit up.'][v.look];
      return { kids, say: `A ${names[v.shape]} has ${flat} flat face${flat === 1 ? '' : 's'}, ${curved} curved surface${curved === 1 ? '' : 's'} and ${corners} corner${corners === 1 ? '' : 's'}.${sayLook}` };
    },
  },
  numberchart: {
    subject: 'maths', about: 'A number chart from 1 to 100, ten in a row. Pick where to start, how big each step is (forward to count on, negative to count back) and how many numbers, and the chart shades the pattern: 1, 4, 7 jumps by 3; 1, 12, 23 slants down the chart; counting by 10 goes straight down a column. For number charts, number patterns, counting forward and backward, skip counting, what comes before and after.',
    sliders: [['start', 'Start at', 1, 99, 1, 1], ['step', 'Step (negative counts back)', -12, 12, 1, 3], ['n', 'How many numbers', 2, 12, 1, 6]],
    draw(v) {
      const cell = 27, x0 = 24, y0 = 14, seq = [];
      for (let i = 0; i < v.n; i++) { const val = v.start + i * v.step; if (val < 1 || val > 100) break; seq.push(val); }
      const at = (val) => [x0 + ((val - 1) % 10) * cell, y0 + Math.floor((val - 1) / 10) * cell], kids = [], on = new Set(seq);
      for (let val = 1; val <= 100; val++) {
        const [x, y] = at(val), idx = seq.indexOf(val);
        kids.push(R(x, y, cell - 2, cell - 2, idx >= 0 ? (idx === 0 ? '#2fa84f' : '#ffcc33') : (Math.floor((val - 1) / 10) % 2 ? '#f3f0ff' : '#ffffff'), { w: 1, r: 4 }), T(x + (cell - 2) / 2, y + cell / 2 + 3, String(val), { z: 11, w: on.has(val) ? 700 : 500, f: idx === 0 ? '#ffffff' : INK }));
      }
      if ([9, 10, 11].includes(Math.abs(v.step))) for (let i = 1; i < seq.length; i++) { const [ax, ay] = at(seq[i - 1]), [bx, by] = at(seq[i]); kids.push(L(ax + cell / 2 - 1, ay + cell / 2 - 1, bx + cell / 2 - 1, by + cell / 2 - 1, '#c2510e', 2, { opacity: 0.6 })); }
      const rule = v.step === 0 ? 'the same number again' : v.step > 0 ? `add ${v.step} each time` : `take away ${-v.step} each time`;
      const shape = Math.abs(v.step) === 10 ? 'straight down a column' : Math.abs(v.step) === 1 ? 'along a row' : Math.abs(v.step) === 11 ? 'slanting across the chart' : Math.abs(v.step) === 9 ? 'slanting the other way' : '';
      kids.push(T(450, 60, seq.length > 1 ? rule : 'start somewhere', { z: 17, w: 700, f: '#058a68' }));
      const line = seq.join(', ');
      kids.push(T(450, 100, line.length > 34 ? line.slice(0, line.lastIndexOf(',', 34)) + ',' : line, { z: 14, w: 700 }), ...(line.length > 34 ? [T(450, 122, line.slice(line.lastIndexOf(',', 34) + 2), { z: 14, w: 700 })] : []));
      if (shape) kids.push(T(450, 164, `on the chart it goes ${shape}`, { z: 13, w: 600, f: '#6b5a8a' }));
      if (seq.length < v.n) kids.push(T(450, 200, 'the next one is off the chart', { z: 13, w: 600, f: '#c0392b' }));
      return { kids, say: seq.length < 2 ? `Start at ${v.start}.` : `Starting at ${v.start}, ${rule}: ${line}.${shape ? ` On the chart this goes ${shape}.` : ''}${seq.length < v.n ? ' The next one would be off the chart.' : ''}` };
    },
  },
  threadline: {
    subject: 'maths', about: 'A thread held between two hands. Pull it tight and it is a straight line: standing (vertical) when it points up and down, sleeping (horizontal) when it lies flat, slanting in between. Bring the hands closer and the thread droops into a curved line. For types of lines, straight and curved lines, vertical, horizontal, slanting.',
    sliders: [['tilt', 'Tilt the thread (degrees from lying flat)', 0, 90, 15, 90], ['slack', 'Bring the hands closer (0 = pulled tight)', 0, 6, 1, 0]],
    draw(v) {
      const a = (v.tilt * Math.PI) / 180, dx = Math.cos(a), dy = -Math.sin(a), cx = 190, cy = 150, dd = 250 - v.slack * 32;
      const p1 = [cx - (dx * dd) / 2, cy - (dy * dd) / 2], p2 = [cx + (dx * dd) / 2, cy + (dy * dd) / 2], bulge = v.slack * 24, ctl = [cx + Math.sin(a) * bulge, cy + Math.cos(a) * bulge];
      const name = v.slack > 0 ? 'a curved line' : v.tilt === 90 ? 'a standing (vertical) line' : v.tilt === 0 ? 'a sleeping (horizontal) line' : 'a slanting line';
      const kids = [s('path', { d: `M ${p1[0]} ${p1[1]} Q ${ctl[0] * 2 - (p1[0] + p2[0]) / 2} ${ctl[1] * 2 - (p1[1] + p2[1]) / 2} ${p2[0]} ${p2[1]}`, fill: 'none', stroke: '#c2510e', 'stroke-width': 5, 'stroke-linecap': 'round' })];
      for (const [px, py] of [p1, p2]) kids.push(CIRC(px, py, 15, '#f2c9a0', { w: 3 }));
      kids.push(T(486, 110, name, { z: 20, w: 700, f: v.slack > 0 ? '#1f6fb8' : '#058a68' }), T(486, 146, v.slack > 0 ? 'the thread is loose' : 'the thread is pulled tight', { z: 14, w: 600, f: '#6b5a8a' }), T(486, 172, v.slack > 0 ? 'so it is not straight' : 'so it is a straight line', { z: 14, w: 600, f: '#6b5a8a' }));
      return { kids, say: v.slack > 0 ? 'With the hands brought closer the thread is loose and droops: it is a curved line, not a straight one.' : v.tilt === 90 ? 'Pulled tight and pointing up and down, the thread is a straight line. A standing line is also called a vertical line.' : v.tilt === 0 ? 'Pulled tight and lying flat, the thread is a straight line. A sleeping line is also called a horizontal line.' : 'Pulled tight but tilted between standing and sleeping, the thread is a slanting line, which is still straight.' };
    },
  },
  compare2: {
    subject: 'maths', about: 'Compare two numbers up to 99 shown as tens rods and ones dots: compare the tens first, and if they are the same look at the ones. 47 is more than 43 because both have 4 tens but 7 ones is more than 3 ones. For comparing numbers, more than, less than, equal, greater and smaller, tens and ones.',
    sliders: [['a', 'First number', 10, 99, 1, 43], ['b', 'Second number', 10, 99, 1, 47]],
    draw(v) {
      const kids = [], show = (n, x0, col) => {
        const te = Math.floor(n / 10), on = n % 10;
        for (let i = 0; i < te; i++) kids.push(R(x0 + i * 15, 56, 12, 70, col[0], { w: 1.8, r: 2 }));
        for (let i = 0; i < on; i++) kids.push(CIRC(x0 + 7 + (i % 5) * 20, 150 + Math.floor(i / 5) * 22, 8, col[1], { w: 1.8 }));
        kids.push(T(x0 + 65, 38, String(n), { z: 26, w: 700 }), T(x0 + 65, 216, `${te} ten${te === 1 ? '' : 's'}, ${on} one${on === 1 ? '' : 's'}`, { z: 13, w: 600, f: '#6b5a8a' }));
      };
      show(v.a, 30, ['#5fc9b8', '#f2a33a']); show(v.b, 340, ['#5fc9b8', '#f2a33a']);
      const sym = v.a === v.b ? '=' : v.a > v.b ? '>' : '<', ta = Math.floor(v.a / 10), tb = Math.floor(v.b / 10);
      kids.push(T(300, 100, sym, { z: 54, w: 700, f: '#6b45c8' }));
      const why = v.a === v.b ? 'the same tens and the same ones: they are equal' : ta !== tb ? `compare the tens first: ${Math.max(ta, tb)} tens is more than ${Math.min(ta, tb)} tens` : `the tens are the same, so look at the ones: ${Math.max(v.a, v.b) % 10} ones is more than ${Math.min(v.a, v.b) % 10} ones`;
      kids.push(T(300, 262, why, { z: 14, w: 700, f: '#058a68' }));
      return { kids, say: v.a === v.b ? `${v.a} and ${v.b} are equal: ${why}.` : `${Math.max(v.a, v.b)} is more than ${Math.min(v.a, v.b)}: ${why}. So ${v.a} ${v.a > v.b ? 'is more than' : 'is less than'} ${v.b}.` };
    },
  },
  addpyramid: {
    subject: 'maths', about: 'An addition pyramid: four numbers in the bottom row, and every number above is the sum of the two numbers below it, up to the top. With 3, 9, 6, 5 the next row is 12, 15, 11. For addition pyramids, adding pairs, number pyramids, addition facts and fact families.',
    sliders: [['a', 'First number', 0, 20, 1, 3], ['b', 'Second number', 0, 20, 1, 9], ['c', 'Third number', 0, 20, 1, 6], ['d', 'Fourth number', 0, 20, 1, 5]],
    draw(v) {
      const rows = [[v.a, v.b, v.c, v.d]];
      while (rows[rows.length - 1].length > 1) { const r = rows[rows.length - 1]; rows.push(r.slice(1).map((x, i) => r[i] + x)); }
      const w = 66, gap = 4, h = 40, cx = 170, cols = ['#7fb3d5', '#5fc9b8', '#f2a33a', '#e2583e'], kids = [], eq = [];
      rows.forEach((r, lv) => r.forEach((n, i) => {
        const x = cx - (r.length * (w + gap) - gap) / 2 + i * (w + gap), y = 224 - lv * 54;
        kids.push(R(x, y, w, h, cols[lv], { w: 2.5, r: 6 }), T(x + w / 2, y + 27, String(n), { z: 20, w: 700, f: lv === 3 ? '#ffffff' : INK }));
        if (lv > 0) eq.push(`${rows[lv - 1][i]} + ${rows[lv - 1][i + 1]} = ${n}`);
      }));
      eq.forEach((t, i) => kids.push(T(470, 66 + i * 26, t, { z: 14, w: 600, f: i >= 5 ? '#c0392b' : i >= 3 ? '#c2510e' : INK })));
      const top = rows[3][0];
      return { kids, say: `Each number is the sum of the two below it: ${rows[0][0]} + ${rows[0][1]} = ${rows[1][0]}, ${rows[0][1]} + ${rows[0][2]} = ${rows[1][1]}, ${rows[0][2]} + ${rows[0][3]} = ${rows[1][2]}. Then ${rows[1][0]} + ${rows[1][1]} = ${rows[2][0]}, ${rows[1][1]} + ${rows[1][2]} = ${rows[2][1]}, and the top is ${rows[2][0]} + ${rows[2][1]} = ${top}.` };
    },
  },
  picturechart: {
    subject: 'maths', about: 'A picture chart where one face stands for one child: each row is a favourite colour, a way of coming to school or a game, and the child changes how many children chose it. The chart shows which row has the most and which has the fewest, and the total. Param kind: colours, modes, games, foods, toys or things. For data handling, tables and charts, most and least, more and fewer.',
    params: { kind: 'colours' },
    dynamicSliders: (p) => { const n = (WIDGETS.picturechart.sets[p.kind] || WIDGETS.picturechart.sets.things).length, d = [3, 5, 2, 4, 6]; return Array.from({ length: n }, (_, i) => ['abcde'[i], `Children: ${(WIDGETS.picturechart.sets[p.kind] || WIDGETS.picturechart.sets.things)[i]}`, 0, 10, 1, d[i]]); },
    sets: { colours: ['red', 'green', 'blue', 'yellow'], modes: ['on foot', 'autorickshaw', 'bus', 'bike', 'bicycle'], games: ['gilli-danda', 'kabaddi', 'pithu', 'football', 'cricket'], foods: ['fruit chaat', 'sandwich', 'gola', 'chikki', 'pakora'], toys: ['toys', 'board games', 'sports items', 'books'], things: ['first', 'second', 'third', 'fourth'] },
    draw(v, p) {
      const names = this.sets[p.kind] || this.sets.things, counts = names.map((_, i) => v['abcde'[i]] || 0), total = counts.reduce((x, y) => x + y, 0), kids = [];
      names.forEach((nm, r) => {
        const y = 40 + r * 48;
        kids.push(T(18, y + 5, nm, { a: 'start', z: 14, w: 700 }), L(130, y + 20, 130 + 11 * 22, y + 20, '#e6dff5', 1.5));
        for (let i = 0; i < counts[r]; i++) { const x = 142 + i * 22; kids.push(CIRC(x, y, 9, '#ffd86b', { w: 1.8 }), CIRC(x - 3, y - 2, 1.3, INK, { w: 0 }), CIRC(x + 3, y - 2, 1.3, INK, { w: 0 }), s('path', { d: `M ${x - 4} ${y + 2} Q ${x} ${y + 7} ${x + 4} ${y + 2}`, fill: 'none', stroke: INK, 'stroke-width': 1.4, 'stroke-linecap': 'round' })); }
        kids.push(T(130 + 11 * 22 + 10, y + 5, String(counts[r]), { a: 'start', z: 15, w: 700, f: '#6b5a8a' }));
      });
      const hi = Math.max(...counts), lo = Math.min(...counts), most = names.filter((_, i) => counts[i] === hi), least = names.filter((_, i) => counts[i] === lo);
      const list = (a) => (a.length > 2 ? `${a.length} rows` : a.join(' and '));
      const tie = hi === lo ? 'all the same' : null;
      kids.push(T(430, 70, 'one face = one child', { a: 'start', z: 12, w: 600, f: '#6b5a8a' }), T(430, 122, !total ? 'no one yet' : tie ? 'all rows are equal' : `most: ${list(most)}`, { a: 'start', z: 15, w: 700, f: '#058a68' }), T(430, 150, total && !tie ? `fewest: ${list(least)}` : '', { a: 'start', z: 15, w: 700, f: '#c2510e' }), T(430, 196, `${total} children in all`, { a: 'start', z: 14, w: 600 }));
      return { kids, say: !total ? 'Add some faces to the chart.' : hi === lo ? `Every row has ${hi}: they are all equal.` : `${list(most)} ${most.length > 1 ? 'are' : 'is'} liked by the most children (${hi}), and ${list(least)} by the fewest (${lo}). In all there are ${total} children.` };
    },
  },
  seesaw: {
    subject: 'maths', about: 'A see-saw: choose what goes on each side (carrot, mango, coconut, cauliflower, bottle gourd, watermelon) and how many, and the heavier side goes down; when the two sides weigh about the same it stays level. The weights are rough relative ones: a coconut is about two mangoes, a watermelon about ten. For heavier and lighter, comparing weights, balancing, how many of one thing balance another.',
    sliders: [['li', 'Left side: 0 carrot, 1 mango, 2 coconut, 3 cauliflower, 4 bottle gourd, 5 watermelon', 0, 5, 1, 5], ['lc', 'How many on the left', 1, 12, 1, 1], ['ri', 'Right side: same list', 0, 5, 1, 1], ['rc', 'How many on the right', 1, 12, 1, 4]],
    draw(v) {
      const items = [['carrot', 'carrots', 0.3, '#f2994a', 7], ['mango', 'mangoes', 1, '#f2c94c', 10], ['coconut', 'coconuts', 2, '#8d6e63', 13], ['cauliflower', 'cauliflowers', 2.5, '#f1ecd8', 14], ['bottle gourd', 'bottle gourds', 3, '#9ccc65', 15], ['watermelon', 'watermelons', 10, '#43a047', 26]];
      const A = items[v.li], B = items[v.ri], wl = A[2] * v.lc, wr = B[2] * v.rc, kids = [], close = Math.abs(wl - wr) / Math.max(wl, wr) < 0.04;
      const sign = close ? 0 : wl > wr ? 1 : -1, ang = sign ? (sign * (7 + 7 * Math.min(1, Math.log2(Math.max(wl, wr) / Math.min(wl, wr)) / 3)) * Math.PI) / 180 : 0;
      const px = 190, py = 200, half = 150, ex = (side) => [px + side * half * Math.cos(ang), py + side * -half * Math.sin(ang)];
      const [lx, ly] = ex(-1), [rx, ry] = ex(1);
      kids.push(s('polygon', { points: `${px - 26},262 ${px + 26},262 ${px},${py + 4}`, fill: '#d8cff0', stroke: INK, 'stroke-width': 3 }), L(lx, ly, rx, ry, INK, 8));
      const pile = (it, count, side) => {
        const r = it[4], cols = Math.min(count, r > 20 ? 1 : 4), fx = px + side * 0.62 * half * Math.cos(ang), fy = py - side * 0.62 * half * Math.sin(ang);
        for (let k = 0; k < count; k++) { const c = k % cols, rw = Math.floor(k / cols); kids.push(CIRC(fx + (c - (cols - 1) / 2) * (2 * r + 2), fy - 6 - r - rw * (2 * r), r, it[3], { w: 2 })); }
      };
      pile(A, v.lc, -1); pile(B, v.rc, 1);
      const name = (it, n) => `${n} ${n === 1 ? it[0] : it[1]}`;
      const verdict = close ? 'they balance' : wl > wr ? 'the left side goes down' : 'the right side goes down';
      kids.push(T(470, 78, `left: ${name(A, v.lc)}`, { z: 14, w: 700 }), T(470, 108, `right: ${name(B, v.rc)}`, { z: 14, w: 700 }), T(470, 160, verdict, { z: 18, w: 700, f: close ? '#058a68' : '#c2510e' }), T(470, 188, close ? 'about the same weight' : wl > wr ? 'the left side is heavier' : 'the right side is heavier', { z: 12, w: 600, f: '#6b5a8a' }));
      return { kids, say: close ? `${name(A, v.lc)} and ${name(B, v.rc)} weigh about the same, so the see-saw stays level.` : `${wl > wr ? `${name(A, v.lc)} ${v.lc === 1 ? 'is' : 'are'} heavier than ${name(B, v.rc)}, so the left side goes down` : `${name(B, v.rc)} ${v.rc === 1 ? 'is' : 'are'} heavier than ${name(A, v.lc)}, so the right side goes down`}. The lighter side goes up.` };
    },
  },
  bottles: {
    subject: 'maths', about: 'Two bottles filled with glasses of water: Raghu\'s bottle holds four glasses, and a friend\'s bottle holds more, fewer or the same. Pour glasses into both and see which fills first, which holds more, and when a bottle overflows. For capacity, how many glasses fill a bottle, comparing equal, more and less.',
    sliders: [['friend', 'Friend\'s bottle holds (glasses)', 1, 8, 1, 6], ['poured', 'Glasses poured into each bottle', 0, 8, 1, 0]],
    draw(v) {
      const kids = [], base = 250, bottle = (cap, x0, label, col) => {
        const h = 50 + 22 * cap, w = 64 + cap * 4, filled = Math.min(v.poured, cap), inner = h - 8;
        kids.push(R(x0, base - h, w, h, '#ffffff', { w: 3, r: 10 }), R(x0 + 3, base - 4 - (filled / cap) * inner, w - 6, (filled / cap) * inner, col, { w: 0, x: { opacity: 0.85 } }));
        for (let k = 1; k < cap; k++) kids.push(L(x0, base - 4 - (k / cap) * inner, x0 + 10, base - 4 - (k / cap) * inner, INK, 1.5));
        kids.push(T(x0 + w / 2, base + 22, label, { z: 13, w: 700 }), T(x0 + w / 2, base + 40, `holds ${cap}`, { z: 12, w: 600, f: '#6b5a8a' }));
        if (v.poured > cap) kids.push(T(x0 + w / 2, base - h - 8, 'overflows!', { z: 13, w: 700, f: '#c0392b' }));
        return w;
      };
      bottle(4, 60, 'Raghu’s bottle', '#7fbfff'); bottle(v.friend, 250, 'friend’s bottle', '#5fc9b8');
      const cmp = v.friend === 4 ? 'the same as' : v.friend > 4 ? 'more than' : 'less than';
      kids.push(T(480, 80, `${v.poured} glass${v.poured === 1 ? '' : 'es'} poured into each`, { a: 'middle', z: 14, w: 700 }), T(480, 130, `friend’s bottle holds`, { a: 'middle', z: 13, w: 600, f: '#6b5a8a' }), T(480, 160, cmp, { a: 'middle', z: 20, w: 700, f: v.friend === 4 ? '#058a68' : '#c2510e' }), T(480, 188, 'Raghu’s bottle', { a: 'middle', z: 13, w: 600, f: '#6b5a8a' }));
      return { kids, say: `Raghu’s bottle holds 4 glasses and the friend’s holds ${v.friend}: the friend’s bottle holds ${cmp} Raghu’s.${v.poured ? ` After ${v.poured} glass${v.poured === 1 ? '' : 'es'} in each, ${v.poured >= 4 ? 'Raghu’s bottle is full' + (v.poured > 4 ? ' and overflowing' : '') : 'Raghu’s bottle is not full yet'}${v.poured >= v.friend ? ` and the friend’s is full${v.poured > v.friend ? ' and overflowing' : ''}` : ' and the friend’s is not full yet'}.` : ''}` };
    },
  },
  counting: {
    subject: 'maths', about: 'Count objects in two ten-frames from 0 to 20: each counter you add makes one more. It shows the numeral, the number word, and one more and one less than the number. For counting, numbers up to 20, number names, one more and one less, more and fewer.',
    sliders: [['n', 'How many', 0, 20, 1, 3]],
    draw(v) {
      const names = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
      const kids = [], cw = 40, x0 = 24;
      for (let fr = 0; fr < 2; fr++) for (let i = 0; i < 10; i++) {
        const x = x0 + (i % 5) * cw, y = 50 + fr * 110 + Math.floor(i / 5) * cw, k = fr * 10 + i;
        kids.push(R(x, y, cw - 4, cw - 4, '#f3f0ff', { w: 2, r: 5 }));
        if (k < v.n) kids.push(CIRC(x + (cw - 4) / 2, y + (cw - 4) / 2, 14, fr ? '#f2a33a' : '#5fc9b8', { w: 2 }));
      }
      kids.push(T(x0 + 100, 36, 'a frame holds ten', { z: 11, w: 600, f: '#6b5a8a' }), T(430, 90, String(v.n), { z: 72, w: 700 }), T(430, 140, names[v.n], { z: 24, w: 700, f: '#6b45c8' }));
      kids.push(T(430, 192, v.n < 20 ? `one more is ${v.n + 1}` : 'that is the most here', { z: 15, w: 700, f: '#058a68' }), T(430, 220, v.n > 0 ? `one less is ${v.n - 1}` : 'nothing yet', { z: 15, w: 700, f: '#c2510e' }));
      return { kids, say: v.n === 0 ? 'There are none yet. Add one and there is one.' : `${names[v.n][0].toUpperCase()}${names[v.n].slice(1)}: ${v.n}. ${v.n < 20 ? `One more makes ${names[v.n + 1]}` : 'That is twenty'}, and one less is ${names[v.n - 1]}.` };
    },
  },
  position: {
    subject: 'maths', about: 'Where is the red ball? Move it above a table, on it, under it or near it, or put it in or out of a basket, and the words follow: above, on, under, near, in (inside), out (outside). For position words, above, below, on, under, inside, outside, near.',
    sliders: [['place', 'Where is the ball? 0 above, 1 on, 2 under, 3 near, 4 in, 5 out', 0, 5, 1, 1]],
    draw(v) {
      const kids = [L(30, 262, 570, 262, '#c9b8e8', 3)], ball = (x, y) => CIRC(x, y, 18, '#e2583e', { w: 3 });
      const words = ['above', 'on', 'under', 'near', 'in', 'out'], sent = ['The ball is above the table.', 'The ball is on the table.', 'The ball is under the table.', 'The ball is near the table.', 'The ball is in the basket (inside).', 'The ball is out of the basket (outside).'];
      if (v.place <= 3) {
        kids.push(R(110, 170, 200, 14, '#c9a46a', { w: 3, r: 3 }), R(124, 184, 12, 78, '#c9a46a', { w: 3 }), R(284, 184, 12, 78, '#c9a46a', { w: 3 }), T(210, 292, 'table', { z: 12, w: 600, f: '#6b5a8a' }));
        const pos = [[210, 96], [210, 152], [210, 240], [360, 242]][v.place];
        if (v.place === 0) kids.push(L(210, 120, 210, 160, '#6b45c8', 2, { 'stroke-dasharray': '4 4' }));
        kids.push(ball(...pos));
      } else {
        kids.push(s('path', { d: 'M 130 196 L 150 262 L 270 262 L 290 196 Z', fill: '#e8d7a8', stroke: INK, 'stroke-width': 3 }), s('ellipse', { cx: 210, cy: 196, rx: 80, ry: 12, fill: 'none', stroke: INK, 'stroke-width': 3 }), T(210, 292, 'basket', { z: 12, w: 600, f: '#6b5a8a' }));
        kids.push(v.place === 4 ? ball(210, 236) : ball(350, 242));
      }
      kids.push(T(470, 120, words[v.place].toUpperCase(), { z: 40, w: 700, f: '#6b45c8' }), T(470, 170, v.place >= 4 ? 'say IN or OUT' : 'a position word', { z: 13, w: 600, f: '#6b5a8a' }));
      return { kids, say: sent[v.place] };
    },
  },
  rollslide: {
    subject: 'maths', about: 'Push things along a flat surface: a ball rolls (R), a cube or brick slides (S), and a tin or a cone can do both depending on how it sits (rolls lying on its side, slides standing on a flat end). For rolling and sliding, round and flat shapes, features of objects.',
    sliders: [['obj', 'Object: 0 ball, 1 cube, 2 brick, 3 tin, 4 cone', 0, 4, 1, 0], ['sit', 'How it sits: 0 lying on its side, 1 standing on a flat end', 0, 1, 1, 0]],
    draw(v) {
      const names = ['ball', 'cube', 'brick', 'tin', 'cone'], kids = [L(30, 214, 400, 214, '#c9b8e8', 3)], ink = { w: 3 };
      const rolls = v.obj === 0 || ((v.obj === 3 || v.obj === 4) && v.sit === 0), slides = v.obj === 1 || v.obj === 2 || ((v.obj === 3 || v.obj === 4) && v.sit === 1);
      if (v.obj === 0) kids.push(CIRC(130, 180, 34, '#f2c94c', ink));
      else if (v.obj === 1) kids.push(R(100, 154, 60, 60, '#7fb3d5', ink));
      else if (v.obj === 2) kids.push(R(80, 164, 100, 50, '#e2583e', ink));
      else if (v.obj === 3 && v.sit === 0) kids.push(R(90, 164, 80, 50, '#9aa5b1', ink), s('ellipse', { cx: 170, cy: 189, rx: 12, ry: 25, fill: '#c8d0d8', stroke: INK, 'stroke-width': 3 }));
      else if (v.obj === 3) kids.push(R(105, 134, 50, 80, '#9aa5b1', ink), s('ellipse', { cx: 130, cy: 134, rx: 25, ry: 10, fill: '#c8d0d8', stroke: INK, 'stroke-width': 3 }));
      else if (v.sit === 0) kids.push(s('polygon', { points: '90,189 170,163 170,215', fill: '#f2a33a', stroke: INK, 'stroke-width': 3 }), s('ellipse', { cx: 170, cy: 189, rx: 12, ry: 26, fill: '#f6c27a', stroke: INK, 'stroke-width': 3 }));
      else kids.push(s('polygon', { points: '94,208 166,208 130,128', fill: '#f2a33a', stroke: INK, 'stroke-width': 3 }), s('ellipse', { cx: 130, cy: 208, rx: 36, ry: 9, fill: '#f6c27a', stroke: INK, 'stroke-width': 3 }));
      if (rolls) kids.push(s('path', { d: 'M 230 150 Q 290 110 350 150', fill: 'none', stroke: '#058a68', 'stroke-width': 4 }), s('path', { d: 'M 230 175 Q 290 135 350 175', fill: 'none', stroke: '#058a68', 'stroke-width': 4 }), T(290, 108, 'rolls', { z: 14, w: 700, f: '#058a68' }));
      if (slides) kids.push(L(230, 196, 350, 196, '#c2510e', 5), s('polygon', { points: '350,188 366,196 350,204', fill: '#c2510e' }), T(290, 178, 'slides', { z: 14, w: 700, f: '#c2510e' }));
      kids.push(T(470, 90, names[v.obj], { z: 18, w: 700 }));
      if (rolls) kids.push(CIRC(450, 150, 24, '#058a68', { w: 3 }), T(450, 160, 'R', { z: 26, w: 700, f: '#fff' }));
      if (slides) kids.push(CIRC(510, 150, 24, '#c2510e', { w: 3 }), T(510, 160, 'S', { z: 26, w: 700, f: '#fff' }));
      kids.push(T(470, 236, rolls && slides ? 'it can do both' : rolls ? 'it rolls' : 'it slides', { z: 15, w: 700, f: '#6b5a8a' }));
      const sit = v.sit === 0 ? 'lying on its side' : 'standing on a flat end';
      return { kids, say: v.obj === 0 ? 'A ball is round all over, so it rolls. R for rolling.' : v.obj === 1 || v.obj === 2 ? `A ${names[v.obj]} has flat faces, so it slides. S for sliding.` : `A ${names[v.obj]} ${sit} ${rolls ? 'rolls' : 'slides'}. ${v.sit === 0 ? 'Stand it on a flat end and it slides instead.' : 'Lay it on its side and it rolls instead.'} A ${names[v.obj]} can do both, depending on how it sits.` };
    },
  },
  sortbuttons: {
    subject: 'maths', about: 'A pile of twelve buttons that differ in colour (red, blue, yellow), size (big, small) and holes (2 or 4). Choose how to sort them and they fall into groups: three colour groups, two size groups or two groups by holes. The same buttons can be sorted in different ways. For sorting, grouping, same and different, counting each group.',
    sliders: [['by', 'Sort by: 0 colour, 1 size, 2 holes, 3 not sorted yet', 0, 3, 1, 3]],
    draw(v) {
      const cols = ['#e2583e', '#1f63d9', '#f2c94c'], cn = ['red', 'blue', 'yellow'], items = [[0, 1, 2], [0, 0, 4], [0, 1, 4], [1, 0, 2], [1, 1, 2], [1, 0, 4], [1, 1, 4], [2, 0, 2], [2, 1, 2], [2, 0, 4], [0, 0, 2], [2, 1, 4]];
      const button = (x, y, [c, sz, h]) => { const r = sz ? 15 : 10, out = [CIRC(x, y, r, cols[c], { w: 2 })]; for (let k = 0; k < h; k++) { const a = (k / h) * Math.PI * 2 + Math.PI / 4; out.push(CIRC(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, 1.8, INK, { w: 0 })); } return out; };
      const kids = [];
      if (v.by === 3) {
        items.forEach((b, i) => kids.push(...button(110 + (i % 6) * 70, 100 + Math.floor(i / 6) * 70, b)));
        kids.push(T(300, 40, 'a pile of buttons: how could you sort them?', { z: 16, w: 700 }), T(300, 262, '12 buttons', { z: 15, w: 600, f: '#6b5a8a' }));
        return { kids, say: 'Here are 12 buttons. They are different in colour, in size and in the number of holes. How could you put them in groups?' };
      }
      const key = (b) => (v.by === 0 ? b[0] : v.by === 1 ? b[1] : b[2] === 2 ? 0 : 1), names = v.by === 0 ? cn : v.by === 1 ? ['small', 'big'] : ['2 holes', '4 holes'];
      const groups = names.map((_, g) => items.filter((b) => key(b) === g)), bw = 540 / names.length;
      groups.forEach((gr, g) => {
        const x0 = 30 + g * bw;
        kids.push(R(x0 + 4, 70, bw - 8, 180, '#f3f0ff', { w: 2.5, r: 10 }), T(x0 + bw / 2, 60, `${names[g]}: ${gr.length}`, { z: 15, w: 700 }));
        gr.forEach((b, i) => kids.push(...button(x0 + 32 + (i % Math.max(2, Math.floor((bw - 20) / 40))) * 38, 100 + Math.floor(i / Math.max(2, Math.floor((bw - 20) / 40))) * 40, b)));
      });
      kids.push(T(300, 284, `sorted by ${['colour', 'size', 'holes'][v.by]}: ${names.length} groups`, { z: 15, w: 700, f: '#058a68' }));
      return { kids, say: `Sorted by ${['colour', 'size', 'the number of holes'][v.by]}, the 12 buttons make ${names.length} groups: ${groups.map((gr, g) => `${gr.length} ${names[g]}`).join(', ')}. The same buttons can be sorted in a different way.` };
    },
  },
  tumblers: {
    subject: 'science', about: 'Two tumblers with the same capacity (250 mL) holding different amounts of water. The space the water takes up is its volume (in mL, or in litres: 1000 mL = 1 L), and the tumbler with more water has more mass, so it is the heavier one: a balance tips towards it. About 1 mL of water has a mass of about 1 g. For mass, volume, capacity, heavier and lighter, mL and L.',
    sliders: [['a', 'Water in tumbler A (mL)', 0, 250, 10, 100], ['b', 'Water in tumbler B (mL)', 0, 250, 10, 100]],
    draw(v) {
      const cap = 250, kids = [], tumbler = (x0, ml, name, col) => {
        const w = 90, h = 130, top = 70, fill = (ml / cap) * (h - 6);
        kids.push(s('path', { d: `M ${x0} ${top} L ${x0 + 10} ${top + h} L ${x0 + w - 10} ${top + h} L ${x0 + w} ${top} Z`, fill: '#ffffff', stroke: INK, 'stroke-width': 3 }));
        if (ml > 0) kids.push(s('path', { d: `M ${x0 + 10 * (1 - fill / (h - 6)) + 1} ${top + h - 3 - fill} L ${x0 + 10 + 1} ${top + h - 3} L ${x0 + w - 11} ${top + h - 3} L ${x0 + w - 10 * (1 - fill / (h - 6)) - 1} ${top + h - 3 - fill} Z`, fill: col, opacity: 0.85 }));
        kids.push(T(x0 + w / 2, top - 12, name, { z: 18, w: 700 }), T(x0 + w / 2, top + h + 24, `${ml} mL`, { z: 15, w: 700 }), T(x0 + w / 2, top + h + 44, `${ml / 1000} L`, { z: 12, w: 600, f: '#6b5a8a' }));
      };
      tumbler(40, v.a, 'A', '#7fbfff'); tumbler(180, v.b, 'B', '#5fc9b8');
      // the balance: it tips towards the tumbler with more water, which has more mass
      const sign = v.a === v.b ? 0 : v.a > v.b ? 1 : -1, ang = sign * Math.min(1, Math.abs(v.a - v.b) / 120) * 0.2, cx = 440, cy = 120, arm = 80;
      const lx = cx - arm * Math.cos(ang), ly = cy + arm * Math.sin(ang), rx = cx + arm * Math.cos(ang), ry = cy - arm * Math.sin(ang);
      kids.push(s('polygon', { points: `${cx - 20},230 ${cx + 20},230 ${cx},${cy + 3}`, fill: '#d8cff0', stroke: INK, 'stroke-width': 3 }), L(lx, ly, rx, ry, INK, 6));
      for (const [px, py, nm] of [[lx, ly, 'A'], [rx, ry, 'B']]) kids.push(L(px, py, px - 26, py + 34, INK, 1.5), L(px, py, px + 26, py + 34, INK, 1.5), s('path', { d: `M ${px - 34} ${py + 34} Q ${px} ${py + 52} ${px + 34} ${py + 34} Z`, fill: '#f3f0ff', stroke: INK, 'stroke-width': 3 }), T(px, py + 30, nm, { z: 13, w: 700 }));
      const verdict = v.a === v.b ? 'same volume, same mass' : `${v.a > v.b ? 'A' : 'B'} has more water: more volume and more mass`;
      kids.push(T(440, 268, verdict, { z: 13, w: 700, f: v.a === v.b ? '#058a68' : '#c2510e' }), T(300, 22, 'each tumbler holds 250 mL', { z: 12, w: 600, f: '#6b5a8a' }));
      return { kids, say: v.a === v.b ? `Both tumblers hold ${v.a} mL of water, so they have the same volume and about the same mass. The balance stays level.` : `Tumbler ${v.a > v.b ? 'A' : 'B'} holds more water (${Math.max(v.a, v.b)} mL against ${Math.min(v.a, v.b)} mL), so it takes up more space: more volume. It also has more mass, so it is the heavier one. Both tumblers have the same capacity (250 mL), but they do not hold the same amount.` };
    },
  },
  addtake: {
    subject: 'maths', about: 'Join two groups of counters to add (4 + 2 = 6; 7 and 3 make 10) or start with a group and take some away to see how many are left (9 − 6 = 3), shown in ten-frames with the sum written beside. Param kind: "add" or "take". For addition, joining groups, number pairs, taking away, how many are left, subtraction.',
    params: { kind: 'add' },
    dynamicSliders: (p) => (p.kind === 'take' ? [['n', 'Start with', 0, 20, 1, 5], ['k', 'Take away', 0, 20, 1, 1]] : [['a', 'First group', 0, 10, 1, 3], ['b', 'Second group', 0, 10, 1, 4]]),
    draw(v, p) {
      const take = p.kind === 'take', kids = [], cw = 38, x0 = 24;
      const total = take ? v.n : v.a + v.b, gone = take ? Math.min(v.k, v.n) : 0, left = total - gone;
      for (let fr = 0; fr < 2; fr++) for (let i = 0; i < 10; i++) {
        const x = x0 + (i % 5) * cw, y = 50 + fr * 108 + Math.floor(i / 5) * cw, c = fr * 10 + i, inGroup = c < total;
        kids.push(R(x, y, cw - 4, cw - 4, '#f3f0ff', { w: 2, r: 5 }));
        if (!inGroup) continue;
        const col = take ? (c >= left ? '#c9c9d6' : '#5fc9b8') : (c < v.a ? '#5fc9b8' : '#f2a33a'), cx = x + (cw - 4) / 2, cy = y + (cw - 4) / 2;
        kids.push(CIRC(cx, cy, 13, col, { w: 2 }));
        if (take && c >= left) kids.push(L(cx - 9, cy - 9, cx + 9, cy + 9, '#c0392b', 3), L(cx + 9, cy - 9, cx - 9, cy + 9, '#c0392b', 3));
      }
      if (take && v.k > v.n) kids.push(T(400, 250, 'you cannot take away more than you have', { z: 12, w: 600, f: '#c0392b' }));
      kids.push(T(400, 80, take ? `${v.n} − ${Math.min(v.k, v.n)} = ${left}` : `${v.a} + ${v.b} = ${total}`, { z: 34, w: 700 }));
      kids.push(T(400, 130, take ? `${left} left` : total === 10 && v.a > 0 && v.b > 0 ? `${v.a} and ${v.b} make 10` : `${total} in all`, { z: 18, w: 700, f: take ? '#c2510e' : '#058a68' }));
      if (!take) kids.push(T(400, 170, v.b === 0 || v.a === 0 ? 'adding none changes nothing' : v.a === v.b ? 'the same number twice: a double' : '', { z: 13, w: 600, f: '#6b5a8a' }));
      return { kids, say: take ? (v.k > v.n ? `You cannot take away ${v.k} from ${v.n}: there are not enough.` : `${v.n} take away ${v.k} leaves ${left}.${left === 0 ? ' None are left.' : ''}`) : `${v.a} and ${v.b} together make ${total}: ${v.a} + ${v.b} = ${total}.${total === 10 && v.a > 0 && v.b > 0 ? ' These two numbers make 10.' : ''}` };
    },
  },
  numberwords: {
    subject: 'maths', about: 'Numbers up to 100 in rows of ten counters (a full row is one ten): the numeral, the number name written in words (36 is Thirty Six), and how many tens and ones. For counting to 100, tens and ones, number names, writing numbers in words, tens frames.',
    sliders: [['n', 'The number', 0, 100, 1, 36]],
    draw(v) {
      const small = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'], tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const word = v.n === 100 ? 'One Hundred' : v.n < 20 ? small[v.n] : tens[Math.floor(v.n / 10)] + (v.n % 10 ? ' ' + small[v.n % 10] : '');
      const t = Math.floor(v.n / 10), o = v.n % 10, kids = [];
      for (let r = 0; r < 10; r++) {
        const y = 28 + r * 25;
        kids.push(R(18, y - 11, 236, 22, r < t ? '#e3f6f1' : '#f6f3fc', { w: 1.5, r: 5 }));
        for (let c = 0; c < 10; c++) { const k = r * 10 + c; if (k < v.n) kids.push(CIRC(32 + c * 22, y, 8, r < t ? '#5fc9b8' : '#f2a33a', { w: 1.5 })); }
      }
      kids.push(T(430, 88, String(v.n), { z: 64, w: 700 }), T(430, 138, word, { z: 22, w: 700, f: '#6b45c8' }), T(430, 184, `${t} ten${t === 1 ? '' : 's'}${v.n < 100 ? ` and ${o} one${o === 1 ? '' : 's'}` : ''}`, { z: 16, w: 700, f: '#058a68' }), T(430, 212, v.n === 100 ? 'ten tens make one hundred' : t ? 'each full row is a ten' : '', { z: 12, w: 600, f: '#6b5a8a' }));
      return { kids, say: v.n === 0 ? 'Zero: no counters.' : `${word}: ${v.n} is ${t} ${t === 1 ? 'ten' : 'tens'}${v.n < 100 ? ` and ${o} ${o === 1 ? 'one' : 'ones'}` : ', which is one hundred'}.` };
    },
  },
  spans: {
    subject: 'maths', about: 'Measure with handspans or footspans: choose an object (a pencil, a bag, a table, a blackboard, or a bed, the way to the door, a classroom side, a playground edge) and whose hand or foot (small, medium, big), and see about how many spans long it is. A bigger hand or foot fits fewer times, so you need fewer spans. The sizes are rough: a handspan about 10 to 14 cm and a footspan about 20 to 28 cm. Param kind: hand or foot. For measuring with handspans and footspans, non-standard units, comparing lengths.',
    params: { kind: 'hand' },
    dynamicSliders: (p) => (p.kind === 'foot' ? [['obj', 'Measure: 0 bed, 1 way to the door, 2 classroom side, 3 playground edge', 0, 3, 1, 2], ['size', 'Whose foot: 0 small, 1 medium, 2 big', 0, 2, 1, 1]] : [['obj', 'Measure: 0 pencil, 1 bag, 2 table, 3 blackboard', 0, 3, 1, 2], ['size', 'Whose hand: 0 small, 1 medium, 2 big', 0, 2, 1, 1]]),
    draw(v, p) {
      const foot = p.kind === 'foot', names = foot ? ['bed', 'way to the door', 'classroom side', 'playground edge'] : ['pencil', 'bag', 'table', 'blackboard'], cms = foot ? [120, 240, 480, 960] : [15, 36, 108, 180], sizes = foot ? [20, 24, 28] : [10, 12, 14];
      const unit = foot ? 'footspan' : 'handspan', who = ['small', 'medium', 'big'][v.size], len = cms[v.obj], sz = sizes[v.size], sc = 520 / cms[3], n = Math.round(len / sz), kids = [];
      kids.push(R(40, 100, len * sc, 34, '#e8d7a8', { w: 3, r: 4 }), T(40, 90, names[v.obj], { a: 'start', z: 16, w: 700 }));
      for (let i = 0; i < n; i++) {
        const x = 40 + i * sz * sc, w = Math.min(sz * sc, 40 + len * sc - x);
        if (w > 1) kids.push(R(x, 146, w - 1.5, 26, i % 2 ? '#f2a33a' : '#5fc9b8', { w: 1.5, r: 3 }), ...(w >= 18 ? [T(x + w / 2, 164, String(i + 1), { z: 11, w: 700, f: '#ffffff' })] : []));
      }
      kids.push(T(300, 218, `about ${n} ${unit}${n === 1 ? '' : 's'}`, { z: 26, w: 700, f: '#058a68' }), T(300, 248, `measured with a ${who} ${foot ? 'foot' : 'hand'}`, { z: 14, w: 600, f: '#6b5a8a' }), T(300, 272, v.size === 2 ? 'a bigger one fits fewer times' : v.size === 0 ? 'a smaller one fits more times' : '', { z: 12, w: 600, f: '#c2510e' }));
      return { kids, say: `The ${names[v.obj]} is about ${n} ${unit}${n === 1 ? '' : 's'} long measured with a ${who} ${foot ? 'foot' : 'hand'}. ${v.size === 2 ? 'A bigger ' + (foot ? 'foot' : 'hand') + ' covers more each time, so you need fewer.' : v.size === 0 ? 'A smaller ' + (foot ? 'foot' : 'hand') + ' covers less each time, so you need more.' : 'Try a smaller or a bigger one and see how the number changes.'}` };
    },
  },
  patternstrip: {
    subject: 'maths', about: 'A strip of shapes in a repeating pattern: red circle (A), blue square (B), yellow triangle (C). Choose the pattern (AB, AAB, ABB or ABC) and how many shapes to show, and the dotted shape at the end shows what comes next. For patterns, repeating patterns, extending a pattern, what comes next.',
    sliders: [['unit', 'Pattern: 0 AB, 1 AAB, 2 ABB, 3 ABC', 0, 3, 1, 0], ['count', 'How many shapes to show', 3, 12, 1, 6]],
    draw(v) {
      const units = [[0, 1], [0, 0, 1], [0, 1, 1], [0, 1, 2]], nm = ['red circle', 'blue square', 'yellow triangle'], cols = ['#e2583e', '#1f63d9', '#f2c94c'], u = units[v.unit], kids = [];
      const shape = (k, x, y, ghost) => { const o = ghost ? { w: 2.5, s: '#9b8db8' } : { w: 2.5 }, f = ghost ? '#ffffff' : cols[k]; return k === 0 ? [CIRC(x, y, 17, f, o)] : k === 1 ? [R(x - 16, y - 16, 32, 32, f, { ...o, r: 4 })] : [s('polygon', { points: `${x},${y - 18} ${x + 18},${y + 15} ${x - 18},${y + 15}`, fill: f, stroke: ghost ? '#9b8db8' : INK, 'stroke-width': 2.5, 'stroke-dasharray': ghost ? '5 4' : null })]; };
      for (let i = 0; i < v.count; i++) kids.push(...shape(u[i % u.length], 40 + i * 40, 110, false));
      const next = u[v.count % u.length]; kids.push(...shape(next, 40 + v.count * 40, 110, true), T(40 + v.count * 40, 150, '?', { z: 14, w: 700, f: '#6b5a8a' }));
      kids.push(T(300, 200, `the pattern repeats: ${u.map((k) => nm[k].split(' ')[0]).join(', ')}`, { z: 16, w: 700 }), T(300, 236, `next: ${nm[next]}`, { z: 20, w: 700, f: '#058a68' }));
      return { kids, say: `This pattern repeats ${u.map((k) => nm[k]).join(', ')}. After ${v.count} shapes the next one is the ${nm[next]}.` };
    },
  },
  pihuday: {
    subject: 'maths', about: 'Pihu\'s day from morning to night, in the order the book gives: out of bed as the sun rises, warm water, yoga or exercise, brush teeth, bath, breakfast, get ready for school, school, wash hands and lunch when the sun is high in the afternoon, home to rest, play and study as the sun sets in the evening, then dinner, a story book and sleep under the moon and stars. Step through the day and watch the sky change. For time of day, morning, afternoon, evening and night, daily routine, what comes first and next.',
    sliders: [['step', 'Step in Pihu\'s day (0 to 14)', 0, 14, 1, 0]],
    draw(v) {
      const acts = [['gets out of bed', '\u{1F6CF}️'], ['drinks a glass of warm water', '\u{1F4A7}'], ['does yoga or exercise', '\u{1F9D8}'], ['brushes her teeth', '\u{1FAA5}'], ['takes a bath', '\u{1F6C1}'], ['eats breakfast', '\u{1F35E}'], ['gets ready for school', '\u{1F392}'], ['studies and plays at school', '\u{1F4DA}'], ['washes her hands', '\u{1F9FC}'], ['has lunch with her friends', '\u{1F371}'], ['comes home and rests', '\u{1F3E0}'], ['plays with her friends', '⚽'], ['studies', '✏️'], ['eats dinner with her family', '\u{1F37D}️'], ['reads a story book and goes to sleep', '\u{1F319}']];
      const phase = v.step <= 6 ? 'morning' : v.step === 7 ? 'day' : v.step <= 10 ? 'afternoon' : v.step <= 12 ? 'evening' : 'night';
      const sky = { morning: '#ffe3b0', day: '#bfe6ff', afternoon: '#9fd8ff', evening: '#f6a56b', night: '#1d2350' }[phase], kids = [R(0, 0, 600, 210, sky, { w: 0 }), R(0, 210, 600, 90, phase === 'night' ? '#2c3f2f' : '#8fcf8a', { w: 0 })];
      // the sun climbs and sets across the sky; at night the moon and stars come out
      const sunAt = { morning: [90 + v.step * 22, 170 - v.step * 12], day: [300, 70], afternoon: [330 + (v.step - 8) * 30, 56 + (v.step - 8) * 20], evening: [470 + (v.step - 11) * 40, 150 + (v.step - 11) * 30] }[phase];
      if (phase !== 'night') kids.push(CIRC(sunAt[0], sunAt[1], 26, '#ffcc33', { s: '#ffb000', w: 4 }));
      else { kids.push(CIRC(420, 70, 22, '#f2f2f2', { s: '#cfcfcf', w: 2 }), CIRC(432, 64, 20, sky, { w: 0 })); for (const [x, y] of [[90, 40], [180, 90], [220, 84], [520, 120], [340, 120], [140, 150]]) kids.push(T(x, y, '✦', { z: 18, f: '#fff3a6' })); }
      kids.push(T(60, 266, '\u{1F467}', { z: 44 }), T(300, 250, acts[v.step][1], { z: 54 }));
      kids.push(T(300, 36, phase === 'day' ? 'at school (daytime)' : phase, { z: 26, w: 700, f: phase === 'night' ? '#ffffff' : INK }), T(300, 290, `Pihu ${acts[v.step][0]}.`, { z: 16, w: 700, f: phase === 'night' ? '#ffffff' : INK }));
      return { kids, say: `${phase === 'day' ? 'In the daytime' : phase === 'night' ? 'At night' : 'In the ' + phase}, step ${v.step + 1} of 15: Pihu ${acts[v.step][0]}.${phase === 'morning' && v.step === 0 ? ' The sun rises as her morning begins.' : phase === 'afternoon' && v.step >= 8 && v.step <= 9 ? ' The sun is high in the sky.' : phase === 'evening' && v.step === 11 ? ' The sun is setting as the evening begins.' : phase === 'night' && v.step === 13 ? ' The moon and stars are visible in the night sky.' : ''}` };
    },
  },
  friction: {
    subject: 'science', about: 'A heavy box on a surface, with sliders for the push, how rough the surface is and the weight of the box. Friction pushes back, and the box starts to slide only when the push beats the greatest friction the surface can give. For force, friction, contact forces, balanced and unbalanced forces, roughness, weight.',
    sliders: [['push', 'Your push (newtons)', 0, 20, 1, 6], ['rough', 'How rough the surface is (per cent)', 0, 100, 10, 40], ['weight', 'Weight of the box (newtons)', 10, 60, 10, 30]],
    draw(v) {
      const grip = (v.rough / 100) * v.weight;          // the greatest friction the surface can give
      const slides = v.push > grip + 1e-9, back = Math.min(v.push, grip);
      const floor = 224, shift = slides ? Math.min(120, 18 + (v.push - grip) * 7) : 0;
      const left = 120 + shift, right = left + 96, top = floor - 66;
      const arrow = (x, y, len, dir, col, word) => [L(x, y, x + dir * len, y, col, 6), s('polygon', { points: `${x + dir * (len + 12)},${y} ${x + dir * len},${y - 9} ${x + dir * len},${y + 9}`, fill: col }), T(x + dir * (len / 2), y - 14, word, { z: 14, f: col })];
      const grain = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((i) => i * 9 < v.rough).map((i) => T(34 + i * 48, floor + 22 + (i % 3) * 12, '\\', { z: 12, f: '#8a7fa8' }));
      const kids = [R(0, floor, W, 76, '#efeaf8', { w: 0 }), L(0, floor, W, floor, INK, 4), ...grain];
      kids.push(R(left, top, 96, 66, C.o, { r: 6, w: 3 }), T(left + 48, top + 42, `${v.weight} N`, { z: 18, f: '#fff' }));
      const pushLen = 12 + Math.min(v.push, 20) * 2.6, pullLen = 12 + back * 4;
      if (v.push > 0) kids.push(...arrow(left - 34 - pushLen, top + 33, pushLen, 1, C.p, `${v.push} N push`));
      if (back > 0) kids.push(...arrow(right + 34 + pullLen, top + 33, pullLen, -1, C.b, `friction ${num(back, 1)} N`));
      kids.push(T(300, 40, slides ? 'The box slides!' : 'The box stays still', { z: 24, f: slides ? '#058a68' : INK }), T(300, 68, slides ? `Push ${v.push} N − friction ${num(grip, 1)} N = ${num(v.push - grip, 1)} N left over` : `Friction can rise to ${num(grip, 1)} N, enough to match your ${v.push} N push`, { z: 15, w: 600 }));
      const surface = v.rough === 0 ? 'smooth ice' : v.rough <= 20 ? 'a polished floor' : v.rough <= 50 ? 'a wooden floor' : v.rough <= 80 ? 'a rough road' : 'loose sand';
      const say = slides ? `You push with ${v.push} N. The surface can give up to ${num(grip, 1)} N of friction, and it does, so the box slides with ${num(v.push - grip, 1)} N left over.` : `You push with ${v.push} N. Friction on ${surface} can rise to ${num(grip, 1)} N, which is at least your push, so the box does not move.`;
      return { kids, say: `${say} Friction always pushes back the opposite way to the push.${v.weight >= 50 ? ' A heavy box is harder to move: more weight means more friction.' : ''}` };
    },
  },
  work: {
    subject: 'science', about: 'A bag lifted straight up by a force over a distance. Work = force x distance in joules; no distance means no work, and doubling the force or the distance doubles the work. For work, work done by a force, force and displacement, joules, energy.',
    sliders: [['force', 'Force you lift with (newtons)', 0, 100, 10, 20], ['dist', 'Distance lifted (metres)', 0, 10, 1, 2]],
    draw(v) {
      const wd = v.force * v.dist, floor = 250, up = v.dist * 13, bottom = floor - up, top = bottom - 74;
      const kids = [R(0, floor, W, 50, '#efeaf8', { w: 0 }), L(0, floor, W, floor, INK, 4), R(170, top, 96, 74, C.o, { r: 8, w: 3 }), T(218, top + 46, `${v.force} N`, { z: 17, f: '#fff' })];
      if (v.dist > 0) kids.push(L(318, floor, 318, bottom, C.b, 4, { 'stroke-dasharray': '7 6' }), L(308, bottom, 328, bottom, C.b, 3), L(308, floor, 328, floor, C.b, 3), T(346, (floor + bottom) / 2 + 6, `${v.dist} m`, { z: 17, a: 'start', f: C.b }));
      const reach = Math.min(22 + v.force * 0.55, Math.max(18, top - 34));
      if (v.force > 0) kids.push(L(218, top - 8, 218, top - 8 - reach, C.p, 6), s('polygon', { points: `218,${top - 8 - reach - 14} 209,${top - 8 - reach + 2} 227,${top - 8 - reach + 2}`, fill: C.p }), T(232, top - 8 - reach / 2 + 5, `lift ${v.force} N`, { z: 14, a: 'start', f: C.p }));
      kids.push(T(300, 278, `${v.force} N × ${v.dist} m = ${wd} J`, { z: 26 }), T(300, 296, wd ? 'the work you do' : 'no distance moved, so no work is done', { z: 14, w: 600, f: wd ? '#058a68' : '#c2510e' }));
      return { kids, say: v.dist === 0 ? `You push with ${v.force} N but the bag does not move, so the distance is 0 m and the work is 0 J.` : `You lift with ${v.force} N over ${v.dist} m, so you do ${v.force} x ${v.dist} = ${wd} J of work.${v.force === 20 && v.dist === 4 ? ' Twice the distance with the same force is twice the work.' : ''}` };
    },
  },
  power: {
    subject: 'science', about: 'A bag lifted by a force over a distance, with a stopwatch. Work = force x distance in joules, and power = work / time in watts, so the same work done in half the time takes twice the power. For power, rate of doing work, the watt, work and time.',
    sliders: [['force', 'Force you lift with (newtons)', 0, 100, 10, 20], ['dist', 'Distance lifted (metres)', 0, 10, 1, 2], ['secs', 'Time taken (seconds)', 1, 10, 1, 2]],
    draw(v) {
      const floor = 232, up = v.dist * 13, bottom = floor - up, top = bottom - 62, wd = v.force * v.dist, pw = wd / v.secs;
      const kids = [R(0, 0, W, H, '#f6f9ff', { w: 0 }), R(0, floor, W, 68, '#efeaf8', { w: 0 }), L(0, floor, W, floor, INK, 4)];
      kids.push(R(186, top, 90, 62, C.o, { r: 8, w: 3 }), T(231, top + 40, `${v.force} N`, { z: 17, f: '#fff' }));
      if (v.dist > 0) kids.push(L(326, floor, 326, bottom, C.b, 4, { 'stroke-dasharray': '7 6' }), L(316, bottom, 336, bottom, C.b, 3), L(316, floor, 336, floor, C.b, 3), T(352, (floor + bottom) / 2 + 6, `${v.dist} m`, { z: 16, a: 'start', f: C.b }));
      kids.push(CIRC(500, 84, 38, '#fff', { w: 4, s: C.p }), CIRC(500, 84, 4, INK, { w: 0 }), L(500, 84, 500, 58, C.p, 4), T(500, 142, `${v.secs} s`, { z: 18, f: C.p }), T(500, 36, 'stopwatch', { z: 12, w: 600, f: '#6b5a8a' }));
      kids.push(T(300, 270, `work = ${v.force} N × ${v.dist} m = ${num(wd)} J`, { z: 18 }));
      kids.push(T(300, 292, wd ? `power = ${num(wd)} J ÷ ${v.secs} s = ${num(pw, 1)} W` : 'no distance moved, so no work and no power', { z: 14, w: 600, f: wd ? '#058a68' : '#c2510e' }));
      return { kids, say: v.dist === 0 ? `You push with ${v.force} N but the bag does not move, so the work is 0 J and the power is 0 W.` : `You do ${num(wd)} J of work in ${v.secs} s, so the power is ${num(wd)} ÷ ${v.secs} = ${num(pw, 1)} W.${v.secs === 4 && wd === 100 ? ' The same work in twice the time needs only half the power.' : ''}` };
    },
  },
  energy: {
    subject: 'science', about: 'A ball at the top of a ramp, with its mass and the height of the ramp. At the top it stores potential energy, mass x 10 x height, and at the bottom that is all kinetic energy, so the ball speeds up as it falls. For kinetic energy, potential energy, conservation of energy, forms of energy, work and energy, joules.',
    sliders: [['mass', 'Mass of the ball (kilograms)', 1, 5, 1, 2], ['height', 'Height of the ramp (metres)', 1, 10, 1, 4]],
    draw(v) {
      const pe = v.mass * 10 * v.height, speed = Math.sqrt(2 * 10 * v.height), footY = 250, topY = footY - 20 * v.height;
      const barK = 160 / 500, kids = [R(0, footY, W, 50, '#efeaf8', { w: 0 }), L(0, footY, W, footY, INK, 4), L(70, topY, 410, footY, INK, 5)];
      kids.push(s('polygon', { points: `70,${topY} 410,${footY} 70,${footY}`, fill: C.sky, opacity: 0.35 }));
      kids.push(L(70, topY, 70, footY, C.b, 3, { 'stroke-dasharray': '7 6' }), L(60, footY, 80, footY, C.b, 3), L(60, topY, 80, topY, C.b, 3), T(34, (topY + footY) / 2 + 6, `${v.height} m`, { z: 15, a: 'middle', f: C.b }));
      kids.push(CIRC(70, topY - 13, 13, C.o, { w: 3 }), CIRC(410, footY - 13, 13, '#fff', { w: 3 }), L(426, footY - 13, 450, footY - 13, C.o, 4), s('polygon', { points: `458,${footY - 13} 448,${footY - 21} 448,${footY - 5}`, fill: C.o }));
      const peH = pe * barK, keH = pe * barK;
      kids.push(R(470, footY - peH, 36, peH, C.b, { w: 2 }), R(530, footY - keH, 36, keH, C.o, { w: 2 }));
      kids.push(T(488, footY - peH - 8, 'PE', { z: 14, f: C.b }), T(548, footY - keH - 8, 'KE', { z: 14, f: C.o }));
      kids.push(T(300, 30, `Potential energy = ${v.mass} x 10 x ${v.height} = ${pe} J at the top`, { z: 17 }));
      kids.push(T(300, 286, `At the bottom all ${pe} J is kinetic, so the ball moves at ${num(speed)} m/s`, { z: 17 }));
      return { kids, say: `A ${v.mass} kg ball at the top of a ${v.height} m ramp stores ${v.mass} x 10 x ${v.height} = ${pe} J of potential energy. As it rolls down, that changes into kinetic energy, and at the bottom it moves at ${num(speed)} m/s with the same ${pe} J. The total energy stays the same: energy is not lost, only changed from one form to another.` };
    },
  },
  newton: {
    subject: 'science', about: 'A box pushed one way and held back by friction, with its mass. The net force divided by the mass gives the acceleration, so a heavier box speeds up less and balanced forces leave the speed unchanged. For force, Newton\'s first and second laws, balanced and unbalanced forces, inertia, mass and acceleration.',
    sliders: [['push', 'Your push (newtons)', 0, 20, 1, 10], ['back', 'Friction pulling back (newtons)', 0, 10, 1, 0], ['mass', 'Mass of the box (kilograms)', 1, 10, 1, 2]],
    draw(v) {
      const net = v.push - v.back, acc = net / v.mass, floor = 224;
      const shift = net > 0 ? Math.min(80, (net / v.mass) * 7) : net < 0 ? -Math.min(80, (-net / v.mass) * 7) : 0;
      const left = 240 + shift, right = left + 104;
      const arrow = (x, y, len, dir, colour, word) => [L(x, y, x + dir * len, y, colour, 6), s('polygon', { points: `${x + dir * (len + 12)},${y} ${x + dir * len},${y - 9} ${x + dir * len},${y + 9}`, fill: colour }), T(x + dir * (len / 2), y - 14, word, { z: 13, f: colour })];
      const kids = [R(0, floor, W, 76, '#efeaf8', { w: 0 }), L(0, floor, W, floor, INK, 4), R(left, floor - 66, 104, 66, C.o, { r: 6, w: 3 }), T(left + 52, floor - 24, `${v.mass} kg`, { z: 17, f: '#fff' })];
      const pushLen = 18 + v.push * 3.4, backLen = 18 + v.back * 5;
      if (v.push > 0) kids.push(...arrow(left - 34 - pushLen, floor - 33, pushLen, 1, C.p, `${v.push} N push`));
      if (v.back > 0) kids.push(...arrow(right + 34 + backLen, floor - 33, backLen, -1, C.b, `${v.back} N friction`));
      const moving = Math.abs(net) > 1e-9;
      kids.push(T(300, 40, net === 0 ? 'Balanced: the speed stays the same' : net > 0 ? 'Unbalanced: it speeds up to the right' : 'Unbalanced: it slows down', { z: 22, f: net === 0 ? '#c2510e' : '#058a68' }));
      kids.push(T(300, 70, `Net force = ${v.push} − ${v.back} = ${num(net, 1)} N`, { z: 16, w: 600 }));
      kids.push(T(300, 286, moving ? `a = net force ÷ mass = ${num(net, 1)} ÷ ${v.mass} = ${num(acc, 2)} m/s²` : 'net force 0 N, so a = 0 m/s²: the speed does not change', { z: 17 }));
      const say = net === 0 ? `The push and friction are equal, so the net force is zero. The box keeps the speed it has: this is balanced force, and a still box stays still.` : `The push is ${v.push} N and friction is ${v.back} N, so the net force is ${num(net, 1)} N. On a ${v.mass} kg box that gives an acceleration of ${num(acc, 2)} m/s².${v.mass >= 6 ? ' The same force on a heavier box gives a smaller acceleration.' : ''}`;
      return { kids, say };
    },
  },
  thirdlaw: {
    subject: 'science', about: 'Two carts touching, then pushing apart with the same force in opposite directions. Each cart feels the same size force, but the lighter cart gets the bigger acceleration. For Newton\'s third law, action and reaction pairs, equal and opposite forces, recoil, walking and rockets.',
    sliders: [['F', 'Force each cart pushes with (newtons)', 10, 50, 5, 20], ['mA', 'Mass of cart A (kilograms)', 1, 10, 1, 2], ['mB', 'Mass of cart B (kilograms)', 1, 10, 1, 6]],
    draw(v) {
      const aA = v.F / v.mA, aB = v.F / v.mB, floor = 226, cx = 300, hig = 70;
      const wA = 50 + v.mA * 6, wB = 50 + v.mB * 6, ax = cx - wA, bx = cx;
      const arrow = (x, y, len, dir, colour, word) => [L(x, y, x + dir * len, y, colour, 6), s('polygon', { points: `${x + dir * (len + 12)},${y} ${x + dir * len},${y - 9} ${x + dir * len},${y + 9}`, fill: colour }), T(x + dir * (len / 2), y - 12, word, { z: 13, f: colour })];
      const kids = [R(0, floor, W, 74, '#efeaf8', { w: 0 }), L(0, floor, W, floor, INK, 4)];
      kids.push(R(ax, floor - hig, wA, hig, C.b, { r: 6, w: 3 }), T(ax + wA / 2, floor - hig / 2 + 6, 'A', { z: 20, f: '#fff' }));
      kids.push(R(bx, floor - hig, wB, hig, C.o, { r: 6, w: 3 }), T(bx + wB / 2, floor - hig / 2 + 6, 'B', { z: 20, f: '#fff' }));
      const len = 20 + v.F * 2.2;
      kids.push(...arrow(ax - 8, floor - hig / 2, len, -1, C.p, `${v.F} N`));
      kids.push(...arrow(bx + wB + 8, floor - hig / 2, len, 1, C.g, `${v.F} N`));
      kids.push(T(cx, 36, 'The push on A and the push on B are the same size and opposite.', { z: 15, w: 600, f: '#6b5a8a' }));
      kids.push(T(cx, 60, 'Each cart pushes the other: one force is the action, the other is the reaction.', { z: 13, w: 600, f: '#6b5a8a' }));
      kids.push(T(ax + wA / 2, floor + 30, `${v.mA} kg`, { z: 16 }));
      kids.push(T(bx + wB / 2, floor + 30, `${v.mB} kg`, { z: 16 }));
      kids.push(T(cx - 6, floor + 54, `a = ${num(aA, 2)} m/s²`, { z: 14, f: C.b, a: 'end' }));
      kids.push(T(cx + 6, floor + 54, `a = ${num(aB, 2)} m/s²`, { z: 14, f: C.o, a: 'start' }));
      const lighter = v.mA === v.mB ? null : v.mA < v.mB ? 'A' : 'B';
      const say = v.mA === v.mB
        ? `Both carts have the same mass, so the same ${v.F} N force gives each the same acceleration of ${num(aA, 2)} m/s²: they fly apart at the same rate, in opposite directions.`
        : `Each cart feels the same ${v.F} N, but cart ${lighter} is lighter, so it gets the bigger acceleration: ${num(lighter === 'A' ? aA : aB, 2)} m/s² against ${num(lighter === 'A' ? aB : aA, 2)} m/s². Equal forces do not mean equal accelerations.`;
      return { kids, say };
    },
  },
  sound: {
    subject: 'science', about: 'A speaker making a sound wave. More vibrations each second make a higher pitch, and a taller wave means a louder sound. For sound, pitch, loudness, frequency, amplitude, vibration, hearing.',
    sliders: [['freq', 'Vibrations each second (frequency)', 100, 800, 10, 300], ['amp', 'Height of the wave (loudness)', 1, 10, 1, 2]], animated: true,
    draw(v, p, t = 0) {
      const cy = 154, phase = t * Math.min(v.freq, 800) * 1.1, cycles = v.freq / 45, pts = [];
      for (let x = 0; x <= 600; x += 4) pts.push(`${x === 0 ? 'M' : 'L'} ${x} ${cy - v.amp * 8 * Math.sin((x / 600) * cycles * 2 * Math.PI + phase)}`);
      const kids = [R(0, 0, W, H, '#f4f0ff', { w: 0 }), L(30, cy, 570, cy, '#c9c4d6', 2), s('path', { d: pts.join(' '), fill: 'none', stroke: C.p, 'stroke-width': 4 }), CIRC(34, cy, 17, C.o, { w: 3 }), T(34, cy + 52, 'speaker', { z: 13 }), T(300, 34, v.freq >= 600 ? 'a high, shrill note' : v.freq <= 200 ? 'a low, deep note' : 'a middling note', { z: 22 }), T(300, 62, `${v.freq} vibrations each second`, { z: 16, w: 600 })];
      const tall = v.amp >= 7, soft = v.amp <= 3;
      kids.push(T(300, 292, tall ? 'tall wave: loud sound' : soft ? 'short wave: soft sound' : 'medium wave: medium loudness', { z: 15, f: C.b, w: 600 }));
      return { kids, say: `The speaker vibrates ${v.freq} times each second, which we hear as ${v.freq >= 600 ? 'a high pitch' : v.freq <= 200 ? 'a low pitch' : 'a middling pitch'}. ${tall ? 'The wave is tall, so the sound is loud.' : soft ? 'The wave is short, so the sound is soft.' : 'The wave is medium height, so the sound is medium loud.'} Bigger amplitude means more energy.` };
    },
  },
  soundtravel: {
    subject: 'science', about: 'A ringing bell sealed inside a glass jar, with a pump that can empty the air out. The bell keeps shaking, but once the air is gone no sound reaches the ear, because sound needs a material medium to travel through. For how sound travels, sound needs a medium, the bell jar and vacuum experiment, vibrations carried by air.',
    sliders: [['air', 'Air inside the jar (%)', 0, 100, 10, 60], ['hit', 'How hard the bell is struck', 10, 100, 10, 40]], animated: true,
    draw(v, p, t = 0) {
      const share = v.air / 100, heard = v.air > 0, loud = share * (v.hit / 100);
      const jx = 120, jy = 62, jw = 330, jh = 178, bx = jx + 74, by = jy + jh - 40;
      const jiggle = (v.hit / 100) * 2.4 * Math.sin(t * 26), kids = [R(0, 0, W, H, '#f4f7ff', { w: 0 })];
      kids.push(R(jx, jy, jw, jh, '#fbfdff', { w: 5, r: 18 }), T(jx + jw / 2, jy - 12, 'glass jar', { z: 13, f: '#6b5a8a' }));
      const bellX = bx + jiggle;
      kids.push(s('path', { d: `M ${bellX - 28} ${by} Q ${bellX - 26} ${by - 52} ${bellX} ${by - 58} Q ${bellX + 26} ${by - 52} ${bellX + 28} ${by} Z`, fill: C.y, stroke: INK, 'stroke-width': 3 }));
      kids.push(T(bellX, by - 70, 'bell', { z: 13, f: '#8a6a2a' }), L(bellX, by - 58, bellX, by - 72, INK, 4), CIRC(bellX, by - 76, 6, 'none', { w: 3 }), CIRC(bellX, by + 7, 7, INK));
      if (heard) for (let k = 0; k < 3; k++) {
        const rr = 34 + k * 22 + 6 * Math.sin(t * 5 - k);
        kids.push(CIRC(bellX, by - 30, rr, 'none', { s: C.o, w: 3, x: { opacity: 0.15 + 0.7 * loud } }));
      }
      const cols = 9, rows = 5, px0 = bx + 92, py0 = jy + 32, dxp = 17.6, dyp = 29, shown = Math.round(cols * rows * share);
      for (let i = 0; i < shown; i++) {
        const col = i % cols, row = Math.floor(i / cols), ph = i * 0.9;
        const x = px0 + col * dxp + Math.sin(t * 10 + ph) * (1 + 6 * loud), y = py0 + row * dyp;
        kids.push(CIRC(x, y, 4, C.b, { w: 1, x: { opacity: 0.4 + 0.6 * share } }));
      }
      const ex = 536, ey = 170;
      kids.push(s('path', { d: `M ${ex - 18} ${ey - 26} Q ${ex - 34} ${ey} ${ex - 18} ${ey + 26}`, fill: 'none', stroke: INK, 'stroke-width': 5 }));
      kids.push(s('path', { d: `M ${ex - 10} ${ey - 16} Q ${ex - 20} ${ey} ${ex - 10} ${ey + 16}`, fill: 'none', stroke: C.p, 'stroke-width': 4 }));
      kids.push(T(ex - 4, ey + 46, 'ear', { z: 13, f: '#6b5a8a' }));
      if (heard) for (let k = 0; k < 2; k++) {
        const wx = 466 + k * 16;
        kids.push(s('path', { d: `M ${wx} ${ey - 18} Q ${wx + 10} ${ey} ${wx} ${ey + 18}`, fill: 'none', stroke: C.o, 'stroke-width': 3, opacity: 0.2 + 0.7 * loud }));
      }
      kids.push(L(jx + 32, jy + jh, jx + 32, jy + jh + 16, INK, 4), R(jx + 8, jy + jh + 16, 80, 24, '#e6e0f2', { w: 3, r: 6 }), T(jx + 48, jy + jh + 34, 'pump', { z: 12 }));
      kids.push(T(300, 30, v.air === 0 ? 'vacuum: the bell shakes, but no sound can travel' : `air inside the jar: ${v.air}%`, { z: 18, f: v.air === 0 ? '#c2510e' : '#058a68', w: 700 }));
      const note = loud >= 0.55 ? 'a loud sound' : loud >= 0.2 ? 'a soft sound' : 'a faint sound';
      const say = v.air === 0
        ? 'The pump has taken all the air out. The bell still shakes, but there is nothing to carry the vibrations to your ear, so you hear nothing at all. Sound needs a medium to travel through.'
        : `With ${v.air}% air in the jar, the bell's shaking is passed from one air particle to the next until it reaches your ear, so you hear ${note}.`;
      return { kids, say };
    },
  },
  lens: {
    subject: 'science', about: 'A convex lens with an object in front of it. Parallel rays bend through the focal point, and the object distance sets whether the image is real and inverted or virtual, upright and magnified. For lenses, convex lens, converging lens, principal focus, focal length, real and virtual images, magnifying glass, the power of a lens.',
    sliders: [['u', 'Distance of the object (centimetres)', 6, 60, 1, 30], ['f', 'Focal length of the lens (centimetres)', 5, 20, 1, 10]],
    draw(v) {
      const axis = 150, lensX = 300, scale = 4, objectH = 6;
      const objX = lensX - v.u * scale, objY = axis - objectH * scale;
      const farF = lensX + v.f * scale, nearF = lensX - v.f * scale;
      const kids = [R(0, 0, W, H, '#f7f3ff', { w: 0 }), L(20, axis, 580, axis, '#b8aed0', 3, { 'stroke-dasharray': '10 8' })];
      kids.push(s('ellipse', { cx: lensX, cy: axis, rx: 13, ry: 88, fill: C.sky, stroke: INK, 'stroke-width': 4, opacity: 0.75 }));
      kids.push(T(lensX, axis + 112, 'lens', { z: 13, f: '#6b5a8a' }));
      kids.push(L(objX, axis, objX, objY, C.p, 5), s('polygon', { points: `${objX},${objY - 12} ${objX - 7},${objY + 2} ${objX + 7},${objY + 2}`, fill: C.p }), T(objX, objY - 20, 'object', { z: 13, f: C.p }));
      for (const fx of [nearF, farF]) kids.push(CIRC(fx, axis, 5, C.g), T(fx, axis + 24, fx < lensX ? 'F' : "F'", { z: 14, f: C.g }));
      const denom = v.u - v.f, parallel = Math.abs(denom) < 1e-9;
      let img = 0, imgX = null, imgY = null, real = false, note = '';
      if (!parallel) {
        img = (v.u * v.f) / denom;   // positive on the far side of the lens
        real = img > 0;
        imgX = lensX + img * scale;
        imgY = axis + ((objectH * img) / v.u) * scale;   // real images sit below the axis
        const k1 = (axis - objY) / (farF - lensX), k2 = (axis - objY) / (lensX - objX);
        kids.push(L(objX, objY, lensX, objY, C.o, 3), L(lensX, objY, 580, objY + k1 * (580 - lensX), C.o, 3));
        kids.push(L(objX, objY, 580, objY + k2 * (580 - objX), C.b, 3));
        if (imgX > 12 && imgX < 588) {
          kids.push(L(imgX, axis, imgX, imgY, real ? C.o : C.b, 5, real ? {} : { 'stroke-dasharray': '8 6' }));
          const dir = real ? -1 : 1;
          kids.push(s('polygon', { points: `${imgX},${imgY} ${imgX - 7},${imgY + dir * 12} ${imgX + 7},${imgY + dir * 12}`, fill: real ? C.o : C.b }));
          kids.push(T(imgX, imgY + (real ? 24 : 22), 'image', { z: 13, f: real ? C.o : C.b }));
          if (!real) {
            kids.push(L(lensX, objY, imgX, imgY, C.o, 2, { 'stroke-dasharray': '7 6' }), L(lensX, axis, imgX, imgY, C.b, 2, { 'stroke-dasharray': '7 6' }));
          }
        }
        const ratio = Math.abs(img / v.u);
        note = real
          ? `The image is real, inverted and ${ratio > 1.05 ? 'bigger' : ratio < 0.95 ? 'smaller' : 'the same size'}.`
          : `The image is virtual, upright and ${ratio > 1.05 ? 'bigger' : ratio < 0.95 ? 'smaller' : 'the same size'}, on the same side as the object.`;
      }
      kids.push(T(300, 24, `Object ${v.u} cm from the lens; focal length ${v.f} cm`, { z: 15, w: 600 }));
      kids.push(T(300, 292, parallel ? 'The rays leave the lens parallel, so no image forms.' : (real ? `Image ${num(img, 1)} cm on the far side: real and inverted.` : `Image appears ${num(-img, 1)} cm on the near side: virtual and upright.`), { z: 15, w: 600, f: real ? C.o : C.b }));
      return { kids, say: parallel
        ? `The object sits exactly at the focal point, so the rays leave the lens parallel and never meet: no image forms.`
        : `The object is ${v.u} cm from a convex lens of focal length ${v.f} cm. ${note}${real ? ' A screen on the far side would show it.' : ' You see it by looking through the lens, the way a magnifying glass works.'}` };
    },
  },
  mirror: {
    subject: 'science', about: 'A concave or convex spherical mirror with an object in front of it. Parallel rays reflect through the focus or seem to come from it, and the object distance sets whether the image is real and inverted or virtual and upright. For spherical mirrors, concave mirror, convex mirror, curved mirrors, centre of curvature, focal length, mirror formula, sign convention, real and virtual images.',
    params: { kind: 'concave' },
    sliders: [['u', 'Distance of the object (centimetres)', 6, 60, 1, 30], ['f', 'Focal length of the mirror (centimetres)', 5, 20, 1, 10]],
    draw(v, p = {}) {
      const convex = p.kind === 'convex', axis = 150, mx = 380, scale = 5, objH = 5;
      const fMag = Math.max(5, Math.min(20, v.f)), f = convex ? -fMag : fMag, denom = v.u - f;
      const vi = Math.abs(denom) < 1e-9 ? null : (v.u * f) / denom;   // positive means in front of the mirror
      const objX = mx - v.u * scale, objY = axis - objH * scale;
      const kids = [R(0, 0, W, H, convex ? '#eef7ff' : '#f7f3ff', { w: 0 }), L(20, axis, 580, axis, '#b8aed0', 3, { 'stroke-dasharray': '10 8' })];
      const rBig = 2 * fMag * scale, cX = mx + (convex ? rBig : -rBig);
      kids.push(s('path', { d: convex ? arc(cX, axis, rBig, 125, 235) : arc(cX, axis, rBig, -55, 55), fill: 'none', stroke: INK, 'stroke-width': 6 }));
      kids.push(T(mx + (convex ? 54 : -54), axis - 66, convex ? 'convex mirror' : 'concave mirror', { z: 13, f: '#6b5a8a' }));
      const fX = mx - f * scale, cMark = mx - 2 * f * scale;
      kids.push(CIRC(fX, axis, 5, C.g), T(fX, axis + 24, 'F', { z: 14, f: C.g }));
      kids.push(CIRC(cMark, axis, 4, C.b), T(cMark, axis + 24, 'C', { z: 14, f: C.b }));
      kids.push(L(objX, axis, objX, objY, C.p, 5), s('polygon', { points: `${objX},${objY - 12} ${objX - 7},${objY + 2} ${objX + 7},${objY + 2}`, fill: C.p }), T(objX, objY - 20, 'object', { z: 13, f: C.p }));
      // Two rays: one parallel to the axis (reflects through F, or away from F for a convex mirror) and one to the pole (reflects back at the same angle). Their meeting point is the image.
      const px = mx, py = axis, dx = mx - objX, dy = axis - objY;
      const rayTo = (x0, y0, ux, uy, xEnd, solid) => {
        if (Math.abs(ux) < 1e-6) return;
        const tt = (xEnd - x0) / ux;
        kids.push(L(x0, y0, xEnd, y0 + uy * tt, solid ? C.o : C.b, 3, solid ? {} : { 'stroke-dasharray': '7 6' }));
      };
      const ax0 = convex ? mx - fX : fX - mx, ay0 = convex ? objY - axis : axis - objY;
      rayTo(px, objY, ax0, ay0, 20, true);
      if (!(vi > 0)) rayTo(px, objY, -ax0, -ay0, 580, false);
      rayTo(px, py, -dx, dy, 20, true);
      if (!(vi > 0)) rayTo(px, py, dx, -dy, 580, false);
      let real = false;
      if (vi !== null) {
        real = vi > 0;
        const imgX = mx - vi * scale, m = -vi / v.u, imgY = axis - m * objH * scale, ratio = Math.abs(m);
        if (imgX > 8 && imgX < 592) {
          kids.push(L(imgX, axis, imgX, imgY, real ? C.o : C.b, 5, real ? {} : { 'stroke-dasharray': '8 6' }));
          kids.push(s('polygon', { points: `${imgX},${imgY} ${imgX - 7},${imgY + (real ? -12 : 12)} ${imgX + 7},${imgY + (real ? -12 : 12)}`, fill: real ? C.o : C.b }));
          kids.push(T(Math.max(24, Math.min(576, imgX)), real ? imgY + 30 : imgY - 14, 'image', { z: 13, f: real ? C.o : C.b }));
        }
        kids.push(T(300, 24, `Object ${v.u} cm from the mirror; focal length ${fMag} cm`, { z: 15, w: 600 }));
        kids.push(T(300, 292, real ? `Image ${num(vi, 1)} cm in front: real and inverted.` : `Image ${num(-vi, 1)} cm behind: virtual and upright.`, { z: 15, w: 600, f: real ? C.o : C.b }));
        const note = real
          ? `The image is real, inverted and ${ratio > 1.05 ? 'bigger' : ratio < 0.95 ? 'smaller' : 'the same size'} than the object, ${num(vi, 1)} cm in front of the mirror.`
          : `The image is virtual, upright and ${ratio > 1.05 ? 'bigger' : ratio < 0.95 ? 'smaller' : 'the same size'} than the object, ${num(-vi, 1)} cm behind the mirror.`;
        return { kids, say: `The object is ${v.u} cm in front of a ${convex ? 'convex' : 'concave'} mirror of focal length ${fMag} cm. ${note}${real ? ' A screen in front of the mirror would show it.' : ' No screen can catch it: you see it by looking into the mirror.'}` };
      }
      kids.push(T(300, 24, `Object ${v.u} cm from the mirror; focal length ${fMag} cm`, { z: 15, w: 600 }));
      kids.push(T(300, 292, 'The rays reflect parallel, so no image forms.', { z: 15, w: 600, f: C.b }));
      return { kids, say: `The object sits exactly at the focus of the ${convex ? 'convex' : 'concave'} mirror, so the reflected rays run parallel and never meet: no image forms.` };
    },
  },
  atom: {
    subject: 'science', about: 'Build an atom from its protons, neutrons and electrons. The number of protons sets which element it is (the atomic number), neutrons added to protons give the mass number, extra or missing electrons make an ion, and the electrons fill shells around the nucleus in the 2, 8, 8, 2 pattern. For atoms, atomic number, mass number, isotopes, ions, valency, electron shells, the Bohr model, Rutherford and gold foil.',
    sliders: [['p', 'Protons in the nucleus', 1, 20, 1, 1], ['n', 'Neutrons in the nucleus', 0, 25, 1, 0], ['e', 'Electrons around it', 0, 20, 1, 1]],
    draw(v) {
      const SYM = ['', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca'];
      const NAMES = ['', 'hydrogen', 'helium', 'lithium', 'beryllium', 'boron', 'carbon', 'nitrogen', 'oxygen', 'fluorine', 'neon', 'sodium', 'magnesium', 'aluminium', 'silicon', 'phosphorus', 'sulphur', 'chlorine', 'argon', 'potassium', 'calcium'];
      const cx = 180, cy = 150, kids = [];
      const prot = Math.max(1, Math.min(20, v.p)), neut = Math.max(0, Math.min(25, v.n)), elec = Math.max(0, Math.min(20, v.e));
      const sym = SYM[prot], name = NAMES[prot], mass = prot + neut, charge = prot - elec;
      // electrons fill the shells in the order a child meets them: 2, 8, 8, then 2
      const caps = [2, 8, 8, 2], shells = [];
      let left = elec;
      for (const cap of caps) { if (left <= 0) break; const take = Math.min(left, cap); shells.push(take); left -= take; }
      const radii = [46, 76, 106, 134];
      for (let i = 0; i < shells.length; i++) kids.push(CIRC(cx, cy, radii[i], 'none', { s: '#cfc6e6', w: 2, x: { 'stroke-dasharray': '5 6' } }));
      // the nucleus: each proton and neutron a small ball, packed into a round cluster
      const total = prot + neut;
      for (let i = 0; i < total; i++) {
        const a = i * 2.399963, rr = 3.1 * Math.sqrt(i + 0.4);
        kids.push(CIRC(cx + rr * Math.cos(a), cy + rr * Math.sin(a), 5, i < prot ? C.o : '#9aa5b1', { s: INK, w: 1 }));
      }
      // electrons on their shells, spaced evenly so none sit on top of another
      let seen = 0;
      shells.forEach((count, sh) => {
        for (let k = 0; k < count; k++) {
          const a = -Math.PI / 2 + (2 * Math.PI * k) / count + sh * 0.35;
          kids.push(CIRC(cx + radii[sh] * Math.cos(a), cy + radii[sh] * Math.sin(a), 5, C.b, { s: INK, w: 1 }));
          seen++;
        }
      });
      // a small key for the three particles
      kids.push(CIRC(360, 274, 6, C.o, { s: INK, w: 1 }), T(372, 279, 'proton', { a: 'start', z: 12, w: 600 }), CIRC(438, 274, 6, '#9aa5b1', { s: INK, w: 1 }), T(450, 279, 'neutron', { a: 'start', z: 12, w: 600 }), CIRC(522, 274, 6, C.b, { s: INK, w: 1 }), T(534, 279, 'electron', { a: 'start', z: 12, w: 600 }));
      const outer = shells[shells.length - 1] || 0;
      const noble = elec === 2 || elec === 10 || elec === 18;
      const val = elec === 0 || noble ? 0 : outer <= 4 ? outer : 8 - outer;
      const chargeText = charge === 0 ? '0, a neutral atom' : charge > 0 ? `+${charge} ion` : `−${-charge} ion`;
      kids.push(T(350, 36, `${name} (${sym})`, { a: 'start', z: 24, f: '#2a1a4a' }));
      kids.push(T(350, 68, `Protons, the atomic number Z = ${prot}`, { a: 'start', z: 15, w: 600 }));
      kids.push(T(350, 92, `Neutrons = ${neut}`, { a: 'start', z: 15, w: 600 }));
      kids.push(T(350, 116, `Mass number A = ${prot} + ${neut} = ${mass}`, { a: 'start', z: 15, w: 600 }));
      kids.push(T(350, 140, `Electrons = ${elec}`, { a: 'start', z: 15, w: 600 }));
      kids.push(T(350, 164, `Shells: ${shells.length ? shells.join(', ') : 'none'}`, { a: 'start', z: 15, w: 600, f: '#1f63d9' }));
      kids.push(T(350, 188, `Outer shell: ${outer} electron${outer === 1 ? '' : 's'}, valency ${val}`, { a: 'start', z: 15, w: 600 }));
      kids.push(T(350, 212, `Charge: ${chargeText}`, { a: 'start', z: 15, w: 600, f: charge === 0 ? '#058a68' : C.p }));
      const say = `${sym ? `This is ${name}. ` : ''}${prot} proton${prot === 1 ? ' makes' : 's make'} it ${name} and set${prot === 1 ? 's' : ''} its atomic number to ${prot}. ${neut === 0 ? 'With no neutrons' : `With ${neut} neutron${neut === 1 ? '' : 's'}`} the mass number is ${mass}. ${elec === 0 ? 'It has no electrons, so there are no filled shells' : `${elec} electron${elec === 1 ? ' fills' : 's fill'} the shells as ${shells.join('-')}, so the outer shell holds ${outer}`}. ${charge === 0 ? 'It is neutral because the protons and electrons balance.' : charge > 0 ? `It is a positive ion: ${charge} more proton${charge === 1 ? '' : 's'} than electrons.` : `It is a negative ion: ${-charge} more electron${-charge === 1 ? '' : 's'} than protons.`}`;
      return { kids, say };
    },
  },
  foodchain: {
    subject: 'science', about: 'A food chain built one living thing at a time, from the Sun and grass at the first trophic level up to a snake. It shows who eats whom, the trophic level of each living thing, that energy flows one way, and that less energy is left at each step. For food chains, food webs, trophic levels, producers, herbivores, consumers, energy flow, and the web of life.',
    sliders: [['links', 'Living things in the chain', 2, 4, 1, 3], ['sun', 'Sunlight falling on the grass (units)', 100, 1000, 100, 500]],
    draw(v) {
      const cards = [
        { name: 'grass', role: 'producer', level: 'trophic level 1', fill: C.g },
        { name: 'grasshopper', role: 'herbivore', level: 'trophic level 2', fill: '#7bbf4a' },
        { name: 'frog', role: 'small carnivore', level: 'trophic level 3', fill: '#2f9e6e' },
        { name: 'snake', role: 'larger carnivore', level: 'trophic level 4', fill: C.p },
      ];
      const shown = Math.max(2, Math.min(4, v.links)), cardTop = 142, cardH = 70, midY = cardTop + cardH / 2;
      const gap = shown > 1 ? (552 - 130) / (shown - 1) : 0;
      const kids = [R(0, 0, W, H, '#f3fbf4', { w: 0 })];
      // the Sun: green plants capture about 1 part in 100 of its energy
      kids.push(CIRC(64, 62, 22, C.y, { w: 3 }));
      for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; kids.push(L(64 + 28 * Math.cos(a), 62 + 28 * Math.sin(a), 64 + 36 * Math.cos(a), 62 + 36 * Math.sin(a), '#d99a00', 3)); }
      kids.push(T(64, 108, 'Sun', { z: 16, f: '#8a6a2a' }));
      const grassX = 130;
      kids.push(s('path', { d: `M 86 82 Q 100 118 ${grassX - 34} ${cardTop - 4}`, fill: 'none', stroke: '#d99a00', 'stroke-width': 3, 'stroke-dasharray': '7 5' }));
      kids.push(s('polygon', { points: `${grassX - 34},${cardTop - 4} ${grassX - 46},${cardTop - 12} ${grassX - 40},${cardTop + 4}`, fill: '#d99a00' }));
      const heights = [1, 0.55, 0.34, 0.21], baseH = 18 + 42 * (v.sun / 1000);
      for (let i = 0; i < shown; i++) {
        const part = cards[i], cx2 = 130 + gap * i, cy2 = midY;
        // the last card sits near the right edge, so its three lines end at the card instead of running past it
        const lastAnchor = i === shown - 1 ? 'end' : undefined, lx = i === shown - 1 ? cx2 + 40 : cx2;
        const h = baseH * heights[i];
        kids.push(R(cx2 - 7, cardTop - 14 - h, 14, h, part.fill, { w: 2, x: { opacity: 0.85 } }));
        kids.push(T(cx2, cardTop - 20 - h, i === 0 ? '1 of 100' : 'less', { z: 13, f: '#5b4a7a', w: 600 }));
        kids.push(R(cx2 - 42, cardTop, 84, cardH, '#fff', { r: 10, w: 2, s: '#7a6b9a' }));
        if (i === 0) {
          for (let b = -1; b <= 1; b++) kids.push(s('path', { d: `M ${cx2 + b * 9} ${cy2 + 22} Q ${cx2 + b * 16} ${cy2 + 2} ${cx2 + b * 20} ${cy2 - 14}`, fill: 'none', stroke: C.g, 'stroke-width': 4, 'stroke-linecap': 'round' }));
          kids.push(L(cx2 - 20, cy2 + 24, cx2 + 20, cy2 + 24, '#6b4a23', 4));
        } else if (i === 1) {
          kids.push(s('ellipse', { cx: cx2 + 2, cy: cy2 + 2, rx: 16, ry: 8, fill: part.fill, stroke: INK, 'stroke-width': 2 }));
          kids.push(CIRC(cx2 - 15, cy2 - 2, 6, part.fill, { w: 2 }), L(cx2 - 13, cy2 + 8, cx2 - 20, cy2 + 18, INK, 2), L(cx2 + 8, cy2 + 9, cx2 + 16, cy2 + 18, INK, 2), L(cx2 - 14, cy2 - 7, cx2 - 22, cy2 - 16, INK, 2), L(cx2 - 17, cy2 - 6, cx2 - 26, cy2 - 12, INK, 2));
        } else if (i === 2) {
          kids.push(s('ellipse', { cx: cx2, cy: cy2 + 4, rx: 18, ry: 12, fill: part.fill, stroke: INK, 'stroke-width': 2 }));
          kids.push(CIRC(cx2 - 9, cy2 - 10, 6, '#fff', { w: 2 }), CIRC(cx2 + 9, cy2 - 10, 6, '#fff', { w: 2 }), CIRC(cx2 - 9, cy2 - 10, 3, INK, { w: 0 }), CIRC(cx2 + 9, cy2 - 10, 3, INK, { w: 0 }));
          kids.push(s('path', { d: `M ${cx2 - 12} ${cy2 + 8} Q ${cx2} ${cy2 + 15} ${cx2 + 12} ${cy2 + 8}`, fill: 'none', stroke: INK, 'stroke-width': 2 }));
        } else {
          kids.push(s('path', { d: `M ${cx2 - 22} ${cy2 + 12} Q ${cx2 - 12} ${cy2 - 12} ${cx2} ${cy2 + 6} Q ${cx2 + 12} ${cy2 + 20} ${cx2 + 20} ${cy2 - 4}`, fill: 'none', stroke: part.fill, 'stroke-width': 7, 'stroke-linecap': 'round' }));
          kids.push(CIRC(cx2 + 22, cy2 - 6, 7, part.fill, { w: 2 }));
        }
        kids.push(T(lx, cardTop + cardH + 20, part.name, { z: 15, a: lastAnchor }));
        kids.push(T(lx, cardTop + cardH + 38, part.role, { z: 13, w: 600, f: '#5b4a7a', a: lastAnchor }));
        kids.push(T(lx, cardTop + cardH + 56, part.level, { z: 14, w: 600, f: '#8338ec', a: lastAnchor }));
        if (i < shown - 1) {
          const x1 = cx2 + 42, x2 = 130 + gap * (i + 1) - 42, y0 = midY;
          kids.push(L(x1 + 2, y0, x2 - 8, y0, C.o, 4));
          kids.push(s('polygon', { points: `${x2 - 2},${y0} ${x2 - 12},${y0 - 7} ${x2 - 12},${y0 + 7}`, fill: C.o }));
        }
      }
      kids.push(T(300, 24, `a food chain with ${shown} living thing${shown === 1 ? '' : 's'}`, { z: 16, f: '#2a1a4a' }));
      kids.push(T(400, 46, 'energy flows this way', { z: 12, f: C.o, w: 600 }));
      const food = Math.round(v.sun / 100 * 10) / 10;
      const say = `Green plants capture about 1 part in every 100 of the sunlight that falls on them, so the grass stores about ${food} unit${food === 1 ? '' : 's'} from ${v.sun}. ${shown} living things make ${shown} trophic levels: the grass is the producer at level 1, the grasshopper is a herbivore at level 2${shown > 2 ? ', and each animal after that is a carnivore at the next level' : ''}. Energy flows only one way, and less of it is left at each step, so the top of the chain gets the least.`;
      return { kids, say };
    },
  },
  market: {
    subject: 'social', about: 'A market where buyers and sellers meet: the demand and supply curves cross at the equilibrium price. Move the price to make a shortage or a surplus, and add buyers to shift demand. For the law of demand, the law of supply, market equilibrium, excess demand and excess supply.',
    sliders: [['price', 'Price (₹ per kg)', 40, 160, 5, 85], ['buyers', 'Extra buyers (demand)', 0, 6, 1, 0]],
    draw(v) {
      const pr = v.price, extra = v.buyers, left = 74, right = 560, top = 34, base = 250;
      const xOf = (q) => left + (q / 30) * (right - left);
      const yOf = (p) => base - (p / 170) * (base - top);
      const want = 22 + extra - 0.1 * pr, bring = 2 + 0.1 * pr;
      const eqP = 100 + 5 * extra, eqQ = 12 + 0.5 * extra;
      const parts = [R(left, top, right - left, base - top, '#fffdf7', { w: 2, s: '#c9bfe0' })];
      for (let p = 0; p <= 150; p += 50) { parts.push(L(left - 7, yOf(p), left, yOf(p), INK, 2)); parts.push(T(left - 13, yOf(p) + 5, String(p), { z: 12, w: 600, f: '#6b5a8a', a: 'end' })); }
      for (let q = 0; q <= 30; q += 10) { parts.push(L(xOf(q), base, xOf(q), base + 7, INK, 2)); parts.push(T(xOf(q), base + 22, String(q), { z: 12, w: 600, f: '#6b5a8a' })); }
      parts.push(L(left, base, right, base, INK, 3), L(left, top, left, base, INK, 3));
      parts.push(T(left + 6, top - 10, 'Price (₹ per kg)', { z: 13, w: 600, f: '#6b5a8a', a: 'start' }), T(right - 4, base + 38, 'Quantity (kg)', { z: 13, w: 600, f: '#6b5a8a', a: 'end' }));
      const curve = (qty, col, word) => {
        const pts = []; for (let p = 0; p <= 170; p += 5) pts.push(`${xOf(qty(p))},${yOf(p)}`);
        return [s('polyline', { points: pts.join(' '), fill: 'none', stroke: col, 'stroke-width': 4, 'stroke-linecap': 'round' }), T(xOf(qty(150)) + 30, yOf(150) + (word === 'demand' ? 22 : -12), word, { z: 14, f: col, w: 600 })];
      };
      parts.push(...curve((p) => 22 + extra - 0.1 * p, C.b, 'demand'), ...curve((p) => 2 + 0.1 * p, C.o, 'supply'));
      parts.push(L(left, yOf(pr), right, yOf(pr), '#9a8fb8', 2, { 'stroke-dasharray': '6 6' }));
      parts.push(CIRC(xOf(want), yOf(pr), 7, C.b, { w: 2 }), CIRC(xOf(bring), yOf(pr), 7, C.o, { w: 2 }));
      parts.push(CIRC(xOf(eqQ), yOf(eqP), 8, C.g, { w: 3 }));
      const lo = Math.min(xOf(want), xOf(bring)), hi = Math.max(xOf(want), xOf(bring));
      if (Math.abs(want - bring) > 0.05) {
        parts.push(L(lo, yOf(pr) + 26, hi, yOf(pr) + 26, '#c2510e', 3));
        parts.push(T((lo + hi) / 2, yOf(pr) + 46, want > bring ? 'shortage' : 'surplus', { z: 14, f: '#c2510e', w: 700 }));
      }
      const gap = want - bring;
      const where = Math.abs(gap) < 0.05 ? 'balanced' : gap > 0 ? `a shortage of ${num(gap, 1)} kg, so the price would rise` : `a surplus of ${num(-gap, 1)} kg, so the price would fall`;
      return { kids: parts, say: `At ₹${pr} a kg, buyers want ${num(want, 1)} kg and sellers bring ${num(bring, 1)} kg: ${where}. The demand and supply curves cross at ₹${num(eqP, 0)} and ${num(eqQ, 1)} kg.` };
    },
  },
  barter: {
    subject: 'social', about: 'A village market where you hold a sack of wheat and need shoes, salt or a blanket. By barter the swap works only when the other person both wants your wheat and has what you need; with money you sell the wheat for coins and then buy the good, so you never need that double match. For barter, the double coincidence of wants, the problems of barter and why money was invented.',
    sliders: [['mode', 'Barter or money (0 barter, 1 money)', 0, 1, 1, 0], ['person', 'Who you visit: Meena, Ravi, Sita, Gopal', 0, 3, 1, 1], ['need', 'What you need: shoes, salt, blanket', 0, 2, 1, 0]],
    draw(v) {
      const md = v.mode, who = v.person, need = v.need;
      const goods = [{ name: 'shoes', col: C.o, pale: '#fff0eb' }, { name: 'salt', col: C.b, pale: '#e8f0ff' }, { name: 'blanket', col: C.p, pale: '#f1e9fd' }];
      const folks = [{ name: 'Meena', has: 'shoes', wants: 'wheat', good: 0 }, { name: 'Ravi', has: 'salt', wants: 'cloth', good: 1 }, { name: 'Sita', has: 'blanket', wants: 'rice', good: 2 }, { name: 'Gopal', has: 'rice', wants: 'wheat', good: 3 }];
      const f = folks[who], want = goods[need];
      const kids = [R(0, 0, W, H, '#fffdf6', { w: 0 })];
      const icon = (kind, cx, cy, pale) => {
        const out = [];
        if (kind === 'wheat') { out.push(s('path', { d: `M ${cx - 20} ${cy + 20} L ${cx - 12} ${cy - 18} L ${cx + 12} ${cy - 18} L ${cx + 20} ${cy + 20} Z`, fill: '#e8cf8a', stroke: INK, 'stroke-width': 2 })); for (const dy of [-8, 0, 8]) { out.push(L(cx - 9, cy + dy, cx - 3, cy + dy - 9, '#b58b3a', 2)); out.push(L(cx + 9, cy + dy, cx + 3, cy + dy - 9, '#b58b3a', 2)); } }
        else if (kind === 'shoes') { for (const dx of [-22, 2]) { out.push(s('path', { d: `M ${cx + dx} ${cy + 10} L ${cx + dx} ${cy - 4} q 0 -8 8 -8 l 6 0 q 6 0 10 6 l 8 12 l 0 6 l -32 0 Z`, fill: C.o, stroke: INK, 'stroke-width': 2 })); } }
        else if (kind === 'salt') { out.push(s('path', { d: `M ${cx - 26} ${cy + 16} q 26 -34 52 0 Z`, fill: '#f3f7fd', stroke: C.b, 'stroke-width': 2 })); for (const [dx, dy] of [[-8, 6], [6, 8], [0, 0], [-14, 12], [14, 12]]) out.push(CIRC(cx + dx, cy + dy, 2, '#9fb8d8', { w: 0 })); }
        else if (kind === 'blanket') { out.push(R(cx - 26, cy - 14, 52, 32, C.p, { s: INK, w: 2, r: 5 })); for (const dx of [-14, 0, 14]) out.push(L(cx + dx, cy - 14, cx + dx, cy + 18, '#c9aef0', 3)); }
        else if (kind === 'rice') { out.push(s('path', { d: `M ${cx - 28} ${cy} q 28 30 56 0 Z`, fill: '#fff', stroke: INK, 'stroke-width': 2 })); for (const [dx, dy] of [[-10, -2], [0, -4], [10, -2], [-4, 4], [6, 4]]) out.push(s('ellipse', { cx: cx + dx, cy: cy + dy, rx: 4, ry: 2, fill: '#e9e2cc', stroke: '#b9ad8a', 'stroke-width': 1 })); }
        else if (kind === 'coins') { for (const dy of [10, 0, -10]) { out.push(s('ellipse', { cx, cy: cy + dy, rx: 22, ry: 8, fill: '#ffd166', stroke: '#b8860b', 'stroke-width': 2 })); } out.push(T(cx, cy - 6, '\u20b9', { z: 13, f: '#8a6500' })); }
        else { out.push(R(cx - 24, cy - 16, 48, 32, pale || '#e8eef7', { s: INK, w: 2, r: 4 })); for (const dx of [-12, 0, 12]) out.push(L(cx + dx, cy - 16, cx + dx, cy + 16, '#9fb0c8', 2)); }
        return out;
      };
      const card = (x, w, head, col, pale) => { kids.push(R(x, 40, w, 122, pale, { s: col, w: 2, r: 12 })); kids.push(T(x + w / 2, 60, head, { z: 18, f: '#6b5a8a', w: 700 })); };
      card(16, 158, 'YOU', '#c9bfe0', '#fbf8f0');
      kids.push(...icon('wheat', 95, 106));
      kids.push(T(95, 152, 'wheat', { z: 18, w: 600, f: '#6b5a8a' }));
      if (md === 1) {
        card(188, 206, 'SHOP', '#c9bfe0', '#fbf8f0');
        kids.push(...icon('coins', 218, 112));
        kids.push(T(258, 118, 'takes coins', { z: 20, a: 'start', w: 700, f: '#0b6b52' }));
      } else {
        card(188, 206, f.name.toUpperCase(), f.wants === 'wheat' ? C.g : '#c9bfe0', '#fbf8f0');
        kids.push(...icon(f.has, 218, 112));
        kids.push(T(258, 104, `has ${f.has}`, { z: 19, a: 'start', w: 600 }));
        kids.push(T(258, 134, `wants ${f.wants}`, { z: 19, a: 'start', w: 700, f: f.wants === 'wheat' ? '#0b6b52' : '#c2510e' }));
      }
      card(408, 176, 'YOU NEED', want.col, want.pale);
      kids.push(...icon(want.name, 496, 106, want.pale));
      kids.push(T(496, 152, want.name, { z: 18, w: 600, f: '#6b5a8a' }));
      let ok, head, sub;
      if (md === 1) {
        ok = true; head = `With money you can buy the ${want.name}`;
        sub = `You sell your wheat for coins, then buy the ${want.name} with them. Money is accepted by everyone, so no double match is needed.`;
      } else if (f.wants !== 'wheat') {
        ok = false; head = `${f.name} will not take your wheat`;
        sub = `${f.name} wants ${f.wants}, not wheat, so no swap happens. You must find someone who wants your wheat.`;
      } else if (f.good !== need) {
        ok = false; head = `${f.name} has ${f.has}, not ${want.name}`;
        sub = `${f.name} wants your wheat but can only give ${f.has}. You need ${want.name}, so this swap still leaves you without it.`;
      } else {
        ok = true; head = `Swap done: wheat for ${want.name}`;
        sub = `${f.name} wanted your wheat and had ${want.name}. You both wanted what the other had: a double coincidence of wants.`;
      }
      kids.push(R(16, 174, 568, 110, ok ? '#e9f7ef' : '#fdeceb', { s: ok ? C.g : '#d9534f', w: 3, r: 12 }));
      kids.push(T(300, 204, (ok ? '\u2713 ' : '\u2715 ') + head, { z: 21, w: 700, f: ok ? '#0b6b52' : '#a8322d' }));
      const lines = sub.match(/.{1,50}(\s|$)/g) || [sub];
      lines.slice(0, 3).forEach((line, i) => kids.push(T(36, 232 + i * 20, line.trim(), { z: 17, w: 600, a: 'start', f: INK })));
      return { kids, say: `${head}. ${sub}` };
    },
  },
  sectors: {
    subject: 'social', about: 'A crop turned into cloth and then a shirt, with the value each stage adds, and where the workers of a country are: on farms, in factories or in services. For the three sectors of the economy, primary, secondary and tertiary, value added, and how jobs move as a country develops.',
    sliders: [['stage', 'How far the product has gone', 0, 2, 1, 0], ['advance', 'How developed the country is', 0, 2, 1, 0]],
    draw(v) {
      const st = v.stage, ad = v.advance;
      const cards = [
        { x: 26, head: 'Farm', thing: 'raw cotton', worth: 20, colour: C.g, pale: '#e6f7f1' },
        { x: 214, head: 'Factory', thing: 'cloth', worth: 45, colour: C.b, pale: '#e8f0ff' },
        { x: 402, head: 'Shop', thing: 'shirt', worth: 90, colour: C.o, pale: '#fff0eb' },
      ];
      const kids = [R(0, 0, W, H, '#fbfdff', { w: 0 })];
      cards.forEach((c, i) => {
        const on = i <= st;
        kids.push(R(c.x, 22, 172, 86, on ? c.pale : '#fff', { s: on ? c.colour : '#cfc7e0', w: on ? 4 : 2, r: 12 }));
        kids.push(T(c.x + 86, 50, c.head, { z: 17, f: on ? c.colour : '#a99fc0' }));
        kids.push(T(c.x + 86, 76, c.thing, { z: 16, f: on ? INK : '#a99fc0', w: 600 }));
        kids.push(T(c.x + 86, 99, `₹${c.worth}`, { z: 18, f: on ? INK : '#a99fc0' }));
        if (i < 2) {
          const onNext = i + 1 <= st, mid = c.x + 192;
          kids.push(L(c.x + 174, 65, c.x + 204, 65, onNext ? INK : '#cfc7e0', 4));
          kids.push(s('path', { d: `M ${c.x + 204} 65 l -9 -6 l 0 12 Z`, fill: onNext ? INK : '#cfc7e0' }));
          kids.push(T(mid, 126, `+ ₹${cards[i + 1].worth - c.worth} added`, { z: 14, f: onNext ? '#0b6b52' : '#a99fc0', w: 700 }));
        }
      });
      const mix = [[70, 15, 15], [45, 30, 25], [12, 28, 60]][ad];
      const names = ['primary: farms', 'secondary: factories', 'services: shops and offices'];
      const cols = [C.g, C.b, C.o];
      kids.push(T(26, 148, 'Where the workers of this country are', { z: 16, a: 'start', f: '#6b5a8a', w: 600 }));
      mix.forEach((p, i) => {
        const y = 166 + i * 34;
        kids.push(T(26, y + 16, names[i], { z: 14, a: 'start', w: 600, f: '#6b5a8a' }));
        kids.push(R(252, y, 300, 22, '#efe9f7', { w: 0, r: 6 }));
        kids.push(R(252, y, 3 * p, 22, cols[i], { w: 0, r: 6 }));
        kids.push(T(252 + 3 * p + 8, y + 16, `${p} of 100`, { z: 14, a: 'start', f: INK, w: 700 }));
      });
      const step = [
        'The farm grows the cotton and sells it for ₹20.',
        'The factory turns the cotton into cloth and sells it for ₹45, so this stage adds ₹25.',
        'The shop sells the finished shirt for ₹90, so this stage adds ₹45.',
      ][st];
      const dev = [
        'Most workers are on farms.',
        'Many workers have moved to factories, but farms still employ the most.',
        'Most workers are now in services.',
      ][ad];
      return { kids, say: `${step} ${dev} Primary ${mix[0]}, secondary ${mix[1]} and services ${mix[2]} out of every 100 workers.` };
    },
  },
  seats: {
    subject: 'social', about: 'Votes turning into seats: one hundred constituencies, each won outright by whoever has more votes there. Slide a party vote share and how uneven the swings are, and watch the seats. For elections, first past the post, vote share against seat share, and how a party can win more seats than its share of votes.',
    sliders: [['share', 'Votes for party A (%)', 30, 70, 1, 38], ['spread', 'How uneven the swings are', 0, 20, 1, 8]],
    draw(v) {
      const share = v.share, spread = v.spread;
      const rand = seeded(11);   // the same map every time the child comes back
      const swing = [];
      for (let i = 0; i < 100; i++) swing.push(rand() * 2 - 1);
      const box = 18, gap = 2, x0 = 22, y0 = 24;
      let seatsA = 0;
      const cells = [];
      for (let i = 0; i < 100; i++) {
        const won = share + swing[i] * spread >= 50;
        if (won) seatsA++;
        cells.push(R(x0 + (i % 10) * (box + gap), y0 + Math.floor(i / 10) * (box + gap), box, box, won ? C.g : C.b, { w: 1, s: '#fff' }));
      }
      const seatsB = 100 - seatsA;
      const bx = 300, bw = 272, barh = 34;
      const parts = [R(0, 0, W, H, '#fbfdff', { w: 0 }), ...cells];
      // legend: one square per party, so the colours mean something without a long caption
      parts.push(R(bx, 20, 16, 16, C.g, { w: 1, s: '#fff' }), T(bx + 24, 34, 'party A', { z: 20, w: 700, f: '#0b6b52', a: 'start' }));
      parts.push(R(bx + 130, 20, 16, 16, C.b, { w: 1, s: '#fff' }), T(bx + 154, 34, 'party B', { z: 20, w: 700, f: '#1d4ed8', a: 'start' }));
      const row = (y, label, a, b) => {
        const total = a + b || 1, wA = Math.max(3, (a / total) * bw);
        parts.push(R(bx, y, bw, barh, C.b, { w: 2, s: '#fff' }));
        parts.push(R(bx, y, wA, barh, C.g, { w: 2, s: '#fff' }));
        parts.push(T(bx - 12, y + barh - 11, label, { z: 20, w: 600, f: '#6b5a8a', a: 'end' }));
      };
      row(72, 'votes', share, 100 - share);
      row(150, 'seats', seatsA, seatsB);
      parts.push(T(bx + 8, 132, `A ${share}%`, { z: 22, w: 700, f: INK, a: 'start' }), T(bx + bw, 132, `B ${100 - share}%`, { z: 22, w: 700, f: '#6b5a8a', a: 'end' }));
      parts.push(T(bx + 8, 210, `A ${seatsA}`, { z: 22, w: 700, f: INK, a: 'start' }), T(bx + bw, 210, `B ${seatsB}`, { z: 22, w: 700, f: '#6b5a8a', a: 'end' }));
      parts.push(T(x0, y0 + 10 * (box + gap) + 24, 'one square = one constituency', { z: 18, w: 600, f: '#6b5a8a', a: 'start' }));
      const gapSeats = seatsA - share;
      const where = Math.abs(gapSeats) <= 2 ? 'Seats and votes are close here.'
        : gapSeats > 0 ? `A wins ${gapSeats} more seats than its share of the votes.` : `A wins ${-gapSeats} fewer seats than its share of the votes.`;
      return { kids: parts, say: `With ${share}% of the votes, party A wins ${seatsA} of the 100 seats. ${where}` };
    },
  },
  lapse: {
    subject: 'social', about: 'Air cools as you climb: the mountain with a height marker, the temperature at that height, and the snow line where it reaches freezing. For temperature falling with height, hill stations, the snow line, altitude and climate, and why the top of a mountain is cold.',
    sliders: [['height', 'Height above sea level (m)', 0, 6000, 100, 0], ['base', 'Air at sea level (°C)', 10, 40, 1, 30]],
    draw(v) {
      const h = v.height, base = v.base, RATE = 6.5;   // the environmental lapse rate, °C per km
      const temp = base - (h / 1000) * RATE;
      const yOf = (m) => 266 - (m / 6000) * 196;
      const halfAt = (y) => ((266 - y) / 196) * 216;
      const summitY = yOf(6000), y = yOf(h);
      const snowLine = (base / RATE) * 1000;            // metres where the air reaches 0°C
      const snowY = yOf(Math.min(snowLine, 6000));
      const parts = [R(0, 0, W, H, '#eef6ff', { w: 0 })];
      parts.push(s('polygon', { points: `62,266 300,${summitY} 538,266`, fill: '#b9c7de', stroke: 'none' }));
      if (snowLine < 6000) {
        const wl = halfAt(snowY);
        parts.push(s('polygon', { points: `${300 - wl},${snowY} 300,${summitY} ${300 + wl},${snowY}`, fill: '#ffffff', stroke: 'none' }));
      }
      // the outline goes on last, so the peak stays visible through the snow
      parts.push(s('polygon', { points: `62,266 300,${summitY} 538,266`, fill: 'none', stroke: INK, 'stroke-width': 3 }));
      if (snowLine < 6000) parts.push(T(66, snowY + 20, `snow line ${Math.round(snowLine / 100) * 100} m`, { z: 19, w: 600, f: '#3b6ea5', a: 'start' }));

      parts.push(T(66, 40, `${num(base, 0)}°C at the coast`, { z: 20, w: 600, f: '#5a5170', a: 'start' }));
      parts.push(L(56, 266, 546, 266, INK, 4));
      parts.push(T(66, 286, 'sea level', { z: 19, w: 600, f: '#5a5170', a: 'start' }));
      parts.push(L(56, y, 546, y, '#c2510e', 3, { 'stroke-dasharray': '8 6' }));
      parts.push(CIRC(300, y, 9, '#c2510e', { w: 3 }));
      parts.push(T(300, y - 20, `${h} m`, { z: 24, w: 700, f: '#c2510e' }));
      const tx = 470, top = 84, bottom = 244;
      parts.push(R(tx, top, 26, bottom - top, '#ffffff', { w: 3, r: 13 }));
      const frac = Math.max(0, Math.min(1, (temp + 10) / 50));   // -10..40 °C
      const fillTop = bottom - frac * (bottom - top);
      parts.push(R(tx + 4, fillTop, 18, bottom - fillTop - 4, temp <= 0 ? '#7bb7ff' : '#ffb703', { w: 0, r: 9 }));
      parts.push(T(tx + 13, bottom + 42, `${num(temp, 0)}°C`, { z: 22, w: 700, f: INK }));
      const drop = base - temp;
      const snow = temp <= 0 ? ' At this height the air is at or below freezing, so snow can settle.' : '';
      const where = h === 0 ? 'At sea level' : `At ${h} metres`;
      const colder = h === 0 ? '' : `, ${num(drop, 1)}°C colder than at sea level`;
      return { kids: parts, say: `${where} the air is about ${num(temp, 1)}°C${colder}.${snow}` };
    },
  },
  tangent: {
    subject: 'maths', about: 'A point outside a circle and the two tangents drawn from it. The tangent touches the circle once, meets the radius at a right angle, and both tangents from the same point are equal; the sliders move the point and change the radius. For tangents to a circle, tangent length, radius perpendicular to the tangent, and the equal tangents from an external point.',
    sliders: [['r', 'Radius of the circle (cm)', 3, 10, 1, 5], ['d', 'Distance of the point from the centre (cm)', 4, 25, 1, 13]],
    draw(v) {
      const rad0 = Math.max(1, Math.min(v.r, v.d)), dist = Math.max(v.d, rad0);   // the point is never inside the circle
      const cx = 250, cy = 150, scale = Math.min(11, 260 / Math.max(dist, 12));
      const px = cx + dist * scale, rr = rad0 * scale;
      const tl = Math.sqrt(Math.max(0, dist * dist - rad0 * rad0));
      const theta = Math.acos(Math.min(1, rad0 / dist));                 // angle between OP and each touch point
      const touch = (sign) => ({ x: cx + Math.cos(sign * theta) * rr, y: cy - Math.sin(sign * theta) * rr });
      const t1 = touch(1), t2 = touch(-1);
      const kids = [R(0, 0, W, H, '#fbfdff', { w: 0 })];
      kids.push(CIRC(cx, cy, rr, '#e8f0ff', { w: 4 }));
      kids.push(CIRC(cx, cy, 4, INK));
      kids.push(L(cx, cy, px, cy, '#9a8fb8', 2, { 'stroke-dasharray': '7 6' }));
      kids.push(CIRC(px, cy, 7, C.o, { w: 3 }));
      for (const t of [t1, t2]) {
        kids.push(L(px, cy, t.x, t.y, C.o, 4));
        kids.push(CIRC(t.x, t.y, 5, C.g));
        const ux = (t.x - cx) / rr, uy = (t.y - cy) / rr;                // along the radius
        const vx = (px - t.x) / (tl * scale || 1), vy = (cy - t.y) / (tl * scale || 1);
        const a = 12;
        kids.push(s('polyline', { points: `${t.x + ux * a},${t.y + uy * a} ${t.x + (ux + vx) * a},${t.y + (uy + vy) * a} ${t.x + vx * a},${t.y + vy * a}`, fill: 'none', stroke: '#3b6ea5', 'stroke-width': 2 }));
      }
      kids.push(T(cx, cy - rr - 14, `r = ${rad0} cm`, { z: 22, w: 700, f: '#5a5170' }));
      kids.push(T((cx + px) / 2, cy + 84, `d = ${dist} cm`, { z: 22, w: 700, f: '#5a5170' }));
      const mid = { x: (px + t1.x) / 2, y: (cy + t1.y) / 2 };
      kids.push(T(mid.x + 16, mid.y - 6, `tangent ${num(tl, 2)} cm`, { z: 22, w: 700, f: '#c2510e', a: 'start' }));
      
      const kind = Math.abs(dist - rad0) < 0.001 ? 'The point is on the circle, so the tangent has closed up to nothing.' : `Each tangent is about ${num(tl, 2)} cm long, and both are equal.`;
      return { kids, say: `Radius ${rad0} cm, point ${dist} cm from the centre. ${kind}` };
    },
  },
  elevation: {
    subject: 'maths', about: 'Standing a distance from a tall tower and looking up: the angle of elevation sets how far away you are. The sliders change the angle and the tower height, and the drawing shows the right-angled triangle with its distance, height and angle. For angles of elevation, heights and distances, tangent ratios, and finding a distance from an angle.',
    sliders: [['angle', 'Angle of elevation (degrees)', 10, 60, 1, 35], ['height', 'Height of the tower (metres)', 10, 50, 1, 30]],
    draw(v) {
      const deg = v.angle, tall = v.height;
      const dist = tall / Math.tan((deg * Math.PI) / 180);
      const groundY = 252, leftX = 62;
      const scale = Math.min(430 / dist, 178 / tall);
      const footX = leftX + dist * scale, topY = groundY - tall * scale;
      const kids = [R(0, 0, W, H, '#f5fbff', { w: 0 })];
      kids.push(L(36, groundY, 572, groundY, INK, 4));
      // the tower
      kids.push(R(footX - 11, topY, 22, groundY - topY, '#c9d7f0', { w: 3, r: 3 }));
      kids.push(s('polygon', { points: `${footX},${topY - 16} ${footX - 12},${topY} ${footX + 12},${topY}`, fill: C.o, stroke: INK, 'stroke-width': 2 }));
      // the observer and the line of sight
      kids.push(CIRC(leftX, groundY - 10, 9, C.p, { w: 3 }));
      kids.push(L(leftX, groundY - 14, footX, topY, '#c2510e', 3, { 'stroke-dasharray': '9 7' }));
      kids.push(s('path', { d: `${arc(leftX, groundY - 14, 64, 0, deg)} L ${leftX} ${groundY - 14} Z`, fill: C.y, stroke: INK, 'stroke-width': 2, opacity: 0.55 }));
      kids.push(T(leftX + 78, groundY - 24, `${deg}°`, { z: 24, w: 700, f: INK, a: 'start' }));
      // the right angle at the tower's foot
      const m = 14;
      kids.push(s('polyline', { points: `${footX - m},${groundY} ${footX - m},${groundY - m} ${footX},${groundY - m}`, fill: 'none', stroke: '#3b6ea5', 'stroke-width': 2 }));
      kids.push(T((leftX + footX) / 2, groundY + 30, `${num(dist, 1)} m away`, { z: 22, w: 700, f: INK }));
      kids.push(T(footX + 20, (groundY + topY) / 2, `${tall} m`, { z: 22, w: 700, f: INK, a: 'start' }));
      const tan = num(Math.tan((deg * Math.PI) / 180), 2);
      return { kids, say: `Looking up at ${deg}° at a tower ${tall} m high, you stand ${num(dist, 1)} m from its foot. tan ${deg}° is about ${tan}, and distance = height / tan.` };
    },
  },
  hcf: {
    subject: 'maths', about: 'Euclid\'s division algorithm run on two numbers: each line divides, keeps the remainder and starts again, until the remainder is zero and the last divisor is the highest common factor. Two sliders choose the numbers. For highest common factor, HCF, Euclid\'s algorithm, the division algorithm for real numbers.',
    sliders: [['a', 'First number', 12, 200, 1, 84], ['b', 'Second number', 6, 120, 1, 36]],
    draw(v) {
      const big = Math.max(v.a, v.b), small = Math.min(v.a, v.b);
      const rows = [];
      let x = big, y = small, guard = 0;
      while (y > 0 && guard < 12) {
        const q = Math.floor(x / y), r = x - q * y;
        rows.push([x, q, y, r]);
        x = y;
        y = r;
        guard++;
      }
      const kids = [R(0, 0, W, H, '#fbfdff', { w: 0 })];
      kids.push(T(300, 40, `${big} and ${small}`, { z: 26, w: 700, f: INK }));
      const top = 74, lineH = 32;
      rows.slice(0, 7).forEach(([dividend, q, divisor, r], i) => {
        const y0 = top + i * lineH;
        const text = `${dividend} = ${divisor} × ${q}${r ? ` + ${r}` : ' + 0'}`;
        kids.push(T(40, y0, text, { z: 22, w: 600, f: r ? INK : '#0b6b52', a: 'start' }));
        if (!r) kids.push(T(560, y0, 'remainder 0', { z: 20, w: 600, f: '#0b6b52', a: 'end' }));
      });
      if (rows.length > 7) kids.push(T(40, top + 7 * lineH, '…', { z: 22, f: '#5a5170', a: 'start' }));
      const hcf = x;
      kids.push(T(300, 276, `highest common factor = ${hcf}`, { z: 24, w: 700, f: '#0b6b52' }));
      const steps = rows.map(([d, q, s, r]) => (r ? `${d} = ${s} × ${q} + ${r}` : `${d} = ${s} × ${q} + 0`)).slice(0, 5).join(', ');
      return { kids, say: `${big} and ${small}: ${steps}. The last divisor, ${hcf}, is the highest common factor.` };
    },
  },
  osmosis: {
    subject: 'science', about: 'Two compartments of water with different amounts of dissolved sugar, separated by a selectively permeable membrane. Water moves from the dilute (weaker) side to the concentrated (stronger) side until the rising level balances the pull; the sugar cannot cross. For osmosis, diffusion of water, selectively permeable membrane, cell membrane, cell wall, plasmolysis.',
    sliders: [['left', 'Sugar on the left (spoonfuls)', 0, 10, 1, 2], ['right', 'Sugar on the right (spoonfuls)', 0, 10, 1, 8], ['mins', 'Minutes left standing', 0, 10, 1, 0]],
    draw(v) {
      const x0 = 110, x1 = 292, x2 = 308, x3 = 490, top = 60, base = 250;
      const diff = v.right - v.left, shift = Math.max(-54, Math.min(54, diff * v.mins * 1.2));
      const yLeft = 145 + shift / 2, yRight = 145 - shift / 2;
      const parts = [R(0, 0, W, H, '#f6f9ff', { w: 0 })];
      parts.push(R(x0, top, x1 - x0, base - top, '#ffffff', { w: 3, r: 4 }), R(x2, top, x3 - x2, base - top, '#ffffff', { w: 3, r: 4 }));
      parts.push(R(x0 + 2, yLeft, x1 - x0 - 4, base - yLeft - 3, '#cfeaff', { w: 0 }), R(x2 + 2, yRight, x3 - x2 - 4, base - yRight - 3, '#cfeaff', { w: 0 }));
      parts.push(L(x0, yLeft, x1, yLeft, C.b, 4), L(x2, yRight, x3, yRight, C.b, 4));
      parts.push(L(300, top, 300, base, '#8338ec', 5, { 'stroke-dasharray': '13 9' }));
      parts.push(T(300, top - 16, 'selectively permeable membrane', { z: 13, f: '#6b45c8' }));
      const rnd = seeded(7), sugarDot = (x, y) => CIRC(x, y, 4.5, '#d99b2b', { w: 1, s: '#a97416' });
      const scatter = (n, xa, xb, ya, yb) => { const out = []; for (let i = 0; i < n; i++) out.push([xa + (xb - xa) * rnd(), ya + (yb - ya) * rnd()]); return out; };
      const leftSugar = scatter(v.left * 2, x0 + 16, x1 - 16, yLeft + 18, base - 20), rightSugar = scatter(v.right * 2, x2 + 16, x3 - 16, yRight + 18, base - 20);
      leftSugar.forEach(([x, y]) => parts.push(sugarDot(x, y))); rightSugar.forEach(([x, y]) => parts.push(sugarDot(x, y)));
      for (const [xa, xb, yTop, n] of [[x0, x1, yLeft, 7], [x2, x3, yRight, 7]]) for (let i = 0; i < n; i++) parts.push(CIRC(xa + 28 + (xb - xa - 56) * ((i * 0.37) % 1), Math.min(base - 26, yTop + 26 + i * 19), 3.2, '#5aa9e6', { w: 0, x: { opacity: 0.75 } }));
      const label = (x, w, text, col) => parts.push(T(x + w / 2, 82, text, { z: 14, w: 700, f: col }));
      const strong = diff > 0 ? 'right' : 'left', weak = diff > 0 ? 'left' : 'right';
      label(x0, x1 - x0, diff === 0 ? 'same strength' : `left side: ${strong === 'left' ? 'strong' : 'dilute'}`, diff === 0 ? '#6b5a8a' : strong === 'left' ? '#c2510e' : '#058a68');
      label(x2, x3 - x2, diff === 0 ? 'same strength' : `right side: ${strong === 'right' ? 'strong' : 'dilute'}`, diff === 0 ? '#6b5a8a' : strong === 'right' ? '#c2510e' : '#058a68');
      if (v.mins > 0 && diff !== 0) {
        const dir = diff > 0 ? 1 : -1, y1 = Math.min(200, Math.max(yLeft, yRight) + 42);
        for (let r = 0; r < 2; r++) {
          const yy = y1 + r * 27, tail = 300 - dir * 62, tip = 300 + dir * 62;
          parts.push(L(tail, yy, tip - dir * 12, yy, C.b, 5), s('polygon', { points: `${tip},${yy} ${tip - dir * 15},${yy - 9} ${tip - dir * 15},${yy + 9}`, fill: C.b }));
        }
      }
      parts.push(T(x3 - 4, 288, 'the sugar cannot cross', { a: 'end', z: 12, w: 600, f: '#a97416' }));
      const level = diff === 0 ? 'The two sides are equally strong, so water crosses each way equally and the levels stay the same.' : v.mins === 0 ? `The ${strong} side has more sugar in the same water, so water will cross towards it once time passes.` : `Water crosses from the dilute ${weak} side to the strong ${strong} side, so the ${strong} level rises and the ${weak} level falls. The sugar itself cannot cross.`;
      return { kids: parts, say: `${level} This movement of water across a selectively permeable membrane is osmosis.` };
    },
  },
  foilshape: {
    subject: 'science', about: 'One piece of aluminium foil shown in three shapes: a tight ball, a cup and a flat sheet. The weight stays the same, but the shape decides how much water it pushes aside: the ball pushes aside too little and sinks, while the cup and the flat sheet push aside more water than the foil weighs and float. For floating and sinking, changing an object\'s shape, why shape matters as well as weight, and making boats.',
    sliders: [['shape', 'Shape of the foil (0 ball, 1 cup, 2 flat sheet)', 0, 2, 1, 0]],
    draw(v) {
      const shp = v.shape, disp = [0.35, 1.35, 1.65][shp], mass = 1, floats = disp >= mass;
      const base = 258, wy = 150, kids = [R(0, 0, W, H, '#f6f9ff', { w: 0 }), R(80, 48, 440, 212, '#ffffff', { w: 4, r: 6 }), R(82, wy, 436, 158, '#a9def9', { w: 0 }), L(82, wy, 518, wy, C.b, 4)];
      const tall = shp === 0 ? 68 : shp === 1 ? 84 : 14, frac = floats ? Math.min(1, mass / disp) : 0;
      const topY = floats ? wy - tall * (1 - frac) : base - tall - 4, silver = '#d7dbe2', edge = '#8d95a3';
      if (shp === 0) kids.push(CIRC(300, topY + 34, 34, silver, { w: 3, s: edge }));
      else if (shp === 1) kids.push(s('polygon', { points: `235,${topY} 365,${topY} 345,${topY + 84} 255,${topY + 84}`, fill: silver, stroke: edge, 'stroke-width': 3 }), s('polygon', { points: `245,${topY + 8} 355,${topY + 8} 338,${topY + 76} 262,${topY + 76}`, fill: '#eef1f5', stroke: 'none' }));
      else kids.push(R(150, topY, 300, 14, silver, { w: 3, s: edge, r: 4 }));
      kids.push(T(300, 30, 'the same piece of foil every time', { z: 15, w: 600, f: '#6b5a8a' }));
      if (floats) { kids.push(T(300, topY - 14, 'floats: it pushes aside more water than it weighs', { z: 13, f: '#04795c' })); }
      else kids.push(T(300, topY - 16, 'sinks: it pushes aside too little water', { z: 14, f: '#c2510e' }));
      const name = ['a tight ball', 'a cup', 'a flat sheet'][shp];
      const why = shp === 0 ? 'squeezed into a tight ball it pushes aside only a little water, less than it weighs' : shp === 1 ? 'shaped into a cup it traps air and pushes aside more water than it weighs' : 'spread out flat it pushes aside a wide sheet of water, more than it weighs';
      return { kids, say: `${name[0].toUpperCase() + name.slice(1)}: ${why}, so it ${floats ? 'floats' : 'sinks'}. The weight never changed; the shape did.` };
    },
  },
  pressure: {
    subject: 'science', about: 'A block pressing on sand. The same push spread over a wide area hardly sinks, but squeezed into a small area it sinks deep. Pressure is force divided by area, in newtons per square centimetre. For pressure, force per unit area, thrust, why a nail or a knife cuts, snowshoes, liquid pressure growing with depth, atmospheric pressure.',
    sliders: [['force', 'Your push (newtons)', 20, 200, 20, 100], ['area', 'Area it presses on (square cm)', 1, 20, 1, 5]],
    draw(v) {
      const press = v.force / v.area, floor = 214, sink = Math.min(34, press / 7);
      const w = 26 + Math.sqrt(v.area) * 24, h = 46, x = 300 - w / 2, yTop = floor - h + sink;
      const arrow = (cx, top, len, colour, word) => [L(cx, top - len, cx, top - 6, colour, 6), s('polygon', { points: `${cx - 9},${top - len + 12} ${cx + 9},${top - len + 12} ${cx},${top - 2}`, fill: colour }), T(cx, top - len - 8, word, { z: 13, f: colour })];
      const kids = [
        R(0, floor, W, 90, '#f4e6c8', { w: 0 }),
        L(0, floor, W, floor, '#8a6d3b', 3),
        R(x, yTop, w, h, C.o, { r: 7, w: 3 }),
        T(300, yTop + h / 2 + 6, `${v.force} N`, { z: 18, f: '#fff', w: 700 }),
        ...arrow(300, yTop, 26 + v.force / 8, C.p, `${v.force} N`),
        T(300, 40, press >= 60 ? 'It presses hard, so it sinks deep' : press >= 15 ? 'It presses firmly and sinks a little' : 'It is spread out, so it hardly sinks', { z: 22, f: press >= 60 ? '#058a68' : press >= 15 ? '#c2510e' : '#6b5a8a' }),
        T(300, 70, `Pressure = ${v.force} N ÷ ${v.area} cm² = ${num(press, 1)} N per cm²`, { z: 16, w: 600 }),
        T(300, 300, v.area >= 10 ? `The same ${v.force} N over ${v.area} cm² is only ${num(press, 1)} N per cm²: a wide area shares the push.` : `The same ${v.force} N in ${v.area} cm² is ${num(press, 1)} N per cm²: a small area presses harder.`, { z: 15, w: 600, f: '#6b5a8a' }),
        T(x + w / 2, floor + 22, `${v.area} cm² touching the sand`, { z: 14, f: '#6b5a8a' }),
      ];
      const say = press >= 60
        ? `You are pushing with ${v.force} newtons on ${v.area} square centimetres, so the pressure is ${num(press, 1)} newtons per square centimetre. A small area makes the same push press much harder, which is why a nail goes in and a flat hand does not.`
        : press >= 15
          ? `The pressure is ${v.force} divided by ${v.area}, about ${num(press, 1)} newtons per square centimetre. It sinks a little, and the sand holds it up.`
          : `The same ${v.force} newtons is spread over ${v.area} square centimetres, so the pressure is only ${num(press, 1)} newtons per square centimetre. A wide area shares the push out, so it hardly sinks.`;
      return { kids, say };
    },
  },
  interest: {
    subject: 'social', about: 'A loan shown as bars year by year: yellow is simple interest on the money borrowed, orange is compound interest, which also charges interest on last year\u2019s interest. For credit, loans, bank deposits, interest rates, simple and compound interest, debt traps.',
    sliders: [['P', 'Money borrowed (rupees)', 1000, 10000, 1000, 5000], ['rate', 'Interest each year (%)', 5, 30, 1, 12], ['years', 'Years before you pay back', 1, 10, 1, 5]],
    draw(v) {
      const base = 238, top = 78, slot = 48, bw = 16;
      const rupees = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
      const marks = [];
      for (let y = 1; y <= v.years; y++) {
        marks.push({ y, flat: v.P * (1 + (v.rate * y) / 100), owed: v.P * Math.pow(1 + v.rate / 100, y) });
      }
      const last = marks[marks.length - 1], maxOwed = last.owed, sc = (base - top) / maxOwed;
      const startX = W / 2 - (v.years * slot) / 2 + (slot - bw * 2 - 4) / 2, kids = [
        T(300, 32, `A loan of ${rupees(v.P)} at ${v.rate}% a year`, { z: 18 }),
        R(120, 42, 14, 14, C.y, { w: 2 }), T(140, 55, 'simple interest', { z: 15, w: 600, a: 'start' }),
        R(320, 42, 14, 14, C.o, { w: 2 }), T(340, 55, 'interest on interest', { z: 15, w: 600, a: 'start' }),
        L(40, base, 560, base, INK, 3),
      ];
      kids.push(L(40, base - v.P * sc, 560, base - v.P * sc, '#8a6d3b', 1.5, { 'stroke-dasharray': '6 6' }));
      for (const m of marks) {
        const x = startX + (m.y - 1) * slot, hFlat = m.flat * sc, hOwed = m.owed * sc;
        kids.push(R(x, base - hFlat, bw, hFlat, C.y, { w: 2 }));
        kids.push(R(x + bw + 4, base - hOwed, bw, hOwed, C.o, { w: 2 }));
        kids.push(T(x + bw + 3, base + 19, m.y, { z: 14, w: 600, f: '#6b5a8a' }));
      }
      kids.push(T(300, base + 42, v.years === 1 ? '1 year' : `${v.years} years`, { z: 15, w: 600, f: '#6b5a8a' }));
      // the borrowed amount, drawn last on its own light strip so the bars never hide it when a loan runs for many years
      kids.push(R(440, base - v.P * sc - 26, 120, 22, '#fffdf7', { w: 0, x: { opacity: 0.9 } }));
      kids.push(T(556, base - v.P * sc - 8, 'money borrowed', { z: 15, w: 600, a: 'end', f: '#8a6d3b' }));
      const extra = last.owed - v.P, simpleExtra = last.flat - v.P;
      return { kids, say: `You borrow ${rupees(v.P)} at ${v.rate}% a year. After ${v.years} year${v.years === 1 ? '' : 's'} you owe ${rupees(last.owed)}: that is ${rupees(extra)} more than you borrowed. With simple interest you would owe ${rupees(last.flat)}, only ${rupees(simpleExtra)} extra. Compound interest charges interest on last year\u2019s interest too, so the debt grows faster every year${v.rate >= 20 ? '. At a rate as high as this, a small loan can become a debt trap' : ''}.` };
    },
  },
  income: {
    subject: 'social', about: 'Two countries with the same average income but very different shares: ten families in each, and moving the richest family in one shows how an average can hide inequality. For average and per capita income, how income is distributed, and why a country with a fairer share is preferred.',
    sliders: [['rich', 'Richest family in Country B (rupees thousand a year)', 5, 50, 1, 32]],
    draw(v) {
      const base = 236, top = 84, barW = 16, gap = 6, unit = (base - top) / 50;
      const rest = (50 - v.rich) / 9;
      const kids = [
        T(300, 30, 'Two countries, ten families each', { z: 18 }),
        L(40, base, 560, base, INK, 3),
        L(40, base - 5 * unit, 560, base - 5 * unit, '#8a6d3b', 2, { 'stroke-dasharray': '6 6' }),
        T(556, base - 5 * unit - 7, 'average: 5 thousand', { z: 12, w: 600, a: 'end', f: '#8a6d3b' }),
        T(140, 58, 'Country A', { z: 16 }),
        T(440, 58, 'Country B', { z: 16 }),
        T(40, 72, 'rupees in thousands a year', { z: 11, w: 600, a: 'start', f: '#6b5a8a' }),
      ];
      for (let m = 0; m <= 50; m += 10) kids.push(T(34, base - m * unit + 4, m, { a: 'end', z: 11, w: 600, f: '#6b5a8a' }));
      const bars = (x0, vals, colour, label) => {
        vals.forEach((inc, i) => {
          const h = Math.max(1, inc * unit), x = x0 + i * (barW + gap);
          kids.push(R(x, base - h, barW, h, colour, { w: 2 }));
        });
        kids.push(T(x0 + (vals.length * (barW + gap) - gap) / 2, base + 20, label, { z: 12, w: 600, f: '#6b5a8a' }));
      };
      bars(50, Array(10).fill(5), C.b, 'every family: 5');
      bars(350, [v.rich, ...Array(9).fill(rest)], C.o, 'one family much richer');
      const poor = Math.round(rest * 10) / 10;
      return { kids, say: `Both countries have the same average income: 5 thousand rupees a year for each family. In Country A every family earns 5 thousand. In Country B the richest family earns ${v.rich} thousand and the other nine earn ${num(poor, 1)} thousand each. The average is the same, but the money is shared very differently, so a country where income is distributed more equally is the better place to live.` };
    },
  },
  division: {
    subject: 'maths', about: 'Sweets shared into equal groups. One slider sets how many sweets there are and the other sets how many go in each group; the picture shows the whole groups and the sweets left over, so the child sees quotient and remainder. For division, sharing equally, equal groups, remainders, division facts and division word problems.',
    sliders: [['total', 'Sweets to share', 1, 48, 1, 13], ['size', 'Sweets in each group', 2, 8, 1, 4]],
    draw(v) {
      const total = v.total, size = v.size, q = Math.floor(total / size), r = total % size;
      const rows = Math.ceil(total / size), cell = Math.min(44, 460 / size, 200 / rows), dot = cell * 0.3;
      const x0 = 300 - (size * cell) / 2 + cell / 2, y0 = 62 + cell / 2;
      const kids = [R(0, 0, W, H, '#f7f3ff', { w: 0 })];
      for (let row = 0; row < rows; row++) kids.push(R(x0 - cell / 2 + 2, y0 + row * cell - cell / 2 + 1, size * cell - 4, cell - 2, row < q ? '#e2f6ee' : '#ffeadf', { w: 0, r: 10 }));
      for (let i = 0; i < total; i++) {
        const row = Math.floor(i / size), col = i % size, leftOver = i >= q * size;
        kids.push(CIRC(x0 + col * cell, y0 + row * cell, dot, leftOver ? C.o : row % 2 ? C.g : C.b, { w: 1.4 }));
      }
      kids.push(T(300, 28, `${total} ÷ ${size} = ${q}${r ? ` remainder ${r}` : ''}`, { z: 24 }));
      kids.push(T(300, 288, r ? `${q} full group${q === 1 ? '' : 's'} of ${size}, and ${r} left over` : `${q} full group${q === 1 ? '' : 's'} of ${size}, with nothing left over`, { z: 15, w: 600, f: r ? '#c2510e' : '#058a68' }));
      const packed = q * size;
      return { kids, say: r
        ? `You share ${total} sweets into groups of ${size}. You make ${q} full group${q === 1 ? '' : 's'}, using ${packed} sweets, and ${r} ${r === 1 ? 'sweet is' : 'sweets are'} left over. ${size} × ${q} = ${packed}, and ${total} − ${packed} = ${r}, so the remainder is ${r}, which is smaller than ${size}.`
        : `You share ${total} sweets into groups of ${size}. You make ${q} full group${q === 1 ? '' : 's'} and nothing is left over, because ${size} × ${q} = ${total}.` };
    },
  },
  peas: {
    subject: 'science', about: 'A cross between two pea plants, drawn as a Punnett square: each parent gives one copy of the tall gene T or the short gene t, and the four boxes show the children. T is dominant over t, so a Tt plant looks tall but can still pass on shortness. For heredity, inheritance, Mendel, pea plants, dominant and recessive traits, F1 and F2, the 3:1 ratio.',
    sliders: [['g1', 'Parent 1 genes (0 TT, 1 Tt, 2 tt)', 0, 2, 1, 0], ['g2', 'Parent 2 genes (0 TT, 1 Tt, 2 tt)', 0, 2, 1, 0]],
    draw(v) {
      const copies = [['T', 'T'], ['T', 't'], ['t', 't']], names = ['TT', 'Tt', 'tt'];
      const left = copies[v.g1], right = copies[v.g2], boxes = [];
      for (const a of left) for (const b of right) boxes.push([a, b].sort().join(''));
      const tall = boxes.filter((x) => x.charAt(0) === 'T' || x.charAt(1) === 'T').length;
      const short = 4 - tall;
      const kids = [R(0, 0, 600, 300, '#f7fdf5', { w: 0 })];
      const plant = (cx, base, isTall, size) => {
        const stem = isTall ? size : size * 0.55;
        return [
          L(cx, base, cx, base - stem, '#3f7d3a', 4),
          s('ellipse', { cx: cx - 9, cy: base - stem + 7, rx: 9, ry: 4, fill: '#7bc96f', transform: `rotate(-28 ${cx - 9} ${base - stem + 7})` }),
          s('ellipse', { cx: cx + 9, cy: base - stem + 13, rx: 9, ry: 4, fill: '#7bc96f', transform: `rotate(28 ${cx + 9} ${base - stem + 13})` }),
          CIRC(cx, base - stem - 4, 4, isTall ? '#ffd166' : '#f4a3c8', { w: 1.2 }),
        ];
      };
      const x0 = 150, y0 = 80, cw = 96, ch = 62;
      kids.push(T(300, 28, `Parent 1 ${names[v.g1]} × Parent 2 ${names[v.g2]}`, { z: 21 }));
      kids.push(T(x0 + cw, 56, 'Parent 2 gives', { z: 12, w: 600, f: '#6b5a8a' }));
      kids.push(T(28, 66, 'Parent 1 gives', { z: 12, w: 600, f: '#6b5a8a', a: 'start' }));
      right.forEach((al, j) => kids.push(T(x0 + j * cw + cw / 2, 76, al, { z: 20, f: '#6b4aa8' })));
      left.forEach((al, i) => kids.push(T(x0 - 24, y0 + i * ch + ch / 2 + 7, al, { z: 20, f: '#6b4aa8' })));
      boxes.forEach((g, k) => {
        const i = Math.floor(k / 2), j = k % 2, x = x0 + j * cw, y = y0 + i * ch;
        const isTall = g.charAt(0) === 'T' || g.charAt(1) === 'T';
        kids.push(R(x, y, cw, ch, isTall ? '#e4f7ee' : '#ffe9e2', { w: 2, r: 10 }));
        kids.push(T(x + cw / 2 - 16, y + ch / 2 + 8, g, { z: 21, f: isTall ? '#058a68' : '#c2510e' }));
        kids.push(...plant(x + cw - 18, y + ch - 8, isTall, 26));
      });
      kids.push(T(372, 96, `${tall} tall`, { z: 24, a: 'start', f: '#058a68' }));
      kids.push(T(372, 128, `${short} short`, { z: 24, a: 'start', f: short ? '#c2510e' : '#8a7aa8' }));
      kids.push(T(372, 166, 'T is the tall gene.', { z: 13, w: 600, a: 'start' }));
      kids.push(T(372, 186, 't is the short gene.', { z: 13, w: 600, a: 'start' }));
      kids.push(T(372, 208, 'T hides t, so Tt looks tall.', { z: 13, w: 600, a: 'start', f: '#058a68' }));
      kids.push(T(300, 276, 'Each child gets one letter from each parent, so it has two copies.', { z: 13, w: 600, f: '#6b5a8a' }));
      const allCarriers = boxes.every((x) => x === 'Tt');
      const result = tall === 4 ? 'All four have a T, so all four look tall, and none are short.' : tall === 0 ? 'None of the four has a T, so all four are short.' : `${tall} of the four have a T, so ${tall} look tall, and ${short === 1 ? 'one is short' : `${short} are short`}.`;
      return { kids, say: `Parent 1 is ${names[v.g1]} and Parent 2 is ${names[v.g2]}. The four boxes show the children they can make. ${result}${allCarriers ? ' Every child is Tt: tall, but it still carries the short gene and can pass it on.' : ' T hides t, so TT and Tt both look tall; only tt is short.'}` };
    },
  },
  spelling: {
    subject: 'english', about: 'The changes a word goes through when it is made plural or given -ing: add -s, add -es after s, x, ch or sh, turn a consonant+y into -ies, change some f endings to v, double the last letter before -ing, and drop the silent e. For plurals, verb forms, and spelling rules.',
    sliders: [['w', 'Pick a word', 0, 11, 1, 0]],
    draw(v) {
      const rows = [
        ['car', 'cars', 'most words: just add -s', 'One car, two cars. The -s is enough.'],
        ['bus', 'buses', 'after s, x, ch or sh: add -es', 'Say "buss". You cannot hear the ending, so -es adds a beat.'],
        ['box', 'boxes', 'after s, x, ch or sh: add -es', 'The x already hisses, so the ending needs a beat of its own.'],
        ['baby', 'babies', 'a consonant before y: change y to i, add -es', 'The y becomes i, then -es is added.'],
        ['boy', 'boys', 'a vowel before y: just add -s', 'A vowel in front of the y needs no help.'],
        ['leaf', 'leaves', 'some words ending in f: change f to v, add -es', 'The f turns into v and -es follows.'],
        ['run', 'running', 'before -ing: double the last letter', 'Running keeps the u short; "runing" would sound like "rooning".'],
        ['come', 'coming', 'before -ing: drop the silent e', 'The e is doing no work, so it leaves before -ing.'],
        ['walk', 'walked', 'most words: just add -ed for the past', 'The -ed says the action is over.'],
        ['stop', 'stopped', 'after one short vowel and a consonant: double it, add -ed', 'Stopping doubles the p so the o stays short.'],
        ['carry', 'carried', 'a consonant before y: change y to i, add -ed', 'The y becomes i, then -ed is added.'],
        ['play', 'played', 'a vowel before y: just add -ed', 'The y keeps its place after a vowel.'],
      ];
      const [base, out, rule, why] = rows[v.w];
      const card = (x, word, fill, colour) => [R(x, 62, 190, 78, fill, { w: 3, r: 12 }), T(x + 95, 112, word, { z: 30, f: colour })];
      const kids = [
        ...card(40, base, '#fdf6ff', '#3a2560'),
        L(240, 101, 320, 101, INK, 5),
        s('polygon', { points: '330,101 314,91 314,111', fill: INK }),
        ...card(350, out, '#e4f7ee', '#058a68'),
        T(300, 178, 'one', { z: 16, f: '#6b5a8a' }),
        T(445, 178, 'more than one, or -ing', { z: 16, f: '#6b5a8a', w: 600 }),
        T(40, 222, rule, { z: 20, a: 'start', f: '#c2510e' }),
        T(40, 254, why, { z: 16, a: 'start', w: 600, f: '#6b5a8a' }),
      ];
      return { kids, say: `${base} becomes ${out}. ${rule}. ${why}` };
    },
  },
  wordbuild: {
    subject: 'english', about: 'Prefixes that change a word (un-, re-, dis-, pre-, mis-) and contractions that squeeze two words into one with an apostrophe (do not -> don\'t, I am -> I\'m, will not -> won\'t). For prefixes, contractions, apostrophes and word building.',
    sliders: [['w', 'Pick a pair of words', 0, 9, 1, 0]],
    draw(v) {
      const rows = [
        ['un', 'happy', 'unhappy', 'not happy', 'un- means not. It turns a word into its opposite.'],
        ['re', 'build', 'rebuild', 'build again', 're- means again.'],
        ['dis', 'agree', 'disagree', 'not agree', 'dis- means not, or the opposite of.'],
        ['pre', 'pay', 'prepay', 'pay before', 'pre- means before.'],
        ['mis', 'spell', 'misspell', 'spell wrongly', 'mis- means wrongly.'],
        ['do not', "don't", "don't", 'two words joined', 'The o disappears and an apostrophe takes its place.'],
        ['I am', "I'm", "I'm", 'two words joined', 'The a disappears, and the apostrophe marks the gap.'],
        ['can not', "can't", "can't", 'two words joined', 'Two n\'s become one, and the apostrophe marks the gap.'],
        ['will not', "won't", "won't", 'two words joined', 'Will not is the odd one: the vowels change as well.'],
        ['they are', "they're", "they're", 'two words joined', 'The a disappears and the apostrophe stands in for it.'],
      ];
      const [left, right, out, meaning, rule] = rows[v.w];
      const isContraction = left.includes(' ');
      const card = (x, word, fill, colour) => [R(x, 58, 200, 74, fill, { w: 3, r: 12 }), T(x + 100, 106, word, { z: 30, f: colour })];
      const kids = [
        ...card(30, isContraction ? left : right, '#fdf6ff', '#3a2560'),
        L(240, 95, 310, 95, INK, 5),
        s('polygon', { points: '320,95 304,85 304,105', fill: INK }),
        ...card(340, isContraction ? out : `${left}${right}`, '#e4f7ee', '#058a68'),
        T(130, 156, isContraction ? 'two words' : 'the prefix, then the word', { z: 13, f: '#6b5a8a' }),
        T(440, 156, isContraction ? 'one word, with an apostrophe' : meaning, { z: 13, f: '#6b5a8a' }),
        T(30, 200, rule, { z: 20, a: 'start', w: 620, f: '#c2510e' }),
        T(30, 238, isContraction ? `It means the same as "${left}".` : `"${left}${right}" means ${meaning}.`, { z: 13, a: 'start', w: 620, f: '#6b5a8a' }),
      ];
      const say = isContraction
        ? `${left} becomes ${out}, one word instead of two. ${rule}`
        : `${left}${right} means ${meaning}. ${rule}`;
      return { kids, say };
    },
  },
  monsoon: {
    subject: 'social', about: 'The yearly monsoon over India, month by month. In summer the land heats faster than the sea, low pressure forms over the land and moist winds blow in from the sea and bring rain. In winter the sea stays warmer, the pressure is low over the sea and cool, dry winds blow from the land out to sea. For monsoons, seasonal reversal of winds, summer and winter monsoon, unequal heating of land and sea, rainfall, floods and droughts.',
    sliders: [['month', 'Month of the year', 1, 12, 1, 3]],
    draw(v) {
      const m = v.month, names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const summer = m >= 5 && m <= 9, winter = m === 12 || m <= 2;
      const arrow = (x1, y1, x2, y2, col) => { const a = Math.atan2(y2 - y1, x2 - x1); return [L(x1, y1, x2, y2, col, 6), s('polygon', { points: `${x2},${y2} ${x2 - 16 * Math.cos(a - 0.45)},${y2 - 16 * Math.sin(a - 0.45)} ${x2 - 16 * Math.cos(a + 0.45)},${y2 - 16 * Math.sin(a + 0.45)}`, fill: col })]; };
      const badge = (x, y, word, col) => [R(x - 42, y - 20, 84, 40, col, { r: 10, w: 2.5 }), T(x, y + 6, word, { z: 15, f: '#fff' })];
      const kids = [R(0, 0, W, H, '#eaf6ff', { w: 0 }), R(0, 150, 300, 150, '#8ecae6', { w: 0 }), s('path', { d: 'M 300 150 L 600 150 L 600 300 L 300 300 Z', fill: '#e8dcc0', stroke: INK, 'stroke-width': 2 })];
      for (let k = 0; k < 4; k++) kids.push(s('path', { d: `M 20 ${176 + k * 26} q 18 -8 36 0 t 36 0`, stroke: '#5aa9cc', 'stroke-width': 2.5, fill: 'none' }));
      kids.push(s('path', { d: 'M 330 150 L 380 116 L 426 150 Z', fill: '#cbb98a', stroke: INK, 'stroke-width': 2 }), s('path', { d: 'M 500 150 L 548 126 L 590 150 Z', fill: '#cbb98a', stroke: INK, 'stroke-width': 2 }));
      kids.push(T(110, 286, 'SEA', { a: 'start', z: 15, f: '#0b4a6f' }), T(470, 286, 'LAND', { a: 'end', z: 15, f: '#5b4a2a' }));
      if (summer) {
        kids.push(...badge(110, 60, 'HIGH', '#3a86ff'), ...badge(470, 60, 'LOW', '#c0392b'));
        kids.push(...arrow(110, 190, 390, 190, '#1f63d9'));
        kids.push(CIRC(452, 126, 26, '#ffffff', { s: '#9fb8cc', w: 2.5 }), CIRC(490, 118, 32, '#ffffff', { s: '#9fb8cc', w: 2.5 }), CIRC(526, 128, 24, '#ffffff', { s: '#9fb8cc', w: 2.5 }), R(442, 140, 96, 16, '#ffffff', { w: 0 }));
        for (let k = 0; k < 4; k++) kids.push(L(462 + k * 22, 154, 458 + k * 22, 174, '#1f63d9', 3));
        kids.push(T(300, 222, 'moist wind from the sea', { z: 14, w: 600, f: '#1f63d9' }));
      } else if (winter) {
        kids.push(...badge(110, 60, 'LOW', '#c0392b'), ...badge(470, 60, 'HIGH', '#3a86ff'));
        kids.push(...arrow(410, 190, 130, 190, '#c2510e'));
        kids.push(T(300, 222, 'cool, dry wind from the land', { z: 14, w: 600, f: '#c2510e' }));
      } else {
        kids.push(T(300, 90, 'winds are light and changing', { z: 15, w: 600, f: '#6b5a8a' }));
        kids.push(...arrow(150, 180, 260, 180, '#9b8db8'), ...arrow(460, 202, 350, 202, '#9b8db8'));
      }
      const phase = summer ? 'summer monsoon' : winter ? 'winter monsoon' : 'between the monsoons';
      kids.push(T(16, 30, `${names[m - 1]}: ${phase}`, { a: 'start', z: 18 }));
      const say = summer
        ? `In ${names[m - 1]} the land is hotter than the sea, so the air over the land rises and low pressure forms there. Moist winds blow from the sea towards the land and bring rain.`
        : winter
          ? `In ${names[m - 1]} the sea is warmer than the land, so the air rises over the sea and pressure is low there. Cool, dry winds blow from the land out to sea, so there is little rain.`
          : `In ${names[m - 1]} the land and the sea are close in temperature, so the winds are light and are changing direction. This is between the two monsoons.`;
      return { kids, say };
    },
  },
  wordorder: {
    subject: 'english', about: 'Word order in an English sentence: who, then what they do, then where or when. Swapping the subject and the doer changes the meaning. For sentences, word order, grammar.',
    sliders: [['w', 'Pick a sentence', 0, 7, 1, 0]],
    draw(v) {
      const rows = [
        ['The dog', 'chased', 'the cat', 'Who does it comes first: the dog chases, the cat is chased.'],
        ['The cat', 'chased', 'the dog', 'Swap them and the meaning swaps too.'],
        ['Riya', 'reads', 'a book', 'The person, then the action, then the thing.'],
        ['The bird', 'sings', 'in the tree', 'A place can come last.'],
        ['We', 'eat', 'mangoes', 'The doer, the doing, the thing done.'],
        ['The sun', 'shines', 'in the sky', 'English sentences usually go this way round.'],
        ['Aman', 'kicked', 'the ball', 'Subject, verb, object: the usual order.'],
        ['The cow', 'grazes', 'in the field', 'Even a long sentence keeps this order.'],
      ];
      const [who, what, rest, why] = rows[v.w];
      const box = (x, text, fill, colour, z) => [R(x, 70, 160, 64, fill, { w: 3, r: 12 }), T(x + 80, 112, text, { z, f: colour })];
      const kids = [
        ...box(30, who, '#fdf6ff', '#3a2560', 28),
        ...box(210, what, '#fff5e6', '#c2510e', 28),
        ...box(390, rest, '#e4f7ee', '#058a68', 28),
        T(110, 158, 'who', { z: 13, f: '#6b5a8a' }),
        T(290, 158, 'does what', { z: 13, f: '#6b5a8a' }),
        T(470, 158, rest.startsWith('the ') ? 'the thing done' : 'where it happens', { z: 13, f: '#6b5a8a' }),
        T(30, 210, 'Subject, then verb, then the rest.', { z: 18, a: 'start', f: '#c2510e' }),
        T(30, 242, why, { z: 13, a: 'start', w: 600, f: '#6b5a8a' }),
      ];
      return { kids, say: `${who} ${what} ${rest}. ${why}` };
    },
  },
  opposites: {
    subject: 'english', about: 'Pairs of words that mean the opposite, and the prepositions in, on, under and behind that say where something is. For opposites, prepositions, describing words.',
    sliders: [['w', 'Pick a pair', 0, 5, 1, 1]],
    draw(v) {
      const rows = [
        ['big', 'small', 'A big elephant, a small mouse.', null],
        ['hot', 'cold', 'Hot tea, cold ice.', null],
        ['fast', 'slow', 'A fast train, a slow bullock cart.', null],
        ['light', 'heavy', 'A light feather, a heavy stone.', null],
        ['in', 'out', 'The cat is in the box, then out of it.', 'in'],
        ['on', 'under', 'The cat sits on the table, then under it.', 'on'],
      ];
      const [a, b, line, where] = rows[v.w];
      const kids = [];
      const card = (x, word, fill, colour) => [R(x, 60, 200, 70, fill, { w: 3, r: 12 }), T(x + 100, 106, word, { z: 28, f: colour })];
      kids.push(...card(30, a, '#fdf6ff', '#3a2560'));
      kids.push(T(230, 106, '↔', { z: 24 }));
      kids.push(...card(280, b, '#e4f7ee', '#058a68'));
      if (where) {
        // a table drawn in perspective, with the object above it or beneath it, so in/on/under can be seen
        const onTop = where === 'on';
        kids.push(R(120, 210, 200, 16, '#c99a5b', { w: 2, r: 4 }));
        kids.push(T(220, 186, onTop ? 'on' : 'under', { z: 18, f: '#c2510e' }));
        kids.push(onTop ? R(190, 178, 60, 32, '#8a5a2b', { w: 2, r: 6 }) : R(140, 232, 60, 32, '#8a5a2b', { w: 2, r: 6 }));
      }
      kids.push(T(30, where ? 262 : 190, line, { z: 15, a: 'start', w: 620, f: '#6b5a8a' }));
      return { kids, say: `${a} and ${b} are opposites. ${line}` };
    },
  },
  loom: {
    subject: 'science', about: 'A loom that weaves cloth: vertical warp threads and rows of horizontal weft thread crossing over one thread and under the next. For weaving, the warp and weft, handloom cloth, plain and basket weave, and how thread becomes fabric.',
    sliders: [['row', 'Rows of thread woven', 0, 8, 1, 0], ['over', 'Threads crossing: one or two at a time', 1, 2, 1, 1]],
    draw(v) {
      const woven = v.row, group = v.over, cols = 8, rows = 8, cw = 40, rh = 24, x0 = 140, y0 = 64;
      const kids = [R(0, 0, W, H, '#fbfdff', { w: 0 })];
      kids.push(T(16, 24, 'Warp: threads up and down', { z: 14, a: 'start', f: '#1d4ed8' }));
      kids.push(T(16, 46, 'Weft: thread side to side', { z: 14, a: 'start', f: '#c2510e' }));
      kids.push(R(x0 - 8, y0 - 8, cols * cw + 16, rows * rh + 16, '#f2ecff', { w: 2, s: '#d9cfef', r: 8 }));
      for (let c = 0; c < cols; c++) { const x = x0 + (c + 0.5) * cw; kids.push(L(x, y0, x, y0 + rows * rh, '#3a86ff', 7)); }
      const overCell = (r, c) => (group === 2 ? (Math.floor(r / 2) + Math.floor(c / 2)) % 2 === 0 : (r + c) % 2 === 0);
      for (let r = 0; r < woven; r++) {
        const y = y0 + (r + 0.5) * rh;
        for (let c = 0; c < cols; c++) {
          if (!overCell(r, c)) continue;
          const left = x0 + c * cw - (c === 0 ? 0 : 3), right = x0 + (c + 1) * cw + (c === cols - 1 ? 0 : 3);
          kids.push(L(left, y, right, y, '#ff7a59', 9));
        }
      }
      // a small shuttle and an arrow show where the next row of weft will go
      if (woven < rows) {
        const ny = y0 + (woven + 0.5) * rh;
        kids.push(R(x0 - 34, ny - 7, 20, 14, '#ff7a59', { w: 2, r: 4 }));
        kids.push(s('path', { d: `M ${x0 - 10} ${ny} l -8 -5 l 0 10 Z`, fill: '#ff7a59' }));
        kids.push(T(x0 - 38, ny + 4, 'shuttle', { z: 11, a: 'end', f: '#c2510e' }));
      }
      kids.push(T(16, y0 + rows * rh + 34, `${woven} of ${rows} rows woven`, { z: 15, a: 'start', f: '#2a1a4a' }));
      const cloth = group === 2 ? 'Two threads cross together, so the marks are bigger: this is a basket weave.' : 'Each row goes over one thread and under the next, so the threads lock together: this is plain weave.';
      let say = `The up-and-down threads are the warp. The side-to-side thread is the weft. ${cloth}`;
      if (woven === 0) say = 'The up-and-down threads are the warp. The side-to-side thread is the weft. Slide to send the weft across: over one thread, under the next.';
      else if (woven === rows) say = `All ${rows} rows are woven. The warp and the weft have locked together into one piece of cloth. ${cloth}`;
      else say = `${woven} of ${rows} rows are woven. ${cloth}`;
      return { kids, say };
    },
  },
  river: {
    subject: 'science', about: 'A river from its source in the hills to the sea: a small stream grows as tributaries join, flows past fields and forests, can be blocked by a dam and its reservoir, and splits into a delta at the sea. For the journey of a river, tributaries, dams and deltas.',
    sliders: [['stage', 'How far the river has travelled', 1, 5, 1, 1]],
    draw(v) {
      const kids = [R(0, 0, W, H, '#dff3ff', { w: 0 })];
      kids.push(s('polygon', { points: '10,226 120,74 230,226', fill: '#9dbfa5', stroke: INK, 'stroke-width': 2 }));
      kids.push(T(146, 100, 'hills', { z: 16, a: 'start', f: '#3d5a44' }));
      kids.push(R(492, 206, 108, 94, '#a9def9', { w: 0 }));
      kids.push(T(548, 250, 'sea', { z: 16, a: 'end', f: '#1d4ed8' }));
      kids.push(s('path', { d: 'M 118 150 Q 230 168 320 182 T 500 224', fill: 'none', stroke: '#0077b6', 'stroke-width': 7 + v.stage * 1.4, 'stroke-linecap': 'round' }));
      if (v.stage >= 2) {
        kids.push(L(214, 112, 268, 172, '#4cc9f0', 6, { 'stroke-linecap': 'round' }));
        kids.push(L(300, 240, 268, 172, '#4cc9f0', 6, { 'stroke-linecap': 'round' }));
        kids.push(T(268, 116, 'tributary', { z: 15, f: '#0077b6' }));
      }
      if (v.stage >= 3) {
        for (let i = 0; i < 4; i++) kids.push(R(300 + i * 26, 208 + (i % 2) * 8, 14, 16, '#7ac74f', { w: 1, r: 2 }));
        kids.push(T(352, 252, 'fields and forests', { z: 15, f: '#2f6b2f' }));
      }
      if (v.stage === 4) {
        kids.push(s('ellipse', { cx: 392, cy: 176, rx: 34, ry: 15, fill: '#a9def9', stroke: INK, 'stroke-width': 2 }));
        kids.push(R(408, 156, 14, 58, '#8d99ae', { w: 2, r: 2 }));
        kids.push(T(392, 148, 'reservoir', { z: 15, f: '#0077b6' }));
        kids.push(T(415, 236, 'dam', { z: 15, f: '#3d3d3d' }));
      }
      if (v.stage === 5) {
        for (const dy of [-14, 0, 14]) kids.push(L(470, 214, 516, 224 + dy, '#0077b6', 4));
        kids.push(CIRC(506, 198, 5, '#2f6b2f', { w: 1 }), CIRC(520, 210, 5, '#2f6b2f', { w: 1 }));
        kids.push(T(492, 176, 'delta and mangroves', { z: 15, f: '#2f6b2f', a: 'middle' }));
      }
      const at = [[118, 150], [268, 172], [352, 194], [392, 200], [498, 222]][v.stage - 1];
      kids.push(CIRC(at[0], at[1], 9, '#ff7a59', { w: 3 }));
      kids.push(T(16, 274, `${v.stage} of 5: ${['source', 'tributaries join', 'fields and forests', 'dam and reservoir', 'delta and sea'][v.stage - 1]}`, { z: 14, a: 'start', f: '#2a1a4a' }));
      const say = [
        'High in the hills the river begins as a small stream, fed by rain.',
        'Small streams join the river along the way. These tributaries make it wider and stronger.',
        'The river flows through fields and forests, giving water to plants, animals and people.',
        'A dam is a giant wall across the river. It stores water in a reservoir for drinking, crops and electricity.',
        'Near the sea the river splits into many small streams and makes a delta, where mangroves grow.',
      ][v.stage - 1];
      return { kids, say };
    },
  },
  lifecycle: {
    subject: 'science', about: 'The life cycle of a frog, a mosquito, a silk moth or a bean plant, one stage at a time: egg, young, pupa or flower, then the adult that lays eggs or makes seeds. For life cycles, eggs and young, tadpoles, larvae and caterpillars, cocoons, seeds and germination, and how some young look nothing like the adult.',
    sliders: [['creature', 'Choose the living thing', 0, 3, 1, 0], ['stage', 'Move through its life', 0, 3, 1, 0]],
    dynamicSliders: (p) => [['creature', 'Choose the living thing', 0, 3, 1, (p && p.creature) || 0], ['stage', 'Move through its life', 0, 3, 1, 0]],
    draw(v) {
      const names = ['Frog', 'Mosquito', 'Silk moth', 'Bean plant'];
      const c = Math.max(0, Math.min(3, v.creature | 0)), k = Math.max(0, Math.min(3, v.stage | 0));
      const kids = [R(0, 0, W, H, '#fffdf6', { w: 0 })];
      const stageNames = [
        ['egg', 'tadpole', 'froglet', 'adult frog'],
        ['egg', 'larva', 'pupa', 'adult mosquito'],
        ['egg', 'caterpillar', 'cocoon', 'adult moth'],
        ['seed', 'sprout', 'young plant', 'plant with seeds'],
      ][c];
      kids.push(T(20, 30, names[c], { z: 22, a: 'start' }));
      kids.push(T(580, 30, `step ${k + 1} of 4`, { z: 15, a: 'end', f: '#6b5a8a' }));
      const cw = 128, gap = 16, x0 = 18, y0 = 48, chh = 168;
      const inWater = c === 0 || c === 1;
      const icon = (i, cx, cy) => {
        const out = [];
        if (inWater) { out.push(R(cx - 52, cy + 34, 104, 26, '#bfe6ff', { w: 0 })); out.push(L(cx - 52, cy + 34, cx + 52, cy + 34, '#7cc4ea', 2)); }
        else if (c === 2) { out.push(L(cx - 48, cy + 34, cx + 48, cy + 30, '#8a6d3b', 5)); }
        else { out.push(s('ellipse', { cx, cy: cy + 44, rx: 52, ry: 12, fill: '#cde8b5', stroke: '#7aa85a', 'stroke-width': 2 })); }
        if (c === 0) {
          if (i === 0) { for (const [dx, dy] of [[-16, -4], [0, -12], [16, -4], [-8, 10], [8, 10]]) { out.push(CIRC(cx + dx, cy + dy, 9, '#e8f6ff', { s: '#4a7fa5', w: 2 })); out.push(CIRC(cx + dx, cy + dy, 3, '#2a1a4a', { w: 0 })); } }
          else if (i === 1) { out.push(s('ellipse', { cx: cx - 6, cy, rx: 20, ry: 13, fill: '#5b6b4a', stroke: INK, 'stroke-width': 2 })); out.push(s('path', { d: `M ${cx + 12} ${cy} q 12 -10 24 0 q 10 8 22 -2`, fill: 'none', stroke: '#5b6b4a', 'stroke-width': 5, 'stroke-linecap': 'round' })); out.push(CIRC(cx - 10, cy - 4, 3, INK, { w: 0 })); }
          else if (i === 2) { out.push(CIRC(cx, cy, 16, '#6f9e4a', { s: INK, w: 2 })); out.push(CIRC(cx - 8, cy - 8, 5, '#6f9e4a', { s: INK, w: 1.5 })); out.push(CIRC(cx + 8, cy - 8, 5, '#6f9e4a', { s: INK, w: 1.5 })); out.push(L(cx - 14, cy + 10, cx - 26, cy + 24, '#6f9e4a', 4)); out.push(L(cx + 14, cy + 10, cx + 26, cy + 24, '#6f9e4a', 4)); out.push(s('path', { d: `M ${cx + 16} ${cy + 4} q 14 4 20 12`, fill: 'none', stroke: '#6f9e4a', 'stroke-width': 4 })); }
          else { out.push(s('ellipse', { cx, cy: cy + 2, rx: 24, ry: 17, fill: '#6f9e4a', stroke: INK, 'stroke-width': 2 })); out.push(CIRC(cx - 11, cy - 14, 7, '#6f9e4a', { s: INK, w: 2 })); out.push(CIRC(cx + 11, cy - 14, 7, '#6f9e4a', { s: INK, w: 2 })); out.push(CIRC(cx - 11, cy - 14, 3, INK, { w: 0 })); out.push(CIRC(cx + 11, cy - 14, 3, INK, { w: 0 })); out.push(L(cx - 20, cy + 14, cx - 38, cy + 30, '#6f9e4a', 5)); out.push(L(cx + 20, cy + 14, cx + 38, cy + 30, '#6f9e4a', 5)); out.push(L(cx - 24, cy + 6, cx - 42, cy + 10, '#6f9e4a', 4)); out.push(L(cx + 24, cy + 6, cx + 42, cy + 10, '#6f9e4a', 4)); }
        } else if (c === 1) {
          if (i === 0) { for (let j = 0; j < 5; j++) out.push(s('ellipse', { cx: cx - 30 + j * 15, cy: cy + 28 - (j % 2) * 3, rx: 4, ry: 8, fill: '#3d3d3d', stroke: INK, 'stroke-width': 1 })); }
          else if (i === 1) { out.push(s('path', { d: `M ${cx - 34} ${cy} q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0`, fill: 'none', stroke: '#3d3d3d', 'stroke-width': 7, 'stroke-linecap': 'round' })); out.push(CIRC(cx - 36, cy, 8, '#3d3d3d', { w: 0 })); out.push(CIRC(cx - 36, cy, 3, '#fff', { w: 0 })); }
          else if (i === 2) { out.push(s('path', { d: `M ${cx - 4} ${cy - 22} q 18 6 14 26 q -3 14 -18 10 q -12 -4 -6 -18 q 4 -8 10 -18 Z`, fill: '#8a6d3b', stroke: INK, 'stroke-width': 2 })); }
          else { out.push(s('ellipse', { cx: cx - 16, cy: cy - 6, rx: 18, ry: 8, fill: '#cfe8f7', stroke: INK, 'stroke-width': 1.5 })); out.push(s('ellipse', { cx: cx + 16, cy: cy - 6, rx: 18, ry: 8, fill: '#cfe8f7', stroke: INK, 'stroke-width': 1.5 })); out.push(L(cx, cy - 8, cx, cy + 22, '#3d3d3d', 6)); out.push(CIRC(cx, cy - 12, 6, '#3d3d3d', { w: 0 })); for (const dx of [-14, -6, 6, 14]) out.push(L(cx, cy + 4, cx + dx, cy + 26, '#3d3d3d', 2)); out.push(L(cx, cy - 18, cx - 10, cy - 30, '#3d3d3d', 2)); out.push(L(cx, cy - 18, cx + 10, cy - 30, '#3d3d3d', 2)); }
        } else if (c === 2) {
          if (i === 0) { out.push(s('ellipse', { cx: cx - 20, cy: cy + 10, rx: 26, ry: 14, fill: '#8fbf6a', stroke: '#5f8f3a', 'stroke-width': 2 })); for (const [dx, dy] of [[0, -6], [10, 2], [-10, 4], [16, -8], [-16, -2]]) out.push(CIRC(cx - 20 + dx, cy + 6 + dy, 4, '#f2e3c0', { s: INK, w: 1 })); }
          else if (i === 1) { for (let j = 0; j < 5; j++) out.push(CIRC(cx - 28 + j * 13, cy - (j % 2) * 5, 10, j === 0 ? '#f2e3c0' : '#e8d9a8', { s: INK, w: 1.5 })); for (let j = 0; j < 4; j++) out.push(L(cx - 28 + j * 13, cy + 8, cx - 30 + j * 13, cy + 18, '#6b5a3a', 2)); out.push(CIRC(cx - 28, cy - 2, 2, INK, { w: 0 })); }
          else if (i === 2) { out.push(s('ellipse', { cx, cy, rx: 20, ry: 30, fill: '#f3e7c9', stroke: INK, 'stroke-width': 2 })); for (let j = -2; j <= 2; j++) out.push(s('path', { d: `M ${cx - 16} ${cy + j * 11} q 16 ${j % 2 ? -6 : 6} 32 0`, fill: 'none', stroke: '#c9b48a', 'stroke-width': 2 })); }
          else { out.push(s('ellipse', { cx: cx - 20, cy: cy - 6, rx: 26, ry: 20, fill: '#f6ecd4', stroke: INK, 'stroke-width': 2 })); out.push(s('ellipse', { cx: cx + 20, cy: cy - 6, rx: 26, ry: 20, fill: '#f6ecd4', stroke: INK, 'stroke-width': 2 })); out.push(s('ellipse', { cx, cy, rx: 9, ry: 24, fill: '#a87f4a', stroke: INK, 'stroke-width': 2 })); out.push(L(cx, cy - 24, cx - 8, cy - 36, '#a87f4a', 2)); out.push(L(cx, cy - 24, cx + 8, cy - 36, '#a87f4a', 2)); }
        } else {
          if (i === 0) { out.push(s('ellipse', { cx, cy, rx: 20, ry: 14, fill: '#b07a3c', stroke: INK, 'stroke-width': 2 })); out.push(s('path', { d: `M ${cx - 4} ${cy + 12} q -2 14 -10 18`, fill: 'none', stroke: '#f2e3c0', 'stroke-width': 4 })); out.push(s('path', { d: `M ${cx + 4} ${cy + 12} q 2 14 10 18`, fill: 'none', stroke: '#f2e3c0', 'stroke-width': 4 })); }
          else if (i === 1) { out.push(L(cx, cy + 34, cx, cy - 6, '#4f8a3a', 5)); out.push(s('path', { d: `M ${cx} ${cy - 4} q -26 -6 -30 -22 q 24 0 30 14 Z`, fill: '#7ac74f', stroke: '#4f8a3a', 'stroke-width': 2 })); out.push(s('path', { d: `M ${cx} ${cy - 4} q 26 -6 30 -22 q -24 0 -30 14 Z`, fill: '#7ac74f', stroke: '#4f8a3a', 'stroke-width': 2 })); }
          else if (i === 2) { out.push(L(cx, cy + 44, cx, cy - 22, '#4f8a3a', 6)); for (const [dy, dir] of [[-14, -1], [-2, 1], [10, -1], [22, 1]]) out.push(s('path', { d: `M ${cx} ${cy + dy} q ${dir * 24} -8 ${dir * 30} -18 q -22 -2 -30 10 Z`, fill: '#7ac74f', stroke: '#4f8a3a', 'stroke-width': 2 })); out.push(CIRC(cx, cy - 30, 9, '#ffd166', { s: '#c99a00', w: 2 })); for (let j = 0; j < 6; j++) { const a = j * 60 * Math.PI / 180; out.push(CIRC(cx + Math.cos(a) * 9, cy - 30 + Math.sin(a) * 9, 3, '#ff9f1c', { w: 0 })); } }
          else { out.push(L(cx, cy + 46, cx, cy - 18, '#4f8a3a', 6)); for (const [dy, dir] of [[-10, -1], [2, 1], [14, -1], [26, 1]]) out.push(s('path', { d: `M ${cx} ${cy + dy} q ${dir * 22} -8 ${dir * 28} -18 q -20 -2 -28 10 Z`, fill: '#7ac74f', stroke: '#4f8a3a', 'stroke-width': 2 })); out.push(s('ellipse', { cx: cx + 26, cy: cy - 6, rx: 8, ry: 22, fill: '#8fd16a', stroke: '#4f8a3a', 'stroke-width': 2, transform: `rotate(24 ${cx + 26} ${cy - 6})` })); for (let j = -1; j <= 1; j++) out.push(CIRC(cx + 20 + j * 5, cy - 12 + j * 12, 3, '#2f6b2f', { w: 0 })); }
        }
        return out;
      };
      for (let i = 0; i < 4; i++) {
        const bx = x0 + i * (cw + gap), cx = bx + cw / 2, cy = y0 + 84;
        kids.push(R(bx, y0, cw, chh, i === k ? '#fff2d6' : '#fbf8f0', { w: i === k ? 4 : 2, s: i === k ? C.o : '#e3dccb', r: 14 }));
        kids.push(...icon(i, cx, cy));
        kids.push(T(cx, y0 + chh - 12, stageNames[i], { z: 13, f: i === k ? INK : '#8a7fa0' }));
        if (i < 3) kids.push(T(bx + cw + gap / 2, cy + 6, '\u203A', { z: 26, f: '#b9aed0' }));
      }
      const tail = (c === 0 || c === 1 || c === 2) ? ' The young looks nothing like the adult: it changes form completely, and that is called metamorphosis.' : ' The new seed can grow into another plant, so the cycle never stops.';
      const sayText = [
        ['A frog begins as an egg in a jelly-like mass in water. Many eggs are laid together, so some survive.',
          'The egg hatches into a tadpole. It lives in water, breathes with gills and swims with a long tail.',
          'The tadpole grows legs and its tail shrinks. It is now a froglet that can hop out of the water.',
          'The adult frog has no tail. It breathes with lungs and lays eggs, so the cycle begins again.'],
        ['A female mosquito lays her eggs on still water. They float together in a small raft.',
          'Each egg hatches into a larva that wriggles in the water. It comes to the surface to breathe.',
          'The larva becomes a pupa. It does not feed now; it is changing inside.',
          'The pupa splits open and an adult mosquito flies out. The cycle starts again with new eggs.'],
        ['The female silk moth lays many tiny eggs on a leaf.',
          'The egg hatches into a caterpillar. It eats leaves and grows fast, shedding its skin as it grows.',
          'The caterpillar spins a silk thread around itself and becomes a pupa inside a cocoon.',
          'The adult moth comes out of the cocoon, mates and lays eggs. The silk we use is the cocoon.'],
        ['A bean seed holds a tiny plant and its own food. It waits for water and warmth.',
          'The seed takes in water and sprouts. A root grows down and a shoot comes up with two leaves.',
          'The young plant grows more leaves and a flower. The flower can make new seeds.',
          'The flower becomes a pod full of seeds. The seeds fall and new plants grow, so the cycle repeats.'],
      ][c][k];
      const full = sayText + (k === 3 ? tail : ''), lines = [];
      let rest = full;
      while (rest && lines.length < 3) {
        if (rest.length <= 78) { lines.push(rest); rest = ''; break; }
        const cut = rest.slice(0, 78).replace(/\s+\S*$/, '');
        lines.push(cut); rest = rest.slice(cut.length).trim();
      }
      if (rest) lines[lines.length - 1] = lines[lines.length - 1].replace(/[,;]?$/, '') + ' ...';
      lines.forEach((ln, j) => kids.push(T(20, 240 + j * 20, ln, { z: 14, a: 'start', f: j === 2 ? '#6b5a8a' : '#2a1a4a', w: 600 })));
      return { kids, say: full };
    },
  },
  reflex: {
    subject: 'science', about: 'A hand touches a hot pan: one signal turns back at the spinal cord (a reflex) while a longer route carries the news up to the brain, so the hand pulls away before the brain knows. For reflex actions, the reflex arc, nerve impulses, neurons, the spinal cord and the brain as the coordinating centre.',
    sliders: [['t', 'Signal on its way (0 to 100)', 0, 100, 1, 0]],
    draw(v) {
      const rp = [[128, 150], [280, 150], [430, 150]];
      const bp = [[128, 166], [280, 166], [280, 112], [290, 82], [300, 112], [300, 166], [430, 166]];
      const seglen = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
      const total = (pts) => { let n = 0; for (let i = 1; i < pts.length; i++) n += seglen(pts[i - 1], pts[i]); return n; };
      const along = (pts, d) => {
        let rem = Math.max(0, d);
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i], sg = seglen(a, b);
          if (rem <= sg) { const k = sg ? rem / sg : 0; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
          rem -= sg;
        }
        return pts[pts.length - 1];
      };
      const rlen = total(rp), blen = total(bp), dist = (v.t / 100) * blen;
      const [rx, ry] = along(rp, Math.min(dist, rlen));
      const [bx, by] = along(bp, Math.min(dist, blen));
      const home = dist >= rlen;
      const kids = [];
      kids.push(R(38, 150, 60, 46, '#5b5b70', { r: 6 }), L(38, 173, 18, 173, INK, 6));
      for (let i = 0; i < 3; i++) kids.push(s('path', { d: `M ${50 + i * 18} 146 q 6 -10 0 -20 q -6 -10 0 -18`, fill: 'none', stroke: C.o, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.85 }));
      kids.push(T(68, 216, 'hot pan', { z: 16, f: '#6b5a8a' }));
      kids.push(R(270, 118, 40, 132, '#ece4f8', { r: 18 }), T(290, 268, 'spinal cord', { z: 15, f: '#6b5a8a' }));
      kids.push(CIRC(290, 72, 26, '#f6c9d6'), T(322, 78, 'brain', { z: 15, a: 'start', f: '#6b5a8a' }));
      kids.push(R(428, 138, 96, 28, home ? '#bfe9d2' : '#f0c39b', { r: 14 }), CIRC(530, 152, 17, home ? '#bfe9d2' : '#f0c39b'));
      kids.push(T(478, 124, 'muscle', { z: 15, f: '#6b5a8a' }));
      kids.push(s('polyline', { points: rp.map((p) => p.join(',')).join(' '), fill: 'none', stroke: C.o, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.9 }));
      kids.push(s('polyline', { points: bp.map((p) => p.join(',')).join(' '), fill: 'none', stroke: C.b, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.85 }));
      kids.push(CIRC(120, 158, 9, C.y), T(132, 202, 'receptor', { z: 14, a: 'start', f: '#6b5a8a' }));
      kids.push(CIRC(rx, ry, 8, C.o), CIRC(bx, by, 8, C.b));
      kids.push(CIRC(26, 36, 7, C.o), T(42, 41, 'reflex: turns back at the spinal cord', { z: 15, a: 'start', w: 600 }));
      kids.push(CIRC(26, 62, 7, C.b), T(42, 67, 'long way: up to the brain', { z: 15, a: 'start', w: 600 }));
      if (home) kids.push(T(470, 194, 'the hand is already back', { z: 16, f: '#058a68' }));
      let say;
      if (dist < 152) say = 'The signal is still travelling from the fingertip.';
      else if (dist < 237) say = 'The reflex signal has turned back at the spinal cord, while the brain route is still climbing.';
      else if (dist < rlen) say = 'The brain has the news now, but the hand has not pulled back yet.';
      else say = 'The hand has already pulled back: the reflex is quicker because the signal turns back at the spinal cord instead of going all the way to the brain.';
      return { kids, say };
    },
  },
  reactivity: {
    subject: 'science', about: 'A metal strip is dropped into a beaker of cold water, hot water, dilute acid or copper sulphate solution. Sodium fizzes violently even in cold water, magnesium needs hot water, magnesium, zinc and iron fizz in acid, copper and silver do nothing, and a metal above copper pushes copper out of copper sulphate so the blue fades and a brown coat forms. For the reactivity series, metals reacting with water and acids, and displacement reactions.',
    sliders: [['metal', 'Metal: sodium, magnesium, zinc, iron, copper, silver', 0, 5, 1, 0], ['liquid', 'Liquid: cold water, hot water, dilute acid, copper sulphate', 0, 3, 1, 0]],
    draw(v) {
      const metalList = [
        { name: 'sodium', sym: 'Na', rank: 0 },
        { name: 'magnesium', sym: 'Mg', rank: 1 },
        { name: 'zinc', sym: 'Zn', rank: 2 },
        { name: 'iron', sym: 'Fe', rank: 3 },
        { name: 'copper', sym: 'Cu', rank: 4 },
        { name: 'silver', sym: 'Ag', rank: 5 },
      ];
      const liquidNames = ['cold water', 'hot water', 'dilute acid', 'copper sulphate solution'];
      const met = metalList[v.metal], liq = v.liquid;
      let kind, head, sub;
      if (liq === 3) {
        if (met.rank < 4) {
          kind = 'displace';
          head = `${met.name} pushes copper out of the solution`;
          sub = `${met.name} is more reactive than copper, so it takes the copper's place. The blue colour fades and a brown coat of copper forms on the metal.`;
        } else {
          kind = 'none';
          head = `${met.name} cannot push copper out`;
          sub = `${met.name} is less reactive than copper, so it cannot take the copper's place. The blue solution stays as it is.`;
        }
      } else if (liq === 0) {
        if (met.name === 'sodium') { kind = 'violent'; head = 'Sodium reacts violently with cold water'; sub = 'Sodium fizzes and darts about on the surface, and may catch fire. It is stored in kerosene to keep water away.'; }
        else { kind = 'none'; head = `${met.name} does not react with cold water`; sub = met.name === 'magnesium' ? 'Magnesium is too slow in cold water: it needs hot water to react.' : `${met.name} does not react with cold water at all.`; }
      } else if (liq === 1) {
        if (met.name === 'sodium') { kind = 'violent'; head = 'Sodium reacts violently with hot water'; sub = 'Sodium fizzes and darts about, giving off hydrogen, and may catch fire.'; }
        else if (met.name === 'magnesium') { kind = 'slow'; head = 'Magnesium reacts with hot water'; sub = 'Magnesium gives off hydrogen slowly and forms magnesium hydroxide in the water.'; }
        else { kind = 'none'; head = `${met.name} does not react with hot water`; sub = `${met.name} does not react with water, even when it is hot.`; }
      } else {
        if (met.name === 'sodium') { kind = 'violent'; head = 'Sodium reacts violently with dilute acid'; sub = 'Sodium fizzes and darts about, giving off hydrogen very fast.'; }
        else if (met.name === 'magnesium') { kind = 'fast'; head = 'Magnesium fizzes fast in dilute acid'; sub = 'Magnesium gives off hydrogen fastest of these metals, leaving a salt in the acid.'; }
        else if (met.name === 'zinc' || met.name === 'iron') { kind = 'fast'; head = `${met.name} fizzes in dilute acid`; sub = `${met.name} gives off hydrogen and forms a salt, but more slowly than magnesium.`; }
        else { kind = 'none'; head = `${met.name} does not react with dilute acid`; sub = `${met.name} is below hydrogen in the activity series, so it cannot push hydrogen out of the acid.`; }
      }
      const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
      head = cap(head); sub = cap(sub);
      const kids = [R(0, 0, W, H, '#fffdf6', { w: 0 })];
      const liquidCol = liq === 3 ? (kind === 'displace' ? '#dbeafb' : '#7fb3e8') : liq === 2 ? '#fdf3d8' : '#dff0fb';
      kids.push(T(300, 28, `${cap(met.name)} in ${liquidNames[liq]}`, { z: 18, w: 700, f: '#6b5a8a' }));
      const beakerPath = 'M 190 64 L 190 236 Q 190 252 206 252 L 394 252 Q 410 252 410 236 L 410 64';
      kids.push(s('path', { d: 'M 192 108 L 192 236 Q 192 250 206 250 L 394 250 Q 408 250 408 236 L 408 108 Z', fill: liquidCol, stroke: 'none' }));
      kids.push(s('path', { d: beakerPath, fill: 'none', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }));
      kids.push(L(186, 64, 414, 64, INK, 3));
      kids.push(T(300, 244, liquidNames[liq], { z: 12, w: 600, f: '#4a6a88' }));
      kids.push(R(278, 104, 44, 124, '#c9cdd6', { r: 4, s: '#8d93a3', w: 2 }));
      if (kind === 'displace') kids.push(R(278, 104, 44, 124, '#b5652e', { r: 4, s: '#8a4a20', w: 2, x: { opacity: 0.8 } }));
      kids.push(T(300, 172, met.sym, { z: 20, w: 700, f: kind === 'displace' ? '#fff3e8' : '#3a3f4a' }));
      const bubPos = [[300, 122], [287, 142], [315, 134], [296, 162], [309, 176], [283, 154], [320, 152], [300, 192], [290, 202]];
      const nbub = kind === 'violent' ? 9 : kind === 'fast' ? 6 : kind === 'slow' ? 3 : 0;
      for (let i = 0; i < nbub; i++) { const [bx, by] = bubPos[i]; kids.push(CIRC(bx, by, 3 + (i % 3), '#ffffff', { s: '#8fb8dc', w: 1 })); }
      if (liq === 1 && kind !== 'violent') { for (const dx of [-50, 0, 50]) kids.push(s('path', { d: `M ${300 + dx} 60 q 8 -10 0 -18 q -8 -8 0 -16`, fill: 'none', stroke: '#b9c4cf', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.8 })); }
      if (kind === 'violent') {
        kids.push(s('path', { d: 'M 300 100 q 10 -18 0 -34 q -10 8 0 18 q 10 -8 0 -18', fill: 'none', stroke: C.o, 'stroke-width': 4, 'stroke-linecap': 'round' }));
        kids.push(T(352, 116, 'fizz!', { z: 14, w: 700, f: C.o }));
      }
      if (kind === 'displace') for (let i = 0; i < 5; i++) kids.push(CIRC(322 + i * 6, 200 - i * 9, 3, '#b5652e', { s: '#8a4a20', w: 1 }));
      const ok = kind !== 'none';
      kids.push(R(16, 258, 568, 34, ok ? '#e9f7ef' : '#f1eef7', { s: ok ? C.g : '#b8b0c9', w: 2, r: 10 }));
      kids.push(T(300, 280, head, { z: 15, w: 700, f: ok ? '#0b6b52' : '#6b5a8a' }));
      return { kids, say: `${head}. ${sub}` };
    },
  },
  ppc: {
    subject: 'social', about: 'A Production Possibility Curve for a farm that can grow barley and wheat. Move the two sliders to place a combination: on the curve all the land and workers are used, inside the curve some are idle, outside the curve the farm cannot reach. For choices, scarcity, trade-offs and opportunity cost.',
    sliders: [['b', 'Barley (quintals)', 0, 10, 1, 0], ['w', 'Wheat (quintals)', 0, 10, 1, 10]],
    draw(v) {
      const left = 82, right = 556, top = 26, base = 252;
      const X = (q) => left + (q / 10) * (right - left);
      const Y = (q) => base - (q / 10) * (base - top);
      const b = v.b, w = v.w, d = b * b + w * w;
      const kids = [R(0, 0, W, H, '#fffdf6', { w: 0 })];
      for (let q = 0; q <= 10; q += 2) {
        kids.push(L(X(q), base, X(q), base + 7, INK, 2));
        kids.push(T(X(q), base + 22, String(q), { z: 12, w: 600, f: '#6b5a8a' }));
        kids.push(L(left - 7, Y(q), left, Y(q), INK, 2));
        kids.push(T(left - 14, Y(q) + 4, String(q), { z: 12, w: 600, f: '#6b5a8a', a: 'end' }));
      }
      const curvePts = [];
      for (let i = 0; i <= 90; i++) {
        const ang = rad(i);
        curvePts.push(`${X(10 * Math.cos(ang))},${Y(10 * Math.sin(ang))}`);
      }
      kids.push(s('polygon', { points: `${X(0)},${Y(0)} ${X(10)},${Y(0)} ${curvePts.join(' ')}`, fill: '#eef7ff', stroke: 'none' }));
      kids.push(L(left, base, right, base, INK, 3), L(left, top, left, base, INK, 3));
      kids.push(s('polyline', { points: curvePts.join(' '), fill: 'none', stroke: C.p, 'stroke-width': 4, 'stroke-linecap': 'round' }));
      kids.push(T(right - 4, base + 40, 'Barley (quintals)', { z: 13, w: 600, f: '#6b5a8a', a: 'end' }));
      kids.push(T(left + 8, top - 8, 'Wheat (quintals)', { z: 13, w: 600, f: '#6b5a8a', a: 'start' }));
      const on = d === 100, inside = d < 100;
      const col = on ? C.g : inside ? C.b : C.o;
      kids.push(L(X(b), base, X(b), Y(w), col, 2, { 'stroke-dasharray': '5 5' }));
      kids.push(L(left, Y(w), X(b), Y(w), col, 2, { 'stroke-dasharray': '5 5' }));
      kids.push(CIRC(X(b), Y(w), 11, col, { w: 3 }));
      kids.push(T(X(b), Y(w) - 20, `${b} barley, ${w} wheat`, { z: 14, w: 700, f: col }));
      const where = on ? 'exactly on the curve, so all the land and workers are used'
        : inside ? 'inside the curve, so some land or workers are lying idle'
        : 'outside the curve, so the farm cannot grow that much';
      return { kids, say: `${b} quintals of barley and ${w} quintals of wheat: ${where}. More barley means less wheat, and the wheat given up is the opportunity cost.` };
    },
  },
  prism: {
    subject: 'science', about: 'A triangular glass prism with a ray of light falling on one face. The ray bends towards the normal as it enters the glass and away as it leaves, so it comes out at an angle to the way it went in: the angle of deviation. White light splits into the colours of the spectrum (VIBGYOR) because violet bends most and red least. For refraction through a prism, the angle of deviation, dispersion, spectrum, VIBGYOR, Newton and the rainbow.',
    sliders: [['i', 'Angle of the ray on the first face (degrees)', 20, 70, 5, 45], ['A', 'Angle of the prism (degrees)', 40, 70, 5, 50], ['w', 'Light: red, white, violet', 0, 2, 1, 0]],
    draw(v) {
      const apex = { x: 300, y: 66 }, baseY = 250;
      const half = (baseY - apex.y) * Math.tan(rad(v.A / 2));
      const bl = { x: 300 - half, y: baseY }, br = { x: 300 + half, y: baseY };
      const middle = { x: 300, y: (apex.y + baseY + baseY) / 3 };
      const sub2 = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
      const add2 = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
      const mul2 = (a, k) => ({ x: a.x * k, y: a.y * k });
      const dot2 = (a, b) => a.x * b.x + a.y * b.y;
      const cross2 = (a, b) => a.x * b.y - a.y * b.x;
      const unit2 = (a) => mul2(a, 1 / Math.hypot(a.x, a.y));
      const rot2 = (a, ang) => ({ x: a.x * Math.cos(ang) - a.y * Math.sin(ang), y: a.x * Math.sin(ang) + a.y * Math.cos(ang) });
      const facingOut = (p, q) => { const f = sub2(q, p), mid = mul2(add2(p, q), 0.5); let n = unit2({ x: -f.y, y: f.x }); if (dot2(n, sub2(mid, middle)) < 0) n = mul2(n, -1); return n; };
      const hitFace = (from, dir, p, q) => {
        const edge = sub2(q, p), den = cross2(dir, edge);
        if (Math.abs(den) < 1e-9) return null;
        const ap = sub2(p, from), t = cross2(ap, edge) / den, u = cross2(ap, dir) / den;
        return t > 1e-6 && u >= -1e-6 && u <= 1 + 1e-6 ? { t, pt: add2(from, mul2(dir, t)), p, q } : null;
      };
      const bend = (dir, nOut, n1, n2) => {
        let n = nOut, cosi = -dot2(n, dir);
        if (cosi < 0) { n = mul2(n, -1); cosi = -cosi; }
        const eta = n1 / n2, k = 1 - eta * eta * (1 - cosi * cosi);
        if (k < 0) return { dir: unit2(sub2(dir, mul2(n, 2 * dot2(dir, n)))), tir: true };
        const cost = Math.sqrt(k);
        return { dir: unit2(add2(mul2(dir, eta), mul2(n, eta * cosi - cost))), tir: false };
      };
      const pin = add2(bl, mul2(sub2(apex, bl), 0.45));
      const nLeft = facingOut(bl, apex), inward = mul2(nLeft, -1);
      const dIn = unit2(rot2(inward, -rad(v.i)));
      let back = 320;
      if (dIn.x > 1e-6) back = Math.min(back, (pin.x - 8) / dIn.x);
      if (dIn.x < -1e-6) back = Math.min(back, (592 - pin.x) / -dIn.x);
      if (dIn.y > 1e-6) back = Math.min(back, (pin.y - 8) / dIn.y);
      if (dIn.y < -1e-6) back = Math.min(back, (292 - pin.y) / -dIn.y);
      const start = sub2(pin, mul2(dIn, Math.max(20, back)));
      const bands = [['violet', '#7a3cff', 1.532], ['indigo', '#4b3fd4', 1.528], ['blue', '#2f7bf5', 1.524], ['green', '#17a34a', 1.519], ['yellow', '#f5c211', 1.517], ['orange', '#f57c1f', 1.514], ['red', '#e02020', 1.513]];
      const shown = v.w === 1 ? bands : v.w === 2 ? [bands[0]] : [bands[6]];
      const kids = [R(0, 0, W, H, '#fbf8ff', { w: 0 })];
      kids.push(s('polygon', { points: `${apex.x},${apex.y} ${bl.x},${bl.y} ${br.x},${br.y}`, fill: '#dcecfb', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round', opacity: 0.85 }));
      kids.push(T(300, 56, `prism angle ${v.A} degrees`, { z: 12, w: 600, f: '#6b5a8a' }));
      kids.push(L(start.x, start.y, pin.x, pin.y, v.w === 1 ? '#8a86a0' : shown[0][1], 5));
      const nTip = add2(pin, mul2(nLeft, 46));
      kids.push(L(add2(pin, mul2(nLeft, -8)).x, add2(pin, mul2(nLeft, -8)).y, nTip.x, nTip.y, '#9c93b8', 2, { 'stroke-dasharray': '6 6' }));
      kids.push(T(nTip.x + 10, nTip.y, 'normal', { z: 11, w: 600, f: '#8a80a8' }));
      kids.push(CIRC(pin.x, pin.y, 4, INK));
      const results = [];
      for (const [name, colour, n] of shown) {
        const r1 = bend(dIn, nLeft, 1, n);
        let pos = pin, dir = r1.dir, cameOut = false, outDir = null, exitAt = null, guard = 0, bounced = false;
        const inner = [];
        while (guard < 4) {
          const options = [hitFace(pos, dir, apex, br), hitFace(pos, dir, br, bl), hitFace(pos, dir, bl, apex)].filter(Boolean).sort((a, b) => a.t - b.t);
          const face = options[0];
          if (!face) break;
          inner.push([pos, face.pt]);
          const r2 = bend(dir, facingOut(face.p, face.q), n, 1);
          if (!r2.tir) { outDir = r2.dir; exitAt = face.pt; cameOut = true; break; }
          pos = face.pt; dir = r2.dir; bounced = true; guard++;
        }
        for (const [a, b] of inner) kids.push(L(a.x, a.y, b.x, b.y, colour, 4));
        if (cameOut) {
          const dev = (Math.acos(Math.max(-1, Math.min(1, dot2(dIn, outDir)))) * 180) / Math.PI;
          results.push({ name, colour, dev, exitAt, outDir, bounced });
        }
      }
      const red = results.find((r) => r.name === 'red'), violet = results.find((r) => r.name === 'violet');
      const clean = v.w === 1 && red && violet && !red.bounced && !violet.bounced;
      const fan = (r) => {   // white light only: draw the colours wider apart so the band can be seen
        if (!clean || r.name === 'red') return r.outDir;
        const ang = Math.atan2(cross2(red.outDir, r.outDir), dot2(red.outDir, r.outDir));
        return rot2(red.outDir, ang * 5);
      };
      for (const r of results) {
        const shownDir = fan(r);
        const far = add2(r.exitAt, mul2(shownDir, 340));
        kids.push(L(r.exitAt.x, r.exitAt.y, far.x, far.y, r.colour, 4));
      }
      kids.push(R(566, 30, 22, 240, '#ffffff', { s: '#cfc6e2', w: 2, r: 4 }));
      kids.push(T(577, 22, 'screen', { z: 10, w: 600, f: '#8a80a8' }));
      for (const r of results) {
        const shownDir = fan(r);
        if (shownDir.x <= 0.02) continue;
        const t = (577 - r.exitAt.x) / shownDir.x, sy = r.exitAt.y + shownDir.y * t;
        if (sy > 34 && sy < 266) kids.push(CIRC(577, sy, 6, r.colour, { s: INK, w: 1 }));
      }
      let line, say;
      if (v.w === 1 && red && violet && !red.bounced && !violet.bounced) {
        const spread = violet.dev - red.dev;
        line = 'White light splits into the spectrum: violet bends most, red least.';
        say = `White light enters the prism and comes out as a band of colours, violet to red. Violet is bent ${num(spread, 1)} degrees more than red, so the colours spread apart. The band is drawn wider so you can see it. This splitting is called dispersion, and the band is the spectrum: VIBGYOR.`;
      } else if (v.w === 1) {
        line = 'The light reflects inside the prism before it leaves.';
        say = 'At this steep angle the light hits the second face too flat to get out, so it reflects off the inside of that face and leaves through another face. This is total internal reflection. Slide the ray or the prism angle to let the light come straight out.';
      } else if (red) {
        line = `Red light comes out bent through ${num(red.dev, 1)} degrees.`;
        say = `The red ray enters the glass, bends towards the normal, then bends away from the normal as it leaves, so it comes out at ${num(red.dev, 1)} degrees to its first direction. Red bends the least of all the colours.`;
      } else if (violet) {
        line = `Violet light comes out bent through ${num(violet.dev, 1)} degrees.`;
        say = `The violet ray comes out at ${num(violet.dev, 1)} degrees to its first direction. Violet bends more than red, which is why a prism spreads white light into its colours.`;
      } else {
        line = 'The light reflects inside the prism instead of coming out.';
        say = 'The ray hits the second face too steeply, so it reflects back inside the glass. This is total internal reflection.';
      }
      kids.push(R(12, 8, 300, 26, '#f1eef7', { s: '#d5cde6', w: 1, r: 8 }));
      kids.push(T(20, 26, `ray at ${v.i} degrees on the first face`, { z: 12, w: 600, f: '#6b5a8a', a: 'start' }));
      kids.push(R(14, 262, 572, 28, '#eef7ff', { s: '#b8cde8', w: 1, r: 8 }));
      kids.push(T(300, 281, line, { z: 13, w: 700, f: '#2a4a6a' }));
      return { kids, say };
    },
  },
  arcangle: {
    subject: 'maths', about: 'A chord AB of a circle with the angle it makes at the centre, and a point C on the far arc showing the angle there. The angle at the centre is twice the angle at C, and a diameter makes a right angle. A second view draws four points on one circle and shows opposite angles of a cyclic quadrilateral adding to 180. For circles, chord, arc, angle at the centre, angle at the circumference, twice, diameter, semicircle, concyclic, cyclic quadrilateral, opposite angles.',
    sliders: [['a', 'Angle at the centre (degrees)', 40, 180, 10, 120], ['c', 'Move point C or a corner', 0, 100, 5, 50], ['mode', 'Two angles / Four-sided shape', 0, 1, 1, 0]],
    draw(v) {
      const cx = 300, cy = 150, rr = 100;
      const P = (ang) => ({ x: cx + rr * Math.cos(rad(ang)), y: cy - rr * Math.sin(rad(ang)) });
      const kids = [CIRC(cx, cy, rr, 'none', { s: '#cfc6e2', w: 3 }), CIRC(cx, cy, 5, INK)];
      if (v.mode === 0) {
        const half = v.a / 2, ptA = P(90 + half), ptB = P(90 - half);
        const cAng = 90 - half - (360 - v.a) * (0.05 + 0.9 * v.c / 100), ptC = P(cAng);
        kids.push(s('path', { d: `${arc(cx, cy, 38, 90 - half, 90 + half)} L ${cx} ${cy} Z`, fill: C.y, stroke: INK, 'stroke-width': 2, opacity: 0.7 }));
        kids.push(L(ptA.x, ptA.y, ptB.x, ptB.y, INK, 4));
        kids.push(L(cx, cy, ptA.x, ptA.y, '#8a80a8', 3), L(cx, cy, ptB.x, ptB.y, '#8a80a8', 3));
        kids.push(L(ptC.x, ptC.y, ptA.x, ptA.y, C.o, 3), L(ptC.x, ptC.y, ptB.x, ptB.y, C.o, 3));
        kids.push(CIRC(ptA.x, ptA.y, 6, C.b), CIRC(ptB.x, ptB.y, 6, C.b), CIRC(ptC.x, ptC.y, 7, C.o));
        kids.push(T(ptA.x + 16, ptA.y - 6, 'A', { z: 17 }), T(ptB.x - 16, ptB.y - 6, 'B', { z: 17 }), T(ptC.x, ptC.y + 26, 'C', { z: 17, f: '#d9531e' }));
        kids.push(T(cx, cy - 14, `${v.a}°`, { z: 15, f: '#8a6a00' }), T(ptC.x, ptC.y - 16, `${half}°`, { z: 15, f: '#d9531e' }));
        kids.push(T(cx, cy + 24, 'centre', { z: 11, w: 600, f: '#6b5a8a' }));
        kids.push(R(96, 262, 408, 30, '#eef7ff', { s: '#b8cde8', w: 1, r: 8 }));
        kids.push(T(300, 282, `angle at centre ${v.a}°, angle at C ${half}°`, { z: 14, w: 700, f: '#2a4a6a' }));
        return { kids, say: `The chord AB makes ${v.a} degrees at the centre. From point C on the far arc it makes ${half} degrees, which is always half. Move C along the arc and watch the angle stay the same.` };
      }
      const angAt = (Q, U, V) => {
        const u1 = { x: U.x - Q.x, y: U.y - Q.y }, u2 = { x: V.x - Q.x, y: V.y - Q.y };
        const d = (u1.x * u2.x + u1.y * u2.y) / (Math.hypot(u1.x, u1.y) * Math.hypot(u2.x, u2.y));
        return (Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI;
      };
      const p1 = P(20), p2 = P(60 + v.c * 0.8), p3 = P(200), p4 = P(290);
      const a1 = angAt(p1, p4, p2), a2 = angAt(p2, p1, p3), a3 = angAt(p3, p2, p4), a4 = angAt(p4, p3, p1);
      kids.push(s('polygon', { points: [p1, p2, p3, p4].map((p) => `${p.x},${p.y}`).join(' '), fill: C.sky, 'fill-opacity': 0.3, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }));
      const put = (p, txt, col) => { const ux = (p.x - cx) / rr, uy = (p.y - cy) / rr; kids.push(CIRC(p.x, p.y, 6, col)); kids.push(T(p.x - ux * 26, p.y - uy * 26 + 6, txt, { z: 15, f: col })); };
      put(p1, `${Math.round(a1)}°`, '#d9531e'); put(p2, `${Math.round(a2)}°`, '#3a86ff'); put(p3, `${Math.round(a3)}°`, '#d9531e'); put(p4, `${Math.round(a4)}°`, '#3a86ff');
      const s13 = Math.round(a1 + a3), s24 = Math.round(a2 + a4);
      kids.push(R(96, 262, 408, 30, '#eef7ff', { s: '#b8cde8', w: 1, r: 8 }));
      kids.push(T(300, 282, `opposite pairs: ${Math.round(a1)} + ${Math.round(a3)} = ${s13}°, ${Math.round(a2)} + ${Math.round(a4)} = ${s24}°`, { z: 13, w: 700, f: '#2a4a6a' }));
      return { kids, say: `Four points sit on one circle. The orange angles are opposite each other and add to ${s13} degrees. The blue angles are the other opposite pair and add to ${s24} degrees. Both pairs always add to 180.` };
    },
  },
};

export function slidersOf(id, params) { const w = WIDGETS[id]; return w?.dynamicSliders ? w.dynamicSliders(params || w.params || {}) : w?.sliders || []; }
export const CATALOG = Object.entries(WIDGETS).map(([id, w]) => ({ id, subject: w.subject, about: w.about, params: w.params || null, sliders: w.dynamicSliders ? 'set from the events' : w.sliders.map(([key, label, min, max, step, start]) => ({ key, label, min, max, step, start })) }));
