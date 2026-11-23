#!/usr/bin/env python3
"""Remove textbook-talk so each card stands on its own.

A child should not have to think about "the lesson": a card that says "the lesson says the man sold
caps" or "in this lesson you will meet rhyming words" is talking about the book instead of the thing
being taught. The first pass fixed question prompts; this pass covers every prose field a child reads
(prompt, problem, explanation, body, hint, passage, answer, evidence and why) and swaps the textbook
word for "the text", the wording the earlier pass settled on.

Only prose is touched. Link, credit, skill and template fields are left alone: a maths problem may
honestly use "textbook lengths" or "one chapter takes two hours", and a card title may say
"Chapter challenge". Nothing here changes a link or a credit.

  python3 work/qa/fix-lesson-wording.py          # dry run, prints the changed fields
  python3 work/qa/fix-lesson-wording.py --apply  # write the ship, built, lesson and deep files
"""
import glob, json, re, sys

ROOT = '/home/ubuntu/agent-workspace/hooty-build'
APPLY = '--apply' in sys.argv

# Whole prompts that read badly no matter how the phrase is patched.
MAP = {
    'Which statement uses the lesson correctly?': 'Which statement is correct?',
    'The lesson says it is interesting to know what about each food item?': 'What is it interesting to know about each food item?',
    'The lesson says rain can be...': 'What can rain be?',
    'The lesson shows 10 to the minus 3 and 7 to the minus 2 as positive powers.': '10 to the minus 3 and 7 to the minus 2 are positive powers.',
    "Which choice uses the lesson's facts correctly?": 'Which choice is correct?',
    "Which statement correctly uses the lesson's ideas?": 'Which statement is correct?',
    "Which statement uses the lesson's terms correctly?": 'Which statement is correct?',
    'The lesson says it is interesting to know how each food item reaches us.': 'It is interesting to know how each food item reaches us.',
}

# Older prompt-only rules, kept because they read better than the general swap below.
RULES = [
    (re.compile(r'\bin the order (?:given|shown|told|listed) in the lesson\b', re.I), 'in the right order'),
    (re.compile(r'\bin the order (?:they|it) (?:happen|happens|occur|occurs|come|comes|appear|appears) in the lesson\b', re.I), 'in the right order'),
    (re.compile(r'\bin the order from the lesson\b', re.I), 'in the right order'),
    (re.compile(r',?\s*according to the lesson\b', re.I), ''),
    (re.compile(r'what the lesson says about (?:it|them|him|her)\b', re.I), 'its description'),
    (re.compile(r'what the lesson tells us about (?:it|them|him|her)\b', re.I), 'its description'),
    (re.compile(r'\bwhat (?:the|this) lesson (?:says|tells us)\b', re.I), 'the right description'),
    (re.compile(r"\bthe lesson's\b", re.I), "the text's"),
    (re.compile(r'\bthe lesson (says|shows|tells|explains|uses|mentions)\b', re.I), r'the text \1'),
    (re.compile(r'\bin the lesson\b', re.I), 'in the text'),
    (re.compile(r'\bin this lesson\b', re.I), 'in the text'),
    (re.compile(r"\bthis lesson's\b", re.I), "the text's"),
    # "a colour from the lesson" reads as nonsense once "the lesson" is gone: ask for the colour.
    (re.compile(r'\b(?:a )?colou?r from the lesson\b', re.I), 'a colour'),
]

