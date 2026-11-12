#!/usr/bin/env python3
"""Runs on oracle (where the key lives). stdin: {"prompt", "image": base64 jpeg}.

Open Design gateway, OpenAI-compatible chat/completions with an image_url part.
deepseek-v4.1-flash accepts image input, so this replaces MiniMax's coding-plan VLM.
"""
import json, os, sys, urllib.request

key = ''
for path in ('/home/ubuntu/.hermes/.env', os.path.expanduser('~/.hermes/.env')):
    try:
        for line in open(path):
            if line.startswith('OPENDESIGN_API_KEY='):
                key = line.split('=', 1)[1].strip().strip('"\'')
    except OSError:
        continue
    if key:
        break
d = json.load(sys.stdin)
body = json.dumps({
    'model': 'deepseek-v4.1-flash',
    'max_tokens': 2000,
    'messages': [{'role': 'user', 'content': [
        {'type': 'text', 'text': d['prompt']},
        {'type': 'image_url', 'image_url': {'url': 'data:image/jpeg;base64,' + d['image']}},
    ]}],
}).encode()
req = urllib.request.Request(
    'https://amr-link.open-design.ai/v1/chat/completions',
    data=body,
    headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
with urllib.request.urlopen(req, timeout=180) as r:
    out = json.load(r)
print(((out.get('choices') or [{}])[0].get('message') or {}).get('content') or '')
