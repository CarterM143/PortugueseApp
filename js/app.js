// App shell: routing, home, session runner, units, settings.

import * as store from './store.js';
import { state } from './store.js';
import { initSpeech, speak, speechAvailable, hasPtPtVoice, portugueseVoices, chosenVoice, stopSpeaking } from './speech.js';
import { UNITS, EAR, ITEM_BY_ID, HER, MINE, registerCustom } from './content.js';
import { Session, buildQueue, chooseExercise, easierExercise, counts, estimateMinutes, MAX_RUNG, MAX_RUNG_SILENT } from './session.js';
import { pocketUpdates, takeAnswers, syncPocket, pushSupported, currentSubscription, subscribe, unsubscribe, testPocket } from './pocket.js';
import { renderReveal, renderCapture, setShared, daysUntil } from './extras.js';
import { renderNovela } from './novela.js';
import { renderWalk } from './walk.js';
import { renderGames, renderGame } from './games.js';
import { renderStats } from './stats.js';
import { levelOf } from './content.js';
import { renderExercise, esc, ICON, stressMarkup } from './exercises.js';
import { diffWords } from './grade.js';
import { dayNumber, intervalFor } from './fsrs.js';
import { AudioCapture, PhoneRecognition, micAvailable, phoneRecognitionAvailable } from './recorder.js';
import { transcribe, coachPronunciation, keyInfo, COACH_SUGGESTIONS, DEFAULT_MODELS } from './openrouter.js';
import { assessSpeech, soundFeatures, SOUND_FEATURES } from './pronounce.js';
import { exampleSentences, suggestHook } from './openrouter.js';
import { renderTalkList, renderTalk, recommendedScenario } from './talk.js';
import { TUTOR_SUGGESTIONS, DEFAULT_TUTOR_MODEL } from './tutor.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
let session = null;
let activeCapture = null;

const say = (text, opts) => speak(text, state.settings, opts);

// ---------------- speech recognition ----------------

/** Which recogniser to use: 'openrouter' | 'phone' | null */
function sttEngine() {
  const s = state.settings;
  const or = !!s.apiKey && micAvailable();
  const phone = phoneRecognitionAvailable();
  if (s.sttEngine === 'openrouter') return or ? 'openrouter' : null;
  if (s.sttEngine === 'phone') return phone ? 'phone' : null;
  return or ? 'openrouter' : phone ? 'phone' : null;
}

const speakingEnabled = () => state.settings.speaking && !!sttEngine() && navigator.onLine !== false;

function makeListener() {
  const engine = sttEngine();
  let cap = null;
  return {
    engine,
    async start(opts = {}) {
      cap = engine === 'openrouter' ? new AudioCapture() : new PhoneRecognition('pt-PT');
      activeCapture = cap;
      try {
        await cap.start(opts);
      } catch (err) {
        cap = null;
        activeCapture = null;
        if (err?.name === 'NotAllowedError') throw new Error('Microphone permission was denied. Allow it in Chrome: ⋮ → Settings → Site settings → Microphone.');
        throw err;
      }
    },
    async stop() {
      const c = cap;
      cap = null;
      activeCapture = null;
      if (!c) return { transcripts: [], audio: null };
      const res = await c.stop();
      if (engine === 'phone') return { transcripts: res.transcripts, audio: null };
      if (!res.audio) return { transcripts: [], audio: null };
      const text = await transcribe(state.settings.apiKey, res.audio.b64, { model: state.settings.sttModel || DEFAULT_MODELS.stt });
      return { transcripts: text ? [text] : [], audio: res.audio };
    },
    cancel() {
      cap?.cancel();
      cap = null;
      activeCapture = null;
    },
  };
}

/** Count which tricky sounds keep going wrong; every 3rd miss pulls related ear training forward. */
async function noteSoundErrors(missed) {
  const feats = soundFeatures(missed || []);
  if (!feats.length) return;
  const sounds = (state.stats.sounds ||= {});
  const boosted = [];
  for (const f of feats) {
    sounds[f] = (sounds[f] || 0) + 1;
    if (sounds[f] % 3 === 0) {
      const feat = SOUND_FEATURES.find((x) => x.id === f);
      let any = false;
      for (const id of feat.ear) {
        const c = state.cards.get(id);
        if (c && c.due > dayNumber()) { await store.saveCard({ ...c, due: dayNumber() }); any = true; }
      }
      if (any) boosted.push(feat.label);
    }
  }
  await store.saveStats();
  if (boosted.length) toast(`Extra ear practice added for ${boosted.join(', ')}`);
}

