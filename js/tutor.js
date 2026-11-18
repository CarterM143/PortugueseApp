// Conversation tutor: AI role-play (OpenRouter) with a prompt-first correction ladder,
// plus a scripted offline fallback. No DOM here.

import { chat, parseJsonReply } from './openrouter.js';
import { assessSpeech } from './pronounce.js';
import { grade, stripAccents } from './grade.js';
import { levelOf } from './content.js';

export const DEFAULT_TUTOR_MODEL = 'mistralai/voxtral-small-24b-2507';
export const TUTOR_SUGGESTIONS = [
  ['mistralai/voxtral-small-24b-2507', 'Voxtral Small 24B (open weights, text + voice, fast)'],
  ['deepseek/deepseek-v4-flash', 'DeepSeek V4 Flash (open weights, text only)'],
  ['google/gemma-4-31b-it', 'Gemma 4 31B (open weights, text only)'],
  ['thinkingmachines/inkling-small', 'Inkling Small (open weights, text + voice)'],
];

/** Models that can listen to the learner's audio directly. */
export const acceptsAudio = (model) => /voxtral|inkling|omni|gpt-audio|gemini/i.test(model || '');

const MAX_HISTORY = 16;
export const MAX_LEARNER_TURNS = 24;

// ---------------- prompts ----------------

const LEVEL_GUIDE = {
  A1: 'The learner is an A1 beginner. Use very short, simple sentences (max ~12 words) and common words, mostly in the present tense. One question at a time.',
  A2: 'The learner is around A2. Use short, clear sentences (max ~16 words). Present, the past (pretérito perfeito) and "ir + infinitive" are fine. One question at a time.',
};

export function systemPrompt(scenario, known) {
  const knownList = known.slice(-200).join('; ');
  const level = levelOf(scenario.unit);
  return `You are a friendly tutor helping a beginner practise EUROPEAN Portuguese (Portugal, NOT Brazil) through a short role-play.

SCENARIO: ${scenario.setting}
YOU PLAY: ${scenario.role}
LEARNER'S GOALS (numbered from 0): ${scenario.goals.map((g, i) => `${i}. ${g}`).join(' ')}

LANGUAGE RULES
- Only European Portuguese as spoken in Portugal: tu / você / o senhor as used in Portugal, "estar a + infinitive" (never the gerund), Portugal vocabulary (pequeno-almoço, autocarro, comboio, casa de banho, sumo, sandes, ementa, telemóvel, fixe, giro), pronouns after the verb in statements (chamo-me, chama-se).
- ${LEVEL_GUIDE[level]}
- Prefer words the learner already knows: ${knownList || '(basic greetings)'}.

UNDERSTANDING THE LEARNER
- They may type or speak. Spoken input goes through speech recognition, so expect recognition errors, missing accents and broken grammar. Work out what they MEANT. Never comment on accents, capital letters or punctuation.
- They may be slow or unsure. Be patient and encouraging. If they write in English or ask for help, help briefly in English and give the Portuguese they need.

CORRECTION (prompt first, one thing at a time)
- Only correct real errors that matter at ${level}: wrong word, wrong verb form, wrong gender, a Brazilian form, or a meaning that is unclear.
- The message tells you the attempt number for the learner's current line:
  attempt 1 with an error: feedback.type "hint". Give a short English clue so they can fix it themselves, not the answer. retry true. reply = a short encouraging nudge in Portuguese (e.g. "Quase! Tenta outra vez.").
  attempt 2 with an error: feedback.type "explicit". Say exactly what is wrong in English, still without the full answer. retry true.
  attempt 3: feedback.type "correction". Give the corrected sentence in "corrected" with a one-line reason. retry false. Continue the role-play.
- If the line is fine for ${level}: feedback.type "none" (or "tip" for ONE optional small improvement). retry false. Continue the role-play naturally.
- Never correct more than one thing per turn.

FLOW
- Stay in character and keep moving toward the goals. When all goals are done, wrap up warmly in character and set done true.

Reply with JSON only:
{"reply": "<your line in European Portuguese>", "reply_en": "<English translation of reply>", "meant": "<what the learner meant, in English>", "feedback": {"type": "none|tip|hint|explicit|correction", "text": "<short English>", "corrected": "<corrected Portuguese, only for correction or tip>"}, "retry": false, "goals_done": [<numbers of the goals achieved so far>], "done": false}`;
}

function learnerMessage(text, { spoken, attempt, audio, model }) {
  const header = `[attempt ${attempt}] The learner ${spoken ? 'said (speech-recognition transcript, may contain recognition errors)' : 'typed'}: "${text}"`;
  if (audio && acceptsAudio(model)) {
    return {
      role: 'user',
      content: [
        { type: 'text', text: `${header}\nTheir recording is attached. If it disagrees with the transcript, trust the recording.` },
        { type: 'input_audio', input_audio: { data: audio.b64, format: 'wav' } },
      ],
    };
  }
  return { role: 'user', content: header };
}

/** Normalise whatever the model returned into the expected shape. */
export function parseTutorReply(text) {
  const j = parseJsonReply(text || '');
  if (!j || typeof j.reply !== 'string') {
    const plain = (text || '').replace(/```[a-z]*|```/g, '').trim();
    return { reply: plain.slice(0, 400), reply_en: '', meant: '', feedback: { type: 'none', text: '' }, retry: false, goals_done: [], done: false };
  }
  const fb = j.feedback && typeof j.feedback === 'object' ? j.feedback : { type: 'none', text: '' };
  return {
    reply: j.reply.trim(),
    reply_en: (j.reply_en || '').trim(),
    meant: (j.meant || '').trim(),
    feedback: { type: fb.type || 'none', text: (fb.text || '').trim(), corrected: (fb.corrected || '').trim() },
    retry: !!j.retry,
    goals_done: Array.isArray(j.goals_done) ? j.goals_done.filter((n) => Number.isInteger(n)) : [],
    done: !!j.done,
  };
}

