#!/usr/bin/env python3
"""Practice problems for Mathematics whose answers are COMPUTED, not recalled, and fresh on every play.

  python3 tools/calc-problems.py 3          (run by new-chapter.py for books flagged "calc")

For every lesson of the chapter, MiniMax-M2.7 writes about a dozen problem TEMPLATES in three tiers: warm-ups (one step,
small numbers), everyday word problems, and two-step challenges. A template is a sentence with {placeholders}, the values
or ranges each may take, optional constraints, a formula for the answer, formulas for common mistakes, a hint and a worked
explanation. This script samples instances with exact arithmetic (fractions), rejects awkward ones (answers that are not
whole or short decimals, a count of 1 that would read "1 children"), and asks M2.7 to solve two finished instances from
scratch with NO formula. A template is kept only if every solve agrees with the computed answer.

Each kept problem ships as a normal activity (its first verified instance is the fallback text) plus a "gen" recipe;
public/engine/core/gen.js uses the recipe to draw new numbers every time the problem is shown. Writes into
work/<subject>/chNN/lessons/<k>.json (activities tagged "computed")."""
import ast, json, math, operator, os, random, re, sys
from concurrent.futures import ThreadPoolExecutor
from fractions import Fraction
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from subjects import S as SUBJ
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = int(sys.argv[1]); NN = f'{N:02d}'; W = f"{ROOT}/{SUBJ['work']}/ch{NN}"
facts = json.load(open(f'{W}/facts.json'))
rng = random.Random(N * 7919)
PER_LESSON = 10      # problems kept per lesson
SOLVES = 2           # instances of each template that M2.7 must solve independently

# ---- a tiny safe evaluator: numbers, + - * / ** // %, comparisons, and/or, parentheses, a few functions, the template's variables
OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: lambda a, b: Fraction(a) / Fraction(b),
       ast.FloorDiv: operator.floordiv, ast.Mod: operator.mod, ast.Pow: operator.pow, ast.USub: operator.neg}
CMP = {ast.Gt: operator.gt, ast.Lt: operator.lt, ast.GtE: operator.ge, ast.LtE: operator.le, ast.Eq: operator.eq, ast.NotEq: operator.ne}
FUNCS = {'sqrt': lambda x: Fraction(int(math.isqrt(int(x)))) if int(x) == x and math.isqrt(int(x)) ** 2 == x else Fraction(math.sqrt(x)),
         'gcd': math.gcd, 'lcm': math.lcm, 'abs': abs, 'min': min, 'max': max, 'round': round}
def ev(expr, env):
    def go(n):
        if isinstance(n, ast.Expression): return go(n.body)
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)): return Fraction(str(n.value))
        if isinstance(n, ast.Name) and n.id in env: return Fraction(str(env[n.id]))
        if isinstance(n, ast.BinOp) and type(n.op) in OPS:
            r = OPS[type(n.op)](go(n.left), go(n.right))
            if isinstance(n.op, ast.Pow) and Fraction(go(n.right)).denominator != 1: raise ValueError('fractional power')
            return Fraction(r)
        if isinstance(n, ast.UnaryOp) and type(n.op) in OPS: return OPS[type(n.op)](go(n.operand))
        if isinstance(n, ast.Compare) and all(type(o) in CMP for o in n.ops):
            left = go(n.left)
            for o, c in zip(n.ops, n.comparators):
                right = go(c)
                if not CMP[type(o)](left, right): return Fraction(0)
                left = right
            return Fraction(1)
        if isinstance(n, ast.BoolOp):
            vals = [go(v) != 0 for v in n.values]
            return Fraction(1 if (all(vals) if isinstance(n.op, ast.And) else any(vals)) else 0)
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in FUNCS:
            return Fraction(FUNCS[n.func.id](*[go(a) for a in n.args]))
        raise ValueError('not allowed: ' + ast.dump(n)[:60])
    v = go(ast.parse(str(expr), mode='eval'))
    if abs(v.numerator) > 10 ** 9: raise ValueError('too big')
    return v

def show(v):
    """Exact text of a number: whole numbers plain, otherwise a decimal if it terminates within 3 places, else a/b."""
    v = Fraction(v)
    if v.denominator == 1: return str(v.numerator)
    d = v.denominator
    while d % 2 == 0: d //= 2
    while d % 5 == 0: d //= 5
    if d == 1: return f'{float(v):.3f}'.rstrip('0').rstrip('.')
    return f'{v.numerator}/{v.denominator}'

