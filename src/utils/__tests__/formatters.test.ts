import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  capitalize,
  getInitials,
  truncate,
  formatPhone,
} from '@/utils/formatters'

describe('formatters', () => {
  describe('formatDate', () => {
    it('formats a valid date string', () => {
      const result = formatDate('2026-01-15')
      expect(result).toContain('2026')
      expect(result).toContain('Jan')
    })

    it('returns fallback for invalid input', () => {
      expect(formatDate('')).toBe('-')
      expect(formatDate(null as unknown as string)).toBe('-')
    })
  })

  describe('formatDateTime', () => {
    it('formats a valid datetime', () => {
      const result = formatDateTime('2026-01-15T10:30:00Z')
      expect(result).toContain('2026')
    })

    it('returns fallback for invalid input', () => {
      expect(formatDateTime('')).toBe('-')
    })
  })

  describe('formatCurrency', () => {
    it('formats number as INR currency', () => {
      const result = formatCurrency(1500)
      expect(result).toContain('1,500')
    })

    it('handles zero', () => {
      const result = formatCurrency(0)
      expect(result).toContain('0')
    })
  })

  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello')
    })

    it('handles empty string', () => {
      expect(capitalize('')).toBe('')
    })

    it('handles single character', () => {
      expect(capitalize('a')).toBe('A')
    })
  })

  describe('getInitials', () => {
    it('gets initials from first and last name', () => {
      expect(getInitials('John', 'Doe')).toBe('JD')
    })

    it('gets single initial when only first name given', () => {
      expect(getInitials('John')).toBe('J')
    })

    it('handles empty strings', () => {
      expect(getInitials('', '')).toBe('')
    })
  })

  describe('truncate', () => {
    it('truncates long text', () => {
      const long = 'a'.repeat(100)
      const result = truncate(long, 50)
      expect(result.length).toBeLessThanOrEqual(51) // 50 + '…'
      expect(result).toContain('…')
    })

    it('does not truncate short text', () => {
      expect(truncate('short', 50)).toBe('short')
    })
  })

  describe('formatPhone', () => {
    it('formats a 10-digit phone number', () => {
      const result = formatPhone('9876543210')
      expect(result).toContain('98765')
    })

    it('returns input for non-10-digit numbers', () => {
      expect(formatPhone('123')).toBe('123')
    })
  })
})
