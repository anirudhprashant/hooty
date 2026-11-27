#!/usr/bin/env python3
"""Repair matra-scrambled Devanagari in Hooty's Hindi chapter sources.

The NCERT Hindi PDFs were read by a text extractor that reorders matras: "दूसरी दुनिया" arrives as
"दसूरी दनिया", "संध्या" as "सधं ्या", "भुट्टे" as "भटु ् टे". The corruption is in the source, so it is in
every card that quotes the book — word labs and cloze lines, exactly where a child is learning to read.

The tool repairs the source, never a hand-picked string, and only where the evidence is unambiguous:

  * a fragment that opens with a matra, halant or nukta cannot start a word, so it belongs to the word
    before it ("सधं ्या", "पथृ ्वी", "भटु ् टे");
  * the same letters in another order spell a real word ("दसूरी" -> "दूसरी", "मित्रूयाँ" -> "मूर्तियाँ");
  * a mark the extractor doubled collapses to one ("स्वाार्थथ" -> "स्वार्थ").

"What is a real word" comes from two places: a Hindi dictionary (hunspell-hi, kept out of the repo at
`work/qa/hindi-words.txt`; run `tools/hindi-words.sh` once to fetch it) and the Hindi Hooty already
prints (frequency from every pack). A word in the dictionary is never touched. A word Hooty uses
often is never touched. Anything that cannot be settled that way is left exactly as it is and listed
for a human.

  python3 tools/hindi-repair.py                  # report only, no writes
  python3 tools/hindi-repair.py --apply          # rewrite the source files that carry a change
  python3 tools/hindi-repair.py --apply --book hindi-g5
  python3 tools/hindi-repair.py --json out.json  # every change and every refusal

Files are edited as JSON-encoded strings inside the raw text, so indentation, key order and everything
else in a source file stay exactly as they were.
"""
import argparse
import collections
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DICTIONARY = os.path.join(ROOT, 'work', 'qa', 'hindi-words.txt')

REP = '\ufffd'
DEVCHAR = '\u0900-\u097f'
CON = '\u0915-\u0939\u0958-\u095f\u0979\u097a'
MAT = '\u093a-\u094c\u0951-\u0957\u0962\u0963'
HAL = '\u094d'
NUKTA = '\u093c'
ANUSVARA = '\u0902'
CHANDRABINDU = '\u0901'
DANDA = '\u0964\u0965'
ZW = '\u200c\u200d\ufeff'
QUOTES = '"\'“”‘’'

DETACHED_START = re.compile(r'[\s"\'(\[{]+[' + MAT + HAL + r']')
SPACE_INSIDE = re.compile(f'[{CON}][{MAT}]?[\\s]+[{MAT}{HAL}]')
DOUBLED = re.compile(f'([{MAT}{NUKTA}{ANUSVARA}{CHANDRABINDU}{HAL}])\\1')
STRAY_ZW = re.compile(f'[{CON}][{ZW}][{CON}]')
STRAY_QUOTE = re.compile(f'([{CON}\u0900-\u0904\u0906-\u0939])[{QUOTES}]+([{CON}\u0900-\u0904\u0906-\u0939])')
DEV = re.compile(f'[{DEVCHAR}\u200c\u200d]+')
MARKS = MAT + NUKTA + ANUSVARA + CHANDRABINDU + HAL
REP_CANDIDATES = list('कखगघचछजझटठडढतथदधनपफबभमयरलवशषसह' + 'ािीुूृेैोौंँ़्')

# Marks that may not open a word: they belong to the consonant before them.
OPENING = re.compile(f'^[{MARKS}]')


def anomalies(text):
    found = set()
    if REP in text:
        found.add('replacement')
    if DETACHED_START.search(text) or SPACE_INSIDE.search(text):
        found.add('detached')
    if DOUBLED.search(text):
        found.add('doubled')
    if STRAY_ZW.search(text):
        found.add('zero-width')
    return found


def walk_strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from walk_strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from walk_strings(item)


def words_in(text):
    """Devanagari words in a string; a danda that landed inside a word moves to its end."""
    out = []
    for match in DEV.finditer(text):
        word = match.group(0)
        inner = [ch for ch in word if ch in DANDA]
        if inner:
            word = ''.join(ch for ch in word if ch not in DANDA) + ''.join(inner)
        word = word.strip(DANDA)
        if word:
            out.append(word)
    return out


