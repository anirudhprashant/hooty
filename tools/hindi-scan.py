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
  reordered    two vowel signs on one letter, an anusvara before a vowel sign, or a vowel sign before a
               halant ("भरूी", "चदंा", "मसु्काते") — the same reorder, with no space to show it.
               A reorder that lands the vowel on the *next* consonant ("दसूरी" for "दूसरी") is legal-looking
               shape for shape, so this scan cannot prove it: that one needs the word matcher in
               tools/hindi-repair.py, and tools/text-gate.py tests both layers.

Two more shapes need a word list (hindi-words.txt, fetched by tools/hindi-words.sh) because they are
legal Devanagari shape for shape:
  split        two adjacent words that are not words separately and are one word together ("छे द",
               "सफ़े द", "के वल"). न/क/व are never glued — they are real words on their own.
  moved-mark   an anusvara/chandrabindu one consonant to the right of its vowel ("इतंज़ार", "शखं"),
               which becomes a real word when the mark moves back.

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

DETACHED_START = re.compile(r'[\s"\'(\\[{]+[' + MATRA + HALANT + r']')
SPACE_INSIDE = re.compile(f'[{CONSONANT}][{MATRA}]?[\\s]+[{MATRA}{HALANT}]')
DOUBLED = re.compile(f'([{MATRA}])\\1')
STRAY_ZERO_WIDTH = re.compile(f'[{CONSONANT}][{ZERO_WIDTH}][{CONSONANT}]')
# An English word left inside Hindi text ("जिसे अ unclean माना जाता है", "पद्म Shri", "Preethibhoj").
# A Hindi book names these in Devanagari (इसरो, पद्म श्री), and a child reading Hindi cannot read the
# English one. Not a matra fault, but the same kind of unreadable text.
LATIN_WORD = re.compile(r'(?<![A-Za-z])[A-Za-z]{2,}(?![A-Za-z])')
# A vowel sign belongs to the consonant on its left, one per consonant, before any anusvara, and never
# before a halant. Two vowels on one letter ("भरूी", "दसूरी"), an anusvara then a vowel ("चदंा") or a vowel
# then a halant ("मसु्काते") is the extractor's own reorder happening *inside* a word, with no space to
# give it away. `पढ़िए` is not a hit: the nukta (U+093C) is not a vowel sign.
VOWEL = '\u093e-\u094c\u0951-\u0957\u0962\u0963'
REORDERED = re.compile(f'[{VOWEL}][{VOWEL}]|[{VOWEL}]{HALANT}|[\u0901\u0902][{VOWEL}]')


# The same two dictionary-gated shapes tools/hindi-repair.py repairs. Kept in step with it by hand:
# the repair tool decides what to write, this one decides whether anything is still written wrong.
WORD_SPAN = re.compile(f'[{CONSONANT}\\u0900-\\u0963\\u0966-\\u097F]+')
SINGLE_CONSONANT = re.compile(f'^[{CONSONANT}]$')
MOVED_MARK = '\u0901\u0902'
NEVER_GLUE = {'न', 'क', 'व'}
PAIR_REFUSE = {('के', 'प')}


def move_mark_variants(word):
    out = set()
    for i, char in enumerate(word):
        if char in MOVED_MARK and i >= 1:
            j = i - 1
            while j > 0 and (word[j] in MOVED_MARK or word[j] in VOWEL or word[j] == HALANT
                             or word[j] == '\u093c'):
                j -= 1
            candidate = word[:j] + char + word[j:i] + word[i + 1:]
            if candidate != word:
                out.add(candidate)
    return out


def letter_run(text):
    words = WORD_SPAN.findall(text)
    lone = [bool(SINGLE_CONSONANT.match(w)) for w in words]
    return any(a and b for a, b in zip(lone, lone[1:]))


def word_shapes(text, dictionary):
    """split / moved-mark, both proven against the word list; empty without one."""
    found = set()
    if not dictionary:
        return found
    start = f'[{CONSONANT}\\u0905-\\u0914]'   # a word's first letter: a consonant or an independent vowel
    for match in re.finditer(f'(?<![{CONSONANT}\\u0900-\\u097F])({start}[{CONSONANT}\\u0900-\\u0963\\u0966-\\u097F]*) '
                             f'({start}[{CONSONANT}\\u0900-\\u0963\\u0966-\\u097F]*)', text):
        first, second = match.group(1), match.group(2)
        if first == 'और' or len(second) > 3 or (first, second) in PAIR_REFUSE:
            continue
        if not SINGLE_CONSONANT.match(second[0]):
            continue
        if second in dictionary and not SINGLE_CONSONANT.match(second):
            continue
        if letter_run(text):
            break
        joined = first + second
        # न/क/व are words of their own, so only a mark move can prove the join ("इजं न" -> इंजन).
        if second in NEVER_GLUE:
            if move_mark_variants(joined) & dictionary:
                found.add('split')
                break
        elif joined in dictionary or move_mark_variants(joined) & dictionary:
            found.add('split')
            break
    for word in WORD_SPAN.findall(text):
        if word in dictionary or not (set(word) & set(MOVED_MARK)):
            continue
        if len(move_mark_variants(word) & dictionary) == 1:
            found.add('moved-mark')
            break
    return found


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


def anomalies(text, dictionary=None):
    """Which shapes this string carries, if any."""
    found = word_shapes(text, dictionary)
    if REPLACEMENT in text:
        found.add('replacement')
    if DETACHED_START.search(text) or SPACE_INSIDE.search(text):
        found.add('detached')
    if DOUBLED.search(text):
        found.add('doubled')
    if STRAY_ZERO_WIDTH.search(text):
        found.add('zero-width')
    if REORDERED.search(text):
        found.add('reordered')
    return found


