#!/usr/bin/env python3
"""What the Hooty team spent today, in tokens. Information, not a limit.

Tokens are NOT the budget here. Anirudh's instruction, 27 Nov: "I don't care if tokens go higher,
quality is what I care about." So this meter is information, not rationing: it exists so a session
that has gone into a loop is visible, not so anyone spends less on looking, reading or redoing bad
work. Hermes records every session in ~/.hermes/state.db (input, output, cache-read, API calls).

  python3 tools/token-meter.py            # today, Hooty sessions only, human lines
  python3 tools/token-meter.py --all      # every session today
  python3 tools/token-meter.py --days 7   # a week's daily totals

Exit code is 0 even when over budget: a non-zero exit turns a warning into a cron failure, and this
script's job is to say a number, not to break the schedule.
"""
import datetime as dt
import os
import sqlite3
import sys
from zoneinfo import ZoneInfo

IST = ZoneInfo('Asia/Kolkata')
DB = '/home/ubuntu/.hermes/state.db'
# Runaway guards, not budgets: a session this large has stopped working and started spinning.
RUNWAY_SESSION = int(os.environ.get('HOOTY_RUNAWAY_SESSION', 4_000_000))
RUNWAY_DAY = int(os.environ.get('HOOTY_RUNAWAY_DAY', 15_000_000))
RUNWAY_CALLS = int(os.environ.get('HOOTY_RUNAWAY_CALLS', 400))

ARGS = sys.argv[1:]
SHOW_ALL = '--all' in ARGS
DAYS = 1
if '--days' in ARGS:
    try:
        DAYS = max(1, int(ARGS[ARGS.index('--days') + 1]))
    except (IndexError, ValueError):
        DAYS = 1


def sessions_between(lo, hi):
    con = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
    rows = con.execute(
        'select title, model, input_tokens, output_tokens, cache_read_tokens, api_call_count, '
        'cwd, source, started_at, ended_at from sessions where started_at >= ? and started_at < ? '
        'order by started_at', (lo, hi)).fetchall()
    con.close()
    return rows


def is_hooty(row):
    title, _model, _i, _o, _c, _a, cwd, _src, _st, _en = row
    if cwd and 'hooty' in str(cwd):
        return True
    return bool(title) and 'hooty' in str(title).lower()


def human(n):
    if n >= 1_000_000:
        return f'{n / 1_000_000:.2f}M'
    if n >= 1_000:
        return f'{n / 1_000:.0f}k'
    return str(n)


def day_bounds(day):
    lo = dt.datetime.combine(day, dt.time(0, 0), IST)
    return lo.timestamp(), (lo + dt.timedelta(days=1)).timestamp()


def main():
    today = dt.datetime.now(IST).date()
    problems = []

    if DAYS > 1:
        print(f'Hooty tokens, last {DAYS} days (input+output, cache excluded):')
        for back in range(DAYS - 1, -1, -1):
            day = today - dt.timedelta(days=back)
            lo, hi = day_bounds(day)
            rows = [r for r in sessions_between(lo, hi) if is_hooty(r)]
            total = sum((r[2] or 0) + (r[3] or 0) for r in rows)
            print(f'  {day}  {len(rows):>2} sessions  {human(total):>7}'
                  + ('  <- looks stuck' if total > RUNWAY_DAY else ''))
        return

    lo, hi = day_bounds(today)
    rows = sessions_between(lo, hi)
    if not SHOW_ALL:
        rows = [r for r in rows if is_hooty(r)]

    if not rows:
        print(f'No Hooty sessions recorded today ({today}). Nothing was spent.')
        return

    tin = tout = tcache = 0
    print(f'Hooty sessions today ({today}, IST):')
    for title, model, i, o, cache, api, cwd, source, started_at, ended_at in rows:
        when = dt.datetime.fromtimestamp(started_at, IST).strftime('%H:%M')
        span = ''
        if ended_at:
            span = f' {(ended_at - started_at) / 60:.0f}m'
        used = (i or 0) + (o or 0)
        flag = '  <- looks stuck' if used > RUNWAY_SESSION or (api or 0) > RUNWAY_CALLS else ''
        label = (title or 'untitled').split(' · ')[0][:38]
        print(f'  {when}{span:>5}  {label:38}  in {human(i or 0):>6}  out {human(o or 0):>5}'
              f'  cache {human(cache or 0):>6}  {api or 0:>3} calls{flag}')
        tin += i or 0
        tout += o or 0
        tcache += cache or 0
        if used > RUNWAY_SESSION or (api or 0) > RUNWAY_CALLS:
            problems.append(f'a session may be looping: {human(used)} tokens, {api or 0} calls ({label})')

    total = tin + tout
    print(f'  total: {human(tin)} in, {human(tout)} out = {human(total)} tokens (cache reads {human(tcache)})')
    if total > RUNWAY_DAY:
        problems.append(f'the day is at {human(total)} tokens, which usually means a loop somewhere')
    for line in problems:
        print(f'Hooty tokens: {line}')


if __name__ == '__main__':
    main()
