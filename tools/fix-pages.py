#!/usr/bin/env python3
"""Repair a book extracted before printed page numbers were read from NCERT's "<file>.indd <page>" footers: relabel the
pages in the source text and move every citation (facts, glossary, lessons, passages) to the real page. Safe to re-run.
  SPARKLE_SUBJECT=english-g6 python3 tools/fix-pages.py"""
import glob, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from subjects import S as SUBJ
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, WORK = f"{ROOT}/sources/{SUBJ['source']}", f"{ROOT}/{SUBJ['work']}"
FOOT = re.compile(r'^.*\.indd\s+\d+.*$|^\s*Reprint 20\d\d-\d\d\s*$|^\s*\d+/\d+/\d{4} [\d:]+ ?[AP]M\s*$', re.M)
index = json.load(open(f'{SRC}/index.json'))
for c in index['chapters']:
    path = f"{SRC}/chapters/ch{c['chapter']:02d}.txt"
    parts = re.split(r'^=== BOOK PAGE (-?\d+) ===$', open(path).read(), flags=re.M)
    old = [int(x) for x in parts[1::2]]; bodies = parts[2::2]
    found = [int(m.group(1)) if (m := re.search(r'\.indd\s+(\d+)', b)) else None for b in bodies]
    if not any(found): continue
    first = next(i for i, x in enumerate(found) if x)
    new = []
    for i, x in enumerate(found):
        if x: new.append(x)
        elif i < first: new.append(found[first] - (first - i))
        else: new.append(new[-1] + 1)   # pages with no footer carry on from the last one
    m = dict(zip(old, new))
    open(path, 'w').write('\n'.join(f'=== BOOK PAGE {p} ===\n{FOOT.sub("", b).strip()}\n' for p, b in zip(new, bodies)))
    c['firstPage'] = new[0]; c['bookPages'] = [new[0], new[-1]]
    W = f"{WORK}/ch{c['chapter']:02d}"
    def walk(o):
        if isinstance(o, dict):
            if 'p' in o and isinstance(o['p'], int): o['p'] = m.get(o['p'], o['p'])
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    for f in [f'{W}/facts.json', f'{W}/glossary.json', f'{W}/reading.json', *glob.glob(f'{W}/ship/*.json'), *glob.glob(f'{W}/built/*.json')]:
        if os.path.exists(f):
            d = json.load(open(f)); walk(d); json.dump(d, open(f, 'w'), indent=1, ensure_ascii=False)
    print(f"ch{c['chapter']}: pages {old[0]}-{old[-1]} -> {new[0]}-{new[-1]}")
json.dump(index, open(f'{SRC}/index.json', 'w'), indent=1)
