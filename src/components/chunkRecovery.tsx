import { useEffect, useState, type ComponentType } from 'react';
import { ScreenSkeleton } from '../screens/shared';

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
  if (failed) {
    return (
      <div className="db-card" role="alert">
        <h2 className="db-page-title">Naya version aaya hai</h2>
        <p className="db-muted">App ka naya version aa gaya — ye page load nahi ho raha. Reload dabayein.</p>
        <button type="button" className="db-btn db-btn-red" onClick={() => window.location.reload()}>
          Reload karein
        </button>
      </div>
    );
  }
  return <ScreenSkeleton label={label} />;
}
