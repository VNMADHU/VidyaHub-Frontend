import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import logger from '@/utils/logger'
import { API_BASE_URL, API_TIMEOUT, HTTP, STORAGE_KEYS } from '@/utils/constants'
import type {
  ApiResponse,
  Student,
  Teacher,
  School,
  Exam,
  Mark,
  Attendance,
  SchoolEvent,
  Announcement,
  Achievement,
  Sport,
  SchoolClass,
  Section,
  Fee,
  LoginResponse,
} from '@/types'

// ── Create Axios Instance ─────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request Interceptor ───────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Inject auth token
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTH)
      if (stored) {
        const auth = JSON.parse(stored)
        if (auth?.state?.token) {
          config.headers.Authorization = `Bearer ${auth.state.token}`
        }
      }
    } catch {
      // ignore malformed storage
    }

    // Inject school ID
    const schoolId = localStorage.getItem(STORAGE_KEYS.SCHOOL_ID) || 'system'
    config.headers['X-School-Id'] = schoolId

    return config
  },
  (error) => Promise.reject(error),
)

// ── Response Interceptor ──────────────────────────────────
api.interceptors.response.use(
  (response) => {
    const { method, url } = response.config
    logger.api(
      (method || 'GET').toUpperCase(),
      url || '',
      response.status,
      0,
    )
    return response
  },
  (error: AxiosError<ApiResponse>) => {
    if (error.response) {
      const { status, data } = error.response
      const { method, url } = error.config || {}

      logger.api((method || 'GET').toUpperCase(), url || '', status, 0)

      // Auto-logout on 401
      if (status === HTTP.UNAUTHORIZED) {
        logger.warn('Unauthorized — clearing session')
        localStorage.removeItem(STORAGE_KEYS.AUTH)
        // Redirect to appropriate login page based on current path
        const path = window.location.pathname
        if (path.startsWith('/my/student')) {
          window.location.href = '/student-login'
        } else if (path.startsWith('/my/teacher')) {
          window.location.href = '/teacher-login'
        } else if (path !== '/') {
          window.location.href = '/'
        }
      }

      const errorMessage =
        data?.message ||
        data?.issues?.map((i) => i.message).join(', ') ||
        `Request failed (${status})`

      return Promise.reject(new Error(errorMessage))
    }

    if (error.code === 'ECONNABORTED') {
      logger.error('Request timed out', { url: error.config?.url })
      return Promise.reject(
        new Error('Request timed out. Please check your network connection.'),
      )
    }

    logger.error('Network error', { url: error.config?.url })
    return Promise.reject(
      new Error('Unable to connect to the server. Please check your internet connection.'),
    )
  },
)

// ── API Methods ───────────────────────────────────────────

// Auth
export const authApi = {
  login: (email: string, password: string, role: string) =>
    api.post<LoginResponse>('/auth/login', { email, password, role }).then((r) => r.data),

  register: (email: string, password: string, schoolName: string) =>
    api.post('/auth/register', { email, password, schoolName }).then((r) => r.data),

  requestOtp: (email: string) =>
    api.post('/auth/otp', { email }).then((r) => r.data),
}

// Schools
export const schoolApi = {
  list: () => api.get<School[]>('/schools').then((r) => r.data),
  create: (data: Partial<School>) => api.post<School>('/schools', data).then((r) => r.data),
  update: (id: string, data: Partial<School>) =>
    api.patch<School>(`/schools/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/schools/${id}`).then((r) => r.data),
}

// Students
export const studentApi = {
  list: () => api.get<Student[]>('/students').then((r) => r.data),
  create: (data: Partial<Student>) =>
    api.post<Student>('/students', data).then((r) => r.data),
  update: (id: string, data: Partial<Student>) =>
    api.patch<Student>(`/students/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/students/${id}`).then((r) => r.data),
}

// Teachers
export const teacherApi = {
  list: () => api.get<Teacher[]>('/teachers').then((r) => r.data),
  create: (data: Partial<Teacher>) =>
    api.post<Teacher>('/teachers', data).then((r) => r.data),
  update: (id: string, data: Partial<Teacher>) =>
    api.patch<Teacher>(`/teachers/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/teachers/${id}`).then((r) => r.data),
}

