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
    r"|activit(y|ies)\s+(ask|say|tell|check|want|include|begin)s?\b"
    r"|(the|this)\s+task\s+(ask|say|want)s?\b"
    r"|\b(writing|speaking|listening|reading|spelling|matching|drawing|thinking|tracing|fun)\s+task\b"
    r"|match\s+each\s+(writing|speaking|listening|reading|spelling|matching|drawing|thinking)\s+task"
    r"|what\s+does\s+(the|one|the\s+first|the\s+last)\s+.{0,30}\btask\b"
    r"|what\s+does\s+the\s+(task|activity)"
    r"|which\s+question\s+belongs\s+to\s+the"
    r"|put\s+the\s+steps?\s+of\s+the\s+.{0,30}\btask\b"
    r"|put\s+the\s+\w+\s+activity\s+in\s+order",
    re.I)

# phrases that look like the pattern but are ordinary English about the subject
NOISE = re.compile(
    r"busy\s+activity|activity\s+of\s+(city|village|market)|physical\s+activity|economic\s+activity"
    r"|volcanic\s+activity|human\s+activity|brain\s+activity",
    re.I)

# the "activity" is the subject being taught (an experiment or a listening exercise in the chapter itself)
KEEP = re.compile(
    r"lime[- ]water\s+activity.*(support|show|prove|explain)"
    r"|bird[- ]listening\s+activity.*(carry\s+out|from\s+hearing)"
    r"|how\s+does\s+a\s+\w+\s+lose\s+its\s+l\s+sound"
    r"|funny\s+writing\s+task\s+as\s+a\s+punishment",     # a story event, not a textbook exercise
    re.I)


def is_meta(prompt):
    t = str(prompt or '')
    if NOISE.search(t):
        return False
    return bool(META.search(t)) and not bool(KEEP.search(t))
