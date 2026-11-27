import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { speak, stopSpeaking, CALM_RATE } from '../voice/VoiceAdapter';
import { DEMO_LABEL } from '../demo/seed';
import { MicIcon, NoReportBanner } from './shared';

// First screen. One job: get the person talking (or typing) as fast as
// possible, while the calm prompt slows the panic down for ten seconds.
export function PanicScreen({
  voiceSupported,
  caregiver,
  onCaregiverChange,
  onStartVoice,
  onStartText,
  onDemo,
  onJudge,
  onCall1930,
}: {
  voiceSupported: boolean;
  caregiver: boolean;
  onCaregiverChange: (v: boolean) => void;
  onStartVoice: () => void;
  onStartText: () => void;
  onDemo: () => void;
  onJudge: () => void;
  onCall1930: () => void;
}) {
  const [calmVisible, setCalmVisible] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const spokenRef = useRef(false);

  // Calm prompt: slow TTS + 10 seconds, skippable. Spoken once per visit.
  useEffect(() => {
    if (!spokenRef.current) {
      spokenRef.current = true;
      speak('Aap safe hain. Abhi kisi ko OTP ya paisa mat dijiye.', { rate: CALM_RATE });
    }
    const t = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(t);
          setCalmVisible(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      window.clearInterval(t);
      stopSpeaking();
    };
  }, []);

  return (
    <>
      <NoReportBanner />
      {calmVisible && (
        <section className="calm-card" aria-live="polite">
          <h2>Aap safe hain</h2>
          <p>Abhi kisi ko OTP ya paisa mat dijiye. Saans lijiye — hum ek-ek kadam karenge.</p>
          <button type="button" className="rk-primary-btn" onClick={() => setCalmVisible(false)}>
            {secondsLeft > 0 ? `Aage badhein (${secondsLeft})` : 'Aage badhein'}
          </button>
        </section>
      )}

      <section className="rk-card mic-wrap">
        <h1>Boliye, kya hua?</h1>
        {voiceSupported ? (
          <button type="button" className="mic-btn" onClick={onStartVoice} aria-label="Boliye kya hua — mic se batayein">
            <MicIcon />
            <span className="mic-label">Boliye</span>
          </button>
        ) : (
          <p>Is browser me mic nahi chalta — neeche likh kar batayein.</p>
        )}
        <Button label="Likh kar batayein" variant="secondary" size="lg" width="100%" onClick={onStartText} />
      </section>

      <section className="rk-card emergency-row" aria-label="Emergency">
        <h2>Turant madad</h2>
        <Button label="1930 par call karein" variant="destructive" size="lg" width="100%" href="tel:1930" onClick={onCall1930} />
        <p className="note">Bank helpline aur parivar ko alert karna aage ke kadam me aayega.</p>
      </section>

      <label className="caregiver-toggle">
        <input type="checkbox" checked={caregiver} onChange={(e) => onCaregiverChange(e.target.checked)} />
        <span>Main kisi aur ki madad kar raha/rahi hoon (caregiver mode)</span>
      </label>

      <button type="button" className="demo-link" onClick={onDemo}>{DEMO_LABEL}</button>
      <button type="button" className="demo-link" onClick={onJudge}>Judge Mode — bina mic ke demo chalao</button>
    </>
  );
}
