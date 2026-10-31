#!/usr/bin/env python3
"""Topic scene illustrations for Sparkle.

Every lesson needs a picture, not a wall of text. Scenes are composed from a
library of hand-built elements (palaces, pillars, rivers, elephants, ships,
forests) so a whole chapter shares one drawing language.

Canvas is 512 x 320 with the same 8 unit outline weight as the characters, so
a scene and a mascot sitting next to each other look like one set.

A scene is a list of elements plus a sky and a ground. Elements are placed by
their baseline so they always sit on the horizon correctly:

    scene = {
      "sky": "day" | "night" | "dawn" | "dusk",
      "ground": "grass" | "sand" | "stone" | "water" | "field",
      "elements": [
        {"kind": "palace", "x": 300, "scale": 1.0},
        {"kind": "elephant", "x": 120, "scale": 0.8},
      ],
      "mood": "calm" | "busy",
    }

Usage:
  python3 tools/svg_scenes.py             # write every scene in SCENES
  python3 tools/svg_scenes.py --list
"""

from __future__ import annotations

import argparse
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "content", "packs")

W, H = 512, 320
INK = "#2a1a4a"
STROKE = 8

# --------------------------------------------------------------------------
# skies and grounds
# --------------------------------------------------------------------------

SKIES = {
    "day":    ("#8fd4f0", "#d9f0fb", "#f4e3b8"),
    "dawn":   ("#5b3a86", "#e98a8a", "#ffd9a0"),
    "dusk":   ("#2a1a4a", "#7c4ddb", "#f7c948"),
    "night":  ("#150a2b", "#2c1846", "#4a2a6e"),
    "sunset": ("#3b1f60", "#ff7ab8", "#ffd166"),
    "green":  ("#3f9e5c", "#7cc98a", "#dff3c0"),
}

GROUND_COLOURS = {
    "grass": ("#4f9e5f", "#3a7a49"),
    "sand":  ("#e8c98a", "#cfa763"),
    "stone": ("#a89bb8", "#857a96"),
    "water": ("#3f8fa8", "#2b6a80"),
    "field": ("#c9a94f", "#a3863a"),
}


def sky_and_ground(sky: str, ground: str, mood: str = "calm"):
    top, mid, low = SKIES.get(sky, SKIES["day"])
    g1, g2 = GROUND_COLOURS.get(ground, GROUND_COLOURS["grass"])
    body = [
        f'<rect width="{W}" height="{H}" fill="url(#skyGrad)"/>',
    ]
    # sun or moon
    if sky == "day":
        body.append(f'<circle cx="418" cy="52" r="26" fill="#ffe9a8"/>')
        body.append(f'<circle cx="418" cy="52" r="34" fill="#ffe9a8" opacity="0.28"/>')
    elif sky == "dawn" or sky == "sunset":
        body.append(f'<circle cx="80" cy="118" r="30" fill="#ffd166" opacity="0.9"/>')
    elif sky == "night":
        for x, y, r in ((70, 44, 8), (140, 82, 6), (330, 40, 7), (460, 96, 5), (240, 30, 6), (392, 150, 5)):
            body.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff4d6"/>')
        body.append(f'<circle cx="440" cy="46" r="18" fill="#fdf3c4" opacity="0.9"/>')
    elif sky == "green":
        body.append(f'<circle cx="430" cy="46" r="22" fill="#ffe9a8" opacity="0.85"/>')

    # clouds
    if sky in ("day", "dawn", "green"):
        body.append(
            f'<g fill="#ffffff" opacity="0.85"><ellipse cx="110" cy="56" rx="32" ry="17"/>'
            f'<ellipse cx="92" cy="62" rx="20" ry="12"/><ellipse cx="130" cy="62" rx="22" ry="13"/></g>'
        )
        body.append(
            f'<g fill="#ffffff" opacity="0.6"><ellipse cx="300" cy="38" rx="26" ry="13"/>'
            f'<ellipse cx="288" cy="42" rx="16" ry="9"/><ellipse cx="314" cy="42" rx="18" ry="10"/></g>'
        )

    # distant hills
    body.append(
        f'<path d="M 0 214 Q 90 168 186 206 Q 268 238 348 198 Q 436 154 512 200 '
        f'L 512 {H} L 0 {H} Z" fill="{g2}" opacity="0.5"/>'
    )
    # ground
    body.append(f'<rect x="0" y="236" width="{W}" height="{H - 236}" fill="{g1}"/>')
    body.append(
        f'<path d="M 0 236 Q 120 224 256 236 Q 390 248 512 234 L 512 {H} L 0 {H} Z" '
        f'fill="{g2}" opacity="0.45"/>'
    )
    if ground == "field":
        for i in range(9):
            x = 20 + i * 56
            body.append(
                f'<path d="M {x} 258 L {x - 10} 306" stroke="{g2}" stroke-width="4" opacity="0.55" '
                f'stroke-linecap="round"/>'
                f'<path d="M {x + 12} 258 L {x + 2} 306" stroke="{g2}" stroke-width="4" opacity="0.4" '
                f'stroke-linecap="round"/>'
            )
    if ground == "water":
        for i, y in enumerate((262, 284, 306)):
            body.append(
                f'<path d="M {10 + i * 14} {y} q 26 -7 52 0 t 52 0 t 52 0 t 52 0 t 52 0 t 52 0" '
                f'fill="none" stroke="#8fd6ea" stroke-width="4" opacity="{0.5 - i * 0.1}" '
                f'stroke-linecap="round"/>'
            )
    return body


