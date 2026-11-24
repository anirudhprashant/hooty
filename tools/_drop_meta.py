import json
import os
import sys

os.chdir('/home/ubuntu/agent-workspace/hooty-build')
sys.path.insert(0, os.path.join(os.getcwd(), 'tools'))
from meta_questions import is_meta

dropped = 0
books = 0
for pk in sorted(os.listdir('public/content/packs')):
    path = f'public/content/packs/{pk}/pack.json'
    if not os.path.exists(path):
        continue
    d = json.load(open(path, encoding='utf-8'))
    touched = False
    for u in d['units']:
        for c in u['chapters']:
            for l in (c.get('lessons') or []) + ([c['boss']] if c.get('boss') else []):
                keep = [a for a in (l.get('activities') or []) if not is_meta(a.get('prompt'))]
                if len(keep) != len(l.get('activities') or []):
                    dropped += len(l.get('activities') or []) - len(keep)
                    l['activities'] = keep
                    touched = True
    if touched:
        books += 1
        json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
print('cards dropped:', dropped, 'in', books, 'books')

left = 0
empty = []
for pk in sorted(os.listdir('public/content/packs')):
    path = f'public/content/packs/{pk}/pack.json'
    if not os.path.exists(path):
        continue
    d = json.load(open(path, encoding='utf-8'))
    for u in d['units']:
        for c in u['chapters']:
            for l in (c.get('lessons') or []) + ([c['boss']] if c.get('boss') else []):
                acts = l.get('activities') or []
                left += sum(1 for a in acts if is_meta(a.get('prompt')))
                if not acts:
                    empty.append((pk, l.get('id')))
print('meta prompts left:', left, '| lessons left empty:', len(empty), empty[:3])
