#!/usr/bin/env python3
"""Group a book's chapters into a few themed sections ("Living things", "Forces and motion") for the Trail.
NCERT's Social Science book prints its own five themes; most books are a flat list, so MiniMax-M2.7 proposes
sections from the chapter and lesson titles. Writes work/<subject>/sections.json; assemble-pack.py uses it.
A grouping that misses or repeats a chapter is rejected and the book stays one section.
  SPARKLE_SUBJECT=science python3 tools/group-chapters.py"""
import json, os, re, subprocess, sys, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from subjects import S as SUBJ, LANG_NOTE
from llm import m27
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = f"{ROOT}/{SUBJ['work']}"
idx = json.load(open(f"{ROOT}/sources/{SUBJ['source']}/index.json"))['chapters']
lines = []
for c in idx:
    f = f"{WORK}/ch{c['chapter']:02d}/facts.json"
    lessons = [l['title'] for l in json.load(open(f))['lessons']][:6] if os.path.exists(f) else []
    lines.append(f"{c['chapter']}. {c['title']} ({'; '.join(lessons)})")
if len(idx) < 6: print('few chapters: one section'); sys.exit(0)
prompt = f"""{LANG_NOTE}
Group the chapters of this school textbook ({SUBJ['name']}, Class {SUBJ.get('grade', '6')}) into 3 to 5 themed sections (each holding at least 2 chapters, unless the book has very few) for a learner's trail, in the book's order. Every chapter must appear in exactly one section; a section must hold chapters that sit next to each other. Give each section a short, friendly, child-readable title (2 to 5 words).
CHAPTERS:
{chr(10).join(lines)}
Reply ONLY JSON: {{"sections": [{{"title": "...", "chapters": [1, 2]}}]}}"""
d = m27(prompt)
ok = False
if d:
    allc = [n for s in d['sections'] for n in s['chapters']]
    ok = sorted(allc) == [c['chapter'] for c in idx] and all(s['chapters'] == sorted(s['chapters']) for s in d['sections'])
if not ok: print('grouping rejected; staying one section'); sys.exit(0)
json.dump(d, open(f'{WORK}/sections.json', 'w'), indent=1, ensure_ascii=False)
print([(s['title'], s['chapters']) for s in d['sections']])
