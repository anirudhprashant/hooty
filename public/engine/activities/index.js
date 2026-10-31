// Activity type registry. Adding a new type = add one file + one import line.
// Every module exports { type, render(activity, ctx) } and returns { root, check(response) }.

import mcq from './mcq.js';
import truefalse from './truefalse.js';
import fillblank from './fillblank.js';
import matchpairs from './matchpairs.js';
import dragorder from './dragorder.js';
import draglabel from './draglabel.js';
import typeanswer from './typeanswer.js';
import listenpick from './listenpick.js';
import flashcard from './flashcard.js';
import concept from './concept.js';
import watchanswer from './watchanswer.js';
import media from './media.js';
import hook from './hook.js';
import passage from './passage.js';
import worked from './worked.js';
import explain from './explain.js';
import explore from './explore.js';

const modules = [
  mcq, truefalse, fillblank, matchpairs, dragorder, draglabel,
  typeanswer, listenpick, flashcard, concept, watchanswer, media, hook, passage, worked, explain, explore,
];

const byType = new Map();
for (const m of modules) byType.set(m.type, m);

export function getActivityModule(type) {
  return byType.get(type) || null;
}

export function knownTypes() {
  return [...byType.keys()];
}
