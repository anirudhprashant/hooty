"""The word bank: every word Hooty stops to explain, as pages a parent can browse and search.

A child meets a word inside a lesson and taps it. Nothing on the site could answer "what does 'village council' mean?"
or "which book explains 'photosynthesis'?" — and the site had 7,454 words sitting in the books with no page of their
own. This builds:

  /glossary/                     the index: search, A-Z, and one entry per book
  /glossary/<letter>.html        every word starting with that letter
  /glossary/index.json           the search data, fetched only when someone types
  /glossary/word-search.js       the search, written like /books/books-search.js so it feels the same
  /books/<slug>/glossary.html    the words of one book, in chapter order

Style: the same shell and classes as /books/ (books.css), so it reads as part of the same site.

  python3 tools/glossary-pages.py [--only=glossary]
"""
import glob
import html
import importlib.util
import json
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public')
SITE = 'https://hooty.org'

# the shell, the sitemap date and the slug rules come from the books generator so the two cannot drift apart
_spec = importlib.util.spec_from_file_location('landing_pages', os.path.join(ROOT, 'tools', 'landing-pages.py'))
lp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(lp)
esc = lp.esc
TODAY = lp.TODAY

MONTHS = None
LETTERS = [chr(c) for c in range(ord('a'), ord('z') + 1)]


def devanagari_letter(term):
    """Words in Hindi books sort by the Devanagari letter they begin with. A word that starts with a vowel sign rather
    than a full letter (rare in the first position) is filed under the sign's vowel."""
    if not term:
        return None
    ch = term[0]
    if '\u0901' <= ch <= '\u097f':
        return ch
    return None


def books():
    """Every book with a glossary, in the site's own order."""
    idx = json.load(open(os.path.join(PUB, 'content/index.json'), encoding='utf-8'))
    order = [p['id'] for p in idx['packs']]
    out = []
    for f in glob.glob(os.path.join(PUB, 'content/packs/*/pack.json')):
        d = json.load(open(f, encoding='utf-8'))
        gfile = os.path.join(os.path.dirname(f), d.get('glossary') or 'glossary.json')
        if not os.path.exists(gfile):
            continue
        terms = json.load(open(gfile, encoding='utf-8'))
        terms = terms.get('terms') if isinstance(terms, dict) else terms
        if not terms:
            continue
        d['_terms'] = terms
        d['_order'] = order.index(d['id']) if d['id'] in order else 999
        out.append(d)
    out.sort(key=lambda d: d['_order'])
    return out


def chapter_href(book, ch):
    """The chapter page a word came from, so a parent can open the lesson it belongs to."""
    for u in book.get('units') or []:
        for c in u.get('chapters') or []:
            m = re.search(r'ch0*(\d+)', c.get('id') or '')
            if m and ch and int(m.group(1)) == int(ch):
                return f"{SITE}/books/{book['id']}/{lp.page_slug(c)}.html"
    return None


def records(bs):
    """One record per word, merging the same word and meaning across books into one entry with several sources."""
    seen = {}
    order = []
    for book in bs:
        lang = book.get('language', 'en')
        title = book.get('title') or book['id']
        for t in book['_terms']:
            term = (t.get('term') or '').strip()
            meaning = (t.get('meaning') or '').strip()
            if not term or not meaning:
                continue
            key = (term.lower(), meaning.lower())
            src = (t.get('src') or [{}])[0]
            where = {'book': book['id'], 'title': title, 'grade': str(book.get('grade')), 'subject': book.get('subject') or '',
                     'lang': lang, 'ch': src.get('ch'), 'p': src.get('p'), 'href': chapter_href(book, src.get('ch')),
                     'page': f"/books/{book['id']}/glossary.html"}
            if key in seen:
                rec = seen[key]
                if not any(s['book'] == where['book'] and s['ch'] == where['ch'] for s in rec['sources']):
                    rec['sources'].append(where)
                if t.get('example') and not rec['example']:
                    rec['example'] = t['example']
                for a in (t.get('aka') or []):
                    if a not in rec['aka']:
                        rec['aka'].append(a)
                continue
            rec = {'term': term, 'aka': list(t.get('aka') or []), 'meaning': meaning, 'example': t.get('example') or '',
                   'lang': lang, 'sources': [where],
                   'letter': (term[0].lower() if term[0].isascii() and term[0].isalpha() else None),
                   'hl': devanagari_letter(term)}
            seen[key] = rec
            order.append(key)
    return [seen[k] for k in order]


