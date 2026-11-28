#!/bin/sh
# Fetch the Hindi word list tools/hindi-repair.py uses as its authority on "is this a real word?".
#
# Three independent sources, because no single one covers a children's book:
#   1. hunspell-hi's word forms, from the Ubuntu archive — the spelling checker's own lexicon;
#   2. wordfreq's Hindi list (Wikipedia + subtitles + news + web) — frequency-ranked, so it carries the
#      inflected forms a checker's base lexicon leaves out (मुस्कुराते, कनखजूरे, रंगोली);
#   3. FrequencyWords' OpenSubtitles list as a second opinion.
# The union is what the repair tool asks. A word in none of them is not repaired by rule — it goes to the
# review list, and a person reads the printed page before it enters tools/hindi-repair-cases.json.
#
# It is kept out of the repo (work/ is gitignored) because it is a reference list, not part of Hooty's
# content or code: the app never ships it.
#
#   sh tools/hindi-words.sh
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/work/qa/hindi-words.txt"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"
apt-get download hunspell-hi >/dev/null 2>&1 || {
    echo "could not download hunspell-hi (no apt or no network)" >&2
    exit 1
}
dpkg-deb -x ./*.deb x
curl -sL --max-time 120 -o subtitles.txt \
    https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/hi/hi_full.txt || true
python3 - "$OUT" subtitles.txt <<'PY'
import glob, re, sys
DEVA = re.compile('^[\u0900-\u097F]+$')
words = set()
src = glob.glob('x/usr/share/hunspell/*.dic')[0]
for line in open(src, encoding='utf-8'):
    form = line.strip().split('/')[0].strip()
    if form and not form.isdigit():
        words.add(form)
try:
    from wordfreq import top_n_list
    words.update(w for w in top_n_list('hi', 300000) if DEVA.match(w))
    print(f'wordfreq: {sum(1 for w in words)} words so far')
except ImportError:
    print('wordfreq not installed in this interpreter — skipping source 2 (pip install wordfreq)',
          file=sys.stderr)
try:
    for line in open(sys.argv[2], encoding='utf-8'):
        parts = line.rstrip('\n').split(' ')
        if len(parts) == 2 and parts[1].isdigit() and int(parts[1]) >= 2 and DEVA.match(parts[0]):
            words.add(parts[0])
except OSError:
    print('no subtitles list downloaded — skipping source 3', file=sys.stderr)
words = sorted(w for w in words if len(w) > 1)
open(sys.argv[1], 'w', encoding='utf-8').write('\n'.join(words) + '\n')
print(f'{len(words)} Hindi words -> {sys.argv[1]}')
PY
