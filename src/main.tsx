import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import './index.css'
import App from './App.tsx'

// Astryx neutral theme for the library primitives (Button, Badge, Card).
// The app's own Calm Mode palette lives in index.css; a custom RAKSHIO
// theme via defineTheme/palette generation is deferred polish, not Step 1.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={neutralTheme}>
      <App />
    </Theme>
  </StrictMode>,
)