def defs() -> str:
    stops = ""
    for sky in SKIES:
        top, mid, low = SKIES[sky]
        stops += (
            f'<linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0%" stop-color="{top}"/>'
            f'<stop offset="62%" stop-color="{mid}"/>'
            f'<stop offset="100%" stop-color="{low}"/>'
            f'</linearGradient>'
        )
    return f"<defs>{stops}</defs>"


# --------------------------------------------------------------------------
# element library
# Each element draws itself around a baseline point (0,0) and is placed by a
# transform, so scale and x position are the only knobs.
# --------------------------------------------------------------------------


def el_palace() -> str:
    """A Mauryan style palace: tall gateway, sloping roofs, pillared halls."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        # side halls
        f'<rect x="-118" y="-64" width="72" height="64" rx="4" fill="#d8c9a8"/>'
        f'<rect x="46" y="-64" width="72" height="64" rx="4" fill="#d8c9a8"/>'
        # roofs on the halls
        f'<path d="M -128 -64 L -82 -92 L -36 -64 Z" fill="#b04a3f"/>'
        f'<path d="M 36 -64 L 82 -92 L 128 -64 Z" fill="#b04a3f"/>'
        # main hall
        f'<rect x="-52" y="-104" width="104" height="104" rx="6" fill="#e3d6b6"/>'
        f'<path d="M -62 -104 L 0 -152 L 62 -104 Z" fill="#c0564a"/>'
        f'<path d="M -62 -104 L 0 -152 L 62 -104 Z" fill="none"/>'
        # golden finial
        f'<path d="M 0 -152 L 0 -166" stroke-width="7"/>'
        f'<circle cx="0" cy="-172" r="7" fill="#f7c948"/>'
        # doorway
        f'<path d="M -18 0 L -18 -52 Q 0 -66 18 -52 L 18 0 Z" fill="#5b3a2a"/>'
        # windows
        f'<rect x="-42" y="-88" width="16" height="22" rx="5" fill="#5b3a2a" stroke="none"/>'
        f'<rect x="26" y="-88" width="16" height="22" rx="5" fill="#5b3a2a" stroke="none"/>'
        # pillars
        f'<path d="M -60 0 L -60 -92 M 60 0 L 60 -92" stroke-width="9"/>'
        f'</g>'
    )


def el_city_walls() -> str:
    """A walled city with towers and a gate."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<rect x="-116" y="-62" width="232" height="62" rx="4" fill="#c9b898"/>'
        # crenellations
        f'<path d="M -116 -62 L -116 -78 L -96 -78 L -96 -62 M -76 -62 L -76 -78 L -56 -78 '
        f'L -56 -62 M -36 -62 L -36 -78 L -16 -78 L -16 -62 M 4 -62 L 4 -78 L 24 -78 '
        f'L 24 -62 M 44 -62 L 44 -78 L 64 -78 L 64 -62 M 84 -62 L 84 -78 L 104 -78 '
        f'L 104 -62" stroke-width="6"/>'
        # towers
        f'<rect x="-128" y="-104" width="44" height="104" rx="5" fill="#d6c5a4"/>'
        f'<path d="M -134 -104 L -106 -136 L -78 -104 Z" fill="#b04a3f"/>'
        f'<rect x="84" y="-104" width="44" height="104" rx="5" fill="#d6c5a4"/>'
        f'<path d="M 78 -104 L 106 -136 L 134 -104 Z" fill="#b04a3f"/>'
        # gate
        f'<path d="M -26 0 L -26 -46 Q 0 -62 26 -46 L 26 0 Z" fill="#5b3a2a"/>'
        f'</g>'
    )


