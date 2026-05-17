import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n/index'
import './index.css'
import App from './App'

// Seed API keys from env vars on first load.
// localStorage value always takes precedence (user can override in Configurações).
if (!localStorage.getItem('groq_api_key') && import.meta.env.VITE_GROQ_API_KEY) {
  localStorage.setItem('groq_api_key', import.meta.env.VITE_GROQ_API_KEY)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
