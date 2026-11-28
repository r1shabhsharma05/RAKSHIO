import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { analyzeShield, type ShieldVerdict } from '../engines/shield/shield';
import { loadShieldModel, modelWarning, type ShieldModelMeta } from '../engines/shield/mlModel';
import { guideForShieldRule } from '../engines/guide/guide';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';
import { BackButton } from './shared';

const EXAMPLES: { key: string; text: string }[] = [
  { key: 'shieldExDanger', text: 'Turant OTP batao, warna account band ho jayega' },
  { key: 'shieldExSuspicious', text: 'KYC update karein, link par click karein' },
  { key: 'shieldExSafe', text: 'Your OTP is 482913. Do not share it with anyone.' },
];

// Second-Scam Shield 2.0: paste any message — recovery agent, refund offer,
// fake bank SMS — and get a Truth Card: what is wrong, and what to do.
export function ShieldScreen({ onBack, onVerdict, onModel }: { onBack: () => void; onVerdict?: (v: ShieldVerdict, text: string) => void; onModel?: (score: number | null, coverage: number | null) => void }) {
  const lang = useDashboard((s) => s.settings.language);
  const [text, setText] = useState('');
  const [verdict, setVerdict] = useState<ShieldVerdict | null>(null);
  // ML model score: extra signal only — never overrides the rules above.
  const [mlScore, setMlScore] = useState<number | null>(null);
  const [mlCoverage, setMlCoverage] = useState<number | null>(null);
  const [mlMeta, setMlMeta] = useState<ShieldModelMeta | null>(null);
  const [mlLoading, setMlLoading] = useState(false);

  // Lazy-load the TF.js model on first check (never on page load).
  function runModel(t: string) {
    setMlLoading(true);
    setMlScore(null);
    setMlCoverage(null);
    loadShieldModel().then(async (m) => {
      if (!m) { setMlLoading(false); return; }
      setMlMeta(m.meta);
      const score = await m.predict(t);
      const coverage = m.coverage(t);
      setMlScore(score);
      setMlCoverage(coverage);
      setMlLoading(false);
      // Step 21 (T3): hand the model result up so the Home tile can say
      // the rules and the model disagree — not only inside Shield.
      onModel?.(score, coverage);
    });
  }

  function analyze() {
    if (!text.trim()) return;
    const v = analyzeShield(text.trim(), lang);
    setVerdict(v);
    onVerdict?.(v, text.trim());
    runModel(text.trim());
  }

  const title =
    verdict?.level === 'danger' ? t(lang, 'shieldTitleDanger') : verdict?.level === 'suspicious' ? t(lang, 'shieldTitleSuspicious') : t(lang, 'shieldTitleSafe');
  const verdictClass = verdict?.level === 'danger' ? 'shield-danger' : verdict?.level === 'suspicious' ? 'shield-suspicious' : 'shield-safe';
  // Bug 1 (CRITICAL): the model must never reassure next to a rules KHATRA.
  // When it strongly disagrees with the rules — or when most of the
  // message's words are outside its English training vocab — say so
  // plainly and tell the user to follow the rules. The score is never
  // hidden or fudged; it stays visible under the warning.
  // Step 21: the "scored as scam/safe" cut is the shipped model's own
  // tuned threshold (0.65), never a hardcoded 0.5 — the old 0.5 cut
  // called the retrain's 52% on the Hinglish danger sentence "a scam"
  // although the model itself classifies below 0.65 as safe.
  const warning = verdict && mlScore !== null && mlCoverage !== null ? modelWarning(verdict.level, mlScore, mlCoverage, mlMeta?.threshold ?? 0.65) : null;

  return (
    <>
      <p>{t(lang, 'shieldIntro')}</p>
      <label htmlFor="shield-text" className="rk-label">{t(lang, 'shieldLabel')}</label>
      <textarea id="shield-text" className="rk-input" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={t(lang, 'shieldPlaceholder')} />
      <button type="button" className="rk-primary-btn" disabled={text.trim().length < 3} onClick={analyze}>{t(lang, 'shieldCheckBtn')}</button>
      <div className="chip-row">
        {EXAMPLES.map((e) => (
          <Button key={e.key} label={t(lang, e.key)} variant="secondary" size="lg" onClick={() => { setText(e.text); const v = analyzeShield(e.text, lang); setVerdict(v); onVerdict?.(v, e.text); runModel(e.text); }} />
        ))}
      </div>

      {verdict && (
        <section className={`rk-card ${verdictClass}`} aria-live="polite">
          <h2>{title} (score {verdict.score})</h2>
          {verdict.otpNote && <p className="db-shield-otpnote">{verdict.otpNote}</p>}
          <p><strong>{t(lang, 'shieldTruth')}</strong> {verdict.truth}</p>
          {verdict.flags.length > 0 && (
            <>
              <h3>{t(lang, 'shieldFlagsTitle')}</h3>
              <ul>
                {verdict.flags.map((f) => (
                  <li key={f.rule}>{f.explain}</li>
                ))}
              </ul>
            </>
          )}
          <p><strong>{t(lang, 'shieldAdvice')}</strong> {verdict.advice}</p>
          {/* Trained TF.js model — extra signal only, rules stay the verdict. */}
          <div>
            <h3>{t(lang, 'shieldModelTitle')}</h3>
            {mlLoading && <p>{t(lang, 'shieldModelLoading')}</p>}
            {mlScore !== null && mlMeta && (
              <>
                <p>{t(lang, 'shieldModelScore')} {Math.round(mlScore * 100)}% — {mlScore >= (mlMeta?.threshold ?? 0.65) ? t(lang, 'shieldModelSaysScam') : t(lang, 'shieldModelSaysSafe')}.</p>
                {warning === 'disagree' && (
                  <p className="status-bad" role="alert">{t(lang, 'shieldDisagree')}</p>
                )}
                {warning === 'low-coverage' && (
                  <p className="status-bad" role="alert">{t(lang, 'shieldLowCoverage')}</p>
                )}
                <p className="note">{t(lang, 'shieldModelNote', { dataset: mlMeta.dataset, rows: mlMeta.rows.toLocaleString('en-IN'), accuracy: (mlMeta.accuracy * 100).toFixed(1), testN: mlMeta.testN })}</p>
              </>
            )}
            {mlScore === null && !mlLoading && <p>{t(lang, 'shieldModelFail')}</p>}
          </div>
          {/* Truth Card → Situation Guide: the strongest matched rule picks
              the guide; rules with no specific guide fall back to the list. */}
          {(() => {
            const guide = verdict.flags.length > 0 ? guideForShieldRule(verdict.flags[0].rule) : null;
            return guide ? (
              <p>
                <Link to={`/guide?id=${guide.id}`}>
                  {t(lang, 'shieldGuideLinkFor', { guide: guide.title })}
                </Link>
              </p>
            ) : (
              <p>
                <Link to="/guide">{t(lang, 'shieldGuideLink')}</Link>
              </p>
            );
          })()}
        </section>
      )}
      <p className="note">{t(lang, 'shieldFooter')}</p>
      <BackButton onBack={onBack} />
    </>
  );
}
