#!/usr/bin/env python3
"""Find English text the PDF extractor shredded, the way hindi-scan.py finds broken Devanagari.

The extractor sometimes drops a space and sometimes splits one word into pieces: "Most cities seem to have
been surrounded by walls" arrives as "ost cities seem to have been s rro nded b walls". There is no shape a
regex can prove here either, so this uses the corpus against itself: a pair of fragments that joins into a
word the rest of our own books use, where neither fragment is itself a common word, is a split.

  python3 tools/english-scan.py                # every English pack in public/content
  python3 tools/english-scan.py --live         # what the site actually serves
  python3 tools/english-scan.py --json out.json
  python3 tools/english-scan.py --book english-g6

Exit code 1 while anything is found, so a lane or a publish gate can check on it.
"""
import argparse
import collections
import glob
import json
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WORD = re.compile(r"[A-Za-z][A-Za-z']*")
LIVE_FLAG = [False]
COMMON_RANK = 400        # a fragment that is itself an everyday word is probably not a fragment
MIN_JOINED = 6           # "in to" -> "into" is too short to be worth flagging
MIN_JOINED_USES = 4      # the joined form must appear that often elsewhere to count as a real word


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


def load_packs(book=None, live=False):
    packs = {}
    if live:
        names = [book] if book else [f'english-g{i}' for i in range(1, 11)] + ['class6-science', 'class6-sst',
                                                                              'science-g7', 'science-g8',
                                                                              'social-science-g7', 'social-science-g8',
                                                                              'social-science-g9', 'social-science-g10']
        for name in names:
            url = f'https://hooty.org/content/packs/{name}/pack.json?x={os.urandom(3).hex()}'
            request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)'})
            with urllib.request.urlopen(request, timeout=60) as response:
                packs[name] = json.loads(response.read())
        return packs
    pattern = f'{ROOT}/public/content/packs/{book}/pack.json' if book else f'{ROOT}/public/content/packs/*/pack.json'
    for path in sorted(glob.glob(pattern)):
        name = os.path.basename(os.path.dirname(path))
        if name.startswith('hindi'):
            continue
        packs[name] = json.load(open(path))
    return packs


def build_vocabulary(packs):
    # The corpus is 43 books and takes minutes to walk, so it is cached; --rebuild after a content change.
    cache = f'{ROOT}/work/qa/english-vocab.json'
    fresh = os.path.exists(cache) and '--rebuild' not in sys.argv and not LIVE_FLAG[0]
    if fresh:
        try:
            return collections.Counter(json.load(open(cache)))
        except Exception:
            pass
    counts = collections.Counter()
    for data in packs.values():
        for text in strings(data):
            for token in WORD.findall(text.lower()):
                counts[token] += 1
    try:
        os.makedirs(os.path.dirname(cache), exist_ok=True)
        json.dump(dict(counts), open(cache, 'w'))
    except Exception:
        pass
    return counts


SHORT_OK = {'a', 'i', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'is', 'it', 'as', 'or', 'no', 'so', 'we',
            'he', 'be', 'do', 'if', 'my', 'up', 'us', 'am', 'me', 'go', 'kg', 'cm', 'mm', 'km', 'ml', 'rs',
            'dr', 'mr', 'mrs', 'ms', 'st', 'vs', 'ph', 'eg', 'ie', 'ok', 'oh', 'ah', 'ha', 'hi', 'id', 'ex'}


def scan_string(text, counts, rank):
    """Fragments that rejoin into a word we use elsewhere, and words that lost a leading letter."""
    hits = []
    tokens = [m.group(0) for m in WORD.finditer(text)]

    def rare(word):
        return counts[word.lower()] < 3 and rank.get(word.lower(), 10 ** 6) > COMMON_RANK

    for i in range(len(tokens) - 1):
        a, b = tokens[i], tokens[i + 1]
        joined = (a + b).lower()
        if len(joined) >= MIN_JOINED and counts[joined] >= MIN_JOINED_USES and rare(a) and rare(b):
            hits.append(f'{a} {b} -> {joined}')
            continue
        if i + 2 < len(tokens):
            c = tokens[i + 2]
            joined3 = (a + b + c).lower()
            if (len(joined3) >= MIN_JOINED and counts[joined3] >= MIN_JOINED_USES
                    and rare(a) and rare(b) and rare(c)):
                hits.append(f'{a} {b} {c} -> {joined3}')

    # a fragment: a one-to-three letter token that is not an ordinary short word. In clean English this is
    # rare; in extracted text it is the signature of a word that was cut into pieces.
    for word in tokens:
        low = word.lower()
        if low in SHORT_OK or not low.isalpha() or len(low) > 3:
            continue
        if counts[low] < 2 and rank.get(low, 10 ** 6) > 3000:
            hits.append(f'fragment {low!r}')

    # a word that lost its first letter: "ost" where "most" is ordinary and "ost" is not
    common_endings = {}
    for i, (word, uses) in enumerate(counts.most_common(4000)):
        if len(word) >= 4:
            common_endings.setdefault(word[1:], word)
    for word in tokens:
        low = word.lower()
        if len(low) < 3 or counts[low] >= 2:
            continue
        longer = common_endings.get(low)
        if longer and counts[longer] >= 20:
            hits.append(f'{low!r} missing its first letter ({longer})')
    return hits


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--book')
    parser.add_argument('--json')
    parser.add_argument('--limit', type=int, default=6)
    args = parser.parse_args()

    LIVE_FLAG[0] = args.live
    packs = load_packs(args.book, args.live)
    # The vocabulary has to be the whole catalogue even when only one book is being scanned, or an ordinary
    # word that happens to appear once in that book reads as a fragment ("table" -> "stable").
    vocab_packs = packs if not args.book else load_packs(None, args.live)
    counts = build_vocabulary(vocab_packs)
    rank = {word: i for i, (word, _) in enumerate(counts.most_common(), start=1)}

    rows, per_book = [], collections.Counter()
    for name, data in sorted(packs.items()):
        for unit in data.get('units') or []:
            for chapter in unit.get('chapters') or []:
                for lesson in chapter.get('lessons') or []:
                    hits = []
                    for text in strings(lesson.get('activities') or []):
                        for hit in scan_string(text, counts, rank):
                            hits.append({'found': hit, 'text': text[:160]})
                    if hits:
                        rows.append({'book': name, 'lesson': lesson.get('id'), 'hits': hits[:args.limit]})
                        per_book[name] += 1

    where = 'live site' if args.live else 'local packs'
    print(f'shredded English in the {where}:')
    for name, count in per_book.most_common():
        print(f'  {name:22} {count:>3} lessons')
    total = sum(per_book.values())
    print(f'  total: {total} lessons' if total else '  total: 0 lessons')
    for row in rows[:3]:
        print(f'  e.g. {row["book"]}/{row["lesson"]}: {row["hits"][0]["found"]}')
    if args.json:
        json.dump(rows, open(args.json, 'w'), ensure_ascii=False, indent=1)
        print(f'  written to {args.json}')
    sys.exit(1 if total else 0)


if __name__ == '__main__':
    main()
