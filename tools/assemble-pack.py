#!/usr/bin/env python3
"""Merge every finished chapter (work/sst6/chNN/ship) into the live pack and glossary. No AI, safe to re-run.
Chapter 1 and any chapter already in the pack keep their id, summary and position; new ones are added.
Then run tools/make-audio.py (from a home network) and rsync to oracle."""
import glob, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from subjects import S as SUBJ, KEY
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = f"{ROOT}/public/content/packs/{SUBJ['pack']}/"
os.makedirs(P, exist_ok=True)
WORK = f"{ROOT}/{SUBJ['work']}"
if not os.path.exists(P + 'pack.json'):  # a new subject starts from the Social Science pack's shape
    base = json.load(open(f'{ROOT}/public/content/packs/class6-sst/pack.json'))
    json.dump({**base, 'id': SUBJ['pack'], 'title': f"{SUBJ['name']}, Class {SUBJ.get('grade', '6')}", 'grade': str(SUBJ.get('grade', '6')), 'subject': SUBJ['name'], 'language': SUBJ.get('language', 'en'), 'units': [],
               'description': f"NCERT Grade {SUBJ.get('grade', '6')} {SUBJ['name']}, chapter by chapter.", 'sources': [{'title': f"NCERT Grade {SUBJ.get('grade', '6')} {SUBJ['name']} textbook.", 'url': 'https://ncert.nic.in/textbook.php'}]}, open(P + 'pack.json', 'w'), indent=1)
    json.dump({'terms': []}, open(P + 'glossary.json', 'w'))
pack = json.load(open(P + 'pack.json')); gloss = json.load(open(P + 'glossary.json'))
index = {c['chapter']: c for c in json.load(open(f'{ROOT}/sources/{SUBJ["source"]}/index.json'))['chapters']}
UNIT = {'A': 'geography', 'B': 'history', 'C': 'culture', 'D': 'civics', 'E': 'economics'} if KEY == 'sst6' else {'A': KEY}

SECTIONS = {}
if KEY != 'sst6' and os.path.exists(f'{WORK}/sections.json'):  # tools/group-chapters.py: themed sections for a flat book
    for k, sec in enumerate(json.load(open(f'{WORK}/sections.json'))['sections'], 1):
        for n in sec['chapters']: SECTIONS[n] = (f'{KEY}-s{k}', sec['title'])

def unit_of(theme, title, n=None):
    if n in SECTIONS:
        uid, utitle = SECTIONS[n]
        u = next((u for u in pack['units'] if u['id'] == uid), None)
        if not u: u = {'id': uid, 'title': utitle, 'chapters': []}; pack['units'].append(u)
        u['title'] = utitle
        return u
    u = next((u for u in pack['units'] if u['id'] == UNIT[theme]), None)
    if not u: u = {'id': UNIT[theme], 'title': title, 'chapters': []}; pack['units'].append(u)
    return u

def num(c): return int(re.match(r'ch(\d+)', c['id']).group(1))
have = {num(c): c for u in pack['units'] for c in u['chapters']}
seen = {t['term'].lower() for t in gloss['terms']}
for d in sorted(glob.glob(f'{WORK}/ch*/ship')):
    n = int(re.search(r'ch(\d+)/ship', d).group(1))
    if n < 2 and KEY == 'sst6': continue  # Social Science chapter 1 was assembled by hand
    ch = index[n]; L = lambda f: json.load(open(f'{d}/{f}.json'))
    lessons = [json.load(open(f)) for f in sorted(glob.glob(d + '/[0-9]*.json'), key=lambda f: int(os.path.basename(f)[:-5]))]
    old = have.get(n)
    chapter = {'id': old['id'] if old else f"ch{n:02d}-" + re.sub(r'[^a-z0-9]+', '-', ch['title'].lower()).strip('-')[:40],
               'title': ch['title'],
               'summary': old['summary'] if old else 'In this chapter: ' + '; '.join(l['title'] for l in lessons[:4]).lower() + '.',
               'lessons': lessons, 'boss': L('boss')}
    unit = unit_of(ch['theme'], ch['themeTitle'], n)
    for u in pack['units']: u['chapters'] = [c for c in u['chapters'] if num(c) != n]
    unit['chapters'].append(chapter)
    g = json.load(open(f'{d}/../glossary.json'))
    gloss['terms'] += [t for t in g['terms'] if t['term'].lower() not in seen and not seen.add(t['term'].lower())]
