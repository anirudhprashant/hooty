#!/usr/bin/env python3
"""Turn a textbook PDF into a playable Sparkle course, start to finish, with no hand work.

  python3 tools/ingest-book.py book.pdf --name "Mathematics" --grade 7
  python3 tools/ingest-book.py chapters.zip --name "Science"          # a zip/folder of one-PDF-per-chapter works too
  python3 tools/ingest-book.py https://example.org/book.pdf --name "History"
  python3 tools/ingest-book.py --resume mathematics-g7                 # carry on after a stop

Stages (each saved in work/<slug>/status.json, so the whole thing is resumable and the upload page can show progress):
  extract   pdftotext per page; pages with no text are read with tesseract (OCR). Printed page numbers are found from
            the page itself and fall back to PDF order.
  chapters  one PDF per chapter, else the PDF's own bookmarks, else "Chapter N" headings, else MiniMax-M2.7 reads the
            first lines of every page and proposes the split. M2.7 also names any chapter that has no title.
  lessons   tools/new-chapter.py per chapter (3 at a time): facts checked against the book, lessons drafted and
            fact-checked twice, hooks, pictures with a vision check.
  pack      tools/assemble-pack.py: merge into the app and list it.
  audio     tools/make-audio.py (Microsoft Edge voice; skipped with a note if the network is refused).
  deploy    rsync to $SPARKLE_DEPLOY (e.g. yourhost:/path/to/lumi/) when set.
The book text stays in sources/<slug>/ and is git-ignored: it is the textbook publisher's, not ours to redistribute.
Needs: poppler (pdftotext, pdfinfo, pdftoppm), tesseract (only for scanned pages), qpdf (bookmarks), node, ssh oracle (M2.7).
"""
import argparse, concurrent.futures as cf, glob, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.parse, zipfile
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

