import * as Sentry from '@sentry/react'

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  if (!dsn) {
    console.info('[Sentry] No DSN configured — skipping initialization')
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
}

export { Sentry }
