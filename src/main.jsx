import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Intro } from './components/Intro.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {/* Branded intro splash — a fixed overlay in FRONT of the app; unmounts itself once dismissed. */}
    <Intro />
  </StrictMode>,
)
