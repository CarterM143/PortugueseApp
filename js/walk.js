// Walk mode: hands-free audio drill for earphones. English prompt → pause for you to
// say it out loud → the Portuguese, twice. Words you're closest to forgetting come first,
// and each comes back once a few words later. It doesn't change your schedule.

import { ITEM_BY_ID } from './content.js';
import { retrievability } from './fsrs.js';
import { speakEnglish } from './speech.js';

const DAY_MS = 86400000;
const SLOT_SECONDS = 11; // rough time per word, for planning a session length

/** Order for a walk: most-forgotten first, each word repeated once 4 words later. */
export function walkPlan(st, minutes, now = Date.now()) {
  const words = [...st.cards.values()]
    .filter((c) => c.s && ITEM_BY_ID.get(c.id)?.kind === 'vocab')
    .sort((a, b) => retrievability((now - a.last) / DAY_MS, a.s) - retrievability((now - b.last) / DAY_MS, b.s))
    .map((c) => ITEM_BY_ID.get(c.id));
  if (!words.length) return [];
  const slots = Math.max(4, Math.round((minutes * 60) / (SLOT_SECONDS + (st.settings.walkPause || 4))));
  const unique = Math.max(1, Math.ceil(slots / 2));
  const chosen = [];
  for (let i = 0; chosen.length < unique; i++) chosen.push(words[i % words.length]);
  const out = [];
  chosen.forEach((w, i) => {
    out.push(w);
    if (i >= 4) out.push(chosen[i - 4]);
  });
  chosen.slice(-4).forEach((w) => out.push(w));
  return out.slice(0, slots);
}

export function renderWalk(app, d) {
  const s = d.state.settings;
  const started = [...d.state.cards.values()].filter((c) => c.s).length;
  app.innerHTML = `<a class="back" href="#/home">‹ Home</a><h1>Walk mode 🎧</h1>
    <section class="card form">
      <p>Put your earphones in. You'll hear the English, then a pause to <b>say it in Portuguese out loud</b> (or in your head), then the Portuguese twice.</p>
      <label>How long
        <select name="mins"><option value="5">5 min</option><option value="10" selected>10 min</option><option value="20">20 min</option><option value="30">30 min</option></select></label>
      <label>Thinking time <output>${s.walkPause}s</output>
        <input type="range" min="2" max="8" step="1" name="walkPause" value="${s.walkPause}"></label>
      <button class="btn primary big" data-act="go" ${started ? '' : 'disabled'}>Start</button>
      ${started ? '' : '<p class="muted small">Learn a few words in a session first.</p>'}
      <p class="muted small">The screen stays on (dimmed to black) while it plays, because phones stop the voice when the screen turns off. Lock it in your pocket as is.</p>
    </section>`;
  const range = app.querySelector('[name="walkPause"]');
  range.addEventListener('input', () => {
    s.walkPause = Number(range.value);
    range.parentElement.querySelector('output').textContent = `${range.value}s`;
    d.store.saveSettings();
  });
  let cleanup = null;
  app.querySelector('[data-act="go"]').addEventListener('click', () => {
    cleanup = play(app, d, walkPlan(d.state, Number(app.querySelector('[name="mins"]').value)));
  });
  return () => cleanup?.();
}

function play(app, d, plan) {
  const s = d.state.settings;
  let alive = true;
  let paused = false;
  let resume = null;
  let skip = false;
  let lock = null;
  const started = Date.now();

  app.innerHTML = `<div class="walk-dark">
      <p class="walk-count" data-out="count">1 / ${plan.length}</p>
      <p class="walk-en" data-out="en"></p>
      <p class="walk-pt" data-out="pt"></p>
      <div class="walk-controls">
        <button class="btn" data-act="pause">Pause</button>
        <button class="btn" data-act="skip">Skip</button>
        <button class="btn" data-act="stop">Stop</button>
      </div>
    </div>`;
  const out = (k, v) => { app.querySelector(`[data-out="${k}"]`).textContent = v; };

  const wakeLock = async () => { try { lock = await navigator.wakeLock?.request('screen'); } catch { /* not critical */ } };
  wakeLock();
  const onVis = () => { if (document.visibilityState === 'visible' && alive) wakeLock(); };
  document.addEventListener('visibilitychange', onVis);

  let wake = null; // ends the current pause early (skip / stop)
  const wait = (ms) => new Promise((r) => {
    const t = setTimeout(r, ms);
    wake = () => { clearTimeout(t); r(); };
  });
  const gate = async () => { while (paused && alive) await new Promise((r) => { resume = r; }); };

  async function run() {
    for (let i = 0; i < plan.length && alive; i++) {
      const w = plan[i];
      skip = false;
      out('count', `${i + 1} / ${plan.length}`);
      out('en', w.en);
      out('pt', '');
      await gate();
      if (!alive) break;
      await speakEnglish(w.en);
      if (!alive) break;
      if (!skip) await wait(s.walkPause * 1000);
      await gate();
      if (!alive) break;
      out('pt', w.pt);
      if (!skip) {
        await d.say(w.pt);
        await wait(900);
        if (alive && !skip) await d.say(w.pt, { rate: Math.max(0.5, s.rate - 0.15) });
        await wait(1500);
      }
    }
    if (alive) finish(true);
  }

  async function finish(complete) {
    alive = false;
    wake?.();
    resume?.();
    d.stopSpeaking();
    try { await lock?.release(); } catch { /* ignore */ }
    document.removeEventListener('visibilitychange', onVis);
    const today = d.store.todayStats();
    const secs = Math.round((Date.now() - started) / 1000);
    today.seconds = (today.seconds || 0) + Math.min(secs, plan.length * 30);
    today.walkMinutes = (today.walkMinutes || 0) + Math.round(secs / 60);
    await d.store.saveStats();
    app.innerHTML = `<section class="card done center"><h2>${complete ? 'Walk done 🎧' : 'Stopped'}</h2>
      <p>${Math.max(1, Math.round(secs / 60))} min of listening and speaking.</p>
      <div class="row center-row"><a class="btn primary" href="#/home">Home</a><a class="btn" href="#/walk" data-act="again">Another walk</a></div></section>`;
    app.querySelector('[data-act="again"]').addEventListener('click', (e) => { e.preventDefault(); d.rerender(); });
  }

  app.querySelector('[data-act="pause"]').addEventListener('click', (e) => {
    paused = !paused;
    e.target.textContent = paused ? 'Resume' : 'Pause';
    if (paused) d.stopSpeaking();
    else { resume?.(); resume = null; }
  });
  app.querySelector('[data-act="skip"]').addEventListener('click', () => { skip = true; d.stopSpeaking(); wake?.(); });
  app.querySelector('[data-act="stop"]').addEventListener('click', () => finish(false));

  run();
  return () => {
    if (!alive) return;
    alive = false;
    wake?.();
    resume?.();
    d.stopSpeaking();
    lock?.release().catch(() => {});
    document.removeEventListener('visibilitychange', onVis);
  };
}

