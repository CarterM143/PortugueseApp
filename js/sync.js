// Sync between your devices through a secret GitHub Gist.
//
// Each device keeps working offline as before. When it syncs, it downloads the gist,
// merges it with what's on the device, saves the result locally and uploads it again.
// Merging (not overwriting) means you can practise on either device in any order.
//
// Stays on the device, never synced: the GitHub token, your OpenRouter key, voice choice.
// Note: secret gists are unlisted (not in search, not on your public profile) but anyone
// with the exact link could read them. They are not encrypted.

import { SYNCED } from './store.js';
import { registerCustom, unregisterCustom } from './content.js';

const API = 'https://api.github.com';
export const SYNC_FILE = 'daily-sync.json';
const DESCRIPTION = 'Daily sync';

/** Settings that follow you between devices. Everything else stays per device. */
export const SYNCED_SETTINGS = SYNCED;

export const pickSettings = (s) => Object.fromEntries(SYNCED_SETTINGS.filter((k) => k in s).map((k) => [k, s[k]]));

// ---------------- snapshot & merge (pure, tested) ----------------

export function snapshot(st, now = Date.now()) {
  return {
    app: 'daily-sync', version: 1, updated: now,
    settingsAt: st.settings.settingsAt || 0,
    settings: pickSettings(st.settings),
    cards: [...st.cards.values()],
    days: st.stats.days || {},
    games: st.stats.games || {},
    seenLessons: [...st.seenLessons],
    custom: st.custom || [],
    deleted: st.deleted || [],
    novela: st.novela || [],
  };
}

/** The more recently reviewed version of a card wins; notes like hooks and examples are kept from either. */
function newerCard(a, b) {
  if (!a) return b;
  if (!b) return a;
  const score = (c) => [c.last || 0, c.reps || 0, c.s ? 1 : 0];
  const [x, y] = [score(a), score(b)];
  const bWins = y[0] !== x[0] ? y[0] > x[0] : y[1] !== x[1] ? y[1] > x[1] : y[2] > x[2];
  const [win, lose] = bWins ? [b, a] : [a, b];
  return { ...win, hook: win.hook ?? lose.hook, examples: win.examples ?? lose.examples };
}

/** Day counters: each device counts what it did, so take the larger figure (never double count). */
function mergeDays(a = {}, b = {}) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] || {}, y = b[k] || {};
    const day = {};
    for (const f of new Set([...Object.keys(x), ...Object.keys(y)])) {
      day[f] = typeof (x[f] ?? y[f]) === 'number' ? Math.max(x[f] || 0, y[f] || 0) : (x[f] ?? y[f]);
    }
    out[k] = day;
  }
  return out;
}

function mergeNovela(a = [], b = []) {
  const byKey = new Map();
  for (const e of [...a, ...b]) {
    const k = `${e.date}|${e.title}`;
    const prev = byKey.get(k);
    byKey.set(k, prev ? { ...prev, read: prev.read || e.read } : e);
  }
  return [...byKey.values()]
    .sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : (x.n || 0) - (y.n || 0)))
    .map((e, i) => ({ ...e, n: i + 1 }))
    .slice(-60);
}

/**
 * Merge this device's snapshot with the one from the gist.
 * preferRemoteSettings: a device joining for the first time takes the synced settings.
 */
export function merge(local, remote, { preferRemoteSettings = false } = {}) {
  if (!remote) return local;
  const deleted = [...new Set([...(local.deleted || []), ...(remote.deleted || [])])];
  const gone = new Set(deleted);
  const cards = new Map();
  for (const c of [...(local.cards || []), ...(remote.cards || [])]) {
    if (!gone.has(c.id)) cards.set(c.id, newerCard(cards.get(c.id), c));
  }
  const custom = new Map();
  for (const c of [...(local.custom || []), ...(remote.custom || [])]) if (!gone.has(c.id) && !custom.has(c.id)) custom.set(c.id, c);
  const games = { ...(local.games || {}) };
  for (const [k, v] of Object.entries(remote.games || {})) games[k] = Math.max(games[k] || 0, v || 0);
  const remoteSettingsWin = remote.settings && (preferRemoteSettings || (remote.settingsAt || 0) > (local.settingsAt || 0));
  return {
    ...local,
    updated: Math.max(local.updated || 0, remote.updated || 0),
    settingsAt: remoteSettingsWin ? remote.settingsAt : local.settingsAt,
    settings: remoteSettingsWin ? { ...local.settings, ...remote.settings } : local.settings,
    cards: [...cards.values()],
    days: mergeDays(local.days, remote.days),
    games,
    seenLessons: [...new Set([...(local.seenLessons || []), ...(remote.seenLessons || [])])],
    custom: [...custom.values()].sort((a, b) => (a.at || 0) - (b.at || 0)),
    deleted,
    novela: mergeNovela(local.novela, remote.novela),
  };
}

// ---------------- GitHub Gist API ----------------

