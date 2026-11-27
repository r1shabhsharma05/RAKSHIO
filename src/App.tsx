import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useDashboard } from './state/dashboardStore';
import { Shell } from './dashboard/Shell';
import { HomePage } from './dashboard/Home';
import { ReportFlow } from './dashboard/ReportFlow';
import { IncidentDetailPage } from './dashboard/IncidentDetail';
import { SettingsPage } from './dashboard/SettingsPage';
import { ScreenSkeleton } from './screens/shared';
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
// IncidentsPage (Recharts) is lazy: charts never block first paint.
const IncidentsPage = lazy(() => import('./dashboard/IncidentsPage').then((m) => ({ default: m.IncidentsPage })));

export default function App() {
  const load = useDashboard((s) => s.load);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<HomePage />} />
          <Route path="report" element={<ReportFlow />} />
          <Route
            path="incidents"
            element={
              <Suspense fallback={<ScreenSkeleton label="Incident Dashboard khul raha hai…" />}>
                <IncidentsPage />
              </Suspense>
            }
          />
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
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
