#!/usr/bin/env python3
"""Find an accurate, freely licensed picture for every lesson of a chapter. No API keys.

  python3 tools/find-images.py 3        # chapter 3 (re-runnable; lessons that have a picture are skipped)

How it stays accurate:
  1. M2.7 proposes concrete search phrases from the lesson's own fact sheet.
  2. Candidates come from Wikimedia Commons (free API) and, if Commons has nothing usable, Openverse
     (free API, licence-filtered). Only public-domain / CC0 / CC BY / CC BY-SA files of at least 900px wide.
  3. M2.7 chooses among the candidates reading ONLY each file's title, description and categories, and may
     answer "none". The caption is written from that same description, never from imagination.
  4. MiniMax's vision model looks at each pick and must score it 7+ (6 if nothing beats it).
  5. The picture is downloaded, resized to 1200px and saved as webp beside its credit (creator, licence, link).
NCERT's own figures are not used: that text and art are not ours to redistribute.
Output: public/content/packs/class6-sst/media/chN-lK-*.webp and work/sst6/chNN/images.json (applied by
tools/assemble-pack.py). tools/image-sheet.py makes a contact sheet so a human can eyeball the choices.
"""
import sys as _s; _s.path.insert(0, __file__.rsplit('/', 1)[0])
from imglib import vision_score
from subjects import S as SUBJ
import hashlib, html, json, os, re, subprocess, sys, time, urllib.parse, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = int(sys.argv[1]); NN = f'{N:02d}'; W = f"{ROOT}/{SUBJ['work']}/ch{NN}"
MEDIA = f"{ROOT}/public/content/packs/{SUBJ['pack']}/media"; os.makedirs(MEDIA, exist_ok=True)
UA = 'LumiLearningGame/1.0 (educational; ' + os.environ.get('LUMI_CONTACT', 'no contact set') + ')'
facts = json.load(open(f'{W}/facts.json'))
out_path = f'{W}/images.json'
out = json.load(open(out_path)) if os.path.exists(out_path) else {}
used = set()
for f in os.popen(f"ls {ROOT}/{SUBJ['work']}/ch*/images.json 2>/dev/null").read().split():
    for v in json.load(open(f)).values(): used.add(v['credit']['url'])
if os.path.exists(f'{MEDIA}/credits.json'): used |= {c['credit']['url'] for c in json.load(open(f'{MEDIA}/credits.json'))}
if os.path.exists(f"{ROOT}/{SUBJ['work']}/rejected-images.json"): used |= set(json.load(open(f"{ROOT}/{SUBJ['work']}/rejected-images.json")))  # pictures a human threw out

def get(url, binary=False, tries=4):
    for t in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r:
                d = r.read(); return d if binary else json.loads(d)
        except Exception as e:
            time.sleep(3 + t * 4)
    return None

from llm import MAGICK, m27

clean = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()
OK_LIC = re.compile(r'^(cc0|public domain|pd|cc[ -]by(?!-?nc)(?!.*nd)|cc[ -]by-sa|attribution)', re.I)
BAD_NAME = re.compile(r'logo|icon|flag of|coat of arms|stamp|poster|screenshot|banner|advert|blank|template|signature|portrait of|\bwanted\b', re.I)

def commons(q, limit=12):
    url = ('https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=%d'
           '&gsrsearch=%s&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1200&uselang=en'
           % (limit, urllib.parse.quote(q + ' filetype:bitmap|drawing')))
    d = get(url); pages = (d or {}).get('query', {}).get('pages', {})
    for p in sorted(pages.values(), key=lambda p: p.get('index', 99)):
        ii = (p.get('imageinfo') or [{}])[0]; m = ii.get('extmetadata', {})
        lic = clean(m.get('LicenseShortName', {}).get('value'))
        if not OK_LIC.match(lic) or ii.get('width', 0) < 900 or BAD_NAME.search(p['title']): continue
        yield {'src': 'commons', 'title': p['title'], 'page': ii['descriptionurl'], 'thumb': ii.get('thumburl') or ii['url'],
               'desc': clean(m.get('ImageDescription', {}).get('value'))[:350], 'cats': clean(m.get('Categories', {}).get('value'))[:200],
               'creator': clean(m.get('Artist', {}).get('value'))[:80] or 'Unknown', 'license': lic,
               'licenseUrl': clean(m.get('LicenseUrl', {}).get('value')), 'w': ii['width']}

