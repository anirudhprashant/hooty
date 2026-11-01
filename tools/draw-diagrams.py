#!/usr/bin/env python3
"""Draw a simple teaching diagram for every lesson that has no accurate photograph.

Abstract topics (number patterns, angles, palindromes) have no honest photo on Wikimedia Commons, and
sharing a sibling lesson's picture is worse than a diagram that shows the idea. For each lesson with no
entry in work/<book>/chNN/images.json this asks MiniMax-M2.7 to write ONE SVG from the lesson's own fact
sheet, renders it, and keeps it only if MiniMax's vision model confirms it shows the concept correctly.

  SPARKLE_SUBJECT=mathematics-g6 python3 tools/draw-diagrams.py            # all chapters
  SPARKLE_SUBJECT=mathematics-g6 python3 tools/draw-diagrams.py 3          # one chapter

English-language books only (a diagram's labels would otherwise need translating). The result is written as an
images.json entry whose credit says it is a diagram drawn for Hooty, so it is never mistaken for a photograph.
The SVG is code, not a bitmap: it is checked to contain no scripts, links or external references.
"""
import glob, hashlib, json, os, re, subprocess, sys, tempfile
import xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from subjects import S as SUBJ
from llm import m27, vision
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA = f"{ROOT}/public/content/packs/{SUBJ['pack']}/media"; os.makedirs(MEDIA, exist_ok=True)
CHROME = '/usr/bin/chromium'
MIN_SCORE = int(os.environ.get('DIAGRAM_MIN', '9'))  # the vision model passes some overlapping labels at 8, so 9 is the bar
only = [int(a) for a in sys.argv[1:] if a.isdigit()]
if SUBJ.get('language', 'en') != 'en':
    sys.exit('Diagrams are drawn for English books only.')

BAD = re.compile(r'<script|<foreignObject|<image|<a[\s>]|href\s*=|xlink:|\bon\w+\s*=|javascript:|@import|url\(\s*[\'"]?https?:', re.I)


def clean_svg(svg):
    """The SVG text if it is a small, self-contained drawing; else None."""
    svg = (svg or '').strip()
    if not svg.startswith('<svg') or len(svg) > 40000 or BAD.search(svg): return None
    try: root = ET.fromstring(svg)
    except ET.ParseError: return None
    if not root.tag.endswith('svg'): return None
    if 'viewBox' not in root.attrib: svg = svg.replace('<svg', '<svg viewBox="0 0 800 500"', 1)
    if 'width=' not in svg.split('>', 1)[0]: svg = svg.replace('<svg', '<svg width="800" height="500"', 1)  # an intrinsic size, so it lays out like a picture
    if 'xmlns=' not in svg.split('>', 1)[0]: svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"', 1)
    return svg


def render(svg, out_png):
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False) as f:
        f.write(f'<html><body style="margin:0;background:#fff">{svg}</body></html>'); page = f.name
    subprocess.run([CHROME, '--headless', '--no-sandbox', '--disable-gpu', f'--screenshot={out_png}',
                    '--window-size=800,500', '--hide-scrollbars', f'file://{page}'], capture_output=True, timeout=60)
    os.unlink(page)
    return os.path.exists(out_png)


def check(png, title, facts):
    out = vision(png, f'This is a teaching diagram for a {5 + int(SUBJ.get('grade', '6'))}-year-old, for a lesson called "{title}". The lesson says: {facts[:500]}\n'
                      'Judge it strictly: (1) does it correctly show the idea, with every number, angle and label right? (2) is it clear, uncluttered '
                      'and readable, with no overlapping or cut-off text and nothing outside the frame? (3) is every group of shapes labelled so a child knows what it shows (give 5 or less if any group is unlabelled)? (4) is any box empty, or does any text touch or cross an edge (give 6 or less if so)? (5) is it bright and child-friendly? '
                      'Reply exactly as: SCORE: n - short reason (1-10; give 8+ only if it is correct, clear and pleasant).')
    if not out: return None, 'vision unreachable'
    m = re.search(r'SCORE:\s*(\d+)\s*-?\s*(.*)', out)
    return (int(m.group(1)), m.group(2).strip()[:140]) if m else (None, 'unreadable: ' + out[:60])


