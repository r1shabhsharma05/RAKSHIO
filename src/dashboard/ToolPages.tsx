import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../state/dashboardStore';
import { screenToPath } from './routes';
import { BANKS, loadBankRef } from '../engines/banks/banks';
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
// Step 11: each empty state also carries a "Kya yaad rakhein" checklist
// and, where it helps, a real preview (e.g. verified bank helplines) —
// so no gated page is a bare card.
export function NeedsIncident({
  title,
  what,
  preview,
  tips,
  extra,
}: {
  title: string;
  what: string;
  preview: string;
  tips: string[];
  extra?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="db-flow">
      <div className="db-card">
        <h2 className="db-page-title">{title}</h2>
        <p className="db-muted">{what}</p>
        <p className="db-muted">{preview}</p>
        {extra}
        <h3>Kya yaad rakhein</h3>
        <ul className="db-tips">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
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

// Verified helpline preview for the Bank empty state — the same numbers
// the Bank Alert Kit uses (checked 2026-11-27). First four banks only;
// the full list of 10 lives in the kit itself.
function BankHelplinePreview() {
  return (
    <div>
      <h3>Verified helplines — turant call kar sakte hain</h3>
      <div className="db-rows">
        {BANKS.slice(0, 4).map((b) => (
          <div key={b.name} className="db-row">
            <span className="k">{b.name}</span>
            <a className="v" href={`tel:${b.numbers[0].replace(/\s/g, '')}`}>
              {b.numbers[0]}
            </a>
          </div>
        ))}
      </div>
      <p className="db-muted">Poori list (10 banks) Bank Alert Kit me hai — incident banne par.</p>
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
        tips={[
          'Kadam clock ke hisaab se order me hain — jo deadline nazdeek, woh pehle.',
          'Har kadam poora hone par status badalta hai — kuch bhi apne aap complete nahi hota.',
          'Portal ki window (24h) 1930 (48h) se pehle khatm hoti hai.',
        ]}
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
        tips={[
          'Call se pehle ye taiyaar rakhein: rashi, date/time, UTR ya reference.',
          'Line busy ho to 10 minute baad dobara try karein — number save karke rakhein.',
          'Call ke baad ack number yahin bhar dein — wahi aapki complaint ki pehchan hai.',
        ]}
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
        tips={[
          'Complaint me rashi, date, UTR aur bank ka naam likhna hota hai — sab kuch incident card se copy ho jayega.',
          'Ack number milte hi yahan save karein — 24 ghante ki countdown chalegi.',
          'Portal par complaint khud bharni hoti hai — RAKSHIO sirf text taiyaar karta hai.',
        ]}
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
        tips={[
          'Bank ko turant batana sabse zaroori hai — dispute 3 working days ke andar.',
          'Draft message pehle se likha milega — bhejne se pehle khud padh lein.',
          'Reference number save karein — wahi bank se baat karne ka proof hai.',
        ]}
        extra={<BankHelplinePreview />}
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
        tips={[
          'Saboot woh hai jo hua tha: SMS, screenshot, receipt, call ka number.',
          'Har file ka SHA-256 hash banta hai — badlaav pakda jata hai.',
          'Tamper test karke dekh sakte hain — chain tooti to saaf dikhega.',
        ]}
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
        tips={[
          '3 sawaal — paisa gaya ya sirf koshish hui, yehi raasta tay karta hai.',
          'Paisa gaya ho to 1930; sirf koshish hui ho to Chakshu.',
          "Jawab 'pata nahi' ho to safe raasta chuna jata hai.",
        ]}
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
        tips={[
          'Summary share karne se pehle aapko preview dikhega — bina permission kuch nahi jata.',
          'Number kabhi store nahi hota.',
          'Offline QR card bina internet ke bhi kaam karta hai.',
        ]}
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
        tips={[
          'PDF me incident summary, timeline aur evidence list hoti hai — bilingual.',
          'ZIP me saare saboot + verification file.',
          'QR se koi bhi chain verify kar sakta hai.',
        ]}
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