def short(v):
    """True for answers a child can type: whole, or a decimal with at most two places."""
    v = Fraction(v)
    return v.denominator in (1, 2, 4, 5, 10, 20, 25, 50, 100)

def same(a, b):
    try: return abs(parse_num(a) - parse_num(b)) < Fraction(1, 1000)
    except Exception: return False
def parse_num(t):
    t = str(t).replace(',', '').strip().strip('.')
    m = re.search(r'-?\d+\s*/\s*\d+|-?\d+(?:\.\d+)?', t)
    if not m: raise ValueError
    return Fraction(m.group(0).replace(' ', ''))

from llm import m27

def values(spec):
    """A parameter's allowed values: a list, or {"min":a,"max":b,"step":s}."""
    if isinstance(spec, dict):
        lo, hi, st = int(spec['min']), int(spec['max']), int(spec.get('step', 1) or 1)
        return list(range(lo, hi + 1, st))
    return list(spec)

def lesson_problems(lesson):
    sheet = '\n'.join(f"- FACT {f['id']}: {f['say']}" for f in lesson['facts'])
    d = m27(f'''You write practice problems for a Class {SUBJ.get('grade', '6')} {SUBJ['name']} lesson called "{lesson['title']}". Use only the ideas in these facts:
{sheet}

Write 12 problem TEMPLATES in three tiers, in this order:
 tier 1 (4 templates): warm-ups. ONE step, small friendly numbers, a direct use of the idea.
 tier 2 (5 templates): everyday word problems in a child's world (rupees, laddoos, marbles, buses, cm, litres, school, cricket, a market), each testing a different skill from the lesson.
 tier 3 (3 templates): challenges that need TWO steps.
A template is ONE or TWO short sentences with {{placeholders}}. Give each numeric placeholder either a list of 3 to 6 whole numbers or a range {{"min":a,"max":b}} (every value at least 2). Optional "where": a list of conditions that must hold (for example "a > b", "n % d == 0") so every instance makes sense and every answer comes out whole (or a short decimal). A placeholder may also be a list of words (for example "item": ["laddoos","marbles"]) used only in the sentence, never in a formula.
The sentence MUST say exactly what the formula computes, with units, and must read naturally for any allowed values.
THE MOST IMPORTANT RULE: every problem must practise the specific idea of THIS lesson, the same idea the facts above teach. A child who has only learned this lesson and ordinary arithmetic must be able to do it. Do NOT drift to other topics: no percentages, fractions, decimals, area or anything else unless these facts teach it. A word problem is this lesson's idea placed in an everyday setting, not a general arithmetic question.
Every question must be COMPLETE and SELF-CONTAINED with exactly one numeric answer that arithmetic on the placeholders produces: put every number the child needs inside the sentence, and never ask vaguely ("how many numbers in 3 are prime?"). Do NOT write templates about definitions, naming, or ordering words. If a lesson truly has fewer number skills, write fewer templates rather than off-topic ones.
"kind" is "fillblank" (the answer is a number) or "mcq". For "mcq" give "wrong": 3 formulas for COMMON MISTAKES a child might make (same placeholders). Give "hint": one short sentence naming the first step WITHOUT the answer. Give "explain": the worked solution in one or two short sentences using the placeholders and {{answer}}.
For EVERY template also give:
 "steps": 2 to 4 short sentences that TEACH the solution to a child, one idea each, in order (what is given, what we need, the operation and WHY, then the result). Use the placeholders. The last step must state the answer using {{answer}}. Any equation in a step must be true for every allowed value (for example "{{a}} x {{b}} = {{answer}}").
 "vals": named in-between values as formulas, for example {{"cost":"a*b","change":"100-a*b"}}. Inside the steps and the sentence you may ONLY write a placeholder name or a "vals" name in braces, like {{a}} or {{cost}}: NEVER a formula or an operator inside braces (so not {{a*b}} and not {{n//k}}). Put every number a step needs into "vals" first. Write fractions and percentages in words in the steps ("3 out of 6", "10 percent"), not as 3/6.
 "model": ONE picture of the situation, so the child can SEE why the sum works. Choose from (numbers may be formulas over the placeholders): {{"type":"array","rows":"b","cols":"a"}} (equal rows, multiplication); {{"type":"groups","groups":"n","size":"k"}} (sharing or grouping, at most 8 groups of 12); {{"type":"tape","parts":[{{"v":"a","label":"{{a}} rupees"}},{{"v":"b","label":"{{b}} rupees"}}],"total":"?"}} (parts and a total, difference, change); {{"type":"numberline","from":0,"to":"n*k","step":"k","jumps":{{"start":0,"size":"k","count":"n"}}}} (skip counting, multiples, counting on); {{"type":"area","rows":"w","cols":"l","unit":"cm"}} (area and perimeter, at most 12 by 16); {{"type":"fraction","parts":"d","shaded":"n"}}; {{"type":"compare","bars":[{{"label":"Ravi","v":"a"}},{{"label":"Meena","v":"b"}}]}}. Use "model": null when no picture fits.
 For "mcq" also "wrongWhy": for each "wrong" formula, ONE short sentence naming the mistake that gives it ("You added instead of multiplying.").
Reply ONLY JSON: {{"problems":[{{"tier":1,"kind":"fillblank","template":"A rectangle is {{l}} cm long and {{w}} cm wide. What is its perimeter in cm?","params":{{"l":[8,12,15],"w":{{"min":3,"max":9}}}},"where":["l > w"],"answer":"2*(l+w)","hint":"Add the length and the width, then double it.","steps":["The length is {{l}} cm and the width is {{w}} cm.","Perimeter is the distance all the way round, so we add the two sides and double it.","2 x ({{l}} + {{w}}) = {{answer}} cm."],"model":{{"type":"area","rows":"w","cols":"l","unit":"cm"}},"f":["1.1"]}}]}}''')
    return (d or {}).get('problems', [])