def collapse(word):
    """One mark where the extractor wrote two, and no joiner inside a conjunct."""
    prev = None
    word = re.sub(f'{HAL}[{ZW}]', HAL, word)
    while prev != word:
        prev = word
        word = DOUBLED.sub(r'\1', word)
        word = STRAY_ZW.sub(lambda m: m.group(0)[0] + m.group(0)[2], word)
    return word


def de_space(word):
    return re.sub(r'\s+', '', word)


# ---------------------------------------------------------------- reference

def load_dictionary(path):
    """Word forms from hunspell-hi, one per line, suffixes after '/' stripped."""
    words = set()
    if not os.path.exists(path):
        return words
    for line in open(path, encoding='utf-8'):
        form = line.strip().split('/')[0].strip()
        if form and not form.isdigit():
            words.add(form)
    return words


def build_vocab(pack_glob):
    """How often Hooty itself prints each Hindi word: the frequency evidence for a repair.

    Every token counts, even from a sentence with a broken word elsewhere; a token that is itself
    broken never does. Otherwise "लकड़ी" looks unknown because one sentence fields it beside a
    scrambled word, and gets "corrected" into something else.
    """
    vocab = collections.Counter()
    for path in glob.glob(pack_glob):
        for text in walk_strings(json.load(open(path))):
            for word in words_in(text):
                if anomalies(word):
                    continue
                vocab[word] += 1
    return vocab


def build_index(words):
    anagrams = collections.defaultdict(list)
    for word in words:
        anagrams[''.join(sorted(word))].append(word)
    by_len = collections.defaultdict(list)
    for word in words:
        by_len[len(word)].append(word)
    return anagrams, by_len


