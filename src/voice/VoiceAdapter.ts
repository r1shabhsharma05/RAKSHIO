// One interface over SpeechRecognition + SpeechSynthesis. Feature-detects at
// load: if recognition is missing the caller gets supported=false and must
// offer Text Mode instead of a dead mic button.
export interface ListenCallbacks {
  onFinal: (transcript: string) => void;
  onInterim: (transcript: string) => void;
  onError: (kind: 'denied' | 'unavailable' | 'other') => void;
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
    const err = (e as unknown as { error?: string }).error;
    cb.onError(err === 'not-allowed' || err === 'service-not-allowed' ? 'denied' : 'other');
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

export function speak(text: string, opts: { rate?: number; lang?: string } = {}): void {
  if (!ttsSupported()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.lang ?? 'hi-IN';
  u.rate = opts.rate ?? 1;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
