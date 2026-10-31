// Spaced repetition. Leitner-style boxes with a light SM-2 flavour.
// Every item the child meets becomes a card. Weak items come back, never lost.

export const BOX_INTERVALS = [0, 1, 2, 4, 8, 16]; // days

export function newCard(itemId, meta = {}) {
  return {
    id: itemId,
    box: 0,
    due: 0,            // timestamp (ms) of next review
    last: 0,
    lapses: 0,
    reps: 0,
    ease: 2.5,
    meta,
  };
}

export function gradeCard(card, quality) {
  // quality: 0 = wrong, 1 = correct but hesitant, 2 = correct and solid
  const c = { ...card };
  c.reps = (c.reps || 0) + 1;
  c.last = Date.now();

  if (quality === 0) {
    c.lapses = (c.lapses || 0) + 1;
    c.box = 0;
    c.ease = Math.max(1.3, (c.ease || 2.5) - 0.2);
  } else {
    c.box = Math.min(BOX_INTERVALS.length - 1, (c.box || 0) + (quality === 2 ? 1 : 0.5 | 0));
    c.ease = Math.min(2.8, (c.ease || 2.5) + (quality === 2 ? 0.1 : 0));
  }

  const days = BOX_INTERVALS[Math.floor(c.box)] || 0;
  c.due = Date.now() + days * 86400000;
  return c;
}

export function isDue(card, now = Date.now()) {
  return !card || !card.due || card.due <= now;
}

// Pick up to `limit` weak/due cards. Weakest first: lower box, more lapses, overdue.
export function pickDueCards(cards, limit = 10, now = Date.now()) {
  const due = cards.filter((c) => isDue(c, now));
  due.sort((a, b) => {
    const boxDiff = (a.box || 0) - (b.box || 0);
    if (boxDiff !== 0) return boxDiff;
    const lapseDiff = (b.lapses || 0) - (a.lapses || 0);
    if (lapseDiff !== 0) return lapseDiff;
    return (a.due || 0) - (b.due || 0);
  });
  return due.slice(0, limit);
}

// Weak topics = tags of cards with the most lapses, used by the parent view
// and the "Practice weak spots" button.
export function weakTags(cards, limit = 6) {
  const tally = new Map();
  for (const c of cards) {
    const lapses = c.lapses || 0;
    if (lapses <= 0) continue;
    for (const tag of c.meta?.tags || []) {
      tally.set(tag, (tally.get(tag) || 0) + lapses);
    }
  }
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, lapses]) => ({ tag, lapses }));
}