# pictures (tools/find-images.py): a credited, accurate topic picture for every lesson and the chapter challenge
for u in pack['units']:
    for c in u['chapters']:
        f = f'{WORK}/ch{num(c):02d}/images.json'
        if not os.path.exists(f): continue
        imgs = json.load(open(f))
        for lesson in c['lessons'] + [c['boss']]:
            im = imgs.get('boss' if lesson is c['boss'] else lesson['id'].split('-l')[-1])
            if not im:  # nothing passed the look test for this lesson: share the chapter's first good picture
                im = next((v for k, v in sorted(imgs.items()) if k != 'boss' and os.path.exists(P + v['file'])), None)
            if im and not os.path.exists(P + im['file']):
                print('picture file missing, skipped:', im['file']); im = next((v for k, v in sorted(imgs.items()) if k != 'boss' and os.path.exists(P + v['file'])), None)
            if im:
                lesson.update({'topicScene': im['file'], 'sceneAlt': im['alt'], 'sceneCaption': im['caption'], 'sceneCredit': im['credit']})

# reading extras (tools/add-reading.py): a hook question, and where written a passage, open each lesson
for u in pack['units']:
    for c in u['chapters']:
        f = f'{WORK}/ch{num(c):02d}/reading.json'
        if not os.path.exists(f): continue
        extras = json.load(open(f))
        for lesson in c['lessons']:
            rec = extras.get(lesson['id'].split('-l')[-1])
            if not rec: continue
            acts = [a for a in lesson['activities'] if a['type'] not in ('hook', 'passage')]
            front = [{'type': 'hook', 'id': lesson['id'] + '-hook', 'difficulty': 1, 'tags': ['hook'], 'prompt': rec['hook'], 'explanation': 'Now read on to find out.'}]
            if rec.get('passage'):
                pa = rec['passage']; seen_src = []
                for x in pa['src']:
                    if x not in seen_src: seen_src.append(x)
                front.append({'type': 'passage', 'id': lesson['id'] + '-read', 'difficulty': 1, 'tags': ['reading'], 'title': pa['title'], 'body': pa['body'], 'explanation': 'Reading first helps the ideas stick.', 'src': seen_src})
            lesson['activities'] = front + acts
# explorables (tools/add-explore.py): a simulation to play with, right after the lesson's opening explanation
EXPLORE = {}
for u in pack['units']:
    for c in u['chapters']:
        f = f'{WORK}/ch{num(c):02d}/explore.json'
        if os.path.exists(f): EXPLORE[num(c)] = json.load(open(f))