// Attendance
export const attendanceApi = {
  list: () => api.get<Attendance[]>('/attendance').then((r) => r.data),
  create: (data: Partial<Attendance>) =>
    api.post<Attendance>('/attendance', data).then((r) => r.data),
  update: (id: string, data: Partial<Attendance>) =>
    api.patch<Attendance>(`/attendance/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/attendance/${id}`).then((r) => r.data),
  summary: () => api.get('/attendance/summary').then((r) => r.data),
}

// Marks
export const marksApi = {
  list: () => api.get<Mark[]>('/marks').then((r) => r.data),
  create: (data: Partial<Mark>) => api.post<Mark>('/marks', data).then((r) => r.data),
  update: (id: string, data: Partial<Mark>) =>
    api.patch<Mark>(`/marks/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/marks/${id}`).then((r) => r.data),
  report: (studentId: string) =>
    api.get(`/marks/report?studentId=${studentId}`).then((r) => r.data),
}

// Exams
export const examApi = {
  list: (params?: { classId?: string; sectionId?: string }) =>
    api.get<Exam[]>('/exams', { params }).then((r) => r.data),
  create: (data: Partial<Exam>) => api.post<Exam>('/exams', data).then((r) => r.data),
  update: (id: string, data: Partial<Exam>) =>
    api.patch<Exam>(`/exams/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/exams/${id}`).then((r) => r.data),
}

// Events
export const eventApi = {
  list: () => api.get<SchoolEvent[]>('/events').then((r) => r.data),
  create: (data: Partial<SchoolEvent>) =>
    api.post<SchoolEvent>('/events', data).then((r) => r.data),
  update: (id: string, data: Partial<SchoolEvent>) =>
    api.patch<SchoolEvent>(`/events/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/events/${id}`).then((r) => r.data),
}

// Announcements
export const announcementApi = {
  list: () => api.get<Announcement[]>('/announcements').then((r) => r.data),
  create: (data: Partial<Announcement>) =>
    api.post<Announcement>('/announcements', data).then((r) => r.data),
  update: (id: string, data: Partial<Announcement>) =>
    api.patch<Announcement>(`/announcements/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/announcements/${id}`).then((r) => r.data),
}

// Achievements
export const achievementApi = {
  list: () => api.get<Achievement[]>('/achievements').then((r) => r.data),
  create: (data: Partial<Achievement>) =>
    api.post<Achievement>('/achievements', data).then((r) => r.data),
  update: (id: string, data: Partial<Achievement>) =>
    api.patch<Achievement>(`/achievements/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/achievements/${id}`).then((r) => r.data),
}

// Sports
export const sportApi = {
  list: () => api.get<Sport[]>('/sports').then((r) => r.data),
  create: (data: Partial<Sport>) => api.post<Sport>('/sports', data).then((r) => r.data),
  update: (id: string, data: Partial<Sport>) =>
    api.patch<Sport>(`/sports/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/sports/${id}`).then((r) => r.data),
}

// Classes
export const classApi = {
  list: () => api.get<SchoolClass[]>('/classes').then((r) => r.data),
  create: (data: Partial<SchoolClass>) =>
    api.post<SchoolClass>('/classes', data).then((r) => r.data),
  update: (id: string, data: Partial<SchoolClass>) =>
    api.patch<SchoolClass>(`/classes/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/classes/${id}`).then((r) => r.data),
}

// Sections
export const sectionApi = {
  list: (classId?: string | null) =>
    api.get<Section[]>('/sections', { params: classId ? { classId } : {} }).then((r) => r.data),
  create: (data: Partial<Section>) =>
    api.post<Section>('/sections', data).then((r) => r.data),
  update: (id: string, data: Partial<Section>) =>
    api.patch<Section>(`/sections/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/sections/${id}`).then((r) => r.data),
}

