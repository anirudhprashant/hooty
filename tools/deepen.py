#!/usr/bin/env python3
"""Understanding, not just recall: reasoning questions and a think-it-through card for every lesson of a chapter.

  SPARKLE_SUBJECT=science python3 tools/deepen.py 3     (run by new-chapter.py; re-runnable, finished lessons are skipped)

Recall questions show a child remembered a sentence. These ask them to use it: predict what happens, explain why, connect a
cause to its effect, apply the idea to a new everyday situation, spot the mistake in someone's reasoning, or (for stories
and poems) infer what the text implies. They are also the style school papers are moving to (case-based, competency-based).

For each lesson M2.7 writes, from the lesson's checked facts only:
  "think"     one situation reasoned through in 3 or 4 steps (shown with the worked-example card)
  "questions" up to 6 multiple-choice reasoning questions, with a note on the misunderstanding behind each wrong option

Nothing is trusted because it was written. A question is kept only if a second, blind M2.7 reading the same facts picks the same
answer, and no number or year in it is missing from the facts. A third pass judges whether it really needs reasoning and
stays inside the lesson. Output: work/<book>/chNN/deep.json, merged by tools/assemble-pack.py."""
import json, os, re, sys
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from subjects import S as SUBJ, LANG_NOTE
from llm import m27
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = int(sys.argv[1]); W = os.environ.get('DEEPEN_DIR') or f"{ROOT}/{SUBJ['work']}/ch{N:02d}"
OUT = f'{W}/deep.json'
facts = json.load(open(f'{W}/facts.json'))
out = json.load(open(OUT)) if os.path.exists(OUT) else {}
GRADE = str(SUBJ.get('grade', '6')); AGE = int(GRADE) + 5 if GRADE.isdigit() else 11
NUM = re.compile(r'\d[\d,]*(?:\.\d+)?')
SCI, SOC = {'Science', 'Physics', 'Chemistry', 'Biology', 'The World Around Us'}, {'Social Science', 'History', 'Geography', 'Political Science', 'Economics'}
STYLE = {
    'Science': 'predict what happens in an everyday situation or experiment, explain WHY something happens, choose the fair test, or find the flaw in a claim',
    'Social Science': 'connect a cause to its effect, compare two places or times, decide what a map or a source tells us, apply a rule of government to a real situation, or explain why people acted as they did',
    'English': 'infer what a character feels or why they act, find what a line of a poem or story implies, or work out a word from its context',
    'Hindi': 'infer what a character feels or why they act, find what a line of a poem or story implies, or work out a word from its context',
}.get('Science' if SUBJ['name'] in SCI else 'Social Science' if SUBJ['name'] in SOC else SUBJ['name'], 'apply the idea to a new situation, explain why, or find the flaw in a claim')

def nums_ok(text, sheet):
    return all(n.replace(',', '') in sheet.replace(',', '') for n in NUM.findall(text))

def ask(lesson):
    sheet = '\n'.join(f"- FACT {f['id']}: {f['say']}" for f in lesson['facts'])
    return m27(f'''{LANG_NOTE}
You are a brilliant Class {GRADE} {SUBJ['name']} teacher helping a {AGE}-year-old truly UNDERSTAND a lesson called "{lesson['title']}", not just remember it. Use ONLY these facts; add no new facts, names, numbers or dates:
{sheet}

Write:
1. "think": one situation reasoned through. "problem": a short everyday situation or question that makes a child curious. "steps": 3 or 4 short sentences that reason it out, one idea each, saying WHY at each point, and reaching a clear conclusion.
2. "questions": 6 multiple-choice questions that need THINKING: {STYLE}. Set them in new, concrete situations a child recognises. A child who only memorised sentences should find them hard, and one who understood should find them fair.
Never ask "which statement is true", "what is X called" or anything answered by copying a sentence. Every wrong option must be a believable mistake a child really makes. Keep all four options a similar length. Very simple English for a child still learning it: common everyday words, one idea per sentence, at most 12 words a sentence, facts first and the question last. Keep the school word being taught.
Each question has: "prompt", "options" (4), "answer" (index of the right option), "why" (a list of 4: for each option, one short sentence; for the right one say why it is right, for a wrong one name the misunderstanding behind it), "skill" (one or two words), "f" (the fact ids it depends on).
Reply ONLY JSON: {{"think":{{"problem":"...","steps":["..."],"f":["1.1"]}},"questions":[{{"prompt":"...","options":["..."],"answer":0,"why":["..."],"skill":"predict","f":["1.1"]}}]}}''')

