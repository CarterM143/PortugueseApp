// Session engine: builds the daily queue, picks exercise difficulty, applies results.
// Pure logic (no DOM) so it can be tested in Node.

import { schedule, dayNumber, retrievability } from './fsrs.js';
import { ratingFor } from './grade.js';
import { UNITS, EAR, ITEM_BY_ID } from './content.js';

export const MAX_RUNG = 7;        // with speaking
export const MAX_RUNG_SILENT = 5; // without speaking
const RECENT_WINDOW = 20;
const DAY_MS = 86400000;

// ---------- helpers ----------

function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

function recallNow(card, now) {
  if (!card.s) return 0;
  return retrievability(Math.max(0, (now - card.last) / DAY_MS), card.s);
}

/** Interleave pair and stress ear items so new ones alternate. */
const EAR_ORDER = (() => {
  const p = EAR.filter((e) => e.kind === 'pair');
  const s = EAR.filter((e) => e.kind === 'stress');
  const out = [];
  for (let i = 0; i < Math.max(p.length, s.length); i++) {
    if (p[i]) out.push(p[i]);
    if (s[i]) out.push(s[i]);
  }
  return out;
})();

// ---------- counts for the home screen ----------

export function counts(st, today, now = Date.now()) {
  const day = dayNumber(now);
  let dueVocab = 0, dueEar = 0, learned = 0;
  for (const c of st.cards.values()) {
    const item = ITEM_BY_ID.get(c.id);
    if (!item || c.due == null) continue;
    learned += item.kind === 'vocab' ? 1 : 0;
    if (c.due <= day) item.kind === 'vocab' ? dueVocab++ : dueEar++;
  }
  const newLeft = Math.max(0, st.settings.newPerDay - (today.newItems || 0));
  const unseen = UNITS.flatMap((u) => u.items).filter((i) => !st.cards.has(i.id)).length;
  return { dueVocab, dueEar, due: dueVocab + dueEar, newToday: Math.min(newLeft, unseen), unseen, learned };
}

// ---------- queue ----------

/**
 * Entry modes:
 *   lesson  – grammar explanation (ungraded)
 *   intro   – first meeting with an item: guess, then reveal (ungraded)
 *   first   – first recall of a new item (graded; creates its memory state)
 *   review  – scheduled review (graded)
 *   reask   – extra in-session repetition after a mistake (ungraded)
 */
export function buildQueue(st, today, { extraNew = 0, practice = false, now = Date.now(), rand = Math.random } = {}) {
  const day = dayNumber(now);
  const q = [];

  // 1) reviews, interleaved across units
  let due = [...st.cards.values()].filter((c) => ITEM_BY_ID.has(c.id) && c.due != null && (practice || c.due <= day));
  due.sort((a, b) => recallNow(a, now) - recallNow(b, now)); // most-forgotten first
  due = due.slice(0, practice ? 15 : st.settings.maxReviews);
  const dueVocab = shuffle(due.filter((c) => ITEM_BY_ID.get(c.id).kind === 'vocab'), rand);
  const dueEar = due.filter((c) => ITEM_BY_ID.get(c.id).kind !== 'vocab');
  dueVocab.forEach((c) => q.push({ id: c.id, mode: 'review' }));

  // 2) ear training: due + a couple of new ones
  shuffle(dueEar, rand).forEach((c) => q.push({ id: c.id, mode: 'review' }));
  if (!practice) {
    const earLeft = Math.max(0, st.settings.earNewPerDay - (today.newEar || 0));
    EAR_ORDER.filter((e) => !st.cards.has(e.id)).slice(0, earLeft).forEach((e) => {
      q.push({ id: e.id, mode: 'intro' }, { id: e.id, mode: 'first' });
    });
  }

  // 3) new vocabulary, introduced in a themed block (not interleaved: better for first learning)
  const newCount = practice ? extraNew : Math.max(0, st.settings.newPerDay - (today.newItems || 0)) + extraNew;
  const fresh = UNITS.flatMap((u) => u.items).filter((i) => !st.cards.has(i.id)).slice(0, newCount);
  const lessonsQueued = new Set();
  fresh.forEach((item, i) => {
    if (item.lesson && !st.seenLessons.has(item.lesson) && !lessonsQueued.has(item.lesson)) {
      q.push({ id: item.id, mode: 'lesson', lessonId: item.lesson });
      lessonsQueued.add(item.lesson);
    }
    q.push({ id: item.id, mode: 'intro' });
    if (i > 0) q.push({ id: fresh[i - 1].id, mode: 'first' }); // recall the previous one after a gap
  });
  if (fresh.length) q.push({ id: fresh[fresh.length - 1].id, mode: 'first' });

  return q;
}

