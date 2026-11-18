// Reveal Day (countdown, plan, her pack, your message) and quick capture (your own words).

import { UNITS, HER, MINE, levelOf, customItem, registerCustom, unregisterCustom } from './content.js';
import { PACK_SCENARIOS } from './scenarios.js';
import { newPool } from './session.js';
import { cardFromText, revealLines } from './openrouter.js';
import { DEFAULT_TUTOR_MODEL } from './tutor.js';
import { knownWords } from './novela.js';
import { esc, ICON } from './exercises.js';

const DAY_MS = 86400000;

/** Whole days from today until a YYYY-MM-DD date (0 = today, negative = past). */
export function daysUntil(dateStr, now = Date.now()) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date(now);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((target - t0) / DAY_MS);
}

/**
 * Where you'll be on Reveal Day at a given pace (assumes you practise every day).
 * Returns {introduced, started, unit, herDone}: new words learned by then, total words
 * started, the furthest course unit reached, and whether the pack will be finished.
 */
export function projection(st, days, perDay) {
  const pool = newPool(st);
  const introduced = Math.min(pool.length, Math.max(0, days) * perDay);
  const ahead = pool.slice(0, introduced);
  const startedNow = [...st.cards.values()].filter((c) => c.s != null && c.due != null).length;
  let unit = 0;
  for (const u of UNITS) if (u.items.some((i) => st.cards.has(i.id))) unit = u.n;
  for (const it of ahead) if (typeof it.unit === 'number') unit = Math.max(unit, it.unit);
  const herLeft = HER.items.filter((i) => !st.cards.has(i.id) && !ahead.includes(i)).length;
  return { introduced, started: startedNow + introduced, unit, herDone: herLeft === 0 };
}

/** New words a day needed to reach the end of `unitN` in `days` days. */
export function perDayFor(st, unitN, days) {
  const pool = newPool(st);
  let last = -1;
  pool.forEach((it, i) => { if (typeof it.unit === 'number' && it.unit <= unitN) last = i; });
  if (last < 0) return 0;
  return Math.ceil((last + 1) / Math.max(1, days));
}

// ---------------- Reveal Day ----------------

