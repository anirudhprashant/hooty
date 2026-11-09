#!/usr/bin/env python3
"""Set up one NCERT chapter end to end. Claude tokens: none. MiniMax-M2.7 (via oracle) writes the words;
everything that decides what is TRUE is plain code that checks the book text.

  python3 tools/new-chapter.py 3            # runs every stage, skipping any already done
  python3 tools/new-chapter.py 3 --from review

Stages, each writing into work/sst6/chNN/ (delete a file to redo its stage):
  facts    M2.7 reads the chapter and proposes lessons, facts and glossary terms, each with a verbatim
           evidence phrase. fact-pages.mjs finds the real book page and DROPS anything the book does not say.
  draft    M2.7 writes each lesson from its fact sheet only.
  verify   verify-sources.mjs; any activity with an error (an unsourced number, a wrong phrase) is deleted.
  review   a second M2.7 pass fact-checks every answer key against the book; flagged activities are deleted.
  ship     writes work/sst6/chNN/ship/*.json (+ glossary) for tools/assemble-pack.py.
  calc     Mathematics only: computed practice problems (tools/calc-problems.py)
  reading  tools/add-reading.py: a curiosity hook for every lesson.
  images   tools/find-images.py: an accurate, credited picture for every lesson.
Afterwards: python3 tools/assemble-pack.py, tools/make-audio.py (home network), then rsync to oracle.
Needs: ssh oracle (for M2.7), node. Deleting beats fixing: a lesson needs at least 7 activities left or the
stage fails loudly for a human.
"""
import glob, json, os, re, subprocess, sys, time
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__)))
from subjects import S as SUBJ, LANG_NOTE
os.environ['SPARKLE_SOURCE'] = SUBJ['source']  # for the node tools that read the book text
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = int(sys.argv[1]); NN = f'{N:02d}'
W = f"{ROOT}/{SUBJ['work']}/ch{NN}"; os.makedirs(W, exist_ok=True)
INDEX = json.load(open(f'{ROOT}/sources/{SUBJ["source"]}/index.json'))
CH = next(c for c in INDEX['chapters'] if c['chapter'] == N)
TEXT = open(f'{ROOT}/sources/{SUBJ["source"]}/chapters/ch{NN}.txt').read()
START = {a: i for i, a in enumerate(['facts', 'draft', 'verify', 'review', 'calc', 'ship', 'reading', 'images', 'deep', 'explore'])}
start = START[sys.argv[sys.argv.index('--from') + 1]] if '--from' in sys.argv else 0
def log(*a): print(f'[ch{NN}]', *a, flush=True)

from llm import m27 as _m27

def m27(prompt, want_json=True):
    r = _m27(prompt, want_json, on_retry=lambda n, why: log('m27 retry', n, why))
    if r is None: raise SystemExit('M2.7 failed: ' + prompt[:60])
    return r

FACTS_MODEL = os.environ.get('HOOTY_FACTS_MODEL', '')

def facts_text(prompt):
    """The fact sheet is one large reply. A strong model on the router writes it in a single call in about
    80 s, where a small one either 500s at that size or needs eight small calls to get there."""
    if FACTS_MODEL.startswith('anon/'):
        import llm as _l
        r = _l.anon(prompt, model=FACTS_MODEL[len('anon/'):], want_json=False, tries=2,
                    on_retry=lambda n, why: log('facts retry', n, why))
        if r is None: raise SystemExit('facts model failed: ' + prompt[:60])
        return r
    return m27(prompt, want_json=False)

def node(*args):
    return subprocess.run(['node', *args], cwd=ROOT, capture_output=True, text=True).stdout

