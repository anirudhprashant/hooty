#!/usr/bin/env python3
"""Turn NCERT chapter PDFs into the page-tagged text the pipeline reads (sources/ncert-class6-<subject>/).
Printed page numbers come from the footer line "Chapter N.indd <page>" that NCERT's typesetting leaves in every page.

  python3 tools/extract-ncert.py science fecu1 12     # Curiosity: fecu101..fecu112
Downloads from ncert.nic.in (its certificate chain is incomplete, hence -k) into /tmp, extracts with pdftotext.
The text is git-ignored: NCERT's text is not ours to redistribute."""
import json, os, re, subprocess, sys
subject, prefix, count = sys.argv[1], sys.argv[2], int(sys.argv[3])
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = f'{ROOT}/sources/ncert-class6-{subject}'; os.makedirs(OUT + '/chapters', exist_ok=True)
chapters = []
for n in range(1, count + 1):
    pdf = f'/tmp/{prefix}{n:02d}.pdf'
    if not os.path.exists(pdf):
        subprocess.run(['curl', '-sk', '-m', '120', '-A', 'Mozilla/5.0', '-o', pdf, f'https://ncert.nic.in/textbook/pdf/{prefix}{n:02d}.pdf'], check=True)
    pages = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
    blocks, first, title = [], None, None
    for i in range(1, pages + 1):
        t = subprocess.run(['pdftotext', '-f', str(i), '-l', str(i), pdf, '-'], capture_output=True, text=True).stdout
        m = re.search(r'\.indd\s+(\d+)', t)
        page = int(m.group(1)) if m else (blocks[-1][0] + 1 if blocks else 0)
        t = re.sub(r'Reprint 20\d\d-\d\d|Chapter \d+\.indd \d+|\d+/\d+/\d{4} [\d:]+ [AP]M', '', t)
        if i == 1:
            mt = re.search(r'Chapter\s+\d+\s+(.+?)\n\n', t, re.S)
            title = re.sub(r'\s+', ' ', mt.group(1)).strip() if mt else f'Chapter {n}'
        first = first or page
        blocks.append((page, t.strip()))
    open(f'{OUT}/chapters/ch{n:02d}.txt', 'w').write('\n'.join(f'=== BOOK PAGE {p} ===\n{t}\n' for p, t in blocks))
    chapters.append({'chapter': n, 'title': title, 'theme': 'A', 'themeTitle': subject.title(), 'firstPage': first, 'bookPages': [first, blocks[-1][0]], 'file': f'chapters/ch{n:02d}.txt'})
    print(n, title, first, blocks[-1][0], flush=True)
json.dump({'book': f'NCERT Class 6 {subject}', 'publisher': 'NCERT', 'chapters': chapters}, open(OUT + '/index.json', 'w'), indent=1)
