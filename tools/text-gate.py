#!/usr/bin/env python3
"""The gate that stops broken Hindi reaching a child, and the test that stops the gate going blind.

Two failures happened on 27 Nov and this file exists because of both:

1. A checker that only saw a displaced vowel when the extractor had left a space inside the word, so a
   rebuilt pack reported "0 lessons" while "भरूी" and "दसूरी" were still on the card. A checker nobody
   tests is a checker that can quietly stop seeing. `--self-test` runs known-broken and known-good
   strings through the detector: if a broken one sails through, or a correct one gets flagged, this
   fails loudly.
2. Text that was repaired in the source but never rebuilt for the site, so the site kept serving the
   older, broken build. `tools/publish.py` runs this before uploading and refuses to publish when the
   packs are worse than the last published baseline.

  python3 tools/text-gate.py --self-test        # the detector's own health, no packs needed
  python3 tools/text-gate.py                    # compare the built packs with the published baseline
  python3 tools/text-gate.py --update-baseline  # after a clean publish, record the new known-good state
"""
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BASELINE = f'{ROOT}/work/qa/hindi-baseline.json'


def detector_fingerprint():
    """Which checker measured the baseline. A stricter checker must never look like a regression."""
    import hashlib
    return hashlib.sha256(open(f'{HERE}/hindi-scan.py', 'rb').read()).hexdigest()[:12]

spec = importlib.util.spec_from_file_location('hindiscan', f'{HERE}/hindi-scan.py')
hindiscan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hindiscan)

repair_spec = importlib.util.spec_from_file_location('hindirepair', f'{HERE}/hindi-repair.py')
hindirepair = importlib.util.module_from_spec(repair_spec)
repair_spec.loader.exec_module(hindirepair)

# A reorder that moves a vowel onto the *next* consonant ("दसूरी" for "दूसरी") carries no shape a regex can
# prove — the letters are all legal, in a legal order. Only a word list can see it, so that layer is tested
# too: the repair must find the right word, and must refuse when the evidence is a coin toss.
WORD_VOCAB = {'दूसरी': 40, 'दसूरी': 1, 'दुनिया': 50, 'दनिया': 1, 'संध्या': 30}
WORD_CASES = [('दसूरी', 'दूसरी'), ('दनिया', 'दुनिया')]
WORD_REFUSALS = ['ज़रिएकी', 'क्क्क्क']

# Each of these was taken off the live site or out of the repaired sources. The left column must be
# caught; the right column is correct Hindi and must never be reported, or the gate would block good text.
BROKEN = [
    ('भरूी', 'reordered'),
    ('चदंा', 'reordered'),
    ('हम सधं ्या', 'detached'),
    ('बिल्कु ल भरू ी खादी।', 'detached'),
    ('रााजाा', 'doubled'),
    ('किताब\ufffd खोलो', 'replacement'),
]
CLEAN = [
    'दूसरी दुनिया',
    'मेहनत ही पूजा है प्रभु की',
    'श्रम का राग सुनाती चींटी।',
    'पढ़िए और समझिए।',
    'संस्कृत में लिखा है।',
    'बच्चों, ध्यान से सुनो।',
    'क्षेत्रफल और परिमाप',
    'हमें खेलना अच्छा लगता है।',
    'हिंदी की किताब',
    'किंतु वह नहीं आया।',
]


def self_test():
    failures = []
    for text, shape in BROKEN:
        found = hindiscan.anomalies(text)
        if shape not in found:
            failures.append(f'not caught ({shape}): {text!r} — saw {sorted(found) or "nothing"}')
    for text in CLEAN:
        found = hindiscan.anomalies(text)
        if found:
            failures.append(f'wrongly flagged ({sorted(found)}): {text!r}')

    # Layer two: the word matcher that catches a reorder no shape can prove.
    vocab = dict(WORD_VOCAB)
    anagrams, by_length = hindirepair.index(vocab)
    for broken, correct in WORD_CASES:
        fixed, how = hindirepair.repair_word(broken, vocab, anagrams, by_length)
        if fixed != correct:
            failures.append(f'word matcher left {broken!r} as {fixed!r} ({how}), wanted {correct!r}')
    for word in WORD_REFUSALS:
        fixed, how = hindirepair.repair_word(word, vocab, anagrams, by_length)
        if fixed is not None:
            failures.append(f'word matcher guessed {word!r} -> {fixed!r} ({how}), it must refuse')

    if failures:
        print('THE HINDI CHECKER IS NOT TRUSTWORTHY:')
        for line in failures:
            print('  ' + line)
        return 1
    print(f'hindi checker self-test: {len(BROKEN)} broken shapes caught, {len(CLEAN)} clean strings left alone, '
          f'{len(WORD_CASES)} reorders repaired, {len(WORD_REFUSALS)} guesses refused')
    return 0


def gate(update=False):
    rows = []
    for pack in sorted(__import__('glob').glob(f'{ROOT}/public/content/packs/hindi-*/pack.json')):
        book = os.path.basename(os.path.dirname(pack))
        rows.extend(hindiscan.scan_pack(pack, book))
    lessons = {(row['book'], row['lesson']) for row in rows}
    base = json.load(open(BASELINE)) if os.path.exists(BASELINE) else {}
    known = base.get('lessons')
    fingerprint = detector_fingerprint()
    if known is not None and base.get('detector') != fingerprint:
        # The checker itself changed: re-measure instead of calling the new strictness a regression.
        json.dump({'lessons': len(lessons), 'detector': fingerprint,
                   'note': 're-measured because the checker changed'}, open(BASELINE, 'w'), indent=1)
        print(f'text gate: checker changed, baseline re-measured at {len(lessons)} lessons '
              f'(was {known} under {base.get("detector")})')
        return 0

    if update:
        json.dump({'lessons': len(lessons), 'detector': fingerprint,
                   'packs': sorted({b for b, _ in lessons}),
                   'note': 'written by tools/publish.py after a clean publish'}, open(BASELINE, 'w'), indent=1)
        print(f'text gate: baseline updated to {len(lessons)} lessons with unreadable text')
        return 0

    if known is None:
        print(f'text gate: no baseline yet, {len(lessons)} lessons carry unreadable Devanagari')
        return 0
    if len(lessons) > known:
        worse = sorted(lessons)[:8]
        print(f'text gate: {len(lessons)} lessons carry unreadable Devanagari, baseline was {known}')
        for book, lesson in worse:
            print(f'  {book}/{lesson}')
        return 1
    print(f'text gate: {len(lessons)} lessons with unreadable text, baseline {known} — no worse')
    return 0


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        sys.exit(self_test())
    sys.exit(gate(update='--update-baseline' in sys.argv))
