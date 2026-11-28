#!/usr/bin/env python3
"""Bring the NCERT chapter PDFs back into sources/, through a connection that is not this server's.

ncert.nic.in refuses this box's IP, so the fetch has to happen somewhere else. This builds the whole job
from `tools/ncert-grades.json` (the same catalogue the ingest used: book code + chapter count per subject),
runs it over ssh on a machine that can reach NCERT, and pulls the PDFs back into
`sources/<slug>-download/p<part>-<chapter>.pdf`, which is exactly where `tools/ingest-ncert.py` expects them.

  python3 tools/fetch-sources.py --host latitude            # plan only, say what it would fetch
  python3 tools/fetch-sources.py --host latitude --run      # do it, then verify and tar a copy
  python3 tools/fetch-sources.py --local                    # fetch from this box over plain HTTP
  python3 tools/fetch-sources.py --verify                   # check what is already on this box

Nothing here touches work/ or publishes anything. A book whose PDFs are missing is not rebuilt: the packs
already on the site came from work/, which is intact.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tarfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CATALOG = json.load(open(f'{HERE}/ncert-grades.json'))
SOURCES = f'{ROOT}/sources'
REMOTE_DIR = '/tmp/hooty-sources'
BACKUP_DIR = os.path.expanduser('~/agent-workspace/hooty-env')
# HTTPS is refused from this box (connection never completes) but plain HTTP is not, so the fetch over the
# wire uses http:// and every file is checked for the PDF magic bytes before it is kept.
android = 'https' + '://ncert.nic.in/textbook/pdf/{code}{chapter:02d}.pdf'
PDF_URL = 'http://ncert.nic.in/textbook/pdf/{code}{chapter:02d}.pdf'


def slug_of(subject, grade):
    return re.sub(r'[^a-z0-9]+', '-', subject.lower()).strip('-') + f'-g{grade}'


def plan():
    """(slug, folder, [(url, local path)]) for every book in the catalogue."""
    books = []
    for grade, subjects in CATALOG.items():
        if not grade.isdigit():
            continue
        for subject, spec in subjects.items():
            slug = slug_of(subject, grade)
            folder = f'{SOURCES}/{slug}-download'
            wanted = []
            for part, (code, chapters) in enumerate(spec.get('parts', []), start=1):
                for chapter in range(1, chapters + 1):
                    wanted.append((PDF_URL.format(code=code, chapter=chapter),
                                   f'{folder}/p{part}-{chapter:02d}.pdf'))
            books.append((slug, folder, wanted))
    return books


def verify(verbose=True):
    missing, present, broken = [], 0, []
    for slug, folder, wanted in plan():
        for url, path in wanted:
            if not os.path.exists(path):
                missing.append(f'{slug}/{os.path.basename(path)}')
            elif os.path.getsize(path) < 20000:
                broken.append(f'{slug}/{os.path.basename(path)} ({os.path.getsize(path)} bytes)')
            else:
                with open(path, 'rb') as handle:
                    if handle.read(4) != b'%PDF':
                        broken.append(f'{slug}/{os.path.basename(path)} (not a PDF)')
                    else:
                        present += 1
    total = present + len(missing) + len(broken)
    if verbose:
        print(f'sources: {present}/{total} chapter PDFs present'
              + (f', {len(missing)} missing' if missing else '')
              + (f', {len(broken)} unusable' if broken else ''))
        for line in (broken + missing)[:8]:
            print('  ' + line)
    return present, total


def build_remote_script(books):
    lines = ['#!/bin/sh', 'set -u', f'cd {REMOTE_DIR} || exit 1']
    for slug, folder, wanted in books:
        lines.append(f'mkdir -p {slug}')
        for url, path in wanted:
            name = os.path.basename(path)
            lines.append(f'if [ ! -s {slug}/{name} ]; then '
                         f'curl -fsSL --retry 3 --max-time 120 -A "Mozilla/5.0" -o {slug}/{name} "{url}" '
                         f'|| rm -f {slug}/{name}; fi')
    lines.append(f'echo fetched $(find . -name "*.pdf" | wc -l) pdfs')
    return '\n'.join(lines) + '\n'


def run(host):
    books = plan()
    script = build_remote_script(books)
    local_script = '/tmp/hooty-fetch-sources.sh'
    open(local_script, 'w').write(script)
    print(f'{"book":22} {"pdfs":>5}  already here')
    for slug, folder, wanted in books:
        have = len([1 for _, path in wanted if os.path.exists(path) and os.path.getsize(path) > 20000])
        print(f'{slug:22} {len(wanted):>5}  {have}')
    print(f'total: {sum(len(b[2]) for b in books)} chapter PDFs across {len(books)} books')

    check = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', host, 'echo ok'],
                           capture_output=True, text=True)
    if check.returncode:
        sys.exit(f'cannot reach {host} over ssh ({check.stderr.strip()[:120]}). '
                 f'The catalogue above is the full job; rerun with --run once the machine is up.')

    reach = subprocess.run(['ssh', '-o', 'BatchMode=yes', host,
                            'curl -s -o /dev/null -w "%{http_code}" --max-time 15 '
                            '-A "Mozilla/5.0" https://ncert.nic.in/textbook/pdf/fegp101.pdf'],
                           capture_output=True, text=True)
    print(f'{host} reaches ncert.nic.in: HTTP {reach.stdout.strip() or "no answer"}')
    if reach.stdout.strip() not in ('200',):
        sys.exit('that machine cannot reach NCERT either; try another network')

    subprocess.run(['ssh', host, f'mkdir -p {REMOTE_DIR}'], check=True)
    subprocess.run(['scp', '-q', local_script, f'{host}:{REMOTE_DIR}/fetch.sh'], check=True)
    print('downloading on the remote side; this takes a while for ~1,500 files')
    subprocess.run(['ssh', host, f'sh {REMOTE_DIR}/fetch.sh'], check=False)

    for slug, folder, wanted in books:
        os.makedirs(folder, exist_ok=True)
        subprocess.run(['rsync', '-a', '--include=*/', '--include=*.pdf', '--exclude=*',
                        f'{host}:{REMOTE_DIR}/{slug}/', f'{folder}/'], check=False)

    present, total = verify()
    if present:
        stamp = subprocess.run(['date', '-u', '+%Y%m%d'], capture_output=True, text=True).stdout.strip()
        archive = f'{BACKUP_DIR}/sources-{stamp}.tar.gz'
        with tarfile.open(archive, 'w:gz') as tar:
            tar.add(SOURCES, arcname='sources')
        print(f'kept a copy at {archive} ({os.path.getsize(archive) // 1024} KB)')
    return 0 if present == total else 1


def fetch_local(workers=6):
    """Download every missing PDF from this box over plain HTTP, in parallel, and verify each one."""
    import concurrent.futures
    import urllib.request
    jobs = []
    for slug, folder, wanted in plan():
        os.makedirs(folder, exist_ok=True)
        for url, path in wanted:
            if not (os.path.exists(path) and os.path.getsize(path) > 20000):
                jobs.append((url, path))
    print(f'{len(jobs)} PDFs to fetch, {workers} at a time')

    def one(job):
        url, path = job
        for attempt in range(3):
            try:
                request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)'})
                with urllib.request.urlopen(request, timeout=90) as response:
                    body = response.read()
                if len(body) < 20000 or body[:4] != b'%PDF':
                    raise ValueError(f'not a PDF ({len(body)} bytes)')
                open(path, 'wb').write(body)
                return True, path, len(body)
            except Exception as e:
                if attempt == 2:
                    return False, path, str(e)[:80]
        return False, path, 'unknown'

    done = failed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        for ok, path, detail in pool.map(one, jobs):
            if ok:
                done += 1
                if done % 50 == 0:
                    print(f'  {done}/{len(jobs)} fetched', flush=True)
            else:
                failed += 1
                print(f'  FAILED {os.path.basename(path)}: {detail}', flush=True)
    print(f'fetched {done}, failed {failed}')
    present, total = verify()
    if present:
        stamp = subprocess.run(['date', '-u', '+%Y%m%d'], capture_output=True, text=True).stdout.strip()
        archive = f'{BACKUP_DIR}/sources-{stamp}.tar.gz'
        with tarfile.open(archive, 'w:gz') as tar:
            tar.add(SOURCES, arcname='sources')
        print(f'kept a copy at {archive} ({os.path.getsize(archive) // 1024} KB)')
    return 0 if present == total else 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', help='ssh host with a connection NCERT accepts')
    parser.add_argument('--run', action='store_true')
    parser.add_argument('--verify', action='store_true')
    parser.add_argument('--local', action='store_true', help='download from this box over plain HTTP')
    args = parser.parse_args()
    if args.local:
        sys.exit(fetch_local())
    if args.verify or not args.host:
        present, total = verify()
        sys.exit(0 if present == total else 1)
    if not args.run:
        books = plan()
        print(f'{len(books)} books, {sum(len(b[2]) for b in books)} chapter PDFs to fetch through {args.host}')
        present, total = verify(verbose=False)
        print(f'now on this box: {present}/{total}')
        return
    sys.exit(run(args.host))


if __name__ == '__main__':
    main()
