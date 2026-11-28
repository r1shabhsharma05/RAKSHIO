import { useNavigate } from 'react-router-dom';
import { JudgeScreen } from '../screens/Judge';
import { useDashboard } from '../state/dashboardStore';
import { extractIncident } from '../engines/understanding/extract';
import { toStored } from '../state/store';
import { DEMO_TRANSCRIPT, makeDemoFresh } from '../demo/seed';
import { formatINR } from '../screens/shared';

// Judge Mode as a real route (#/judge): searchable + linkable, with no
// 13th dock item — the dock stays 12. Seeding mirrors ReportFlow's
// confirm: extract the demo transcript, store it, open the incident.
// Step 16 (bug 13): the current active incident is shown on the page, and
// the seed button asks first — the old incident stays saved.
// Step 21 (D2/D4): the seed is marked demo (fictional, 20 minutes old —
// never a stale "Time over" clock) and the previous active incident is
// stashed by the store, so the Judge page can hand it back with one tap.
export function JudgePage() {
  const navigate = useNavigate();
  const addIncident = useDashboard((s) => s.addIncident);
  const active = useDashboard((s) => s.active());
  const prevActiveId = useDashboard((s) => s.prevActiveId);
  const setActive = useDashboard((s) => s.setActive);
  const caregiver = useDashboard((s) => s.settings.caregiver);
  function onStart() {
    const { incident, maskedTranscript, masked } = extractIncident(DEMO_TRANSCRIPT);
    const s = makeDemoFresh(toStored(incident, maskedTranscript, masked, incident.fraudAt.value, caregiver));
    s.status = 'reported';
    addIncident(s, { demo: true });
    navigate(`/incidents/${s.id}`);
  }
  return (
    <div className="db-flow">
      <JudgeScreen
        active={active ? { id: `#${active.id.replace(/^rk-/, 'RK-').toUpperCase()}`, amount: active.amount != null ? formatINR(active.amount) : '—' } : null}
        rawId={active?.id ?? null}
        prevActiveId={prevActiveId}
        onRestore={prevActiveId ? () => { setActive(prevActiveId); navigate('/'); } : undefined}
        onStart={onStart}
        onBack={() => navigate('/')}
      />
    </div>
  );
}
