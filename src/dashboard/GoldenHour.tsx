import { useEffect, useState } from 'react';
import type { StoredIncident } from '../state/store';
import { deadlineStatuses } from '../engines/orchestrator/clock';

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
  const statuses = deadlineStatuses(start, now);
  const portal = statuses.find((s) => s.id === 'portal');
  const helpline = statuses.find((s) => s.id === '1930');
  const overText =
    portal?.state === 'overdue' && helpline?.state === 'overdue'
      ? 'Pehla ghanta beet gaya. Portal (24h) aur 1930 (48h) — dono windows beet gayin. Phir bhi 1930 par call karein aur bank ko suchit karein; der se report karna, na karne se behtar hai.'
      : portal?.state === 'overdue'
        ? 'Pehla ghanta beet gaya. Portal ki 24 ghante ki window beet gayi — phir bhi cybercrime.gov.in par complaint darj karein. 1930 (48h) abhi bhi khula hai — abhi call karein.'
        : 'Pehla ghanta beet gaya. 1930 (48h) aur portal (24h) ki deadlines abhi bhi khuli hain — abhi call karein.';
  const r = 62;
  const circ = 2 * Math.PI * r;

  return (
    <div className="db-clock-wrap">
      <div className="db-ring" role="timer" aria-live="off" aria-label={over ? 'Golden Hour khatm' : `Golden Hour me bacha samay ${formatHMS(remainingMs)}`}>
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
          {over ? 'Golden Hour khatm — phir bhi kadam baaki hain' : 'Left in Golden Hour (First 60 minutes)'}
        </strong>
        <p className="db-muted">
          {over ? overText : 'Fraud ke pehle ghante me block aur freeze ka chance sabse zyada hota hai.'}
        </p>
      </div>
    </div>
  );
}