def on_topic(lesson, templates):
    """A second reader keeps only the problems that practise what this lesson teaches. If that check fails to answer, keep nothing:
    the lesson still has its concept cards and questions, and off-topic sums are worse than fewer sums."""
    if not templates: return []
    sheet = '\n'.join(f"- {f['say']}" for f in lesson['facts'])
    rows = '\n'.join(f"{i}: {t.get('template', '')}" for i, t in enumerate(templates))
    d = m27(f'''A Class {SUBJ.get('grade', '6')} {SUBJ['name']} lesson called "{lesson['title']}" teaches exactly this:\n{sheet}\n\nThese are proposed practice problems:\n{rows}\n\nKeep a problem only if a child would need the idea of THIS lesson to solve it, and it uses nothing the lesson has not taught beyond ordinary whole-number arithmetic. Reject general arithmetic with no link to the lesson (for example a discount sum in a lesson on number patterns). Reply ONLY JSON: {{"keep":[0,2]}}''')
    keep = (d or {}).get('keep', [])
    kept = [t for i, t in enumerate(templates) if i in keep]
    print(f"  on topic: {len(kept)} of {len(templates)}", flush=True)
    return kept

def instances(p, how_many):
    """Distinct sampled parameter sets that satisfy the template's constraints and give a short positive answer."""
    out, seen = [], set()
    why = instances.why = {'one': 0, 'where': 0, 'formula': 0, 'answer': 0, 'dup': 0}
    lists = {k: values(v) for k, v in p['params'].items()}
    for _ in range(60):
        env = {k: rng.choice(v) for k, v in lists.items()}
        key = tuple(sorted(env.items(), key=lambda kv: kv[0]))
        if key in seen: why['dup'] += 1; continue
        seen.add(key)
        num = {k: v for k, v in env.items() if isinstance(v, (int, float))}
        if any(v == 1 for v in num.values()): why['one'] += 1; continue      # "among 1 children"
        try:
            if any(ev(c, num) == 0 for c in p.get('where', [])): why['where'] += 1; continue
            ans = ev(p['answer'], num)
        except Exception:
            why['formula'] += 1; continue
        if ans <= 0 or not short(ans): why['answer'] += 1; continue
        out.append((env, num, ans))
        if len(out) >= how_many: break
    return out

TEXT_KEYS = {'type', 'label', 'total', 'unit'}
LIMITS = {'array': ('rows', 1, 10, 'cols', 1, 14), 'groups': ('groups', 1, 8, 'size', 1, 12), 'area': ('rows', 1, 12, 'cols', 1, 16)}

