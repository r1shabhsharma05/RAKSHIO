import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  ArrowRight,
  BadgeCheck,
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
import { deadlineStatuses, formatDuration, orderActions } from '../engines/orchestrator/clock';
// Vault (Dexie) and Proof Pack (pdf-lib) stay out of the first-load bundle:
// Home pulls them in on demand with dynamic imports, same as the lazy screens.
import type { EvidenceRecord } from '../engines/evidence/vault';
import { loadAck } from '../engines/ack/ack';
import { loadBankRef } from '../engines/banks/banks';
import { formatINR, fraudTypeLabel } from '../screens/shared';
import { STATUS_LABELS } from '../state/incidents';
import { useToast } from '../components/Toast';
import type { StoredIncident } from '../state/store';

gsap.registerPlugin(useGSAP);

function shortId(id: string): string {
  return `#${id.replace(/^rk-/, 'RK-').toUpperCase()}`;
}

// Step 11: empty-state previews reuse the same copy as the live widgets,
// so the no-incident Home teaches the flow instead of showing bare hints.
const CLOCK_WHY = [
  'Higher chance to block the transaction',
  'Bank and UPI dispute works best now',
  'Collect and secure all evidence',
];

const PLAN_PREVIEW = [
  { id: 'call1930', title: 'Call 1930 (Now)', why: 'Report the fraud and get an acknowledgement number.' },
  { id: 'portal', title: 'Complete Portal Complaint', why: 'On cybercrime.gov.in within 24 hours.' },
  { id: 'bank', title: 'Notify Your Bank', why: 'Raise a fraud dispute and block if needed.' },
  { id: 'evidence', title: 'Save Evidence', why: 'Screenshots, transaction ID, messages, etc.' },
  { id: 'shield', title: 'Beware of Second Scams', why: 'Don\u2019t trust \u201crecovery agents\u201d or refund calls.' },
];

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
  const fraudAt = incident ? (incident.fraudAt ? new Date(incident.fraudAt) : new Date(incident.createdAt)) : null;
  const statuses = fraudAt ? deadlineStatuses(fraudAt, now) : [];
  const nextDeadline = statuses.filter((s) => s.remainingMs > 0).sort((a, b) => a.remainingMs - b.remainingMs)[0];
  const actions = fraudAt && incident ? orderActions(fraudAt, now, incident.credentialShared) : [];
  const ack = incident ? loadAck() : null;
  const hasAck = !!ack && incident ? ack.incidentId === incident.id : false;
  const hasBankRef = incident ? loadBankRef(incident.id).trim().length > 0 : false;
  const hasEvidence = evidence.length > 0;

  // The screenshot's five steps, mapped onto the real ordered queue.
  const plan = incident
    ? [
        { id: 'call1930', title: 'Call 1930 (Now)', why: 'Report the fraud and get an acknowledgement number.', done: !!incident.callTappedAt, to: '/coach', btn: 'Call 1930' },
        { id: 'portal', title: 'Complete Portal Complaint', why: 'On cybercrime.gov.in within 24 hours.', done: hasAck, to: '/portal', btn: 'Open Portal' },
        { id: 'bank', title: 'Notify Your Bank', why: 'Raise a fraud dispute and block if needed.', done: hasBankRef, to: '/bank', btn: 'Bank Kit' },
        { id: 'evidence', title: 'Save Evidence', why: 'Screenshots, transaction ID, messages, etc.', done: hasEvidence, to: '/vault', btn: 'Add Evidence' },
        { id: 'shield', title: 'Beware of Second Scams', why: 'Don\u2019t trust \u201crecovery agents\u201d or refund calls.', done: !!shieldLast, to: '/shield', btn: 'Check Guide' },
      ]
    : [];

  async function verifyNow() {
    if (!incident) return;
    const { verifyChain } = await import('../engines/evidence/vault');
    const r = await verifyChain(incident.id);
    setVerify(r);
    showToast(r.ok ? `Chain sahi hai — ${r.count} entries` : `Chain TOOTI — record ${r.brokenAt} badla gaya`);
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
    showToast('PDF download ho gaya');
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
            <h1 className="db-hero-title">
              {t(lang, 'heroTitleA')} <span className="red">{t(lang, 'heroTitleB')}</span>
            </h1>
            <p className="db-hero-sub">{t(lang, 'heroSub')}</p>
            <div className="db-btn-row">
              <button type="button" className="db-btn db-btn-red" onClick={() => navigate('/report?mode=voice')}>
                <Phone size={18} aria-hidden="true" /> {t(lang, 'reportVoice')}
              </button>
              <button type="button" className="db-btn db-btn-outline" onClick={() => navigate('/report?mode=text')}>
                {t(lang, 'reportText')}
              </button>
            </div>
          </div>
          <div className="db-hero-art" aria-hidden="true">
            <ShieldLogo size={150} />
          </div>
        </div>
      </section>

      <div className="db-span-4 db-tiles" role="group" aria-label="Features">
        <Tile icon={<Check size={16} />} title="Golden Hour Clock" sub="Track critical timelines" to="/actions" ok={!!incident} />
        <Tile icon={<Check size={16} />} title="Official Actions" sub="1930, Portal, Bank, UPI" to="/actions" ok={!!incident} />
        <Tile icon={<Check size={16} />} title="Evidence Chain" sub={hasEvidence ? `${evidence.length} items saved — tamper-evident` : 'No evidence saved yet'} to="/vault" ok={hasEvidence && verify?.ok === true} />
        <Tile
          icon={<Check size={16} />}
          title="Second-Scam Shield"
          sub={shieldLast ? `Last check: ${shieldLast.level}` : 'Stop recovery scams'}
          to="/shield"
          ok={shieldLast?.level === 'safe'}
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
              <strong>Why it matters?</strong>
              <ul className="db-why">
                {CLOCK_WHY.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
            <div className="db-chip-row" role="timer" aria-live="off">
              {statuses.map((s) => (
                <div key={s.id} className={`db-chip ${s.state}`}>
                  <div className="t">{s.state === 'overdue' ? 'Samay khatm' : formatDuration(s.remainingMs)}</div>
                  <div className="n">{s.label}</div>
                  <div className="w">{s.windowLabel} window</div>
                </div>
              ))}
            </div>
            {statuses.some((s) => s.state === 'overdue') && (
              <p className="db-muted" style={{ marginTop: '0.5rem' }}>
                Har kaam ki apni window hai — portal (24h) 1930 (48h) se pehle khatm hota hai, isliye portal
                “Samay khatm” dikha sakta hai jab 1930 me abhi samay bacha ho. Ye alag deadlines hain, koi galti nahi.
              </p>
            )}
          </>
        ) : (
          <>
            <div>
              <strong>Why it matters?</strong>
              <ul className="db-why">
                {CLOCK_WHY.map((w) => (
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
          {incident && <span className={`db-badge ${incident.status === 'closed' ? 'gray' : 'green'}`}>{incident.status === 'closed' ? 'Closed' : 'Active'}</span>}
        </h2>
        {incident ? (
          <div className="db-rows">
            <div className="db-row"><span className="k">ID</span><span className="v">{shortId(incident.id)}</span></div>
            <div className="db-row"><span className="k">Type</span><span className="v">{fraudTypeLabel(incident.fraudType)}</span></div>
            <div className="db-row"><span className="k">Amount</span><span className="v">{incident.amount != null ? formatINR(incident.amount) : 'Pata nahi'}</span></div>
            <div className="db-row">
              <span className="k">Reported</span>
              <span className="v">{new Date(incident.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <Link to={`/incidents/${incident.id}`} className="db-btn db-btn-outline" style={{ marginTop: '0.5rem' }}>
              Incident detail dekhein <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <ul className="db-why">
              <li>Har incident ka apna ID, type, rashi aur date hoti hai</li>
              <li>Detail kholte hi timeline, evidence aur status dikhta hai</li>
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
            <Phone size={22} aria-hidden="true" /> Call 1930 <small>Cyber Fraud Helpline</small>
          </a>
          <Link className="qa-purple" to="/bank">
            <Landmark size={22} aria-hidden="true" /> Bank Alert <small>Notify your bank</small>
          </Link>
          <Link to="/care">
            <Users size={22} aria-hidden="true" /> Care Circle <small>Inform family</small>
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
                <span><strong>Aapne OTP/PIN share kiya tha</strong> — turant card/UPI block karein.</span>
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
            <p className="db-muted">Queue order follows the clock — portal rises as its 24-hour window nears. ({actions.length} actions tracked)</p>
          </>
        ) : (
          <>
            <div className="db-steps">
              {PLAN_PREVIEW.map((p, i) => (
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
            <div className="db-row"><span className="k">Fraud Type</span><span className="v">{fraudTypeLabel(incident.fraudType)}</span></div>
            <div className="db-row"><span className="k">Amount</span><span className="v">{incident.amount != null ? formatINR(incident.amount) : 'Pata nahi'}</span></div>
            <div className="db-row"><span className="k">Platform</span><span className="v">{incident.bank ?? 'Pata nahi'}</span></div>
            <div className="db-row"><span className="k">Status</span><span className="v">{STATUS_LABELS[incident.status ?? 'in-progress']}</span></div>
            <div className="db-row">
              <span className="k">Next Deadline</span>
              <span className="v">{nextDeadline ? `${nextDeadline.label} in ${formatDuration(nextDeadline.remainingMs)}` : 'Sabhi deadlines beet gayi'}</span>
            </div>
          </div>
        ) : (
          <>
            <ul className="db-why">
              <li>Fraud type, rashi, bank aur status — ek jhaank me</li>
              <li>Agli deadline kab hai, woh bhi</li>
            </ul>
            <p className="db-muted">{t(lang, 'noIncidentHint')}</p>
          </>
        )}
      </section>

      {/* Evidence Vault widget */}
      <section className="db-card db-span-4" aria-label="Evidence Vault">
        <h2>
          {t(lang, 'vault')} {hasEvidence && <span className="db-badge green">{evidence.length} items saved</span>}
        </h2>
        {incident ? (
          <>
            {evidence.length === 0 ? (
              <p className="db-muted">Abhi koi saboot nahi — Vault me SMS, note ya screenshot save karein.</p>
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
                {verify.ok ? `Chain sahi hai — ${verify.count} entries` : 'Chain TOOTI hai — record badla gaya'}
              </p>
            )}
            <button type="button" className="db-btn db-btn-outline" onClick={verifyNow} disabled={!hasEvidence}>
              <ShieldCheck size={18} aria-hidden="true" /> Verify Chain Integrity
            </button>
            <Link to="/vault" className="db-btn db-btn-ghost">Vault kholein <ArrowRight size={16} aria-hidden="true" /></Link>
          </>
        ) : (
          <>
            <ul className="db-why">
              <li>SMS, screenshot, receipt, UTR — jo bhi hua, uska saboot</li>
              <li>Har file ka SHA-256 hash banta hai — badlaav pakda jata hai</li>
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
            <p className="db-muted">1930 call, portal, bank, evidence, shield — 5 me se kitne poore hue, yahan dikhega.</p>
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
              <strong>{shieldLast.level === 'danger' ? 'High Risk – Likely Scam' : shieldLast.level === 'suspicious' ? 'Shak — savdhaan rahein' : 'Theek lagta hai'}</strong>
              <p>Last check: score {shieldLast.score}. {shieldLast.level === 'danger' ? 'Do NOT pay or share any details.' : ''}</p>
            </span>
          </div>
        ) : (
          <p className="db-muted">Koi &ldquo;recovery agent&rdquo;, refund offer, ya ajeeb SMS aaya hai? Yahan check karein.</p>
        )}
        <button type="button" className="db-btn db-btn-outline" onClick={() => navigate('/shield')}>
          <Search size={18} aria-hidden="true" /> Check a Message / Number
        </button>
        <Link to="/guide" className="db-btn db-btn-ghost">
          Situation Guide — har situation me kya karein <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      {/* Care Circle */}
      <section className="db-card db-span-4" aria-label="Care Circle">
        <h2>{t(lang, 'care')}</h2>
        <p className="db-muted">Keep your trusted contacts informed with a safe, minimal incident card.</p>
        <button type="button" className="db-btn db-btn-green" onClick={() => navigate('/care')}>
          Share on WhatsApp
        </button>
        <button type="button" className="db-btn db-btn-purple" onClick={() => navigate('/care')}>
          <QrCode size={18} aria-hidden="true" /> Share QR (Offline)
        </button>
      </section>

      {/* Proof Pack */}
      <section className="db-card db-span-4" aria-label="Proof Pack and Verify">
        <h2>{t(lang, 'proof')}</h2>
        <p className="db-muted">Export a sealed, verifiable package of your incident and evidence.</p>
        <button type="button" className="db-btn db-btn-blue" onClick={exportProof}>
          <Download size={18} aria-hidden="true" /> Export Proof Pack (PDF)
        </button>
        <Link to="/proof" className="db-btn db-btn-ghost">Proof Pack page <ArrowRight size={16} aria-hidden="true" /></Link>
      </section>

      {/* Follow-up Guardian */}
      <section className="db-card db-span-4" aria-label="Follow-up Guardian">
        <h2>{t(lang, 'followups')}</h2>
        {incident ? (
          <FollowUpList incident={incident} compact />
        ) : (
          <>
            <p className="db-muted">1 ghante, 24 ghante, 3 din aur 7 din baad ke reminders — har ek ka status yahan dikhega.</p>
            <p className="db-muted">{t(lang, 'noIncidentHint')}</p>
          </>
        )}
      </section>

      {/* Support note for the demo aid */}
      <section className="db-card db-span-12" aria-label="Demo">
        <p className="db-muted">
          <Banknote size={16} aria-hidden="true" /> Demo: Report Fraud se &ldquo;Demo data bharo&rdquo; — seeded ₹20,000 UPI scenario, bina mic ke. Judge Mode bhi wahi se milta hai.
        </p>
      </section>
    </div>
  );
}
