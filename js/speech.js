// Text-to-speech using the phone's own voices (free, offline).
// Prefers European Portuguese (pt-PT) voices.

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voices = [];
let ready;

function refresh() {
  voices = synth ? synth.getVoices() : [];
}

export function initSpeech() {
  if (!synth) return Promise.resolve();
  refresh();
  if (!ready) {
    ready = new Promise((resolve) => {
      if (voices.length) return resolve();
      synth.addEventListener('voiceschanged', () => { refresh(); resolve(); }, { once: true });
      setTimeout(resolve, 1500); // some browsers never fire the event
    });
    synth.addEventListener('voiceschanged', refresh);
  }
  return ready;
}

const norm = (lang) => (lang || '').replace('_', '-').toLowerCase();
const isPT = (v) => norm(v.lang) === 'pt-pt';
const isAnyPt = (v) => norm(v.lang).startsWith('pt');

/** Portuguese voices, pt-PT first. */
export function portugueseVoices() {
  return voices.filter(isAnyPt).sort((a, b) => Number(isPT(b)) - Number(isPT(a)));
}

export function hasPtPtVoice() {
  return voices.some(isPT);
}

export function speechAvailable() {
  return !!synth && voices.some(isAnyPt);
}

export function chosenVoice(settings) {
  const pv = portugueseVoices();
  return pv.find((v) => v.voiceURI === settings.voiceURI) || pv.find(isPT) || pv[0] || null;
}

/** All pt-PT voices (for variety in ear training), falling back to the chosen one. */
function varietyVoices(settings) {
  const pp = voices.filter(isPT);
  return pp.length ? pp : [chosenVoice(settings)].filter(Boolean);
}

/**
 * Speak `text`. Options: rate, vary (pick a random pt-PT voice for listening variety).
 * Resolves when finished (or immediately if speech isn't available).
 */
export function speak(text, settings, { rate, vary = false } = {}) {
  if (!synth) return Promise.resolve();
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const pool = vary ? varietyVoices(settings) : [chosenVoice(settings)].filter(Boolean);
  const v = pool[Math.floor(Math.random() * pool.length)];
  if (v) u.voice = v;
  u.lang = v ? v.lang : 'pt-PT';
  u.rate = rate ?? settings.rate;
  return new Promise((resolve) => {
    // Some engines never fire onend (or have no voice): don't hang callers waiting for it
    const guess = 1500 + (text.length * 110) / (u.rate || 1);
    const timer = setTimeout(resolve, guess + 3000);
    const done = () => { clearTimeout(timer); resolve(); };
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
  });
}

export function stopSpeaking() {
  synth?.cancel();
}
