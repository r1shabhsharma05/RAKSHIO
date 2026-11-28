import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';
import { INCIDENT_STATUSES, STATUS_KEY } from '../state/incidents';
import { IncidentScreen } from '../screens/Incident';
import { screenToPath } from './routes';
import { FollowUpList } from './FollowUp';

// Detail = the tested IncidentScreen (card + timeline + tools) plus the
// dashboard-only controls: status picker, follow-ups, delete.
export function IncidentDetailPage() {
  const { id } = useParams();
  const lang = useDashboard((s) => s.settings.language);
  const incidents = useDashboard((s) => s.incidents);
  const active = useDashboard((s) => s.active());
  const setActive = useDashboard((s) => s.setActive);
  const updateIncident = useDashboard((s) => s.updateIncident);
  const deleteIncident = useDashboard((s) => s.deleteIncident);
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const incident = incidents.find((i) => i.id === id) ?? null;
  if (!incident) {
    return (
      <div className="db-card">
        <h2 className="db-page-title">{t(lang, 'detailNotFound')}</h2>
        <p className="db-muted">{t(lang, 'detailNotFoundHint')}</p>
        <div>
          <button type="button" className="db-btn db-btn-outline" onClick={() => navigate('/incidents')}>
            {t(lang, 'detailBack')}
          </button>
        </div>
      </div>
    );
  }

  const isActive = active?.id === incident.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/incidents" className="db-btn db-btn-ghost">← {t(lang, 'navIncidents')}</Link>
        {!isActive && (
          <button type="button" className="db-btn db-btn-outline" onClick={() => setActive(incident.id)}>
            {t(lang, 'detailSetActive')}
          </button>
        )}
      </div>

      <div className="db-flow">
        <IncidentScreen
          stored={incident}
          onActions={() => navigate('/actions')}
          onTool={(s) => navigate(screenToPath(s, incident.id))}
          onReset={() => navigate('/report')}
        />
      </div>

      <section className="db-card" aria-label="Status and follow-ups">
        <h2>{t(lang, 'detailStatusTitle')}</h2>
        <div className="db-setting-row">
          <div>
            <strong>{t(lang, STATUS_KEY[incident.status ?? 'in-progress'])}</strong>{' '}
            {incident.demo && <span className="db-badge gray">DEMO</span>}
            <p className="db-muted">{t(lang, 'detailStatusNote')}</p>
          </div>
          <select
            className="db-input w-56 shrink-0"
            aria-label={t(lang, 'detailStatusAria')}
            value={incident.status ?? 'in-progress'}
            onChange={(e) => updateIncident(incident.id, { status: e.target.value as (typeof INCIDENT_STATUSES)[number] })}
          >
            {INCIDENT_STATUSES.map((s) => (
              <option key={s} value={s}>{t(lang, STATUS_KEY[s])}</option>
            ))}
          </select>
        </div>
        <h2 style={{ marginTop: '1rem' }}>Follow-up Guardian</h2>
        <FollowUpList incident={incident} />
      </section>

      <section className="db-card" aria-label="Delete incident">
        <h2>{t(lang, 'detailDeleteTitle')}</h2>
        <p className="db-muted">{t(lang, 'detailDeleteHint')}</p>
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="db-btn db-btn-red" onClick={() => { deleteIncident(incident.id); navigate('/incidents'); }}>
              {t(lang, 'detailDeleteConfirm')}
            </button>
            <button type="button" className="db-btn db-btn-outline" onClick={() => setConfirmDelete(false)}>
              {t(lang, 'detailDeleteCancel')}
            </button>
          </div>
        ) : (
          <div>
            <button type="button" className="db-btn db-btn-outline" onClick={() => setConfirmDelete(true)}>
              {t(lang, 'settingsDeleteBtn')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