export class SyncError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function gh(token, path, { method = 'GET', body, fetchFn = fetch } = {}) {
  let res;
  try {
    res = await fetchFn(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new SyncError('Could not reach GitHub. Are you online?', 0);
  }
  if (!res.ok) {
    const hint = res.status === 401 ? 'The GitHub token was rejected. Check it, or make a new one.'
      : res.status === 403 || res.status === 404 ? 'The token can\'t use gists. Give it the Gists (read and write) permission.'
        : `GitHub said ${res.status}.`;
    throw new SyncError(hint, res.status);
  }
  return res.status === 204 ? null : res.json();
}

/** Find this app's gist on the account, or make a new secret one. Returns its id. */
export async function findOrCreateGist(token, { fetchFn = fetch, initial } = {}) {
  for (let page = 1; page <= 10; page++) {
    const list = await gh(token, `/gists?per_page=100&page=${page}`, { fetchFn });
    const hit = (list || []).find((g) => g.files && g.files[SYNC_FILE]);
    if (hit) return { id: hit.id, created: false };
    if (!list || list.length < 100) break;
  }
  const g = await gh(token, '/gists', {
    method: 'POST', fetchFn,
    body: { description: DESCRIPTION, public: false, files: { [SYNC_FILE]: { content: JSON.stringify(initial || {}) } } },
  });
  return { id: g.id, created: true };
}

export async function readGist(token, id, { fetchFn = fetch } = {}) {
  const g = await gh(token, `/gists/${id}`, { fetchFn });
  const f = g?.files?.[SYNC_FILE];
  if (!f) return null;
  let text = f.content;
  if (f.truncated && f.raw_url) {
    const r = await fetchFn(f.raw_url);
    if (!r.ok) throw new SyncError('Could not download the sync file from GitHub.', r.status);
    text = await r.text();
  }
  try {
    const j = JSON.parse(text || '{}');
    return j.app === 'daily-sync' ? j : null;
  } catch { return null; }
}

export function writeGist(token, id, data, { fetchFn = fetch } = {}) {
  return gh(token, `/gists/${id}`, { method: 'PATCH', fetchFn, body: { files: { [SYNC_FILE]: { content: JSON.stringify(data) } } } });
}

export async function checkToken(token, { fetchFn = fetch } = {}) {
  const u = await gh(token, '/user', { fetchFn });
  return u?.login || '';
}

// ---------------- one sync round ----------------

const sameCard = (a, b) => a && b && a.last === b.last && a.reps === b.reps && a.s === b.s && a.due === b.due && a.hook === b.hook && a.rung === b.rung;
const strip = (snap) => ({ ...snap, updated: 0 });

/** Save whatever the merge changed on this device. Returns true if anything changed. */
export async function applyMerged(st, store, local, merged) {
  let changed = false;
  for (const c of merged.cards) {
    if (!sameCard(st.cards.get(c.id), c)) { await store.saveCard(c); changed = true; }
  }
  for (const id of merged.deleted) {
    if (st.cards.has(id)) { await store.deleteCard(id); changed = true; }
  }
  if (JSON.stringify(merged.days) !== JSON.stringify(local.days) || JSON.stringify(merged.games) !== JSON.stringify(local.games)) {
    st.stats.days = merged.days;
    st.stats.games = merged.games;
    await store.saveStats();
    changed = true;
  }
  if (merged.seenLessons.length !== local.seenLessons.length) {
    st.seenLessons = new Set(merged.seenLessons);
    await store.saveSeenLessons();
  }
  const localCustom = new Set(local.custom.map((c) => c.id));
  const mergedCustom = new Set(merged.custom.map((c) => c.id));
  if (localCustom.size !== mergedCustom.size || [...mergedCustom].some((id) => !localCustom.has(id))) {
    local.custom.filter((c) => !mergedCustom.has(c.id)).forEach((c) => unregisterCustom(c.id));
    registerCustom(merged.custom.filter((c) => !localCustom.has(c.id)));
    st.custom = merged.custom;
    await store.saveCustom();
    changed = true;
  }
  if (merged.deleted.length !== local.deleted.length) {
    st.deleted = merged.deleted;
    await store.saveDeleted();
  }
  if (JSON.stringify(merged.novela) !== JSON.stringify(local.novela)) {
    st.novela = merged.novela;
    await store.saveNovela();
    changed = true;
  }
  if (merged.settings !== local.settings) {
    Object.assign(st.settings, merged.settings);
    st.settings.settingsAt = merged.settingsAt;
    await store.saveSettings({ fromSync: true });
    changed = true;
  }
  return changed;
}

/**
 * Pull, merge, save locally, push. Returns {changed, created} or null when sync is off.
 * The first sync on a device takes the synced settings from the gist (progress is merged either way).
 */
export async function runSync(st, store, { fetchFn = fetch, now = Date.now() } = {}) {
  const token = st.settings.syncToken;
  if (!token) return null;
  const first = !st.settings.syncAt;
  let id = st.settings.syncGistId;
  let remote = null;
  if (id) {
    try { remote = await readGist(token, id, { fetchFn }); }
    catch (err) { if (err.status !== 404) throw err; id = ''; } // gist deleted: find or make another
  }
  if (!id) {
    const r = await findOrCreateGist(token, { fetchFn, initial: snapshot(st, now) });
    id = r.id;
    if (!r.created) remote = await readGist(token, id, { fetchFn });
  }
  const local = snapshot(st, now);
  const merged = merge(local, remote, { preferRemoteSettings: first });
  const changed = await applyMerged(st, store, local, merged);
  if (!remote || JSON.stringify(strip(merged)) !== JSON.stringify(strip(remote))) {
    await writeGist(token, id, { ...merged, updated: now }, { fetchFn });
  }
  st.settings.syncGistId = id;
  st.settings.syncAt = now;
  await store.saveSettings({ fromSync: true });
  return { changed, created: !remote };
}
