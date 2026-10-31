#!/usr/bin/env python3
"""Contact sheet of a chapter's chosen pictures with their lesson titles, for a human eyeball check.
  python3 tools/image-sheet.py 2 [out.png]"""
import json, subprocess, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from subjects import S as SUBJ
ROOT = __file__.rsplit('/tools/', 1)[0]
n = int(sys.argv[1]); out = sys.argv[2] if len(sys.argv) > 2 else f'/tmp/sheet-ch{n}.png'
d = f"{ROOT}/{SUBJ['work']}/ch{n:02d}"
facts = json.load(open(d + '/facts.json')); imgs = json.load(open(d + '/images.json'))
args = []
for l in facts['lessons']:
    im = imgs.get(l['id'][1:])
    if im: args += ['-label', f"{l['id'][1:]}. {l['title'][:34]}", f"{ROOT}/public/content/packs/{SUBJ['pack']}/{im['file']}"]
subprocess.run(['montage', *args, '-tile', '3x', '-geometry', '420x280+8+8', '-pointsize', '16', '-background', 'white', out], check=True)
print(out)
