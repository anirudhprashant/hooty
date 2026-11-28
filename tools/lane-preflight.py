#!/usr/bin/env python3
"""Put a lane's working copy back in a state where a pass can succeed, before the pass starts.

Every failure mode seen so far is boring and recoverable, but only if something notices before an agent
spends an hour on top of it: a worktree left on the wrong branch, a `git merge` abandoned half finished,
a pass that died mid-edit and left the tree dirty, the `work/` symlinks that point at the chapter sources
having gone missing (the sources themselves are untracked, so the symlink is the only link), or main having
moved on so far that the lane is building on week-old code.

  python3 tools/lane-preflight.py design|teach|fix

Exit 0 means the lane is ready to work; anything else says exactly what is wrong and what was done about it.
Nothing here touches main, and nothing here publishes.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WT = '/home/ubuntu/agent-workspace/hooty-wt'
MAIN_WORK = f'{ROOT}/work'


def run(*cmd, cwd=None, check=False):
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if check and result.returncode:
        raise RuntimeError(f'{" ".join(cmd)} failed: {result.stderr.strip()[-200:]}')
    return result


def git(lane, *args):
    return run('git', '-C', f'{WT}/{lane}', *args)


def ensure_worktree(lane):
    path = f'{WT}/{lane}'
    if not os.path.isdir(f'{path}/.git') and not os.path.isfile(f'{path}/.git'):
        print(f'{lane}: no working copy, creating it')
        result = run('bash', f'{HERE}/setup-lanes.sh', lane, cwd=ROOT)
        if result.returncode:
            return f'could not create the working copy: {result.stderr.strip()[-200:]}'
    return None


def clear_half_finished_git(lane):
    notes = []
    if os.path.exists(f'{WT}/{lane}/.git/MERGE_HEAD') or git(lane, 'rev-parse', '-q', '--verify', 'MERGE_HEAD').returncode == 0:
        git(lane, 'merge', '--abort')
        notes.append('aborted a half-finished merge')
    if os.path.isdir(f'{WT}/{lane}/.git/rebase-merge') or os.path.isdir(f'{WT}/{lane}/.git/rebase-apply'):
        git(lane, 'rebase', '--abort')
        notes.append('aborted a half-finished rebase')
    return notes


def right_branch(lane):
    wanted = f'shift/{lane}'
    branch = git(lane, 'rev-parse', '--abbrev-ref', 'HEAD').stdout.strip()
    if branch != wanted:
        result = git(lane, 'checkout', '-q', wanted)
        if result.returncode:
            return f'not on {wanted} (on {branch}) and could not switch: {result.stderr.strip()[-150:]}'
        return f'was on {branch}, switched back to {wanted}'
    return None


def save_leftovers(lane):
    """A pass that died mid-edit leaves tracked files modified. Keep them, on the branch, and carry on."""
    status = git(lane, 'status', '--porcelain', '--untracked-files=no').stdout.strip()
    if not status:
        return None
    files = [line.split()[-1] for line in status.splitlines()]
    git(lane, 'add', '-A')
    # Generated packs are rebuilt by every publish, so they are never a lane's work to commit, and leaving
    # them dirty blocks the merge of main. Throw that churn away and keep anything a person wrote.
    git(lane, 'reset', '-q', '--', 'public/content')
    git(lane, 'restore', '--worktree', '--source=HEAD', '--', 'public/content')
    if git(lane, 'diff', '--cached', '--quiet').returncode == 0:
        return f'discarded {len(files)} generated pack changes from the last pass'
    git(lane, 'commit', '-q', '-m', f'wip: {lane} pass ended mid-edit ({len(files)} files)')
    return f'saved {len(files)} half-edited files as a wip commit'


def restore_sources(lane):
    """The chapter sources are untracked in main, so a lane sees them only through a symlink. Repair any gap."""
    if not os.path.isdir(MAIN_WORK):
        return ['main has no work/ directory at all']
    notes = []
    for name in sorted(os.listdir(MAIN_WORK)):
        if name.startswith('.'):
            continue
        target = f'{MAIN_WORK}/{name}'
        link = f'{WT}/{lane}/work/{name}'
        if not os.path.exists(target):
            continue
        if os.path.islink(link) or os.path.exists(link):
            continue
        os.makedirs(os.path.dirname(link), exist_ok=True)
        os.symlink(target, link)
        notes.append(f'restored the link to work/{name}')
    return notes


def sources_present(lane):
    sys.path.insert(0, HERE)
    from subjects import SUBJECTS
    missing = []
    for key, spec in SUBJECTS.items():
        directory = f'{WT}/{lane}/{spec["work"]}'
        if not os.path.isdir(directory):
            continue
        chapters = [d for d in os.listdir(directory) if d.startswith('ch') and os.path.isdir(f'{directory}/{d}')]
        if not chapters:
            missing.append(key)
    return missing


def merge_main(lane):
    result = git(lane, 'merge', '--no-edit', 'main')
    if result.returncode:
        git(lane, 'merge', '--abort')
        return f'cannot merge main (conflict in: {result.stdout.strip().splitlines()[:3]}); lane left clean'
    return None


def sources_symlink_guard(lane):
    """A worktree `sources` symlink is fine; a tracked one is not, and main's must never be a symlink.

    On 2026-11-28 a lane committed its own `sources -> hooty-build/sources` symlink. Merging it made
    main's real `sources/` directory a symlink to itself: every book failed to reassemble in the publish
    ("Too many levels of symbolic links"), and the NCERT PDFs in that untracked directory were gone.
    Git silently clobbers ignored paths on checkout, so nothing warns. Refuse to start on that state, and
    untrack the path in the lane before it can be committed again.
    """
    notes, problems = [], []
    tracked = git(lane, 'ls-files', 'sources').stdout.strip()
    if tracked:
        git(lane, 'rm', '--cached', '-q', 'sources')
        git(lane, 'commit', '-q', '-m', 'lane: drop the worktree sources symlink from the tree (it is not source)')
        notes.append('untracked a committed `sources` symlink')
    if os.path.islink(f'{ROOT}/sources'):
        problems.append(f"main's sources is a symlink ({os.readlink(f'{ROOT}/sources')}); "
                        'a merge clobbered the real directory — restore it before any lane runs')
    return notes, problems


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ('design', 'teach', 'fix'):
        sys.exit('usage: lane-preflight.py design|teach|fix')
    lane = sys.argv[1]
    notes, problems = [], []

    error = ensure_worktree(lane)
    if error:
        sys.exit(f'PREFLIGHT FAILED for {lane}: {error}')

    guard_notes, guard_problems = sources_symlink_guard(lane)
    notes += guard_notes
    if guard_problems:
        for problem in guard_problems:
            print(f'{lane}: PROBLEM {problem}')
        sys.exit(1)

    notes += clear_half_finished_git(lane)
    branch_note = right_branch(lane)
    if branch_note and 'could not switch' in branch_note:
        problems.append(branch_note)
    elif branch_note:
        notes.append(branch_note)

    leftover = save_leftovers(lane)
    if leftover:
        notes.append(leftover)

    notes += restore_sources(lane)

    missing = sources_present(lane)
    if missing:
        problems.append(f'no chapter sources for {", ".join(missing[:6])} — the build would be empty for them')

    conflict = merge_main(lane)
    if conflict:
        problems.append(conflict)

    state = git(lane, 'status', '--porcelain', '--untracked-files=no').stdout.strip()
    if state:
        problems.append(f'still dirty after preflight: {state.splitlines()[:3]}')

    for note in notes:
        print(f'{lane}: {note}')
    if problems:
        for problem in problems:
            print(f'{lane}: PROBLEM {problem}')
        sys.exit(1)
    ahead = git(lane, 'rev-list', '--count', 'main..HEAD').stdout.strip()
    print(f'{lane}: ready, on shift/{lane}, {ahead} commits ahead of main')


if __name__ == '__main__':
    main()