// Portal (student/teacher self-service)
export const portalApi = {
  studentLogin: (rollNumber: string) =>
    api.post('/portal/student-login', { rollNumber }).then((r) => r.data),
  teacherLogin: (teacherId: string) =>
    api.post('/portal/teacher-login', { teacherId }).then((r) => r.data),
  getStudentProfile: (studentId: string) =>
    api.get<Student>(`/portal/student/${studentId}`).then((r) => r.data),
  getTeacherProfile: (teacherId: string) =>
    api.get<Teacher>(`/portal/teacher/${teacherId}`).then((r) => r.data),
}

// Fees
export const feeApi = {
  list: (studentId?: string | null) =>
    api.get<Fee[]>('/fees', { params: studentId ? { studentId } : {} }).then((r) => r.data),
  create: (data: Partial<Fee>) => api.post<Fee>('/fees', data).then((r) => r.data),
  update: (id: string, data: Partial<Fee>) =>
    api.patch<Fee>(`/fees/${id}`, data).then((r) => r.data),
  pay: (id: string, data: Record<string, unknown>) =>
    api.post(`/fees/${id}/pay`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/fees/${id}`).then((r) => r.data),
  getStudentFees: (studentId: string) =>
    api.get<Fee[]>(`/fees/student/${studentId}`).then((r) => r.data),
}

// Legacy-compatible default export (class-like singleton that wraps the new API)
const apiClient = {
  // Auth
  login: authApi.login,
  register: authApi.register,
  requestOtp: authApi.requestOtp,
  // Schools
  listSchools: schoolApi.list,
  createSchool: schoolApi.create,
  updateSchool: schoolApi.update,
  deleteSchool: schoolApi.delete,
  // Students
  listStudents: studentApi.list,
  createStudent: studentApi.create,
  updateStudent: studentApi.update,
  deleteStudent: studentApi.delete,
  // Teachers
  listTeachers: teacherApi.list,
  createTeacher: teacherApi.create,
  updateTeacher: teacherApi.update,
  deleteTeacher: teacherApi.delete,
  // Attendance
  listAttendance: attendanceApi.list,
  createAttendance: attendanceApi.create,
  updateAttendance: attendanceApi.update,
  deleteAttendance: attendanceApi.delete,
  getAttendanceSummary: attendanceApi.summary,
  // Marks
  listMarks: marksApi.list,
  createMarks: marksApi.create,
  updateMarks: marksApi.update,
  deleteMarks: marksApi.delete,
  getMarksReport: marksApi.report,
  // Exams
  listExams: examApi.list,
  createExam: examApi.create,
  updateExam: examApi.update,
  deleteExam: examApi.delete,
  // Events
  listEvents: eventApi.list,
  createEvent: eventApi.create,
  updateEvent: eventApi.update,
  deleteEvent: eventApi.delete,
  // Announcements
  listAnnouncements: announcementApi.list,
  createAnnouncement: announcementApi.create,
  updateAnnouncement: announcementApi.update,
  deleteAnnouncement: announcementApi.delete,
  // Achievements
  listAchievements: achievementApi.list,
  createAchievement: achievementApi.create,
  updateAchievement: achievementApi.update,
  deleteAchievement: achievementApi.delete,
  // Sports
  listSports: sportApi.list,
  createSport: sportApi.create,
  updateSport: sportApi.update,
  deleteSport: sportApi.delete,
  // Classes
  listClasses: classApi.list,
  createClass: classApi.create,
  updateClass: classApi.update,
  deleteClass: classApi.delete,
  // Sections
  listSections: sectionApi.list,
  createSection: sectionApi.create,
  updateSection: sectionApi.update,
  deleteSection: sectionApi.delete,
  // Portal
  studentLogin: portalApi.studentLogin,
  teacherLogin: portalApi.teacherLogin,
  getStudentProfile: portalApi.getStudentProfile,
  getTeacherProfile: portalApi.getTeacherProfile,
  // Fees
  listFees: feeApi.list,
  createFee: feeApi.create,
  updateFee: feeApi.update,
  payFee: feeApi.pay,
  deleteFee: feeApi.delete,
  getStudentFees: feeApi.getStudentFees,
}

export default apiClient
export { api as axiosInstance }
