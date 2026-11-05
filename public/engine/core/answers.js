// Fair marking of typed answers. A child is marked right when they clearly know the answer, even if they add a unit,
// write the number another way, or slip one letter:
//   500, "500m", "500 m", "500 metres"  for 500, as long as the unit is the one the question uses (500 cm is still wrong)
//   "9 beads" for 9 when the question talks about beads
//   0.5, .5, 1/2, ½ and 1,000, 1000 are the same number
//   one wrong, missing, extra or swapped letter in a word of 5 or more letters, two in a word of 8 or more; short words exact
//   case, punctuation, "a", "an", "the" and plural endings are ignored

const ALIASES = {
  mm: ['mm', 'millimetre', 'millimetres', 'millimeter', 'millimeters'],
  cm: ['cm', 'centimetre', 'centimetres', 'centimeter', 'centimeters'],
  m: ['m', 'metre', 'metres', 'meter', 'meters', 'mtr', 'mtrs'],
  km: ['km', 'kms', 'kilometre', 'kilometres', 'kilometer', 'kilometers'],
  mg: ['mg', 'milligram', 'milligrams'],
  g: ['g', 'gm', 'gms', 'gram', 'grams', 'gramme', 'grammes'],
  kg: ['kg', 'kgs', 'kilogram', 'kilograms', 'kilo', 'kilos'],
  ml: ['ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters'],
  l: ['l', 'litre', 'litres', 'liter', 'liters', 'ltr', 'ltrs'],
  s: ['s', 'sec', 'secs', 'second', 'seconds'],
  min: ['min', 'mins', 'minute', 'minutes'],
  h: ['h', 'hr', 'hrs', 'hour', 'hours'],
  day: ['day', 'days'],
  deg: ['°', 'deg', 'degree', 'degrees'],
  c: ['°c', 'degc', 'celsius', 'degrees celsius'],
  rs: ['rs', '₹', 'rupee', 'rupees', 'inr'],
  pct: ['%', 'percent', 'per cent'],
  m2: ['m2', 'm²', 'sq m', 'square metre', 'square metres', 'square meter', 'square meters'],
  cm2: ['cm2', 'cm²', 'sq cm', 'square centimetre', 'square centimetres', 'square centimeter', 'square centimeters'],
  km2: ['km2', 'km²', 'sq km', 'square kilometre', 'square kilometres'],
  m3: ['m3', 'm³', 'cubic metre', 'cubic metres'],
  cm3: ['cm3', 'cm³', 'cubic centimetre', 'cubic centimetres', 'cc'],
  n: ['n', 'newton', 'newtons'], j: ['j', 'joule', 'joules'], w: ['w', 'watt', 'watts'], v: ['v', 'volt', 'volts'],
  a: ['a', 'amp', 'amps', 'ampere', 'amperes'], hz: ['hz', 'hertz'], kmh: ['km/h', 'kmph', 'km per hour', 'kilometres per hour'], ms: ['m/s', 'metres per second'],
};
const UNIT_OF = new Map();
for (const [canon, list] of Object.entries(ALIASES)) for (const a of list) UNIT_OF.set(a, canon);

const VULGAR = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅕': 0.2, '⅛': 0.125 };
const clean = (s) => String(s ?? '').normalize('NFC').toLowerCase().replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim();

// "500m" -> { value: 500, tail: 'm' }; "₹ 20" -> { value: 20, tail: 'rs' }; "1/2" -> 0.5; not a number -> null
function quantity(raw) {
  let s = clean(raw), lead = '';
  const cur = s.match(/^(rs\.?|₹)\s*/);
  if (cur) { lead = 'rs'; s = s.slice(cur[0].length); }
  const m = s.match(/^(-?)\s*(\d[\d,]*(?:\.\d+)?|\.\d+)(?:\s*\/\s*(\d+(?:\.\d+)?))?\s*([½¼¾⅓⅔⅕⅛])?\s*(.*)$/) || s.match(/^(-?)()()([½¼¾⅓⅔⅕⅛])\s*(.*)$/);
  if (!m) return null;
  let value = m[2] ? Number(m[2].replace(/,/g, '')) : 0;
  if (m[3]) value /= Number(m[3]);
  if (m[4]) value += VULGAR[m[4]];
  if (m[1]) value = -value;
  if (!Number.isFinite(value)) return null;
  const tail = m[5].replace(/[.!?]+$/, '').trim();
  return { value, tail: lead || tail };
}

const sameNumber = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)) || (Math.abs(b) > 0 && Math.abs(a - b) / Math.abs(b) < 0.005 && String(b).length > 6);
const words = (s) => clean(s).replace(/[.,!?;:'"()]/g, ' ').split(' ').filter(Boolean);

// Is the extra text after a number allowed? A unit must match the answer's unit, or the question's own unit if the
// answer is a bare number. A plain word (beads, apples) must come from the question.
function tailOk(tail, wantTail, prompt) {
  if (!tail) return true;
  const unit = UNIT_OF.get(tail);
  const wantUnit = wantTail ? UNIT_OF.get(wantTail) : null;
  if (unit) {
    if (wantUnit) return unit === wantUnit;
    const p = ` ${clean(prompt).replace(/[.,!?;:'"()]/g, ' ')} `;
    return ALIASES[unit].some((a) => p.includes(` ${a} `) || (/[^a-z ]/.test(a) && p.includes(a)));
  }
  if (wantTail && words(wantTail).join(' ') === words(tail).join(' ')) return true;
  const inPrompt = new Set(words(prompt).map(stem));
  return words(tail).every((w) => inPrompt.has(stem(w)) || ['units', 'unit'].includes(w));
}

const stem = (w) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');
const allowed = (len) => (len >= 8 ? 2 : len >= 5 ? 1 : 0);
// Optimal string alignment distance: insertions, deletions, substitutions and swaps of neighbours each cost 1.
function distance(a, b, cap = 3) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
const DROP = new Set(['a', 'an', 'the']);
const phrase = (s) => words(s).filter((w) => !DROP.has(w)).map(stem).join(' ');
export function closeWord(given, want) {
  const g = stem(given), w = stem(want);
  return g === w || distance(g, w) <= allowed(w.length);
}

// One accepted answer against what the child typed.
export function sameAnswer(given, want, prompt = '') {
  const gq = quantity(given), wq = quantity(want);
  if (wq) return !!gq && sameNumber(gq.value, wq.value) && tailOk(gq.tail, wq.tail, prompt);
  const g0 = words(given).join(' '), w0 = words(want).join(' ');
  if (g0 && g0 === w0) return true;          // an exact answer always counts, even a single letter like "a"
  const g = phrase(given), w = phrase(want);
  if (!g || !w) return false;
  if (g === w) return true;
  // whole phrase within the typo allowance of its length, letters only
  const gl = g.replace(/ /g, ''), wl = w.replace(/ /g, '');
  return /\p{L}/u.test(wl) && distance(gl, wl) <= allowed(wl.length);
}

export function matches(given, accepted = [], prompt = '') {
  return String(given ?? '').trim().length > 0 && accepted.some((a) => sameAnswer(given, a, prompt));
}