# The fields a child reads. An activity's id, type, tags, gen and src are plumbing and are full of Latin
# letters; only these carry the words the lesson is teaching, so the English-word check looks at them.
CONTENT_KEYS = {'prompt', 'options', 'body', 'text', 'explanation', 'title', 'items', 'pairs', 'points',
                'keyPoints', 'meaning', 'term', 'aka', 'answers', 'context', 'kicker', 'caption',
                'sceneCaption', 'why', 'hook', 'passage', 'steps', 'result'}


def content_texts(value, key=None):
    """Every string under a child-facing field, with the field name it came from."""
    if isinstance(value, str):
        if key in CONTENT_KEYS:
            yield key, value
    elif isinstance(value, dict):
        for k, item in value.items():
            yield from content_texts(item, k)
    elif isinstance(value, list):
        for item in value:
            yield from content_texts(item, key)


def scan_pack(path_or_dict, label, dictionary=None):
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
                        shapes = anomalies(text, dictionary)
                        if shapes:
                            hits.append({'activity': activity.get('id') or activity.get('type'),
                                         'shapes': sorted(shapes), 'text': text[:300]})
                for activity in lesson.get('activities', []):
                    for field, text in content_texts(activity):
                        if LATIN_WORD.search(text):
                            hits.append({'activity': activity.get('id') or activity.get('type'),
                                         'shapes': ['latin'], 'text': text[:300]})
                if hits:
                    rows.append({'book': label, 'lesson': lesson.get('id'), 'hits': hits})
    return rows


def scan_glossary(data, label, dictionary=None):
    """The pack's own glossary — what the child sees in "शब्द देखिए" — is a separate file and was not
    being measured, so a stale term kept its broken spelling while the scan read zero.

    A term's `src.ev` quote is provenance, not content: the popover renders only the chapter and page
    (`public/engine/core/glossary.js`), so a broken quote is reported apart instead of counted as a
    lesson a child cannot read. The quote still has to be fixed at the source; it is just not a child's
    reading text.
    """
    rows, provenance = [], []
    for term in (data or {}).get('terms', []):
        visible = [term.get('term'), term.get('meaning')] + list(term.get('aka') or [])
        for text in visible:
            for piece in strings(text):
                shapes = anomalies(piece, dictionary)
                if shapes:
                    rows.append({'activity': 'glossary: ' + str(term.get('term')), 'shapes': sorted(shapes),
                                 'text': piece[:300]})
        for entry in term.get('src') or []:
            for piece in strings(entry.get('ev') if isinstance(entry, dict) else None):
                shapes = anomalies(piece, dictionary)
                if shapes:
                    provenance.append({'term': term.get('term'), 'shapes': sorted(shapes),
                                       'text': piece[:160]})
    if rows:
        return [{'book': label, 'lesson': 'glossary', 'hits': rows}], provenance
    return [], provenance


def fetch_live(book):
    url = f'https://hooty.org/content/packs/{book}/pack.json?x={os.urandom(3).hex()}'
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read())


def fetch_live_glossary(book):
    url = f'https://hooty.org/content/packs/{book}/glossary.json?x={os.urandom(3).hex()}'
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)'})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read())
    except Exception:
        return {}


def main():
    args = sys.argv[1:]
    live = '--live' in args
    out = None
    if '--json' in args:
        out = args[args.index('--json') + 1]
    dictionary = set()
    dict_path = args[args.index('--dict') + 1] if '--dict' in args else f'{ROOT}/work/qa/hindi-words.txt'
    if os.path.exists(dict_path):
        for line in open(dict_path, encoding='utf-8'):
            word = line.strip().split()[0] if line.strip() else ''
            if word:
                dictionary.add(word)
    only = None
    if '--book' in args:
        only = args[args.index('--book') + 1]

    if live:
        books = [only] if only else [f'hindi-g{i}' for i in range(1, 11)]
        packs = {book: fetch_live(book) for book in books}
        glossaries = {book: fetch_live_glossary(book) for book in books}
        source = 'live site'
    else:
        paths = sorted(glob.glob(f'{ROOT}/public/content/packs/hindi-*/pack.json'))
        if only:
            paths = [p for p in paths if f'/{only}/' in p]
        packs = {os.path.basename(os.path.dirname(p)): p for p in paths}
        glossaries = {book: json.load(open(f'{ROOT}/public/content/packs/{book}/glossary.json'))
                      for book in packs
                      if os.path.exists(f'{ROOT}/public/content/packs/{book}/glossary.json')}
        source = 'local packs'

    all_rows = []
    per_book = {}
    provenance = []
    for book, pack in sorted(packs.items()):
        rows, prov = scan_glossary(glossaries.get(book), book, dictionary)
        rows = scan_pack(pack, book, dictionary) + rows
        all_rows.extend(rows)
        per_book[book] = rows
        if prov:
            provenance.extend({'book': book, **row} for row in prov)
    for book, gloss in sorted(glossaries.items()):
        if book not in packs:
            rows, prov = scan_glossary(gloss, book, dictionary)
            all_rows.extend(rows)
            per_book[book] = rows
            if prov:
                provenance.extend({'book': book, **row} for row in prov)

    print(f'Devanagari scan of the {source} (word list {len(dictionary)} words'
          f'{'' if dictionary else ', NOT FOUND — split/moved-mark not checked'}):')
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
    if provenance:
        print(f'  provenance quotes (a page reference, never shown to a child): {len(provenance)}')
        for row in provenance[:8]:
            print(f'    {row["book"]} {row["term"]!r}: {row["text"][:70]!r}')
    if out:
        json.dump(all_rows, open(out, 'w'), ensure_ascii=False, indent=1)
        print(f'  written to {out}')
    sys.exit(1 if total else 0)


if __name__ == '__main__':
    main()
