#!/usr/bin/env python3
"""Render the PWA icon set.

PNG icons are required by the web app manifest and by iOS home screens. This
draws them with PIL so there is no dependency on an SVG rasteriser, and no
dependency on an image model either: the icon is vector art in code.
"""

import math
import os
import sys

def ensure_system_python():
    """Re-exec under /usr/bin/python3 when PIL is missing from this interpreter."""
    if os.environ.get("SPARKLE_PY_OK"):
        return True
    try:
        import PIL  # noqa: F401
        import numpy  # noqa: F401
        os.environ["SPARKLE_PY_OK"] = "1"
        return True
    except ImportError:
        if sys.executable != "/usr/bin/python3":
            os.environ["SPARKLE_PY_OK"] = "1"
            os.execv("/usr/bin/python3", ["/usr/bin/python3", os.path.abspath(__file__)] + sys.argv[1:])
        raise


ensure_system_python()

from PIL import Image, ImageDraw  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ICONS = os.path.join(ROOT, "public", "assets", "icons")

BG_TOP = (58, 37, 96)
BG_BOTTOM = (28, 16, 48)
GOLD = (240, 180, 41)
CREAM = (255, 248, 225)
STAR = (247, 201, 72)
MUTED = (201, 179, 232)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_star(draw, cx, cy, r_out, r_in, points, fill, rotation=-math.pi / 2):
    coords = []
    for i in range(points * 2):
        r = r_out if i % 2 == 0 else r_in
        ang = rotation + i * math.pi / points
        coords.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    draw.polygon(coords, fill=fill)


def render_icon(size, maskable=False):
    """Draw the Sparkle icon at `size` px square."""
    ss = 4  # supersample factor for smooth edges
    n = size * ss
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # background gradient
    for y in range(n):
        d.line([(0, y), (n, y)], fill=lerp(BG_TOP, BG_BOTTOM, y / n))

    if maskable:
        # full bleed background, art inset into the safe zone
        d.rectangle([0, 0, n, n], fill=BG_BOTTOM)
        art_scale = 0.68
        ox = oy = n * (1 - art_scale) / 2
    else:
        art_scale = 1.0
        ox = oy = 0

    # rounded corners for the normal icon
    if not maskable:
        mask = Image.new("L", (n, n), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, n - 1, n - 1], radius=int(n * 0.22), fill=255
        )
        img.putalpha(mask)

    # soft golden glow behind the star
    glow = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gx = n * 0.5
    gy = n * 0.42 * art_scale + oy
    for i in range(26):
        t = i / 25
        rad = n * 0.34 * art_scale * (1 - t)
        alpha = int(9 * t)
        gd.ellipse([gx - rad, gy - rad, gx + rad, gy + rad], fill=(*GOLD, alpha))
    img = Image.alpha_composite(img, glow)
    d = ImageDraw.Draw(img)

    # sparkles
    for (fx, fy, fr) in ((0.235, 0.745, 0.014), (0.765, 0.775, 0.010),
                         (0.295, 0.235, 0.010), (0.725, 0.21, 0.014),
                         (0.822, 0.585, 0.008)):
        draw_star(d, n * fx, n * fy, n * fr, n * fr * 0.4, 4, MUTED)

    # the big star
    r_out = n * 0.27 * art_scale
    draw_star(d, gx, gy, r_out, r_out * 0.44, 5, CREAM)
    draw_star(d, gx, gy, r_out * 0.56, r_out * 0.25, 5, STAR)

    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(ICONS, exist_ok=True)
    jobs = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-192.png", 192, True),
        ("icon-maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, True),
        ("favicon-64.png", 64, False),
    ]
    for name, size, maskable in jobs:
        dest = os.path.join(ICONS, name)
        render_icon(size, maskable).convert("RGB").save(dest, "PNG", optimize=True)
        print(f"wrote {dest} ({size}x{size})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
