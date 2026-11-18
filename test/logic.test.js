import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schedule, Rating, intervalFor, dayNumber, retrievability } from '../js/fsrs.js';
import { grade, normalize, stripAccents, diffWords } from '../js/grade.js';
import { UNITS, EAR, ALL_ITEMS, LESSON_BY_ID } from '../js/content.js';
import { buildQueue, chooseExercise, easierExercise, distractors, tilesFor, Session, counts, adaptiveOffset } from '../js/session.js';
import { assessSpeech, phoneticKey, spokenText, soundFeatures, SOUND_FEATURES } from '../js/pronounce.js';
import { parseJsonReply } from '../js/openrouter.js';
import * as sessionExtras from '../js/session.js';

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
  assert.equal(UNITS.length, 20);
  UNITS.forEach((u, i) => assert.equal(u.n, i + 1));
  for (const u of UNITS) for (const l of u.lessons) {
    assert.ok(u.items.some((i) => i.lesson === l.id), `lesson ${l.id} is never introduced`);
  }
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

test('session length: reviews first, new words fill the remaining time', () => {
  const { estimateMinutes, COST } = sessionExtras;
  const st = fakeStore({ sessionMinutes: 10 });
  const day = dayNumber(Date.now());
  // 100 due vocab reviews = ~17 min: more than the 10-minute budget
  const vocab = UNITS.flatMap((u) => u.items).slice(0, 100);
  vocab.forEach((i) => st.state.cards.set(i.id, { id: i.id, s: 5, d: 5, last: Date.now() - 6 * DAY, due: day, rung: 3 }));
  let q = buildQueue(st.state, st.today);
  const reviews = q.filter((e) => e.mode === 'review').length;
  assert.equal(reviews, Math.floor((10 * 60) / COST.review));
  assert.equal(q.filter((e) => e.mode === 'intro').length, 0); // no time left for new words
  assert.ok(estimateMinutes(q) <= 10);
  // "+5 new words" ignores the limit
  q = buildQueue(st.state, st.today, { extraNew: 5 });
  assert.equal(q.filter((e) => e.mode === 'review').length, 100);
  // No limit
  st.state.settings.sessionMinutes = 0;
  assert.equal(buildQueue(st.state, st.today).filter((e) => e.mode === 'review').length, 100);
  // Small backlog: everything fits, new words still come
  const st2 = fakeStore({ sessionMinutes: 20 });
  vocab.slice(0, 10).forEach((i) => st2.state.cards.set(i.id, { id: i.id, s: 5, d: 5, last: Date.now() - 6 * DAY, due: day, rung: 3 }));
  q = buildQueue(st2.state, st2.today);
  assert.equal(q.filter((e) => e.mode === 'review').length, 10);
  assert.equal(q.filter((e) => e.mode === 'first' && e.id.startsWith('u')).length, 10);
});

test('session tracks practice time and measured recall on reviews', async () => {
  const st = fakeStore();
  const item = UNITS[0].items[0];
  st.state.cards.set(item.id, { id: item.id, s: 3, d: 5, last: Date.now() - 3 * DAY, due: dayNumber(Date.now()), rung: 3 });
  let t = 0;
  const s = new Session(st, [{ id: item.id, mode: 'review' }], { now: () => t });
  t = 30000;
  await s.answer('almost');
  assert.equal(st.today.seconds, 30);
  assert.equal(st.today.recallN, 1);
  assert.equal(st.today.recallOk, 1); // "almost" still counts as remembered
  const s2 = new Session(st, [{ id: UNITS[0].items[1].id, mode: 'first' }], { now: () => t });
  t += 10 * 60000; // phone put down for 10 minutes
  await s2.answer('wrong');
  assert.equal(st.today.seconds, 150); // capped at 2 minutes
  assert.equal(st.today.recallN, 1); // first recalls don't count
});

