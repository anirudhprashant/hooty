#!/usr/bin/env python3
"""Apply the question critic's fixes to the lesson sources that build the packs.

The critic reads questions and writes work/qa/question-fixes/<book>/<question-id>.json. Nothing used to
read those files, so a written fix could sit there forever and never reach a child. This is the missing
step: it copies each fix into the lesson source, refusing to touch a question whose current text is not
the text the critic saw.

Four source shapes carry a pack question:
  work/<book>/chNN/ship/<n>.json        a card as written (ids ch1-l1-a5)
  work/<book>/chNN/deep.json[<n>].questions[j]        pack id <lesson>-d{j+1}
  work/<book>/chNN/deep.json[<n>].extras.case.questions[j]   pack id <lesson>-x{j+1}
  work/<book>/chNN/deep.json[<n>].extras.assertion[j]        pack id <lesson>-r{j+1}

Deep and case questions carry a per-option `why`, which is what the app shows a child who picks a wrong
option, so a fix for one of those may carry `after.why` (one line per option, the correct slot may be
null and falls back to `after.explanation`).

  python3 tools/apply-question-fixes.py english-g10 --dry     # say what would change
  python3 tools/apply-question-fixes.py english-g10           # write the lesson sources
  python3 tools/apply-question-fixes.py --all                 # every book with fixes waiting

It edits sources only. Publishing is the integrator's job: tools/publish.py rebuilds every book from
work/, so an applied fix goes live on the next publish and the critic checks it there.

The build reshuffles options with a seeded shuffle per question id (assemble-pack.py), so the option
order written here is not the order a child sees; the answer index is what matters.

Exit codes: 0 every fix applied or already applied, 1 something did not match (nothing written for it),
2 usage.
"""
import argparse
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXES = f'{ROOT}/work/qa/question-fixes'
# Three books replay work/plain/<pack>.json on every build; an edit only in ship/ is reverted there.
PLAIN = ('class6-science', 'class6-sst', 'mathematics-g6')
# The build rewrites a few phrases in prose ("in this lesson" -> "in this text"). Normalise before comparing.
BUILD_PHRASES = ((r'\bin this lesson\b', 'in this text'), (r'\bthe lesson says\b', 'the text says'))


def source_files(book):
    files = sorted(glob.glob(f'{ROOT}/work/{book}/ch*/ship/*.json'))
    if book in PLAIN:
        plain = f'{ROOT}/work/plain/{book}.json'
        if os.path.exists(plain):
            files.append(plain)
    return files


def normalise(text):
    text = (text or '').strip()
    for pattern, replacement in BUILD_PHRASES:
        text = re.sub(pattern, replacement, text, flags=re.I)
    return text


def walk(node, out):
    if isinstance(node, dict):
        if isinstance(node.get('id'), str):
            out.append(node)
        for value in node.values():
            walk(value, out)
    elif isinstance(node, list):
        for value in node:
            walk(value, out)


def short_id(book, qid):
    prefix = f'{book}-'
    return qid[len(prefix):] if qid.startswith(prefix) else qid


def deep_slots(book, short):
    """Every deep.json record that can hold this pack id: (path, container, key, kind)."""
    match = re.match(r'^(?P<lesson>ch\d+-l\d+|ch\d+)(?P<kind>-[dxr])(?P<num>\d+)$', short)
    if not match:
        return []
    lesson, kind, num = match.group('lesson'), match.group('kind'), int(match.group('num')) - 1
    chapter = int(re.match(r'ch(\d+)', lesson).group(1))
    out = []
    for path in (f'{ROOT}/work/{book}/ch{chapter:02d}/deep.json',):
        if not os.path.exists(path):
            continue
        data = json.load(open(path))
        key = lesson.split('-l')[-1] if '-l' in lesson else None
        record = data.get(key) if key else None
        if not isinstance(record, dict):
            continue
        extras = record.get('extras') or {}
        if kind == '-d':
            out.append((path, data, (record, 'questions', num), 'deep'))
        elif kind == '-x':
            case = extras.get('case') or {}
            out.append((path, data, (case, 'questions', num), 'case'))
        else:
            out.append((path, data, (extras, 'assertion', num), 'assertion'))
    return out


def current_of(shape):
    """The dict holding prompt/options/answer for a located slot."""
    item = shape['item']
    return item


def locate(book, qid):
    """Every place this pack question's source lives: list of dicts with kind, item, save."""
    short = short_id(book, qid)
    found = []
    for path in source_files(book):
        data = json.load(open(path))
        nodes = []
        walk(data, nodes)
        for activity in nodes:
            if activity.get('id') in (qid, short) and activity.get('type') in ('mcq', 'truefalse', 'fillblank'):
                found.append({'kind': 'card', 'item': activity, 'save': (path, data)})
    for path, data, (container, key, index), kind in deep_slots(book, short):
        items = container.get(key) or []
        if 0 <= index < len(items) and isinstance(items[index], dict):
            found.append({'kind': kind, 'item': items[index], 'save': (path, data)})
    return found


