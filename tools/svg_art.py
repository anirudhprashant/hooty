#!/usr/bin/env python3
"""Hand-built SVG art for Sparkle.

Every character, reward, unit badge and scene in the game is generated here
as SVG. Nothing is sampled from an image model: the shapes are drawn from
primitives so the whole cast shares one design language (same outline
weight, same joint radii, same shadow tone, one locked palette per theme).

Design language
---------------
* Flat vector. Two tones per material: base + one shadow tone. No gradients
  on characters (gradients only in skies).
* One outline weight (9 units on a 512 canvas) in the theme's ink colour.
* Round joins and caps everywhere, so nothing reads as a cut-out sticker.
* Same guide character in every world: one silhouette, one face
  construction, costume and prop change with the theme. That is what makes
  a set of themes feel like one product.
* Moods are drawn, not swapped: idle, happy and wrong change the brows,
  the mouth, the arm pose and the prop angle together.

Usage:
  python3 tools/svg_art.py            # write every theme's assets
  python3 tools/svg_art.py --theme enchanted-kingdom
"""

from __future__ import annotations

import argparse
import math
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "themes")

# --------------------------------------------------------------------------
# palettes
# --------------------------------------------------------------------------
# ink     outline colour
# skin    skin base, skin_sh its shadow
# hair    hair base, hair_hi its highlight
# cloth   tunic base, cloth_sh its shadow, trim the accent trim
# accent  secondary accent
# sky_*   scene gradient stops
# ground_* distant and near landscape tones

THEMES = {
    "enchanted-kingdom": dict(
        label="Enchanted Kingdom",
        ink="#2a1a4a",
        skin="#f2c8a0", skin_sh="#d9a377",
        hair="#3d2419", hair_hi="#5d3a24",
        cloth="#7c4ddb", cloth_sh="#5d34a8", trim="#f7c948",
        accent="#ff7ab8", accent2="#7ee8fa",
        sky_top="#150a2b", sky_mid="#3b1f60", sky_low="#6b3a86",
        ground_far="#2c1846", ground_near="#180b2a",
        moon="#fff4d6", prop="wand",
        bg="#150a2b", surface="#241046", primary="#f7c948", secondary="#ff7ab8",
    ),
    "space-starlight": dict(
        label="Space Starlight",
        ink="#101a38",
        skin="#f0c096", skin_sh="#d59a72",
        hair="#26203a", hair_hi="#3d3457",
        cloth="#3f6fd8", cloth_sh="#2b4fa4", trim="#ffb703",
        accent="#5ad2f0", accent2="#ff7b6b",
        sky_top="#080c22", sky_mid="#16235a", sky_low="#2c4a92",
        ground_far="#1b2c5c", ground_near="#0d1533",
        moon="#f2f6ff", prop="orb",
        bg="#080c22", surface="#16235a", primary="#ffb703", secondary="#5ad2f0",
    ),
    "jungle-canopy": dict(
        label="Jungle Canopy",
        ink="#12301f",
        skin="#eec096", skin_sh="#d49a72",
        hair="#241a12", hair_hi="#3d2c1c",
        cloth="#3f9e5c", cloth_sh="#2b7442", trim="#ffd166",
        accent="#ff7a59", accent2="#ffe08a",
        sky_top="#0f3b2a", sky_mid="#1f6a45", sky_low="#57a86a",
        ground_far="#1e5a3a", ground_near="#123324",
        moon="#fdf3c4", prop="leaf",
        bg="#0f3b2a", surface="#1f6a45", primary="#ffd166", secondary="#ff7a59",
    ),
    "calm-lagoon": dict(
        label="Calm Lagoon",
        ink="#123240",
        skin="#f2c8a0", skin_sh="#d9a377",
        hair="#4a3222", hair_hi="#6b4a30",
        cloth="#3f8fa8", cloth_sh="#2b6a80", trim="#f4a259",
        accent="#ef6f6c", accent2="#8fd6c9",
        sky_top="#0e2c3d", sky_mid="#1d5a76", sky_low="#5aa8b8",
        ground_far="#1d4f60", ground_near="#0f2c38",
        moon="#fdf6e3", prop="shell",
        bg="#0e2c3d", surface="#1d5a76", primary="#f4a259", secondary="#ef6f6c",
    ),
}

# --------------------------------------------------------------------------
# svg helpers
# --------------------------------------------------------------------------


def svg_doc(w: int, h: int, body: str, defs: str = "") -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'width="{w}" height="{h}" role="img">{defs}{body}</svg>'
    )


def star5(cx: float, cy: float, r: float, fill: str, stroke: str | None = None, sw: float = 0) -> str:
    """A five pointed star, point up."""
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rad = r if i % 2 == 0 else r * 0.44
        pts.append(f"{cx + rad * math.cos(ang):.2f},{cy + rad * math.sin(ang):.2f}")
    p = " ".join(pts)
    s = f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"' if stroke else ""
    return f'<polygon points="{p}" fill="{fill}"{s}/>'


def sparkle(cx: float, cy: float, r: float, fill: str, op: float = 1.0) -> str:
    """A four point twinkle."""
    d = (
        f"M {cx:.1f} {cy - r:.1f} "
        f"C {cx + r * 0.16:.1f} {cy - r * 0.16:.1f} {cx + r * 0.16:.1f} {cy - r * 0.16:.1f} {cx + r:.1f} {cy:.1f} "
        f"C {cx + r * 0.16:.1f} {cy + r * 0.16:.1f} {cx + r * 0.16:.1f} {cy + r * 0.16:.1f} {cx:.1f} {cy + r:.1f} "
        f"C {cx - r * 0.16:.1f} {cy + r * 0.16:.1f} {cx - r * 0.16:.1f} {cy + r * 0.16:.1f} {cx - r:.1f} {cy:.1f} "
        f"C {cx - r * 0.16:.1f} {cy - r * 0.16:.1f} {cx - r * 0.16:.1f} {cy - r * 0.16:.1f} {cx:.1f} {cy - r:.1f} Z"
    )
    return f'<path d="{d}" fill="{fill}" opacity="{op}"/>'


def cloud(cx: float, cy: float, s: float, fill: str, op: float = 0.5) -> str:
    return (
        f'<g fill="{fill}" opacity="{op}">'
        f'<ellipse cx="{cx}" cy="{cy}" rx="{44 * s}" ry="{26 * s}"/>'
        f'<ellipse cx="{cx - 30 * s}" cy="{cy + 8 * s}" rx="{28 * s}" ry="{18 * s}"/>'
        f'<ellipse cx="{cx + 32 * s}" cy="{cy + 8 * s}" rx="{30 * s}" ry="{19 * s}"/>'
        f'</g>'
    )


