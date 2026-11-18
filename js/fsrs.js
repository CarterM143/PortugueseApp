// FSRS-4.5 spaced-repetition scheduler (the algorithm Anki uses), compact implementation.
// Reference: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm

export const Rating = { Again: 1, Hard: 2, Good: 3, Easy: 4 };

// Default FSRS-4.5 weights.
const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
  0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5;
const FACTOR = 19 / 81; // makes R = 0.9 when elapsed time == stability
const DAY_MS = 86400000;
const DAY_START_HOUR = 4; // a "day" rolls over at 4am, like Anki

/** Local day number; the day starts at 4am so late-night study counts for the same day. */
export function dayNumber(ts = Date.now()) {
  const d = new Date(ts);
  const local = ts - d.getTimezoneOffset() * 60000 - DAY_START_HOUR * 3600000;
  return Math.floor(local / DAY_MS);
}

/** Probability of recall after `elapsedDays` for memory with stability `s` (days). */
export function retrievability(elapsedDays, s) {
  return Math.pow(1 + FACTOR * elapsedDays / s, DECAY);
}

const clampD = (d) => Math.min(10, Math.max(1, d));
const initD = (g) => clampD(W[4] - (g - 3) * W[5]);
const initS = (g) => Math.max(0.1, W[g - 1]);

function nextD(d, g) {
  const d1 = d - W[6] * (g - 3);
  return clampD(W[7] * initD(3) + (1 - W[7]) * d1); // mean reversion
}

function recallS(d, s, r, g) {
  const hard = g === Rating.Hard ? W[15] : 1;
  const easy = g === Rating.Easy ? W[16] : 1;
  return s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) *
    (Math.exp((1 - r) * W[10]) - 1) * hard * easy);
}

function forgetS(d, s, r) {
  const sf = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]);
  return Math.max(0.1, Math.min(s, sf));
}

/** Days until recall probability drops to `retention`. */
export function intervalFor(s, retention = 0.9) {
  return (s / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
}

/**
 * Apply a rating to a card's memory state. Returns a new state object
 * {s, d, due (day number), last (ms), reps, lapses}. Does not mutate `card`.
 */
export function schedule(card, g, now = Date.now(), opts = {}) {
  const { retention = 0.9, maxDays = 365, fuzz = true, rand = Math.random } = opts;
  let s, d;
  const reps = (card.reps || 0) + 1;
  let lapses = card.lapses || 0;

  if (!card.s) {
    s = initS(g);
    d = initD(g);
  } else {
    const elapsed = Math.max(0, (now - card.last) / DAY_MS);
    const r = retrievability(elapsed, card.s);
    d = nextD(card.d, g);
    if (g === Rating.Again) {
      s = forgetS(d, card.s, r);
      lapses += 1;
    } else {
      s = recallS(d, card.s, r, g);
    }
  }

  let days = Math.round(intervalFor(s, retention));
  if (fuzz && days >= 3) days = Math.round(days * (0.95 + rand() * 0.1));
  days = Math.min(maxDays, Math.max(1, days));

  return { s, d, last: now, due: dayNumber(now) + days, reps, lapses };
}
