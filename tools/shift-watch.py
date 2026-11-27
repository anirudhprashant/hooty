#!/usr/bin/env python3
"""Silent unless a Hooty lane has stopped working, or the product has regressed.

The team runs all day on rolling passes rather than one burst: design and teach build on their own
branches, verify looks at the live site, fix repairs what verify found, and integrate merges and
publishes. Nothing human is watching, so the failure that matters is silence: a lane that quietly
stopped running, a publish that never happened, a site that went down, a number that got worse.

This prints nothing when everything is healthy, so its cron delivers nothing on a good pass. Run it by
hand any time with --verbose to see what it looked at.
"""
import datetime as dt
import glob
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.request
from zoneinfo import ZoneInfo

IST = ZoneInfo('Asia/Kolkata')
DB = '/home/ubuntu/.hermes/cron/executions.db'
REPO = '/home/ubuntu/agent-workspace/hooty-build'
SITE = 'https://hooty.org/'
VERBOSE = '--verbose' in sys.argv

# lane -> (job id, hours between passes). The check is staleness, not a clock time, so the schedule can
# change without this file going stale.
LANES = {
    'design':    ('bef7b64d4018', 6),
    'teach':     ('9c70c69f3991', 6),
    'verify':    ('d5fbe248bac5', 6),
    'fix':       ('49f1cfb63689', 6),
    'integrate': ('5d42a68983a6', 6),
}
STALE_HOURS = 8            # a pass is late past its cadence plus slack
BRANCHES = ('design', 'teach', 'fix')
WAITING_LIMIT = 12         # commits a branch may hold before the integrator is clearly not publishing