def el_stupa() -> str:
    """A Buddhist stupa with a railing."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M -66 0 L -66 -22 L 66 -22 L 66 0 Z" fill="#e6dcc2"/>'
        f'<path d="M -54 -22 Q -54 -76 0 -76 Q 54 -76 54 -22 Z" fill="#f0e7d0"/>'
        # harmika (square railing) on top of the dome
        f'<rect x="-13" y="-98" width="26" height="22" rx="3" fill="#e6dcc2"/>'
        # tiered chattra: stacked umbrella rings on a mast
        f'<path d="M 0 -98 L 0 -134" stroke-width="6"/>'
        f'<path d="M -22 -104 Q 0 -114 22 -104" fill="none" stroke-width="6"/>'
        f'<path d="M -18 -116 Q 0 -126 18 -116" fill="none" stroke-width="6"/>'
        f'<path d="M -13 -128 Q 0 -137 13 -128" fill="none" stroke-width="6"/>'
        f'<circle cx="0" cy="-142" r="8" fill="#f7c948"/>'
        # railing posts
        f'<path d="M -84 0 L -84 -14 M -42 0 L -42 -14 M 0 0 L 0 -14 M 42 0 L 42 -14 '
        f'M 84 0 L 84 -14" stroke-width="6"/>'
        f'<path d="M -86 -14 L 86 -14" stroke-width="5"/>'
        f'</g>'
    )


def el_pillar() -> str:
    """An Ashokan lion-capital pillar: the single most recognisable Indian
    icon, and the one every child already knows from the national emblem."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        # base plinth
        f'<rect x="-42" y="-16" width="84" height="16" rx="4" fill="#c9b898"/>'
        f'<rect x="-34" y="-34" width="68" height="20" rx="6" fill="#e6dcc2"/>'
        # fluted shaft
        f'<rect x="-17" y="-118" width="34" height="88" rx="8" fill="#efe6d0"/>'
        f'<path d="M -8 -112 L -8 -36 M 0 -112 L 0 -36 M 8 -112 L 8 -36" '
        f'stroke-width="3" opacity="0.4"/>'
        # dharma chakra on the shaft
        f'<circle cx="0" cy="-78" r="13" fill="#f7c948"/>'
        f'<circle cx="0" cy="-78" r="5.5" fill="none" stroke-width="3"/>'
        f'<path d="M 0 -91 L 0 -65 M -13 -78 L 13 -78 M -9 -87 L 9 -69 M 9 -87 L -9 -69" '
        f'stroke-width="3"/>'
        # lotus abacus under the capital
        f'<path d="M -30 -118 Q 0 -136 30 -118 Q 0 -110 -30 -118 Z" fill="#f0a44a"/>'
        # four lions back to back, front lion facing us
        f'<path d="M -30 -118 L -30 -138 M 30 -118 L 30 -138" stroke-width="6"/>'
        # front lion body
        f'<path d="M -19 -120 Q -19 -154 0 -154 Q 19 -154 19 -120 Z" fill="#f0a44a"/>'
        # front paws
        f'<path d="M -16 -120 L -16 -108 M 16 -120 L 16 -108" stroke-width="8"/>'
        # lion head: broad muzzle, mane ruff, pointed ears, no smile
        f'<path d="M -21 -160 L -21 -144 Q -11 -134 0 -134 Q 11 -134 21 -144 L 21 -160 Z" '
        f'fill="#f6b45e"/>'
        # mane ruff behind the head
        f'<path d="M -20 -164 L -26 -170 L -23 -158 L -29 -152 L -22 -148 L -26 -138 '
        f'L -17 -138 Z" fill="#e08b32"/>'
        f'<path d="M 20 -164 L 26 -170 L 23 -158 L 29 -152 L 22 -148 L 26 -138 '
        f'L 17 -138 Z" fill="#e08b32"/>'
        f'<path d="M -23 -170 Q -21 -190 0 -190 Q 21 -190 23 -170 Q 0 -160 -23 -170 Z" '
        f'fill="#e08b32"/>'
        # pointed ears
        f'<path d="M -19 -174 L -24 -190 L -7 -178 Z" fill="#f6b45e"/>'
        f'<path d="M 19 -174 L 24 -190 L 7 -178 Z" fill="#f6b45e"/>'
        # eyes
        f'<circle cx="-8" cy="-162" r="3.2" fill="{INK}" stroke="none"/>'
        f'<circle cx="8" cy="-162" r="3.2" fill="{INK}" stroke="none"/>'
        # flat muzzle with a nose, not a smile
        f'<path d="M -9 -150 Q 0 -144 9 -150" fill="none" stroke-width="3.5"/>'
        f'<path d="M -5 -146 L 5 -146 L 0 -140 Z" fill="{INK}" stroke="none"/>'
        # mane hair strokes
        f'<path d="M -15 -182 L -11 -174 M 15 -182 L 11 -174 M -21 -158 L -15 -152 '
        f'M 21 -158 L 15 -152" stroke-width="3" opacity="0.7"/>'
        f'</g>'
    )


def el_temple() -> str:
    """A shikhara style temple tower."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<rect x="-44" y="-40" width="88" height="40" rx="4" fill="#e3d6b6"/>'
        f'<path d="M -38 -40 Q -30 -96 0 -122 Q 30 -96 38 -40 Z" fill="#c0564a"/>'
        f'<circle cx="0" cy="-132" r="10" fill="#f7c948"/>'
        f'<rect x="-16" y="-38" width="32" height="38" rx="4" fill="#5b3a2a"/>'
        f'<path d="M -56 0 L -56 -22 L 56 -22 L 56 0 Z" fill="#d8c9a8"/>'
        f'</g>'
    )


def el_elephant() -> str:
    """A war elephant, used for Mauryan power and forest life."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M -56 -40 Q -56 -96 0 -96 Q 56 -96 56 -40 Q 56 -8 40 -8 L -40 -8 '
        f'Q -56 -8 -56 -40 Z" fill="#9aa7b5"/>'
        f'<path d="M -46 -44 Q -20 -58 6 -50 Q 26 -44 44 -34 L 40 -8 L -40 -8 Z" '
        f'fill="#7f8d9c" stroke="none" opacity="0.7"/>'
        # head
        f'<path d="M -58 -78 Q -76 -74 -74 -52 Q -72 -34 -58 -32 Z" fill="#9aa7b5"/>'
        f'<circle cx="-64" cy="-64" r="4" fill="{INK}" stroke="none"/>'
        # long curling trunk
        f'<path d="M -72 -46 Q -86 -18 -78 4 Q -72 20 -58 18" fill="none" '
        f'stroke-width="12" stroke-linecap="round"/>'
        # tusks
        f'<path d="M -68 -38 Q -78 -26 -70 -18" fill="none" stroke="#fff6e2" '
        f'stroke-width="6" stroke-linecap="round"/>'
        # big floppy ear, drawn over the body
        f'<path d="M -34 -84 Q -8 -94 -6 -68 Q -10 -44 -38 -50 Z" fill="#8b98a6"/>'
        f'<path d="M -30 -78 Q -14 -84 -12 -66" fill="none" stroke-width="3" opacity="0.5"/>'
        # legs
        f'<path d="M -34 -8 L -34 4 M -12 -8 L -12 4 M 20 -8 L 20 4 M 40 -8 L 40 4" '
        f'stroke-width="13"/>'
        # howdah
        f'<rect x="-16" y="-132" width="32" height="30" rx="5" fill="#b04a3f"/>'
        f'<path d="M 0 -132 L 0 -146" stroke-width="5"/>'
        f'<path d="M -16 -118 L 16 -118" stroke-width="4"/>'
        f'</g>'
    )


