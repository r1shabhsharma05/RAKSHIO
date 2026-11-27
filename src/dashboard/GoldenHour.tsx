import { useEffect, useState } from 'react';
import type { StoredIncident } from '../state/store';
import { deadlineStatuses } from '../engines/orchestrator/clock';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

// Golden Hour = the first 60 minutes after the fraud. The ring shows how
// much of that hour is left, ticking every second. Past the hour it says
// so plainly — the 48h/24h/72h deadlines still run underneath (see the
// deadline chips), so the victim is never told the window is closed.
const GOLDEN_HOUR_MS = 60 * 60_000;

function formatHMS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function GoldenHourRing({ incident }: { incident: StoredIncident }) {
  const lang = useDashboard((s) => s.settings.language);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const start = incident.fraudAt ? new Date(incident.fraudAt) : new Date(incident.createdAt);
  const elapsedMs = now.getTime() - start.getTime();
  const remainingMs = GOLDEN_HOUR_MS - elapsedMs;
  const over = remainingMs <= 0;
  const frac = Math.max(0, Math.min(1, remainingMs / GOLDEN_HOUR_MS));
  // The reassurance line must agree with the deadline chips below it: if
  // the portal 24h window has already expired, saying "deadlines abhi bhi
  // khuli hain" contradicts the "Samay khatm" chip. Say which windows are
  // open and what to do next — never invent a new deadline.
  // Step 16 (bug 2): this body copy follows the selected language.
  const statuses = deadlineStatuses(start, now);
  const portal = statuses.find((s) => s.id === 'portal');
  const helpline = statuses.find((s) => s.id === '1930');
  const overText =
    portal?.state === 'overdue' && helpline?.state === 'overdue'
      ? t(lang, 'clockOverBodyBoth')
      : portal?.state === 'overdue'
        ? t(lang, 'clockOverBodyPortal')
        : t(lang, 'clockOverBodyOpen');
  const r = 62;
  const circ = 2 * Math.PI * r;

  return (
    <div className="db-clock-wrap">
      <div className="db-ring" role="timer" aria-live="off" aria-label={over ? t(lang, 'clockAriaOver') : t(lang, 'clockAriaLeft', { time: formatHMS(remainingMs) })}>
        <svg width="144" height="144" viewBox="0 0 144 144" aria-hidden="true">
          <circle cx="72" cy="72" r={r} fill="none" stroke="#262626" strokeWidth="10" />
          <circle
            cx="72"
            cy="72"
            r={r}
            fill="none"
            stroke={over ? '#f59e0b' : '#ef4444'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - frac)}
          />
        </svg>
        <span className="ring-num">{over ? '00:00:00' : formatHMS(remainingMs)}</span>
      </div>
      <div className="db-clock-side">
        <strong style={{ fontSize: '1rem' }}>
          {over ? t(lang, 'clockOverTitle') : t(lang, 'clockLeftTitle')}
        </strong>
        <p className="db-muted">
          {over ? overText : t(lang, 'clockLeftBody')}
        </p>
      </div>
    </div>
  );
}
