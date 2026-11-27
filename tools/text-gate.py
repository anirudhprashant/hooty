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

# Each of these was taken off the live site or out of the repaired sources. The left column must be
# caught; the right column is correct Hindi and must never be reported, or the gate would block good text.
BROKEN = [
    ('दसूरी दनिया', 'reordered'),
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
    if failures:
        print('THE HINDI CHECKER IS NOT TRUSTWORTHY:')
        for line in failures:
            print('  ' + line)
        return 1
    print(f'hindi checker self-test: {len(BROKEN)} broken shapes caught, {len(CLEAN)} clean strings left alone')
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
