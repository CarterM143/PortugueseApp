// Sync through a GitHub Gist: merge rules and a full phone ↔ tablet round trip against a fake GitHub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { merge, snapshot, runSync, SYNC_FILE, pickSettings } from '../js/sync.js';
import { DEFAULT_SETTINGS } from '../js/store.js';
import { UNITS, MINE, customItem, unregisterCustom } from '../js/content.js';

const DAY = 86400000;
const [w1, w2, w3] = UNITS[0].items;

/** A device: its state plus a store that records saves (like store.js, without IndexedDB). */
function device(settings = {}) {
  const state = {
    cards: new Map(),
    settings: { ...DEFAULT_SETTINGS, ...settings },
    stats: { days: {}, recent: [] },
    seenLessons: new Set(),
    custom: [], novela: [], deleted: [],
  };
  const saves = [];
  const store = {
    saveCard: async (c) => { state.cards.set(c.id, c); saves.push(`card:${c.id}`); },
    deleteCard: async (id) => { state.cards.delete(id); saves.push(`del:${id}`); },
    saveStats: async () => saves.push('stats'),
    saveSeenLessons: async () => saves.push('lessons'),
    saveCustom: async () => saves.push('custom'),
    saveDeleted: async () => saves.push('deleted'),
    saveNovela: async () => saves.push('novela'),
    saveSettings: async () => saves.push('settings'),
  };
  return { state, store, saves };
}