# understanding (tools/deepen.py): a think-it-through card after the opening explanation, then the recall questions (capped),
# then reasoning questions whose wrong options each explain the misunderstanding behind them.
for u in pack['units']:
    for c in u['chapters']:
        f = f'{WORK}/ch{num(c):02d}/deep.json'
        if not os.path.exists(f) or (KEY == 'sst6' and num(c) == 1): continue   # sst6 chapter 1 numbers its lessons differently from its facts
        deep = json.load(open(f))
        fp = f'{WORK}/ch{num(c):02d}/facts.json'
        pages = {x['id']: x.get('p') for l in json.load(open(fp))['lessons'] for x in l['facts']} if os.path.exists(fp) else {}
        src = lambda ids: [{'ch': num(c), 'p': pages[i]} for i in ids if pages.get(i)]
        for lesson in c['lessons']:
            rec = deep.get(lesson['id'].split('-l')[-1])
            if not rec: continue
            acts = [a for a in lesson['activities'] if 'deep' not in a.get('tags', []) and a['type'] != 'worked' or 'computed' in a.get('tags', [])]
            teach = [a for a in acts if a['type'] in ('hook', 'passage', 'concept', 'media')]
            recall = [a for a in acts if a not in teach and 'computed' not in a.get('tags', [])]
            comp = [a for a in acts if 'computed' in a.get('tags', [])]
            qs = rec.get('questions', [])
            if len(qs) >= 3 and len(recall) > 6:      # keep variety: one true/false too many goes first
                recall.sort(key=lambda a: a['type'] == 'truefalse'); recall = sorted(recall[:6], key=lambda a: a.get('difficulty', 2))
            cards = [{'type': 'mcq', 'id': f"{lesson['id']}-d{j}", 'difficulty': 3, 'tags': ['deep', q.get('skill') or 'reasoning'], 'prompt': q['prompt'], 'options': q['options'], 'answer': q['answer'],
                      'why': {o: q['why'][i] for i, o in enumerate(q['options']) if i != q['answer'] and i < len(q.get('why', []))},
                      'explanation': (q['why'][q['answer']] if q['answer'] < len(q.get('why', [])) else '') or 'Think about why, using the idea from the lesson.', 'f': q.get('f', []), 'src': src(q.get('f', []))} for j, q in enumerate(qs, 1)]
            if rec.get('think'):
                th = rec['think']
                at = next((i for i, a in enumerate(teach) if a['type'] == 'concept'), len(teach) - 1) + 1
                teach.insert(at, {'type': 'worked', 'id': f"{lesson['id']}-t1", 'difficulty': 1, 'tags': ['deep', 'think'], 'kicker': 'Let us think it through', 'prompt': th['problem'], 'steps': th['steps'], 'explanation': 'Think it through with Hooty.', 'f': th.get('f', []), 'src': src(th.get('f', []))})
            lesson['activities'] = teach + recall + comp + cards
        # Test practice: one extra stop per chapter with the styles of question school papers use. Lessons stay about learning.
        exam, hi = [], pack.get('language') == 'hi'
        for lesson in c['lessons']:
            ex = (deep.get(lesson['id'].split('-l')[-1]) or {}).get('extras') or {}
            base = lesson['id']
            cs = ex.get('case')
            if cs:
                exam += [{'type': 'mcq', 'id': f'{base}-x{j}', 'difficulty': 3, 'tags': ['exam', 'case'], 'context': cs['passage'], 'prompt': q['prompt'], 'options': q['options'], 'answer': q['answer'],
                          'why': {o: q['why'][i] for i, o in enumerate(q['options']) if i != q['answer'] and i < len(q.get('why', []))}, 'explanation': (q['why'][q['answer']] if q['answer'] < len(q.get('why', [])) else '') or 'Read the case again and use the idea from the lesson.'} for j, q in enumerate(cs['questions'], 1)]
            exam += [{'type': 'mcq', 'id': f'{base}-r{j}', 'difficulty': 3, 'tags': ['exam', 'assertion'], 'prompt': q['prompt'], 'options': q['options'], 'answer': q['answer'], 'explanation': q.get('why') or 'Check each statement on its own first, then ask whether the reason explains the assertion.'} for j, q in enumerate(ex.get('assertion', []), 1)]
            exam += [{'type': 'explain', 'id': f'{base}-e{j}', 'difficulty': 3, 'tags': ['exam', 'written'], 'prompt': q['prompt'], 'answer': q['answer'], 'points': q['points'], 'explanation': 'Compare your answer with the points a marker looks for.'} for j, q in enumerate(ex.get('explain', [])[:1], 1)]
        if len(exam) >= 4:
            first = c['lessons'][0]
            at = c['lessons'][0]['id'].rsplit('-l', 1)[0]
            c['lessons'] = [l for l in c['lessons'] if not l['id'].endswith('-exam')]
            scene = {k: c['boss'][k] for k in ('topicScene', 'sceneAlt', 'sceneCaption', 'sceneCredit') if k in c['boss']}
            c['lessons'].append({'id': f'{at}-exam', 'title': 'टेस्ट की तैयारी' if hi else 'Test practice', 'estimatedMinutes': 10, **scene, 'activities': exam[:18]})
