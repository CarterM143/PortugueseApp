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
  stats: { days: {}, recent: [] }, // days: {'YYYY-MM-DD': {reviews, correct, newItems}}
  seenLessons: new Set(),
};

export async function load() {
  const [cards, settings, stats, seen] = await Promise.all([
    run('cards', 'readonly', (s) => s.getAll()),
    run('meta', 'readonly', (s) => s.get('settings')),
    run('meta', 'readonly', (s) => s.get('stats')),
    run('meta', 'readonly', (s) => s.get('seenLessons')),
  ]);
  state.cards = new Map((cards || []).map((c) => [c.id, c]));
  state.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  state.stats = { days: {}, recent: [], ...(stats || {}) };
  state.seenLessons = new Set(seen || []);
}

export function saveCard(card) {
  state.cards.set(card.id, card);
  return run('cards', 'readwrite', (s) => s.put(card));
}

export function saveSettings() {
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
  if (!state.stats.days[todayKey(d)]?.reviews) d.setDate(d.getDate() - 1);
  while (state.stats.days[todayKey(d)]?.reviews) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function exportData() {
  return JSON.stringify({
    app: 'portugues', version: 1, exported: new Date().toISOString(),
    cards: [...state.cards.values()],
    settings: state.settings, stats: state.stats, seenLessons: [...state.seenLessons],
  });
}

export async function importData(json) {
  const data = JSON.parse(json);
  if (data.app !== 'portugues' || !Array.isArray(data.cards)) throw new Error('Not a backup file from this app.');
  await run('cards', 'readwrite', (s) => { s.clear(); data.cards.forEach((c) => s.put(c)); });
  state.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  state.stats = { days: {}, recent: [], ...data.stats };
  state.seenLessons = new Set(data.seenLessons || []);
  await Promise.all([saveSettings(), saveStats(),
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
