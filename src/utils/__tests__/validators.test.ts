import { describe, it, expect } from 'vitest'
import {
  validateStudentForm,
  validateTeacherForm,
  validateSchoolForm,
} from '@/utils/validators'

describe('validators', () => {
  describe('validateStudentForm', () => {
    it('returns no errors for valid data', () => {
      const errors = validateStudentForm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        dateOfBirth: '2010-01-15',
        fatherContact: '9876543210',
        admissionNumber: 'ADM001',
      })
      expect(errors).toHaveLength(0)
    })

    it('rejects future date of birth', () => {
      const errors = validateStudentForm({
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '2030-01-15',
      })
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some((e: string) => e.toLowerCase().includes('date of birth'))).toBe(true)
    })

    it('rejects invalid email', () => {
      const errors = validateStudentForm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'not-an-email',
      })
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some((e: string) => e.toLowerCase().includes('email'))).toBe(true)
    })

    it('rejects invalid phone numbers', () => {
      const errors = validateStudentForm({
        firstName: 'John',
        lastName: 'Doe',
        fatherContact: '123',
      })
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateTeacherForm', () => {
    it('returns no errors for valid data', () => {
      const errors = validateTeacherForm({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '9876543210',
        dateOfBirth: '1985-06-20',
      })
      expect(errors).toHaveLength(0)
    })

    it('rejects future date of birth', () => {
      const errors = validateTeacherForm({
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '2030-01-15',
      })
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateSchoolForm', () => {
    it('returns no errors for valid data', () => {
      const errors = validateSchoolForm({
        name: 'Test School',
        address: '123 Main St',
        contact: '9876543210',
        principal: 'Dr. Principal',
        boardType: 'CBSE',
      })
      expect(errors).toHaveLength(0)
    })

    it('rejects invalid contact', () => {
      const errors = validateSchoolForm({
        name: 'Test School',
        address: '123 Main St',
        contact: '123',
        principal: 'Dr. Principal',
        boardType: 'CBSE',
      })
      expect(errors.length).toBeGreaterThan(0)
    })
  })
})