/** In-memory GitHub gist API. */
function fakeGitHub() {
  const gists = new Map();
  let n = 0;
  const calls = [];
  const fetchFn = async (url, { method = 'GET', headers = {}, body } = {}) => {
    calls.push(`${method} ${url.replace('https://api.github.com', '')}`);
    const ok = (j, status = 200) => ({ ok: true, status, json: async () => j, text: async () => JSON.stringify(j) });
    if (headers.Authorization !== 'Bearer good-token') return { ok: false, status: 401, json: async () => ({}) };
    const path = url.replace('https://api.github.com', '').split('?')[0];
    if (path === '/user') return ok({ login: 'me' });
    if (path === '/gists' && method === 'GET') return ok([{ id: 'other', files: { 'notes.md': {} } }, ...[...gists.values()]]);
    if (path === '/gists' && method === 'POST') {
      const b = JSON.parse(body);
      const g = { id: `g${++n}`, public: b.public, description: b.description, files: { [SYNC_FILE]: { content: b.files[SYNC_FILE].content } } };
      gists.set(g.id, g);
      return ok(g, 201);
    }
    const m = path.match(/^\/gists\/(.+)$/);
    if (m) {
      const g = gists.get(m[1]);
      if (!g) return { ok: false, status: 404, json: async () => ({}) };
      if (method === 'PATCH') { g.files[SYNC_FILE].content = JSON.parse(body).files[SYNC_FILE].content; return ok(g); }
      return ok(g);
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { gists, fetchFn, calls };
}

const card = (id, last, extra = {}) => ({ id, s: 3, d: 5, last, due: 1, reps: 2, lapses: 0, rung: 3, ...extra });

// ---------- merge rules ----------

test('merge: newest review wins per word, notes kept, deletions respected', () => {
  const t = Date.now();
  const a = device().state;
  const b = device().state;
  a.cards.set(w1.id, card(w1.id, t - DAY, { hook: 'my hook' }));
  b.cards.set(w1.id, card(w1.id, t, { s: 9 }));
  a.cards.set(w2.id, card(w2.id, t));
  b.cards.set(w3.id, card(w3.id, t));
  b.deleted = ['c-gone'];
  a.cards.set('c-gone', card('c-gone', t));
  const m = merge(snapshot(a), snapshot(b));
  const byId = new Map(m.cards.map((c) => [c.id, c]));
  assert.equal(byId.get(w1.id).s, 9);
  assert.equal(byId.get(w1.id).hook, 'my hook');
  assert.ok(byId.has(w2.id) && byId.has(w3.id));
  assert.ok(!byId.has('c-gone'));
});

test('merge: day counters take the larger figure, best scores max, lessons union', () => {
  const a = device().state;
  const b = device().state;
  a.stats.days = { '2026-11-17': { reviews: 30, correct: 25 }, '2026-11-18': { reviews: 5 } };
  b.stats.days = { '2026-11-18': { reviews: 12, pocket: 2 }, '2026-11-19': { reviews: 3 } };
  a.stats.games = { blitz: 200 };
  b.stats.games = { blitz: 150, ear: 90 };
  a.seenLessons = new Set(['u1-you']);
  b.seenLessons = new Set(['u1-obrigado']);
  const m = merge(snapshot(a), snapshot(b));
  assert.deepEqual(m.days['2026-11-18'], { reviews: 12, pocket: 2 });
  assert.equal(m.days['2026-11-17'].reviews, 30);
  assert.equal(m.days['2026-11-19'].reviews, 3);
  assert.deepEqual(m.games, { blitz: 200, ear: 90 });
  assert.deepEqual(m.seenLessons.sort(), ['u1-obrigado', 'u1-you']);
  // merging again changes nothing (no double counting)
  assert.deepEqual(merge(m, snapshot(b)).days, m.days);
});

test('merge: newer settings win; a new device takes the synced ones; private ones never travel', () => {
  const a = device({ newPerDay: 15, herName: 'Inês', apiKey: 'sk-secret', syncToken: 'tok', voiceURI: 'v1' }).state;
  a.settings.settingsAt = 2000;
  const b = device({ newPerDay: 10 }).state;
  b.settings.settingsAt = 1000;
  const snapA = snapshot(a);
  assert.ok(!('apiKey' in snapA.settings) && !('syncToken' in snapA.settings) && !('voiceURI' in snapA.settings));
  assert.equal(merge(snapshot(b), snapA).settings.newPerDay, 15);
  assert.equal(merge(snapA, snapshot(b)).settings.newPerDay, 15);
  b.settings.settingsAt = 3000;
  assert.equal(merge(snapA, snapshot(b)).settings.newPerDay, 10);
  assert.equal(merge(snapshot(b), snapA, { preferRemoteSettings: true }).settings.herName, 'Inês');
  assert.deepEqual(Object.keys(pickSettings(DEFAULT_SETTINGS)).includes('apiKey'), false);
});

test('merge: novela episodes from both devices are combined and renumbered', () => {
  const a = device().state;
  const b = device().state;
  a.novela = [{ n: 1, date: '2026-11-17', title: 'Um', read: true }, { n: 2, date: '2026-11-18', title: 'Dois' }];
  b.novela = [{ n: 1, date: '2026-11-17', title: 'Um' }, { n: 2, date: '2026-11-19', title: 'Três' }];
  const m = merge(snapshot(a), snapshot(b));
  assert.deepEqual(m.novela.map((e) => [e.n, e.title]), [[1, 'Um'], [2, 'Dois'], [3, 'Três']]);
  assert.equal(m.novela[0].read, true);
});

// ---------- full round trip ----------

test('sync: phone creates the gist, tablet joins and merges, phone picks up the tablet\'s work', async () => {
  const gh = fakeGitHub();
  const t0 = Date.now();

  const phone = device({ syncToken: 'good-token', newPerDay: 14, herName: 'Inês' });
  phone.state.settings.settingsAt = t0 - 5000;
  phone.state.cards.set(w1.id, card(w1.id, t0 - DAY));
  phone.state.stats.days['2026-11-18'] = { reviews: 20, correct: 18, newItems: 10 };
  const mine = customItem({ pt: 'estou atrasado', en: "I'm running late", at: t0 });
  phone.state.custom = [mine];

  const r1 = await runSync(phone.state, phone.store, { fetchFn: gh.fetchFn, now: t0 });
  assert.equal(r1.created, true);
  assert.equal(gh.gists.size, 1);
  const g = [...gh.gists.values()][0];
  assert.equal(g.public, false);
  assert.equal(g.description, 'Daily sync');
  assert.ok(!g.files[SYNC_FILE].content.includes('good-token'), 'token must never be uploaded');
  assert.equal(phone.state.settings.syncGistId, g.id);

  // Tablet: fresh install, did a little practice first, then connects with the same token
  const tablet = device({ syncToken: 'good-token', newPerDay: 10, voiceURI: 'tablet-voice' });
  tablet.state.settings.settingsAt = t0 + 1000; // fiddled with a setting, but it's joining for the first time
  tablet.state.cards.set(w2.id, card(w2.id, t0));
  try {
    const r2 = await runSync(tablet.state, tablet.store, { fetchFn: gh.fetchFn, now: t0 + 2000 });
    assert.equal(r2.created, false);
    assert.equal(tablet.state.settings.syncGistId, g.id); // found the phone's gist, didn't make another
    assert.equal(gh.gists.size, 1);
    assert.ok(tablet.state.cards.has(w1.id) && tablet.state.cards.has(w2.id));
    assert.equal(tablet.state.settings.newPerDay, 14); // phone's settings on first join
    assert.equal(tablet.state.settings.herName, 'Inês');
    assert.equal(tablet.state.settings.voiceURI, 'tablet-voice'); // device-only setting untouched
    assert.equal(tablet.state.stats.days['2026-11-18'].reviews, 20);
    assert.ok(MINE.some((i) => i.id === mine.id), 'custom word registered on the tablet');

    // Tablet reviews word 1 later; phone syncs and gets the newer memory state
    tablet.state.cards.set(w1.id, card(w1.id, t0 + 3000, { s: 12, reps: 3 }));
    await runSync(tablet.state, tablet.store, { fetchFn: gh.fetchFn, now: t0 + 4000 });
    const r3 = await runSync(phone.state, phone.store, { fetchFn: gh.fetchFn, now: t0 + 5000 });
    assert.equal(r3.changed, true);
    assert.equal(phone.state.cards.get(w1.id).s, 12);
    assert.ok(phone.state.cards.has(w2.id));

    // Nothing new: no upload
    const patches = gh.calls.filter((c) => c.startsWith('PATCH')).length;
    const r4 = await runSync(phone.state, phone.store, { fetchFn: gh.fetchFn, now: t0 + 6000 });
    assert.equal(r4.changed, false);
    assert.equal(gh.calls.filter((c) => c.startsWith('PATCH')).length, patches);
  } finally { unregisterCustom(mine.id); }
});

test('sync: bad token and a deleted gist are handled', async () => {
  const gh = fakeGitHub();
  const d = device({ syncToken: 'wrong' });
  await assert.rejects(runSync(d.state, d.store, { fetchFn: gh.fetchFn }), /token was rejected/);
  assert.equal(await runSync(device().state, device().store, { fetchFn: gh.fetchFn }), null); // sync off

  const ok = device({ syncToken: 'good-token', syncGistId: 'deleted-one', syncAt: 1 });
  const r = await runSync(ok.state, ok.store, { fetchFn: gh.fetchFn });
  assert.equal(r.created, true);
  assert.notEqual(ok.state.settings.syncGistId, 'deleted-one');
});
