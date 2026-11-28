import { Component, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { loadSettings } from '../state/incidents';
import { t } from '../i18n';

// Calm fallback for a render crash: never a blank page, always a way back
// to Panic and always the 1930 call one tap away. The banner copy stays —
// the honest sentence is the one thing a crash must not hide.
// Step 18: the crash screen follows the UI language too. It reads the
// language straight from storage (loadSettings is a plain try/catch read),
// not from the store hook — if the crash took the store down with it, the
// fallback must still render.
export function ErrorFallback({ onReset }: { onReset: () => void }) {
  const lang = loadSettings().language;
  return (
    <main className="app-main">
      <div className="screen-stack">
        <p className="no-report-banner" role="note">
          {t(lang, 'bannerText')}
        </p>
        <section className="rk-card">
          <h1>{t(lang, 'errTitle')}</h1>
          <p>{t(lang, 'errBody')}</p>
          <a className="rk-primary-btn" href="tel:1930">{t(lang, 'errCall')}</a>
          <Button label={t(lang, 'errBack')} variant="ghost" size="lg" width="100%" onClick={onReset} />
        </section>
      </div>
    </main>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Class component on purpose: only class boundaries catch render errors.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) return <ErrorFallback onReset={this.props.onReset} />;
    return this.props.children;
  }
}