def el_tree() -> str:
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M -7 0 L -7 -50 L 7 -50 L 7 0 Z" fill="#7a5233"/>'
        f'<circle cx="0" cy="-72" r="34" fill="#3f9e5c"/>'
        f'<circle cx="-24" cy="-58" r="22" fill="#4fae6b"/>'
        f'<circle cx="24" cy="-58" r="22" fill="#4fae6b"/>'
        f'<circle cx="0" cy="-96" r="20" fill="#4fae6b"/>'
        f'</g>'
    )


def el_palm() -> str:
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M -6 0 Q -2 -40 -4 -74" fill="none" stroke="#7a5233" stroke-width="11"/>'
        f'<path d="M -4 -74 Q -34 -92 -54 -74 Q -30 -70 -4 -74" fill="#4fae6b"/>'
        f'<path d="M -4 -74 Q 26 -92 48 -74 Q 24 -70 -4 -74" fill="#4fae6b"/>'
        f'<path d="M -4 -74 Q -14 -100 4 -108 Q 18 -96 -4 -74" fill="#3f9e5c"/>'
        f'<path d="M -4 -74 Q 2 -102 -18 -110 Q -28 -90 -4 -74" fill="#3f9e5c"/>'
        f'</g>'
    )


def el_ship() -> str:
    """A trade ship for the sea route."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M -72 0 L 72 0 L 52 26 L -52 26 Z" fill="#8a5a3b"/>'
        f'<path d="M -72 0 L 72 0" stroke-width="9"/>'
        f'<path d="M 0 -6 L 0 -78" stroke-width="8"/>'
        f'<path d="M 4 -74 Q 54 -60 46 -16 L 4 -20 Z" fill="#f2e6cf"/>'
        f'<path d="M -4 -62 Q -46 -48 -40 -18 L -4 -22 Z" fill="#e3d2b0"/>'
        f'<path d="M -56 -6 Q -66 -18 -56 -30" fill="none" stroke-width="6"/>'
        f'</g>'
    )


def el_boat() -> str:
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M -54 0 L 54 0 L 36 22 L -36 22 Z" fill="#8a5a3b"/>'
        f'<path d="M 0 -4 L 0 -50" stroke-width="7"/>'
        f'<path d="M 4 -46 Q 42 -34 36 -6 L 4 -10 Z" fill="#f2e6cf"/>'
        f'<circle cx="-18" cy="-14" r="8" fill="#e8a04a"/>'
        f'</g>'
    )


def el_court() -> str:
    """A king on a throne with two ministers, for court scenes."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        # throne
        f'<rect x="-26" y="-96" width="52" height="96" rx="8" fill="#b04a3f"/>'
        f'<path d="M -34 -96 L 0 -120 L 34 -96 Z" fill="#f7c948"/>'
        # king
        f'<circle cx="0" cy="-72" r="17" fill="#f2c8a0"/>'
        f'<path d="M -17 -78 Q 0 -94 17 -78 L 14 -70 Q 0 -82 -14 -70 Z" fill="#3d2419"/>'
        f'<path d="M -15 -84 Q 0 -100 15 -84" fill="none" stroke-width="5"/>'
        f'<circle cx="0" cy="-102" r="6" fill="#f7c948"/>'
        f'<path d="M -18 -54 L 18 -54 L 22 0 L -22 0 Z" fill="#f7c948"/>'
        f'<path d="M -6 -62 L 6 -62 L 7 -66 L -7 -66 Z" fill="{INK}" stroke="none"/>'
        # ministers
        f'<circle cx="-52" cy="-58" r="14" fill="#e8b98c"/>'
        f'<path d="M -66 -42 L -38 -42 L -34 0 L -70 0 Z" fill="#5f7fa8"/>'
        f'<circle cx="52" cy="-58" r="14" fill="#e8b98c"/>'
        f'<path d="M 38 -42 L 66 -42 L 70 0 L 34 0 Z" fill="#7a5fa8"/>'
        f'</g>'
    )


def el_hut() -> str:
    """A village hut."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M -34 0 L -34 -28 L 34 -28 L 34 0 Z" fill="#ddc79c"/>'
        f'<path d="M -44 -28 L 0 -62 L 44 -28 Z" fill="#a9663a"/>'
        f'<rect x="-10" y="-24" width="20" height="24" rx="3" fill="#5b3a2a"/>'
        f'</g>'
    )


def el_battle() -> str:
    """Battlefield debris: an overturned cart, a dropped spear and a fallen
    helmet. Reads as the aftermath of fighting, not as random props."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        # overturned cart
        f'<path d="M -84 -34 L -40 -34 L -44 -12 L -80 -12 Z" fill="#8a5a3b"/>'
        f'<circle cx="-72" cy="-4" r="13" fill="#6f452b"/>'
        f'<circle cx="-72" cy="-4" r="5" fill="#c9b898" stroke="none"/>'
        f'<circle cx="-52" cy="-4" r="13" fill="#6f452b"/>'
        f'<circle cx="-52" cy="-4" r="5" fill="#c9b898" stroke="none"/>'
        # broken wheel
        f'<circle cx="-20" cy="-10" r="20" fill="none" stroke-width="6"/>'
        f'<path d="M -20 -30 L -20 10 M -40 -10 L 0 -10 M -34 -24 L -6 4 M -6 -24 L -34 4" '
        f'stroke-width="4" opacity="0.7"/>'
        # fallen helmet
        f'<path d="M 30 -18 Q 30 -36 50 -36 Q 70 -36 70 -18 Z" fill="#9aa7b5"/>'
        f'<path d="M 30 -18 L 70 -18" stroke-width="6"/>'
        # dropped spear
        f'<path d="M 86 -30 L 128 -6" stroke-width="6"/>'
        f'<path d="M 128 -6 L 120 -14 L 116 -2 Z" fill="#c9b898"/>'
        # discarded shield
        f'<circle cx="104" cy="-14" r="16" fill="#b04a3f"/>'
        f'<circle cx="104" cy="-14" r="5" fill="#f7c948" stroke-width="4"/>'
        # toppled standard with a torn banner
        f'<path d="M -104 0 L -104 -58" stroke-width="7"/>'
        f'<path d="M -104 -58 L -74 -50 L -104 -38 Z" fill="#c0564a"/>'
        f'</g>'
    )


