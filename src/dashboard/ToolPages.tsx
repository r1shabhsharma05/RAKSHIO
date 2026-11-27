import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../state/dashboardStore';
import { screenToPath } from './routes';
import { loadBankRef } from '../engines/banks/banks';
import { ActionsScreen } from '../screens/Actions';
import { CoachScreen } from '../screens/Coach';
import { ShieldScreen } from '../screens/Shield';
import { TriageScreen } from '../screens/Triage';
import { BankKitScreen } from '../screens/BankKit';
import { AckBridgeScreen } from '../screens/AckBridge';
import { ChunkFallback, useChunk } from '../components/chunkRecovery';

// Every tool screen mounts inside the dashboard's dark flow scope (.db-flow)
// so the tested screens render dark without being restyled.
const loadVault = () => import('../screens/Vault').then((m) => ({ default: m.VaultScreen }));
const loadProof = () => import('../screens/Proof').then((m) => ({ default: m.ProofScreen }));
const loadCare = () => import('../screens/Care').then((m) => ({ default: m.CareScreen }));

// Gated tools, no incident: every empty state is SECTION-SPECIFIC — the
// tool's name, what it does, why it needs an incident, and a preview of
// what it will show once one exists. (Live bug: all seven showed the
// identical "Pehle incident banayein" panel, so clicking between sections
// looked like nothing opened.)
export function NeedsIncident({ title, what, preview }: { title: string; what: string; preview: string }) {
  const navigate = useNavigate();
  return (
    <div className="db-flow">
      <div className="db-card">
        <h2 className="db-page-title">{title}</h2>
        <p className="db-muted">{what}</p>
        <p className="db-muted">{preview}</p>
        <p className="db-muted">
          Iske liye pehle ek incident chahiye — Report Fraud se apni baat batayein, RAKSHIO incident card bana dega.
        </p>
        <div>
          <button type="button" className="db-btn db-btn-red" onClick={() => navigate('/report')}>
            Report Fraud shuru karein
          </button>
        </div>
      </div>
    </div>
  );
}

function useToolNav() {
  const navigate = useNavigate();
  const active = useDashboard((s) => s.active());
  const updateIncident = useDashboard((s) => s.updateIncident);
  const backToIncident = () => navigate(active ? `/incidents/${active.id}` : '/incidents');
  // Logs only that the call button was tapped — never that the call happened.
  const logCallTap = () => {
    if (!active) return;
    updateIncident(active.id, { callTappedAt: new Date().toISOString() });
  };
  return { navigate, active, updateIncident, backToIncident, logCallTap };
}

export function ActionsPage() {
  const { navigate, active, backToIncident } = useToolNav();
  if (!active) {
    return (
      <NeedsIncident
        title="Action Plan"
        what="Ye aapke incident ke saare kadam ek jagah dikhata hai — 1930 call, portal complaint, bank alert — kis order me, kab tak."
        preview="Incident banne par yahan milega: 5 kadam ki list, har kadam ki deadline aur status."
      />
    );
  }
  return (
    <div className="db-flow">
      <ActionsScreen
        stored={active}
        onOpenCoach={() => navigate('/coach')}
        onTool={(s) => navigate(screenToPath(s, active.id))}
        onBack={backToIncident}
      />
    </div>
  );
}

export function CoachPage() {
  const { navigate, active, logCallTap } = useToolNav();
  if (!active) {
    return (
      <NeedsIncident
        title="1930 Call Coach"
        what="1930 par call karne se pehle aur call ke dauraan kya bolna hai — taiyaar script aur checklist."
        preview="Incident banne par yahan milega: call ki taiyaari, kya-kya bolna hai, aur call ke baad ack number bharne ki jagah."
      />
    );
  }
  return (
    <div className="db-flow">
      <CoachScreen stored={active} onCallTap={logCallTap} onDone={logCallTap} onOpenAck={() => navigate('/portal')} onBack={() => navigate('/actions')} />
    </div>
  );
}

export function PortalPage() {
  const { active, backToIncident, updateIncident } = useToolNav();
  if (!active) {
    return (
      <NeedsIncident
        title="Portal Madad"
        what="cybercrime.gov.in par complaint likhne ke liye har field ka ready-to-copy text."
        preview="Incident banne par yahan milega: complaint ka poora text, field-by-field copy button, aur ack number ki 24-ghante ki countdown."
      />
    );
  }
  return (
    <div className="db-flow">
      <AckBridgeScreen
        stored={active}
        onBack={backToIncident}
        onAckSaved={() => {
          // Ack saved = portal complaint now pending: the user's own
          // recorded action moves the incident to Awaiting Portal.
          if (active.status !== 'closed') updateIncident(active.id, { status: 'awaiting-portal' });
        }}
      />
    </div>
  );
}

