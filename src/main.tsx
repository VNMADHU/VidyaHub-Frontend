import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { store } from './store'
import { queryClient } from './lib/queryClient'
import { initSentry } from './lib/sentry'
import { validateEnv } from './utils/envValidator'
import logger from './utils/logger'

// Initialise Sentry (no-op when DSN not configured)
initSentry()

// Validate environment on startup
validateEnv()

// Global error handlers
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason?.message || String(event.reason),
  })
})

window.addEventListener('error', (event: ErrorEvent) => {
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
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </Provider>
    </StrictMode>,
  )
  logger.info('React app mounted')
} else {
  logger.error('Root element not found!')
}