export function renderReveal(app, d) {
  const s = d.state.settings;
  const st = d.state;
  const days = daysUntil(s.revealDate);
  const herStarted = HER.items.filter((i) => st.cards.has(i.id)).length;
  const p = days != null && days > 0 ? projection(st, days, s.newPerDay) : null;
  const msg = s.revealMessage || { en: '', lines: [], note: '' };
  const hasKey = !!s.apiKey;

  app.innerHTML = `<a class="back" href="#/home">‹ Home</a><h1>Reveal Day 💍</h1>
    ${days != null ? `<section class="card countdown">
        <p class="big-num">${days > 0 ? days : days === 0 ? 'Today!' : '🎉'}</p>
        <p class="muted center">${days > 0 ? `day${days === 1 ? '' : 's'} to go` : days === 0 ? 'Boa sorte! You\'ve got this.' : 'Reveal Day has passed. Set a new date?'}</p>
      </section>` : ''}
    ${p ? `<section class="card form">
        <h2>Your plan</h2>
        <p>At <b>${s.newPerDay} new words a day</b>, by then you'll have started about <b>${p.started}</b> words and phrases and reached <b>Unit ${p.unit || 1}</b> (${levelOf(p.unit || 1)}).
          ${s.herPack ? (p.herDone ? 'The Para ela pack will be done. ✅' : '<b>The Para ela pack won\'t be finished yet.</b> Speed up, or it keeps going after.') : ''}</p>
        <label>Aim to finish
          <select name="target">${UNITS.map((u) => `<option value="${u.n}" ${u.n === Math.min(20, Math.max(p.unit, 5)) ? 'selected' : ''}>Unit ${u.n}: ${esc(u.title)}</option>`).join('')}</select></label>
        <p class="small" data-out="need"></p>
        <button class="btn small" data-act="use-pace" hidden></button>
        <p class="muted small">Assumes you practise every day. Each extra new word a day adds a few minutes of reviews.</p>
      </section>` : ''}
    <section class="card form">
      <h2>Setup</h2>
      <label>Her name <input type="text" name="herName" value="${esc(s.herName)}" autocomplete="off"></label>
      <label>Reveal Day <input type="date" name="revealDate" value="${esc(s.revealDate)}"></label>
      <label>About her family (for the lunch role-play)
        <textarea name="herFamily" rows="2" placeholder="e.g. Her mum is Fátima, her dad is Jorge, they live near Porto">${esc(s.herFamily)}</textarea></label>
      <label class="switch"><input type="checkbox" name="herPack" ${s.herPack ? 'checked' : ''}> Mix the <b>Para ela</b> pack into my new words</label>
      <p class="muted small">${HER.items.length} words and phrases for her, her family and the reveal. One in every three new words comes from the pack. ${herStarted}/${HER.items.length} started. <a href="#/unit/her">See the pack ›</a></p>
    </section>
    <section class="card form">
      <h2>What you'll tell her</h2>
      <p class="muted small">Write it in English, the way you'd say it. ${hasKey ? 'The AI turns it into simple, natural European Portuguese at your level.' : 'Add an OpenRouter key in Settings to translate it.'}</p>
      <textarea name="msg" rows="4" placeholder="e.g. I have a surprise. I've been learning Portuguese in secret, for you…">${esc(msg.en)}</textarea>
      <div class="row"><button class="btn small" data-act="translate" ${hasKey ? '' : 'disabled'}>✨ Make it Portuguese</button></div>
      <p class="small muted" data-out="msg-status"></p>
      <div data-out="lines">${linesHtml(msg)}</div>
    </section>
    <section class="card">
      <h2>Rehearse</h2>
      ${PACK_SCENARIOS.map((sc) => `<div class="scen-head"><span class="scen-emoji">${sc.emoji}</span><div><b>${esc(sc.title)}</b>
        <div class="row">${hasKey ? `<a class="btn primary small" href="#/talk/${sc.id}/ai">AI role-play</a>` : ''}<a class="btn small" href="#/talk/${sc.id}/script">Guided</a></div></div></div>`).join('')}
    </section>`;

  // setup fields
  const save = () => d.store.saveSettings();
  app.querySelector('[name="herName"]').addEventListener('change', (e) => { s.herName = e.target.value.trim(); save(); });
  app.querySelector('[name="herFamily"]').addEventListener('change', (e) => { s.herFamily = e.target.value.trim(); save(); });
  app.querySelector('[name="revealDate"]').addEventListener('change', async (e) => { s.revealDate = e.target.value; await save(); d.rerender(); });
  app.querySelector('[name="herPack"]').addEventListener('change', async (e) => { s.herPack = e.target.checked; await save(); d.rerender(); });

  // pace
  const target = app.querySelector('[name="target"]');
  if (target && p) {
    const need = app.querySelector('[data-out="need"]');
    const use = app.querySelector('[data-act="use-pace"]');
    const show = () => {
      const n = perDayFor(st, Number(target.value), days);
      if (n === 0) { need.textContent = 'You\'ve already started everything up to there. 🎉'; use.hidden = true; return; }
      const capped = Math.min(25, Math.max(3, n));
      need.innerHTML = `That needs <b>${n} new words a day</b>${n > 25 ? ' (more than the maximum of 25, so pick an earlier unit)' : ''}.`;
      use.hidden = capped === s.newPerDay || n > 25;
      use.textContent = `Use ${capped} a day`;
      use.onclick = async () => { s.newPerDay = capped; await save(); d.toast(`New words per day: ${capped}`); d.rerender(); };
    };
    target.addEventListener('change', show);
    show();
  }

  // message
  const wireLines = () => {
    app.querySelectorAll('[data-say-line]').forEach((b) => b.addEventListener('click', () => d.say(b.dataset.sayLine)));
    app.querySelector('[data-act="say-all"]')?.addEventListener('click', async () => { for (const l of msg.lines) await d.say(l.pt); });
    app.querySelector('[data-act="add-lines"]')?.addEventListener('click', async () => {
      const have = new Set(d.state.custom.map((c) => c.pt.toLowerCase()));
      const fresh = msg.lines.filter((l) => !have.has(l.pt.toLowerCase())).map((l, i) => customItem({ pt: l.pt, en: l.en, source: 'reveal', at: Date.now() + i }));
      d.state.custom.push(...fresh);
      registerCustom(fresh);
      await d.store.saveCustom();
      d.toast(fresh.length ? `Added ${fresh.length} line${fresh.length === 1 ? '' : 's'} to your words` : 'Already in your words');
    });
    app.querySelector('[data-act="rehearse"]')?.addEventListener('click', () => {
      d.rehearse(msg.lines);
    });
  };
  wireLines();
  app.querySelector('[data-act="translate"]').addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    const en = app.querySelector('[name="msg"]').value.trim();
    const status = app.querySelector('[data-out="msg-status"]');
    if (!en) { status.textContent = 'Write something first.'; return; }
    btn.disabled = true;
    status.textContent = 'Writing it in Portuguese…';
    try {
      let unit = 1;
      for (const u of UNITS) if (u.items.some((i) => st.cards.get(i.id)?.s)) unit = u.n;
      const r = await revealLines(s.apiKey, en, { model: s.tutorModel || DEFAULT_TUTOR_MODEL, level: levelOf(unit), known: knownWords(st), herName: s.herName });
      Object.assign(msg, { en, ...r });
      s.revealMessage = msg;
      await save();
      status.textContent = '';
      app.querySelector('[data-out="lines"]').innerHTML = linesHtml(msg);
      wireLines();
    } catch (err) { status.textContent = err.message; }
    btn.disabled = false;
  });
  return null;
}

