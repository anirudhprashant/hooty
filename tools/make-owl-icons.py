#!/usr/bin/env python3
"""Draw the Hooty owl icon set (vector art in code, no image model) and render the PNGs the web app manifest and
iOS home screens need. Replaces the old star icon script. Needs `rsvg-convert` (librsvg)."""

import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ICONS = os.path.join(os.path.dirname(HERE), "public", "assets", "icons")

OWL = """
<g id="owl">
  <!-- feet -->
  <g fill="#f4a23a"><ellipse cx="218" cy="470" rx="30" ry="15"/><ellipse cx="294" cy="470" rx="30" ry="15"/></g>
  <!-- ear tufts -->
  <path d="M128 168 Q122 112 150 90 Q190 106 214 150 Z" fill="#8a5a3b"/>
  <path d="M384 168 Q390 112 362 90 Q322 106 298 150 Z" fill="#8a5a3b"/>
  <!-- body and head -->
  <ellipse cx="256" cy="318" rx="146" ry="152" fill="#8a5a3b"/>
  <ellipse cx="256" cy="228" rx="160" ry="136" fill="#8a5a3b"/>
  <!-- wings -->
  <path d="M120 290 Q78 388 148 452 Q176 396 170 302 Z" fill="#6b4329"/>
  <path d="M392 290 Q434 388 364 452 Q336 396 342 302 Z" fill="#6b4329"/>
  <!-- belly with feather scallops -->
  <ellipse cx="256" cy="372" rx="88" ry="96" fill="#ffe9c2"/>
  <g fill="none" stroke="#e3c08a" stroke-width="6" stroke-linecap="round">
    <path d="M222 340 q12 14 24 0"/><path d="M266 340 q12 14 24 0"/>
    <path d="M200 380 q12 14 24 0"/><path d="M244 380 q12 14 24 0"/><path d="M288 380 q12 14 24 0"/>
    <path d="M222 420 q12 14 24 0"/><path d="M266 420 q12 14 24 0"/>
  </g>
  <!-- face discs -->
  <ellipse cx="196" cy="226" rx="74" ry="72" fill="#ffe9c2"/>
  <ellipse cx="316" cy="226" rx="74" ry="72" fill="#ffe9c2"/>
  <!-- eyes -->
  <circle cx="196" cy="226" r="52" fill="#ffffff" stroke="#ffc635" stroke-width="10"/>
  <circle cx="316" cy="226" r="52" fill="#ffffff" stroke="#ffc635" stroke-width="10"/>
  <circle cx="200" cy="230" r="32" fill="#2b1349"/>
  <circle cx="312" cy="230" r="32" fill="#2b1349"/>
  <circle cx="212" cy="218" r="11" fill="#ffffff"/>
  <circle cx="324" cy="218" r="11" fill="#ffffff"/>
  <circle cx="190" cy="244" r="5" fill="#ffffff"/>
  <circle cx="302" cy="244" r="5" fill="#ffffff"/>
  <!-- beak -->
  <path d="M238 262 Q256 250 274 262 Q266 298 256 306 Q246 298 238 262 Z" fill="#f4a23a"/>
  <path d="M244 270 Q256 264 268 270" fill="none" stroke="#d88620" stroke-width="4" stroke-linecap="round"/>
</g>
"""

SPARKS = """
<g fill="#c9b3e8">
  <circle cx="92" cy="410" r="7"/><circle cx="430" cy="420" r="5"/><circle cx="84" cy="128" r="5"/>
  <circle cx="440" cy="122" r="7"/><circle cx="452" cy="300" r="4"/>
</g>
"""


def svg(rounded, scale, with_sparks):
    # the owl is drawn about 380 px tall, centred on (256, 290); scale it down to leave a safe margin
    ty = 256 - 290 * scale
    tx = 256 - 256 * scale
    radius = 112 if rounded else 0
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3a2560"/><stop offset="100%" stop-color="#1c1030"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="46%" r="50%">
      <stop offset="0%" stop-color="#f7c948" stop-opacity="0.55"/><stop offset="100%" stop-color="#f7c948" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="{radius}" fill="url(#bg)"/>
  <circle cx="256" cy="260" r="220" fill="url(#glow)"/>
  {SPARKS if with_sparks else ''}
  <g transform="translate({tx:.1f} {ty:.1f}) scale({scale})">{OWL}</g>
</svg>
"""


def render(svg_text, name, size):
    src = os.path.join(ICONS, "_tmp.svg")
    with open(src, "w") as f:
        f.write(svg_text)
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), "-o", os.path.join(ICONS, name), src], check=True)
    os.remove(src)


def main():
    plain = svg(True, 0.86, True)
    maskable = svg(False, 0.66, False)  # full-bleed square; the owl stays inside the 80% safe circle
    with open(os.path.join(ICONS, "icon-512.svg"), "w") as f:
        f.write(plain)
    render(plain, "icon-512.png", 512)
    render(plain, "icon-192.png", 192)
    render(plain, "favicon-64.png", 64)
    render(svg(False, 0.84, False), "apple-touch-icon.png", 180)  # iOS rounds the corners itself
    render(maskable, "icon-maskable-512.png", 512)
    render(maskable, "icon-maskable-192.png", 192)
    print("owl icons written to", ICONS)


if __name__ == "__main__":
    main()
