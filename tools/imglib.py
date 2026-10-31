"""Does this picture suit this lesson? vision_score(path, title, said) -> (score 1-10, reason), or (None, reason) when
the vision service could not be reached. None must never be treated as a low score: a service outage is not a
verdict on the picture (that mistake once emptied whole books of pictures)."""
import re
from llm import vision

def vision_score(path, title, said=''):
    prompt = (f'This is a candidate picture for a school lesson in India called "{title}". The lesson says: {said[:400]}\n'
              'Score 1-10 how well the picture shows what the lesson is about and how good it is for children: bright, clear, '
              'appealing. Give 1-3 for: unrelated, dark or blurry, a chart or table, text-heavy, watermark or logo, distressing, '
              'an odd detail or close-up. Give 8-10 only for a clear, attractive picture that obviously fits. '
              'Reply exactly as: SCORE: n - short reason')
    out = vision(path, prompt)
    if not out: return (None, 'vision service unreachable')
    m = re.search(r'SCORE:\s*(\d+)\s*-?\s*(.*)', out)
    return (min(int(m.group(1)), 10), m.group(2).strip()[:160]) if m else (None, 'unreadable reply: ' + out[:60])
