import subprocess

A = 'public/engine/app.js'
a = open(A, encoding='utf-8').read()

# 1. split the rule out of wordCards so the finish screen can reuse the same list
old = """function wordCards(pack, lesson, activities, plays) {
  const terms = pack?.glossary?.terms;
  if (!terms?.length || lesson.isPractice || activities.length < 6) return [];
  const text = activities.map((a) => `${a.title || ''} ${a.body || ''} ${a.prompt || ''} ${a.explanation || ''}`).join(' ');
  const found = terms.filter((x) => x.term && x.meaning && x.term.length > 2 && text.includes(x.term));
  if (!found.length) return [];"""
new = """function lessonWords(pack, lesson, activities) {
  const terms = pack?.glossary?.terms;
  if (!terms?.length || lesson.isPractice || (activities || []).length < 6) return [];
  const text = activities.map((a) => `${a.title || ''} ${a.body || ''} ${a.prompt || ''} ${a.explanation || ''}`).join(' ');
  return terms.filter((x) => x.term && x.meaning && x.term.length > 2 && text.includes(x.term));
}

function wordCards(pack, lesson, activities, plays) {
  const found = lessonWords(pack, lesson, activities);
  if (!found.length) return [];"""
assert a.count(old) == 1, 'wordCards'
a = a.replace(old, new, 1)

# 2. and show them when the lesson is over, with the book's word page one tap away
anchor = """  box.append(...finishedNotes(s.lesson));"""
new_block = """  // The words this lesson used, said again at the end where they are freshest, and the whole book's words one tap away:
  // the word bank is the page they live on, and this is the moment a child knows which ones they just met.
  {
    const pack = packById(s.lesson.packId);
    const learnt = lessonWords(pack, s.lesson, s.lesson.activities).slice(0, 4);
    if (pack && learnt.length) {
      box.append(el('div', { class: 'celebrate__words' }, [
        el('p', { class: 'celebrate__words-title', text: t('wordsThisLesson') }),
        el('ul', { class: 'celebrate__word-list' }, learnt.map((w) => el('li', {}, [
          el('b', { text: w.term }),
          el('span', { text: w.meaning }),
        ]))),
        el('a', { class: 'catalogue-link', href: `/books/${pack.id}/glossary.html`, text: t('wordBankOpen') }),
      ]));
    }
  }
""" + anchor
assert a.count(anchor) == 1, 'finishedNotes anchor'
a = a.replace(anchor, new_block, 1)
open(A, 'w', encoding='utf-8').write(a)

# 3. the words for the new strings
I = 'public/engine/core/i18n.js'
import json
import re
s = open(I, encoding='utf-8').read()
TABLE = {
    'wordsThisLesson': ('Words from this lesson', 'इस पाठ के शब्द', 'ಈ ಪಾಠದ ಪದಗಳು'),
}
for idx, lang in enumerate(('en', 'hi', 'kn')):
    m = re.search(rf'\n  {lang}: \{{', s)
    end = s.index('\n  },', m.start())
    have = set(re.findall(r'\n    ([A-Za-z_]\w*):', s[m.start():end]))
    lines = [f"    {k}: {json.dumps(v[idx], ensure_ascii=False)}," for k, v in TABLE.items() if k not in have]
    if lines:
        s = s[:end] + '\n' + '\n'.join(lines) + s[end:]
open(I, 'w', encoding='utf-8').write(s)

for p in (A, I):
    r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
    print(p.split('/')[-1], 'syntax:', 'ok' if r.returncode == 0 else r.stderr[:300])
