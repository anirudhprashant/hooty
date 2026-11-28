#!/usr/bin/env python3
"""List Hindi words Hooty prints that are not in the word list and rare in our own corpus.

These are the words the repair tool would not touch and a person should look at: a proper noun, a
dialect form, or a word the extractor scrambled in a way no rule can prove. It is the companion to the
`review:` list `tools/hindi-repair.py` prints, read from the shipped packs instead of the sources, so it
also catches a word that arrived in a pack without passing the repair.

    python3 tools/hindi-residue.py [hindi-g5 …]
"""
import collections
import glob
import json
import os
import sys
from importlib.machinery import SourceFileLoader

hr = SourceFileLoader('hindi_repair', os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                                   'hindi-repair.py')).load_module()

ROOT = hr.ROOT


def main():
    books = sys.argv[1:] or [f'hindi-g{i}' for i in range(1, 11)]
    dictionary = set()
    words_file = f'{ROOT}/work/qa/hindi-words.txt'
    if os.path.exists(words_file):
        dictionary = {line.strip().split()[0] for line in open(words_file, encoding='utf-8') if line.strip()}
    else:
        print('no work/qa/hindi-words.txt — run tools/hindi-words.sh first; every word will look unknown', file=sys.stderr)
    vocab = hr.load_vocabulary(books)
    for book in books:
        path = f'{ROOT}/public/content/packs/{book}/pack.json'
        if not os.path.exists(path):
            continue
        data = json.load(open(path, encoding='utf-8'))
        unknown = collections.Counter()
        example = {}
        for text in hr.strings(data):
            for word in hr.tokens(text):
                bare = word.strip('।॥"\'(),;?!“”‘’')
                if len(bare) < 2 or bare in dictionary or vocab.get(bare, 0) >= 4:
                    continue
                if hr.anomalies(bare):
                    continue
                unknown[bare] += 1
                example.setdefault(bare, text[:120])
        print(f'== {book}: {len(unknown)} words not in the word list and rare in our corpus')
        for word, count in unknown.most_common():
            print(f'  {count:3} {word!r}   …{example[word]!r}')


if __name__ == '__main__':
    main()
