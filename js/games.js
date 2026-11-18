// Speed games: quick, fun practice with words you've started. They don't change your
// review schedule (that's what sessions are for); they build speed and listening.

import { ITEM_BY_ID, UNITS } from './content.js';
import { distractors } from './session.js';
import { esc, ICON } from './exercises.js';
import { numberToPt, priceToPt, priceDigits, phoneToPt, normalizeNumberAnswer } from './numbers.js';

const GAME_SECONDS = 60;

export const GAMES = [
  { id: 'blitz', emoji: '⚡', title: 'Blitz', desc: 'Match Portuguese to English. 60 seconds, combos for streaks.' },
  { id: 'ear', emoji: '👂', title: 'Ear rush', desc: 'Hear a word, pick the meaning. 60 seconds.' },
  { id: 'numbers', emoji: '🔢', title: 'Números', desc: 'Hear numbers, prices and phone numbers. Type the digits.' },
];

const NUMBER_MODES = [
  { id: 'small', title: '0–20', make: (r) => { const n = Math.floor(r() * 21); return { say: numberToPt(n), answer: String(n) }; } },
  { id: 'tens', title: '20–100', make: (r) => { const n = 20 + Math.floor(r() * 81); return { say: numberToPt(n), answer: String(n) }; } },
  { id: 'big', title: '100–9 999', make: (r) => { const n = 100 + Math.floor(r() * 9900); return { say: numberToPt(n), answer: String(n) }; } },
  { id: 'prices', title: 'Prices', make: (r) => {
    const cents = Math.floor(r() * 50) * 100 + [0, 5, 10, 20, 25, 30, 45, 50, 75, 80, 95, 99][Math.floor(r() * 12)];
    return { say: priceToPt(cents || 50), answer: normalizeNumberAnswer(priceDigits(cents || 50)), shown: priceDigits(cents || 50) };
  } },
  { id: 'phone', title: 'Phone numbers', make: (r) => {
    const d = `9${[1, 2, 3, 6][Math.floor(r() * 4)]}${Array.from({ length: 7 }, () => Math.floor(r() * 10)).join('')}`;
    return { say: phoneToPt(d), answer: d, shown: d.replace(/(\d{3})(?=\d)/g, '$1 ') };
  } },
];

const best = (state, key) => state.stats.games?.[key] || 0;

/** Started words (falls back to the first course words while you have very few). */
function gameWords(state) {
  const started = [...state.cards.values()].filter((c) => c.s).map((c) => ITEM_BY_ID.get(c.id)).filter((i) => i?.kind === 'vocab');
  return started.length >= 8 ? started : UNITS[0].items.slice(0, 16);
}

function shuffle(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}

const key = (s) => s.replace(/\(.*?\)/g, '').trim().toLowerCase();

/** n words with different meanings and spellings, so every match is unambiguous. */
function distinctWords(pool, n) {
  const out = [];
  for (const it of shuffle(pool)) {
    if (out.some((o) => key(o.en) === key(it.en) || o.pt === it.pt)) continue;
    out.push(it);
    if (out.length === n) break;
  }
  return out;
}

// ---------------- list ----------------

export function renderGames(app, d) {
  app.innerHTML = `<a class="back" href="#/home">‹ Home</a><h1>Games 🎮</h1>
    <p class="muted">Quick rounds with the words you've started. Beat your best!</p>
    ${GAMES.map((g) => `<a class="card game-card" href="#/games/${g.id}">
      <span class="game-emoji">${g.emoji}</span>
      <span><b>${esc(g.title)}</b><span class="muted small block">${esc(g.desc)}</span></span>
      ${g.id !== 'numbers' ? `<span class="best">🏆 ${best(d.state, g.id)}</span>` : ''}</a>`).join('')}`;
}

export function renderGame(app, id, mode, d) {
  if (id === 'blitz') return blitz(app, d);
  if (id === 'ear') return earRush(app, d);
  if (id === 'numbers') return mode ? numbers(app, mode, d) : numbersMenu(app, d);
  d.go('games', true);
  return null;
}

// ---------------- shared bits ----------------

function hud(title) {
  return `<div class="game-top">
      <a class="icon-btn close" href="#/games" aria-label="Back">‹</a>
      <b>${esc(title)}</b>
      <span class="game-hud"><span data-out="combo"></span> <span data-out="score">0</span> · <span data-out="time">${GAME_SECONDS}</span>s</span>
    </div>
    <div class="timer"><div data-out="bar"></div></div>`;
}

