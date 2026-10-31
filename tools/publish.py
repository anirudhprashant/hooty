#!/usr/bin/env python3
"""Put Sparkle live: build every book, record any missing voice clips, stamp the service worker, upload, then check the
live site really serves everything. Stops without uploading if a pack does not validate.

  python3 tools/publish.py              # the whole thing
  python3 tools/publish.py --no-build   # just stamp, upload and check
  python3 tools/publish.py --no-audio   # build but do not record

SPARKLE_DEPLOY  rsync target   (set in tools/local.env)
SPARKLE_URL     live site      (set in tools/local.env)
"""
import glob, hashlib, json, os, random, re, subprocess, sys, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); PUB = f'{ROOT}/public'
sys.path.insert(0, HERE)
from subjects import SUBJECTS
# Where this copy deploys lives in tools/local.env (git-ignored): SPARKLE_DEPLOY=host:/path/ and SPARKLE_URL=https://...
if os.path.exists(f'{HERE}/local.env'):
    for line in open(f'{HERE}/local.env'):
        if '=' in line and not line.startswith('#'): k, v = line.strip().split('=', 1); os.environ.setdefault(k, v)
TARGET = os.environ.get('SPARKLE_DEPLOY', '')
URL = os.environ.get('SPARKLE_URL', '')
args = set(sys.argv[1:])
def say(*a): print(*a, flush=True)

def build():
    for key, s in SUBJECTS.items():
        if not os.path.isdir(f"{ROOT}/{s['work']}"): continue
        out = subprocess.run([sys.executable, f'{HERE}/assemble-pack.py'], cwd=ROOT, env={**os.environ, 'SPARKLE_SUBJECT': key}, capture_output=True, text=True)
        say(key, '|', (out.stdout.strip().splitlines() or [out.stderr[-200:]])[-1][:110])
        if out.returncode: sys.exit(f'{key}: build failed\n{out.stderr[-500:]}')
    for f in sorted(glob.glob(f'{PUB}/content/packs/*/pack.json')):
        v = subprocess.run(['node', f'{HERE}/validate-pack.mjs', f], capture_output=True, text=True)
        if v.returncode: sys.exit(f'{f} does not validate:\n{v.stdout[-600:]}')

def audio():
    venv = f'{ROOT}/.venv-audio'
    if not os.path.exists(venv + '/bin/edge-tts'):
        subprocess.run([sys.executable, '-m', 'venv', venv], check=True); subprocess.run([venv + '/bin/pip', '-q', 'install', 'edge-tts'], check=True)
    r = subprocess.run([venv + '/bin/python', f'{HERE}/make-audio.py'], cwd=ROOT, capture_output=True, text=True)
    say('audio |', (r.stdout.strip().splitlines() or [r.stderr[-200:]])[-1])

def thumbs():
    """A 240px copy of every lesson picture for cards, so a 96px thumbnail never costs a 250 KB download."""
    made = 0
    for f in glob.glob(f'{PUB}/content/packs/*/media/*.webp'):
        t = os.path.join(os.path.dirname(f), 'thumbs', os.path.basename(f))
        if os.path.exists(t) and os.path.getmtime(t) >= os.path.getmtime(f): continue
        os.makedirs(os.path.dirname(t), exist_ok=True)
        if subprocess.run(['magick', f, '-resize', '240x240>', '-quality', '68', t], capture_output=True).returncode == 0: made += 1
    print('thumbnails made:', made, flush=True)

