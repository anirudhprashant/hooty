#!/usr/bin/env python3
"""Fetch one NCERT book (every chapter PDF) and turn it into a course with tools/ingest-book.py.

  python3 tools/ingest-ncert.py 7 Science
  python3 tools/ingest-ncert.py 7                 # every subject of the class, one after another
  python3 tools/ingest-ncert.py --all             # every class and subject in tools/ncert-grades.json

Books and chapter counts come from tools/ncert-grades.json. A book already built is skipped; one that stopped part-way
is resumed. NCERT's certificate chain is incomplete, so the download does not verify it (the files are public textbooks and
are checked to be PDFs). The text stays in sources/<slug>/ (git-ignored) and only our own wording ships.
"""
import json, os, re, ssl, subprocess, sys, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
CATALOG = json.load(open(f'{HERE}/ncert-grades.json'))
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE
ORDER = ['Mathematics', 'Science', 'The World Around Us', 'Social Science', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Political Science', 'Economics', 'English', 'Hindi']
CLASSES = ['7', '8', '9', '10', '5', '4', '3', '2', '1']   # Classes 1 to 10 (6 is done outside this list)

def fetch(url, tries=4):
    for t in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'LumiLearningGame/1.0 (educational)'}), timeout=90, context=CTX) as r:
                d = r.read()
            if d[:4] == b'%PDF': return d
            raise ValueError('not a PDF')
        except Exception as e:
            if t == tries - 1: raise
            time.sleep(4 + 4 * t)

def slug_of(subject, grade): return re.sub(r'[^a-z0-9]+', '-', subject.lower()).strip('-') + f'-g{grade}'

def build(grade, subject):
    spec = CATALOG[str(grade)][subject]; slug = slug_of(subject, grade)
    # finished means the pipeline says so: a publish can create a partial pack.json while a book is still being built
    st = f'{ROOT}/work/{slug}/status.json'
    if os.path.exists(st) and json.load(open(st))['stages'].get('pack', {}).get('state') == 'done':
        print(f'{slug}: already built, skipping'); return True
    folder = f'{ROOT}/sources/{slug}-download'; os.makedirs(folder, exist_ok=True)
    for pi, (code, n) in enumerate(spec['parts'], 1):
        for ch in range(1, n + 1):
            out = f'{folder}/p{pi}-{ch:02d}.pdf'
            if os.path.exists(out) and os.path.getsize(out) > 2000: continue
            try: open(out, 'wb').write(fetch(f'https://ncert.nic.in/textbook/pdf/{code}{ch:02d}.pdf'))
            except Exception as e: print(f'  {code}{ch:02d}: could not fetch ({str(e)[:60]})')
    got = len([f for f in os.listdir(folder) if f.endswith('.pdf')])
    print(f'{slug}: {got} chapter PDFs', flush=True)
    if got == 0: return False
    cmd = ['python3', f'{HERE}/ingest-book.py', folder, '--name', subject, '--grade', str(grade), '--slug', slug, '--no-audio']
    if spec.get('language'): cmd += ['--language', spec['language']]
    if spec.get('calc'): cmd.append('--calc')
    if os.path.exists(f'{ROOT}/work/{slug}/status.json'): cmd = ['python3', f'{HERE}/ingest-book.py', '--resume', slug, '--no-audio']
    return subprocess.run(cmd).returncode == 0

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    jobs = []
    if a[0] == '--all':
        # one catalogue run at a time, however many things start it
        import fcntl
        _lock = open(os.path.expanduser('~/.cache/lumi-ingest-all.lock'), 'w')
        try: fcntl.flock(_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError: sys.exit('a catalogue run is already going')
        jobs = [(g, s) for g in CLASSES if g in CATALOG for s in ORDER if s in CATALOG[g]]
    elif len(a) == 1: jobs = [(a[0], s) for s in ORDER if s in CATALOG[a[0]]]
    else: jobs = [(a[0], ' '.join(a[1:]))]
    for g, s in jobs:
        print(f'=== Class {g} {s}', flush=True)
        ok = build(g, s)
        print(f'=== Class {g} {s}: {"done" if ok else "FAILED (carry on)"}', flush=True)
        # each finished book goes live straight away
        if ok and a[0] == '--all': subprocess.run(['python3', f'{HERE}/publish.py'], cwd=ROOT, capture_output=True)
