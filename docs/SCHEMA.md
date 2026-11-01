# Content Pack Schema v1.0

A content pack is a folder. The folder contains one `pack.json` plus optional media.
Nothing in the engine knows about any specific subject, grade or language.

```
content/packs/
  class6-sst-term2/
    pack.json
    media/
      chapter-ashoka.jpg
  class6-maths-sample/
    pack.json
```

---

## 1. Top level

```jsonc
{
  "schemaVersion": "1.0",
  "id": "class6-sst-term2",          // lowercase, kebab-case, unique
  "title": "Social Science - Term 2",
  "language": "en",                   // ISO 639-1
  "subject": "Social Science",
  "grade": "6",
  "curriculum": "CBSE / NCERT",
  "version": "1.0.0",
  "description": "...",
  "sources": [                        // required: at least one
    {
      "title": "NCERT Social Science Class 6 (public, free)",
      "url": "https://ncert.nic.in/textbook.php",
      "license": "Public domain / free to use for educational purposes",
      "usedFor": "concept verification"
    }
  ],
  "review": {
    "status": "approved",             // draft | in-review | approved
    "reviewedBy": "Ella",
    "reviewedAt": "2026-10-29"
  },
  "units": [ ... ]
}
```

**Copyright rule.** `sources` lists where the facts came from. Questions and explanations
must be ORIGINAL text written from those facts. Never copy a publisher's wording or images.
Assets you did not license must not be bundled.

---

## 2. Structure

```
pack
  └── unit[]            subject chapter grouping (History, Geography, Civics)
        └── chapter[]   one chapter of the book
              └── lesson[]   3-5 minutes, 8-12 activities
                    └── activity[]   one of the pluggable activity types
```

### unit

```jsonc
{
  "id": "history",
  "title": "History",
  "icon": "🏛️",            // optional emoji or icon key; themes may override
  "chapters": [ ... ]
}
```

### chapter

```jsonc
{
  "id": "ch1-first-empire",
  "title": "The First Empire",
  "summary": "How the Mauryan Empire rose, and how Ashoka changed the rules.",
  "lessons": [ ... ],
  "boss": {                        // optional but recommended: one per chapter
    "title": "Boss Challenge: The First Empire",
    "activities": [ ... ]
  }
}
```

### lesson

```jsonc
{
  "id": "ch1-l1-mauryan-empire",
  "title": "The Mauryan Empire Begins",
  "estimatedMinutes": 4,
  "activities": [ ... ]
}
```

Lesson-level rules the engine enforces loosely (never blocks, just warns in the validator):

- 8 to 12 activities
- easy -> hard ordering: the validator checks that `difficulty` is non-decreasing when present
- at least one `concept` or `story` activity so the lesson teaches before it tests

---

## 3. Activity types

Every activity shares:

```jsonc
{
  "type": "mcq",                 // required: the pluggable module name
  "id": "ch1-l1-a1",             // unique within the lesson
  "difficulty": 1,               // 1 = easy, 2 = medium, 3 = hard
  "tags": ["mauryan", "chandragupta"]   // optional, used for weak-spot reporting
}
```

### `mcq`
```jsonc
{
  "type": "mcq",
  "id": "a1",
  "prompt": "Who was the founder of the Mauryan Empire?",
  "options": ["Chandragupta Maurya", "Ashoka", "Bindusara", "Harshavardhana"],
  "answer": 0,                   // index into options
  "explanation": "Chandragupta Maurya founded the empire in 321 BCE with help from Chanakya (Kautilya).",
  "image": "media/mauryan.jpg",  // optional
  "feedback": { "correct": "Yes! Chandragupta Maurya founded the empire.", "wrong": "Not quite. Think about who was advised by Chanakya." }
}
```

### `truefalse`
```jsonc
{ "type": "truefalse", "id": "a2", "prompt": "Ashoka gave up war after the Kalinga war.",
  "answer": true, "explanation": "Correct. After Kalinga, Ashoka adopted dhamma and turned towards peace." }
```

### `fillblank`
```jsonc
{ "type": "fillblank", "id": "a3",
  "prompt": "The Kalinga war was fought by Ashoka in the year ______ BCE.",
  "answers": ["261"],           // any one of these is accepted, case-insensitive
  "hint": "It is in the 260s BCE.",
  "explanation": "The battle of Kalinga happened in 261 BCE." }
```

### `matchpairs`
```jsonc
{ "type": "matchpairs", "id": "a4", "prompt": "Match the ruler to the dynasty.",
  "pairs": [["Chandragupta Maurya", "Mauryan"], ["Ashoka", "Mauryan"], ["Chandragupta II", "Gupta"]],
  "explanation": "..." }
```

### `dragorder`
```jsonc
{ "type": "dragorder", "id": "a5", "prompt": "Put the steps in the right order.",
  "items": ["Kalinga war", "Dhamma adopted", "Rock edicts", "Mauryan Empire"],
  "explanation": "..." }
```

### `draglabel`
```jsonc
{ "type": "draglabel", "id": "a6", "prompt": "Label the four domains of the Earth.",
  "image": "media/domains.png",
  "labels": [
    { "text": "Atmosphere", "x": 18, "y": 12 },   // x/y are percentages of image width/height
    { "text": "Hydrosphere", "x": 74, "y": 40 }
  ],
  "explanation": "..." }
```

### `typeanswer`
```jsonc
{ "type": "typeanswer", "id": "a7", "prompt": "Name the four spheres of the Earth.",
  "answers": ["atmosphere lithosphere hydrosphere biosphere"],
  "explanation": "..." }
```

