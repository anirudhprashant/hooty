#!/usr/bin/env python3
"""Run one prompt through the LLM route and print the reply. Runs on oracle.

Route order lives in llm_route: Open Design first, OpenCode Go as the fallback.
Usage: ssh oracle 'cat prompt.txt | python3 ~/m27.py'
"""
import sys
import llm_route

prompt = sys.stdin.read()
text, provider = llm_route.chat(
    [{"role": "user", "content": prompt}],
    max_tokens=32000, temperature=0.4, timeout=600)
print(text)