def stamp():
    """The offline shell is every engine file, and the cache name is a hash of the code, so nobody bumps either by hand."""
    files = sorted(os.path.relpath(f, PUB) for p in ('engine/**/*.js', 'css/*.css') for f in glob.glob(f'{PUB}/{p}', recursive=True))
    # Preload every code module and the start-up data in one go: each trip through the tunnel costs about 200 ms, and
    # without this the browser finds them one trip at a time. The first book is the one a new visitor opens.
    page = open(f'{PUB}/index.html').read()
    hints = ''.join(f'<link rel="modulepreload" href="./{f}">' for f in files if f.endswith('.js'))
    data = ['themes/index.json', 'content/index.json'] + [f"themes/{t['id']}/theme.json" for t in json.load(open(f'{PUB}/themes/index.json'))['themes']]
    first = json.load(open(f'{PUB}/content/index.json'))['packs'][:1]
    data += [f"content/packs/{p['id']}/pack.json" for p in first]
    hints += ''.join(f'<link rel="preload" as="fetch" crossorigin="anonymous" href="./{f}">' for f in data)
    open(f'{PUB}/index.html', 'w').write(re.sub(r'<!--PRELOAD-->.*?<!--/PRELOAD-->', lambda m: f'<!--PRELOAD-->{hints}<!--/PRELOAD-->', page, count=1, flags=re.S))
    h = hashlib.sha1()
    for f in files + ['index.html']: h.update(open(f'{PUB}/{f}', 'rb').read())
    s = open(f'{PUB}/sw.js').read()
    shell = "const SHELL = [\n  './',\n  './index.html',\n  './manifest.webmanifest',\n" + ''.join(f"  './{f}',\n" for f in files) + "];"
    s = re.sub(r'const SHELL = \[.*?\];', lambda m: shell, s, count=1, flags=re.S)
    s = re.sub(r"const CACHE = '[^']*';", f"const CACHE = 'sparkle-{h.hexdigest()[:10]}';", s, count=1)
    open(f'{PUB}/sw.js', 'w').write(s)

def upload():
    r = subprocess.run(['rsync', '-a', '--exclude', 'work', '--exclude', 'sources', '--exclude', 'node_modules', '--exclude', '.venv-audio', '--exclude', '__pycache__', f'{ROOT}/', TARGET], capture_output=True, text=True)
    if r.returncode not in (0, 24): sys.exit('upload failed: ' + r.stderr[-300:])

def smoke():
    """Fetch what a child's browser would. Every picture of every book, the code, and a sample of voice clips."""
    def code(path):
        try:
            with urllib.request.urlopen(urllib.request.Request(URL + path, headers={'User-Agent': 'sparkle-publish'}), timeout=40) as r: return r.status
        except Exception as e: return getattr(e, 'code', 0)
    bad, n = [], 0
    idx = json.load(open(f'{PUB}/content/index.json'))
    paths = ['', 'sw.js', 'content/index.json', 'audio/manifest.json'] + [os.path.relpath(f, PUB) for f in glob.glob(f'{PUB}/engine/**/*.js', recursive=True)]
    for p in idx['packs']:
        base = f"content/packs/{p['id']}/"; paths.append(base + 'pack.json'); paths.append(base + 'glossary.json')
        d = json.load(open(f'{PUB}/{base}pack.json'))
        paths += sorted({base + l['topicScene'] for u in d['units'] for c in u['chapters'] for l in c['lessons'] + [c['boss']] if l.get('topicScene')})
    keys = json.load(open(f'{PUB}/audio/manifest.json'))['keys']
    paths += [f'audio/{k}.mp3' for k in random.sample(keys, min(25, len(keys)))]
    for p in paths:
        n += 1
        if code(p) != 200: bad.append(p)
    if bad: sys.exit(f'LIVE CHECK FAILED: {len(bad)} of {n} missing, e.g. {bad[:5]}')
    say(f'live check ok: {n} files fetched, {len(idx["packs"])} books')

if '--no-build' not in args:
    build()
    if '--no-audio' not in args: audio()
thumbs(); stamp(); upload(); smoke()

def push():
    """What just went live also goes to GitHub. A failed push never fails a publish."""
    git = lambda *a: subprocess.run(['git', *a], cwd=ROOT, capture_output=True, text=True)
    if not os.path.isdir(f'{ROOT}/.git') or not git('remote').stdout.strip(): return
    git('add', '-A')
    if git('diff', '--cached', '--quiet').returncode:
        git('commit', '-m', 'Publish: what is live now')
    r = git('push', '-q', 'origin', 'main')
    say('pushed to GitHub' if r.returncode == 0 else f'GitHub push failed: {r.stderr[:120]}')
push()
