#!/usr/bin/env python3
"""Compose the Hooty app icons from the painted owl in public/characters/hooty (no image model needed here).
Writes the PNG sizes the web app manifest and iOS home screens use. Needs ImageMagick (`magick`)."""
import os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "public", "assets", "icons")
OWL = os.path.join(ROOT, "public", "characters", "hooty", "owl-idle.webp")

def run(*a): subprocess.run(["magick", *a], check=True)

def icon(out, size, owl_frac, rounded):
    """A deep-purple tile with a soft glow and the owl's face; owl_frac is the owl's share of the tile width."""
    tmp = os.path.join(ICONS, "_owl_head.png")
    # the face and hood: a square from the top of the full-body art
    h = int(subprocess.check_output(["magick", "identify", "-format", "%h", OWL]))
    w = int(subprocess.check_output(["magick", "identify", "-format", "%w", OWL]))
    side = int(h * 0.64)
    # fade the bottom of the crop away so no hard edge shows
    run(OWL, "-crop", f"{side}x{side}+{max(0, (w - side)//2)}+0", "+repage", "-alpha", "set",
        "(", "-size", f"{side}x{side}", "gradient:white-black", "-level", "0%,34%", "-alpha", "copy", ")", "-compose", "DstIn", "-composite", tmp)
    owl = int(size * owl_frac)
    tile = ["-size", f"{size}x{size}", "gradient:#3a2560-#1c1030"]
    glow = ["(", "-size", f"{size}x{size}", "radial-gradient:#f7c948-#00000000", "-evaluate", "multiply", "0.55", ")", "-compose", "screen", "-composite"]
    cmd = [*tile, *glow, "(", tmp, "-resize", f"{owl}x{owl}", ")", "-gravity", "center", "-geometry", "+0+4", "-compose", "over", "-composite"]
    if rounded:
        r = int(size * 0.22)
        cmd += ["(", "-size", f"{size}x{size}", "xc:none", "-fill", "white", "-draw", f"roundrectangle 0,0 {size-1},{size-1} {r},{r}", ")", "-alpha", "set", "-compose", "DstIn", "-composite"]
    run(*cmd, os.path.join(ICONS, out))
    os.remove(tmp)

def main():
    icon("icon-512.png", 512, 0.86, True)
    icon("icon-192.png", 192, 0.86, True)
    icon("favicon-64.png", 64, 0.92, True)
    icon("apple-touch-icon.png", 180, 0.86, False)   # iOS rounds the corners itself
    icon("icon-maskable-512.png", 512, 0.66, False)  # full-bleed; the owl stays inside the 80% safe circle
    icon("icon-maskable-192.png", 192, 0.66, False)
    print("owl icons written to", ICONS)

if __name__ == "__main__":
    main()
