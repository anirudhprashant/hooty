#!/usr/bin/env python3
"""Plain English for every card: many children reading Hooty did not grow up speaking English.

A model rewrites a batch of cards in very simple English and the code decides whether to accept each one. Numbers, blanks,
answers and option order may not change, the text may not get harder, a separate reader must still reach the same answer
without seeing the original, and a reviewer compares old and new for lost or changed meaning. Anything that fails keeps its
old wording. A question it calls nonsense is removed only if a second, independent read agrees.

Rewrites live in work/plain/<pack>.json keyed by the old text, so re-assembling a pack keeps them and new cards simply wait
for the next run. tools/assemble-pack.py applies them. Safe to stop and restart.

  python3 tools/plain.py            # worst cards first, every pack
  python3 tools/plain.py --sample mathematics-g6 20
"""
import glob, json, os, re, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
STORE = f'{ROOT}/work/plain'
PACKS = ['mathematics-g6', 'class6-science', 'class6-sst', 'english-g6', 'mathematics-g7', 'science-g7', 'social-science-g7']
# Hindi needs its own rules and checks, so it is not touched here.
QUESTION = {'mcq', 'truefalse', 'fillblank', 'matchpairs', 'dragorder', 'worked', 'explain', 'typeanswer', 'listenpick'}
READING = {'concept', 'hook'}
FIELDS = ('prompt', 'title', 'body', 'options', 'explanation', 'hint', 'steps', 'why', 'keyPoints', 'answer_text', 'points', 'kicker')

RULES = """Write in very simple English for a child in India who is still learning English. Many of these children speak another language at home.
- Use the most common everyday words. Think of an English learner at level A2.
- One idea in each sentence. At most 12 words in a sentence.
- Say who does what: "Ravi buys 3 pens", not "3 pens are bought".
- Put the facts first and ask the question last, as its own short sentence.
- No idioms, no fancy words, no "which of the following", no "respectively", no "such that".
- Use real things a child knows. Do not add a story that makes the sum harder to follow.
- KEEP the school word the lesson is teaching (equator, factor, photosynthesis). The child needs it for school and exams. If a hard school word is not the point of the question, use a simple word instead.
- Cut every word the sum or the idea does not need. Remove empty settings like "At school," or "In a market," when they add nothing.
- Prefer a word a 7-year-old knows: "start" not "initial", "join" not "connect", "more" not "additional", "find" not "determine", "how many in all" not "altogether".
- Say what a maths word means when the child may have forgotten it, in a few plain words: "an obtuse angle (bigger than 90 degrees)". Only if it does not give away the answer.
- The question must test exactly the same idea and be just as hard to THINK about. Only the English gets easier. Never give away the answer.

Examples of the change we want:
BEFORE: A ray is rotated through {n} equal blocks of movement, and each block contains {k} equal small turns. How many small turns of rotation are made altogether?
AFTER: A ray turns {n} times. Each time, it makes {k} small turns. How many small turns does it make in all?
BEFORE: In a market, {n} stalls are marked by points, and no three stall points lie on the same straight line. How many different straight lines are determined by pairs of stall points?
AFTER: Draw {n} dots. No three dots are on one straight line. Join every pair of dots with a straight line. How many lines do you draw?
BEFORE: Which reply best challenges this claim?
AFTER: Which answer shows that this idea is wrong?"""

def words(t): return re.findall(r"[^\W\d_]+(?:'[^\W\d_]+)?", t or '')
def sentences(t): return [s for s in re.split(r'(?<=[.?!])\s+|\n+', t or '') if s.strip()]
def longest(t): return max([len(words(s)) for s in sentences(t)] or [0])
def nums(t): return sorted(re.findall(r'\d+(?:[.,]\d+)*', t or ''))
def slots(t): return sorted(set(re.findall(r'\{[^}]+\}', t or '')))   # a program fills these, so saying one twice or once is fine
def blanks(t): return len(re.findall(r'_{2,}', t or ''))
HARD = re.compile(r"\b(which of the following|respectively|such that|whereas|hence|thus|therefore|whose|whom|altogether|arrangement|sensible|illustrate|nominal|however|although|despite|whereby|regarding|according to|in order to|determine|calculate|sum-based|estimated)\b", re.I)
def score(t): return max(0, longest(t) - 10) + sum(len(w) >= 11 for w in words(t)) * 2 + len(HARD.findall(t or '')) * 3

def path(pack): return f'{STORE}/{pack}.json'
def load(pack):
    try: return json.load(open(path(pack)))
    except FileNotFoundError: return {'cards': {}, 'seen': [], 'broken': {}, 'kept': {}}
