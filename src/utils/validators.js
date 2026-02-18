import { PATTERNS } from './constants'

/**
 * Centralised validation helpers.
 * Used by both forms and bulk-import mappers.
 */

export const isValidEmail = (email) => PATTERNS.EMAIL.test(email)

export const isValidIndianPhone = (phone) => PATTERNS.INDIAN_PHONE.test(phone)

export const isNotFutureDate = (dateStr) => {
  if (!dateStr) return true
  return new Date(dateStr) <= new Date()
}

/**
 * Validate a student form payload.
 * @returns {string[]} Array of error messages (empty = valid).
 */
export const validateStudentForm = (data) => {
  const errors = []

  if (!data.firstName?.trim()) errors.push('First name is required.')
  if (!data.lastName?.trim()) errors.push('Last name is required.')
  if (!data.email?.trim()) errors.push('Email is required.')
  if (data.email && !isValidEmail(data.email))
    errors.push('Please enter a valid email address.')
  if (!data.admissionNumber?.trim()) errors.push('Admission number is required.')

  if (data.dateOfBirth && !isNotFutureDate(data.dateOfBirth))
    errors.push('Date of Birth cannot be a future date.')

  if (data.parentEmail && !isValidEmail(data.parentEmail))
    errors.push('Please enter a valid parent email address.')
  if (data.fatherContact && !isValidIndianPhone(data.fatherContact))
    errors.push('Father Contact must be a valid 10-digit Indian mobile number.')
  if (data.motherContact && !isValidIndianPhone(data.motherContact))
    errors.push('Mother Contact must be a valid 10-digit Indian mobile number.')
  if (data.guardianContact && !isValidIndianPhone(data.guardianContact))
    errors.push('Guardian Contact must be a valid 10-digit Indian mobile number.')

  return errors
}

/**
 * Validate a teacher form payload.
 * @returns {string[]} Array of error messages (empty = valid).
 */
export const validateTeacherForm = (data) => {
  const errors = []

  if (!data.firstName?.trim()) errors.push('First name is required.')
  if (!data.lastName?.trim()) errors.push('Last name is required.')
  if (!data.email?.trim()) errors.push('Email is required.')
  if (data.email && !isValidEmail(data.email))
    errors.push('Please enter a valid email address.')
  if (data.phoneNumber && !isValidIndianPhone(data.phoneNumber))
    errors.push('Phone Number must be a valid 10-digit Indian mobile number (starting with 6-9).')

  return errors
}

/**
 * Validate a school info payload.
 * @returns {string[]} Array of error messages (empty = valid).
 */
export const validateSchoolForm = (data) => {
  const errors = []

  if (!data.name?.trim()) errors.push('School name is required.')
  if (!data.address?.trim()) errors.push('Address is required.')
  if (data.contact && !isValidIndianPhone(data.contact))
    errors.push('Contact must be a valid 10-digit Indian mobile number.')

  return errors
}
