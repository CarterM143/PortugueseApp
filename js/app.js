// App shell: routing, home, session runner, units, settings.

import * as store from './store.js';
import { state } from './store.js';
import { initSpeech, speak, speechAvailable, hasPtPtVoice, portugueseVoices, chosenVoice, stopSpeaking } from './speech.js';
import { UNITS, EAR, ITEM_BY_ID } from './content.js';
import { Session, buildQueue, chooseExercise, easierExercise, counts } from './session.js';
import { renderExercise, esc, ICON, stressMarkup } from './exercises.js';
import { diffWords } from './grade.js';
import { dayNumber } from './fsrs.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
let session = null;

const say = (text, opts) => speak(text, state.settings, opts);

// ---------------- routing ----------------

function route() {
  const [view, arg] = location.hash.replace(/^#\/?/, '').split('/');
  if (view !== 'session') { stopSpeaking(); }
  nav.hidden = view === 'session';
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#/${view || 'home'}`));
  switch (view) {
    case 'session': return session ? renderSession() : go('home', true);
    case 'units': return renderUnits();
    case 'unit': return renderUnit(arg);
    case 'settings': return renderSettings();
    case 'done': return renderDone();
    default: return renderHome();
  }
}

function go(view, replace = false) {
  const h = `#/${view}`;
  if (replace) history.replaceState(null, '', h); else location.hash = h;
  route();
}

// ---------------- home ----------------

function renderHome() {
  const today = store.todayStats();
  const c = counts(state, today);
  const st = store.streak();
  const voiceWarn = !speechAvailable()
    ? `<div class="banner warn"><b>No Portuguese voice found.</b> On Android: Settings → search "Text-to-speech" → Speech Services by Google → ⚙ → Install voice data → <b>Português (Portugal)</b>. Then reopen the app.</div>`
    : !hasPtPtVoice()
      ? `<div class="banner warn"><b>Only a Brazilian voice is available.</b> For the European accent, install <b>Português (Portugal)</b> voice data in your phone's text-to-speech settings.</div>`
      : '';
  const nothing = c.due === 0 && c.newToday === 0;
  app.innerHTML = `
    <header class="home-head">
      <h1>Olá! 👋</h1>
      <div class="streak" title="Day streak">🔥 ${st} day${st === 1 ? '' : 's'}</div>
    </header>
    ${voiceWarn}
    <section class="today card">
      <h2>Today</h2>
      <div class="stat-row">
        <div><span class="num">${c.due}</span><span class="lbl">reviews due</span></div>
        <div><span class="num">${c.newToday}</span><span class="lbl">new words</span></div>
        <div><span class="num">${today.reviews}</span><span class="lbl">done today</span></div>
      </div>
      ${nothing
        ? `<p class="done-msg">All done for today. Muito bem! 🎉</p>
           <div class="row">
             <button class="btn" data-act="practice">Practise more</button>
             ${c.unseen ? '<button class="btn" data-act="more">+5 new words</button>' : ''}
           </div>`
        : `<button class="btn primary big" data-act="start">${today.reviews ? 'Continue' : 'Start today\'s session'}</button>
           <p class="muted small">About ${Math.max(2, Math.round((c.due * 8 + c.newToday * 40) / 60))} min</p>`}
    </section>
    <section class="card">
      <h2>Progress</h2>
      <p>${c.learned} of ${UNITS.reduce((n, u) => n + u.items.length, 0)} words and phrases started.</p>
      <p class="muted small">Your reviews are scheduled to keep each item at about ${Math.round(state.settings.retention * 100)}% recall.</p>
    </section>`;
  app.querySelector('[data-act="start"]')?.addEventListener('click', () => startSession());
  app.querySelector('[data-act="practice"]')?.addEventListener('click', () => startSession({ practice: true }));
  app.querySelector('[data-act="more"]')?.addEventListener('click', () => startSession({ extraNew: 5 }));
}

async function startSession(opts = {}) {
  store.requestPersistence();
  const today = store.todayStats();
  const queue = buildQueue(state, today, opts);
  if (!queue.length) { toast('Nothing to practise yet. Learn some new words first.'); return; }
  session = new Session(store, queue);
  go('session');
}

// ---------------- session ----------------

function renderSession() {
  if (session.done) return finishSession();
  const entry = session.current;
  const item = session.item(entry);
  const card = session.card(entry);
  if (!item) { session.pos++; return renderSession(); }
  window.scrollTo(0, 0);

  app.innerHTML = `
    <div class="session">
      <div class="session-top">
        <button class="icon-btn close" data-act="quit" aria-label="End session">✕</button>
        <div class="progress"><div style="width:${Math.round(session.progress * 100)}%"></div></div>
      </div>
      <div class="exercise"></div>
      <div class="feedback" hidden></div>
    </div>`;
  app.querySelector('[data-act="quit"]').addEventListener('click', () => {
    if (session.summary.graded === 0 || confirm('End the session? Your progress so far is saved.')) finishSession();
  });

  const root = app.querySelector('.exercise');
  let type = chooseExercise(item, card, entry.mode, state, { canListen: speechAvailable() });

  const ctx = {
    settings: state.settings,
    rand: Math.random,
    speak: (text, opts) => say(text, opts),
    speakWord: null,
    done: (result, info = {}) => onResult(result, info, item, entry, type),
    switchTo: () => {
      type = easierExercise(item, type);
      renderExercise(type, root, { item, card, entry }, ctx);
    },
  };
  renderExercise(type, root, { item, card, entry }, ctx);
}

async function onResult(result, info, item, entry, type) {
  if (result === 'ack') {
    await session.acknowledge();
    return renderSession();
  }
  await session.answer(result);
  showFeedback(result, info, item, type);
}

const VERDICT = {
  correct: ['Correto!', 'good'],
  accent: ['Correct, but check the accents', 'good'],
  almost: ['Almost!', 'close'],
  wrong: ['Not quite', 'bad'],
};

function showFeedback(result, info, item, type) {
  const fb = app.querySelector('.feedback');
  const [title, cls] = VERDICT[result];
  const card = state.cards.get(item.id) || {};
  let detail = '';

  if (item.kind === 'vocab') {
    const answer = info.answer || item.pt;
    const shown = info.typed && result !== 'correct' && info.input
      ? diffWords(info.input, answer).map((w) => `<span class="${w.ok ? '' : 'miss'}">${esc(w.w)}</span>`).join(' ')
      : esc(answer);
    const why = {
      accent: `You wrote "${esc(info.input)}". Accents change the sound (and sometimes the meaning).`,
      article: 'Remember to include the article (o / a / um / uma).',
      typo: `You wrote "${esc(info.input)}". Just a small slip.`,
      hint: 'Counted as partly correct because you used a hint.',
    }[info.reason] || (result === 'wrong' && info.input ? `You wrote "${esc(info.input)}".` : '');
    detail = `
      <div class="fb-answer"><span class="pt">${shown}</span>
        <button class="icon-btn inline" data-act="play" aria-label="Play">${ICON.play}</button>
        <button class="icon-btn inline" data-act="slow" aria-label="Play slowly">${ICON.slow}</button></div>
      <div class="en">${esc(item.en)}</div>
      ${why ? `<p class="small">${why}</p>` : ''}
      ${item.note ? `<p class="note">${esc(item.note)}</p>` : ''}`;
  } else if (item.kind === 'pair') {
    detail = `<p>${info.heard ? 'You heard' : 'The answer is'} <b class="pt">${esc(info.target || '')}</b>.</p>
      <div class="row">${[item.a, item.b].map((w, i) => `<button class="btn small" data-say="${i}">${ICON.play} ${esc(w.pt)}</button>`).join('')}</div>
      ${item.note ? `<p class="note">${esc(item.note)}</p>` : ''}`;
  } else if (item.kind === 'stress') {
    detail = `<div class="fb-answer"><span class="pt">${stressMarkup(item)}</span>
      <button class="icon-btn inline" data-act="play" aria-label="Play">${ICON.play}</button></div><div class="en">${esc(item.en)}</div>`;
  }

  // Memory hook: offered once an item has been forgotten a couple of times
  const showHook = item.kind === 'vocab' && (card.hook || (result === 'wrong' && (card.lapses || 0) >= 2));
  const hook = showHook ? `
    <details class="hook-box" ${card.hook ? '' : 'open'}>
      <summary>💡 ${card.hook ? 'Your memory hook' : 'This one keeps slipping. Add a memory hook?'}</summary>
      <p class="small muted">Picture a vivid, silly image that links the sound to the meaning. Your own images work best.</p>
      <textarea rows="2" placeholder="e.g. pequeno-almoço: a PEQUENO (small) meal, AL-MOst lunch">${esc(card.hook || '')}</textarea>
      <button class="btn small" data-act="save-hook">Save</button>
    </details>` : '';

  fb.className = `feedback ${cls}`;
  fb.innerHTML = `<h3>${title}</h3>${detail}${hook}
    <button class="btn primary big" data-act="continue">Continue</button>`;
  fb.hidden = false;

  const text = item.kind === 'pair' ? null : item.pt;
  if (text) {
    fb.querySelector('[data-act="play"]')?.addEventListener('click', () => say(text));
    fb.querySelector('[data-act="slow"]')?.addEventListener('click', () => say(text, { rate: state.settings.slowRate }));
    if (type !== 'listen-mc' && type !== 'dictation') say(text);
  }
  fb.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => {
    say((b.dataset.say === '0' ? item.a : item.b).pt, { vary: true });
  }));
  fb.querySelector('[data-act="save-hook"]')?.addEventListener('click', async () => {
    const v = fb.querySelector('textarea').value.trim();
    const c = state.cards.get(item.id);
    if (c) { await store.saveCard({ ...c, hook: v || undefined }); toast('Saved'); }
  });
  const cont = fb.querySelector('[data-act="continue"]');
  cont.addEventListener('click', () => renderSession());
  cont.focus({ preventScroll: true });
  fb.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function finishSession() {
  lastSummary = session ? session.summary : null;
  session = null;
  stopSpeaking();
  go('done', true);
}

