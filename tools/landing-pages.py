#!/usr/bin/env python3
"""Static pages for every book and chapter, so the catalogue can be found and linked.

The app is a single page: every lesson lives behind "/", so a search engine sees one page and a
teacher has nothing to send. This writes /books/ plus one page per book and per chapter from the
published packs. No JavaScript, no build step: plain HTML that the existing Caddy vhost serves.

  python3 tools/landing-pages.py          # write public/books/** and rewrite public/sitemap.xml
"""
import html, json, os, re, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PUB = os.path.join(ROOT, 'public')
SITE = 'https://hooty.org'
TODAY = __import__('datetime').date.today().isoformat()

esc = lambda s: html.escape(str(s or ''), quote=True)

CSS = """
:root { --ink:#2b2536; --dim:#6b6478; --pink:#fff3f8; --card:#ffffff; --line:#efdbe6; --accent:#b02a52; }
* { box-sizing:border-box; }
body { margin:0; background:var(--pink); color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
a { color:var(--accent); }
.wrap { max-width:760px; margin:0 auto; padding:24px 18px 64px; }
.crumbs { font-size:14px; color:var(--dim); margin-bottom:10px; }
.crumbs a { color:var(--dim); }
h1 { font-size:clamp(24px,5vw,34px); line-height:1.2; margin:6px 0 8px; }
h2 { font-size:18px; margin:28px 0 10px; }
p { margin:0 0 14px; }
.lede { color:var(--dim); font-size:17px; }
.cta { display:inline-block; background:var(--accent); color:#fff; text-decoration:none; font-weight:700;
       padding:13px 22px; border-radius:999px; margin:6px 0 4px; }
.cta:hover { filter:brightness(1.06); }
.cta--quiet { background:transparent; color:var(--accent); border:2px solid var(--accent); padding:11px 20px; }
.cta--quiet:hover { background:color-mix(in srgb, var(--accent) 10%, transparent); filter:none; }
.pill { display:inline-block; padding:7px 13px; margin:0 6px 6px 0; border:1px solid var(--line); border-radius:999px;
        text-decoration:none; color:var(--text); font-size:14px; }
.pill:hover { background:var(--card); }
h2.grade a { color:inherit; text-decoration:none; }
h2.grade a:hover { text-decoration:underline; }
.note { font-size:14px; color:var(--dim); }
.more { font-size:15px; color:var(--dim); margin:14px 0 0; }
.card { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:14px 16px; margin:10px 0; }
.card h3 { margin:0 0 4px; font-size:17px; }
.card a { text-decoration:none; }
.card .meta { color:var(--dim); font-size:14px; }
ul.lessons { list-style:none; margin:0; padding:0; }
ul.lessons li { padding:9px 0; border-bottom:1px solid var(--line); }
ul.lessons li:last-child { border-bottom:0; }
.grade { margin-top:30px; font-size:20px; }
footer { margin-top:40px; font-size:14px; color:var(--dim); border-top:1px solid var(--line); padding-top:16px; }
.searchbox { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:16px; margin:0 0 22px; }
.searchbox label { display:block; font-weight:700; margin-bottom:8px; }
.searchbox input { width:100%; font:inherit; padding:12px 14px; border:1px solid var(--line); border-radius:12px; background:#fff; color:var(--ink); }
.searchbox input:focus { outline:3px solid rgba(176,42,82,.35); outline-offset:1px; }
#book-results { list-style:none; margin:6px 0 0; padding:0; }
#book-results .result { padding:10px 0; border-bottom:1px solid var(--line); }
#book-results .result:last-child { border-bottom:0; }
#book-results a { font-weight:700; text-decoration:none; }
#book-results .result__meta { display:block; font-size:14px; color:var(--dim); }

/* Word bank */
.letters { display:grid; grid-template-columns:repeat(auto-fill,minmax(62px,1fr)); gap:8px; margin:0 0 14px; padding:0; list-style:none; }
.letters a { display:flex; flex-direction:column; align-items:center; gap:1px; padding:9px 4px 10px; border:1px solid var(--line);
             border-radius:14px; background:var(--card); text-decoration:none; color:var(--ink); font-weight:800; font-size:19px; line-height:1.1; }
.letters a:hover { border-color:var(--accent); background:#fff; }
.letters a .note { font-size:12px; font-weight:400; }
.letters a.is-on { background:var(--accent); border-color:var(--accent); color:#fff; }
.letters a.is-on .note { color:rgba(255,255,255,.85); }
.card h2 { margin:0 0 4px; font-size:17px; }
.card h3::first-letter { text-transform:uppercase; }
.books-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(232px,1fr)); gap:8px; margin:0 0 6px; }
.books-grid .pill { margin:0; display:flex; justify-content:space-between; align-items:baseline; gap:10px; white-space:nowrap; }
.books-grid .pill .note { color:var(--dim); }
#word-results { list-style:none; margin:6px 0 0; padding:0; }
#word-results .result { padding:10px 0; border-bottom:1px solid var(--line); }
#word-results .result:last-child { border-bottom:0; }
#word-results a { font-weight:700; text-decoration:none; }
#word-results a::first-letter { text-transform:uppercase; }
#word-results .result__meta { display:block; font-size:14px; color:var(--dim); }
.card .meta a { text-decoration:none; border-bottom:1px solid var(--line); }

ul.words { list-style:none; margin:0 0 10px; padding:0; }
ul.words li { padding:10px 0; border-bottom:1px solid var(--line); }
ul.words li:last-child { border-bottom:0; }
ul.words strong { display:block; color:var(--ink); }
ul.words span { color:var(--dim); font-size:15px; }
"""


