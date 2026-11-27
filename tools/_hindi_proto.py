#!/usr/bin/env python3
"""Prototype: build a clean Hindi vocabulary and try repairing broken tokens."""
import json, glob, os, re, collections, sys

DEVCHAR = '\u0900-\u097f'
WORD = re.compile(f'[{DEVCHAR}]+')
STRIP = '\u0964\u0965'

REP = '\ufffd'
CON = '\u0915-\u0939\u0958-\u095f\u0979\u097a'
MAT = '\u093a-\u094c\u0951-\u0957\u0962\u0963'
HAL = '\u094d'
DETACHED_START = re.compile(r'[\s"\'(\\[{]+[' + MAT + HAL + r']')
SPACE_INSIDE = re.compile(f'[{CON}][{MAT}]?[\\s]+[{MAT}{HAL}]')
DOUBLED = re.compile(f'([{MAT}])\\1')
ZW = '\u200c\u200d\ufeff'
STRAY_ZW = re.compile(f'[{CON}][{ZW}][{CON}]')


def anomalies(text):
    f = set()
    if REP in text: f.add('replacement')
    if DETACHED_START.search(text) or SPACE_INSIDE.search(text): f.add('detached')
    if DOUBLED.search(text): f.add('doubled')
    if STRAY_ZW.search(text): f.add('zero-width')
    return f


def words_in(text):
    out = []
    for m in WORD.finditer(text):
        w = m.group(0).strip(STRIP)
        if w: out.append(w)
    return out


def walk_strings(v):
    if isinstance(v, str):
        yield v
    elif isinstance(v, dict):
        for x in v.values():
            yield from walk_strings(x)
    elif isinstance(v, list):
        for x in v:
            yield from walk_strings(x)


def build_vocab():
    vocab = collections.Counter()
    # clean strings from every hindi pack
    for p in glob.glob('public/content/packs/hindi-*/pack.json'):
        for s in walk_strings(json.load(open(p))):
            if anomalies(s): continue
            for w in words_in(s):
                vocab[w] += 1
    return vocab


if __name__ == '__main__':
    vocab = build_vocab()
    print('vocab types', len(vocab), 'tokens', sum(vocab.values()))
    # collect all anomalous words from sources
    bad = collections.Counter()
    for p in glob.glob('work/hindi-g*/ch*/**/*.json', recursive=True):
        try:
            data = json.load(open(p))
        except Exception:
            continue
        for s in walk_strings(data):
            if not anomalies(s): continue
            for w in words_in(s):
                bad[w] += 1
    print('bad word types', len(bad), 'tokens', sum(bad.values()))
    in_vocab = [w for w in bad if w in vocab]
    print('bad words already in vocab (should be rare):', len(in_vocab), in_vocab[:15])
    print('top bad:', bad.most_common(40))
