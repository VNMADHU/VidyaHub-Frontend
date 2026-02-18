/**
 * Structured logger for the frontend.
 * In production builds, debug/info logs are suppressed.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogMeta = Record<string, unknown>

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

const MIN_LEVEL = import.meta.env.PROD ? LOG_LEVELS.warn : LOG_LEVELS.debug

const timestamp = (): string => new Date().toISOString()

const formatMessage = (level: LogLevel, message: string, meta?: LogMeta): unknown[] => {
  const base = `[${timestamp()}] [${level.toUpperCase()}] ${message}`
  if (meta && Object.keys(meta).length > 0) {
    return [base, meta]
  }
  return [base]
}

const logger = {
  debug(message: string, meta: LogMeta = {}) {
    if (LOG_LEVELS.debug >= MIN_LEVEL) {
      console.debug(...formatMessage('debug', message, meta))
    }
  },

  info(message: string, meta: LogMeta = {}) {
    if (LOG_LEVELS.info >= MIN_LEVEL) {
      console.info(...formatMessage('info', message, meta))
    }
  },

  warn(message: string, meta: LogMeta = {}) {
    if (LOG_LEVELS.warn >= MIN_LEVEL) {
      console.warn(...formatMessage('warn', message, meta))
    }
  },

  error(message: string, meta: LogMeta = {}) {
    if (LOG_LEVELS.error >= MIN_LEVEL) {
      console.error(...formatMessage('error', message, meta))
    }
  },

  /** Log a user action (for analytics / auditing purposes). */
  action(actionName: string, meta: LogMeta = {}) {
    this.info(`[ACTION] ${actionName}`, meta)
  },

  /** Log an API request/response cycle. */
  api(method: string, endpoint: string, status: number, duration: number) {
    const level: LogLevel = status >= 400 ? 'error' : 'info'
    this[level](`${method} ${endpoint} → ${status}`, {
      duration: `${duration}ms`,
    })
  },
}

export default logger
