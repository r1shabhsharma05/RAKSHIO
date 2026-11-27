import { useEffect, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { speak, stopSpeaking, CALM_RATE } from '../voice/VoiceAdapter';
import { DEMO_LABEL } from '../demo/seed';
import { MicIcon } from './shared';

// Calm prompt, isolated: it owns the 1-second interval, so the ticking
// re-renders only this small card — never the mic button or the rest of
// the screen (live bug: the whole Panic screen re-rendered every second).
// The countdown is plain text, NOT part of the button label, so the button
// itself never re-renders on a tick.
// TTS never starts on its own: the card used to read itself aloud on
// mount, which startled users mid-panic. "Suniye" speaks only on tap.
function CalmPrompt({ ttsRate, onDismiss }: { ttsRate: number; onDismiss: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const t = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(t);
          onDismiss();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      window.clearInterval(t);
      stopSpeaking();
    };
    // onDismiss is the stable setCalmVisible setter from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsRate]);

  function toggleSpeak() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    speak('Aap safe hain. Abhi kisi ko OTP ya paisa mat dijiye.', { rate: ttsRate });
    setSpeaking(true);
  }

  return (
    <section className="calm-card" aria-live="polite">
      <h2>Aap safe hain</h2>
      <p>Abhi kisi ko OTP ya paisa mat dijiye. Saans lijiye — hum ek-ek kadam karenge.</p>
      <p className="note" aria-live="off">{`${secondsLeft} second me ye card band ho jayega.`}</p>
      <div className="chip-row">
        <button type="button" className="rk-primary-btn" onClick={onDismiss}>
          Aage badhein
        </button>
        <button
          type="button"
          className="rk-primary-btn"
          onClick={toggleSpeak}
          aria-pressed={speaking}
        >
          {speaking ? 'Bolna band karein' : 'Suniye'}
        </button>
      </div>
    </section>
  );
}

// First screen. One job: get the person talking (or typing) as fast as
// possible, while the calm prompt slows the panic down for ten seconds.
export function PanicScreen({
  voiceSupported,
  caregiver,
  onCaregiverChange,
  showCalm = true,
  ttsRate = CALM_RATE,
  onStartVoice,
  onStartText,
  onDemo,
  onJudge,
  onCall1930,
}: {
  voiceSupported: boolean;
  caregiver: boolean;
  onCaregiverChange: (v: boolean) => void;
  // Settings toggle: the 10-second calm prompt (TTS + card) can be turned
  // off for repeat users — first-time victims always get it.
  showCalm?: boolean;
  ttsRate?: number;
  onStartVoice: () => void;
  onStartText: () => void;
  onDemo: () => void;
  onJudge: () => void;
  onCall1930: () => void;
}) {
  const [calmVisible, setCalmVisible] = useState(showCalm);

  return (
    <>
      {calmVisible && <CalmPrompt ttsRate={ttsRate} onDismiss={() => setCalmVisible(false)} />}

      <section className="rk-card mic-wrap">
        <h2>Boliye, kya hua?</h2>
        {caregiver && (
          <p><Badge label="Caregiver mode ON — aap kisi aur ki madad kar rahe hain" variant="success" /></p>
        )}
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