class Repairer:
    def __init__(self, vocab, lexicon, local, index, cases=None):
        self.vocab = vocab
        self.lexicon = lexicon
        self.local = local
        self.anagrams, self.by_len = index
        cases = cases or {}
        self.cases = cases.get('words', cases) if isinstance(cases, dict) else {}
        self.phrases = cases.get('phrases', {}) if isinstance(cases, dict) else {}
        self.memo = {}

    def good(self, word):
        """A real word: in the dictionary, or printed by Hooty several times."""
        return word in self.lexicon or self.vocab.get(word, 0) >= 10

    def known(self, word):
        return word in self.lexicon or self.vocab.get(word, 0) >= 4

    def repair_word(self, word, force=False):
        key = (word, force)
        if key not in self.memo:
            self.memo[key] = self._repair_word(word, force)
        return self.memo[key]

    def _repair_word(self, word, force=False):
        body, dandas = word, ''
        while body and body[-1] in DANDA:
            dandas = body[-1] + dandas
            body = body[:-1]
        if not body:
            return None
        # A danda the extractor dropped inside a word ("हू।ँ") belongs after it.
        if any(ch in DANDA for ch in body):
            dandas = ''.join(ch for ch in body if ch in DANDA) + dandas
            body = ''.join(ch for ch in body if ch not in DANDA)
            if not body:
                return None
        base = collapse(de_space(body))
        key = base.replace('\u200d', '').replace('\u200c', '')
        if key in self.cases:
            return self.cases[key] + dandas
        if dandas and word.strip(DANDA) + dandas != word and self.known(key):
            return key + dandas
        # A doubled mark or a stray joiner is never intended, so collapsing one needs no other evidence.
        if collapse(body) != body:
            return collapse(body) + dandas
        if key != body and self.known(key):
            return key + dandas
        if self.known(key):
            return None

        # Same letters, another order. Only a token Hooty never prints anywhere is reordered, and its
        # twin has to be a real word by a wide margin. A word Hooty prints a dozen times ("ताप",
        # "मजे", "दसूरी") is left alone and listed instead: the corpus cannot prove it wrong.
        own = self.vocab.get(key, 0)
        twins = [w for w in self.anagrams.get(''.join(sorted(key)), []) if w != key and self.good(w)]
        if twins and own == 0:
            twins.sort(key=lambda w: -self.vocab.get(w, 0))
            best = self.vocab.get(twins[0], 0)
            second = self.vocab.get(twins[1], 0) if len(twins) > 1 else 0
            if best >= 20 and best >= 8 * second:
                return twins[0] + dandas

        if REP in base:
            i = key.index(REP)
            variants = []
            # The lost character is often a whole conjunct ("क�ा" is "कक्षा"), so a wildcard match over
            # the dictionary is tried beside single-character substitutions.
            pattern = re.compile('^' + ''.join('.{1,3}' if ch == REP else re.escape(ch) for ch in key) + '$')
            wild = [w for w in self.lexicon if pattern.match(w)]
            if len(wild) == 1:      # a short word with many wildcard twins cannot be settled by a rule
                variants.extend(wild)
            for ch in REP_CANDIDATES:
                v = key[:i] + ch + key[i + 1:]
                if self.known(v):
                    variants.append(v)
            for span in (1, 2):
                for start in (i, max(0, i - 1)):
                    v = key[:start] + key[start + span:]
                    if REP not in v and self.known(v):
                        variants.append(v)
            variants = list(dict.fromkeys(variants))
            if len(variants) == 1:
                return variants[0] + dandas
            if variants:
                variants.sort(key=lambda w: -self.vocab.get(w, 0))
                if self.vocab.get(variants[0], 0) >= 5 * max(1, self.vocab.get(variants[1], 0)):
                    return variants[0] + dandas
            return None

        if not force:
            return None

        # Still broken, and one edit from a word the chapter itself spells correctly elsewhere
        # (दनिया -> दुनिया): a substitution never comes from the general dictionary alone.
        if len(key) < 3 and REP not in key:
            return None
        cands = [w for w in self.edit_one(key) if w in self.local and w in self.lexicon]
        if not cands:
            return None
        cands.sort(key=lambda w: -self.vocab.get(w, 0))
        top = cands[0]
        if all(self.vocab.get(w, 0) * 3 < self.vocab.get(top, 0) for w in cands[1:]):
            return top + dandas
        return None

    def edit_one(self, base):
        n = len(base)
        out = []
        for size in (n - 1, n, n + 1):
            for word in self.by_len.get(size, ()):
                if size == n:
                    diff = 0
                    for a, b in zip(word, base):
                        if a != b:
                            diff += 1
                            if diff > 1:
                                break
                    if diff == 1:
                        out.append(word)
                elif size == n + 1:
                    for i in range(size):
                        if word[:i] + word[i + 1:] == base:
                            out.append(word)
                            break
                else:
                    for i in range(n):
                        if base[:i] + base[i + 1:] == word:
                            out.append(word)
                            break
        return out

    # -- one string --------------------------------------------------------
    def repair_string(self, text):
        if not DEV.search(text):
            return text, []
        changed = []
        for bad in sorted(self.phrases, key=len, reverse=True):
            if bad in text:
                text = text.replace(bad, self.phrases[bad])
                changed.append((bad, self.phrases[bad]))
        clean = STRAY_QUOTE.sub(r'\1\2', text)
        if clean != text:
            changed.append((text, clean))
            text = clean
        runs = [[m.start(), m.end(), m.group(0), False] for m in DEV.finditer(text)]
        merged = []
        for run in runs:
            if merged:
                prev = merged[-1]
                gap = text[prev[1]:run[0]]
                if gap.strip() == '':
                    take = self.join(prev[2], run[2])
                    if take is not None:
                        changed.append((prev[2] + ' ' + run[2], take))
                        prev[2] = take
                        prev[1] = run[1]
                        prev[3] = True
                        continue
            merged.append(run)
        out, cursor = [], 0
        for start, end, core, forced in merged:
            out.append(text[cursor:start])
            fixed = self.repair_word(core, force=forced or bool(anomalies(core)))
            if fixed is not None and fixed != core:
                changed.append((core, fixed))
                core = fixed
            out.append(core)
            cursor = end
        out.append(text[cursor:])
        return ''.join(out), changed

    def join(self, core, ncore):
        """The word these two runs make, or None when they are two words, not one."""
        joined = core + ncore
        repaired = collapse(joined)
        # A fragment that opens with a mark cannot start a word: it belongs to the word before it.
        if OPENING.match(ncore) or REP in ncore:
            return repaired
        if not self.known(collapse(core)):
            if self.known(repaired):
                return repaired
            alt = self.repair_word(joined)
            return alt if alt and alt != joined else None
        # Two real words beside each other are two words, unless the split is brand new.
        if self.vocab.get(collapse(core), 0) <= 30:
            alt = self.repair_word(joined)
            freq = self.vocab.get(alt, 0) if alt else 0
            if alt and alt != joined and freq >= 20 and freq >= 5 * (
                    self.vocab.get(collapse(core), 0) + self.vocab.get(collapse(ncore), 0)):
                return alt
        return None


