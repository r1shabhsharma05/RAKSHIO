import { Link, useSearchParams } from 'react-router-dom';
import { GUIDES, guideById } from '../engines/guide/guide';
import { t } from '../i18n';
import { useDashboard } from '../state/dashboardStore';

// Situation Guide: a fixed, reviewed list of steps for each fraud
// situation — deterministic, on-device, no model, no AI. Reached from the
// Incident screen, the Shield Truth Card, and Home. No dock entry: the
// dock keeps the 12 sections.
export function GuidePage() {
  const lang = useDashboard((s) => s.settings.language);
  const [params] = useSearchParams();
  const guide = guideById(params.get('id'));

  if (guide) {
    return (
      <div className="db-flow">
        <Link to="/guide" className="db-btn db-btn-ghost">← {t(lang, 'guideTitle')}</Link>
        <div className="db-card">
          <h2 className="db-page-title">{guide.title}</h2>
          <h2>Kaise pehchanein</h2>
          <ul>
            {guide.recognize.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h2>Pehle 5 minute</h2>
          <ol>
            {guide.firstFiveMinutes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <h2>Report kaise karein</h2>
          <ol>
            {guide.reportSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <h2>Ye mat karein</h2>
          <ul>
            {guide.dontDo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h2>Kya saboot rakhein</h2>
          <ul>
            {guide.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="db-muted">
            RAKSHIO report file nahi karta — 1930 / bank / portal par aapko khud contact karna hoga.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="db-flow">
      <div className="db-card">
        <h2 className="db-page-title">{t(lang, 'guideTitle')}</h2>
        <p className="db-muted">{t(lang, 'guideSub')}</p>
        <ul>
          {GUIDES.map((g) => (
            <li key={g.id}>
              <Link to={`/guide?id=${g.id}`}>{g.title}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