def save(pack, d):
    f = tempfile.NamedTemporaryFile('w', dir=STORE, delete=False); json.dump(d, f, indent=0, ensure_ascii=False); f.close(); os.replace(f.name, path(pack))

def key(c): return c.get('gen', {}).get('template') or c.get('prompt') or c.get('body') or c.get('id', '')
def cards_in(pack):
    """Yield (lesson, list, card) for every card in the pack, however deeply it is nested."""
    out = []
    def walk(o, title=None):
        if isinstance(o, dict):
            title = o.get('title') if 'activities' in o else title
            if isinstance(o.get('activities'), list):
                for c in o['activities']: out.append((title, o['activities'], c))
            for k, v in o.items():
                if k != 'gen': walk(v, title)
        elif isinstance(o, list):
            for v in o: walk(v, title)
    walk(pack)
    return out

# ---- generated problems: the template and steps are what the child sees, with fresh numbers each time ----------------
def fill(new, tpl, shown):
    """Put the numbers shown in the stored example back into a rewritten template."""
    parts = re.split(r'(\{[^}]+\})', tpl); rx = ''; names = []
    for p in parts:
        if p.startswith('{') and p.endswith('}'): names.append(p); rx += '(.+?)'
        else: rx += re.escape(p)
    m = re.fullmatch(rx, shown or '', re.S)
    if not m: return None
    vals = dict(zip(names, m.groups()))
    return re.sub(r'\{[^}]+\}', lambda x: vals.get(x.group(0), x.group(0)), new)

def apply(pack_id, pack):
    """Swap in accepted rewrites and remove questions confirmed broken. Called by assemble-pack, no AI."""
    d = load(pack_id); changed = removed = 0
    for lesson, lst, c in cards_in(pack):
        k = key(c)
        if k in d['broken'] and c.get('type') not in READING and c.get('type') != 'worked':
            if c in lst and sum(x.get('type') in QUESTION for x in lst) > 4: lst.remove(c); removed += 1; continue
        n = d['cards'].get(k)
        if not n: continue
        g = c.get('gen')
        if g:
            shown, old = c.get('prompt'), g['template']
            if n.get('prompt') and slots(n['prompt']) == slots(old):
                f = fill(n['prompt'], old, shown)
                if f: c['prompt'] = f; g['template'] = n['prompt']
            if n.get('steps') and len(n['steps']) == len(g.get('steps') or []) and all(slots(a) == slots(b) for a, b in zip(n['steps'], g['steps'])):
                shown_steps = [fill(a, b, s) for a, b, s in zip(n['steps'], g['steps'], c.get('steps') or [])]
                if len(shown_steps) == len(n['steps']) and all(shown_steps):
                    c['steps'] = shown_steps; c['explanation'] = ' '.join(shown_steps)
                    g['steps'] = n['steps']
            if n.get('hint'): c['hint'] = n['hint']
            if n.get('options') and len(n['options']) == len(c.get('options') or []) and not g.get('options'): c['options'] = n['options']
        else:
            old_options = c.get('options')
            for f, v in n.items():
                if f in FIELDS or f in ('pairs', 'items'): c[f] = v
            if isinstance(c.get('why'), list) and c.get('options'): c['why'] = dict(zip(c['options'], c['why']))
            elif isinstance(c.get('why'), dict) and old_options and c.get('options'):   # rewrite left the notes alone: follow the new option text
                c['why'] = {new: c['why'].get(old, '') for old, new in zip(old_options, c['options'])}
        changed += 1
    return changed, removed

# ---- rewriting -------------------------------------------------------------------------------------------------------
def view(lesson, c):
    g = c.get('gen') or {}
    v = {'lesson': lesson, 'type': c['type']}
    for f in FIELDS:
        if c.get(f): v[f] = c[f]
    if g.get('template'): v['prompt'] = g['template']
    if g.get('steps'): v['steps'] = g['steps']; v.pop('explanation', None)
    # notes on each option are stored by the option's text; the writer sees them as a list in option order
    if isinstance(c.get('why'), dict) and c.get('options'): v['why'] = [c['why'].get(o, '') for o in c['options']]
    if c.get('pairs'): v['pairs'] = c['pairs']
    if c.get('items'): v['items'] = c['items']
    if c['type'] == 'fillblank': v['answers'] = c.get('answers')
    return v