def work_on(job):
    n, lesson, store, out_path = job
    key = lesson['id'][1:]; title = lesson['title']
    sheet = '\n'.join(f"- {f['say']}" for f in lesson['facts'])
    for attempt in range(3):
        ask = f"""Draw ONE diagram that teaches "{title}" to a {5 + int(SUBJ.get('grade', '6'))}-year-old, as a single SVG.
Use ONLY facts from this sheet (every number, angle or label in the drawing must come from it or follow directly from it):
{sheet}

Rules: viewBox="0 0 800 500", no width/height attributes. Flat bright colours on a soft light background rectangle that fills the whole frame
(for example #fff7e8, with shapes in #ff7a59 #ffb703 #3a86ff #06a77d #8338ec and dark ink #2a1a4a). Thick strokes (4 to 8), big simple shapes,
at most 10 text labels, each label at least 28px, font-family sans-serif, fill #2a1a4a, kept well inside the frame and not overlapping anything.
Every separate group of shapes or lines MUST carry its own short label that says what it is (for example "Squares: 1, 4, 9, 16"), so nothing is left for the child to guess. Use at most 6 groups; leave a 24px margin inside every box and frame so no text touches an edge; a group must never be an empty box, so draw its shapes big enough to see. Show the idea itself (angles as arcs with degree labels, sequences as growing rows of dots or squares, a number line, a grid) and not a table of words.
No scripts, no links, no external files, no <image>, no gradients needed.
Reply with ONLY JSON: {{"svg": "<svg ...>...</svg>", "alt": "one sentence describing the diagram for a screen reader", "caption": "one short sentence for a child"}}
If this topic cannot be shown as a clear diagram from the facts, reply {{"none": true}}."""
        d = m27(ask)
        if not d or d.get('none'): print('skip', f'ch{n}-{key}', title, '(no diagram)', flush=True); return
        svg = clean_svg(d.get('svg'))
        if not svg: print('retry', f'ch{n}-{key}', 'bad svg', flush=True); continue
        png = tempfile.mktemp(suffix='.png')
        if not render(svg, png): print('retry', f'ch{n}-{key}', 'render failed', flush=True); continue
        score, why = check(png, title, sheet); os.unlink(png)
        print(f'ch{n}-{key} attempt {attempt + 1}: score {score} - {why}', flush=True)
        if score is None: print('vision unavailable: not keeping unchecked art'); return
        if score >= MIN_SCORE:
            name = f"ch{n}-l{key[1:] if key.startswith('l') else key}-diagram-{hashlib.sha1(svg.encode()).hexdigest()[:6]}.svg"
            open(f'{MEDIA}/{name}', 'w', encoding='utf-8').write(svg)
            store[key] = {'file': f'media/{name}', 'alt': d.get('alt', title), 'caption': d.get('caption', ''),
                          'credit': {'text': 'Diagram drawn for Hooty from the lesson text', 'url': ''}, 'kind': 'diagram'}
            json.dump(store, open(out_path, 'w'), ensure_ascii=False, indent=1)
            return
    print('gave up', f'ch{n}-{key}', title, flush=True)


jobs = []
for d in sorted(glob.glob(f"{ROOT}/{SUBJ['work']}/ch[0-9][0-9]")):
    n = int(d[-2:])
    if only and n not in only: continue
    if not os.path.exists(f'{d}/facts.json'): continue
    out_path = f'{d}/images.json'
    store = json.load(open(out_path)) if os.path.exists(out_path) else {}
    for lesson in json.load(open(f'{d}/facts.json'))['lessons']:
        if lesson['id'][1:] not in store: jobs.append((n, lesson, store, out_path))
print(len(jobs), 'lessons without a picture')
# chapters share one store dict per file, so run a chapter's lessons one after another
by_ch = {}
for j in jobs: by_ch.setdefault(j[0], []).append(j)
with ThreadPoolExecutor(2) as ex: list(ex.map(lambda js: [work_on(j) for j in js], by_ch.values()))
