#!/usr/bin/env python3
"""Collectable explorer stickers: code-drawn SVG in the same sticker style as the theme rewards.

The theme rewards stop at 300 XP, which a child passes within five lessons. These nine carry on to
10,000 XP and are shared by every theme: they live in public/assets/stickers/ and each theme's
theme.json points at them (tools/svg_stickers.py --register adds the entries).

  python3 tools/svg_stickers.py             draw the SVGs
  python3 tools/svg_stickers.py --register  also add them to every theme.json
"""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svg_art import svg_doc, star5, sparkle, _badge

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'stickers')
INK, GOLD, CREAM, WHITE = '#2a1a4a', '#f7c948', '#fff3d6', '#ffffff'


def line(x1, y1, x2, y2, colour=INK, w=11):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{colour}" stroke-width="{w}" stroke-linecap="round"/>'


def compass():
    needle = (f'<polygon points="256,150 280,256 256,362 232,256" fill="{WHITE}" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>'
              f'<polygon points="256,150 280,256 232,256" fill="#e8504a" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>')
    ticks = ''.join(line(256 + 112 * math.sin(a), 256 - 112 * math.cos(a), 256 + 126 * math.sin(a), 256 - 126 * math.cos(a), INK, 8)
                    for a in [i * math.pi / 4 for i in range(8)])
    return (_badge('#5bc0be', INK, '') + f'<circle cx="256" cy="256" r="140" fill="{CREAM}" stroke="{INK}" stroke-width="11"/>'
            + ticks + needle + f'<circle cx="256" cy="256" r="14" fill="{GOLD}" stroke="{INK}" stroke-width="8"/>')


def book():
    page = lambda d: f'<path d="{d}" fill="{CREAM}" stroke="{INK}" stroke-width="11" stroke-linejoin="round"/>'
    return (_badge('#8ecae6', INK, '')
            + page('M 256 190 C 220 165 170 160 126 172 L 126 330 C 170 318 220 323 256 348 Z')
            + page('M 256 190 C 292 165 342 160 386 172 L 386 330 C 342 318 292 323 256 348 Z')
            + ''.join(line(152, y, 232, y + 8, '#c9b98f', 7) for y in (212, 240, 268))
            + ''.join(line(360, y, 280, y + 8, '#c9b98f', 7) for y in (212, 240, 268))
            + f'<path d="M 232 348 L 232 392 L 256 376 L 280 392 L 280 348 Z" fill="#e8504a" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>')


def flask():
    return (_badge('#b8e0a1', INK, '')
            + f'<path d="M 226 150 L 286 150 L 286 232 L 352 366 C 362 388 350 402 328 402 L 184 402 C 162 402 150 388 160 366 L 226 232 Z" fill="{WHITE}" stroke="{INK}" stroke-width="11" stroke-linejoin="round"/>'
            + f'<path d="M 192 322 L 320 322 L 346 372 C 352 386 346 392 330 392 L 182 392 C 166 392 160 386 166 372 Z" fill="#b57edc" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>'
            + f'<rect x="218" y="138" width="76" height="22" rx="10" fill="{GOLD}" stroke="{INK}" stroke-width="9"/>'
            + f'<circle cx="236" cy="284" r="11" fill="{WHITE}" stroke="{INK}" stroke-width="7"/><circle cx="278" cy="262" r="8" fill="{WHITE}" stroke="{INK}" stroke-width="6"/>')


def globe():
    return (_badge('#ffb4a2', INK, '')
            + f'<circle cx="256" cy="244" r="118" fill="#6fb7e9" stroke="{INK}" stroke-width="11"/>'
            + f'<path d="M 190 190 C 214 168 250 176 262 200 C 274 222 252 236 238 256 C 226 276 200 270 192 244 C 186 224 180 204 190 190 Z" fill="#7bc96f" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>'
            + f'<path d="M 290 236 C 316 224 342 240 338 268 C 334 296 304 312 292 290 C 284 272 282 250 290 236 Z" fill="#7bc96f" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>'
            + f'<ellipse cx="256" cy="244" rx="52" ry="118" fill="none" stroke="{WHITE}" stroke-width="5" opacity="0.6"/>'
            + f'<path d="M 138 244 L 374 244" stroke="{WHITE}" stroke-width="5" opacity="0.6"/>'
            + f'<path d="M 206 382 L 256 362 L 306 382 L 306 400 L 206 400 Z" fill="{GOLD}" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>')


def telescope():
    return (_badge('#9d8df1', INK, '')
            + f'<g transform="rotate(-28 256 236)">'
            + f'<rect x="120" y="212" width="130" height="62" rx="12" fill="{GOLD}" stroke="{INK}" stroke-width="11"/>'
            + f'<rect x="240" y="222" width="94" height="42" rx="10" fill="#e8504a" stroke="{INK}" stroke-width="11"/>'
            + f'<rect x="326" y="230" width="62" height="26" rx="8" fill="{CREAM}" stroke="{INK}" stroke-width="10"/>'
            + f'<rect x="102" y="200" width="30" height="86" rx="10" fill="{CREAM}" stroke="{INK}" stroke-width="10"/></g>'
            + line(236, 292, 190, 392) + line(256, 292, 256, 396) + line(276, 292, 322, 392)
            + sparkle(372, 148, 22, WHITE, 0.95) + sparkle(150, 156, 14, WHITE, 0.8))


