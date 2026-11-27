import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useDashboard } from './state/dashboardStore';
import { GlassShell } from './dashboard/GlassShell';
import { HomePage } from './dashboard/Home';
import { ReportFlow } from './dashboard/ReportFlow';
import { IncidentDetailPage } from './dashboard/IncidentDetail';
import { SettingsPage } from './dashboard/SettingsPage';
import { GuidePage } from './dashboard/GuidePage';
import { JudgePage } from './dashboard/JudgePage';
import { ChunkFallback, useChunk } from './components/chunkRecovery';
import {
  ActionsPage,
  BankPage,
  CarePage,
  CoachPage,
  PortalPage,
  ProofPage,
  ShieldPage,
  TriagePage,
  VaultPage,
} from './dashboard/ToolPages';

// HashRouter: the deploy is a static drop (no server rewrites), so routes
// live after the # — deep links and reloads never 404.
// IncidentsPage (Recharts) loads on demand: charts never block first
// paint. A failed chunk load hard-reloads once (ChunkFallback), never a
// silent blank.
const loadIncidents = () => import('./dashboard/IncidentsPage').then((m) => ({ default: m.IncidentsPage }));

function IncidentsRoute() {
  const { Page, failed } = useChunk(loadIncidents);
  if (!Page) return <ChunkFallback label="Incident Dashboard khul raha hai…" failed={failed} />;
  return <Page />;
}

// Hash navigation keeps the scroll offset: after the report flow (scrolled
// down), Home opened with the page scrolled — the sticky header then covered
// the honest banner's top half. Reset scroll on every route change.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const load = useDashboard((s) => s.load);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<GlassShell />}>
          <Route index element={<HomePage />} />
          <Route path="report" element={<ReportFlow />} />
          <Route path="incidents" element={<IncidentsRoute />} />
          <Route path="incidents/:id" element={<IncidentDetailPage />} />
          <Route path="actions" element={<ActionsPage />} />
          <Route path="coach" element={<CoachPage />} />
          <Route path="portal" element={<PortalPage />} />
          <Route path="bank" element={<BankPage />} />
          <Route path="vault" element={<VaultPage />} />
          <Route path="shield" element={<ShieldPage />} />
          <Route path="triage" element={<TriagePage />} />
          <Route path="care" element={<CarePage />} />
          <Route path="proof" element={<ProofPage />} />
          <Route path="guide" element={<GuidePage />} />
          <Route path="judge" element={<JudgePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
