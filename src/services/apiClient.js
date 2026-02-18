import logger from '../utils/logger'
import { API_BASE_URL, API_TIMEOUT, HTTP, STORAGE_KEYS } from '../utils/constants'

class ApiClient {
  constructor() {
    this._requestInterceptors = []
    this._responseInterceptors = []
  }

  /**
   * Register a request interceptor (receives and returns config).
   */
  onRequest(fn) {
    this._requestInterceptors.push(fn)
    return this
  }

  /**
   * Register a response interceptor (receives response, can transform).
   */
  onResponse(fn) {
    this._responseInterceptors.push(fn)
    return this
  }

  async request(endpoint, options = {}) {
    const start = performance.now()

    // Build initial config
    let config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-School-Id': localStorage.getItem(STORAGE_KEYS.SCHOOL_ID) || 'system',
        ...options.headers,
      },
    }

    // Inject auth token if available
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTH)
      if (stored) {
        const auth = JSON.parse(stored)
        if (auth?.state?.token) {
          config.headers['Authorization'] = `Bearer ${auth.state.token}`
        }
      }
    } catch {
      // ignore malformed storage
    }

    // Run request interceptors
    for (const interceptor of this._requestInterceptors) {
      config = interceptor(config) || config
    }

    // Abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)
    config.signal = controller.signal

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
      clearTimeout(timeoutId)

      const duration = Math.round(performance.now() - start)
      const method = (config.method || 'GET').toUpperCase()
      logger.api(method, endpoint, response.status, duration)

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))

        // Auto-logout on 401
        if (response.status === HTTP.UNAUTHORIZED) {
          logger.warn('Unauthorized — clearing session')
          localStorage.removeItem(STORAGE_KEYS.AUTH)
          if (window.location.pathname.startsWith('/portal')) {
            window.location.href = '/'
          }
        }

        const errorMessage =
          errorBody.message ||
          errorBody.issues?.map((i) => i.message).join(', ') ||
          `Request failed (${response.status})`

        throw new Error(errorMessage)
      }

      let data = await response.json()

      // Run response interceptors
      for (const interceptor of this._responseInterceptors) {
        data = interceptor(data) || data
      }

      return data
    } catch (error) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        logger.error('Request timed out', { endpoint })
        throw new Error('Request timed out. Please check your network connection.')
      }

      if (!error.message || error.message === 'Failed to fetch') {
        logger.error('Network error', { endpoint })
        throw new Error('Unable to connect to the server. Please check your internet connection.')
      }

      throw error
    }
  }

  // Auth endpoints
  async login(email, password, role) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    })
  }

  async register(email, password, schoolName) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, schoolName }),
    })
  }

  async requestOtp(email) {
    return this.request('/auth/otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  // School endpoints
  async listSchools() {
    return this.request('/schools')
  }

  async createSchool(data) {
    return this.request('/schools', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSchool(schoolId, data) {
    return this.request(`/schools/${schoolId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteSchool(schoolId) {
    return this.request(`/schools/${schoolId}`, {
      method: 'DELETE',
    })
  }

  // Student endpoints
  async listStudents() {
    return this.request('/students')
  }

  async createStudent(data) {
    return this.request('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateStudent(studentId, data) {
    return this.request(`/students/${studentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteStudent(studentId) {
    return this.request(`/students/${studentId}`, {
      method: 'DELETE',
    })
  }

  // Teacher endpoints
  async listTeachers() {
    return this.request('/teachers')
  }

  async createTeacher(data) {
    return this.request('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTeacher(teacherId, data) {
    return this.request(`/teachers/${teacherId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteTeacher(teacherId) {
    return this.request(`/teachers/${teacherId}`, {
      method: 'DELETE',
    })
  }

  // Attendance endpoints
  async listAttendance() {
    return this.request('/attendance')
  }

  async createAttendance(data) {
    return this.request('/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAttendance(attendanceId, data) {
    return this.request(`/attendance/${attendanceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteAttendance(attendanceId) {
    return this.request(`/attendance/${attendanceId}`, {
      method: 'DELETE',
    })
  }

  async getAttendanceSummary() {
    return this.request('/attendance/summary')
  }

  // Marks endpoints
  async listMarks() {
    return this.request('/marks')
  }

  async createMarks(data) {
    return this.request('/marks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateMarks(markId, data) {
    return this.request(`/marks/${markId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteMarks(markId) {
    return this.request(`/marks/${markId}`, {
      method: 'DELETE',
    })
  }

  async getMarksReport(studentId) {
    return this.request(`/marks/report?studentId=${studentId}`)
  }

  // Exam endpoints
  async listExams(params = {}) {
    const query = new URLSearchParams()
    if (params.classId) query.set('classId', params.classId)
    if (params.sectionId) query.set('sectionId', params.sectionId)
    const qs = query.toString()
    return this.request(`/exams${qs ? `?${qs}` : ''}`)
  }

  async createExam(data) {
    return this.request('/exams', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateExam(examId, data) {
    return this.request(`/exams/${examId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteExam(examId) {
    return this.request(`/exams/${examId}`, {
      method: 'DELETE',
    })
  }

  // Events endpoints
  async listEvents() {
    return this.request('/events')
  }

  async createEvent(data) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateEvent(eventId, data) {
    return this.request(`/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteEvent(eventId) {
    return this.request(`/events/${eventId}`, {
      method: 'DELETE',
    })
  }

  // Announcements endpoints
  async listAnnouncements() {
    return this.request('/announcements')
  }

  async createAnnouncement(data) {
    return this.request('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAnnouncement(announcementId, data) {
    return this.request(`/announcements/${announcementId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteAnnouncement(announcementId) {
    return this.request(`/announcements/${announcementId}`, {
      method: 'DELETE',
    })
  }

  // Achievement endpoints
  async listAchievements() {
    return this.request('/achievements')
  }

  async createAchievement(data) {
    return this.request('/achievements', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAchievement(achievementId, data) {
    return this.request(`/achievements/${achievementId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteAchievement(achievementId) {
    return this.request(`/achievements/${achievementId}`, {
      method: 'DELETE',
    })
  }

  // Sport endpoints
  async listSports() {
    return this.request('/sports')
  }

  async createSport(data) {
    return this.request('/sports', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSport(sportId, data) {
    return this.request(`/sports/${sportId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteSport(sportId) {
    return this.request(`/sports/${sportId}`, {
      method: 'DELETE',
    })
  }

  // Class endpoints
  async listClasses() {
    return this.request('/classes')
  }

  async createClass(data) {
    return this.request('/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateClass(classId, data) {
    return this.request(`/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteClass(classId) {
    return this.request(`/classes/${classId}`, {
      method: 'DELETE',
    })
  }

  // Section endpoints
  async listSections(classId = null) {
    const endpoint = classId ? `/sections?classId=${classId}` : '/sections'
    return this.request(endpoint)
  }

  async createSection(data) {
    return this.request('/sections', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSection(sectionId, data) {
    return this.request(`/sections/${sectionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteSection(sectionId) {
    return this.request(`/sections/${sectionId}`, {
      method: 'DELETE',
    })
  }

  // Portal endpoints (student/teacher self-service)
  async studentLogin(rollNumber) {
    return this.request('/portal/student-login', {
      method: 'POST',
      body: JSON.stringify({ rollNumber }),
    })
  }

  async teacherLogin(teacherId) {
    return this.request('/portal/teacher-login', {
      method: 'POST',
      body: JSON.stringify({ teacherId }),
    })
  }

  async getStudentProfile(studentId) {
    return this.request(`/portal/student/${studentId}`)
  }

  async getTeacherProfile(teacherId) {
    return this.request(`/portal/teacher/${teacherId}`)
  }

  // Fee endpoints
  async listFees(studentId = null) {
    const endpoint = studentId ? `/fees?studentId=${studentId}` : '/fees'
    return this.request(endpoint)
  }

  async createFee(data) {
    return this.request('/fees', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateFee(feeId, data) {
    return this.request(`/fees/${feeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async payFee(feeId, data) {
    return this.request(`/fees/${feeId}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteFee(feeId) {
    return this.request(`/fees/${feeId}`, {
      method: 'DELETE',
    })
  }

  async getStudentFees(studentId) {
    return this.request(`/fees/student/${studentId}`)
  }
}

export default new ApiClient()
