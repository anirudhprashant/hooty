#!/usr/bin/env python3
"""Cold-archive a folder to Anirudh's Google Drive, and prove it landed.

Uses the Maton google-drive connection for metadata and for opening a resumable upload session, then PUTs the
bytes straight to the session URL Google hands back, in chunks, so a 3 GB tarball does not have to fit through
the gateway in one request. Nothing is reported as backed up until the Drive listing shows the same size and
the same md5 as the local file.

  python3 tools/drive-backup.py --file ~/agent-workspace/hooty-env/sources-20261128.tar.gz \\
      --folder hooty-textbooks-2026-11-28 --manifest work/qa/sources-manifest.json
  python3 tools/drive-backup.py --list hooty-textbooks-2026-11-28     # what is in there now

The key is read from master_reference.json at runtime; it is never printed.
"""
import argparse
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

REFERENCE = '/home/ubuntu/.hermes/memory/master_reference.json'
GATEWAY = 'https://gateway.maton.ai/google-drive'
ARCHIVE = 'Ella-Server-Archive'
CHUNK = 64 * 1024 * 1024


def key():
    data = json.load(open(REFERENCE))['api_keys']
    for name in ('ella_Maton', 'anirudhprashant_Maton'):
        value = data.get(name)
        if isinstance(value, str) and value.startswith('v2.'):
            return value
    sys.exit('no usable Maton key in master_reference.json')


def headers(extra=None):
    base = {'Authorization': f'Bearer {key()}'}
    if extra:
        base.update(extra)
    return base


def api(method, path, body=None, extra=None, timeout=60):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(f'{GATEWAY}{path}', data=data, method=method,
                                     headers=headers({'Content-Type': 'application/json', **(extra or {})}))
    return json.loads(urllib.request.urlopen(request, timeout=timeout).read() or b'{}')


def find_folder(name, parent=None):
    query = f"name='{name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent:
        query += f" and '{parent}' in parents"
    found = api('GET', f'/drive/v3/files?q={urllib.parse.quote(query)}&fields=files(id,name)')
    return found['files'][0]['id'] if found.get('files') else None


def ensure_folder(name, parent):
    existing = find_folder(name, parent)
    if existing:
        return existing
    created = api('POST', '/drive/v3/files', {'name': name, 'parents': [parent],
                                             'mimeType': 'application/vnd.google-apps.folder'})
    return created['id']


def md5(path):
    digest = hashlib.md5()
    with open(path, 'rb') as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def upload(path, folder_id, mime='application/octet-stream'):
    size = os.path.getsize(path)
    name = os.path.basename(path)
    init = urllib.request.Request(
        f'{GATEWAY}/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,md5Checksum',
        data=json.dumps({'name': name, 'parents': [folder_id]}).encode(),
        headers=headers({'Content-Type': 'application/json', 'X-Upload-Content-Type': mime,
                         'X-Upload-Content-Length': str(size)}), method='POST')
    session = urllib.request.urlopen(init, timeout=60).headers.get('Location')
    if not session:
        sys.exit('Drive did not return an upload session')
    print(f'uploading {name} ({size / 1e9:.2f} GB) in {CHUNK // 1048576} MB chunks')

    sent = 0
    started = time.time()
    with open(path, 'rb') as handle:
        while sent < size:
            handle.seek(sent)
            block = handle.read(CHUNK)
            end = sent + len(block) - 1
            for attempt in range(6):
                request = urllib.request.Request(session, data=block, method='PUT', headers={
                    'Content-Range': f'bytes {sent}-{end}/{size}',
                    'Content-Type': mime, 'Content-Length': str(len(block))})
                try:
                    with urllib.request.urlopen(request, timeout=600) as response:
                        if response.status in (200, 201):
                            done = json.loads(response.read() or b'{}')
                            print(f'  finished in {time.time() - started:.0f}s')
                            return done
                        raise RuntimeError(f'unexpected status {response.status}')
                except urllib.error.HTTPError as e:
                    if e.code == 308:
                        sent = end + 1
                        rate = sent / max(1e-9, time.time() - started) / 1e6
                        print(f'  {sent / 1e6:.0f} MB of {size / 1e6:.0f} MB ({rate:.1f} MB/s)', flush=True)
                        break
                    if e.code in (500, 502, 503, 504) and attempt < 5:
                        time.sleep(4 * (attempt + 1))
                        continue
                    raise
    sys.exit('upload ended without a file object')


def verify(path, folder_id):
    name = os.path.basename(path)
    query = f"'{folder_id}' in parents and name='{name}' and trashed=false"
    listing = api('GET', f'/drive/v3/files?q={urllib.parse.quote(query)}'
                         '&fields=files(id,name,size,md5Checksum,webViewLink)')
    files = listing.get('files') or []
    if not files:
        return None
    remote = files[0]
    local_size = os.path.getsize(path)
    local_md5 = md5(path)
    ok = int(remote.get('size', -1)) == local_size and remote.get('md5Checksum') == local_md5
    print(f'{"verified" if ok else "MISMATCH"}: drive {remote.get("size")} bytes / {remote.get("md5Checksum")} '
          f'· local {local_size} bytes / {local_md5}')
    return remote if ok else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--file')
    parser.add_argument('--folder', required=True)
    parser.add_argument('--manifest')
    parser.add_argument('--list', action='store_true')
    args = parser.parse_args()

    archive = find_folder(ARCHIVE)
    if not archive:
        sys.exit(f'no "{ARCHIVE}" folder in this Drive')
    folder = ensure_folder(args.folder, archive)

    if args.list or not args.file:
        query = f"'{folder}' in parents and trashed=false"
        listing = api('GET', f'/drive/v3/files?q={urllib.parse.quote(query)}&fields=files(id,name,size,md5Checksum)')
        for item in listing.get('files') or []:
            print(f"  {item['name']:52} {int(item.get('size', 0)) / 1e6:10.1f} MB")
        return

    upload(args.file, folder)
    if args.manifest and os.path.exists(args.manifest):
        upload(args.manifest, folder, 'application/json')
    remote = verify(args.file, folder)
    sys.exit(0 if remote else 1)


if __name__ == '__main__':
    main()
