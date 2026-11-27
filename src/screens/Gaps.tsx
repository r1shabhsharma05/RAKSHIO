import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { VoiceInput } from './shared';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

export type GapField = 'amount' | 'fraudAt' | 'method' | 'bank';

// Step 16 (bug 2): the questions follow the selected language.
const QUESTION_KEYS: Record<GapField, { q: 'gapQAmount' | 'gapQFraudAt' | 'gapQMethod' | 'gapQBank'; hint: 'gapHintAmount' | 'gapHintFraudAt' | 'gapHintMethod' | 'gapHintBank' }> = {
  amount: { q: 'gapQAmount', hint: 'gapHintAmount' },
  fraudAt: { q: 'gapQFraudAt', hint: 'gapHintFraudAt' },
  method: { q: 'gapQMethod', hint: 'gapHintMethod' },
  bank: { q: 'gapQBank', hint: 'gapHintBank' },
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
  const lang = useDashboard((s) => s.settings.language);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const field = gaps[index];

  if (!field) {
    return (
      <>
        <h2>{t(lang, 'gapDoneTitle')}</h2>
        <p>{t(lang, 'gapDoneBody')}</p>
        <Button label={t(lang, 'gapDoneBtn')} variant="secondary" size="lg" width="100%" onClick={onDone} />
      </>
    );
  }

  const keys = QUESTION_KEYS[field];
  function next() {
    setAnswer('');
    setIndex((i) => i + 1);
  }

  return (
    <>
      <p className="note">{t(lang, 'gapQuestionOf', { i: index + 1, n: gaps.length })}</p>
      <h2>{t(lang, keys.q)}</h2>
      <VoiceInput value={answer} onChange={setAnswer} placeholder={t(lang, keys.hint)} label={t(lang, 'gapAnswerLabel')} />
      <button
        type="button"
        className="rk-primary-btn"
        disabled={answer.trim().length < 1}
        onClick={() => { onAnswer(field, answer.trim()); next(); }}
      >
        {t(lang, 'gapNextBtn')}
      </button>
      <Button
        label={t(lang, 'confirmUnknown')}
        variant="secondary"
        size="lg"
        width="100%"
        onClick={() => { onSkip(field); next(); }}
      />
    </>
  );
}
