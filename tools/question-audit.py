#!/usr/bin/env python3
"""Measure every question on hooty.org, and hand the worst ones to a reviewer.

38,996 questions is too many to read one at a time, and "it has an answer key" is not the standard. This
walks every pack, pulls every question, and scores each one on the things that can be checked without
opinion: is there feedback, is the feedback a reason, does the right answer sit in a predictable slot, is the
correct option the obvious longest one, does the same prompt appear twice, is the question just a definition
recall. Questions that pass all of that still need a reader, so `--sample` prints the ones a reviewer should
judge first, worst first.

  python3 tools/question-audit.py                     # whole site, summary per book
  python3 tools/question-audit.py --book maths-g4     # one book, with counts per fault
  python3 tools/question-audit.py --sample maths-g4 25    # 25 prompts to judge, worst first
  python3 tools/question-audit.py --json work/qa/questions.json

A fault here is a starting point for a human judgement, not a verdict. The lane that reads them decides.
"""
import argparse
import collections
import glob
import json
import os
import re
import statistics

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACKS = f'{ROOT}/public/content/packs'
QUESTION_TYPES = {'mcq', 'fillblank', 'truefalse', 'matchpairs', 'dragorder'}

PLATITUDE = re.compile(r'^(try again|not quite|incorrect|wrong|no\b|read (it )?again|think again|'
                       r'better luck|oops|nope)[.!]?$', re.I)
RECALL = re.compile(r'^(what is|what are|which is|who is|who was|when (did|was|is)|where is|'
                    r'how many|how much|define|name the)\b', re.I)
# The books are in English and Hindi. A Hindi explanation says "क्योंकि", not "because", so an English-only
# list scored every Hindi answer as giving no reason: hindi-g9 read as 100 faults per 100 questions.
REASON = re.compile(r'\b(because|since|so that|this means|that means|which means|therefore|as a result|'
                    r'for example|reason)\b|क्योंकि|इसलिए|इसीलिए|इस कारण|कारण|अतः|जिससे|ताकि|'
                    r'ಏಕೆಂದರೆ|ಆದ್ದರಿಂದ|ಕಾರಣ', re.I)
# An assertion-reason item offers the same four lines to every child; two of them are the long "Both A and R
# are true" pair, so the longest-option test cannot tell the answer from the shape.
ASSERTION = re.compile(r'^(both a and r|a is (true|false)|a और r)', re.I)


def questions(pack):
    for unit in pack.get('units', []):
        for chapter in unit.get('chapters', []):
            for lesson in chapter.get('lessons', []):
                for activity in lesson.get('activities', []):
                    kind = activity.get('type')
                    if kind in QUESTION_TYPES:
                        yield chapter.get('id'), lesson.get('id'), activity


def words(text):
    return len(re.findall(r'\S+', text or ''))


def faults(activity, grade):
    """Every checkable thing wrong with one question. Empty list means nothing obvious is wrong."""
    out = []
    prompt = (activity.get('prompt') or activity.get('title') or '').strip()
    explanation = (activity.get('explanation') or '').strip()
    options = activity.get('options') or []

    if activity.get('type') == 'mcq':
        answer = activity.get('answer')
        if not isinstance(answer, int) or not 0 <= answer < len(options):
            out.append('no-answer-key')
        if not explanation:
            out.append('no-feedback')
        elif PLATITUDE.match(explanation) or words(explanation) < 6:
            out.append('feedback-is-not-a-reason')
        elif answer is not None and isinstance(answer, int) and options:
            key_words = [w.lower() for w in re.findall(r'[A-Za-z\u0900-\u097F\u0C80-\u0CFF]{4,}',
                                                       options[answer] if 0 <= answer < len(options) else '')]
            if key_words and not any(w in explanation.lower() for w in key_words) and not REASON.search(explanation):
                out.append('feedback-ignores-the-answer')
            if not REASON.search(explanation):
                out.append('no-reason-given')
        lengths = [len(o) for o in options]
        templated = sum(1 for o in options if ASSERTION.match(str(o).strip())) >= 3
        if not templated and answer is not None and isinstance(answer, int) and 0 <= answer < len(lengths) and lengths:
            others = [l for i, l in enumerate(lengths) if i != answer]
            if others and lengths[answer] > 1.4 * statistics.median(others):
                out.append('answer-is-the-longest-option')
        if len(set(o.strip().lower() for o in options)) < len(options):
            out.append('duplicate-options')
        if any(not o.strip() for o in options):
            out.append('blank-option')
        if len(options) not in (2, 3, 4):
            out.append(f'{len(options)}-options')
    else:
        if not explanation:
            out.append('no-feedback')
        elif PLATITUDE.match(explanation) or words(explanation) < 6:
            out.append('feedback-is-not-a-reason')

    if RECALL.match(prompt) and not REASON.search(prompt):
        out.append('recall-only')
    if grade and grade.isdigit() and int(grade) <= 3 and words(prompt) > 24:
        out.append('too-long-for-the-grade')
    if words(prompt) > 60:
        out.append('very-long-prompt')
    return out


