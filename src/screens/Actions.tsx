import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import type { Screen } from '../engines/orchestrator/machine';
import type { StoredIncident } from '../state/store';
import { deadlineStatuses, formatDuration, orderActions } from '../engines/orchestrator/clock';
import { NoReportBanner } from './shared';

gsap.registerPlugin(useGSAP);

// Golden Hour Clock + Action Queue. The queue re-orders itself as deadlines
// approach; Step 2 cards are visible placeholders, never fake functionality.
export function ActionsScreen({
  stored,
  onOpenCoach,
  onTool,
  onBack,
}: {
  stored: StoredIncident;
  onOpenCoach: () => void;
  onTool: (s: Screen) => void;
  onBack: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Card entrances: one quick stagger, total under 300ms, reduced-motion safe.
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(
      '.action-card',
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.22, stagger: 0.05, ease: 'power1.out' },
    );
  }, { scope: cardsRef });

  const fraudAt = stored.fraudAt ? new Date(stored.fraudAt) : new Date(stored.createdAt);
  const statuses = deadlineStatuses(fraudAt, now);
  const actions = orderActions(fraudAt, now, stored.credentialShared);

  return (
    <>
      <NoReportBanner />
      <h1>Golden Hour Clock</h1>
      <div className="clock-row" role="timer" aria-live="off">
        {statuses.map((s) => (
          <div key={s.id} className={`deadline-chip ${s.state}`}>
            <div className="time">{s.state === 'overdue' ? 'Samay khatm' : formatDuration(s.remainingMs)}</div>
            <div className="name">{s.label}</div>
            <div className="window">{s.windowLabel} window</div>
          </div>
        ))}
      </div>

      <h2>Aage ke kadam — pehle sabse zaroori</h2>
      <div ref={cardsRef} className="card-stack">
        {actions.map((a, i) => (
          <section className="rk-card action-card" key={a.id}>
            <div className="row-between">
              <h3>{i + 1}. {a.title}</h3>
              {a.urgent && <span className="badge-wrap"><Badge label="Turant" variant="warning" /></span>}
            </div>
            <p className="why">{a.why}</p>
            {a.id === 'stop' && (
              <p>
                1. Bank app kholein — card/UPI block karein. 2. UPI PIN badlein. 3. Kisi ko OTP mat dijiye.
              </p>
            )}
            {a.id === 'call1930' && (
              <Button label="1930 Call Coach kholein" variant="destructive" size="lg" width="100%" onClick={onOpenCoach} />
            )}
            {a.id === 'bank' && (
              <Button label="Bank Alert Kit kholein" variant="secondary" size="lg" width="100%" onClick={() => onTool('bank')} />
            )}
            {a.id === 'portal' && (
              <Button label="Ack Bridge kholein" variant="secondary" size="lg" width="100%" onClick={() => onTool('ack')} />
            )}
            {a.id === 'evidence' && (
              <Button label="Evidence Vault kholein" variant="secondary" size="lg" width="100%" onClick={() => onTool('vault')} />
            )}
            {a.id === 'family' && (
              <Button label="Care Circle kholein" variant="secondary" size="lg" width="100%" onClick={() => onTool('care')} />
            )}
          </section>
        ))}
      </div>
      <Button label="Incident card wapas" variant="ghost" size="lg" width="100%" onClick={onBack} />
    </>
  );
}
