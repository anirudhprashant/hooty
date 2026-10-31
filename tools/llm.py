"""The one place the tools talk to the models on oracle. Bulk writing goes to MiniMax-M2.7, pictures to MiniMax's
vision endpoint; both keys stay on oracle. All calls share one ssh connection, so a batch of parallel chapters
cannot trip sshd's connection limit (the "Connection reset by peer" failures)."""
import base64, fcntl, json, os, re, subprocess, tempfile, time
HOST = 'oracle'
REMOTE = '~/agent-workspace/learning-game/tools'
SOCKET = os.path.expanduser('~/.ssh/cm-sparkle-%r@%h')
SSH = ['ssh', '-o', f'ControlPath={SOCKET}', HOST]

def _ensure_connection():
    if subprocess.run(['ssh', '-o', f'ControlPath={SOCKET}', '-O', 'check', HOST], capture_output=True).returncode != 0:
        # started detached with no pipes: a background master holding our pipes open would hang subprocess.run
        subprocess.run(['ssh', '-fNM', '-o', f'ControlPath={SOCKET}', '-o', 'ControlPersist=600', HOST],
                       stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def _remote(script, data, timeout):
    _ensure_connection()
    return subprocess.run([*SSH, f'python3 {REMOTE}/{script}'], input=data, capture_output=True, text=True, timeout=timeout)

GAP = float(os.environ.get('SPARKLE_M27_GAP', '30'))   # seconds between calls across every job: the plan is shared with other agents
LOCK = os.path.expanduser('~/.cache/sparkle-m27.lock')

def _take_turn():
    """One call at a time across all jobs on this machine, spaced out, so Lumi can never starve the plan in a burst."""
    os.makedirs(os.path.dirname(LOCK), exist_ok=True)
    with open(LOCK, 'a+') as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.seek(0); last = float(f.read().strip() or 0)
        wait = last + GAP - time.time()
        if wait > 0: time.sleep(wait)
        f.seek(0); f.truncate(); f.write(str(time.time())); f.flush()

def m27(prompt, want_json=True, tries=3, on_retry=None):
    """Reply text, or the first JSON object in it. None if every try failed. Haiku writes first, then DeepSeek if it is free
    again, and MiniMax-M2.7 is the last resort. The name stays because every tool calls it."""
    got = haiku(prompt, want_json=want_json, tries=1)
    if got is not None: return got
    if len(prompt) < 100000:   # the longest prompts do not fit on a command line
        got = opencode(prompt, DEEPSEEK, want_json=want_json, tries=1)
        if got is not None: return got
    for t in range(tries):
        try:
            _take_turn()
            r = _remote('m27.py', prompt, 900)
            while '429' in r.stderr:      # plan limit: wait for it to reset, so jobs pause and nothing is marked failed or written empty
                print('MiniMax limit reached, waiting 20 minutes', flush=True); time.sleep(1200)
                _take_turn(); r = _remote('m27.py', prompt, 900)
            out = r.stdout.strip()
            if not out: raise ValueError('empty reply')
            if not want_json: return out
            try: return json.loads(re.search(r'\{.*\}', out, re.S).group(0))
            except Exception:   # long replies sometimes have a stray quote or a trailing comma: repairing is cheaper than rewriting
                _take_turn(); fixed = _remote('m27.py', 'This should be one valid JSON object but it does not parse. Fix only the syntax (escape quotes inside strings, remove trailing commas, close anything cut off) and change no wording. Reply with ONLY the JSON.\n\n' + out, 900).stdout.strip()
                return json.loads(re.search(r'\{.*\}', fixed, re.S).group(0))
        except Exception as e:
            if on_retry: on_retry(t + 1, str(e)[:80])
            time.sleep(6 + t * 6)
    return None

def vision(image_path, prompt, tries=3):
    """What MiniMax's vision model says about a local picture, or None if it could not be reached."""
    with tempfile.NamedTemporaryFile(suffix='.jpg') as jpg:
        subprocess.run(['magick', image_path + '[0]', '-resize', '768x768>', '-background', 'white', '-flatten', jpg.name], capture_output=True)
        payload = json.dumps({'prompt': prompt, 'image': base64.b64encode(open(jpg.name, 'rb').read()).decode()})
    for t in range(tries):
        try:
            out = _remote('vlm.py', payload, 180).stdout.strip()
            if out: return out
        except Exception: pass
        time.sleep(5 + t * 5)
    return None

DEEPSEEK = 'opencode/deepseek-v4.1-flash-free'
CHECKER = 'opencode/glm-5.3-flash-free'   # a different model reads the work, so the writer does not mark its own answers
SLOTS = 3                                 # at most this many Haiku or opencode calls at once across every job on this machine

def _slot():
    """Hold one of SLOTS lock files; waits until one is free. The lock ends when the returned file is closed."""
    os.makedirs(os.path.dirname(LOCK), exist_ok=True)
    while True:
        for i in range(SLOTS):
            f = open(f'{LOCK}.oc{i}', 'w')
            try: fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB); return f
            except OSError: f.close()
        time.sleep(2)

