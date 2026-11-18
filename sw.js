// Service worker: network-first (so updates show up straight away), cache fallback for offline.
// Also runs pocket quizzes: notifications you can answer without opening the app.
const CACHE = 'daily-v6';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/content.js', 'js/content-a1.js', 'js/content-a2.js', 'js/content-her.js',
  'js/stats.js', 'js/exercises.js', 'js/fsrs.js', 'js/grade.js',
  'js/session.js', 'js/speech.js', 'js/store.js',
  'js/openrouter.js', 'js/pronounce.js', 'js/recorder.js',
  'js/scenarios.js', 'js/talk.js', 'js/tutor.js',
  'js/pocket.js', 'js/extras.js', 'js/games.js', 'js/novela.js', 'js/walk.js', 'js/numbers.js', 'js/sync.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/badge-96.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});

// ---------------- pocket quizzes ----------------
// The app leaves a short list of words in the 'daily-pocket' database (see js/pocket.js).

const TITLE = 'Daily';
const ICON = 'icons/icon-192.png';
const BADGE = 'icons/badge-96.png';

function pdb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('daily-pocket', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function kv(mode, fn) {
  const db = await pdb();
  return new Promise((resolve, reject) => {
    const t = db.transaction('kv', mode);
    let out;
    fn(t.objectStore('kv'), (v) => { out = v; });
    t.oncomplete = () => { db.close(); resolve(out); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

const kvGet = (key) => kv('readonly', (s, set) => { const r = s.get(key); r.onsuccess = () => set(r.result); });

/** Pick the next word (rotating through the list, skipping ones already answered) and remember where we are. */
function nextItem() {
  return kv('readwrite', (s, set) => {
    const r = s.get('list');
    const a = s.get('answers');
    const n = s.get('next');
    n.onsuccess = () => {
      const list = r.result || [];
      const done = new Set((a.result || []).map((x) => x.id));
      let i = n.result || 0;
      for (let k = 0; k < list.length; k++, i++) {
        const it = list[i % list.length];
        if (!done.has(it.id)) { s.put(i + 1, 'next'); return set(it); }
      }
      set(list.length ? list[i % list.length] : null);
    };
  });
}

const question = (it) => (it.dir === 'en' ? it.en : it.pt);
const answer = (it) => (it.dir === 'en' ? it.pt : it.en);

function showQuestion(item) {
  return self.registration.showNotification(TITLE, {
    body: `${question(item)}  →  ?`,
    tag: 'pocket', renotify: true, icon: ICON, badge: BADGE,
    actions: [{ action: 'show', title: 'Show answer' }],
    data: { stage: 'q', item },
  });
}

function showAnswer(item) {
  return self.registration.showNotification(TITLE, {
    body: `${question(item)}  =  ${answer(item)}`,
    tag: 'pocket', silent: true, icon: ICON, badge: BADGE,
    actions: [{ action: 'yes', title: '✓ Knew it' }, { action: 'no', title: '✗ Not yet' }],
    data: { stage: 'a', item },
  });
}

async function showQuiz() {
  const item = await nextItem();
  if (!item) {
    return self.registration.showNotification(TITLE, {
      body: 'A minute for today?', tag: 'pocket', icon: ICON, badge: BADGE, data: { stage: 'open' },
    });
  }
  if (await kvGet('hide')) {
    return self.registration.showNotification(TITLE, {
      body: 'Tap to see today\'s card', tag: 'pocket', renotify: true, icon: ICON, badge: BADGE,
      actions: [{ action: 'show', title: 'Show' }],
      data: { stage: 'hidden', item },
    });
  }
  return showQuestion(item);
}

function saveAnswer(item, ok) {
  return kv('readwrite', (s) => {
    const r = s.get('answers');
    r.onsuccess = () => s.put([...(r.result || []), { id: item.id, ok, at: Date.now() }], 'answers');
  });
}

async function openApp() {
  const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (wins.length) return wins[0].focus();
  return self.clients.openWindow('./#/home');
}

self.addEventListener('push', (e) => {
  e.waitUntil(showQuiz());
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'pocket-test') e.waitUntil(showQuiz());
});

self.addEventListener('notificationclick', (e) => {
  const { stage, item } = e.notification.data || {};
  e.notification.close();
  e.waitUntil((async () => {
    if (stage === 'hidden') return showQuestion(item);
    if (stage === 'q') return showAnswer(item);
    if (stage === 'a' && (e.action === 'yes' || e.action === 'no')) return saveAnswer(item, e.action === 'yes');
    return openApp();
  })());
});