def word_card(rec, in_book=False):
    """One word, in the same card the rest of the site uses. On a book page the chapter and the book are the page's own
    headings, so the card says only which page to turn to."""
    src = rec['sources'][0]
    more = len(rec['sources']) - 1
    parts = [
        '<div class="card">',
        f"<h3>{esc(rec['term'])}</h3>",
    ]
    if rec['aka']:
        parts.append(f'<div class="meta">also: {esc(", ".join(rec["aka"]))}</div>')
    parts.append(f"<p>{esc(rec['meaning'])}</p>")
    if rec['example']:
        parts.append(f'<p class="note">{esc(rec["example"])}</p>')
    if in_book:
        where = f"page {src['p']}" if src['p'] else ''
        if more:
            where += f"; also in {more} other book{'' if more == 1 else 's'}"
    else:
        where = f"{esc(src['subject'])}, Class {esc(src['grade'])}"
        if src['ch']:
            where += f" · Chapter {src['ch']}"
            if src['p']:
                where += f", page {src['p']}"
        if src['href']:
            where = f'<a href="{src["href"]}">{where}</a>'
        if more:
            where += f" and {more} other book{'' if more == 1 else 's'}"
    if where:
        parts.append(f'<div class="meta">{where}</div>')
    parts.append('</div>')
    return ''.join(parts)


def count_by(items, key):
    out = {}
    for r in items:
        k = key(r)
        if k:
            out[k] = out.get(k, 0) + 1
    return out


def search_json(recs):
    """Fetched only when someone types. A book's name and class repeat on every one of its words, so they are written
    once and each word points at them by id: that is about a fifth of the file saved."""
    books_seen = {}
    rows = []
    for r in recs:
        s = r['sources'][0]
        # The result line shows about 120 characters, so the rest of a long meaning is weight nobody reads.
        meaning = r['meaning'] if len(r['meaning']) <= 120 else r['meaning'][:117].rstrip() + '…'
        books_seen.setdefault(s['book'], [s['title'], s['subject'], s['grade'], s['lang']])
        rows.append([r['term'], meaning, s['page'], s['book'], s['ch'] or 0, s['p'] or 0])
    return {'books': books_seen, 'words': rows}


SEARCH_JS = r"""// Word bank search. Written the same way as /books/books-search.js: nothing loads until someone types, and the page
// stays readable without JavaScript because every word already has its own place on the letter pages.
(function () {
  var input = document.getElementById('word-search');
  var results = document.getElementById('word-results');
  var status = document.getElementById('word-search-status');
  if (!input || !results) return;

  var words = null;
  var loading = null;

  function load() {
    if (words) return Promise.resolve(words);
    if (!loading) {
      loading = fetch('/glossary/index.json')
        .then(function (r) { if (!r.ok) throw new Error('index ' + r.status); return r.json(); })
        .then(function (data) {
          var books = data.books || {};
          words = (data.words || []).map(function (row) {
            var b = books[row[3]] || [];
            return { term: row[0], meaning: row[1], page: row[2], book: row[3], chapter: row[4], pno: row[5],
                     title: b[0] || '', subject: b[1] || '', grade: b[2] || '', lang: b[3] || 'en' };
          });
          return words;
        })
        .catch(function () { words = []; return words; });
    }
    return loading;
  }

  function line(w) {
    var li = document.createElement('li');
    li.className = 'result';
    var a = document.createElement('a');
    a.href = w.page;
    a.textContent = w.term;
    var meta = document.createElement('span');
    meta.className = 'result__meta';
    meta.textContent = w.meaning;
    var from = document.createElement('span');
    from.className = 'result__meta';
    from.textContent = (w.title || 'Hooty') + (w.chapter ? ' · chapter ' + w.chapter : '') + (w.pno ? ', page ' + w.pno : '')
      + (w.more ? ' and ' + w.more + ' more book' + (w.more === 1 ? '' : 's') : '');
    li.appendChild(a);
    li.appendChild(meta);
    li.appendChild(from);
    results.appendChild(li);
  }

  function show(text) {
    var q = text.trim().toLowerCase();
    results.innerHTML = '';
    if (q.length < 2) { status.textContent = words ? words.length + ' words ready to search.' : ''; return; }
    load().then(function (rows) {
      var starts = [];
      var has = [];
      for (var i = 0; i < rows.length; i++) {
        var t = rows[i].term.toLowerCase();
        if (t === q) { starts.unshift(rows[i]); continue; }
        if (t.indexOf(q) === 0 || t.indexOf(q) > -1) starts.push(rows[i]);
        else if (rows[i].meaning.toLowerCase().indexOf(q) > -1) has.push(rows[i]);
      }
      var all = starts.concat(has);
      var seenTerm = {};
      var unique = [];
      all.forEach(function (w) {
        var k = w.term.toLowerCase();
        if (seenTerm[k]) { seenTerm[k].more += 1; return; }
        seenTerm[k] = w;
        w.more = 0;
        unique.push(w);
      });
      unique.slice(0, 25).forEach(line);
      status.textContent = unique.length
        ? 'Showing ' + Math.min(unique.length, 25) + ' of ' + unique.length + ' words.'
        : 'No word like that. Try a shorter part of it.';
    });
  }

  var timer = null;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { show(input.value); }, 120);
  });
  input.addEventListener('focus', function () {
    // the data is 7,000 words, so it waits for a real intention instead of arriving with the page
    load().then(function (rows) { if (!status.textContent) status.textContent = rows.length + ' words ready to search.'; });
  });
})();
"""


