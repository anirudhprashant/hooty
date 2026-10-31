// Sound effects, synthesised with Web Audio: nothing to download, no licences, and they work offline.
// Every sound is a short recipe of tones and filtered noise. Right answers climb a pentatonic scale as a streak
// builds, so a run of correct answers feels better each time; wrong answers are a soft low "boop", never a buzzer.

let ctx = null;
let out = null;                 // master gain -> compressor -> speakers
let speaking = () => false;     // set by the app: true while Lumi's voice is playing

const NOTE = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, C7: 2093 };
// Loud enough to hear on a tablet speaker beside Lumi's voice, quiet enough not to startle.
export const MASTER = 1.6;
const PENTA = [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.C6, NOTE.D6];

export function configureSfx(opts) { if (opts.speaking) speaking = opts.speaking; }

// iOS only lets audio start inside a tap, so this runs on every early gesture until the context is running.
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      // A soft limiter after the master volume keeps a stack of notes from ever clipping.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.15;
      out = ctx.createGain();
      out.gain.value = MASTER;
      out.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  } catch { return false; }
}

if (typeof document !== 'undefined') {
  // Do not keep the audio device awake for a hidden tab.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') ctx.suspend(); else ctx.resume();
  });
}

// --- building blocks ---------------------------------------------------------------------------------------
// Each takes the context and destination so the very same recipes can be rendered offline for tests.

function tone(c, dest, { f, t = 0, dur = 0.25, type = 'sine', gain = 0.2, to = null, attack = 0.008 }) {
  const o = c.createOscillator(), g = c.createGain();
  const t0 = c.currentTime + t;
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

// A struck-bell timbre: the note plus two quieter overtones that die away faster.
function bell(c, dest, f, t, gain = 0.15, dur = 0.5) {
  tone(c, dest, { f, t, dur, gain });
  tone(c, dest, { f: f * 2.01, t, dur: dur * 0.6, gain: gain * 0.35 });
  tone(c, dest, { f: f * 3.0, t, dur: dur * 0.3, gain: gain * 0.12 });
}

function whoosh(c, dest, { t = 0, dur = 0.16, from = 500, to = 2200, gain = 0.3 }) {
  const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
  const t0 = c.currentTime + t;
  bp.frequency.setValueAtTime(from, t0);
  bp.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp); bp.connect(g); g.connect(dest);
  src.start(t0);
}

function sparkles(c, dest, t, count, gain = 0.05) {
  const high = [NOTE.E6, NOTE.G6, NOTE.C7, NOTE.G6, NOTE.E6, NOTE.C7];
  for (let i = 0; i < count; i++) tone(c, dest, { f: high[i % high.length], t: t + i * 0.055, dur: 0.22, gain, type: 'triangle' });
}

// --- the sounds --------------------------------------------------------------------------------------------

export const VOICES = {
  // a bubble pop for ordinary buttons
  tap: (c, d) => tone(c, d, { f: 380, to: 640, dur: 0.06, gain: 0.1 }),
  // a smaller, higher pop for picking up and placing a chip
  pop: (c, d) => tone(c, d, { f: 460, to: 800, dur: 0.05, type: 'triangle', gain: 0.09 }),
  // turning to the next card, and back
  next: (c, d) => whoosh(c, d, { from: 500, to: 2200 }),
  back: (c, d) => whoosh(c, d, { from: 2000, to: 450 }),
  // a right answer: two rising pings, higher with each answer in a row, and a sparkle once the streak is on
  correct: (c, d, streak = 1) => {
    const f = PENTA[Math.min(Math.max(streak, 1) - 1, PENTA.length - 1)];
    bell(c, d, f, 0, 0.16, 0.45);
    bell(c, d, f * 1.5, 0.09, 0.13, 0.45);
    bell(c, d, f * 2, 0.18, 0.09, 0.5);
    if (streak >= 3) sparkles(c, d, 0.24, Math.min(streak, 6), 0.045);
  },
  // a wrong answer: a gentle falling "boo-bop", low and soft
  wrong: (c, d) => {
    tone(c, d, { f: 300, to: 215, dur: 0.22, gain: 0.13 });
    tone(c, d, { f: 215, to: 160, t: 0.11, dur: 0.24, gain: 0.1 });
  },
  // two sparkles when a pair matches, a small dull tick when it does not
  pair: (c, d) => { bell(c, d, NOTE.G5, 0, 0.13, 0.35); bell(c, d, NOTE.C6, 0.07, 0.13, 0.4); },
  pairwrong: (c, d) => tone(c, d, { f: 250, to: 190, dur: 0.12, gain: 0.07 }),
  // halfway through a lesson: a short rising arpeggio
  halfway: (c, d) => [NOTE.C5, NOTE.E5, NOTE.G5].forEach((f, i) => bell(c, d, f, i * 0.07, 0.12, 0.35)),
  // the lesson is finished: an arpeggio, then a full chord that shimmers
  win: (c, d) => {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => bell(c, d, f, i * 0.11, 0.16, 0.5));
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f) => tone(c, d, { f, t: 0.5, dur: 1.0, type: 'triangle', gain: 0.07 }));
    sparkles(c, d, 0.6, 6, 0.05);
  },
  // XP counted up: the classic two-note coin
  coin: (c, d) => { tone(c, d, { f: 987.77, dur: 0.08, type: 'square', gain: 0.09 }); tone(c, d, { f: 1318.51, t: 0.07, dur: 0.4, type: 'square', gain: 0.09 }); },
  // a new sticker: a magic run up the scale, ending in a bell
  unlock: (c, d) => {
    PENTA.forEach((f, i) => bell(c, d, f, i * 0.07, 0.11, 0.4));
    bell(c, d, NOTE.C7, 0.55, 0.14, 0.9);
    sparkles(c, d, 0.6, 6, 0.045);
  },
};

// Play a sound now. Quiet if the context is not running yet (the browser has not had a tap).
export function sfx(name, arg) {
  const voice = VOICES[name];
  if (!voice || !unlockAudio() || ctx.state !== 'running') return;
  // Small taps would talk over Lumi's voice; the meaningful sounds still play.
  if (speaking() && ['tap', 'pop', 'next', 'back'].includes(name)) return;
  try { voice(ctx, out, arg); } catch { /* a sound must never break the lesson */ }
}

// A light buzz on phones that have one (Android; iOS Safari has none): right answers tick, wrong ones nudge.
export function haptic(kind) {
  try { navigator.vibrate?.(kind === 'wrong' ? [18, 40, 18] : kind === 'win' ? [20, 30, 20, 30, 60] : 12); } catch { /* none */ }
}
