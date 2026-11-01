# How a Hooty lesson teaches

The aim: a child who uses Hooty understands the idea and does well at school. Lessons are not built around exam papers, but no child
should meet a style of question in school that Hooty never showed them.

## The shape of a lesson

Hook (a curiosity question), passage, concept cards, then:

- **Maths:** worked example (picture, reasoning revealed step by step), warm-ups with the picture showing, recall capped at four,
  word problems, a second worked example, two-step challenges. Numbers are drawn fresh on every play, and "More problems" gives more rounds.
- **Every other subject:** a think-it-through card (a situation reasoned out step by step), recall capped at six, then reasoning questions.
- **A wrong answer teaches.** It names the misunderstanding behind that option, then shows the steps and the picture.

## Why this shape

Long-established findings from learning research: studying worked examples before solving helps beginners (worked-example effect), concrete
pictures before symbols build meaning (concrete, representational, abstract), recalling beats rereading (retrieval practice), and
spacing brings it back later (Practise tab). Known trouble spots to aim wrong options at include procedures learned without
meaning, and the equals and minus signs (Booth and Koedinger, 2008, as cited in the source below).

## What school papers look like (research, October 2026)

Mostly third-party summaries, not official CBSE documents, and they disagree in places, so treat as direction only and check
cbseacademic.nic.in before relying on numbers.

- Classes 9 and 10: about 40 to 50 percent competency-based questions (sources differ), with MCQ, case-based and source-based formats.
- Classes 6 to 8: no board exam; school papers vary, typically MCQ or very short, short, and long or case-based answers, and are moving the same way.
- New NCERT books emphasise conceptual clarity, reasoning and visualisation.

Chapter weightages are deliberately NOT built in: the figures found could not be verified.

Sources: [Physics Wallah](https://www.pw.live/school-prep/exams/cbse-class-10-exam-pattern), [Careers360](https://school.careers360.com/articles/cbse-class-10-mathematics-blueprint-2025-chapter-wise-weightage-exam-pattern),
[Oswaal, Class 7](https://oswaalbooks.com/pages/cbse-class-7-exam-pattern-2026-27), [Oswaal, Class 8](https://oswaalbooks.com/pages/cbse-class-8-exam-pattern-2026-27),
[Vedantu, Class 9](https://www.vedantu.com/cbse/cbse-class-9-marking-scheme), [algebra misconceptions paper](https://core.ac.uk/download/77937877.pdf).

## How it stays correct

- **Maths** (`tools/calc-problems.py`, `core/gen.js`, `core/models.js`): answers are computed by code. A second reader rejects off-topic problems,
  every equation in the steps is checked, and a blind solver must agree on two different draws. Pictures are drawn from the numbers.
- **Other subjects** (`tools/deepen.py`): only the lesson's checked facts, numbers must appear in them, a blind reader must pick the same answer, and a strict reviewer rejects anything that needs no reasoning.
- `tools/assemble-pack.py` merges all this, and re-running either tool is safe.
