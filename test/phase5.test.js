// Phase 5: Reveal Day pack, your own words, pocket quizzes, push, games, walk, novela.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { UNITS, HER, ALL_ITEMS, LESSON_BY_ID, ITEM_BY_ID, MINE, customItem, registerCustom, unregisterCustom } from '../js/content.js';
import { newPool, buildQueue, counts } from '../js/session.js';
import { pickPocketItems, pocketUpdates } from '../js/pocket.js';
import { schedule, Rating, dayNumber } from '../js/fsrs.js';
import { numberToPt, priceToPt, phoneToPt, normalizeNumberAnswer, priceDigits } from '../js/numbers.js';
import { parseSubscriptions, vapidJwt, VAPID_PUBLIC as PUSH_PUBLIC } from '../scripts/push.mjs';
import { VAPID_PUBLIC } from '../js/pocket.js';
import { walkPlan } from '../js/walk.js';
import { parseEpisode, episodePrompt } from '../js/novela.js';
import { daysUntil, projection, perDayFor } from '../js/extras.js';
import { PACK_SCENARIOS, personalize } from '../js/scenarios.js';

const DAY = 86400000;

function fakeState(settings = {}) {
  return {
    cards: new Map(),
    settings: { newPerDay: 10, earNewPerDay: 2, retention: 0.9, maxReviews: 120, noTyping: false, sessionMinutes: 0, ...settings },
    stats: { days: {}, recent: [] },
    seenLessons: new Set(),
    custom: [],
    novela: [],
  };
}

/** Give a state some started cards (first n course items), last reviewed `ago` days ago. */
function withCards(st, n, { ago = 3, s = 5, now = Date.now() } = {}) {
  UNITS.flatMap((u) => u.items).slice(0, n).forEach((it, i) => {
    st.cards.set(it.id, { id: it.id, s: s + i * 0.1, d: 5, last: now - ago * DAY, due: dayNumber(now), reps: 2, lapses: 0, rung: 3 });
  });
  return st;
}

// ---------- content ----------

test('her pack: unique ids, lessons introduced, no duplicates of course phrases', () => {
  const ids = ALL_ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(HER.items.length >= 30);
  for (const l of HER.lessons) {
    assert.ok(LESSON_BY_ID.has(l.id));
    assert.ok(HER.items.some((i) => i.lesson === l.id), `lesson ${l.id} never introduced`);
  }
  const course = new Set(UNITS.flatMap((u) => u.items).map((i) => i.pt.toLowerCase()));
  for (const it of HER.items) assert.ok(!course.has(it.pt.toLowerCase()), `duplicate of a course item: ${it.pt}`);
});

test('her pack role-plays are personalised with her name and family', () => {
  const tell = PACK_SCENARIOS.find((s) => s.id === 'revelacao');
  const p = personalize(tell, { herName: 'Inês', herFamily: '' });
  assert.match(p.role, /^Inês,/);
  const lunch = personalize(PACK_SCENARIOS.find((s) => s.id === 'almoco'), { herName: '', herFamily: 'Her mum is Fátima.' });
  assert.match(lunch.setting, /Her mum is Fátima/);
  assert.ok(!/\{(her|family)\}/.test(JSON.stringify(personalize(tell, { herName: '', herFamily: '' }))));
});

// ---------- new-word order ----------

test('newPool: course order by default; with the pack, every third word is from it', () => {
  const st = fakeState();
  const plain = newPool(st);
  assert.deepEqual(plain.slice(0, 5).map((i) => i.id), UNITS[0].items.slice(0, 5).map((i) => i.id));
  st.settings.herPack = true;
  const mixed = newPool(st);
  assert.equal(mixed[2].unit, 'her');
  assert.equal(mixed[5].unit, 'her');
  assert.equal(mixed[0].unit, 1);
  assert.equal(mixed.length, plain.length + HER.items.length);
  // the pack keeps its own order
  assert.deepEqual(mixed.filter((i) => i.unit === 'her').map((i) => i.id), HER.items.map((i) => i.id));
});