def blind(q, sheet):
    """A reader who sees the facts and the question, but not the answer, must reach the same option."""
    opts = '\n'.join(f'{i}: {o}' for i, o in enumerate(q['options']))
    r = m27(f'Using these facts and sensible reasoning, answer the question.\n\nFACTS:\n{sheet}\n\nQUESTION: {q["prompt"]}\n{opts}\n\nReply with ONLY the number of the best option.', want_json=False)
    m = re.search(r'\d', str(r or ''))
    return m and int(m.group(0)) == q['answer']

def well_made(qs, lesson, sheet):
    rows = '\n'.join(f"{i}: {q['prompt']} | right answer: {q['options'][q['answer']]}" for i, q in enumerate(qs))
    d = m27(f'''A strict teacher reviews reasoning questions for a Class {GRADE} lesson called "{lesson['title']}". Facts taught:\n{sheet}\n\nQuestions:\n{rows}\n\nKeep a question only if: answering needs reasoning and not just repeating a sentence; the facts really support the right answer; it does not rely on anything outside these facts; it is clear and suitable for a {AGE}-year-old. Reply ONLY JSON: {{"keep":[0,2]}}''')
    return set((d or {}).get('keep', []))

AR_OPTIONS = {'en': ['Both A and R are true, and R is the correct explanation of A.', 'Both A and R are true, but R is not the correct explanation of A.', 'A is true but R is false.', 'A is false but R is true.'],
              'hi': ['A और R दोनों सही हैं, और R, A की सही व्याख्या है।', 'A और R दोनों सही हैं, पर R, A की सही व्याख्या नहीं है।', 'A सही है पर R गलत है।', 'A गलत है पर R सही है।']}

def exam_extras(lesson):
    """The styles school papers use that recall questions never practise: a case study, assertion-reason (Class 8 up) and a written answer."""
    sheet = '\n'.join(f"- {f['say']}" for f in lesson['facts'])
    g = int(GRADE) if GRADE.isdigit() else 6
    d = m27(f'''{LANG_NOTE}
You prepare a Class {GRADE} {SUBJ['name']} student ({AGE} years old) for the kinds of question school papers ask, on a lesson called "{lesson['title']}". Use ONLY these facts; add no new facts, names, numbers or dates:
{sheet}

Write ORIGINAL questions, not copied from any paper:
"case": a short real-life case. "passage": 40 to 80 words setting a situation that uses these facts. "questions": 3 multiple-choice questions that make the student APPLY the idea to the case: what would happen next or if something changed, why something in the case happened, or what the person should do. The answer must NOT be a phrase that can be copied from the passage, and every wrong option must be a believable mistake of the same kind as the right answer. Each has "prompt", "options" (4), "answer" (index), "why" (4 short notes, one per option).
"assertion": {'2 items, each with "a" (a statement), "r" (a statement giving a possible reason), and "answer": 0 if both true and r explains a, 1 if both true but r does not explain a, 2 if a true and r false, 3 if a false and r true, and "why": one short sentence. Use a mix of answers.' if g >= 8 else 'an empty list.'}
"explain": 2 questions needing a written answer ("explain why", "how does", "what is the difference between"), each with "prompt", "answer" (a model answer of {'60 to 100' if g >= 8 else '25 to 50'} words a good student would write) and "points" (3 or 4 short points a marker looks for).
Reply ONLY JSON: {{"case":{{"passage":"...","questions":[{{"prompt":"...","options":["..."],"answer":0,"why":["..."]}}]}},"assertion":[],"explain":[{{"prompt":"...","answer":"...","points":["..."]}}]}}''')
    if not d: return None
    ex = {'case': None, 'assertion': [], 'explain': []}
    c = d.get('case') or {}
    if isinstance(c.get('passage'), str) and nums_ok(c['passage'], sheet):
        context = sheet + '\nCASE: ' + c['passage']
        good = []
        for q in c.get('questions', []):
            o = q.get('options') or []
            if len(o) == 4 and isinstance(q.get('answer'), int) and 0 <= q['answer'] < 4 and len({str(x).lower() for x in o}) == 4 and all(isinstance(x, str) for x in o) and nums_ok(' '.join([q['prompt']] + o), context) and blind(q, context): good.append(q)
        kept = well_made(good, lesson, context) if good else set()
        good = [q for i, q in enumerate(good) if i in kept]
        if len(good) >= 2: ex['case'] = {'passage': c['passage'], 'questions': good}
    if g >= 8:
        opts = AR_OPTIONS['hi' if SUBJ.get('language') == 'hi' else 'en']
        for it in d.get('assertion') or []:
            if not all(isinstance(it.get(k), str) for k in 'ar') or it.get('answer') not in (0, 1, 2, 3) or not nums_ok(it['a'] + ' ' + it['r'], sheet): continue
            q = {'prompt': f"Assertion (A): {it['a']}\nReason (R): {it['r']}", 'options': opts, 'answer': it['answer'], 'why': it.get('why', '')}
            if blind(q, sheet): ex['assertion'].append(q)
    for it in d.get('explain') or []:
        if isinstance(it.get('prompt'), str) and isinstance(it.get('answer'), str) and isinstance(it.get('points'), list) and 2 <= len(it['points']) <= 5 and nums_ok(it['answer'] + ' '.join(map(str, it['points'])), sheet):
            ex['explain'].append({'prompt': it['prompt'], 'answer': it['answer'], 'points': [str(x) for x in it['points']]})
    if ex['explain']:     # the model answer must stay inside the lesson
        rows = '\n'.join(f"{i}: {e['answer']}" for i, e in enumerate(ex['explain']))
        k = m27(f'FACTS:\n{sheet}\n\nThese are model answers. Keep one only if everything it says is supported by the facts. Reply ONLY JSON: {{"keep":[0]}}\n\n{rows}')
        keep = set((k or {}).get('keep', []))
        ex['explain'] = [e for i, e in enumerate(ex['explain']) if i in keep]
    return ex