def page(title, desc, path, body, script='', lang='en'):
    return f"""<!DOCTYPE html>
<html lang="{esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{SITE}{path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Hooty">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{SITE}{path}">
<meta property="og:image" content="{SITE}/og.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(desc)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{SITE}/og.jpg">
<link rel="icon" href="/assets/icons/favicon-64.png?v=blob1" sizes="64x64" type="image/png">
<link rel="stylesheet" href="/books/books.css">
{script}
</head>
<body>
<div class="wrap">
<main>
{body}
</main>
<footer>Hooty is free, needs no sign-up, and keeps a child's progress on their own device.
<a href="/">Open Hooty</a>.</footer>
</div>
</body>
</html>
"""


def ld_block(obj):
    """Structured data for a page. Google reads this to build rich results, and it costs the page nothing."""
    return ('<script type="application/ld+json">'
            + json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
            + '</script>')


def book_ld(book, chapters, lessons):
    return {
        '@context': 'https://schema.org',
        '@type': 'Book',
        'name': book.get('title') or book['id'],
        'url': f"{SITE}/books/{book['id']}.html",
        'inLanguage': book.get('language') or 'en',
        'numberOfPages': lessons,
        'bookEdition': f"Class {book.get('grade')}" if book.get('grade') else None,
        'learningResourceType': 'Course',
        'isAccessibleForFree': True,
        'description': f"{book.get('title') or book['id']} on Hooty: {len(chapters)} chapters and {lessons} short lessons, free for every child, no sign-up.",
        'publisher': {'@type': 'Organization', 'name': 'Hooty', 'url': SITE},
    }


def chapter_ld(book, chapter, lessons):
    return {
        '@context': 'https://schema.org',
        '@type': 'Chapter' if False else 'LearningResource',
        'name': chapter.get('title') or chapter.get('id'),
        'url': f"{SITE}/books/{book['id']}/{page_slug(chapter)}.html",
        'learningResourceType': 'Lesson',
        'isAccessibleForFree': True,
        'inLanguage': book.get('language') or 'en',
        'numberOfItems': len(lessons),
        'isPartOf': {'@type': 'Book', 'name': book.get('title') or book['id'], 'url': f"{SITE}/books/{book['id']}.html"},
        'description': f"{chapter.get('title') or chapter.get('id')} from {book.get('title') or book['id']}: {len(lessons)} short lessons on Hooty, free and no sign-up.",
    }


def crumbs_ld(parts):
    items = [{'@type': 'ListItem', 'position': i + 1, 'name': name, 'item': f'{SITE}{path}'} for i, (name, path) in enumerate(parts)]
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': items}


