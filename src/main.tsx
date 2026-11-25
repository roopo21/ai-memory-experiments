import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { theme } from './theme'
import App from './App'
import { syncHash } from './state/hashState'

for (const [name, color] of Object.entries(theme)) {
  document.documentElement.style.setProperty(`--${name}`, color)
}

syncHash()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Dev-only handle for debugging / browser tests.
if (import.meta.env.DEV) {
  void import('./state/useAnatomyStore').then((m) => {
    ;(window as unknown as { __store: unknown }).__store = m.useAnatomyStore
  })
}