// ---------- difficulty ----------

/** Rolling accuracy → shift exercises harder/easier to stay near ~85% success. */
export function adaptiveOffset(recent) {
  if (!recent || recent.length < 10) return 0;
  const acc = recent.reduce((a, b) => a + b, 0) / recent.length;
  if (acc > 0.92) return 1;
  if (acc < 0.75) return -1;
  return 0;
}

const wordCount = (s) => s.trim().split(/\s+/).length;

/**
 * Pick the exercise type for an entry.
 * Rungs: 1 listen→meaning, 2 read→meaning / meaning→Portuguese, 3 tiles,
 *        4 dictation, 5 type the translation, 6 listen & say it (shadowing),
 *        7 say the translation. Rungs 6–7 mix in typing so both skills keep improving.
 */
export function chooseExercise(item, card, mode, st, { canListen = true, canSpeak = false, rand = Math.random } = {}) {
  if (mode === 'lesson') return 'lesson';
  if (mode === 'intro') return item.kind === 'vocab' ? 'intro' : `intro-${item.kind}`;
  if (item.kind === 'pair') return canListen ? 'pair' : 'pair-read';
  if (item.kind === 'stress') return canListen ? 'stress' : 'stress-read';

  const top = canSpeak ? MAX_RUNG : MAX_RUNG_SILENT;
  const base = card?.rung ?? 2;
  const rung = mode === 'first' ? 2 : clamp(base + adaptiveOffset(st.stats.recent), 1, top);
  const multi = wordCount(item.pt) >= 2;
  const noTyping = st.settings.noTyping;

  let type;
  switch (rung) {
    case 1: type = 'listen-mc'; break;
    case 2: type = rand() < 0.5 ? 'read-mc' : 'en-mc'; break;
    case 3: type = multi ? 'tiles' : 'en-mc'; break;
    case 4: type = 'dictation'; break;
    case 5: type = 'type'; break;
    case 6: type = rand() < 0.6 ? 'speak-read' : 'dictation'; break;
    default: type = rand() < 0.6 ? 'speak-translate' : 'type';
  }
  if (!canListen && type === 'listen-mc') type = 'read-mc';
  if (!canListen && type === 'dictation') type = 'type';
  if (noTyping && (type === 'type' || type === 'dictation')) {
    type = canSpeak && rung >= 4 ? (type === 'dictation' ? 'speak-read' : 'speak-translate') : (multi ? 'tiles' : 'en-mc');
  }
  return type;
}

/** Easier fallback ("can't type / can't speak right now" buttons). */
export function easierExercise(item, type, { noTyping = false } = {}) {
  const multi = wordCount(item.pt) >= 2;
  const nonTyping = multi ? 'tiles' : 'en-mc';
  if (type === 'speak-read') return noTyping ? 'listen-mc' : 'dictation';
  if (type === 'speak-translate') return noTyping ? nonTyping : 'type';
  if (type === 'type' || type === 'dictation') return nonTyping;
  if (type === 'tiles') return 'en-mc';
  return 'read-mc';
}

function nextRung(rung, result, top = MAX_RUNG) {
  if (result === 'correct' || result === 'accent') return clamp(rung + 1, 1, top);
  if (result === 'wrong') return clamp(Math.min(rung, top) - 1, 1, top);
  return Math.min(rung, top);
}

// ---------- multiple-choice options ----------

const baseEn = (en) => en.replace(/\(.*?\)/g, '').trim().toLowerCase();

function overlaps(a, b) {
  const x = baseEn(a.en), y = baseEn(b.en);
  return x === y || x.includes(y) || y.includes(x) || a.pt === b.pt ||
    a.accept?.includes(b.pt) || b.accept?.includes(a.pt);
}

