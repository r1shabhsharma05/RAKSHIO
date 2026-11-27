import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import type { Screen } from '../engines/orchestrator/machine';
import type { StoredIncident } from '../state/store';
import { deadlineStatuses, formatDurationLang, orderActions } from '../engines/orchestrator/clock';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

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
  const lang = useDashboard((s) => s.settings.language);
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
  const actions = orderActions(fraudAt, now, stored.credentialShared, lang);

  return (
    <>
      <h2>{t(lang, 'clockTitle')}</h2>
      <div className="clock-row" role="timer" aria-live="off">
        {statuses.map((s) => (
          <div key={s.id} className={`deadline-chip ${s.state}`}>
            <div className="time">{s.state === 'overdue' ? t(lang, 'chipOverdue') : formatDurationLang(lang, s.remainingMs)}</div>
            <div className="name">{s.labelKey ? t(lang, s.labelKey) : s.label}</div>
            <div className="window">{t(lang, 'actionsWindow', { window: s.windowLabel })}</div>
          </div>
        ))}
      </div>

      <h2>{t(lang, 'actionsNextTitle')}</h2>
      <div ref={cardsRef} className="card-stack">
        {actions.map((a, i) => (
          <section className="rk-card action-card" key={a.id}>
            <div className="row-between">
              <h3>{i + 1}. {a.title}</h3>
              {a.urgent && <span className="badge-wrap"><Badge label={t(lang, 'actionsUrgent')} variant="warning" /></span>}
            </div>
            <p className="why">{a.why}</p>
            {a.id === 'stop' && (
              <p>
                {t(lang, 'actionsStopDetail')}
              </p>
            )}
            {a.id === 'call1930' && (
              <Button label={t(lang, 'actionsOpenCoach')} variant="destructive" size="lg" width="100%" onClick={onOpenCoach} />
            )}
            {a.id === 'bank' && (
              <Button label={t(lang, 'actionsOpenBank')} variant="secondary" size="lg" width="100%" onClick={() => onTool('bank')} />
            )}
            {a.id === 'portal' && (
              <Button label={t(lang, 'actionsOpenAck')} variant="secondary" size="lg" width="100%" onClick={() => onTool('ack')} />
            )}
            {a.id === 'evidence' && (
              <Button label={t(lang, 'actionsOpenVault')} variant="secondary" size="lg" width="100%" onClick={() => onTool('vault')} />
            )}
            {a.id === 'family' && (
              <Button label={t(lang, 'actionsOpenCare')} variant="secondary" size="lg" width="100%" onClick={() => onTool('care')} />
            )}
          </section>
        ))}
      </div>
      <Button label={t(lang, 'actionsBack')} variant="ghost" size="lg" width="100%" onClick={onBack} />
    </>
  );
}
