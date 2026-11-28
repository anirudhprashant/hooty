#!/usr/bin/env python3
"""Find the Kannada-medium KTBS textbooks and pull them down, since the official site is unreachable.

Karnataka's own servers (ktbs.kar.nic.in, textbooks.karnataka.gov.in) never answer this box, on http or https.
karnatakatextbooks.in mirrors the official PDFs and streams them from its own host, so that is the route used
here. Everything is recorded in work/qa/ktbs-kannada.json: the class, the book, the part, the mirror page and
the local file, so a later re-download is one command and nothing has to be remembered by hand.

  python3 tools/ktbs-scan.py --list          # what exists, no download
  python3 tools/ktbs-scan.py --download      # fetch what is missing and verify each PDF

Kannada first language becomes `kannada-gN`, second language `kannada-sl-gN`. Parts stay separate PDFs, one
per file, the way the source publishes them.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import urllib.request

MIRROR = 'https://karnatakatextbooks.in'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = f'{ROOT}/sources'
CATALOGUE = f'{ROOT}/work/qa/ktbs-kannada.json'
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)'}


def page(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read().decode('utf-8', 'replace')


def classify(slug):
    """(hooty slug, part number) for a mirror page path, or None if it is not a Kannada language book."""
    lower = slug.lower()
    if 'nalikali' in lower or 'konkani' in lower:
        return None
    grade = re.search(r'class-(\d+)', lower)
    part = re.search(r'part-(\d+)', lower)
    if not grade:
        return None
    if 'kannada-first-language' in lower or 'kannada-fl' in lower:
        name = f'kannada-g{grade.group(1)}'
    elif 'kannada-second-language' in lower or 'kannada-sl' in lower:
        name = f'kannada-sl-g{grade.group(1)}'
    else:
        return None
    return name, int(part.group(1)) if part else 1


def discover():
    books = {}
    for grade in range(1, 11):
        html = page(f'{MIRROR}/class-{grade}/')
        for href in sorted(set(re.findall(r'href="(/class-%d/kannada-medium/[^"]+)"' % grade, html))):
            classified = classify(href)
            if not classified:
                continue
            name, part = classified
            books.setdefault(name, {'slug': name, 'grade': grade, 'parts': {}})['parts'][part] = {
                'page': MIRROR + href, 'download': None, 'file': None, 'bytes': None, 'pdf_id': None}
    return books


def resolve_pdf_ids(books):
    """Each book page carries the mirror's own download endpoint; read it out of the page."""
    for book in books.values():
        for part, entry in book['parts'].items():
            if entry.get('pdf_id'):
                continue
            html = page(entry['page'])
            found = re.search(r'/api/textbooks/(\d+)/download', html)
            if found:
                entry['pdf_id'] = int(found.group(1))
            else:
                print(f"  no download id on {entry['page']}")


def fetch(books, workers=4):
    import concurrent.futures
    jobs = []
    for book in books.values():
        folder = f"{SOURCES}/{book['slug']}-download"
        os.makedirs(folder, exist_ok=True)
        for part, entry in book['parts'].items():
            entry['file'] = f'{folder}/p{part}-01.pdf'
            if not entry.get('pdf_id'):
                continue
            if os.path.exists(entry['file']) and os.path.getsize(entry['file']) > 50000:
                entry['bytes'] = os.path.getsize(entry['file'])
                continue
            jobs.append(entry)

    def one(entry):
        url = f"{MIRROR}/api/textbooks/{entry['pdf_id']}/download"
        for attempt in range(3):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as response:
                    body = response.read()
                if body[:4] != b'%PDF':
                    raise ValueError(f'not a PDF ({len(body)} bytes)')
                open(entry['file'], 'wb').write(body)
                entry['bytes'] = len(body)
                return True, entry['file']
            except Exception as e:
                if attempt == 2:
                    return False, f"{entry['file']}: {str(e)[:70]}"
        return False, entry['file']

    print(f'{len(jobs)} PDFs to fetch')
    done = failed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        for ok, detail in pool.map(one, jobs):
            if ok:
                done += 1
                print(f'  ok {detail} ({os.path.getsize(detail) // 1024} KB)')
            else:
                failed += 1
                print(f'  FAILED {detail}')
    return done, failed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--list', action='store_true')
    parser.add_argument('--download', action='store_true')
    args = parser.parse_args()

    books = discover()
    resolve_pdf_ids(books)
    for book in books.values():
        for part, entry in book['parts'].items():
            folder = f"{SOURCES}/{book['slug']}-download"
            candidate = f'{folder}/p{part}-01.pdf'
            if os.path.exists(candidate):
                entry['file'] = candidate
                entry['bytes'] = os.path.getsize(candidate)
    os.makedirs(os.path.dirname(CATALOGUE), exist_ok=True)
    json.dump({'source': MIRROR, 'note': 'Kannada-medium KTBS textbooks, 2025-26 edition, mirrored PDFs',
               'books': books}, open(CATALOGUE, 'w'), indent=1, ensure_ascii=False)

    total = sum(len(b['parts']) for b in books.values())
    have = sum(1 for b in books.values() for e in b['parts'].values() if e.get('bytes'))
    print(f'{len(books)} books, {total} part PDFs, {have} on disk')
    if args.list or not args.download:
        for name in sorted(books, key=lambda n: (int(re.search(r"g(\d+)$", n).group(1)), n)):
            parts = books[name]['parts']
            state = ' '.join(f"p{p}:{(e.get('bytes') or 0) // 1024}KB" for p, e in sorted(parts.items()))
            print(f'  {name:16} {state}')
        return
    done, failed = fetch(books)
    json.dump({'source': MIRROR, 'note': 'Kannada-medium KTBS textbooks, 2025-26 edition, mirrored PDFs',
               'books': books}, open(CATALOGUE, 'w'), indent=1, ensure_ascii=False)
    print(f'downloaded {done}, failed {failed}')
    sys.exit(0 if failed == 0 else 1)


if __name__ == '__main__':
    main()
