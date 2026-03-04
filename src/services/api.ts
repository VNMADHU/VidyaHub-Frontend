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

    // Inject school ID from auth state
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTH)
      if (stored) {
        const auth = JSON.parse(stored)
        const schoolId = auth?.state?.user?.schoolId || auth?.state?.schoolId
        if (schoolId) {
          config.headers['X-School-Id'] = String(schoolId)
        }
      }
    } catch {
      // ignore
    }

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

      // Auto-logout on 401 (but not on login pages — let those show inline errors)
      if (status === HTTP.UNAUTHORIZED) {
        const path = window.location.pathname
        const isLoginPage = path === '/student-login' || path === '/teacher-login' || path === '/'
        if (!isLoginPage) {
          logger.warn('Unauthorized — clearing session')
          localStorage.removeItem(STORAGE_KEYS.AUTH)
          if (path.startsWith('/my/student')) {
            window.location.href = '/student-login'
          } else if (path.startsWith('/my/teacher')) {
            window.location.href = '/teacher-login'
          } else {
            window.location.href = '/'
          }
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
      new Error('Unable to reach the local server. Please restart the application.'),
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

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
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
  getById: (id: string) => api.get<Student>(`/students/${id}`).then((r) => r.data),
  create: (data: Partial<Student>) =>
    api.post<Student>('/students', data).then((r) => r.data),
  update: (id: string, data: Partial<Student>) =>
    api.patch<Student>(`/students/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/students/${id}`).then((r) => r.data),
}

// Teachers
export const teacherApi = {
  list: () => api.get<Teacher[]>('/teachers').then((r) => r.data),
  getById: (id: string) => api.get<Teacher>(`/teachers/${id}`).then((r) => r.data),
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
  bulk: (data: { date: string; status: string; toCreate: number[]; toUpdate: number[] }) =>
    api.post('/attendance/bulk', data).then((r) => r.data),
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
  studentLogin: (rollNumber: string, dateOfBirth: string) =>
    api.post('/portal/student-login', { rollNumber, dateOfBirth }).then((r) => r.data),
  teacherLogin: (teacherId: string, dateOfBirth: string) =>
    api.post('/portal/teacher-login', { teacherId, dateOfBirth }).then((r) => r.data),
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

// Timetables
export const timetableApi = {
  list: (classId?: string | null, date?: string | null) =>
    api.get('/timetables', { params: { ...(classId ? { classId } : {}), ...(date ? { date } : {}) } }).then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/timetables', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/timetables/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/timetables/${id}`).then((r) => r.data),
}

// Periods
export const periodApi = {
  list: () => api.get('/periods').then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/periods', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/periods/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/periods/${id}`).then((r) => r.data),
}

// Subjects
export const subjectApi = {
  list: () => api.get('/subjects').then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/subjects', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/subjects/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/subjects/${id}`).then((r) => r.data),
}

// Report Card
export const reportCardApi = {
  get: (studentId: string) => api.get(`/report-card/${studentId}`).then((r) => r.data),
}

// Attendance Report
export const attendanceReportApi = {
  get: (classId: string, month: string, year: string) =>
    api.get('/attendance-report', { params: { classId, month, year } }).then((r) => r.data),
}

// Homework
export const homeworkApi = {
  list: (classId?: string | null) =>
    api.get('/homework', { params: classId ? { classId } : {} }).then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/homework', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/homework/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/homework/${id}`).then((r) => r.data),
}

// Portal Homework (teacher portal — uses portalAuthenticate, not admin JWT)
export const portalHomeworkApi = {
  create: (data: Record<string, unknown>) => api.post('/portal/homework', data).then((r) => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/portal/homework/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/portal/homework/${id}`).then((r) => r.data),
}

// Notifications
export const notificationApi = {
  list: () => api.get('/notifications').then((r) => r.data),
  send: (data: Record<string, unknown>) => api.post('/notifications/send', data).then((r) => r.data),
  recipientsCount: (audience: string) => api.get('/notifications/recipients-count', { params: { audience } }).then((r) => r.data),
  delete: (id: string) => api.delete(`/notifications/${id}`).then((r) => r.data),
}

export const libraryApi = {
  listBooks: () => api.get('/library/books').then((r) => r.data),
  createBook: (data: Record<string, unknown>) => api.post('/library/books', data).then((r) => r.data),
  updateBook: (id: string, data: Record<string, unknown>) => api.patch(`/library/books/${id}`, data).then((r) => r.data),
  deleteBook: (id: string) => api.delete(`/library/books/${id}`).then((r) => r.data),
  listIssues: () => api.get('/library/issues').then((r) => r.data),
  issueBook: (data: Record<string, unknown>) => api.post('/library/issues', data).then((r) => r.data),
  returnBook: (id: string) => api.patch(`/library/issues/${id}/return`).then((r) => r.data),
  deleteIssue: (id: string) => api.delete(`/library/issues/${id}`).then((r) => r.data),
}

export const transportApi = {
  listVehicles: () => api.get('/transport/vehicles').then((r) => r.data),
  getVehicle: (id: string) => api.get(`/transport/vehicles/${id}`).then((r) => r.data),
  createVehicle: (data: Record<string, unknown>) => api.post('/transport/vehicles', data).then((r) => r.data),
  updateVehicle: (id: string, data: Record<string, unknown>) => api.patch(`/transport/vehicles/${id}`, data).then((r) => r.data),
  deleteVehicle: (id: string) => api.delete(`/transport/vehicles/${id}`).then((r) => r.data),
  listDrivers: () => api.get('/transport/drivers').then((r) => r.data),
  getDriver: (id: string) => api.get(`/transport/drivers/${id}`).then((r) => r.data),
  createDriver: (data: Record<string, unknown>) => api.post('/transport/drivers', data).then((r) => r.data),
  updateDriver: (id: string, data: Record<string, unknown>) => api.patch(`/transport/drivers/${id}`, data).then((r) => r.data),
  deleteDriver: (id: string) => api.delete(`/transport/drivers/${id}`).then((r) => r.data),
}

export const expenseApi = {
  list: () => api.get('/expenses').then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/expenses', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/expenses/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/expenses/${id}`).then((r) => r.data),
}

export const supportApi = {
  list: () => api.get('/support').then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/support', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/support/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/support/${id}`).then((r) => r.data),
}

// Leaves
export const leaveApi = {
  list: (params?: { employeeType?: string; status?: string }) =>
    api.get('/leaves', { params }).then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/leaves', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/leaves/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/leaves/${id}`).then((r) => r.data),
}

// Holidays
export const holidayApi = {
  list: () => api.get('/holidays').then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/holidays', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/holidays/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/holidays/${id}`).then((r) => r.data),
}

// Staff (non-teaching employees)
export const staffApi = {
  list: (params?: { designation?: string; status?: string }) =>
    api.get('/staff', { params }).then((r) => r.data),
  getById: (id: string) => api.get(`/staff/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/staff', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/staff/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/staff/${id}`).then((r) => r.data),
}

// Admissions
export const admissionApi = {
  list: (params?: { status?: string; applyingForClass?: string; academicYear?: string }) =>
    api.get('/admissions', { params }).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/admissions', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admissions/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/admissions/${id}`).then((r) => r.data),
}

// Hostel Management
export const hostelApi = {
  // Hostels
  listHostels: () => api.get('/hostel').then((r) => r.data),
  getHostel: (id: string) => api.get(`/hostel/${id}`).then((r) => r.data),
  createHostel: (data: Record<string, unknown>) => api.post('/hostel', data).then((r) => r.data),
  updateHostel: (id: string, data: Record<string, unknown>) => api.patch(`/hostel/${id}`, data).then((r) => r.data),
  deleteHostel: (id: string) => api.delete(`/hostel/${id}`).then((r) => r.data),
  // Rooms
  listRooms: (params?: { hostelId?: string }) => api.get('/hostel/rooms/list', { params }).then((r) => r.data),
  createRoom: (data: Record<string, unknown>) => api.post('/hostel/rooms', data).then((r) => r.data),
  updateRoom: (id: string, data: Record<string, unknown>) => api.patch(`/hostel/rooms/${id}`, data).then((r) => r.data),
  deleteRoom: (id: string) => api.delete(`/hostel/rooms/${id}`).then((r) => r.data),
  // Allotments
  listAllotments: (params?: { hostelId?: string; status?: string }) => api.get('/hostel/allotments/list', { params }).then((r) => r.data),
  createAllotment: (data: Record<string, unknown>) => api.post('/hostel/allotments', data).then((r) => r.data),
  updateAllotment: (id: string, data: Record<string, unknown>) => api.patch(`/hostel/allotments/${id}`, data).then((r) => r.data),
  deleteAllotment: (id: string) => api.delete(`/hostel/allotments/${id}`).then((r) => r.data),
}

// Legacy-compatible default export (class-like singleton that wraps the new API)
const apiClient = {
  // Auth
  login: authApi.login,
  register: authApi.register,
  requestOtp: authApi.requestOtp,
  changePassword: authApi.changePassword,
  // Schools
  listSchools: schoolApi.list,
  createSchool: schoolApi.create,
  updateSchool: schoolApi.update,
  deleteSchool: schoolApi.delete,
  // Students
  listStudents: studentApi.list,
  getStudent: studentApi.getById,
  createStudent: studentApi.create,
  updateStudent: studentApi.update,
  deleteStudent: studentApi.delete,
  // Teachers
  listTeachers: teacherApi.list,
  getTeacher: teacherApi.getById,
  createTeacher: teacherApi.create,
  updateTeacher: teacherApi.update,
  deleteTeacher: teacherApi.delete,
  // Attendance
  listAttendance: attendanceApi.list,
  createAttendance: attendanceApi.create,
  updateAttendance: attendanceApi.update,
  deleteAttendance: attendanceApi.delete,
  getAttendanceSummary: attendanceApi.summary,
  bulkAttendance: attendanceApi.bulk,
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
  // Timetables
  listTimetables: timetableApi.list,
  createTimetable: timetableApi.create,
  updateTimetable: timetableApi.update,
  deleteTimetable: timetableApi.delete,
  // Periods
  listPeriods: periodApi.list,
  createPeriod: periodApi.create,
  updatePeriod: periodApi.update,
  deletePeriod: periodApi.delete,
  // Subjects
  listSubjects: subjectApi.list,
  createSubject: subjectApi.create,
  updateSubject: subjectApi.update,
  deleteSubject: subjectApi.delete,
  // Report Card
  getReportCard: reportCardApi.get,
  // Attendance Report
  getAttendanceReport: attendanceReportApi.get,
  // Homework
  listHomework: homeworkApi.list,
  createHomework: homeworkApi.create,
  updateHomework: homeworkApi.update,
  deleteHomework: homeworkApi.delete,
  // Portal Homework (teacher portal)
  createPortalHomework: portalHomeworkApi.create,
  updatePortalHomework: portalHomeworkApi.update,
  deletePortalHomework: portalHomeworkApi.delete,
  // Notifications
  listNotifications: notificationApi.list,
  sendNotification: notificationApi.send,
  getRecipientsCount: notificationApi.recipientsCount,
  deleteNotification: notificationApi.delete,
  // Library
  listBooks: libraryApi.listBooks,
  createBook: libraryApi.createBook,
  updateBook: libraryApi.updateBook,
  deleteBook: libraryApi.deleteBook,
  listBookIssues: libraryApi.listIssues,
  issueBook: libraryApi.issueBook,
  returnBook: libraryApi.returnBook,
  deleteBookIssue: libraryApi.deleteIssue,
  // Transport
  listVehicles: transportApi.listVehicles,
  getVehicle: transportApi.getVehicle,
  createVehicle: transportApi.createVehicle,
  updateVehicle: transportApi.updateVehicle,
  deleteVehicle: transportApi.deleteVehicle,
  listDrivers: transportApi.listDrivers,
  getDriver: transportApi.getDriver,
  createDriver: transportApi.createDriver,
  updateDriver: transportApi.updateDriver,
  deleteDriver: transportApi.deleteDriver,
  // Expenses
  listExpenses: expenseApi.list,
  createExpense: expenseApi.create,
  updateExpense: expenseApi.update,
  deleteExpense: expenseApi.delete,
  // Support
  listTickets: supportApi.list,
  createTicket: supportApi.create,
  updateTicket: supportApi.update,
  deleteTicket: supportApi.delete,
  // Leaves
  listLeaves: leaveApi.list,
  createLeave: leaveApi.create,
  updateLeave: leaveApi.update,
  deleteLeave: leaveApi.delete,
  // Holidays
  listHolidays: holidayApi.list,
  createHoliday: holidayApi.create,
  updateHoliday: holidayApi.update,
  deleteHoliday: holidayApi.delete,
  // Staff
  listStaff: staffApi.list,
  getStaff: staffApi.getById,
  createStaff: staffApi.create,
  updateStaff: staffApi.update,
  deleteStaff: staffApi.delete,
  // Hostel
  listHostels: hostelApi.listHostels,
  getHostel: hostelApi.getHostel,
  createHostel: hostelApi.createHostel,
  updateHostel: hostelApi.updateHostel,
  deleteHostel: hostelApi.deleteHostel,
  listHostelRooms: hostelApi.listRooms,
  createHostelRoom: hostelApi.createRoom,
  updateHostelRoom: hostelApi.updateRoom,
  deleteHostelRoom: hostelApi.deleteRoom,
  listHostelAllotments: hostelApi.listAllotments,
  createHostelAllotment: hostelApi.createAllotment,
  updateHostelAllotment: hostelApi.updateAllotment,
  deleteHostelAllotment: hostelApi.deleteAllotment,
  // Admissions
  listAdmissions: admissionApi.list,
  createAdmission: admissionApi.create,
  updateAdmission: admissionApi.update,
  deleteAdmission: admissionApi.delete,
}

export default apiClient
export { api as axiosInstance }
