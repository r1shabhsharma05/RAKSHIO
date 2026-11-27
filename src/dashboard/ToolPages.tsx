import { lazy, Suspense } from 'react';
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
import { ScreenSkeleton } from '../screens/shared';

// Every tool screen mounts inside the dashboard's dark flow scope (.db-flow)
// so the tested screens render dark without being restyled.
const VaultScreen = lazy(() => import('../screens/Vault').then((m) => ({ default: m.VaultScreen })));
const ProofScreen = lazy(() => import('../screens/Proof').then((m) => ({ default: m.ProofScreen })));
const CareScreen = lazy(() => import('../screens/Care').then((m) => ({ default: m.CareScreen })));

// Tools that need an incident show this when there is none — never a
// blank page, never a fake incident.
export function NeedsIncident() {
  const navigate = useNavigate();
  return (
    <div className="db-card">
      <h1 className="db-page-title">Pehle incident banayein</h1>
      <p className="db-muted">
        Ye tool kisi incident par kaam karta hai. Report Fraud se apni baat batayein — RAKSHIO incident card bana dega.
      </p>
      <div>
        <button type="button" className="db-btn db-btn-red" onClick={() => navigate('/report')}>
          Report Fraud shuru karein
        </button>
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
  if (!active) return <NeedsIncident />;
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
  if (!active) return <NeedsIncident />;
  return (
    <div className="db-flow">
      <CoachScreen stored={active} onCallTap={logCallTap} onDone={logCallTap} onOpenAck={() => navigate('/portal')} onBack={() => navigate('/actions')} />
    </div>
  );
}

export function PortalPage() {
  const { active, backToIncident, updateIncident } = useToolNav();
  if (!active) return <NeedsIncident />;
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
  if (!active) return <NeedsIncident />;
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
  if (!active) return <NeedsIncident />;
  return (
    <div className="db-flow">
      <Suspense fallback={<ScreenSkeleton label="Evidence Vault khul raha hai…" />}>
        <VaultScreen stored={active} caregiver={caregiver} onBack={backToIncident} />
      </Suspense>
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
  if (!active) return <NeedsIncident />;
  return (
    <div className="db-flow">
      <TriageScreen stored={active} onBack={backToIncident} />
    </div>
  );
}

export function CarePage() {
  const { active, backToIncident } = useToolNav();
  if (!active) return <NeedsIncident />;
  return (
    <div className="db-flow">
      <Suspense fallback={<ScreenSkeleton label="Care Circle khul raha hai…" />}>
        <CareScreen stored={active} onBack={backToIncident} />
      </Suspense>
    </div>
  );
}

export function ProofPage() {
  const { active, backToIncident } = useToolNav();
  if (!active) return <NeedsIncident />;
  return (
    <div className="db-flow">
      <Suspense fallback={<ScreenSkeleton label="Proof Pack khul raha hai…" />}>
        <ProofScreen stored={active} onBack={backToIncident} />
      </Suspense>
    </div>
  );
}
