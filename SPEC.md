# SPEC — Open-source modular learning game for children

Source: Anirudh's original prompt, 2026-10-29. Verbatim below.

---

You are building an open-source, modular learning game for children, as easy and addictive as Duolingo. Build the whole thing, end to end, and ship it. Use your installed skills (design, frontend, illustration etc.) and oh-my-hermes workflows wherever they help. Plan first, then build in phases, and report progress in short messages.

## Vision
A child opens it, taps one big button, and is learning within 5 seconds. No sign-up wall, no clutter. It must work for ANY subject, ANY grade, ANY curriculum, ANY language, and ANY child's interests. The first user is my sister (Class 6, CBSE/NCERT-aligned, Eduvate books), but she is only the seed content, never the scope.

## The core idea: three layers that never touch each other
1. ENGINE: the game mechanics (XP, streaks, hearts, levels, skill path, spaced repetition, rewards). Subject-agnostic and theme-agnostic.
2. CONTENT PACKS: plain JSON/YAML + media files describing a course: subject > unit > lesson > activities. Anyone can write one. A new subject or grade is a new folder, with zero code changes. Define and document the schema first, with a validator and 2 example packs.
3. THEME PACKS: visuals, mascot, palette, fonts, sounds, reward art, copy tone. Swapping the theme reskins everything without touching content or engine. Ship at least 4 very different themes to prove it: (a) "Enchanted Kingdom" (princesses, unicorns, magical academy, the vibe my sister loves), (b) "Space Explorers", (c) "Jungle / Wildlife", (d) a calm minimal theme. A child, parent or teacher picks the theme per learner, and can change it any time. Never hard-code a theme's look into the engine.

## Activity types (each a pluggable module with a schema)
MCQ, true/false, fill in the blank, match the pairs, drag-to-order (timelines, steps), drag-label on an image or map, type the answer, listen-and-pick (text-to-speech), flashcard flip, short story or concept card, and "watch then answer". Adding a new type must mean adding one file.

## Media in the middle of lessons
Lessons can embed YouTube (use youtube-nocookie.com, with start/end times and a required question after the clip), plus images, audio, and short video. Embeds are just a block in the content pack. Store the video URL, timestamps and a one-line reason it was picked. Include a script that suggests candidate videos for a lesson topic for a human to approve. Never auto-publish unreviewed videos. Keep age-appropriate and ad-minimal.

## Learning design (this is what makes kids actually learn)
- Lessons are 3-5 minutes, 8-12 activities, ending with a celebration. Easy to hard inside each lesson.
- Wrong answers get a kind explanation and the item returns later in the same session.
- Spaced repetition across days. A "Practice weak spots" button is always one tap away.
- Streaks, XP, hearts and daily goals, tuned to encourage and never to punish. A child who loses all hearts can always refill by practising. No dark patterns, no ads, no loot boxes, no real-money anything.
- Unlockable rewards (stickers, mascot outfits, theme items) that are themed.
- Parent/teacher view: progress per unit, weak topics, time spent. All data local-first.

## Visual quality bar
Incredible, polished, joyful, never generic. Real illustration and motion: character mascots that react to right/wrong answers, smooth transitions, confetti and sparkle on wins, big tappable targets, rounded friendly type, high contrast. Generate original art (mascots, backgrounds, reward art, map art) with the image tools you have, consistent per theme. Mobile-first and tablet-friendly. Must also look great on a laptop. Respect reduced-motion and have a sound on/off switch. Test at phone width (390px) and tablet width (820px) by taking real screenshots, and fix what looks off. Use the design/anti-slop skills.

## Tech and delivery
- A PWA: installs from the browser to the home screen, works offline after first load, no app-store needed. Vanilla JS or a light framework, whichever stays simplest. Static files plus a tiny optional sync server. Progress lives in the browser (IndexedDB) by default, with optional export/import and an optional account for cross-device sync later.
- Multi-language UI from day one (English first, structure ready for Hindi, Kannada and others). Content packs declare their language.
- Accessibility: keyboard use, screen-reader labels, dyslexia-friendly font option, adjustable text size.
- Children's privacy: no third-party trackers, no analytics that identify a child, no ads. Follow India's DPDP rules and COPPA in spirit.
- Deploy on the oracle server as one small service following the existing deploy pattern there (systemd or PM2 on a free port, behind the existing Cloudflare tunnel). Pick a subdomain on barestack.org and tell me which one. Do NOT install anything on my riptide Windows machine and do not create scheduled tasks there.
- Keep it in a public GitHub repo with an open-source licence (MIT for code, CC-BY-SA for the sample packs), a README, and a "How to write a content pack" and "How to write a theme pack" guide that a teacher with no coding skill can follow.

## Content pipeline (so we can add the whole curriculum fast)
Build a tool that takes a chapter (photos or a PDF of a textbook page, or a plain text outline) and drafts a content pack: OCR, then a lesson outline, then original questions, then flags for a human to review before publishing. Copyright rule: never copy a publisher's text or images. Write ORIGINAL questions and explanations from the facts and concepts, and use NCERT (free, public) and other openly licensed sources (Wikimedia, Khan Academy CC content, OpenStax) as reference material. Every pack records its sources. The bulk question drafting can be run through cheaper models, but a review pass checks factual correctness before anything ships. Wrong facts in a child's lesson are a bug.

## Seed content (build and polish this first, as proof)
Class 6, NCERT-aligned, from her Eduvate textbooks. She has 4 books across Term 1 and Term 2. I have only given you the Social Science, Term 2 (Volume 3) contents so far. Start with that one, then ask me for the other three books' contents pages (I will send photos).
Social Science, Term 2:
- History: 1. The First Empire (Mauryan emergence, Ashoka and his philosophy, Kalinga war, sources); 2. Life in Towns and Villages (exploring the past, villages and new towns); 3. India After the Mauryas (Guptas, Harshavardhana, rulers of the South); 4. Culture and Science (literature, art and architecture, science)
- Geography: 5. The Four Domains of the Earth (atmosphere, lithosphere, hydrosphere, biosphere); 6. My Country, India (position, physical divisions, with a map-label activity)
- Civics: 7. Local Government (rural and urban); 8. Making a Living (livelihoods, interdependence)
Build all 8 chapters as packs, each ending in a boss challenge. Then build a tiny non-SST sample pack (e.g. 3 maths lessons) to prove the engine really is subject-agnostic.

## Phases
1. Schema, engine skeleton, one theme, one chapter playable end to end. Send me screenshots.
2. All activity types, spaced repetition, rewards, the 4 themes.
3. All 8 SST chapters, video embeds, the parent view, offline PWA.
4. Content-pipeline tool, docs, deploy, repo.
Stop and message me after each phase with a screenshot or link. Ask only if truly blocked. Pick sensible defaults otherwise.

## Done means
My sister can open the link on a tablet, pick the Enchanted Kingdom theme, finish a History lesson with a video in the middle, earn a streak, and want to come back tomorrow. And a stranger can swap the theme to Space and add a Class 9 Science pack in under an hour using only the docs.

---

## Operating instructions from Anirudh (2026-10-29, added after the original prompt)

- Use the `design-taste-frontend` and `anthropics-frontend-design` skills for the visuals.
- Use `opencode-free-delegation` for the bulk question drafting.
- Check every fact against NCERT before it ships. Anirudh verifies; I verify too.
- Build location: `~/agent-workspace/learning-game/`.
- Deploy on the oracle server: one small service, free port, systemd --user, behind the existing Cloudflare tunnel, on a `barestack.org` subdomain.
