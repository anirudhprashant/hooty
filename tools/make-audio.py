#!/usr/bin/env python3
"""Pre-record every spoken line with Microsoft Edge's free neural voice (a friendly woman, American English).

The app reads concept cards and glossary meanings aloud. Browsers' built-in voices vary (often a man),
so we ship recorded clips instead: public/audio/<key>.mp3 plus manifest.json. The app falls back to
the browser voice for any line that has no clip.

Run from a network that Microsoft accepts (a home connection, not a datacentre):
  python3 -m venv /tmp/v && /tmp/v/bin/pip install edge-tts && /tmp/v/bin/python tools/make-audio.py

The key is a 32-bit FNV-1a hash of the spoken text (UTF-8) so the browser can compute the same one
(see clipKey in public/engine/core/dom.js). Keep the two in step, and keep the text rules in step with
concept.js and glossary.js ("lines" below mirrors what those files pass to say()).
"""
import asyncio, glob, json, os, re, sys
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'audio')
VOICE = os.environ.get('SPARKLE_VOICE', 'en-US-AvaMultilingualNeural')
VOICES = {'en': VOICE, 'hi': os.environ.get('SPARKLE_VOICE_HI', 'hi-IN-SwaraNeural')}  # a woman for each language
RATE = os.environ.get('SPARKLE_RATE', '-6%')

def key(text):
    h = 0x811c9dc5
    for b in text.encode('utf-8'):
        h ^= b
        h = (h * 0x01000193) & 0xffffffff
    return format(h, '08x')

plain = lambda s: str(s or '').replace('**', '')

def concept_lines(a):
    title = a.get('title') or a.get('prompt') or ''
    steps = [('say', t) for t in re.split(r'\n\s*\n', str(a.get('body') or '')) if t.strip()]
    if a.get('keyPoints'): steps.append(('points', a['keyPoints']))
    if a.get('explanation'): steps.append(('note', a['explanation']))
    for i, (kind, v) in enumerate(steps):
        text = '. '.join(v) if kind == 'points' else v
        yield plain(text)  # the title is on screen; Listen reads only what is in the bubble

def lines():
    for text, _lang in lines_with_lang(): yield text

def lines_with_lang():
    for pack in glob.glob(os.path.join(ROOT, 'public/content/packs/*/pack.json')):
        p = json.load(open(pack))
        lang = p.get('language', 'en')
        d = os.path.dirname(pack)
        for u in p['units']:
            for c in u['chapters']:
                for l in c['lessons'] + [c['boss']]:
                    for a in l['activities']:
                        if a['type'] == 'concept': yield from ((t, lang) for t in concept_lines(a))
                        if a['type'] == 'passage':
                            for k, para in enumerate(x for x in re.split(r'\n\s*\n', a['body']) if x.strip()):
                                yield (plain(para), lang)
        if p.get('glossary'):
            for t in json.load(open(os.path.join(d, p['glossary'])))['terms']:
                yield (plain('%s. %s' % (t['term'], t['meaning'])), lang)

async def one(sem, text, k, lang):
    """Record one line: <key>.mp3 plus <key>.json, the exact time of each spoken word, which the read-along follows."""
    path, marks_path = os.path.join(OUT, k + '.mp3'), os.path.join(OUT, k + '.json')
    if os.path.exists(path) and os.path.getsize(path) > 0 and os.path.exists(marks_path): return
    async with sem:
        for attempt in range(4):
            try:
                audio, marks = bytearray(), []
                async for ch in edge_tts.Communicate(text, VOICES.get(lang, VOICE), rate=RATE, boundary='WordBoundary').stream():
                    if ch['type'] == 'audio': audio += ch['data']
                    elif ch['type'] == 'WordBoundary': marks.append([round(ch['offset'] / 10000), ch['text']])  # 100ns units to ms
                if not audio: raise ValueError('no audio')
                open(path, 'wb').write(audio); json.dump(marks, open(marks_path, 'w'), ensure_ascii=False, separators=(',', ':'))
                return
            except Exception as e:
                print('retry', k, e, file=sys.stderr); await asyncio.sleep(2 + attempt * 3)
        raise SystemExit('failed: ' + text)

async def main():
    os.makedirs(OUT, exist_ok=True)
    try:  # a different voice means every old clip is wrong
        if json.load(open(os.path.join(OUT, 'manifest.json'))).get('voice') not in (VOICE, json.dumps(VOICES), json.dumps({'en': VOICE})):
            for f in glob.glob(os.path.join(OUT, '*.mp3')): os.remove(f)
    except FileNotFoundError: pass
    todo = {key(t): (t, lang) for t, lang in lines_with_lang() if t.strip()}
    sem = asyncio.Semaphore(6)
    await asyncio.gather(*(one(sem, t, k, lang) for k, (t, lang) in todo.items()))
    for f in glob.glob(os.path.join(OUT, '*.mp3')) + glob.glob(os.path.join(OUT, '*.json')):
        if os.path.basename(f).rsplit('.', 1)[0] not in todo and not f.endswith('manifest.json'): os.remove(f)
    json.dump({'voice': json.dumps(VOICES), 'keys': sorted(todo)}, open(os.path.join(OUT, 'manifest.json'), 'w'))
    print(len(todo), 'clips in', OUT)

asyncio.run(main())
