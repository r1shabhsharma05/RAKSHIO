import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { BackButton } from './shared';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

// Judge Mode: the seeded ₹20,000 UPI scenario in one button, no mic needed.
// For the demo: run it, then check each item below.
// Step 16 (bug 13): seeding switches the ACTIVE incident, so the button
// asks first — the current incident stays saved and is named in the warning.
// showTitle: only inside the report flow — there the shell H1 is
// "Fraud Report Karein", so the screen needs its own "Judge Mode" heading.
// On the #/judge route the shell H1 already says it (no duplicate).
export function JudgeScreen({ active, onStart, onBack, showTitle = false }: { active?: { id: string; amount: string } | null; onStart: () => void; onBack: () => void; showTitle?: boolean }) {
  const lang = useDashboard((s) => s.settings.language);
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      {showTitle && <h2>{t(lang, 'judgeTitle')}</h2>}
      <p>{t(lang, 'judgeIntro')}</p>
      {active && (
        <p className="note">{t(lang, 'judgeActiveLabel')} {active.id} ({active.amount})</p>
      )}
      {!confirming ? (
        <Button label={t(lang, 'judgeSeedBtn')} variant="secondary" size="lg" width="100%" onClick={() => setConfirming(true)} />
      ) : (
        <section className="rk-card" role="alert">
          <h2>{t(lang, 'judgeWarnTitle')}</h2>
          <p>{active ? t(lang, 'judgeWarnBody', { id: active.id, amount: active.amount }) : t(lang, 'judgeWarnNoIncident')}</p>
          <Button label={active ? t(lang, 'judgeConfirmBtn') : t(lang, 'judgeSeedBtn')} variant="secondary" size="lg" width="100%" onClick={onStart} />
          <Button label={t(lang, 'judgeCancelBtn')} variant="ghost" size="lg" width="100%" onClick={() => setConfirming(false)} />
        </section>
      )}
      <section className="rk-card">
        <h2>{t(lang, 'judgeCheckTitle')}</h2>
        <ul>
          <li>{t(lang, 'judgeCheck1')}</li>
          <li>{t(lang, 'judgeCheck2')}</li>
          <li>{t(lang, 'judgeCheck3')}</li>
          <li>{t(lang, 'judgeCheck4')}</li>
          <li>{t(lang, 'judgeCheck5')}</li>
          <li>{t(lang, 'judgeCheck6')}</li>
        </ul>
      </section>
      <p className="note">{t(lang, 'judgeNote')}</p>
      <BackButton onBack={onBack} />
    </>
  );
}
