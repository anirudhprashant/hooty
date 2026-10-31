#!/usr/bin/env python3
"""Hero scenes: one big hand-built, flat-colour landscape per theme.

These are the "world" each theme lives in: the panel on the home screen and
the card in the world picker. Style rules, shared with the mascots and
rewards so the three read as one family:

  - flat fills only, no gradients; depth comes from stepped tones
  - the sky is built from soft horizontal bands, never a blend
  - far things are lighter and cooler, near things darker and richer
  - a single warm light source (sun, moon, lantern) per scene
  - no outlines on scenery; outlines are for characters and stickers

Usage: python3 tools/svg_hero.py   (writes themes/*/assets/hero.svg)
"""

import math
import os

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'themes')
W, H = 1200, 640


def bands(colors, top=0, bottom=H):
    h = (bottom - top) / len(colors)
    return ''.join(
        f'<rect x="0" y="{top + i * h:.1f}" width="{W}" height="{h + 1:.1f}" fill="{c}"/>'
        for i, c in enumerate(colors)
    )


def hill(base, amp, freq, phase, fill, step=20):
    pts = []
    x = -step
    while x <= W + step:
        y = base + amp * math.sin(x / freq + phase) + amp * 0.35 * math.sin(x / (freq * 0.43) + phase * 2.1)
        pts.append(f'{x:.0f},{y:.1f}')
        x += step
    return f'<polygon points="{" ".join(pts)} {W + step},{H} -{step},{H}" fill="{fill}"/>'


def spark(x, y, r, fill, op=1):
    d = (f'M{x} {y - r}C{x + r * .12} {y - r * .3} {x + r * .3} {y - r * .12} {x + r} {y}'
         f'C{x + r * .3} {y + r * .12} {x + r * .12} {y + r * .3} {x} {y + r}'
         f'C{x - r * .12} {y + r * .3} {x - r * .3} {y + r * .12} {x - r} {y}'
         f'C{x - r * .3} {y - r * .12} {x - r * .12} {y - r * .3} {x} {y - r}Z')
    return f'<path d="{d}" fill="{fill}" opacity="{op}"/>'


def cloud(x, y, s, fill):
    return (f'<g transform="translate({x} {y}) scale({s})" fill="{fill}">'
            '<rect x="-70" y="-14" width="140" height="28" rx="14"/>'
            '<circle cx="-22" cy="-22" r="24"/><circle cx="20" cy="-30" r="32"/><circle cx="52" cy="-14" r="16"/></g>')


def tower(x, base, w, h, wall, roof, roof_h, win, flag=None):
    out = f'<rect x="{x}" y="{base - h}" width="{w}" height="{h}" fill="{wall}"/>'
    out += f'<polygon points="{x - 8},{base - h} {x + w + 8},{base - h} {x + w / 2},{base - h - roof_h}" fill="{roof}"/>'
    out += f'<rect x="{x + w / 2 - 6}" y="{base - h + 26}" width="12" height="24" rx="6" fill="{win}"/>'
    if flag:
        out += (f'<rect x="{x + w / 2 - 1.5}" y="{base - h - roof_h - 34}" width="3" height="36" fill="{wall}"/>'
                f'<polygon points="{x + w / 2 + 1.5},{base - h - roof_h - 34} {x + w / 2 + 30},{base - h - roof_h - 24} {x + w / 2 + 1.5},{base - h - roof_h - 14}" fill="{flag}"/>')
    return out


def svg(body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
            f'role="img" aria-label="{title}" preserveAspectRatio="xMidYMax slice">{body}</svg>')


def enchanted():
    b = bands(['#4B2597', '#5C2DB0', '#7438C6', '#9448D6', '#B65DE0', '#DD7FE0', '#FFA6CB'], 0, 520)
    b += '<circle cx="820" cy="130" r="150" fill="#FFD9EC" opacity=".18"/><circle cx="820" cy="130" r="104" fill="#FFE6F2" opacity=".28"/>'
    b += '<circle cx="820" cy="130" r="66" fill="#FFF3C4"/><circle cx="802" cy="116" r="10" fill="#FFE49A"/><circle cx="836" cy="146" r="6" fill="#FFE49A"/>'
    for x, y, r, o in [(120, 90, 16, 1), (260, 170, 10, .8), (410, 70, 12, .9), (560, 140, 8, .7), (700, 60, 14, 1),
                       (1010, 120, 12, .9), (1100, 250, 8, .7), (60, 260, 9, .7), (330, 280, 7, .6), (1010, 60, 9, .8)]:
        b += spark(x, y, r, '#FFF3C4', o)
    b += cloud(190, 330, 1.0, '#C486EC') + cloud(1040, 360, 0.8, '#C486EC')
    b += hill(470, 22, 210, 0.6, '#8A47C9')
    # castle on the middle hill
    b += hill(500, 16, 260, 2.1, '#6E34B0')
    cx, base = 470, 520
    b += f'<rect x="{cx - 120}" y="{base - 130}" width="240" height="140" fill="#FFE7F2"/>'
    b += f'<rect x="{cx - 120}" y="{base - 130}" width="240" height="14" fill="#F7C6DD"/>'
    for i in range(7):
        b += f'<rect x="{cx - 120 + i * 36}" y="{base - 146}" width="22" height="18" fill="#FFE7F2"/>'
    b += tower(cx - 190, base + 6, 74, 190, '#FFF3F9', '#FF5C9E', 96, '#FFC635', '#FFC635')
    b += tower(cx + 116, base + 6, 74, 190, '#FFF3F9', '#FF5C9E', 96, '#FFC635', '#FFC635')
    b += tower(cx - 40, base + 6, 80, 270, '#FFFFFF', '#E0408A', 120, '#FFC635', '#FFC635')
    b += f'<path d="M{cx - 30} {base + 10}V{base - 56}a30 30 0 0 1 60 0V{base + 10}Z" fill="#7438C6"/>'
    b += f'<circle cx="{cx + 14}" cy="{base - 26}" r="4" fill="#FFC635"/>'
    b += hill(560, 18, 240, 4.0, '#4B2597')
    b += hill(600, 14, 180, 1.0, '#34196F')
    return svg(b, 'A castle on a hill at dusk, under a pale moon')