function linesHtml(msg) {
  if (!msg.lines?.length) return '';
  return `<ul class="item-list">${msg.lines.map((l) => `<li><button class="icon-btn inline" data-say-line="${esc(l.pt)}" aria-label="Play">${ICON.play}</button>
      <span class="pt">${esc(l.pt)}</span><span class="en">${esc(l.en)}</span></li>`).join('')}</ul>
    ${msg.note ? `<p class="note">${esc(msg.note)}</p>` : ''}
    <div class="row"><button class="btn small" data-act="say-all">${ICON.play} Play it all</button>
      <button class="btn primary small" data-act="rehearse">🎤 Rehearse now</button>
      <button class="btn small" data-act="add-lines">➕ Add to my words</button></div>
    <p class="muted small">Add the lines to your words and they'll come back in your sessions until you know them by heart.</p>`;
}

// ---------------- Quick capture ----------------

let pendingShare = '';
export function setShared(text) { pendingShare = text; }

export function renderCapture(app, d) {
  const s = d.state.settings;
  const hasKey = !!s.apiKey;
  const shared = pendingShare;
  pendingShare = '';
  app.innerHTML = `<a class="back" href="#/home">‹ Home</a><h1>Add a word ✍️</h1>
    <section class="card form">
      <p class="muted small">Something you wanted to say today? Add it here, or share text to <b>Daily</b> from any app.</p>
      ${hasKey ? `<label>English or Portuguese
        <textarea name="raw" rows="2" placeholder="e.g. I'm running late">${esc(shared)}</textarea></label>
        <button class="btn" data-act="tr">✨ Translate</button><p class="small muted" data-out="st"></p>` : ''}
      <label>Portuguese <input type="text" name="pt" lang="pt-PT" autocomplete="off" autocapitalize="off" spellcheck="false" value="${hasKey ? '' : esc(shared)}"></label>
      <label>English <input type="text" name="en" autocomplete="off"></label>
      <p class="note" data-out="note" hidden></p>
      <div class="row"><button class="btn primary" data-act="save">Save</button>
        <button class="icon-btn inline" data-act="play" aria-label="Play">${ICON.play}</button></div>
    </section>
    <h2 class="level-head">Your words (${MINE.length})</h2>
    <ul class="item-list card mine" data-out="list">${myList(d)}</ul>`;

  const pt = app.querySelector('[name="pt"]');
  const en = app.querySelector('[name="en"]');
  const noteEl = app.querySelector('[data-out="note"]');
  let note = '';
  const translate = async () => {
    const raw = app.querySelector('[name="raw"]').value.trim();
    const stEl = app.querySelector('[data-out="st"]');
    if (!raw) return;
    stEl.textContent = 'Translating…';
    try {
      const r = await cardFromText(s.apiKey, raw, { model: s.tutorModel || DEFAULT_TUTOR_MODEL });
      pt.value = r.pt;
      en.value = r.en;
      note = r.note;
      noteEl.textContent = note;
      noteEl.hidden = !note;
      stEl.textContent = '';
      d.say(r.pt);
    } catch (err) { stEl.textContent = err.message; }
  };
  app.querySelector('[data-act="tr"]')?.addEventListener('click', translate);
  if (hasKey && shared) translate();
  app.querySelector('[data-act="play"]').addEventListener('click', () => pt.value.trim() && d.say(pt.value.trim()));
  app.querySelector('[data-act="save"]').addEventListener('click', async () => {
    if (!pt.value.trim() || !en.value.trim()) { d.toast('Fill in both the Portuguese and the English'); return; }
    if (d.state.custom.some((c) => c.pt.toLowerCase() === pt.value.trim().toLowerCase())) { d.toast('Already in your words'); return; }
    const item = customItem({ pt: pt.value, en: en.value, note });
    d.state.custom.push(item);
    registerCustom([item]);
    await d.store.saveCustom();
    d.toast('Saved. It\'ll come up in your next session.');
    d.rerender();
  });
  wireMyList(app, d);
  return null;
}

function myList(d) {
  if (!MINE.length) return '<li class="muted small">Nothing yet.</li>';
  return MINE.slice().reverse().map((i) => {
    const c = d.state.cards.get(i.id);
    const status = !c ? ['new', 'New'] : c.s >= 21 ? ['known', 'Known'] : ['learning', 'Learning'];
    return `<li><button class="icon-btn inline" data-say="${esc(i.pt)}" aria-label="Play">${ICON.play}</button>
      <span class="pt">${esc(i.pt)}</span><span class="en">${esc(i.en)}</span>
      <span class="chip ${status[0]}">${status[1]}</span>
      <button class="btn ghost small" data-del="${esc(i.id)}" aria-label="Delete">✕</button></li>`;
  }).join('');
}

function wireMyList(app, d) {
  app.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => d.say(b.dataset.say)));
  app.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const id = b.dataset.del;
    const it = MINE.find((x) => x.id === id);
    if (!it || !confirm(`Delete "${it.pt}" and its progress?`)) return;
    d.state.custom = d.state.custom.filter((x) => x.id !== id);
    unregisterCustom(id);
    await d.store.saveCustom();
    d.state.deleted = [...(d.state.deleted || []), id]; // so sync doesn't bring it back
    await d.store.saveDeleted();
    if (d.state.cards.has(id)) await d.store.deleteCard(id);
    d.rerender();
  }));
}