def el_sword() -> str:
    """A raised sword, so a conflict scene is unmistakable."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M 0 -34 L 0 -108" stroke-width="9"/>'
        f'<path d="M 0 -108 L -8 -96 L 8 -96 Z" fill="#dfe6ee"/>'
        f'<path d="M -18 -34 L 18 -34" stroke-width="8"/>'
        f'<path d="M 0 -34 L 0 -8" stroke-width="8"/>'
        f'<circle cx="0" cy="-8" r="8" fill="#8a5a3b"/>'
        f'</g>'
    )


def edict_rock() -> str:
    """A rock face with an inscription, for dhamma and edicts."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M -80 0 Q -88 -60 -44 -70 Q 0 -80 40 -62 Q 82 -46 76 0 Z" fill="#a89bb8"/>'
        f'<path d="M -46 -44 L 46 -44 M -52 -28 L 40 -28 M -40 -12 L 48 -12" '
        f'stroke-width="5" opacity="0.7"/>'
        f'<path d="M -30 -56 L -30 -8 M -10 -58 L -10 -8 M 10 -58 L 10 -8 M 30 -54 L 30 -8" '
        f'stroke-width="4" opacity="0.5"/>'
        f'</g>'
    )


def el_gift() -> str:
    """Gift vessels from other kingdoms, for Ashoka's gifts."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        # big wrapped parcel
        f'<rect x="-26" y="-46" width="52" height="46" rx="5" fill="#e3b23c"/>'
        f'<path d="M -26 -46 L 26 -46" stroke-width="7"/>'
        f'<rect x="-7" y="-46" width="14" height="46" fill="#c0564a" stroke="none"/>'
        f'<path d="M 0 -46 Q -18 -66 -8 -70 Q 0 -72 0 -46 Q 18 -66 8 -70 Q 0 -72 0 -46 Z" '
        f'fill="#c0564a"/>'
        # smaller parcels beside it
        f'<rect x="-72" y="-32" width="38" height="32" rx="5" fill="#9c6b8a"/>'
        f'<rect x="-56" y="-32" width="8" height="32" fill="#f0a44a" stroke="none"/>'
        f'<rect x="36" y="-28" width="34" height="28" rx="5" fill="#6f8fa8"/>'
        f'<rect x="50" y="-28" width="7" height="28" fill="#f0a44a" stroke="none"/>'
        f'</g>'
    )


def el_market() -> str:
    """A market stall, for trade and everyday life."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M -52 -34 L 52 -34 L 44 -6 L -44 -6 Z" fill="#e05c6b"/>'
        f'<path d="M -52 -34 Q -40 -50 -28 -34 Q -14 -50 0 -34 Q 14 -50 28 -34 Q 40 -50 52 -34" '
        f'fill="#f2e6cf"/>'
        f'<path d="M -44 -6 L -44 0 M 44 -6 L 44 0" stroke-width="6"/>'
        f'<rect x="-26" y="-24" width="18" height="18" rx="4" fill="#f7c948"/>'
        f'<circle cx="14" cy="-16" r="9" fill="#ff9a56"/>'
        f'</g>'
    )


def el_map_scroll() -> str:
    """A rolled map, for geography style scenes."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<rect x="-56" y="-34" width="112" height="52" rx="6" fill="#f2e6cf"/>'
        f'<path d="M -56 -34 L -56 18 M 56 -34 L 56 18" stroke-width="9"/>'
        f'<path d="M -36 -8 Q -6 -22 22 -6 Q -6 6 -36 -8 Z" fill="#6f8fa8" stroke-width="5"/>'
        f'<path d="M -30 6 L 26 6" stroke-width="4" opacity="0.5"/>'
        f'</g>'
    )


def el_mountain() -> str:
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M -80 0 L -22 -74 L 20 -22 L 40 -44 L 84 0 Z" fill="#8e86a8"/>'
        f'<path d="M -22 -74 L -42 -50 L -4 -50 Z" fill="#f2f6ff" stroke="none"/>'
        f'<path d="M 40 -44 L 24 -26 L 56 -26 Z" fill="#f2f6ff" stroke="none"/>'
        f'</g>'
    )


def el_river() -> str:
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M -90 -6 Q -40 18 0 -6 Q 40 -30 90 -6" fill="none" stroke="#3f8fa8" '
        f'stroke-width="22"/>'
        f'<path d="M -70 -8 Q -30 8 4 -6" fill="none" stroke="#8fd6ea" stroke-width="6" '
        f'opacity="0.8"/>'
        f'</g>'
    )


def el_scroll() -> str:
    """A written scroll, for sources and inscriptions."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<rect x="-46" y="-26" width="92" height="46" rx="5" fill="#f2e6cf"/>'
        f'<path d="M -52 -26 L -52 20 M 52 -26 L 52 20" stroke-width="10"/>'
        f'<path d="M -28 -8 L 28 -8 M -28 2 L 18 2 M -28 12 L 28 12" stroke-width="4" '
        f'opacity="0.6"/>'
        f'</g>'
    )