def space():
    b = bands(['#0A1431', '#0E1B40', '#13245A', '#182E70', '#1E3A88'], 0, 560)
    import random
    rnd = random.Random(7)
    for _ in range(60):
        b += spark(rnd.randint(20, 1180), rnd.randint(20, 400), rnd.choice([3, 4, 5, 7]), '#EAF2FF', rnd.choice([.5, .7, .9]))
    # big ringed planet: back half of the ring, the planet, then the front half
    ring = 'fill="none" stroke="#FFC635" stroke-width="16" stroke-linecap="round"'
    b += f'<g transform="rotate(-14 880 238)"><ellipse cx="880" cy="238" rx="210" ry="40" {ring}/></g>'
    b += '<circle cx="880" cy="230" r="118" fill="#FF7A6B"/>'
    b += '<path d="M800 168a118 118 0 0 1 150 -8a118 118 0 0 0 -150 8Z" fill="#FF9484"/>'
    b += '<path d="M780 290a118 118 0 0 0 175 22a118 118 0 0 1 -175 -22Z" fill="#E85D52"/>'
    b += f'<g transform="rotate(-14 880 238)"><path d="M670 238A210 40 0 0 0 1090 238" {ring}/></g>'
    # moon
    b += '<circle cx="280" cy="180" r="44" fill="#57D4F0"/><circle cx="266" cy="170" r="9" fill="#3BB8D6"/><circle cx="298" cy="198" r="6" fill="#3BB8D6"/>'
    b += '<circle cx="520" cy="110" r="22" fill="#FFC635"/>'
    # horizon
    b += hill(520, 14, 300, 0.4, '#2D4FA6')
    b += hill(560, 12, 220, 2.2, '#233F8A')
    b += '<ellipse cx="300" cy="590" rx="70" ry="14" fill="#182E70"/><ellipse cx="760" cy="600" rx="50" ry="10" fill="#182E70"/><ellipse cx="1010" cy="585" rx="62" ry="12" fill="#182E70"/>'
    b += hill(610, 8, 160, 3.0, '#14265E')
    return svg(b, 'A ringed planet and a small moon above a starry horizon')


def jungle():
    b = bands(['#FFE9A3', '#FFDC85', '#F7E9A0', '#CFEA9C', '#A6DB93'], 0, 520)
    b += '<circle cx="900" cy="200" r="130" fill="#FFF6C8" opacity=".55"/><circle cx="900" cy="200" r="80" fill="#FFF8D6"/>'
    # far tree line
    b += hill(430, 26, 90, 0.3, '#7CCB8B', 12)
    b += hill(470, 30, 120, 1.7, '#4FB27A', 14)
    # trunks
    for x, w in [(180, 40), (470, 34), (780, 44), (1040, 36)]:
        b += f'<rect x="{x}" y="120" width="{w}" height="520" fill="#6B4A2E"/><rect x="{x + w * .62}" y="120" width="{w * .38}" height="520" fill="#573B23"/>'
    # canopy blobs
    for x, y, r, c in [(140, 130, 120, '#1F8E56'), (260, 100, 90, '#2BA568'), (500, 120, 110, '#1F8E56'), (620, 90, 80, '#2BA568'),
                       (790, 130, 120, '#1F8E56'), (940, 100, 90, '#2BA568'), (1080, 140, 110, '#1F8E56'), (1180, 100, 80, '#2BA568'), (20, 110, 80, '#2BA568')]:
        b += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>'
    # vine
    b += '<path d="M330 0C350 120 300 200 340 300" fill="none" stroke="#127A47" stroke-width="10" stroke-linecap="round"/>'
    for i, (x, y) in enumerate([(338, 120), (322, 200), (338, 280)]):
        b += f'<ellipse cx="{x + (14 if i % 2 else -14)}" cy="{y}" rx="22" ry="11" fill="#2BA568" transform="rotate({(-25 if i % 2 else 25)} {x} {y})"/>'
    b += hill(540, 18, 160, 2.6, '#2F9E62', 14)
    b += hill(585, 16, 120, 0.8, '#1B7A4A', 14)
    # big foreground leaves
    leaf = lambda x, y, s, r, c: (f'<g transform="translate({x} {y}) rotate({r}) scale({s})"><path d="M0 0C60 -80 150 -90 230 -40C170 20 80 40 0 0Z" fill="{c}"/>'
                                  f'<path d="M0 0C80 -30 150 -35 220 -38" fill="none" stroke="#0E5A35" stroke-width="5" stroke-linecap="round"/></g>')
    b += leaf(-20, 640, 1.2, -62, '#12683F') + leaf(1220, 640, 1.2, 242, '#12683F') + leaf(60, 650, 0.9, -28, '#1B7A4A') + leaf(1150, 650, 0.9, 208, '#1B7A4A')
    # butterfly
    b += ('<g transform="translate(660 330)"><path d="M0 0C-40 -50 -80 -30 -60 10C-50 30 -10 20 0 0Z" fill="#FF7A3D"/><path d="M0 0C40 -50 80 -30 60 10C50 30 10 20 0 0Z" fill="#FF7A3D"/>'
          '<path d="M0 0C-30 40 -50 60 -30 70C-10 70 0 30 0 0Z" fill="#FFC635"/><path d="M0 0C30 40 50 60 30 70C10 70 0 30 0 0Z" fill="#FFC635"/><rect x="-3" y="-14" width="6" height="52" rx="3" fill="#0E5A35"/></g>')
    return svg(b, 'Sunlight through a jungle canopy')


