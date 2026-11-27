import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { analyzeShield, type ShieldVerdict } from '../engines/shield/shield';
import { BackButton } from './shared';

const EXAMPLES: { label: string; text: string }[] = [
  { label: 'Danger example', text: 'Turant OTP batao, warna account band ho jayega' },
  { label: 'Suspicious example', text: 'KYC update karein, link par click karein' },
  { label: 'Safe example', text: 'Your OTP is 482913. Do not share it with anyone.' },
];

// Second-Scam Shield 2.0: paste any message — recovery agent, refund offer,
// fake bank SMS — and get a Truth Card: what is wrong, and what to do.
export function ShieldScreen({ onBack, onVerdict }: { onBack: () => void; onVerdict?: (v: ShieldVerdict, text: string) => void }) {
  const [text, setText] = useState('');
  const [verdict, setVerdict] = useState<ShieldVerdict | null>(null);

  function analyze() {
    if (!text.trim()) return;
    const v = analyzeShield(text.trim());
    setVerdict(v);
    onVerdict?.(v, text.trim());
  }

  const title = verdict?.level === 'danger' ? 'KHATRA — mat karein' : verdict?.level === 'suspicious' ? 'SHAK — savdhaan rahein' : 'Theek lagta hai';
  const verdictClass = verdict?.level === 'danger' ? 'shield-danger' : verdict?.level === 'suspicious' ? 'shield-suspicious' : 'shield-safe';

  return (
    <>
      <h1>Second-Scam Shield</h1>
      <p>Koi "recovery agent", refund offer, ya ajeeb SMS aaya hai? Yahan paste karein — RAKSHIO batayega kya galat hai.</p>
      <label htmlFor="shield-text" className="rk-label">Message paste karein</label>
      <textarea id="shield-text" className="rk-input" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Jaise: Aapka paisa wapas karwa dunga, pehle fee bhejo…" />
      <button type="button" className="rk-primary-btn" disabled={text.trim().length < 3} onClick={analyze}>Check karein</button>
      <div className="chip-row">
        {EXAMPLES.map((e) => (
          <Button key={e.label} label={e.label} variant="secondary" size="lg" onClick={() => { setText(e.text); const v = analyzeShield(e.text); setVerdict(v); onVerdict?.(v, e.text); }} />
        ))}
      </div>

      {verdict && (
        <section className={`rk-card ${verdictClass}`} aria-live="polite">
          <h2>{title} (score {verdict.score})</h2>
          <p><strong>Sach:</strong> {verdict.truth}</p>
          {verdict.flags.length > 0 && (
            <>
              <h3>Red flags mile:</h3>
              <ul>
                {verdict.flags.map((f) => (
                  <li key={f.rule}>{f.explain}</li>
                ))}
              </ul>
            </>
          )}
          <p><strong>Kya karein:</strong> {verdict.advice}</p>
        </section>
      )}
      <p className="note">Shield sirf rules se check karta hai — koi bhi message 100% safe nahi hota. Shak ho to 1930 par pooch lein.</p>
      <BackButton onBack={onBack} />
    </>
  );
}