def same_options(item, wanted):
    current = item.get('options') or []
    if len(current) != len(wanted):
        return False
    return sorted(map(str, current)) == sorted(map(str, wanted))


def matches(item, before):
    if normalise(item.get('prompt')) != normalise(before.get('prompt')):
        return False
    if not same_options(item, before.get('options') or []):
        return False
    options = item.get('options') or []
    answer = item.get('answer')
    if not isinstance(answer, int) or not 0 <= answer < len(options):
        return False
    return options[answer] == (before.get('options') or [None])[before.get('answer')]


def already(item, after):
    if (normalise(item.get('prompt')) != normalise(after.get('prompt'))
            or not same_options(item, after.get('options') or [])
            or (item.get('options') or [None])[item.get('answer')] != after['options'][after['answer']]):
        return False
    why = item.get('why')
    if isinstance(why, list):      # deep and case cards: the correct slot must carry the explanation
        return why[item['answer']] == after['explanation']
    return True


def write(slot, after):
    item = slot['item']
    item['prompt'] = after['prompt']
    item['options'] = list(after['options'])
    item['answer'] = after['answer']
    if slot['kind'] == 'card':
        item['explanation'] = after['explanation']
    elif slot['kind'] == 'assertion':
        item['why'] = after['explanation']
    else:
        why = after.get('why')
        if not why:
            keep = {option: item.get('why', [])[i] for i, option in enumerate(item.get('options') or [])
                    if i < len(item.get('why') or []) and option in after['options']}
            why = [after['explanation'] if i == after['answer'] else keep.get(option, '')
                   for i, option in enumerate(after['options'])]
        if len(why) != len(after['options']):
            raise SystemExit(f'after.why must have one line per option: {after["prompt"]!r}')
        why = [after['explanation'] if i == after['answer'] else (line or '') for i, line in enumerate(why)]
        item['why'] = list(why)
    path, data = slot['save']
    json.dump(data, open(path, 'w'), indent=1, ensure_ascii=False)


def holds_after(item, after):
    return (normalise(item.get('prompt')) == normalise(after.get('prompt'))
            and same_options(item, after.get('options') or [])
            and (item.get('options') or [None])[item.get('answer')] == after['options'][after['answer']])


def apply_fix(book, record, dry):
    qid = record['id']
    slots = locate(book, qid)
    if not slots:
        return 'missing', f'{qid}: no source question with this id in work/{book}'
    if all(already(slot['item'], record['after']) for slot in slots):
        return 'already', f'{qid}: {record["lesson"]}'
    # Either the critic's text is still there, or an earlier run already wrote the question and left only
    # the per-option feedback to fill in. A source holding neither is somebody else's edit: refuse it.
    if not all(holds_after(slot['item'], record['after']) or matches(slot['item'], record['before'])
               for slot in slots):
        bad = next(slot for slot in slots
                   if not (holds_after(slot['item'], record['after']) or matches(slot['item'], record['before'])))
        return 'mismatch', (f'{qid}: {os.path.relpath(bad["save"][0], ROOT)} does not hold the text '
                            f'the critic saw; refusing to overwrite')
    if not dry:
        for slot in slots:
            write(slot, record['after'])
    return 'applied', f'{qid}: {record["lesson"]} ({len(slots)} source)'


def books_with_fixes():
    if not os.path.isdir(FIXES):
        return []
    return sorted(name for name in os.listdir(FIXES) if os.path.isdir(os.path.join(FIXES, name)))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('book', nargs='?')
    parser.add_argument('--all', action='store_true')
    parser.add_argument('--dry', action='store_true')
    args = parser.parse_args()
    if bool(args.book) == bool(args.all):
        parser.error('name one book, or --all')

    books = books_with_fixes() if args.all else [args.book]
    tally = {'applied': 0, 'already': 0, 'missing': 0, 'mismatch': 0}
    for book in books:
        records = [json.load(open(path)) for path in sorted(glob.glob(f'{FIXES}/{book}/*.json'))]
        if not records:
            continue
        print(f'{book}: {len(records)} fix(es)')
        for record in records:
            state, detail = apply_fix(book, record, args.dry)
            tally[state] += 1
            print(f'  {state:8} {detail}')
    verb = 'would apply' if args.dry else 'applied'
    print(f'{verb} {tally["applied"]}, already in place {tally["already"]}, '
          f'missing {tally["missing"]}, refused {tally["mismatch"]}')
    return 1 if tally['missing'] or tally['mismatch'] else 0


if __name__ == '__main__':
    sys.exit(main())
