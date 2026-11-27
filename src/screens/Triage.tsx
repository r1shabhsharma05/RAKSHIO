import type { StoredIncident } from '../state/store';
import { triageRoute } from '../engines/triage/router';
import { BackButton, NoReportBanner } from './shared';

// Smart Triage Router: paisa gaya hai ya sirf koshish hui hai —
// us hisaab se rasta. Lost money -> 1930/bank/portal. Attempted fraud,
// no loss -> Chakshu (30 din ke andar).
export function TriageScreen({ stored, onBack }: { stored: StoredIncident; onBack: () => void }) {
  const r = triageRoute({
    amount: stored.amount,
    credentialShared: stored.credentialShared,
    fraudType: stored.fraudType,
  });

  return (
    <>
      <NoReportBanner />
      <h1>{r.title}</h1>
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
      <p style={{ fontSize: '0.875rem' }}>
        {r.path === 'lost-money'
          ? 'Paisa gaya hai isliye 1930 sabse pehle — fund freeze ka chance pehle ghante me sabse zyada hota hai.'
          : r.path === 'attempted-fraud'
            ? 'Paisa nahi gaya, isliye Chakshu sahi jagah hai — koshish ki report 30 din ke andar karein.'
            : 'Abhi saaf nahi hai ki paisa gaya ya nahi — 1930 par salah lena sabse safe kadam hai.'}
      </p>
      <BackButton onBack={onBack} />
    </>
  );
}
