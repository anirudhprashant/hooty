#!/usr/bin/env python3
"""Look at every chosen picture of a chapter with the vision checker; throw out the ones scoring under 7
(they go on the rejected list and the lesson is re-picked by tools/find-images.py).
  python3 tools/check-images.py 4 [--redo]      # --redo re-runs find-images for the lessons it threw out"""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from imglib import vision_score
from subjects import S as SUBJ
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
n = int(sys.argv[1]); W = f"{ROOT}/{SUBJ['work']}/ch{n:02d}"; MEDIA = f"{ROOT}/public/content/packs/{SUBJ['pack']}/"
facts = json.load(open(W + '/facts.json')); imgs = json.load(open(W + '/images.json'))
rej_path = f"{ROOT}/{SUBJ['work']}/rejected-images.json"
rej = json.load(open(rej_path)) if os.path.exists(rej_path) else []
thrown = []
for l in facts['lessons']:
    k = l['id'][1:]
    if k not in imgs: continue
    if '--unchecked' in sys.argv and not imgs[k].get('unchecked'): continue
    say = ' '.join(f['say'] for f in l['facts'][:5])
    score, why = vision_score(MEDIA + imgs[k]['file'], l['title'], say)
    print(f'ch{n} l{k} {score}: {why}', flush=True)
    if score is None: continue  # the checker was down: no verdict
    imgs[k].pop('unchecked', None)
    if score < 6: rej.append(imgs[k]['credit']['url']); imgs.pop(k); thrown.append(k)
if thrown and 'boss' in imgs and imgs['boss']['file'] not in [v['file'] for kk, v in imgs.items() if kk != 'boss']: imgs.pop('boss')
json.dump(imgs, open(W + '/images.json', 'w'), indent=1, ensure_ascii=False); json.dump(rej, open(rej_path, 'w'), indent=1)
print('thrown out:', thrown)
if thrown and '--redo' in sys.argv: subprocess.run(['python3', f'{ROOT}/tools/find-images.py', str(n)])