let lastSummary = null;

function renderDone() {
  const s = lastSummary || { graded: 0, correct: 0, newItems: 0, mistakes: [] };
  const acc = s.graded ? Math.round((s.correct / s.graded) * 100) : 0;
  const c = counts(state, store.todayStats());
  const tomorrow = [...state.cards.values()].filter((x) => x.due != null && x.due <= dayNumber() + 1).length;
  const missed = [...new Set(s.mistakes)].map((id) => ITEM_BY_ID.get(id)).filter((i) => i && i.kind === 'vocab');
  app.innerHTML = `
    <section class="card done">
      <h1>Muito bem! 🎉</h1>
      <div class="stat-row">
        <div><span class="num">${s.graded}</span><span class="lbl">answers</span></div>
        <div><span class="num">${acc}%</span><span class="lbl">accuracy</span></div>
        <div><span class="num">${s.newItems}</span><span class="lbl">new words</span></div>
      </div>
      <p class="muted">🔥 Streak: ${store.streak()} day(s). About ${tomorrow} review(s) due tomorrow.</p>
      ${acc && acc < 75 ? '<p class="small">That was a tough one. The app will ease the exercises a little next time.</p>' : ''}
      ${acc > 92 && s.graded >= 10 ? '<p class="small">Great accuracy. Exercises will get a bit harder to keep you learning.</p>' : ''}
      ${missed.length ? `<h3>Worth another look</h3><ul class="item-list">${missed.map((i) => `<li><span class="pt">${esc(i.pt)}</span><span class="en">${esc(i.en)}</span></li>`).join('')}</ul>` : ''}
      <button class="btn primary big" data-act="home">Done</button>
      ${c.due ? `<button class="btn" data-act="again">Keep going (${c.due} due)</button>` : ''}
    </section>`;
  app.querySelector('[data-act="home"]').addEventListener('click', () => go('home'));
  app.querySelector('[data-act="again"]')?.addEventListener('click', () => startSession());
}

