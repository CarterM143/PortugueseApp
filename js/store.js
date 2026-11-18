// Persistent state in IndexedDB: card memory states, settings, stats.
// Everything lives on this device only. Export/import gives a backup file.

const DB_NAME = 'portugues';
const DB_VERSION = 1;

export const DEFAULT_SETTINGS = {
  newPerDay: 10,       // new vocab items per day
  earNewPerDay: 2,     // new ear-training items per day
  retention: 0.9,      // FSRS target recall probability
  rate: 0.9,           // normal speech rate
  slowRate: 0.6,       // "slow" button rate
  voiceURI: null,      // chosen pt-PT voice
  noTyping: false,     // tiles / choices instead of typing
  maxReviews: 120,     // safety cap per session
  sessionMinutes: 20,  // session length budget (0 = no limit); reviews first, new words fill the rest
  // Speaking & AI (Phase 2)
  speaking: true,      // include speaking exercises when a speech engine is available
  sttEngine: 'auto',   // auto | openrouter | phone
  apiKey: '',          // OpenRouter key: stays on this device, never exported
  sttModel: 'openai/whisper-large-v3',
  coachModel: 'mistralai/voxtral-small-24b-2507',
  // Conversation tutor (Phase 3)
  tutorModel: 'mistralai/voxtral-small-24b-2507',
  tutorShowEn: false,  // show English under tutor lines automatically
  handsFreePause: 2.5, // seconds of silence before hands-free stops listening
  // Reveal Day (Phase 5)
  herPack: false,      // mix the "Para ela" pack into new words
  herName: '',         // used in the Reveal Day role-plays
  herFamily: '',       // free text about her family, for the family-lunch role-play
  revealDate: '',      // YYYY-MM-DD
  // Pocket quizzes (Phase 5)
  pocketHide: false,   // first notification says nothing until tapped
  // Walk mode
  walkPause: 4,        // seconds to answer before the Portuguese is played
  // Sync (GitHub Gist)
  syncToken: '',       // GitHub token: stays on this device, never exported or synced
  syncGistId: '',
  syncAt: 0,           // last successful sync (ms)
  settingsAt: 0,       // when a synced setting last changed (ms)
};