# --------------------------------------------------------------------------
# the guide character
# --------------------------------------------------------------------------

HEAD_CX, HEAD_CY, HEAD_R = 256.0, 190.0, 84.0


def _eyes(mood: str, ink: str) -> str:
    if mood == "happy":
        # closed happy arcs
        return (
            f'<path d="M 210 202 Q 226 182 242 202" fill="none" stroke="{ink}" '
            f'stroke-width="9" stroke-linecap="round"/>'
            f'<path d="M 270 202 Q 286 182 302 202" fill="none" stroke="{ink}" '
            f'stroke-width="9" stroke-linecap="round"/>'
        )
    if mood == "wrong":
        rx, ry = 12.5, 15.0
    else:
        rx, ry = 14.0, 17.0
    out = []
    for cx in (226, 286):
        out.append(
            f'<ellipse cx="{cx}" cy="202" rx="{rx}" ry="{ry}" fill="{ink}"/>'
            f'<circle cx="{cx - 4}" cy="196" r="4.6" fill="#ffffff" opacity="0.92"/>'
        )
    return "".join(out)


def _brows(mood: str, ink: str) -> str:
    if mood == "happy":
        return (
            f'<path d="M 208 166 Q 226 154 244 162" fill="none" stroke="{ink}" '
            f'stroke-width="8" stroke-linecap="round"/>'
            f'<path d="M 268 162 Q 286 154 304 166" fill="none" stroke="{ink}" '
            f'stroke-width="8" stroke-linecap="round"/>'
        )
    if mood == "wrong":
        return (
            f'<path d="M 208 162 Q 226 152 244 164" fill="none" stroke="{ink}" '
            f'stroke-width="8" stroke-linecap="round"/>'
            f'<path d="M 270 170 Q 288 160 304 166" fill="none" stroke="{ink}" '
            f'stroke-width="8" stroke-linecap="round"/>'
        )
    return (
        f'<path d="M 208 164 Q 226 154 244 162" fill="none" stroke="{ink}" '
        f'stroke-width="8" stroke-linecap="round"/>'
        f'<path d="M 268 162 Q 286 154 304 164" fill="none" stroke="{ink}" '
        f'stroke-width="8" stroke-linecap="round"/>'
    )


def _mouth(mood: str, ink: str, accent: str) -> str:
    if mood == "happy":
        return (
            f'<path d="M 232 230 Q 256 262 280 230 Z" fill="#8c3b52" '
            f'stroke="{ink}" stroke-width="7" stroke-linejoin="round"/>'
            f'<path d="M 240 236 Q 256 246 272 236 Z" fill="#ff9bb3"/>'
        )
    if mood == "wrong":
        return (
            f'<path d="M 240 246 Q 256 232 272 246" fill="none" stroke="{ink}" '
            f'stroke-width="7" stroke-linecap="round"/>'
        )
    return (
        f'<path d="M 240 234 Q 256 248 272 234" fill="none" stroke="{ink}" '
        f'stroke-width="7" stroke-linecap="round"/>'
    )


def _hair_back(p: dict) -> str:
    return (
        f'<path d="M 172 176 C 168 92 210 62 256 62 C 302 62 344 92 340 176 '
        f'C 346 234 338 268 330 292 L 182 292 C 174 268 166 234 172 176 Z" '
        f'fill="{p["hair"]}"/>'
    )


def _hair_front(p: dict) -> str:
    return (
        # side swept fringe
        f'<path d="M 172 200 C 166 108 208 76 256 76 C 304 76 346 108 340 200 '
        f'C 331 156 317 134 296 128 C 288 154 275 168 260 173 '
        f'C 240 179 223 165 217 145 C 200 160 184 178 172 200 Z" '
        f'fill="{p["hair"]}"/>'
        # highlight strand
        f'<path d="M 288 134 C 277 155 263 167 246 172" fill="none" '
        f'stroke="{p["hair_hi"]}" stroke-width="9" stroke-linecap="round" opacity="0.85"/>'
        # side locks
        f'<path d="M 170 192 C 164 252 170 300 180 340 L 208 336 '
        f'C 196 296 194 246 198 198 Z" fill="{p["hair"]}"/>'
        f'<path d="M 342 192 C 348 252 342 300 332 340 L 304 336 '
        f'C 316 296 318 246 314 198 Z" fill="{p["hair"]}"/>'
    )


def _body(p: dict, mood: str) -> str:
    cloth, ink, sh = p["cloth"], p["ink"], p["cloth_sh"]
    return (
        # shadow side of the tunic
        f'<path d="M 300 298 C 320 298 344 306 344 322 L 356 420 '
        f'C 358 442 344 456 322 456 L 296 456 C 314 430 312 350 300 298 Z" fill="{sh}"/>'
        # tunic
        f'<path d="M 168 322 C 168 306 182 296 200 296 L 312 296 '
        f'C 330 296 344 306 344 322 L 356 420 C 358 442 344 456 322 456 '
        f'L 190 456 C 168 456 154 442 156 420 Z" fill="{cloth}" '
        f'stroke="{ink}" stroke-width="9" stroke-linejoin="round"/>'
        # neckline
        f'<path d="M 232 296 Q 256 318 280 296" fill="none" stroke="{ink}" '
        f'stroke-width="9" stroke-linecap="round"/>'
        # belt
        f'<rect x="164" y="360" width="184" height="24" rx="12" fill="{p["trim"]}" '
        f'stroke="{ink}" stroke-width="9"/>'
        # tunic folds
        f'<path d="M 208 392 L 200 442" fill="none" stroke="{ink}" stroke-width="7" '
        f'stroke-linecap="round" opacity="0.45"/>'
        f'<path d="M 306 392 L 312 442" fill="none" stroke="{ink}" stroke-width="7" '
        f'stroke-linecap="round" opacity="0.45"/>'
    )


