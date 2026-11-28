import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

// Toasts: one short confirmation per completed action (save, download, copy).
// Pattern follows the ui-motion-kit toast meta (enter 220ms ease-out, exit
// 160ms ease-in, reduced-motion 0ms, polite live region, never steal focus)
// and the modern-web-guidance toast rules (region with a name, explicit
// close, info also visible elsewhere so a dismissed toast loses nothing).
// Hand-built in ~60 lines: the kit's component needs motion + @base-ui/react,
// two new dependencies for one small pattern.
const ToastContext = createContext<(message: string) => void>(() => undefined);

export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}

interface ToastItem {
  id: number;
  message: string;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const lang = useDashboard((s) => s.settings.language);
  const idRef = useRef(0);
  const timersRef = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const arm = useCallback((id: number, ms: number) => {
    timersRef.current.set(id, window.setTimeout(() => dismiss(id), ms));
  }, [dismiss]);

  const showToast = useCallback((message: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message }]);
    arm(id, 4000);
  }, [arm]);

  // Hover/focus pauses the countdown; leaving gives a fresh 2 seconds.
  function pause(id: number) {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications">
        {toasts.map((item) => (
          <div
            key={item.id}
            className="toast"
            role="status"
            onMouseEnter={() => pause(item.id)}
            onMouseLeave={() => arm(item.id, 2000)}
            onFocus={() => pause(item.id)}
            onBlur={() => arm(item.id, 2000)}
          >
            <span>{item.message}</span>
            <button type="button" className="toast-close" aria-label={t(lang, 'toastDismiss')} onClick={() => dismiss(item.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
