#!/usr/bin/env python3
"""Fun facts with no AI: the textbooks already print them in boxes ("Fascinating facts", "Did you know?"). This lifts each box
out of the extracted book text and puts it on the lesson it sat beside. Nothing to check against a model, nothing to pay for,
and every fact is the book's own. Safe to re-run.   python3 tools/boxfacts.py
Facts are kept in work/funfacts/<pack>.json beside the ones made by tools/funfacts.py, and assemble-pack.py publishes both."""
import glob, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from subjects import SUBJECTS
import funfacts

HEAD = re.compile(r'^(FASCINATING FACTS?|DID YOU KNOW\??|FUN FACTS?|INTERESTING FACTS?|AMAZING FACTS?)\s*$', re.I)
STOP = re.compile(r'^([A-Z][A-Z \-\'’!?]{5,}|Activity \d|Table \d|Fig\. ?\d|Let us |Keep |Think |=== BOOK PAGE)', re.M)
BAD = re.compile(r'\b(activity|chapter|page|figure|fig\.|table|exercise|you|your)\b|[|?]', re.I)
LIG = {'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi'}

def clean(t):
    for a, b in LIG.items(): t = t.replace(a, b)
    return re.sub(r'\s+', ' ', t).strip()

def boxes(text):
    page = 0; out = []; lines = text.split('\n'); i = 0
    while i < len(lines):
        m = re.match(r'=== BOOK PAGE (\d+)', lines[i])
        if m: page = int(m.group(1))
        if HEAD.match(lines[i].strip()):
            j = i + 1; body = []
            while j < len(lines) and len(body) < 14:
                if STOP.match(lines[j].strip()) and body: break
                if lines[j].strip(): body.append(lines[j].strip())
                elif len(body) > 3 and not lines[j].strip(): break
                j += 1
            out.append((page, body)); i = j
        i += 1
    return out

INLINE = re.compile(r'(.{0,24})(?:Did you know(?: that|\?)|Fun fact:|Interesting fact:)\s+((?:[^.!?]|\.\d|\b[A-Z]\.)+[.!])')

def inline(text):
    """Facts the book states in running text: "Did you know that ...", "Fun fact: ..."."""
    out = []
    for chunk in re.split(r'=== BOOK PAGE (\d+) ===', text)[1:] if '=== BOOK PAGE' in text else []:
        pass
    parts = re.split(r'=== BOOK PAGE (\d+) ===', text)
    for k in range(1, len(parts) - 1, 2):
        page, body = int(parts[k]), clean(parts[k + 1])
        for m in INLINE.finditer(body):
            if re.search(r'\b\w+ ?:\s*$', m.group(1)): continue   # dialogue in a story
            t = m.group(2).strip(); t = t[0].upper() + t[1:]
            if 8 <= len(t.split()) <= 45 and not BAD.search(t) and t.endswith('.'): out.append((page, t))
    return out

def fact(body):
    body = [l for l in body if not re.match(r'^(Credit|Source|Image|\d+$)', l)]
    text = clean(' '.join(body))
    text = re.sub(r'^[^.]{0,80}[!?]\s+(?=[A-Z])', '', text)   # a headline such as "The wonder of ancient Indian metallurgy!"
    out = []; n = 0
    for s in re.split(r'(?<=[.!?])\s+', text):
        if not re.match(r'^[A-Z]', s) or BAD.search(s): break
        n += len(s.split())
        if n > 45: break
        out.append(s)
    return ' '.join(out) if out and n >= 8 else None

def main():
    total = 0
    for key, s in SUBJECTS.items():
        src = f"{ROOT}/sources/{s['source']}/chapters"
        pf = f"{ROOT}/public/content/packs/{s['pack']}/pack.json"
        if not (os.path.isdir(src) and os.path.exists(pf)): continue
        pack = json.load(open(pf)); d = funfacts.load(s['pack']); d.setdefault('box', {}); d['box'] = {}
        for u in pack['units']:
            for c in u['chapters']:
                m = re.search(r'ch(\d+)', c['id'])
                f = f"{src}/ch{int(m.group(1)):02d}.txt" if m else ''
                if not os.path.exists(f): continue
                lessons = [(min([x['p'] for a in l['activities'] for x in a.get('src', []) if x.get('ch') == int(m.group(1))] or [10**6]), l['id']) for l in c['lessons']]
                raw = open(f).read()
                for page, t in [(pg, fact(b)) for pg, b in boxes(raw)] + inline(raw):
                    if not t: continue
                    before = [l for l in lessons if l[0] <= page]
                    lid = (before[-1] if before else lessons[0])[1]
                    d['box'].setdefault(lid, []).append(t); total += 1
        funfacts.save(s['pack'], d)
        print(s['pack'], sum(len(v) for v in d['box'].values()), 'box facts')
    print(total, 'fun facts lifted from the books')

if __name__ == '__main__': main()
