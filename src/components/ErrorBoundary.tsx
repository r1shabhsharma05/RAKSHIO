import { Component, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';

// Calm fallback for a render crash: never a blank page, always a way back
// to Panic and always the 1930 call one tap away. The banner copy stays —
// the honest sentence is the one thing a crash must not hide.
export function ErrorFallback({ onReset }: { onReset: () => void }) {
  return (
    <main className="app-main">
      <div className="screen-stack">
        <p className="no-report-banner" role="note">
          RAKSHIO report file nahi karta. Aapko 1930 / bank ko khud contact karna hoga.
        </p>
        <section className="rk-card">
          <h1>Kuch gadbad ho gayi</h1>
          <p>App ruk gaya hai — aapka data safe hai, ye sirf is phone par hai.</p>
          <a className="rk-primary-btn" href="tel:1930">1930 par call karein</a>
          <Button label="Pehle screen par wapas" variant="ghost" size="lg" width="100%" onClick={onReset} />
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