def main():
    now = dt.datetime.now(IST)
    problems = []

    # When each job was created, so a brand-new lane is not reported as broken before its first slot.
    job_created = {}
    try:
        raw = json.load(open('/home/ubuntu/.hermes/cron/jobs.json'))
        for job in (raw if isinstance(raw, list) else raw.get('jobs', [])):
            stamp = job.get('created_at')
            if stamp:
                job_created[job.get('id') or job.get('job_id')] = dt.datetime.fromisoformat(str(stamp)).astimezone(IST)
    except Exception:
        pass

    # --- lanes: did each one run lately, and did it end well? -------------------------------------
    con = None
    try:
        con = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
    except Exception as e:
        problems.append(f'could not open the cron ledger: {e}')

    if con is not None:
        for lane, (job_id, every) in LANES.items():
            row = con.execute('select status, started_at, error from executions where job_id = ? '
                              'order by started_at desc limit 1', (job_id,)).fetchone()
            if not row:
                # A lane added in the last ten hours has simply not had its first slot yet; complaining
                # would teach Anirudh to ignore this watchdog, which is worse than staying quiet.
                created = job_created.get(job_id)
                if created and (now - created).total_seconds() < 10 * 3600:
                    continue
                problems.append(f'{lane} lane has never run')
                continue
            status, started_at, error = row
            try:
                started = (dt.datetime.fromtimestamp(started_at, IST) if isinstance(started_at, (int, float))
                           else dt.datetime.fromisoformat(str(started_at)).astimezone(IST))
            except Exception:
                continue
            age = (now - started).total_seconds() / 3600
            if status not in ('completed', 'running'):
                detail = (error or '').strip().splitlines()[:2]
                problems.append(f'{lane} lane last pass ended {status} at {started:%H:%M}'
                                + (f': {" / ".join(detail)}' if detail else ''))
            elif age > max(STALE_HOURS, every + 2):
                problems.append(f'{lane} lane has not run for {age:.0f}h (last {started:%d %b %H:%M})')
            elif VERBOSE:
                print(f'  {lane:9} last pass {started:%d %b %H:%M} ({age:.1f}h ago), {status}')
        con.close()

    # --- the product itself -----------------------------------------------------------------------
    try:
        # Cloudflare answers 403 to a bare urllib user agent, so ask the way a browser does.
        request = urllib.request.Request(SITE, headers={
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/124.0 Safari/537.36'})
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read(4000).decode('utf-8', 'ignore')
        if response.status != 200:
            problems.append(f'hooty.org answered {response.status}')
        elif 'hooty' not in body.lower():
            problems.append('hooty.org answered 200 but the page does not look like the app')
    except Exception as e:
        problems.append(f'hooty.org is not reachable: {e}')

    # Is the site serving the build its sources produced? On 27 Nov it was not: the Hindi sources were repaired
    # at 14:23 and the site kept serving the 13:22 build, and nothing said a word for two hours.
    try:
        request = urllib.request.Request(f'{SITE.rstrip("/")}/content/build.json?x={os.urandom(3).hex()}',
                                         headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Firefox/126.0'})
        live = json.loads(urllib.request.urlopen(request, timeout=20).read())
        built_at = dt.datetime.strptime(live['built_at'], '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=dt.timezone.utc)
        newest, newest_file = 0, ''
        for path in glob.glob(f'{REPO}/work/*/ch*/**/*.json', recursive=True):
            if '/built/' in path:
                continue
            stamp = os.path.getmtime(path)
            if stamp > newest:
                newest, newest_file = stamp, path
        newest_dt = dt.datetime.fromtimestamp(newest, dt.timezone.utc)
        # A minute of slack: a build reads its sources, so the newest source is always slightly older than the build.
        if newest_dt > built_at + dt.timedelta(minutes=2):
            problems.append(f'hooty.org is serving a build from {built_at.astimezone(IST):%d %b %H:%M} but '
                            f'{os.path.relpath(newest_file, REPO)} changed at {newest_dt.astimezone(IST):%H:%M}; '
                            f'the source is ahead of the site')
        elif VERBOSE:
            print(f'  live build {built_at.astimezone(IST):%d %b %H:%M} ({live.get("commit")}), '
                  f'sources newest {newest_dt.astimezone(IST):%H:%M}')
    except urllib.error.HTTPError as e:
        if e.code == 404:
            if VERBOSE:
                print('  live build no stamp yet (publish writes public/content/build.json)')
        else:
            problems.append(f'could not read the live build stamp: {e}')
    except Exception as e:
        problems.append(f'could not read the live build stamp: {e}')

    # Disk: publishing writes audio and screenshots, and this box has been close to full all month.
    total_bytes, used_bytes, _free = shutil.disk_usage('/')
    pct = used_bytes * 100 // total_bytes
    if pct >= 92:
        problems.append(f'disk {pct}% full')

    # --- a lock or a branch left behind -----------------------------------------------------------
    try:
        active = subprocess.run(['systemctl', '--user', 'is-active', 'hooty-ella-lock'],
                                capture_output=True, text=True).stdout.strip()
        if active == 'active':
            ps = subprocess.run(['ps', '-eo', 'args'], capture_output=True, text=True).stdout
            working = any(marker in ps for marker in ('tools/publish.py', 'assemble-pack.py', 'play-lesson.mjs'))
            if not working:
                subprocess.run(['systemctl', '--user', 'stop', 'hooty-ella-lock'], capture_output=True)
                problems.append('a stale repo lock was held with nothing working; released it')
    except Exception as e:
        problems.append(f'could not check the repo lock: {e}')

    # A lane that fixed something and could not wake the publisher leaves this note.
    marker = f'{REPO}/work/qa/PUBLISH_NOW'
    if os.path.exists(marker):
        minutes = (now - dt.datetime.fromtimestamp(os.path.getmtime(marker), IST)).total_seconds() / 60
        if minutes > 30:
            try:
                why = open(marker).read().strip().splitlines()[0][:120]
            except OSError:
                why = ''
            problems.append(f'a lane asked for a publish {minutes:.0f} minutes ago and it has not happened'
                            + (f': {why}' if why else ''))

    try:
        for lane in BRANCHES:
            ahead = subprocess.run(['git', '-C', REPO, 'rev-list', '--count', f'main..shift/{lane}'],
                                   capture_output=True, text=True).stdout.strip()
            if ahead.isdigit() and int(ahead) > WAITING_LIMIT:
                problems.append(f'shift/{lane} has {ahead} commits waiting for a publish')
        st = subprocess.run(['git', '-C', REPO, 'status', '--porcelain', '--untracked-files=no'],
                            capture_output=True, text=True).stdout.strip()
        if st:
            names = ', '.join(line.split()[-1] for line in st.splitlines()[:4])
            problems.append(f'uncommitted changes in main: {names}')
        unpushed = subprocess.run(['git', '-C', REPO, 'rev-list', '--count', 'origin/main..HEAD'],
                                  capture_output=True, text=True).stdout.strip()
        if unpushed.isdigit() and int(unpushed) > 2:
            problems.append(f'{unpushed} commits have not been pushed to GitHub')
    except Exception:
        pass

    # --- measurements that must not get worse -----------------------------------------------------
    try:
        audit = subprocess.run(['node', f'{REPO}/tools/lesson-audit.mjs', '--json', '/tmp/hooty-audit-watch.json'],
                               capture_output=True, text=True, cwd=REPO, timeout=900)
        if audit.returncode == 0:
            data = json.load(open('/tmp/hooty-audit-watch.json'))
            counts = {}
            for row in data.get('rows', []):
                for flag in row.get('flags', []):
                    counts[flag] = counts.get(flag, 0) + 1
            flagged = sum(1 for row in data.get('rows', []) if row.get('flags'))
            base_path = f'{REPO}/work/qa/audit-baseline.json'
            if not os.path.exists(base_path):
                json.dump({'total': flagged, 'counts': counts,
                           'set_at': dt.datetime.now(IST).isoformat(timespec='seconds')},
                          open(base_path, 'w'), indent=1, sort_keys=True)
            else:
                base = json.load(open(base_path))
                if flagged > base.get('total', 0):
                    moved = {k: (counts.get(k, 0), v) for k, v in base.get('counts', {}).items()
                             if counts.get(k, 0) > v}
                    extra = ', '.join(f'{k} {a}/{b}' for k, (a, b) in list(moved.items())[:3])
                    problems.append(f'teaching audit got worse: {flagged} flagged, baseline {base["total"]}'
                                    + (f' ({extra})' if extra else ''))
    except Exception as e:
        problems.append(f'could not run the teaching audit: {e}')

    # Readable Devanagari is a quality promise, so it gets the same treatment as the teaching numbers. The
    # gate owns the comparison (and the checker's own self-test), so there is one place that decides.
    try:
        gate = subprocess.run([sys.executable, f'{REPO}/tools/text-gate.py'],
                              capture_output=True, text=True, cwd=REPO, timeout=300)
        line = (gate.stdout.strip().splitlines() or [''])[-1]
        if gate.returncode:
            problems.append('unreadable Devanagari: ' + '; '.join(gate.stdout.strip().splitlines()[:4]))
        elif VERBOSE:
            print(f'  hindi     {line}')
    except Exception as e:
        problems.append(f'could not run the text gate: {e}')

    if VERBOSE:
        print(f'problems: {len(problems)}')
    for line in problems:
        print(f'Hooty team: {line}')


if __name__ == '__main__':
    main()