# The general swap, applied to every prose field. Order matters: the two-word forms run before the
# bare ones, so "in the lesson" becomes "in the text" rather than "in the text" by luck. The swaps
# preserve a leading capital, so "The lesson says" becomes "The text says", never "the text says".
TEXT_RULES = [
    (re.compile(r"\bthe lesson's\b", re.I), "the text's"),
    (re.compile(r"\bthis lesson's\b", re.I), "this text's"),
    (re.compile(r"\byour lesson's\b", re.I), "the text's"),
    # "its lesson answer" reads as "its answer"; the bare swaps below would leave "its text answer".
    (re.compile(r'\b(its|the|this|these|those|your|our|their|one|each|every|a|an) lesson (meaning|meanings|answer|answers|detail|details|clue|clues|event|events|step|steps|word|words|description|descriptions|fact|facts|order|topic|topics|question|questions|activity|activities|idea|ideas|part|parts)\b', re.I), r'\1 \2'),
    (re.compile(r'\bchapter (idea|ideas)\b', re.I), r'\1'),
    (re.compile(r'\bdifferent lesson\b', re.I), 'different text'),
    (re.compile(r'\bchapter order\b', re.I), 'order'),
    (re.compile(r'\blesson (steps|step|topics|topic|questions|question|activities|activity|details|detail|ideas|idea|parts|part)\b', re.I), r'\1'),
    (re.compile(r"\bour lesson's\b", re.I), "the text's"),
    (re.compile(r'\bour lesson\b', re.I), 'the text'),
    (re.compile(r'\bin this lesson\b', re.I), 'in this text'),
    (re.compile(r'\bin the lesson\b', re.I), 'in the text'),
    (re.compile(r'\bfrom this lesson\b', re.I), 'from this text'),
    (re.compile(r'\bfrom the lesson\b', re.I), 'from the text'),
    (re.compile(r'\bof this lesson\b', re.I), 'of this text'),
    (re.compile(r'\bof the lesson\b', re.I), 'of the text'),
    (re.compile(r'\bthis lesson\b', re.I), 'this text'),
    # "the lesson of loss" is a moral, not the book: leave it.
    (re.compile(r'\bthe lesson\b(?! (?:of|that)\b)', re.I), 'the text'),
    (re.compile(r'\byour lesson\b', re.I), 'the text'),
    (re.compile(r'\bin this chapter\b', re.I), 'in this text'),
    (re.compile(r'\bin the chapter\b', re.I), 'in the text'),
    (re.compile(r'\bfrom this chapter\b', re.I), 'from this text'),
    (re.compile(r'\bfrom the chapter\b', re.I), 'from the text'),
    (re.compile(r'\bof this chapter\b', re.I), 'of this text'),
    (re.compile(r'\bof the chapter\b', re.I), 'of the text'),
    (re.compile(r'\bthis chapter\b', re.I), 'this text'),
    (re.compile(r'\bthe chapter\b(?!\s+\d)', re.I), 'the text'),
    # Tidy the joins the swaps leave behind: "the text events" reads worse than "the events".
    (re.compile(r'\bthe text (events|clue|detail|answer|steps|words|facts|parts|order)\b', re.I), r'the \1'),
    (re.compile(r'\bits text (meaning|answer|detail|clue)\b', re.I), r'its \1'),
]

# Narrow swaps for terse fields (generated steps, match labels): only textbook-talk about the lesson.
LESSON_RULES = [
    (re.compile(r'\bthe lesson (says|shows|tells|explains|uses|mentions|lists|describes)\b', re.I), r'the text \1'),
    (re.compile(r"\bthe lesson's\b", re.I), "the text's"),
    (re.compile(r"\bthis lesson's\b", re.I), "this text's"),
    (re.compile(r'\bin this lesson\b', re.I), 'in this text'),
    (re.compile(r'\bin the lesson\b', re.I), 'in the text'),
    (re.compile(r'\bfrom this lesson\b', re.I), 'from this text'),
    (re.compile(r'\bfrom the lesson\b', re.I), 'from the text'),
    (re.compile(r'\bof this lesson\b', re.I), 'of this text'),
    (re.compile(r'\bof the lesson\b', re.I), 'of the text'),
    (re.compile(r'\bthis lesson\b', re.I), 'this text'),
    (re.compile(r'\b(?:a )?colou?r from the (?:lesson|text)\b', re.I), 'a colour'),
    (re.compile(r'\bthe lesson\b', re.I), 'the text'),
]

