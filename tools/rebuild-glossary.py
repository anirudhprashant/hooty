#!/usr/bin/env python3
"""Rebuild a book's glossary from its own lesson text, for a book whose glossary is unusable.

hindi-g10's glossary came out of a PDF that stored Devanagari in a legacy ASCII font: 41 of its 52 words read "mUeu" with
meanings to match, so no word in that book could ever be highlighted or tapped. The words have to be rebuilt.

Two designs were tried and the second one is what this does:

  * ask a model to pick the words from the fact sheet: it paraphrases, so its words are not in the text and match
    nothing. In the first run all 12 picks were rejected for that reason.
  * give the model the lesson text it is glossing, and **check every pick against that same text**. Its judgement about
    which words a Class 10 reader needs is good (दोहा, वात्सल्य, उपदेश, ब्रह्म were right); the check throws away the
    ones it paraphrased (दासता, शृंगार).

A term is kept only when it appears verbatim in the chapter's own text, is pure Devanagari, and its meaning is Devanagari
with no English letters. That is what makes it tappable.

  python3 tools/rebuild-glossary.py hindi-g10 [--ch=3] [--dry] [--show]
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from llm import m27  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PUB = os.path.join(ROOT, 'public')
DEVA = re.compile(r'[\u0900-\u097f]')
LATIN = re.compile(r'[A-Za-z]')

PROMPT = """You are glossing the vocabulary of one chapter of an NCERT Hindi textbook for Class {grade}.

Choose 8 to 12 words or short phrases from the chapter text below that a Class {grade} student may not know, or that the
chapter uses in a special way. Then write a short meaning for each, in simple Hindi.

Strict rules:
1. The word must be copied EXACTLY from the text below, in Devanagari, with no change of any vowel sign or letter.
2. Never choose the name of a person, place, book, festival or language.
3. Never choose a pronoun, a verb form, or a common everyday word.
4. The meaning is Hindi only, six to fourteen words, no English letters at all.

Reply with ONLY this JSON object, no commentary and no markdown fence:

{{"terms": [{{"term": "...", "meaning": "..."}}]}}

CHAPTER TEXT:
{text}
"""


def chapter_text(chapter):
    parts = []
    for l in chapter.get('lessons') or []:
        parts.append(str(l.get('title') or ''))
        for a in l.get('activities') or []:
            for k in ('body', 'prompt', 'explanation', 'title'):
                v = a.get(k)
                if isinstance(v, str):
                    parts.append(v)
            for k in ('keyPoints', 'options', 'steps'):
                v = a.get(k)
                if isinstance(v, list):
                    parts += [str(x) for x in v]
    return re.sub(r'\s+', ' ', ' '.join(parts)).strip()


def valid(term, meaning, text):
    if not (3 <= len(term) <= 40):
        return 'length'
    if not DEVA.search(term) or not DEVA.search(meaning):
        return 'script'
    if LATIN.search(term) or LATIN.search(meaning):
        return 'latin'
    if term not in text:
        return 'not in the chapter text'
    if not (3 <= len(meaning.split()) <= 16):
        return 'meaning length'
    return None


def build(slug, only=None, dry=False, show=False):
    pack = json.load(open(os.path.join(PUB, 'content/packs', slug, 'pack.json'), encoding='utf-8'))
    grade = str(pack.get('grade') or 10)
    work = os.path.join(ROOT, 'work', slug)
    kept_total = dropped_total = 0
    for num in sorted({int(d[2:]) for d in os.listdir(work) if re.match(r'^ch\d\d$', d)}):
        if only and num != only:
            continue
        chapter = None
        for u in pack['units']:
            for c in u['chapters']:
                if re.match(r'ch0*%d(?!\d)' % num, c.get('id') or ''):
                    chapter = c
        if not chapter:
            print(f'ch{num:02d}: no chapter in the pack')
            continue
        text = chapter_text(chapter)
        if len(text) < 400:
            print(f'ch{num:02d}: too little text ({len(text)} chars)')
            continue
        got = m27(PROMPT.format(grade=grade, text=text[:9000]))
        if not got or not isinstance(got, dict):
            print(f'ch{num:02d}: no reply')
            continue
        entries, dropped, seen = [], {}, set()
        for t in got.get('terms') or []:
            term = str(t.get('term') or '').strip()
            meaning = str(t.get('meaning') or '').strip()
            why = valid(term, meaning, text)
            if why:
                dropped[why] = dropped.get(why, 0) + 1
                continue
            if term in seen:
                continue
            seen.add(term)
            entries.append({'term': term, 'meaning': meaning, 'src': [{'ch': num, 'p': 0}]})
        kept_total += len(entries)
        dropped_total += sum(dropped.values())
        print(f'ch{num:02d}: kept {len(entries)}, dropped {sum(dropped.values())}{" " + str(dropped) if dropped else ""}')
        if show:
            for e in entries[:4]:
                print('    ', e['term'], '|', e['meaning'][:60])
        if dry or not entries:
            continue
        json.dump({'terms': entries}, open(os.path.join(work, f'ch{num:02d}', 'glossary.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1)
    print(f'words written: {kept_total}, dropped: {dropped_total}{" (dry run)" if dry else ""}')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    ch = next((int(a.split('=')[1]) for a in sys.argv[1:] if a.startswith('--ch=')), None)
    if not args:
        sys.exit('usage: rebuild-glossary.py <book-slug> [--ch=N] [--dry] [--show]')
    build(args[0], only=ch, dry='--dry' in sys.argv, show='--show' in sys.argv)