def el_worshipper() -> str:
    """A person standing with hands folded in respect."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        # legs
        f'<path d="M -9 0 L -9 -22 M 9 0 L 9 -22" stroke-width="9"/>'
        # dhoti / robe
        f'<path d="M -14 -22 L 14 -22 L 16 -52 L -16 -52 Z" fill="#f2e6cf"/>'
        # torso -- drawn BEFORE the arms so the arms stay visible on top
        f'<path d="M -12 -50 L 12 -50 L 13 -76 L -13 -76 Z" fill="#c0564a"/>'
        # arms: upper arm down and out, forearm raised, hands pressed together
        # at the chest in añjali. This is what makes the figure read as a
        # worshipper rather than a blob.
        f'<path d="M -13 -70 Q -28 -58 -15 -45" fill="none" stroke-width="8" '
        f'stroke-linecap="round"/>'
        f'<path d="M 13 -70 Q 28 -58 15 -45" fill="none" stroke-width="8" '
        f'stroke-linecap="round"/>'
        f'<path d="M -15 -45 Q -5 -52 0 -60" fill="none" stroke-width="7" '
        f'stroke-linecap="round"/>'
        f'<path d="M 15 -45 Q 5 -52 0 -60" fill="none" stroke-width="7" '
        f'stroke-linecap="round"/>'
        f'<circle cx="0" cy="-62" r="5.5" fill="#e8b98c"/>'
        # head
        f'<circle cx="0" cy="-90" r="15" fill="#e8b98c"/>'
        # hair
        f'<path d="M -15 -92 Q -14 -108 0 -108 Q 14 -108 15 -92 Q 8 -100 0 -100 '
        f'Q -8 -100 -15 -92 Z" fill="#3d2419"/>'
        # eye
        f'<path d="M -5 -90 L -3 -90 M 3 -90 L 5 -90" stroke-width="3"/>'
        f'</g>'
    )


def el_warrior() -> str:
    """An archer with a visible bow, for battle scenes."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        # legs
        f'<path d="M -10 0 L -12 -34 M 10 0 L 12 -34" stroke-width="11"/>'
        # tunic
        f'<path d="M -16 -34 L 16 -34 L 18 -74 L -18 -74 Z" fill="#c0564a"/>'
        # belt
        f'<path d="M -17 -44 L 17 -44" stroke-width="5"/>'
        # arms: the right arm is raised overhead holding a sword, the left
        # holds a round shield. Both read instantly as "fighting".
        f'<path d="M 16 -70 Q 40 -78 42 -96" fill="none" stroke-width="9" '
        f'stroke-linecap="round"/>'
        f'<path d="M -16 -68 Q -34 -62 -34 -46" fill="none" stroke-width="9" '
        f'stroke-linecap="round"/>'
        # sword, raised
        f'<path d="M 42 -96 L 42 -152" stroke-width="8"/>'
        f'<path d="M 42 -152 L 35 -141 L 49 -141 Z" fill="#dfe6ee"/>'
        f'<path d="M 30 -96 L 54 -96" stroke-width="7"/>'
        # round shield
        f'<circle cx="-40" cy="-44" r="21" fill="#b04a3f"/>'
        f'<circle cx="-40" cy="-44" r="7" fill="#f7c948" stroke-width="4"/>'
        # head with helmet
        f'<circle cx="0" cy="-88" r="16" fill="#e8b98c"/>'
        f'<path d="M -17 -92 Q 0 -110 17 -92 L 16 -86 L -16 -86 Z" fill="#9aa7b5"/>'
        f'<path d="M 0 -104 L 0 -114" stroke-width="5"/>'
        f'<path d="M -5 -88 L -3 -88 M 3 -88 L 5 -88" stroke-width="3"/>'
        f'</g>'
    )


def el_court_king() -> str:
    """A seated king, full body, holding a sceptre. Used for court scenes."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        # throne back
        f'<path d="M -40 -110 L 40 -110 L 40 0 L -40 0 Z" fill="#b04a3f"/>'
        f'<path d="M -46 -110 L 0 -136 L 46 -110 Z" fill="#f7c948"/>'
        # seat
        f'<rect x="-34" y="-34" width="68" height="14" rx="5" fill="#c0564a"/>'
        # king body
        f'<path d="M -24 -34 L 24 -34 L 26 -78 L -26 -78 Z" fill="#f7c948"/>'
        # arms
        f'<path d="M -24 -72 Q -40 -62 -38 -44" fill="none" stroke-width="9"/>'
        f'<path d="M 24 -72 Q 44 -70 46 -48" fill="none" stroke-width="9"/>'
        # sceptre
        f'<path d="M 46 -48 L 52 -104" stroke-width="6"/>'
        f'<circle cx="52" cy="-112" r="9" fill="#f7c948"/>'
        # head
        f'<circle cx="0" cy="-94" r="19" fill="#f2c8a0"/>'
        # crown
        f'<path d="M -18 -104 L -18 -122 L -9 -114 L 0 -128 L 9 -114 L 18 -122 L 18 -104 Z" '
        f'fill="#f7c948"/>'
        # eyes
        f'<path d="M -7 -94 L -4 -94 M 4 -94 L 7 -94" stroke-width="3"/>'
        f'<path d="M -6 -86 Q 0 -82 6 -86" fill="none" stroke-width="3"/>'
        f'</g>'
    )


def el_sword() -> str:
    """A raised sword, so a conflict scene is unmistakable."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round">'
        f'<path d="M 0 -34 L 0 -108" stroke-width="9"/>'
        f'<path d="M 0 -108 L -8 -96 L 8 -96 Z" fill="#dfe6ee"/>'
        f'<path d="M -18 -34 L 18 -34" stroke-width="8"/>'
        f'<path d="M 0 -34 L 0 -8" stroke-width="8"/>'
        f'<circle cx="0" cy="-8" r="8" fill="#8a5a3b"/>'
        f'</g>'
    )


