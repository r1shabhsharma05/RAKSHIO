import type { StoredIncident } from '../state/store';
import { useDashboard } from '../state/dashboardStore';
import type { FollowupId } from '../state/incidents';
import { formatINR } from '../screens/shared';

// F16 Follow-up Guardian: reminders at 1h / 24h / 3d / 7d after the incident.
// Status is user-reported only ("Mark done") — RAKSHIO never infers that a
// bank or portal step happened. Each reminder downloads as a real .ics.
export interface Reminder {
  id: FollowupId;
  label: string;
  detail: string;
  due: Date;
}

export const REMINDERS: { id: FollowupId; label: string; detail: string; hours: number }[] = [
  { id: '1h', label: '1 ghante baad', detail: '1930 call hui? Ack number mila? Yahan note karein.', hours: 1 },
  { id: '24h', label: '24 ghante baad', detail: 'Portal complaint cybercrime.gov.in par poori hui?', hours: 24 },
  { id: '3d', label: '3 din baad', detail: 'Bank se dispute/reference number mila?', hours: 72 },
  { id: '7d', label: '7 din baad', detail: 'Status check: bank + portal par kya update hai?', hours: 168 },
];

const EMPTY_FOLLOWUPS: Partial<Record<FollowupId, 'done'>> = {};

export function remindersFor(incident: StoredIncident): Reminder[] {
  const base = new Date(incident.createdAt).getTime();
  return REMINDERS.map((r) => ({ ...r, due: new Date(base + r.hours * 3600_000) }));
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildIcs(incident: StoredIncident, reminders: Reminder[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RAKSHIO//Follow-up Guardian//EN',
  ];
  for (const r of reminders) {
    const end = new Date(r.due.getTime() + 30 * 60_000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${incident.id}-${r.id}@rakshio`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(r.due)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:RAKSHIO follow-up — ${r.label}`,
      `DESCRIPTION:${r.detail} Amount: ${incident.amount != null ? formatINR(incident.amount) : 'unknown'}. RAKSHIO report file nahi karta.`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(incident: StoredIncident, reminders: Reminder[], filename: string): void {
  const blob = new Blob([buildIcs(incident, reminders)], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function FollowUpList({ incident, compact = false }: { incident: StoredIncident; compact?: boolean }) {
  // Cached empty record: a `?? {}` literal here would hand Zustand a NEW
  // object on every getSnapshot call, and React's useSyncExternalStore
  // then loops forever ("getSnapshot should be cached", error #185).
  // That one literal crashed every page rendering FollowUpList.
  const followups = useDashboard((s) => s.followups[incident.id] ?? EMPTY_FOLLOWUPS);
  const markFollowup = useDashboard((s) => s.markFollowup);
  const now = new Date();
  const reminders = remindersFor(incident);
  const next = reminders.find((r) => !followups[r.id]);

  if (compact) {
    if (!next) {
      return <p className="db-muted">Sabhi follow-ups poore ho gaye — achha kaam.</p>;
    }
    const overdue = next.due.getTime() <= now.getTime();
    return (
      <div className="db-setting-row">
        <div>
          <strong>{next.label}</strong>
          <p className="db-muted">{next.detail}</p>
          <p className="db-muted">Due: {next.due.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{overdue ? ' — overdue' : ''}</p>
        </div>
        <button type="button" className="db-btn db-btn-sm" onClick={() => markFollowup(incident.id, next.id)}>
          Done mark karein
        </button>
      </div>
    );
  }

  return (
    <div className="db-rows">
      {reminders.map((r) => {
        const done = followups[r.id] === 'done';
        const overdue = !done && r.due.getTime() <= now.getTime();
        return (
          <div key={r.id} className="db-setting-row">
            <div>
              <strong>{r.label}</strong>{' '}
              {done ? <span className="db-badge green">Done</span> : overdue ? <span className="db-badge red">Overdue</span> : <span className="db-badge gray">Upcoming</span>}
              <p className="db-muted">{r.detail}</p>
              <p className="db-muted">Due: {r.due.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!done && (
                <button type="button" className="db-btn db-btn-sm" onClick={() => markFollowup(incident.id, r.id)}>
                  Done mark karein
                </button>
              )}
              <button type="button" className="db-btn db-btn-sm db-btn-outline" onClick={() => downloadIcs(incident, [r], `rakshio-followup-${r.id}.ics`)}>
                .ics download
              </button>
            </div>
          </div>
        );
      })}
      <button type="button" className="db-btn db-btn-outline" onClick={() => downloadIcs(incident, reminders, 'rakshio-followups.ics')}>
        Sabhi reminders .ics me download karein
      </button>
    </div>
  );
}
