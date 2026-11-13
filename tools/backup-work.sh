#!/usr/bin/env bash
# Back up work/ (the facts, lesson drafts and simulation matches that are not in the public repo, because they derive from the
# NCERT textbooks) to the PRIVATE repo anirudhprashant/hooty-work. It uses its own git folder outside the project, so the
# public repo's rules are untouched. Safe to run any time; does nothing when nothing changed. publish.py runs it after each publish.
#   tools/backup-work.sh
set -u
export GIT_DIR="${HOOTY_WORK_GIT:-$HOME/.hooty-work.git}" GIT_WORK_TREE="$(cd "$(dirname "$0")/.." && pwd)/work"
# The systemd units export HOOTY_WORK_GIT; a manual publish from a plain shell does not. Look where the private repo
# actually lives before giving up, which is how drafts sat unbacked until someone noticed.
if [ ! -d "$GIT_DIR" ] && [ -d "$HOME/agent-workspace/hooty-env/hooty-work.git" ]; then
  export GIT_DIR="$HOME/agent-workspace/hooty-env/hooty-work.git"
fi
[ -d "$GIT_DIR" ] || { echo "backup-work: no $GIT_DIR (see tools/backup-work.sh header)"; exit 0; }
cd "$GIT_WORK_TREE" || exit 0
git add -A >/dev/null 2>&1
if git diff --cached --quiet; then echo "backup-work: nothing new"; exit 0; fi
n=$(git diff --cached --name-only | wc -l)
git commit -q -m "Back up working files ($n changed) $(date '+%Y-%m-%d %H:%M')" || exit 0
if git push -q origin main 2>/tmp/backup-work.err; then echo "backup-work: $n files saved to the private repo"; else echo "backup-work: push failed: $(head -c 120 /tmp/backup-work.err)"; fi
