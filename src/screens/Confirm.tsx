import { useEffect, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import type { ExtractedIncident } from '../engines/understanding/extract';
import { speak, stopSpeaking, CALM_RATE } from '../voice/VoiceAdapter';
import { formatINR, VoiceInput } from './shared';
import { useDashboard } from '../state/dashboardStore';
import { t, methodLabel, whenText } from '../i18n';

export type ConfirmState = 'pending' | 'yes' | 'unknown';
export type GapField = 'amount' | 'fraudAt' | 'method' | 'bank';

// The confirmation gate: the incident card stays LOCKED until amount, time,
// method and bank are each confirmed or explicitly marked "pata nahi". The
// summary is shown in large text; "Summary suniye" reads it aloud only
// on tap — TTS never starts on its own (Step 10: the auto-readback
// startled users the same way the calm card did).
export function ConfirmScreen({
  incident,
  confirmState,
  summaryText,
  onResolve,
  onCorrect,
  onReopen,
  onDone,
}: {
  incident: ExtractedIncident;
  confirmState: Record<GapField, ConfirmState>;
  summaryText: string;
  onResolve: (field: GapField, r: 'yes' | 'unknown') => void;
  onCorrect: (field: GapField, text: string) => void;
  onReopen: (field: GapField) => void;
  onDone: () => void;
}) {
  const lang = useDashboard((s) => s.settings.language);
  const [correcting, setCorrecting] = useState<GapField | null>(null);
  const [correction, setCorrection] = useState('');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  function toggleSpeak() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    speak(summaryText, { rate: CALM_RATE });
    setSpeaking(true);
  }

  const allResolved = (Object.values(confirmState) as ConfirmState[]).every((s) => s !== 'pending');

  function display(field: GapField): string {
    if (field === 'amount') return incident.amount.value != null ? formatINR(incident.amount.value) : t(lang, 'unknown');
    if (field === 'fraudAt') {
      const when = incident.fraudAt.value || incident.fraudAtDisplay.value ? whenText(incident.fraudAt.value, incident.fraudAtDisplay.value, lang) : null;
      return when ?? t(lang, 'unknown');
    }
    if (field === 'bank') return incident.bank.value ?? t(lang, 'unknown');
    return incident.method.value ? methodLabel(incident.method.value, lang) : t(lang, 'unknown');
  }

  const labels: Record<GapField, string> = {
    amount: t(lang, 'confirmLabelAmount'),
    fraudAt: t(lang, 'confirmLabelWhen'),
    method: t(lang, 'confirmLabelMethod'),
    bank: t(lang, 'confirmLabelBank'),
  };

  return (
    <>
      <h2>{t(lang, 'confirmTitle')}</h2>
      <p>{t(lang, 'confirmIntro')}</p>
      <button
        type="button"
        className="rk-primary-btn"
        onClick={toggleSpeak}
        aria-pressed={speaking}
      >
        {speaking ? t(lang, 'confirmStopSpeak') : t(lang, 'confirmSpeak')}
      </button>

      {(Object.keys(labels) as GapField[]).map((field) => (
        <section className="rk-card" key={field}>
          <div className="field-row">
            <span className="label">{labels[field]}</span>
            <span className={display(field) === t(lang, 'unknown') ? 'value unknown' : 'value'}>{display(field)}</span>
          </div>
          {confirmState[field] === 'pending' && correcting !== field && (
            <div className="field-col">
              <button type="button" className="rk-primary-btn" onClick={() => onResolve(field, 'yes')}>{t(lang, 'confirmYes')}</button>
              <Button label={t(lang, 'confirmWrong')} variant="secondary" size="lg" width="100%" onClick={() => { setCorrecting(field); setCorrection(''); }} />
              <Button label={t(lang, 'confirmUnknown')} variant="ghost" size="lg" width="100%" onClick={() => onResolve(field, 'unknown')} />
            </div>
          )}
          {correcting === field && (
            <div className="field-col">
              <VoiceInput value={correction} onChange={setCorrection} placeholder={t(lang, 'confirmCorrectPlaceholder')} label={t(lang, 'confirmCorrectLabel')} />
              <button
                type="button"
                className="rk-primary-btn"
                disabled={correction.trim().length < 1}
                onClick={() => { onCorrect(field, correction.trim()); setCorrecting(null); }}
              >
                {t(lang, 'confirmCorrectLabel')}
              </button>
              <Button label={t(lang, 'confirmCancel')} variant="ghost" size="lg" width="100%" onClick={() => setCorrecting(null)} />
            </div>
          )}
          {confirmState[field] !== 'pending' && correcting !== field && (
            <div className="row-between">
              <span>{confirmState[field] === 'yes' ? t(lang, 'confirmResolvedYes') : t(lang, 'confirmResolvedUnknown')}</span>
              <Button label={t(lang, 'confirmChange')} variant="ghost" size="lg" onClick={() => onReopen(field)} />
            </div>
          )}
        </section>
      ))}

      <button type="button" className="rk-primary-btn" disabled={!allResolved} onClick={onDone}>{t(lang, 'confirmDoneBtn')}</button>
      {!allResolved && <p className="note">{t(lang, 'confirmAllNeeded')}</p>}
    </>
  );
}
