#!/usr/bin/env python3
"""Fun facts for every lesson: a small "Did you know?" that makes a child want to tell someone.

They come from outside the textbook, so they cannot be traced to it the way lesson facts are. Instead Haiku writes them and
two different models must each say a fact is definitely true, separately. A doubt from either one drops the fact, and a lesson
with no safe fact simply has none. Results stay in work/funfacts/<pack>.json and tools/assemble-pack.py adds them to the pack.
Safe to stop and restart.

  python3 tools/funfacts.py                 # every book, every chapter not done yet
  python3 tools/funfacts.py --sample science-g7 1
"""
import glob, json, os, re, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
STORE = f'{ROOT}/work/funfacts'
os.makedirs(STORE, exist_ok=True)

WRITE = """You find fun facts for children in India in Class {grade} (about {age} years old).{lang}
For each lesson below, write 3 fun facts connected to what the lesson teaches.

Each fact must:
- Make a child say "wow!" and want to tell a friend. Surprising, about real things, not a repeat of what the lesson says.
- Be a well-documented fact you are completely sure of. No myths, no "people say". Avoid records like "the biggest in the world" and exact numbers unless they are very famous and certain.
- Be in very simple English for a child still learning it: one or two short sentences, at most 25 words, common words.
- Be fine for a young child: nothing frightening, gross, sad or about violence, religion or politics.
Examples from India are very welcome, when true.

Reply ONLY JSON: {{"lessons": {{"lesson id": ["fact", "fact", "fact"]}}}}

LESSONS:
{lessons}"""

CHECK = """You are a strict fact checker for a children's learning app. A wrong fact would be taught to children as true.
Check each fact. Keep it only if ALL of these hold: you are certain it is true and well documented (not a popular myth, not exaggerated, not true only sometimes); it is suitable for a young child; it makes sense as written. If you have any doubt, reject it.
Reply ONLY JSON: {{"true": [the numbers of the facts that pass]}}

{facts}"""

def lesson_gist(l):
    bits = [a.get('body', '') for a in l.get('activities', []) if a.get('type') == 'concept'][:2]
    return {'id': l['id'], 'title': l['title'], 'about': ' '.join(bits)[:350]}

def passed(facts, ask):
    rows = '\n'.join(f'{i}. {f}' for i, f in enumerate(facts))
    r = ask(CHECK.format(facts=rows))
    return {x for x in (r or {}).get('true', []) if isinstance(x, int)} if r else set()

def path(pack): return f'{STORE}/{pack}.json'
def load(pack):
    try: return json.load(open(path(pack)))
    except FileNotFoundError: return {'facts': {}, 'chapters': []}
def save(pack, d):
    f = tempfile.NamedTemporaryFile('w', dir=STORE, delete=False); json.dump(d, f, indent=0, ensure_ascii=False); f.close(); os.replace(f.name, path(pack))

def apply(pack_id, pack):
    """No AI: put the checked facts on their lessons. Called by assemble-pack."""
    facts = load(pack_id)['facts']; n = 0
    for u in pack['units']:
        for c in u['chapters']:
            for l in c['lessons']:
                if facts.get(l['id']): l['funFacts'] = facts[l['id']]; n += 1
    return n

def chapter(pack_id, pack, c, d, m27):
    hindi = pack.get('language') == 'hi'
    grade = str(pack.get('grade', '6')); age = int(grade) + 5 if grade.isdigit() else 11
    r = m27(WRITE.format(grade=grade, age=age, lang=' Write the facts in simple Hindi in Devanagari script, not English.' if hindi else '', lessons=json.dumps([lesson_gist(l) for l in c['lessons']], ensure_ascii=False)))
    if not r: return False
    ids = {l['id'] for l in c['lessons']}
    pool = [(lid, f.strip()) for lid, fs in (r.get('lessons') or {}).items() if lid in ids for f in fs if isinstance(f, str) and f.strip() and len(f.split()) <= 34]
    if not pool: return False
    texts = [f for _, f in pool]
    first = passed(texts, m27)                                          # a fresh Haiku session
    second = passed(texts, lambda p: m27(p, minimax_only=True))         # a different model altogether
    both = first & second
    for i, (lid, f) in enumerate(pool):
        if i in both: d['facts'].setdefault(lid, []).append(f)
    print(f'{pack_id} {c["id"]}: {len(both)} of {len(pool)} facts passed', flush=True)
    return True

def main():
    from llm import m27
    sample = len(sys.argv) > 1 and sys.argv[1] == '--sample'
    only = sys.argv[2] if sample else None
    for f in sorted(glob.glob(f'{ROOT}/public/content/packs/*/pack.json')):
        pid = f.split('/')[-2]
        if only and pid != only: continue
        pack = json.load(open(f)); d = load(pid); n = 0
        for u in pack['units']:
            for c in u['chapters']:
                if c['id'] in d['chapters']: continue
                if sample and n >= int(sys.argv[3]): return
                if chapter(pid, pack, c, d, m27): d['chapters'].append(c['id']); save(pid, d)
                n += 1

if __name__ == '__main__': main()