def make(lesson):
    key = lesson['id'][1:]
    if key in out:
        if 'extras' not in out[key]:
            ex = exam_extras(lesson)
            if ex is not None:
                out[key]['extras'] = ex
                json.dump(out, open(OUT, 'w'), indent=1, ensure_ascii=False)
                print(f"lesson {key}: exam styles: case {'yes' if ex['case'] else 'no'}, assertion {len(ex['assertion'])}, written {len(ex['explain'])}", flush=True)
        return
    sheet = '\n'.join(f"- {f['say']}" for f in lesson['facts'])
    ids = {f['id'] for f in lesson['facts']}
    d = ask(lesson)
    if not d: print('no result for', key, flush=True); return
    good = []
    for q in d.get('questions', []):
        o = q.get('options') or []
        if len(o) != 4 or not isinstance(q.get('answer'), int) or not 0 <= q['answer'] < 4 or len({str(x).lower() for x in o}) < 4: continue
        if not all(isinstance(x, str) for x in o) or not isinstance(q.get('prompt'), str): continue
        if not nums_ok(' '.join([q['prompt']] + o), sheet): continue
        lens = [len(x) for x in o]
        if lens[q['answer']] > 25 and lens[q['answer']] > 1.6 * max(l for i, l in enumerate(lens) if i != q['answer']): continue   # the longest option gives it away
        if blind(q, sheet): good.append(q)
    kept = well_made(good, lesson, sheet) if good else set()
    good = [q for i, q in enumerate(good) if i in kept]
    for q in good: q['f'] = [x for x in q.get('f', []) if x in ids] or [lesson['facts'][0]['id']]
    t = d.get('think') or {}
    steps = [x for x in t.get('steps', []) if isinstance(x, str)]
    think = None
    if t.get('problem') and 3 <= len(steps) <= 5 and nums_ok(' '.join([t['problem']] + steps), sheet):
        think = {'problem': t['problem'], 'steps': steps, 'f': [x for x in t.get('f', []) if x in ids] or [lesson['facts'][0]['id']]}
    out[key] = {'think': think, 'questions': good}
    ex = exam_extras(lesson)
    if ex is not None: out[key]['extras'] = ex
    json.dump(out, open(OUT, 'w'), indent=1, ensure_ascii=False)
    print(f"lesson {key}: {len(good)} reasoning questions kept of {len(d.get('questions', []))}, think card: {'yes' if think else 'no'}", flush=True)

only = os.environ.get('ONLY_LESSON')
with ThreadPoolExecutor(2) as ex: list(ex.map(make, [l for l in facts['lessons'] if not only or l['id'][1:] == only]))
