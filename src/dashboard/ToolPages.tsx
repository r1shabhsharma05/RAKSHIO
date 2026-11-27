import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';
import { screenToPath } from './routes';
import { BANKS, loadBankRef } from '../engines/banks/banks';
import { ActionsScreen } from '../screens/Actions';
import { CoachScreen } from '../screens/Coach';
import { ShieldScreen } from '../screens/Shield';
import { TriageScreen } from '../screens/Triage';
import { BankKitScreen } from '../screens/BankKit';
import { AckBridgeScreen } from '../screens/AckBridge';
import { ChunkFallback, loadCareChunk, loadProofChunk, loadVaultChunk, useChunk } from '../components/chunkRecovery';

// Every tool screen mounts inside the dashboard's dark flow scope (.db-flow)
// so the tested screens render dark without being restyled.

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
  const lang = useDashboard((s) => s.settings.language);
  return (
    <div className="db-flow">
      <div className="db-card" aria-label={title}>
        <p className="db-muted">{what}</p>
        <p className="db-muted">{preview}</p>
        {extra}
        <h3>{t(lang, 'emptyRememberTitle')}</h3>
        <ul className="db-tips">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <p className="db-muted">
          {t(lang, 'emptyNeedIncident')}
        </p>
        <div>
          <button type="button" className="db-btn db-btn-red" onClick={() => navigate('/report')}>
            {t(lang, 'startReport')}
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
  const lang = useDashboard((s) => s.settings.language);
  return (
    <div>
      <h3>{t(lang, 'bankPreviewTitle')}</h3>
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
      <p className="db-muted">{t(lang, 'bankPreviewNote')}</p>
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
  const lang = useDashboard((s) => s.settings.language);
  if (!active) {
    return (
      <NeedsIncident
        title={t(lang, 'navActions')}
        what={t(lang, 'emptyActionsWhat')}
        preview={t(lang, 'emptyActionsPreview')}
        tips={[t(lang, 'emptyActionsTip1'), t(lang, 'emptyActionsTip2'), t(lang, 'emptyActionsTip3')]}
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
  const lang = useDashboard((s) => s.settings.language);
  if (!active) {
    return (
      <NeedsIncident
        title={t(lang, 'navCoach')}
        what={t(lang, 'emptyCoachWhat')}
        preview={t(lang, 'emptyCoachPreview')}
        tips={[t(lang, 'emptyCoachTip1'), t(lang, 'emptyCoachTip2'), t(lang, 'emptyCoachTip3')]}
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
  const lang = useDashboard((s) => s.settings.language);
  if (!active) {
    return (
      <NeedsIncident
        title={t(lang, 'navPortal')}
        what={t(lang, 'emptyPortalWhat')}
        preview={t(lang, 'emptyPortalPreview')}
        tips={[t(lang, 'emptyPortalTip1'), t(lang, 'emptyPortalTip2'), t(lang, 'emptyPortalTip3')]}
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
  const lang = useDashboard((s) => s.settings.language);
  if (!active) {
    return (
      <NeedsIncident
        title={t(lang, 'navBank')}
        what={t(lang, 'emptyBankWhat')}
        preview={t(lang, 'emptyBankPreview')}
        tips={[t(lang, 'emptyBankTip1'), t(lang, 'emptyBankTip2'), t(lang, 'emptyBankTip3')]}
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
  const lang = useDashboard((s) => s.settings.language);
  const caregiver = useDashboard((s) => s.settings.caregiver);
  const { Page: VaultScreen, failed } = useChunk(loadVaultChunk);
  if (!active) {
    return (
      <NeedsIncident
        title={t(lang, 'navVault')}
        what={t(lang, 'emptyVaultWhat')}
        preview={t(lang, 'emptyVaultPreview')}
        tips={[t(lang, 'emptyVaultTip1'), t(lang, 'emptyVaultTip2'), t(lang, 'emptyVaultTip3')]}
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
  const lang = useDashboard((s) => s.settings.language);
  if (!active) {
    return (
      <NeedsIncident
        title={t(lang, 'triageTitle')}
        what={t(lang, 'emptyTriageWhat')}
        preview={t(lang, 'emptyTriagePreview')}
        tips={[t(lang, 'emptyTriageTip1'), t(lang, 'emptyTriageTip2'), t(lang, 'emptyTriageTip3')]}
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
  const lang = useDashboard((s) => s.settings.language);
  const { Page: CareScreen, failed } = useChunk(loadCareChunk);
  if (!active) {
    return (
      <NeedsIncident
        title={t(lang, 'navCare')}
        what={t(lang, 'emptyCareWhat')}
        preview={t(lang, 'emptyCarePreview')}
        tips={[t(lang, 'emptyCareTip1'), t(lang, 'emptyCareTip2'), t(lang, 'emptyCareTip3')]}
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
  const lang = useDashboard((s) => s.settings.language);
  const { Page: ProofScreen, failed } = useChunk(loadProofChunk);
  if (!active) {
    return (
      <NeedsIncident
        title={t(lang, 'navProof')}
        what={t(lang, 'emptyProofWhat')}
        preview={t(lang, 'emptyProofPreview')}
        tips={[t(lang, 'emptyProofTip1'), t(lang, 'emptyProofTip2'), t(lang, 'emptyProofTip3')]}
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