ASK = """{rules}

Below are cards from a school lesson. Rewrite each in that simple English. Keep the same JSON fields; change only the wording.
Strict rules:
- Keep every number exactly. Keep every {{placeholder}} in curly brackets exactly as written, same count: they are filled in by a program.
- "options": same number, same order, each still right or wrong in the same way. Options stay short and alike in length.
- "why": same number, same order, one for each option.
- "______": keep the blank. The word for the blank stays the right answer. Never change "answers".
- "pairs", "items": same number and same order.
- If a card is already simple, return it unchanged.
- If a question truly makes no sense, says something false, or cannot be answered from what it says, do not rewrite it. That includes a question that needs something the child cannot see ("Table 2", "the diagram", "the learner", "the square and compass facts"). Return {{"broken": "the reason in a few words"}}.

Reply ONLY JSON: {{"cards": [ one object for each card, in the same order ]}}

CARDS:
{cards}"""

def keep_good_helpers(old, new):
    """Steps, hints and notes that fail a check keep their old wording, so one bad note cannot cost a child a clearer question."""
    for f in ('steps', 'why', 'points', 'keyPoints', 'hint', 'explanation', 'kicker', 'title'):
        if f in new and f in old and acceptable({f: old[f]}, {f: new[f]}): new[f] = old[f]

def acceptable(old, new):
    """The code's own check of one rewrite. Returns the reason it fails, or None."""
    if not isinstance(new, dict): return 'not an object'
    text_fields = [f for f in ('prompt', 'title', 'body', 'explanation', 'hint', 'kicker') if isinstance(old.get(f), str)]
    for f in text_fields:
        a, b = old[f], new.get(f, a if False else old[f])
        if not isinstance(b, str) or not b.strip(): return f'{f} empty'
        # a number inside brackets is a reminder of what a word means ("obtuse (bigger than 90 degrees)")
        if nums(a) != nums(re.sub(r'\([^)]*\)', '', b)) and nums(a) != nums(b): return f'{f} numbers changed'
        if slots(a) != slots(b): return f'{f} placeholders changed'
        if blanks(a) != blanks(b): return f'{f} blank changed'
        if len(words(b)) > len(words(a)) * 1.5 + 6: return f'{f} much longer'
        if longest(b) > max(16, longest(a)): return f'{f} long sentence'
    for f in ('options', 'steps', 'why', 'keyPoints', 'points', 'items', 'pairs'):
        if f not in old: continue
        a, b = old[f], new.get(f, old[f])
        if isinstance(a, dict) or not isinstance(a, list): continue
        if not isinstance(b, list) or len(a) != len(b): return f'{f} count changed'
        if f == 'pairs':
            if not all(isinstance(p, list) and len(p) == 2 and all(isinstance(x, str) and x.strip() for x in p) for p in b): return 'pairs shape'
            continue
        if not all(isinstance(x, str) and (x.strip() or f == 'why') for x in b): return f'{f} not text'   # some options have no note
        if f != 'steps' and nums(' '.join(a)) != nums(' '.join(b)): return f'{f} numbers changed'
        if f in ('options',) and any(nums(x) != nums(y) for x, y in zip(a, b)): return 'an option number moved'
        if f == 'steps' and any(slots(x) != slots(y) for x, y in zip(a, b)): return 'step placeholders'
        if f == 'items': pass
    if old.get('answers') and new.get('answers', old['answers']) != old['answers']: return 'answers changed'
    return None

def blind_ok(items, ask):
    """Someone who never saw the original reads the new question. They must reach the same answer."""
    if not items: return set()
    rows = '\n'.join(f"{i}. {q}" + (''.join(f'\n   {n}: {o}' for n, o in enumerate(opts)) if opts else ' (true or false?)') for i, (q, opts, _) in enumerate(items))
    r = ask(f'Answer each school question. Reply ONLY JSON: {{"answers": [for each question in order, the option number, or true/false, or null if the question is unclear]}}\n\n{rows}')
    got = r.get('answers') or []
    return {i for i, (q, o, want) in enumerate(items) if i < len(got) and got[i] == want and not isinstance(got[i], type(None))}

def reviewed(pairs, ask):
    """Second reader compares old and new. Returns the indexes that kept their meaning and got no harder."""
    rows = '\n\n'.join(f'{i}.\nOLD: {json.dumps(a, ensure_ascii=False)}\nNEW: {json.dumps(b, ensure_ascii=False)}' for i, (a, b) in enumerate(pairs))
    r = ask(f'''A rewrite of school questions into simpler English must keep the meaning. It may not change what is being tested, drop a needed fact, add a new fact, give away the answer, or make a right option wrong.
Reply ONLY JSON: {{"bad": [the numbers of rewrites that break any of these rules]}}. An empty list if all are fine.

{rows}''')
    bad = {x for x in r.get('bad', []) if isinstance(x, int)}
    return set(range(len(pairs))) - bad

def confirm_broken(c, reason, ask):
    r = ask(f'''A checker says this school question is broken: "{reason}". Read it yourself. Is it really nonsense, false, or impossible to answer with only what is written here (for example it needs a table or picture that is not shown)? Do not be fussy; odd wording alone is not broken.
Reply ONLY JSON: {{"broken": true or false}}

{json.dumps(view(None, c), ensure_ascii=False)}''')
    return r.get('broken') is True

