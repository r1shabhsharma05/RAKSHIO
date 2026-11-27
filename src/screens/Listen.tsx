import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { createListener } from '../voice/VoiceAdapter';
import { MicIcon } from './shared';

// 1–2 minutes of free speech, no interruption. The listener restarts itself
// on silence (VoiceAdapter); the user stops it when done.
export function ListenScreen({
  mode,
  speechLang = 'hi-IN',
  finalText,
  interimText,
  onFinal,
  onInterim,
  onStop,
  onTextSubmit,
  onBack,
}: {
  mode: 'voice' | 'text';
  speechLang?: 'hi-IN' | 'en-IN';
  finalText: string;
  interimText: string;
  onFinal: (t: string) => void;
  onInterim: (t: string) => void;
  onStop: (transcript: string) => void;
  onTextSubmit: (text: string) => void;
  onBack: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [denied, setDenied] = useState(false);
  const [emptyStop, setEmptyStop] = useState(false);
  const [text, setText] = useState('');
  const finalRef = useRef('');
  const listenerRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    if (mode !== 'voice') return;
    const l = createListener(speechLang, {
      onFinal: (t) => { finalRef.current = t; onFinal(t); },
      onInterim,
      onError: (kind) => { if (kind === 'denied') setDenied(true); },
    });
    listenerRef.current = l;
    l.start();
    const timer = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      window.clearInterval(timer);
      l.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <>
      <h1>{mode === 'voice' ? 'Sun raha hoon — boliye' : 'Likh kar batayein'}</h1>
      {mode === 'voice' ? (
        <>
          <p aria-live="polite">Samay: {mm}:{ss} — 2 minute tak bol sakte hain. Rokne ke liye neeche dabaiye.</p>
          <div className="transcript-box" aria-live="polite">
            {finalText}
            {interimText && <span className="interim">{interimText}</span>}
            {!finalText && !interimText && 'Aapki baat yahan likhi jayegi…'}
          </div>
          {denied && (
            <p className="step2-note" role="alert">
              Mic ki permission nahi mili. Neeche likh kar batayein — wohi kaam karega.
            </p>
          )}
          <div className="mic-wrap">
            <button
              type="button"
              className="mic-btn listening"
              onClick={() => {
                if (!finalRef.current.trim()) { setEmptyStop(true); return; }
                listenerRef.current?.stop();
                onStop(finalRef.current);
              }}
              aria-label="Bas, ho gaya — sunna band karein"
            >
              <MicIcon />
              <span className="mic-label">Bas, ho gaya</span>
            </button>
          </div>
          {emptyStop && (
            <p className="step2-note" role="alert">Kuch suna nahi gaya — dobara boliye, ya neeche likh kar batayein.</p>
          )}
          <p className="note">Mic band karne ke baad hum samjhenge kya hua.</p>
        </>
      ) : (
        <>
          <label htmlFor="listen-text" className="rk-label">Kya hua, apne shabdon me likhiye</label>
          <textarea
            id="listen-text"
            className="rk-input"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Jaise: Mere account se bees hazaar kat gaye, customer care ne OTP manga tha…"
          />
          <button type="button" className="rk-primary-btn" disabled={text.trim().length < 3} onClick={() => onTextSubmit(text.trim())}>Samjhaao</button>
        </>
      )}
      <Button label="Wapas" variant="ghost" size="lg" width="100%" onClick={onBack} />
    </>
  );
}
