#!/usr/bin/env python3
"""Repair the Devanagari a PDF extractor broke, in the source, before it reaches a card.

The NCERT Hindi extracts reorder matras one consonant to the right ("दसूरी" for "दूसरी", "पचु्छ" for
"पुच्छ"), split a vowel sign into its two printed halves ("काे" for "को"), drop a character with its
glyph ("घघँु" for "घुँघरू"), fuse two words with no space left ("पूछािकिखला" for "पूछा कि खिला") and
double vowel signs ("रााजाा"). `tools/hindi-scan.py` counts what is still broken; this repairs it and
refuses to guess.

Order of repair, each step only touching text it can justify:
  0. the reviewed cases in `tools/hindi-repair-cases.json` — phrases first, then words. These are the
     breaks no rule can settle (a whole character went missing, so nothing in the corpus proves what it
     was); a person read the printed page and wrote the answer down, with the evidence beside it;
  1. a space sitting between a syllable and its own combining marks is removed ("पजू ा" -> "पजूा",
     "बिल्कु ल" -> "बिल्कुल") — a word never starts with a matra, so this is safe;
  2. a vowel sign the extractor split in two is put back together ("काे" -> "को", "रंगाेली" -> "रंगोली"),
     and a doubled vowel sign or anusvara is collapsed ("रााजाा" -> "राजा", "हैंं" -> "हैं");
  3. a vowel sign that landed one consonant to the right is moved back ("पचु्छ" -> "पुच्छ",
     "जरूे" -> "जूरे");
  4. a word split across a space the extractor put in the wrong place is rejoined ("मटु् ठी" -> "मुट्ठी");
  5. a broken word is matched against a vocabulary harvested from the *clean* Hindi in our own packs and
     an independent Hindi wordlist (`tools/hindi-words.sh`): an anagram for a reorder, one mark too many,
     one consonant the extractor lost, or a split into two real words. A repair is applied only when
     exactly one real word comes out;
  6. anything else goes to the review file, never into the source.

  python3 tools/hindi-repair.py --dry-run     # what it would change, and the review list
  python3 tools/hindi-repair.py --apply       # write the source files
  python3 tools/hindi-repair.py --apply --book hindi-g3

--apply edits the chapter sources under work/<book>/**; rebuilding a book with
`SPARKLE_SUBJECT=<book> python3 tools/assemble-pack.py` is what proves the card is fixed.
"""
import argparse
import collections
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONSONANT = '\u0915-\u0939\u0958-\u095f\u0979\u097a'
MATRA = '\u093e-\u094c\u0951-\u0957\u0962\u0963'  # vowel signs only: \u093c nukta is not one
ANUSVARA = '\u0901-\u0903'
HALANT = '\u094d'
NUKTA = '\u093c'
REPLACEMENT = '\ufffd'
MARK = set(chr(c) for c in range(0x93A, 0x94D)) | set(chr(c) for c in range(0x951, 0x958)) \
    | set(chr(c) for c in range(0x901, 0x904)) | {HALANT, NUKTA}
CONSONANTS = set(chr(c) for c in range(0x915, 0x93A)) | set(chr(c) for c in range(0x958, 0x960))

# the replacement character is part of a word here: the extractor put it where a glyph was lost, and
# splitting there would hide the word from the repair (राष्ट�ीय was being read as राष्ट + ीय).
WORDS = re.compile('[\u0900-\u097F\ufffd]+')
# A space that is followed by a combining mark belongs to the previous syllable.
JOIN_SPACE = re.compile(f'\\s+(?=[{MATRA}{HALANT}{ANUSVARA}{NUKTA}])')
DOUBLED = re.compile(f'([{MATRA}{ANUSVARA}])\\1+')
BROKEN = re.compile(f'[{MATRA}][{MATRA}{HALANT}]|[{ANUSVARA}][{MATRA}{HALANT}]|[{MATRA}{HALANT}][{MATRA}]')
LEADING_MARK = re.compile(f'^[{MATRA}{HALANT}]')
# A vowel sign the extractor split into its printed halves: ो goes as ा + े, ौ as ा + ै, and the pair
# sometimes arrives the other way round. Nothing else in Hindi puts two vowel signs on one consonant.
SPLIT_VOWEL = [('\u093e\u0947', '\u094b'), ('\u093e\u0948', '\u094c')]