def resolve_spec(spec, num, vars_):
    """Mirror of resolveSpec in public/engine/core/gen.js: text keys are filled in, everything else is evaluated."""
    if isinstance(spec, list): return [resolve_spec(x, num, vars_) for x in spec]
    if isinstance(spec, dict):
        return {k: (str(v).format(**vars_) if k in TEXT_KEYS and isinstance(v, str) else v if k in TEXT_KEYS else resolve_spec(v, num, vars_)) for k, v in spec.items()}
    if isinstance(spec, str): return float(ev(spec, num))
    return spec

def model_ok(spec):
    """True if the picture can be drawn clearly: a known type and sizes within what the drawing code accepts."""
    t = spec.get('type')
    if t in LIMITS:
        k1, lo1, hi1, k2, lo2, hi2 = LIMITS[t]
        return lo1 <= round(spec[k1]) <= hi1 and lo2 <= round(spec[k2]) <= hi2
    if t == 'tape': return 1 <= len(spec.get('parts', [])) <= 8 and all(float(x['v']) > 0 for x in spec['parts'])
    if t == 'numberline': return spec['to'] > spec['from'] and (spec['to'] - spec['from']) / (spec.get('step') or 1) <= 60
    if t == 'fraction': return 2 <= round(spec['parts']) <= 16 and 0 <= round(spec['shaded']) <= round(spec['parts'])
    if t == 'compare': return 2 <= len(spec.get('bars', [])) <= 5 and all(float(x['v']) > 0 for x in spec['bars'])
    return False

EQ = re.compile(r'(\d+(?:\.\d+)?)\s*([x\u00d7*+\-\u2212\u00f7/])\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)')
def steps_true(steps, truth):
    """Every 'a op b = c' written in the steps must be arithmetically right, and the last step must reach the answer."""
    if not (2 <= len(steps) <= 5) or truth not in steps[-1]: return False
    for line in steps:
        for a_, op, b_, c_ in EQ.findall(line):
            a_, b_, c_ = Fraction(a_), Fraction(b_), Fraction(c_)
            val = {'x': a_ * b_, '\u00d7': a_ * b_, '*': a_ * b_, '+': a_ + b_, '-': a_ - b_, '\u2212': a_ - b_, '\u00f7': a_ / b_ if b_ else None, '/': a_ / b_ if b_ else None}[op]
            if val is None or abs(val - c_) > Fraction(1, 100): return False
    return True

