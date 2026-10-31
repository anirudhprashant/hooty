#!/usr/bin/env python3
"""Runs on oracle (where the key lives). stdin: {"prompt", "image": base64 jpeg}. Prints what MiniMax's vision model says."""
import json, os, sys, urllib.request
key = ''
for line in open(os.path.expanduser('~/.hermes/.env')):
    if line.startswith('MINIMAX_API_KEY='):
        key = line.split('=', 1)[1].strip().strip('"\'')
d = json.load(sys.stdin)
req = urllib.request.Request('https://api.minimax.io/v1/coding_plan/vlm', headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
                             data=json.dumps({'prompt': d['prompt'], 'image_url': 'data:image/jpeg;base64,' + d['image']}).encode())
with urllib.request.urlopen(req, timeout=120) as r:
    print(json.load(r).get('content', ''))