def letter_grid(letters, current=None):
    """The alphabet as a grid of tiles: the letter big, its count small. A wrapped list of pills read as noise; this
    reads as an index, which is what it is."""
    cells = ''.join(
        f'<a class="{"is-on" if current == l else ""}" href="/glossary/{l}.html">{l.upper()}'
        f'<span class="note">{letters[l]:,}</span></a>'
        for l in LETTERS if letters.get(l))
    return f'<div class="letters">{cells}</div>'


def build():
    bs = books()
    recs = records(bs)
    total = len(recs)
    en = [r for r in recs if r['lang'] == 'en']
    hi = [r for r in recs if r['lang'] == 'hi']
    per_book = {b['id']: len(b['_terms']) for b in bs}
    letters = count_by(en, lambda r: r['letter'])
    hl = count_by(hi, lambda r: r['hl'])

    out_dir = os.path.join(PUB, 'glossary')
    os.makedirs(out_dir, exist_ok=True)
    urls = []

    # --- the search data and its script ----------------------------------------------------------------
    with open(os.path.join(out_dir, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(search_json(recs), f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(out_dir, 'word-search.js'), 'w', encoding='utf-8') as f:
        f.write(SEARCH_JS)

    # --- letter pages ----------------------------------------------------------------------------------
    body_head = '<div class="crumbs"><a href="/">Hooty</a> / <a href="/glossary/">Word bank</a></div>'
    for letter in LETTERS:
        words = sorted([r for r in en if r['letter'] == letter], key=lambda r: (r['term'].lower(), r['meaning']))
        if not words:
            continue
        rail = letter_grid(letters, letter)
        idx = LETTERS.index(letter)
        prev_l = next((l for l in reversed(LETTERS[:idx]) if letters.get(l)), None)
        next_l = next((l for l in LETTERS[idx + 1:] if letters.get(l)), None)
        nav = ''
        if prev_l or next_l:
            nav = '<p>' + (f'<a class="cta cta--quiet" href="/glossary/{prev_l}.html">← {prev_l.upper()}</a> ' if prev_l else '') + \
                  (f'<a class="cta cta--quiet" href="/glossary/{next_l}.html">{next_l.upper()} →</a>' if next_l else '') + '</p>'
        body = (body_head
                + f'<h1>Words that start with {letter.upper()}</h1>'
                + f'<p class="lede">{len(words):,} words, explained in plain language, with the book and the page each one '
                  f'comes from.</p>'
                + rail
                + ''.join(word_card(r) for r in words)
                + nav)
        title = f'Words that start with {letter.upper()} — Hooty word bank'
        path = f'/glossary/{letter}.html'
        open(os.path.join(out_dir, f'{letter}.html'), 'w', encoding='utf-8').write(
            lp.page(title, f'{len(words)} words beginning with {letter.upper()}, each explained in plain language and '
                            f'linked to the chapter it comes from.', path, body,
                    script='<script src="/glossary/word-search.js" defer></script>'))
        urls.append((f'{SITE}{path}', TODAY))

    # --- the index -------------------------------------------------------------------------------------
    rail = letter_grid(letters)
    by_class = {}
    for b in bs:
        by_class.setdefault(str(b.get('grade')), []).append(b)
    book_cards = []
    for grade in sorted(by_class, key=lambda g: int(g) if g.isdigit() else 99):
        book_cards.append(f'<h2 class="grade">Class {esc(grade)}</h2>')
        for b in by_class[grade]:
            n = per_book.get(b['id'], 0)
            book_cards.append(
                f'<div class="card"><h3><a href="/books/{b["id"]}/glossary.html">{esc(b.get("title") or b["id"])}</a></h3>'
                f'<div class="meta">{n:,} words</div></div>')
    hindi_rail = ''
    if hi:
        hindi_books = sorted([b for b in bs if b.get('language') == 'hi'],
                             key=lambda b: int(b.get('grade') or 0))
        hindi_rail = '<div class="books-grid">' + ''.join(
            f'<a class="pill" href="/books/{b["id"]}/glossary.html">{esc(b.get("title") or b["id"])}'
            f'<span class="note">{per_book.get(b["id"], 0)} words</span></a>' for b in hindi_books) + '</div>'

    body = (
        body_head
        + '<h1>The word bank</h1>'
        + f'<p class="lede">Every word Hooty stops to explain while your child reads: {total:,} words from {len(bs)} '
          f'books, each in plain language, with the chapter and page it came from. Free, no ads, no sign-up.</p>'
        + '<div class="searchbox">'
        + '<label for="word-search">Search every word</label>'
        + '<input id="word-search" type="search" placeholder="for example, evaporation or gram sabha" autocomplete="off">'
        + '<p class="note" id="word-search-status" aria-live="polite"></p>'
        + '<ul id="word-results"></ul>'
        + '</div>'
        + '<h2>Browse by letter</h2>'
        + (rail if rail else '')
        + (f'<h2>Words from Hindi books</h2>{hindi_rail}' if hindi_rail else '')
        + f'<h2>Every book, word by word <span class="note">{len(bs)} books</span></h2>'
        + ''.join(book_cards)
    )
    path = '/glossary/'
    open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8').write(
        lp.page('The word bank — every word Hooty explains',
                f'All {total:,} words Hooty explains across {len(bs)} NCERT books, in plain language, with the chapter '
                f'and page each one comes from. Free, no sign-up.', path, body,
                script='<script src="/glossary/word-search.js" defer></script>'))
    urls.insert(0, (f'{SITE}{path}', TODAY))

    # --- one page per book ------------------------------------------------------------------------------
    written = 0
    for b in bs:
        def in_book(r):
            return next((s for s in r['sources'] if s['book'] == b['id']), r['sources'][0])
        words = sorted([r for r in recs if any(s['book'] == b['id'] for s in r['sources'])],
                       key=lambda r: (in_book(r)['ch'] or 0, in_book(r)['p'] or 0, r['term'].lower()))
        if not words:
            continue
        chapters = {}
        for u in b.get('units') or []:
            for c in u.get('chapters') or []:
                m = re.search(r'ch0*(\d+)', c.get('id') or '')
                if m:
                    chapters[int(m.group(1))] = c
        grouped = {}
        for r in words:
            ch = next((s for s in r['sources'] if s['book'] == b['id']), r['sources'][0])['ch'] or 0
            grouped.setdefault(ch, []).append(r)
        parts = [body_head,
                 f'<h1>{esc(b.get("title") or b["id"])}: words</h1>',
                 f'<p class="lede">{len(words):,} words explained in this book, in the order your child meets them.</p>']
        for ch in sorted(grouped):
            c = chapters.get(ch)
            heading = f'Chapter {ch}' + (f': {esc(c["title"])}' if c and c.get('title') else '')
            if c:
                heading = f'<a href="{SITE}/books/{b["id"]}/{lp.page_slug(c)}.html">{heading}</a>' if False else \
                          f'<a href="/books/{b["id"]}/{lp.page_slug(c)}.html">{heading}</a>'
            parts.append(f'<h2>{heading}</h2>')
            parts.extend(word_card(r, in_book=True) for r in grouped[ch])
        parts.append(f'<p class="more"><a class="cta cta--quiet" href="/books/{b["id"]}.html">All chapters of this book</a></p>')
        d = os.path.join(PUB, 'books', b['id'])
        os.makedirs(d, exist_ok=True)
        p = f'/books/{b["id"]}/glossary.html'
        open(os.path.join(d, 'glossary.html'), 'w', encoding='utf-8').write(
            lp.page(f'{b.get("title") or b["id"]} words — Hooty word bank',
                    'Every word this book explains, in the order the lessons meet them, with the chapter each one comes from.',
                    p, ''.join(parts)))
        urls.append((f'{SITE}{p}', TODAY))
        written += 1

    print(f'word bank: {total:,} words ({len(en):,} English, {len(hi):,} Hindi) · '
          f'{len([l for l in LETTERS if letters.get(l)])} letter pages · {written} book pages · index and search data')
    return urls


if __name__ == '__main__':
    build()