/** 3 distractors: same unit first, similar length preferred, never ambiguous. */
export function distractors(item, n = 3, rand = Math.random) {
  const sameUnit = UNITS.find((u) => u.n === item.unit)?.items || [];
  const others = UNITS.flatMap((u) => u.items);
  const pool = shuffle(sameUnit, rand).concat(shuffle(others, rand));
  const words = wordCount(item.pt);
  const scored = [];
  const seen = new Set([item.id]);
  for (const c of pool) {
    if (seen.has(c.id) || overlaps(item, c)) continue;
    if (scored.some((s) => overlaps(s, c))) continue;
    seen.add(c.id);
    scored.push(c);
    if (scored.length >= 12) break;
  }
  scored.sort((a, b) => Math.abs(wordCount(a.pt) - words) - Math.abs(wordCount(b.pt) - words));
  return scored.slice(0, n);
}

/** Word tiles: the answer's words plus a few distractor words, shuffled. */
export function tilesFor(item, rand = Math.random) {
  const words = item.pt.replace(/[?!.,]/g, '').split(/\s+/);
  const extra = [];
  for (const d of distractors(item, 6, rand)) {
    for (const w of d.pt.replace(/[?!.,]/g, '').split(/\s+/)) {
      if (!words.includes(w) && !extra.includes(w)) extra.push(w);
    }
  }
  const nExtra = Math.min(extra.length, Math.max(2, Math.ceil(words.length / 2)));
  return shuffle(words.concat(shuffle(extra, rand).slice(0, nExtra)), rand);
}

// ---------- running a session ----------

export class Session {
  /**
   * @param store {state, saveCard, saveStats, todayStats, markLessonSeen}
   */
  constructor(store, queue, { now = () => Date.now(), maxRung = MAX_RUNG } = {}) {
    this.store = store;
    this.queue = queue;
    this.pos = 0;
    this.now = now;
    this.maxRung = maxRung;
    this.noSpeak = false; // set when the learner taps "can't speak now"
    this.reasks = new Map();
    this.gradedToday = new Set();
    this.summary = { graded: 0, correct: 0, newItems: 0, mistakes: [] };
  }

  get done() { return this.pos >= this.queue.length; }
  get current() { return this.queue[this.pos]; }
  get progress() { return this.queue.length ? this.pos / this.queue.length : 1; }

  item(entry = this.current) { return ITEM_BY_ID.get(entry.id); }
  card(entry = this.current) { return this.store.state.cards.get(entry.id); }

  insertLater(entry, gap) {
    const at = Math.min(this.queue.length, this.pos + 1 + gap);
    this.queue.splice(at, 0, entry);
  }

  /** Lesson or intro screen finished. */
  async acknowledge() {
    const e = this.current;
    if (e.mode === 'lesson') await this.store.markLessonSeen(e.lessonId);
    this.pos++;
  }

  /** Record an answer for the current entry. result: correct|accent|almost|wrong */
  async answer(result) {
    const e = this.current;
    const item = this.item(e);
    const { state } = this.store;
    const graded = (e.mode === 'review' || e.mode === 'first') && !this.gradedToday.has(e.id);

    if (graded) {
      this.gradedToday.add(e.id);
      const prev = state.cards.get(e.id) || { id: e.id, rung: 2 };
      const mem = schedule(prev, ratingFor(result), this.now(), { retention: state.settings.retention });
      const card = { ...prev, ...mem, rung: nextRung(prev.rung ?? 2, result, this.maxRung) };
      await this.store.saveCard(card);

      const today = this.store.todayStats();
      today.reviews++;
      if (result === 'correct' || result === 'accent') today.correct++;
      if (e.mode === 'first') {
        if (item.kind === 'vocab') { today.newItems++; this.summary.newItems++; }
        else today.newEar = (today.newEar || 0) + 1;
      }
      const score = result === 'wrong' ? 0 : result === 'almost' ? 0.5 : 1;
      state.stats.recent = [...(state.stats.recent || []), score].slice(-RECENT_WINDOW);
      await this.store.saveStats();

      this.summary.graded++;
      if (score === 1) this.summary.correct++;
    }

    if (result === 'wrong') {
      if (graded) this.summary.mistakes.push(e.id);
      const n = this.reasks.get(e.id) || 0;
      if (n < 3) {
        this.reasks.set(e.id, n + 1);
        this.insertLater({ id: e.id, mode: 'reask' }, 3);
      }
    } else if (e.mode === 'first' && item.kind === 'vocab') {
      // one more spaced repetition later in the session, a rung harder
      this.insertLater({ id: e.id, mode: 'reask' }, 5);
    }
    this.pos++;
  }
}