### `listenpick`
```jsonc
{ "type": "listenpick", "id": "a8", "prompt": "Listen and pick the right meaning.",
  "speech": "Ashoka was the third Mauryan ruler.",   // read aloud by the browser
  "options": ["Third Mauryan ruler", "First Mauryan ruler", "First Gupta ruler"],
  "answer": 0, "explanation": "..." }
```

### `flashcard`
```jsonc
{ "type": "flashcard", "id": "a9", "prompt": "Tap to flip.",
  "front": "What is the capital of Maurya?",
  "back": "Pataliputra, near modern Patna.",
  "explanation": "..." }
```

### `concept` (short story or concept card)
```jsonc
{ "type": "concept", "id": "a10", "title": "Who was Chanakya?",
  "body": "Chanakya, also called Kautilya, was a teacher and advisor...",
  "keyPoints": ["Advisor to Chandragupta Maurya", "Wrote the Arthashastra", "Taught statecraft"],
  "image": "media/chanakya.jpg",
  "explanation": "..." }
```

### `watchanswer` (watch then answer)
```jsonc
{ "type": "watchanswer", "id": "a11",
  "prompt": "Watch the clip, then answer.",
  "video": {
    "provider": "youtube",
    "id": "dQw4w9WgXcQ",          // youtube video id
    "start": 30, "end": 120,      // seconds
    "reason": "Short animated map of the Mauryan empire for a visual anchor.",
    "reviewedBy": "human",        // required: never auto-publish
    "reviewedAt": "2026-10-29"
  },
  "options": ["A", "B"], "answer": 0, "explanation": "..." }
```

Videos are always embedded from `youtube-nocookie.com`. A `watchanswer` activity MUST have a
question after the clip. `video.reviewedBy` must not be empty for the pack to be `approved`.

### `media` (a media block between activities)
```jsonc
{ "type": "media", "id": "a5b", "kind": "image",
  "src": "media/ashoka-stone.jpg", "alt": "Ashokan pillar at Delhi",
  "caption": "An Ashokan pillar at Delhi." }
```
`kind` is `image`, `audio` or `video`. For `audio`/`video`, give `src` a path inside the pack.

---

## 4. Theme pack schema v1.0

A theme is a folder. It changes the entire look and the copy voice. It never changes
content, and the engine never hard-codes a theme.

```
themes/enchanted-kingdom/
  theme.json
  theme.css
  assets/
    mascot-happy.png
    mascot-wrong.png
    mascot-idle.png
    background.png
    reward-sticker-1.png
  sounds/
    correct.mp3
    wrong.mp3
    win.mp3
```

```jsonc
{
  "schemaVersion": "1.0",
  "id": "enchanted-kingdom",
  "name": "Enchanted Kingdom",
  "description": "Princes, unicorns and a magical academy.",
  "language": "en",
  "palette": {
    "bg": "#1c1030",
    "bgAlt": "#2a1a4a",
    "surface": "#3a2560",
    "surfaceAlt": "#4a3078",
    "text": "#fdf7ff",
    "textMuted": "#c9b3e8",
    "primary": "#f0b429",     // gold
    "primaryText": "#3a2560",
    "secondary": "#ff7ab8",   // pink
    "success": "#3ddc97",
    "danger": "#ff6b6b",
    "locked": "#5a4a72"
  },
  "fonts": {
    "display": "\"Baloo 2\", system-ui, sans-serif",
    "body": "\"Nunito\", system-ui, sans-serif"
  },
  "radii": { "sm": "10px", "md": "18px", "lg": "28px", "pill": "999px" },
  "mascot": {
    "idle": "assets/mascot-idle.png",
    "happy": "assets/mascot-happy.png",
    "wrong": "assets/mascot-wrong.png",
    "name": "Hooty"
  },
  "background": "assets/background.png",
  "rewards": [
    { "id": "sticker-unicorn", "name": "Unicorn Sticker", "art": "assets/reward-sticker-1.png", "unlockAt": 100 }
  ],
  "sounds": {
    "correct": "sounds/correct.mp3",
    "wrong": "sounds/wrong.mp3",
    "win": "sounds/win.mp3",
    "tap": "sounds/tap.mp3"
  },
  "copy": {
    "appName": "Enchanted Academy",
    "start": "Begin your quest",
    "continue": "Continue",
    "correct": ["Yes!", "You got it!", "Wonderful!"],
    "wrong": ["Almost. Let's try again.", "Not quite. Here's why:"],
    "practiceWeak": "Train your weak spots",
    "celebrateTitle": "Quest complete!"
  }
}
```

Themes may also override `unitIcons` (map of unit id -> asset path) so a jungle theme can
show a tiger for History.

---

## 5. Adding a new activity type

1. Create `engine/activities/<type>.js` exporting:
   ```js
   export default {
     type: "mytype",
     schema: { /* optional JSON-schema-ish hints */ },
     render(activity, ctx) { /* return an HTMLElement */ },
     check(activity, response) { /* return { correct: boolean } */ },
   };
   ```
2. Register it in `engine/activities/index.js`.
3. That is all. Content packs can now use `"type": "mytype"`.

The engine supplies `ctx` with: `onCorrect`, `onWrong`, `setStatus`, `theme`, `speak(text)`,
`locale`, and `reducedMotion`.

---

## 6. Validator

```bash
node tools/validate-pack.mjs content/packs/class6-sst-term2/pack.json
```

It checks: required fields, id uniqueness, activity type existence, option counts,
answer indexes in range, missing explanations, un-reviewed videos, media files that do not
exist, lesson activity counts, and non-decreasing difficulty. Exit code 1 on any error.