// ---------------- routing ----------------

let talkCleanup = null;

function talkDeps() {
  return { state, store, say, stopSpeaking, makeListener, sttEngine, toast, go, rerender: route, rehearse };
}

function route() {
  const [view, arg, arg2] = location.hash.replace(/^#\/?/, '').split('/');
  activeCapture?.cancel();
  activeCapture = null;
  talkCleanup?.();
  talkCleanup = null;
  stopSpeaking();
  window.scrollTo(0, 0);
  const immersive = view === 'session' || (view === 'talk' && !!arg) || (view === 'games' && !!arg && (arg !== 'numbers' || !!arg2));
  nav.hidden = immersive;
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#/${view || 'home'}`));
  const d = talkDeps();
  switch (view) {
    case 'session': return session ? renderSession() : go('home', true);
    case 'talk':
      if (!arg) return renderTalkList(app, d);
      talkCleanup = renderTalk(app, arg, arg2 || 'script', d);
      return;
    case 'reveal': return renderReveal(app, d);
    case 'capture': return renderCapture(app, d);
    case 'novela': talkCleanup = renderNovela(app, arg, d); return;
    case 'walk': talkCleanup = renderWalk(app, d); return;
    case 'games': talkCleanup = arg ? renderGame(app, arg, arg2, d) : renderGames(app, d); return;
    case 'stats': return renderStats(app, { state, store, say, ICON });
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
  // What the next session will actually contain (session length may hold some back)
  const plan = buildQueue(state, today);
  const planReviews = plan.filter((e) => e.mode === 'review').length;
  const planNew = plan.filter((e) => e.mode === 'first' && ITEM_BY_ID.get(e.id)?.kind === 'vocab').length;
  const heldBack = c.due - planReviews;
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
        <div><span class="num">${nothing ? 0 : planNew}</span><span class="lbl">new words</span></div>
        <div><span class="num">${today.reviews}</span><span class="lbl">done today</span></div>
      </div>
      ${nothing
        ? `<p class="done-msg">All done for today. Muito bem! 🎉</p>
           <div class="row">
             <button class="btn" data-act="practice">Practise more</button>
             ${c.unseen ? '<button class="btn" data-act="more">+5 new words</button>' : ''}
           </div>`
        : `<button class="btn primary big" data-act="start">${today.reviews ? 'Continue' : 'Start today\'s session'}</button>
           <p class="muted small">About ${estimateMinutes(plan)} min${heldBack > 0
             ? ` · ${heldBack} review${heldBack === 1 ? '' : 's'} saved for a second round (session length is set to ${state.settings.sessionMinutes} min)`
             : planNew < c.newToday && state.settings.sessionMinutes ? ' · fewer new words today so reviews fit your session length' : ''}</p>`}
    </section>
    ${tilesHtml()}
    <section class="card">
      <h2>Progress</h2>
      <p>${c.learned} of ${UNITS.reduce((n, u) => n + u.items.length, 0) + (state.settings.herPack ? HER.items.length : 0) + MINE.length} words and phrases started.</p>
      <p class="muted small">Your reviews are scheduled to keep each item at about ${Math.round(state.settings.retention * 100)}% recall. <a href="#/stats">See your stats ›</a></p>
      <p class="muted small">🎤 Speaking: ${speakingEnabled()
        ? `on (${sttEngine() === 'openrouter' ? 'OpenRouter Whisper' : 'phone recogniser'})`
        : state.settings.speaking ? 'no speech engine available. Add an OpenRouter key in Settings, or use Chrome on Android.' : 'off'}</p>
    </section>
    ${soundsCard()}`;
  app.querySelector('[data-act="start"]')?.addEventListener('click', () => startSession());
  app.querySelector('[data-act="practice"]')?.addEventListener('click', () => startSession({ practice: true }));
  app.querySelector('[data-act="more"]')?.addEventListener('click', () => startSession({ extraNew: 5 }));
}

function tilesHtml() {
  const days = daysUntil(state.settings.revealDate);
  const reveal = days == null || days < 0 ? 'Reveal Day' : days === 0 ? 'Today! 💍' : `${days} day${days === 1 ? '' : 's'}`;
  return `<nav class="tiles" aria-label="More ways to practise">
    <a href="#/capture"><span>✍️</span>Add a word</a>
    <a href="#/novela"><span>📖</span>Novela</a>
    <a href="#/walk"><span>🎧</span>Walk</a>
    <a href="#/games"><span>🎮</span>Games</a>
    <a href="#/reveal"><span>💍</span>${reveal}</a>
  </nav>`;
}

/** Reveal Day: practise saying your message, line by line (speaking if possible, tiles if not). */
function rehearse(lines) {
  if (!lines?.length) return;
  const queue = [];
  lines.forEach((l, i) => {
    const id = `tmp-reveal-${i}`;
    ITEM_BY_ID.set(id, { id, kind: 'vocab', unit: 'mine', pt: l.pt, en: l.en, accept: [] });
    queue.push({ id, mode: 'intro' }, { id, mode: 'reask', force: 'speak-read' });
  });
  lines.forEach((_, i) => queue.push({ id: `tmp-reveal-${i}`, mode: 'reask', force: 'speak-translate' }));
  session = new Session(store, queue, { maxRung: speakingEnabled() ? MAX_RUNG : MAX_RUNG_SILENT });
  session.rehearsal = true;
  go('session');
}

function soundsCard() {
  const top = Object.entries(state.stats.sounds || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!top.length) return '';
  return `<section class="card"><h2>Sounds to work on</h2><ul class="sounds">${top.map(([id, n]) => {
    const f = SOUND_FEATURES.find((x) => x.id === id);
    return f ? `<li>${esc(f.label)} <span class="chip learning">${n}×</span></li>` : '';
  }).join('')}</ul><p class="muted small">From your speaking exercises. Related ear training is brought forward automatically.</p></section>`;
}

async function startSession(opts = {}) {
  store.requestPersistence();
  const today = store.todayStats();
  const queue = buildQueue(state, today, opts);
  if (!queue.length) { toast('Nothing to practise yet. Learn some new words first.'); return; }
  session = new Session(store, queue, { maxRung: speakingEnabled() ? MAX_RUNG : MAX_RUNG_SILENT });
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
  const canSpeak = speakingEnabled() && !session.noSpeak;
  let type = chooseExercise(item, card, entry.mode, state, { canListen: speechAvailable(), canSpeak });
  if (entry.force) {
    // Rehearsal: speaking if possible, otherwise building the sentence from tiles
    type = canSpeak ? entry.force : state.settings.noTyping || entry.force === 'speak-read' ? 'tiles' : 'type';
  }

  const ctx = {
    settings: state.settings,
    rand: Math.random,
    speak: (text, opts) => say(text, opts),
    stopSpeaking,
    speakWord: null,
    listen: makeListener(),
    assess: assessSpeech,
    done: (result, info = {}) => onResult(result, info, item, entry, type),
    switchTo: (why) => {
      if (why === 'nospeak') {
        session.noSpeak = true;
        toast('Speaking paused for the rest of this session');
      }
      type = easierExercise(item, type, { noTyping: state.settings.noTyping });
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
  if (info.spoken && !info.selfGraded && info.missed?.length) noteSoundErrors(info.missed);
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
    const spoken = !info.spoken ? ''
      : info.selfGraded ? '<p class="small">You marked this as said correctly. Trust your ear!</p>'
        : info.dunno ? ''
          : `<p class="small">I heard: <b>“${esc(info.heard || '…')}”</b></p>`;
    const coachUI = info.spoken && info.audio ? `
      <div class="row">
        <button class="btn small" data-act="my-audio">${ICON.play} My recording</button>
        ${state.settings.apiKey ? '<button class="btn small" data-act="coach">🧑‍🏫 Pronunciation tips</button>' : ''}
      </div><div class="coach-out small"></div>` : '';
    detail = `
      <div class="fb-answer"><span class="pt">${shown}</span>
        <button class="icon-btn inline" data-act="play" aria-label="Play">${ICON.play}</button>
        <button class="icon-btn inline" data-act="slow" aria-label="Play slowly">${ICON.slow}</button></div>
      <div class="en">${esc(item.en)}</div>
      ${why ? `<p class="small">${why}</p>` : ''}
      ${spoken}${coachUI}
      ${card.examples?.length ? examplesHtml(card.examples)
        : state.settings.apiKey ? '<button class="btn ghost small" data-act="examples">➕ Example sentences</button><div class="examples-out"></div>' : ''}
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
      <div class="row"><button class="btn small" data-act="save-hook">Save</button>
      ${state.settings.apiKey ? '<button class="btn ghost small" data-act="suggest-hook">✨ Suggest one</button>' : ''}</div>
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
  fb.querySelectorAll('[data-say-ex]').forEach((b) => b.addEventListener('click', () => say(b.dataset.sayEx)));
  fb.querySelector('[data-act="examples"]')?.addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    const out = fb.querySelector('.examples-out');
    btn.disabled = true;
    out.textContent = 'Writing examples…';
    try {
      const ex = await exampleSentences(state.settings.apiKey, item, { model: state.settings.tutorModel || DEFAULT_TUTOR_MODEL });
      const c = state.cards.get(item.id);
      if (c && ex.length) await store.saveCard({ ...c, examples: ex });
      btn.remove();
      out.innerHTML = examplesHtml(ex);
      out.querySelectorAll('[data-say-ex]').forEach((b) => b.addEventListener('click', () => say(b.dataset.sayEx)));
    } catch (err) { out.textContent = err.message; btn.disabled = false; }
  });
  fb.querySelector('[data-act="suggest-hook"]')?.addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Thinking…';
    try {
      fb.querySelector('.hook-box textarea').value = await suggestHook(state.settings.apiKey, item, { model: state.settings.tutorModel || DEFAULT_TUTOR_MODEL });
      btn.textContent = '✨ Another';
    } catch (err) { toast(err.message); btn.textContent = '✨ Suggest one'; }
    btn.disabled = false;
  });
  fb.querySelector('[data-act="my-audio"]')?.addEventListener('click', () => {
    const url = URL.createObjectURL(info.audio.blob);
    const a = new Audio(url);
    a.onended = () => URL.revokeObjectURL(url);
    a.play();
  });
  fb.querySelector('[data-act="coach"]')?.addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    const out = fb.querySelector('.coach-out');
    btn.disabled = true;
    out.textContent = 'Listening to your recording…';
    try {
      const r = await coachPronunciation(state.settings.apiKey, info.audio.b64, info.answer || item.pt, { model: state.settings.coachModel || DEFAULT_MODELS.coach });
      const verdict = { good: '✅ Sounds good', close: '🟡 Nearly there', unclear: '🔴 Hard to make out' }[r.verdict] || '';
      out.innerHTML = `${verdict ? `<p><b>${verdict}</b>${r.heard ? ` (heard “${esc(r.heard)}”)` : ''}</p>` : ''}
        ${(r.tips || []).length ? `<ul>${r.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}`;
    } catch (err) {
      out.textContent = err.message;
      btn.disabled = false;
    }
  });
  const cont = fb.querySelector('[data-act="continue"]');
  cont.addEventListener('click', () => renderSession());
  cont.focus({ preventScroll: true });
  fb.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function examplesHtml(list) {
  return `<ul class="examples">${list.map((e) => `<li><button class="icon-btn inline" data-say-ex="${esc(e.pt)}" aria-label="Play">${ICON.play}</button>
    <span><span class="pt">${esc(e.pt)}</span><br><span class="muted small">${esc(e.en || '')}</span></span></li>`).join('')}</ul>`;
}

function finishSession() {
  const wasRehearsal = session?.rehearsal;
  lastSummary = session ? session.summary : null;
  session = null;
  stopSpeaking();
  syncPocket(state).catch(() => {});
  if (wasRehearsal) { toast('Nice rehearsal! 💍'); go('reveal', true); return; }
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
      ${(() => {
        const sc = recommendedScenario(state);
        const mode = state.settings.apiKey ? 'ai' : 'script';
        return `<div class="use-it"><h3>Use it 💬</h3><p class="small muted">A short role-play with today's words: the best way to make them stick.</p>
          <a class="btn primary" href="#/talk/${sc.id}/${mode}">${sc.emoji} ${esc(sc.title)} (about 5 min)</a></div>`;
      })()}
      <button class="btn big" data-act="home">Done</button>
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
    const head = u.n === 1 ? '<h2 class="level-head">A1 · Beginner</h2>'
      : levelOf(u.n) !== levelOf(u.n - 1) ? `<h2 class="level-head">${levelOf(u.n)} · Elementary</h2>` : '';
    return `${head}<a class="card unit-card" href="#/unit/${u.n}">
      <div class="unit-n">${u.n}</div>
      <div class="unit-info"><h3>${esc(u.title)}</h3><p class="muted small">${esc(u.subtitle)} · ${started}/${u.items.length} started · ${known} known</p>
      <div class="progress thin"><div style="width:${(started / u.items.length) * 100}%"></div></div></div></a>`;
  }).join('');
  const earStarted = EAR.filter((e) => state.cards.has(e.id)).length;
  const herStarted = HER.items.filter((e) => state.cards.has(e.id)).length;
  app.innerHTML = `<h1>Units</h1>${unitCards}
    <h2 class="level-head">Extras</h2>
    <a class="card unit-card" href="#/unit/ear"><div class="unit-n">👂</div>
      <div class="unit-info"><h3>Ear training</h3><p class="muted small">Sound pairs and word stress · ${earStarted}/${EAR.length} started</p></div></a>
    <a class="card unit-card" href="#/unit/her"><div class="unit-n">💍</div>
      <div class="unit-info"><h3>${esc(HER.title)}</h3><p class="muted small">${esc(HER.subtitle)} · ${herStarted}/${HER.items.length} started${state.settings.herPack ? '' : ' · off (turn on in Reveal Day)'}</p></div></a>
    <a class="card unit-card" href="#/capture"><div class="unit-n">✍️</div>
      <div class="unit-info"><h3>Your words</h3><p class="muted small">Words you added yourself · ${MINE.length}</p></div></a>
    <p class="muted small">New items are introduced in order. Your daily session picks them up automatically.</p>`;
}

function renderUnit(n) {
  const isEar = n === 'ear';
  const u = isEar ? { title: 'Ear training', subtitle: 'Sound pairs and word stress', items: EAR, lessons: [] }
    : n === 'her' ? HER : UNITS.find((x) => String(x.n) === n);
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
  const lengths = [[10, 'Short: about 10 min'], [20, 'Normal: about 20 min'], [30, 'Long: about 30 min'], [0, 'No limit']];
  app.innerHTML = `<h1>Settings</h1>
    <section class="card form">
      <h2>Learning</h2>
      <label>Session length
        <select name="sessionMinutes">${lengths.map(([v, l]) => `<option value="${v}" ${s.sessionMinutes === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <p class="muted small">Reviews always come first. New words fill the time that's left, so a big backlog never snowballs. Leftover reviews wait for "Keep going".</p>
      <label>New words per day (max) <output>${s.newPerDay}</output>
        <input type="range" min="3" max="25" step="1" name="newPerDay" value="${s.newPerDay}"></label>
      <p class="muted small">10 is a good default. Each new word adds roughly 5–8 reviews over the next month.</p>
      <label>New ear-training items per day <output>${s.earNewPerDay}</output>
        <input type="range" min="0" max="5" step="1" name="earNewPerDay" value="${s.earNewPerDay}"></label>
      <label>Target recall <output>${Math.round(s.retention * 100)}%</output>
        <input type="range" min="0.8" max="0.95" step="0.01" name="retention" value="${s.retention}"></label>
      <p class="muted small" data-out="retention"></p>
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
      <h2>Speaking &amp; AI</h2>
      <label class="switch"><input type="checkbox" name="speaking" ${s.speaking ? 'checked' : ''}> Speaking exercises</label>
      <label>Speech recognition
        <select name="sttEngine">
          <option value="auto" ${s.sttEngine === 'auto' ? 'selected' : ''}>Automatic</option>
          <option value="openrouter" ${s.sttEngine === 'openrouter' ? 'selected' : ''}>OpenRouter: Whisper (uses your key)</option>
          <option value="phone" ${s.sttEngine === 'phone' ? 'selected' : ''}>Phone's recogniser (free)</option>
        </select></label>
      <p class="muted small" data-out="engine"></p>
      <label>OpenRouter API key
        <input type="password" name="apiKey" value="${esc(s.apiKey)}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-or-v1-…"></label>
      <div class="row">
        <button class="btn small" data-act="show-key">Show</button>
        <button class="btn small" data-act="test-key">Test key</button>
      </div>
      <p class="small" data-out="key"></p>
      <details>
        <summary>Models</summary>
        <label>Speech-to-text model <input type="text" name="sttModel" value="${esc(s.sttModel)}" autocapitalize="off" spellcheck="false"></label>
        <label>Pronunciation coach model (must accept audio)
          <input type="text" name="coachModel" value="${esc(s.coachModel)}" list="coach-models" autocapitalize="off" spellcheck="false"></label>
        <datalist id="coach-models">${COACH_SUGGESTIONS.map(([id, label]) => `<option value="${esc(id)}">${esc(label)}</option>`).join('')}</datalist>
        <label>Conversation tutor model
          <input type="text" name="tutorModel" value="${esc(s.tutorModel)}" list="tutor-models" autocapitalize="off" spellcheck="false"></label>
        <datalist id="tutor-models">${TUTOR_SUGGESTIONS.map(([id, label]) => `<option value="${esc(id)}">${esc(label)}</option>`).join('')}</datalist>
        <p class="muted small">Tutor options: ${TUTOR_SUGGESTIONS.map(([, l]) => esc(l)).join(' · ')}. Voice-capable models also hear your recording, not just the transcript.</p>
        <p class="muted small">Open-weight models by default. Any OpenRouter model ID works. Suggestions: ${COACH_SUGGESTIONS.map(([, l]) => esc(l)).join(' · ')}.</p>
      </details>
      <h3>Conversation</h3>
      <label class="switch"><input type="checkbox" name="tutorShowEn" ${s.tutorShowEn ? 'checked' : ''}> Always show English under the tutor's lines</label>
      <label>Hands-free: pause before I stop listening <output>${s.handsFreePause}s</output>
        <input type="range" min="1.5" max="6" step="0.5" name="handsFreePause" value="${s.handsFreePause}"></label>
      <p class="muted small">Speak slowly or need thinking time? Make the pause longer.</p>
      <p class="muted small">Your key is stored only on this phone and is never included in backups. Recordings go to OpenRouter only when it is the speech engine or when you ask for pronunciation tips. Tip: set a credit limit on the key at openrouter.ai → Settings → Keys.</p>
    </section>
    <section class="card form" id="pocket">
      <h2>Pocket quizzes</h2>
      <p class="muted small">3 tiny quizzes a day in your notifications, at random times. You see the word, tap <b>Show answer</b>, then <b>✓</b> or <b>✗</b>. It counts as a review without opening the app.</p>
      <div data-out="pocket"><p class="muted small">Checking…</p></div>
      <label class="switch"><input type="checkbox" name="pocketHide" ${s.pocketHide ? 'checked' : ''}> Hide the word until I tap (shows "Tap to see today's card")</label>
      <p class="muted small">To keep them off the lock screen: phone Settings → Notifications → Lock screen notifications → <b>Hide content</b>, or turn lock-screen notifications off for <b>Daily</b> only.</p>
    </section>
    <section class="card form">
      <h2>Reveal Day</h2>
      <p class="muted small">Her name, the date, the Para ela pack and your message. <a href="#/reveal">Open Reveal Day ›</a></p>
    </section>
    <section class="card form">
      <h2>Backup</h2>
      <p class="muted small">Your progress is stored only on this phone. Export a backup now and then.</p>
      <div class="row"><button class="btn" data-act="export">Export backup</button>
      <label class="btn">Import backup<input type="file" accept="application/json,.json" hidden name="import"></label></div>
      <button class="btn danger" data-act="reset">Reset all progress</button>
    </section>
    <p class="muted small center">Daily · v${window.APP_VERSION || ''}</p>`;

  renderPocketSettings();
  app.querySelector('[name="pocketHide"]').addEventListener('change', (e) => { s.pocketHide = e.target.checked; store.saveSettings(); syncPocket(state).catch(() => {}); });

  const retOut = app.querySelector('[data-out="retention"]');
  const showRetention = () => {
    // Review load scales roughly with 1 / interval; compare with the 90% default.
    const load = intervalFor(10, 0.9) / intervalFor(10, s.retention);
    const rel = Math.abs(load - 1) < 0.05 ? 'The usual sweet spot between effort and forgetting.'
      : load > 1 ? `About ${load.toFixed(1)}× the reviews of 90%: you'll forget less, but it costs time.`
        : `About ${Math.round((1 - load) * 100)}% fewer reviews than 90%, but you'll forget more often.`;
    retOut.textContent = `${rel} Applies from each item's next review.`;
  };
  showRetention();
  app.querySelectorAll('input[type="range"]').forEach((r) => r.addEventListener('input', () => {
    const out = r.parentElement.querySelector('output');
    out.textContent = r.name === 'retention' ? `${Math.round(r.value * 100)}%` : r.name === 'handsFreePause' ? `${r.value}s` : r.value;
    s[r.name] = Number(r.value);
    if (r.name === 'retention') showRetention();
    store.saveSettings();
  }));
  app.querySelector('[name="sessionMinutes"]').addEventListener('change', (e) => { s.sessionMinutes = Number(e.target.value); store.saveSettings(); });
  app.querySelector('[name="noTyping"]').addEventListener('change', (e) => { s.noTyping = e.target.checked; store.saveSettings(); });

  const engineOut = app.querySelector('[data-out="engine"]');
  const showEngine = () => {
    const e = sttEngine();
    engineOut.textContent = !s.speaking ? 'Speaking exercises are off.'
      : e === 'openrouter' ? 'Using OpenRouter Whisper.'
        : e === 'phone' ? "Using the phone's recogniser."
          : s.sttEngine === 'openrouter' ? 'Add an API key to use OpenRouter.' : 'No speech recogniser available on this device.';
  };
  showEngine();
  app.querySelector('[name="speaking"]').addEventListener('change', (e) => { s.speaking = e.target.checked; store.saveSettings(); showEngine(); });
  app.querySelector('[name="sttEngine"]').addEventListener('change', (e) => { s.sttEngine = e.target.value; store.saveSettings(); showEngine(); });
  app.querySelector('[name="tutorShowEn"]').addEventListener('change', (e) => { s.tutorShowEn = e.target.checked; store.saveSettings(); });
  const defaults = { apiKey: '', sttModel: DEFAULT_MODELS.stt, coachModel: DEFAULT_MODELS.coach, tutorModel: DEFAULT_TUTOR_MODEL };
  ['apiKey', 'sttModel', 'coachModel', 'tutorModel'].forEach((name) => {
    app.querySelector(`[name="${name}"]`).addEventListener('change', (e) => {
      s[name] = e.target.value.trim() || defaults[name];
      e.target.value = s[name];
      store.saveSettings();
      showEngine();
    });
  });
  app.querySelector('[data-act="show-key"]').addEventListener('click', (e) => {
    const inp = app.querySelector('[name="apiKey"]');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    e.target.textContent = inp.type === 'password' ? 'Show' : 'Hide';
  });
  app.querySelector('[data-act="test-key"]').addEventListener('click', async () => {
    const out = app.querySelector('[data-out="key"]');
    s.apiKey = app.querySelector('[name="apiKey"]').value.trim();
    await store.saveSettings();
    showEngine();
    out.textContent = 'Checking…';
    try {
      const k = await keyInfo(s.apiKey);
      const used = typeof k.usage === 'number' ? `$${k.usage.toFixed(3)} used` : '';
      const limit = k.limit != null ? ` of a $${k.limit} limit` : ' (no spending limit set: consider adding one)';
      out.textContent = `✅ Key works. ${used}${limit}.`;
    } catch (err) {
      out.textContent = `❌ ${err.message}`;
    }
  });
  app.querySelector('[name="voiceURI"]')?.addEventListener('change', (e) => { s.voiceURI = e.target.value; store.saveSettings(); say('Olá! Bom dia.'); });
  app.querySelector('[data-act="test"]').addEventListener('click', () => say('Bom dia, tudo bem?'));
  app.querySelector('[data-act="export"]').addEventListener('click', () => {
    const blob = new Blob([store.exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `daily-backup-${store.todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  app.querySelector('[name="import"]').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      await store.importData(await f.text());
      registerCustom(state.custom);
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

// ---------------- pocket quizzes ----------------

async function renderPocketSettings() {
  const box = app.querySelector('[data-out="pocket"]');
  if (!box) return;
  if (!pushSupported() || location.protocol === 'file:') {
    box.innerHTML = '<p class="warn small">Notifications aren\'t available here. Open the installed app in Chrome on Android.</p>';
    return;
  }
  let sub = null;
  try { sub = await currentSubscription(); } catch { /* service worker not ready */ }
  if (!sub) {
    box.innerHTML = '<button class="btn primary" data-act="pq-on">Turn on for this device</button><p class="small" data-out="pq-err"></p>';
    box.querySelector('[data-act="pq-on"]').addEventListener('click', async () => {
      try { await subscribe(); await syncPocket(state); renderPocketSettings(); }
      catch (err) { box.querySelector('[data-out="pq-err"]').textContent = err.message; }
    });
    return;
  }
  const code = JSON.stringify(sub);
  box.innerHTML = `<p>✅ On for this device.</p>
    <div class="row"><button class="btn small" data-act="pq-test">Send a test quiz now</button>
      <button class="btn ghost small" data-act="pq-off">Turn off</button></div>
    <details ${state.settings.pocketSetupDone ? '' : 'open'}>
      <summary>One-time setup on GitHub</summary>
      <ol class="small">
        <li>Copy this device's setup code.</li>
        <li>On GitHub, open your app's repository → <b>Settings</b> → <b>Secrets and variables</b> → <b>Actions</b>.</li>
        <li><b>New repository secret</b>. Name: <code>PUSH_SUBSCRIPTIONS</code>. Value: the code. (Phone and tablet? Put both codes in, one per line.)</li>
        <li>Also add the <code>VAPID_PRIVATE_KEY</code> secret, if it isn't there yet.</li>
      </ol>
      <textarea readonly rows="3" class="code">${esc(code)}</textarea>
      <div class="row"><button class="btn small" data-act="pq-copy">Copy code</button>
        ${navigator.share ? '<button class="btn small" data-act="pq-share">Share code</button>' : ''}
        <button class="btn ghost small" data-act="pq-done">Done</button></div>
    </details>`;
  box.querySelector('[data-act="pq-test"]').addEventListener('click', async () => {
    await syncPocket(state);
    await testPocket();
    toast('Sent. Check your notifications.');
  });
  box.querySelector('[data-act="pq-off"]').addEventListener('click', async () => { await unsubscribe(); renderPocketSettings(); });
  box.querySelector('[data-act="pq-copy"]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(code); toast('Copied'); }
    catch { box.querySelector('textarea').select(); toast('Select the code and copy it'); }
  });
  box.querySelector('[data-act="pq-share"]')?.addEventListener('click', () => navigator.share({ text: code }).catch(() => {}));
  box.querySelector('[data-act="pq-done"]').addEventListener('click', async () => {
    state.settings.pocketSetupDone = true;
    await store.saveSettings();
    box.querySelector('details').open = false;
  });
}

/** Apply ✓/✗ taps from notifications as reviews, on the day they happened. */
async function applyPocketAnswers() {
  let answers = [];
  try { answers = await takeAnswers(); } catch { return; }
  if (!answers.length) return;
  const ups = pocketUpdates(state, answers);
  for (const u of ups) {
    await store.saveCard(u.card);
    const day = (state.stats.days[store.todayKey(new Date(u.at))] ||= { reviews: 0, correct: 0, newItems: 0 });
    day.reviews++;
    day.recallN = (day.recallN || 0) + 1;
    if (u.ok) { day.correct++; day.recallOk = (day.recallOk || 0) + 1; }
    day.pocket = (day.pocket || 0) + 1;
  }
  await store.saveStats();
  if (ups.length) toast(`${ups.length} pocket quiz answer${ups.length === 1 ? '' : 's'} saved ✓`);
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
  registerCustom(state.custom);
  await applyPocketAnswers();
  await initSpeech();
  // Text shared to the app from another app (Android share sheet) → quick capture
  const params = new URLSearchParams(location.search);
  const shared = [params.get('share_title'), params.get('share_text'), params.get('share_url')].filter(Boolean).join(' ').trim();
  if (shared) {
    setShared(shared.slice(0, 300));
    history.replaceState(null, '', `${location.pathname}#/capture`);
  }
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  syncPocket(state).catch(() => {});
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') syncPocket(state).catch(() => {});
    else applyPocketAnswers().then(() => { if (location.hash.match(/^#\/?(home)?$/)) route(); }).catch(() => {});
  });
}

boot().catch((err) => {
  app.innerHTML = `<div class="banner warn">Something went wrong starting the app: ${esc(err.message)}</div>`;
  console.error(err);
});
