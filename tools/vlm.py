#!/usr/bin/env python3
"""Runs on oracle. stdin: {"prompt", "image": base64 jpeg}. Prints the model's answer.

A vision request through the same route as everything else: Open Design first,
OpenCode Go as the fallback. deepseek-v4.1-flash accepts image input on both.
"""
import json
import sys
import llm_route

d = json.load(sys.stdin)
body = {
    "model": llm_route.MODEL,
    "max_tokens": 2000,
    "messages": [{"role": "user", "content": [
        {"type": "text", "text": d["prompt"]},
        {"type": "image_url",
         "image_url": {"url": "data:image/jpeg;base64," + d["image"]}},
    ]}],
}
payload = llm_route.post(body, timeout=180)
message = ((payload.get("choices") or [{}])[0].get("message") or {})
print((message.get("content") or "").strip())