test('your own words come first, show up in counts and sessions, and can be removed', () => {
  const st = fakeState();
  const item = customItem({ pt: 'estou atrasado', en: "I'm running late", at: 1700000000000 });
  registerCustom([item]);
  try {
    assert.equal(ITEM_BY_ID.get(item.id).pt, 'estou atrasado');
    assert.equal(newPool(st)[0].id, item.id);
    const q = buildQueue(st, { reviews: 0, correct: 0, newItems: 0 });
    assert.equal(q.find((e) => e.mode === 'intro' && ITEM_BY_ID.get(e.id).kind === 'vocab').id, item.id);
    const before = counts(st, { newItems: 0 }).unseen;
    unregisterCustom(item.id);
    assert.equal(counts(st, { newItems: 0 }).unseen, before - 1);
    assert.ok(!MINE.includes(item));
  } finally { unregisterCustom(item.id); }
});

// ---------- pocket quizzes ----------

test('pocket: picks the words closest to being forgotten, nothing new or ear training', () => {
  const now = Date.now();
  const st = withCards(fakeState(), 20, { now });
  const weak = UNITS[0].items[7].id;
  st.cards.set(weak, { ...st.cards.get(weak), s: 0.5 });
  const unseen = UNITS[0].items[25].id;
  st.cards.set(unseen, { id: unseen, rung: 2 }); // started but no memory state yet
  const list = pickPocketItems(st, now, 12);
  assert.equal(list.length, 12);
  assert.equal(list[0].id, weak);
  assert.ok(list.every((x) => x.pt && x.en && (x.dir === 'en' || x.dir === 'pt')));
  assert.ok(!list.some((x) => x.id === unseen));
});

test('pocket: answers become reviews; stale ones are skipped', () => {
  const now = Date.now();
  const st = withCards(fakeState(), 3, { now });
  const [a, b] = UNITS[0].items;
  const updates = pocketUpdates(st, [
    { id: a.id, ok: true, at: now - DAY },
    { id: b.id, ok: false, at: now - 1000 },
    { id: b.id, ok: true, at: now - 10 * DAY }, // before its last review: ignored
    { id: 'no-such-card', ok: true, at: now },
  ]);
  assert.equal(updates.length, 2);
  const ua = updates.find((u) => u.card.id === a.id);
  assert.ok(ua.card.s > st.cards.get(a.id).s);
  const ub = updates.find((u) => u.card.id === b.id);
  assert.equal(ub.card.lapses, 1);
  assert.equal(ub.ok, false);
});

// ---------- push ----------

test('push: app and sender share the public key; setup codes parse; JWT verifies', () => {
  assert.equal(VAPID_PUBLIC, PUSH_PUBLIC);
  const one = JSON.stringify({ endpoint: 'https://fcm.googleapis.com/fcm/send/aaa', expirationTime: null, keys: { p256dh: 'x', auth: 'y' } });
  const two = JSON.stringify({ endpoint: 'https://fcm.googleapis.com/fcm/send/bbb', keys: { p256dh: 'x', auth: 'y' } });
  assert.deepEqual(parseSubscriptions(one), ['https://fcm.googleapis.com/fcm/send/aaa']);
  assert.deepEqual(parseSubscriptions(`${one}\n${two}`), ['https://fcm.googleapis.com/fcm/send/aaa', 'https://fcm.googleapis.com/fcm/send/bbb']);
  assert.deepEqual(parseSubscriptions(`[${one},${two}]`).length, 2);
  assert.deepEqual(parseSubscriptions(''), []);

  // Sign with a throwaway key pair and check the signature verifies
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = privateKey.export({ format: 'jwk' });
  const raw = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]).toString('base64url');
  const [h, p, sig] = vapidJwt('https://fcm.googleapis.com/fcm/send/aaa', jwk.d, 1000, raw).split('.');
  assert.equal(JSON.parse(Buffer.from(h, 'base64url')).alg, 'ES256');
  const claims = JSON.parse(Buffer.from(p, 'base64url'));
  assert.equal(claims.aud, 'https://fcm.googleapis.com');
  assert.equal(claims.exp, 1000 + 12 * 3600);
  assert.ok(crypto.verify('sha256', Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url')));
});

// ---------- numbers ----------

test('numbers: European Portuguese spelling', () => {
  const cases = {
    0: 'zero', 1: 'um', 2: 'dois', 14: 'catorze', 16: 'dezasseis', 17: 'dezassete', 19: 'dezanove', 20: 'vinte',
    21: 'vinte e um', 55: 'cinquenta e cinco', 100: 'cem', 101: 'cento e um', 115: 'cento e quinze',
    200: 'duzentos', 345: 'trezentos e quarenta e cinco', 999: 'novecentos e noventa e nove',
    1000: 'mil', 1005: 'mil e cinco', 1200: 'mil e duzentos', 1250: 'mil duzentos e cinquenta',
    2026: 'dois mil e vinte e seis', 21000: 'vinte e um mil',
  };
  for (const [n, w] of Object.entries(cases)) assert.equal(numberToPt(Number(n)), w, n);
  assert.equal(numberToPt(2, { feminine: true }), 'duas');
  assert.equal(numberToPt(201, { feminine: true }), 'duzentas e uma');
  assert.throws(() => numberToPt(-1));
});

