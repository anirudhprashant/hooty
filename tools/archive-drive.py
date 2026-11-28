#!/usr/bin/env python3
"""Weekly cold archive of the Hooty sources and working text to Drive, verified, with old copies pruned.

The textbook PDFs and the extracted text were both lost once in one afternoon. This makes a dated copy in
Google Drive every week and keeps the last three, so the answer to "where is the book text" is never a shrug
again. Nothing is deleted from Drive until the new copy is verified by size and md5.

  python3 tools/archive-drive.py            # make and upload this week's archive
  python3 tools/archive-drive.py --check    # what is in Drive right now

Runs as the "Hooty archive to Drive" cron job; safe to run by hand.
"""
import datetime as dt
import os
import sys
import tarfile
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
KEEP = '/home/ubuntu/agent-workspace/hooty-env'
FOLDER = 'hooty-textbooks'


def load_drive(path='drive-backup.py'):
    import importlib.util
    spec = importlib.util.spec_from_file_location('drive_backup', f'{HERE}/{path}')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def archive(name, target, stamp):
    path = f'{KEEP}/{name}-{stamp}.tar.gz'
    mode = 'w:gz'
    with tarfile.open(path, mode) as tar:
        tar.add(target, arcname=os.path.basename(target))
    return path


def main():
    drive_module = load_drive()
    archive_root = drive_module.find_folder(drive_module.ARCHIVE)
    if not archive_root:
        sys.exit('no Ella-Server-Archive folder in Drive')
    folder = drive_module.ensure_folder(FOLDER, archive_root)

    if '--check' in sys.argv:
        query = f"'{folder}' in parents and trashed=false"
        listing = drive_module.api('GET', f'/drive/v3/files?q={urllib.parse.quote(query)}'
                                        '&fields=files(id,name,size,createdTime)')
        for item in sorted(listing.get('files') or [], key=lambda f: f.get('createdTime', '')):
            print(f"  {item['name']:46} {int(item.get('size', 0)) / 1e6:9.1f} MB  {item.get('createdTime', '')[:10]}")
        return 0

    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d')
    uploads = []
    for name, target in (('hooty-sources', f'{ROOT}/sources'), ('hooty-work', f'{ROOT}/work')):
        if not os.path.isdir(target):
            print(f'{name}: nothing at {target}, skipped')
            continue
        path = archive(name, target, stamp)
        print(f'{name}: {os.path.getsize(path) / 1e6:.0f} MB packed')
        # Nothing changed since last week means nothing to upload: compare the tar's md5 with what Drive holds.
        local_md5 = drive_module.md5(path)
        query = f"'{folder}' in parents and trashed=false"
        listing = drive_module.api('GET', f'/drive/v3/files?q={urllib.parse.quote(query)}'
                                        '&fields=files(id,name,md5Checksum)')
        if any(f.get('md5Checksum') == local_md5 for f in listing.get('files') or []):
            print(f'{name}: identical to a copy already in Drive, not uploading again')
            os.remove(path)
            continue
        drive_module.upload(path, folder)
        remote = drive_module.verify(path, folder)
        if not remote:
            sys.exit(f'{name}: upload did not verify, nothing pruned')
        uploads.append(path)

    # prune: keep the three newest of each kind
    query = f"'{folder}' in parents and trashed=false"
    listing = drive_module.api('GET', f'/drive/v3/files?q={urllib.parse.quote(query)}'
                                    '&fields=files(id,name,createdTime)')
    files = sorted(listing.get('files') or [], key=lambda f: f.get('createdTime', ''), reverse=True)
    for kind in ('hooty-sources', 'hooty-work'):
        same = [f for f in files if f['name'].startswith(kind)]
        for old in same[3:]:
            try:
                drive_module.api('DELETE', f"/drive/v3/files/{old['id']}", timeout=60)
                print(f"  pruned {old['name']}")
            except Exception as e:
                print(f"  could not prune {old['name']}: {str(e)[:80]}")
    for path in uploads:
        try:
            os.remove(path)
            print(f'local copy removed: {os.path.basename(path)}')
        except OSError:
            pass
    print('archive done and verified')
    return 0


if __name__ == '__main__':
    sys.exit(main())