def run(cmd, **kw): return subprocess.run(cmd, capture_output=True, text=True, **kw)
def slugify(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

# ---------------------------------------------------------------- status
class Status:
    def __init__(self, slug):
        self.path = f'{ROOT}/work/{slug}/status.json'; os.makedirs(os.path.dirname(self.path), exist_ok=True)
        self.d = json.load(open(self.path)) if os.path.exists(self.path) else {'stages': {}, 'log': []}
    def set(self, stage, state, note=''):
        self.d['stages'][stage] = {'state': state, 'note': note, 'at': time.strftime('%H:%M:%S')}
        self.save(); print(f'[{stage}] {state} {note}', flush=True)
    def done(self, stage): return self.d['stages'].get(stage, {}).get('state') == 'done'
    def save(self): json.dump(self.d, open(self.path, 'w'), indent=1)

# ---------------------------------------------------------------- input
def fetch_inputs(src, tmp):
    if re.match(r'https?://', src):
        dst = f'{tmp}/{os.path.basename(urllib.parse.urlparse(src).path) or "book.pdf"}'
        run(['curl', '-skL', '-m', '600', '-A', 'Mozilla/5.0', '-o', dst, src]); src = dst
    if src.lower().endswith('.zip'):
        with zipfile.ZipFile(src) as z: z.extractall(f'{tmp}/zip')
        src = f'{tmp}/zip'
    if os.path.isdir(src):
        pdfs = sorted(glob.glob(f'{src}/**/*.pdf', recursive=True), key=lambda p: [int(t) if t.isdigit() else t for t in re.split(r'(\d+)', os.path.basename(p))])
    else:
        pdfs = [src]
    if not pdfs: raise SystemExit('no PDF found')
    return pdfs

# ---------------------------------------------------------------- extraction
def page_count(pdf):
    m = re.search(r'Pages:\s+(\d+)', run(['pdfinfo', pdf]).stdout); return int(m.group(1)) if m else 0

DEVANAGARI_MARK_DUPE = re.compile('([ािीुूृॄॅॆेैॉॊोौ्ँंः़ॢॣ])\\1+')  # some NCERT Hindi PDFs' CMap emits every matra twice

def page_text(pdf, i):
    t = run(['pdftotext', '-f', str(i), '-l', str(i), pdf, '-']).stdout
    if len(t.strip()) >= 40: return DEVANAGARI_MARK_DUPE.sub(r'\1', t)
    with tempfile.TemporaryDirectory() as d:  # a scanned page: render and read it
        run(['pdftoppm', '-f', str(i), '-l', str(i), '-r', '200', '-png', pdf, f'{d}/p'])
        img = glob.glob(f'{d}/p*.png')
        return run(['tesseract', img[0], '-', '-l', 'eng']).stdout if img else t

FOOTER = re.compile(r'^.*\.indd\s+\d+.*$|^\s*Reprint 20\d\d-\d\d\s*$|^\s*\d+/\d+/\d{4} [\d:]+ ?[AP]M\s*$', re.M)

def printed_pages(texts):
    """Printed page number of each PDF page. NCERT's typesetting footer ("Unit 2.indd 39") is exact; otherwise a lone
    number in the first or last lines, kept if the run is consistent; otherwise PDF order."""
    foot = [int(m.group(1)) if (m := re.search(r'\.indd\s+(\d+)', t)) else None for t in texts]
    if sum(x is not None for x in foot) >= len(texts) / 2:
        first = next(i for i, x in enumerate(foot) if x is not None)
        out = []
        for i, x in enumerate(foot):
            out.append(x if x is not None else (foot[first] - (first - i) if i < first else out[-1] + 1))
        return out
    cands = []
    for t in texts:
        lines = [l.strip() for l in t.splitlines() if l.strip()]
        edge = lines[:3] + lines[-3:]
        cands.append([int(l) for l in edge if re.fullmatch(r'\d{1,4}', l)])
    votes = {}
    for i, cs in enumerate(cands):
        for c in cs: votes[c - i] = votes.get(c - i, 0) + 1
    if not votes: return list(range(1, len(texts) + 1))
    best = max(votes.items(), key=lambda kv: kv[1])
    off = best[0] if best[1] >= max(3, len(texts) // 10) else 1  # no clear numbering: PDF order
    if off + 0 < 1: off = 1  # a negative first page means the numbers were not page numbers
    return [i + off for i in range(len(texts))]

# ---------------------------------------------------------------- chapter detection
HEAD = re.compile(r'^\s*(chapter|unit|lesson)\s+(\d+|[ivxlc]+)\b', re.I | re.M)

from llm import m27

def outline_chapters(pdf, n):
    j = run(['qpdf', '--json', '--json-key=outlines', '--json-key=pages', pdf])
    try: d = json.loads(j.stdout)
    except Exception: return []
    pages = {p['object']: i + 1 for i, p in enumerate(d.get('pages', []))}
    out = []
    for o in d.get('outlines', []):
        dest = o.get('dest')
        pg = pages.get(dest[0]) if isinstance(dest, list) and dest else None
        if pg: out.append({'title': o.get('title', '').strip(), 'start': pg})
    return out if 3 <= len(out) <= 60 else []

def heading_chapters(texts):
    out = []
    for i, t in enumerate(texts):
        m = HEAD.search('\n'.join(t.splitlines()[:12]))
        if m:
            nxt = [l.strip() for l in t.splitlines()[:25] if l.strip() and not HEAD.match(l) and not re.fullmatch(r'[\d\W]+', l.strip())]
            out.append({'title': nxt[0] if nxt else '', 'start': i + 1})
    return out if len(out) >= 3 else []

def ai_chapters(texts):
    peek = '\n'.join(f'p{i + 1}: ' + re.sub(r'\s+', ' ', t.strip())[:90] for i, t in enumerate(texts))
    d = m27(f'''Below are the first words of every page of a school textbook. Find where each CHAPTER (or unit) starts.
Reply ONLY JSON: {{"chapters": [{{"title": "chapter title", "start": page_number_as_given_after_p}}]}}. Skip the cover, contents, preface, index and answer keys.
{peek[:60000]}''')
    return [{'title': c['title'], 'start': int(c['start'])} for c in (d or {}).get('chapters', [])]

UNIT_LINE = re.compile(r'^\s*(?:Unit|Chapter|Lesson|इकाई|पाठ)\s*\d+\s*[:.\-\u2014]*\s*(.{3,60})$', re.I)

def name_chapters(chs, bodies):
    for i, c in enumerate(chs):  # "Unit 2 Friendship" printed on the first page is the best title there is
        if c['title']: continue
        for line in bodies[i].splitlines()[:6]:
            m = UNIT_LINE.match(line)
            if m: c['title'] = re.sub(r'\s+', ' ', line).strip(); break
    todo = [i for i, c in enumerate(chs) if not c['title'] or len(c['title']) < 3 or c['title'].lower().startswith('chapter')]
    for i in todo:
        d = m27(f'Give the title (2 to 7 words) of the textbook chapter that begins with this text. Reply ONLY JSON {{"title": "..."}}\n\n{bodies[i][:1200]}')
        chs[i]['title'] = (d or {}).get('title') or f'Chapter {i + 1}'
    return chs

# ---------------------------------------------------------------- stages
def stage_extract_chapters(a, slug, st, tmp):
    src_dir = f'{ROOT}/sources/{slug}'
    if st.done('chapters') and os.path.exists(f'{src_dir}/index.json'): return json.load(open(f'{src_dir}/index.json'))
    st.set('extract', 'running')
    pdfs = fetch_inputs(a.input, tmp)
    os.makedirs(f'{src_dir}/chapters', exist_ok=True)
    chapters = []
    if len(pdfs) > 1:  # one PDF per chapter
        for k, pdf in enumerate(pdfs, 1):
            n = page_count(pdf); texts = [page_text(pdf, i) for i in range(1, n + 1)]
            chapters.append({'title': '', 'pages': printed_pages(texts), 'texts': texts})
        how = f'{len(pdfs)} chapter files'
    else:
        pdf = pdfs[0]; n = page_count(pdf)
        with cf.ThreadPoolExecutor(6) as ex: texts = list(ex.map(lambda i: page_text(pdf, i), range(1, n + 1)))
        labels = printed_pages(texts)
        found = outline_chapters(pdf, n); how = 'bookmarks'
        if not found: found, how = heading_chapters(texts), 'headings'
        if not found: found, how = ai_chapters(texts), 'M2.7'
        if not found: raise SystemExit('could not find chapters in this PDF')
        found = sorted({c['start']: c for c in found}.values(), key=lambda c: c['start'])
        for k, c in enumerate(found):
            end = (found[k + 1]['start'] - 1) if k + 1 < len(found) else n
            if end - c['start'] < 1: continue
            chapters.append({'title': c['title'], 'pages': labels[c['start'] - 1:end], 'texts': texts[c['start'] - 1:end]})
    chapters = name_chapters(chapters, ['\n'.join(c['texts'][:2]) for c in chapters])
    index = {'book': a.name, 'publisher': a.publisher, 'chapters': []}
    for k, c in enumerate(chapters, 1):
        open(f'{src_dir}/chapters/ch{k:02d}.txt', 'w').write('\n'.join(f'=== BOOK PAGE {p} ===\n{FOOTER.sub("", t).strip()}\n' for p, t in zip(c['pages'], c['texts'])))
        index['chapters'].append({'chapter': k, 'title': c['title'], 'theme': 'A', 'themeTitle': a.name, 'firstPage': c['pages'][0], 'bookPages': [c['pages'][0], c['pages'][-1]], 'file': f'chapters/ch{k:02d}.txt'})
    json.dump(index, open(f'{src_dir}/index.json', 'w'), indent=1)
    st.set('extract', 'done', f'{sum(len(c["texts"]) for c in chapters)} pages'); st.set('chapters', 'done', f'{len(chapters)} chapters from {how}')
    return index

def register(slug, a):
    p = f'{HERE}/subjects.json'; reg = json.load(open(p)) if os.path.exists(p) else {}
    reg[slug] = {'name': a.name, 'source': slug, 'pack': f'{slug}', 'work': f'work/{slug}', 'grade': a.grade, 'language': a.language, 'calc': bool(a.calc)}
    json.dump(reg, open(p, 'w'), indent=1)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input', nargs='?'); ap.add_argument('--name'); ap.add_argument('--grade', default='6')
    ap.add_argument('--publisher', default=''); ap.add_argument('--language', default='en'); ap.add_argument('--calc', action='store_true', help='mathematics: add computed practice problems'); ap.add_argument('--resume'); ap.add_argument('--slug')
    ap.add_argument('--jobs', type=int, default=3); ap.add_argument('--no-audio', action='store_true'); ap.add_argument('--extract-only', action='store_true')
    a = ap.parse_args()
    if a.resume:
        slug = a.resume; known = json.load(open(f'{HERE}/subjects.json'))[slug]; a.name = a.name or known['name']
        a.grade = known.get('grade', a.grade); a.language = known.get('language', a.language); a.calc = a.calc or bool(known.get('calc'))   # a resume must not forget what the book is
        a.input = a.input or ''
    else:
        if not a.input or not a.name: ap.error('give a PDF (or zip, folder, URL) and --name')
        slug = a.slug or f'{slugify(a.name)}-g{a.grade}'
    if not a.resume and os.path.exists(f'{ROOT}/sources/{slug}/index.json'):
        raise SystemExit(f'{slug} already exists: use --resume {slug}, or a different --name or --slug')
    st = Status(slug); tmp = tempfile.mkdtemp(prefix='ingest-')
    try:
        index = stage_extract_chapters(a, slug, st, tmp)
        register(slug, a)
        if a.extract_only: return
        env = {**os.environ, 'SPARKLE_SUBJECT': slug}
        if not st.done('lessons'):
            st.set('lessons', 'running', f"0/{len(index['chapters'])} chapters")
            def one(c):
                r = subprocess.run([sys.executable, f'{HERE}/new-chapter.py', str(c['chapter'])], env=env, cwd=ROOT, capture_output=True, text=True)
                open(f'{ROOT}/work/{slug}/run-ch{c["chapter"]:02d}.log', 'w').write(r.stdout + r.stderr)
                ok = os.path.exists(f'{ROOT}/work/{slug}/ch{c["chapter"]:02d}/ship/boss.json')
                st.set('lessons', 'running', f"chapter {c['chapter']} {'ready' if ok else 'FAILED (see run-ch log)'}")
                return ok
            with cf.ThreadPoolExecutor(a.jobs) as ex: res = list(ex.map(one, index['chapters']))
            failed = [c for c, ok in zip(index['chapters'], res) if not ok]
            if failed:  # most failures are a bad reply from the model: one more go before giving up
                st.set('lessons', 'running', f'retrying {len(failed)} chapter(s)')
                with cf.ThreadPoolExecutor(a.jobs) as ex: again = list(ex.map(one, failed))
                res = [ok or (c in failed and again[failed.index(c)]) for c, ok in zip(index['chapters'], res)]
            st.set('lessons', 'done' if all(res) else ('partial' if any(res) else 'failed'), f'{sum(res)}/{len(res)} chapters ready')
            if not any(res):
                st.set('finished', 'failed', 'no chapter produced lessons: is this a prose textbook (not an answer key or workbook)? see work/%s/run-ch*.log' % slug); return
        subprocess.run([sys.executable, f'{HERE}/group-chapters.py'], env=env, cwd=ROOT, capture_output=True, text=True)  # themed sections for the Trail
        st.set('pack', 'running')
        out = subprocess.run([sys.executable, f'{HERE}/assemble-pack.py'], env=env, cwd=ROOT, capture_output=True, text=True)
        st.set('pack', 'done' if out.returncode == 0 else 'failed', out.stdout.strip().splitlines()[-1] if out.stdout.strip() else out.stderr[-200:])
        if not a.no_audio:
            st.set('audio', 'running')
            venv = f'{ROOT}/.venv-audio'
            if not os.path.exists(venv + '/bin/edge-tts'):
                subprocess.run([sys.executable, '-m', 'venv', venv]); subprocess.run([venv + '/bin/pip', '-q', 'install', 'edge-tts'])
            r = subprocess.run([venv + '/bin/python', f'{HERE}/make-audio.py'], cwd=ROOT, capture_output=True, text=True)
            st.set('audio', 'done' if r.returncode == 0 else 'skipped', (r.stdout.strip().splitlines() or [r.stderr[-120:]])[-1])
        if os.environ.get('SPARKLE_DEPLOY'):
            st.set('deploy', 'running')
            r = subprocess.run([sys.executable, f'{HERE}/publish.py', '--no-build'], cwd=ROOT, capture_output=True, text=True)
            st.set('deploy', 'done' if r.returncode == 0 else 'failed', (r.stdout.strip().splitlines() or [r.stderr[-120:]])[-1])
        partial = st.d['stages'].get('lessons', {}).get('state') == 'partial'
        st.set('finished', 'partial' if partial else 'done', f'pack {slug} is in the app' + (', with some chapters missing; run --resume' if partial else ''))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

main()