// ---------------- units ----------------

function itemStatus(id) {
  const c = state.cards.get(id);
  if (!c || c.s == null) return ['new', 'New'];
  if (c.s >= 21) return ['known', 'Known'];
  return ['learning', 'Learning'];
}

function renderUnits() {
  const unitCards = UNITS.map((u) => {
    const started = u.items.filter((i) => state.cards.has(i.id)).length;
    const known = u.items.filter((i) => itemStatus(i.id)[0] === 'known').length;
    return `<a class="card unit-card" href="#/unit/${u.n}">
      <div class="unit-n">${u.n}</div>
      <div class="unit-info"><h3>${esc(u.title)}</h3><p class="muted small">${esc(u.subtitle)} · ${started}/${u.items.length} started · ${known} known</p>
      <div class="progress thin"><div style="width:${(started / u.items.length) * 100}%"></div></div></div></a>`;
  }).join('');
  const earStarted = EAR.filter((e) => state.cards.has(e.id)).length;
  app.innerHTML = `<h1>Units</h1>${unitCards}
    <a class="card unit-card" href="#/unit/ear"><div class="unit-n">👂</div>
      <div class="unit-info"><h3>Ear training</h3><p class="muted small">Sound pairs and word stress · ${earStarted}/${EAR.length} started</p></div></a>
    <p class="muted small">New items are introduced in order. Your daily session picks them up automatically.</p>`;
}

