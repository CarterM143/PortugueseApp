// Lenient speech marking: compares what the recogniser heard with the target
// using a rough European-Portuguese "sounds-like" key, so near-misses aren't marked wrong.

import { normalize, stripAccents, levenshtein, diffWords } from './grade.js';
import { EAR } from './content.js';

const NUM = {
  0: 'zero', 1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete', 8: 'oito',
  9: 'nove', 10: 'dez', 11: 'onze', 12: 'doze', 13: 'treze', 14: 'catorze', 15: 'quinze',
  16: 'dezasseis', 17: 'dezassete', 18: 'dezoito', 19: 'dezanove', 20: 'vinte', 21: 'vinte e um',
  30: 'trinta', 40: 'quarenta', 50: 'cinquenta', 100: 'cem',
};

/** Recognisers often write digits and symbols; turn them back into words. */
export function spokenText(s) {
  return normalize(
    (s || '')
      .replace(/(\d+),(\d+)\s*€/g, '$1 euros e $2')
      .replace(/(\d+)\s*€/g, '$1 euros')
      .replace(/€\s*(\d+)/g, '$1 euros')
      .replace(/\b\d+\b/g, (d) => NUM[Number(d)] ?? d),
  );
}

/** Rough phonetic key for European Portuguese (accent-insensitive, sound-alike spellings merged). */
export function phoneticKey(text) {
  let s = spokenText(text)
    .replace(/ão/g, 'aun').replace(/ãe/g, 'ain').replace(/õe/g, 'oin')
    .replace(/ã/g, 'an').replace(/õ/g, 'on').replace(/ç/g, 's');
  s = stripAccents(s);
  return s.split(' ').map((w) => {
    let x = w;
    x = x.replace(/ch/g, 'x').replace(/lh/g, 'ly').replace(/nh/g, 'ny');
    x = x.replace(/h/g, ''); // silent h
    x = x.replace(/qu(?=[ei])/g, 'k').replace(/qu/g, 'kw');
    x = x.replace(/gu(?=[ei])/g, 'g').replace(/g(?=[ei])/g, 'j');
    x = x.replace(/c(?=[ei])/g, 's').replace(/c/g, 'k');
    x = x.replace(/ss/g, 's').replace(/rr/g, 'R').replace(/^r/, 'R');
    x = x.replace(/z$/, 's');
    x = x.replace(/am$/, 'aun').replace(/em$/, 'ain').replace(/([aeiou])m(?=[^aeiou]|$)/g, '$1n');
    x = x.replace(/o$/, 'u').replace(/os$/, 'us');
    if (x.length > 2) x = x.replace(/e$/, '').replace(/es$/, 's'); // final e is barely spoken in Portugal
    if (x === 'e') x = 'i';
    return x.replace(/(.)\1+/g, '$1');
  }).join(' ');
}

export function similarity(a, b) {
  const x = phoneticKey(a), y = phoneticKey(b);
  if (!x && !y) return 1;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length, 1);
}

/**
 * Assess a spoken attempt.
 * @param transcripts  one or more candidate transcripts (best first)
 * @param answers      acceptable Portuguese answers
 * @returns {tier: 'understood'|'close'|'unclear', heard, answer, score, missed: string[]}
 */
export function assessSpeech(transcripts, answers) {
  const cands = (transcripts || []).map((t) => t?.trim()).filter(Boolean);
  if (!cands.length) return { tier: 'unclear', heard: '', answer: answers[0], score: 0, missed: answers[0].split(' ') };
  let best = null;
  for (const t of cands) {
    for (const a of answers) {
      const sim = similarity(t, a);
      const diff = diffWords(spokenText(t), a);
      const wordsOk = diff.filter((w) => w.ok).length / diff.length;
      const score = Math.max(sim, wordsOk);
      if (!best || score > best.score) {
        best = { heard: t, answer: a, score, sim, wordsOk, missed: diff.filter((w) => !w.ok).map((w) => w.w) };
      }
    }
  }
  const tier = best.sim >= 0.85 || best.wordsOk === 1 ? 'understood'
    : best.sim >= 0.6 || best.wordsOk >= 0.5 ? 'close' : 'unclear';
  return { tier, heard: best.heard, answer: best.answer, score: best.score, missed: tier === 'understood' ? [] : best.missed };
}

// ---------- recurring sound problems → targeted ear training ----------

const earIds = (...words) => EAR.filter((e) => e.kind === 'pair' && words.includes(e.a.pt)).map((e) => e.id);

export const SOUND_FEATURES = [
  { id: 'nasal', label: 'nasal vowels (ão, ãe, õe, ã)', re: /ão|ãe|õe|[ãõ]|[aeiou][mn](?![aeiouh])/, ear: earIds('pão', 'mão') },
  { id: 'open-closed', label: 'open vs closed vowels (ó/ô, é/ê)', re: /[óôéê]/, ear: earIds('avô', 'novo') },
  { id: 'stress', label: 'word stress', re: /[áíú]|[^aeiou]á/, ear: [...earIds('esta', 'bebe', 'sabia'), ...EAR.filter((e) => e.kind === 'stress').map((e) => e.id)] },
  { id: 'final-s', label: 'final s (sounds like "sh")', re: /s$|z$|s(?=[^aeiou])/, ear: earIds('mas', 'pais') },
  { id: 'lh-nh', label: 'lh and nh', re: /lh|nh/, ear: [] },
  { id: 'r', label: 'the r sounds', re: /rr|^r/, ear: [] },
];

/** Which tricky sounds appear in the words the learner missed. */
export function soundFeatures(words) {
  const found = new Set();
  for (const w of words) {
    const lw = (w || '').toLowerCase();
    for (const f of SOUND_FEATURES) if (f.re.test(lw)) found.add(f.id);
  }
  return [...found];
}
