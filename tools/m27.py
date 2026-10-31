#!/usr/bin/env python3
"""Run one prompt through MiniMax-M2.7 and print the reply. Meant to run on oracle,
where the coding-plan key lives in ~/.hermes/.env (never printed, never copied).
Usage: ssh oracle python3 - < tools/m27.py   (prompt on stdin is not possible then)
       so instead:  cat prompt.txt | ssh oracle 'python3 ~/m27.py'
"""
import json, os, sys, urllib.request

key = ''
for line in open(os.path.expanduser('~/.hermes/.env')):
    if line.startswith('MINIMAX_API_KEY='):
        key = line.split('=', 1)[1].strip().strip('"\'')
prompt = sys.stdin.read()
body = json.dumps({
    'model': 'MiniMax-M2.7', 'max_tokens': 32000, 'temperature': 0.4,
    'messages': [{'role': 'user', 'content': prompt}],
}).encode()
req = urllib.request.Request('https://api.minimax.io/anthropic/v1/messages', data=body, headers={
    'x-api-key': key, 'authorization': f'Bearer {key}', 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
with urllib.request.urlopen(req, timeout=600) as r:
    data = json.load(r)
print(''.join(b.get('text', '') for b in data.get('content', []) if b.get('type') == 'text'))