HAIKU_COOLDOWN = LOCK + '.haiku-limit'
def haiku(prompt, want_json=True, tries=2, on_retry=None):
    """Claude Haiku through the claude command, on Anirudh's subscription (he asked for this). It shares his Claude limits with
    his own sessions, so on any limit message it stops for an hour rather than use up what he needs. No tools, no project,
    no saved session. Any API key is removed from its environment so it can never bill one."""
    env = {k: v for k, v in os.environ.items() if k not in ('ANTHROPIC_API_KEY', 'CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT')}
    for t in range(tries):
        if os.path.exists(HAIKU_COOLDOWN) and time.time() - os.path.getmtime(HAIKU_COOLDOWN) < 3600: return None
        try:
            with _slot(), tempfile.TemporaryDirectory() as d:
                r = subprocess.run(['claude', '-p', '--model', 'haiku', '--tools', '', '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence', '--output-format', 'text'],
                                   input=prompt, cwd=d, env=env, capture_output=True, text=True, timeout=600)
            if re.search(r'(usage|rate|session|weekly) limit|limit reached|hit your limit|overloaded', r.stdout[:300] + r.stderr, re.I):
                open(HAIKU_COOLDOWN, 'w').close(); print('Claude limit message, leaving Haiku alone for an hour:', (r.stdout + r.stderr)[:100], flush=True); return None
            out = r.stdout.strip()
            if not out: raise ValueError('empty reply: ' + r.stderr[-120:])
            if not want_json: return out
            return json.loads(re.search(r'\{.*\}', out, re.S).group(0))
        except Exception as e:
            if on_retry: on_retry(t + 1, str(e)[:80])
            time.sleep(6 + t * 10)
    return None

COOLDOWN = LOCK + '.oc-limit'
def opencode(prompt, model=DEEPSEEK, want_json=True, tries=3, on_retry=None):
    """A free model through opencode, on its own limit, not the shared MiniMax plan. A private server per call, in an empty
    folder, so it cannot touch the shared opencode server or any project. The free tier's limit covers all its models and
    is shared with Anirudh's own opencode use: once it is hit, leave it alone for an hour and let MiniMax carry the work."""
    for t in range(tries):
        if os.path.exists(COOLDOWN) and time.time() - os.path.getmtime(COOLDOWN) < 3600: return None
        try:
            with _slot(), tempfile.TemporaryDirectory() as d:
                r = subprocess.run(['opencode', 'run', '--standalone', '-m', model, prompt], cwd=d, capture_output=True, text=True, timeout=600, stdin=subprocess.DEVNULL)
            if 'usage limit' in r.stdout + r.stderr:
                open(COOLDOWN, 'w').close(); print('opencode free limit reached, using MiniMax for an hour', flush=True); return None
            out = re.sub(r'\x1b\[[0-9;]*m', '', r.stdout).strip()
            if not out: raise ValueError('empty reply: ' + r.stderr[-120:])
            if not want_json: return out
            return json.loads(re.search(r'\{.*\}', out, re.S).group(0))
        except Exception as e:
            if on_retry: on_retry(t + 1, str(e)[:80])
            time.sleep(6 + t * 10)
    return None
def deepseek(prompt, **k): return opencode(prompt, DEEPSEEK, **k)
def checker(prompt, **k): return m27(prompt, **k)   # a fresh session with a checker's prompt: it never sees the writer's reasoning
