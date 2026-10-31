#!/usr/bin/env python3
"""Choose a simulation to play with for each lesson of a chapter, where one truly fits.

  SPARKLE_SUBJECT=science python3 tools/add-explore.py 4      (run by new-chapter.py; finished lessons are skipped)

The widgets are code (public/engine/core/explorables.js) and use the real rules, so the picture is right by construction. M2.7 only picks a widget,
and writes up to three challenges with a condition on the sliders. Code checks each condition is false at the start and reachable; every
number in the words must be in the lesson's facts or in the condition, and a strict reader rejects any choice that is not central to
the lesson or that says something the facts or the widget do not support. Most lessons in a book will have none, which is fine.
Output: work/<book>/chNN/explore.json, merged by tools/assemble-pack.py."""
import json, os, re, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from subjects import S as SUBJ
from llm import m27
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
N = int(sys.argv[1]); W = f"{ROOT}/{SUBJ['work']}/ch{N:02d}"; OUT = f'{W}/explore.json'
if SUBJ.get('language', 'en') != 'en' or SUBJ['name'] == 'English': sys.exit(0)      # labels are English; literature has no simulation
facts = json.load(open(f'{W}/facts.json'))
out = json.load(open(OUT)) if os.path.exists(OUT) else {}
name = SUBJ['name']
want = {'Mathematics': ['maths'], 'Physics': ['science', 'maths'], 'Chemistry': ['science'], 'Biology': ['science'], 'Science': ['science'], 'The World Around Us': ['science', 'social', 'maths']}.get(name, ['social'])
catalog = [c for c in json.loads(subprocess.run(['node', f'{HERE}/explore-check.mjs'], capture_output=True, text=True).stdout) if c['subject'] in want]
NUM = re.compile(r'\d[\d,]*(?:\.\d+)?')

def check(rec):
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f: json.dump(rec, f)
    r = subprocess.run(['node', f'{HERE}/explore-check.mjs', f.name], capture_output=True, text=True); os.unlink(f.name)
    try: return json.loads(r.stdout)
    except Exception: return {'ok': False, 'why': r.stderr[:80]}

for lesson in facts['lessons']:
    key = lesson['id'][1:]
    if key in out: continue
    sheet = '\n'.join(f"- {f['say']}" for f in lesson['facts'])
    d = m27(f'''A Class {SUBJ.get('grade', '6')} {name} lesson called "{lesson['title']}" teaches:
{sheet}

These interactive simulations exist:
{json.dumps(catalog, ensure_ascii=False)}

Choose ONE only if playing with it would directly help a child understand the CENTRAL idea of this lesson. If none truly fits, reply {{"widget":null}}. Most lessons have no fit, and a loose fit is worse than none.
If one fits, reply with: "widget"; "params" (only if the widget lists params; for a timeline use only dated events found in the facts, BCE as negative years); "title" (a short invitation); "tasks": 2 or 3 challenges in order, each with "say" (what to try, in a few simple words), "when" (a condition on the slider keys using == != < > <= >= and or, for example "angle == 90", false at the slider's start value), and "then" (one short sentence on what the child just discovered); "takeaway" (one sentence, the big idea). Say only things the facts support.
Reply ONLY JSON.''')
    if d is None: print(f'lesson {key}: no reply, will retry next run', flush=True); continue
    rec = {'widget': None}
    if d and d.get('widget') in {c['id'] for c in catalog} and d.get('tasks'):
        words = ' '.join(str(d.get(k, '')) for k in ('title', 'takeaway')) + ' ' + ' '.join(str(t.get('say', '')) + ' ' + str(t.get('then', '')) for t in d['tasks'])
        known = (sheet + ' ' + ' '.join(str(t.get('when', '')) for t in d['tasks'])).replace(',', '')
        c = check({'widget': d['widget'], 'params': d.get('params') or {}, 'tasks': d['tasks']})
        events_ok = all(str(abs(e.get('year', 0))) in known for e in (d.get('params') or {}).get('events', []))
        if c.get('ok') and events_ok and all(n.replace(',', '') in known for n in NUM.findall(words)):
            about = next(x['about'] for x in catalog if x['id'] == d['widget'])
            v = m27(f'A strict teacher checks a simulation for a lesson called "{lesson["title"]}".\nFacts taught:\n{sheet}\n\nSimulation: {about}\nChallenges and what they say: {json.dumps(d["tasks"], ensure_ascii=False)}\nTakeaway: {d.get("takeaway")}\n\nApprove only if the simulation shows the central idea of this lesson, and every statement is true and supported by the facts or the simulation. Reply ONLY JSON: {{"approve":true}} or {{"approve":false}}')
            if v and v.get('approve') is True:
                rec = {k: d.get(k) for k in ('widget', 'params', 'title', 'tasks', 'takeaway')}
        else: print('  rejected:', d['widget'], c.get('why'), flush=True)
    out[key] = rec
    json.dump(out, open(OUT, 'w'), indent=1, ensure_ascii=False)
    print(f"lesson {key} {lesson['title'][:40]}: {rec['widget'] or 'none'}", flush=True)
