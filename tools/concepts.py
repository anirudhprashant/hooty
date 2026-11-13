#!/usr/bin/env python3
"""Link every question to the card that taught it, so a wrong answer can be re-taught at the exact point.

Each graded activity gains two small fields:

  anchor   id of the teaching card (concept, passage or worked) it was taught by
  focus    index into that card's points (key points, paragraphs or worked steps), or -1 when unsure

The retake in the app replays only that point, then asks a different question from the same card. A question is linked to
the best matching card that came before it in its lesson, and to the nearest one when the wording decides nothing. A chapter
challenge or test practice has no card of its own, so it is linked by the fact ids it came from, else by wording.

No text, id, answer or order is ever changed, and re-running simply recomputes both fields, so this is safe after any rebuild.

  python3 tools/concepts.py                  # every pack
  python3 tools/concepts.py class6-science   # one pack
  python3 tools/concepts.py --report         # sample the matches for reading
"""
import glob, json, math, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

TEACH = ('concept', 'passage', 'worked')
GRADED = {'mcq', 'truefalse', 'fillblank', 'matchpairs', 'dragorder', 'draglabel', 'typeanswer', 'listenpick', 'watchanswer'}

# Linking a question to the wrong key point is worse than linking it to the whole card, so a weak best match leaves focus
# unset and the child is shown the card's remember-list instead of one sentence that may not be the one.
FOCUS_MIN = 0.13
CARD_MIN = 0.10
ANCHOR_MIN = 0.07

STOP = set("""
a an the and or but if then than that this these those there here is are was were be been being have has had do does did
of in on at to for from by with without into over under about as it its they them their he she his her him we us our you your
i me my not no yes can could may might must shall should will would what which who whom whose when where why how all any both
each few more most other some such only own same so very too also just s t
""".split())


def tokens(text):
    out = set()
    for raw in re.split(r'[^0-9A-Za-z\u0900-\u097F]+', str(text or '').lower()):
        if len(raw) < 3 or raw in STOP:
            continue
        if raw.endswith('s') and not raw.endswith('ss') and len(raw) > 4:
            raw = raw[:-1]
        out.add(raw)
    return out


def paragraphs(body):
    return [p.strip() for p in re.split(r'\n\s*\n', str(body or '')) if p.strip()]


def question_text(a):
    parts = [a.get('prompt') or '', a.get('context') or '']
    t = a.get('type')
    if t == 'mcq' and isinstance(a.get('answer'), int) and a.get('options'):
        try:
            parts.append(a['options'][a['answer']])
        except IndexError:
            pass
    elif t in ('fillblank', 'typeanswer'):
        parts += [str(x) for x in (a.get('answers') or [])[:2]]
    elif t == 'matchpairs':
        parts += [x for p in (a.get('pairs') or []) for x in p if isinstance(x, str)]
    elif t == 'dragorder':
        parts += [x for x in (a.get('items') or []) if isinstance(x, str)]
    return ' '.join(parts)


def points_of(a):
    """The separately rememberable lines of a teaching card: its key points, paragraphs, or worked steps."""
    pts = []
    if a.get('type') == 'concept':
        pts = [p for p in (a.get('keyPoints') or []) if isinstance(p, str) and p.strip()]
        if not pts:
            pts = paragraphs(a.get('body'))
    elif a.get('type') == 'passage':
        pts = paragraphs(a.get('body'))
    elif a.get('type') == 'worked':
        pts = [s for s in (a.get('steps') or []) if isinstance(s, str) and s.strip()]
    if not pts:
        pts = [a.get('title') or a.get('kicker') or a.get('prompt') or '']
    return pts


def chapter_units(lessons):
    units = []
    for lesson in lessons:
        for i, a in enumerate(lesson.get('activities') or []):
            if a.get('type') not in TEACH or not a.get('id'):
                continue
            units.append({'id': a['id'], 'type': a['type'], 'pos': i, 'lesson': lesson.get('id'),
                          'title': a.get('title') or a.get('kicker') or '', 'points': points_of(a)})
    return units


def weights(units):
    df = {}
    for u in units:
        for p in u['points']:
            for t in tokens(p):
                df[t] = df.get(t, 0) + 1
    return df


