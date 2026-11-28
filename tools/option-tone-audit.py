#!/usr/bin/env python3
"""Measure the absolute-qualifier leak in multiple-choice options, and hold the line on it.

A child who has not read the chapter can still pick the right option when it is the only sentence
without an absolute in it: a distractor says "only", "never", "must" or "always", the key does not, and
the key is therefore the only one that reads like a normal sentence. This counts that leak on the
shipped packs, per book, so the trend is a number and not an opinion.

  python3 tools/option-tone-audit.py                    # whole site, per book
  python3 tools/option-tone-audit.py --book social-science-g7 --show 20
  python3 tools/option-tone-audit.py --json work/qa/tone.json
  python3 tools/option-tone-audit.py --book social-science-g7 --max-leak 0.15   # exit 1 when over

Two counts, because they mean different things:
  leak   the key has no absolute and at least one distractor has one (the child has a hint)
  free   every distractor has one and the key has none (the child can pick by tone alone)

Why this tool does not rewrite anything: dropping the word turns many distractors into TRUE claims
("Only iron nails can sink" -> "Iron nails can sink"), which hands the child a second defensible answer
instead of one of the tells. A safe repair needs a new, plausible misconception per option, which is
authoring, not string surgery. The rule for that authoring is in work/PLAYBOOK.md; this tool is how you
see whether it is being followed.
"""
import argparse
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACKS = f'{ROOT}/public/content/packs'
ABS = re.compile(r'\b(only|every|must|always|without|never)\b', re.I)


def questions(pack):
    for unit in pack.get('units', []):
        for chapter in unit.get('chapters', []):
            for lesson in chapter.get('lessons', []):
                for a in lesson.get('activities', []):
                    if a.get('type') != 'mcq':
                        continue
                    opts = a.get('options') or []
                    ans = a.get('answer')
                    if len(opts) < 3 or not isinstance(ans, int) or not (0 <= ans < len(opts)):
                        continue
                    yield lesson.get('id', ''), a, opts, ans


def measure(pack):
    leak = free = 0
    rows = []
    for lid, a, opts, ans in questions(pack):
        key = opts[ans]
        if not isinstance(key, str) or ABS.search(key):
            continue
        dist = [o for i, o in enumerate(opts) if i != ans and isinstance(o, str)]
        n = sum(1 for d in dist if ABS.search(d))
        if not n:
            continue
        leak += 1
        if n == len(dist):
            free += 1
        rows.append({'id': a.get('id') or lid, 'prompt': (a.get('prompt') or '')[:100],
                     'key': key, 'lean': n, 'of': len(dist)})
    return leak, free, rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--book')
    ap.add_argument('--json')
    ap.add_argument('--show', type=int, default=8)
    ap.add_argument('--max-leak', type=float, help='exit 1 when this book is over this share of leaks')
    args = ap.parse_args()

    total = leak_total = free_total = 0
    per = {}
    rows_all = []
    for f in sorted(glob.glob(f'{PACKS}/*/pack.json')):
        book = f.split('/')[-2]
        if args.book and book != args.book:
            continue
        pack = json.load(open(f))
        leak, free, rows = measure(pack)
        n = sum(1 for _ in questions(pack))
        total += n
        leak_total += leak
        free_total += free
        per[book] = {'mcqs': n, 'leak': leak, 'free': free, 'share': round(leak / max(1, n), 4)}
        rows_all += [dict(book=book, **r) for r in rows]
    rows_all.sort(key=lambda r: (-r['lean'], r['book']))
    pct = leak_total / max(1, total)
    print(f'{total} MCQs, {leak_total} leak the qualifier ({pct:.1%}), '
          f'{free_total} can be answered by tone alone')
    for book, d in sorted(per.items(), key=lambda kv: -kv[1]['leak'])[:12]:
        if d['leak']:
            print(f"  {book:24s} leak {d['leak']:4d}  free {d['free']:3d}  of {d['mcqs']}  ({d['share']:.0%})")
    for r in rows_all[:args.show]:
        print(f"  [{r['book']}] {r['lean']}/{r['of']} distractors carry an absolute — {r['prompt']}")

    if args.json:
        os.makedirs(os.path.dirname(args.json), exist_ok=True)
        json.dump({'total': total, 'leak': leak_total, 'free': free_total, 'share': round(pct, 4),
                   'books': per, 'worst': rows_all[:400]}, open(args.json, 'w'), indent=1)
        print('wrote', args.json)

    if args.max_leak is not None:
        over = {b: d for b, d in per.items() if d['share'] > args.max_leak}
        if over:
            print('OVER the leak budget:', ', '.join(f'{b} {d["share"]:.0%}' for b, d in sorted(over.items())))
            sys.exit(1)
        print(f'every book is under {args.max_leak:.0%}')


if __name__ == '__main__':
    main()
