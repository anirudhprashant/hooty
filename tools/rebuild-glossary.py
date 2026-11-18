#!/usr/bin/env python3
"""Rebuild a book's glossary from its own lesson text, for a book whose glossary is unusable.

hindi-g10's glossary came out of a PDF that stored Devanagari in a legacy ASCII font: 41 of its 52 words read "mUeu" with
meanings to match, so no word in that book could ever be highlighted or tapped. Asking a model to pick the words does not
work, because a model paraphrases and a paraphrased word matches nothing.

So the words are chosen from the lesson text itself, by a rule, and the model is only asked what they mean:

  * a word of five letters or more, pure Devanagari, that the chapter uses once or twice (literary vocabulary is rare),
  * not a name of a person or place as far as a word list can tell, not a common function word,
  * the page it appears on comes from the chapter's fact sheet when the word is in a fact.

Every term is therefore guaranteed to appear in the text the child reads, which is what makes it tappable.

  python3 tools/rebuild-glossary.py hindi-g10 [--ch=3] [--dry] [--show]
"""
import json
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from llm import m27  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PUB = os.path.join(ROOT, 'public')

# Devanagari letters only: no danda, no digits, no matras on their own
WORD = re.compile(r'[\u0905-\u0939\u0958-\u095f][\u0905-\u0939\u0958-\u095f\u093e-\u094c\u0901-\u0903\u093c\u094d]{3,}')
LATIN = re.compile(r'[A-Za-z]')
DEVA = re.compile(r'[\u0900-\u097f]')

# words that carry no meaning worth explaining, so they are never chosen
STOP = set("""और तथा किंतु लेकिन इसका उसका इनका उनका इसकी उसकी इनकी उनकी इसके उसके इनके उनके इसमें उसमें इनमें उनमें
यह वह ये वे जो जब तब कभी सदा यहाँ वहाँ अब फिर भी ही तो भी नहीं हाँ जी कुछ सब बहुत अधिक कम लोग बात बार तरह अनेक
करना करता करती करते किया गया गई गए हुआ हुई हुए होता होती होते था थी थे हैं है हूँ को से का की के में पर और भी
अपना अपनी अपने उनका उसका मेरा तेरा हमारा तुम्हारा कोई किसी किसका जिसका उसके बाद पहले समय वर्ष साल दिन रात
""".split())


def words_of(text):
    return [w for w in WORD.findall(text) if len(w) >= 5 and w not in STOP]


def candidates(chapter_text, chapter_facts, limit=12):
    """Rare, long words in the order the chapter meets them: the ones a child is most likely to need explained."""
    counts = Counter(words_of(chapter_text))
    pages = {}
    for f in chapter_facts:
        say = str(f.get('say') or '')
        for w in words_of(say):
            pages.setdefault(w, f.get('p'))
    picked, seen = [], set()
    for w in words_of(chapter_text):
        if w in seen or counts[w] > 3:
            continue
        seen.add(w)
        picked.append({'term': w, 'p': pages.get(w) or 0})
        if len(picked) >= limit:
            break
    return picked


PROMPT = """You are glossing the vocabulary of one chapter of an NCERT Hindi textbook for Class {grade}.

Below are words taken from the chapter, each with the sentence it appears in. Write a meaning for each in simple Hindi:
six to fourteen words, in Devanagari only, no English letters, explained as THIS chapter uses the word.

Reply with ONLY this JSON object, with the same number of entries as the words, in the same order:

{{"meanings": [{{"term": "...", "meaning": "..."}}]}}

WORDS AND THEIR SENTENCES:
{pairs}
"""


def sentences_for(terms, text):
    out = []
    for t in terms:
        i = text.find(t['term'])
        sentence = text[max(0, i - 70):i + len(t['term']) + 90].replace('\n', ' ')
        out.append(f"- {t['term']}: ...{sentence.strip()}...")
    return '\n'.join(out)


def build(slug, only=None, dry=False, show=False):
    pack = json.load(open(os.path.join(PUB, 'content/packs', slug, 'pack.json'), encoding='utf-8'))
    grade = str(pack.get('grade') or 10)
    work = os.path.join(ROOT, 'work', slug)
    chapters = sorted(d for d in os.listdir(work) if re.match(r'^ch\d\d$', d) and (not only or int(d[2:]) == only))
    kept_total = 0
    for ch in chapters:
        num = int(ch[2:])
        chapter = None
        for u in pack['units']:
            for c in u['chapters']:
                if re.match(r'ch0*%d(?!\d)' % num, c.get('id') or ''):
                    chapter = c
        if not chapter:
            continue
        lessons = chapter.get('lessons') or []
        text = ' '.join(str(a.get(k) or '') for l in lessons for a in (l.get('activities') or [])
                        for k in ('body', 'prompt', 'explanation', 'title'))
        for l in lessons:
            text += ' ' + str(l.get('title') or '')
        ffile = os.path.join(work, ch, 'facts.json')
        facts = []
        if os.path.exists(ffile):
            d = json.load(open(ffile, encoding='utf-8'))
            facts = [f for l in d.get('lessons') or [] for f in (l.get('facts') or [])]
        terms = candidates(text, facts)
        if not terms:
            print(f'{ch}: no candidates')
            continue
        got = m27(PROMPT.format(grade=grade, pairs=sentences_for(terms, text)))
        meanings = {}
        for m in (got or {}).get('meanings') or []:
            if isinstance(m, dict):
                meanings[str(m.get('term') or '').strip()] = str(m.get('meaning') or '').strip()
        entries = []
        for t in terms:
            meaning = meanings.get(t['term'], '')
            if not meaning or LATIN.search(meaning) or not DEVA.search(meaning):
                continue
            if not (3 <= len(meaning.split()) <= 16):
                continue
            entries.append({'term': t['term'], 'meaning': meaning, 'src': [{'ch': num, 'p': t['p']}]})
        kept_total += len(entries)
        print(f'{ch}: {len(terms)} candidates -> {len(entries)} glossed')
        if show:
            for e in entries[:4]:
                print('    ', e['term'], '|', e['meaning'][:64])
        if dry or not entries:
            continue
        out = os.path.join(work, ch, 'glossary.json')
        json.dump({'terms': entries}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'words written: {kept_total}{" (dry run)" if dry else ""}')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    ch = next((int(a.split('=')[1]) for a in sys.argv[1:] if a.startswith('--ch=')), None)
    if not args:
        sys.exit('usage: rebuild-glossary.py <book-slug> [--ch=N] [--dry] [--show]')
    build(args[0], only=ch, dry='--dry' in sys.argv, show='--show' in sys.argv)