def load():
    idx = json.load(open(os.path.join(PUB, 'content/index.json')))
    order = [p['id'] for p in idx['packs']]
    books = []
    for f in glob.glob(os.path.join(PUB, 'content/packs/*/pack.json')):
        d = json.load(open(f))
        books.append(d)
    books.sort(key=lambda d: (order.index(d['id']) if d['id'] in order else 999))
    return books


def page_slug(chapter):
    """A readable file name for a chapter page: the chapter's number and the first words of its title, so a URL reads
    /books/hindi-g1/ch2-dada-dadi.html instead of /books/hindi-g1/ch02-.html (chapter ids are made for the app, not for
    a link a parent might read)."""
    cid = chapter.get('id') or ''
    num = re.search(r'ch0*(\d+)', cid)
    title = chapter.get('title') or ''
    words = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:40].strip('-')
    if not words:
        # A Hindi or Kannada title has no Latin letters to slug from, so the page keeps a short numbered name.
        return f'ch{int(num.group(1))}' if num else re.sub(r'[^a-z0-9]+', '-', cid.lower()).strip('-')
    return f'ch{int(num.group(1))}-{words}' if num else words


def lessons_of(chapter):
    out = []
    for l in chapter.get('lessons') or []:
        out.append((l.get('title') or l.get('id'), l.get('estimatedMinutes'), l.get('id')))
    b = chapter.get('boss')
    if b:
        out.append((b.get('title') or 'Chapter challenge', b.get('estimatedMinutes'),
                    b.get('id') or f"{chapter.get('id')}-boss"))
    return out


def credits_html(book):
    """The picture credits for one book, in reading order: every lesson's photo, its maker and its licence."""
    rows = []
    for u in book.get('units') or []:
        for c in u.get('chapters') or []:
            for l in (c.get('lessons') or []) + ([c['boss']] if c.get('boss') else []):
                if not l:
                    continue
                cr = l.get('sceneCredit') or {}
                if not cr.get('text'):
                    continue
                who = cr.get('creator') or ''
                lic = cr.get('license') or ''
                link = cr.get('licenseUrl') or cr.get('url') or ''
                name = esc(l.get('title') or l.get('id'))
                credit = esc(cr['text'])
                rows.append(f'<li><b>{name}</b> — {credit}'
                            + (f' ({esc(who)})' if who and who not in cr['text'] else '')
                            + (f' <span class="meta">{esc(lic)}</span>' if lic else '')
                            + (f' <a href="{esc(link)}" rel="noopener noreferrer">licence</a>' if link else '')
                            + '</li>')
    return ('<h2>Picture credits</h2><p class="lede">Every photograph in this book, with its maker and licence, in the '
            'order the lessons appear.</p><ul class="lessons">' + ''.join(rows) + '</ul>')


def not_found():
    """The page served with a 404. A mistyped address used to give a blank screen; this gives the search box."""
    body = ("""
<div class="crumbs"><a href="/">Hooty</a> / Not found</div>
<h1>That page is not here</h1>
<p class="lede">The address may be a typo, or a chapter that has been renamed. Every book and every lesson is still
one tap away:</p>
<p><a class="cta" href="/#/">Open Hooty</a></p>
<p><a class="cta cta--quiet" href="/books/">All books and a search box</a></p>
<p class="note">If you followed a link from another site, the page it pointed at has moved. Searching for the lesson
name on the catalogue page will find it.</p>
""")
    html = page('Not found | Hooty', 'That page is not here. Open Hooty, or search every book and lesson.',
                '/404.html', body)
    return html.replace('<meta name="twitter:image"', '<meta name="robots" content="noindex">\n<meta name="twitter:image"', 1)


def glossary_word_count():
    """How many words the word bank holds: the number it prints itself, read from the file it wrote."""
    try:
        return len(json.load(open(os.path.join(PUB, 'glossary', 'index.json'), encoding='utf-8')).get('words') or [])
    except Exception:
        return 0