def _legs(p: dict) -> str:
    skin, ink, sh = p["skin"], p["ink"], p["skin_sh"]
    return (
        f'<path d="M 206 450 L 206 486" stroke="{skin}" stroke-width="30" stroke-linecap="round"/>'
        f'<path d="M 306 450 L 306 486" stroke="{skin}" stroke-width="30" stroke-linecap="round"/>'
        f'<path d="M 206 478 L 206 486" stroke="{sh}" stroke-width="30" stroke-linecap="round"/>'
        f'<path d="M 306 478 L 306 486" stroke="{sh}" stroke-width="30" stroke-linecap="round"/>'
        # boots
        f'<path d="M 190 486 L 226 486" stroke="{ink}" stroke-width="0"/>'
        f'<path d="M 186 488 L 228 488" stroke="{p["cloth_sh"]}" stroke-width="26" stroke-linecap="round"/>'
        f'<path d="M 284 488 L 326 488" stroke="{p["cloth_sh"]}" stroke-width="26" stroke-linecap="round"/>'
    )


def _arms(p: dict, mood: str) -> tuple[str, tuple[float, float]]:
    """Return the arm markup and the position of the right hand."""
    cloth, ink = p["cloth"], p["ink"]
    if mood == "happy":
        left = "M 180 332 C 156 300 142 278 132 262"
        right = "M 332 332 C 356 300 370 278 380 262"
        hand = (380.0, 262.0)
    elif mood == "wrong":
        left = "M 180 332 C 158 364 154 396 160 422"
        right = "M 332 332 C 358 314 364 286 352 268"
        hand = (352.0, 268.0)
    else:
        left = "M 180 332 C 156 364 150 396 156 424"
        right = "M 332 332 C 358 362 368 390 370 418"
        hand = (370.0, 418.0)

    def limb(d: str) -> str:
        return (
            f'<path d="{d}" fill="none" stroke="{ink}" stroke-width="40" '
            f'stroke-linecap="round"/>'
            f'<path d="{d}" fill="none" stroke="{cloth}" stroke-width="30" '
            f'stroke-linecap="round"/>'
        )

    lx, ly = left.split("C")[0].split("M ")[1].split()
    hands = (
        f'<circle cx="132" cy="258" r="16" fill="{p["skin"]}" stroke="{ink}" stroke-width="8"/>'
        if mood == "happy"
        else f'<circle cx="158" cy="426" r="16" fill="{p["skin"]}" stroke="{ink}" stroke-width="8"/>'
    )
    return limb(left) + limb(right) + hands, hand


def _prop(p: dict, mood: str, hand: tuple[float, float]) -> str:
    """The themed prop. Drawn in the hand, angled by mood."""
    hx, hy = hand
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    kind = p["prop"]

    if mood == "wrong":
        # prop lowered in the left hand, pointing down-left
        bx, by, ang = 158.0, 426.0, 128.0
    elif mood == "happy":
        bx, by, ang = hand[0], hand[1], -34.0
    else:
        bx, by, ang = hand[0], hand[1], -28.0

    # stick
    stick = (
        f'<g transform="translate({bx:.1f} {by:.1f}) rotate({ang:.1f})">'
        f'<path d="M 0 0 L 0 -86" stroke="{ink}" stroke-width="15" stroke-linecap="round"/>'
        f'<path d="M 0 0 L 0 -86" stroke="{trim}" stroke-width="8" stroke-linecap="round"/>'
    )
    if kind == "wand":
        stick += star5(0, -104, 26, trim, ink, 7) + sparkle(0, -104, 40, "#ffffff", 0.5)
    elif kind == "orb":
        stick += (
            f'<circle cx="0" cy="-104" r="24" fill="{accent}" stroke="{ink}" stroke-width="7"/>'
            f'<path d="M -22 -96 Q 0 -112 22 -96" fill="none" stroke="#ffffff" '
            f'stroke-width="6" stroke-linecap="round" opacity="0.75"/>'
        )
    elif kind == "leaf":
        stick += (
            f'<path d="M 0 -128 Q 30 -108 0 -80 Q -30 -108 0 -128 Z" fill="{trim}" '
            f'stroke="{ink}" stroke-width="7" stroke-linejoin="round"/>'
            f'<path d="M 0 -124 L 0 -86" stroke="{ink}" stroke-width="5" stroke-linecap="round" opacity="0.5"/>'
        )
    elif kind == "shell":
        stick += (
            f'<path d="M -24 -82 Q 0 -130 24 -82 Z" fill="{accent2}" stroke="{ink}" '
            f'stroke-width="7" stroke-linejoin="round"/>'
            f'<path d="M 0 -124 L -14 -88 M 0 -124 L 0 -84 M 0 -124 L 14 -88" fill="none" '
            f'stroke="{ink}" stroke-width="5" stroke-linecap="round" opacity="0.55"/>'
        )
    stick += "</g>"
    return stick


def _sparkles(p: dict, mood: str) -> str:
    if mood != "happy":
        return ""
    accent, accent2 = p["accent"], p["accent2"]
    return (
        sparkle(96, 150, 26, accent, 0.9)
        + sparkle(414, 176, 22, accent2, 0.9)
        + sparkle(432, 96, 16, accent, 0.75)
        + sparkle(84, 300, 15, accent2, 0.7)
    )


def _head(p: dict, mood: str) -> str:
    ink, skin, sh = p["ink"], p["skin"], p["skin_sh"]
    return (
        # ears
        f'<ellipse cx="174" cy="204" rx="13" ry="17" fill="{skin}" stroke="{ink}" stroke-width="8"/>'
        f'<ellipse cx="338" cy="204" rx="13" ry="17" fill="{skin}" stroke="{ink}" stroke-width="8"/>'
        # face
        f'<circle cx="256" cy="190" r="84" fill="{skin}" stroke="{ink}" stroke-width="9"/>'
        # face shadow on the light side
        f'<path d="M 300 122 A 84 84 0 0 1 300 258 A 118 118 0 0 0 300 122 Z" fill="{sh}" opacity="0.45"/>'
        # blush
        f'<ellipse cx="200" cy="232" rx="19" ry="11" fill="{p["accent"]}" opacity="0.4"/>'
        f'<ellipse cx="312" cy="232" rx="19" ry="11" fill="{p["accent"]}" opacity="0.4"/>'
        + _brows(mood, ink)
        + _eyes(mood, ink)
        # nose
        + f'<path d="M 256 216 L 250 226 L 258 226" fill="none" stroke="{ink}" '
        f'stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>'
        + _mouth(mood, ink, p["accent"])
    )


