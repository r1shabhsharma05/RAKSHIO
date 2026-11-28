import { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import type { Screen } from '../engines/orchestrator/machine';
import type { StoredIncident } from '../state/store';
import { useDashboard } from '../state/dashboardStore';
import { t, whenText } from '../i18n';
import { guideForFraudType } from '../engines/guide/guide';
import { formatINR, fraudTypeLabel, methodLabel } from './shared';

gsap.registerPlugin(useGSAP);

// Incident card + Panic-to-Proof timeline. Only reachable after the
// confirmation gate — App never routes here with an unconfirmed incident.
export function IncidentScreen({
  stored,
  onActions,
  onTool,
  onReset,
}: {
  stored: StoredIncident;
  onActions: () => void;
  onTool: (s: Screen) => void;
  onReset: () => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const lang = useDashboard((s) => s.settings.language);

  // Timeline reveal: fade + rise once, staggered. Skipped under reduced motion.
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(
      '.timeline-item',
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.08, ease: 'power1.out' },
    );
  }, { scope: listRef });

  // One consistent format: 'en-IN' everywhere (hi-IN rendered a mixed-script
  // "27 नव॰, 03:55 pm" — Devanagari month + Latin pm).
  const created = new Date(stored.createdAt).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  // Step 18: the stored display string ('kal, 7 baje') is Hinglish by
  // construction — en/hi rebuild the when-line from the stored Date, and
  // fall back to "not known" when there is no Date to rebuild from.
  const whenLine = stored.fraudAt
    ? (whenText(stored.fraudAt, stored.fraudAtDisplay, lang) ?? t(lang, 'incTlWhenUnknown'))
    : (lang === 'hg' ? (stored.fraudAtDisplay ?? t(lang, 'incTlWhenUnknown')) : t(lang, 'incTlWhenUnknown'));

  return (
    <>
      <h2>{t(lang, 'incCardTitle')}</h2>
      {stored.caregiverMode && <Badge label={t(lang, 'incCaregiverBadge')} variant="success" />}
      <section className="rk-card">
        <div className="field-row"><span className="label">{t(lang, 'incAmount')}</span><span className="value">{stored.amount != null ? formatINR(stored.amount) : t(lang, 'incUnknown')}</span></div>
        <div className="field-row"><span className="label">{t(lang, 'incWhen')}</span><span className="value">{whenLine}</span></div>
        <div className="field-row"><span className="label">{t(lang, 'incHow')}</span><span className="value">{methodLabel(stored.method, lang)}</span></div>
        <div className="field-row"><span className="label">{t(lang, 'incBank')}</span><span className="value">{stored.bank ?? t(lang, 'incUnknown')}</span></div>
        <div className="field-row"><span className="label">{t(lang, 'incUtr')}</span><span className="value">{stored.utr ?? t(lang, 'incNotFound')}</span></div>
        <div className="field-row"><span className="label">{t(lang, 'incFraudType')}</span><span className="value">{fraudTypeLabel(stored.fraudType, lang)}</span></div>
        {stored.credentialShared && (
          <p className="step2-note" role="alert">{t(lang, 'incOtpShared')}</p>
        )}
        {stored.maskedCredentials && (
          <p className="note">{t(lang, 'incMaskedNote')}</p>
        )}
      </section>

      {/* Situation Guide: the Understanding Engine already extracted a fraud
          type — show the matching step-by-step guide for this situation.
          The guide title itself stays Hinglish by design (Step 18 boundary);
          only the chrome around it is keyed. */}
      <section className="rk-card">
        <h2>{t(lang, 'incGuideTitle')}</h2>
        {(() => {
          const guide = guideForFraudType(stored.fraudType);
          return guide ? (
            <p>
              <Link to={`/guide?id=${guide.id}`}>
                {guide.title} — {t(lang, 'incGuideLink')}
              </Link>
            </p>
          ) : (
            <p>
              <Link to="/guide">{t(lang, 'incGuideFallback')}</Link>
            </p>
          );
        })()}
      </section>

      <section className="rk-card">
        <h2>{t(lang, 'incTimelineTitle')}</h2>
        <ul className="timeline" ref={listRef}>
          <li className="timeline-item done">
            <div><strong>{t(lang, 'incTlFraud')}</strong><div className="when">{whenLine}</div></div>
          </li>
          <li className="timeline-item done">
            <div><strong>{t(lang, 'incTlTold')}</strong><div className="when">{created}</div></div>
          </li>
          <li className={stored.callTappedAt ? 'timeline-item done' : 'timeline-item pending'}>
            <div><strong>{t(lang, 'incTlCall')}</strong><div className="when">{stored.callTappedAt ? t(lang, 'incTlCallDone') : t(lang, 'incTlPending')}</div></div>
          </li>
          <li className="timeline-item pending">
            <div><strong>Portal complaint</strong><div className="when">{t(lang, 'incTlPortal')}</div></div>
          </li>
        </ul>
      </section>

      <button type="button" className="rk-primary-btn" onClick={onActions}>{t(lang, 'incNextSteps')}</button>

      <section className="rk-card">
        <h2>{t(lang, 'incToolsTitle')}</h2>
        <Button label={t(lang, 'incToolVault')} variant="secondary" size="lg" width="100%" onClick={() => onTool('vault')} />
        <Button label={t(lang, 'incToolShield')} variant="secondary" size="lg" width="100%" onClick={() => onTool('shield')} />
        <Button label={t(lang, 'incToolTriage')} variant="secondary" size="lg" width="100%" onClick={() => onTool('triage')} />
        <Button label={t(lang, 'incToolBank')} variant="secondary" size="lg" width="100%" onClick={() => onTool('bank')} />
        <Button label={t(lang, 'incToolCare')} variant="secondary" size="lg" width="100%" onClick={() => onTool('care')} />
        <Button label={t(lang, 'incToolProof')} variant="secondary" size="lg" width="100%" onClick={() => onTool('proof')} />
        <Button label={t(lang, 'incToolAck')} variant="secondary" size="lg" width="100%" onClick={() => onTool('ack')} />
      </section>

      <button type="button" className="demo-link" onClick={onReset}>{t(lang, 'incReset')}</button>
    </>
  );
}