function makeClock(app, seconds, onEnd) {
  const t0 = Date.now();
  const bar = app.querySelector('[data-out="bar"]');
  const time = app.querySelector('[data-out="time"]');
  const id = setInterval(() => {
    const left = Math.max(0, seconds - (Date.now() - t0) / 1000);
    time.textContent = Math.ceil(left);
    bar.style.width = `${(left / seconds) * 100}%`;
    if (left <= 0) { clearInterval(id); onEnd(); }
  }, 200);
  return () => clearInterval(id);
}

/** Score with combos: each correct answer in a row raises the multiplier (max ×5). */
function scorer(app) {
  const s = { score: 0, combo: 0, right: 0, wrong: 0 };
  const show = () => {
    app.querySelector('[data-out="score"]').textContent = s.score;
    app.querySelector('[data-out="combo"]').textContent = s.combo >= 2 ? `🔥×${Math.min(5, s.combo)}` : '';
  };
  return {
    s,
    hit() { s.combo++; s.right++; s.score += 10 * Math.min(5, s.combo); show(); },
    miss() { s.combo = 0; s.wrong++; show(); },
  };
}

async function gameOver(app, d, gameKey, s, againHref, extra = '') {
  const stats = d.state.stats;
  stats.games ||= {};
  const prev = stats.games[gameKey] || 0;
  const isBest = s.score > prev;
  if (isBest) stats.games[gameKey] = s.score;
  const today = d.store.todayStats();
  today.games = (today.games || 0) + 1;
  today.seconds = (today.seconds || 0) + GAME_SECONDS;
  await d.store.saveStats();
  app.querySelector('.game-body').innerHTML = `<section class="card done center">
      <h2>${isBest && s.score ? '🏆 New best!' : 'Time!'}</h2>
      <p class="big-num">${s.score}</p>
      <p class="muted">${s.right} right · ${s.wrong} missed${prev && !isBest ? ` · best ${prev}` : ''}</p>
      ${extra}
      <div class="row center-row"><a class="btn primary" href="${againHref}" data-act="again">Play again</a><a class="btn" href="#/games">Games</a></div>
    </section>`;
  app.querySelector('[data-act="again"]').addEventListener('click', (e) => { e.preventDefault(); d.rerender(); });
}

// ---------------- Blitz: match pairs ----------------

function blitz(app, d) {
  const pool = gameWords(d.state);
  app.innerHTML = `<div class="game">${hud('⚡ Blitz')}<div class="game-body">
    <div class="blitz"><div class="col" data-col="pt"></div><div class="col" data-col="en"></div></div>
    <p class="muted small center">Tap a Portuguese word, then its meaning.</p></div></div>`;
  const sc = scorer(app);
  const ptCol = app.querySelector('[data-col="pt"]');
  const enCol = app.querySelector('[data-col="en"]');
  let picked = null;
  let left = 0;
  let over = false;

  function deal() {
    const words = distinctWords(pool, 5);
    left = words.length;
    ptCol.innerHTML = shuffle(words).map((w) => `<button class="tile" data-id="${w.id}" data-side="pt">${esc(w.pt)}</button>`).join('');
    enCol.innerHTML = shuffle(words).map((w) => `<button class="tile" data-id="${w.id}" data-side="en">${esc(w.en)}</button>`).join('');
  }

  app.querySelector('.blitz').addEventListener('click', (ev) => {
    const b = ev.target.closest('.tile');
    if (!b || over || b.disabled) return;
    if (b.dataset.side === 'pt') d.say(b.textContent);
    if (!picked || picked.dataset.side === b.dataset.side) {
      picked?.classList.remove('picked');
      picked = b;
      b.classList.add('picked');
      return;
    }
    if (picked.dataset.id === b.dataset.id) {
      [picked, b].forEach((x) => { x.classList.remove('picked'); x.classList.add('matched'); x.disabled = true; });
      sc.hit();
      if (--left === 0) setTimeout(() => { if (!over) deal(); }, 250);
    } else {
      [picked, b].forEach((x) => { x.classList.remove('picked'); x.classList.add('shake'); setTimeout(() => x.classList.remove('shake'), 400); });
      sc.miss();
    }
    picked = null;
  });

  deal();
  const stop = makeClock(app, GAME_SECONDS, () => { over = true; gameOver(app, d, 'blitz', sc.s, '#/games/blitz'); });
  return () => { over = true; stop(); };
}

// ---------------- Ear rush: hear it, pick the meaning ----------------

