import { useEffect, useState, type ComponentType } from 'react';
import { ScreenSkeleton } from '../screens/shared';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

// Lazy chunk loaders, shared so the idle prefetch (App), the hover preload
// (GlassShell dock) and the route mounts (App/ToolPages) all warm the SAME
// module — one network fetch, then cached. Step 16 (bug 7): the 419KB
// IncidentsPage chunk (Recharts) took ~11s on the live site's cold load;
// warming it on idle makes the first navigation instant instead.
export const loadIncidentsChunk = () =>
  import('../dashboard/IncidentsPage').then((m) => ({ default: m.IncidentsPage }));
export const loadVaultChunk = () =>
  import('../screens/Vault').then((m) => ({ default: m.VaultScreen }));
export const loadProofChunk = () =>
  import('../screens/Proof').then((m) => ({ default: m.ProofScreen }));
export const loadCareChunk = () =>
  import('../screens/Care').then((m) => ({ default: m.CareScreen }));

/** Warm every lazy route chunk. Fire-and-forget; failures are swallowed —
 *  the route's own useChunk still retries on demand. */
export function prefetchLazyChunks(): void {
  void loadIncidentsChunk().catch(() => undefined);
  void loadVaultChunk().catch(() => undefined);
  void loadProofChunk().catch(() => undefined);
  void loadCareChunk().catch(() => undefined);
}

// Chunk-load recovery: after a deploy, a cached page can request a chunk
// that no longer exists. First failure hard-reloads once (the new version
// is then live); if it still fails, show the message + a reload button —
// never a silent blank. The flag clears on success so a later deploy can
// recover again.
const RETRY_KEY = 'rk-chunk-retry';

export function useChunk<P extends object>(
  importer: () => Promise<{ default: ComponentType<P> }>,
) {
  const [Page, setPage] = useState<ComponentType<P> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    importer()
      .then((m) => {
        if (!alive) return;
        sessionStorage.removeItem(RETRY_KEY);
        setPage(() => m.default);
      })
      .catch(() => {
        if (!sessionStorage.getItem(RETRY_KEY)) {
          sessionStorage.setItem(RETRY_KEY, '1');
          window.location.reload();
        } else if (alive) {
          setFailed(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [importer]);
  return { Page, failed };
}

export function ChunkFallback({ label, failed }: { label: string; failed: boolean }) {
  const lang = useDashboard((s) => s.settings.language);
  if (failed) {
    return (
      <div className="db-card" role="alert">
        <h2 className="db-page-title">{t(lang, 'chunkTitle')}</h2>
        <p className="db-muted">{t(lang, 'chunkBody')}</p>
        <button type="button" className="db-btn db-btn-red" onClick={() => window.location.reload()}>
          {t(lang, 'chunkReload')}
        </button>
      </div>
    );
  }
  return <ScreenSkeleton label={label} />;
}
