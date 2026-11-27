import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDashboard } from '../state/dashboardStore';
import { INCIDENT_STATUSES, STATUS_LABELS } from '../state/incidents';
import { IncidentScreen } from '../screens/Incident';
import { screenToPath } from './routes';
import { FollowUpList } from './FollowUp';

// Detail = the tested IncidentScreen (card + timeline + tools) plus the
// dashboard-only controls: status picker, follow-ups, delete.
export function IncidentDetailPage() {
  const { id } = useParams();
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
        <h1 className="db-page-title">Incident nahi mila</h1>
        <p className="db-muted">Ye ID delete ho gaya ho, ya kabhi bana hi nahi.</p>
        <div>
          <button type="button" className="db-btn db-btn-outline" onClick={() => navigate('/incidents')}>
            Incident Dashboard wapas
          </button>
        </div>
      </div>
    );
  }

  const isActive = active?.id === incident.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/incidents" className="db-btn db-btn-ghost">← Incident Dashboard</Link>
        {!isActive && (
          <button type="button" className="db-btn db-btn-outline" onClick={() => setActive(incident.id)}>
            Is incident ko active karein
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
        <h2>Status</h2>
        <div className="db-setting-row">
          <div>
            <strong>{STATUS_LABELS[incident.status ?? 'in-progress']}</strong>
            <p className="db-muted">Status sirf aap badalte hain — RAKSHIO khud kabhi &ldquo;Closed&rdquo; nahi karta.</p>
          </div>
          <select
            className="db-input w-56 shrink-0"
            aria-label="Incident status badlein"
            value={incident.status ?? 'in-progress'}
            onChange={(e) => updateIncident(incident.id, { status: e.target.value as (typeof INCIDENT_STATUSES)[number] })}
          >
            {INCIDENT_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <h2 style={{ marginTop: '1rem' }}>Follow-up Guardian</h2>
        <FollowUpList incident={incident} />
      </section>

      <section className="db-card" aria-label="Delete incident">
        <h2>Incident delete karein</h2>
        <p className="db-muted">Incident, uska ack, aur uske follow-ups delete honge. Evidence Vault ke records alag se rehte hain.</p>
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="db-btn db-btn-red" onClick={() => { deleteIncident(incident.id); navigate('/incidents'); }}>
              Pakka delete karein
            </button>
            <button type="button" className="db-btn db-btn-outline" onClick={() => setConfirmDelete(false)}>
              Rukiye — mat delete karein
            </button>
          </div>
        ) : (
          <div>
            <button type="button" className="db-btn db-btn-outline" onClick={() => setConfirmDelete(true)}>
              Delete karein
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
