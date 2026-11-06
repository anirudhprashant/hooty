#!/usr/bin/env python3
"""Side by side: which model writes Hooty's reasoning questions better?

Runs the real stage (tools/deepen.py) on the SAME lessons under each model, in scratch folders, so nothing real is touched, then
compares what comes out:
  made / kept   questions the model wrote, and how many survived the pipeline's own gates (valid shape, numbers taken from the
                facts, a blind second reading picks the same answer, a judge says it needs reasoning), plus think cards
  referee       a different model (a neutral third party, not one of the writers) answers every kept question blind from the
                facts alone; the share that match the writer's answer key is a check on whether the questions are sound
  time          wall-clock for the whole stage
It prints a table and saves the questions to work/compare/<time>/<model>/ so a person can read samples side by side.

  python3 tools/compare-models.py mathematics-g4 5 [--lessons 3] [--models m27,od-flash,od-eco]
Models: m27 (MiniMax-M2.7 only), od-flash (opendesign/deepseek-v4.1-flash), od-eco (…-flash-eco), m31, or anything in llm.TRIALS.
The winner goes in LUMI_FALLBACK (tools/llm.py), the model used when MiniMax is down."""
import json, os, re, subprocess, sys, time
os.environ['LUMI_FALLBACK'] = ''   # a trial must never be quietly carried by another model
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import llm
from subjects import SUBJECTS
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default
pos = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and sys.argv[i - 1] not in ('--lessons', '--models')]
if len(pos) < 2 or pos[0] not in SUBJECTS: sys.exit(__doc__)
slug, chapter, k = pos[0], int(pos[1]), int(arg('--lessons', 3))
models = arg('--models', 'od-flash,od-eco,m27').split(',')
work = f"{ROOT}/{SUBJECTS[slug]['work']}/ch{chapter:02d}"
facts = json.load(open(f'{work}/facts.json'))
lessons = facts['lessons']
sample = [lessons[round(i * (len(lessons) - 1) / max(1, k - 1))] for i in range(min(k, len(lessons)))] if k > 1 else lessons[:1]
sample = list({l['id']: l for l in sample}.values())
stamp = time.strftime('%Y%m%d-%H%M'); base = f'{ROOT}/work/compare/{stamp}'
print(f"{slug} chapter {chapter}: {len(sample)} lessons ({', '.join(l['title'][:28] for l in sample)}); models: {', '.join(models)}\n", flush=True)

REFEREE = 'opendesign/glm-5.3-flash'   # a different model family from every writer here, and not on the MiniMax plan

def referee(q, sheet):
    opts = '\n'.join(f'{i}: {o}' for i, o in enumerate(q['options']))
    p = f'Using these facts and sensible reasoning, answer the question.\n\nFACTS:\n{sheet}\n\nQUESTION: {q["prompt"]}\n{opts}\n\nReply with ONLY the number of the best option.'
    r = llm.opencode(p, REFEREE, want_json=False, tries=1) or llm.opencode(p, llm.CHECKER, want_json=False, tries=1)
    m = re.search(r'\d', str(r or ''))
    return None if not m else int(m.group(0)) == q['answer']

rows = []
for m in models:
    if m == 'm27' and llm.minimax_cooling():
        print('m27       skipped: MiniMax hit its plan limit in the last 30 minutes, so it cannot be tested fairly now; run it again later with --models m27', flush=True); continue
    d = f'{base}/{m}'; os.makedirs(d, exist_ok=True)
    json.dump({**facts, 'lessons': sample}, open(f'{d}/facts.json', 'w'), ensure_ascii=False)
    env = {**os.environ, 'SPARKLE_SUBJECT': slug, 'DEEPEN_DIR': d, 'LUMI_MODEL': m, 'LUMI_FALLBACK': ''}
    t = time.time()
    r = subprocess.run([sys.executable, f'{ROOT}/tools/deepen.py', str(chapter)], env=env, capture_output=True, text=True, timeout=3 * 3600)
    secs = time.time() - t
    log = r.stdout + r.stderr; open(f'{d}/log.txt', 'w').write(log)
    made = kept = think = 0
    for a, b, c in re.findall(r'lesson \S+: (\d+) reasoning questions kept of (\d+), think card: (yes|no)', log): kept += int(a); made += int(b); think += c == 'yes'
    failed = len(re.findall(r'no result for', log))
    deep = json.load(open(f'{d}/deep.json')) if os.path.exists(f'{d}/deep.json') else {}
    ok = n = 0
    for l in sample:
        sheet = '\n'.join(f"- {f['say']}" for f in l['facts'])
        for q in (deep.get(l['id'][1:]) or {}).get('questions', []):
            v = referee(q, sheet)
            if v is not None: n += 1; ok += v
    rows.append((m, made, kept, think, failed, f'{ok}/{n}' if n else '-', secs))
    print(f'{m:9s} wrote {made:2d}, kept {kept:2d}, think cards {think}/{len(sample)}, failed lessons {failed}, referee agrees {ok}/{n}, {secs / 60:.1f} min', flush=True)

print('\nmodel      wrote  kept  kept%  think  failed  referee  minutes')
for m, made, kept, think, failed, ref, secs in rows:
    print(f'{m:9s}  {made:4d}  {kept:4d}  {100 * kept // made if made else 0:4d}%  {think:3d}/{len(sample)}  {failed:5d}  {ref:>7s}  {secs / 60:6.1f}')
print(f'\nquestions saved in {base}/<model>/deep.json: read a few side by side before choosing.')