for u in pack['units']:
    for c in u['chapters']:
        for lesson in c['lessons']:
            lesson['activities'] = [x for x in lesson['activities'] if x['type'] != 'explore']   # a chapter can persist between builds
            rec = EXPLORE.get(num(c), {}).get(lesson['id'].split('-l')[-1])
            if not rec or not rec.get('widget'): continue
            at = next((i for i, a in enumerate(lesson['activities']) if a['type'] == 'concept'), -1) + 1
            lesson['activities'].insert(at, {'type': 'explore', 'id': f"{lesson['id']}-play", 'difficulty': 1, 'tags': ['explore'], 'widget': rec['widget'], 'params': rec.get('params') or {}, 'title': rec.get('title', ''), 'tasks': rec.get('tasks', []), 'takeaway': rec.get('takeaway', ''), 'explanation': rec.get('takeaway') or 'Play with it and see what changes.'})
pack['units'] = [u for u in pack['units'] if u['chapters']]
for u in pack['units']: u['chapters'].sort(key=num)
order = ['geography', 'history', 'culture', 'civics', 'economics', 'science']
pack['units'].sort(key=lambda u: order.index(u['id']) if u['id'] in order else (int(re.search(r's(\d+)$', u['id']).group(1)) if re.search(r's(\d+)$', u['id']) else 99))

# ---- content lint: mechanical problems in what the model wrote. Text is cleaned; an unfair question is dropped,
# as long as its lesson keeps at least 5 questions. Hand-written Social Science chapter 1 is left alone.
LEAK = [(re.compile(r'\b(in|from|on) the fact sheet\b', re.I), r'\1 the lesson'), (re.compile(r'\bthe fact sheet\b', re.I), 'the lesson'),
        (re.compile(r'\bfact sheet\b', re.I), 'lesson'), (re.compile(r'\s*\(?\bFACT \d+\.\d+\)?', re.I), '')]
def clean(o):
    if isinstance(o, str):
        for rx, to in LEAK: o = rx.sub(to, o)
        return o
    if isinstance(o, list): return [clean(x) for x in o]
    if isinstance(o, dict): return {k: (v if k in ('id', 'type', 'src', 'tags', 'gen') else clean(v)) for k, v in o.items()}
    return o
def unfair(a):
    t, pr = a['type'], a.get('prompt') or ''
    if re.search(r'(?<![1\d])[123]th\b', pr): return 'broken ordinal'
    if 'computed' in a.get('tags', []) and re.search(r'formula|expression|equation|variable', pr, re.I): return 'teacher talk in a practice problem'
    if t == 'mcq':
        o = a.get('options') or []
        if not all(isinstance(x, str) for x in o): return 'an option is not text'
        if len({x.lower() for x in o}) < len(o): return 'repeated options'
        if not isinstance(a.get('answer'), int) or not 0 <= a['answer'] < len(o): return 'bad answer index'
        r, rest = o[a['answer']], [x for i, x in enumerate(o) if i != a['answer']]
        if rest and len(r) > 25 and len(r) > 1.6 * max(map(len, rest)): return 'answer is the longest by far'
        if re.search(r'all of the above|none of the above', ' '.join(o), re.I): return 'all/none of the above'
    if t == 'fillblank':
        if '__' not in pr and 'computed' not in a.get('tags', []): return 'no blank'   # a computed problem asks for a number
        if any(len(x) > 3 and x.lower() in pr.lower() for x in a.get('answers', [])): return 'prompt contains the answer'
    if t == 'matchpairs' and not all(isinstance(x, str) for pair in a.get('pairs', []) for x in pair): return 'a pair is not text'
    if t == 'dragorder' and re.search(r'logical|broad|detail|most important|specific', pr, re.I): return 'no single true order'
    return None