let dbPromise;
function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('cards')) db.createObjectStore('cards', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function run(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// ---- In-memory state, written through to IndexedDB ----

export const state = {
  cards: new Map(),            // id -> {id, s, d, due, last, reps, lapses, rung, hook}
  settings: { ...DEFAULT_SETTINGS },
  // days: {'YYYY-MM-DD': {reviews, correct, newItems, newEar, recallN, recallOk, seconds, talks, talkMinutes}}
  stats: { days: {}, recent: [] },  // also: sounds, games {blitz, ear, numbers: best scores}
  seenLessons: new Set(),
  custom: [],                  // your own words: [{id, pt, en, note, source, at}]
  novela: [],                  // story episodes, newest last
  deleted: [],                 // ids of your own words you deleted (so sync doesn't bring them back)
};

// Settings that follow you between devices (kept in step with sync.js SYNCED_SETTINGS).
export const SYNCED = ['newPerDay', 'earNewPerDay', 'retention', 'sessionMinutes', 'maxReviews', 'noTyping', 'speaking',
  'tutorModel', 'sttModel', 'coachModel', 'tutorShowEn', 'handsFreePause',
  'herPack', 'herName', 'herFamily', 'revealDate', 'revealMessage', 'pocketHide', 'walkPause'];
const syncedJson = (s) => JSON.stringify(SYNCED.map((k) => s[k]));
let lastSynced = '';

export async function load() {
  const [cards, settings, stats, seen, custom, novela, deleted] = await Promise.all([
    run('cards', 'readonly', (s) => s.getAll()),
    run('meta', 'readonly', (s) => s.get('settings')),
    run('meta', 'readonly', (s) => s.get('stats')),
    run('meta', 'readonly', (s) => s.get('seenLessons')),
    run('meta', 'readonly', (s) => s.get('custom')),
    run('meta', 'readonly', (s) => s.get('novela')),
    run('meta', 'readonly', (s) => s.get('deleted')),
  ]);
  state.cards = new Map((cards || []).map((c) => [c.id, c]));
  state.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  state.stats = { days: {}, recent: [], ...(stats || {}) };
  state.seenLessons = new Set(seen || []);
  state.custom = custom || [];
  state.novela = novela || [];
  state.deleted = deleted || [];
  lastSynced = syncedJson(state.settings);
}

export function saveDeleted() {
  return run('meta', 'readwrite', (s) => s.put(state.deleted, 'deleted'));
}

/** Replace the seen-lessons list (used by sync). */
export function saveSeenLessons() {
  return run('meta', 'readwrite', (s) => s.put([...state.seenLessons], 'seenLessons'));
}

export function saveCustom() {
  return run('meta', 'readwrite', (s) => s.put(state.custom, 'custom'));
}

export function saveNovela() {
  state.novela = state.novela.slice(-60);
  return run('meta', 'readwrite', (s) => s.put(state.novela, 'novela'));
}

export function deleteCard(id) {
  state.cards.delete(id);
  return run('cards', 'readwrite', (s) => s.delete(id));
}

export function saveCard(card) {
  state.cards.set(card.id, card);
  return run('cards', 'readwrite', (s) => s.put(card));
}

export function saveSettings({ fromSync = false } = {}) {
  // Note when a setting that syncs changed, so the newest choice wins across devices
  const now = syncedJson(state.settings);
  if (now !== lastSynced) {
    if (!fromSync) state.settings.settingsAt = Date.now();
    lastSynced = now;
  }
  return run('meta', 'readwrite', (s) => s.put(state.settings, 'settings'));
}

export function saveStats() {
  return run('meta', 'readwrite', (s) => s.put(state.stats, 'stats'));
}

export function markLessonSeen(id) {
  state.seenLessons.add(id);
  return run('meta', 'readwrite', (s) => s.put([...state.seenLessons], 'seenLessons'));
}

export function todayKey(date = new Date()) {
  // Day rolls over at 4am, matching fsrs.dayNumber
  const d = new Date(date.getTime() - 4 * 3600000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayStats() {
  const k = todayKey();
  if (!state.stats.days[k]) state.stats.days[k] = { reviews: 0, correct: 0, newItems: 0 };
  return state.stats.days[k];
}

/** Consecutive days (ending today, or yesterday if today isn't done yet) with any reviews. */
export function streak() {
  let n = 0;
  const d = new Date();
  const active = (day) => !!(day && (day.reviews || day.talks));
  if (!active(state.stats.days[todayKey(d)])) d.setDate(d.getDate() - 1);
  while (active(state.stats.days[todayKey(d)])) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function exportData() {
  return JSON.stringify({
    app: 'portugues', version: 1, exported: new Date().toISOString(),
    cards: [...state.cards.values()],
    // never put the API key or GitHub token in a backup file
    settings: { ...state.settings, apiKey: '', syncToken: '', syncGistId: '', syncAt: 0 },
    stats: state.stats, seenLessons: [...state.seenLessons],
    custom: state.custom, novela: state.novela, deleted: state.deleted,
  });
}

export async function importData(json) {
  const data = JSON.parse(json);
  if (data.app !== 'portugues' || !Array.isArray(data.cards)) throw new Error('Not a backup file from this app.');
  await run('cards', 'readwrite', (s) => { s.clear(); data.cards.forEach((c) => s.put(c)); });
  const keep = { apiKey: state.settings.apiKey, syncToken: state.settings.syncToken, syncGistId: state.settings.syncGistId, syncAt: state.settings.syncAt };
  state.settings = { ...DEFAULT_SETTINGS, ...data.settings, ...keep };
  state.deleted = data.deleted || [];
  state.stats = { days: {}, recent: [], ...data.stats };
  state.seenLessons = new Set(data.seenLessons || []);
  state.custom = data.custom || [];
  state.novela = data.novela || [];
  await Promise.all([saveSettings(), saveStats(), saveCustom(), saveNovela(), saveDeleted(),
    run('meta', 'readwrite', (s) => s.put([...state.seenLessons], 'seenLessons'))]);
  await load();
}

export async function resetAll() {
  await run('cards', 'readwrite', (s) => s.clear());
  await run('meta', 'readwrite', (s) => s.clear());
  await load();
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* not critical */ }
}
