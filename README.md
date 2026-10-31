# Lumi

A free learning game for Indian school children, built on the NCERT textbooks: lessons that explain the idea, simulations to play with, word problems with fresh numbers and worked steps, and questions in very simple English.

Plain JavaScript modules with no build step. To try it: `python3 tools/serve.py`.

- `public/` the app and the finished courses
- `tools/` turns a textbook PDF into a course (`docs/INGEST.md`)
- `docs/PEDAGOGY.md` how the lessons teach, `docs/CONTENT-PIPELINE.md` how facts are checked

Read-aloud audio is generated with `tools/make-audio.py` and not kept in the repo. Textbooks are downloaded from ncert.nic.in and not kept here either.
