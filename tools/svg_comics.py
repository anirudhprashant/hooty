#!/usr/bin/env python3
"""Comic strip panels for Sparkle.

A comic strip is the recap rail at the bottom of a lesson: a row of panels,
each one a moment from the lesson, ending on the reward. It gives the child
the story of what they just learned without reading a wall of text.

A strip is a list of beats. Each beat picks a scene (from svg_scenes.py), a
pose for the guide, a caption, and a speech bubble. Panels are drawn on a
512 x 320 panel canvas with a 3px comic frame, gutters between them.

Usage:
  python3 tools/svg_comics.py --pack class6-sst-term2
"""

from __future__ import annotations

import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from svg_scenes import ELEMENTS, SCENES, defs, sky_and_ground  # noqa: E402

ROOT = os.path.join(HERE, "..", "public", "content", "packs")
PW, PH = 512, 320
INK = "#2a1a4a"
STROKE = 8


# --------------------------------------------------------------------------
# the guide, redrawn small for panel use
# --------------------------------------------------------------------------


def guide(mood: str, accent: str = "#f7c948", cloth: str = "#7c4ddb", prop: str = "wand") -> str:
    """A simplified bust of the guide character, for comic panels."""
    ink = INK
    # body
    body = (
        f'<g stroke="{ink}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M -40 60 Q -40 8 0 8 Q 40 8 40 60 Z" fill="{cloth}"/>'
        f'<path d="M -30 26 Q 0 42 30 26" fill="none" stroke-width="6"/>'
        f'</g>'
        # arms
        + (
            f'<path d="M -34 24 Q -56 34 -60 52" fill="none" stroke="{ink}" stroke-width="15" '
            f'stroke-linecap="round"/>'
            f'<path d="M -34 24 Q -56 34 -60 52" fill="none" stroke="{cloth}" stroke-width="9" '
            f'stroke-linecap="round"/>'
            f'<path d="M 34 24 Q 56 34 60 52" fill="none" stroke="{ink}" stroke-width="15" '
            f'stroke-linecap="round"/>'
            f'<path d="M 34 24 Q 56 34 60 52" fill="none" stroke="{cloth}" stroke-width="9" '
            f'stroke-linecap="round"/>'
        )
        # head
        + f'<circle cx="0" cy="-16" r="42" fill="#f2c8a0" stroke="{ink}" stroke-width="{STROKE}"/>'
        # hair
        + f'<path d="M -43 -12 C -45 -52 -24 -64 0 -64 C 24 -64 45 -52 43 -12 '
          f'C 38 -32 30 -40 18 -42 C 12 -28 2 -22 -8 -20 C -22 -18 -32 -22 -36 -34 '
          f'C -40 -28 -42 -20 -43 -12 Z" fill="#3d2419" stroke="{ink}" stroke-width="{STROKE}" '
          f'stroke-linejoin="round"/>'
        # tiara
        + f'<path d="M -22 -46 Q 0 -58 22 -46 L 19 -38 Q 0 -50 -19 -38 Z" fill="{accent}" '
          f'stroke="{ink}" stroke-width="5" stroke-linejoin="round"/>'
        # eyes
        + (
            f'<path d="M -20 -12 Q -13 -22 -6 -12" fill="none" stroke="{ink}" stroke-width="5" '
            f'stroke-linecap="round"/>'
            f'<path d="M 6 -12 Q 13 -22 20 -12" fill="none" stroke="{ink}" stroke-width="5" '
            f'stroke-linecap="round"/>'
            if mood == "happy"
            else f'<circle cx="-13" cy="-14" r="6" fill="{ink}"/><circle cx="13" cy="-14" r="6" fill="{ink}"/>'
            f'<circle cx="-15" cy="-16" r="2" fill="#ffffff"/><circle cx="11" cy="-16" r="2" fill="#ffffff"/>'
        )
        # mouth
        + (
            f'<path d="M -11 -2 Q 0 10 11 -2 Z" fill="#8c3b52" stroke="{ink}" stroke-width="4" '
            f'stroke-linejoin="round"/>'
            if mood == "happy"
            else f'<path d="M -9 0 Q 0 7 9 0" fill="none" stroke="{ink}" stroke-width="4" '
                 f'stroke-linecap="round"/>'
        )
        # prop
        + (
            f'<g transform="translate(60 50) rotate(-30)">'
            f'<path d="M 0 0 L 0 -44" stroke="{ink}" stroke-width="10" stroke-linecap="round"/>'
            f'<path d="M 0 0 L 0 -44" stroke="{accent}" stroke-width="5" stroke-linecap="round"/>'
            f'<polygon points="0,-66 8,-54 21,-54 11,-46 14,-33 0,-41 -14,-33 -11,-46 -21,-54 -8,-54" '
            f'fill="{accent}" stroke="{ink}" stroke-width="4" stroke-linejoin="round"/>'
            f'</g>'
            if prop == "wand"
            else ""
        )
    )
    return body


