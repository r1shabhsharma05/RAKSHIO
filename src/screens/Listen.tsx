import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { createListener, requestMicAccess, type MicMeter } from '../voice/VoiceAdapter';
import { MicIcon } from './shared';

// 1–2 minutes of free speech, no interruption. The listener restarts itself
// on silence (VoiceAdapter); the user stops it when done.
//
// Mic flow (Step 10): permission is requested FIRST via getUserMedia, so a
// denied mic shows exact guidance instead of failing silently inside
// recognition. A live level bar reads the real mic analyser — never a fake
// waveform. "Kuch suna nahi gaya" appears only after 15 seconds of zero
// input (no interim, no final, no audio peak), and listening continues.
export function ListenScreen({
  mode,
  speechLang = 'hi-IN',
  finalText,
  interimText,
  onFinal,
  onInterim,
  onStop,
  onTextSubmit,
  onTextMode,
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
  onTextMode?: () => void;
  onBack: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [perm, setPerm] = useState<'pending' | 'granted' | 'denied' | 'unavailable'>('pending');
  const [hasMeter, setHasMeter] = useState(false);
  const [errorKind, setErrorKind] = useState<'network' | 'no-mic' | 'other' | null>(null);
  const [silent, setSilent] = useState(false);
  const [emptyStop, setEmptyStop] = useState(false);
  const [text, setText] = useState('');
  const [attempt, setAttempt] = useState(0);
  const finalRef = useRef('');
  const heardRef = useRef(false);
  const meterRef = useRef<MicMeter | null>(null);
  const meterBarRef = useRef<HTMLSpanElement>(null);
  const listenerRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    if (mode !== 'voice') return;
    let alive = true;
    let raf = 0;
    let timer = 0;
    let silentTimer = 0;
    setPerm('pending');
    setErrorKind(null);
    setSilent(false);
    setHasMeter(false);
    heardRef.current = false;
    finalRef.current = '';

    // Permission first: a denied mic is caught here with a clear reason.
    requestMicAccess().then((access) => {
      if (!alive) {
        if (access.ok) access.meter?.stop();
        return;
      }
      if (!access.ok) {
        setPerm(access.reason);
        return;
      }
      setPerm('granted');
      meterRef.current = access.meter;
      setHasMeter(access.meter !== null);
      const l = createListener(speechLang, {
        onFinal: (t) => {
          heardRef.current = true;
          window.clearTimeout(silentTimer);
          finalRef.current = t;
          onFinal(t);
        },
        onInterim: (t) => {
          heardRef.current = true;
          window.clearTimeout(silentTimer);
          onInterim(t);
        },
        onError: (kind) => {
          if (kind === 'denied') setPerm('denied');
          else if (kind === 'network') setErrorKind('network');
          else if (kind === 'no-mic') setErrorKind('no-mic');
          else if (kind === 'no-speech') {
            // Recognition reports no-speech on its own short clock; the UI
            // shows the guidance only on the 15s window below, and keeps
            // listening either way.
          } else setErrorKind('other');
        },
      });
      listenerRef.current = l;
      l.start();
      // 15 seconds of zero input (no interim, no final, no audio peak):
      // show the guidance, but keep listening — the user may just be slow.
      silentTimer = window.setTimeout(() => {
        if (alive && !heardRef.current) setSilent(true);
      }, 15000);
      // Live level from the real mic analyser, painted straight onto the
      // bar (no React state per frame). No meter = no bar at all.
      const tick = () => {
        if (!alive) return;
        const meter = meterRef.current;
        if (meter) {
          const peak = meter.level();
          if (peak > 0.08) heardRef.current = true;
          if (meterBarRef.current) meterBarRef.current.style.width = `${Math.round(Math.min(1, peak * 2.2) * 100)}%`;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    timer = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.clearTimeout(silentTimer);
      cancelAnimationFrame(raf);
      listenerRef.current?.stop();
      listenerRef.current = null;
      meterRef.current?.stop();
      meterRef.current = null;
    };
    // speechLang is fixed for one listen session; attempt restarts it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, attempt]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  function retry() {
    setAttempt((a) => a + 1);
  }

  return (
    <>
      <h2>{mode === 'voice' ? 'Sun raha hoon — boliye' : 'Likh kar batayein'}</h2>
      {mode === 'voice' ? (
        <>
          <p aria-live="polite">Samay: {mm}:{ss} — 2 minute tak bol sakte hain. Rokne ke liye neeche dabaiye.</p>
          {perm === 'pending' && <p aria-live="polite">Mic ki permission maang raha hoon…</p>}
          {perm === 'granted' && (
            <p aria-live="polite">
              <strong>Sun raha hoon…</strong> {silent ? 'abhi tak kuch suna nahi gaya — paas aakar phir se bolein.' : 'boliye, aapki baat yahan likhi jayegi.'}
            </p>
          )}
          <div className="transcript-box" aria-live="polite">
            {finalText}
            {interimText && <span className="interim">{interimText}</span>}
            {!finalText && !interimText && 'Aapki baat yahan likhi jayegi…'}
          </div>
          {perm === 'granted' && hasMeter && (
            <div className="mic-level" role="meter" aria-label="Mic level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
              <span ref={meterBarRef} aria-hidden="true" />
            </div>
          )}
          {perm === 'denied' && (
            <div role="alert">
              <p className="step2-note">
                <strong>Mic ki permission nahi mili.</strong> Browser ke address bar me mic icon dabakar “Allow” karein,
                ya Settings → Site settings → Microphone → Allow karein. Phir Retry dabayein.
              </p>
              <div className="chip-row">
                <button type="button" className="rk-primary-btn" onClick={retry}>Retry — mic phir se maangein</button>
                {onTextMode && (
                  <button type="button" className="rk-primary-btn" onClick={onTextMode}>Likh kar batayein</button>
                )}
              </div>
            </div>
          )}
          {perm === 'unavailable' && (
            <p className="step2-note" role="alert">
              Is browser/device par mic nahi mila. Neeche likh kar batayein — wohi kaam karega.
            </p>
          )}
          {errorKind === 'network' && (
            <div role="alert">
              <p className="step2-note">
                <strong>Speech service se connect nahi ho pa raha.</strong> Internet check karein, phir Retry dabayein.
              </p>
              <button type="button" className="rk-primary-btn" onClick={retry}>Retry</button>
            </div>
          )}
          {errorKind === 'no-mic' && (
            <p className="step2-note" role="alert">
              <strong>Koi mic nahi mila.</strong> Device me mic check karein, ya neeche likh kar batayein.
            </p>
          )}
          {errorKind === 'other' && (
            <p className="step2-note" role="alert">
              Mic se sunne me dikkat aayi. Retry dabayein, ya likh kar batayein.
            </p>
          )}
          {silent && perm === 'granted' && !errorKind && (
            <div role="alert">
              <p className="step2-note">
                <strong>Kuch suna nahi gaya — abhi bhi sun raha hoon.</strong> Paas aakar, tez awaaz me phir se bolein,
                ya Retry dabayein. Likhna ho to neeche likh sakte hain.
              </p>
              <button type="button" className="rk-primary-btn" onClick={retry}>Retry</button>
            </div>
          )}
          <div className="mic-wrap">
            <button
              type="button"
              className="mic-btn listening"
              onClick={() => {
                if (!finalRef.current.trim() && !heardRef.current) { setEmptyStop(true); return; }
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
          {onTextMode && (
            <button type="button" className="demo-link" onClick={onTextMode}>Likh kar batana hai? Text mode kholein</button>
          )}
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
