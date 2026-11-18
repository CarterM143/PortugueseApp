// Conversation screens: scenario list and the chat-style role-play.

import { SCENARIOS, SCENARIO_BY_ID, PACK_SCENARIOS, personalize } from './scenarios.js';
import { AiConversation, ScriptedConversation, DEFAULT_TUTOR_MODEL } from './tutor.js';
import { UNITS, levelOf } from './content.js';
import { esc, ICON } from './exercises.js';

const MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20l18-8L3 4v6l12 2-12 2z"/></svg>';
const ACCENTS = ['ã', 'õ', 'ç', 'á', 'à', 'â', 'é', 'ê', 'í', 'ó', 'ô', 'ú'];

/** Unit the learner is currently working on (for recommending a scenario). */
function currentUnit(state) {
  let best = 1;
  for (const u of UNITS) {
    const started = u.items.filter((i) => state.cards.has(i.id)).length;
    if (started >= 5) best = u.n;
  }
  return best;
}

export function recommendedScenario(state) {
  const u = currentUnit(state);
  return SCENARIOS.find((s) => s.unit === u) || SCENARIOS[0];
}

export function renderTalkList(app, d) {
  const rec = recommendedScenario(d.state);
  const hasKey = !!d.state.settings.apiKey;
  app.innerHTML = `<h1>Talk</h1>
    <p class="muted">Short role-plays using the words you're learning. ${hasKey
      ? 'With the AI tutor you can say anything. It nudges you to fix mistakes yourself.'
      : 'Add an OpenRouter key in Settings for the free-form AI tutor. Guided practice scripts work offline.'}</p>
    ${scenarioCard(rec, rec, hasKey)}
    ${d.state.settings.herPack ? `<h2 class="level-head">Reveal Day 💍</h2>${PACK_SCENARIOS.map((s) => scenarioCard(s, rec, hasKey)).join('')}` : ''}
    <h2 class="level-head">All role-plays</h2>
    ${SCENARIOS.filter((s) => s !== rec).map((s) => scenarioCard(s, rec, hasKey)).join('')}`;
}

function scenarioCard(s, rec, hasKey) {
  return `
      <section class="card scenario ${s.id === rec.id ? 'rec' : ''}">
        <div class="scen-head"><span class="scen-emoji">${s.emoji}</span>
          <div><h3>${esc(s.title)}</h3><p class="muted small">${s.unit === 'her' ? 'Para ela' : `Unit ${s.unit} · ${levelOf(s.unit)}`} · ${esc(s.goals.join(' · '))}</p></div></div>
        ${s.id === rec.id ? '<p class="tag">Recommended</p>' : ''}
        <div class="row">
          ${hasKey ? `<a class="btn primary small" href="#/talk/${s.id}/ai">Talk with the AI tutor</a>` : ''}
          <a class="btn small" href="#/talk/${s.id}/script">Guided practice</a>
        </div>
      </section>`;
}