def score(qt, pt, df, n):
    if not qt or not pt:
        return 0.0
    common = qt & pt
    if not common:
        return 0.0
    total = sum(math.log(1 + n / max(1, df.get(t, 1))) for t in qt)
    if not total:
        return 0.0
    return sum(math.log(1 + n / max(1, df.get(t, 1))) for t in common) / total


def best_point(unit, qtext, df, n, with_title=False):
    qt = tokens(qtext)
    title = tokens(unit.get('title')) if with_title else set()
    best, best_i = 0.0, -1
    for j, p in enumerate(unit['points']):
        s = score(qt, tokens(p) | title, df, n)
        if s > best:
            best, best_i = s, j
    return best_i, best


def nearest_chapter_unit(units, qtext, df, n, prefer_lessons=None):
    qt = tokens(qtext)
    best, best_u = 0.0, None
    for u in units:
        _, s = best_point(u, qtext, df, n, with_title=True)
        if prefer_lessons and u['lesson'] in prefer_lessons:
            s = min(1.0, s * 1.35)   # the fact ids say this lesson taught it
        if s > best:
            best, best_u = s, u
    return best_u, best


def fact_lessons(work_ch, lessons):
    """chapter facts -> {fact id: lesson id}, so a challenge question can be traced to the lesson that taught it."""
    path = os.path.join(work_ch, 'facts.json') if work_ch else ''
    if not path or not os.path.exists(path):
        return {}
    try:
        facts = json.load(open(path))
    except (OSError, ValueError):
        return {}
    suffix = {}
    for lesson in lessons:
        m = re.search(r'-(l\d+)$', str(lesson.get('id')))
        if m:
            suffix[m.group(1)] = lesson['id']
    out = {}
    for lesson in facts.get('lessons') or []:
        lid = suffix.get(str(lesson.get('id')))
        if not lid:
            continue
        for f in lesson.get('facts') or []:
            if f.get('id'):
                out[str(f['id'])] = lid
    return out


def choose_in_lesson(own, i, qtext, df, n):
    """The card a question was taught by: the best matching one before it, else the best after it, else the nearest."""
    before = [u for u in own if u['pos'] < i]
    after = [u for u in own if u['pos'] > i]
    pool = before or after
    if not pool:
        return None
    concepts = [u for u in pool if u['type'] == 'concept']
    if concepts:
        pool = concepts
    best, best_u = 0.0, None
    for u in pool:
        _, s = best_point(u, qtext, df, n, with_title=True)
        if s > best or (s == best and best_u is not None and u['pos'] > best_u['pos']):
            best, best_u = s, u
    if best_u is None or best < CARD_MIN:
        # wording decided nothing: the nearest card of the preferred kind is what the lesson meant
        near = [u for u in pool if u['pos'] < i] or pool
        best_u = max(near, key=lambda u: u['pos'])
    return best_u


def link_group(activities, lesson_id, own, chapter_units_, df, n, facts=None, boss=False):
    """Attach anchor and focus to every graded activity in one lesson (or one challenge)."""
    counts = {'linked': 0, 'chapter': 0, 'unlinked': 0}
    for i, a in enumerate(activities):
        if a.get('type') not in GRADED:
            continue
        if boss:
            target = None
        else:
            target = choose_in_lesson(own, i, question_text(a), df, n)
        if target is None:
            prefer = None
            if facts:
                owners = {facts[str(x)] for x in (a.get('f') or []) if str(x) in facts}
                prefer = owners or None
            target, best = nearest_chapter_unit(chapter_units_, question_text(a), df, n, prefer)
            if target is None or best < ANCHOR_MIN:
                target = None
            else:
                counts['chapter'] += 1
        if target is None:
            a.pop('anchor', None)
            a.pop('focus', None)
            counts['unlinked'] += 1
            continue
        a['anchor'] = target['id']
        a['focus'], _ = best_point(target, question_text(a), df, n)
        if a['focus'] < 0 or _ < FOCUS_MIN:
            a['focus'] = -1
        counts['linked'] += 1
    return counts


