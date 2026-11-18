// Exercise screens. Each renderer draws into `root` and calls ctx.done(result, info)
// with result in: correct | accent | almost | wrong | ack (for ungraded screens).

import { grade } from './grade.js';
import { distractors, tilesFor } from './session.js';
import { LESSON_BY_ID } from './content.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  slow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17h13a5 5 0 0 0 0-10c-3 0-5 2-5 5v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="18" cy="9" r="1.2"/><path d="M6 17l-1 3M13 17l1 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

const ACCENTS = ['ã', 'õ', 'ç', 'á', 'à', 'â', 'é', 'ê', 'í', 'ó', 'ô', 'ú'];

const answers = (item) => [item.pt, ...(item.accept || [])];

function audioButtons(withSlow = true, big = false) {
  return `<div class="audio-row">
    <button class="icon-btn play ${big ? 'big' : ''}" data-act="play" aria-label="Play">${ICON.play}</button>
    ${withSlow ? `<button class="icon-btn slow" data-act="slow" aria-label="Play slowly">${ICON.slow}</button>` : ''}
  </div>`;
}

function wireAudio(root, ctx, text, opts = {}) {
  root.querySelectorAll('[data-act="play"]').forEach((b) => b.addEventListener('click', () => ctx.speak(text, opts)));
  root.querySelectorAll('[data-act="slow"]').forEach((b) => b.addEventListener('click', () => ctx.speak(text, { ...opts, rate: ctx.settings.slowRate })));
}

function shuffled(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Generic multiple choice: options [{label, correct}] */
function choices(root, options, onPick) {
  const box = root.querySelector('.choices');
  box.innerHTML = options.map((o, i) => `<button class="choice" data-i="${i}">${o.label}</button>`).join('');
  box.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.choice');
    if (!btn || box.dataset.locked) return;
    box.dataset.locked = '1';
    const i = Number(btn.dataset.i);
    box.querySelectorAll('.choice').forEach((b, j) => {
      b.disabled = true;
      if (options[j].correct) b.classList.add('right');
    });
    if (!options[i].correct) btn.classList.add('wrong');
    onPick(options[i].correct, i);
  });
}

function mcOptions(item, ctx, labelOf) {
  const opts = [item, ...distractors(item, 3, ctx.rand)];
  return shuffled(opts, ctx.rand).map((o) => ({ label: labelOf(o), correct: o === item }));
}

function accentBar(input) {
  const bar = document.createElement('div');
  bar.className = 'accent-bar';
  bar.innerHTML = ACCENTS.map((a) => `<button type="button" tabindex="-1">${a}</button>`).join('');
  bar.addEventListener('pointerdown', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    ev.preventDefault(); // keep keyboard open
    const { selectionStart: s, selectionEnd: e, value } = input;
    input.value = value.slice(0, s) + b.textContent + value.slice(e);
    input.setSelectionRange(s + 1, s + 1);
    input.focus();
  });
  return bar;
}

const inputAttrs = 'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" lang="pt-PT"';

// ---------------- renderers ----------------

const R = {};

R['listen-mc'] = (root, { item }, ctx) => {
  root.innerHTML = `<p class="instr">What does this mean?</p>${audioButtons(true, true)}<div class="choices"></div>`;
  wireAudio(root, ctx, item.pt);
  ctx.speak(item.pt);
  choices(root, mcOptions(item, ctx, (o) => esc(o.en)), (ok) => ctx.done(ok ? 'correct' : 'wrong'));
};

R['read-mc'] = (root, { item }, ctx) => {
  root.innerHTML = `<p class="instr">What does this mean?</p>
    <div class="prompt pt">${esc(item.pt)} <button class="icon-btn inline" data-act="play" aria-label="Play">${ICON.play}</button></div>
    <div class="choices"></div>`;
  wireAudio(root, ctx, item.pt);
  choices(root, mcOptions(item, ctx, (o) => esc(o.en)), (ok) => ctx.done(ok ? 'correct' : 'wrong'));
};

