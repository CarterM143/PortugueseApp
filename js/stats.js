// Stats: pure calculations (tested in Node) + the Stats screen.

import { dayNumber, retrievability } from './fsrs.js';
import { UNITS, ITEM_BY_ID, levelOf } from './content.js';
import { esc } from './exercises.js';

const DAY_MS = 86400000;
const KNOWN_DAYS = 21; // memory stability at which an item counts as "known"

// ---------------- calculations ----------------

/** Reviews due on each of the next `days` days. Index 0 = today, including anything overdue. */
export function forecast(cards, now = Date.now(), days = 14) {
  const today = dayNumber(now);
  const out = new Array(days).fill(0);
  for (const c of cards) {
    if (c.due == null || !ITEM_BY_ID.has(c.id)) continue;
    const i = Math.max(0, c.due - today);
    if (i < days) out[i]++;
  }
  return out;
}

/** Vocabulary by stage: not started, learning, known (memory lasts 3+ weeks). */
export function stages(cards) {
  const all = UNITS.reduce((n, u) => n + u.items.length, 0);
  let learning = 0, known = 0;
  for (const c of cards) {
    if (ITEM_BY_ID.get(c.id)?.kind !== 'vocab' || c.s == null) continue;
    if (c.s >= KNOWN_DAYS) known++; else learning++;
  }
  return { notStarted: all - learning - known, learning, known, total: all };
}

/** Average chance of recalling each started word right now (FSRS retrievability). */
export function averageRecall(cards, now = Date.now()) {
  let sum = 0, n = 0;
  for (const c of cards) {
    if (ITEM_BY_ID.get(c.id)?.kind !== 'vocab' || !c.s || c.last == null) continue;
    sum += retrievability(Math.max(0, (now - c.last) / DAY_MS), c.s);
    n++;
  }
  return n ? sum / n : null;
}

/** Day records for the last `n` days, oldest first. keyFor(date) gives the stats key for a date. */
export function lastDays(days, keyFor, n = 30, now = Date.now()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now - i * DAY_MS);
    out.push({ date, key: keyFor(date), ...(days[keyFor(date)] || {}) });
  }
  return out;
}

/** Share of real reviews remembered over a list of day records. */
export function measuredRecall(dayList) {
  let n = 0, ok = 0;
  for (const d of dayList) { n += d.recallN || 0; ok += d.recallOk || 0; }
  return { n, rate: n ? ok / n : null };
}

/** Minutes practised (sessions + conversations) over a list of day records. */
export const minutesIn = (dayList) => Math.round(dayList.reduce((m, d) => m + (d.seconds || 0) / 60 + (d.talkMinutes || 0), 0));

/** Items forgotten most often. */
export function hardest(cards, n = 6) {
  return [...cards]
    .filter((c) => (c.lapses || 0) >= 2 && ITEM_BY_ID.get(c.id)?.kind === 'vocab')
    .sort((a, b) => b.lapses - a.lapses || a.s - b.s)
    .slice(0, n);
}

// ---------------- chart ----------------

/**
 * Single-series bar chart as inline SVG. One hue (the accent), rounded data ends anchored to the baseline,
 * a 2px gap between bars, recessive axis. Tap / hover a bar to read its value in the caption line.
 * bars: [{label, value, tip}]
 */
