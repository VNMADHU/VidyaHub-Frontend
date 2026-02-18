/**
 * Environment validation — runs at startup.
 */

import logger from './logger'
import { APP_NAME, APP_VERSION } from './constants'

const REQUIRED_ENV: string[] = []

const OPTIONAL_ENV: Array<{ key: string; fallback: string }> = [
  { key: 'VITE_API_URL', fallback: 'http://localhost:5001/api' },
]

export const validateEnv = (): void => {
  const missing = REQUIRED_ENV.filter((key) => !import.meta.env[key])

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(', ')}`
    logger.error(msg)
    throw new Error(msg)
  }

  OPTIONAL_ENV.forEach(({ key, fallback }) => {
    if (!import.meta.env[key]) {
      logger.warn(`Optional env "${key}" not set — using default: ${fallback}`)
    }
  })

  logger.info(`${APP_NAME} v${APP_VERSION} initialised`, {
    env: import.meta.env.MODE,
    api: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  })
}