R['en-mc'] = (root, { item }, ctx) => {
  root.innerHTML = `<p class="instr">How do you say this in Portuguese?</p>
    <div class="prompt">${esc(item.en)}</div><div class="choices pt"></div>`;
  choices(root, mcOptions(item, ctx, (o) => esc(o.pt)), (ok) => ctx.done(ok ? 'correct' : 'wrong'));
};

R.tiles = (root, { item }, ctx) => {
  const tiles = tilesFor(item, ctx.rand);
  root.innerHTML = `<p class="instr">Build it in Portuguese</p>
    <div class="prompt">${esc(item.en)}</div>
    <div class="tile-answer" aria-label="Your answer"></div>
    <div class="tile-bank">${tiles.map((t, i) => `<button class="tile" data-i="${i}">${esc(t)}</button>`).join('')}</div>
    <div class="actions"><button class="btn primary" data-act="check" disabled>Check</button></div>`;
  const ans = root.querySelector('.tile-answer');
  const bank = root.querySelector('.tile-bank');
  const check = root.querySelector('[data-act="check"]');
  const picked = [];
  const sync = () => {
    ans.innerHTML = picked.map((i, k) => `<button class="tile" data-k="${k}">${esc(tiles[i])}</button>`).join('');
    bank.querySelectorAll('.tile').forEach((b) => { b.classList.toggle('used', picked.includes(Number(b.dataset.i))); });
    check.disabled = picked.length === 0;
  };
  bank.addEventListener('click', (ev) => {
    const b = ev.target.closest('.tile');
    if (!b || b.classList.contains('used') || root.dataset.locked) return;
    picked.push(Number(b.dataset.i));
    ctx.speakWord?.(tiles[Number(b.dataset.i)]);
    sync();
  });
  ans.addEventListener('click', (ev) => {
    const b = ev.target.closest('.tile');
    if (!b || root.dataset.locked) return;
    picked.splice(Number(b.dataset.k), 1);
    sync();
  });
  check.addEventListener('click', () => {
    root.dataset.locked = '1';
    check.disabled = true;
    const input = picked.map((i) => tiles[i]).join(' ');
    const g = grade(input, answers(item));
    // Tiles can't have typos, so "almost" only for a missing article
    const result = g.result === 'almost' && g.reason !== 'article' ? 'wrong' : g.result;
    ctx.done(result, { input, answer: g.answer, reason: g.reason, typed: true });
  });
};

function typingExercise(root, item, ctx, { dictation }) {
  root.innerHTML = `<p class="instr">${dictation ? 'Type what you hear' : 'Type it in Portuguese'}</p>
    ${dictation ? audioButtons(true, true) : `<div class="prompt">${esc(item.en)}</div>`}
    <form class="type-form"><input class="type-input" type="text" ${inputAttrs} placeholder="Escreve aqui…" />
    </form>
    <div class="actions">
      <button class="btn primary" data-act="check">Check</button>
      <div class="row">
        ${dictation ? '' : '<button class="btn ghost" data-act="hint">Hint</button>'}
        <button class="btn ghost" data-act="dunno">I don't know</button>
        <button class="btn ghost" data-act="easier">Can't type now</button>
      </div>
    </div>`;
  const form = root.querySelector('form');
  const input = root.querySelector('input');
  form.appendChild(accentBar(input));
  if (dictation) { wireAudio(root, ctx, item.pt); ctx.speak(item.pt); }
  let hints = 0;
  let finished = false;
  const submit = () => {
    if (finished) return;
    if (!input.value.trim()) { input.focus(); return; }
    finished = true;
    input.blur();
    const g = grade(input.value, answers(item));
    let result = g.result;
    if (hints > 0 && (result === 'correct' || result === 'accent')) result = 'almost';
    ctx.done(result, { input: input.value, answer: g.answer, reason: hints ? 'hint' : g.reason, typed: true });
  };
  form.addEventListener('submit', (ev) => { ev.preventDefault(); submit(); });
  root.querySelector('[data-act="check"]').addEventListener('click', submit);
  root.querySelector('[data-act="dunno"]').addEventListener('click', () => {
    if (finished) return;
    finished = true;
    ctx.done('wrong', { input: '', answer: item.pt, reason: 'dunno' });
  });
  root.querySelector('[data-act="easier"]').addEventListener('click', () => { if (!finished) ctx.switchTo('easier'); });
  root.querySelector('[data-act="hint"]')?.addEventListener('click', () => {
    hints++;
    const target = item.pt;
    const n = Math.min(target.length, hints * Math.max(1, Math.ceil(target.length / 5)));
    input.value = target.slice(0, n);
    input.focus();
  });
  setTimeout(() => input.focus(), 50);
}