# ---------------------------------------------------------------- facts
def parse_facts(text):
    """Plain-text facts -> the dict the rest of the pipeline expects. Pipes cannot clash with quotes in the book."""
    lessons, glossary, cur, in_gloss = [], [], None, False
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('```'): continue
        if line.startswith('#'):
            title = line.lstrip('#').strip()
            title = re.sub(r'^lesson\s+\d+\s*[:.)\-\u2013]\s*', '', title, flags=re.I)   # models like to number them
            if title.upper().startswith('GLOSSARY'): in_gloss = True; continue
            in_gloss = False; cur = {'title': title, 'facts': []}; lessons.append(cur); continue
        parts = [p.strip() for p in line.split('|||')]
        if in_gloss and len(parts) >= 4:
            glossary.append({'term': parts[0], 'aka': [x.strip() for x in parts[1].split(';') if x.strip()], 'meaning': parts[2], 'ev': parts[3]})
        elif cur is not None and not in_gloss and len(parts) >= 2:
            cur['facts'].append({'say': parts[0], 'ev': parts[1]})
    return {'lessons': lessons, 'glossary': glossary}

def _finish_facts(text):
    """Parse a facts sheet, attach fact ids, verify every evidence phrase against the book."""
    d = parse_facts(text or '')
    for i, l in enumerate(d['lessons'], 1):
        for j, f in enumerate(l['facts'], 1): f['id'] = f'{i}.{j}'
    json.dump(d, open(f'{W}/facts_raw.json', 'w'), indent=1)
    print(node('tools/fact-pages.mjs', str(N), f'{W}/facts_raw.json').strip())
    return json.load(open(f'{W}/facts_raw.json'))

def facts_chunked():
    """Same fact sheet as stage_facts, asked for in pieces.

    A single reply of about ten thousand tokens is what a small model on a router keeps failing on (HTTP 500
    on glm-5.3-flash, truncated output on gpt-oss-20b, both 9 Nov). The plan, each lesson and the glossary are
    small replies, so each one lands, and the assembles sheet is identical to what the one-shot prompt wants.
    """
    grade = SUBJ.get('grade', '6')
    head = (f"You are preparing a Class {grade} {SUBJ['name']} chapter for a children's learning game. "
            f"The CHAPTER TEXT below is the only source of truth.\nChapter {N}: {CH['title']}.\n{LANG_NOTE}\n")
    tail = f"\n\nCHAPTER TEXT:\n{TEXT}"
    plan = m27(head + "List 5 or 6 lessons that follow the chapter's own sections in order (a lesson is a coherent "
                "chunk a child can do in 5 minutes).\nReply with ONLY the lesson titles, one per line, no numbers, "
                "no other text." + tail, want_json=False) or ''
    titles = [re.sub(r'^[\s#*\-\d.)]+', '', t).strip(' *') for t in plan.splitlines() if t.strip()]
    titles = [t for t in titles if 3 < len(t) < 90][:6]
    if len(titles) < 4: raise RuntimeError(f'lesson plan came back with {len(titles)} usable titles')
    rows = []
    for t in titles:
        body = m27(head + f'Write the FACTS for the lesson "{t}".\nGive 9 to 12 facts that the chapter states. One '
                    "fact per line, in exactly this format:\nplain sentence in your own words ||| 4 to 12 consecutive "
                    "words copied exactly from the chapter text\nNo headings, no numbering, no JSON." + tail,
                    want_json=False) or ''
        lines = [l.strip() for l in body.splitlines() if l.count('|||') >= 1]
        rows.append('## ' + t); rows += lines
        log('facts chunk', t[:40], len(lines))
    gl = m27(head + "List 12 to 16 GLOSSARY terms the chapter explains, one per line, in exactly this format:\n"
              "term ||| other forms separated by ; (or leave empty) ||| one short plain meaning sentence ||| 4 to 12 "
              "words copied exactly from the chapter text\nNo headings, no numbering." + tail, want_json=False) or ''
    gloss = [l.strip() for l in gl.splitlines() if l.count('|||') >= 3]
    rows.append('## GLOSSARY'); rows += gloss
    log('facts glossary lines', len(gloss))
    return '\n'.join(rows)

