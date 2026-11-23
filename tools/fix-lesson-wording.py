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
    (re.compile(r'\bthe lesson\b', re.I), 'the text'),
    (re.compile(r'\byour lesson\b', re.I), 'the text'),
    (re.compile(r'\bin this chapter\b', re.I), 'in this text'),
    (re.compile(r'\bin the chapter\b', re.I), 'in the text'),
    (re.compile(r'\bfrom this chapter\b', re.I), 'from this text'),
    (re.compile(r'\bfrom the chapter\b', re.I), 'from the text'),
    (re.compile(r'\bof this chapter\b', re.I), 'of this text'),
    (re.compile(r'\bof the chapter\b', re.I), 'of the text'),
    (re.compile(r'\bthis chapter\b', re.I), 'this text'),
    (re.compile(r'\bthe chapter\b', re.I), 'the text'),
    (re.compile(r'\bthe textbook\b', re.I), 'the text'),
    (re.compile(r'\bthis textbook\b', re.I), 'this text'),
    (re.compile(r'\ba textbook\b', re.I), 'a text'),
    # Tidy the joins the swaps leave behind: "the text events" reads worse than "the events".
    (re.compile(r'\bthe text (events|clue|detail|answer|steps|words|facts|parts|order)\b', re.I), r'the \1'),
    (re.compile(r'\bits text (meaning|answer|detail|clue)\b', re.I), r'its \1'),
]

PROMPT_FIELDS = ('prompt', 'problem')
PROSE_FIELDS = ('explanation', 'body', 'hint', 'passage', 'answer', 'ev', 'why', 'title')


def _sub_case(rx, rep, text):
    def f(m):
        r = m.expand(rep)
        if m.group(0)[:1].isupper():
            r = r[:1].upper() + r[1:]
        return r
    return rx.sub(f, text)


def _tidy(text):
    out = re.sub(r'\s{2,}', ' ', text)
    out = re.sub(r'\s+([?.!,;])', r'\1', out)
    out = re.sub(r'([(\[])\s+', r'\1', out)
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


def walk(node, where):
    if isinstance(node, dict):
        for k, v in list(node.items()):
            if isinstance(v, str) and k in PROMPT_FIELDS:
                nv = fix_prompt(v)
            elif isinstance(v, str) and k in PROSE_FIELDS:
                nv = fix_prose(v)
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

print(f'{len(changed)} fields reworded' + ('' if APPLY else ' (dry run)'))
for where, key, old, new in changed[:20]:
    print(' ', where.split('/work/')[-1], f'[{key}]')
    print('   -', old[:120])
    print('   +', new[:120])