def bubble(text: str, x: int, y: int, w: int = 190) -> str:
    """A speech bubble with wrapped text."""
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = (cur + " " + word).strip()
        if len(trial) > 19 and cur:
            lines.append(cur)
            cur = word
        else:
            cur = trial
    if cur:
        lines.append(cur)
    lines = lines[:4]

    lh = 20
    h = 16 + len(lines) * lh
    body = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="#ffffff" '
        f'stroke="{INK}" stroke-width="6"/>',
        f'<path d="M {x + 26} {y + h - 4} L {x + 34} {y + h + 18} L {x + 50} {y + h - 4} Z" '
        f'fill="#ffffff" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>',
    ]
    for i, line in enumerate(lines):
        body.append(
            f'<text x="{x + w / 2}" y="{y + 27 + i * lh}" text-anchor="middle" '
            f'font-family="Nunito, Verdana, sans-serif" font-size="17" font-weight="700" '
            f'fill="{INK}">{line}</text>'
        )
    return "".join(body)


def caption(text: str) -> str:
    """A narration box under the panel art."""
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = (cur + " " + word).strip()
        if len(trial) > 34 and cur:
            lines.append(cur)
            cur = word
        else:
            cur = trial
    if cur:
        lines.append(cur)
    lines = lines[:4]
    lh = 18
    h = 14 + len(lines) * lh
    top = CAP_TOP
    left = 126
    right = PW - 16
    body = [
        f'<rect x="{left}" y="{top}" width="{right - left}" height="{h}" rx="10" '
        f'fill="#ffffff" stroke="{INK}" stroke-width="5"/>',
    ]
    for i, line in enumerate(lines):
        body.append(
            f'<text x="{(left + right) / 2}" y="{top + 22 + i * lh}" text-anchor="middle" '
            f'font-family="Nunito, Verdana, sans-serif" font-size="15" font-weight="600" '
            f'fill="#3d3d52">{line}</text>'
        )
    return "".join(body)


# Panel layout constants. The art band sits above a clean white strip so the
# caption and the narrator never overlap the illustration.
ART_BOTTOM = 236      # where the scene art is clipped
CAP_TOP = 244         # where the caption strip begins
GUIDE_X = 74          # narrator centre, left side
GUIDE_Y = 250


def panel(beat: dict, index: int) -> str:
    """One comic panel."""
    scene = SCENES.get(beat.get("scene", ""), {})
    sky = beat.get("sky") or scene.get("sky", "day")
    ground = beat.get("ground") or scene.get("ground", "grass")

    body = [f'<rect width="{PW}" height="{PH}" fill="#ffffff"/>']

    # Scene art, clipped to the art band so nothing bleeds into the caption
    # strip and no part of the scene is pushed off the top of the panel.
    art = sky_and_ground(sky, ground)
    art_svg = (
        f'<g clip-path="url(#panelClip{index})">'
        + "".join(art)
        + "".join(
            f'<g transform="translate({e.get("x", 256)} {e.get("y", 246)}) '
            f'scale({e.get("scale", 1.0)})">'
            f'{ELEMENTS[e["kind"]]()}</g>'
            for e in scene.get("elements", []) if e["kind"] in ELEMENTS
        )
        + "</g>"
    )
    body.append(art_svg)

    # Narrator bust, bottom-left, standing in front of the art.
    body.append(
        f'<g transform="translate({beat.get("gx", GUIDE_X)} {beat.get("gy", GUIDE_Y)}) '
        f'scale({beat.get("gscale", 0.62)})">{guide(beat.get("mood", "calm"))}</g>'
    )

    if beat.get("say"):
        body.append(bubble(beat["say"], beat.get("bx", 236), beat.get("by", 20)))
    if beat.get("caption"):
        body.append(caption(beat["caption"]))

    # frame
    body.append(
        f'<rect x="4" y="4" width="{PW - 8}" height="{PH - 8}" rx="18" fill="none" '
        f'stroke="{INK}" stroke-width="8"/>'
    )
    return "".join(body)


