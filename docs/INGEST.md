# Adding a textbook (no hand work)

**Upload page:** `python3 tools/ingest-server.py` then open http://127.0.0.1:8120/ . Drop a PDF (or a zip of one PDF per chapter),
name the subject, pick the class, press the button. Progress shows on the same page. To expose it, set
`SPARKLE_UPLOAD_TOKEN=...` and `--host 0.0.0.0`. To publish automatically set `SPARKLE_DEPLOY=yourhost:/home/you/agent-workspace/learning-game/`.

**Command line:** `python3 tools/ingest-book.py book.pdf --name "Mathematics" --grade 7` (also takes a zip, a folder or a URL;
`--resume <slug>` carries on after a stop).

What happens, all automatic:

| Stage | How | AI? |
|---|---|---|
| Read the book | `pdftotext` per page; scanned pages go through tesseract OCR; printed page numbers detected | no |
| Find chapters | one PDF per chapter, else PDF bookmarks, else "Chapter N" headings, else M2.7 reads page openings | only as last resort |
| Facts | M2.7 proposes lessons + facts each with an exact quote; `fact-pages.mjs` drops anything the book does not say | writes; code checks |
| Lessons | M2.7 drafts from the fact sheet only; `verify-sources.mjs` drops unsourced numbers; a second M2.7 pass fact-checks; thin lessons are redrafted | writes; code checks |
| Hooks | one curiosity question per lesson | M2.7 |
| Pictures | Wikimedia Commons / Openverse search, licence-filtered; M2.7 ranks by description; MiniMax's vision endpoint looks at each and must score 7+ (6 if nothing beats it). If the service is down the pick is kept and marked `unchecked`, never rejected; `check-images.py N --unchecked` looks later | search + vision |
| Course | `assemble-pack.py` merges chapters, glossary and pictures, cleans internal words out of the text, drops unfair questions (answer far longest, no true order, answer inside the prompt), rebuilds a lost opening card from checked facts, gives each book its own lesson ids, groups flat books into sections | no (sections: M2.7) |
| Voice | `make-audio.py` records every spoken line with Microsoft's free neural voice (needs a home network, not a datacentre) | no |

Tools it relies on: poppler (`pdftotext`, `pdfinfo`, `pdftoppm`), `tesseract`, `qpdf`, ImageMagick, `node`, `ssh oracle` (MiniMax-M2.7 and its vision endpoint, see `tools/llm.py`).

Mathematics: pass `--calc`. M2.7 writes templates and formulas, code computes the answers, and a separate blind solve must agree (`tools/calc-problems.py`). Hindi or another language: `--language hi`.

**Publishing:** `python3 tools/publish.py` builds every book, records missing voice clips, stamps the service worker, uploads, then fetches every picture and code file from the live site. Never bump the cache version by hand.

Known limit: stories and poems run through the same fact pipeline, so they get comprehension questions, not literary ones. Every book keeps its text in `sources/<slug>/`
(git-ignored): it is the publisher's, and only our own wording ships.

## All classes (NCERT)

`tools/ingest-ncert.py` fetches an NCERT book's chapter PDFs (`https://ncert.nic.in/textbook/pdf/<code><NN>.pdf`, certificate
check off because NCERT's chain is incomplete) and runs `ingest-book.py` on them:

    python3 tools/ingest-ncert.py 7 Science      # one book
    python3 tools/ingest-ncert.py 7              # every subject of Class 7
    python3 tools/ingest-ncert.py --all          # every class and subject in tools/ncert-grades.json

`tools/ncert-grades.json` lists book codes and chapter counts per class and subject (two-part books are merged into one
course). Codes come from the dropdown data on https://ncert.nic.in/textbook.php. Books already built are skipped and
stopped ones resume. Classes 7 to 10 are catalogued; Classes 3 to 5 (English, Hindi, Maths, "The World Around Us") and
Classes 11 and 12 (Physics, Chemistry, Biology, History, Geography, Political Science, Economics and the languages) still
need their codes added. Classes 1 and 2 are mostly pictures with very little text, so a facts-from-the-text pipeline suits them poorly.

The app loads books one class at a time (`loadGrade` in `app.js`): the class chips and subject tabs come from `content/index.json`,
and only the chosen class's `pack.json` files are fetched.

## Diagrams for abstract lessons

`tools/draw-diagrams.py` handles lessons that have no accurate photograph (number patterns, angles). MiniMax-M2.7 writes one SVG
from the lesson's own fact sheet; it is rendered and MiniMax's vision model must score it 8 or more for correctness, labels
and clarity. The SVG is checked to contain no scripts, links or external references, and its credit reads "Diagram drawn for
Lumi from the lesson text". English books only.
