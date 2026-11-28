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
WORD = re.compile(r"[A-Za-z][A-Za-z'\u2019]*")
LIVE_FLAG = [False]
COMMON_RANK = 400        # a fragment that is itself an everyday word is probably not a fragment
MIN_JOINED = 6           # "in to" -> "into" is too short to be worth flagging
MIN_JOINED_USES = 4      # the joined form must appear that often elsewhere to count as a real word


CODE_KEYS = {'when', 'where'}   # task predicates the engine evaluates, never drawn: `obj == 1 or obj == 2`
IDENTIFIER = re.compile(r'^[a-z0-9][a-z0-9._-]*$')   # ids, slugs, widget names — not sentences


def strings(value, key=None):
    if key in CODE_KEYS or (key and key.lower().endswith('id')):
        return
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for name, item in value.items():
            yield from strings(item, name)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item, key)


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


STRICT = [False]


_WORDS_FILE = f'{HERE}/vendor/english-words.txt'
ENGLISH_WORDS = set(open(_WORDS_FILE).read().split()) if os.path.exists(_WORDS_FILE) else set()


def plausible(word):
    """Could this be an English word at all? A cut word is usually not: `rro` has no vowel, `nded` starts
    on four consonants. A real word is settled by the 51k ordinary-English list rather than a vowel guess
    (`unobstructed`, `anthropologist` are words and must not be reported). Used only to narrow the review
    list under --strict, never to clear a hit outside it."""
    if word.lower() in ENGLISH_WORDS:
        return True
    if set(word) & set('aeiouy'):
        return not re.search(r'[bcdfghjklmnpqrstvwxz]{4}', word)
    return False


SHORT_OK = {'a', 'i', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'is', 'it', 'as', 'or', 'no', 'so', 'we',
            'he', 'be', 'do', 'if', 'my', 'up', 'us', 'am', 'me', 'go', 'kg', 'cm', 'mm', 'km', 'ml', 'rs',
            'dr', 'mr', 'mrs', 'ms', 'st', 'vs', 'ph', 'eg', 'ie', 'ok', 'oh', 'ah', 'ha', 'hi', 'id', 'ex'}


def scan_string(text, counts, rank):
    """Where this string carries the shape of a word the extractor cut, or None."""
    hits = []
    if IDENTIFIER.match(text) or len(text) < 12:
        return hits
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

    # The damage shapes, and why the earlier ones are gone.
    #
    # The first version called any rare one-to-three letter token a "fragment". Across the catalogue that
    # fired 1,910 times over 417 lessons and was almost all clean text: `obj`, `abs`, `hcf`, `gcd`, `lcm`,
    # `sin`, `arc`, `xy`, `tw` are generator predicates and mathematics variables, `bug` is the word the
    # Class 1 lesson is about, `maa`/`ji` are Indian names. A second version flagged a lone letter between
    # two words, which in a maths book is a variable ("If x is 5"), not damage: 8,500 hits, all noise.
    # Five examples read by eye were clean each time, so the guessing is gone and the check now rests on
    # the one fact a cut word cannot hide:
    #
    #   unseen  a word of three letters or more that occurs exactly once in the forty-three books — that
    #           once being here. Real English repeats itself somewhere; a single unshared occurrence inside
    #           a sentence is either a name the books use once or the extractor's debris (`ost`, `rro`,
    #           `nded`, `generall`).
    #   split   a lone letter standing next to such a token ("… been s rro nded b walls").
    #   join    two or three rare tokens that rejoin into a word the rest of our books use. Kept: it is the
    #           one proof that needs no opinion.
    #
    # `tools/english-scan.py --self-test` runs the original damaged sentence and the traps that broke the
    # first two versions through this code, so a future edit cannot make the check quietly blind.
    unseen = {w.lower() for w in tokens
              if len(w) >= 3 and w.lower().isalpha() and counts[w.lower()] <= 1 and not w.isupper()}
    for word in sorted(unseen):
        if STRICT[0] and plausible(word):
            continue
        hits.append(f'single-use word {word!r} — used once in the whole catalogue')
    for i, word in enumerate(tokens):
        if len(word) != 1 or not word.isalpha():
            continue
        if word.lower() in SHORT_OK:
            continue                       # "a truck", "I saw": a real short word, not a cut one
        near = [tokens[j] for j in (i - 1, i + 1) if 0 <= j < len(tokens)]
        broken = [n for n in near if n.lower() in unseen and not plausible(n.lower())]
        if broken:
            hits.append(f'split word: lone {word!r} beside {broken[0]!r}')

    if tokens and len(tokens) >= 5:
        head = tokens[0]
        if head.islower() and head.isalpha() and len(head) >= 2 and counts[head] <= 1:
            hits.append(f'sentence opens on a fragment {head!r}')
    return hits


