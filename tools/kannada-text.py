#!/usr/bin/env python3
"""Turn a Kannada-medium KTBS PDF into clean Unicode Kannada text.

The PDFs carry a Nudi ascii font: the page says `CPÀëgÀUÀ¼À£ÀÄß` where it means `ಅಕ್ಷರಗಳನ್ನು`. Plain text
extraction is therefore worthless until the glyph keys are put back into Unicode order, which is what the
vendored converter in tools/vendor/ascii2unicode does (sanchaya/ascii2unicode, GPL, pure python). This wraps it
with the two things that job needs: reading the page as Latin-1 so the keys survive, and reporting every glyph
the table does not know, so damage is counted instead of shipped.

  python3 tools/kannada-text.py --book kannada-g1        # extract to work/kn/<slug>/page-NNN.txt
  python3 tools/kannada-text.py --report                 # unknown glyphs across everything extracted
  python3 tools/kannada-text.py --page kannada-g1 12     # one page, printed

Unknown glyphs are the honest quality signal: a page with none is clean, a page with any gets looked at before
it can become a lesson.
"""
import argparse
import collections
import glob
import importlib.util
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
VENDOR = f'{HERE}/vendor/ascii2unicode'
OUT = f'{ROOT}/work/kn'
OVERRIDES = f'{ROOT}/work/qa/kannada-overrides.json'
KANNADA = re.compile(r'[\u0C80-\u0CFF]')
# Anything in a converted page that is neither Kannada, nor plain ascii, nor ordinary punctuation is a glyph
# the table could not place. Those are exactly the characters a child would see as a box.
# Only latin-1 residue is damage: a Nudi key the table could not place. Form feeds and control characters are
# just page furniture and would otherwise mark every single page.
FOREIGN = re.compile(r'[\u0080-\u00FF]')


def converter():
    sys.path.insert(0, f'{VENDOR}/mappings')
    spec = importlib.util.spec_from_file_location('kan_converter', f'{VENDOR}/converter.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    import nudi  # the mapping table that ships with the converter
    module.mappings = nudi.mappings
    module.broken_cases = nudi.broken_cases
    module.dependent_vowels = nudi.dependent_vowels
    module.vattaksharagalu = nudi.vattaksharagalu
    module.ignoreList = nudi.ignoreList
    return module


def overrides():
    if os.path.exists(OVERRIDES):
        return json.load(open(OVERRIDES))
    return {}


def pages(pdf):
    info = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout
    match = re.search(r'Pages:\s+(\d+)', info)
    return int(match.group(1)) if match else 0


def extract_pdf(pdf, convert):
    """One string per page, already in Unicode Kannada."""
    total = pages(pdf)
    out = []
    fixups = overrides()
    for number in range(1, total + 1):
        raw = subprocess.run(['pdftotext', '-f', str(number), '-l', str(number), '-enc', 'Latin1', pdf, '-'],
                             capture_output=True).stdout
        page_text = raw.decode('cp1252', errors='replace')
        # Pages set with every glyph placed separately come out one or two characters to a line, and then a
        # sequence match can never see `ಪು` because the halves are on different lines. Join those pages before
        # converting; leave ordinary prose pages alone so their paragraph breaks survive.
        # Note: joining spaces between two glyph characters looks tempting for runs the PDF split mid-word, but
        # an ordinary word space also sits between two glyph characters, so it silently welds every sentence
        # together. Left out deliberately; split words are handled by the repair pass instead.
        lines = [line for line in page_text.splitlines() if line.strip()]
        short = sum(1 for line in lines if len(line.strip()) <= 2)
        if lines and short / len(lines) > 0.3:
            page_text = ' '.join(line.strip() for line in lines)
        text = convert.process_line(page_text)
        for glyph, replacement in fixups.items():
            text = text.replace(glyph, replacement)
        out.append(text)
    return out


def foreign_chars(text):
    return collections.Counter(FOREIGN.findall(text))


def run_book(slug, convert, quiet=False):
    folder = f'{ROOT}/sources/{slug}-download'
    if not os.path.isdir(folder):
        sys.exit(f'no sources for {slug} at {folder}')
    target = f'{OUT}/{slug}'
    os.makedirs(target, exist_ok=True)
    summary = {'slug': slug, 'parts': {}, 'unknown': collections.Counter()}
    for pdf in sorted(glob.glob(f'{folder}/*.pdf')):
        part = os.path.basename(pdf).replace('.pdf', '')
        page_texts = extract_pdf(pdf, convert)
        dirty = 0
        for index, text in enumerate(page_texts, start=1):
            found = foreign_chars(text)
            if found:
                dirty += 1
                summary['unknown'].update(found)
            with open(f'{target}/{part}-p{index:03d}.txt', 'w') as handle:
                handle.write(text)
        summary['parts'][part] = {'pages': len(page_texts), 'pages_with_unknown_glyphs': dirty}
        if not quiet:
            print(f'  {slug} {part}: {len(page_texts)} pages, {dirty} with unknown glyphs')
    return summary


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--book', action='append', default=[])
    parser.add_argument('--all', action='store_true')
    parser.add_argument('--page')
    parser.add_argument('--report', action='store_true')
    args = parser.parse_args()

    convert = converter()

    if args.page:
        slug, number = args.page.split(':')
        pdf = sorted(glob.glob(f'{ROOT}/sources/{slug}-download/*.pdf'))[0]
        print(extract_pdf(pdf, convert)[int(number) - 1])
        return

    if args.report or not (args.book or args.all):
        counter = collections.Counter()
        files = 0
        for path in glob.glob(f'{OUT}/*/*.txt'):
            files += 1
            counter.update(foreign_chars(open(path).read()))
        print(f'{files} pages extracted')
        if not counter:
            print('no unknown glyphs')
            return
        total = sum(counter.values())
        print(f'{total} unknown glyphs, {len(counter)} distinct')
        for char, count in counter.most_common(20):
            print(f'  U+{ord(char):04X} {char!r} x{count}')
        return

    slugs = args.book
    if args.all:
        slugs += sorted(os.path.basename(p).replace('-download', '')
                        for p in glob.glob(f'{ROOT}/sources/kannada-*-download'))
    summaries = []
    for slug in slugs:
        summaries.append(run_book(slug, convert))
    unknown = collections.Counter()
    for summary in summaries:
        unknown.update(summary['unknown'])
    os.makedirs(f'{ROOT}/work/qa', exist_ok=True)
    json.dump({'books': [{k: v for k, v in s.items() if k != 'unknown'} for s in summaries],
               'unknown': {f'U+{ord(c):04X}': n for c, n in unknown.most_common()}},
              open(f'{ROOT}/work/qa/kannada-extract.json', 'w'), indent=1, ensure_ascii=False)
    total_pages = sum(p['pages'] for s in summaries for p in s['parts'].values())
    dirty = sum(p['pages_with_unknown_glyphs'] for s in summaries for p in s['parts'].values())
    print(f'{total_pages} pages, {dirty} with unknown glyphs')
    if unknown:
        print('most common: ' + ', '.join(f'U+{ord(c):04X} x{n}' for c, n in unknown.most_common(8)))


if __name__ == '__main__':
    main()