export function BankPage() {
  const { active, backToIncident, updateIncident } = useToolNav();
  if (!active) {
    return (
      <NeedsIncident
        title="Bank Alert Kit"
        what="Aapke bank ko turant alert karne ke liye helpline number aur ready draft message."
        preview="Incident banne par yahan milega: aapke bank ki helpline, dispute ka draft, aur reference number save karne ki jagah."
      />
    );
  }
  return (
    <div className="db-flow">
      <BankKitScreen
        stored={active}
        onBack={() => {
          // A saved bank reference is the user's own recorded action:
          // it moves the incident to Bank Notified (never auto-closed).
          if (loadBankRef(active.id).trim().length > 0) {
            updateIncident(active.id, { status: 'bank-notified' });
          }
          backToIncident();
        }}
      />
    </div>
  );
}

export function VaultPage() {
  const { active, backToIncident } = useToolNav();
  const caregiver = useDashboard((s) => s.settings.caregiver);
  const { Page: VaultScreen, failed } = useChunk(loadVault);
  if (!active) {
    return (
      <NeedsIncident
        title="Evidence Vault"
        what="Fraud ke saboot — screenshot, SMS, receipt — yahan safe rakhte hain, hash-chain ke saath."
        preview="Incident banne par yahan milega: saboot upload, har file ka SHA-256 hash, aur chain verify karne ka button."
      />
    );
  }
  if (!VaultScreen) return <ChunkFallback label="Evidence Vault khul raha hai…" failed={failed} />;
  return (
    <div className="db-flow">
      <VaultScreen stored={active} caregiver={caregiver} onBack={backToIncident} />
    </div>
  );
}

export function ShieldPage() {
  const navigate = useNavigate();
  const active = useDashboard((s) => s.active());
  const setShieldLast = useDashboard((s) => s.setShieldLast);
  return (
    <div className="db-flow">
      <ShieldScreen
        onBack={() => navigate(active ? `/incidents/${active.id}` : '/')}
        onVerdict={(v, text) => setShieldLast({ text, level: v.level, score: v.score, at: new Date().toISOString() })}
      />
    </div>
  );
}

export function TriagePage() {
  const { active, backToIncident } = useToolNav();
  if (!active) {
    return (
      <NeedsIncident
        title="Smart Triage"
        what="3 sawaal — aapki situation ke hisaab se sahi raasta batata hai: 1930, bank, ya Chakshu."
        preview="Incident banne par yahan milega: aapki situation ka assessment aur agla kadam."
      />
    );
  }
  return (
    <div className="db-flow">
      <TriageScreen stored={active} onBack={backToIncident} />
    </div>
  );
}

export function CarePage() {
  const { active, backToIncident } = useToolNav();
  const { Page: CareScreen, failed } = useChunk(loadCare);
  if (!active) {
    return (
      <NeedsIncident
        title="Care Circle"
        what="Parivar ke bharosemand logon ko incident ki summary share karne ka tareeka — aapki permission se."
        preview="Incident banne par yahan milega: WhatsApp share, offline QR SOS card, aur consent preview."
      />
    );
  }
  if (!CareScreen) return <ChunkFallback label="Care Circle khul raha hai…" failed={failed} />;
  return (
    <div className="db-flow">
      <CareScreen stored={active} onBack={backToIncident} />
    </div>
  );
}

export function ProofPage() {
  const { active, backToIncident } = useToolNav();
  const { Page: ProofScreen, failed } = useChunk(loadProof);
  if (!active) {
    return (
      <NeedsIncident
        title="Proof Pack aur Verify"
        what="Incident ka poora proof pack — PDF summary, ZIP, aur QR — bank aur portal ke liye."
        preview="Incident banne par yahan milega: bilingual PDF, evidence ZIP, aur verify karne ka QR."
      />
    );
  }
  if (!ProofScreen) return <ChunkFallback label="Proof Pack khul raha hai…" failed={failed} />;
  return (
    <div className="db-flow">
      <ProofScreen stored={active} onBack={backToIncident} />
    </div>
  );
}
