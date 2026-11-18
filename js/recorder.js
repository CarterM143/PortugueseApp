// Speech capture. Two engines:
//  - 'openrouter': record audio (MediaRecorder) → 16 kHz mono WAV → transcribed by OpenRouter
//  - 'phone':      the phone's own speech recognition (free; on Android this is Google's recogniser)
// Neither cuts you off for pausing: recording runs until you tap stop (max 60 s).

const MAX_SECONDS = 60;

export const phoneRecognitionAvailable = () =>
  typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export const micAvailable = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

// ---------- audio helpers ----------

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function trimSilence(pcm, rate, threshold = 0.012, pad = 0.25) {
  let start = 0, end = pcm.length - 1;
  while (start < pcm.length && Math.abs(pcm[start]) < threshold) start++;
  while (end > start && Math.abs(pcm[end]) < threshold) end--;
  if (start >= end) return null; // nothing but silence
  const p = Math.round(pad * rate);
  return pcm.subarray(Math.max(0, start - p), Math.min(pcm.length, end + p));
}

function encodeWav(pcm, rate) {
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

async function blobToWav(blob, rate = 16000) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  let decoded;
  try { decoded = await ac.decodeAudioData(await blob.arrayBuffer()); } finally { ac.close(); }
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const pcm = trimSilence((await off.startRendering()).getChannelData(0), rate);
  if (!pcm) return null;
  const wav = encodeWav(pcm, rate);
  return { b64: toBase64(wav), blob: new Blob([wav], { type: 'audio/wav' }), seconds: pcm.length / rate };
}

// ---------- recorder (for OpenRouter) ----------

export class AudioCapture {
  /**
   * opts.autoStopAfter: seconds of silence (after some speech) before stopping by itself
   *                     (hands-free mode). Omit to record until stop() is called.
   * opts.onAutoStop:    called when it stops by itself.
   */
  async start(opts = {}) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream);
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.stopped = new Promise((resolve) => { this.rec.onstop = resolve; });
    this.rec.start();
    this.timer = setTimeout(() => this.rec.state === 'recording' && this.rec.stop(), MAX_SECONDS * 1000);
    if (opts.autoStopAfter) this.watchSilence(opts.autoStopAfter, opts.onAutoStop);
  }

  /** Simple voice-activity detection: stop after `seconds` of quiet once speech has started. */
  watchSilence(seconds, onAutoStop) {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.vadCtx = new AC();
    const src = this.vadCtx.createMediaStreamSource(this.stream);
    const an = this.vadCtx.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    const t0 = Date.now();
    let floor = 0, n = 0, spoke = false, lastLoud = Date.now();
    this.vad = setInterval(() => {
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const x of buf) sum += x * x;
      const rms = Math.sqrt(sum / buf.length);
      const now = Date.now();
      if (now - t0 < 400) { floor = (floor * n + rms) / (n + 1); n++; return; } // calibrate noise
      const loud = rms > Math.max(0.015, floor * 3);
      if (loud) { spoke = true; lastLoud = now; }
      const quietFor = (now - lastLoud) / 1000;
      if ((spoke && quietFor > seconds) || (!spoke && now - t0 > 15000)) {
        this.stopVad();
        onAutoStop?.();
      }
    }, 100);
  }

  stopVad() {
    clearInterval(this.vad);
    this.vad = null;
    this.vadCtx?.close().catch(() => {});
    this.vadCtx = null;
  }

  /** Stop and return {audio: {b64, blob, seconds} | null} */
  async stop() {
    clearTimeout(this.timer);
    this.stopVad();
    if (this.rec?.state === 'recording') this.rec.stop();
    await this.stopped;
    this.release();
    const blob = new Blob(this.chunks, { type: this.rec.mimeType || 'audio/webm' });
    return { audio: await blobToWav(blob) };
  }

  cancel() {
    clearTimeout(this.timer);
    this.stopVad();
    try { if (this.rec?.state === 'recording') this.rec.stop(); } catch { /* ignore */ }
    this.release();
  }

  release() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

// ---------- phone recogniser ----------

export class PhoneRecognition {
  constructor(lang = 'pt-PT') { this.lang = lang; }

  /** opts.autoStopAfter: hands-free mode. Let the phone decide when you've finished. */
  start(opts = {}) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.auto = !!opts.autoStopAfter;
    this.onAutoStop = opts.onAutoStop;
    this.segments = []; // each: array of alternative strings
    this.wanted = true;
    this.error = null;
    this.startedAt = Date.now();
    const begin = () => {
      const r = new SR();
      r.lang = this.lang;
      r.continuous = true;
      r.interimResults = false;
      r.maxAlternatives = 5;
      r.onresult = (ev) => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) this.segments.push([...ev.results[i]].map((a) => a.transcript.trim()));
        }
      };
      r.onerror = (ev) => {
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') { this.error = 'Microphone permission was denied.'; this.wanted = false; }
        else if (ev.error === 'network') { this.error = 'Speech recognition needs an internet connection.'; this.wanted = false; }
      };
      // The phone ends recognition after a silence; restart so slow speakers aren't cut off.
      r.onend = () => {
        if (this.wanted && this.auto && this.segments.length) {
          // hands-free: the phone heard speech followed by a pause → done
          this.wanted = false;
          this.finish?.();
          this.onAutoStop?.();
        } else if (this.wanted && Date.now() - this.startedAt < MAX_SECONDS * 1000) {
          try { begin(); } catch { this.finish?.(); }
        } else this.finish?.();
      };
      this.r = r;
      r.start();
    };
    this.ended = new Promise((resolve) => { this.finish = resolve; });
    begin();
    return Promise.resolve();
  }

  /** Stop and return {transcripts: string[]} (best first, plus alternatives) */
  async stop() {
    this.wanted = false;
    try { this.r?.stop(); } catch { /* ignore */ }
    await Promise.race([this.ended, new Promise((r) => setTimeout(r, 2500))]);
    if (this.error) throw new Error(this.error);
    const segs = this.segments;
    if (!segs.length) return { transcripts: [] };
    const best = segs.map((s) => s[0]);
    const out = [best.join(' ')];
    segs.forEach((alts, i) => alts.slice(1).forEach((alt) => {
      const v = best.slice(); v[i] = alt; out.push(v.join(' '));
    }));
    return { transcripts: [...new Set(out)] };
  }

  cancel() {
    this.wanted = false;
    try { this.r?.abort(); } catch { /* ignore */ }
  }
}
