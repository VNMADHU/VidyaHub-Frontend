/**
 * Core application types.
 */

// ── User & Auth ───────────────────────────────────────────
export interface User {
  id: string
  email: string
  role: string
  schoolId?: string
  phone?: string
  modulePermissions?: string | null
  feeCanEdit?: boolean
  feeCanDelete?: boolean
  expenseCanEdit?: boolean
  expenseCanDelete?: boolean
  incomeCanEdit?: boolean
  incomeCanDelete?: boolean
  firstName?: string
  lastName?: string
  isEmailVerified?: boolean
  isPhoneVerified?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  role: string | null
  schoolId: string | null
  loading: boolean
  error: string | null
}

export interface LoginPayload {
  email: string
  password: string
  role: string
}

/** Returned from POST /auth/login when OTP is sent (step 1 of 2-step login) */
export interface OtpStepResponse {
  otpSent: true
  message: string
  maskedEmail: string
  maskedPhone: string | null
}

/** Returned from POST /auth/login when another session is already active */
export interface SessionConflictResponse {
  sessionConflict: true
  message: string
  maskedEmail: string
  maskedPhone: string | null
}

/** Returned from POST /auth/verify-otp (step 2) — full session */
export interface LoginResponse {
  user: User
  token: string
}

/** Returned from POST /auth/register */
export interface RegisterResponse {
  message: string
  email: string
  maskedEmail: string
  maskedPhone: string
  needsVerification: true
}

/** Returned from POST /auth/forgot-password */
export interface ForgotPasswordResponse {
  message: string
  maskedEmail: string
  maskedPhone: string | null
}

export interface AdminUser {
  id: number
  email: string
  phone?: string
  modulePermissions?: string[] | null
  schoolId?: number | null
  school?: { id: number; name: string } | null
  accountStatus?: 'active' | 'suspended'
  profile?: { firstName: string; lastName: string; phone?: string | null } | null
  isEmailVerified?: boolean
  isPhoneVerified?: boolean
  mfaEmail?: boolean
  mfaPhone?: boolean
  feeCanEdit?: boolean
  feeCanDelete?: boolean
  expenseCanEdit?: boolean
  expenseCanDelete?: boolean
  incomeCanEdit?: boolean
  incomeCanDelete?: boolean
  createdAt: string
}

// ── School ────────────────────────────────────────────────
export interface School {
  id: string
  name: string
  address: string
  contact?: string
  email?: string
  logo?: string
  createdAt?: string
  updatedAt?: string
}

// ── Student ───────────────────────────────────────────────
export interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  admissionNumber: string
  rollNumber?: string
  dateOfBirth?: string
  gender?: string
  bloodGroup?: string
  address?: string
  classId?: string
  sectionId?: string
  schoolId?: string
  parentEmail?: string
  fatherName?: string
  fatherContact?: string
  motherName?: string
  motherContact?: string
  guardianName?: string
  guardianContact?: string
  class?: SchoolClass
  section?: Section
  createdAt?: string
  updatedAt?: string
}

export type StudentFormData = Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'class' | 'section'>

// ── Teacher ───────────────────────────────────────────────
export interface Teacher {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  subject?: string
  designation?: string
  qualification?: string
  experience?: string
  dateOfBirth?: string
  gender?: string
  address?: string
  schoolId?: string
  createdAt?: string
  updatedAt?: string
}

export type TeacherFormData = Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'>

// ── Class & Section ───────────────────────────────────────
export interface SchoolClass {
  id: string
  name: string
  schoolId?: string
  sections?: Section[]
  createdAt?: string
  updatedAt?: string
}

export interface Section {
  id: string
  name: string
  classId: string
  class?: SchoolClass
  createdAt?: string
  updatedAt?: string
}

// ── Exam & Marks ──────────────────────────────────────────
export interface Exam {
  id: string
  name: string
  subject: string
  date: string
  totalMarks: number
  classId?: string
  sectionId?: string
  schoolId?: string
  class?: SchoolClass
  section?: Section
  createdAt?: string
  updatedAt?: string
}

export interface Mark {
  id: string
  studentId: string
  examId: string
  marksObtained: number
  grade?: string
  remarks?: string
  student?: Student
  exam?: Exam
  createdAt?: string
  updatedAt?: string
}

// ── Attendance ────────────────────────────────────────────
export interface Attendance {
  id: string
  studentId: string
  date: string
  status: 'present' | 'absent' | 'late'
  remarks?: string
  student?: Student
  schoolId?: string
  createdAt?: string
  updatedAt?: string
}

// ── Event ─────────────────────────────────────────────────
export interface SchoolEvent {
  id: string
  title: string
  description?: string
  date: string
  location?: string
  type?: string
  schoolId?: string
  createdAt?: string
  updatedAt?: string
}

// ── Announcement ──────────────────────────────────────────
export interface Announcement {
  id: string
  title: string
  content: string
  date?: string
  priority?: string
  schoolId?: string
  createdAt?: string
  updatedAt?: string
}

// ── Achievement ───────────────────────────────────────────
export interface Achievement {
  id: string
  title: string
  description?: string
  date?: string
  category?: string
  studentId?: string
  student?: Student
  schoolId?: string
  createdAt?: string
  updatedAt?: string
}

// ── Sport ─────────────────────────────────────────────────
export interface Sport {
  id: string
  name: string
  description?: string
  coach?: string
  schedule?: string
  schoolId?: string
  createdAt?: string
  updatedAt?: string
}

// ── Fee ───────────────────────────────────────────────────
export interface Fee {
  id: string
  studentId: string
  amount: number
  dueDate: string
  status: 'pending' | 'paid' | 'overdue' | 'partial'
  type?: string
  description?: string
  paidAmount?: number
  paidDate?: string
  paymentMethod?: string
  student?: Student
  schoolId?: string
  createdAt?: string
  updatedAt?: string
}

// ── API Response ──────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data?: T
  message?: string
  error?: string
  issues?: Array<{ message: string }>
}

// ── Toast ─────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  type: ToastType
  message: string
  duration: number
}

// ── UI State ──────────────────────────────────────────────
export interface UiState {
  navOpen: boolean
  activeRole: string
}

// ── Confirm Dialog ────────────────────────────────────────
export interface ConfirmOptions {
  title?: string
  message: string
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'success' | 'primary'
}
