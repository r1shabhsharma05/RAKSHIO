import { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import type { Screen } from '../engines/orchestrator/machine';
import type { StoredIncident } from '../state/store';
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

  return (
    <>
      <h1>Aapka incident card</h1>
      {stored.caregiverMode && <Badge label="Caregiver ne bhara hai" variant="success" />}
      <section className="rk-card">
        <div className="field-row"><span className="label">Rashi</span><span className="value">{stored.amount != null ? formatINR(stored.amount) : 'Pata nahi'}</span></div>
        <div className="field-row"><span className="label">Kab hua</span><span className="value">{stored.fraudAtDisplay ?? 'Pata nahi'}</span></div>
        <div className="field-row"><span className="label">Kaise gaye</span><span className="value">{methodLabel(stored.method)}</span></div>
        <div className="field-row"><span className="label">Bank / App</span><span className="value">{stored.bank ?? 'Pata nahi'}</span></div>
        <div className="field-row"><span className="label">UTR</span><span className="value">{stored.utr ?? 'Nahi mila'}</span></div>
        <div className="field-row"><span className="label">Fraud type</span><span className="value">{fraudTypeLabel(stored.fraudType)}</span></div>
        {stored.credentialShared && (
          <p className="step2-note" role="alert">Aapne OTP/PIN share kiya tha — turant card/UPI block karein, aur kisi ko OTP mat dijiye.</p>
        )}
        {stored.maskedCredentials && (
          <p className="note">OTP/PIN wale number chhupakar save kiye gaye hain — RAKSHIO kabhi OTP/PIN store nahi karta.</p>
        )}
      </section>

      {/* Situation Guide: the Understanding Engine already extracted a fraud
          type — show the matching step-by-step guide for this situation. */}
      <section className="rk-card">
        <h2>Is situation me kya karein</h2>
        {(() => {
          const guide = guideForFraudType(stored.fraudType);
          return guide ? (
            <p>
              <Link to={`/guide?id=${guide.id}`}>
                {guide.title} — pehle 5 minute, report ke kadam, aur kya na karein, step by step.
              </Link>
            </p>
          ) : (
            <p>
              <Link to="/guide">Situation Guide dekhein — har situation me kya karein, step by step.</Link>
            </p>
          );
        })()}
      </section>

      <section className="rk-card">
        <h2>Panic se Proof tak</h2>
        <ul className="timeline" ref={listRef}>
          <li className="timeline-item done">
            <div><strong>Fraud hua</strong><div className="when">{stored.fraudAtDisplay ?? 'Samay pata nahi'}</div></div>
          </li>
          <li className="timeline-item done">
            <div><strong>Aapne RAKSHIO ko bataya</strong><div className="when">{created}</div></div>
          </li>
          <li className={stored.callTappedAt ? 'timeline-item done' : 'timeline-item pending'}>
            <div><strong>1930 par call</strong><div className="when">{stored.callTappedAt ? 'Call tap hua' : 'Baaki hai'}</div></div>
          </li>
          <li className="timeline-item pending">
            <div><strong>Portal complaint</strong><div className="when">1930 ke baad 24 ghante me — cybercrime.gov.in</div></div>
          </li>
        </ul>
      </section>

      <button type="button" className="rk-primary-btn" onClick={onActions}>Aage ke kadam dekhein</button>

      <section className="rk-card">
        <h2>Madad ke tools</h2>
        <Button label="Evidence Vault — saboot save karein" variant="secondary" size="lg" width="100%" onClick={() => onTool('vault')} />
        <Button label="Second-Scam Shield — message check karein" variant="secondary" size="lg" width="100%" onClick={() => onTool('shield')} />
        <Button label="Triage — mera rasta kya hai?" variant="secondary" size="lg" width="100%" onClick={() => onTool('triage')} />
        <Button label="Bank Alert Kit" variant="secondary" size="lg" width="100%" onClick={() => onTool('bank')} />
        <Button label="Care Circle — parivar ko batayein" variant="secondary" size="lg" width="100%" onClick={() => onTool('care')} />
        <Button label="Proof Pack — PDF / ZIP" variant="secondary" size="lg" width="100%" onClick={() => onTool('proof')} />
        <Button label="Ack Bridge — 1930 ack number" variant="secondary" size="lg" width="100%" onClick={() => onTool('ack')} />
      </section>

      <button type="button" className="demo-link" onClick={onReset}>Saaf karein — naya incident shuru karein</button>
    </>
  );
}
