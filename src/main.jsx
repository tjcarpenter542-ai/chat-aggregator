import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Startup } from './components/Startup.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {/* Boot overlay in FRONT of the app: NFA disclaimer (~5s) -> intro splash -> app.
        Self-unmounts once the sequence finishes. */}
    <Startup />
  </StrictMode>,
)
