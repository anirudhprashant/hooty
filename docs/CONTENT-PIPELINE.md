# Content pipeline: how a chapter becomes lessons

Source of truth for Social Science Class 6 is the NCERT textbook *Exploring Society: India and Beyond*
(14 chapters). Its text lives in `sources/ncert-class6-ss/` (git-ignored: NCERT's text is not ours to redistribute).

```
sources/ncert-class6-ss/
  index.json              14 chapters: title, theme, printed page range
  chapters/chNN.txt       text split by printed book page ("=== BOOK PAGE 14 ===")
  glossary-ncert.json     the book's own glossary (252 terms), used as a checklist, not copied
```

Chapter 1's file also contains the book's Introduction (printed pages 1-6).

## Rules that make it trustworthy

1. **Every claim cites the book.** Each activity (and each glossary term) carries
   `"src": [{ "ch": 1, "p": 14, "ev": "Halfway between them is the Equator" }]`:
   chapter, printed page, and a verbatim phrase of 12 words or fewer.
2. **`node tools/verify-sources.mjs <pack|lesson.json> [--glossary glossary.json]` must pass.** It checks that
   the phrase is on that page, that **every number** in the question, options and explanation appears in the cited
   chapter (this is what catches an invented date), and lists capitalised names that are not in the chapter.
3. **Original words.** Questions and explanations are written fresh; evidence phrases only point at the book.
   `ev` is stripped from the shipped pack by `build-pack.mjs`; `ch` and `p` stay so the app can say
   "In your book: Chapter 1, page 14".
4. **Simple language.** `node tools/readability.mjs <pack> --glossary glossary.json` targets Flesch-Kincaid grade
   6.5 or lower per activity and sentences of 20 words or fewer. Subject words the lesson teaches are listed in the
   glossary and are not counted against it.
5. **BCE / CE, never BC / AD.** British-Indian spelling. Warm, plain, encouraging.
6. **Anything uncertain is flagged for a human**, never guessed.

## Per chapter, in order

1. Read the chapter text; list its sections, key ideas, figures, maps and the "Let's explore" activities.
2. Write the lesson outline (3 to 4 lessons + a chapter challenge), each lesson 8 to 12 activities.
3. Draft activities with `src`. Mix types: concept, mcq, truefalse, matchpairs, dragorder, draglabel, fillblank.
4. Write the chapter glossary (`glossary.json`): plain meaning, one short example if useful, `src`.
5. Run `verify-sources`, `readability`, `validate-pack`. Fix everything.
6. Human review pass on anything flagged, then publish.

## Tap-a-word

Declare it in `pack.json` with `"glossary": "glossary.json"`. The file `public/content/packs/<pack>/glossary.json` is `{ "terms": [ { "term", "aka": [], "meaning", "example"?, "src": [{ch,p,ev}] } ] }`.
The first mention of a term in a question's explanatory text becomes a tappable word (never inside answer buttons).

## Voice

Concept cards and glossary meanings are read aloud from pre-recorded clips (Microsoft Edge neural voice
`en-US-AvaMultilingualNeural`, free). After adding or editing content, regenerate them from a home network
(Microsoft rejects datacentre IPs such as oracle): `python tools/make-audio.py` in a venv with `edge-tts`.
It writes `public/audio/*.mp3` and `manifest.json`; lines with no clip fall back to the browser voice.

## Rewards and reading passages (added with the Lumi rename)

- **Explorer stickers.** The theme rewards end at 300 XP, so `tools/svg_stickers.py` draws nine more
  (compass, book, flask, globe, telescope, lantern, trophy, medal, starburst; 500 to 10,000 XP) into
  `public/assets/stickers/`. `--register` adds them to every `theme.json`. They are code-drawn SVG, like
  all art here. To add one, write a drawer function and a row in `STICKERS`, then re-run with `--register`.
- **Passage quality.** `tools/add-reading.py` asks for four or five flowing paragraphs and at most two
  sentences opening with "you". To redo weak ones, delete the `passage` key from the lesson's entry in
  `work/<book>/chNN/reading.json` and re-run `SPARKLE_SUBJECT=<slug> python3 tools/add-reading.py N --passages`.
  Passages that fail the book audit are dropped and the lesson keeps only its hook.
