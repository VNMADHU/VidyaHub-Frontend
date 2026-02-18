import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { validateEnv } from './utils/envValidator'
import logger from './utils/logger'

// Validate environment on startup
validateEnv()

// Global error handlers
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason?.message || String(event.reason),
  })
})

window.addEventListener('error', (event) => {
  logger.error('Uncaught error', {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
  })
})

const root = document.getElementById('root')

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  logger.info('React app mounted')
} else {
  logger.error('Root element not found!')
}