# The scan's own definition, so we never edit text it would not have flagged.
DETACHED_START = re.compile('[\\s"\'(\\[{(]+[' + MATRA + HALANT + ']')
SPACE_INSIDE = re.compile(f'[{CONSONANT}][{MATRA}]?[\\s]+[{MATRA}{HALANT}]')
SCAN_DOUBLED = re.compile(f'([{MATRA}])\\1')
STRAY_ZERO_WIDTH = re.compile(f'[{CONSONANT}][\u200c\u200d\ufeff][{CONSONANT}]')

CASES = f'{ROOT}/tools/hindi-repair-cases.json'

# Older hand-checked spellings, kept so the previous passes' decisions still apply even if the cases
# file is rewritten. The reviewed cases file is where new ones go, evidence included.
OVERRIDES = {'सदंु': 'सुंदर', 'गँूज': 'गूँज', 'गजँू': 'गूँज', 'मरूित': 'मूर्ति', 'घँुघरू': 'घुँघरू',
             'चँू': 'चूँ', 'कँू': 'कूँ', 'सँूघकर': 'सूँघकर', 'चतषु्पाद': 'चतुष्पाद', 'औधंा': 'औंधा',
             'बनँगूी': 'बनूँगी', 'मसु्कुराती': 'मुस्कुराती', 'सभंाजीनगर': 'संभाजीनगर', 'सहुावने': 'सुहावने'}
FORBID = {'गँजू', 'संदु', 'मूरित', 'सघँू'}

# Endings a broken word can wear while its stem is the part the extractor mangled. Longest first, so
# "ुओं" is taken before "ओं".
SUFFIXES = ['ियों', 'ियाँ', 'ाओं', 'ुओं', 'यों', 'ओं', 'ों', 'एँ', 'ें', 'ने', 'ना', 'ता', 'ते', 'ती',
            'कर', 'में', 'से', 'को', 'का', 'की', 'है', 'हैं', 'था', 'थी', 'थे']


def load_cases():
    """(phrases, words) a person read off the printed page. Phrases are applied as whole substrings."""
    try:
        data = json.load(open(CASES, encoding='utf-8'))
    except (OSError, ValueError):
        return {}, dict(OVERRIDES)
    phrases = {a: b for a, b in (data.get('phrases') or {}).items() if a and b}
    words = dict(OVERRIDES)
    for a, b in (data.get('words') or {}).items():
        if a and b:
            words[a] = b
    return phrases, words


def anomalies(text):
    found = set()
    if REPLACEMENT in text:
        found.add('replacement')
    if DETACHED_START.search(text) or SPACE_INSIDE.search(text):
        found.add('detached')
    if SCAN_DOUBLED.search(text):
        found.add('doubled')
    if STRAY_ZERO_WIDTH.search(text):
        found.add('zero-width')
    if BROKEN.search(text):
        found.add('reordered')
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


def tokens(text):
    """Devanagari words after the space join, with a lone mark folded into the word before it."""
    out = []
    for word in WORDS.findall(JOIN_SPACE.sub('', text)):
        if LEADING_MARK.match(word) and len(word) == 1 and out:
            out[-1] += word
        else:
            out.append(word)
    return out


def is_broken(word):
    return REPLACEMENT in word or bool(BROKEN.search(word)) or bool(LEADING_MARK.match(word))


