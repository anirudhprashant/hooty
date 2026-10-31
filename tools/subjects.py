"""Which book a tool is working on. Pick with SPARKLE_SUBJECT=<slug> (default: sst6).
Books added with tools/ingest-book.py are recorded in tools/subjects.json; the two built-ins are below."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
SUBJECTS = {
    'sst6': {'name': 'Social Science', 'source': 'ncert-class6-ss', 'pack': 'class6-sst', 'work': 'work/sst6', 'grade': '6', 'language': 'en'},
    'science': {'name': 'Science', 'source': 'ncert-class6-science', 'pack': 'class6-science', 'work': 'work/science', 'grade': '6', 'language': 'en'},
}
def load_registry():
    p = os.path.join(HERE, 'subjects.json')
    return json.load(open(p)) if os.path.exists(p) else {}
SUBJECTS.update(load_registry())
KEY = os.environ.get('SPARKLE_SUBJECT', 'sst6')
S = SUBJECTS[KEY]

LANG = S.get('language', 'en')
GRADE = str(S.get('grade', '6'))
AGE = int(GRADE) + 5 if GRADE.isdigit() else 11  # a child is about five years older than their class number
LANG_NOTE = '' if LANG == 'en' else ("IMPORTANT: this book is in Hindi. Write ALL child-facing text (questions, options, explanations, "
                                     "concept cards, glossary meanings, facts) in simple, warm Hindi in Devanagari script, for a young child. "
                                     "Keep JSON keys, activity type names and ids in English. Copy evidence phrases exactly as they appear in the text.")
