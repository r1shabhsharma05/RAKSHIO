import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import type { ExtractedIncident } from '../engines/understanding/extract';
import { speak, stopSpeaking, CALM_RATE } from '../voice/VoiceAdapter';
import { formatINR, NoReportBanner, VoiceInput } from './shared';

export type ConfirmState = 'pending' | 'yes' | 'unknown';
export type GapField = 'amount' | 'fraudAt' | 'method';

// The confirmation gate: the incident card stays LOCKED until amount, time
// and method are each confirmed or explicitly marked "pata nahi". The app
// reads the summary aloud (slow TTS) and shows it in large text.
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
  const [correcting, setCorrecting] = useState<GapField | null>(null);
  const [correction, setCorrection] = useState('');
  const spokenRef = useRef(false);

  useEffect(() => {
    if (!spokenRef.current) {
      spokenRef.current = true;
      speak(summaryText, { rate: CALM_RATE });
    }
    return () => stopSpeaking();
  }, [summaryText]);

  const allResolved = (Object.values(confirmState) as ConfirmState[]).every((s) => s !== 'pending');

  function display(field: GapField): string {
    if (field === 'amount') return incident.amount.value != null ? formatINR(incident.amount.value) : 'Pata nahi';
    if (field === 'fraudAt') return incident.fraudAtDisplay.value ?? 'Pata nahi';
    return incident.method.value ?? 'Pata nahi';
  }

  const labels: Record<GapField, string> = {
    amount: 'Rashi',
    fraudAt: 'Kab hua',
    method: 'Kaise gaye',
  };

  return (
    <>
      <NoReportBanner />
      <h1>Kya ye sahi hai?</h1>
      <p>Sunn kar ya padh kar batayein — jo galat ho, use sahi karenge.</p>

      {(Object.keys(labels) as GapField[]).map((field) => (
        <section className="rk-card" key={field}>
          <div className="field-row">
            <span className="label">{labels[field]}</span>
            <span className={display(field) === 'Pata nahi' ? 'value unknown' : 'value'}>{display(field)}</span>
          </div>
          {confirmState[field] === 'pending' && correcting !== field && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button type="button" className="rk-primary-btn" onClick={() => onResolve(field, 'yes')}>Haan, sahi hai</button>
              <Button label="Galat hai" variant="secondary" size="lg" width="100%" onClick={() => { setCorrecting(field); setCorrection(''); }} />
              <Button label="Pata nahi" variant="ghost" size="lg" width="100%" onClick={() => onResolve(field, 'unknown')} />
            </div>
          )}
          {correcting === field && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <VoiceInput value={correction} onChange={setCorrection} placeholder="Sahi jaankari boliye ya likhiye" label="Sahi karein" />
              <button
                type="button"
                className="rk-primary-btn"
                disabled={correction.trim().length < 1}
                onClick={() => { onCorrect(field, correction.trim()); setCorrecting(null); }}
              >
                Sahi karein
              </button>
              <Button label="Radd karein" variant="ghost" size="lg" width="100%" onClick={() => setCorrecting(null)} />
            </div>
          )}
          {confirmState[field] !== 'pending' && correcting !== field && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{confirmState[field] === 'yes' ? '✓ Sahi hai' : 'Pata nahi — aage badhenge'}</span>
              <Button label="Badlein" variant="ghost" size="lg" onClick={() => onReopen(field)} />
            </div>
          )}
        </section>
      ))}

      <button type="button" className="rk-primary-btn" disabled={!allResolved} onClick={onDone}>Ye sahi hai — aage badhein</button>
      {!allResolved && <p style={{ fontSize: '0.875rem' }}>Teeno sawaal ka jawaab dijiye — phir aage badh sakte hain.</p>}
    </>
  );
}