def load_vocabulary(books):
    vocab = collections.Counter()
    for book in books:
        path = f'{ROOT}/work/{book}'
        for pattern in ('ch*/built/*.json', 'ch*/facts.json', 'ch*/glossary.json', 'ch*/lessons/*.json',
                        'ch*/ship/*.json'):
            for filename in glob.glob(f'{path}/{pattern}'):
                try:
                    data = json.load(open(filename, encoding='utf-8'))
                except (ValueError, OSError):
                    continue
                for text in strings(data):
                    if anomalies(text):
                        continue
                    for word in re.split(f'[^{CONSONANT}\\u0900-\\u097F]+', text):
                        if len(word) < 2 or LEADING_MARK.match(word):
                            continue
                        if DOUBLED.search(word):
                            continue
                        vocab[word] += 1
    return vocab


def index(vocab, dictionary=None):
    """Anagram and by-length lookups over the corpus vocabulary and the independent wordlist."""
    anagrams = collections.defaultdict(list)
    by_length = collections.defaultdict(list)
    for word, count in vocab.items():
        anagrams[''.join(sorted(word))].append((count, word))
        by_length[len(word)].append((count, word))
    for word in dictionary or ():
        if word not in vocab:
            anagrams[''.join(sorted(word))].append((1, word))
            by_length[len(word)].append((1, word))
    return anagrams, by_length


def known(word, vocab, dictionary, minimum=1):
    """A real Hindi word: printed clean somewhere in our own packs, or in the independent wordlist.

    A character's name or a regional dish may appear only once in the corpus, so the vocabulary floor
    is 1. What makes a repair safe is that exactly one real word comes out, not how often it occurs.
    """
    return vocab.get(word, 0) >= minimum or word in dictionary


def pick(candidates, vocab, dictionary):
    """The one real word the candidates agree on, or nothing.

    A candidate has to be a real word: in the independent wordlist, or printed somewhere in the clean
    Hindi of our own packs. What makes an anagram safe is that the letters are identical and only their
    order differs, and that exactly one real word comes out — a broken form usually has a brother
    ("पर्वू" beside "पूर्व") and then nothing is applied.
    """
    candidates = [(count, word) for count, word in candidates
                  if word and word not in FORBID
                  and (word in dictionary or vocab.get(word, count) >= 1)]
    if not candidates:
        return None
    verified = [(count, word) for count, word in candidates if word in dictionary]
    if verified:
        candidates = verified
    if len({word for _, word in candidates}) == 1:
        return candidates[0][1]
    ranked = sorted(set(candidates), reverse=True)
    if len(ranked) > 1 and ranked[0][0] >= 2 * ranked[1][0] and ranked[0][0] >= 3:
        return ranked[0][1]
    return None


def shift_marks_left(word):
    """Move every vowel sign that landed on the next consonant back onto the one before it."""
    parts = []          # [(head, marks)]
    for char in word:
        if char in MARK:
            if not parts:
                parts.append(['', ''])
            parts[-1][1] += char
        else:
            parts.append([char, ''])
    changed = False
    moved = []
    for head, marks in parts:
        if head and marks and moved and head in CONSONANTS:
            carry = ''.join(c for c in marks if c in MARK and c not in (HALANT, NUKTA))
            if carry:
                prev_head, prev_marks = moved[-1]
                moved[-1] = (prev_head, prev_marks + carry)
                moved.append((head, ''.join(c for c in marks if c not in carry)))
                changed = True
                continue
        moved.append((head, marks))
    if not changed:
        return None
    return ''.join(head + marks for head, marks in moved)


def plausible(fixed):
    """A repair has to be a whole word: nothing may open it but a letter, and it cannot stop on a bare
    halant or a nukta — a word ending in a vowel sign or a nasal is normal, one ending in ् is a cut."""
    return bool(fixed) and len(fixed) >= 3 and not is_broken(fixed) \
        and fixed[0] not in MARK and fixed[-1] not in (HALANT, NUKTA)


