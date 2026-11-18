// A Novela: a daily episode of a little soap opera set in Lisbon, written by the AI
// from the words you already know plus 2–3 new ones (reading you can almost fully
// understand is one of the fastest ways to grow vocabulary). Tap any word for its meaning.

import { UNITS, HER, MINE, ITEM_BY_ID, levelOf, customItem, registerCustom, slug } from './content.js';
import { chat, parseJsonReply } from './openrouter.js';
import { newPool } from './session.js';
import { DEFAULT_TUTOR_MODEL } from './tutor.js';
import { esc, ICON } from './exercises.js';

export const UNLOCK_AT = 40; // words started
const CAST = `Tom: an Englishman in Lisbon, secretly learning Portuguese to surprise his girlfriend. Kind, clumsy, makes funny mistakes.
Inês: his girlfriend, from Lisbon, clever and teasing. She suspects nothing (yet).
Dona Graça: the nosy neighbour downstairs. She notices everything and loves to gossip.
Rui: Tom's friend, works at the pastelaria on the corner, terrible at keeping secrets.`;

const LEVEL = {
  A1: 'A1 beginner: very short sentences (max ~10 words), present tense, lots of simple dialogue.',
  A2: 'A2: short sentences (max ~14 words). Present, pretérito perfeito and "ir + infinitive" are fine.',
};

/** Words the learner has started, newest course words last. */
export function knownWords(st) {
  return [...MINE, ...UNITS.flatMap((u) => u.items), ...HER.items].filter((i) => st.cards.get(i.id)?.s).map((i) => i.pt);
}

export const startedCount = (st) => [...st.cards.values()].filter((c) => c.s && ITEM_BY_ID.get(c.id)?.kind === 'vocab').length;

function currentLevel(st) {
  let unit = 1;
  for (const u of UNITS) if (u.items.some((i) => st.cards.get(i.id)?.s)) unit = u.n;
  return levelOf(unit);
}

export function episodePrompt(st, episodes, newWords) {
  const level = currentLevel(st);
  const story = episodes.slice(-5).map((e) => `Episode ${e.n}: ${e.summary}`).join('\n') || 'This is episode 1. Start the story.';
  return `You write one daily episode of a light, funny soap opera ("novela") set in Lisbon, for a learner of EUROPEAN Portuguese.

CHARACTERS
${CAST}

STORY SO FAR
${story}

RULES
- European Portuguese only, as spoken in Portugal: "estar a + infinitive" (never the gerund), Portugal words (pequeno-almoço, autocarro, telemóvel, fixe, giro, casa de banho), pronouns after the verb in statements (chama-se, levanto-me), tu between friends.
- Level: ${LEVEL[level]}
- 110–170 words, 4–6 short paragraphs, mostly dialogue.
- Build it from words the learner knows: ${knownWords(st).slice(-250).join('; ')}
- Use each of these NEW words once, naturally, so the meaning is clear from context: ${newWords.map((w) => `${w.pt} (${w.en})`).join('; ') || '(none today)'}
- Any other word must be very common and easy to guess.
- Keep the story moving and end on a small cliffhanger.

Reply with JSON only:
{"title": "<short Portuguese title>",
 "paragraphs": ["<Portuguese paragraph>", ...],
 "english": ["<English translation of each paragraph>", ...],
 "glossary": {"<every distinct word in the story, lowercase, as written>": "<short English meaning in this context>"},
 "summary": "<two English sentences: what happened, for continuity>",
 "question": {"q": "<simple comprehension question in Portuguese>", "options": ["<answer>", "<answer>", "<answer>"], "answer": <index of the right option>}}`;
}

export function parseEpisode(text) {
  const j = parseJsonReply(text || '');
  if (!j || !Array.isArray(j.paragraphs) || !j.paragraphs.length) return null;
  const glossary = {};
  for (const [k, v] of Object.entries(j.glossary || {})) if (typeof v === 'string') glossary[k.toLowerCase().trim()] = v;
  const q = j.question;
  return {
    title: String(j.title || 'Episódio'),
    paragraphs: j.paragraphs.map(String),
    english: Array.isArray(j.english) ? j.english.map(String) : [],
    glossary,
    summary: String(j.summary || ''),
    question: q && Array.isArray(q.options) && Number.isInteger(q.answer) ? { q: String(q.q || ''), options: q.options.map(String), answer: q.answer } : null,
  };
}

