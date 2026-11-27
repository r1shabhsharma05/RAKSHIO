import { useNavigate } from 'react-router-dom';
import { JudgeScreen } from '../screens/Judge';
import { useDashboard } from '../state/dashboardStore';
import { extractIncident } from '../engines/understanding/extract';
import { toStored } from '../state/store';
import { DEMO_TRANSCRIPT } from '../demo/seed';

// Judge Mode as a real route (#/judge): searchable + linkable, with no
// 13th dock item — the dock stays 12. Seeding mirrors ReportFlow's
// confirm: extract the demo transcript, store it, open the incident.
export function JudgePage() {
  const navigate = useNavigate();
  const addIncident = useDashboard((s) => s.addIncident);
  const caregiver = useDashboard((s) => s.settings.caregiver);
  function onStart() {
    const { incident, maskedTranscript, masked } = extractIncident(DEMO_TRANSCRIPT);
    const s = toStored(incident, maskedTranscript, masked, incident.fraudAt.value, caregiver);
    s.status = 'reported';
    addIncident(s);
    navigate(`/incidents/${s.id}`);
  }
  return (
    <div className="db-flow">
      <JudgeScreen onStart={onStart} onBack={() => navigate('/')} />
    </div>
  );
}
