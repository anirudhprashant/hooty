// Turn a textbook PDF into a course with plain code: no AI, no server, no cost. The file never leaves the device.
//   readPdf()   PDF to lines of text with size, weight and page, plus the pictures, in the browser
//   makeBook()  lines to chapters, lessons and questions. Pure rules, so the same book always gives the same course.
// Every question comes from a sentence printed in the book, and its feedback quotes that sentence and page. The code can
// only rearrange what the book says: it cannot simplify the English or invent an explanation.

const COMMON = new Set(`about above after again along also although always among another answer around because become before being
below between both called cannot change children could different during each early either enough every example first follow following
found friend friends from give given great group have having help here however important include including instead itself large later
learn learned least little local long look looking made make makes making many might more most much must near need never number numbers
often other others people perhaps person picture place places point possible present problem question questions rather really reason
result same school second several should show shown shows similar since small some someone something sometimes start still story such
take taken than that their them themselves then there these they thing things think this those though three through time times today
together towards under until upon used using usually various very want water well were what when where which while whole whose will
with within without work world would write written year years your conclude observe measure particular minimum maximum nature course caution answer experience classify subtract notice nearest explore exploring`.split(/\s+/));
const SKIP_SECTION = /^(foreword|preface|contents?|index|acknowledge?ments?|answers?|bibliography|references|glossary|about the|textbook development|the constitution|national anthem|reprint)/i;
const BOOK_QUESTIONS = /^(exercises?|questions?|let us (think|practi[cs]e|reflect|discuss|try)|think (about|and)|try (this|these|it)|figure it out|check your|review|keep the curiosity|practice)/i;
const BOX_LABEL = /^(activity|table|fig(ure)?|box|project|note|caution|know a scientist|holistic lens|dive deeper|what if|why|in a nutshell)\b/i;
const FACT_BOX = /^(fascinating facts?|did you know|fun facts?|interesting facts?|amazing facts?)\b/i;
const LOOSE_START = /^(it|they|this|these|that|those|he|she|we|you|i|his|her|their|our|such|here|there|so|but|and|or|then|also|however|therefore|thus|for example|look|let us|let's|see|do|try|can|note|fig|figure|table|activity|example)\b/i;
const NEEDS_CONTEXT = /\b(above|below|following|shown|this chapter|previous|next page|given here|fig\.|figure|table \d|see page)\b/i;

const STATES = /\b(is|are|was|were|has|have|had|can|helps?|makes?|gives?|contains?|uses?|lives?|grows?|became|began|built|ruled|called|known|flows?|produces?|needs?|depends?)\b/i;
const VAGUE = /\b(this|these|those|such|you|your|we|us|our|i|my|him|some of|others?|another|same|chapter|grade|activity|exercise|lesson|earlier|above|below)\b/i;
const COMMAND = /^(notice|fill|look|see|ask|try|tell|choose|show|suggest|write|find|observe|take|make|draw|list|name|discuss|explain|compare|describe|collect|place|put|add|use|record|measure|note|identify|repeat|think|remember|imagine|consider|connect|keep|pour|mix|dip|rub)\b/i;
const words = (s) => s.match(/[\p{L}\p{M}'’-]+/gu) || [];
const clean = (s) => s.replace(/[\u0000-\u001f\u007f-\u009f•▪●]/g, ' ').replace(/\s+/g, ' ').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/ﬀ/g, 'ff').replace(/\b(\w*(?:ff|fi|fl)) (?=(?:er|ic|ect|ort|ered?|ering|erent|erence|iciency|icient|ice|ort|nd|rst|ve|eld|lter|ow|ower|oat|ame|ight|at)\b)/g, '$1').replace(/\s+([,.;:?!])/g, '$1').trim();
const slug = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'book';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function rng(seed) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 13), 1540483477) >>> 0) / 4294967296); }
const shuffled = (a, r) => { const o = a.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };

// ---- reading the PDF ------------------------------------------------------------------------------------------------
export async function readPdf(files, onProgress = () => {}) {
  const pdfjs = await import('../../vendor/pdfjs/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
  const docs = [];
  const total = { pages: 0, done: 0 };
  const opened = [];
  for (const f of files) {
    const doc = await pdfjs.getDocument({ data: await f.arrayBuffer(), isEvalSupported: false }).promise;
    opened.push({ name: f.name, doc }); total.pages += doc.numPages;
  }
  for (const { name, doc } of opened) {
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const vp = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const ops = await page.getOperatorList();
      const fontOf = (id) => { try { return page.commonObjs.has(id) ? (page.commonObjs.get(id).name || '') : ''; } catch { return ''; } };
      const items = content.items.filter((i) => i.str && i.str.trim()).map((i) => ({
        s: i.str, x: i.transform[4], y: i.transform[5], h: Math.abs(i.transform[3]) || i.height, w: i.width, bold: /bold|black|heavy|semibold|-bd/i.test(fontOf(i.fontName)),
      }));
      pages.push({ n, height: vp.height, lines: toLines(items), image: await bestImage(page, ops, pdfjs) });
      page.cleanup();
      total.done++; onProgress(total.done / total.pages);
    }
    docs.push({ name, outline: await doc.getOutline().catch(() => null), pages });
    doc.destroy();
  }
  return docs;
}

function toLines(items) {
  const rows = [];
  for (const it of items.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((r) => Math.abs(r.y - it.y) < Math.max(2, it.h * 0.4));
    if (row) row.items.push(it); else rows.push({ y: it.y, items: [it] });
  }
  return rows.map((r) => {
    const parts = r.items.sort((a, b) => a.x - b.x);
    let text = '', chars = 0, boldChars = 0, prevEnd = null;
    const boldRuns = []; let run = '';
    for (const p of parts) {
      if (prevEnd != null && p.x - prevEnd > p.h * 0.18 && !text.endsWith(' ') && !p.s.startsWith(' ')) text += ' ';
      text += p.s; prevEnd = p.x + p.w; chars += p.s.length;
      if (p.bold) { boldChars += p.s.length; run += p.s; } else if (run) { boldRuns.push(run); run = ''; }
    }
    if (run) boldRuns.push(run);
    return { text: clean(text), y: r.y, x: parts[0].x, size: Math.max(...parts.map((p) => p.h)), bold: boldChars > chars * 0.7, boldRuns: boldRuns.map(clean).filter(Boolean) };
  }).filter((l) => l.text);
}

// The largest real picture on a page, small enough to keep. Logos, rules and page decorations are too small to pass.
async function bestImage(page, ops, pdfjs) {
  if (typeof document === 'undefined') return null;
  let best = null;
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] !== pdfjs.OPS.paintImageXObject) continue;
    const id = ops.argsArray[i][0];
    const img = await new Promise((done) => {
      const t = setTimeout(() => done(null), 1500);
      const from = id.startsWith('g_') ? page.commonObjs : page.objs;
      try { from.get(id, (v) => { clearTimeout(t); done(v); }); } catch { clearTimeout(t); done(null); }
    });
    if (img && img.width >= 240 && img.height >= 160 && (!best || img.width * img.height > best.width * best.height)) best = img;
  }
  if (!best) return null;
  try {
    const scale = Math.min(1, 720 / best.width), c = document.createElement('canvas');
    c.width = Math.round(best.width * scale); c.height = Math.round(best.height * scale);
    const g = c.getContext('2d');
    if (best.bitmap) g.drawImage(best.bitmap, 0, 0, c.width, c.height);
    else if (best.data && best.kind === 3) { const t = document.createElement('canvas'); t.width = best.width; t.height = best.height; t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(best.data), best.width, best.height), 0, 0); g.drawImage(t, 0, 0, c.width, c.height); }
    else return null;
    return c.toDataURL('image/webp', 0.72);
  } catch { return null; }
}

// ---- finding the book's shape ---------------------------------------------------------------------------------------
function dropRepeats(docs) {
  // Running heads, footers and "Reprint 2025-26" repeat from page to page. Real text does not.
  const seen = new Map(); let pages = 0;
  const key = (t) => t.toLowerCase().replace(/[\d\s]+/g, ' ').trim();
  for (const d of docs) for (const p of d.pages) {
    pages++;
    for (const k of new Set(p.lines.map((l) => key(l.text)))) seen.set(k, (seen.get(k) || 0) + 1);
  }
  const limit = Math.max(3, pages * 0.08);
  for (const d of docs) for (const p of d.pages) p.lines = p.lines.filter((l) => {
    if (/^[\d\s.•|-]*$/.test(l.text)) return false;
    if (/\bgrade \d+\b|\breprint\b|not to be republished/i.test(l.text) && words(l.text).length <= 9) return false;
    return !(seen.get(key(l.text)) >= limit && words(l.text).length <= 12);
  });
}

function bodySize(docs) {
  const tally = new Map();
  for (const d of docs) for (const p of d.pages) for (const l of p.lines) { const s = Math.round(l.size * 2) / 2; tally.set(s, (tally.get(s) || 0) + l.text.length); }
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 11;
}

