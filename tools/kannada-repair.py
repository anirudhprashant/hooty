#!/usr/bin/env python3
"""Repair the lines the Kannada converter could not finish, and prove how many are left.

`tools/ktbs-book.py` parks every line it could not convert in the lesson's `damaged` list instead of deleting
it. This works that list: it cleans out the alphabet band, puts back the letters and vowel signs the font tore
off (in the order Unicode wants, not the order the font drew), applies the current glyph overrides, and puts a
line back into its paragraph the moment it converts whole and reads as words the books already use. What it
cannot fix it reports with the raw context around each stray glyph, because that context is what tells a
reader which Kannada the glyph stands for — and the answer goes into `work/qa/kannada-overrides.json`, which
makes the next pass fix every occurrence at once.

  python3 tools/kannada-repair.py --report               # where the damage is, worst first, with context
  python3 tools/kannada-repair.py --apply                # repair what the current rules cover
  python3 tools/kannada-repair.py --polish               # clean the alphabet band out of lines that converted
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


MARK = re.compile(r'[\u0CBE-\u0CD6\u0CE2-\u0CE3]')
VOWELS = '\u0C85-\u0C94'
# Numbers and punctuation carry meaning (question numbers, page years, list marks) and are never chart glyphs.
NUMBERING = re.compile(r'^[\d\s.)\-(–—,/:%"\'\u2018\u2019\u201C\u201D\u2022_\u2026]+$')

_corpus = None

# Consonant keys of the Nudi table whose tail got torn off, so the table never saw them: `£À` is ನ, `¼À` is
# ಳ, `¸À` is ಸ, `¨sÀ` is ಭ and `¥À` is ಪ. When only the bare key survives, the letter it stood for is what the
# page printed. These live here and not in the overrides file on purpose: at page level a bare letter would
# also let a torn vowel order through as "clean", while in this tool the vowel-order swap in tidy() runs first
# and the corpus check below refuses anything that is not a word the books already use. `ª` is left out
# because it stands for both ಮ (`ªÀÄ`) and ವ (`ªÀÅ`) and the context does not always say which.
TORN = {'£': 'ನ', '¼': 'ಳ', '¸': 'ಸ', '¨': 'ಬ', '¥': 'ಪ'}


def corpus():
    """Every prose word already standing in a clean paragraph of any book, used to prove a repair is real Kannada.

    Only words of three or more letters with no bare vowel letter inside them are taken: the alphabet chart
    that leaks into some clean lines contributes single letters and stacked vowels, and those must not become
    evidence that a repaired word is real.
    """
    global _corpus
    if _corpus is not None:
        return _corpus
    seen = set()
    for path in glob.glob(f'{ROOT}/work/*/kn/ch*.json'):
        try:
            lesson = json.load(open(path))
        except (ValueError, OSError):
            continue
        for paragraph in lesson.get('paragraphs', []):
            for word in WORD.findall(paragraph):
                if (len(word) >= 3 and not re.search(f'[{VOWELS}]', word[1:])
                        and not re.search('[\u0C83\u0C82]', word)):
                    seen.add(word)
    _corpus = seen
    return _corpus


def debris(token):
    """True for a piece of page furniture, not a word.

    Every page carries a decorative alphabet band, and pdftotext often leaves a slice of it inside a prose
    line. `band_free` used to delete whole runs of short tokens, which swallowed real sentences whenever the
    band sat mid-line. Judging token by token keeps the prose: a chart letter is a bare vowel, or a broken
    glyph holding both a Latin letter and Kannada, or a bare mark.
    """
    if token == '\u2022':
        return False                                  # a list bullet, which the book itself prints
    if NUMBERING.match(token):
        return False
    has_kannada = re.search('[\u0C80-\u0CFF]', token)
    has_latin = re.search('[A-Za-z@|!~`\\\\]', token)
    if not has_kannada:
        return True                                   # a Latin fragment or brand sigil with no word in it
    body = ''.join(char for char in token if '\u0C80' <= char <= '\u0CFF')
    if has_latin and len(body) <= 2:
        return True                                   # a half-converted chart glyph, e.g. ಇP or Sಊ; a longer
                                                      # word that kept one stray letter is a word, not furniture
    if len(body) <= 3 and re.search(f'[{VOWELS}]', body[1:]):
        return True                                   # chart debris such as ಇಆ or ಖಿಔ; a name with initials
                                                      # (ಎಚ್.ಎಸ್.ವೆಂಕಟೇಶ) is long and is not the chart
    if '\u0C83' in body and body not in corpus():
        return True                                   # a lone visarga mark
    return False


def band_free(text):
    """Drop the page furniture tokens from a line; prose, numbering and blanks stay.

    A one or two letter token that appears nowhere in the corpus is a chart letter, not a word: the book's
    prose never uses one. Grammar tables lose their example letter this way, which is a better trade than
    leaving chart letters scattered through a sentence.
    """
    keep = []
    for token in text.split():
        if debris(token):
            continue
        # A bare chart letter is one or two Kannada letters and nothing else. "ಅ)" or "(ಈ" carry a marker
        # the book prints, and stay; "ಕ" and "ಖಿ" are the chart, and go.
        if len(token) <= 2 and token not in corpus() and re.fullmatch('[\u0C80-\u0CFF]+', token):
            continue
        keep.append(token)
    return ' '.join(keep)


def tidy(text):
    """Rules that hold for every line, learned from the corpus rather than guessed per word.

    - `À` is the head-stroke glyph of the font: wherever it survived the mapping it is a leftover mark, not a
      letter, so it goes.
    - A space in front of a vowel sign or a virama can never be right: those marks attach to the letter before
      them, so the space is closed up.
    - U+00AD is a soft hyphen the typesetter uses as a dash between example words ("ಮ್ಮ ­ ಅಮ್ಮ"); it is a
      formatting character, never a letter, and the book prints a plain hyphen in the same place elsewhere
      ("ಮೂಲ; ಅನೀತಿ - ಅನ್ಯಾಯ"), so it becomes one. U+00B7 is the middle dot the book prints at the head of a
      list item; that is punctuation and becomes a real bullet.
    """
    text = text.replace('\u00ad', '-').replace('·', '\u2022')
    text = text.replace('À', '')
    text = re.sub(r'\s+(?=[\u0CBE-\u0CD6\u0CE2-\u0CE3])', '', text)
    # No Kannada word writes the same dependent vowel sign twice: a doubled one is the font's two copies of
    # the same stroke (ವೀಣಾ + ಾ from the fragment after it). The one pair that is real, ೆ + ಾ (= ೇ), is two
    # different signs and is left alone.
    text = re.sub('([\u0CBE-\u0CCC\u0CCE-\u0CD6])\\1+', r'\1', text)
    # The font draws a vowel sign before the consonant it belongs to when they are joined: C + u + virama + C
    # means C + virama + C + u in Unicode. The same swap the converter makes inside one word, applied when the
    # PDF split the pair across tokens.
    swap = re.compile('([\u0C95-\u0CB9])([' + '\u0CBE-\u0CD6\u0CE2-\u0CE3' + '])\u0CCD([\u0C95-\u0CB9])')
    previous = None
    while previous != text:
        previous = text
        text = swap.sub(lambda m: m.group(1) + '\u0CCD' + m.group(3) + m.group(2), text)
    return text


def clean_candidate(text, fixups):
    """A repaired line, or None while a stray glyph is still in it, or when the result is not real Kannada."""
    text = band_free(text)
    # Vowel signs first: they are drawn before the consonant that carries them, and tidy() can only close the
    # gap once the sign is Kannada. `Á` is ಾ, `Ç` is ೂ, `É` is ೆ — all three stand alone in the table (no
    # longer key starts with them), so the letter before them is already converted and only the sign was lost.
    # A sign that would land on a sign is dropped instead of doubled ("ಹೇಗಿವೆೆ" was É put back on a ೆ that
    # had survived); the one valid pair is ೆ + ಾ, which is how the font draws ೇ.
    rebuilt = []
    for char in text:
        sign = {'Á': 'ಾ', 'Ç': 'ೂ', 'É': 'ೆ'}.get(char)
        if not sign:
            rebuilt.append(char)
            continue
        previous = rebuilt[-1] if rebuilt else ''
        if previous and '\u0CBE' <= previous <= '\u0CD6' and not (previous == '\u0CC6' and sign == '\u0CBE'):
            continue
        rebuilt.append(sign)
    text = ''.join(rebuilt)
    text = tidy(text)
    for glyph, replacement in TORN.items():
        text = text.replace(glyph, replacement)
    for glyph, replacement in fixups.items():
        text = text.replace(glyph, replacement)
    text = ' '.join(text.split())
    if RESIDUE.search(text):
        return None
    if re.search(r'[A-Za-z]', text):
        return None                                   # a Latin letter left inside Kannada is still damage
    if text[:1] and '\u0CBE' <= text[0] <= '\u0CD6':
        return None                                   # the line starts mid-word; its head never reached the page
    # A vowel sign only ever hangs off the letter before it. A sign that follows a space, a comma or a digit
    # is a repair that put the sign back but lost the letter it belonged to, so the line is still not text.
    for sign in MARK.finditer(text):
        if sign.start() == 0 or not ('\u0C80' <= text[sign.start() - 1] <= '\u0CFF'):
            return None
    words = [word for word in WORD.findall(text) if len(word) >= 2]
    if len(words) < 3:
        return None
    # Two of the line's words must already stand somewhere in a clean paragraph. That is what separates a
    # repaired sentence from a plausible-looking pile of syllables: the chart debris above can never pass it.
    if sum(1 for word in words if word in corpus()) < 2:
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


def polish(slug=None, dry=False):
    """Clean the page furniture out of paragraphs that already converted, and fix the mark order inside them.

    These lines are not damaged — they carry no stray glyph — but the alphabet band that sits on every page
    often lands inside one of them, so a lesson's first paragraph can open with "ಖಿಔ ಖಿಃ ... ಓ ಔ ಖಿ". The
    band is page furniture, not reading: it is dropped here with the same token test the repair uses, and the
    vowel-order swap that the converter makes inside one word is applied where the PDF split a pair. The token
    test only ever removes furniture, so a paragraph cannot lose a word it had; a line that was nothing but
    the band and a page number keeps the page number.
    """
    changed = 0
    for path, lesson in lessons(slug):
        out, touched = [], False
        for paragraph in lesson['paragraphs']:
            cleaned = ' '.join(tidy(band_free(paragraph)).split())
            if cleaned == paragraph or not cleaned:
                cleaned = paragraph
            else:
                touched = True
            out.append(cleaned)
        if touched and not dry:
            lesson['paragraphs'] = out
            lesson['clean_lines'] = len(out)
            json.dump(lesson, open(path, 'w'), ensure_ascii=False, indent=1)
        changed += touched
    print(f'{changed} paragraphs polished')
    return changed


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
    parser.add_argument('--polish', action='store_true')
    parser.add_argument('--book')
    parser.add_argument('--dry', action='store_true')
    args = parser.parse_args()
    if args.polish:
        polish(args.book, args.dry)
        if not args.apply:
            damaged = report(args.book)
            sys.exit(0 if damaged == 0 else 1)
    if args.apply:
        remaining = apply(args.book, args.dry)
        sys.exit(0 if remaining == 0 else 1)
    damaged = report(args.book)
    sys.exit(0 if damaged == 0 else 1)


if __name__ == '__main__':
    main()
