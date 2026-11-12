#!/usr/bin/env python3
"""Purge spot-the-task questions from packs, ship files and deep.json (the assemble source).

Deep.json is what assemble builds the reasoning and exam questions from, so it must be cleaned too,
otherwise the next assemble puts them back.
"""
import glob, json, os, sys

B = os.path.expanduser('~/agent-workspace/hooty-build')
sys.path.insert(0, f'{B}/tools')
from meta_questions import is_meta
from subjects import SUBJECTS

APPLY = '--apply' in sys.argv
key_of = {v['pack']: k for k, v in SUBJECTS.items()}
packs = sorted(key_of)
hits, touched = [], set()

for pack in packs:
    pj = f'{B}/public/content/packs/{pack}/pack.json'
    if not os.path.exists(pj):
        continue
    d = json.load(open(pj))
    for u in d['units']:
        for c in u['chapters']:
            for l in c['lessons'] + [c['boss']]:
                acts = l.get('activities') or []
                metas = [a for a in acts if is_meta(a.get('prompt'))]
                if not metas:
                    continue
                room = len(acts) - 8
                for a in metas:
                    if room <= 0:
                        continue
                    hits.append((pack, l['id'], str(a.get('prompt'))[:85]))
                    touched.add(pack)
                    room -= 1

print(f'{len(hits)} questions to remove across {len(touched)} books')
for h in hits:
    print('   ', h[0], '|', h[2])
if not APPLY:
    print('dry run; pass --apply to write')
    raise SystemExit

drop = {h[2] for h in hits}
for pack in touched:
    pj = f'{B}/public/content/packs/{pack}/pack.json'
    d = json.load(open(pj))
    n = 0
    for u in d['units']:
        for c in u['chapters']:
            for l in c['lessons'] + [c['boss']]:
                acts = l.get('activities') or []
                keep = [a for a in acts if str(a.get('prompt'))[:85] not in drop]
                n += len(acts) - len(keep)
                l['activities'] = keep
    json.dump(d, open(pj, 'w'), indent=1, ensure_ascii=False)
    work = f"{B}/{SUBJECTS[key_of[pack]]['work']}"
    m = 0
    for f in (sorted(glob.glob(f'{work}/ch*/ship/*.json')) + sorted(glob.glob(f'{work}/ch*/boss.json'))
              + sorted(glob.glob(f'{work}/ch*/deep.json'))):
        try:
            dd = json.load(open(f))
        except Exception:
            continue
        before = json.dumps(dd, ensure_ascii=False)
        def clean(node):
            """Remove any question that asks about the task, at any depth (prompt, problem, title...)."""
            if isinstance(node, dict):
                if is_meta(node.get('prompt')) or is_meta(node.get('problem')):
                    return None
                if node.get('think') and is_meta((node.get('think') or {}).get('problem')):
                    node = {k: v for k, v in node.items() if k != 'think'}
                return {k: clean(v) for k, v in node.items()}
            if isinstance(node, list):
                out = [clean(v) for v in node]
                return [v for v in out if v is not None]
            return node
        nd = clean(dd)
        after = json.dumps(nd, ensure_ascii=False)
        if after != before:
            json.dump(nd, open(f, 'w'), indent=1, ensure_ascii=False)
            m += 1
    print(f'{pack}: {n} removed from the pack, {m} source file(s) cleaned')