def rearrangements(word, dictionary):
    """Every legal way to hand this word's marks back to its consonants, that the wordlist knows.

    The extractor did not swap letters: it moved vowel signs and the halant onto the wrong consonant and
    sometimes left a second copy of the halant behind ("मनष्ु्य" for "मनुष्य", "दधिपचु्छ" for
    "दधिपुच्छ"). Consonants and marks are all still there, so a repair is an assignment of the marks to
    the consonants, each consonant taking at most one vowel sign, at most one nasal and a halant only
    last — with one mark allowed to be a duplicate the extractor added. Accepted only when the wordlist
    knows exactly one result.
    """
    # only a duplicate halant is dropped: the extractor's other habit is to leave one behind when it
    # moves ु, and no vowel sign is ever dropped by us — taking one away invents a different word
    # ("पर्वाू" would become "पूर्व").
    variants = [word]
    if word.count(HALANT) >= 2:
        for i, char in enumerate(word):
            if char == HALANT:
                variants.append(word[:i] + word[i + 1:])
    hits = set()
    for variant in variants:
        hits.update(_rearrange_one(variant, dictionary))
        if len(hits) > 3:
            break
    return sorted(hits)


def _rearrange_one(word, dictionary):
    consonants = [c for c in word if c in CONSONANTS]
    marks = [c for c in word if c in MARK]
    if not consonants or len(consonants) > 9 or len(marks) > 5 \
            or len(word) != len(consonants) + len(marks):
        return []

    def order(group):
        rank = {}
        for i, c in enumerate(group):
            rank[i] = (0 if c == NUKTA else 1 if c in MATRA else 2 if c in '\u0901\u0902\u0903'
                       else 3)
        return [c for _, c in sorted(zip(rank.values(), group))]

    def legal(group):
        vowel = [c for c in group if c in MATRA or c in '\u0901\u0902\u0903']
        if len(vowel) > 1 or group.count(NUKTA) > 1:
            return False
        return group.count(HALANT) <= 1 and (HALANT not in group or group[-1] == HALANT)

    hits = set()

    def place(index, groups):
        if len(hits) > 3:
            return
        if index == len(marks):
            candidate = ''.join(c + ''.join(order(g)) for c, g in zip(consonants, groups))
            if candidate != word and candidate in dictionary:
                hits.add(candidate)
            return
        for slot in range(len(consonants)):
            groups[slot].append(marks[index])
            if legal(groups[slot]):
                place(index + 1, groups)
            groups[slot].pop()

    place(0, [[] for _ in consonants])
    return sorted(hits)


