#!/usr/bin/env python3
"""Refuse to publish a book that quietly lost its contents.

`tools/assemble-pack.py` skips a book it cannot build and publish keeps the last good copy live, which is
the right call for a half-written chapter — but it means an empty or half-empty build can go unnoticed for
as long as nobody opens that book. A lost `work/` symlink, a half-finished merge or a crashed generator all
show up the same way: fewer chapters or lessons than the last published build.

  python3 tools/pack-counts.py --check    # compare the built packs with the last published counts
  python3 tools/pack-counts.py --update   # after a clean publish, remember what went live

Chapters and lessons may only go up. A book that was deliberately removed is removed from the index by
publish's own "no finished chapter yet" rule, and this tool reads the index, so that case stays quiet.
"""
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PUB = f'{ROOT}/public'
BASELINE = f'{ROOT}/work/qa/pack-counts.json'


def measure():
    counts = {}
    for path in sorted(glob.glob(f'{PUB}/content/packs/*/pack.json')):
        pack = json.load(open(path))
        chapters = lessons = activities = 0
        for unit in pack.get('units') or []:
            for chapter in unit.get('chapters') or []:
                chapters += 1
                for lesson in chapter.get('lessons') or []:
                    lessons += 1
                    activities += len(lesson.get('activities') or [])
        counts[pack.get('id') or os.path.basename(os.path.dirname(path))] = {
            'chapters': chapters, 'lessons': lessons, 'activities': activities}
    return counts


def check():
    counts = measure()
    if not os.path.exists(BASELINE):
        print(f'pack counts: no baseline yet, {sum(c["lessons"] for c in counts.values())} lessons in '
              f'{len(counts)} books')
        return 0
    base = json.load(open(BASELINE)).get('books', {})
    losses = []
    for book, before in base.items():
        now = counts.get(book)
        if not now:
            losses.append(f'{book}: gone from this build ({before["lessons"]} lessons before)')
            continue
        if now['chapters'] < before['chapters']:
            losses.append(f'{book}: {now["chapters"]} chapters, was {before["chapters"]}')
        elif now['lessons'] < before['lessons']:
            losses.append(f'{book}: {now["lessons"]} lessons, was {before["lessons"]}')
    if losses:
        print('books lost content since the last publish:')
        for line in losses[:12]:
            print('  ' + line)
        return 1
    total = sum(c['lessons'] for c in counts.values())
    print(f'pack counts: {len(counts)} books, {total} lessons, none smaller than the last publish')
    return 0


def update():
    counts = measure()
    os.makedirs(os.path.dirname(BASELINE), exist_ok=True)
    json.dump({'books': counts}, open(BASELINE, 'w'), indent=1, sort_keys=True)
    print(f'pack counts: baseline updated, {len(counts)} books, '
          f'{sum(c["lessons"] for c in counts.values())} lessons')
    return 0


if __name__ == '__main__':
    if '--update' in sys.argv:
        sys.exit(update())
    sys.exit(check())
