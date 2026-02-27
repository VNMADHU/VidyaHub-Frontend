/**
 * Application-wide constants.
 * Centralises all magic strings and config values in one place.
 */

// ── App Metadata ──────────────────────────────────────────
export const APP_NAME = 'Vidya Hub'
export const APP_VERSION = '1.0.0'
export const APP_DESCRIPTION = 'Comprehensive School Management System'

// ── API ───────────────────────────────────────────────────
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL || 'http://localhost:5002/api'
export const API_TIMEOUT = 30_000 // 30 seconds
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024 // 5 MB

// ── User Roles ────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: 'super-admin',
  SCHOOL_ADMIN: 'school-admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
} as const

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.SCHOOL_ADMIN]: 'School Admin',
  [ROLES.TEACHER]: 'Teacher',
  [ROLES.STUDENT]: 'Student',
  [ROLES.PARENT]: 'Parent',
}

// ── Route Paths ───────────────────────────────────────────
export const ROUTES = {
  HOME: '/',
  PORTAL: '/portal',
  DASHBOARD: '/portal/dashboard',
  STUDENTS: '/portal/students',
  TEACHERS: '/portal/teachers',
  CLASSES: '/portal/classes',
  EXAMS: '/portal/exams',
  EXAM_MANAGEMENT: '/portal/exam-management',
  ATTENDANCE: '/portal/attendance',
  FEES: '/portal/fees',
  EVENTS: '/portal/events',
  ANNOUNCEMENTS: '/portal/announcements',
  ACHIEVEMENTS: '/portal/achievements',
  SPORTS: '/portal/sports',
  ABOUT: '/portal/about',
  SETTINGS: '/portal/settings',
  STUDENT_LOGIN: '/student-login',
  TEACHER_LOGIN: '/teacher-login',
} as const

// ── Attendance Statuses ───────────────────────────────────
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
} as const

// ── Gender Options ────────────────────────────────────────
export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const

// ── Fee Statuses ──────────────────────────────────────────
export const FEE_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  PARTIAL: 'partial',
} as const

// ── Validation Patterns ───────────────────────────────────
export const PATTERNS = {
  INDIAN_PHONE: /^[6-9]\d{9}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ADMISSION_NUMBER: /^[A-Za-z0-9-]+$/,
} as const

// ── Pagination ────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 25
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

// ── Date Formats ──────────────────────────────────────────
export const DATE_FORMAT = 'dd-MM-yyyy'
export const DATE_TIME_FORMAT = 'dd-MM-yyyy HH:mm'

// ── Local Storage Keys ────────────────────────────────────
export const STORAGE_KEYS = {
  AUTH: 'auth-store',
  SCHOOL_ID: 'schoolId',
  THEME: 'theme',
} as const

// ── HTTP Status Codes ─────────────────────────────────────
export const HTTP = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500,
} as const
