#!/usr/bin/env python3
"""Run one prompt through deepseek-v4.1-flash and print the reply. Meant to run on oracle,
where the Open Design key lives in ~/.hermes/.env (never printed, never copied).
Usage: ssh oracle python3 - < tools/m27.py   (prompt on stdin is not possible then)
       so instead:  cat prompt.txt | ssh oracle 'python3 ~/m27.py'
"""
import json, os, sys, urllib.request

key = ''
for line in open(os.path.expanduser('~/.hermes/.env')):
    if line.startswith('OPENDESIGN_API_KEY='):
        key = line.split('=', 1)[1].strip().strip('"\'')
prompt = sys.stdin.read()
body = json.dumps({
    'model': 'deepseek-v4.1-flash', 'max_tokens': 32000, 'temperature': 0.4,
    'messages': [{'role': 'user', 'content': prompt}],
}).encode()
req = urllib.request.Request('https://amr-link.open-design.ai/v1/messages', data=body, headers={
    'x-api-key': key, 'authorization': f'Bearer {key}', 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
with urllib.request.urlopen(req, timeout=600) as r:
    data = json.load(r)
print(''.join(b.get('text', '') for b in data.get('content', []) if b.get('type') == 'text'))