def _hat(p: dict, mood: str) -> str:
    """A small headpiece per theme, so the costume reads at a glance."""
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    kind = p["prop"]
    if kind == "wand":
        # small star tiara
        return (
            f'<path d="M 214 122 Q 256 96 298 122 L 292 134 Q 256 112 220 134 Z" '
            f'fill="{trim}" stroke="{ink}" stroke-width="7" stroke-linejoin="round"/>'
            + star5(256, 100, 17, trim, ink, 6)
        )
    if kind == "orb":
        # pilot cap with a star badge
        return (
            f'<path d="M 186 124 Q 256 74 326 124 L 326 134 Q 256 96 186 134 Z" '
            f'fill="{p["cloth_sh"]}" stroke="{ink}" stroke-width="7" stroke-linejoin="round"/>'
            + star5(256, 104, 15, trim, ink, 6)
        )
    if kind == "leaf":
        # leaf headband
        return (
            f'<path d="M 200 130 Q 256 108 312 130" fill="none" stroke="{ink}" '
            f'stroke-width="10" stroke-linecap="round"/>'
            f'<path d="M 226 118 Q 244 96 258 114 Q 242 128 226 118 Z" fill="{trim}" '
            f'stroke="{ink}" stroke-width="6" stroke-linejoin="round"/>'
            f'<path d="M 262 114 Q 278 94 292 116 Q 276 128 262 114 Z" fill="{accent2}" '
            f'stroke="{ink}" stroke-width="6" stroke-linejoin="round"/>'
        )
    # shell: a woven headband with a shell
    return (
        f'<path d="M 200 130 Q 256 106 312 130" fill="none" stroke="{ink}" '
        f'stroke-width="10" stroke-linecap="round"/>'
        f'<path d="M 240 114 Q 256 92 272 114 Q 256 126 240 114 Z" fill="{accent2}" '
        f'stroke="{ink}" stroke-width="6" stroke-linejoin="round"/>'
    )


def character(p: dict, mood: str) -> str:
    """The guide character in one of three moods."""
    arms, hand = _arms(p, mood)
    body = (
        f'<ellipse cx="256" cy="496" rx="118" ry="18" fill="{p["ink"]}" opacity="0.14"/>'
        + _hair_back(p)
        + _legs(p)
        + _body(p, mood)
        + arms
        + f'<circle cx="{hand[0]:.1f}" cy="{hand[1]:.1f}" r="16" fill="{p["skin"]}" '
          f'stroke="{p["ink"]}" stroke-width="8"/>'
        + _prop(p, mood, hand)
        + f'<path d="M 236 274 L 236 300" stroke="{p["skin"]}" stroke-width="30" stroke-linecap="round"/>'
        + _head(p, mood)
        + _hair_front(p)
        + _hat(p, mood)
        + _sparkles(p, mood)
    )
    return svg_doc(512, 512, body)


# --------------------------------------------------------------------------
# reward stickers
# --------------------------------------------------------------------------


def _badge(colour: str, ink: str, inner: str) -> str:
    """A round sticker base every reward sits on."""
    return (
        f'<circle cx="256" cy="256" r="228" fill="{colour}" stroke="{ink}" stroke-width="10"/>'
        f'<circle cx="256" cy="256" r="200" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.35"/>'
    )


