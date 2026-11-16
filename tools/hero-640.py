"""Write the 640 pixel copy of every painted theme hero.

A phone draws the stage about 360 pixels wide, but the painted heroes are 1400 to 1600 pixels and about
90 KB. theme.js offers the small copy to screens under 720 pixels and keeps the full one everywhere else.
Run after adding or replacing a hero: python3 tools/hero-640.py
"""
import glob
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'themes')


def main():
    made = []
    for src in sorted(glob.glob(os.path.join(ROOT, '*', 'assets', 'hero*.webp'))):
        if src.endswith('-640.webp'):
            continue
        out = src.replace('.webp', '-640.webp')
        im = Image.open(src).convert('RGB')
        height = round(im.height * 640 / im.width)
        im.resize((640, height), Image.LANCZOS).save(out, 'WEBP', quality=72, method=6)
        made.append((os.path.relpath(out, ROOT), os.path.getsize(out)))
    for name, size in made:
        print(f'{name}  {size // 1024} KB')
    print(f'{len(made)} small heroes written')


if __name__ == '__main__':
    main()