def validate(ch):
    """A dangling anchor would leave a wrong answer with nothing to re-read, so it is dropped here rather than shipped."""
    groups = list(ch.get('lessons') or []) + ([ch['boss']] if ch.get('boss') else [])
    cards = {a['id']: a for g in groups for a in (g.get('activities') or []) if a.get('type') in TEACH}
    broken = 0
    for g in groups:
        for a in g.get('activities') or []:
            if a.get('type') not in GRADED or not a.get('anchor'):
                continue
            card = cards.get(a['anchor'])
            pts = points_of(card) if card else []
            if not card or card['id'] == a['id'] or not pts:
                a.pop('anchor', None)
                a.pop('focus', None)
                broken += 1
                continue
            f = a.get('focus')
            if not isinstance(f, int) or f < -1 or f >= len(pts):
                a['focus'] = -1
    return broken


def link_chapter(ch, work_ch=None):
    lessons = ch.get('lessons') or []
    boss = ch.get('boss')
    groups = [(l.get('id'), l) for l in lessons]
    if boss:
        groups.append((ch.get('bossId') or boss.get('id'), boss))
    units = chapter_units([g[1] for g in groups])
    df = weights(units)
    n = len(units) or 1
    facts = fact_lessons(work_ch, [g[1] for g in groups])
    total = {'linked': 0, 'chapter': 0, 'unlinked': 0, 'broken': 0}
    for lid, lesson in groups:
        own = [u for u in units if u['lesson'] == lid]
        counts = link_group(lesson.get('activities') or [], lid, own, units, df, n, facts, boss=lesson is boss)
        for k in counts:
            total[k] += counts[k]
    total['broken'] = validate(ch)
    return total


def apply(pack, work_dir=None):
    """assemble-pack.py calls this just before writing. work_dir is the book's work folder (for facts.json)."""
    total = {'linked': 0, 'chapter': 0, 'unlinked': 0, 'broken': 0}
    for unit in pack.get('units') or []:
        for ch in unit.get('chapters') or []:
            m = re.search(r'ch(\d+)', str(ch.get('id')))
            work_ch = os.path.join(work_dir, f'ch{int(m.group(1)):02d}') if (work_dir and m) else None
            counts = link_chapter(ch, work_ch)
            for k in total:
                total[k] += counts[k]
    return (f"{total['linked']} linked ({total['chapter']} by wording), "
            f"{total['unlinked']} without a card, {total['broken']} dangling")


def main(argv):
    packs = [a for a in argv if not a.startswith('-')]
    report = '--report' in argv
    subjects = {}
    try:
        from subjects import SUBJECTS
        subjects = {s['pack']: os.path.join(ROOT, s['work']) for s in SUBJECTS.values()}
    except Exception:
        pass
    files = [f'{ROOT}/public/content/packs/{p}/pack.json' for p in packs] if packs \
        else sorted(glob.glob(f'{ROOT}/public/content/packs/*/pack.json'))
    changed = 0
    for f in files:
        if not os.path.exists(f):
            print('missing:', f)
            continue
        pack = json.load(open(f))
        msg = apply(pack, subjects.get(pack.get('id')))
        json.dump(pack, open(f, 'w'), indent=1, ensure_ascii=False)
        changed += 1
        print(f"{pack.get('id'):24s} {msg}")
        if report:
            show_sample(pack)
    print(f'{changed} packs linked')


def show_sample(pack, limit=6):
    """Print a few question -> card matches, for reading: the only real test of a link is that it makes sense."""
    shown = 0
    for unit in pack.get('units') or []:
        for ch in unit.get('chapters') or []:
            lessons = (ch.get('lessons') or []) + ([ch['boss']] if ch.get('boss') else [])
            cards = {a['id']: a for l in lessons for a in (l.get('activities') or []) if a.get('type') in TEACH}
            for l in lessons:
                for a in l.get('activities') or []:
                    if a.get('type') not in GRADED or a.get('anchor') not in cards:
                        continue
                    card = cards[a['anchor']]
                    pts = points_of(card)
                    f = a.get('focus', -1)
                    point = pts[f] if isinstance(f, int) and 0 <= f < len(pts) else '(whole card)'
                    print(f"  Q {a['type']:11s} {(a.get('prompt') or '')[:70]}")
                    print(f"    A {(str(a.get('answers') or '') if a['type'] != 'mcq' else a['options'][a['answer']])[:70]}")
                    print(f"    -> {card.get('title') or card['id']} [focus {f}]: {str(point)[:90]}")
                    shown += 1
                    if shown >= limit:
                        return


if __name__ == '__main__':
    main(sys.argv[1:])
