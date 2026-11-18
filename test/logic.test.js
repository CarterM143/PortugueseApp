import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schedule, Rating, intervalFor, dayNumber, retrievability } from '../js/fsrs.js';
import { grade, normalize, stripAccents, diffWords } from '../js/grade.js';
import { UNITS, EAR, ALL_ITEMS, LESSON_BY_ID } from '../js/content.js';
import { buildQueue, chooseExercise, distractors, tilesFor, Session, counts, adaptiveOffset } from '../js/session.js';

const DAY = 86400000;

// ---------- FSRS ----------

test('fsrs: interval equals stability at 90% retention', () => {
  assert.ok(Math.abs(intervalFor(10, 0.9) - 10) < 1e-9);
  assert.ok(Math.abs(retrievability(10, 10) - 0.9) < 1e-9);
});

test('fsrs: new card intervals grow with rating', () => {
  const now = Date.UTC(2026, 10, 18, 12);
  const opts = { fuzz: false };
  const again = schedule({}, Rating.Again, now, opts);
  const good = schedule({}, Rating.Good, now, opts);
  const easy = schedule({}, Rating.Easy, now, opts);
  assert.ok(again.s < good.s && good.s < easy.s);
  assert.equal(again.due - dayNumber(now), 1);
  assert.ok(good.due - dayNumber(now) >= 3);
});

test('fsrs: successful reviews lengthen the interval, lapses shorten it', () => {
  let t = Date.UTC(2026, 0, 1, 12);
  let card = schedule({}, Rating.Good, t, { fuzz: false });
  const intervals = [];
  for (let i = 0; i < 5; i++) {
    t = t + (card.due - dayNumber(t)) * DAY;
    const next = schedule(card, Rating.Good, t, { fuzz: false });
    intervals.push(next.due - dayNumber(t));
    card = next;
  }
  for (let i = 1; i < intervals.length; i++) assert.ok(intervals[i] >= intervals[i - 1], `intervals ${intervals}`);
  assert.ok(intervals[1] > intervals[0] && Math.max(...intervals) <= 365);
  const lapse = schedule(card, Rating.Again, t + 5 * DAY, { fuzz: false });
  assert.ok(lapse.s < card.s);
  assert.equal(lapse.lapses, 1);
  assert.ok(lapse.d > card.d);
});

test('fsrs: lower retention target gives longer intervals', () => {
  const now = Date.now();
  const hi = schedule({}, Rating.Good, now, { fuzz: false, retention: 0.95 });
  const lo = schedule({}, Rating.Good, now, { fuzz: false, retention: 0.8 });
  assert.ok(lo.due > hi.due);
});

// ---------- grading ----------

test('grade: exact, accents, typos, articles, wrong', () => {
  assert.equal(grade('Bom dia!', ['bom dia']).result, 'correct');
  assert.equal(grade('  chamo-me ana ', ['chamo-me Ana']).result, 'correct');
  assert.equal(grade('chamo me ana', ['chamo-me Ana']).result, 'correct');
  assert.equal(grade('nao', ['não']).result, 'accent');
  assert.equal(grade('acucar', ['açúcar']).result, 'accent');
  assert.equal(grade('obrigdo', ['obrigado']).result, 'almost');
  assert.equal(grade('muito obrigdo', ['muito obrigado']).result, 'almost');
  assert.equal(grade('a irmã', ['o irmão']).result, 'wrong'); // gender mistakes aren't typos
  assert.equal(grade('pequeno-almoco', ['o pequeno-almoço']).result, 'almost');
  assert.equal(grade('pequeno-almoço', ['o pequeno-almoço']).reason, 'article');
  assert.equal(grade('sin', ['sim']).result, 'wrong'); // short words get no typo allowance
  assert.equal(grade('adeus', ['olá']).result, 'wrong');
  assert.equal(grade('', ['olá']).result, 'wrong');
  assert.equal(grade('obrigada', ['obrigado', 'obrigada']).result, 'correct');
});

test('normalize / stripAccents', () => {
  assert.equal(normalize('Pode repetir, por favor?'), 'pode repetir por favor');
  assert.equal(stripAccents('Ção ã õ é'), 'cao a o e');
});

test('diffWords flags missing words', () => {
  const d = diffWords('queria cafe por favor', 'queria um café, por favor');
  assert.deepEqual(d.map((w) => w.ok), [true, false, true, true, true]);
});

// ---------- content ----------

test('content: ids unique, lessons exist, fields present', () => {
  const ids = new Set();
  for (const i of ALL_ITEMS) {
    assert.ok(!ids.has(i.id), `duplicate id ${i.id}`);
    ids.add(i.id);
    assert.ok(i.pt && i.en, `missing text in ${i.id}`);
    if (i.lesson) assert.ok(LESSON_BY_ID.has(i.lesson), `missing lesson ${i.lesson}`);
    if (i.kind === 'stress') assert.ok(i.stress >= 0 && i.stress < i.syl.length);
  }
  assert.ok(UNITS.length === 5);
  assert.ok(EAR.length >= 20);
});

