#!/bin/bash
# Give each Hooty lane its own git worktree with the untracked source material linked in.
#
# Two agents editing one working tree fight over the git index and stage each other's half-finished
# files, so each lane gets a worktree and a branch. But most of `work/` is not in git: the chapter
# sources, the design bar, the playbook. A lane without it cannot rebuild a book or read the standard.
#
# So: tracked paths under work/ (funfacts, plain) stay real files in the lane, because a lane may edit
# and commit them; every OTHER entry of the main repo's work/ is symlinked, read-only in practice.
# Symlinking the whole work/ directory does not work: git then sees `work` as a symlink instead of a
# tree and reports every tracked file beneath it as deleted.
#
#   tools/setup-lanes.sh          # create or repair both lanes
#   tools/setup-lanes.sh design   # just one
set -u
MAIN=$HOME/agent-workspace/hooty-build
WTROOT=$HOME/agent-workspace/hooty-wt
LANES=${1:-"design teach"}

for lane in $LANES; do
  wt=$WTROOT/$lane
  if [ ! -d "$wt/.git" ] && [ ! -f "$wt/.git" ]; then
    git -C "$MAIN" worktree add -B "shift/$lane" "$wt" >/dev/null 2>&1 || {
      echo "$lane: could not create worktree"; continue; }
  fi

  # tracked work/ paths must be real files again
  if [ -L "$wt/work" ]; then rm -f "$wt/work"; fi
  mkdir -p "$wt/work"
  git -C "$wt" checkout -- work 2>/dev/null || true

  # untracked entries are linked to the main copy
  for entry in "$MAIN"/work/*; do
    name=$(basename "$entry")
    case "$name" in funfacts|plain) continue ;; esac      # tracked, keep the lane's own copy
    [ -e "$wt/work/$name" ] || ln -s "$entry" "$wt/work/$name"
  done

  # publish settings are git-ignored, and the lane tools read them
  [ -e "$wt/tools/local.env" ] || ln -s "$MAIN/tools/local.env" "$wt/tools/local.env"

  # public/audio (20k voice clips, ~1 GB) is outside git, so a lesson in a bare worktree plays silent
  # and the lane judges a lesson it cannot hear. Link it read-only.
  [ -e "$wt/public/audio" ] || ln -s "$MAIN/public/audio" "$wt/public/audio"
  # the ignore rule matches a directory, not a symlink to one, so the link would show as untracked
  grep -qx 'public/audio' "$MAIN/.git/info/exclude" 2>/dev/null || echo 'public/audio' >> "$MAIN/.git/info/exclude"

  echo "$lane: $(git -C "$wt" status --porcelain | wc -l) changes in the tree, branch $(git -C "$wt" rev-parse --abbrev-ref HEAD)"
done
