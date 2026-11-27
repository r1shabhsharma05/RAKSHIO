import type { StoredIncident } from '../state/store';
import { triageRoute } from '../engines/triage/router';
import { BackButton } from './shared';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

// Smart Triage Router: paisa gaya hai ya sirf koshish hui hai —
// us hisaab se rasta. Lost money -> 1930/bank/portal. Attempted fraud,
// no loss -> Chakshu (30 din ke andar).
export function TriageScreen({ stored, onBack }: { stored: StoredIncident; onBack: () => void }) {
  const lang = useDashboard((s) => s.settings.language);
  const r = triageRoute({
    amount: stored.amount,
    credentialShared: stored.credentialShared,
    fraudType: stored.fraudType,
  });

  return (
    <>
      <h2>{r.title}</h2>
      <section className="rk-card">
        {r.steps.map((s, i) => (
          <div key={i} className="field-row">
            <span className="label">{i + 1}. {s.text}</span>
            {s.link && (
              <a href={s.link.href} target="_blank" rel="noopener noreferrer">{s.link.label}</a>
            )}
          </div>
        ))}
      </section>
      <p className="note">
        {r.path === 'lost-money'
          ? t(lang, 'triageNoteLost')
          : r.path === 'attempted-fraud'
            ? t(lang, 'triageNoteAttempt')
            : t(lang, 'triageNoteUnclear')}
      </p>
      <BackButton onBack={onBack} />
    </>
  );
}