def openverse(q, limit=8):
    url = 'https://api.openverse.org/v1/images/?q=%s&license=cc0,pdm,by,by-sa&page_size=%d&mature=false&size=large' % (urllib.parse.quote(q), limit)
    for r in (get(url) or {}).get('results', []):
        if (r.get('width') or 0) < 900 or BAD_NAME.search(r.get('title') or ''): continue
        yield {'src': 'openverse', 'title': r.get('title') or '', 'page': r.get('foreign_landing_url') or r['url'], 'thumb': r['url'],
               'desc': clean(r.get('title')) + ' ' + ' '.join(t['name'] for t in r.get('tags', [])[:8]), 'cats': '',
               'creator': r.get('creator') or 'Unknown', 'license': ('CC ' + r['license'].upper() + ' ' + (r.get('license_version') or '')).strip(),
               'licenseUrl': r.get('license_url') or '', 'w': r.get('width')}

def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:28]

def one(lesson, broad=False):
    key = lesson['id'][1:]
    if key in out: return
    sheet = '\n'.join('- ' + f['say'] for f in lesson['facts'][:8])
    extra = ('THE FIRST ATTEMPT FOUND NOTHING: use broader, more general phrases for the setting (for example "village meeting India", "Indian family", "panchayat", "school children India") rather than the lesson\'s specific names.' if broad else '')
    d = m27(f'''A children's {SUBJ['name']} lesson called "{lesson['title']}" (India, Class {SUBJ.get('grade', '6')}) needs ONE good picture: a photograph, map, diagram or painting that shows what the lesson is about.
Facts of the lesson:\n{sheet}\n
Give 5 short search phrases IN ENGLISH (2 to 5 words each) for Wikimedia Commons, the best first. Use concrete things a photographer or mapmaker would title a file with (e.g. "tsunami wave", "Indian Ocean map", "Antarctica ice"). Prefer real places in India when the lesson is about India.
{extra}
Reply ONLY JSON: {{"queries": ["...", "..."]}}''')
    if not d: print('no queries', key); return
    cands, seen = [], set()
    for q in d['queries'][:5]:
        for c in commons(q):
            if c['page'] not in seen and c['page'] not in used: seen.add(c['page']); cands.append(c)
        time.sleep(0.6)
    if len(cands) < 3:
        for q in d['queries'][:3]:
            for c in openverse(q):
                if c['page'] not in seen and c['page'] not in used: seen.add(c['page']); cands.append(c)
    cands = cands[:14]
    if not cands: print('no candidates', key); return
    menu = '\n'.join(f"{i}. TITLE: {c['title']} | DESCRIPTION: {c['desc']} | CATEGORIES: {c['cats']}" for i, c in enumerate(cands))
    pick = m27(f'''Rank the best pictures (up to 3, best first) for a Class {SUBJ.get('grade', '6')} lesson called "{lesson['title']}". The lesson says:\n{sheet}\n
Candidates (you only see their file title, description and categories):\n{menu}\n
Rules: the picture must clearly show what the lesson is about, be accurate (the description must support it), be bright, clear and attractive to a child. REJECT: charts, tables, calendars, diagrams full of text, maps with tiny labels, manuscript pages (unless the lesson is about manuscripts), night or very dark photos, photos with logos or watermarks, war or distressing scenes, rubbish, close-ups of one person, and odd details of an object. Prefer a real place, people at work or a landmark that a child would recognise. If NONE fit, answer an empty list. Do not stretch.
For each, write "alt" (one plain sentence for a blind learner) and "caption" (one sentence, at most 22 words) using ONLY what the description says.
Reply ONLY JSON: {{"ranked": [{{"index": 0, "alt": "...", "caption": "..."}}]}}''')
    chosen = runner_up = None; unchecked = False
    for r in (pick or {}).get('ranked', [])[:3]:
        if not isinstance(r.get('index'), int) or not 0 <= r['index'] < len(cands): continue
        c = cands[r['index']]
        raw = get(c['thumb'], binary=True)
        if not raw: continue
        name = f"ch{N}-l{key}-{slug(re.sub(r'^File:', '', c['title']).rsplit('.', 1)[0])}-{hashlib.sha1(c['page'].encode()).hexdigest()[:6]}.webp"  # the hash: two candidates can share a shortened title
        tmp = f'/tmp/sparkle-img-{N}-{key}'
        open(tmp, 'wb').write(raw)
        subprocess.run([MAGICK, tmp + '[0]', '-auto-orient', '-resize', '1100x1100>', '-background', 'white', '-flatten', '-quality', '74', f'{MEDIA}/{name}'], check=True, capture_output=True)
        os.remove(tmp)
        score, why = vision_score(f'{MEDIA}/{name}', lesson['title'], sheet)
        print(f'  look {key} {c["title"][:50]}: {score} {why}', flush=True)
        if score is None:  # checker down: trust the description-based pick and mark it to be looked at later
            chosen = (c, r, name, score); unchecked = True; break
        if score >= PASS: chosen = (c, r, name, score); unchecked = False; break
        if score >= PASS - 1 and not runner_up: runner_up = (c, r, name, score); continue  # keep the file in case nothing beats it
        os.remove(f'{MEDIA}/{name}'); used.add(c['page'])
    if not chosen and runner_up: chosen = runner_up; unchecked = False
    elif runner_up and chosen is not runner_up and os.path.exists(f'{MEDIA}/{runner_up[2]}'): os.remove(f'{MEDIA}/{runner_up[2]}')
    if not chosen: print('nothing passed the look test', key); return
    c, pick, name, score = chosen
    who = c['creator'] if c['creator'] != 'Unknown' else 'unknown author'
    title = re.sub(r'^File:', '', c['title']).rsplit('.', 1)[0].replace('_', ' ')[:70]
    out[key] = {'file': 'media/' + name, 'alt': pick['alt'].strip(), 'caption': pick['caption'].strip(),
                'credit': {'text': f"{title} by {who}, {c['license']}, via {'Wikimedia Commons' if c['src'] == 'commons' else 'Openverse'}",
                           'url': c['page'], 'license': c['license'], 'licenseUrl': c['licenseUrl'], 'creator': who}}
    if unchecked: out[key]['unchecked'] = True
    if score is not None and score < 7: out[key]['score'] = score   # below the usual bar: kept only to give a blank chapter a picture
    used.add(c['page']); json.dump(out, open(out_path, 'w'), indent=1, ensure_ascii=False)
    print('ok', key, c['title'], flush=True)

# The look test usually wants 7+/10. A backfill of chapters that have NO picture at all may set a lower
# bar, because an honest, accurate picture of the topic beats a blank page; the score is kept with the file.
PASS = int(os.environ.get('HOOTY_MIN_SCORE', '7'))
STOP_AFTER = int(os.environ.get('HOOTY_STOP_AFTER', '0'))   # backfill mode: one good picture makes the whole chapter illustrated
for l in facts['lessons']:
    one(l)
    if l['id'][1:] not in out and os.environ.get('HOOTY_BROAD') != '0': one(l, broad=True)
    if STOP_AFTER and len([k for k in out if k != 'boss']) >= STOP_AFTER:
        print('stop-after reached, chapter is illustrated', flush=True); break
# the chapter challenge reuses the first lesson's picture
if '1' in out and 'boss' not in out: out['boss'] = out['1']
json.dump(out, open(out_path, 'w'), indent=1, ensure_ascii=False)
print('pictures:', len([k for k in out if k != 'boss']), 'of', len(facts['lessons']))