GRADED = lambda a: a['type'] not in ('concept', 'hook', 'passage', 'media', 'worked', 'explore', 'explain')
dropped = {}
for u in pack['units']:
    for c in u['chapters']:
        n = num(c)
        if n == 1 and KEY == 'sst6': continue
        facts_path = f'{WORK}/ch{n:02d}/facts.json'
        facts = json.load(open(facts_path)) if os.path.exists(facts_path) else None
        for lesson in c['lessons'] + [c['boss']]:
            lesson['activities'] = [clean(a) for a in lesson['activities']]
            seen = set(); keep = list(lesson['activities'])
            for a in list(keep):
                why = unfair(a)
                pr = (a.get('prompt') or '').lower()
                if not why and pr and GRADED(a) and pr in seen: why = 'repeated in this lesson'
                seen.add(pr)
                if why and (not GRADED(a) or sum(GRADED(x) for x in keep) > 5):
                    keep.remove(a); dropped[why] = dropped.get(why, 0) + 1
            lesson['activities'] = keep
            # Mathematics is learned by doing sums: where a lesson has a good set of computed problems, they lead and
            # recall questions are capped, so the lesson is mostly numbers and word problems and not definitions.
            if SUBJ.get('calc') and lesson is not c['boss']:
                comp = [a for a in keep if 'computed' in a.get('tags', [])]
                if len(comp) >= 4:
                    teach = [a for a in keep if not GRADED(a)]
                    recall = [a for a in keep if GRADED(a) and 'computed' not in a.get('tags', []) and 'deep' not in a.get('tags', [])]
                    reasoned = [a for a in keep if GRADED(a) and 'deep' in a.get('tags', [])]
                    score = lambda a: (0 if a['type'] in ('matchpairs', 'dragorder') or re.search(r'\d', a.get('prompt') or '') else 1)
                    recall = sorted(recall, key=score)[:4]
                    # I do, we do, you do: the first easy problem becomes a worked example (watched, step by step) and a hard
                    # one becomes a second; each is drawn with fresh numbers every time, so the practice that follows is not a repeat.
                    def worked(src, n):
                        ans = (src.get('answers') or [src['options'][src['answer']] if src.get('options') else ''])[0]
                        return {'type': 'worked', 'id': f"{lesson['id']}-w{n}", 'difficulty': src.get('difficulty', 1), 'tags': ['worked'], 'prompt': src['prompt'],
                                'steps': src['steps'], 'modelSpec': src.get('modelSpec'), 'result': ans, 'gen': src['gen'], 'explanation': 'Watch how it is solved.',
                                'f': src.get('f', []), 'derived': src.get('derived', [])}
                    stepped = [a for a in comp if a.get('steps')]
                    w1 = next((a for a in stepped if a.get('difficulty', 2) == 1), None) or (stepped[0] if stepped else None)
                    w2 = next((a for a in reversed(stepped) if a.get('difficulty', 2) == 3 and a is not w1), None)
                    comp = [a for a in comp if a is not w1 and a is not w2]
                    rest = sorted(recall + comp, key=lambda a: a.get('difficulty', 2)) + reasoned   # easy first, stable
                    if w2:
                        at = next((i for i, a in enumerate(rest) if a.get('difficulty', 2) >= 3), len(rest))
                        rest.insert(at, worked(w2, 2))
                    if w1:
                        at = next((i for i, a in enumerate(teach) if a['type'] == 'concept'), -1) + 1
                        teach.insert(at, worked(w1, 1))
                    dropped['recall questions trimmed for problems'] = dropped.get('recall questions trimmed for problems', 0) + len(keep) - len([x for x in teach if x['type'] != 'worked']) - len([x for x in rest if x['type'] != 'worked'])
                    lesson['activities'] = keep = teach + rest
            # a lesson must teach before it tests: if its opening card was lost, write one from its checked facts
            key = lesson['id'].split('-l')[-1]
            if lesson is not c['boss'] and facts and not any(a['type'] == 'concept' for a in keep):
                fl = next((l['facts'] for l in facts['lessons'] if l['id'] == 'l' + key), None)
                if fl:
                    hi = pack.get('language') == 'hi'
                    lesson['activities'].insert(0, {'type': 'concept', 'id': lesson['id'] + '-a0', 'difficulty': 1, 'tags': ['intro'], 'title': lesson['title'],
                        'body': '\n\n'.join(f['say'] for f in fl[:3]), 'keyPoints': [f['say'] for f in fl[3:5]],
                        'explanation': 'अब कुछ सवाल करते हैं।' if hi else 'Now try some questions.',
                        'src': [{'ch': n, 'p': f['p']} for f in fl[:5]]})
                    dropped['opening card rebuilt'] = dropped.get('opening card rebuilt', 0) + 1