def stage_facts():
    if os.path.exists(f'{W}/facts.json'): return
    if os.environ.get('HOOTY_FACTS_CHUNKED') == '1' and not FACTS_MODEL:
        for attempt in range(2):
            d = _finish_facts(facts_chunked())
            if len(d['lessons']) >= 4: break
            log('too few lessons survived, retrying')
        else:
            raise SystemExit('facts stage could not produce 4 verified lessons')
    else:
        prompt = f"""You are preparing a Class {SUBJ.get('grade', '6')} {SUBJ['name']} chapter for a children's learning game. The CHAPTER TEXT below is the only source of truth.
Chapter {N}: {CH['title']}.

{LANG_NOTE}
Plan 5 or 6 lessons that follow the chapter's own sections in order (a lesson is a coherent chunk a child can do in 5 minutes).
For each lesson list 9 to 12 FACTS. Each fact has:
  "say": ONE plain sentence in your own words (simple British-Indian English, for a {5 + int(SUBJ.get('grade', '6'))}-year-old),
  "ev": an EXACT run of 4 to 12 consecutive words copied character for character from the chapter text (one line, no line breaks, no page numbers). If you cannot copy it exactly, choose a different phrase.
Also list 12 to 16 GLOSSARY terms (words a child may not know that the chapter explains), each with "term", "aka" (list of other forms, may be empty), "meaning" (one short plain sentence, original words, optionally with a tiny example) and "ev" (exact words from the chapter).
Only facts that the chapter states. No outside knowledge. Use BCE/CE, never BC/AD. Skip pure page furniture (figure captions, page numbers, 'Let's explore' prompts) unless they state a fact.

Reply in EXACTLY this plain-text format (no JSON, no markdown, no numbering):
## Lesson title
say sentence ||| evidence words
say sentence ||| evidence words
(one fact per line; a new "## " line starts the next lesson)
## GLOSSARY
term ||| other forms separated by ; (or leave empty) ||| meaning sentence ||| evidence words

CHAPTER TEXT:
{TEXT}"""
    for attempt in range(3):
        d = _finish_facts(facts_text(prompt))
        if len(d['lessons']) >= 4: break
        log('too few lessons survived, retrying')
    else:
        raise SystemExit('facts stage could not produce 4 verified lessons')
    lessons = []
    for i, l in enumerate(d['lessons'], 1):
        facts = [{'id': f'{i}.{j}', 'p': f['p'], 'say': f['say'], 'ev': f['ev']} for j, f in enumerate(l['facts'], 1)]
        lessons.append({'id': f'l{i}', 'title': l['title'], 'facts': facts})
    json.dump({'chapter': N, 'title': CH['title'], 'lessons': lessons, 'extra': []}, open(f'{W}/facts.json', 'w'), indent=1, ensure_ascii=False)
    g = [{'term': t['term'], **({'aka': t['aka']} if t.get('aka') else {}), 'meaning': t['meaning'], 'src': [{'ch': N, 'p': t['p'], 'ev': t['ev']}]} for t in d.get('glossary', [])]
    json.dump({'terms': g}, open(f'{W}/glossary.json', 'w'), indent=1, ensure_ascii=False)
    log('facts:', [len(l['facts']) for l in lessons], 'glossary', len(g))

# ---------------------------------------------------------------- draft
def brief():
    b = open(f'{ROOT}/work/sst6/ch02/BRIEF.md').read()
    return LANG_NOTE + '\n' + b.replace('ch2-', f'ch{N}-').replace('Social Science', SUBJ['name']).replace('Class 6', 'Class ' + SUBJ.get('grade', '6')).replace('11-year-old', str(5 + int(SUBJ.get('grade', '6'))) + '-year-old')