export function barChart(bars, { id, ticks = [], caption = '' }) {
  const W = 320, H = 120, top = 16, base = H - 18;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const slot = W / bars.length;
  const bw = Math.max(2, slot - 2);
  const r = Math.min(4, bw / 2);
  const y = (v) => base - (v / max) * (base - top);
  const rects = bars.map((b, i) => {
    const x = i * slot + 1;
    const h = base - y(b.value);
    const shape = b.value <= 0 ? ''
      : h <= r ? `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" class="bar"/>`
        : `<path class="bar" d="M${x},${base}V${y(b.value) + r}q0,-${r} ${r},-${r}h${bw - 2 * r}q${r},0 ${r},${r}V${base}Z"/>`;
    return `<g class="bar-g" data-i="${i}" tabindex="0" role="img" aria-label="${esc(b.tip)}">
      <rect x="${i * slot}" y="0" width="${slot}" height="${H}" class="hit"/>${shape}</g>`;
  }).join('');
  const tickText = ticks.map(([i, t]) => {
    const x = Math.min(W - 2, Math.max(2, i * slot + slot / 2));
    const anchor = i === 0 ? 'start' : i === bars.length - 1 ? 'end' : 'middle';
    return `<text x="${x}" y="${H - 4}" text-anchor="${anchor}" class="tick">${esc(t)}</text>`;
  }).join('');
  return `<figure class="chart" id="${id}">
    <p class="chart-read small" aria-live="polite">${esc(caption)}</p>
    <svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(caption)}">
      <line x1="0" x2="${W}" y1="${top}" y2="${top}" class="grid"/>
      <text x="0" y="${top - 4}" class="tick">${max}</text>
      ${rects}
      <line x1="0" x2="${W}" y1="${base}" y2="${base}" class="axis"/>
      ${tickText}
    </svg>
    <details class="chart-table"><summary class="small muted">Show as a table</summary>
      <table>${bars.map((b) => `<tr><td>${esc(b.label)}</td><td>${b.value}</td></tr>`).join('')}</table></details>
  </figure>`;
}

function wireChart(root, bars, caption) {
  const read = root.querySelector('.chart-read');
  const gs = root.querySelectorAll('.bar-g');
  const show = (g) => {
    gs.forEach((x) => x.classList.toggle('on', x === g));
    read.textContent = g ? bars[g.dataset.i].tip : caption;
  };
  gs.forEach((g) => {
    g.addEventListener('pointerenter', () => show(g));
    g.addEventListener('click', () => show(g));
    g.addEventListener('focus', () => show(g));
  });
  root.querySelector('svg').addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') show(null); });
}