def audit(book_filter=None):
    rows, all_faults = [], collections.Counter()
    for path in sorted(glob.glob(f'{PACKS}/*/pack.json')):
        pack = json.load(open(path))
        book = pack.get('id') or os.path.basename(os.path.dirname(path))
        if book_filter and book != book_filter:
            continue
        grade = str(pack.get('grade') or '')
        counts = collections.Counter()
        seen = collections.Counter()
        answers = collections.Counter()
        total = 0
        for chapter_id, lesson_id, activity in questions(pack):
            total += 1
            counts.update(faults(activity, grade))
            # A repeat only matters inside one lesson: "match each thing with its description" is the
            # instruction for a different matchpairs card in every lesson, and counting it book-wide
            # reported 17 duplicates in english-g10 that a child never meets twice.
            prompt = (activity.get('prompt') or '').strip().lower()
            if prompt:
                seen[(lesson_id, prompt)] += 1
            if activity.get('type') == 'mcq' and isinstance(activity.get('answer'), int):
                answers[activity['answer']] += 1
        repeated = sum(n - 1 for n in seen.values() if n > 1)
        if repeated:
            counts['repeated-prompt'] = repeated
        if total:
            top = max(answers, key=answers.get) if answers else None
            if top is not None and answers[top] / max(1, sum(answers.values())) > 0.45:
                counts['answer-slot-bias'] = answers[top]
        all_faults.update(counts)
        rows.append({'book': book, 'grade': grade, 'questions': total, 'faults': dict(counts)})
    return rows, all_faults


def sample(book, limit):
    path = f'{PACKS}/{book}/pack.json'
    pack = json.load(open(path))
    grade = str(pack.get('grade') or '')
    scored = []
    for chapter_id, lesson_id, activity in questions(pack):
        problems = faults(activity, grade)
        scored.append((len(problems), chapter_id, lesson_id, activity, problems))
    scored.sort(key=lambda row: -row[0])
    for count, chapter_id, lesson_id, activity, problems in scored[:limit]:
        prompt = (activity.get('prompt') or '').strip()
        print(f'--- {lesson_id} · {activity.get("type")} · {count} faults: {", ".join(problems) or "none"}')
        print(f'    {prompt}')
        for index, option in enumerate(activity.get('options') or []):
            mark = '*' if index == activity.get('answer') else ' '
            print(f'  {mark} {option}')
        if activity.get('explanation'):
            print(f'    feedback: {activity["explanation"]}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--book')
    parser.add_argument('--sample', nargs=2, metavar=('BOOK', 'N'))
    parser.add_argument('--json')
    args = parser.parse_args()

    if args.sample:
        sample(args.sample[0], int(args.sample[1]))
        return

    rows, totals = audit(args.book)
    if args.json:
        json.dump({'books': rows, 'totals': dict(totals)}, open(args.json, 'w'), indent=1)
    if args.book:
        for name, count in totals.most_common():
            print(f'{count:6} {name}')
        return
    questions_total = sum(row['questions'] for row in rows)
    print(f'{"book":22}{"Q":>6}{"faults":>8}{"per 100":>9}')
    for row in sorted(rows, key=lambda r: -sum(r['faults'].values())):
        faulted = sum(row['faults'].values())
        per100 = 100 * faulted / row['questions'] if row['questions'] else 0
        print(f'{row["book"]:22}{row["questions"]:>6}{faulted:>8}{per100:>8.0f}')
    print(f'{"TOTAL":22}{questions_total:>6}{sum(totals.values()):>8}')
    print()
    for name, count in totals.most_common():
        print(f'{count:7} {name}')


if __name__ == '__main__':
    main()
