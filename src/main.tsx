import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import App from './app.tsx'
import { applyStateFromHash } from './state/url'

// Hydrate stores from the URL before the map mounts so it initializes at the
// shared camera / state (FR-13).
applyStateFromHash()

// StrictMode is intentionally omitted: its dev-only mount -> unmount -> mount
// double-invoke creates and destroys the MapLibre WebGL context in rapid
// succession, which the browser reports as "context lost". A single, stable
// map instance matters more here than StrictMode's extra dev checks.
createRoot(document.getElementById('root')!).render(<App />)