def el_offerings() -> str:
    """Flower offerings laid at the foot of a stupa."""
    return (
        f'<g stroke="{INK}" stroke-width="5" stroke-linejoin="round">'
        # shallow offering bowl
        f'<path d="M -46 -10 Q 0 6 46 -10 Z" fill="#c9b898"/>'
        f'<path d="M -50 -10 L 50 -10" stroke-width="6"/>'
        # flowers standing in the bowl
        f'<path d="M -26 -10 L -26 -26 M 0 -8 L 0 -32 M 26 -10 L 26 -26" stroke-width="5"/>'
        f'<circle cx="-26" cy="-32" r="9" fill="#ff7ab8"/>'
        f'<circle cx="0" cy="-40" r="10" fill="#f7c948"/>'
        f'<circle cx="26" cy="-32" r="9" fill="#ff7ab8"/>'
        f'<circle cx="-26" cy="-32" r="3.5" fill="#ffffff" stroke="none"/>'
        f'<circle cx="0" cy="-40" r="4" fill="#ffffff" stroke="none"/>'
        f'<circle cx="26" cy="-32" r="3.5" fill="#ffffff" stroke="none"/>'
        f'</g>'
    )


def el_torana() -> str:
    """A low torana railing arch, for stupa and temple courtyards."""
    return (
        f'<g stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round" fill="none">'
        f'<path d="M -110 -4 Q 0 -62 110 -4" stroke-width="7"/>'
        f'<path d="M -100 -14 Q 0 -70 100 -14" stroke-width="4" opacity="0.6"/>'
        f'<path d="M -110 -4 L -110 4 M -76 -18 L -76 -2 M -38 -30 L -38 -2 '
        f'M 0 -34 L 0 -2 M 38 -30 L 38 -2 M 76 -18 L 76 -2 M 110 -4 L 110 4" '
        f'stroke-width="5"/>'
        f'</g>'
    )

ELEMENTS = {
    "palace": el_palace,
    "sword": el_sword,
    "offerings": el_offerings,
    "torana": el_torana,
    "worshipper": el_worshipper,
    "warrior": el_warrior,
    "court-king": el_court_king,
    "city-walls": el_city_walls,
    "stupa": el_stupa,
    "pillar": el_pillar,
    "temple": el_temple,
    "elephant": el_elephant,
    "tree": el_tree,
    "palm": el_palm,
    "ship": el_ship,
    "boat": el_boat,
    "court": el_court,
    "hut": el_hut,
    "battle": el_battle,
    "edict-rock": edict_rock,
    "gift": el_gift,
    "market": el_market,
    "map-scroll": el_map_scroll,
    "mountain": el_mountain,
    "river": el_river,
    "scroll": el_scroll,
}


# --------------------------------------------------------------------------
# scene composition
# --------------------------------------------------------------------------


def render_scene(spec: dict) -> str:
    body = sky_and_ground(spec.get("sky", "day"), spec.get("ground", "grass"), spec.get("mood", "calm"))
    for e in spec.get("elements", []):
        fn = ELEMENTS.get(e["kind"])
        if not fn:
            continue
        x = e.get("x", 256)
        scale = e.get("scale", 1.0)
        baseline = e.get("y", 246)
        # flip mirrors the element about its own centre, so a mirrored figure
        # still stands on the same spot
        flip = " scale(-1 1)" if e.get("flip") else ""
        body.append(
            f'<g transform="translate({x} {baseline}) scale({scale}){flip}">{fn()}</g>'
        )
    # birds for life
    if spec.get("mood") != "still":
        for x, y, s in ((90, 54, 1.0), (118, 44, 0.8), (146, 58, 0.7)):
            body.append(
                f'<path d="M {x} {y} q {6 * s} {-7 * s} {12 * s} 0 q {6 * s} {-7 * s} {12 * s} 0" '
                f'fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round" opacity="0.75"/>'
            )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
        f'role="img">{defs()}{"".join(body)}</svg>'
    )


# --------------------------------------------------------------------------
# the scene catalogue
# --------------------------------------------------------------------------

