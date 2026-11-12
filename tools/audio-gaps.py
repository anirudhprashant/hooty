#!/usr/bin/env python3
"""List voice clips the published books need but the manifest does not have.

Writes /tmp/audio-gaps.txt (slug<TAB>missing), /tmp/audio-need.txt (key.mp3 / key.json lines) and
/tmp/audio-have.txt (keys of the same books that already have clips, so a staging recorder can skip
them with placeholders instead of re-recording a whole book).
The text rules mirror tools/make-audio.py exactly; keep the two in step.
"""
import glob, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUD = os.path.join(ROOT, 'public', 'audio')


def key(text):
    h = 0x811c9dc5
    for b in text.encode('utf-8'):
        h ^= b
        h = (h * 0x01000193) & 0xffffffff
    return format(h, '08x')


plain = lambda s: str(s or '').replace('**', '')


def concept_lines(a):
    steps = [('say', t) for t in re.split(r'\n\s*\n', str(a.get('body') or '')) if t.strip()]
    if a.get('keyPoints'):
        steps.append(('points', a['keyPoints']))
    if a.get('explanation'):
        steps.append(('note', a['explanation']))
    for kind, v in steps:
        yield plain('. '.join(v) if kind == 'points' else v)


def pack_lines(path):
    p = json.load(open(path))
    d = os.path.dirname(path)
    for u in p['units']:
        for c in u['chapters']:
            for l in c['lessons'] + [c['boss']]:
                for a in l['activities']:
                    if a['type'] == 'concept':
                        yield from concept_lines(a)
                    if a['type'] == 'passage':
                        for para in (x for x in re.split(r'\n\s*\n', a['body']) if x.strip()):
                            yield plain(para)
    if p.get('glossary'):
        for t in json.load(open(os.path.join(d, p['glossary'])))['terms']:
            yield plain('%s. %s' % (t['term'], t['meaning']))


def main():
    have = set(json.load(open(os.path.join(AUD, 'manifest.json')))['keys'])
    live = {x['id'] for x in json.load(open(os.path.join(ROOT, 'public', 'content', 'index.json')))['packs']}
    gaps, need, known = [], set(), set()
    for f in sorted(glob.glob(os.path.join(ROOT, 'public', 'content', 'packs', '*', 'pack.json'))):
        if json.load(open(f)).get('id') not in live:
            continue   # a book still being built is not on the site yet
        keys = {key(t) for t in pack_lines(f) if t.strip()}
        miss = keys - have
        if miss:
            gaps.append((json.load(open(f))['id'], len(miss)))
            need |= miss
            known |= keys & have
    with open('/tmp/audio-gaps.txt', 'w') as f:
        for slug, n in gaps:
            f.write(f'{slug}\t{n}\n')
    with open('/tmp/audio-need.txt', 'w') as f:
        for k in sorted(need):
            f.write(k + '.mp3\n' + k + '.json\n')
    with open('/tmp/audio-have.txt', 'w') as f:
        for k in sorted(known):
            f.write(k + '\n')
    print(f"{len(need)} missing clips across {len(gaps)} books ({len(known)} existing clips in those books)")
    for slug, n in gaps:
        print(f'  {slug} {n}')


if __name__ == '__main__':
    main()
