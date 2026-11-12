#!/usr/bin/env python3
"""One rule for spot-the-task questions, shared by the tools that write lessons.

A question is "meta" when it asks what a textbook task says, wants or asks, instead of asking about
the subject. Those are dull for a child and were a real complaint on 12 Nov 2026.
"""
import re

META = re.compile(
    r"(the\s+)?(ride|thinking|water|listening|speaking|reading|writing|thread|gola|group|bird[- ]listening|"
    r"lime[- ]water|matching|drawing|tick)\s+activity"
    r"|\b\w+\s+and\s+\w+\s+activity"                       # "the speaking and drawing activity"
    r"|activit(y|ies)\s+(ask|say|check|want|include|begin)s?\b"
    r"|(the|this)\s+task\s+(ask|say|want)s?\b"
    r"|what\s+does\s+the\s+(task|activity)"
    r"|which\s+question\s+belongs\s+to\s+the"
    r"|put\s+the\s+\w+\s+activity\s+in\s+order",
    re.I)

# the "activity" is the subject being taught (an experiment or a listening exercise in the chapter itself)
KEEP = re.compile(
    r"lime[- ]water\s+activity.*(support|show|prove|explain)"
    r"|bird[- ]listening\s+activity.*(carry\s+out|from\s+hearing)"
    r"|how\s+does\s+a\s+\w+\s+lose\s+its\s+l\s+sound",
    re.I)


def is_meta(prompt):
    t = str(prompt or '')
    return bool(META.search(t)) and not bool(KEEP.search(t))
