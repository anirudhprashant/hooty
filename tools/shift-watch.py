#!/usr/bin/env python3
"""Silent unless today's Hooty shift went wrong.

The shift is three agent sessions at 09:00, 10:00 and 11:00 IST that take one item each from the
playbook queue, publish, and look at the result. This script is the part that notices when they did
not, because a cron job that silently fails is worse than no cron job at all: the site stays up, the
board looks fine, and nothing improves for a week.

It reads Hermes' own execution ledger (truth about whether a run happened and how it ended), the
published site, the disk, and the repo lock. It prints nothing when everything is in order, so the
cron delivers no message on a good day.

Run by hand any time:  python3 tools/shift-watch.py --verbose
"""
import datetime as dt
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import urllib.request
from zoneinfo import ZoneInfo

IST = ZoneInfo('Asia/Kolkata')
UTC = ZoneInfo('UTC')
# The team: lane -> (job id, the hour it starts, IST). Each is a separate cron session.
JOBS = {
    'design':    ('bef7b64d4018', 9),
    'teach':     ('9c70c69f3991', 9),
    'verify':    ('d5fbe248bac5', 10),   # starts at 10:30
    'integrate': ('5d42a68983a6', 11),
}
LANES = ('design', 'teach')          # branches that must be merged into main by the integrator
DB = '/home/ubuntu/.hermes/cron/executions.db'
REPO = '/home/ubuntu/agent-workspace/hooty-build'
SITE = 'https://hooty.org/'
VERBOSE = '--verbose' in sys.argv


def say(line, problems):
    if VERBOSE:
        print(line)
    else:
        problems.append(line)