def stage_draft():
    facts = json.load(open(f'{W}/facts.json')); b = brief()
    os.makedirs(f'{W}/draft', exist_ok=True)
    jobs = [(l['id'], f"ch{N}-l{l['id'][1:]}", l['title'], 9, l['facts']) for l in facts['lessons']]
    jobs.append(('boss', f'ch{N}-boss', f"Chapter challenge: {facts['title']}", 10, [f for l in facts['lessons'] for f in l['facts']]))
    def run(job):
        key, lid, title, n, fl = job
        out = f'{W}/draft/{key}.json'
        if os.path.exists(out): return
        p = [b, f"\n---\nWrite the lesson now. Lesson id: {lid}. Lesson title: {title}. Write exactly {n} activities."
             + (" This is the chapter challenge: no concept cards, all difficulty 2 to 3, mixing the whole chapter, and a mix of mcq, truefalse, fillblank, matchpairs, dragorder." if key == 'boss' else " Start with one concept card.")
             + "\nReply with ONLY the JSON object (no markdown fence, no commentary).\n\nFACT SHEET (use only these):"]
        p += [f"- FACT {f['id']} (page {f['p']}): {f['say']}" for f in fl]
        data = m27('\n'.join(p))
        json.dump(data, open(out, 'w'), indent=1, ensure_ascii=False); log('drafted', key, len(data.get('activities', [])))
    with ThreadPoolExecutor(3) as ex: list(ex.map(run, jobs))

# ---------------------------------------------------------------- verify + review
def lessons_dir():
    os.makedirs(f'{W}/lessons', exist_ok=True)
    for f in glob.glob(f'{W}/draft/*.json'):
        name = os.path.basename(f)
        dst = f'{W}/lessons/' + (name[1:] if re.match(r'l\d+\.json', name) else name)
        if not os.path.exists(dst): open(dst, 'w').write(open(f).read())

def compile_all():
    node('tools/compile-lessons.mjs', f'{W}/facts.json', f'{W}/lessons', f'{W}/built')

def drop(ids, why):
    if not ids: return
    for f in glob.glob(f'{W}/lessons/*.json'):
        d = json.load(open(f)); before = len(d['activities'])
        d['activities'] = [a for a in d['activities'] if a['id'] not in ids]
        if len(d['activities']) != before:
            json.dump(d, open(f, 'w'), indent=1, ensure_ascii=False); log(why, 'dropped', sorted(i for i in ids if any(a['id'] == i for a in [])) or len(ids))

def stage_verify():
    lessons_dir(); compile_all()
    out = node('tools/verify-sources.mjs', *glob.glob(f'{W}/built/*.json'))
    bad = set(re.findall(r'^ERROR .*?/(ch\d+-[\w-]+?):', out, re.M))
    log('verify errors:', len(bad)); drop(bad, 'verify')
    json.dump(sorted(bad), open(f'{W}/dropped-verify.json', 'w'))

REVIEW = """You are a meticulous fact-checker and a Class 6 teacher. Below is the TEXTBOOK CHAPTER (the only source of truth), then a LESSON written for 11-year-olds. Be strict. Check every activity:
1. Is the answer key correct according to the chapter? (mcq "answer" is the index of the correct option; truefalse "answer"; fillblank "answers"; matchpairs pairs are [left,right]; dragorder items are in the correct order.)
2. Is anything in a question, option, concept card or explanation NOT supported by the chapter, or contradicting it? (Simple arithmetic that follows is fine.)
3. Could a careful child defend a DIFFERENT option as correct (ambiguous)?
4. Is anything confusing, unfair, or too hard for age 11?
Reply as a numbered list "activity id: problem". Do not list fine activities. If all is fine reply exactly: NO PROBLEMS FOUND.
The **double stars** are highlight markers; ignore them.

TEXTBOOK CHAPTER:
{chapter}

LESSON (JSON):
{lesson}
"""