def lantern():
    return (_badge('#f4a261', INK, '')
            + line(256, 126, 256, 160, INK, 10)
            + f'<rect x="206" y="156" width="100" height="26" rx="12" fill="{INK}"/>'
            + f'<path d="M 196 190 L 316 190 L 336 330 C 338 352 322 366 300 366 L 212 366 C 190 366 174 352 176 330 Z" fill="{CREAM}" stroke="{INK}" stroke-width="11" stroke-linejoin="round"/>'
            + f'<path d="M 256 232 C 288 262 292 300 256 330 C 220 300 224 262 256 232 Z" fill="{GOLD}" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>'
            + f'<path d="M 256 268 C 270 284 270 304 256 318 C 242 304 242 284 256 268 Z" fill="#e8504a"/>'
            + f'<rect x="190" y="360" width="132" height="28" rx="12" fill="{INK}"/>'
            + line(226, 196, 220, 360, INK, 7) + line(286, 196, 292, 360, INK, 7))


def trophy():
    return (_badge('#f6bd60', INK, '')
            + f'<path d="M 190 160 L 322 160 L 322 244 C 322 290 292 316 256 316 C 220 316 190 290 190 244 Z" fill="{GOLD}" stroke="{INK}" stroke-width="11" stroke-linejoin="round"/>'
            + f'<path d="M 190 188 C 150 188 144 244 196 262" fill="none" stroke="{INK}" stroke-width="11" stroke-linecap="round"/>'
            + f'<path d="M 322 188 C 362 188 368 244 316 262" fill="none" stroke="{INK}" stroke-width="11" stroke-linecap="round"/>'
            + f'<rect x="238" y="314" width="36" height="46" fill="{GOLD}" stroke="{INK}" stroke-width="10"/>'
            + f'<rect x="202" y="358" width="108" height="34" rx="10" fill="#b57edc" stroke="{INK}" stroke-width="10"/>'
            + star5(256, 236, 38, WHITE, INK, 7))


def medal():
    return (_badge('#e07a9b', INK, '')
            + f'<path d="M 196 112 L 246 232 L 214 240 L 160 128 Z" fill="#5bc0be" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>'
            + f'<path d="M 316 112 L 266 232 L 298 240 L 352 128 Z" fill="#e8504a" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>'
            + f'<circle cx="256" cy="312" r="92" fill="{GOLD}" stroke="{INK}" stroke-width="11"/>'
            + f'<circle cx="256" cy="312" r="68" fill="none" stroke="{WHITE}" stroke-width="6" opacity="0.7"/>'
            + star5(256, 312, 50, WHITE, INK, 8))


def starburst():
    rays = ''.join(line(256 + 150 * math.sin(a), 256 - 150 * math.cos(a), 256 + 190 * math.sin(a), 256 - 190 * math.cos(a), WHITE, 9)
                   for a in [i * math.pi / 6 for i in range(12)])
    return (_badge('#5e60ce', INK, '') + f'<g opacity="0.85">{rays}</g>'
            + star5(256, 262, 128, GOLD, INK, 12) + star5(256, 262, 62, '#fff3b0', None, 0)
            + sparkle(118, 140, 22, WHITE, 0.95) + sparkle(398, 372, 18, WHITE, 0.85))


# (file id, name, xp, drawer)
STICKERS = [
    ('compass', 'Explorer Compass', 500, compass),
    ('book', 'Story Book', 1000, book),
    ('flask', 'Science Flask', 1700, flask),
    ('globe', 'Little Globe', 2600, globe),
    ('telescope', 'Star Telescope', 3700, telescope),
    ('lantern', 'Brave Lantern', 5000, lantern),
    ('trophy', 'Golden Trophy', 6500, trophy),
    ('medal', 'Champion Medal', 8200, medal),
    ('starburst', 'Superstar', 10000, starburst),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    for sid, _name, _xp, fn in STICKERS:
        with open(os.path.join(OUT, f'{sid}.svg'), 'w', encoding='utf-8') as fh:
            fh.write(svg_doc(512, 512, fn()))
        print('drew', sid)
    if '--register' in sys.argv:
        for tdir in sorted(os.listdir(os.path.join(ROOT, 'public', 'themes'))):
            p = os.path.join(ROOT, 'public', 'themes', tdir, 'theme.json')
            if not os.path.exists(p):
                continue
            t = json.load(open(p))
            rewards = [r for r in t.get('rewards', []) if not r['id'].startswith('explorer-')]
            for sid, name, xp, _fn in STICKERS:
                rewards.append({'id': f'explorer-{sid}', 'name': name, 'art': f'../../assets/stickers/{sid}.svg', 'unlockAt': xp})
            t['rewards'] = sorted(rewards, key=lambda r: r['unlockAt'])
            json.dump(t, open(p, 'w'), ensure_ascii=False, indent=2)
            print('registered in', tdir)


if __name__ == '__main__':
    main()
