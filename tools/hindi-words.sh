#!/bin/sh
# Fetch the Hindi word list tools/hindi-repair.py uses as its dictionary.
#
# It is hunspell-hi's word forms, from the Ubuntu archive. It is kept out of the repo (work/ is
# gitignored) because it is a reference list, not part of Hooty's content or code: the app never ships
# it, the repair tool only asks it "is this a real Hindi word?".
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
python3 - "$OUT" <<'PY'
import glob, sys
src = glob.glob('x/usr/share/hunspell/*.dic')[0]
words = []
for line in open(src, encoding='utf-8'):
    form = line.strip().split('/')[0].strip()
    if form and not form.isdigit():
        words.append(form)
open(sys.argv[1], 'w', encoding='utf-8').write('\n'.join(words) + '\n')
print(f'{len(words)} Hindi word forms -> {sys.argv[1]}')
PY