def run_batch(pack_id, d, batch, write, check):
    olds = [view(l, c) for l, _, c in batch]
    r = write(ASK.format(rules=RULES, cards=json.dumps(olds, ensure_ascii=False, indent=0)))
    news = r.get('cards') or []
    if len(news) != len(batch): print('  wrong count, skipped', flush=True); return
    cand = []
    for (l, _, c), old, new in zip(batch, olds, news):
        k = key(c); d['seen'].append(k)
        if isinstance(new, dict) and new.get('broken'):
            if c.get('type') in QUESTION and confirm_broken(c, new['broken'], check): d['broken'][k] = new['broken']; print('  BROKEN', k[:90], '|', new['broken'], flush=True)
            continue
        if isinstance(new, dict): keep_good_helpers(old, new)
        why = acceptable(old, new)
        if why: d['kept'][k] = why; continue
        new.pop('lesson', None); new.pop('type', None)
        if all(new.get(f) == old.get(f) for f in new): continue
        cand.append((c, old, new))
    if not cand: return
    # the blind reader only sees fixed-answer questions; numbers come from the example values for generated ones
    blind, where = [], []
    for i, (c, old, new) in enumerate(cand):
        if c['type'] == 'mcq' and not c.get('gen'): blind.append((new.get('prompt', old['prompt']), new.get('options', old['options']), c['answer'])); where.append(i)
        elif c['type'] == 'truefalse': blind.append((new.get('prompt', old['prompt']), None, c['answer'])); where.append(i)
    passed = {where[i] for i in blind_ok(blind, check)} if blind else set()
    fine = reviewed([(o, n) for _, o, n in cand], check)
    for i, (c, old, new) in enumerate(cand):
        k = key(c)
        if i in where and i not in passed: d['kept'][k] = 'blind reader got a different answer'; continue
        if i not in fine: d['kept'][k] = 'reviewer said the meaning changed'; continue
        d['cards'][k] = {f: v for f, v in new.items() if f in FIELDS or f in ('pairs', 'items')}
        d['seen'] += [new[f] for f in ('prompt', 'body') if isinstance(new.get(f), str)]   # a rewritten card is not read again

def todo():
    rows = []
    for p in PACKS:
        pack = json.load(open(f'{ROOT}/public/content/packs/{p}/pack.json'))
        d = load(p); done = set(d['seen'])
        for tup in cards_in(pack):
            l, lst, c = tup
            t = c.get('type')
            if t not in QUESTION and t not in READING: continue
            k = key(c)
            if k in done: continue
            done.add(k)
            v = view(l, c)
            s = score(v.get('prompt') or v.get('body') or '') + sum(score(o) for o in v.get('options', []))
            rows.append((p, s, 0 if t in QUESTION else 1, tup))
    return rows

def main():
    from concurrent.futures import ThreadPoolExecutor
    import subprocess, threading, time
    from llm import m27, checker   # m27() writes with Haiku, falling back to DeepSeek and MiniMax
    sample = len(sys.argv) > 1 and sys.argv[1] == '--sample'
    rows = todo()
    if sample:
        rows = sorted([r for r in rows if r[0] == sys.argv[2]], key=lambda r: -r[1])[:int(sys.argv[3])]
    print(len(rows), 'cards to read', flush=True)
    publishing = threading.Lock(); done = [0]
    def pack_job(pid):
        """One worker to a book, so its store has one writer. Hard questions first, then hard reading, then the rest."""
        mine = sorted([r for r in rows if r[0] == pid], key=lambda r: (r[1] < 3, r[2], -r[1]))
        d = load(pid)
        for i in range(0, len(mine), 8):
            try: run_batch(pid, d, [r[3] for r in mine[i:i + 8]], m27, checker)
            except Exception as e: print('  failed:', pid, str(e)[:120], flush=True); time.sleep(60); continue
            save(pid, d); done[0] += 1
            print(f'{pid}: {min(i + 8, len(mine))}/{len(mine)} read, {len(d["cards"])} rewritten, {len(d["kept"])} kept, {len(d["broken"])} broken', flush=True)
            if done[0] % 80 == 0 and not sample and publishing.acquire(blocking=False):   # children get clearer wording as it is made
                try: subprocess.run([sys.executable, f'{HERE}/publish.py'], cwd=ROOT, capture_output=True)
                finally: publishing.release()
    with ThreadPoolExecutor(3) as ex: list(ex.map(pack_job, sorted({r[0] for r in rows}, key=PACKS.index)))

if __name__ == '__main__': main()