test('numbers: prices, phone numbers, answer matching', () => {
  assert.equal(priceToPt(350), 'três euros e cinquenta cêntimos');
  assert.equal(priceToPt(100), 'um euro');
  assert.equal(priceToPt(5), 'cinco cêntimos');
  assert.equal(priceDigits(1205), '12,05 €');
  assert.equal(phoneToPt('912345678'), 'novecentos e doze, trezentos e quarenta e cinco, seiscentos e setenta e oito');
  assert.equal(phoneToPt('960045100'), 'novecentos e sessenta, zero quarenta e cinco, cem');
  assert.equal(phoneToPt('930005100'), 'novecentos e trinta, zero zero cinco, cem');
  assert.equal(normalizeNumberAnswer('3.5'), normalizeNumberAnswer('3,50 €'));
  assert.equal(normalizeNumberAnswer('912 345 678'), '912345678');
  assert.notEqual(normalizeNumberAnswer('3,05'), normalizeNumberAnswer('3,5'));
});

// ---------- walk ----------

test('walk: weakest words first, each comes back a few words later', () => {
  const now = Date.now();
  const st = withCards(fakeState({ walkPause: 4 }), 30, { now });
  const weak = UNITS[0].items[12].id;
  st.cards.set(weak, { ...st.cards.get(weak), s: 0.3 });
  const plan = walkPlan(st, 10, now);
  assert.equal(plan[0].id, weak);
  assert.ok(plan.length >= 30 && plan.length <= 50);
  const firstAgain = plan.findIndex((w, i) => i > 0 && w.id === weak);
  assert.ok(firstAgain >= 4 && firstAgain <= 6, `repeat at ${firstAgain}`);
  assert.deepEqual(walkPlan(fakeState(), 10, now), []);
});

// ---------- novela ----------

test('novela: prompt uses known and new words; replies are parsed defensively', () => {
  const st = withCards(fakeState(), 45);
  const prompt = episodePrompt(st, [{ n: 1, summary: 'Tom met Rui.' }], [{ pt: 'o autocarro', en: 'the bus' }]);
  assert.match(prompt, /Episode 1: Tom met Rui/);
  assert.match(prompt, /o autocarro \(the bus\)/);
  assert.match(prompt, /olá/);
  const ep = parseEpisode('Here you go: {"title":"O segredo","paragraphs":["O Tom está nervoso."],"english":["Tom is nervous."],"glossary":{"Nervoso":"nervous"},"summary":"Tom hides a book.","question":{"q":"Como está o Tom?","options":["nervoso","feliz"],"answer":0}}');
  assert.equal(ep.title, 'O segredo');
  assert.equal(ep.glossary.nervoso, 'nervous');
  assert.equal(ep.question.answer, 0);
  assert.equal(parseEpisode('sorry, no'), null);
  assert.equal(parseEpisode('{"title":"x","paragraphs":[]}'), null);
});

// ---------- reveal day ----------

test('reveal: countdown and pace', () => {
  const now = new Date(2026, 10, 18, 15).getTime();
  assert.equal(daysUntil('2026-11-18', now), 0);
  assert.equal(daysUntil('2026-12-25', now), 37);
  assert.equal(daysUntil('2026-11-01', now), -17);
  assert.equal(daysUntil('', now), null);
  const st = fakeState({ herPack: true });
  const p = projection(st, 30, 10);
  assert.equal(p.introduced, 300);
  assert.ok(p.unit >= 8 && p.unit <= 12, `unit ${p.unit}`);
  assert.equal(p.herDone, true); // 100 pack words fit in 300 slots
  const slow = projection(st, 10, 5);
  assert.equal(slow.herDone, false);
  // reaching unit 5 in 10 days: units 1–5 plus the pack words mixed in before then
  const need = perDayFor(st, 5, 10);
  const unit5 = UNITS.slice(0, 5).reduce((n, u) => n + u.items.length, 0);
  assert.ok(need >= Math.ceil(unit5 / 10) && need <= Math.ceil((unit5 * 1.5 + 2) / 10), `need ${need}`);
});
