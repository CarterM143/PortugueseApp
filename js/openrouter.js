// OpenRouter client (your own API key, stored only on this device).
// Docs: https://openrouter.ai/docs

const BASE = 'https://openrouter.ai/api/v1';

export const DEFAULT_MODELS = {
  stt: 'openai/whisper-large-v3',                 // open-weight speech recognition
  coach: 'mistralai/voxtral-small-24b-2507',      // open-weight, understands audio + text
};

export const COACH_SUGGESTIONS = [
  ['mistralai/voxtral-small-24b-2507', 'Voxtral Small 24B (open weights, cheap)'],
  ['thinkingmachines/inkling-small', 'Inkling Small (open weights)'],
  ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', 'Nemotron 3 Nano Omni (open weights, free, slower)'],
];

class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function request(key, path, { method = 'POST', body } = {}) {
  if (!key) throw new ApiError('No OpenRouter API key set (Settings → Speech & AI).', 401);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach OpenRouter. Are you online?', 0);
  }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  if (!res.ok) {
    const msg = json?.error?.message || text.slice(0, 200) || res.statusText;
    const hint = res.status === 401 ? ' (check your API key)' : res.status === 402 ? ' (out of credits)' : '';
    throw new ApiError(`OpenRouter: ${msg}${hint}`, res.status);
  }
  return json;
}

/** Speech → text. `b64` is base64 WAV. */
export async function transcribe(key, b64, { model = DEFAULT_MODELS.stt, language = 'pt' } = {}) {
  const j = await request(key, '/audio/transcriptions', {
    body: { model, language, input_audio: { data: b64, format: 'wav' } },
  });
  return (j?.text || '').trim();
}

/**
 * Chat completion; returns the assistant text. Content may include audio parts.
 * json: ask for a JSON object (falls back automatically if the model doesn't support it).
 */
export async function chat(key, messages, { model, temperature = 0.3, max_tokens = 500, json = false } = {}) {
  const body = { model, messages, temperature, max_tokens };
  let j;
  if (json) {
    try {
      j = await request(key, '/chat/completions', { body: { ...body, response_format: { type: 'json_object' } } });
    } catch (err) {
      if (err.status !== 400 && err.status !== 404) throw err; // parameter not supported → retry plain
    }
  }
  if (!j) j = await request(key, '/chat/completions', { body });
  const c = j?.choices?.[0]?.message?.content;
  return Array.isArray(c) ? c.map((p) => p.text || '').join('') : (c || '');
}

/** Pull the first JSON object out of a model reply. */
export function parseJsonReply(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

/** Pronunciation coaching from the actual audio (not just the transcript). */
export async function coachPronunciation(key, b64, target, { model = DEFAULT_MODELS.coach } = {}) {
  const prompt = `You are a warm, patient pronunciation coach for European Portuguese (Portugal, not Brazil).
The learner is a beginner. They tried to say: "${target}".
Listen to their recording and judge it by European Portuguese norms. An English accent is fine if the words are recognisable.
Reply with JSON only, no other text:
{"heard": "<what you heard, in Portuguese>", "verdict": "good" | "close" | "unclear",
 "tips": ["<at most 2 short, specific, encouraging tips in English, each about one sound or the stress, e.g. nasal ão, reduced unstressed vowels, final s said as 'sh', open vs closed o>"]}
If it was good, give one tip at most, or an empty list.`;
  const reply = await chat(key, [{
    role: 'user',
    content: [
      { type: 'text', text: prompt },
      { type: 'input_audio', input_audio: { data: b64, format: 'wav' } },
    ],
  }], { model, temperature: 0.2, max_tokens: 400, json: true });
  return parseJsonReply(reply) || { heard: '', verdict: 'unclear', tips: [reply.trim().slice(0, 300)] };
}

/** Two short example sentences using an item. */
export async function exampleSentences(key, item, { model }) {
  const reply = await chat(key, [{
    role: 'user',
    content: `Write 2 short, natural example sentences in EUROPEAN Portuguese (Portugal, not Brazil) for an A1 beginner, each using "${item.pt}" (meaning: ${item.en}). Use simple, common words.
Reply with JSON only: {"examples": [{"pt": "...", "en": "..."}]}`,
  }], { model, temperature: 0.6, max_tokens: 300, json: true });
  const j = parseJsonReply(reply);
  return (j?.examples || []).filter((e) => e?.pt).slice(0, 3);
}

/** A vivid memory-hook suggestion (keyword-mnemonic style). */
export async function suggestHook(key, item, { model }) {
  const reply = await chat(key, [{
    role: 'user',
    content: `Create one short, vivid, slightly silly mental image (a keyword mnemonic) that helps an English speaker remember that the European Portuguese "${item.pt}" means "${item.en}". Link how it SOUNDS to its meaning. Max 25 words.
Reply with JSON only: {"hook": "..."}`,
  }], { model, temperature: 0.9, max_tokens: 150, json: true });
  return parseJsonReply(reply)?.hook || reply.trim().slice(0, 200);
}

/** Quick capture: English or Portuguese in → a natural European Portuguese card out. */
export async function cardFromText(key, text, { model }) {
  const reply = await chat(key, [{
    role: 'user',
    content: `A learner of EUROPEAN Portuguese (Portugal, not Brazil) wants to remember this: "${text.slice(0, 300)}"
If it is English (or another language), give the natural way to say it in Portugal, kept short and simple.
If it is Portuguese, keep it (fix only obvious typos, and use the Portugal form if it is Brazilian) and give its meaning.
Reply with JSON only: {"pt": "<European Portuguese>", "en": "<short English meaning>", "note": "<optional one-line tip, e.g. formality or a Brazil/Portugal difference, or empty>"}`,
  }], { model, temperature: 0.2, max_tokens: 250, json: true });
  const j = parseJsonReply(reply);
  if (!j?.pt) throw new Error('Could not get a translation. Try again, or type both sides yourself.');
  return { pt: String(j.pt).trim(), en: String(j.en || '').trim(), note: String(j.note || '').trim() };
}

/** Reveal Day: turn what you want to tell her into short, natural European Portuguese lines. */
export async function revealLines(key, english, { model, level = 'A1', known = [], herName = '' }) {
  const reply = await chat(key, [{
    role: 'user',
    content: `A learner (${level} level) has secretly been learning EUROPEAN Portuguese to surprise their Portuguese girlfriend${herName ? `, ${herName}` : ''}. They want to say this to her:
"${english.slice(0, 1200)}"
Write it as she'd find it natural and moving, in European Portuguese as spoken in Portugal (tu with her, pronouns after the verb: amo-te), but simple enough for ${level}: short sentences, common words, and where possible these words they already know: ${known.slice(-150).join('; ')}.
At most 8 short lines, one sentence each.
Reply with JSON only: {"lines": [{"pt": "<European Portuguese>", "en": "<literal English>"}], "note": "<one short tip on saying it, or empty>"}`,
  }], { model, temperature: 0.4, max_tokens: 900, json: true });
  const j = parseJsonReply(reply);
  const lines = (j?.lines || []).filter((l) => l?.pt).map((l) => ({ pt: String(l.pt).trim(), en: String(l.en || '').trim() })).slice(0, 8);
  if (!lines.length) throw new Error('Could not write that. Try again.');
  return { lines, note: String(j.note || '').trim() };
}

/** Key status: usage and limit. */
export async function keyInfo(key) {
  const j = await request(key, '/key', { method: 'GET' });
  return j?.data || j;
}