const looksLikeHeading = (l, body) => {
  const t = l.text, n = words(t).length;
  if (n === 0 || n > 14 || t.length > 90 || /[,;:]$/.test(t) || /^[a-z(]/.test(t)) return false;
  if (/[.!?]$/.test(t) && !/^\d/.test(t)) return false;
  return l.size >= body * 1.12 || (l.bold && l.size >= body * 0.98 && n <= 10);
};

// Paragraphs and headings, in reading order, each remembering its page.
function toBlocks(pages, body) {
  const blocks = []; let para = null;
  const close = () => { if (para) { para.text = para.text.replace(/\s+/g, ' ').trim(); if (para.text) blocks.push(para); para = null; } };
  for (const p of pages) {
    let prev = null;
    for (const l of p.lines) {
      if (looksLikeHeading(l, body)) {
        close();
        const last = blocks[blocks.length - 1];
        if (last?.heading && last.page === p.n && Math.abs(last.size - l.size) < 1.5 && prev && prev.y - l.y < l.size * 1.9) last.text += ` ${l.text}`;   // a heading on two lines
        else blocks.push({ heading: true, text: l.text.replace(/^\d+(\.\d+)*\.?\s*/, ''), size: l.size, page: p.n });
        prev = l; continue;
      }
      if (l.size < body * 0.8) { prev = l; continue; }   // captions and footnotes
      const gap = prev ? prev.y - l.y : 0;
      if (para && (gap > l.size * 1.9 || gap < 0 || (/[.?!:]["”’]?$/.test(para.text) && l.x > (para.x + 6)) || /^(\d+[.)]|\(?[a-e]\)|[•▪●])\s/.test(l.text))) close();
      if (!para) para = { text: '', page: p.n, x: l.x, terms: [] };
      para.text = para.text.endsWith('-') && /^[a-z]/.test(l.text) ? para.text.slice(0, -1) + l.text : `${para.text} ${l.text}`;
      for (const b of l.boldRuns) if (!l.bold) para.terms.push(b);
      prev = l;
    }
  }
  close();
  return blocks;
}

function splitChapters(docs, body) {
  // One file each: every file is a chapter (this is how NCERT's site gives them out).
  if (docs.length > 1) return docs.map((d, i) => {
    const blocks = toBlocks(d.pages, body);
    return { title: chapterTitle(blocks, d.name), blocks, images: imagesOf(d.pages), n: i + 1 };
  });
  const pages = docs[0].pages, blocks = toBlocks(pages, body);
  const biggest = Math.max(...blocks.filter((b) => b.heading).map((b) => b.size), body);
  let starts = blocks.map((b, i) => (b.heading && /^(chapter|unit|lesson)\s+[\dIVX]+/i.test(b.text) ? i : -1)).filter((i) => i >= 0);
  if (starts.length < 2) starts = blocks.map((b, i) => (b.heading && b.size >= biggest * 0.92 && !SKIP_SECTION.test(b.text) ? i : -1)).filter((i) => i >= 0);
  if (starts.length < 2) return [{ title: chapterTitle(blocks, docs[0].name), blocks, images: imagesOf(pages), n: 1 }];
  return starts.map((s, i) => {
    const part = blocks.slice(s, starts[i + 1] ?? blocks.length);
    const nums = new Set(part.map((b) => b.page));
    return { title: chapterTitle(part, docs[0].name), blocks: part, images: imagesOf(pages.filter((p) => nums.has(p.n))), n: i + 1 };
  }).filter((c) => words(c.blocks.map((b) => b.text).join(' ')).length > 120 && !SKIP_SECTION.test(c.title));
}
const imagesOf = (pages) => pages.filter((p) => p.image).map((p) => ({ page: p.n, src: p.image }));
function chapterTitle(blocks, fallback) {
  const heads = blocks.slice(0, 12).filter((b) => b.heading && !/^(chapter|unit|lesson)?\s*[\dIVX]*$/i.test(b.text.trim()));
  const top = heads.sort((a, b) => b.size - a.size)[0];
  return (top?.text.replace(/^(chapter|unit|lesson)\s+[\dIVX]+[:.\s-]*/i, '').trim()) || fallback.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');
}

// A lesson is one section of the book, kept to a comfortable length.
function toSections(chapter) {
  const out = []; let cur = null; const boxes = []; let box = null;
  const open = (title, page) => { cur = { title, page, paras: [], questions: [], examples: [], inQuestions: BOOK_QUESTIONS.test(title), terms: [] }; out.push(cur); };
  for (const b of chapter.blocks) {
    if (b.heading && FACT_BOX.test(b.text)) { box = { page: b.page, paras: [] }; boxes.push(box); continue; }
    if (b.heading) box = null;
    if (box) { box.paras.push(b.text); continue; }
    if (b.heading && (BOX_LABEL.test(b.text) || (b.text === b.text.toUpperCase() && words(b.text).length <= 4 && !chapter.title.toUpperCase().includes(b.text))) && cur) continue;   // box labels and hands-on activities stay inside their section
    if (b.heading) {
      if (b.text === chapter.title && !cur) { open(b.text, b.page); continue; }
      if (cur && !cur.paras.length && !cur.questions.length) { cur.title = b.text; cur.inQuestions = BOOK_QUESTIONS.test(b.text); continue; }
      open(b.text, b.page); continue;
    }
    if (!cur) open(chapter.title, b.page);
    if (cur.inQuestions || (/\?$/.test(b.text) && words(b.text).length < 40)) { if (/\?$/.test(b.text) && words(b.text).length >= 4) cur.questions.push(b.text.replace(/^\(?\d+[.)]\s*|^\(?[a-e]\)\s*/, '')); if (cur.inQuestions) continue; if (/\?$/.test(b.text)) continue; }
    cur.paras.push(b); cur.terms.push(...(b.terms || []));
  }
  // Fold tiny sections into the one before, and split long ones.
  const merged = [];
  for (const s of out) {
    const n = words(s.paras.map((p) => p.text).join(' ')).length;
    const last = merged[merged.length - 1];
    if (last && n < 70) { last.paras.push(...s.paras); last.questions.push(...s.questions); last.terms.push(...s.terms); } else if (n >= 25 || s.questions.length) merged.push(s);
  }
  const split = [];
  for (const s of merged) {
    let part = { ...s, paras: [], questions: s.questions }, count = 0, k = 1;
    for (const p of s.paras) {
      const n = words(p.text).length;
      if (count + n > 380 && count > 120) { split.push(part); k++; part = { ...s, title: `${s.title}, part ${k}`, paras: [], questions: [], page: p.page }; count = 0; }
      part.paras.push(p); count += n;
    }
    split.push(part);
  }
  const lessons = split.filter((s) => s.paras.length);
  lessons.boxes = boxes;
  return lessons;
}

// A fun fact printed in the book's own box: one to three whole sentences that make sense alone.
export function factFromBox(paras) {
  const text = clean(paras.join(' ')).replace(/^[^.!?]*[!?]\s+(?=[\p{Lu}])/u, (m) => (words(m).length <= 9 ? '' : m));
  const out = []; let n = 0;
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    if (!/^\p{Lu}/u.test(s) || NEEDS_CONTEXT.test(s) || /\b(activity|chapter|page)\b/i.test(s)) break;
    n += words(s).length; if (n > 45) break; out.push(s);
  }
  return out.length && n >= 8 ? out.join(' ') : null;
}

// ---- finding what is worth asking -----------------------------------------------------------------------------------
function sentencesOf(para) {
  return para.text.replace(/\b(e\.g|i\.e|Dr|Mr|Mrs|Ms|St|etc|vs|No)\./g, '$1∙').split(/(?<=[.!?।])["”’]?\s+(?=["“‘]?[\p{Lu}\p{Lo}])/u)
    .map((s) => s.replace(/∙/g, '.').trim()).filter(Boolean).map((text) => ({ text, page: para.page }));
}
// Can this sentence stand alone as a question? It must make sense without the page around it.
const standsAlone = (s) => {
  const n = words(s).length;
  if (!(n >= 6 && n <= 32 && /^[\p{Lu}\p{Lo}]/u.test(s) && /[.।]$/.test(s) && !LOOSE_START.test(s) && !NEEDS_CONTEXT.test(s) && !/[?!:;“”"‘|]|_{2,}|\([^)]*$/.test(s))) return false;
  if (/\p{Script=Devanagari}/u.test(s)) return true;
  return STATES.test(s) && !VAGUE.test(s) && !COMMAND.test(s);
};

const DEFINE = [
  { rx: /^(.{8,120}?) (?:is|are) (?:called|known as|termed|named) (?:an? |the )?([\p{L}][\p{L}' -]{2,40})\.$/u, term: 2, meaning: 1 },
  { rx: /^(?:An? |The )?([\p{L}][\p{L}' -]{2,40}?) (?:is|are|means?|refers? to) (an? .{10,140}|the .{10,140}|.{10,140}that .{4,100})\.$/u, term: 1, meaning: 2 },
];
function definitionOf(sentence) {
  if (!standsAlone(sentence)) return null;
  for (const d of DEFINE) {
    const m = sentence.match(d.rx);
    if (!m) continue;
    const term = m[d.term].trim();
    if (words(term).length > 3 || COMMON.has(term.toLowerCase()) || /^\p{Lu}\p{Ll}+ \p{Lu}\p{Ll}+$/u.test(term) || /\bof the\b/.test(term) || /^(this|that|there|it|one|each|these|which|what)\b/i.test(term)) continue;
    return { term, meaning: m[d.meaning].trim() };
  }
  return null;
}

function chapterTerms(sections, sentences, lang, df = new Map(), chapters = 1) {
  const score = new Map();
  const add = (t, n) => {
    t = t.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '').replace(/^(the|an?) /i, '');
    if (t.length < 3 || words(t).length > 4 || COMMON.has(t.toLowerCase()) || (t === t.toUpperCase() && t.length > 5) || /[|\d]/.test(t) || /(ing|ed|ly|ous|ful|ive|able)$/.test(t.toLowerCase()) && words(t).length === 1 && lang !== 'hi') return;
    const k = t.toLowerCase();
    const was = score.get(k) || { term: k === t.toLowerCase() && /^\p{Lu}\p{Ll}+ /u.test(t) ? t : t, n: 0 };
    was.n += n; score.set(k, was);
  };
  for (const s of sections) for (const t of s.terms) add(t, 6);
  const freq = new Map();
  for (const { text } of sentences) {
    const d = definitionOf(text); if (d) add(d.term, 8);
    for (const w of words(text)) { const k = w.toLowerCase(); if (lang === 'hi' ? w.length >= 4 : (w.length >= 6 && !COMMON.has(k))) freq.set(k, (freq.get(k) || 0) + 1); }
  }
  // A word that fills this chapter but not the others is what this chapter is about.
  for (const [w, n] of freq) if (n >= 3) add(w, chapters > 1 ? n * (1 - ((df.get(w) || 1) - 1) / chapters) ** 3 : n);
  return [...score.values()].sort((a, b) => b.n - a.n).slice(0, 24).map((x) => x.term);
}

function hasTerm(sentence, term) {
  const m = sentence.match(new RegExp(`(^|[^\\p{L}])(${esc(term)})(?=$|[^\\p{L}])`, 'iu'));
  return m ? m[2] : null;
}

// True sums printed in a Maths book. Each is checked here, so a misread line never becomes a wrong answer.
function equationsIn(text) {
  const out = [];
  for (const m of text.matchAll(/(?<![\d.,/])(\d{1,5}) ?([+\-−–×x÷]) ?(\d{1,5}) ?= ?(\d{1,7})(?![\d.,/])/g)) {
    const [a, op, b, c] = [+m[1], m[2], +m[3], +m[4]];
    const v = op === '+' ? a + b : '-−–'.includes(op) ? a - b : '×x'.includes(op) ? a * b : b ? a / b : NaN;
    if (v === c) out.push({ a, op: op === 'x' ? '×' : '-–'.includes(op) ? '−' : op, b, c });
  }
  return out;
}

// ---- making the course ----------------------------------------------------------------------------------------------
function questionsFor(section, sentences, terms, ctx) {
  const { lang, r, base } = ctx; const qs = []; let k = 0; const used = new Set();
  const id = () => `${base}-q${++k}`;
  const note = (s) => `${lang === 'hi' ? 'पुस्तक कहती है' : 'The book says'}: “${s.text}” (${lang === 'hi' ? 'पृष्ठ' : 'page'} ${s.page})`;
  const say = lang === 'hi' ? { fill: 'खाली जगह में कौन-सा शब्द आएगा?', mean: 'इसका अर्थ क्या है' } : { fill: 'Which word fills the blank?', mean: 'What does this mean' };
  const alike = (right) => shuffled(terms.filter((t) => t.toLowerCase() !== right.toLowerCase() && !hasTerm(right, t) && !hasTerm(t, right)), r)
    .sort((a, b) => Math.abs(words(a).length - words(right).length) - Math.abs(words(b).length - words(right).length));
  const good = sentences.filter((s) => standsAlone(s.text));

  // what the book defines
  const defs = good.map((s) => ({ s, d: definitionOf(s.text) })).filter((x) => x.d);
  for (const { s, d } of defs.slice(0, 2)) {
    const wrong = alike(d.term).slice(0, 3);
    if (wrong.length < 3 || !d.meaning || hasTerm(d.meaning, d.term)) continue;
    qs.push({ type: 'mcq', id: id(), difficulty: 1, tags: [d.term], prompt: lang === 'hi' ? `यह किसके बारे में है: “${d.meaning}”?` : `Which word does this describe: “${d.meaning}”?`, options: [d.term, ...wrong], answer: 0, explanation: note(s) });
    used.add(s.text);
  }
  // key sentences with their key word hidden
  for (const s of shuffled(good, r)) {
    if (qs.length >= 5 || used.has(s.text)) continue;
    const t = terms.find((x) => hasTerm(s.text, x));
    if (!t) continue;
    const shown = hasTerm(s.text, t), blank = s.text.replace(shown, '______');
    if (words(blank).length < 6 || blank.startsWith('______ ') && words(t).length > 2) continue;
    const wrong = alike(t).slice(0, 3);
    if (k % 2 === 0 && wrong.length === 3) qs.push({ type: 'mcq', id: id(), difficulty: 2, tags: [t], prompt: `${blank}\n${say.fill}`, options: [shown, ...wrong.map((w) => (/^\p{Lu}/u.test(shown) ? w[0].toUpperCase() + w.slice(1) : w.toLowerCase()))], answer: 0, explanation: note(s) });
    else qs.push({ type: 'fillblank', id: id(), difficulty: 2, tags: [t], prompt: blank, answers: [shown, shown.toLowerCase()], hint: `${shown[0]}${'_'.repeat(Math.max(0, shown.length - 1))}`, explanation: note(s) });
    used.add(s.text);
  }
  // true or false: one true sentence, and one with a key word swapped for another from the chapter
  const left = shuffled(good.filter((s) => !used.has(s.text)), r);
  let trues = 0, falses = 0;
  for (const s of left) {
    if (trues + falses >= 2) break;
    const t = terms.find((x) => hasTerm(s.text, x));
    if (!t) continue;
    used.add(s.text);
    const wrong = trues > falses ? alike(t).find((w) => !hasTerm(s.text, w)) : null;
    if (wrong) { const shown = hasTerm(s.text, t); qs.push({ type: 'truefalse', id: id(), difficulty: 2, tags: [t], prompt: s.text.replace(shown, /^\p{Lu}/u.test(shown) ? wrong[0].toUpperCase() + wrong.slice(1) : wrong), answer: false, explanation: note(s) }); falses++; }
    else { qs.push({ type: 'truefalse', id: id(), difficulty: 1, tags: [t], prompt: s.text, answer: true, explanation: note(s) }); trues++; }
  }
  // match the words with their meanings
  const pairs = []; const seen = new Set();
  for (const { d } of defs) if (!seen.has(d.term.toLowerCase()) && words(d.meaning).length <= 18) { seen.add(d.term.toLowerCase()); pairs.push([d.term, d.meaning]); }
  if (pairs.length >= 3) qs.push({ type: 'matchpairs', id: id(), difficulty: 2, tags: ['words'], prompt: lang === 'hi' ? 'शब्दों को उनके अर्थ से मिलाइए।' : 'Match each word with its meaning.', pairs: pairs.slice(0, 5), explanation: lang === 'hi' ? 'ये अर्थ पुस्तक से हैं।' : 'These meanings come from your book.' });
  // things that happened in order, by the years printed beside them
  const dated = good.map((s) => ({ s, y: s.text.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/g) })).filter((x) => x.y?.length === 1 && !/\bBCE?\b/.test(x.s.text));
  const years = [...new Map(dated.map((x) => [x.y[0], x])).values()].sort((a, b) => a.y[0] - b.y[0]).slice(0, 4);
  if (years.length >= 3) qs.push({ type: 'dragorder', id: id(), difficulty: 3, tags: ['order'], prompt: lang === 'hi' ? 'इन्हें समय के क्रम में लगाइए, सबसे पहले वाला ऊपर।' : 'Put these in order of time, earliest first.', items: years.map((x) => x.s.text), explanation: years.map((x) => x.y[0]).join(', ') });
  // sums printed in the book, with the answer worked out here
  const eqs = [...new Map(sentences.flatMap((s) => equationsIn(s.text).map((e) => ({ ...e, page: s.page }))).map((e) => [`${e.a}${e.op}${e.b}`, e])).values()];
  for (const e of shuffled(eqs.filter((x) => x.a >= 10 && x.b >= 3), r).slice(0, 2)) {
    const near = shuffled([e.c + 1, e.c - 1, e.c + 10, e.c - 10, e.c + 2].filter((v) => v > 0 && v !== e.c), r).slice(0, 3);
    if (near.length < 3) continue;
    qs.push({ type: 'mcq', id: id(), difficulty: 1, tags: ['sums'], prompt: `${e.a} ${e.op} ${e.b} = ?`, options: [String(e.c), ...near.map(String)], answer: 0, explanation: `${e.a} ${e.op} ${e.b} = ${e.c}` });
  }
  return { qs, defs };
}

function workedExamples(section, base) {
  const out = []; const paras = section.paras;
  paras.forEach((p, i) => {
    if (!/^example\s*\d*\b/i.test(p.text)) return;
    let prompt = p.text.replace(/^example\s*\d*[:.\s-]*/i, ''), steps = [];
    const inline = prompt.search(/\bsolution\b\s*[:.]?/i);
    if (inline > 0) { steps = [prompt.slice(inline).replace(/^solution\s*[:.]?\s*/i, '')]; prompt = prompt.slice(0, inline).trim(); }
    else if (/^solution/i.test(paras[i + 1]?.text || '')) steps = [paras[i + 1].text.replace(/^solution\s*[:.]?\s*/i, '')];
    const parts = steps.flatMap((s) => s.split(/(?<=[.=])\s+(?=[\p{Lu}\d(])/u)).map(clean).filter((s) => s.length > 1).slice(0, 7);
    if (prompt.length > 15 && parts.length >= 2) out.push({ type: 'worked', id: `${base}-w${out.length + 1}`, difficulty: 1, tags: ['worked'], kicker: 'From your book', prompt, steps: parts, explanation: `Page ${p.page} of your book.` });
  });
  return out.slice(0, 3);
}

export function makeBook(docs, { title, subject = 'My book', id }) {
  dropRepeats(docs);
  const all = docs.flatMap((d) => d.pages.flatMap((p) => p.lines.map((l) => l.text))).join(' ');
  const letters = all.match(/\p{L}/gu)?.length || 0;
  if (letters < 800) throw new BookError('no-text');
  const devanagari = all.match(/\p{Script=Devanagari}/gu)?.length || 0;
  const lang = devanagari > letters * 0.3 ? 'hi' : 'en';
  // Many Hindi PDFs store letters in an old font's private code, which reads as nonsense once extracted.
  if (lang === 'en' && words(all).filter((w) => !/[aeiouy]/i.test(w) && w.length > 3).length > words(all).length * 0.25) throw new BookError('unreadable');
  const body = bodySize(docs);
  const pid = id || `mybook-${slug(title)}-${Date.now().toString(36)}`;
  const glossary = new Map();
  const chapters = [];
  const parts = splitChapters(docs, body);
  const df = new Map();
  for (const ch of parts) for (const w of new Set(words(ch.blocks.map((b) => b.text).join(' ')).map((x) => x.toLowerCase()))) df.set(w, (df.get(w) || 0) + 1);
  const srcCount = new Map();
  for (const ch of parts) for (const im of ch.images) srcCount.set(im.src, (srcCount.get(im.src) || 0) + 1);
  for (const ch of parts) ch.images = ch.images.filter((im) => srcCount.get(im.src) < 3);   // the same picture again and again is decoration
  for (const ch of parts) {
    // A section with nothing to ask joins the next one, so every lesson has something for the child to do.
    const sections = [];
    let carry = null;
    for (const s of toSections(ch).filter((x) => !SKIP_SECTION.test(x.title))) {
      const merged = carry ? { ...s, title: carry.title, page: carry.page, paras: [...carry.paras, ...s.paras], questions: [...carry.questions, ...s.questions], terms: [...carry.terms, ...s.terms] } : s;
      const askable = merged.paras.flatMap(sentencesOf).filter((x) => standsAlone(x.text)).length;
      const size = words(merged.paras.map((p) => p.text).join(' ')).length;
      if (askable < 2 && size < 700) carry = merged; else { sections.push(merged); carry = null; }
    }
    if (carry) { if (sections.length) { const l = sections[sections.length - 1]; l.paras.push(...carry.paras); l.questions.push(...carry.questions); l.terms.push(...carry.terms); } else sections.push(carry); }
    if (!sections.length) continue;
    const boxFacts = (toSections(ch).boxes || []).map((b) => ({ page: b.page, text: factFromBox(b.paras) })).filter((b) => b.text);
    const allSent = sections.flatMap((s) => s.paras.flatMap(sentencesOf));
    const terms = chapterTerms(sections, allSent, lang, df, parts.length);
    const lessons = [];
    const pool = [];
    let imgAt = 0;
    sections.forEach((s, i) => {
      const base = `${pid}-ch${ch.n}-l${i + 1}`;
      const sentences = s.paras.flatMap(sentencesOf);
      const r = rng(base);
      const { qs, defs } = questionsFor(s, sentences, terms, { lang, r, base });
      for (const { d, s: from } of defs) if (!glossary.has(d.term.toLowerCase())) glossary.set(d.term.toLowerCase(), { term: d.term, meaning: from.text, src: [{ ch: ch.n, p: from.page }] });
      const body2 = s.paras.filter((p) => !/^(example\s*\d*\b|solution\b)/i.test(p.text)).map((p) => p.text).join('\n\n');
      if (words(body2).length < 40 && !qs.length) return;
      const reading = { type: 'passage', id: `${base}-read`, difficulty: 1, tags: ['reading'], title: s.title, body: body2, explanation: lang === 'hi' ? 'अब देखते हैं कि क्या याद रहा।' : 'Now let us see what stuck.' };
      const hook = s.questions[0] ? [{ type: 'hook', id: `${base}-hook`, difficulty: 1, tags: ['hook'], prompt: s.questions[0], explanation: lang === 'hi' ? 'आगे पढ़िए।' : 'Read on to find out.' }] : [];
      const keyWords = defs.slice(0, 4).map((x) => x.s.text);
      const recap = keyWords.length >= 2 ? [{ type: 'concept', id: `${base}-key`, difficulty: 1, tags: ['key words'], title: lang === 'hi' ? 'मुख्य बातें' : 'Key ideas', body: keyWords[0], keyPoints: keyWords.slice(1), explanation: lang === 'hi' ? 'ये पंक्तियाँ आपकी पुस्तक से हैं।' : 'These lines are from your book.' }] : [];
      const worked = workedExamples(s, base);
      const later = s.questions.length > 1 ? [{ type: 'concept', id: `${base}-try`, difficulty: 2, tags: ['book'], title: lang === 'hi' ? 'अपनी पुस्तक से सोचिए' : 'Think about these from your book', body: s.questions[1], keyPoints: s.questions.slice(2, 5), explanation: lang === 'hi' ? 'अपनी कॉपी में लिखकर देखिए।' : 'Try answering in your notebook.' }] : [];
      const image = ch.images.find((im) => im.page >= s.page && im.page >= imgAt) || null;
      if (image) imgAt = image.page + 1;
      lessons.push({
        id: base, title: s.title, estimatedMinutes: Math.max(3, Math.round((words(body2).length / 110) + qs.length * 0.5)),
        activities: [...hook, reading, ...recap, ...worked, ...qs, ...later],
        ...(image ? { topicScene: image.src, sceneAlt: lang === 'hi' ? 'आपकी पुस्तक से एक चित्र।' : 'A picture from your book.', sceneCaption: `${lang === 'hi' ? 'पृष्ठ' : 'From page'} ${image.page}` } : {}),
      });
      pool.push(...qs.filter((q) => ['mcq', 'truefalse'].includes(q.type)));
    });
    if (!lessons.length) continue;
    // each box goes with the lesson it sat beside in the book
    for (const f of boxFacts) {
      const at = [...sections.keys()].filter((i) => sections[i].page <= f.page).pop() ?? 0, l = lessons[Math.min(at, lessons.length - 1)];
      (l.funFacts ||= []).push(f.text);
    }
    const chId = `${pid}-ch${ch.n}`;
    const r = rng(chId);
    chapters.push({
      id: chId, title: ch.title, summary: `In this chapter: ${lessons.slice(0, 4).map((l) => l.title.toLowerCase()).join('; ')}.`, lessons,
      boss: { id: `${chId}-boss`, title: `${lang === 'hi' ? 'अध्याय की चुनौती' : 'Chapter challenge'}: ${ch.title}`, estimatedMinutes: 6, activities: shuffled(pool, r).slice(0, 10).map((q, i) => ({ ...q, id: `${chId}-boss-${i + 1}` })) },
    });
    if (chapters[chapters.length - 1].boss.activities.length < 3) delete chapters[chapters.length - 1].boss;
  }
  if (!chapters.length) throw new BookError('no-lessons');
  return {
    schemaVersion: '1.0', id: pid, title, language: lang, subject: title, grade: 'mine', curriculum: 'My book', version: '1', local: true,
    description: `${title}: made on this device from your PDF.`, sources: [{ title: 'Your own PDF of this book, kept on this device.', url: '' }], units: [{ id: pid, title, chapters }], glossaryData: { terms: [...glossary.values()] },
  };
}

export class BookError extends Error { constructor(code) { super(code); this.code = code; } }
