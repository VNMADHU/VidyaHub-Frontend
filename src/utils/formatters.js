/**
 * Date & string formatting utilities.
 */

/**
 * Format an ISO date string to a human-readable format.
 * @param {string|Date} date
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string}
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '-'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...options,
    }).format(new Date(date))
  } catch {
    return String(date)
  }
}

/**
 * Format an ISO date string to include time.
 */
export const formatDateTime = (date) =>
  formatDate(date, { hour: '2-digit', minute: '2-digit', hour12: true })

/**
 * Format a number as INR currency.
 */
export const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Capitalise the first letter of a string.
 */
export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Get initials from a name (e.g. "John Doe" → "JD").
 */
export const getInitials = (firstName = '', lastName = '') => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

/**
 * Truncate text with ellipsis.
 */
export const truncate = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text || ''
  return text.slice(0, maxLength) + '…'
}

/**
 * Format a phone number for display (Indian format).
 * "9876543210" → "+91 98765 43210"
 */
export const formatPhone = (phone) => {
  if (!phone) return '-'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  return phone
}

/**
 * Get relative time string (e.g. "3 hours ago", "just now").
 */
export const timeAgo = (date) => {
  if (!date) return ''
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ]
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds)
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`
    }
  }
  return 'just now'
}