if dropped: print('lint:', dropped)

# a chapter cannot cite a page past its own end (answer-key pages at the back of a PDF have no printed number)
if KEY != 'sst6':
    firsts = sorted(c['firstPage'] for c in index.values())
    for u in pack['units']:
        for c in u['chapters']:
            start = index[num(c)]['firstPage']; later = [f for f in firsts if f > start]
            if later:
                for lesson in c['lessons'] + [c['boss']]:
                    for a in lesson['activities']:
                        for x in a.get('src', []):
                            if x.get('p', 0) >= later[0]: x['p'] = later[0] - 1

# every book but the first needs its own ids: progress is stored by lesson id, and "ch1-l1" exists in every book
if KEY != 'sst6':
    for u in pack['units']:
        for c in u['chapters']:
            for lesson in c['lessons'] + [c['boss']]:
                if not lesson['id'].startswith(KEY + '-'):
                    lesson['id'] = f"{KEY}-{lesson['id']}"
                    for a in lesson['activities']: a['id'] = f"{KEY}-{a['id']}"

# Honest time labels: a passage takes a couple of minutes, a worked example about a minute, a question about half a minute.
COST = {'passage': 2.0, 'worked': 1.0, 'concept': 0.8, 'hook': 0.2, 'explore': 1.5, 'explain': 2.5}
for u in pack['units']:
    for c in u['chapters']:
        for lesson in c['lessons'] + [c['boss']]:
            lesson['estimatedMinutes'] = max(3, round(sum(COST.get(a['type'], 0.5) for a in lesson['activities'])))

# Structural safety net: an activity the validator rejects (a matching question with repeated answers, a card
# with no body) is dropped here rather than shipped, so one bad question never breaks a chapter.
import subprocess
def write(): json.dump(pack, open(P + 'pack.json', 'w'), indent=1, ensure_ascii=False)
import plain   # plain-English rewrites and removal of questions confirmed broken: work/plain, made by tools/plain.py
print('plain English:', *plain.apply(SUBJ['pack'], pack))
import funfacts; print('lessons with fun facts:', funfacts.apply(SUBJ['pack'], pack))
write()
for _ in range(3):
    out = subprocess.run(['node', f'{ROOT}/tools/validate-pack.mjs', P + 'pack.json'], capture_output=True, text=True).stdout
    bad = set(re.findall(r'^\s+x .*> ([\w-]+): ', out, re.M))
    if not bad: break
    print('dropping invalid activities:', sorted(bad))
    for u in pack['units']:
        for c in u['chapters']:
            for l in c['lessons'] + [c['boss']]: l['activities'] = [a for a in l['activities'] if a['id'] not in bad]
    write()
json.dump(gloss, open(P + 'glossary.json', 'w'), indent=1, ensure_ascii=False)
# make the app list the pack
idx_path = f'{ROOT}/public/content/index.json'
idx = json.load(open(idx_path))
entry = {'id': pack['id'], 'title': pack['title'], 'subject': pack['subject'], 'grade': pack.get('grade', '6'), 'language': pack.get('language', 'en'),
         'description': f"{pack['subject']}: {sum(len(u['chapters']) for u in pack['units'])} chapters so far."}
if any(x['id'] == pack['id'] for x in idx['packs']): idx['packs'] = [entry if x['id'] == pack['id'] else x for x in idx['packs']]
else: idx['packs'].append(entry)  # new books go after the ones already there, so the first book stays the default
json.dump(idx, open(idx_path, 'w'), indent=2, ensure_ascii=False)
print('chapters:', [(u['id'], [num(c) for c in u['chapters']]) for u in pack['units']], 'glossary', len(gloss['terms']))
