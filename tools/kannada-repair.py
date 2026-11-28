#!/usr/bin/env python3
"""Repair the lines the Kannada converter could not finish, and prove how many are left.

`tools/ktbs-book.py` parks every line it could not convert in the lesson's `damaged` list instead of deleting
it. This works that list: it cleans out the alphabet band, applies the current glyph overrides, and puts a
line back into its paragraph the moment it converts whole. What it cannot fix it reports with the raw context
around each stray glyph, because that context is what tells a reader which Kannada the glyph stands for — and
the answer goes into `work/qa/kannada-overrides.json`, which makes the next pass fix every occurrence at once.

  python3 tools/kannada-repair.py --report               # where the damage is, worst first, with context
  python3 tools/kannada-repair.py --apply                # repair what the current rules cover
  python3 tools/kannada-repair.py --apply --book kannada-g1

Exit 0 only when nothing is left. A line that cannot be repaired stays in `damaged`: it is never dropped.
"""
import argparse
import collections
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OVERRIDES = f'{ROOT}/work/qa/kannada-overrides.json'
RESIDUE = re.compile(r'[\u0080-\u00FF]')
WORD = re.compile(r'[\u0C80-\u0CFF]{2,}')

from importlib import import_module

kannada_text = import_module('kannada-text'.replace('-', '_')) if False else None


def load_converter():
    import importlib.util
    spec = importlib.util.spec_from_file_location('ktext', f'{os.path.dirname(os.path.abspath(__file__))}/kannada-text.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def lessons(slug=None):
    pattern = f'{ROOT}/work/*/kn/ch*.json'
    for path in sorted(glob.glob(pattern)):
        if slug and f'/work/{slug}/' not in path:
            continue
        yield path, json.load(open(path))


def band_free(text):
    """Strip the alphabet band that every page carries: runs of one/two-letter tokens with an ascii one."""
    tokens = text.split()
    out, index = [], 0
    while index < len(tokens):
        run = index
        while run < len(tokens) and len(tokens[run]) <= 2:
            run += 1
        if run - index >= 2 and any(re.search(r'[A-Za-z@|!]', token) for token in tokens[index:run]):
            index = run
            continue
        out.append(tokens[index])
        index += 1
    return ' '.join(out)


MARK = re.compile(r'[\u0CBE-\u0CD6\u0CE2-\u0CE3]')


def tidy(text):
    """Rules that hold for every line, learned from the corpus rather than guessed per word.

    - `À` is the head-stroke glyph of the font: wherever it survived the mapping it is a leftover mark, not a
      letter, so it goes.
    - A space in front of a vowel sign or a virama can never be right: those marks attach to the letter before
      them, so the space is closed up.
    """
    text = text.replace('À', '')
    text = re.sub(r'\s+(?=[\u0CBE-\u0CD6\u0CE2-\u0CE3])', '', text)
    return text


def clean_candidate(text, fixups):
    """A repaired line, or None if a stray glyph is still in it afterwards."""
    text = tidy(band_free(text))
    for glyph, replacement in fixups.items():
        text = text.replace(glyph, replacement)
    text = ' '.join(text.split())
    if RESIDUE.search(text):
        return None
    if len(WORD.findall(text)) < 3:
        return None
    return text


def report(slug=None):
    totals = collections.Counter()
    contexts = collections.Counter()
    for path, lesson in lessons(slug):
        for item in lesson.get('damaged', []):
            totals[lesson['title']] += 1
            for found in RESIDUE.finditer(item['text']):
                start = max(0, found.start() - 8)
                contexts[item['text'][start:found.start()] + '⟦' + found.group(0) + '⟧'
                         + item['text'][found.end():found.end() + 8]] += 1
    damaged = sum(totals.values())
    print(f'{damaged} damaged lines waiting')
    for title, count in totals.most_common(10):
        print(f'  {count:4} {title}')
    print('most common damage, with the text either side of the stray glyph:')
    for context, count in contexts.most_common(20):
        print(f'  {count:4} {context!r}')
    return damaged


def apply(slug=None, dry=False):
    fixups = json.load(open(OVERRIDES)) if os.path.exists(OVERRIDES) else {}
    repaired = remaining = 0
    for path, lesson in lessons(slug):
        keep = []
        paragraphs = list(lesson['paragraphs'])
        for item in lesson.get('damaged', []):
            candidate = clean_candidate(item['text'], fixups)
            if candidate:
                place = min(item['at'], len(paragraphs))
                paragraphs.insert(place, candidate)
                repaired += 1
            else:
                keep.append(item)
                remaining += 1
        if repaired and not dry:
            lesson['paragraphs'] = paragraphs
            lesson['damaged'] = keep
            lesson['clean_lines'] = len(paragraphs)
            lesson['dropped_lines'] = len(keep)
            json.dump(lesson, open(path, 'w'), ensure_ascii=False, indent=1)
    print(f'{repaired} lines put back, {remaining} still damaged')
    return remaining


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--report', action='store_true')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--book')
    parser.add_argument('--dry', action='store_true')
    args = parser.parse_args()
    if args.apply:
        remaining = apply(args.book, args.dry)
        sys.exit(0 if remaining == 0 else 1)
    damaged = report(args.book)
    sys.exit(0 if damaged == 0 else 1)


if __name__ == '__main__':
    main()