def reward_unicorn(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    body = (
        _badge(accent, ink, "")
        + f'<path d="M 150 356 Q 150 210 256 168 Q 362 210 362 356 Z" fill="#fdfbff" '
          f'stroke="{ink}" stroke-width="10" stroke-linejoin="round"/>'
        + f'<path d="M 232 176 L 214 96 L 268 152 Z" fill="{trim}" stroke="{ink}" '
          f'stroke-width="9" stroke-linejoin="round"/>'
        + f'<path d="M 288 168 Q 322 140 344 176 Q 316 210 288 168 Z" fill="{accent}" '
          f'stroke="{ink}" stroke-width="9" stroke-linejoin="round"/>'
        + f'<circle cx="228" cy="252" r="14" fill="{ink}"/>'
        + f'<circle cx="224" cy="247" r="5" fill="#ffffff"/>'
        + f'<path d="M 288 254 Q 300 270 314 252" fill="none" stroke="{ink}" '
          f'stroke-width="9" stroke-linecap="round"/>'
        + star5(178, 214, 18, trim, ink, 6)
    )
    return svg_doc(512, 512, body)


def reward_crown(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    body = (
        _badge(accent, ink, "")
        + f'<path d="M 138 344 L 138 226 L 196 288 L 256 190 L 316 288 L 374 226 L 374 344 Z" '
          f'fill="{trim}" stroke="{ink}" stroke-width="11" stroke-linejoin="round"/>'
        + f'<rect x="138" y="336" width="236" height="42" rx="14" fill="{trim}" '
          f'stroke="{ink}" stroke-width="11"/>'
        + f'<circle cx="256" cy="228" r="15" fill="{accent}" stroke="{ink}" stroke-width="8"/>'
        + f'<circle cx="192" cy="318" r="12" fill="{accent2}" stroke="{ink}" stroke-width="7"/>'
        + f'<circle cx="320" cy="318" r="12" fill="{accent2}" stroke="{ink}" stroke-width="7"/>'
    )
    return svg_doc(512, 512, body)


def reward_wand(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    accent2 = p["accent2"]
    body = (
        _badge(accent, ink, "")
        + f'<g transform="translate(256 256) rotate(-30)">'
        f'<path d="M 0 60 L 0 -80" stroke="{ink}" stroke-width="22" stroke-linecap="round"/>'
        f'<path d="M 0 60 L 0 -80" stroke="{trim}" stroke-width="12" stroke-linecap="round"/>'
        + star5(0, -118, 52, trim, ink, 10)
        + f'</g>'
        + sparkle(360, 150, 26, "#ffffff", 0.85)
        + sparkle(140, 330, 20, "#ffffff", 0.7)
    )
    return svg_doc(512, 512, body)


def reward_rocket(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    body = (
        _badge(accent, ink, "")
        + f'<path d="M 256 96 Q 330 190 330 300 L 182 300 Q 182 190 256 96 Z" fill="#fdfdff" '
          f'stroke="{ink}" stroke-width="11" stroke-linejoin="round"/>'
        + f'<circle cx="256" cy="222" r="38" fill="{accent}" stroke="{ink}" stroke-width="10"/>'
        + f'<path d="M 182 268 L 130 336 L 182 314 Z" fill="{trim}" stroke="{ink}" '
          f'stroke-width="10" stroke-linejoin="round"/>'
        + f'<path d="M 330 268 L 382 336 L 330 314 Z" fill="{trim}" stroke="{ink}" '
          f'stroke-width="10" stroke-linejoin="round"/>'
        + f'<path d="M 232 300 L 256 386 L 280 300 Z" fill="{accent2}" stroke="{ink}" '
          f'stroke-width="10" stroke-linejoin="round"/>'
        + star5(392, 128, 26, trim, ink, 8)
    )
    return svg_doc(512, 512, body)


def reward_planet(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    body = (
        _badge(accent, ink, "")
        + f'<circle cx="256" cy="256" r="96" fill="{accent2}" stroke="{ink}" stroke-width="11"/>'
        + f'<path d="M 176 216 Q 200 190 236 208 Q 214 240 176 216 Z" fill="{trim}" opacity="0.9"/>'
        + f'<ellipse cx="256" cy="256" rx="182" ry="52" fill="none" stroke="{ink}" '
          f'stroke-width="14" transform="rotate(-18 256 256)"/>'
        + star5(112, 140, 24, trim, ink, 8)
        + star5(410, 372, 20, trim, ink, 7)
    )
    return svg_doc(512, 512, body)


def reward_comet(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    body = (
        _badge(accent, ink, "")
        + f'<circle cx="330" cy="216" r="86" fill="{accent2}" stroke="{ink}" stroke-width="11"/>'
        + f'<path d="M 300 200 Q 320 180 348 190" fill="none" stroke="#ffffff" '
          f'stroke-width="12" stroke-linecap="round" opacity="0.8"/>'
        + f'<path d="M 262 250 L 96 380 L 168 386 L 116 440 L 300 300 Z" fill="{trim}" '
          f'stroke="{ink}" stroke-width="10" stroke-linejoin="round"/>'
        + sparkle(150, 140, 22, "#ffffff", 0.8)
    )
    return svg_doc(512, 512, body)


def reward_leaf(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    body = (
        _badge(accent, ink, "")
        + f'<path d="M 384 128 Q 150 148 140 330 Q 138 396 200 396 '
        f'Q 388 372 384 128 Z" fill="{accent2}" stroke="{ink}" stroke-width="11" '
          f'stroke-linejoin="round"/>'
        + f'<path d="M 372 140 Q 250 250 176 386" fill="none" stroke="{ink}" '
          f'stroke-width="11" stroke-linecap="round"/>'
        + f'<path d="M 300 196 Q 268 214 246 250" fill="none" stroke="{ink}" '
          f'stroke-width="9" stroke-linecap="round" opacity="0.6"/>'
        + f'<path d="M 262 244 Q 214 246 186 268" fill="none" stroke="{ink}" '
          f'stroke-width="9" stroke-linecap="round" opacity="0.6"/>'
        + star5(120, 130, 24, trim, ink, 8)
    )
    return svg_doc(512, 512, body)


def reward_flower(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    petals = "".join(
        f'<ellipse cx="256" cy="164" rx="54" ry="74" fill="{accent2}" stroke="{ink}" '
        f'stroke-width="9" transform="rotate({a} 256 256)"/>'
        for a in (0, 60, 120, 180, 240, 300)
    )
    body = (
        _badge(accent, ink, "")
        + petals
        + f'<circle cx="256" cy="256" r="66" fill="{trim}" stroke="{ink}" stroke-width="11"/>'
        + f'<circle cx="232" cy="236" r="16" fill="#ffffff" opacity="0.5"/>'
    )
    return svg_doc(512, 512, body)


def reward_butterfly(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    body = (
        _badge(accent, ink, "")
        + f'<path d="M 250 262 Q 140 150 108 226 Q 90 274 250 288 Z" fill="{accent2}" '
          f'stroke="{ink}" stroke-width="10" stroke-linejoin="round"/>'
        + f'<path d="M 262 262 Q 372 150 404 226 Q 422 274 262 288 Z" fill="{accent2}" '
          f'stroke="{ink}" stroke-width="10" stroke-linejoin="round"/>'
        + f'<path d="M 250 296 Q 168 322 140 386 Q 128 424 178 414 Q 240 402 250 296 Z" '
          f'fill="{trim}" stroke="{ink}" stroke-width="10" stroke-linejoin="round"/>'
        + f'<path d="M 262 296 Q 344 322 372 386 Q 384 424 334 414 Q 272 402 262 296 Z" '
          f'fill="{trim}" stroke="{ink}" stroke-width="10" stroke-linejoin="round"/>'
        + f'<rect x="243" y="200" width="26" height="230" rx="13" fill="{ink}"/>'
        + f'<path d="M 256 200 Q 226 158 208 172" fill="none" stroke="{ink}" '
          f'stroke-width="9" stroke-linecap="round"/>'
        + f'<path d="M 256 200 Q 286 158 304 172" fill="none" stroke="{ink}" '
          f'stroke-width="9" stroke-linecap="round"/>'
    )
    return svg_doc(512, 512, body)


def reward_shell(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    body = (
        _badge(accent, ink, "")
        + f'<path d="M 118 340 Q 118 160 256 160 Q 394 160 394 340 Z" fill="{accent2}" '
          f'stroke="{ink}" stroke-width="11" stroke-linejoin="round"/>'
        + f'<path d="M 256 168 L 196 336 M 256 168 L 256 336 M 256 168 L 316 336" '
          f'fill="none" stroke="{ink}" stroke-width="9" stroke-linecap="round" opacity="0.55"/>'
        + f'<path d="M 176 340 L 336 340" stroke="{ink}" stroke-width="11" stroke-linecap="round"/>'
        + star5(112, 130, 24, trim, ink, 8)
    )
    return svg_doc(512, 512, body)


def reward_starfish(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rad = 168 if i % 2 == 0 else 74
        pts.append(f"{256 + rad * math.cos(ang):.1f},{256 + rad * math.sin(ang):.1f}")
    body = (
        _badge(accent, ink, "")
        + f'<polygon points="{" ".join(pts)}" fill="{accent2}" stroke="{ink}" '
          f'stroke-width="11" stroke-linejoin="round"/>'
        + "".join(
            f'<circle cx="{256 + 36 * math.cos(-math.pi / 2 + i * math.pi / 5):.0f}" '
            f'cy="{256 + 36 * math.sin(-math.pi / 2 + i * math.pi / 5):.0f}" r="10" '
            f'fill="{ink}" opacity="0.55"/>'
            for i in range(5)
        )
        + star5(400, 116, 24, trim, ink, 8)
    )
    return svg_doc(512, 512, body)


def reward_lighthouse(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    body = (
        _badge(accent, ink, "")
        + f'<path d="M 200 400 L 226 210 L 286 210 L 312 400 Z" fill="#fdfdff" '
          f'stroke="{ink}" stroke-width="11" stroke-linejoin="round"/>'
        + f'<path d="M 210 320 L 302 320 M 218 262 L 294 262" stroke="{accent2}" '
          f'stroke-width="16"/>'
        + f'<rect x="218" y="160" width="76" height="54" rx="12" fill="{trim}" '
          f'stroke="{ink}" stroke-width="10"/>'
        + f'<path d="M 256 160 L 256 128" stroke="{ink}" stroke-width="10" stroke-linecap="round"/>'
        + f'<circle cx="256" cy="118" r="16" fill="{accent2}" stroke="{ink}" stroke-width="8"/>'
        + f'<path d="M 296 176 L 384 140 M 296 198 L 388 214" stroke="{trim}" '
          f'stroke-width="10" stroke-linecap="round" opacity="0.8"/>'
    )
    return svg_doc(512, 512, body)


# --------------------------------------------------------------------------
# unit badges
# --------------------------------------------------------------------------


def unit_history(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    body = (
        _badge(accent, ink, "")
        + f'<path d="M 256 132 L 384 218 L 128 218 Z" fill="{trim}" stroke="{ink}" '
          f'stroke-width="11" stroke-linejoin="round"/>'
        + f'<rect x="140" y="228" width="232" height="24" rx="10" fill="#fdf6e6" '
          f'stroke="{ink}" stroke-width="10"/>'
        + f'<rect x="164" y="264" width="28" height="116" rx="10" fill="#fdf6e6" '
          f'stroke="{ink}" stroke-width="10"/>'
        + f'<rect x="242" y="264" width="28" height="116" rx="10" fill="#fdf6e6" '
          f'stroke="{ink}" stroke-width="10"/>'
        + f'<rect x="320" y="264" width="28" height="116" rx="10" fill="#fdf6e6" '
          f'stroke="{ink}" stroke-width="10"/>'
        + f'<rect x="132" y="378" width="248" height="28" rx="12" fill="#fdf6e6" '
          f'stroke="{ink}" stroke-width="10"/>'
        + f'<circle cx="256" cy="172" r="17" fill="{accent2}" stroke="{ink}" stroke-width="8"/>'
    )
    return svg_doc(512, 512, body)


def unit_geography(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    body = (
        _badge(accent, ink, "")
        + f'<circle cx="256" cy="256" r="150" fill="{accent2}" stroke="{ink}" stroke-width="11"/>'
        + f'<path d="M 106 256 L 406 256" fill="none" stroke="{ink}" stroke-width="9" opacity="0.6"/>'
        + f'<path d="M 256 106 Q 190 200 256 256 Q 322 312 256 406" fill="none" '
          f'stroke="{ink}" stroke-width="9" opacity="0.6"/>'
        + f'<path d="M 256 106 Q 322 200 256 256 Q 190 312 256 406" fill="none" '
          f'stroke="{ink}" stroke-width="9" opacity="0.6"/>'
        + f'<path d="M 150 178 Q 214 148 240 194 Q 214 226 150 178 Z" fill="{trim}" '
          f'stroke="{ink}" stroke-width="8" stroke-linejoin="round"/>'
        + f'<path d="M 272 300 Q 340 272 366 320 Q 330 348 272 300 Z" fill="{trim}" '
          f'stroke="{ink}" stroke-width="8" stroke-linejoin="round"/>'
        + f'<path d="M 168 314 Q 196 296 214 316 Q 192 332 168 314 Z" fill="{trim}" '
          f'stroke="{ink}" stroke-width="7" stroke-linejoin="round"/>'
    )
    return svg_doc(512, 512, body)


def unit_civics(p: dict) -> str:
    ink, trim, accent, accent2 = p["ink"], p["trim"], p["accent"], p["accent2"]
    body = (
        _badge(accent, ink, "")
        + f'<path d="M 256 128 L 388 214 L 124 214 Z" fill="{trim}" stroke="{ink}" '
          f'stroke-width="11" stroke-linejoin="round"/>'
        + f'<rect x="124" y="224" width="264" height="24" rx="10" fill="#fdf6e6" '
          f'stroke="{ink}" stroke-width="10"/>'
        + f'<rect x="158" y="262" width="26" height="112" rx="10" fill="#fdf6e6" '
          f'stroke="{ink}" stroke-width="9"/>'
        + f'<rect x="216" y="262" width="26" height="112" rx="10" fill="#fdf6e6" '
          f'stroke="{ink}" stroke-width="9"/>'
        + f'<rect x="274" y="262" width="26" height="112" rx="10" fill="#fdf6e6" '
          f'stroke="{ink}" stroke-width="9"/>'
        + f'<rect x="332" y="262" width="26" height="112" rx="10" fill="#fdf6e6" '
          f'stroke="{ink}" stroke-width="9"/>'
        + f'<rect x="132" y="374" width="248" height="30" rx="12" fill="#fdf6e6" '
          f'stroke="{ink}" stroke-width="10"/>'
        + f'<path d="M 256 128 L 256 92" stroke="{ink}" stroke-width="9" stroke-linecap="round"/>'
        + f'<path d="M 260 92 L 320 108 L 260 124 Z" fill="{accent2}" stroke="{ink}" '
          f'stroke-width="8" stroke-linejoin="round"/>'
    )
    return svg_doc(512, 512, body)


# --------------------------------------------------------------------------
# scenes
# --------------------------------------------------------------------------

SKY_STARS = [
    (120, 90, 3.0), (210, 150, 2.0), (320, 70, 3.5), (430, 130, 2.5), (540, 60, 2.0),
    (640, 110, 3.0), (760, 180, 2.0), (880, 90, 2.5), (990, 150, 3.0), (1120, 70, 2.0),
    (1240, 130, 2.5), (1350, 90, 3.0), (1430, 170, 2.0), (170, 240, 2.0), (900, 260, 2.5),
    (1180, 250, 2.0), (60, 320, 2.0), (1490, 300, 2.5), (720, 40, 2.0), (1010, 40, 2.0),
]


def scene(p: dict, theme: str) -> str:
    w, h = 1536, 1024
    defs = (
        f'<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0%" stop-color="{p["sky_top"]}"/>'
        f'<stop offset="55%" stop-color="{p["sky_mid"]}"/>'
        f'<stop offset="100%" stop-color="{p["sky_low"]}"/>'
        f'</linearGradient></defs>'
    )
    body = [f'<rect width="{w}" height="{h}" fill="url(#sky)"/>']

    if theme == "enchanted-kingdom":
        for x, y, r in SKY_STARS:
            body.append(sparkle(x, y, r * 4, "#ffffff", 0.55 + (r % 3) * 0.12))
        body.append(f'<circle cx="1240" cy="176" r="86" fill="{p["moon"]}" opacity="0.95"/>')
        body.append(f'<circle cx="1216" cy="158" r="16" fill="{p["sky_mid"]}" opacity="0.35"/>')
        body.append(f'<circle cx="1264" cy="200" r="11" fill="{p["sky_mid"]}" opacity="0.3"/>')
        body.append(cloud(320, 180, 1.5, "#ffffff", 0.14))
        body.append(cloud(960, 130, 1.9, "#ffffff", 0.12))
        # rolling hills
        body.append(
            f'<path d="M 0 700 Q 260 590 520 668 Q 800 750 1040 656 Q 1280 566 1536 660 '
            f'L 1536 1024 L 0 1024 Z" fill="{p["ground_far"]}"/>'
        )
        # castle
        body.append(
            f'<g fill="{p["ground_near"]}">'
            f'<path d="M 470 700 L 470 420 L 560 420 L 560 700 Z"/>'
            f'<path d="M 700 700 L 700 330 L 830 330 L 830 700 Z"/>'
            f'<path d="M 960 700 L 960 420 L 1050 420 L 1050 700 Z"/>'
            f'<path d="M 440 424 L 515 340 L 590 424 Z"/>'
            f'<path d="M 660 334 L 765 226 L 870 334 Z"/>'
            f'<path d="M 930 424 L 1005 340 L 1080 424 Z"/>'
            f'<path d="M 590 700 L 590 470 L 700 470 L 700 700 Z"/>'
            f'</g>'
        )
        for x, y in [(515, 462), (765, 380), (1005, 462), (625, 520), (885, 520)]:
            body.append(f'<rect x="{x - 15}" y="{y}" width="30" height="42" rx="8" fill="{p["trim"]}" opacity="0.85"/>')
        body.append(
            f'<path d="M 0 830 Q 300 742 640 806 Q 1000 876 1536 780 L 1536 1024 L 0 1024 Z" '
            f'fill="{p["ground_near"]}"/>'
        )
    elif theme == "space-starlight":
        for x, y, r in SKY_STARS:
            body.append(sparkle(x, y, r * 4, "#ffffff", 0.5 + (r % 3) * 0.14))
        body.append(
            f'<ellipse cx="1180" cy="240" rx="300" ry="150" fill="{p["accent"]}" opacity="0.10"/>'
            f'<ellipse cx="380" cy="180" rx="240" ry="120" fill="{p["accent2"]}" opacity="0.10"/>'
        )
        body.append(f'<circle cx="1180" cy="250" r="112" fill="{p["accent2"]}"/>')
        body.append(
            f'<ellipse cx="1180" cy="250" rx="200" ry="52" fill="none" stroke="{p["trim"]}" '
            f'stroke-width="16" transform="rotate(-16 1180 250)" opacity="0.9"/>'
        )
        body.append(f'<circle cx="300" cy="230" r="66" fill="{p["accent2"]}" opacity="0.95"/>')
        body.append(f'<circle cx="278" cy="208" r="18" fill="#ffffff" opacity="0.25"/>')
        body.append(f'<circle cx="620" cy="120" r="40" fill="{p["accent"]}" opacity="0.9"/>')
        body.append(
            f'<path d="M 0 880 Q 320 800 660 862 Q 1020 928 1536 812 L 1536 1024 L 0 1024 Z" '
            f'fill="{p["ground_far"]}"/>'
        )
        body.append(
            f'<path d="M 0 944 Q 380 866 760 926 Q 1140 986 1536 906 L 1536 1024 L 0 1024 Z" '
            f'fill="{p["ground_near"]}"/>'
        )
        for x, y, r in [(900, 130, 8), (1360, 340, 6), (170, 420, 7), (760, 300, 5)]:
            body.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{p["trim"]}" opacity="0.8"/>')
    elif theme == "jungle-canopy":
        body.append(
            f'<circle cx="1240" cy="200" r="120" fill="{p["trim"]}" opacity="0.35"/>'
        )
        for x, y, r in [(300, 420, 200), (760, 300, 260), (1300, 460, 190)]:
            body.append(f'<ellipse cx="{x}" cy="{y}" rx="{r * 1.5}" ry="{r}" fill="#ffffff" opacity="0.06"/>')
        # canopy leaves across the top
        for x, y, s, col in [
            (120, 60, 1.5, "#1c6b40"), (360, 20, 1.8, "#256f45"), (620, 70, 1.4, "#1c6b40"),
            (880, 30, 1.7, "#256f45"), (1140, 70, 1.5, "#1c6b40"), (1400, 30, 1.9, "#256f45"),
        ]:
            body.append(
                f'<path d="M {x} {y} Q {x + 120 * s} {y - 70 * s} {x + 240 * s} {y} '
                f'Q {x + 120 * s} {y + 90 * s} {x} {y} Z" fill="{col}"/>'
            )
        body.append(
            f'<path d="M 0 760 Q 280 660 560 740 Q 860 828 1140 726 Q 1340 654 1536 726 '
            f'L 1536 1024 L 0 1024 Z" fill="{p["ground_far"]}"/>'
        )
        body.append(
            f'<path d="M 0 872 Q 340 790 700 856 Q 1080 926 1536 826 L 1536 1024 L 0 1024 Z" '
            f'fill="{p["ground_near"]}"/>'
        )
        for x in (200, 620, 1080, 1420):
            body.append(
                f'<path d="M {x} 1024 Q {x - 30} 900 {x + 6} 800 Q {x + 30} 900 {x + 60} 1024 Z" '
                f'fill="{p["ground_near"]}" opacity="0.85"/>'
            )
    else:  # calm-lagoon
        body.append(
            f'<circle cx="1180" cy="220" r="104" fill="{p["moon"]}" opacity="0.9"/>'
        )
        for x, y, r in [(280, 120, 3.0), (520, 90, 2.0), (860, 140, 2.5), (1080, 80, 2.0), (1400, 150, 2.5)]:
            body.append(sparkle(x, y, r * 4, "#ffffff", 0.45))
        body.append(cloud(420, 200, 1.7, "#ffffff", 0.2))
        body.append(cloud(980, 150, 2.0, "#ffffff", 0.16))
        body.append(
            f'<path d="M 0 700 Q 240 620 480 690 Q 760 770 1000 672 Q 1280 566 1536 654 '
            f'L 1536 1024 L 0 1024 Z" fill="{p["ground_far"]}" opacity="0.85"/>'
        )
        # water
        body.append(
            f'<rect x="0" y="780" width="1536" height="244" fill="{p["ground_near"]}"/>'
        )
        for i, y in enumerate((816, 866, 916, 966)):
            body.append(
                f'<path d="M {180 + i * 40} {y} q 60 -14 120 0 t 120 0 t 120 0 t 120 0" '
                f'fill="none" stroke="{p["accent2"]}" stroke-width="6" opacity="{0.32 - i * 0.05}" '
                f'stroke-linecap="round"/>'
            )
        body.append(
            f'<path d="M 1180 216 L 1180 300" stroke="{p["moon"]}" stroke-width="12" '
            f'opacity="0.35"/>'
        )
    return svg_doc(w, h, "".join(body), defs)


def preview(p: dict, theme: str) -> str:
    """A wide banner for the theme picker."""
    w, h = 1536, 512
    defs = (
        f'<defs><linearGradient id="pb" x1="0" y1="0" x2="1" y2="0">'
        f'<stop offset="0%" stop-color="{p["sky_top"]}"/>'
        f'<stop offset="60%" stop-color="{p["sky_mid"]}"/>'
        f'<stop offset="100%" stop-color="{p["sky_low"]}"/>'
        f'</linearGradient></defs>'
    )
    body = [f'<rect width="{w}" height="{h}" fill="url(#pb)"/>']
    for x, y, r in SKY_STARS[::2]:
        body.append(sparkle(x, y * 0.7, r * 3.4, "#ffffff", 0.5))
    if theme == "enchanted-kingdom":
        body.append(f'<circle cx="1330" cy="150" r="66" fill="{p["moon"]}"/>')
        body.append(
            f'<path d="M 0 400 Q 300 320 640 388 Q 1000 462 1536 356 L 1536 512 L 0 512 Z" '
            f'fill="{p["ground_far"]}"/>'
        )
        body.append(
            f'<path d="M 1120 400 L 1120 200 L 1220 200 L 1220 400 Z" fill="{p["ground_near"]}"/>'
            f'<path d="M 1090 204 L 1170 128 L 1250 204 Z" fill="{p["ground_near"]}"/>'
        )
    elif theme == "space-starlight":
        body.append(f'<circle cx="1320" cy="160" r="76" fill="{p["accent2"]}"/>')
        body.append(
            f'<ellipse cx="1320" cy="160" rx="136" ry="38" fill="none" stroke="{p["trim"]}" '
            f'stroke-width="12" transform="rotate(-16 1320 160)"/>'
        )
        body.append(
            f'<path d="M 0 420 Q 340 350 700 408 Q 1080 470 1536 384 L 1536 512 L 0 512 Z" '
            f'fill="{p["ground_far"]}"/>'
        )
    elif theme == "jungle-canopy":
        for x, y, s, col in [(160, 30, 1.5, "#1c6b40"), (520, 10, 1.8, "#256f45"), (900, 30, 1.5, "#1c6b40"), (1280, 10, 1.8, "#256f45")]:
            body.append(
                f'<path d="M {x} {y} Q {x + 120 * s} {y - 70 * s} {x + 240 * s} {y} '
                f'Q {x + 120 * s} {y + 90 * s} {x} {y} Z" fill="{col}"/>'
            )
        body.append(
            f'<path d="M 0 392 Q 320 320 660 384 Q 1020 452 1536 360 L 1536 512 L 0 512 Z" '
            f'fill="{p["ground_far"]}"/>'
        )
    else:
        body.append(f'<circle cx="1300" cy="150" r="74" fill="{p["moon"]}" opacity="0.92"/>')
        body.append(cloud(420, 130, 1.6, "#ffffff", 0.22))
        body.append(
            f'<path d="M 0 380 Q 280 320 560 374 Q 880 434 1180 356 Q 1380 306 1536 348 '
            f'L 1536 512 L 0 512 Z" fill="{p["ground_far"]}" opacity="0.85"/>'
        )
        body.append(f'<rect x="0" y="410" width="1536" height="102" fill="{p["ground_near"]}"/>')
    return svg_doc(w, h, "".join(body), defs)


def app_icon(p: dict) -> str:
    """The app mark: a star with a spark, on the theme background."""
    body = (
        f'<rect width="512" height="512" rx="112" fill="{p["bg"]}"/>'
        f'<circle cx="256" cy="256" r="196" fill="{p["surface"]}"/>'
        + star5(256, 250, 140, p["primary"], p["ink"], 12)
        + sparkle(392, 130, 44, p["secondary"], 0.95)
        + sparkle(118, 388, 30, p["secondary"], 0.8)
    )
    return svg_doc(512, 512, body)


# --------------------------------------------------------------------------
# theme asset plans
# --------------------------------------------------------------------------

REWARDS = {
    "enchanted-kingdom": [("unicorn", reward_unicorn), ("crown", reward_crown), ("wand", reward_wand)],
    "space-starlight": [("rocket", reward_rocket), ("planet", reward_planet), ("comet", reward_comet)],
    "jungle-canopy": [("leaf", reward_leaf), ("flower", reward_flower), ("butterfly", reward_butterfly)],
    "calm-lagoon": [("shell", reward_shell), ("starfish", reward_starfish), ("lighthouse", reward_lighthouse)],
}


def write(path: str, content: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)
    print(f"  {os.path.relpath(path, os.path.join(ROOT, '..', '..'))}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--theme", default=None)
    args = ap.parse_args()

    themes = [args.theme] if args.theme else list(THEMES)
    for theme in themes:
        p = THEMES[theme]
        out = os.path.join(ROOT, theme, "assets")
        print(f"[{theme}]")
        for mood in ("idle", "happy", "wrong"):
            write(os.path.join(out, f"mascot-{mood}.svg"), character(p, mood))
        for name, fn in REWARDS[theme]:
            write(os.path.join(out, f"reward-{name}.svg"), fn(p))
        for name, fn in (("history", unit_history), ("geography", unit_geography), ("civics", unit_civics)):
            write(os.path.join(out, f"unit-{name}.svg"), fn(p))
        write(os.path.join(out, "background.svg"), scene(p, theme))
        write(os.path.join(out, "preview.svg"), preview(p, theme))
        write(os.path.join(out, "icon.svg"), app_icon(p))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
