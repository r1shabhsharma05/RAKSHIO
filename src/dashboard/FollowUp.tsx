import type { StoredIncident } from '../state/store';
import { t } from '../i18n';
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

// Reminder copy is dashboard chrome, so it is keyed at render time (Bug 2).
// The REMINDERS const stays Hinglish: buildIcs reuses it for the .ics file.
const REMINDER_TEXT: Record<FollowupId, { labelKey: string; detailKey: string }> = {
  '1h': { labelKey: 'rem1hLabel', detailKey: 'rem1hDetail' },
  '24h': { labelKey: 'rem24hLabel', detailKey: 'rem24hDetail' },
  '3d': { labelKey: 'rem3dLabel', detailKey: 'rem3dDetail' },
  '7d': { labelKey: 'rem7dLabel', detailKey: 'rem7dDetail' },
};

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
  const lang = useDashboard((s) => s.settings.language);
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
      return <p className="db-muted">{t(lang, 'fuAllDone')}</p>;
    }
    const overdue = next.due.getTime() <= now.getTime();
    return (
      <div className="db-setting-row">
        <div>
          <strong>{t(lang, REMINDER_TEXT[next.id].labelKey)}</strong>
          <p className="db-muted">{t(lang, REMINDER_TEXT[next.id].detailKey)}</p>
          <p className="db-muted">{t(lang, 'fuDue')} {next.due.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{overdue ? ` — ${t(lang, 'fuBadgeOverdue')}` : ''}</p>
        </div>
        <button type="button" className="db-btn db-btn-sm" onClick={() => markFollowup(incident.id, next.id)}>
          {t(lang, 'fuMarkDone')}
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
              <strong>{t(lang, REMINDER_TEXT[r.id].labelKey)}</strong>{' '}
              {done ? <span className="db-badge green">{t(lang, 'fuBadgeDone')}</span> : overdue ? <span className="db-badge red">{t(lang, 'fuBadgeOverdue')}</span> : <span className="db-badge gray">{t(lang, 'fuBadgeUpcoming')}</span>}
              <p className="db-muted">{t(lang, REMINDER_TEXT[r.id].detailKey)}</p>
              <p className="db-muted">{t(lang, 'fuDue')} {r.due.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!done && (
                <button type="button" className="db-btn db-btn-sm" onClick={() => markFollowup(incident.id, r.id)}>
                  {t(lang, 'fuMarkDone')}
                </button>
              )}
              <button type="button" className="db-btn db-btn-sm db-btn-outline" onClick={() => downloadIcs(incident, [r], `rakshio-followup-${r.id}.ics`)}>
                {t(lang, 'fuDownloadOne')}
              </button>
            </div>
          </div>
        );
      })}
      <button type="button" className="db-btn db-btn-outline" onClick={() => downloadIcs(incident, reminders, 'rakshio-followups.ics')}>
        {t(lang, 'fuDownloadAll')}
      </button>
    </div>
  );
}
