/**
 * Structured logger for the frontend.
 * Replaces raw console.* calls with structured, level-aware logging.
 *
 * In production builds (import.meta.env.PROD), debug/info logs are suppressed.
 * Errors and warnings always log regardless of environment.
 *
 * Usage:
 *   import logger from '@/utils/logger'
 *   logger.info('Page loaded', { page: 'dashboard' })
 *   logger.error('API call failed', { endpoint: '/students', status: 500 })
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 }

const MIN_LEVEL = import.meta.env.PROD ? LOG_LEVELS.warn : LOG_LEVELS.debug

const timestamp = () => new Date().toISOString()

const formatMessage = (level, message, meta) => {
  const base = `[${timestamp()}] [${level.toUpperCase()}] ${message}`
  if (meta && Object.keys(meta).length > 0) {
    return [base, meta]
  }
  return [base]
}

const logger = {
  debug(message, meta = {}) {
    if (LOG_LEVELS.debug >= MIN_LEVEL) {
      console.debug(...formatMessage('debug', message, meta))
    }
  },

  info(message, meta = {}) {
    if (LOG_LEVELS.info >= MIN_LEVEL) {
      console.info(...formatMessage('info', message, meta))
    }
  },

  warn(message, meta = {}) {
    if (LOG_LEVELS.warn >= MIN_LEVEL) {
      console.warn(...formatMessage('warn', message, meta))
    }
  },

  error(message, meta = {}) {
    if (LOG_LEVELS.error >= MIN_LEVEL) {
      console.error(...formatMessage('error', message, meta))
    }
  },

  /**
   * Log a user action (for analytics / auditing purposes).
   */
  action(actionName, meta = {}) {
    this.info(`[ACTION] ${actionName}`, meta)
  },

  /**
   * Log an API request/response cycle.
   */
  api(method, endpoint, status, duration) {
    const level = status >= 400 ? 'error' : 'info'
    this[level](`${method} ${endpoint} → ${status}`, {
      duration: `${duration}ms`,
    })
  },
}

export default logger