test('content: every vocab item has 3 unambiguous distractors', () => {
  for (const u of UNITS) {
    for (const item of u.items) {
      const ds = distractors(item);
      assert.equal(ds.length, 3, `distractors for ${item.id}`);
      for (const d of ds) assert.notEqual(d.en.toLowerCase(), item.en.toLowerCase());
    }
  }
});

test('tiles contain all answer words', () => {
  for (const item of UNITS.flatMap((u) => u.items)) {
    const tiles = tilesFor(item);
    for (const w of item.pt.replace(/[?!.,]/g, '').split(/\s+/)) assert.ok(tiles.includes(w), `${item.id} missing ${w}`);
  }
});

// ---------- session ----------

function fakeStore(settings = {}) {
  const state = {
    cards: new Map(),
    settings: { newPerDay: 10, earNewPerDay: 2, retention: 0.9, maxReviews: 120, noTyping: false, ...settings },
    stats: { days: {}, recent: [] },
    seenLessons: new Set(),
  };
  const today = { reviews: 0, correct: 0, newItems: 0 };
  return {
    state,
    today,
    saveCard: async (c) => { state.cards.set(c.id, c); },
    saveStats: async () => {},
    todayStats: () => today,
    markLessonSeen: async (id) => { state.seenLessons.add(id); },
  };
}

test('session: first day queue has lesson, intros and first recalls', () => {
  const st = fakeStore();
  const q = buildQueue(st.state, st.today);
  const intros = q.filter((e) => e.mode === 'intro').length;
  const firsts = q.filter((e) => e.mode === 'first').length;
  assert.equal(intros, 12); // 10 vocab + 2 ear
  assert.equal(firsts, 12);
  assert.ok(q.some((e) => e.mode === 'lesson' && e.lessonId === 'u1-you'));
  // every 'first' comes after its 'intro'
  for (const e of q.filter((x) => x.mode === 'first')) {
    assert.ok(q.findIndex((x) => x.id === e.id && x.mode === 'intro') < q.indexOf(e));
  }
});

test('session: running through a day creates cards and respects daily caps', async () => {
  const st = fakeStore();
  const s = new Session(st, buildQueue(st.state, st.today));
  let steps = 0;
  while (!s.done && steps++ < 500) {
    const e = s.current;
    if (e.mode === 'lesson' || e.mode === 'intro') await s.acknowledge();
    else await s.answer(Math.random() < 0.8 ? 'correct' : 'wrong');
  }
  assert.ok(s.done);
  assert.equal(st.today.newItems, 10);
  assert.equal(st.state.cards.size, 12);
  // Same day again: nothing new, nothing due
  const c = counts(st.state, st.today);
  assert.equal(c.newToday, 0);
  assert.equal(c.due, 0);
  assert.equal(buildQueue(st.state, st.today).length, 0);
});

test('session: wrong answers get re-asked later, max 3 times', async () => {
  const st = fakeStore({ newPerDay: 1, earNewPerDay: 0 });
  const s = new Session(st, buildQueue(st.state, st.today));
  let reasks = 0;
  let steps = 0;
  while (!s.done && steps++ < 50) {
    const e = s.current;
    if (e.mode === 'reask') reasks++;
    if (e.mode === 'lesson' || e.mode === 'intro') await s.acknowledge();
    else await s.answer('wrong');
  }
  assert.equal(reasks, 3);
  const card = [...st.state.cards.values()][0];
  assert.equal(card.rung, 1); // stepped down
});

test('adaptive difficulty targets ~85%', () => {
  assert.equal(adaptiveOffset(new Array(20).fill(1)), 1);
  assert.equal(adaptiveOffset(new Array(20).fill(0.5)), -1);
  assert.equal(adaptiveOffset([...new Array(17).fill(1), 0, 0, 0]), 0);
  assert.equal(adaptiveOffset([1, 1]), 0);
});

test('chooseExercise respects no-typing and missing voice', () => {
  const st = fakeStore({ noTyping: true });
  const item = UNITS[0].items.find((i) => i.pt === 'bom dia');
  for (let rung = 1; rung <= 5; rung++) {
    const t = chooseExercise(item, { rung }, 'review', st.state);
    assert.ok(!['type', 'dictation'].includes(t), `rung ${rung} gave ${t}`);
  }
  const st2 = fakeStore();
  for (let rung = 1; rung <= 5; rung++) {
    const t = chooseExercise(item, { rung }, 'review', st2.state, { canListen: false });
    assert.ok(!['listen-mc', 'dictation'].includes(t), `rung ${rung} gave ${t}`);
  }
  assert.equal(chooseExercise(item, { rung: 5 }, 'review', st2.state), 'type');
  assert.equal(chooseExercise(EAR[0], {}, 'review', st2.state), 'pair');
});
