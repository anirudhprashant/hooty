import json
import os
import sys

os.chdir('/home/ubuntu/agent-workspace/hooty-build')
sys.path.insert(0, os.path.join(os.getcwd(), 'tools'))
from meta_questions import is_meta

# Reworded: the question was real, only its opening clause narrated the textbook.
REWORD = {
    'english-g10-ch1-l1-d3': "Lencho writes a letter to God asking for money. What does this make you think?",
    'english-g10-ch1-l1-e1': "Explain why the story of Lencho begins with the idea that faith can move mountains, and what question it leaves open about his letter.",
    'english-g3-ch4-l3-a6': "Match each thing to what the children do with it.",
    'english-g3-ch8-l2-d5': "Why is it worth asking whether women can be farmers?",
    'english-g3-ch10-l3-a7': "Match each clue to the idea it points to.",
    'english-g5-ch1-l6-a5': "Which word should you say aloud?",
    'english-g5-ch3-l2-d4': "Why does the poet compare the two bridges?",
    'english-g5-ch3-l2-d5': "Why does the poem talk about ships on rivers and boats on seas?",
    'mathematics-g2-ch4-l1-d6': "A group is making animal shadows. How can they notice when a shadow appears and when it vanishes?",
    'mathematics-g2-ch4-l4-d3': "Can this game be played around a round table?",
    'mathematics-g5-ch7-l6-d3': "Which plan builds a shape so you can count its vertices and visible edges?",
    'mathematics-g5-ch12-l3-d4': "Each participant took 1 minute. What can the facts show about who won?",
}
# Removed: the card only narrated an exercise, so there was no question to answer.
DROP = {
    'english-g2-ch2-l5-a3', 'english-g3-ch4-l3-a2', 'english-g3-ch4-l3-a7',
    'english-g4-ch2-l5-a3', 'english-g5-ch3-l3-a6', 'english-g5-ch3-l4-a3',
    'mathematics-g2-ch4-boss-a6', 'mathematics-g5-ch12-l1-a3',
}

stats = {'reworded': 0, 'dropped': 0}
for pk in sorted(os.listdir('public/content/packs')):
    path = f'public/content/packs/{pk}/pack.json'
    if not os.path.exists(path):
        continue
    d = json.load(open(path, encoding='utf-8'))
    touched = False
    for u in d['units']:
        for c in u['chapters']:
            for l in (c.get('lessons') or []) + ([c['boss']] if c.get('boss') else []):
                keep = []
                for a in l.get('activities') or []:
                    aid = a.get('id')
                    if aid in DROP:
                        stats['dropped'] += 1
                        touched = True
                        continue
                    if aid in REWORD:
                        a['prompt'] = REWORD[aid]
                        stats['reworded'] += 1
                        touched = True
                    keep.append(a)
                l['activities'] = keep
    if touched:
        json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
print(stats)

left = []
for pk in sorted(os.listdir('public/content/packs')):
    path = f'public/content/packs/{pk}/pack.json'
    if not os.path.exists(path):
        continue
    d = json.load(open(path, encoding='utf-8'))
    for u in d['units']:
        for c in u['chapters']:
            for l in (c.get('lessons') or []) + ([c['boss']] if c.get('boss') else []):
                for a in l.get('activities') or []:
                    if is_meta(a.get('prompt')):
                        left.append((pk, a.get('id'), str(a.get('prompt'))[:70]))
print('meta prompts left:', len(left), left[:3])
