import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  Banknote,
  Check,
  Clock3,
  Download,
  FileCheck,
  Landmark,
  MessageSquareWarning,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';
import { ShieldLogo } from './GlassShell';
import { GoldenHourRing } from './GoldenHour';
import { ProgressTracker } from './Progress';
import { FollowUpList } from './FollowUp';
import { deadlineStatuses, formatDurationLang, orderActions } from '../engines/orchestrator/clock';
// Vault (Dexie) and Proof Pack (pdf-lib) stay out of the first-load bundle:
// Home pulls them in on demand with dynamic imports, same as the lazy screens.
import type { EvidenceRecord } from '../engines/evidence/vault';
import { loadAck } from '../engines/ack/ack';
import { modelWarning } from '../engines/shield/mlModel';
import { loadBankRef } from '../engines/banks/banks';
import { formatINR, fraudTypeLabel } from '../screens/shared';
import { STATUS_KEY } from '../state/incidents';
import { useToast } from '../components/Toast';
import type { StoredIncident } from '../state/store';

gsap.registerPlugin(useGSAP);

function shortId(id: string): string {
  return `#${id.replace(/^rk-/, 'RK-').toUpperCase()}`;
}

// Step 11: empty-state previews reuse the same copy as the live widgets,
// so the no-incident Home teaches the flow instead of showing bare hints.
// Step 12: clock/plan copy is dashboard chrome, so it is keyed (Bug 2) —
// the same English lines in three locales would read as untranslated.
function clockWhy(lang: 'en' | 'hi' | 'hg') {
  return [t(lang, 'clockWhy1'), t(lang, 'clockWhy2'), t(lang, 'clockWhy3')];
}

function planPreview(lang: 'en' | 'hi' | 'hg') {
  return [
    { id: 'call1930', title: t(lang, 'planCall1930Title'), why: t(lang, 'planCall1930Why') },
    { id: 'portal', title: t(lang, 'planPortalTitle'), why: t(lang, 'planPortalWhy') },
    { id: 'bank', title: t(lang, 'planBankTitle'), why: t(lang, 'planBankWhy') },
    { id: 'evidence', title: t(lang, 'planEvidenceTitle'), why: t(lang, 'planEvidenceWhy') },
    { id: 'shield', title: t(lang, 'planShieldTitle'), why: t(lang, 'planShieldWhy') },
  ];
}

function Tile({
  icon,
  title,
  sub,
  to,
  ok,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  to: string;
  ok?: boolean;
}) {
  return (
    <Link to={to} className="db-tile">
      <span className={`check${ok ? '' : ' idle'}`}>{icon}</span>
      <span>
        <strong>{title}</strong>
        <span>{sub}</span>
      </span>
    </Link>
  );
}