R.dictation = (root, { item }, ctx) => typingExercise(root, item, ctx, { dictation: true });
R.type = (root, { item }, ctx) => typingExercise(root, item, ctx, { dictation: false });

R.intro = (root, { item, card }, ctx) => {
  root.innerHTML = `<p class="tag new">New</p>
    <p class="instr">Guess first: what do you think this means?</p>
    <div class="prompt pt">${esc(item.pt)} <button class="icon-btn inline" data-act="play" aria-label="Play">${ICON.play}</button></div>
    <div class="choices"></div>`;
  wireAudio(root, ctx, item.pt);
  ctx.speak(item.pt);
  choices(root, mcOptions(item, ctx, (o) => esc(o.en)), (ok) => {
    const reveal = document.createElement('div');
    reveal.className = 'reveal';
    reveal.innerHTML = `<p class="${ok ? 'good' : 'muted'}">${ok ? 'Nice guess!' : 'No problem: guessing first helps you remember.'}</p>
      <div class="card-face"><div class="pt">${esc(item.pt)}</div><div class="en">${esc(item.en)}</div>
      ${item.note ? `<p class="note">${esc(item.note)}</p>` : ''}
      ${card?.hook ? `<p class="hook">💡 ${esc(card.hook)}</p>` : ''}</div>
      <div class="actions"><button class="btn primary" data-act="next">Got it</button></div>`;
    root.appendChild(reveal);
    ctx.speak(item.pt);
    reveal.querySelector('[data-act="next"]').addEventListener('click', () => ctx.done('ack'));
    reveal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
};

R['intro-pair'] = (root, { item }, ctx) => {
  root.innerHTML = `<p class="tag ear">Ear training</p>
    <p class="instr">These two sound similar. Listen to each a few times.</p>
    <div class="pair-intro">
      ${[item.a, item.b].map((w, i) => `<button class="pair-word" data-w="${i}">
        <span class="pt">${esc(w.pt)}</span><span class="en">${esc(w.en)}</span>${ICON.play}</button>`).join('')}
    </div>
    ${item.note ? `<p class="note">${esc(item.note)}</p>` : ''}
    <div class="actions"><button class="btn primary" data-act="next">Ready</button></div>`;
  root.querySelectorAll('.pair-word').forEach((b) => b.addEventListener('click', () => {
    const w = b.dataset.w === '0' ? item.a : item.b;
    ctx.speak(w.pt, { vary: true });
  }));
  root.querySelector('[data-act="next"]').addEventListener('click', () => ctx.done('ack'));
};

function stressMarkup(item, highlight = true) {
  return item.syl.map((s, i) => (highlight && i === item.stress ? `<b class="stressed">${esc(s)}</b>` : esc(s))).join('·');
}

R['intro-stress'] = (root, { item }, ctx) => {
  root.innerHTML = `<p class="tag ear">Ear training: stress</p>
    <p class="instr">European Portuguese swallows unstressed vowels, so hearing the stress is half the battle.</p>
    <div class="prompt pt">${stressMarkup(item)} <button class="icon-btn inline" data-act="play" aria-label="Play">${ICON.play}</button></div>
    <p class="en center">${esc(item.en)}</p>
    <div class="actions"><button class="btn primary" data-act="next">Ready</button></div>`;
  wireAudio(root, ctx, item.pt);
  ctx.speak(item.pt);
  root.querySelector('[data-act="next"]').addEventListener('click', () => ctx.done('ack'));
};

R.pair = (root, { item }, ctx) => {
  const target = ctx.rand() < 0.5 ? 0 : 1;
  const words = [item.a, item.b];
  const say = (rate) => ctx.speak(words[target].pt, { vary: true, rate });
  root.innerHTML = `<p class="tag ear">Ear training</p><p class="instr">Which word do you hear?</p>
    ${audioButtons(true, true)}<div class="choices two"></div>`;
  root.querySelector('[data-act="play"]').addEventListener('click', () => say());
  root.querySelector('[data-act="slow"]').addEventListener('click', () => say(ctx.settings.slowRate));
  say();
  choices(root, words.map((w, i) => ({ label: `<span class="pt">${esc(w.pt)}</span><small>${esc(w.en)}</small>`, correct: i === target })),
    (ok) => ctx.done(ok ? 'correct' : 'wrong', { heard: true, target: words[target].pt }));
};

R['pair-read'] = (root, { item }, ctx) => {
  const target = ctx.rand() < 0.5 ? 0 : 1;
  const words = [item.a, item.b];
  root.innerHTML = `<p class="tag ear">Spelling contrast</p><p class="instr">Which word means "${esc(words[target].en)}"?</p><div class="choices two"></div>`;
  choices(root, words.map((w, i) => ({ label: `<span class="pt">${esc(w.pt)}</span>`, correct: i === target })),
    (ok) => ctx.done(ok ? 'correct' : 'wrong', { target: words[target].pt }));
};

function stressExercise(root, item, ctx, listen) {
  root.innerHTML = `<p class="tag ear">Ear training: stress</p>
    <p class="instr">Which syllable is stressed?</p>
    ${listen ? audioButtons(true, true) : ''}
    <div class="syllables">${item.syl.map((s, i) => `<button class="syl" data-i="${i}">${esc(s.toLowerCase())}</button>`).join('')}</div>
    <p class="en center">${esc(item.en)}</p>`;
  if (listen) { wireAudio(root, ctx, item.pt); ctx.speak(item.pt); }
  const box = root.querySelector('.syllables');
  box.addEventListener('click', (ev) => {
    const b = ev.target.closest('.syl');
    if (!b || box.dataset.locked) return;
    box.dataset.locked = '1';
    const ok = Number(b.dataset.i) === item.stress;
    box.querySelectorAll('.syl').forEach((x, i) => { x.disabled = true; if (i === item.stress) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    ctx.done(ok ? 'correct' : 'wrong');
  });
}

R.stress = (root, { item }, ctx) => stressExercise(root, item, ctx, true);
R['stress-read'] = (root, { item }, ctx) => stressExercise(root, item, ctx, false);

R.lesson = (root, { entry }, ctx) => {
  const lesson = LESSON_BY_ID.get(entry.lessonId);
  root.innerHTML = `<p class="tag grammar">Grammar</p><h2>${esc(lesson.title)}</h2>
    <div class="lesson-body">${lesson.body}</div>
    <div class="actions"><button class="btn primary" data-act="next">Continue</button></div>`;
  root.querySelector('[data-act="next"]').addEventListener('click', () => ctx.done('ack'));
};

export function renderExercise(type, root, data, ctx) {
  const fn = R[type];
  if (!fn) throw new Error(`Unknown exercise type ${type}`);
  root.innerHTML = '';
  root.dataset.type = type;
  delete root.dataset.locked;
  fn(root, data, ctx);
}

export { stressMarkup };
