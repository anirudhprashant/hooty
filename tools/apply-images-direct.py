#!/usr/bin/env python3
"""Apply work/<book>/chNN/images.json to the pack when assemble-pack cannot run (missing sources index).

Usage: python3 tools/apply-images-direct.py <pack-id> [--dry]
Sets topicScene/sceneAlt/sceneCaption/sceneCredit on lessons exactly as assemble-pack does, for every
chapter that has pictures. Safe to re-run; lessons that already have a scene are left alone.
"""
import glob, json, os, sys

B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, f'{B}/tools')
from subjects import SUBJECTS

DRY = '--dry' in sys.argv
packs = [a for a in sys.argv[1:] if not a.startswith('--')]
if not packs:
    packs = [v['pack'] for v in SUBJECTS.values()]
work_of = {v['pack']: v['work'] for v in SUBJECTS.values()}

changed_total = 0
for pack in packs:
    if pack not in work_of:
        print('unknown pack', pack); continue
    pf = f'{B}/public/content/packs/{pack}/pack.json'
    if not os.path.exists(pf):
        print('no pack', pack); continue
    d = json.load(open(pf)); work = f"{B}/{work_of[pack]}"
    changed = 0
    for u in d['units']:
        for c in u['chapters']:
            m = c['id'].split('-')[0]
            if not m.startswith('ch') or not m[2:].isdigit():
                continue
            img_path = f'{work}/ch{int(m[2:]):02d}/images.json'
            if not os.path.exists(img_path):
                continue
            imgs = json.load(open(img_path))
            first_good = next((v for k, v in sorted(imgs.items())
                               if k != 'boss' and os.path.exists(f"{B}/public/content/packs/{pack}/{v['file']}")), None)
            for lesson in c['lessons'] + [c['boss']]:
                key = 'boss' if lesson is c['boss'] else lesson['id'].split('-l')[-1]
                im = imgs.get(key)
                # same rule as assemble-pack: a lesson with no picture of its own shares the chapter's first good one
                if not im:
                    im = first_good
                if not im or not os.path.exists(f"{B}/public/content/packs/{pack}/{im['file']}"):
                    continue
                if lesson.get('topicScene') == im['file']:
                    continue
                lesson.update({'topicScene': im['file'], 'sceneAlt': im['alt'], 'sceneCaption': im['caption'], 'sceneCredit': im['credit']})
                changed += 1
    if changed and not DRY:
        json.dump(d, open(pf, 'w'), indent=1, ensure_ascii=False)
    print(f'{pack}: {changed} lesson(s) would update' if DRY else f'{pack}: {changed} lesson(s) updated')
    changed_total += changed

print('total', changed_total, '(dry run)' if DRY else '')
