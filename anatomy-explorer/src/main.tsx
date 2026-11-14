import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Dev-only handle for debugging / browser tests.
if (import.meta.env.DEV) {
  void import('./store/useAnatomyStore').then((m) => { (window as unknown as { __store: unknown }).__store = m.useAnatomyStore })
}
