#!/usr/bin/env python3
"""Cut a Kannada KTBS book into its lessons, from the book's own page headers, and write the reading text.

A lesson starts on the page whose header carries `ಪಾಠ <number>`; the words before it are the lesson's title.
Everything between one start and the next belongs to that lesson. Damaged lines (a Nudi glyph the converter
could not place) are dropped rather than shipped, and each lesson records how much of it survived, so a thin
lesson is visible instead of quietly bad.

  python3 tools/ktbs-book.py --book kannada-g1        # cut it, write work/kannada-g1/kn/chNN.json
  python3 tools/ktbs-book.py --book kannada-g1 --show 3

Output is deliberately plain: one json per lesson with a title, the part and page range it came from, the clean
paragraph list, and clean/dropped line counts. Turning that into cards is the generator's job, not this one's.
"""
import argparse
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TEXT = f'{ROOT}/work/kn'
KANNADA_DIGITS = '೦೧೨೩೪೫೬೭೮೯'
RESIDUE = re.compile(r'[\u0080-\u00FF]')
WORD = re.compile(r'[\u0C80-\u0CFF]{2,}')


def kn_number(text):
    digits = ''.join(str(KANNADA_DIGITS.index(char)) if char in KANNADA_DIGITS else char for char in text)
    return int(digits) if digits.isdigit() else None


def is_band(line):
    # Every page carries a decorative band of single letters from the alphabet chart. A line made almost
    # entirely of one- and two-letter tokens is that band, not a sentence.
    tokens = line.split()
    if not tokens or len(tokens) > 24:
        return False
    short = sum(1 for token in tokens if len(token) <= 2)
    return short / len(tokens) >= 0.6 and len(WORD.findall(line)) < 3


def drop_inline_band(line):
    """Remove the alphabet band when it sits inside a line: a run of four or more one/two-letter tokens that
    contains at least one ascii or @ token. Real prose never produces that; the band always does."""
    tokens = line.split()
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


def clean_line(line):
    line = drop_inline_band(' '.join(line.split()))
    if is_band(line):
        return None
    header = re.search(r'ಪಾಠ[ ]*[0-9' + KANNADA_DIGITS + r']+', line)
    if header and header.start() < 60:
        # A page header is the lesson title, the number, the poet and an instruction to the teacher. It is
        # not part of the reading, so it is cut off the front of the first line it appears on.
        line = line[header.end():]
        line = re.sub(r'^\s*[-–:]?\s*', '', line)
        if len(WORD.findall(line)) < 2:
            return None
    if len(WORD.findall(line)) < 3:
        return None                     # a heading fragment or a page number, not reading text
    if RESIDUE.search(line):
        return None                     # a glyph the converter could not place: dropped, and counted
    return line


def lessons_of(slug):
    pages = []
    for path in sorted(glob.glob(f'{TEXT}/{slug}/*.txt')):
        part = re.search(r'/(p[0-9]+)-[0-9]+-p([0-9]+)[.]txt$', path)
        if part:
            pages.append((path, part.group(1), int(part.group(2))))
    pages.sort(key=lambda item: (item[1], item[2]))

    starts = []
    for path, part, number in pages:
        head = ' '.join(open(path).read().split())[:200]
        found = re.search(r'ಪಾಠ[ ]*([0-9' + KANNADA_DIGITS + r']+)', head)
        if not found:
            continue
        lesson_number = kn_number(found.group(1))
        if lesson_number is None:
            continue
        expected = (starts[-1][0] + 1) if starts else 1
        if lesson_number != expected:
            # Front matter talks about lessons ("from lesson 11 onwards") and running heads repeat one, so
            # only a number that continues the sequence actually starts a lesson.
            continue
        title = head[:found.start()].strip(' -–:()')
        title = re.sub(r'\((ಪದ್ಯ|ಗದ್ಯ|ಗÀದ್ಯ)[^)]*\)?', '', title)
        title = re.sub(r'[^\u0C80-\u0CFF\s0-9.,!?-]', '', title)
        title = ' '.join(title.split()).strip(' -–:')
        starts.append((lesson_number, title, part, number, path))

    out = []
    for index, (number, title, part, page, _path) in enumerate(starts):
        end_part, end_page = part, 10 ** 6
        if index + 1 < len(starts):
            end_part, end_page = starts[index + 1][2], starts[index + 1][3]
        paragraphs, dropped, kept = [], 0, 0
        for path, page_part, page_number in pages:
            if page_part != part and page_part != end_part:
                if not (part <= page_part <= end_part):
                    continue
            if (page_part, page_number) < (part, page):
                continue
            if (page_part, page_number) >= (end_part, end_page) and end_page != 10 ** 6:
                continue
            for line in open(path).read().splitlines():
                cleaned = clean_line(line)
                if cleaned:
                    paragraphs.append(cleaned)
                    kept += 1
                elif len(WORD.findall(line)) >= 3:
                    dropped += 1
        out.append({'lesson': number, 'title': title or f'ಪಾಠ {number}', 'part': part,
                    'from': page, 'paragraphs': paragraphs, 'clean_lines': kept, 'dropped_lines': dropped})
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--book', action='append', default=[])
    parser.add_argument('--all', action='store_true')
    parser.add_argument('--show', type=int, default=0)
    args = parser.parse_args()

    slugs = args.book
    if args.all:
        slugs += sorted(os.path.basename(path) for path in glob.glob(f'{TEXT}/*'))
    if not slugs:
        print(__doc__)
        return

    total_lessons = 0
    for slug in slugs:
        lessons = lessons_of(slug)
        target = f'{ROOT}/work/{slug}/kn'
        os.makedirs(target, exist_ok=True)
        for lesson in lessons:
            json.dump(lesson, open(f"{target}/ch{lesson['lesson']:02d}.json", 'w'), ensure_ascii=False, indent=1)
        json.dump({'slug': slug, 'lessons': [{k: v for k, v in l.items() if k != 'paragraphs'} for l in lessons]},
                  open(f'{target}/index.json', 'w'), ensure_ascii=False, indent=1)
        total_lessons += len(lessons)
        clean = sum(l['clean_lines'] for l in lessons)
        dropped = sum(l['dropped_lines'] for l in lessons)
        thin = [l['lesson'] for l in lessons if l['clean_lines'] and l['dropped_lines'] / (l['clean_lines'] + l['dropped_lines']) > 0.3]
        print(f'{slug:16} {len(lessons):>2} lessons, {clean} clean lines, {dropped} dropped'
              + (f', thin: {thin}' if thin else ''))
        if args.show:
            for lesson in lessons[:args.show]:
                print(f"  ಪಾಠ {lesson['lesson']} · {lesson['title']} · {lesson['clean_lines']} lines")
                print('   ' + (lesson['paragraphs'][0][:110] if lesson['paragraphs'] else '(no clean text)'))
    print(f'{total_lessons} lessons across {len(slugs)} books')


if __name__ == '__main__':
    main()
