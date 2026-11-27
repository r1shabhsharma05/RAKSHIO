import { useEffect, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import type { StoredIncident } from '../state/store';
import { loadAck, portalCopyDeck, portalDeadline, saveAck } from '../engines/ack/ack';
import { formatDuration } from '../engines/orchestrator/clock';
import { BackButton, NoReportBanner, copyText } from './shared';
import { useToast } from '../components/Toast';

// Ack Bridge: 1930 call ke baad mila acknowledgement number yahan bharein —
// 24 ghante ka portal countdown shuru hota hai, aur Portal Copy Deck
// field-by-field copy deta hai, taaki portal form dobara yaad se na bharna pade.
export function AckBridgeScreen({ stored, onBack, onAckSaved }: { stored: StoredIncident; onBack: () => void; onAckSaved?: () => void }) {
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
  const deck = portalCopyDeck(stored, savedAt ? { ackNumber, calledAt: savedAt, incidentId: stored.id } : null);

  // One feedback mechanism for copy: the toast. The old inline label flip
  // ("Copy hua ✓") is gone — two mechanisms for one job was noise.
  async function copy(value: string, label: string) {
    if (await copyText(value)) {
      showToast(`Copy ho gaya: ${label}`);
    } else {
      showToast('Copy nahi ho paya — text ko lamba dabakar copy karein');
    }
  }

  return (
    <>
      <NoReportBanner />
      <h1>Ack Bridge — 1930 ke baad</h1>
      <p>1930 call par jo acknowledgement number mila, use yahan bharein. Portal complaint 24 ghante me poori karni hoti hai.</p>

      <section className="rk-card">
        <h2>Acknowledgement number</h2>
        <label htmlFor="ack-input" className="rk-label">Ack number (1930 call se)</label>
        <input id="ack-input" className="rk-input" value={ackNumber} onChange={(e) => setAckNumber(e.target.value)} placeholder="Jaise: 1930XXXXXXXX" />
        <button
          type="button"
          className="rk-primary-btn"
          disabled={ackNumber.trim().length < 3}
          onClick={() => {
            const at = new Date().toISOString();
            saveAck({ ackNumber: ackNumber.trim(), calledAt: at, incidentId: stored.id });
            setSavedAt(at);
            showToast('Ack number save ho gaya');
            onAckSaved?.();
          }}
        >
          Save karein
        </button>
        {deadline && remaining !== null && (
          <p role="timer" className={remaining <= 0 ? 'timer-overdue' : 'timer-left'}>
            Portal ke liye bacha samay: {remaining <= 0 ? 'Samay khatm — phir bhi complaint karein' : formatDuration(remaining)}
          </p>
        )}
      </section>

      <section className="rk-card">
        <h2>Portal Copy Deck — cybercrime.gov.in</h2>
        <p className="note">Har row ko copy karke portal form me paste karein. Dobara yaad se bharne ki zaroorat nahi.</p>
        {deck.map((row) => (
          <div key={row.label} className="field-row">
            <span className="label">{row.label}: {row.value}</span>
            <Button label="Copy" variant="secondary" size="lg" onClick={() => copy(row.value, row.label)} />
          </div>
        ))}
        <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">cybercrime.gov.in kholein</a>
      </section>
      <BackButton onBack={onBack} />
    </>
  );
}
