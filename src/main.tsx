import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Theme } from '@astryxdesign/core/theme'
import './index.css'
import './dashboard.css'
import App from './App.tsx'
import { rakshioTheme } from './theme/rakshioTheme'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'

// Custom RAKSHIO theme (Calm palette via Astryx defineTheme) instead of
// the neutral theme — library primitives now match the app's own palette.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={rakshioTheme}>
      <ToastProvider>
        <ErrorBoundary onReset={() => window.location.assign('/')}>
          <App />
        </ErrorBoundary>
      </ToastProvider>
    </Theme>
  </StrictMode>,
)

// Offline-first: the service worker caches the app shell on first visit.
// Production only, and never in dev (a worker would serve stale dev code).
// Registration failure (file://, no support) is silent — the app works
// exactly the same online.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}