SCENES = {
    # History, Chapter 1: The Mauryan Empire
    "hist-magadha": dict(
        sky="day", ground="grass",
        elements=[
            {"kind": "city-walls", "x": 268, "scale": 1.15},
            {"kind": "tree", "x": 44, "scale": 0.85},
            {"kind": "tree", "x": 466, "scale": 0.85},
            {"kind": "elephant", "x": 112, "scale": 0.62},
        ],
    ),
    "hist-chanakya": dict(
        sky="dusk", ground="stone",
        elements=[
            {"kind": "court-king", "x": 168, "scale": 0.95},
            {"kind": "scroll", "x": 322, "y": 244, "scale": 0.62},
            {"kind": "worshipper", "x": 420, "scale": 0.72},
            {"kind": "palace", "x": 250, "scale": 0.5, "y": 236},
        ],
    ),
    "hist-mauryan-empire": dict(
        sky="sunset", ground="grass",
        elements=[
            {"kind": "palace", "x": 282, "scale": 1.25},
            {"kind": "elephant", "x": 92, "scale": 0.68},
            {"kind": "tree", "x": 466, "scale": 0.9},
        ],
    ),
    "hist-arthashastra": dict(
        sky="day", ground="stone",
        elements=[
            {"kind": "scroll", "x": 150, "y": 244, "scale": 1.0},
            {"kind": "court-king", "x": 356, "scale": 0.9},
        ],
    ),
    "hist-roads-trade": dict(
        sky="day", ground="sand",
        elements=[
            {"kind": "market", "x": 106, "scale": 1.05},
            {"kind": "hut", "x": 252, "scale": 0.6},
            {"kind": "ship", "x": 396, "scale": 1.0},
        ],
    ),
    "hist-forests": dict(
        sky="green", ground="grass",
        elements=[
            {"kind": "palm", "x": 74, "scale": 1.1},
            {"kind": "elephant", "x": 268, "scale": 0.95},
            {"kind": "tree", "x": 440, "scale": 1.0},
        ],
    ),
    "hist-kalinga": dict(
        sky="dusk", ground="sand",
        elements=[
            {"kind": "warrior", "x": 132, "scale": 1.0},
            {"kind": "warrior", "x": 380, "scale": 1.0, "flip": True},
            {"kind": "battle", "x": 256, "scale": 0.72},
        ],
    ),
    "hist-ashoka-dhamma": dict(
        sky="dawn", ground="grass",
        elements=[
            {"kind": "pillar", "x": 236, "scale": 1.15},
            {"kind": "edict-rock", "x": 404, "scale": 0.85},
            {"kind": "worshipper", "x": 78, "scale": 0.72},
        ],
    ),
    "hist-ashoka-gifts": dict(
        sky="day", ground="sand",
        elements=[
            {"kind": "gift", "x": 256, "scale": 1.05},
            {"kind": "hut", "x": 72, "scale": 0.72},
            {"kind": "hut", "x": 440, "scale": 0.72},
            {"kind": "worshipper", "x": 396, "scale": 0.6},
        ],
    ),
    "hist-stupa-worship": dict(
        sky="dusk", ground="stone",
        elements=[
            {"kind": "stupa", "x": 256, "scale": 1.15},
            {"kind": "torana", "x": 256, "y": 248, "scale": 1.25},
            {"kind": "offerings", "x": 256, "y": 250, "scale": 1.1},
            {"kind": "worshipper", "x": 74, "scale": 0.85},
            {"kind": "worshipper", "x": 438, "scale": 0.85},
        ],
    ),
    # Geography
    "geo-maps": dict(
        sky="day", ground="field",
        elements=[
            {"kind": "map-scroll", "x": 256, "scale": 1.35},
            {"kind": "tree", "x": 56, "scale": 0.7},
            {"kind": "hut", "x": 452, "scale": 0.6},
        ],
    ),
    "geo-mountains": dict(
        sky="day", ground="grass",
        elements=[
            {"kind": "mountain", "x": 158, "scale": 1.25},
            {"kind": "mountain", "x": 368, "scale": 0.95},
            {"kind": "tree", "x": 52, "scale": 0.9},
            {"kind": "tree", "x": 462, "scale": 0.75},
        ],
    ),
    "geo-rivers": dict(
        sky="day", ground="water",
        elements=[
            {"kind": "river", "x": 190, "y": 262, "scale": 1.35},
            {"kind": "boat", "x": 372, "y": 264, "scale": 0.95},
            {"kind": "palm", "x": 62, "scale": 0.9},
        ],
    ),
    "geo-plains": dict(
        sky="dawn", ground="field",
        elements=[
            {"kind": "hut", "x": 116, "scale": 0.95},
            {"kind": "hut", "x": 264, "scale": 0.95},
            {"kind": "hut", "x": 412, "scale": 0.95},
            {"kind": "tree", "x": 52, "scale": 0.7},
        ],
    ),
    # Civics
    "civ-rules": dict(
        sky="day", ground="stone",
        elements=[
            {"kind": "court-king", "x": 150, "scale": 1.05},
            {"kind": "worshipper", "x": 300, "scale": 0.82},
            {"kind": "worshipper", "x": 386, "scale": 0.78},
            {"kind": "scroll", "x": 464, "y": 248, "scale": 0.5},
        ],
    ),
    "civ-village": dict(
        sky="day", ground="grass",
        elements=[
            {"kind": "hut", "x": 132, "scale": 1.05},
            {"kind": "hut", "x": 286, "scale": 1.05},
            {"kind": "hut", "x": 440, "scale": 1.05},
            {"kind": "worshipper", "x": 208, "scale": 0.62},
        ],
    ),
    "civ-council": dict(
        sky="dusk", ground="stone",
        elements=[
            {"kind": "palace", "x": 256, "scale": 1.2},
            {"kind": "worshipper", "x": 72, "scale": 0.72},
            {"kind": "worshipper", "x": 440, "scale": 0.72},
        ],
    ),
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--pack", default="class6-sst-term2")
    args = ap.parse_args()

    if args.list:
        for k in SCENES:
            print(k)
        return 0

    out = os.path.join(ROOT, args.pack, "media")
    os.makedirs(out, exist_ok=True)
    for name, spec in SCENES.items():
        path = os.path.join(out, f"scene-{name}.svg")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(render_scene(spec))
        print(" ", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