def glossary_by_chapter():
    """{book: {chapter number: [(word, meaning), ...]}} so a chapter page can show the words it teaches. The app explains
    a word in place; a chapter page should say beforehand which words are coming."""
    out = {}
    for g in glob.glob(os.path.join(PUB, 'content', 'packs', '*', 'glossary.json')):
        book = os.path.basename(os.path.dirname(g))
        try:
            d = json.load(open(g, encoding='utf-8'))
        except Exception:
            continue
        terms = d.get('terms') if isinstance(d, dict) else d
        per = {}
        for t in terms or []:
            term, meaning = (t.get('term') or '').strip(), (t.get('meaning') or '').strip()
            if not term or not meaning:
                continue
            for src in (t.get('src') or [{}]):
                ch = src.get('ch')
                if not ch:
                    continue
                bucket = per.setdefault(int(ch), [])
                if term not in [x[0] for x in bucket]:
                    bucket.append((term, meaning))
        if per:
            out[book] = per
    return out


def main():
    # Pages from an older run stay on disk with their old names (ch02-.html beside ch2-dada-dadi.html), so a book
    # folder is rebuilt from scratch: one page per chapter, always with the current slug.

    books = load()
    words_by_book = glossary_by_chapter()
    outdir = os.path.join(PUB, 'books')
    os.makedirs(outdir, exist_ok=True)
    # Pages from an older run stay on disk with their old names (ch02-.html beside ch2-dada-dadi.html), so a book's
    # folder starts empty: one page per chapter, always with the current slug.
    for name in os.listdir(outdir):
        path = os.path.join(outdir, name)
        if os.path.isdir(path):
            for f in os.listdir(path):
                if f.endswith('.html'):
                    os.remove(os.path.join(path, f))
    open(os.path.join(outdir, 'books.css'), 'w').write(CSS.strip() + '\n')
    urls = []
    urls.append((f'{SITE}/books/', TODAY))

    by_grade = {}
    for b in books:
        by_grade.setdefault(str(b.get('grade')), []).append(b)

    cards = []
    for g in sorted(by_grade, key=lambda x: (x == 'mine', int(x) if x.isdigit() else 99)):
        cslug = 'mine' if g == 'mine' else f'class-{g}'
        cards.append(f'<h2 class="grade"><a href="/books/{esc(cslug)}.html">Class {esc(g) if g != "mine" else "My books"}</a></h2>')
        for b in by_grade[g]:
            n = sum(len(c.get('lessons') or []) for u in b.get('units') or [] for c in u.get('chapters') or [])
            ch = sum(len(u.get('chapters') or []) for u in b.get('units') or [])
            cards.append(
                f'<div class="card"><h3><a href="/books/{esc(b["id"])}.html">{esc(b.get("title"))}</a></h3>'
                f'<div class="meta">{ch} chapters, {n} lessons. Free, no sign-up.</div></div>')
    # A page per class: 'class 6 ncert books' is a search a parent actually makes, and /books/ is one long list.
    for g, group in by_grade.items():
        if g == 'mine-type':
            continue
        label = 'My books' if g == 'mine' else f'Class {g}'
        slug = 'mine' if g == 'mine' else f'class-{g}'
        rows = []
        for b in group:
            n = sum(len(c.get('lessons') or []) for u in b.get('units') or [] for c in u.get('chapters') or [])
            ch = sum(len(u.get('chapters') or []) for u in b.get('units') or [])
            rows.append(f'<div class="card"><h3><a href="/books/{esc(b["id"])}.html">{esc(b.get("title"))}</a></h3>'
                        f'<div class="meta">{ch} chapters, {n} lessons. {esc(b.get("subject") or "")}.</div></div>')
        others = [x for x in sorted(by_grade, key=lambda y: (y == 'mine', int(y) if y.isdigit() else 99)) if x != g]
        nav = ' '.join(f'<a class="pill" href="/books/{"mine" if x == "mine" else "class-" + x}.html">'
                       f'{"My books" if x == "mine" else "Class " + x}</a>' for x in others[:12])
        cbody = (f'<div class="crumbs"><a href="/">Hooty</a> / <a href="/books/">All books</a> / {esc(label)}</div>'
                 f'<h1>{esc(label)} books</h1>'
                 f'<p class="lede">Every {esc(label)} NCERT book on Hooty, free, with no sign-up. '
                 f'{len(group)} book{"s" if len(group) != 1 else ""}, turned into short lessons a child can play.</p>'
                 + ''.join(rows) + f'<h2>Another class</h2><p class="more">{nav}</p>')
        cld = ld_block({
            '@context': 'https://schema.org', '@type': 'CollectionPage',
            'name': f'{label} books on Hooty', 'url': f'{SITE}/books/{slug}.html', 'isAccessibleForFree': True,
            'description': f'Every {label} NCERT book on Hooty, free, in short lessons a child can play.',
            'hasPart': [{'@type': 'Book', 'name': b.get('title') or b['id'], 'url': f"{SITE}/books/{b['id']}.html",
                         'inLanguage': b.get('language') or 'en'} for b in group],
        }) + ld_block(crumbs_ld([('Hooty', '/'), ('All books', '/books/'), (label, f'/books/{slug}.html')]))
        open(os.path.join(outdir, f'{slug}.html'), 'w').write(page(
            f'{label} books | Hooty', f'Every {label} NCERT book on Hooty, free. Chapter by chapter, in short lessons.',
            f'/books/{slug}.html', cbody + cld))
        urls.append((f'{SITE}/books/{slug}.html', TODAY))

    # The word bank (tools/glossary-pages.py) writes /glossary/** and /books/<slug>/glossary.html and hands back its
    # addresses. It runs before the index body so the count printed on /books/ is the same count the word bank shows
    # (a word explained twice in two books is one entry there).
    try:
        import importlib.util as _ilu
        _spec = _ilu.spec_from_file_location('glossary_pages', os.path.join(ROOT, 'tools', 'glossary-pages.py'))
        _gp = _ilu.module_from_spec(_spec)
        _spec.loader.exec_module(_gp)
        urls.extend(_gp.build())
    except Exception as _e:
        print('word bank skipped:', str(_e)[:160])

    body = f"""<div class="crumbs"><a href="/">Hooty</a> / All books</div>
<h1>Every book on Hooty</h1>
<p class="lede">The NCERT school books, turned into short lessons a child can play. {len(books)} books,
{sum(len(u.get("chapters") or []) for b in books for u in b.get("units") or [])} chapters. Free, no ads,
no sign-up, and nobody can sell it.</p>
<div class="searchbox">
  <label for="book-search">Search every lesson by topic</label>
  <input id="book-search" type="search" placeholder="for example, photosynthesis or fractions" autocomplete="off">
  <p class="note" id="book-search-status" aria-live="polite"></p>
  <ul id="book-results"></ul>
</div>
<div class="card"><h2><a href="/glossary/">The word bank</a></h2><div class="meta">@@WORDS@@ words Hooty explains,
A to Z or book by book, with the chapter and page each one comes from.</div></div>
{''.join(cards)}"""
    index_ld = ld_block({
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        'name': f'Every book on Hooty ({len(books)} books)', 'url': f'{SITE}/books/',
        'isAccessibleForFree': True,
        'description': f'All {len(books)} NCERT school books on Hooty, chapter by chapter, in short lessons a child can play.',
        'hasPart': [{'@type': 'Book', 'name': b.get('title') or b['id'], 'url': f"{SITE}/books/{b['id']}.html"} for b in books],
    }) + ld_block(crumbs_ld([('Hooty', '/'), ('All books', '/books/')]))
    body = body.replace('@@WORDS@@', f'{glossary_word_count():,}')
    body += index_ld
    open(os.path.join(outdir, 'index.html'), 'w').write(page(
        'All books | Hooty', f'All {len(books)} NCERT books on Hooty, free for every child. Chapter by chapter, in short lessons. Search every lesson by topic.',
        '/books/', body, script='<script src="/books/search.js" defer></script>'))
    urls.append((f'{SITE}/books/', TODAY))

    # The search index: book, chapter and lesson titles only, in the same order the pages use. About 66 KB
    # gzipped, and the script only fetches it when a visitor types or the page goes idle.
    compact = []
    for b in books:
        chs = []
        for u in b.get('units') or []:
            for c in u.get('chapters') or []:
                ls = [[l.get('id'), l.get('title')] for l in c.get('lessons') or []]
                if c.get('boss'):
                    ls.append([c['boss'].get('id') or f"{c.get('id')}-boss", c['boss'].get('title') or 'Chapter challenge'])
                chs.append([c.get('title') or c.get('id'), ls])
        compact.append([b['id'], b.get('grade'), b.get('subject'), b.get('title'), chs])
    open(os.path.join(outdir, 'index.json'), 'w').write(json.dumps(compact, ensure_ascii=False, separators=(',', ':')))
    here = os.path.dirname(os.path.abspath(__file__))
    open(os.path.join(outdir, 'search.js'), 'w').write(open(os.path.join(here, 'books-search.js')).read())

    for b in books:
        slug = b['id']
        title = b.get('title') or slug
        chapters = [(u, c) for u in b.get('units') or [] for c in u.get('chapters') or []]
        n = sum(len(lessons_of(c)) for _, c in chapters)
        desc = f'{title} on Hooty: {len(chapters)} chapters and {n} short lessons, free for every child, no sign-up.'
        items = []
        for u, c in chapters:
            ls = lessons_of(c)
            items.append(
                f'<div class="card"><h3><a href="/books/{esc(slug)}/{esc(page_slug(c))}.html">{esc(c.get("title"))}</a></h3>'
                f'<div class="meta"><a href="/books/{esc(slug)}/{esc(page_slug(c))}.html">{len(ls)} lesson'
                f'{"s" if len(ls) != 1 else ""}</a></div></div>')
        same_class = [x for x in books if str(x.get('grade')) == str(b.get('grade')) and x['id'] != slug]
        # the next class up, in class order; the last class points back to Class 1 so the trail never stops
        grades = sorted({str(x.get('grade')) for x in books if x.get('grade')}, key=lambda g: int(g) if g.isdigit() else 99)
        here = str(b.get('grade'))
        nxt_grade = grades[(grades.index(here) + 1) % len(grades)] if here in grades else (grades[0] if grades else '')
        others = [x for x in books if str(x.get('grade')) == nxt_grade and x['id'] != slug]
        siblings = ''
        if same_class:
            siblings += 'Other books in Class ' + esc(b.get('grade')) + ': ' + ' &middot; '.join(
                f'<a href="/books/{esc(x["id"])}.html">{esc(x.get("subject") or x.get("title"))}</a>' for x in same_class) + '. '
        if others:
            nxt = others[0]
            siblings += f'<a href="/books/{esc(nxt["id"])}.html">{esc(nxt.get("title"))}</a>.'
        siblings = f'<p class="more">{siblings}</p>' if siblings else ''
        body = f"""<div class="crumbs"><a href="/">Hooty</a> / <a href="/books/">All books</a> / {esc(title)}</div>
<h1>{esc(title)}</h1>
<p class="lede">{len(chapters)} chapters, {n} short lessons. Each one is a few minutes, with questions,
pictures and read-aloud.</p>
{siblings}
<p><a class="cta" href="/#/book/{esc(slug)}">Open this book in Hooty</a></p>
<p class="note"><a href="/books/{esc(slug)}/glossary.html">The words this book explains</a> &middot; <a href="/books/{esc(slug)}/credits.html">Picture credits for this book</a></p>
<h2>Chapters</h2>
{''.join(items)}
{ld_block(book_ld(b, chapters, n))}
{ld_block(crumbs_ld([('Hooty', '/'), ('All books', '/books/'), (title, f'/books/{slug}.html')]))}"""
        os.makedirs(outdir, exist_ok=True)
        open(os.path.join(outdir, f'{slug}.html'), 'w').write(page(f'{title} | Hooty', desc, f'/books/{slug}.html', body, lang=b.get('language') or 'en'))
        # The credits for this book, as a page a teacher can open or print. CC BY-SA asks the credit to travel with the
        # picture, and until now it only travelled inside the app.
        os.makedirs(os.path.join(outdir, slug), exist_ok=True)
        cpage = credits_html(b)
        if '<li>' in cpage:
            open(os.path.join(outdir, slug, 'credits.html'), 'w').write(
                page(f'Picture credits | {title} | Hooty', f'Where every photograph in {title} came from, with maker and licence.',
                     f'/books/{slug}/credits.html', f'<div class="crumbs"><a href="/">Hooty</a> / <a href="/books/">All books</a> / '
                     f'<a href="/books/{esc(slug)}.html">{esc(title)}</a> / Picture credits</div>' + cpage, lang=b.get('language') or 'en'))
            urls.append((f'{SITE}/books/{slug}/credits.html', TODAY))
        urls.append((f'{SITE}/books/{slug}.html', TODAY))

        for idx, (u, c) in enumerate(chapters):
            cid = page_slug(c)          # the file name, readable
            real_id = c['id']           # what the app's deep link needs
            ls = lessons_of(c)
            ctitle = c.get('title') or cid
            cdesc = f'{ctitle} from {title}: {len(ls)} short lessons on Hooty, free and no sign-up.'
            rows = ''.join(
                f'<li><a href="/#/lesson/{esc(slug)}/{esc(lid)}">{esc(t)}</a>'
                + (f' <span class="meta">{esc(m)} min</span>' if m else '') + '</li>'
                for t, m, lid in ls)
            nav = ''
            if len(chapters) > 1:
                links = []
                for j, (_, other) in enumerate(chapters):
                    if other is c:
                        continue
                    if j == idx - 1 or j == idx + 1:
                        links.append(f'<a href="/books/{esc(slug)}/{esc(page_slug(other))}.html">{esc((other.get("title") or "")[:40])}</a>')
                if links:
                    nav = '<p class="more">Also in this book: ' + ' &middot; '.join(links) + '</p>'
            chnum = None
            _m = re.search(r'ch0*(\d+)', real_id or '')
            if _m:
                chnum = int(_m.group(1))
            chapter_words = (words_by_book.get(slug) or {}).get(chnum) or []
            words = ''
            if chapter_words:
                shown = chapter_words[:24]
                items_w = ''.join(
                    f'<li><strong>{esc(t)}</strong><span>{esc(m)}</span></li>' for t, m in shown)
                more_w = (f'<p class="more">and {len(chapter_words) - len(shown)} more in '
                          f'<a href="/books/{esc(slug)}/glossary.html">the words of this book</a>.</p>'
                          if len(chapter_words) > len(shown)
                          else f'<p class="more">Every word in <a href="/books/{esc(slug)}/glossary.html">this book</a>.</p>')
                words = (f'<h2>Words this chapter explains</h2><ul class="words">{items_w}</ul>{more_w}')
            cbody = f"""<div class="crumbs"><a href="/">Hooty</a> / <a href="/books/">All books</a> /
<a href="/books/{esc(slug)}.html">{esc(title)}</a> / {esc(ctitle)}</div>
<h1>{esc(ctitle)}</h1>
<p class="lede">{esc(title)}, chapter. {len(ls)} short lessons.</p>
<p><a class="cta" href="/#/chapter/{esc(slug)}/{esc(real_id)}">Start this chapter</a></p>
<h2>Lessons in this chapter</h2>
<ul class="lessons">{rows}</ul>
{words}
{nav}
{ld_block(chapter_ld(b, c, ls))}
{ld_block(crumbs_ld([('Hooty', '/'), ('All books', '/books/'), (title, f'/books/{slug}.html'), (ctitle, f'/books/{slug}/{cid}.html')]))}"""
            os.makedirs(os.path.join(outdir, slug), exist_ok=True)
            open(os.path.join(outdir, slug, f'{cid}.html'), 'w').write(
                page(f'{ctitle} | {title} | Hooty', cdesc, f'/books/{slug}/{cid}.html', cbody, lang=b.get('language') or 'en'))
            urls.append((f'{SITE}/books/{slug}/{cid}.html', TODAY))

    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm.append(f'  <url><loc>{SITE}/</loc><lastmod>{TODAY}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>')
    for u, last in urls:
        pr = '0.8' if u.endswith('/books/') or u.count('/') == 4 else '0.6'
        sm.append(f'  <url><loc>{u}</loc><lastmod>{last}</lastmod><changefreq>monthly</changefreq><priority>{pr}</priority></url>')
    sm.append('</urlset>')
    open(os.path.join(PUB, '404.html'), 'w').write(not_found())
    open(os.path.join(PUB, 'sitemap.xml'), 'w').write('\n'.join(sm) + '\n')
    print(f'books: {len(books)}  pages written: {len(urls)}  sitemap urls: {len(urls) + 1}')


if __name__ == '__main__':
    main()