def lagoon():
    b = bands(['#8EE3EC', '#A8EBF0', '#C4F2F2', '#DDF8F2'], 0, 380)
    b += '<circle cx="250" cy="170" r="110" fill="#FFF6C8" opacity=".5"/><circle cx="250" cy="170" r="64" fill="#FFEFA8"/>'
    b += cloud(620, 130, 1.1, '#FFFFFF') + cloud(960, 200, 0.8, '#FFFFFF') + cloud(110, 320, 0.7, '#F2FDFB')
    # sea
    b += bands(['#37C3CF', '#22AEBE', '#1597AE', '#0F7F9A', '#0C6A85'], 380, H)
    for y, xs in [(430, [120, 520, 900]), (480, [260, 700, 1040]), (540, [80, 460, 820])]:
        for x in xs:
            b += f'<path d="M{x} {y}q20 -12 40 0t40 0t40 0" fill="none" stroke="#A8EBF0" stroke-width="6" stroke-linecap="round" opacity=".7"/>'
    # island with palm
    b += '<path d="M780 392c40 -48 150 -62 230 -6c20 14 30 6 40 6H770Z" fill="#F7D98B"/><path d="M800 392c30 -30 120 -44 190 -2Z" fill="#FFE9A8"/>'
    b += '<path d="M905 392C900 340 908 300 920 262" fill="none" stroke="#7A4B2B" stroke-width="12" stroke-linecap="round"/>'
    for r in (-70, -20, 25, 70, 110):
        b += f'<path d="M920 262C{940 + r * .5} {230 - abs(r) * .1} {985 + r * .6} {240 + abs(r) * .3} {1000 + r * .5} {290}C{960 + r * .3} {262} {940} {262} 920 262Z" fill="#1F9D55" transform="rotate({r * .2} 920 262)"/>'
    # lighthouse
    lx = 1090
    b += f'<path d="M{lx - 34} 392L{lx - 22} 190h44L{lx + 34} 392Z" fill="#FFFFFF"/><path d="M{lx - 29} 330L{lx - 25} 290h50L{lx + 29} 330Z" fill="#FF6B5E"/><path d="M{lx - 25} 250L{lx - 22} 212h44L{lx + 25} 250Z" fill="#FF6B5E"/>'
    b += f'<rect x="{lx - 30}" y="176" width="60" height="18" rx="4" fill="#0C3A47"/><rect x="{lx - 18}" y="132" width="36" height="46" rx="6" fill="#FFE9A8"/><polygon points="{lx - 28},134 {lx + 28},134 {lx},98" fill="#FF6B5E"/>'
    b += f'<path d="M{lx - 18} 150L{lx - 160} 120V176Z" fill="#FFF6C8" opacity=".5"/>'
    # sailboat
    b += '<g transform="translate(430 392)"><path d="M-70 0h140l-24 36h-92Z" fill="#FF6B5E"/><rect x="-3" y="-120" width="6" height="122" fill="#0C3A47"/><path d="M6 -116L66 -14H6Z" fill="#FFFFFF"/><path d="M-6 -96L-52 -14h46Z" fill="#FFE9A8"/></g>'
    b += hill(618, 10, 140, 0.2, '#0C6A85')
    return svg(b, 'A lighthouse and a sailboat on a calm lagoon')


for tid, fn in [('enchanted-kingdom', enchanted), ('space-starlight', space), ('jungle-canopy', jungle), ('calm-lagoon', lagoon)]:
    out = os.path.join(ROOT, tid, 'assets', 'hero.svg')
    with open(out, 'w') as f:
        f.write(fn())
    print('wrote', out)