def local_vocabulary(directory):
    words = set()
    for path in glob.glob(os.path.join(directory, '**', '*.json'), recursive=True):
        try:
            data = json.load(open(path))
        except Exception:
            continue
        for text in walk_strings(data):
            for word in words_in(text):
                if not anomalies(word):
                    words.add(word)
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--book', action='append')
    ap.add_argument('--json')
    ap.add_argument('--limit', type=int, default=40)
    args = ap.parse_args()

    vocab = build_vocab(os.path.join(ROOT, 'public/content/packs/hindi-*/pack.json'))
    lexicon = load_dictionary(DICTIONARY)
    cases_path = os.path.join(ROOT, 'tools', 'hindi-repair-cases.json')
    cases = json.load(open(cases_path)) if os.path.exists(cases_path) else {}
    if not lexicon:
        print(f'no dictionary at {DICTIONARY}; run tools/hindi-words.sh first.\n'
              'Without it only joins and doubled marks can be repaired.', file=sys.stderr)
    index = build_index(set(lexicon) | {w for w, c in vocab.items() if c >= 2})
    print(f'reference: {len(vocab)} Hooty words, {len(lexicon)} dictionary words, {len(cases)} reviewed cases',
          file=sys.stderr)

    books = args.book or [f'hindi-g{i}' for i in range(1, 11)]
    changes_all, uncertain = [], []
    touched = 0

    for book in books:
        work = os.path.join(ROOT, 'work', book)
        if not os.path.isdir(work):
            continue
        for chdir in sorted(glob.glob(os.path.join(work, 'ch*'))):
            rep = Repairer(vocab, lexicon, local_vocabulary(chdir), index, cases)
            for path in sorted(glob.glob(os.path.join(chdir, '**', '*.json'), recursive=True)):
                raw = open(path, encoding='utf-8').read()
                try:
                    data = json.loads(raw)
                except Exception:
                    continue
                changes = []
                for text in walk_strings(data):
                    if not DEV.search(text):
                        continue
                    new, changed = rep.repair_string(text)
                    if changed:
                        changes.append((text, new))
                if not changes:
                    continue
                new_raw = raw
                for old, new in changes:
                    old_j = json.dumps(old, ensure_ascii=False)
                    new_j = json.dumps(new, ensure_ascii=False)
                    if old_j in new_raw:
                        new_raw = new_raw.replace(old_j, new_j)
                for old, new in changes:
                    row = {'file': os.path.relpath(path, ROOT), 'before': old, 'after': new}
                    changes_all.append(row)
                    if anomalies(new):
                        uncertain.append({**row, 'left': sorted(anomalies(new))})
                if new_raw != raw:
                    touched += 1
                    if args.apply:
                        open(path, 'w', encoding='utf-8').write(new_raw)

    print(f'strings changed: {len(changes_all)} in {touched} files')
    print(f'still carrying an anomaly after repair: {len(uncertain)}')
    for row in uncertain[:30]:
        print(f'  LEFT {row["file"]}: {row["after"][:150]!r} ({",".join(row["left"])})')
    for row in changes_all[:args.limit]:
        print(f'  {row["file"]}\n     - {row["before"][:150]}\n     + {row["after"][:150]}')
    if len(changes_all) > args.limit:
        print(f'  … {len(changes_all) - args.limit} more')
    if args.json:
        json.dump({'changes': changes_all, 'uncertain': uncertain}, open(args.json, 'w'), ensure_ascii=False, indent=1)
        print(f'written to {args.json}')


if __name__ == '__main__':
    main()
