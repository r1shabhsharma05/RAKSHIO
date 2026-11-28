import { useEffect, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import type { StoredIncident } from '../state/store';
import { loadAck, portalCopyDeck, portalDeadline, saveAck } from '../engines/ack/ack';
import { formatDurationLang } from '../engines/orchestrator/clock';
import { BackButton, copyText } from './shared';
import { useToast } from '../components/Toast';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

// Ack Bridge: 1930 call ke baad mila acknowledgement number yahan bharein —
// 24 ghante ka portal countdown shuru hota hai, aur Portal Copy Deck
// field-by-field copy deta hai, taaki portal form dobara yaad se na bharna pade.
export function AckBridgeScreen({ stored, onBack, onAckSaved }: { stored: StoredIncident; onBack: () => void; onAckSaved?: () => void }) {
  const lang = useDashboard((s) => s.settings.language);
  const [ackNumber, setAckNumber] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const showToast = useToast();

  useEffect(() => {
    const a = loadAck();
    if (a && a.incidentId === stored.id) {
      setAckNumber(a.ackNumber);
      setSavedAt(a.calledAt);
    }
  }, [stored.id]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const deadline = savedAt ? portalDeadline(savedAt) : null;
  const remaining = deadline ? deadline.getTime() - now.getTime() : null;
  const deck = portalCopyDeck(stored, savedAt ? { ackNumber, calledAt: savedAt, incidentId: stored.id } : null, lang);

  // One feedback mechanism for copy: the toast. The old inline label flip
  // ("Copy hua ✓") is gone — two mechanisms for one job was noise.
  async function copy(value: string, label: string) {
    if (await copyText(value)) {
      showToast(t(lang, 'portalCopyToast', { label }));
    } else {
      showToast(t(lang, 'portalCopyFail'));
    }
  }

  return (
    <>
      <h2>{t(lang, 'portalTitle')}</h2>
      <p>{t(lang, 'portalIntro')}</p>

      <section className="rk-card">
        <h2>{t(lang, 'portalAckTitle')}</h2>
        <label htmlFor="ack-input" className="rk-label">{t(lang, 'portalAckLabel')}</label>
        <input id="ack-input" className="rk-input" value={ackNumber} onChange={(e) => setAckNumber(e.target.value)} placeholder={t(lang, 'portalAckPlaceholder')} />
        <button
          type="button"
          className="rk-primary-btn"
          disabled={ackNumber.trim().length < 3}
          onClick={() => {
            const at = new Date().toISOString();
            saveAck({ ackNumber: ackNumber.trim(), calledAt: at, incidentId: stored.id });
            setSavedAt(at);
            showToast(t(lang, 'portalAckToast'));
            onAckSaved?.();
          }}
        >
          {t(lang, 'portalSaveBtn')}
        </button>
        {deadline && remaining !== null && (
          <p role="timer" className={remaining <= 0 ? 'timer-overdue' : 'timer-left'}>
            {remaining <= 0 ? t(lang, 'portalTimeOver') : t(lang, 'portalTimeLeft', { time: formatDurationLang(lang, remaining) })}
          </p>
        )}
      </section>

      <section className="rk-card">
        <h2>{t(lang, 'portalDeckTitle')}</h2>
        <p className="note">{t(lang, 'portalDeckNote')}</p>
        {deck.map((row) => (
          <div key={row.label} className="field-row">
            <span className="label">{row.label}: {row.value}</span>
            <Button label="Copy" variant="secondary" size="lg" onClick={() => copy(row.value, row.label)} />
          </div>
        ))}
        <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">{t(lang, 'portalOpenLink')}</a>
      </section>
      <BackButton onBack={onBack} />
    </>
  );
}
