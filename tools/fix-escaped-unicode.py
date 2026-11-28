#!/usr/bin/env python3
"""Repair characters a generator double-escaped, so a child reads `30°` and not `30\\u00b0`.

A model writing a lesson sometimes escapes a character twice: the JSON string ends up holding the six
literal characters `\\u00b0` instead of the degree sign. The file is valid JSON, so every checker passes,
and the card draws the escape. Found on 28 Nov 2026 in `work/sst6/ch01` — six strings, three lessons,
including a card whose whole job is teaching that `30\\u00b0` means thirty degrees.

  python3 tools/fix-escaped-unicode.py                 # what it would change, changes nothing
  python3 tools/fix-escaped-unicode.py --apply         # repair work/ sources and the packs
  python3 tools/fix-escaped-unicode.py --apply --only class6-sst

`work/sst6/ch01` is assembled by hand and never rewritten by the assembler, so a source fix there does
not reach the pack by itself; run this with --apply against the pack as well, then reassemble the book
and check the escapes are still zero.
"""
import argparse
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# Two backslashes then u: the generator escaped the character, then the JSON writer escaped the
# backslash. A single `\uXXXX` is an ordinary ASCII-escaped string (ensure_ascii output) and decodes
# correctly on read — 47,259 of those exist and must be left alone.
ESCAPE = re.compile(r'\\\\u([0-9a-fA-F]{4})')


def decode(match):
    code = int(match.group(1), 16)
    if code < 0x20:
        return match.group(0)          # a control character would break the JSON: leave it alone
    return chr(code)


def repair(path, apply):
    text = open(path, encoding='utf-8').read()
    found = ESCAPE.findall(text)
    if not found:
        return 0
    fixed = ESCAPE.sub(decode, text)
    json.loads(fixed)                 # refuse to write anything that stops being valid JSON
    if apply:
        open(path, 'w', encoding='utf-8').write(fixed)
    return len(found)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--only', help='one pack id, e.g. class6-sst')
    args = parser.parse_args()

    targets = sorted(glob.glob(f'{ROOT}/work/**/*.json', recursive=True))
    pattern = f'{ROOT}/public/content/packs/{args.only}/pack.json' if args.only else \
        f'{ROOT}/public/content/packs/*/pack.json'
    targets += sorted(glob.glob(pattern))

    total, touched = 0, 0
    for path in targets:
        try:
            n = repair(path, args.apply)
        except (json.JSONDecodeError, UnicodeDecodeError) as error:
            print(f'  skipped {os.path.relpath(path, ROOT)}: {error}')
            continue
        if n:
            total += n
            touched += 1
            print(f'  {os.path.relpath(path, ROOT)}: {n} escaped character(s)')
    verb = 'repaired' if args.apply else 'would repair'
    print(f'  {verb} {total} escaped character(s) in {touched} file(s)')
    sys.exit(1 if total and not args.apply else 0)


if __name__ == '__main__':
    main()
