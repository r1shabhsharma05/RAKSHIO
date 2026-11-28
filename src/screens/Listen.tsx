import { useEffect, useRef, useState } from 'react';
import { createListener, requestMicAccess, type MicMeter } from '../voice/VoiceAdapter';
import { BackButton, MicIcon } from './shared';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

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
  const lang = useDashboard((s) => s.settings.language);
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
      <h2>{mode === 'voice' ? t(lang, 'listenTitleVoice') : t(lang, 'panicWriteBtn')}</h2>
      {mode === 'voice' ? (
        <>
          <p aria-live="polite">{t(lang, 'listenTimer', { t: `${mm}:${ss}` })}</p>
          {perm === 'pending' && <p aria-live="polite">{t(lang, 'listenPermPending')}</p>}
          {perm === 'granted' && (
            <p aria-live="polite">
              <strong>{t(lang, 'listenHearing')}</strong> {silent ? t(lang, 'listenSilentHint') : t(lang, 'listenSpeakHint')}
            </p>
          )}
          <div className="transcript-box" aria-live="polite">
            {finalText}
            {interimText && <span className="interim">{interimText}</span>}
            {!finalText && !interimText && t(lang, 'listenTranscriptEmpty')}
          </div>
          {perm === 'granted' && hasMeter && (
            <div className="mic-level" role="meter" aria-label={t(lang, 'listenMicLevel')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
              <span ref={meterBarRef} aria-hidden="true" />
            </div>
          )}
          {perm === 'denied' && (
            <div role="alert">
              <p className="step2-note">
                <strong>{t(lang, 'listenDeniedTitle')}</strong> {t(lang, 'listenDeniedBody')}
              </p>
              <div className="chip-row">
                <button type="button" className="rk-primary-btn" onClick={retry}>{t(lang, 'listenRetryMic')}</button>
                {onTextMode && (
                  <button type="button" className="rk-primary-btn" onClick={onTextMode}>{t(lang, 'panicWriteBtn')}</button>
                )}
              </div>
            </div>
          )}
          {perm === 'unavailable' && (
            <p className="step2-note" role="alert">
              {t(lang, 'listenUnavailable')}
            </p>
          )}
          {errorKind === 'network' && (
            <div role="alert">
              <p className="step2-note">
                <strong>{t(lang, 'listenNetworkTitle')}</strong> {t(lang, 'listenNetworkBody')}
              </p>
              <button type="button" className="rk-primary-btn" onClick={retry}>{t(lang, 'listenRetry')}</button>
            </div>
          )}
          {errorKind === 'no-mic' && (
            <p className="step2-note" role="alert">
              <strong>{t(lang, 'listenNoMicTitle')}</strong> {t(lang, 'listenNoMicBody')}
            </p>
          )}
          {errorKind === 'other' && (
            <p className="step2-note" role="alert">
              {t(lang, 'listenOtherError')}
            </p>
          )}
          {silent && perm === 'granted' && !errorKind && (
            <div role="alert">
              <p className="step2-note">
                <strong>{t(lang, 'listenSilentTitle')}</strong> {t(lang, 'listenSilentBody')}
              </p>
              <button type="button" className="rk-primary-btn" onClick={retry}>{t(lang, 'listenRetry')}</button>
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
              aria-label={t(lang, 'listenStopAria')}
            >
              <MicIcon />
              <span className="mic-label">{t(lang, 'listenStopLabel')}</span>
            </button>
          </div>
          {emptyStop && (
            <p className="step2-note" role="alert">{t(lang, 'listenEmptyStop')}</p>
          )}
          <p className="note">{t(lang, 'listenAfterMic')}</p>
          {onTextMode && (
            <button type="button" className="demo-link" onClick={onTextMode}>{t(lang, 'listenTextModeLink')}</button>
          )}
        </>
      ) : (
        <>
          <label htmlFor="listen-text" className="rk-label">{t(lang, 'listenTextLabel')}</label>
          <textarea
            id="listen-text"
            className="rk-input"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t(lang, 'listenTextPlaceholder')}
          />
          <button type="button" className="rk-primary-btn" disabled={text.trim().length < 3} onClick={() => onTextSubmit(text.trim())}>{t(lang, 'listenTextSubmit')}</button>
        </>
      )}
      <BackButton onBack={onBack} />
    </>
  );
}
