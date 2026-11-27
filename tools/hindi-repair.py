#!/usr/bin/env python3
"""Repair the Devanagari a PDF extractor broke, in the source, before it reaches a card.

The NCERT Hindi extracts reorder matras one consonant to the right ("दसूरी" for "दूसरी", "सधं ्या" for
"संध्या"), drop a mark ("दनिया" for "दुनिया") and double vowel signs ("रााजाा"). `tools/hindi-scan.py`
counts what is still broken; this repairs it and refuses to guess.

Order of repair, each step only touching text that carries a shape:
  1. a space sitting between a syllable and its own combining marks is removed ("पजू ा" -> "पजूा",
     "बिल्कु ल" -> "बिल्कुल") — a word never starts with a matra, so this is safe;
  2. a doubled vowel sign or anusvara is collapsed ("रााजाा" -> "राजा", "हैंं" -> "हैं");
  3. a broken word is matched against a vocabulary harvested from the *clean* Hindi in our own packs
     (anagram for a reorder, edit distance one for a dropped matra, a single-character wildcard for
     U+FFFD) and replaced only when the winner is unique or clearly the more frequent spelling;
  4. anything else goes to the review file, never into the source.

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
HALANT = '\u094d'
ANUSVARA = '\u0901-\u0903'
REPLACEMENT = '\ufffd'

WORDS = re.compile('[\u0900-\u097F]+')
# A space that is followed by a combining mark belongs to the previous syllable.
JOIN_SPACE = re.compile(f'\\s+(?=[{MATRA}{HALANT}{ANUSVARA}़])')
DOUBLED = re.compile(f'([{MATRA}{ANUSVARA}])\\1+')
BROKEN = re.compile(f'[{MATRA}][{MATRA}{HALANT}]|[{ANUSVARA}][{MATRA}{HALANT}]|[{MATRA}{HALANT}][{MATRA}]')
LEADING_MARK = re.compile(f'^[{MATRA}{HALANT}]')

# Spellings the anagram pass gets right or cannot reach. The dictionary check decides the rest; these
# are the words it does not carry, read by hand (an incorrect winner here teaches a child a non-word).
OVERRIDES = {'सबंधित': 'संबंधित', 'सदंु': 'सुंदर', 'गँूज': 'गूँज', 'गजँू': 'गूँज', 'मरूित': 'मूर्ति', 'घँुघरू': 'घुँघरू',
             'चँू': 'चूँ', 'कँू': 'कूँ', 'सँूघकर': 'सूँघकर', 'चतषु्पाद': 'चतुष्पाद', 'औधंा': 'औंधा',
             'बनँगूी': 'बनूँगी', 'मसु्कुराती': 'मुस्कुराती', 'सभंाजीनगर': 'संभाजीनगर', 'सहुावने': 'सुहावने'}
FORBID = {'गँजू', 'संदु', 'मूरित', 'सघँू'}

# The scan's own definition, so we never edit text it would not have flagged.
DETACHED_START = re.compile('[\\s"\'(\u005b\u007b]+[' + MATRA + HALANT + ']')
SPACE_INSIDE = re.compile(f'[{CONSONANT}][{MATRA}]?[\\s]+[{MATRA}{HALANT}]')
SCAN_DOUBLED = re.compile(f'([{MATRA}])\\1')
STRAY_ZERO_WIDTH = re.compile(f'[{CONSONANT}][\u200c\u200d\ufeff][{CONSONANT}]')


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


# Two shapes the passes above cannot see and a dictionary can: a word cut in two by a space where the
# fragment after the space starts with a *consonant* ("छे द", "सफ़े द", "के वल", "इजं न"), and an
# anusvara/chandrabindu printed one consonant to the right of the vowel it belongs to ("इतंज़ार" for
# "इंतज़ार", "शखं" for "शंख", "मचं" for "मंच"). Both are the same extractor: the PDF draws the combining
# mark after the next glyph, so the text comes out shifted. Neither is visible to `anomalies()` because
# the result is legal Devanagari shape for shape, and both need the word list to prove the join.
DEV_CLASS = f'{CONSONANT}\u0900-\u0963\u0966-\u097F'  # Devanagari, danda excluded
WORD_SPAN = re.compile(f'[{DEV_CLASS}]+')
SINGLE_CONSONANT = re.compile(f'^[{CONSONANT}]$')
MOVED_MARK = 'ँं'
# Never glue these onto the word before: न is a real word (the negative particle), and a lone क is
# usually a broken कि/का, not the tail of a split word.
NEVER_GLUE = {'न', 'क', 'व'}
# Pairs that join into a real word but are not that word here ("तट का रास्ता के प होटल" is a hotel
# name, not केप). Refused and left in the review list rather than guessed.
PAIR_REFUSE = {('के', 'प')}
# A Latin letter a PDF extractor left inside a Hindi word, and the Devanagari letter it stood for.
LATIN_LETTERS = {'n': 'न', 'm': 'म', 'h': 'ह', 's': 'स', 'r': 'र', 't': 'त', 'k': 'क',
                 'l': 'ल', 'p': 'प', 'v': 'व', 'b': 'ब', 'd': 'द', 'g': 'ग', 'j': 'ज',
                 'y': 'य', 'c': 'च', 'f': 'फ', 'w': 'व'}
# A sentence that lists letters ("ल र त ज म ख ब स च प घ और") must not be joined into words.
def letter_run(text):
    words = WORD_SPAN.findall(text)
    lone = [bool(SINGLE_CONSONANT.match(w)) for w in words]
    # A drill lists letters next to each other ("ल र त ज", "ल, र, त"). A damaged word has its fragment
    # next to a real word ("छे द थे"), so adjacency is the test, not the count.
    return any(a and b for a, b in zip(lone, lone[1:]))


def move_mark_variants(word):
    """Every spelling with one anusvara/chandrabindu shifted one consonant to the left."""
    out = set()
    for i, char in enumerate(word):
        if char in MOVED_MARK and i >= 1:
            j = i - 1
            while j > 0 and (word[j] in MOVED_MARK or word[j] in MATRA or word[j] == HALANT
                             or word[j] == '़'):
                j -= 1
            candidate = word[:j] + char + word[j:i] + word[i + 1:]
            if candidate != word:
                out.add(candidate)
    return out


def repair_shapes(text, dictionary, vocab, log, path):
    """Join split words and move displaced anusvaras, only where the word list agrees."""
    if not dictionary or not WORD_SPAN.search(text):
        return text
    # 1. a Latin letter left inside a Hindi word ("इजं n") is the Devanagari letter it was read as.
    if re.search('[\u0900-\u097F] [A-Za-z](?=[\\s।,;?!]|$)', text):
        def letter_sub(match):
            previous, latin = match.group(1), match.group(2)
            mapped = LATIN_LETTERS.get(latin.lower())
            if not mapped:
                return match.group(0)
            joined = previous + mapped
            if joined in dictionary or move_mark_variants(joined) & dictionary:
                return previous + mapped
            return match.group(0)
        text = re.sub('([\u0900-\u097F]+) ([A-Za-z])(?=[\\s।,;?!]|$)', letter_sub, text)

    # 2. join a word split by a space, right-hand fragment starting on a consonant. Token spans, not a
    # regex scan: "बारह छे द थे" hides the pair "छे द" behind the match "बारह छे" in a non-overlapping
    # finditer, which is how the first version of this pass missed 96 of 122 "छे द" in the sources.
    for _ in range(2):
        if letter_run(text):
            break
        found = list(WORD_SPAN.finditer(text))
        edits = []
        consumed = -1
        for current, following in zip(found, found[1:]):
            if current.start() < consumed:
                continue
            if following.start() != current.end() + 1 or text[current.end()] != ' ':
                continue
            first, second = current.group(0), following.group(0)
            # only the right-hand fragment has to start on a consonant; the left one can start on a
            # vowel when the mark was displaced out of it ("इजं न" for "इंजन").
            if not SINGLE_CONSONANT.match(second[0]):
                continue
            if first == 'और' or len(second) > 3:
                continue
            if second in dictionary and not SINGLE_CONSONANT.match(second):
                continue
            if (first, second) in PAIR_REFUSE:
                log['review'].append({'file': path, 'word': f'{first} {second}', 'why': 'ambiguous split',
                                      'text': text[:160]})
                continue
            joined = first + second
            # न/क/व are real words, so a plain join with them is never taken; the join is still tried
            # through the mark move ("इजं न" -> इंजन), because that result has to be a dictionary word.
            fixed, how = (None, 'split+mark')
            if second not in NEVER_GLUE and joined in dictionary:
                fixed, how = joined, 'split'
            elif second not in NEVER_GLUE:
                variants = sorted(move_mark_variants(joined) & dictionary)
                fixed = variants[0] if len(variants) == 1 else None
            else:
                variants = sorted(move_mark_variants(joined) & dictionary)
                fixed = variants[0] if len(variants) == 1 else None
            if not fixed or fixed in FORBID:
                continue
            edits.append((current.start(), following.end(), fixed, first, second, how))
            consumed = following.end()
        if not edits:
            break
        for offset, limit, fixed, first, second, how in reversed(edits):
            text = text[:offset] + fixed + text[limit:]
            log['repaired'].append({'file': path, 'from': f'{first} {second}', 'to': fixed, 'how': how})

    # 3. an anusvara sitting one consonant to the right of its vowel.
    def mark_sub(match):
        word = match.group(0)
        if word in OVERRIDES:
            log['repaired'].append({'file': path, 'from': word, 'to': OVERRIDES[word], 'how': 'override'})
            return OVERRIDES[word]
        if word in dictionary or not (set(word) & set(MOVED_MARK)):
            return word
        variants = sorted(move_mark_variants(word) & dictionary)
        if len(variants) != 1:
            return word
        log['repaired'].append({'file': path, 'from': word, 'to': variants[0], 'how': 'moved-mark'})
        return variants[0]
    return WORD_SPAN.sub(mark_sub, text)


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
        for pattern in ('ch*/built/*.json', 'ch*/facts.json', 'ch*/glossary.json', 'ch*/lessons/*.json'):
            for filename in glob.glob(f'{path}/{pattern}'):
                try:
                    data = json.load(open(filename))
                except (ValueError, OSError):
                    continue
                for text in strings(data):
                    if anomalies(text):
                        continue
                    for word in re.split(f'[^{DEV_CLASS}]+', text):
                        if len(word) < 2 or LEADING_MARK.match(word):
                            continue
                        if DOUBLED.search(word):
                            continue
                        vocab[word] += 1
    return vocab


def index(vocab):
    anagrams = collections.defaultdict(list)
    by_length = collections.defaultdict(list)
    for word, count in vocab.items():
        if count >= 2:
            anagrams[''.join(sorted(word))].append((count, word))
            by_length[len(word)].append((count, word))
    return anagrams, by_length


def pick(candidates, dictionary=None):
    """The more frequent spelling, and only when it is not a coin toss."""
    candidates = [c for c in candidates if c[1] not in FORBID]
    if dictionary:
        verified = [c for c in candidates if c[1] in dictionary]
        if verified:
            candidates = verified
    candidates = sorted(set(candidates), reverse=True)
    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0][1]
    if candidates[0][0] >= 2 * candidates[1][0] and candidates[0][0] >= 3:
        return candidates[0][1]
    return None


def repair_word(word, vocab, anagrams, by_length, dictionary=None):
    """(fixed word, how) or (None, why not)."""
    if word in OVERRIDES:
        return OVERRIDES[word], 'override'
    if word in vocab and vocab[word] >= 2 and not is_broken(word):
        return word, 'already'
    if '\ufffd' in word:
        pattern = re.compile('^' + ''.join('.' if c == REPLACEMENT else re.escape(c) for c in word) + '$')
        hit = pick([(vocab[c], c) for _, c in by_length[len(word)] if pattern.match(c)], dictionary)
        return (hit, 'wildcard') if hit else (None, 'no wildcard match')
    key = ''.join(sorted(word))
    hit = pick(anagrams.get(key, []), dictionary)
    if hit:
        return hit, 'anagram'
    # one mark dropped or added: only accept an insertion/deletion of a matra or anusvara
    shorter, longer = (word, None), None
    out = []
    for _, candidate in by_length.get(len(word) + 1, []):
        for i in range(len(candidate)):
            if candidate[:i] + candidate[i + 1:] == word and re.match(f'[{MATRA}{ANUSVARA}]', candidate[i]):
                out.append((vocab[candidate], candidate))
                break
    hit = pick(out, dictionary)
    if hit:
        return hit, 'dropped mark'
    return None, 'no confident candidate'


def repair_text(text, vocab, anagrams, by_length, log, path, dictionary=None):
    fixed = text
    if anomalies(text):
        fixed = JOIN_SPACE.sub('', text)
        fixed = DOUBLED.sub(r'\1', fixed)
        if anomalies(fixed):
            for word in tokens(fixed):
                if word in fixed and is_broken(word):
                    good, how = repair_word(word, vocab, anagrams, by_length, dictionary)
                    if good and good != word:
                        fixed = re.sub(re.escape(word), good, fixed)
                        log['repaired'].append({'file': path, 'from': word, 'to': good, 'how': how})
                    elif good is None:
                        log['review'].append({'file': path, 'word': word, 'why': how,
                                              'text': fixed[:160]})
    return repair_shapes(fixed, dictionary, vocab, log, path)


def walk(value, vocab, anagrams, by_length, log, path, dictionary=None):
    if isinstance(value, str):
        return repair_text(value, vocab, anagrams, by_length, log, path, dictionary)
    if isinstance(value, dict):
        return {k: walk(v, vocab, anagrams, by_length, log, path, dictionary) for k, v in value.items()}
    if isinstance(value, list):
        return [walk(v, vocab, anagrams, by_length, log, path, dictionary) for v in value]
    return value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--book')
    parser.add_argument('--json', default=f'{ROOT}/work/qa/hindi-repair-review.json')
    parser.add_argument('--dict', action='append', default=[],
                        help='independent wordlist (one word per line); a repair must appear in it')
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
    vocab = load_vocabulary(books)
    anagrams, by_length = index(vocab)
    log = {'repaired': [], 'review': [], 'files': 0}

    for book in books:
        for filename in sorted(glob.glob(f'{ROOT}/work/{book}/ch*/**/*.json', recursive=True)):
            rel = os.path.relpath(filename, ROOT)
            try:
                raw = open(filename, encoding='utf-8').read()
                data = json.loads(raw)
            except (ValueError, OSError):
                continue
            if not any(WORD_SPAN.search(text) for text in strings(data)):
                continue
            fixed = walk(data, vocab, anagrams, by_length, log, rel, dictionary or None)
            if fixed != data:
                log['files'] += 1
                if apply_changes:
                    with open(filename, 'w', encoding='utf-8') as handle:
                        json.dump(fixed, handle, ensure_ascii=False, indent=1)
                        handle.write('\n')

    print(f'vocabulary {len(vocab)} words, dictionary {len(dictionary)}')
    print(f'repaired {len({(r["from"], r["to"]) for r in log["repaired"]})} distinct words '
          f'in {len(log["repaired"])} places, {log["files"]} files {"written" if apply_changes else "would change"}')
    for row in sorted({(r['from'], r['to'], r['how']) for r in log['repaired']}):
        print(f'  [{row[2]:12}] {row[0]} -> {row[1]}')
    unresolved = collections.Counter((r['word'], r['why']) for r in log['review'])
    print(f'review: {len(unresolved)} distinct words left alone')
    for (word, why), count in sorted(unresolved.items(), key=lambda kv: -kv[1]):
        print(f'  x{count:<3} {word!r} ({why})')
    json.dump(log, open(args.json, 'w'), ensure_ascii=False, indent=1)
    print(f'written to {args.json}')


if __name__ == '__main__':
    main()
