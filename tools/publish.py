#!/usr/bin/env python3
"""Put Sparkle live: build every book, record any missing voice clips, stamp the service worker, upload, then check the
live site really serves everything. Stops without uploading if a pack does not validate.

  python3 tools/publish.py              # the whole thing
  python3 tools/publish.py --no-build   # just stamp, upload and check
  python3 tools/publish.py --no-audio   # build but do not record (the default: this server cannot reach the voice service)
  python3 tools/publish.py --audio      # also record missing clips, only on a home connection

SPARKLE_DEPLOY  rsync target   (set in tools/local.env)
SPARKLE_URL     live site      (set in tools/local.env)
"""
import shutil, glob, hashlib, json, os, random, re, subprocess, sys, time, urllib.request
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

# One publish at a time, enforced rather than checked. Two publishes race over the git index, over the same
# pack files and over the live upload, and the loser can leave a half-built tree on the site. The old note in
# LOOP.md asked a human to look at `ps` before publishing; a lock is the only version of that nobody forgets.
import fcntl
os.makedirs(f'{ROOT}/work/qa', exist_ok=True)
_publish_lock = open(f'{ROOT}/work/qa/.publish.lock', 'w')
try:
    fcntl.flock(_publish_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except OSError:
    say('another publish is running (work/qa/.publish.lock is held); not starting')
    sys.exit(3)

def build():
    for key, s in SUBJECTS.items():
        if not os.path.isdir(f"{ROOT}/{s['work']}"): continue
        out = subprocess.run([sys.executable, f'{HERE}/assemble-pack.py'], cwd=ROOT, env={**os.environ, 'SPARKLE_SUBJECT': key}, capture_output=True, text=True)
        say(key, '|', (out.stdout.strip().splitlines() or [out.stderr[-200:]])[-1][:110])
        if out.returncode:   # a book still being made can fail to assemble: the last good copy stays live
            say(f'{key}: not rebuilt this time (still being made?)', out.stderr[-120:].replace('\n', ' ')); continue
    # A book that has only just started has no finished chapter yet: keep it off the site until it has one,
    # instead of letting its empty pack stop every publish.
    idx_path = f'{PUB}/content/index.json'; idx = json.load(open(idx_path))
    for f in sorted(glob.glob(f'{PUB}/content/packs/*/pack.json')):
        pk = json.load(open(f))
        if not any(c for u in pk.get('units') or [] for c in u.get('chapters') or []):
            say(f"{pk.get('id', f)}: no finished chapter yet, left off the site")
            idx['packs'] = [x for x in idx['packs'] if x['id'] != pk.get('id')]
            shutil.rmtree(os.path.dirname(f), ignore_errors=True)
    json.dump(idx, open(idx_path, 'w'), indent=2, ensure_ascii=False)
    for f in sorted(glob.glob(f'{PUB}/content/packs/*/pack.json')):
        v = subprocess.run(['node', f'{HERE}/validate-pack.mjs', f], capture_output=True, text=True)
        if v.returncode: sys.exit(f'{f} does not validate:\n{v.stdout[-600:]}')

def pages():
    """The catalogue and the word bank are generated from the packs, so a search page never describes an old site.
    They are static files, so a failure here must not block a content fix: say it and keep the old pages."""
    r = subprocess.run([sys.executable, f'{HERE}/landing-pages.py'], cwd=ROOT, capture_output=True, text=True)
    lines = (r.stdout.strip() or r.stderr.strip()).splitlines()
    say('pages |', (lines[-1] if lines else 'done')[:150])
    if r.returncode:
        say('pages | failed, the last good catalogue stays live')

def audio():
    """Record any missing clip, when this machine can. Recording needs a home connection (Microsoft blocks the
    datacentre), so on oracle the honest answer is a one-line skip, not a traceback in the publish log."""
    venv = f'{ROOT}/.venv-audio'
    skip = venv + '/.no-edge-tts'
    if os.path.exists(skip) and time.time() - os.path.getmtime(skip) < 86400:
        say('audio | skipped (no edge-tts here; clips are recorded on the laptop)'); return
    def usable():
        try:
            return subprocess.run([venv + '/bin/python', '-c', 'import edge_tts'], capture_output=True, timeout=60).returncode == 0
        except Exception:
            return False
    if not usable():   # a console script can exist while the module does not: test the import, not the file
        try:
            subprocess.run([sys.executable, '-m', 'venv', venv], check=True, capture_output=True)
            subprocess.run([venv + '/bin/pip', '-q', 'install', 'edge-tts'], check=True, capture_output=True, timeout=240)
        except Exception:
            pass
        if not usable():
            open(skip, 'w').close()
            say('audio | skipped: edge-tts cannot be installed here, record on a home connection'); return
    r = subprocess.run([venv + '/bin/python', f'{HERE}/make-audio.py'], cwd=ROOT, capture_output=True, text=True)
    if r.returncode:
        why = (r.stderr.strip().splitlines() or ['no reason given'])[-1]
        say('audio | skipped:', why[:140]); return
    say('audio |', (r.stdout.strip().splitlines() or ['done'])[-1])

def thumbs():
    """A 240px copy of every lesson picture for cards, so a 96px thumbnail never costs a 250 KB download."""
    made = 0
    for f in glob.glob(f'{PUB}/content/packs/*/media/*.webp'):
        t = os.path.join(os.path.dirname(f), 'thumbs', os.path.basename(f))
        if os.path.exists(t) and os.path.getmtime(t) >= os.path.getmtime(f): continue
        os.makedirs(os.path.dirname(t), exist_ok=True)
        if subprocess.run(['convert', f, '-resize', '240x240>', '-quality', '68', t], capture_output=True).returncode == 0: made += 1
    print('thumbnails made:', made, flush=True)

def stamp():
    """The offline shell is every engine file, and the cache name is a hash of the code, so nobody bumps either by hand."""
    files = sorted(os.path.relpath(f, PUB) for p in ('engine/**/*.js', 'css/*.css', 'js/boot.js') for f in glob.glob(f'{PUB}/{p}', recursive=True))
    # explorables.js holds all 129 simulations and is 43% of the engine's bytes, but only 41% of chapters ever show one.
    # Leaving it out of this list keeps it out of the preload hints and out of the offline shell, so a child who never
    # opens a simulation never downloads it; engine/core/widgets.js fetches it on demand, and the worker's own fetch
    # handler caches it the first time a lesson needs it, so offline lessons still work once seen.
    files = [f for f in files if not f.endswith('core/explorables.js')]
    # Preload every code module and the start-up data in one go: each trip through the tunnel costs about 200 ms, and
    # without this the browser finds them one trip at a time. The first book is the one a new visitor opens.
    page = open(f'{PUB}/index.html').read()
    hints = ''.join(f'<link rel="modulepreload" href="./{f}">' for f in files if f.endswith('.js'))
    # The book is NOT preloaded any more. It used to preload index.json's first pack (Class 6 Social Science)
    # for every visitor, which is a 1.7 MB file, about 290 KB over the wire, and wasted on anyone opening
    # another class. loadContent fetches the index and then only the book the child is actually in.
    # Structured data for the app page: who runs it, what it is, and that it costs nothing. Written here so the
    # book count stays true without anyone editing HTML by hand.
    try:
        idx_all = json.load(open(f'{PUB}/content/index.json'))
        ld = {
            '@context': 'https://schema.org',
            '@graph': [
                {'@type': 'Organization', 'name': 'Hooty', 'url': URL, 'logo': f'{URL.rstrip("/")}/assets/icons/icon-192.png?v=blob1'},
                {'@type': 'WebSite', 'name': 'Hooty', 'url': URL, 'inLanguage': ['en', 'hi'],
                 'description': 'Your school books, turned into an adventure. A free learning game built from the NCERT textbooks.'},
                {'@type': 'SoftwareApplication', 'name': 'Hooty', 'url': URL, 'applicationCategory': 'EducationalApplication',
                 'operatingSystem': 'Android, iOS, Windows, macOS, Linux', 'isAccessibleForFree': True,
                 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'INR'},
                 'description': f"{len(idx_all['packs'])} NCERT school books turned into short lessons a child can play, free for every child, no sign-up."},
            ],
        }
        block = '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False, separators=(',', ':')) + '</script>'
        # Any block this tool wrote before is removed first, so a page never accumulates two of them.
        page = re.sub(r'<!--LD-->.*?<!--/LD-->', '', page, count=1, flags=re.S)
        page = page.replace('</head>', f'<!--LD-->{block}<!--/LD-->\n</head>', 1)
    except Exception as e:
        print('structured data skipped:', str(e)[:120], flush=True)
    data = ['themes/index.json', 'content/index.json'] + [f"themes/{t['id']}/theme.json" for t in json.load(open(f'{PUB}/themes/index.json'))['themes']]
    hints += ''.join(f'<link rel="preload" as="fetch" crossorigin="anonymous" href="./{f}">' for f in data)
    open(f'{PUB}/index.html', 'w').write(re.sub(r'<!--PRELOAD-->.*?<!--/PRELOAD-->', lambda m: f'<!--PRELOAD-->{hints}<!--/PRELOAD-->', page, count=1, flags=re.S))
    # Every book gets a content hash in the index. The app then asks for pack.json?v=<hash>, an address that
    # never changes, so Cloudflare can keep the 1.7 MB file instead of revalidating it through the tunnel on
    # every visit. Caddy sets the long cache only for that versioned URL; the bare one stays no-cache.
    idxf = f'{PUB}/content/index.json'
    idx = json.load(open(idxf))
    changed = False
    for p in idx['packs']:
        pf = f'{PUB}/content/packs/{p["id"]}/pack.json'
        if os.path.exists(pf):
            v = hashlib.sha256(open(pf, 'rb').read()).hexdigest()[:10]
            if p.get('v') != v:
                p['v'] = v
                changed = True
    if changed:
        json.dump(idx, open(idxf, 'w'), indent=2, ensure_ascii=False)
        open(idxf, 'a').write('\n')

    h = hashlib.sha1()
    for f in files + ['index.html']: h.update(open(f'{PUB}/{f}', 'rb').read())
    s = open(f'{PUB}/sw.js').read()
    shell = "const SHELL = [\n  './',\n  './index.html',\n  './manifest.webmanifest',\n" + ''.join(f"  './{f}',\n" for f in files) + "];"
    s = re.sub(r'const SHELL = \[.*?\];', lambda m: shell, s, count=1, flags=re.S)
    s = re.sub(r"const CACHE = '[^']*';", f"const CACHE = 'sparkle-{h.hexdigest()[:10]}';", s, count=1)
    open(f'{PUB}/sw.js', 'w').write(s)

    # When this build was made and from which commit. The watchdog reads it off the live site, so "the site is
    # serving an older build than the sources" is a fact it can check instead of something we find out by luck.
    try:
        head = subprocess.run(['git', '-C', ROOT, 'rev-parse', '--short', 'HEAD'],
                              capture_output=True, text=True).stdout.strip()
        json.dump({'built_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                   'commit': head, 'books': len(idx['packs'])},
                  open(f'{PUB}/content/build.json', 'w'), indent=1)
    except Exception as e:
        say('build stamp skipped:', str(e)[:120])

def upload():
    r = subprocess.run(['rsync', '-a', '--exclude', 'work', '--exclude', 'sources', '--exclude', 'node_modules', '--exclude', '.venv-audio', '--exclude', '__pycache__', f'{ROOT}/', TARGET], capture_output=True, text=True)
    if r.returncode not in (0, 24): sys.exit('upload failed: ' + r.stderr[-300:])
    # rsync copies but never removes, and landing-pages.py rebuilds a book's pages under fresh names
    # (ch2-dada-dadi.html, not ch02-.html), so the old chapter pages would sit on the site forever beside
    # the new ones. Clear any chapter page in a live book folder that this build did not write.
    dst_books = os.path.join(TARGET, os.path.relpath(f'{PUB}/books', ROOT))
    for slug in os.listdir(f'{PUB}/books'):
        src, dst = f'{PUB}/books/{slug}', os.path.join(dst_books, slug)
        if not os.path.isdir(src) or not os.path.isdir(dst): continue
        keep = {f for f in os.listdir(src) if f.endswith('.html')}
        for f in os.listdir(dst):
            if f.endswith('.html') and f not in keep:
                os.remove(os.path.join(dst, f))

def smoke():
    """Fetch what a child's browser would. Every picture of every book, the code, and a sample of voice clips."""
    def code(path):
        # One flaky 502 from Cloudflare used to fail a whole publish over a file that was there all along, so a
        # non-404 answer is retried before it is believed. A real 404 comes back at once.
        status = 0
        for attempt in range(3):
            try:
                with urllib.request.urlopen(urllib.request.Request(URL + path, headers={'User-Agent': 'sparkle-publish'}), timeout=40) as r:
                    if r.status == 200: return 200
                    status = r.status
            except Exception as e:
                status = getattr(e, 'code', 0)
            if status == 404: return 404
            time.sleep(0.5 * (attempt + 1))
        return status
    bad, n = [], 0
    idx = json.load(open(f'{PUB}/content/index.json'))
    paths = ['', 'sw.js', 'content/index.json', 'audio/manifest.json'] + [os.path.relpath(f, PUB) for f in glob.glob(f'{PUB}/engine/**/*.js', recursive=True)]
    for p in idx['packs']:
        base = f"content/packs/{p['id']}/"; paths.append(base + 'pack.json'); paths.append(base + 'glossary.json')
        d = json.load(open(f'{PUB}/{base}pack.json'))
        paths += sorted({base + l['topicScene'] for u in d['units'] for c in u['chapters'] for l in c['lessons'] + [c['boss']] if l.get('topicScene')})
    # Links must stay ASCII. A find-and-replace across a pack once rewrote "Onam" inside a Wikimedia URL and broke the
    # credit link; nothing else in the release would have noticed.
    deva = re.compile(r'[^\x00-\x7F]')
    broken = []
    def check_links(node):
        if isinstance(node, dict):
            for k, v in node.items():
                looks_like_path = isinstance(v, str) and (v.startswith(('http', '/', './')) or '/' in v)
                if looks_like_path and k in ('url', 'src', 'href', 'file', 'credit', 'topicScene', 'art') and deva.search(v):
                    broken.append((k, v[:80]))
                else:
                    check_links(v)
        elif isinstance(node, list):
            for v in node:
                check_links(v)
    for p in idx['packs']:
        check_links(json.load(open(f"{PUB}/content/packs/{p['id']}/pack.json")))
    if broken:
        sys.exit(f'PUBLISH REFUSED: {len(broken)} link(s) contain non-ASCII characters, e.g. {broken[:3]}')

    keys = json.load(open(f'{PUB}/audio/manifest.json'))['keys']
    paths += [f'audio/{k}.mp3' for k in random.sample(keys, min(25, len(keys)))]
    # 16 at a time: each trip through Cloudflare and the tunnel costs ~200 ms, one by one this took minutes
    import concurrent.futures as cf
    n = len(paths)
    with cf.ThreadPoolExecutor(16) as ex:
        bad = [p for p, c in zip(paths, ex.map(code, paths)) if c != 200]
    if bad: sys.exit(f'LIVE CHECK FAILED: {len(bad)} of {n} missing, e.g. {bad[:5]}')
    say(f'live check ok: {n} files fetched, {len(idx["packs"])} books')

def finish_lessons():
    """One English lesson and one Hindi lesson that between them reach every screen of a lesson, including the finish.

    Chosen from the packs being published, not hard-coded: a lesson that uses a glossary word and has enough activities
    for the revision cards to appear is the lesson that would have caught the finish screen throwing on 24 Nov.
    """
    picks, seen_lang = [], set()
    try:
        idx = json.load(open(f'{PUB}/content/index.json'))
    except Exception:
        return picks
    for p in idx.get('packs') or []:
        lang = p.get('language') or 'en'
        if lang in seen_lang:
            continue
        try:
            d = json.load(open(f"{PUB}/content/packs/{p['id']}/pack.json"))
        except Exception:
            continue
        try:
            g = json.load(open(f"{PUB}/content/packs/{p['id']}/glossary.json"))
        except Exception:
            g = {}
        terms = [t.get('term') for t in g.get('terms') or [] if t.get('term')]
        plain = None
        for u in d.get('units') or []:
            for c in u.get('chapters') or []:
                for l in c.get('lessons') or []:
                    acts = l.get('activities') or []
                    if l.get('isPractice') or len(acts) < 6 or not l.get('id'):
                        continue
                    text = ' '.join(str(a.get(k) or '') for a in acts for k in ('title', 'body', 'prompt', 'explanation'))
                    if terms and any(t in text for t in terms):
                        picks.append(f"{p['id']}/{l['id']}")
                        seen_lang.add(lang)
                        break
                    plain = plain or f"{p['id']}/{l['id']}"
                if lang in seen_lang:
                    break
            if lang in seen_lang:
                break
        if lang not in seen_lang and plain:
            picks.append(plain)
            seen_lang.add(lang)
    return picks


def finish_check():
    """Play the lessons through in a real browser before the copy goes live and refuse to publish if one cannot finish.

    Nothing else in a publish looks at a screen: the live check fetches files and the smoke test opens the app, and on
    24 Nov a helper declared in the wrong scope threw a ReferenceError on the finish screen of every lesson for half an
    hour while every check stayed green. A child saw the lesson end with no celebration and no way forward.
    """
    node = shutil.which('node')
    if not node:
        say('finish check skipped: node is not installed here')
        return
    picks = finish_lessons()
    if not picks:
        say('finish check skipped: no lesson to play')
        return
    import socket
    sock = socket.socket()
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
    sock.close()
    # The copy that is about to be uploaded, served from public/ so the check tests what the upload carries.
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'],
                           cwd=PUB, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(40):
            try:
                socket.create_connection(('127.0.0.1', port), timeout=0.5).close()
                break
            except OSError:
                time.sleep(0.1)
        for pick in picks:
            url = f'http://127.0.0.1:{port}/?x={random.randint(1, 10**6)}#/lesson/{pick}'
            try:
                r = subprocess.run([node, f'{HERE}/play-lesson.mjs', url], cwd=ROOT,
                                   capture_output=True, text=True, timeout=420)
                out = (r.stdout or '') + (r.stderr or '')
                if r.returncode != 0:
                    tail = '\n'.join(out.strip().splitlines()[-9:])
                    sys.exit(f'PUBLISH REFUSED: {pick} did not play through\n{tail}')
                steps = re.search(r'steps=(\d+)', out)
                say(f'finish screen ok: {pick}' + (f' ({steps.group(1)} steps)' if steps else ''))
            except subprocess.TimeoutExpired:
                sys.exit(f'PUBLISH REFUSED: {pick} did not finish playing within 7 minutes')
    finally:
        srv.terminate()
        try:
            srv.wait(timeout=5)
        except Exception:
            srv.kill()

if '--no-build' not in args:
    build()
    pages()
    if '--audio' in args and '--no-audio' not in args: audio()   # recording is a laptop job: opt in with --audio

    # Text gate. On 27 Nov the site served broken Hindi for hours because a repair reached the sources and
    # never reached a rebuild, and because the checker that was supposed to catch it had gone half blind.
    # So: test the checker, then test the packs it just produced, and refuse to upload rather than ship either.
    selftest = subprocess.run([sys.executable, f'{HERE}/text-gate.py', '--self-test'], capture_output=True, text=True)
    say(selftest.stdout.strip() or selftest.stderr.strip()[-300:])
    if selftest.returncode:
        sys.exit('PUBLISH REFUSED: the Hindi checker does not pass its own test — fix the checker first, '
                 'otherwise a broken number would look like good news')
    gate = subprocess.run([sys.executable, f'{HERE}/text-gate.py'], capture_output=True, text=True)
    say(gate.stdout.strip() or gate.stderr.strip()[-300:])
    if gate.returncode:
        sys.exit('PUBLISH REFUSED: this build carries more unreadable Hindi than the last published one. '
                 'Repair the source, rebuild, publish again.')

thumbs(); stamp(); finish_check(); upload(); smoke()

# What is live now is the new known-good state for the text gate.
try:
    subprocess.run([sys.executable, f'{HERE}/text-gate.py', '--update-baseline'], capture_output=True, text=True)
except Exception as e:
    say(f'text baseline not updated: {e}')

def push():
    """What just went live also goes to GitHub. A failed push never fails a publish."""
    git = lambda *a: subprocess.run(['git', *a], cwd=ROOT, capture_output=True, text=True)
    if not os.path.isdir(f'{ROOT}/.git') or not git('remote').stdout.strip(): return
    git('add', '-A')
    if git('diff', '--cached', '--quiet').returncode:
        # Say what this publish carries: the change that came just before it, or the shape of the diff when there is
        # no such commit. A trail of "Publish: <what>" commits is readable; a trail of "what is live now" is not.
        head = git('log', '-1', '--pretty=%s').stdout.strip()
        if head and not head.lower().startswith(('publish:', 'backup:', 'merge ')):
            room = 110 - len('Publish: ')
            short = head if len(head) <= room else (head[:room].rsplit(' ', 1)[0] or head[:room])
            message = f'Publish: {short}'
        else:
            changed = [line for line in git('diff', '--cached', '--name-only').stdout.split('\n') if line.strip()]
            books = len({line.split('/')[3] for line in changed if line.startswith('public/content/packs/') and len(line.split('/')) > 3})
            parts = []
            if any(line.startswith('public/engine/') or line.startswith('public/css/') or line == 'public/index.html' for line in changed):
                parts.append('app')
            if books:
                parts.append(f'{books} book{"s" if books != 1 else ""}')
            if any(line.startswith('public/audio/') for line in changed):
                parts.append('audio')
            if any(line.startswith('public/books/') for line in changed):
                parts.append('pages')
            message = 'Publish: ' + (', '.join(parts) if parts else f'{len(changed)} files')
        git('commit', '-m', message)
    r = git('push', '-q', 'origin', 'main')
    say('pushed to GitHub' if r.returncode == 0 else f'GitHub push failed: {r.stderr[:120]}')
push()
# the working files are not in the public repo (NCERT-derived): save them to the private one as well, never fatal
try:
    r = subprocess.run([os.path.join(ROOT, 'tools', 'backup-work.sh')], capture_output=True, text=True, timeout=600)
    say(r.stdout.strip() or 'backup-work: no output')
except Exception as e:
    say(f'backup-work skipped: {e}')
