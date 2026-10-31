# Art: how the pictures are made

## Real pictures (lessons)
Topic pictures come from Wikimedia Commons (public domain, CC0, CC BY, CC BY-SA only), found with the
`assets.mjs` search in the design-taste skill. Each lesson stores `topicScene`, `sceneAlt`, `sceneCaption` and
`sceneCredit` {text, url, license}. The credit shows under the picture and in Settings > Picture credits.
Source list: `public/content/packs/class6-sst/media/credits.json`. Pictures are resized to 1200px WebP.

## Lumi (the guide) and the world scenes
Generated with Google's image model through the Antigravity CLI (`agy`, model gemini-3.8-flash for the agent;
the image tool reported gemini-3.1-flash-image). Style B: gouache and cut-paper collage, visible paper grain.
- Reference image: `work/art/originals/style-b.png`. Poses are made by passing it as the reference:
  `agy --model gemini-3.8-flash-medium --add-dir <dir> --dangerously-skip-permissions -p "Use your image generation tool with <dir>/ref.png as the style and character reference. Keep EXACTLY the same character ... Pose: ..."`
- Phrase prompts plainly ("stylised illustrated mascot character for an educational history app"). Wording that
  combines a child's age with body descriptions is rejected by Google's filter.
- Cut out: `magick in.png -alpha set -fuzz 9% -fill none -draw "color 0,0 floodfill" (and the other three corners) ...
  -channel A -morphology Erode Disk:1 -blur 0x0.7 -level 20%,100% +channel -trim -resize x640 out.webp`.
- Outfits are per subject. `explorer` (indigo cloak, satchel, scroll) is used for Social Science.

## Quota
The image quota is limited (HTTP 429 RESOURCE_EXHAUSTED, resets after a few hours). Not yet regenerated in the
painted style: the Space Starlight world scene (still the vector `hero.svg`), the sticker/reward icons, unit icons.
