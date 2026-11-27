#!/usr/bin/env python3
"""List Hindi words Hooty prints that are not in the dictionary and rare in our own corpus.

These are the words the repair tool would not touch and a person should look at: a proper noun, a
dialect form, or a word the extractor scrambled in a way no rule can prove.
"""
import collections
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib.machinery import SourceFileLoader

hr = SourceFileLoader('hindi_repair', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hindi-repair.py')).load_module()

ROOT = hr.ROOT


def main():
    books = sys.argv[1:] or [f'hindi-g{i}' for i in range(1, 11)]
    vocab = hr.build_vocab(os.path.join(ROOT, 'public/content/packs/hindi-*/pack.json'))
    lexicon = hr.load_dictionary(hr.DICTIONARY)
    for book in books:
        path = os.path.join(ROOT, 'public/content/packs', book, 'pack.json')
        if not os.path.exists(path):
            continue
        data = json.load(open(path))
        unknown = collections.Counter()
        example = {}
        for text in hr.walk_strings(data):
            for word in hr.words_in(text):
                if word in lexicon or vocab.get(word, 0) >= 4:
                    continue
                if hr.anomalies(word):
                    continue
                unknown[word] += 1
                example.setdefault(word, text[:120])
        print(f'== {book}: {len(unknown)} words')
        for word, count in unknown.most_common():
            print(f'  {count:3} {word!r}   …{example[word]!r}')


if __name__ == '__main__':
    main()
