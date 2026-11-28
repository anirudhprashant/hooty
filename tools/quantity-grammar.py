#!/usr/bin/env python3
"""One counted thing is singular: "1 children", "1 minutes", "1 rupees" are wrong.

The maths books were generated from a template that pasted a plural unit string after any number,
including 1, so the answer line of a counting question reads "The answer is 1 children." to a
six-year-old. This repairs the source chapters, not the built packs (packs/** is a build artefact).

    python3 tools/quantity-grammar.py --scan            # built packs: how many "1 <plural>" today
    python3 tools/quantity-grammar.py --scan --live     # same scan over the live site's packs
    python3 tools/quantity-grammar.py --fix             # rewrite the chapter sources under work/
    python3 tools/quantity-grammar.py --fix --dry-run   # print every change, write nothing

Only an explicit noun table is touched. "1 times 5", "1 fewer", "F1 children" and "Option 1 is" are
left alone on purpose; a blind s-stripper would break them.
"""
import argparse, glob, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# plural -> singular, only counted nouns. Reviewed against every "1 <word>" in the corpus.
NOUNS = {
    # units of measure
    'metres': 'metre', 'litres': 'litre', 'kilograms': 'kilogram', 'kilometres': 'kilometre',
    'centimetres': 'centimetre', 'millimetres': 'millimetre', 'millilitres': 'millilitre',
    'milligrams': 'milligram', 'grams': 'gram', 'tonnes': 'tonne', 'quintals': 'quintal',
    'rupees': 'rupee', 'hours': 'hour', 'minutes': 'minute', 'seconds': 'second',
    'days': 'day', 'weeks': 'week', 'months': 'month', 'years': 'year', 'degrees': 'degree',
    'coulombs': 'coulomb', 'joules': 'joule', 'volts': 'volt', 'ohms': 'ohm',
    'acres': 'acre', 'hectares': 'hectare', 'feet': 'foot', 'inches': 'inch',
    'miles': 'mile', 'yards': 'yard', 'units': 'unit', 'squares': 'square',
    # containers and servings
    'glasses': 'glass', 'cups': 'cup', 'spoons': 'spoon', 'spoonfuls': 'spoonful',
    'pinches': 'pinch', 'handspans': 'handspan', 'bottles': 'bottle', 'packets': 'packet',
    'boxes': 'box', 'bags': 'bag', 'sacks': 'sack', 'bowls': 'bowl', 'plates': 'plate',
    # people and animals
    'children': 'child', 'people': 'person', 'students': 'student', 'passengers': 'passenger',
    'farmers': 'farmer', 'teachers': 'teacher', 'players': 'player', 'workers': 'worker',
    'animals': 'animal', 'birds': 'bird', 'fish': 'fish', 'plants': 'plant', 'trees': 'tree',
    # things counted in the maths books
    'marbles': 'marble', 'laddoos': 'laddoo', 'rotis': 'roti', 'mangoes': 'mango',
    'apples': 'apple', 'bananas': 'banana', 'oranges': 'orange', 'eggs': 'egg',
    'tomatoes': 'tomato', 'flowers': 'flower', 'pots': 'pot', 'beads': 'bead',
    'buttons': 'button', 'airplanes': 'airplane', 'jumps': 'jump', 'points': 'point',
    'notes': 'note', 'cubes': 'cube', 'sides': 'side', 'circles': 'circle', 'tiles': 'tile',
    'groups': 'group', 'stickers': 'sticker', 'outcomes': 'outcome', 'cards': 'card',
    'positions': 'position', 'diyas': 'diya', 'scores': 'score', 'pictures': 'picture',
    'coins': 'coin', 'books': 'book', 'pencils': 'pencil', 'cars': 'car', 'toys': 'toy',
    'kites': 'kite', 'balls': 'ball', 'chairs': 'chair', 'tables': 'table', 'candles': 'candle',
    'sweets': 'sweet', 'chapattis': 'chapatti', 'chapatis': 'chapati', 'votes': 'vote',
    'runs': 'run', 'wickets': 'wicket', 'turns': 'turn', 'trials': 'trial',
    'questions': 'question', 'attempts': 'attempt', 'pieces': 'piece', 'members': 'member',
    'letters': 'letter', 'words': 'word', 'shapes': 'shape', 'edges': 'edge',
    'corners': 'corner', 'faces': 'face', 'rows': 'row', 'columns': 'column',
    # place value, written plural in the source by mistake
    'ones': 'one', 'tens': 'ten', 'hundreds': 'hundred', 'thousands': 'thousand',
}