export function HomePage() {
  const lang = useDashboard((s) => s.settings.language);
  const active = useDashboard((s) => s.active());
  const updateIncident = useDashboard((s) => s.updateIncident);
  const shieldLast = useDashboard((s) => s.shieldLast);
  // Step 21 (T3): if the model disagreed with the rules on the last
  // Shield check, the Home tile says so — the disagreement used to live
  // only inside Shield itself. No threshold is stored with shieldLast,
  // so modelWarning's default (the shipped model's 0.65) applies here.
  const shieldDisagree =
    shieldLast && shieldLast.mlScore != null && shieldLast.mlCoverage != null
      ? modelWarning(shieldLast.level, shieldLast.mlScore, shieldLast.mlCoverage) === 'disagree'
      : false;
  const navigate = useNavigate();
  const showToast = useToast();
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [verify, setVerify] = useState<{ ok: boolean; count: number } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const homeRef = useRef<HTMLDivElement>(null);

  // Home entrance: GSAP micro-animation, 220ms fade+rise per card, 40ms
  // stagger. Skipped entirely under reduced motion; transform+opacity only,
  // so the 1930 button stays clickable from the first frame.
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const cards = homeRef.current?.querySelectorAll('.db-card');
      if (!cards || cards.length === 0) return;
      gsap.fromTo(
        cards,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.22, ease: 'power1.out', stagger: 0.04 },
      );
    },
    { scope: homeRef },
  );

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!active) {
      setEvidence([]);
      setVerify(null);
      return;
    }
    let alive = true;
    import('../engines/evidence/vault').then((m) => {
      if (alive) m.listEvidence(active.id).then(setEvidence);
    });
    return () => {
      alive = false;
    };
  }, [active?.id]);

  const incident: StoredIncident | null = active;
  // Step 21 (P1): fraud time unknown means NO deadline anchor — the old
  // createdAt fallback restarted every countdown from report time.
  const fraudAt = incident?.fraudAt ? new Date(incident.fraudAt) : null;
  const ack = incident ? loadAck() : null;
  const hasAck = !!ack && incident ? ack.incidentId === incident.id : false;
  const calledAt = hasAck && ack?.calledAt ? new Date(ack.calledAt) : null;
  const statuses = fraudAt ? deadlineStatuses(fraudAt, now, calledAt) : [];
  const nextDeadline = statuses.filter((s) => s.remainingMs > 0 && s.state !== 'pending').sort((a, b) => a.remainingMs - b.remainingMs)[0];
  const actions = fraudAt && incident ? orderActions(fraudAt, now, incident.credentialShared, lang, calledAt) : [];
  const hasBankRef = incident ? loadBankRef(incident.id).trim().length > 0 : false;
  const hasEvidence = evidence.length > 0;

  // The screenshot's five steps, mapped onto the real ordered queue.
  const plan = incident
    ? [
        { id: 'call1930', title: t(lang, 'planCall1930Title'), why: t(lang, 'planCall1930Why'), done: !!incident.callTappedAt, to: '/coach', btn: t(lang, 'planBtnCall') },
        { id: 'portal', title: t(lang, 'planPortalTitle'), why: t(lang, 'planPortalWhy'), done: hasAck, to: '/portal', btn: t(lang, 'planBtnPortal') },
        { id: 'bank', title: t(lang, 'planBankTitle'), why: t(lang, 'planBankWhy'), done: hasBankRef, to: '/bank', btn: t(lang, 'planBtnBank') },
        { id: 'evidence', title: t(lang, 'planEvidenceTitle'), why: t(lang, 'planEvidenceWhy'), done: hasEvidence, to: '/vault', btn: t(lang, 'planBtnEvidence') },
        { id: 'shield', title: t(lang, 'planShieldTitle'), why: t(lang, 'planShieldWhy'), done: !!shieldLast, to: '/shield', btn: t(lang, 'planBtnShield') },
      ]
    : [];

  async function verifyNow() {
    if (!incident) return;
    const { verifyChain } = await import('../engines/evidence/vault');
    const r = await verifyChain(incident.id);
    setVerify(r);
    showToast(r.ok ? t(lang, 'toastChainOk', { n: r.count }) : t(lang, 'toastChainBroken', { n: r.brokenAt ?? 0 }));
  }

  async function exportProof() {
    if (!incident) {
      navigate('/proof');
      return;
    }
    const { listEvidence, rootHash } = await import('../engines/evidence/vault');
    const { buildProofPdf, downloadBlob } = await import('../engines/proof/proofpack');
    const ev = await listEvidence(incident.id);
    const root = await rootHash(incident.id);
    const a = loadAck();
    const bytes = await buildProofPdf(incident, ev, root, a?.ackNumber ?? null);
    downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'RAKSHIO-proof.pdf');
    showToast(t(lang, 'toastPdfDone'));
  }

  function logCallTap() {
    if (!incident) return;
    updateIncident(incident.id, { callTappedAt: new Date().toISOString() });
  }

  return (
    <div className="db-grid-home" ref={homeRef}>
      {/* Hero + right rail */}
      <section className="db-card db-span-8" aria-label="Report fraud">
        <div className="db-hero">
          <div className="db-hero-text">
            <h2 className="db-hero-title">
              {t(lang, 'heroTitleA')} <span className="red">{t(lang, 'heroTitleB')}</span>
            </h2>
            <p className="db-hero-sub">{t(lang, 'heroSub')}</p>
            <div className="db-btn-row">
              <button type="button" className="db-btn db-btn-red" onClick={() => navigate('/report?mode=voice')}>
                <Phone size={18} aria-hidden="true" /> {t(lang, 'reportVoice')}
              </button>
              <button type="button" className="db-btn db-btn-outline" onClick={() => navigate('/report?mode=text')}>
                {t(lang, 'reportText')}
              </button>
              {/* Step 21 (D5): a cold judge gets a visible demo entry point
                  in the hero itself, not just the footer note. */}
              <button type="button" className="db-btn db-btn-outline" onClick={() => navigate('/judge')}>
                {t(lang, 'homeTryDemo')}
              </button>
            </div>
          </div>
          <div className="db-hero-art" aria-hidden="true">
            <ShieldLogo size={150} />
          </div>
        </div>
      </section>

      <div className="db-span-4 db-tiles" role="group" aria-label="Features">
        <Tile icon={<Check size={16} />} title={t(lang, 'tileClockTitle')} sub={t(lang, 'tileClockSub')} to="/actions" ok={!!incident} />
        <Tile icon={<Check size={16} />} title={t(lang, 'tileActionsTitle')} sub={t(lang, 'tileActionsSub')} to="/actions" ok={!!incident} />
        <Tile icon={<Check size={16} />} title={t(lang, 'tileEvidenceTitle')} sub={hasEvidence ? t(lang, 'tileEvidenceSavedSuffix', { n: evidence.length }) : t(lang, 'tileEvidenceEmpty')} to="/vault" ok={hasEvidence && verify?.ok === true} />
        <Tile
          icon={<Check size={16} />}
          title={t(lang, 'tileShieldTitle')}
          sub={shieldDisagree ? t(lang, 'tileShieldDisagree') : shieldLast ? `${t(lang, 'tileShieldLastPrefix')} ${t(lang, shieldLast.level === 'danger' ? 'shieldHigh' : shieldLast.level === 'suspicious' ? 'shieldSuspicious' : 'shieldSafe')}` : t(lang, 'tileShieldEmpty')}
          to="/shield"
          ok={shieldLast?.level === 'safe' && !shieldDisagree}
        />
      </div>

      {/* Golden Hour Clock */}
      <section className="db-card db-span-5" aria-label="Golden Hour Clock">
        <h2>
          <Clock3 size={20} aria-hidden="true" /> {t(lang, 'clockTitle')}
        </h2>
        {incident ? (
          <>
            <GoldenHourRing incident={incident} />
            <div>
              <strong>{t(lang, 'whyMatters')}</strong>
              <ul className="db-why">
                {clockWhy(lang).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
            <div className="db-chip-row" role="timer" aria-live="off">
              {statuses.map((s) => (
                <div key={s.id} className={`db-chip ${s.state}`}>
                  <div className="t">{s.state === 'overdue' ? t(lang, 'chipOverdue') : s.state === 'pending' ? t(lang, 'chipPortalPending') : formatDurationLang(lang, s.remainingMs)}</div>
                  <div className="n">{s.labelKey ? t(lang, s.labelKey) : s.label}</div>
                  <div className="w">{s.windowLabel} {t(lang, 'chipWindow')}</div>
                </div>
              ))}
            </div>
            {statuses.some((s) => s.state === 'overdue') && (
              <p className="db-muted" style={{ marginTop: '0.5rem' }}>
{t(lang, 'overdueExplainer')}
              </p>
            )}
          </>
        ) : (
          <>
            <div>
              <strong>{t(lang, 'whyMatters')}</strong>
              <ul className="db-why">
                {clockWhy(lang).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
            <div className="db-empty">
              <p>{t(lang, 'noIncident')}</p>
              <button type="button" className="db-btn db-btn-red" onClick={() => navigate('/report')}>
                {t(lang, 'startReport')}
              </button>
            </div>
          </>
        )}
      </section>

      {/* Current Incident */}
      <section className="db-card db-span-4" aria-label="Current Incident">
        <h2>
          {t(lang, 'currentIncident')}{' '}
          {incident && <span className={`db-badge ${incident.status === 'closed' ? 'gray' : 'green'}`}>{incident.status === 'closed' ? t(lang, 'badgeClosed') : t(lang, 'badgeActive')}</span>}
          {incident?.demo && <span className="db-badge gray">DEMO</span>}
        </h2>
        {incident ? (
          <div className="db-rows">
            <div className="db-row"><span className="k">ID</span><span className="v">{shortId(incident.id)}</span></div>
            <div className="db-row"><span className="k">{t(lang, 'incidentRowType')}</span><span className="v">{fraudTypeLabel(incident.fraudType, lang)}</span></div>
            <div className="db-row"><span className="k">{t(lang, 'incidentRowAmount')}</span><span className="v">{incident.amount != null ? formatINR(incident.amount) : t(lang, 'unknown')}</span></div>
            <div className="db-row">
              <span className="k">{t(lang, 'incidentRowReported')}</span>
              <span className="v">{new Date(incident.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <Link to={`/incidents/${incident.id}`} className="db-btn db-btn-outline" style={{ marginTop: '0.5rem' }}>
              {t(lang, 'incidentDetailBtn')} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <ul className="db-why">
              <li>{t(lang, 'incidentEmpty1')}</li>
              <li>{t(lang, 'incidentEmpty2')}</li>
            </ul>
            <div className="db-empty">
              <p>{t(lang, 'noIncidentHint')}</p>
              <button type="button" className="db-btn db-btn-red" onClick={() => navigate('/report')}>
                {t(lang, 'startReport')}
              </button>
            </div>
          </>
        )}
      </section>

      {/* Quick Actions */}
      <section className="db-card db-span-3" aria-label="Quick Actions">
        <h2>{t(lang, 'quickActions')}</h2>
        <div className="db-quick">
          <a className="qa-green" href="tel:1930" onClick={logCallTap}>
            <Phone size={22} aria-hidden="true" /> {t(lang, 'qaCall1930')} <small>{t(lang, 'qaCall1930Sub')}</small>
          </a>
          <Link className="qa-purple" to="/bank">
            <Landmark size={22} aria-hidden="true" /> {t(lang, 'qaBank')} <small>{t(lang, 'qaBankSub')}</small>
          </Link>
          <Link to="/care">
            <Users size={22} aria-hidden="true" /> {t(lang, 'qaCare')} <small>{t(lang, 'qaCareSub')}</small>
          </Link>
          <Link to="/donotpay">
            <Ban size={22} aria-hidden="true" /> {t(lang, 'qaDnp')} <small>{t(lang, 'qaDnpSub')}</small>
          </Link>
        </div>
      </section>

      {/* Action Plan */}
      <section className="db-card db-span-4" style={{ gridRow: 'span 2' }} aria-label="Your Action Plan">
        <h2>{t(lang, 'actionPlan')}</h2>
        {incident ? (
          <>
            {incident.credentialShared && (
              <p className="db-shield-alert" role="alert">
                <MessageSquareWarning size={18} aria-hidden="true" />
                <span><strong>{t(lang, 'otpSharedTitle')}</strong> {t(lang, 'otpSharedBody')}</span>
              </p>
            )}
            <div className="db-steps">
              {plan.map((p, i) => (
                <div key={p.id} className="db-step">
                  <span className={`num${p.done ? '' : ' todo'}`}>{p.done ? <Check size={16} aria-hidden="true" /> : i + 1}</span>
                  <div className="body">
                    <strong>{p.title}</strong>
                    <p>{p.why}</p>
                  </div>
                  <button type="button" className="db-btn db-btn-sm db-btn-outline" onClick={() => navigate(p.to)}>
                    {p.btn}
                  </button>
                </div>
              ))}
            </div>
            <p className="db-muted">{t(lang, 'queueNote', { n: actions.length })}</p>
          </>
        ) : (
          <>
            <div className="db-steps">
              {planPreview(lang).map((p, i) => (
                <div key={p.id} className="db-step">
                  <span className="num todo">{i + 1}</span>
                  <div className="body">
                    <strong>{p.title}</strong>
                    <p>{p.why}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="db-empty">
              <p>{t(lang, 'noIncidentHint')}</p>
            </div>
          </>
        )}
      </section>

      {/* Incident Snapshot */}
      <section className="db-card db-span-4" aria-label="Incident Snapshot">
        <h2>{t(lang, 'snapshot')}</h2>
        {incident ? (
          <div className="db-rows">
            <div className="db-row"><span className="k">{t(lang, 'snapshotFraudType')}</span><span className="v">{fraudTypeLabel(incident.fraudType, lang)}</span></div>
            <div className="db-row"><span className="k">{t(lang, 'snapshotAmount')}</span><span className="v">{incident.amount != null ? formatINR(incident.amount) : t(lang, 'unknown')}</span></div>
            <div className="db-row"><span className="k">{t(lang, 'snapshotPlatform')}</span><span className="v">{incident.bank ?? t(lang, 'unknown')}</span></div>
            <div className="db-row"><span className="k">{t(lang, 'snapshotStatus')}</span><span className="v">{t(lang, STATUS_KEY[incident.status ?? 'in-progress'])}</span></div>
            <div className="db-row">
              <span className="k">{t(lang, 'nextDeadline')}</span>
              <span className="v">{nextDeadline ? `${nextDeadline.labelKey ? t(lang, nextDeadline.labelKey) : nextDeadline.label} ${t(lang, 'deadlineIn')} ${formatDurationLang(lang, nextDeadline.remainingMs)}` : t(lang, 'allDeadlinesOver')}</span>
            </div>
          </div>
        ) : (
          <>
            <ul className="db-why">
              <li>{t(lang, 'snapshotEmpty1')}</li>
              <li>{t(lang, 'snapshotEmpty2')}</li>
            </ul>
            <p className="db-muted">{t(lang, 'noIncidentHint')}</p>
          </>
        )}
      </section>

      {/* Evidence Vault widget */}
      <section className="db-card db-span-4" aria-label="Evidence Vault">
        <h2>
          {t(lang, 'vault')} {hasEvidence && <span className="db-badge green">{t(lang, 'vaultItemsSaved', { n: evidence.length })}</span>}
        </h2>
        {incident ? (
          <>
            {evidence.length === 0 ? (
              <p className="db-muted">{t(lang, 'vaultEmpty')}</p>
            ) : (
              evidence.slice(0, 3).map((e) => (
                <div key={e.id} className="db-evidence-item">
                  <span className="ic"><FileCheck size={18} aria-hidden="true" /></span>
                  <span className="meta">
                    <span className="name">{e.label || e.kind}</span>
                    <span className="hash">SHA-256: {e.hash.slice(0, 4)}…{e.hash.slice(-4)}</span>
                  </span>
                  <BadgeCheck size={20} className="ok" aria-label="Hashed" />
                </div>
              ))
            )}
            {verify && (
              <p role="status" style={{ color: verify.ok ? 'var(--db-teal-soft)' : 'var(--db-red-soft)', fontWeight: 700 }}>
                {verify.ok ? t(lang, 'vaultChainOk', { n: verify.count }) : t(lang, 'vaultChainBroken')}
              </p>
            )}
            <button type="button" className="db-btn db-btn-outline" onClick={verifyNow} disabled={!hasEvidence}>
              <ShieldCheck size={18} aria-hidden="true" /> {t(lang, 'verifyChainBtn')}
            </button>
            <Link to="/vault" className="db-btn db-btn-ghost">{t(lang, 'vaultOpenBtn')} <ArrowRight size={16} aria-hidden="true" /></Link>
          </>
        ) : (
          <>
            <ul className="db-why">
              <li>{t(lang, 'vaultEmpty1')}</li>
              <li>{t(lang, 'vaultEmpty2')}</li>
            </ul>
            <p className="db-muted">{t(lang, 'noIncidentHint')}</p>
          </>
        )}
      </section>

      {/* Progress Tracker */}
      <section className="db-card db-span-4" aria-label="Progress Tracker">
        <h2>{t(lang, 'progress')}</h2>
        {incident ? (
          <ProgressTracker incident={incident} evidenceCount={evidence.length} />
        ) : (
          <>
            <p className="db-muted">{t(lang, 'progressEmpty')}</p>
            <p className="db-muted">{t(lang, 'noIncidentHint')}</p>
          </>
        )}
      </section>

      {/* Second-Scam Shield widget */}
      <section className="db-card db-span-4" aria-label="Second-Scam Shield">
        <h2>{t(lang, 'shield')}</h2>
        {shieldLast ? (
          <div className="db-shield-alert" role={shieldLast.level === 'danger' ? 'alert' : 'status'}>
            <MessageSquareWarning size={18} aria-hidden="true" />
            <span>
              <strong>{shieldLast.level === 'danger' ? t(lang, 'shieldHigh') : shieldLast.level === 'suspicious' ? t(lang, 'shieldSuspicious') : t(lang, 'shieldSafe')}</strong>
              <p>{t(lang, 'shieldLastCheck', { n: shieldLast.score })}{shieldLast.level === 'danger' ? ` ${t(lang, 'shieldLastCheckDanger')}` : ''}</p>
            </span>
          </div>
        ) : (
          <p className="db-muted">{t(lang, 'shieldEmpty')}</p>
        )}
        <button type="button" className="db-btn db-btn-outline" onClick={() => navigate('/shield')}>
          <Search size={18} aria-hidden="true" /> {t(lang, 'shieldCheckBtn')}
        </button>
        <Link to="/guide" className="db-btn db-btn-ghost">
          {t(lang, 'shieldGuideLink')} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      {/* Care Circle */}
      <section className="db-card db-span-4" aria-label="Care Circle">
        <h2>{t(lang, 'care')}</h2>
        <p className="db-muted">{t(lang, 'careDesc')}</p>
        <button type="button" className="db-btn db-btn-green" onClick={() => navigate('/care')}>
          {t(lang, 'careWhatsApp')}
        </button>
        <button type="button" className="db-btn db-btn-purple" onClick={() => navigate('/care')}>
          <QrCode size={18} aria-hidden="true" /> {t(lang, 'careQr')}
        </button>
      </section>

      {/* Proof Pack */}
      <section className="db-card db-span-4" aria-label="Proof Pack and Verify">
        <h2>{t(lang, 'proof')}</h2>
        <p className="db-muted">{t(lang, 'proofDesc')}</p>
        <button type="button" className="db-btn db-btn-blue" onClick={exportProof}>
          <Download size={18} aria-hidden="true" /> {t(lang, 'proofExportBtn')}
        </button>
        <Link to="/proof" className="db-btn db-btn-ghost">{t(lang, 'proofPageLink')} <ArrowRight size={16} aria-hidden="true" /></Link>
      </section>

      {/* Follow-up Guardian */}
      <section className="db-card db-span-4" aria-label="Follow-up Guardian">
        <h2>{t(lang, 'followups')}</h2>
        {incident ? (
          <FollowUpList incident={incident} compact />
        ) : (
          <>
            <p className="db-muted">{t(lang, 'followupEmpty')}</p>
            <p className="db-muted">{t(lang, 'noIncidentHint')}</p>
          </>
        )}
      </section>

      {/* Support note for the demo aid */}
      <section className="db-card db-span-12" aria-label="Demo">
        <p className="db-muted">
          <Banknote size={16} aria-hidden="true" /> {t(lang, 'demoNoteA')} <Link to="/judge">{t(lang, 'navJudge')}</Link> {t(lang, 'demoNoteB')}
        </p>
      </section>
    </div>
  );
}