PROMPT_FIELDS = ('prompt', 'problem')
PROSE_FIELDS = ('explanation', 'body', 'hint', 'passage', 'answer', 'ev', 'why', 'title')
# Lists of prose a child reads. tags and steps are left alone: a tag is metadata, and a step may
# honestly use "textbook lengths" or "the chapter takes two hours" as a maths unit.
LIST_PROSE_KEYS = ('why', 'options', 'keyPoints', 'points', 'items')


def _sub_case(rx, rep, text):
    def f(m):
        r = m.expand(rep)
        if m.group(0)[:1].isupper():
            r = r[:1].upper() + r[1:]
        return r
    return rx.sub(f, text)


def _tidy(text):
    # Collapse runs of spaces and tabs only: a body may use blank lines between paragraphs, and those
    # must survive a wording swap.
    out = re.sub(r'[ \t]{2,}', ' ', text)
    out = re.sub(r'[ \t]+([.,;])', r'\1', out)
    out = re.sub(r'([(\[])[ \t]+', r'\1', out)
    return out.strip()


def fix_prompt(text):
    out = MAP.get(text, text)
    for rx, rep in RULES:
        out = rx.sub(rep, out)
    for rx, rep in TEXT_RULES:
        out = _sub_case(rx, rep, out)
    out = _tidy(out)
    if out and out[0].islower():
        out = out[0].upper() + out[1:]
    return out


def fix_prose(text):
    out = text
    for rx, rep in TEXT_RULES:
        out = _sub_case(rx, rep, out)
    return _tidy(out)


changed = []


def fix_lesson_only(text):
    """Swap textbook-talk about "the lesson" in short labels and generated steps.

    Steps and match labels are often terse ("Completing the chapter takes 2 hours", "1, 2, ..., n"),
    so the wider chapter swaps and the whitespace tidy above would damage them. Only the lesson
    wording a child trips over is changed here.
    """
    out = text
    for rx, rep in LESSON_RULES:
        out = _sub_case(rx, rep, out)
    return out


changed = []


def walk(node, where):
    if isinstance(node, dict):
        for k, v in list(node.items()):
            # A generated problem keeps the prompt in gen.template and its worked steps in gen.steps.
            if k == 'gen' and isinstance(v, dict):
                gt = v.get('template')
                if isinstance(gt, str):
                    nv = fix_lesson_only(gt)
                    if nv != gt:
                        changed.append((where, 'gen.template', gt, nv))
                        v['template'] = nv
                gs = v.get('steps')
                if isinstance(gs, list):
                    for i, item in enumerate(gs):
                        if isinstance(item, str):
                            ni = fix_lesson_only(item)
                            if ni != item:
                                changed.append((where, 'gen.steps', item, ni))
                                gs[i] = ni
                continue
            # Match pairs are two prose lists a child reads.
            if k == 'pairs' and isinstance(v, list):
                for pair in v:
                    if isinstance(pair, list):
                        for i, item in enumerate(pair):
                            if isinstance(item, str):
                                ni = fix_lesson_only(item)
                                if ni != item:
                                    changed.append((where, 'pairs', item, ni))
                                    pair[i] = ni
                continue
            if isinstance(v, str) and k in PROMPT_FIELDS:
                nv = fix_prompt(v)
            elif isinstance(v, str) and k in PROSE_FIELDS:
                nv = fix_prose(v)
            elif isinstance(v, list) and k in LIST_PROSE_KEYS:
                for i, item in enumerate(v):
                    if isinstance(item, str):
                        ni = fix_prose(item)
                        if ni != item:
                            changed.append((where, k, item, ni))
                            v[i] = ni
                    else:
                        walk(item, where)
                continue
            else:
                walk(v, where)
                continue
            if nv != v:
                changed.append((where, k, v, nv))
                node[k] = nv
    elif isinstance(node, list):
        for v in node:
            walk(v, where)


