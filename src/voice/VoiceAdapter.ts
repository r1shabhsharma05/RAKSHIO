// One interface over SpeechRecognition + SpeechSynthesis. Feature-detects at
// load: if recognition is missing the caller gets supported=false and must
// offer Text Mode instead of a dead mic button.
export interface ListenCallbacks {
  onFinal: (transcript: string) => void;
  onInterim: (transcript: string) => void;
  onError: (kind: 'denied' | 'network' | 'no-mic' | 'no-speech' | 'other') => void;
}

export const CALM_RATE = 0.85;

export function recognitionSupported(): boolean {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Chrome ends a recognition session after a few seconds of silence, so we
// restart while still listening, up to ~2 minutes of intake.
export function createListener(lang: 'hi-IN' | 'en-IN', cb: ListenCallbacks): { start: () => void; stop: () => void } {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Ctor) throw new Error('SpeechRecognition not available');
  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  // Ask for on-device processing where the browser offers it; ignored elsewhere.
  try { (rec as unknown as Record<string, unknown>).processLocally = true; } catch { /* not supported */ }

  let listening = false;
  let restarts = 0;
  let finalText = '';

  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (finalText) cb.onFinal(finalText);
    if (interim) cb.onInterim(interim);
  };
  rec.onerror = (e) => {
    // Distinct kinds so the UI can say exactly what is wrong — a denied
    // mic, an unreachable speech service, and "no speech heard" are three
    // different problems with three different fixes.
    const err = (e as unknown as { error?: string }).error;
    if (err === 'not-allowed' || err === 'service-not-allowed') cb.onError('denied');
    else if (err === 'network') cb.onError('network');
    else if (err === 'audio-capture') cb.onError('no-mic');
    else if (err === 'no-speech') cb.onError('no-speech');
    else cb.onError('other');
  };
  rec.onend = () => {
    // A session also ends on silence; restart while the user is still talking.
    if (listening && restarts < 20) {
      restarts += 1;
      try { rec.start(); } catch { /* already started */ }
    }
  };

  return {
    start() {
      listening = true;
      restarts = 0;
      finalText = '';
      try { rec.start(); } catch { /* already started */ }
    },
    stop() {
      listening = false;
      try { rec.stop(); } catch { /* already stopped */ }
    },
  };
}

// Mic permission + a REAL input level meter. getUserMedia forces the browser
// permission prompt before recognition starts, so a denied mic is caught
// here with a clear reason instead of failing silently inside recognition.
// The meter reads the live AnalyserNode — never a fake/static waveform:
// if the analyser cannot be built, meter is null and the caller shows no
// meter at all (listening still works).
export interface MicMeter {
  level: () => number;
  stop: () => void;
}

export type MicAccess =
  | { ok: true; meter: MicMeter | null }
  | { ok: false; reason: 'denied' | 'unavailable' };

export async function requestMicAccess(): Promise<MicAccess> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'unavailable' };
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    const name = (e as { name?: string }).name;
    return { ok: false, reason: name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable' };
  }
  // Permission granted. The meter is best-effort: if the audio graph cannot
  // be built (e.g. a stubbed stream in tests), listening still proceeds.
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return { ok: true, meter: null };
    const ctx = new Ctx();
    // Step 19 (A8): a context created outside a user gesture starts
    // "suspended" under Chrome's autoplay policy — the analyser then
    // returns flat values and the level meter never moves. Resume it.
    await ctx.resume();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    return {
      ok: true,
      meter: {
        level() {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (let i = 0; i < data.length; i++) {
            const v = Math.abs(data[i] - 128) / 128;
            if (v > peak) peak = v;
          }
          return peak;
        },
        stop() {
          stream.getTracks().forEach((track) => track.stop());
          void ctx.close().catch(() => undefined);
        },
      },
    };
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true, meter: null };
  }
}

// Step 21 (T5): TTS used to set u.lang and hope — on a device with no
// Hindi voice installed, the utterance came out in the wrong voice (or
// not at all) with no fallback. Pick the best available voice: exact
// language match first, then same language family (hi-* for hi-IN), then
// the browser default. Pure — unit-tested with fake voice lists.
export function pickVoice(
  voices: readonly { lang: string; default?: boolean }[],
  lang: string,
): { lang: string; default?: boolean } | null {
  const want = lang.toLowerCase();
  const family = want.split('-')[0];
  return (
    voices.find((v) => v.lang.toLowerCase() === want) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(`${family}-`)) ??
    voices.find((v) => v.default) ??
    voices[0] ??
    null
  );
}

export function speak(text: string, opts: { rate?: number; lang?: string } = {}): void {
  if (!ttsSupported()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.lang ?? 'hi-IN';
  u.rate = opts.rate ?? 1;
  const voice = pickVoice(window.speechSynthesis.getVoices(), u.lang);
  if (voice) u.voice = voice as SpeechSynthesisVoice;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