def repair_word(word, vocab, anagrams, by_length, dictionary, cases, depth=0):
    """(fixed word, how) or (None, why not)."""
    if word in cases:
        return cases[word], 'reviewed'
    if not is_broken(word) and known(word, vocab, dictionary):
        return word, 'already'
    if depth > 1:
        return None, 'no confident candidate'
    # A token that stops on a pre-base vowel sign or a bare halant lost its last consonant: the
    # extractor cut the word, and no rule can guess the rest of it.
    if word.endswith('\u093f') or word.endswith(HALANT):
        return None, 'truncated token'

    # 1. a vowel sign the extractor split into its printed halves
    for pair, joined in SPLIT_VOWEL:
        if pair in word:
            fixed = word.replace(pair, joined)
            if plausible(fixed) and known(fixed, vocab, dictionary):
                return fixed, 'split vowel'

    # 2. a vowel sign that landed on the next consonant
    shifted = shift_marks_left(word)
    if shifted and shifted != word and plausible(shifted) and known(shifted, vocab, dictionary):
        return shifted, 'mark shifted'

    if REPLACEMENT in word:
        pattern = re.compile('^' + ''.join('.' if c == REPLACEMENT else re.escape(c) for c in word) + '$')
        hit = pick([(vocab[c], c) for _, c in by_length[len(word)] if pattern.match(c)], vocab, dictionary)
        return (hit, 'wildcard') if hit else (None, 'no wildcard match')

    # 2b. the marks handed back to the consonants they belong to
    reordered = rearrangements(word, dictionary)
    if len(reordered) == 1 and plausible(reordered[0]):
        return reordered[0], 'marks rearranged'

    # 3. an anagram: the right letters in the wrong order
    hit = pick(anagrams.get(''.join(sorted(word)), []), vocab, dictionary)
    if hit:
        return hit, 'anagram'

    # 4. one mark too many: drop one at a time, then let the doubling rule settle the rest. Only a
    # spelling our own packs print at least twice is accepted: this is a reconstruction from a word
    # that is already wrong, and the wordlist carries forms no book would print.
    hits = set()
    for i, char in enumerate(word):
        if char not in MARK:
            continue
        short = DOUBLED.sub(r'\1', word[:i] + word[i + 1:])
        if short != word and plausible(short) and short in dictionary:
            hits.add(short)
    if len(hits) == 1:
        return hits.pop(), 'mark dropped'

    # 5. one consonant the extractor lost with its glyph, at the end of the word
    out = [(1, c) for _, c in by_length.get(len(word) + 1, [])
           if c[:-1] == word and c[-1] in CONSONANTS and c in dictionary]
    hit = pick(out, vocab, dictionary)
    if hit:
        return hit, 'consonant inserted'

    # 6. an inflected form: repair the stem, keep the ending ("पषु्पों" -> "पुष्प" + "ों")
    if depth == 0:
        for suffix in SUFFIXES:
            if word.endswith(suffix) and len(word) > len(suffix) + 1:
                stem = word[:-len(suffix)]
                good, how = repair_word(stem, vocab, anagrams, by_length, dictionary, cases, depth + 1)
                if good and ' ' not in good and good != stem:
                    return good + suffix, f'{how} + suffix'
    return None, 'no confident candidate'


def repair_text(text, vocab, anagrams, by_length, log, path, dictionary, cases, phrases):
    if not anomalies(text):
        return text
    for bad, good in phrases.items():
        if bad in text:
            text = text.replace(bad, good)
            log['repaired'].append({'file': path, 'from': bad[:60], 'to': good[:60],
                                    'how': 'reviewed phrase'})
    if not anomalies(text):
        return text
    fixed = JOIN_SPACE.sub('', text)
    fixed = DOUBLED.sub(r'\1', fixed)
    if not anomalies(fixed) and fixed != text:
        return fixed          # space join and/or doubling was the whole defect

    # a word the extractor split with a space in the wrong place ("मटु् ठी" -> "मुट्ठी")
    words = tokens(fixed)
    for first, second in zip(words, words[1:]):
        if not is_broken(first):
            continue
        good, how = repair_word(first + second, vocab, anagrams, by_length, dictionary,
                                cases, depth=1)
        if good and plausible(good) and len(good) >= len(first) + len(second) - 1:
            fixed = fixed.replace(f'{first} {second}', good, 1)
            log['repaired'].append({'file': path, 'from': f'{first} {second}', 'to': good,
                                    'how': f'rejoined ({how})'})

    for word in tokens(fixed):
        # the word pattern carries the danda; a sentence-ending mark is not part of the word
        tail = word[len(word.rstrip('।॥')):]
        bare = word[:len(word) - len(tail)]
        if bare in fixed and bare and is_broken(bare):
            good, how = repair_word(bare, vocab, anagrams, by_length, dictionary, cases)
            if good and plausible(good.replace(' ', '')) and good != bare:
                fixed = re.sub(re.escape(word), good + tail, fixed)
                log['repaired'].append({'file': path, 'from': bare, 'to': good, 'how': how})
            elif good is None:
                log['review'].append({'file': path, 'word': bare, 'why': how, 'text': fixed[:160]})
    return fixed


