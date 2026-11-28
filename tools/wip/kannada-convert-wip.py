#!/usr/bin/env python3
"""WORK IN PROGRESS, NOT WIRED IN. The active path is tools/kannada-text.py (sanchaya table + overrides).
Self-test is 3/6: the glyph table needs the fused-letter and multi-key rules ported before it can replace it.

Convert Nudi ascii Kannada (the font KTBS PDFs are set in) to Unicode, from the glyph table itself.

The vendored sanchaya converter has a 216-entry sequence table and leaves 18% of prose lines with a stray
glyph (`Õ` for ಜ್ಞ, `Å` for ು inside some letters). openkannada/kannadi publishes a per-glyph table derived
from the Nudi font file and checked against Karnataka government pages, which is complete for the glyphs these
books actually use. This reads that table and applies the layering Nudi stores a syllable in:

    [ottu of the previous syllable] base [first half of the vowel sign] ottu... [length mark] [signs] [reph]

and writes it the way Unicode wants it: reph (ರ್) first, then the base with its signs, the subscripts after it.

  python3 tools/kannada-convert.py "CPÀëgÀUÀ¼À£ÀÄß"     # one line
  python3 tools/kannada-convert.py --self-test          # the cases that decide whether it works
"""
import os
import sys

TABLE = f'{os.path.dirname(os.path.abspath(__file__))}/vendor/kannadi-nudi.tsv'
VIRAMA = '್'


def load():
    """byte -> (kind, kannada) from the published table."""
    table = {}
    for line in open(TABLE, encoding='utf-8'):
        if line.startswith('#') or not line.strip():
            continue
        parts = line.rstrip('\n').split('\t')
        if len(parts) < 3:
            continue
        codes, kind, value = parts[0].split(), parts[1], parts[2]
        # A row like "49 C4" means the glyph is reached by two keys; the first one carries it, the rest are
        # already accounted for and must not print a second time.
        table[int(codes[0], 16)] = (kind, value)
        for extra in codes[1:]:
            table[int(extra, 16)] = ('ignore', '')
    return table


def to_chars(text):
    """cp1252 text to a list of table entries, dropping anything the table does not know."""
    table = load()
    out = []
    unknown = []
    for char in text:
        code = ord(char)
        if code in table:
            out.append(table[code])
        elif code == 0x20 or 0x20 <= code < 0x7F:
            out.append(('ascii', char))
        else:
            unknown.append(char)
    return out, unknown


def convert(text):
    chars, unknown = to_chars(text)
    out = []
    # syllable state
    base = None
    signs = []
    ottus = []
    reph = False

    def flush():
        nonlocal base, signs, ottus, reph
        if base is None:
            if reph:
                out.append('ರ' + VIRAMA)
            reph = False
            signs.clear()
            ottus.clear()
            return
        piece = ('ರ' + VIRAMA if reph else '') + base
        for ottu in ottus:
            piece += VIRAMA + ottu
        piece += ''.join(signs)
        out.append(piece)
        base = None
        signs.clear()
        ottus.clear()
        reph = False

    for kind, value in chars:
        if kind == 'letter':
            flush()
            base = value
        elif kind == 'base':
            flush()
            base = value
        elif kind == 'aspirate':
            # a stroke drawn on the previous letter, already part of the Unicode letter it belongs to
            if base:
                base = base
        elif kind == 'ottu':
            ottus.append(value)
        elif kind == 'sign':
            signs.append(value)
        elif kind == 'mod':
            signs.append(value)
        elif kind == 'arka':
            reph = True
            flush()
        elif kind == 'literal':
            flush()
            out.append(value)
        elif kind == 'ascii':
            flush()
            out.append(value)
        elif kind == 'ignore':
            continue
    flush()
    return ''.join(out), unknown


SELF_TEST = [
    ('CPÀëgÀUÀ¼À£ÀÄß', 'ಅಕ್ಷರಗಳನ್ನು'),
    ('PÀ£ÀßqÀ', 'ಕನ್ನಡ'),
    ('PÀ£ÁðlPÀ', 'ಕರ್ನಾಟಕ'),
    ('¸ÀA¥ÀÄl', 'ಸಂಪುಟ'),
    ('¥Á¸ï¥ÉÆÃmïð', 'ಪಾಸ್‌ಪೋರ್ಟ್'),
    ('ªÀÄÄ£ÀÄßr', 'ಮುನ್ನುಡಿ'),
]


def main():
    if '--self-test' in sys.argv:
        failures = 0
        for source, expected in SELF_TEST:
            got, unknown = convert(source)
            flag = 'ok ' if got == expected else 'BAD'
            if got != expected:
                failures += 1
            print(f'{flag} {source!r:22} -> {got!r:22} expected {expected!r}'
                  + (f' unknown={unknown}' if unknown else ''))
        print(f'{len(SELF_TEST) - failures}/{len(SELF_TEST)} correct')
        return 0 if failures == 0 else 1
    if len(sys.argv) > 1:
        got, unknown = convert(sys.argv[1])
        print(got)
        if unknown:
            print(f'unplaced: {unknown}', file=sys.stderr)
        return 0
    print(__doc__)
    return 0


if __name__ == '__main__':
    sys.exit(main())