DAMAGED = [
    ('ost cities seem to have been s rro nded b walls and', 'a split word'),
    ('were generall made of a soft stone that wo ld', 'a word that lost letters'),
]
CLEAN = [
    ('Meet Dotty Bug. A ladybug has dots on her body.', 'a word used once in one book'),
    ('If x is 5, then twice x is 10. Let b be the number of beads.', 'algebra letters'),
    ('A child has two bar magnets, an iron bar and a compass.', 'ordinary prose'),
    ('The vitamins listed are A, B1, C and D.', 'single capitals'),
    ('Picture the Equator as a belt around the Earth\u2019s middle.', 'a possessive'),
    ('Add 1 l of water to 2 l of milk.', 'a unit letter'),
]


def self_test():
    """The check has to still see the damage it was built for, and still ignore the traps that broke the
    first two versions. Run before trusting a zero."""
    # A miniature corpus: ordinary English twice over, then each sample exactly once as the books hold it.
    filler = ('a the of is to and be has was were with from that this they have been made cities seem walls '
              'stone soft body dots ladybug child two bar magnets iron compass picture equator belt earth '
              'middle add water milk then twice number vitamins listed are if let five ten one two three '
              'soft that which')
    counts = collections.Counter(WORD.findall(filler))
    counts.update(WORD.findall(filler))
    for text in [t for t, _ in CLEAN]:
        counts.update(WORD.findall(text.lower()))
        counts.update(WORD.findall(text.lower()))
    bad = 0
    for text, why in DAMAGED:
        counts.update(WORD.findall(text.lower()))          # its one occurrence, as in the catalogue
    for text, why in DAMAGED:
        if not scan_string(text, counts, {}):
            print(f'  FAIL it can no longer see {why}: {text[:58]}')
            bad += 1
    for text, why in CLEAN:
        hits = scan_string(text, counts, {})
        if hits:
            print(f'  FAIL it now flags {why}: {text[:58]} -> {hits[0]}')
            bad += 1
    print(f'  self-test: {len(DAMAGED)} damaged strings, {len(CLEAN)} clean traps, {bad} wrong')
    return bad


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--book')
    parser.add_argument('--json')
    parser.add_argument('--limit', type=int, default=6)
    parser.add_argument('--rebuild', action='store_true', help='rebuild the cached word list first')
    parser.add_argument('--self-test', action='store_true', help='prove the shapes still see damage')
    parser.add_argument('--strict', action='store_true',
                        help='only words that could not be English at all (no vowel, four consonants in a row)')
    args = parser.parse_args()

    if args.self_test:
        sys.exit(1 if self_test() else 0)

    LIVE_FLAG[0] = args.live
    STRICT[0] = args.strict
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
    # A review list, not a defect count: our books use a word once in 843 places, and almost all of those
    # are ordinary vocabulary (playgrounds, monocotyledon). --strict narrows it to the shapes that cannot
    # be English at all, which is what a repair lane should look at first.
    print(f'possible shredded English in the {where} (review list, not a defect count):')
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