def walk(value, vocab, anagrams, by_length, log, path, dictionary, cases, phrases):
    if isinstance(value, str):
        return repair_text(value, vocab, anagrams, by_length, log, path, dictionary, cases, phrases)
    if isinstance(value, dict):
        out = {k: walk(v, vocab, anagrams, by_length, log, path, dictionary, cases, phrases)
               for k, v in value.items()}
        # A glossary term's alternate spellings are what the extractor made of the same word; an entry
        # that is still unreadable is not an alternate name, it is a misspelling, and it does not ship.
        if 'term' in out and isinstance(out.get('aka'), list):
            kept = [a for a in out['aka'] if isinstance(a, str) and not anomalies(a)
                    and a.strip() != str(out['term']).strip()]
            if len(kept) != len(out['aka']):
                log['dropped-aka'] = log.get('dropped-aka', 0) + len(out['aka']) - len(kept)
            out['aka'] = kept
        return out
    if isinstance(value, list):
        return [walk(v, vocab, anagrams, by_length, log, path, dictionary, cases, phrases) for v in value]
    return value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--book')
    parser.add_argument('--json', default=f'{ROOT}/work/qa/hindi-repair-review.json')
    parser.add_argument('--dict', action='append', default=[],
                        help='independent wordlist (one word per line); a repair may appear in it')
    args = parser.parse_args()
    apply_changes = args.apply and not args.dry_run

    books = [f'hindi-g{i}' for i in range(1, 11) if os.path.isdir(f'{ROOT}/work/hindi-g{i}')]
    if args.book:
        books = [args.book]
    dictionary = set()
    for path in args.dict:
        for line in open(path, encoding='utf-8'):
            word = line.strip().split()[0] if line.strip() else ''
            if word:
                dictionary.add(word)
    phrases, cases = load_cases()
    vocab = load_vocabulary(books)
    anagrams, by_length = index(vocab, dictionary)
    log = {'repaired': [], 'review': [], 'files': 0}

    for book in books:
        files = glob.glob(f'{ROOT}/work/{book}/ch*/**/*.json', recursive=True)
        # the book-level glossary is assembled into the pack's own glossary.json, which is what a child
        # opens in "शब्द देखिए": it is not under chNN/ and was never walked before
        files += glob.glob(f'{ROOT}/work/{book}/glossary.json')
        for filename in sorted(files):
            rel = os.path.relpath(filename, ROOT)
            try:
                data = json.loads(open(filename, encoding='utf-8').read())
            except (ValueError, OSError):
                continue
            if not any(anomalies(text) for text in strings(data)):
                continue
            fixed = walk(data, vocab, anagrams, by_length, log, rel, dictionary, cases, phrases)
            if fixed != data:
                log['files'] += 1
                if apply_changes:
                    with open(filename, 'w', encoding='utf-8') as handle:
                        json.dump(fixed, handle, ensure_ascii=False, indent=1)
                        handle.write('\n')

    print(f'vocabulary {len(vocab)} words, dictionary {len(dictionary)}, '
          f'cases {len(cases)} words + {len(phrases)} phrases')
    print(f'repaired {len({(r["from"], r["to"]) for r in log["repaired"]})} distinct words '
          f'in {len(log["repaired"])} places, {log["files"]} files '
          f'{"written" if apply_changes else "would change"}')
    for row in sorted({(r['from'], r['to'], r['how']) for r in log['repaired']}):
        print(f'  [{row[2]:16}] {row[0]} -> {row[1]}')
    unresolved = collections.Counter((r['word'], r['why']) for r in log['review'])
    print(f'review: {len(unresolved)} distinct words left alone')
    for (word, why), count in sorted(unresolved.items(), key=lambda kv: -kv[1]):
        print(f'  x{count:<3} {word!r} ({why})')
    json.dump(log, open(args.json, 'w'), ensure_ascii=False, indent=1)
    print(f'written to {args.json}')


if __name__ == '__main__':
    main()