// ---------------- screen ----------------

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtDate = (d) => `${WEEKDAY[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
const pct = (x) => `${Math.round(x * 100)}%`;

export function renderStats(app, { state, store, say, ICON }) {
  const cards = [...state.cards.values()];
  const now = Date.now();
  const st = stages(cards);
  const days30 = lastDays(state.stats.days, store.todayKey, 30, now);
  const week = days30.slice(-7);
  const recall = measuredRecall(days30);
  const avg = averageRecall(cards, now);
  const daysPractised = Object.values(state.stats.days).filter((d) => d.reviews || d.talks).length;
  const target = state.settings.retention;

  const fc = forecast(cards, now, 14);
  const fcBars = fc.map((v, i) => {
    const d = new Date(now + i * DAY_MS);
    const when = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtDate(d);
    return { label: when, value: v, tip: `${when}: ${v} review${v === 1 ? '' : 's'} due${i === 0 ? ' (including overdue)' : ''}` };
  });
  const fcCaption = `${fc.slice(0, 7).reduce((a, b) => a + b, 0)} reviews due in the next 7 days. Tap a bar for the day.`;

  const actBars = days30.map((d) => {
    const n = d.reviews || 0;
    const mins = Math.round((d.seconds || 0) / 60 + (d.talkMinutes || 0));
    return { label: fmtDate(d.date), value: n, tip: `${fmtDate(d.date)}: ${n} answer${n === 1 ? '' : 's'}${mins ? `, ${mins} min` : ''}${d.talks ? `, ${d.talks} talk${d.talks === 1 ? '' : 's'}` : ''}` };
  });
  const actCaption = `${minutesIn(week)} min this week · ${minutesIn(days30)} min in 30 days. Tap a bar for the day.`;

  const recallMsg = recall.rate == null
    ? '<p class="muted small">Shows up once you have done some reviews of words learned on earlier days.</p>'
    : `<p class="small">${recall.rate >= target - 0.03 ? '✅ Right on target. The scheduler is working as intended.'
      : recall.rate >= target - 0.1 ? '🟡 A little below target. Normal while new words settle in.'
        : '🔴 Well below target. Try fewer new words per day for a while (Settings).'} <span class="muted">Based on ${recall.n} review${recall.n === 1 ? '' : 's'} in the last 30 days.</span></p>`;

  const hard = hardest(cards);
  const unitRows = UNITS.map((u) => {
    const started = u.items.filter((i) => state.cards.get(i.id)?.s != null).length;
    const known = u.items.filter((i) => (state.cards.get(i.id)?.s || 0) >= KNOWN_DAYS).length;
    return { u, started, known };
  }).filter((r) => r.started);

  app.innerHTML = `<h1>Stats</h1>
    <section class="card">
      <div class="stat-row">
        <div><span class="num">🔥 ${store.streak()}</span><span class="lbl">day streak</span></div>
        <div><span class="num">${daysPractised}</span><span class="lbl">days practised</span></div>
        <div><span class="num">${minutesIn(week)}</span><span class="lbl">min this week</span></div>
      </div>
    </section>

    <section class="card">
      <h2>Words and phrases</h2>
      <div class="stat-row">
        <div><span class="num">${st.known}</span><span class="lbl">known</span></div>
        <div><span class="num">${st.learning}</span><span class="lbl">learning</span></div>
        <div><span class="num">${st.notStarted}</span><span class="lbl">to go</span></div>
      </div>
      <div class="progress stacked" role="img" aria-label="${st.known} known, ${st.learning} learning, ${st.notStarted} not started, of ${st.total}">
        <div class="known" style="width:${(st.known / st.total) * 100}%"></div><div class="learning" style="width:${(st.learning / st.total) * 100}%"></div>
      </div>
      <p class="muted small">"Known" means your memory of it should last 3 weeks or more without review.</p>
    </section>

    <section class="card">
      <h2>Recall</h2>
      <div class="stat-row two">
        <div><span class="num">${recall.rate == null ? '–' : pct(recall.rate)}</span><span class="lbl">remembered in reviews<br>(target ${pct(target)})</span></div>
        <div><span class="num">${avg == null ? '–' : pct(avg)}</span><span class="lbl">estimated recall<br>of all your words now</span></div>
      </div>
      ${recallMsg}
    </section>

    <section class="card">
      <h2>Coming up</h2>
      ${barChart(fcBars, { id: 'chart-forecast', ticks: [[0, 'Today'], [7, '+7 days'], [13, '+13']], caption: fcCaption })}
    </section>

    <section class="card">
      <h2>Last 30 days</h2>
      ${barChart(actBars, { id: 'chart-activity', ticks: [[0, fmtDate(days30[0].date)], [29, 'Today']], caption: actCaption })}
    </section>

    ${unitRows.length ? `<section class="card"><h2>By unit</h2><ul class="unit-stats">${unitRows.map(({ u, started, known }) => `
      <li><span class="u-num">${u.n}</span><span class="grow"><span><b>${esc(u.title)}</b> <span class="chip">${levelOf(u.n)}</span></span>
        <span class="muted small">${known} known · ${started}/${u.items.length} started</span>
        <span class="progress thin stacked"><span class="known" style="width:${(known / u.items.length) * 100}%"></span><span class="learning" style="width:${((started - known) / u.items.length) * 100}%"></span></span></span></li>`).join('')}
    </ul></section>` : ''}

    ${hard.length ? `<section class="card"><h2>Trickiest words</h2>
      <p class="muted small">Forgotten most often. Adding a memory hook helps: you'll be offered one when you miss them.</p>
      <ul class="item-list">${hard.map((c) => {
        const i = ITEM_BY_ID.get(c.id);
        return `<li><button class="icon-btn inline" data-say="${esc(i.pt)}" aria-label="Play">${ICON.play}</button>
          <span class="pt">${esc(i.pt)}</span><span class="en">${esc(i.en)}</span><span class="chip learning">${c.lapses}× forgotten</span>
          ${c.hook ? `<span class="hook small">💡 ${esc(c.hook)}</span>` : ''}</li>`;
      }).join('')}</ul></section>` : ''}`;

  wireChart(app.querySelector('#chart-forecast'), fcBars, fcCaption);
  wireChart(app.querySelector('#chart-activity'), actBars, actCaption);
  app.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => say(b.dataset.say)));
}