# (?![\w]) so "1 months" inside a word never matches; the lookbehind keeps F1, 1.5, x1 out.
HIT = re.compile(r'(?<![A-Za-z0-9.])1 (' + '|'.join(sorted(NOUNS, key=len, reverse=True)) + r')\b')
HIT_ANY = re.compile(r'(?<![A-Za-z0-9.])1 ([A-Za-z]+s)\b')


def sub(text):
    def rep(m):
        w = m.group(1)
        s = NOUNS[w]
        if w[0].isupper():
            s = s.capitalize()
        return '1 ' + s
    return HIT.sub(rep, text)


def strings(o, path=''):
    if isinstance(o, str):
        yield path, o
    elif isinstance(o, dict):
        for k, v in o.items():
            yield from strings(v, f'{path}.{k}')
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from strings(v, f'{path}[{i}]')


def walk_rewrite(o, hits, where, dry):
    """Rewrite every string in a JSON tree in place; collect (where, before, after)."""
    if isinstance(o, dict):
        for k in list(o):
            o[k] = walk_rewrite(o[k], hits, where, dry)
        return o
    if isinstance(o, list):
        for i, v in enumerate(o):
            o[i] = walk_rewrite(v, hits, where, dry)
        return o
    if isinstance(o, str) and HIT.search(o):
        new = sub(o)
        for m in HIT.finditer(o):
            hits.append((where, m.group(0), '1 ' + (NOUNS[m.group(1)] if not m.group(1)[0].isupper() else NOUNS[m.group(1)].capitalize())))
        return new
    return o


UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36'}


def get_json(url):
    return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read())


def scan_packs(live=False):
    total, per, samples = 0, {}, []
    if live:
        base = 'https://hooty.org/content/packs/'
        books = live_books()
        load = lambda b: get_json(base + b + '/pack.json?scan=1')
    else:
        books = [os.path.basename(os.path.dirname(p)) for p in sorted(glob.glob(f'{ROOT}/public/content/packs/*/pack.json'))]
        load = lambda b: json.load(open(f'{ROOT}/public/content/packs/{b}/pack.json'))
    for b in books:
        try:
            d = load(b)
        except Exception as e:
            print('skip', b, e)
            continue
        n = 0
        for path, s in strings(d):
            for m in HIT.finditer(s):
                n += 1
                if len(samples) < 12:
                    samples.append(f'{b}{path}: ...{s[max(0, m.start()-45):m.end()+25]}...')
        if n:
            per[b] = n
            total += n
    return total, per, samples


def live_books():
    idx = get_json('https://hooty.org/content/index.json?scan=1')
    books = []
    for sub in idx.get('subjects', []):
        books.append(sub['pack'])
    return sorted(set(books))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--scan', action='store_true')
    ap.add_argument('--live', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()

    if a.scan:
        total, per, samples = scan_packs(a.live)
        print(f'{total} live "1 <plural>" sentences' if a.live else f'{total} "1 <plural>" sentences in the built packs')
        for b, n in sorted(per.items(), key=lambda x: -x[1]):
            print(f'  {b}: {n}')
        for s in samples:
            print('  e.g.', s)
        return 0 if total == 0 else 1

    if a.fix:
        hits = []
        files = sorted(glob.glob(f'{ROOT}/work/*/ch*/*/*.json')) + sorted(glob.glob(f'{ROOT}/work/*/ch*/*.json'))
        changed = 0
        for f in files:
            try:
                d = json.load(open(f))
            except Exception:
                continue
            before = len(hits)
            d = walk_rewrite(d, hits, os.path.relpath(f, ROOT), a.dry_run)
            if len(hits) > before:
                changed += 1
                if not a.dry_run:
                    json.dump(d, open(f, 'w'), ensure_ascii=False, indent=1)
        for where, old, new in hits:
            print(f'{where}: {old!r} -> {new!r}')
        print(f'{len(hits)} fixes in {changed} files' + (' (dry run, nothing written)' if a.dry_run else ''))
        return 0
    ap.print_help()
    return 2


if __name__ == '__main__':
    sys.exit(main())
