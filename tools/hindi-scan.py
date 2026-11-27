#!/usr/bin/env python3
"""Find Devanagari that a child cannot read, and count it the same way every time.

The NCERT Hindi PDFs were read by a text extractor that reorders matras: "दूसरी दुनिया" arrives as
"दसूरी दनिया", "संध्या" as "सधं ्या", and some characters arrive as U+FFFD. The strings are already
broken in the source, so they are broken in every card that quotes the book, which is exactly where a
child is being taught to read and spell.

Three shapes, all detectable without a dictionary:
  replacement  U+FFFD somewhere in the text
  detached     a matra or halant that starts a token, or a space inside a Devanagari word followed by
               a matra ("सधं ्या", "दनि ु या")
  doubled      the same vowel sign twice ("हैंं", "रााजाा")

  python3 tools/hindi-scan.py                 # every Hindi pack in public/content
  python3 tools/hindi-scan.py --json out.json # machine-readable, per lesson and per string
  python3 tools/hindi-scan.py --live          # the same against hooty.org (what a child actually gets)

Exit code 1 when anything is found, so a cron or a lane can gate on it.
"""
import glob
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPLACEMENT = '\ufffd'
CONSONANT = '\u0915-\u0939\u0958-\u095f\u0979\u097a'
MATRA = '\u093a-\u094c\u0951-\u0957\u0962\u0963'
HALANT = '\u094d'
ZERO_WIDTH = '\u200c\u200d\ufeff'

DETACHED_START = re.compile(r'[\s"\'(\[{]+[' + MATRA + HALANT + r']')
SPACE_INSIDE = re.compile(f'[{CONSONANT}][{MATRA}]?[\\s]+[{MATRA}{HALANT}]')
DOUBLED = re.compile(f'([{MATRA}])\\1')
STRAY_ZERO_WIDTH = re.compile(f'[{CONSONANT}][{ZERO_WIDTH}][{CONSONANT}]')


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


def anomalies(text):
    """Which of the three shapes this string carries, if any."""
    found = set()
    if REPLACEMENT in text:
        found.add('replacement')
    if DETACHED_START.search(text) or SPACE_INSIDE.search(text):
        found.add('detached')
    if DOUBLED.search(text):
        found.add('doubled')
    if STRAY_ZERO_WIDTH.search(text):
        found.add('zero-width')
    return found


def scan_pack(path_or_dict, label):
    data = path_or_dict
    if isinstance(path_or_dict, str):
        data = json.load(open(path_or_dict))
    rows = []
    for unit in data.get('units', []):
        for chapter in unit.get('chapters', []):
            for lesson in chapter.get('lessons', []):
                hits = []
                for activity in lesson.get('activities', []):
                    for text in strings(activity):
                        shapes = anomalies(text)
                        if shapes:
                            hits.append({'activity': activity.get('id') or activity.get('type'),
                                         'shapes': sorted(shapes), 'text': text[:300]})
                if hits:
                    rows.append({'book': label, 'lesson': lesson.get('id'), 'hits': hits})
    return rows


def fetch_live(book):
    url = f'https://hooty.org/content/packs/{book}/pack.json?x={os.urandom(3).hex()}'
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read())


def main():
    args = sys.argv[1:]
    live = '--live' in args
    out = None
    if '--json' in args:
        out = args[args.index('--json') + 1]
    only = None
    if '--book' in args:
        only = args[args.index('--book') + 1]

    if live:
        books = [only] if only else [f'hindi-g{i}' for i in range(1, 11)]
        packs = {book: fetch_live(book) for book in books}
        source = 'live site'
    else:
        paths = sorted(glob.glob(f'{ROOT}/public/content/packs/hindi-*/pack.json'))
        if only:
            paths = [p for p in paths if f'/{only}/' in p]
        packs = {os.path.basename(os.path.dirname(p)): p for p in paths}
        source = 'local packs'

    all_rows = []
    per_book = {}
    for book, pack in sorted(packs.items()):
        rows = scan_pack(pack, book)
        all_rows.extend(rows)
        per_book[book] = rows

    print(f'Devanagari scan of the {source}:')
    if not all_rows:
        print('  nothing to fix.')
    for book, rows in per_book.items():
        if rows:
            shapes = {}
            for row in rows:
                for hit in row['hits']:
                    for shape in hit['shapes']:
                        shapes[shape] = shapes.get(shape, 0) + 1
            detail = ', '.join(f'{k} {v}' for k, v in sorted(shapes.items()))
            print(f'  {book:11} {len(rows):>2} lessons  {detail}')
    lessons = len({(row["book"], row["lesson"]) for row in all_rows})
    total = len(all_rows)
    print(f'  total: {total} lessons carry unreadable Devanagari' if total else '  total: 0 lessons')

    if total:
        example = all_rows[0]
        print(f'  example: {example["book"]}/{example["lesson"]} — {example["hits"][0]["text"][:90]!r}')
    if out:
        json.dump(all_rows, open(out, 'w'), ensure_ascii=False, indent=1)
        print(f'  written to {out}')
    sys.exit(1 if total else 0)


if __name__ == '__main__':
    main()