def stage_review():
    lessons_dir(); compile_all()
    os.makedirs(f'{W}/review', exist_ok=True)
    def run(f):
        name = os.path.basename(f)[:-5]; out = f'{W}/review/{name}.md'
        if os.path.exists(out): return
        d = json.load(open(f))
        for a in d['activities']: a.pop('src', None); a.pop('derived', None)
        open(out, 'w').write(m27(REVIEW.replace('a Class 6 teacher', 'a Class ' + SUBJ.get('grade', '6') + ' teacher').replace('11-year-olds', str(5 + int(SUBJ.get('grade', '6'))) + '-year-olds').format(chapter=TEXT, lesson=json.dumps(d, indent=1, ensure_ascii=False)), want_json=False) + '\n')
    with ThreadPoolExecutor(3) as ex: list(ex.map(run, glob.glob(f'{W}/built/*.json')))
    flagged = set()
    for f in glob.glob(f'{W}/review/*.md'):
        t = open(f).read()
        if 'NO PROBLEMS FOUND' in t and len(t) < 60: continue
        flagged |= set(re.findall(rf'(ch{N}-[\w-]+?)(?=[:\s,)])', t))
    # never delete a lesson's opening concept card for a wording quibble
    flagged = {i for i in flagged if not re.search(r'-a1$', i)}
    log('review flagged:', sorted(flagged)); drop(flagged, 'review')
    json.dump(sorted(flagged), open(f'{W}/dropped-review.json', 'w'))

# ---------------------------------------------------------------- ship
class Thin(Exception):
    pass

def stage_ship():
    compile_all()
    node('tools/compile-lessons.mjs', f'{W}/facts.json', f'{W}/lessons', f'{W}/ship', '--strip-ev')
    thin = []
    for f in sorted(glob.glob(f'{W}/ship/*.json')):
        d = json.load(open(f)); d['estimatedMinutes'] = 6 if 'boss' in f else 5
        if sum(1 for a in d['activities'] if a['type'] != 'concept') < 6: thin.append(os.path.basename(f))
        json.dump(d, open(f, 'w'), indent=1, ensure_ascii=False)
    if thin: raise Thin(thin)
    out = node('tools/verify-sources.mjs', *glob.glob(f'{W}/built/*.json'), '--glossary', f'{W}/glossary.json')
    log(out.strip().splitlines()[-1])
    log('ship ready; now: python3 tools/assemble-pack.py')

def stage_reading():
    subprocess.run(['python3', f'{ROOT}/tools/add-reading.py', str(N)], check=False)

def stage_images():
    subprocess.run(['python3', f'{ROOT}/tools/find-images.py', str(N)], check=False)

def stage_deep():
    subprocess.run(['python3', f'{ROOT}/tools/deepen.py', str(N)], check=False)

def stage_explore():
    # Simulations are matched to lessons by rule (tools/explore-kits.mjs), with no model calls, for every subject.
    # tools/add-explore.py (the model picks) is kept for one-off use only.
    slug = os.environ.get('SPARKLE_SUBJECT', '')
    subprocess.run(['node', f'{ROOT}/tools/auto-explore.mjs', slug, f'--ch={N}'], check=False)

def stage_calc():
    if SUBJ.get('calc'): subprocess.run(['python3', f'{ROOT}/tools/calc-problems.py', str(N)], check=False)

STAGES = [stage_facts, stage_draft, stage_verify, stage_review, stage_calc, stage_ship, stage_reading, stage_images, stage_deep, stage_explore]
CORE = (1, 5)   # draft .. ship: re-run for any lesson that lost too many activities to the checks

def redo(thin):
    for name in thin:
        key = name[:-5]
        for f in (f'{W}/draft/{"l" + key if key.isdigit() else key}.json', f'{W}/lessons/{key}.json', f'{W}/built/{key}.json', f'{W}/review/{key}.md', f'{W}/ship/{key}.json'):
            if os.path.exists(f): os.remove(f)

i = start
while i < len(STAGES):
    log('stage', STAGES[i].__name__[6:])
    try:
        STAGES[i]()
    except Thin as t:
        attempts = globals().get('attempts', 0) + 1; globals()['attempts'] = attempts
        if attempts > 3: raise SystemExit(f'lessons still too thin after 3 redrafts: {t.args[0]}')
        log('redrafting thin lessons:', t.args[0]); redo(t.args[0]); i = CORE[0]; continue
    i += 1