def build(p, lesson, idx):
    kind = p.get('kind', 'fillblank')
    if kind not in ('mcq', 'fillblank') or not p.get('params') or not p.get('answer'): return None
    tmpl = p['template']
    if re.search(r'formula|expression|equation|variable', tmpl, re.I): return None  # a child's problem, not a maths-teacher's
    if re.search(r'\{\w+\}(st|nd|rd|th)\b', tmpl): return None                       # "2th bus"
    steps_t = [x for x in p.get('steps', []) if isinstance(x, str)]
    if not steps_t: print(f'  no steps: {tmpl[:60]}', flush=True); return None       # a problem without a worked solution does not teach
    try: runs = instances(p, SOLVES + 1)
    except Exception: return None
    if len(runs) < SOLVES + 1: print(f'  too few valid instances {instances.why}: {tmpl[:60]}', flush=True); return None
    vals_t = p.get('vals') or {}
    def draw(env, num, ans):
        mid = {}
        for k, expr in vals_t.items(): mid[k] = ev(expr, {**num, **mid, 'answer': ans})
        shown = {k: show(v) for k, v in mid.items()}
        vars_ = {**env, **shown, 'answer': show(ans)}
        return {**num, **mid, 'answer': ans}, vars_
    spec_ok = bool(p.get('model'))
    for env, num, ans in runs:                      # steps and picture must be right for every sampled instance
        try:
            nums, vars_ = draw(env, num, ans)
            rendered = [x.format(**vars_) for x in steps_t]
        except Exception as e:
            print(f'  steps do not render ({e}): {tmpl[:60]}', flush=True); return None
        if not steps_true(rendered, show(ans)): print(f'  steps wrong or no answer: {rendered}', flush=True); return None
        if spec_ok:
            try: spec_ok = model_ok(resolve_spec(p['model'], nums, vars_))
            except Exception: spec_ok = False
    # every sampled instance must read sensibly and be solved identically by M2.7 with no formula
    for env, num, ans in runs[:SOLVES]:
        text = tmpl.format(**env)
        solved = m27(f'Solve this school {SUBJ['name'].lower()} question. Reply with ONLY the final answer as a number (a fraction like 3/4 is fine), no words, no units.\n\n{text}', want_json=False)
        if not solved or not same(solved, show(ans)):
            print(f'  dropped (solver said {str(solved)[:30]!r}, formula {show(ans)}): {text[:70]}', flush=True); return None
    env, num, ans = runs[0]
    nums, vars_ = draw(env, num, ans)
    text = tmpl.format(**env); truth = show(ans)
    others, why = [], {}
    if kind == 'mcq':
        for wi, w in enumerate(p.get('wrong', [])):
            try:
                v = show(ev(w, nums))
                if v != truth and v not in others:
                    others.append(v)
                    if wi < len(p.get('wrongWhy', [])) and isinstance(p['wrongWhy'][wi], str): why[v] = p['wrongWhy'][wi].format(**vars_)
            except Exception: pass
        for extra in (ans + 1, ans - 1, ans * 2, ans + 10):
            if len(others) >= 3: break
            v = show(extra)
            if extra >= 0 and v != truth and v not in others: others.append(v)
        if len(others) < 3: return None
    steps = [x.format(**vars_) for x in steps_t]
    tier = int(p.get('tier', 2)) if str(p.get('tier', '2')).isdigit() else 2
    a = {'type': kind, 'difficulty': min(max(tier, 1), 3), 'tags': ['practice', 'computed'],
         'prompt': text, 'explanation': ' '.join(steps), 'steps': steps, 'hint': (p.get('hint') or 'Work out the first step.').format(**vars_),
         'f': [i for i in p.get('f', []) if i in {f['id'] for f in lesson['facts']}] or [lesson['facts'][0]['id']],
         'derived': [f'{n} (generated problem)' for n in sorted(set(re.findall(r'\d+(?:\.\d+)?', ' '.join([text, ' '.join(steps), truth] + others))))],
         'gen': {'template': tmpl, 'params': p['params'], 'where': p.get('where', []), 'answer': p['answer'], 'vals': vals_t, 'steps': steps_t,
                 'model': p['model'] if spec_ok else None, 'hint': p.get('hint', ''),
                 'wrong': p.get('wrong', []) if kind == 'mcq' else [], 'wrongWhy': p.get('wrongWhy', []) if kind == 'mcq' else []}}
    if spec_ok:
        try: a['modelSpec'] = resolve_spec(p['model'], nums, vars_)
        except Exception: pass
    if kind == 'mcq':
        opts = [truth] + others[:3]; rng.shuffle(opts); a['options'] = opts; a['answer'] = opts.index(truth); a['why'] = why
    else:
        a['answers'] = [truth] + ([f'{float(ans):g}'] if ans.denominator != 1 and show(ans) != f'{float(ans):g}' else [])
    return a

total = 0
for lesson in facts['lessons']:
    key = lesson['id'][1:]
    if os.environ.get('ONLY_LESSON') and key != os.environ['ONLY_LESSON']: continue
    path = f'{W}/lessons/{key}.json'
    if not os.path.exists(path): continue
    data = json.load(open(path))
    if sum(1 for a in data['activities'] if a.get('gen', {}).get('steps')) >= 4: continue   # already has the new kind of problem
    templates = on_topic(lesson, lesson_problems(lesson))
    if not templates:      # the model gave nothing (quota, outage): never wipe a lesson's existing problems
        print(f'lesson {key}: no templates, left as it was', flush=True); continue
    data['activities'] = [a for a in data['activities'] if 'computed' not in a.get('tags', [])]
    def attempt(item):
        i, p = item
        try: return build(p, lesson, i)
        except Exception as e: print('  bad template', e, flush=True); return None
    with ThreadPoolExecutor(3) as ex: results = list(ex.map(attempt, list(enumerate(templates))))
    made = [a for a in results if a]
    made.sort(key=lambda a: a['difficulty'])            # warm-ups first, challenges last
    made = made[:PER_LESSON]
    n = len(data['activities'])
    for j, a in enumerate(made, 1): a['id'] = f'ch{N}-l{key}-c{j}'
    data['activities'] += made; total += len(made)
    json.dump(data, open(path, 'w'), indent=1, ensure_ascii=False)
    print(f'lesson {key}: {len(made)} computed problems kept (of {len(templates)} templates)', flush=True)
