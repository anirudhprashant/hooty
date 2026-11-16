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
TODAY = '2026-11-16'

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
.note { font-size:14px; color:var(--dim); }
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
"""


def page(title, desc, path, body, script=''):
    return f"""<!DOCTYPE html>
<html lang="en">
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
<meta name="twitter:card" content="summary_large_image">
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


def load():
    idx = json.load(open(os.path.join(PUB, 'content/index.json')))
    order = [p['id'] for p in idx['packs']]
    books = []
    for f in glob.glob(os.path.join(PUB, 'content/packs/*/pack.json')):
        d = json.load(open(f))
        books.append(d)
    books.sort(key=lambda d: (order.index(d['id']) if d['id'] in order else 999))
    return books


def lessons_of(chapter):
    out = []
    for l in chapter.get('lessons') or []:
        out.append((l.get('title') or l.get('id'), l.get('estimatedMinutes'), l.get('id')))
    b = chapter.get('boss')
    if b:
        out.append((b.get('title') or 'Chapter challenge', b.get('estimatedMinutes'),
                    b.get('id') or f"{chapter.get('id')}-boss"))
    return out


def main():
    books = load()
    outdir = os.path.join(PUB, 'books')
    os.makedirs(outdir, exist_ok=True)
    open(os.path.join(outdir, 'books.css'), 'w').write(CSS.strip() + '\n')
    urls = []
    urls.append((f'{SITE}/books/', TODAY))

    by_grade = {}
    for b in books:
        by_grade.setdefault(str(b.get('grade')), []).append(b)

    cards = []
    for g in sorted(by_grade, key=lambda x: (x == 'mine', int(x) if x.isdigit() else 99)):
        cards.append(f'<h2 class="grade">Class {esc(g) if g != "mine" else "My books"}</h2>')
        for b in by_grade[g]:
            n = sum(len(c.get('lessons') or []) for u in b.get('units') or [] for c in u.get('chapters') or [])
            ch = sum(len(u.get('chapters') or []) for u in b.get('units') or [])
            cards.append(
                f'<div class="card"><h3><a href="/books/{esc(b["id"])}.html">{esc(b.get("title"))}</a></h3>'
                f'<div class="meta">{ch} chapters, {n} lessons. Free, no sign-up.</div></div>')
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
{''.join(cards)}"""
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
                f'<div class="card"><h3><a href="/books/{esc(slug)}/{esc(c["id"])}.html">{esc(c.get("title"))}</a></h3>'
                f'<div class="meta"><a href="/books/{esc(slug)}/{esc(c["id"])}.html">{len(ls)} lesson'
                f'{"s" if len(ls) != 1 else ""}</a></div></div>')
        body = f"""<div class="crumbs"><a href="/">Hooty</a> / <a href="/books/">All books</a> / {esc(title)}</div>
<h1>{esc(title)}</h1>
<p class="lede">{len(chapters)} chapters, {n} short lessons. Each one is a few minutes, with questions,
pictures and read-aloud.</p>
<p><a class="cta" href="/#/book/{esc(slug)}">Open this book in Hooty</a></p>
<h2>Chapters</h2>
{''.join(items)}"""
        os.makedirs(outdir, exist_ok=True)
        open(os.path.join(outdir, f'{slug}.html'), 'w').write(page(f'{title} | Hooty', desc, f'/books/{slug}.html', body))
        urls.append((f'{SITE}/books/{slug}.html', TODAY))

        for u, c in chapters:
            cid = c['id']
            ls = lessons_of(c)
            ctitle = c.get('title') or cid
            cdesc = f'{ctitle} from {title}: {len(ls)} short lessons on Hooty, free and no sign-up.'
            rows = ''.join(
                f'<li><a href="/#/lesson/{esc(slug)}/{esc(lid)}">{esc(t)}</a>'
                + (f' <span class="meta">{esc(m)} min</span>' if m else '') + '</li>'
                for t, m, lid in ls)
            cbody = f"""<div class="crumbs"><a href="/">Hooty</a> / <a href="/books/">All books</a> /
<a href="/books/{esc(slug)}.html">{esc(title)}</a> / {esc(ctitle)}</div>
<h1>{esc(ctitle)}</h1>
<p class="lede">{esc(title)}, chapter. {len(ls)} short lessons.</p>
<p><a class="cta" href="/#/chapter/{esc(slug)}/{esc(cid)}">Start this chapter</a></p>
<h2>Lessons in this chapter</h2>
<ul class="lessons">{rows}</ul>"""
            os.makedirs(os.path.join(outdir, slug), exist_ok=True)
            open(os.path.join(outdir, slug, f'{cid}.html'), 'w').write(
                page(f'{ctitle} | {title} | Hooty', cdesc, f'/books/{slug}/{cid}.html', cbody))
            urls.append((f'{SITE}/books/{slug}/{cid}.html', TODAY))

    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm.append(f'  <url><loc>{SITE}/</loc><lastmod>{TODAY}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>')
    for u, last in urls:
        pr = '0.8' if u.endswith('/books/') or u.count('/') == 4 else '0.6'
        sm.append(f'  <url><loc>{u}</loc><lastmod>{last}</lastmod><changefreq>monthly</changefreq><priority>{pr}</priority></url>')
    sm.append('</urlset>')
    open(os.path.join(PUB, 'sitemap.xml'), 'w').write('\n'.join(sm) + '\n')
    print(f'books: {len(books)}  pages written: {len(urls)}  sitemap urls: {len(urls) + 1}')


if __name__ == '__main__':
    main()