/** Course words by their plain spelling, for tap-to-translate when the glossary misses one. */
let courseIndex = null;
function lookup(word, ep) {
  const w = word.toLowerCase();
  if (ep.glossary[w]) return ep.glossary[w];
  if (!courseIndex) {
    courseIndex = new Map();
    for (const it of ITEM_BY_ID.values()) {
      if (it.kind !== 'vocab') continue;
      const bare = it.pt.toLowerCase().replace(/^(o|a|os|as|um|uma)\s+/, '').replace(/[?!.,]/g, '');
      if (!bare.includes(' ')) courseIndex.set(slug(bare), it.en);
    }
  }
  return courseIndex.get(slug(w)) || null;
}

// ---------------- screens ----------------

export function renderNovela(app, arg, d) {
  const st = d.state;
  const eps = st.novela;
  const n = startedCount(st);
  const hasKey = !!st.settings.apiKey;
  if (arg) return renderEpisode(app, Number(arg), d);
  const todays = eps.find((e) => e.date === d.store.todayKey());
  app.innerHTML = `<a class="back" href="#/home">‹ Home</a><h1>A Novela 📖</h1>
    <p class="muted">A new episode every day, written from the words you know plus 2–3 new ones. Tap any word for its meaning.</p>
    <details class="card"><summary>Who's who</summary><ul class="small">${CAST.split('\n').map((l) => `<li>${esc(l)}</li>`).join('')}</ul></details>
    ${n < UNLOCK_AT
      ? `<section class="card"><p><b>Unlocks at ${UNLOCK_AT} words.</b> You've started ${n}. Keep going!</p>
         <div class="progress"><div style="width:${(n / UNLOCK_AT) * 100}%"></div></div></section>`
      : !hasKey ? '<section class="card"><p>Needs an OpenRouter key (Settings → Speaking &amp; AI) to write the episodes.</p></section>'
        : todays ? `<a class="btn primary big" href="#/novela/${todays.n}">Read today's episode</a>`
          : '<button class="btn primary big" data-act="new">✨ Write today\'s episode</button><p class="small muted center" data-out="status"></p>'}
    ${eps.length ? `<h2 class="level-head">Episodes</h2>${eps.slice().reverse().map((e) => `<a class="card ep-card" href="#/novela/${e.n}">
      <b>${e.n}. ${esc(e.title)}</b><span class="muted small">${esc(e.date)}${e.read ? ' · read' : ''}</span></a>`).join('')}` : ''}`;

  app.querySelector('[data-act="new"]')?.addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    const status = app.querySelector('[data-out="status"]');
    btn.disabled = true;
    status.textContent = 'Writing today\'s episode… (about 20 seconds)';
    try {
      const newWords = newPool(st).slice(0, 3).map((i) => ({ pt: i.pt, en: i.en }));
      const raw = await chat(st.settings.apiKey, [{ role: 'user', content: episodePrompt(st, eps, newWords) }],
        { model: st.settings.tutorModel || DEFAULT_TUTOR_MODEL, temperature: 0.8, max_tokens: 3500, json: true });
      const ep = parseEpisode(raw);
      if (!ep) throw new Error('The episode came back garbled. Try again.');
      const n2 = (eps[eps.length - 1]?.n || 0) + 1;
      st.novela.push({ ...ep, n: n2, date: d.store.todayKey(), newWords, level: currentLevel(st) });
      await d.store.saveNovela();
      d.go(`novela/${n2}`);
    } catch (err) {
      status.textContent = err.message;
      btn.disabled = false;
    }
  });
  return null;
}

function renderEpisode(app, n, d) {
  const st = d.state;
  const ep = st.novela.find((e) => e.n === n);
  if (!ep) { d.go('novela', true); return null; }
  const newSet = new Set((ep.newWords || []).flatMap((w) => w.pt.toLowerCase().split(/\s+/)));
  const words = (p) => p.split(/([\p{L}\p{M}]+(?:-[\p{L}\p{M}]+)*)/u).map((t, i) =>
    i % 2 ? `<button class="w ${newSet.has(t.toLowerCase()) ? 'new' : ''}" data-w="${esc(t)}">${esc(t)}</button>` : esc(t)).join('');
  app.innerHTML = `<a class="back" href="#/novela">‹ A Novela</a>
    <h1>${ep.n}. ${esc(ep.title)}</h1>
    <div class="row"><button class="btn small" data-act="all">${ICON.play} Read it to me</button>
      <button class="btn ghost small" data-act="stop">Stop</button></div>
    ${ep.paragraphs.map((p, i) => `<div class="card para">
      <p class="story" lang="pt-PT">${words(p)}</p>
      <div class="row"><button class="icon-btn inline" data-say-p="${i}" aria-label="Play">${ICON.play}</button>
        ${ep.english[i] ? `<button class="btn ghost small" data-en="${i}">English</button>` : ''}</div>
      ${ep.english[i] ? `<p class="muted small" data-en-text="${i}" hidden>${esc(ep.english[i])}</p>` : ''}
    </div>`).join('')}
    ${ep.newWords?.length ? `<p class="small muted">New today: ${ep.newWords.map((w) => `<b>${esc(w.pt)}</b> (${esc(w.en)})`).join(', ')}. They'll come up in your sessions soon.</p>` : ''}
    ${ep.question ? `<section class="card"><h3>${esc(ep.question.q)}</h3><div class="choices">${ep.question.options.map((o, i) =>
      `<button class="choice" data-q="${i}">${esc(o)}</button>`).join('')}</div></section>` : ''}
    <div class="sheet" hidden><div class="sheet-in">
      <p><span class="pt" data-out="w"></span> <button class="icon-btn inline" data-act="say-w">${ICON.play}</button></p>
      <p data-out="m"></p>
      <div class="row"><button class="btn small" data-act="add-w">➕ Add to my words</button><button class="btn ghost small" data-act="close">Close</button></div>
    </div></div>`;

  if (!ep.read) {
    ep.read = true;
    const today = d.store.todayStats();
    today.stories = (today.stories || 0) + 1;
    d.store.saveStats();
    d.store.saveNovela();
  }

  let reading = false;
  app.querySelector('[data-act="all"]').addEventListener('click', async () => {
    reading = true;
    for (const p of ep.paragraphs) { if (!reading) break; await d.say(p); }
    reading = false;
  });
  app.querySelector('[data-act="stop"]').addEventListener('click', () => { reading = false; d.stopSpeaking(); });
  app.querySelectorAll('[data-say-p]').forEach((b) => b.addEventListener('click', () => { reading = false; d.say(ep.paragraphs[b.dataset.sayP]); }));
  app.querySelectorAll('[data-en]').forEach((b) => b.addEventListener('click', () => {
    const el = app.querySelector(`[data-en-text="${b.dataset.en}"]`);
    el.hidden = !el.hidden;
    b.textContent = el.hidden ? 'English' : 'Hide';
  }));

  const sheet = app.querySelector('.sheet');
  let current = null;
  app.querySelectorAll('.w').forEach((b) => b.addEventListener('click', () => {
    const w = b.dataset.w;
    current = { pt: w.toLowerCase(), en: lookup(w, ep) };
    app.querySelector('[data-out="w"]').textContent = w;
    app.querySelector('[data-out="m"]').textContent = current.en || "Not in today's word list.";
    app.querySelector('[data-act="add-w"]').disabled = !current.en;
    sheet.hidden = false;
    d.say(w);
  }));
  app.querySelector('[data-act="say-w"]').addEventListener('click', () => current && d.say(current.pt));
  app.querySelector('[data-act="close"]').addEventListener('click', () => { sheet.hidden = true; });
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.hidden = true; });
  app.querySelector('[data-act="add-w"]').addEventListener('click', async () => {
    if (!current?.en) return;
    if (d.state.custom.some((c) => c.pt.toLowerCase() === current.pt)) { d.toast('Already in your words'); return; }
    const item = customItem({ pt: current.pt, en: current.en, source: 'novela' });
    d.state.custom.push(item);
    registerCustom([item]);
    await d.store.saveCustom();
    d.toast('Added. It\'ll come up in your next session.');
    sheet.hidden = true;
  });
  app.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
    const right = Number(b.dataset.q) === ep.question.answer;
    app.querySelectorAll('[data-q]').forEach((x) => { x.disabled = true; if (Number(x.dataset.q) === ep.question.answer) x.classList.add('right'); });
    if (!right) b.classList.add('wrong');
  }));
  return () => { reading = false; };
}