test('stats: forecast, stages, recall', async () => {
  const { forecast, stages, averageRecall, measuredRecall, lastDays, minutesIn, hardest } = await import('../js/stats.js');
  const now = Date.now();
  const day = dayNumber(now);
  const ids = UNITS[0].items.map((i) => i.id);
  const cards = [
    { id: ids[0], s: 30, last: now, due: day - 2, lapses: 0 }, // overdue → today
    { id: ids[1], s: 2, last: now - DAY, due: day + 1, lapses: 3 },
    { id: ids[2], s: 2, last: now - DAY, due: day + 20, lapses: 2 }, // beyond 14 days
    { id: 'gone-item', s: 2, due: day },
  ];
  const f = forecast(cards, now, 14);
  assert.equal(f.length, 14);
  assert.deepEqual([f[0], f[1]], [1, 1]);
  assert.equal(f.reduce((a, b) => a + b, 0), 2);
  const sg = stages(cards);
  assert.equal(sg.known, 1);
  assert.equal(sg.learning, 2);
  assert.equal(sg.known + sg.learning + sg.notStarted, sg.total);
  const avg = averageRecall(cards, now);
  assert.ok(avg > 0.5 && avg <= 1);
  assert.equal(averageRecall([], now), null);
  const days = { a: { recallN: 10, recallOk: 9, seconds: 600, talkMinutes: 5 }, b: { recallN: 10, recallOk: 7 } };
  const list = lastDays(days, (d) => (d.getTime() === now ? 'a' : 'b'), 3, now);
  assert.equal(list.length, 3);
  assert.equal(list[2].key, 'a');
  assert.equal(measuredRecall([days.a, days.b]).rate, 0.8);
  assert.equal(measuredRecall([{}]).rate, null);
  assert.equal(minutesIn([days.a]), 15);
  assert.deepEqual(hardest(cards).map((c) => c.lapses), [3, 2]);
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

// ---------- speaking ----------

test('speech: exact and recogniser-style transcripts are understood', () => {
  assert.equal(assessSpeech(['Bom dia.'], ['bom dia']).tier, 'understood');
  assert.equal(assessSpeech(['Queria um café, por favor.'], ['queria um café, por favor']).tier, 'understood');
  assert.equal(assessSpeech(['5 €'], ['cinco euros']).tier, 'understood');
  assert.equal(assessSpeech(['16'], ['dezasseis']).tier, 'understood');
  assert.equal(assessSpeech(['Chamo-me Ana'], ['chamo-me Ana']).tier, 'understood');
  // sound-alike spellings
  assert.equal(assessSpeech(['obrigadu'], ['obrigado']).tier, 'understood');
});

test('speech: near misses are close, wrong things are unclear', () => {
  assert.equal(assessSpeech(['queria um cafe por'], ['queria um café, por favor']).tier, 'close');
  assert.equal(assessSpeech(['pau'], ['pão']).tier, 'close');
  assert.equal(assessSpeech(['the weather is nice'], ['bom dia']).tier, 'unclear');
  assert.equal(assessSpeech([], ['bom dia']).tier, 'unclear');
  assert.equal(assessSpeech([''], ['bom dia']).tier, 'unclear');
});

test('speech: best of several alternatives counts', () => {
  const r = assessSpeech(['bomb dia tudo', 'bom dia'], ['bom dia']);
  assert.equal(r.tier, 'understood');
  assert.equal(r.heard, 'bom dia');
});

test('speech: missed words reveal the tricky sounds', () => {
  const r = assessSpeech(['o pau'], ['o pão']);
  assert.deepEqual(r.missed, ['pão']);
  assert.ok(soundFeatures(r.missed).includes('nasal'));
  assert.ok(soundFeatures(['avó']).includes('open-closed'));
  assert.ok(soundFeatures(['filho']).includes('lh-nh'));
  for (const f of SOUND_FEATURES) for (const id of f.ear) assert.ok(id.startsWith('ear-') || id.startsWith('stress-'));
  assert.ok(SOUND_FEATURES.find((f) => f.id === 'nasal').ear.length === 2);
});

test('phonetic key merges sound-alike spellings', () => {
  assert.equal(phoneticKey('cinco'), phoneticKey('sinco'));
  assert.equal(phoneticKey('açúcar'), phoneticKey('assucar'));
  assert.equal(spokenText('21'), 'vinte e um');
});

test('speaking exercises appear only on high rungs and when allowed', () => {
  const st = fakeStore();
  const item = UNITS[0].items.find((i) => i.pt === 'bom dia');
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(chooseExercise(item, { rung: 7 }, 'review', st.state, { canSpeak: true }));
  assert.ok(seen.has('speak-translate') && seen.has('type'));
  for (let i = 0; i < 50; i++) {
    const t = chooseExercise(item, { rung: 7 }, 'review', st.state, { canSpeak: false });
    assert.ok(!t.startsWith('speak'));
  }
  for (let r = 1; r <= 5; r++) assert.ok(!chooseExercise(item, { rung: r }, 'review', st.state, { canSpeak: true }).startsWith('speak') || r >= 6);
  // no-typing + speaking: typing rungs become speaking
  const nt = fakeStore({ noTyping: true });
  const t5 = chooseExercise(item, { rung: 5 }, 'review', nt.state, { canSpeak: true });
  assert.equal(t5, 'speak-translate');
  assert.equal(easierExercise(item, 'speak-translate'), 'type');
  assert.equal(easierExercise(item, 'speak-translate', { noTyping: true }), 'tiles');
});

test('rung never exceeds the session maximum', async () => {
  const st = fakeStore({ newPerDay: 1, earNewPerDay: 0 });
  const s = new Session(st, buildQueue(st.state, st.today), { maxRung: 5 });
  while (!s.done) {
    const e = s.current;
    if (e.mode === 'lesson' || e.mode === 'intro') await s.acknowledge(); else await s.answer('correct');
  }
  const c = [...st.state.cards.values()][0];
  c.rung = 5;
  const s2 = new Session(st, [{ id: c.id, mode: 'review' }], { maxRung: 5 });
  await s2.answer('correct');
  assert.equal(st.state.cards.get(c.id).rung, 5);
});

test('parseJsonReply tolerates chatter around JSON', () => {
  assert.deepEqual(parseJsonReply('Sure! {"verdict":"good","tips":[]} hope that helps'), { verdict: 'good', tips: [] });
  assert.equal(parseJsonReply('no json here'), null);
});

// ---------- tutor ----------

test('scenarios: every scripted model answer passes its own check', async () => {
  const { SCENARIOS, PACK_SCENARIOS } = await import('../js/scenarios.js');
  const { checkScripted } = await import('../js/tutor.js');
  assert.equal(SCENARIOS.length, 20);
  for (const u of UNITS) assert.ok(SCENARIOS.some((s) => s.unit === u.n), `no scenario for unit ${u.n}`);
  const all = [...SCENARIOS, ...PACK_SCENARIOS];
  assert.equal(new Set(all.map((s) => s.id)).size, all.length);
  for (const s of all) {
    assert.ok(s.goals.length && s.script.length && s.opening.pt && s.closing.pt, s.id);
    for (const t of s.script) {
      for (const e of t.expect) {
        assert.ok(checkScripted(t, { text: e }).ok, `${s.id}: typed "${e}"`);
        assert.ok(checkScripted(t, { transcripts: [e], spoken: true }).ok, `${s.id}: spoken "${e}"`);
      }
      assert.ok(!checkScripted(t, { text: 'the weather is nice' }).ok, `${s.id}: nonsense accepted`);
    }
  }
});

test('scripted conversation: hint ladder then moves on', async () => {
  const { SCENARIOS } = await import('../js/scenarios.js');
  const { ScriptedConversation } = await import('../js/tutor.js');
  const c = new ScriptedConversation(SCENARIOS[3]); // pastelaria
  let r = c.answer({ text: 'xyz' });
  assert.equal(r.ok, false);
  assert.match(r.hint, /starting with/);
  r = c.answer({ text: 'abc' });
  assert.match(r.hint, /^Say:/);
  r = c.answer({ text: 'still wrong' }); // third attempt: move on, show answer
  assert.equal(r.ok, false);
  assert.ok(r.next && r.answer);
  r = c.answer({ text: 'um pastel de nata, por favor' });
  assert.equal(r.ok, true);
  r = c.answer({ transcripts: ['para comer aqui'], spoken: true });
  assert.equal(r.ok, true);
  r = c.answer({ text: 'a conta por favor' });
  assert.ok(r.closing && c.done);
  assert.equal(c.goalsDone.size, 4);
});

test('tutor reply parsing is robust', async () => {
  const { parseTutorReply } = await import('../js/tutor.js');
  const ok = parseTutorReply('```json\n{"reply":"Olá!","reply_en":"Hi!","feedback":{"type":"hint","text":"gender"},"retry":true,"goals_done":[0,"x",2],"done":false}\n```');
  assert.equal(ok.reply, 'Olá!');
  assert.equal(ok.feedback.type, 'hint');
  assert.deepEqual(ok.goals_done, [0, 2]);
  const plain = parseTutorReply('Muito bem! E tu?');
  assert.equal(plain.reply, 'Muito bem! E tu?');
  assert.equal(plain.feedback.type, 'none');
});

test('AI conversation: attempts ladder, goals, audio only for audio models', async () => {
  const { SCENARIOS } = await import('../js/scenarios.js');
  const { AiConversation } = await import('../js/tutor.js');
  const calls = [];
  const replies = [
    { reply: 'Quase!', feedback: { type: 'hint', text: 'gender' }, retry: true, goals_done: [] },
    { reply: 'Quase!', feedback: { type: 'explicit', text: 'use uma' }, retry: true, goals_done: [] },
    { reply: 'Muito bem.', feedback: { type: 'correction', text: 'x', corrected: 'uma água' }, retry: true, goals_done: [0, 9] },
    { reply: 'Mais alguma coisa?', feedback: { type: 'none' }, retry: false, goals_done: [0, 1] },
  ];
  const chatFn = async (key, messages, opts) => { calls.push({ messages, opts }); return JSON.stringify(replies[calls.length - 1]); };
  const c = new AiConversation(SCENARIOS[3], { key: 'k', model: 'mistralai/voxtral-small-24b-2507', known: ['um café'], chatFn });
  await c.send('um água', { spoken: true, audio: { b64: 'AAAA' } });
  assert.equal(c.attempt, 2);
  assert.match(calls[0].messages.at(-1).content[0].text, /\[attempt 1\]/);
  assert.equal(calls[0].messages.at(-1).content[1].type, 'input_audio');
  assert.ok(calls[0].messages[0].content.includes('um café'));
  assert.equal(calls[0].opts.json, true);
  await c.send('um água');
  assert.equal(c.attempt, 3);
  const r3 = await c.send('um água');
  assert.equal(r3.retry, false); // forced: never loop past attempt 3
  assert.equal(c.attempt, 1);
  assert.deepEqual([...c.goalsDone], [0]); // goal 9 ignored (out of range)
  await c.send('sim');
  assert.deepEqual([...c.goalsDone].sort(), [0, 1]);
  // history holds text only, no audio
  assert.ok(c.history.every((m) => typeof m.content === 'string'));

  const t = new AiConversation(SCENARIOS[0], { key: 'k', model: 'deepseek/deepseek-v4-flash', chatFn: async (k, m) => { calls.push({ messages: m }); return '{"reply":"Olá"}'; } });
  await t.send('ola', { spoken: true, audio: { b64: 'AAAA' } });
  assert.equal(typeof calls.at(-1).messages.at(-1).content, 'string'); // text-only model: no audio part
});