export function renderTalk(app, id, mode, d) {
  const s = d.state.settings;
  const scenario = SCENARIO_BY_ID.has(id) ? personalize(SCENARIO_BY_ID.get(id), s) : null;
  if (!scenario) return d.go('talk', true);
  const ai = mode === 'ai' && !!s.apiKey;
  // In course order, so the prompt's "most recent 200" are the newest units
  const known = UNITS.flatMap((u) => u.items).filter((i) => d.state.cards.get(i.id)?.s).map((i) => i.pt);
  const conv = ai
    ? new AiConversation(scenario, { key: s.apiKey, model: s.tutorModel || DEFAULT_TUTOR_MODEL, known })
    : new ScriptedConversation(scenario);
  const engine = d.sttEngine();
  let handsFree = false;
  let busy = false;
  let listener = null;
  let alive = true;
  const started = Date.now();

  app.innerHTML = `
    <div class="talk">
      <div class="talk-top">
        <a class="icon-btn close" href="#/talk" aria-label="Back">‹</a>
        <div class="talk-title"><h2>${scenario.emoji} ${esc(scenario.title)}</h2>
          <p class="muted small">${ai ? `AI tutor · ${esc((s.tutorModel || DEFAULT_TUTOR_MODEL).split('/').pop())}` : 'Guided practice (works offline)'}</p></div>
        ${engine ? '<label class="hf"><input type="checkbox" data-act="hands-free">Hands-free</label>' : ''}
      </div>
      <details class="goals"><summary>Goals <span data-out="goals">0/${scenario.goals.length}</span></summary>
        <ul>${scenario.goals.map((g, i) => `<li data-goal="${i}">${esc(g)}</li>`).join('')}</ul>
        <p class="muted small">${esc(scenario.setting)}</p></details>
      <div class="chat" aria-live="polite"></div>
      <div class="composer">
        <div class="helpbar" hidden>
          <input type="text" data-in="help" placeholder="${ai ? 'What do you want to say? (English)' : ''}" autocomplete="off">
          <button class="btn small" data-act="help-go">Show me</button>
        </div>
        <div class="row tools">
          <button class="btn ghost small" data-act="help">🆘 Help me say it</button>
          <button class="btn ghost small" data-act="accents">á é ç</button>
          <button class="btn ghost small" data-act="end">End</button>
        </div>
        <div class="accent-bar" hidden>${ACCENTS.map((a) => `<button type="button" tabindex="-1">${a}</button>`).join('')}</div>
        <form class="compose">
          <input type="text" data-in="msg" placeholder="Escreve aqui…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" lang="pt-PT">
          ${engine ? `<button type="button" class="mic small" data-act="mic" aria-label="Speak">${MIC}</button>` : ''}
          <button type="submit" class="icon-btn send" aria-label="Send">${SEND}</button>
        </form>
        <p class="muted small center" data-out="status"></p>
      </div>
    </div>`;

  const chatEl = app.querySelector('.chat');
  const input = app.querySelector('[data-in="msg"]');
  const status = app.querySelector('[data-out="status"]');
  const micBtn = app.querySelector('[data-act="mic"]');

  const scroll = () => chatEl.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });

  function add(html, cls) {
    const div = document.createElement('div');
    div.className = `msg ${cls}`;
    div.innerHTML = html;
    chatEl.appendChild(div);
    scroll();
    return div;
  }

  function tutorSays(pt, en, { speak = true } = {}) {
    const showEn = s.tutorShowEn;
    const el = add(`<div class="pt">${esc(pt)}</div>${en ? `<div class="en" ${showEn ? '' : 'hidden'}>${esc(en)}</div>` : ''}
      <div class="msg-actions">
        <button class="icon-btn inline" data-a="play" aria-label="Play">${ICON.play}</button>
        <button class="icon-btn inline" data-a="slow" aria-label="Play slowly">${ICON.slow}</button>
        ${en ? `<button class="btn ghost small" data-a="en">${showEn ? 'Hide' : 'English'}</button>` : ''}
      </div>`, 'tutor');
    el.querySelector('[data-a="play"]').onclick = () => d.say(pt);
    el.querySelector('[data-a="slow"]').onclick = () => d.say(pt, { rate: s.slowRate });
    const enBtn = el.querySelector('[data-a="en"]');
    if (enBtn) enBtn.onclick = () => { const e = el.querySelector('.en'); e.hidden = !e.hidden; enBtn.textContent = e.hidden ? 'English' : 'Hide'; };
    return speak ? d.say(pt) : Promise.resolve();
  }

  function note(text, kind = 'hint', corrected = '') {
    const icon = { hint: '💡', explicit: '👉', correction: '✏️', tip: '✨', error: '⚠️', good: '✅' }[kind] || '💡';
    const el = add(`${icon} ${esc(text)}${corrected ? `<div class="pt corrected">${esc(corrected)} <button class="icon-btn inline" data-a="play">${ICON.play}</button></div>` : ''}`, `note ${kind}`);
    el.querySelector('[data-a="play"]')?.addEventListener('click', () => d.say(corrected));
  }

  function task() {
    if (ai || conv.done) return;
    add(`<b>Your turn:</b> ${esc(conv.turn.task)}`, 'task');
  }

  function updateGoals() {
    app.querySelector('[data-out="goals"]').textContent = `${conv.goalsDone.size}/${scenario.goals.length}`;
    app.querySelectorAll('[data-goal]').forEach((li) => li.classList.toggle('done', conv.goalsDone.has(Number(li.dataset.goal))));
  }

  function setBusy(b, msg = '') {
    busy = b;
    status.textContent = msg;
    app.querySelector('.send').disabled = b;
    if (micBtn) micBtn.disabled = b && !listener;
  }

  async function afterTutor(promise) {
    await promise;
    if (alive && handsFree && !conv.done) startListening();
  }

  // ---------- sending ----------

  async function handleLearner({ text, transcripts = null, audio = null, spoken = false }) {
    const shown = text || (transcripts && transcripts[0]) || '';
    if (!shown.trim()) { status.textContent = "I didn't catch anything. Try again?"; if (handsFree) startListening(); return; }
    add(`${esc(shown)}${spoken ? ' <span class="via">🎤</span>' : ''}`, 'me');
    input.value = '';

    if (!ai) {
      const r = conv.answer({ text: shown, transcripts, spoken });
      if (r.ok) {
        if (r.tier === 'close') note(`Good! A natural way to say it: “${r.answer}”`, 'tip');
      } else if (r.hint) {
        note(r.hint, 'hint');
        if (handsFree) afterTutor(Promise.resolve());
        return;
      } else {
        note(`Let's keep going. You could say: “${r.answer}”`, 'correction');
      }
      updateGoals();
      if (r.next) { const p = tutorSays(r.next.pt, r.next.en); task(); await afterTutor(p); }
      if (r.closing) { await tutorSays(r.closing.pt, r.closing.en); finish(); }
      return;
    }

    setBusy(true, 'Tutor is thinking…');
    const typing = add('<span class="dots"><i></i><i></i><i></i></span>', 'tutor typing');
    try {
      const r = await conv.send(shown, { spoken, audio });
      typing.remove();
      if (r.feedback?.type && r.feedback.type !== 'none' && (r.feedback.text || r.feedback.corrected)) {
        note(r.feedback.text, r.feedback.type, r.feedback.corrected);
      }
      updateGoals();
      setBusy(false);
      if (r.reply) await afterTutor(tutorSays(r.reply, r.reply_en));
      if (conv.done) finish();
    } catch (err) {
      typing.remove();
      setBusy(false);
      note(`${err.message}${err.status === 0 ? ' You can switch to Guided practice, which works offline.' : ''}`, 'error');
    }
  }

  app.querySelector('.compose').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (busy || conv.done) return;
    const t = input.value.trim();
    if (t) handleLearner({ text: t });
  });

  // ---------- speaking ----------

  async function startListening() {
    if (!micBtn || busy || listener || conv.done) return;
    d.stopSpeaking();
    listener = d.makeListener();
    try {
      await listener.start(handsFree ? { autoStopAfter: s.handsFreePause || 2.5, onAutoStop: () => stopListening() } : {});
    } catch (err) {
      listener = null;
      status.textContent = err.message;
      return;
    }
    micBtn.classList.add('recording');
    status.textContent = handsFree ? 'Listening… just pause when you\'re done.' : 'Listening… tap the mic when you\'re done.';
  }

  async function stopListening() {
    const l = listener;
    if (!l) return;
    listener = null;
    micBtn.classList.remove('recording');
    setBusy(true, 'Checking…');
    try {
      const res = await l.stop();
      setBusy(false);
      await handleLearner({ transcripts: res.transcripts, audio: res.audio, spoken: true, text: res.transcripts[0] || '' });
    } catch (err) {
      setBusy(false);
      status.textContent = err.message;
    }
  }

  micBtn?.addEventListener('click', () => (listener ? stopListening() : startListening()));
  app.querySelector('[data-act="hands-free"]')?.addEventListener('change', (e) => {
    handsFree = e.target.checked;
    if (handsFree) { d.toast('Hands-free on: I listen after each reply and stop when you pause.'); if (!busy) startListening(); }
    else { listener?.cancel(); listener = null; micBtn?.classList.remove('recording'); status.textContent = ''; }
  });

  // ---------- tools ----------

  const helpbar = app.querySelector('.helpbar');
  app.querySelector('[data-act="help"]').addEventListener('click', () => {
    if (!ai) {
      if (conv.done) return;
      note(`Try: “${conv.turn.expect[0]}”`, 'tip');
      return;
    }
    helpbar.hidden = !helpbar.hidden;
    if (!helpbar.hidden) helpbar.querySelector('input').focus();
  });
  const helpGo = async () => {
    const q = helpbar.querySelector('input').value.trim();
    if (!q || busy) return;
    setBusy(true, 'Finding the words…');
    try {
      const h = await conv.helpMeSay(q);
      const el = add(`🆘 <span class="muted">“${esc(q)}”</span><div class="pt">${esc(h.pt)} <button class="icon-btn inline" data-a="play">${ICON.play}</button></div>
        ${h.note ? `<div class="small muted">${esc(h.note)}</div>` : ''}<div class="small"><b>Now you say it!</b></div>`, 'note help');
      el.querySelector('[data-a="play"]').onclick = () => d.say(h.pt);
      d.say(h.pt);
      helpbar.querySelector('input').value = '';
      helpbar.hidden = true;
    } catch (err) { note(err.message, 'error'); }
    setBusy(false);
  };
  app.querySelector('[data-act="help-go"]').addEventListener('click', helpGo);
  helpbar.querySelector('input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); helpGo(); } });

  const bar = app.querySelector('.accent-bar');
  app.querySelector('[data-act="accents"]').addEventListener('click', () => { bar.hidden = !bar.hidden; });
  bar.addEventListener('pointerdown', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    ev.preventDefault();
    const { selectionStart: a, selectionEnd: z, value } = input;
    input.value = value.slice(0, a) + b.textContent + value.slice(z);
    input.setSelectionRange(a + 1, a + 1);
    input.focus();
  });

  app.querySelector('[data-act="end"]').addEventListener('click', () => finish(true));

  // ---------- finish ----------

  let finished = false;
  async function finish(early = false) {
    if (finished) return;
    finished = true;
    conv.done = true;
    listener?.cancel();
    listener = null;
    const today = d.store.todayStats();
    today.talks = (today.talks || 0) + 1;
    today.talkMinutes = (today.talkMinutes || 0) + Math.round((Date.now() - started) / 60000);
    await d.store.saveStats();
    app.querySelector('.composer').hidden = true;
    const card = add('<h3>Conversation over 🎉</h3><p class="muted small">Getting your summary…</p>', 'summary');
    if (ai && conv.learnerTurns > 0) {
      try {
        const sum = await conv.summary();
        card.innerHTML = `<h3>${early ? 'Nice practice!' : 'Muito bem! 🎉'}</h3>
          ${sum.well ? `<p>✅ ${esc(sum.well)}</p>` : ''}${sum.work_on ? `<p>🎯 ${esc(sum.work_on)}</p>` : ''}
          ${(sum.phrases || []).length ? `<h4>Phrases to remember</h4><ul class="item-list">${sum.phrases.map((p) =>
            `<li><button class="icon-btn inline" data-say="${esc(p.pt)}">${ICON.play}</button><span class="pt">${esc(p.pt)}</span><span class="en">${esc(p.en || '')}</span></li>`).join('')}</ul>` : ''}`;
      } catch (err) {
        card.innerHTML = `<h3>Nice practice!</h3><p class="small muted">(Couldn't get a summary: ${esc(err.message)})</p>`;
      }
    } else {
      card.innerHTML = `<h3>${conv.goalsDone.size === scenario.goals.length ? 'Muito bem! 🎉' : 'Nice practice!'}</h3>
        <p>You completed ${conv.goalsDone.size} of ${scenario.goals.length} goals.</p>`;
    }
    card.insertAdjacentHTML('beforeend', `<div class="row"><a class="btn primary" href="#/home">Done</a>
      <a class="btn" href="#/talk/${scenario.id}/${ai ? 'ai' : 'script'}" data-act="again">Again</a></div>`);
    card.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => d.say(b.dataset.say)));
    card.querySelector('[data-act="again"]').addEventListener('click', (e) => { e.preventDefault(); renderTalk(app, id, mode, d); });
    scroll();
  }

  // ---------- start ----------
  const first = ai ? scenario.opening : conv.turn.tutor;
  afterTutor(tutorSays(first.pt, first.en));
  task();
  updateGoals();

  return () => { alive = false; listener?.cancel(); listener = null; };
}