def strip(beats: list[dict]) -> str:
    """A full strip: panels side by side with gutters."""
    gap = 18
    total = len(beats) * PW + (len(beats) - 1) * gap + 32
    body = [f'<rect width="{total}" height="{PH + 16}" fill="none"/>']
    for i, beat in enumerate(beats):
        x = 16 + i * (PW + gap)
        body.append(f'<g transform="translate({x} 8)">{panel(beat, i)}</g>')
    # one clip path per panel, so each panel's art stops at the caption strip
    clips = "".join(
        f'<clipPath id="panelClip{i}">'
        f'<rect x="0" y="0" width="{PW}" height="{ART_BOTTOM}"/>'
        f'</clipPath>'
        for i in range(len(beats))
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total} {PH + 16}" '
        f'width="{total}" height="{PH + 16}" role="img">{defs()}<defs>{clips}</defs>'
        f'{"".join(body)}</svg>'
    )


# --------------------------------------------------------------------------
# catalogue
# --------------------------------------------------------------------------

STRIPS = {
    # Chapter 1 recap: what the child just learned about the Mauryan Empire
    "comic-ch1-mauryan": [
        dict(scene="hist-magadha", mood="calm",
             say="Once upon a time, Magadha grew strong.",
             caption="Magadha was the powerful kingdom that rose to the west of the Ganga."),
        dict(scene="hist-chanakya", mood="calm",
             say="A clever teacher named Chanakya had a plan.",
             caption="Chanakya helped Chandragupta defeat the Nandas and found the Mauryan Empire."),
        dict(scene="hist-mauryan-empire", mood="happy",
             say="Now the whole empire listens!",
             caption="Chandragupta and then Ashoka ruled a vast empire across India."),
        dict(scene="hist-ashoka-dhamma", mood="happy",
             say="Ashoka taught dhamma, not war.",
             caption="After Kalinga, Ashoka spread dhamma through his edicts and welfare work."),
    ],
    "comic-ch1-ashoka": [
        dict(scene="hist-kalinga", mood="calm",
             say="The battle of Kalinga changed everything.",
             caption="Ashoka fought a war in Kalinga and felt deep sorrow at the killing."),
        dict(scene="hist-ashoka-dhamma", mood="calm",
             say="So he wrote his message on stone.",
             caption="Ashoka's edicts told people to be kind, to give, and to respect all faiths."),
        dict(scene="hist-ashoka-gifts", mood="happy",
             say="He sent gifts to many kingdoms.",
             caption="Ashoka sent gifts and missionaries to other lands, and other kings sent gifts back."),
        dict(scene="hist-stupa-worship", mood="happy",
             say="And people remembered him with kindness.",
             caption="Stupas and pillars were raised where Ashoka's words and works were honoured."),
    ],
}


def stack(beats: list[dict]) -> str:
    """A vertical version of the strip: panels one above the other.

    A four-panel row is unreadable on a phone, so the same panels are laid out
    as a scrollable column for small screens.
    """
    gap = 14
    total_h = len(beats) * PH + (len(beats) - 1) * gap + 32
    body = [f'<rect width="{PW + 32}" height="{total_h}" fill="none"/>']
    for i, beat in enumerate(beats):
        y = 16 + i * (PH + gap)
        body.append(f'<g transform="translate(16 {y})">{panel(beat, i)}</g>')
    clips = "".join(
        f'<clipPath id="panelClip{i}">'
        f'<rect x="0" y="0" width="{PW}" height="{ART_BOTTOM}"/>'
        f'</clipPath>'
        for i in range(len(beats))
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {PW + 32} {total_h}" '
        f'width="{PW + 32}" height="{total_h}" role="img">{defs()}<defs>{clips}</defs>'
        f'{"".join(body)}</svg>'
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pack", default="class6-sst-term2")
    args = ap.parse_args()

    out = os.path.join(ROOT, args.pack, "media")
    os.makedirs(out, exist_ok=True)
    for name, beats in STRIPS.items():
        path = os.path.join(out, f"{name}.svg")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(strip(beats))
        print(" ", path)
        path_v = os.path.join(out, f"{name}-stack.svg")
        with open(path_v, "w", encoding="utf-8") as fh:
            fh.write(stack(beats))
        print(" ", path_v)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