function earRush(app, d) {
  const pool = gameWords(d.state);
  app.innerHTML = `<div class="game">${hud('👂 Ear rush')}<div class="game-body">
    <div class="center"><button class="icon-btn big" data-act="replay" aria-label="Play again">${ICON.play}</button></div>
    <div class="choices" data-out="opts"></div></div></div>`;
  const sc = scorer(app);
  let over = false;
  let current = null;
  let lastId = null;

  function next() {
    if (over) return;
    let item;
    do { item = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && item.id === lastId);
    lastId = item.id;
    current = item;
    const opts = shuffle([item, ...distractors(item, 3)]);
    app.querySelector('[data-out="opts"]').innerHTML = opts.map((o) => `<button class="choice" data-id="${o.id}">${esc(o.en)}</button>`).join('');
    d.say(item.pt, { vary: true });
  }

  app.querySelector('[data-act="replay"]').addEventListener('click', () => current && d.say(current.pt));
  app.querySelector('[data-out="opts"]').addEventListener('click', (ev) => {
    const b = ev.target.closest('.choice');
    if (!b || over || b.disabled) return;
    const all = app.querySelectorAll('.choice');
    all.forEach((x) => { x.disabled = true; });
    if (b.dataset.id === current.id) { b.classList.add('right'); sc.hit(); setTimeout(next, 450); }
    else {
      b.classList.add('wrong');
      [...all].find((x) => x.dataset.id === current.id)?.classList.add('right');
      sc.miss();
      setTimeout(next, 1300);
    }
  });

  next();
  const stop = makeClock(app, GAME_SECONDS, () => { over = true; d.stopSpeaking(); gameOver(app, d, 'ear', sc.s, '#/games/ear'); });
  return () => { over = true; stop(); };
}

// ---------------- Números ----------------

function numbersMenu(app, d) {
  app.innerHTML = `<a class="back" href="#/games">‹ Games</a><h1>Números 🔢</h1>
    <p class="muted">European Portuguese swallows its vowels, so numbers fly past. Hear one, type the digits. 60 seconds.</p>
    ${NUMBER_MODES.map((m) => `<a class="card game-card" href="#/games/numbers/${m.id}"><span><b>${esc(m.title)}</b></span>
      <span class="best">🏆 ${best(d.state, `numbers-${m.id}`)}</span></a>`).join('')}`;
  return null;
}

function numbers(app, modeId, d) {
  const mode = NUMBER_MODES.find((m) => m.id === modeId);
  if (!mode) { d.go('games/numbers', true); return null; }
  app.innerHTML = `<div class="game">${hud(`🔢 ${mode.title}`)}<div class="game-body">
    <div class="center row center-row">
      <button class="icon-btn big" data-act="replay" aria-label="Play again">${ICON.play}</button>
      <button class="icon-btn" data-act="slow" aria-label="Play slowly">${ICON.slow}</button>
    </div>
    <form class="num-form"><input inputmode="decimal" autocomplete="off" data-in="num" placeholder="${mode.id === 'prices' ? 'e.g. 3,50' : 'digits'}">
      <button class="btn primary" type="submit">OK</button></form>
    <p class="center" data-out="fb"></p>
    <button class="btn ghost small" data-act="skip">Skip</button></div></div>`;
  const sc = scorer(app);
  const input = app.querySelector('[data-in="num"]');
  const fb = app.querySelector('[data-out="fb"]');
  let over = false;
  let cur = null;
  const missed = [];

  function next() {
    if (over) return;
    cur = mode.make(Math.random);
    input.value = '';
    input.focus();
    d.say(cur.say);
  }

  app.querySelector('[data-act="replay"]').addEventListener('click', () => cur && d.say(cur.say));
  app.querySelector('[data-act="slow"]').addEventListener('click', () => cur && d.say(cur.say, { rate: d.state.settings.slowRate }));
  app.querySelector('[data-act="skip"]').addEventListener('click', () => {
    if (!cur || over) return;
    fb.innerHTML = `It was <b>${esc(cur.shown || cur.answer)}</b>: <i>${esc(cur.say)}</i>`;
    missed.push(cur);
    sc.miss();
    next();
  });
  app.querySelector('.num-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (over || !cur || !input.value.trim()) return;
    const ok = normalizeNumberAnswer(input.value) === normalizeNumberAnswer(cur.answer);
    if (ok) { fb.innerHTML = `✅ <i>${esc(cur.say)}</i>`; sc.hit(); next(); }
    else {
      fb.innerHTML = `❌ It was <b>${esc(cur.shown || cur.answer)}</b>: <i>${esc(cur.say)}</i>`;
      missed.push(cur);
      sc.miss();
      next();
    }
  });

  next();
  const stop = makeClock(app, GAME_SECONDS, () => {
    over = true;
    d.stopSpeaking();
    const extra = missed.length ? `<ul class="item-list small">${missed.slice(-5).map((m) => `<li><span class="pt">${esc(m.shown || m.answer)}</span><span class="en">${esc(m.say)}</span></li>`).join('')}</ul>` : '';
    gameOver(app, d, `numbers-${mode.id}`, sc.s, `#/games/numbers/${mode.id}`, extra);
  });
  return () => { over = true; stop(); };
}
