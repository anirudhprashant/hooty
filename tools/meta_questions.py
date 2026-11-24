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
    r"|put\s+the\s+\w+\s+activity\s+in\s+order"
    r"|\b(the|this|that)\s+(exercise|task)\s+(ask|say|tell|want|include|need)s?\b"
    r"|\bone\s+(task|exercise)\s+asks?\b"                 # "One task asks for the items..."
    r"|\b(the|this|that)\s+text\s+asks?\b"               # "The text asks whether there are women farmers"
    r"|\btext\s+asks?\s+(you|about|whether|how|what|which|who|why|when|if)\b"
    r"|\bwhat\s+the\s+text\s+asks\b"                    # "Match each clue to what the text asks about"
    r"|\b(idea|thing|clue|answer|question)s?\s+the\s+text\s+asks\b"
    r"|\b(the|this)\s+(writing|speaking|listening|reading)\s+section\s+asks?\b"
    r"|\bthe\s+(first|second|third|last|final)\s+exercise\b"
    r"|\bfor\s+(this|the|that)\s+(task|activity|exercise)\b"   # "What should you paste for this task?"
    r"|\bfor\s+the\s+(first|second|third|final|last)\s+(task|activity|exercise)\b"
    r"|\bwhich\s+(task|exercise)\s+asks?\b"                # "Which task asks children to make new shapes?"
    r"|\bto\s+complete\s+the\s+(final\s+)?task\b"
    r"|\bmatch\s+each\s+task\b"                           # matching textbook tasks, not the subject
    r"|\bin\s+the\s+order\s+the\s+lesson\s+gives\b"
    r"|\bbook\s+question\b"                               # "Which pair is matched in one book question?"
    r"|\b(your|the)\s+book\s+asks?\b"                     # "Your book asks where the chakra is"
    r"|\bwhich\s+question\s+does\s+the\s+book\s+ask\b"
    r"|\bwhat\s+does\s+(your|the)\s+book\s+ask\b"
    r"|\bwhere\s+should\s+the\s+answers?\s+be\s+written\b"
    r"|\bafter\s+the\s+(first|second|last)\s+exercise\b"
    r"|\bwhat\s+does\s+the\s+exercise\s+ask\b"
    r"|\bput\s+the\s+exercises?\s+in\s+the\s+order\b"
    r"|\bself[- ](assessment|check)\b"                            # "Which part is included in the self-assessment?"
    r"|\bwhat\s+the\s+exercise\s+asks?\b"                 # "Match each action to what the exercise asks"
    r"|\bin\s+the\s+exercise\s+(figure|picture|sum|question)\b"
    r"|\bexercise\s+figure\b"
    r"|\bbook'?s\s+instructions?\b"                       # "Put the bogies in order using the book's instructions"
    r"|\btitle\s+of\s+the\s+book\b"
    r"|\b(matching|drawing|writing|reading|listening|speaking|fill[- ]in)\s+exercise\b"
    r"|\bput\s+the\s+exercises?\s+in\s+(the\s+)?(right\s+)?order\b"
    r"|\bwhich\s+exercise\s+(deals|asks|shows|wants|has)\b"
    r"|\bthe\s+(first|second|third|last|final)\s+\w+\s+exercise\b",
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