function renderUnit(n) {
  const isEar = n === 'ear';
  const u = isEar ? { title: 'Ear training', subtitle: 'Sound pairs and word stress', items: EAR, lessons: [] } : UNITS.find((x) => String(x.n) === n);
  if (!u) return go('units', true);
  app.innerHTML = `<a class="back" href="#/units">‹ Units</a><h1>${esc(u.title)}</h1><p class="muted">${esc(u.subtitle)}</p>
    ${u.lessons.length ? `<details class="card"><summary>Grammar notes (${u.lessons.length})</summary>${u.lessons.map((l) => `<h3>${esc(l.title)}</h3><div class="lesson-body">${l.body}</div>`).join('')}</details>` : ''}
    <ul class="item-list card">${u.items.map((i) => {
      const [cls, label] = itemStatus(i.id);
      const c = state.cards.get(i.id);
      const text = i.kind === 'pair' ? i.a.pt : i.pt;
      return `<li><button class="icon-btn inline" data-say="${esc(text)}" aria-label="Play">${ICON.play}</button>
        <span class="pt">${i.kind === 'stress' ? stressMarkup(i) : esc(i.pt)}</span><span class="en">${esc(i.en)}</span>
        <span class="chip ${cls}">${label}</span>${c?.hook ? `<span class="hook small">💡 ${esc(c.hook)}</span>` : ''}</li>`;
    }).join('')}</ul>`;
  app.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => say(b.dataset.say)));
}

// ---------------- settings ----------------

function renderSettings() {
  const s = state.settings;
  const voices = portugueseVoices();
  const cur = chosenVoice(s);
  app.innerHTML = `<h1>Settings</h1>
    <section class="card form">
      <label>New words per day <output>${s.newPerDay}</output>
        <input type="range" min="3" max="25" step="1" name="newPerDay" value="${s.newPerDay}"></label>
      <p class="muted small">10 is a good default. More new words means more reviews later on.</p>
      <label>Target recall <output>${Math.round(s.retention * 100)}%</output>
        <input type="range" min="0.8" max="0.95" step="0.01" name="retention" value="${s.retention}"></label>
      <p class="muted small">Higher means more frequent reviews. 90% is the usual sweet spot.</p>
      <label class="switch"><input type="checkbox" name="noTyping" ${s.noTyping ? 'checked' : ''}> No typing (use tiles and choices)</label>
    </section>
    <section class="card form">
      <h2>Voice</h2>
      ${voices.length ? `<label>Voice <select name="voiceURI">${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${cur && v.voiceURI === cur.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select></label>`
        : '<p class="warn">No Portuguese voices installed. See the note on the home screen.</p>'}
      <label>Speed <output>${s.rate}</output><input type="range" min="0.5" max="1.2" step="0.05" name="rate" value="${s.rate}"></label>
      <label>Slow speed <output>${s.slowRate}</output><input type="range" min="0.3" max="0.9" step="0.05" name="slowRate" value="${s.slowRate}"></label>
      <button class="btn" data-act="test">${ICON.play} Test: "Bom dia, tudo bem?"</button>
    </section>
    <section class="card form">
      <h2>Backup</h2>
      <p class="muted small">Your progress is stored only on this phone. Export a backup now and then.</p>
      <div class="row"><button class="btn" data-act="export">Export backup</button>
      <label class="btn">Import backup<input type="file" accept="application/json,.json" hidden name="import"></label></div>
      <button class="btn danger" data-act="reset">Reset all progress</button>
    </section>
    <p class="muted small center">Português · v${window.APP_VERSION || ''}</p>`;

  app.querySelectorAll('input[type="range"]').forEach((r) => r.addEventListener('input', () => {
    const out = r.parentElement.querySelector('output');
    out.textContent = r.name === 'retention' ? `${Math.round(r.value * 100)}%` : r.value;
    s[r.name] = Number(r.value);
    store.saveSettings();
  }));
  app.querySelector('[name="noTyping"]').addEventListener('change', (e) => { s.noTyping = e.target.checked; store.saveSettings(); });
  app.querySelector('[name="voiceURI"]')?.addEventListener('change', (e) => { s.voiceURI = e.target.value; store.saveSettings(); say('Olá! Bom dia.'); });
  app.querySelector('[data-act="test"]').addEventListener('click', () => say('Bom dia, tudo bem?'));
  app.querySelector('[data-act="export"]').addEventListener('click', () => {
    const blob = new Blob([store.exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `portugues-backup-${store.todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  app.querySelector('[name="import"]').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      await store.importData(await f.text());
      toast('Backup restored');
      renderSettings();
    } catch (err) { toast(`Import failed: ${err.message}`); }
  });
  app.querySelector('[data-act="reset"]').addEventListener('click', async () => {
    if (confirm('Delete ALL progress on this phone? This cannot be undone (unless you have a backup).')) {
      await store.resetAll();
      toast('Progress reset');
      go('home');
    }
  });
}

// ---------------- misc ----------------

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

async function boot() {
  await store.load();
  await initSpeech();
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot().catch((err) => {
  app.innerHTML = `<div class="banner warn">Something went wrong starting the app: ${esc(err.message)}</div>`;
  console.error(err);
});