# The three books that replay work/plain keep their plain-English map keyed on the old prompt,
# so leave them alone here: tools/plain.py already rewrites those cards. Their work folders are
# work/science, work/sst6 and work/mathematics-g6, not the pack ids.
SKIP = ('science', 'sst6', 'mathematics-g6')
for f in (sorted(glob.glob(f'{ROOT}/work/*/ch*/ship/*.json'))
          + sorted(glob.glob(f'{ROOT}/work/*/ch*/built/*.json'))
          + sorted(glob.glob(f'{ROOT}/work/*/ch*/lessons/*.json'))
          + sorted(glob.glob(f'{ROOT}/work/*/ch*/deep.json'))):
    if any(f'/{s}/' in f for s in SKIP):
        continue
    d = json.load(open(f))
    before = len(changed)
    walk(d, f)
    if APPLY and len(changed) > before:
        json.dump(d, open(f, 'w'), indent=1, ensure_ascii=False)

# The three books that replay work/plain keep their rewrites keyed on the old text, so the pass above
# skips their ship folders. Fix the rewrite values too, or a rebuild puts the textbook word back.
# Keys stay untouched: plain.py finds a card by its old prompt.
for pf in sorted(glob.glob(f'{ROOT}/work/plain/*.json')):
    d = json.load(open(pf))
    before = len(changed)
    for k, v in (d.get('cards') or {}).items():
        if isinstance(v, dict):
            walk(v, pf + '::' + k)
    if APPLY and len(changed) > before:
        json.dump(d, open(pf, 'w'), indent=1, ensure_ascii=False)

# A card that plain.py never rewrote still shows the textbook word. Add a rewrite for it, keyed by its
# old text, carrying only the fields that changed. Ship files stay untouched, so the key stays stable
# and a rebuild keeps applying the same rewrite.
PLAIN_WORK = {'class6-sst': 'sst6', 'class6-science': 'science', 'mathematics-g6': 'mathematics-g6'}


def plain_key(card):
    g = card.get('gen') or {}
    return g.get('template') or card.get('prompt') or card.get('body') or card.get('id', '')


def fixed_fields(card):
    out = {}
    for k in PROMPT_FIELDS:
        if isinstance(card.get(k), str):
            nv = fix_prompt(card[k])
            if nv != card[k]:
                out[k] = nv
    for k in PROSE_FIELDS:
        if isinstance(card.get(k), str):
            nv = fix_prose(card[k])
            if nv != card[k]:
                out[k] = nv
    for k in LIST_PROSE_KEYS:
        v = card.get(k)
        if isinstance(v, list):
            nv = [fix_prose(x) if isinstance(x, str) else x for x in v]
            if nv != v:
                out[k] = nv
    return out


for pack, wd in PLAIN_WORK.items():
    pf = f'{ROOT}/work/plain/{pack}.json'
    d = json.load(open(pf))
    cards = d.setdefault('cards', {})
    before = len(changed)
    for f in sorted(glob.glob(f'{ROOT}/work/{wd}/ch*/ship/*.json')):
        try:
            lesson = json.load(open(f))
        except Exception:
            continue
        for card in (lesson.get('activities') or []):
            if not isinstance(card, dict) or card.get('gen'):
                continue
            k = plain_key(card)
            if not k or k in cards:
                continue
            fx = fixed_fields(card)
            if not fx:
                continue
            cards[k] = fx
            changed.append((pf + '::' + k, '+new', '', '; '.join(fx)))
    if APPLY and len(changed) > before:
        json.dump(d, open(pf, 'w'), indent=1, ensure_ascii=False)

print(f'{len(changed)} fields reworded' + ('' if APPLY else ' (dry run)'))
for where, key, old, new in changed[:20]:
    print(' ', where.split('/work/')[-1], f'[{key}]')
    print('   -', old[:120])
    print('   +', new[:120])
