#!/usr/bin/env python3
"""One list of every real defect, with the evidence that closed it.

The prose reports said "fixed" and the next report said "still broken", because nothing tied a defect to
evidence. This file is that tie: a defect is `open` until someone fixes it and writes down what they
changed, and `verified` only when somebody looked at the live site and saw it fixed. `open` items are what
the verify lane re-tests every pass, and what the watchdog ages out.

  python3 tools/defects.py add --title "..." --where "class6-sst/ch2-l1 step 7" --kind design --found-by verify
  python3 tools/defects.py list                      # open, oldest first
  python3 tools/defects.py list --all
  python3 tools/defects.py fix 12 --commit abc1234 --evidence "text gate 0, card checked at 390"
  python3 tools/defects.py verify 12 --evidence "hooty.org build 92216009, ch2 l1 step 7, all four meanings complete"
  python3 tools/defects.py reopen 12 --why "live still shows the ellipsis on hindi-g2 ch7 l1"
  python3 tools/defects.py stats

Every state change appends a line to work/qa/defects.log, so the history of a defect survives its status.
"""
import argparse
import datetime as dt
import json
import os
import sys
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PATH = f'{ROOT}/work/qa/defects.json'
LOG = f'{ROOT}/work/qa/defects.log'
IST = ZoneInfo('Asia/Kolkata')
KINDS = ('design', 'teaching', 'text', 'data', 'service')
STATUSES = ('open', 'fixed', 'verified')


def now():
    return dt.datetime.now(IST).strftime('%Y-%m-%d %H:%M')


def load():
    if not os.path.exists(PATH):
        return {'next': 1, 'items': []}
    return json.load(open(PATH))


def save(data):
    os.makedirs(os.path.dirname(PATH), exist_ok=True)
    json.dump(data, open(PATH, 'w'), indent=1, ensure_ascii=False)


def log(line):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    open(LOG, 'a').write(f'{now()} {line}\n')


def find(data, defect_id):
    for item in data['items']:
        if item['id'] == defect_id:
            return item
    sys.exit(f'no defect {defect_id}')


def age_days(item):
    try:
        stamp = dt.datetime.strptime(item['found_at'], '%Y-%m-%d %H:%M').replace(tzinfo=IST)
    except Exception:
        return 0
    return (dt.datetime.now(IST) - stamp).total_seconds() / 86400


def cmd_add(args):
    data = load()
    duplicate = [i for i in data['items']
                 if i['status'] != 'verified' and i['title'].strip().lower() == args.title.strip().lower()]
    if duplicate:
        print(f'already on the list as #{duplicate[0]["id"]} ({duplicate[0]["status"]}): {duplicate[0]["title"]}')
        return 0
    item = {'id': data['next'], 'title': args.title, 'where': args.where or '', 'kind': args.kind,
            'found_by': args.found_by, 'found_at': now(), 'status': 'open',
            'evidence': args.evidence or '', 'history': []}
    data['items'].append(item)
    data['next'] += 1
    save(data)
    log(f'add #{item["id"]} [{item["kind"]}] {item["title"]} @ {item["where"]}')
    print(f'#{item["id"]} open: {item["title"]}')
    return 0


def cmd_list(args):
    data = load()
    items = [i for i in data['items'] if args.all or (i['status'] == 'open' if args.open else i['status'] != 'verified')]
    if args.kind:
        items = [i for i in items if i['kind'] == args.kind]
    if not items:
        print('nothing on the list')
        return 0
    for item in sorted(items, key=lambda i: i['found_at']):
        days = age_days(item)
        print(f'#{item["id"]:>3} {item["status"]:8} {days:5.1f}d  [{item["kind"]}] {item["title"][:70]}'
              + (f'  @ {item["where"]}' if item['where'] else ''))
    return 0


def cmd_move(args, to, why_field=None):
    data = load()
    item = find(data, args.id)
    if to == 'fixed' and item['status'] == 'verified':
        sys.exit(f'#{item["id"]} is already verified; reopen it instead of fixing it again')
    item['status'] = to
    stamp = now()
    if to == 'fixed':
        item['fixed_at'], item['fix_commit'] = stamp, getattr(args, 'commit', '') or ''
        item['fix_evidence'] = getattr(args, 'evidence', '') or ''
    else:
        item['verified_at'] = stamp
        item['verify_evidence'] = getattr(args, 'evidence', '') or ''
        if to == 'open':
            item['reopened_why'] = getattr(args, 'why', '') or ''
    item.setdefault('history', []).append({'at': stamp, 'to': to, 'why': getattr(args, 'why', '') or '',
                                           'evidence': getattr(args, 'evidence', '') or ''})
    save(data)
    log(f'{to} #{item["id"]} {item["title"]}')
    print(f'#{item["id"]} {to}: {item["title"]}')
    return 0


def cmd_stats(args):
    data = load()
    counts = {s: 0 for s in STATUSES}
    aged = []
    for item in data['items']:
        counts[item['status']] = counts.get(item['status'], 0) + 1
        if item['status'] == 'open' and age_days(item) > args.max_age:
            aged.append(item)
    print(f'open {counts["open"]} · fixed {counts["fixed"]} · verified {counts["verified"]}')
    for item in aged:
        print(f'  #{item["id"]} open {age_days(item):.0f} days: {item["title"][:70]}')
    return 1 if aged else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='cmd', required=True)

    p = sub.add_parser('add')
    p.add_argument('--title', required=True)
    p.add_argument('--where', default='')
    p.add_argument('--kind', choices=KINDS, default='teaching')
    p.add_argument('--found-by', default='verify')
    p.add_argument('--evidence', default='')
    p.set_defaults(func=cmd_add)

    p = sub.add_parser('list')
    p.add_argument('--all', action='store_true')
    p.add_argument('--open', action='store_true')
    p.add_argument('--kind', choices=KINDS)
    p.set_defaults(func=cmd_list)

    p = sub.add_parser('fix')
    p.add_argument('id', type=int)
    p.add_argument('--commit', default='')
    p.add_argument('--evidence', default='')
    p.set_defaults(func=lambda a: cmd_move(a, 'fixed'))

    p = sub.add_parser('verify')
    p.add_argument('id', type=int)
    p.add_argument('--evidence', required=True)
    p.set_defaults(func=lambda a: cmd_move(a, 'verified'))

    p = sub.add_parser('reopen')
    p.add_argument('id', type=int)
    p.add_argument('--why', default='')
    p.set_defaults(func=lambda a: cmd_move(a, 'open'))

    p = sub.add_parser('stats')
    p.add_argument('--max-age', type=float, default=3.0, help='days before an open defect is called old')
    p.set_defaults(func=cmd_stats)

    args = parser.parse_args()
    sys.exit(args.func(args))


if __name__ == '__main__':
    main()
