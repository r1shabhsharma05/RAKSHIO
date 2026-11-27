import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { NoReportBanner, VoiceInput } from './shared';

export type GapField = 'amount' | 'fraudAt' | 'method';

const QUESTIONS: Record<GapField, { q: string; hint: string }> = {
  amount: { q: 'Kitne rupaye gaye?', hint: 'Jaise: bees hazaar, ya 20000' },
  fraudAt: { q: 'Paise kab gaye?', hint: 'Jaise: kal subah das baje, ya aaj dopahar' },
  method: { q: 'Paise kaise gaye?', hint: 'Jaise: UPI se, card se, net banking se' },
};

// One missing field at a time, never a form. "Pata nahi" is always allowed —
// a missing answer is recorded as unknown, never guessed.
export function GapsScreen({
  gaps,
  onAnswer,
  onSkip,
  onDone,
}: {
  gaps: GapField[];
  onAnswer: (field: GapField, text: string) => void;
  onSkip: (field: GapField) => void;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const field = gaps[index];

  if (!field) {
    return (
      <>
        <NoReportBanner />
        <h1>Bas, itna hi.</h1>
        <p>Ab hum jo samjhe hain, woh aapko suna kar confirm karenge.</p>
        <Button label="Confirm karein" variant="secondary" size="lg" width="100%" onClick={onDone} />
      </>
    );
  }

  const { q, hint } = QUESTIONS[field];
  function next() {
    setAnswer('');
    setIndex((i) => i + 1);
  }

  return (
    <>
      <NoReportBanner />
      <p className="note">Sawaal {index + 1} / {gaps.length}</p>
      <h1>{q}</h1>
      <VoiceInput value={answer} onChange={setAnswer} placeholder={hint} label="Jawaab" />
      <button
        type="button"
        className="rk-primary-btn"
        disabled={answer.trim().length < 1}
        onClick={() => { onAnswer(field, answer.trim()); next(); }}
      >
        Aage badhein
      </button>
      <Button
        label="Pata nahi"
        variant="secondary"
        size="lg"
        width="100%"
        onClick={() => { onSkip(field); next(); }}
      />
    </>
  );
}