// ---------------- AI conversation ----------------

export class AiConversation {
  constructor(scenario, { key, model, known = [], chatFn = chat }) {
    this.scenario = scenario;
    this.key = key;
    this.model = model || DEFAULT_TUTOR_MODEL;
    this.chatFn = chatFn;
    this.system = { role: 'system', content: systemPrompt(scenario, known) };
    this.history = [{ role: 'assistant', content: JSON.stringify({ reply: scenario.opening.pt, reply_en: scenario.opening.en, feedback: { type: 'none' }, retry: false, goals_done: [], done: false }) }];
    this.attempt = 1;
    this.goalsDone = new Set();
    this.learnerTurns = 0;
    this.done = false;
  }

  async send(text, { spoken = false, audio = null } = {}) {
    this.learnerTurns++;
    const msg = learnerMessage(text, { spoken, attempt: this.attempt, audio, model: this.model });
    // Keep only the text part in history (audio is large and only needed once)
    const histMsg = { role: 'user', content: typeof msg.content === 'string' ? msg.content : msg.content[0].text };
    const recent = this.history.slice(-MAX_HISTORY);
    const raw = await this.chatFn(this.key, [this.system, ...recent, msg], { model: this.model, temperature: 0.5, max_tokens: 600, json: true });
    const r = parseTutorReply(raw);
    if (this.attempt >= 3 && r.retry) { r.retry = false; } // never loop forever
    this.history.push(histMsg, { role: 'assistant', content: JSON.stringify(r) });
    this.attempt = r.retry ? this.attempt + 1 : 1;
    r.goals_done.forEach((g) => { if (g >= 0 && g < this.scenario.goals.length) this.goalsDone.add(g); });
    if (r.done || this.learnerTurns >= MAX_LEARNER_TURNS) this.done = true;
    return r;
  }

  async helpMeSay(english) {
    const raw = await this.chatFn(this.key, [
      { role: 'system', content: `You help an ${levelOf(this.scenario.unit)} learner of EUROPEAN Portuguese (Portugal). Scenario: ${this.scenario.setting} They are talking to: ${this.scenario.role}` },
      { role: 'user', content: `How do I say this, as simply as possible, in European Portuguese? "${english}"\nReply with JSON only: {"pt": "<Portuguese>", "en": "<literal English back-translation>", "note": "<optional one-line tip, or empty>"}` },
    ], { model: this.model, temperature: 0.2, max_tokens: 200, json: true });
    const j = parseJsonReply(raw);
    return j?.pt ? j : { pt: raw.trim().slice(0, 200), en: '', note: '' };
  }

  async summary() {
    const raw = await this.chatFn(this.key, [
      this.system, ...this.history.slice(-MAX_HISTORY),
      { role: 'user', content: 'The role-play is over. Step out of character and give the learner a short, encouraging summary. Reply with JSON only: {"well": "<one sentence in English on what went well>", "work_on": "<one sentence in English on the main thing to practise>", "phrases": [{"pt": "<useful European Portuguese phrase from this conversation>", "en": "<English>"}]} with at most 3 phrases.' },
    ], { model: this.model, temperature: 0.3, max_tokens: 400, json: true });
    return parseJsonReply(raw) || { well: raw.trim().slice(0, 300), work_on: '', phrases: [] };
  }
}

// ---------------- scripted (offline) conversation ----------------

export function checkScripted(turn, { text, transcripts, spoken }) {
  const answers = turn.expect;
  const cands = spoken ? (transcripts || []) : [text];
  const plain = cands.map((c) => stripAccents(c || '')).join(' | ');
  const onTopic = (turn.keywords || []).some((k) => plain.includes(stripAccents(k)));
  let tier;
  if (spoken) tier = assessSpeech(cands, answers).tier;
  else {
    const g = grade(text, answers).result;
    tier = g === 'wrong' ? 'unclear' : g === 'almost' ? 'close' : 'understood';
  }
  if (tier === 'unclear' && onTopic) tier = 'close';
  return { ok: tier !== 'unclear', tier };
}

export class ScriptedConversation {
  constructor(scenario) {
    this.scenario = scenario;
    this.index = 0;
    this.attempt = 1;
    this.done = false;
    this.goalsDone = new Set();
  }

  get turn() { return this.scenario.script[this.index]; }

  /** Returns {ok, tier, hint?, answer?, next?: tutor line, closing?: line} */
  answer(input) {
    const turn = this.turn;
    const r = checkScripted(turn, input);
    if (r.ok || this.attempt >= 3) {
      const res = { ok: r.ok, tier: r.tier, answer: turn.expect[0] };
      this.goalsDone.add(Math.min(this.index, this.scenario.goals.length - 1));
      this.index++;
      this.attempt = 1;
      if (this.index >= this.scenario.script.length) {
        this.done = true;
        this.scenario.goals.forEach((_, i) => this.goalsDone.add(i));
        res.closing = this.scenario.closing;
      } else res.next = this.turn.tutor;
      return res;
    }
    this.attempt++;
    const words = turn.expect[0].split(' ');
    const hint = this.attempt === 2
      ? `Try starting with: “${words.slice(0, Math.max(1, Math.ceil(words.length / 3))).join(' ')} …”`
      : `Say: “${turn.expect[0]}”`;
    return { ok: false, tier: r.tier, hint };
  }
}