def main():
    now = dt.datetime.now(IST)
    today = now.date()
    problems = []

    # A run that started before 12:30 IST belongs to today's shift; the window is generous at the end
    # so the 11:00 session, which may hand over to a publish, is not counted missing while it works.
    lo = dt.datetime.combine(today, dt.time(9, 0), IST).astimezone(UTC).isoformat()
    hi = dt.datetime.combine(today, dt.time(12, 40), IST).astimezone(UTC).isoformat()

    runs = []
    try:
        con = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
        runs = con.execute(
            'select job_id, status, started_at, finished_at, error from executions '
            'where started_at >= ? and started_at <= ? order by started_at', (lo, hi)).fetchall()
        con.close()
    except Exception as e:                                    # a broken ledger is itself a finding
        problems.append(f'could not read the cron ledger: {e}')

    seen = {lane: [] for lane in JOBS}
    for job_id, status, started_at, _finished, error in runs:
        lane = next((l for l, (jid, _h) in JOBS.items() if jid == job_id), None)
        if lane is None:
            continue
        seen[lane].append(status)
        if status not in ('completed', 'running'):
            detail = (error or '').strip().splitlines()[:2]
            problems.append(f'{lane} session ended {status}' + (f': {" / ".join(detail)}' if detail else ''))

    # Only complain about a lane that never started once its hour is safely over.
    for lane, (_jid, hour) in JOBS.items():
        if now.hour > hour or (now.hour == hour and now.minute > 45):
            if not seen[lane]:
                problems.append(f'{lane} session never started today')

    # A lane that finished but whose commits never reached main means the integrator missed them.
    if now.hour >= 12:
        for lane in LANES:
            try:
                ahead = subprocess.run(['git', '-C', REPO, 'rev-list', '--count', f'main..shift/{lane}'],
                                       capture_output=True, text=True).stdout.strip()
                if ahead.isdigit() and int(ahead) > 0:
                    problems.append(f'{lane} lane has {ahead} commits that never reached main')
            except Exception:
                pass

    # The site itself: up, and still serving the real app rather than an error page.
    try:
        # Cloudflare answers 403 to a bare urllib user agent, so ask the way a browser does.
        req = urllib.request.Request(SITE, headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
                                                                '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'})
        with urllib.request.urlopen(req, timeout=20) as r:
            body = r.read(4000).decode('utf-8', 'ignore')
        if r.status != 200:
            problems.append(f'hooty.org answered {r.status}')
        elif 'hooty' not in body.lower():
            problems.append('hooty.org answered 200 but the page does not look like the app')
    except Exception as e:
        problems.append(f'hooty.org is not reachable: {e}')

    # Disk: publishing writes audio and screenshots, and this box has been close to full all month.
    total, used, _free = shutil.disk_usage('/')
    pct = used * 100 // total
    if pct >= 92:
        problems.append(f'disk {pct}% full')

    # A lock left behind by a dead session would block every later shift, silently.
    try:
        active = subprocess.run(['systemctl', '--user', 'is-active', 'hooty-ella-lock'],
                                capture_output=True, text=True).stdout.strip()
        if active == 'active':
            ps = subprocess.run(['ps', '-eo', 'args'], capture_output=True, text=True).stdout
            working = any(marker in ps for marker in ('tools/publish.py', 'opencode run', 'assemble-pack.py'))
            if not working:
                subprocess.run(['systemctl', '--user', 'stop', 'hooty-ella-lock'], capture_output=True)
                problems.append('a stale repo lock was held with nothing working; released it')
    except Exception as e:
        problems.append(f'could not check the repo lock: {e}')

    # Uncommitted work in the repo means a session ended mid-change.
    try:
        st = subprocess.run(['git', '-C', REPO, 'status', '--porcelain', '--untracked-files=no'],
                            capture_output=True, text=True).stdout.strip()
        if st:
            names = ', '.join(line.split()[-1] for line in st.splitlines()[:4])
            problems.append(f'uncommitted changes left in the repo: {names}')
    except Exception:
        pass

    # Commits that never reached GitHub are work nobody else has, and the box is the only copy.
    try:
        ahead = subprocess.run(['git', '-C', REPO, 'rev-list', '--count', 'origin/main..HEAD'],
                               capture_output=True, text=True).stdout.strip()
        if ahead.isdigit() and int(ahead) > 2:
            problems.append(f'{ahead} commits have not been pushed to GitHub')
    except Exception:
        pass

    # The teaching numbers must never get worse. The baseline is written the first time this runs and only
    # moves down, deliberately: a session that improves it is expected to save the better number.
    try:
        audit = subprocess.run(['node', f'{REPO}/tools/lesson-audit.mjs', '--json', '/tmp/hooty-audit-watch.json'],
                               capture_output=True, text=True, cwd=REPO, timeout=900)
        if audit.returncode == 0:
            data = json.load(open('/tmp/hooty-audit-watch.json'))
            counts = {}
            for row in data.get('rows', []):
                for flag in row.get('flags', []):
                    counts[flag] = counts.get(flag, 0) + 1
            total = sum(1 for row in data.get('rows', []) if row.get('flags'))
            base_path = f'{REPO}/work/qa/audit-baseline.json'
            if not os.path.exists(base_path):
                json.dump({'total': total, 'counts': counts, 'set_at': dt.datetime.now(IST).isoformat(timespec='seconds')},
                          open(base_path, 'w'), indent=1, sort_keys=True)
            else:
                base = json.load(open(base_path))
                worse = {k: (counts.get(k, 0), v) for k, v in base.get('counts', {}).items() if counts.get(k, 0) > v}
                if total > base.get('total', 0):
                    problems.append(f'teaching audit got worse: {total} flagged lessons, baseline {base["total"]}'
                                    + (f' ({", ".join(f"{k} {a}/{b}" for k, (a, b) in list(worse.items())[:3])})' if worse else ''))
    except Exception as e:
        problems.append(f'could not run the teaching audit: {e}')

    if VERBOSE:
        summary = ', '.join(f'{lane} {len(seen[lane])}' for lane in JOBS)
        print(f'runs today: {len(runs)} ({summary}); problems: {len(problems)}')
    for line in problems:
        print(f'Hooty shift: {line}')


if __name__ == '__main__':
    main()
