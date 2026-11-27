import { Check } from 'lucide-react';
import type { StoredIncident } from '../state/store';
import { loadAck } from '../engines/ack/ack';
import { loadBankRef } from '../engines/banks/banks';

// Progress is derived only from things the user actually did (or recorded):
// call button tapped, ack saved, bank reference saved, evidence added,
// status set to Closed. Nothing is inferred about the bank or the police.
export interface ProgressStep {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
}

export function progressSteps(
  incident: StoredIncident,
  evidenceCount: number,
): ProgressStep[] {
  const ack = loadAck();
  const hasAck = !!ack && ack.incidentId === incident.id;
  const hasBankRef = loadBankRef(incident.id).trim().length > 0;
  const steps: ProgressStep[] = [
    { id: 'reported', label: 'Reported (1930)', done: !!incident.callTappedAt, current: false },
    { id: 'portal', label: 'Portal (24h)', done: hasAck, current: false },
    { id: 'bank', label: 'Bank Alert', done: hasBankRef, current: false },
    { id: 'evidence', label: 'Evidence Saved', done: evidenceCount > 0, current: false },
    { id: 'closed', label: 'Closed', done: incident.status === 'closed', current: false },
  ];
  const firstOpen = steps.findIndex((s) => !s.done);
  if (firstOpen >= 0) steps[firstOpen].current = true;
  return steps;
}

export function ProgressTracker({ incident, evidenceCount }: { incident: StoredIncident; evidenceCount: number }) {
  const steps = progressSteps(incident, evidenceCount);
  return (
    <div className="db-tracker" role="list" aria-label="Progress">
      {steps.map((s) => (
        <div key={s.id} className={`db-track-step${s.done ? ' done' : ''}${s.current ? ' current' : ''}`} role="listitem" aria-current={s.current ? 'step' : undefined}>
          <span className="node">{s.done ? <Check size={16} aria-hidden="true" /> : null}</span>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}
