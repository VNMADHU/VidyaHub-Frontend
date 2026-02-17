const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

class ApiClient {
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-School-Id': localStorage.getItem('schoolId') || 'system',
      ...options.headers,
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
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
  async listExams() {
    return this.request('/exams')
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
}

export default new ApiClient()
