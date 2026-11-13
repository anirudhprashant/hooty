#!/usr/bin/env python3
"""Measure the concept links: how many questions have a card, a same-focus sibling, and a sibling at all."""
import collections, glob, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import concepts
from subjects import SUBJECTS

subs = {s['pack']: os.path.join(ROOT, s['work']) for s in SUBJECTS.values()}
tot = collections.Counter()
per_pack = []
for f in sorted(glob.glob(f'{ROOT}/public/content/packs/*/pack.json')):
    d = json.load(open(f))
    msg = concepts.apply(d, subs.get(d['id']))
    q = anchored = focus = sib = samefocus = 0
    for u in d['units']:
        for ch in u['chapters']:
            groups = list(ch['lessons']) + ([ch['boss']] if ch.get('boss') else [])
            byanchor = collections.defaultdict(list)
            for l in groups:
                for a in l.get('activities', []):
                    if a['type'] in concepts.GRADED:
                        q += 1
                        if a.get('anchor'):
                            anchored += 1
                            byanchor[a['anchor']].append(a)
                        if a.get('focus', -1) >= 0:
                            focus += 1
            for anc, qs in byanchor.items():
                for x in qs:
                    others = [o for o in qs if o['id'] != x['id']]
                    if others:
                        sib += 1
                        if any(o.get('focus', -1) == x.get('focus', -1) >= 0 for o in others):
                            samefocus += 1
    tot.update(q=q, anchored=anchored, focus=focus, sib=sib, samefocus=samefocus)
    per_pack.append((d['id'], q, anchored, focus, sib, samefocus))
    print(f"{d['id']:26s} q={q:5d} anchored={anchored:5d} focus={focus:5d} sibling={sib:5d} samefocus={samefocus:5d}")

print()
print(f"questions {tot['q']}, anchored {tot['anchored']} ({100*tot['anchored']/max(1,tot['q']):.1f}%), "
      f"focus {tot['focus']} ({100*tot['focus']/max(1,tot['q']):.1f}%), "
      f"sibling {tot['sib']} ({100*tot['sib']/max(1,tot['q']):.1f}%), "
      f"same-focus sibling {tot['samefocus']} ({100*tot['samefocus']/max(1,tot['q']):.1f}%)")
