#!/usr/bin/env python3
"""Write the reading extras for one chapter with MiniMax-M2.7: a curiosity "hook" question for every lesson
and, with --passages, a short original reading passage. Output: work/sst6/chNN/reading.json, which
tools/assemble-pack.py inserts at the start of each lesson.

  python3 tools/add-reading.py 2 --passages

A passage cites fact ids like any other activity, and its numbers and names are audited against the book:
a passage that fails the audit is dropped (the hook stays).
"""
import json, os, re, subprocess, sys, time
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__)))
from subjects import S as SUBJ, LANG_NOTE
os.environ['SPARKLE_SOURCE'] = SUBJ['source']  # for the node tools that read the book text
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = int(sys.argv[1]); NN = f'{N:02d}'; W = f"{ROOT}/{SUBJ['work']}/ch{NN}"
PASSAGES = '--passages' in sys.argv
facts = json.load(open(f'{W}/facts.json'))
out_path = f'{W}/reading.json'
out = json.load(open(out_path)) if os.path.exists(out_path) else {}

from llm import m27

def make(lesson):
    key = lesson['id'][1:]
    if key in out and (not PASSAGES or 'passage' in out[key]): return
    sheet = '\n'.join(f"- FACT {f['id']}: {f['say']}" for f in lesson['facts'])
    ask = f"""{LANG_NOTE}
For a {5 + int(SUBJ.get('grade', '6'))}-year-old's {SUBJ['name']} lesson called "{lesson['title']}", write:
1. "hook": ONE curiosity question of at most 14 words that this lesson will answer. Do not state any fact in it. Warm and simple.
""" + (f"""2. "passage": {{"title": short, "body": 4 or 5 short paragraphs (130 to 180 words in all) telling the lesson as a little story or tour in second person ("you"). Simple British-Indian English, sentences of 15 words or fewer. Write 4 or 5 flowing paragraphs, never one sentence per paragraph, and vary how sentences begin: at most two sentences may start with "you" (or its Hindi equivalent). Use ONLY facts from the FACT SHEET and no other names, numbers or dates. "f": the list of fact ids you used.}}
""" if PASSAGES else '') + f"""
FACT SHEET:
{sheet}

Reply with ONLY JSON: {{"hook": "...?"{', "passage": {"title": "...", "body": "...", "f": ["1.1"]}' if PASSAGES else ''}}}"""
    d = m27(ask)
    if not d or not d.get('hook'): print('no result for', key); return
    rec = out.get(key, {}); rec['hook'] = d['hook'].strip()
    if PASSAGES and d.get('passage'): rec['passage'] = d['passage']
    out[key] = rec; print('ok', key, flush=True)

with ThreadPoolExecutor(2) as ex: list(ex.map(make, facts['lessons']))

# audit passages against the book exactly like any activity
byid = {f['id']: f for l in facts['lessons'] for f in l['facts']}
if PASSAGES:
    tmp = f'{W}/tmp-reading'; os.makedirs(tmp, exist_ok=True)
    for key, rec in out.items():
        p = rec.get('passage')
        if not p: continue
        p['f'] = [i for i in p.get('f', []) if i in byid] or [f['id'] for f in facts['lessons'][int(key) - 1]['facts'][:3]]
        json.dump({'id': f'ch{N}-l{key}', 'title': 't', 'activities': [{'type': 'passage', 'id': f'ch{N}-l{key}-read', 'title': p['title'], 'body': p['body'], 'f': p['f']}]}, open(f'{tmp}/{key}.json', 'w'))
    subprocess.run(['node', 'tools/compile-lessons.mjs', f'{W}/facts.json', tmp, tmp + '/built'], cwd=ROOT, capture_output=True)
    v = subprocess.run(['node', 'tools/verify-sources.mjs', *[f'{tmp}/built/{k}.json' for k in out if out[k].get('passage')]], cwd=ROOT, capture_output=True, text=True).stdout
    bad = set(re.findall(r'^ERROR .*?built/(\d+)\.json', v, re.M))
    for k in bad: print('passage failed the audit, dropped:', k); out[k].pop('passage', None)
    # resolve fact ids to book pages (no evidence phrase ships)
    for rec in out.values():
        if rec.get('passage'): rec['passage']['src'] = [{'ch': N, 'p': byid[i]['p']} for i in rec['passage'].pop('f')]
json.dump(out, open(out_path, 'w'), indent=1, ensure_ascii=False)
print('wrote', out_path)
