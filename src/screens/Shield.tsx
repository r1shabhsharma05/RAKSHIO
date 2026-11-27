import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { analyzeShield, type ShieldVerdict } from '../engines/shield/shield';
import { loadShieldModel, type ShieldModelMeta } from '../engines/shield/mlModel';
import { guideForShieldRule } from '../engines/guide/guide';
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
  // ML model score: extra signal only — never overrides the rules above.
  const [mlScore, setMlScore] = useState<number | null>(null);
  const [mlMeta, setMlMeta] = useState<ShieldModelMeta | null>(null);
  const [mlLoading, setMlLoading] = useState(false);

  // Lazy-load the TF.js model on first check (never on page load).
  function runModel(t: string) {
    setMlLoading(true);
    setMlScore(null);
    loadShieldModel().then(async (m) => {
      if (!m) { setMlLoading(false); return; }
      setMlMeta(m.meta);
      setMlScore(await m.predict(t));
      setMlLoading(false);
    });
  }

  function analyze() {
    if (!text.trim()) return;
    const v = analyzeShield(text.trim());
    setVerdict(v);
    onVerdict?.(v, text.trim());
    runModel(text.trim());
  }

  const title = verdict?.level === 'danger' ? 'KHATRA — mat karein' : verdict?.level === 'suspicious' ? 'SHAK — savdhaan rahein' : 'Theek lagta hai';
  const verdictClass = verdict?.level === 'danger' ? 'shield-danger' : verdict?.level === 'suspicious' ? 'shield-suspicious' : 'shield-safe';

  return (
    <>
      <h2>Second-Scam Shield</h2>
      <p>Koi "recovery agent", refund offer, ya ajeeb SMS aaya hai? Yahan paste karein — RAKSHIO batayega kya galat hai.</p>
      <label htmlFor="shield-text" className="rk-label">Message paste karein</label>
      <textarea id="shield-text" className="rk-input" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Jaise: Aapka paisa wapas karwa dunga, pehle fee bhejo…" />
      <button type="button" className="rk-primary-btn" disabled={text.trim().length < 3} onClick={analyze}>Check karein</button>
      <div className="chip-row">
        {EXAMPLES.map((e) => (
          <Button key={e.label} label={e.label} variant="secondary" size="lg" onClick={() => { setText(e.text); const v = analyzeShield(e.text); setVerdict(v); onVerdict?.(v, e.text); runModel(e.text); }} />
        ))}
      </div>

      {verdict && (
        <section className={`rk-card ${verdictClass}`} aria-live="polite">
          <h2>{title} (score {verdict.score})</h2>
          {verdict.otpNote && <p className="db-shield-otpnote">{verdict.otpNote}</p>}
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
          {/* Trained TF.js model — extra signal only, rules stay the verdict. */}
          <div>
            <h3>ML model (extra signal)</h3>
            {mlLoading && <p>Model load ho raha hai…</p>}
            {mlScore !== null && mlMeta && (
              <>
                <p>Model scam score: {Math.round(mlScore * 100)}% — {mlScore >= 0.5 ? 'model ko ye scam lagta hai' : 'model ko ye safe lagta hai'}.</p>
                <p className="note">Trained model: {mlMeta.dataset}, {mlMeta.rows.toLocaleString('en-IN')} real messages (SMS + email); held-out test accuracy {(mlMeta.accuracy * 100).toFixed(1)}% ({mlMeta.testN} messages). Ye sirf ek extra signal hai — upar wale rules hi explanation hain, aur model score rules ke flags ko override nahi karta. Model phone par hi chalta hai — message kahin nahi bheja jata.</p>
              </>
            )}
            {mlScore === null && !mlLoading && <p>Model load nahi hua — rules wala verdict hi maaniye.</p>}
          </div>
          {/* Truth Card → Situation Guide: the strongest matched rule picks
              the guide; rules with no specific guide fall back to the list. */}
          {(() => {
            const guide = verdict.flags.length > 0 ? guideForShieldRule(verdict.flags[0].rule) : null;
            return guide ? (
              <p>
                <Link to={`/guide?id=${guide.id}`}>
                  Is situation me kya karein — {guide.title} guide dekhein
                </Link>
              </p>
            ) : (
              <p>
                <Link to="/guide">Situation Guide dekhein — har situation me kya karein</Link>
              </p>
            );
          })()}
        </section>
      )}
      <p className="note">Shield rules se check karta hai, aur trained model ek extra signal deta hai — koi bhi message 100% safe nahi hota. Shak ho to 1930 par pooch lein.</p>
      <BackButton onBack={onBack} />
    </>
  );
}
