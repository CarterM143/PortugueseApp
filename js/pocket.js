// Pocket quizzes: a tiny quiz in a notification, answered without opening the app.
//
// How it fits together:
//   - GitHub Actions sends an empty Web Push 3 times a day (scripts/push.mjs).
//   - The service worker picks a card from a short list this app leaves in IndexedDB
//     (the words you're closest to forgetting), shows "the train → ?", then the answer
//     with ✓ / ✗ buttons, and stores what you tapped.
//   - Next time the app opens, those answers are applied to your schedule like any review.
// Nothing about your words ever leaves the phone: the push itself carries no content.

import { schedule, Rating, retrievability } from './fsrs.js';
import { ITEM_BY_ID } from './content.js';

export const VAPID_PUBLIC = 'BEi-D5XWwr3gdprqLXYYTF2RSs-UYEuTZg1BDQ9V6KIV84wRnvt7Fl4pctjdtAFXT0RXir33UKWtP7QsPf5YW-o';
const DAY_MS = 86400000;

// ---------- pure logic (tested) ----------

/** Words for pocket quizzes: started vocab, the ones you're closest to forgetting first. */
export function pickPocketItems(st, now = Date.now(), n = 12) {
  return [...st.cards.values()]
    .filter((c) => c.s && ITEM_BY_ID.get(c.id)?.kind === 'vocab')
    .map((c) => ({ c, r: retrievability(Math.max(0, (now - c.last) / DAY_MS), c.s) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, n)
    .map(({ c }, i) => {
      const it = ITEM_BY_ID.get(c.id);
      // Stronger words: English → say the Portuguese (harder). Newer words: Portuguese → meaning.
      return { id: it.id, pt: it.pt, en: it.en, dir: c.s >= 4 && i % 2 === 0 ? 'en' : 'pt' };
    });
}

/** Turn stored ✓/✗ taps into card updates. Answers older than the card's last review are skipped. */
export function pocketUpdates(st, answers) {
  const latest = new Map();
  const out = [];
  for (const a of answers.slice().sort((x, y) => x.at - y.at)) {
    const prev = latest.get(a.id) || st.cards.get(a.id);
    if (!prev || !prev.s || a.at <= prev.last) continue;
    const mem = schedule(prev, a.ok ? Rating.Good : Rating.Again, a.at, { retention: st.settings.retention });
    const card = { ...prev, ...mem };
    latest.set(a.id, card);
    out.push({ card, at: a.at, ok: !!a.ok });
  }
  return out;
}

// ---------- the small shared database (also opened by sw.js) ----------

const DB = 'daily-pocket';

function open() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction('kv', mode);
    let out;
    fn(t.objectStore('kv'), (v) => { out = v; });
    t.oncomplete = () => { db.close(); resolve(out); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

/** Leave the next quiz words (and the discreet setting) where the service worker can find them. */
export async function syncPocket(st) {
  if (typeof indexedDB === 'undefined') return;
  const list = pickPocketItems(st);
  await tx('readwrite', (s) => { s.put(list, 'list'); s.put(!!st.settings.pocketHide, 'hide'); s.put(0, 'next'); });
}

/** Read and clear the ✓/✗ answers the service worker stored. */
export function takeAnswers() {
  if (typeof indexedDB === 'undefined') return Promise.resolve([]);
  return tx('readwrite', (s, set) => {
    const r = s.get('answers');
    r.onsuccess = () => { set(r.result || []); s.put([], 'answers'); };
  });
}

// ---------- push subscription ----------

export const pushSupported = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64url.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribe() {
  if (!pushSupported()) throw new Error('This browser does not support notifications. Use Chrome.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications are blocked. Allow them in Chrome: ⋮ → Settings → Site settings → Notifications.');
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription())
    || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) });
}

export async function unsubscribe() {
  const sub = await currentSubscription();
  if (sub) await sub.unsubscribe();
}

/** Show a pocket quiz right now, through the same service-worker code the real pushes use. */
export async function testPocket() {
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage({ type: 'pocket-test' });
}
