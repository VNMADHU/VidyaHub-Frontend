import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import apiClient from '../services/apiClient'
import { useConfirm } from '../components/ConfirmDialog'
import BulkImportModal from '../components/BulkImportModal'

const AttendancePage = () => {
  const { confirm } = useConfirm()
  const [attendance, setAttendance] = useState([])
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [showMarkForm, setShowMarkForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      loadSections(selectedClass)
    } else {
      setSections([])
      setSelectedSection('')
    }
  }, [selectedClass])

  const loadData = async () => {
    try {
      const [attendanceResponse, studentsResponse, classesResponse] = await Promise.all([
        apiClient.listAttendance(),
        apiClient.listStudents(),
        apiClient.listClasses(),
      ])
      console.log('Attendance data:', attendanceResponse)
      console.log('Students data:', studentsResponse)
      setAttendance(attendanceResponse?.data || [])
      setStudents(studentsResponse?.data || [])
      setClasses(classesResponse?.data || [])
    } catch (error) {
      console.error('Failed to load data:', error)
      alert(`Failed to load data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadSections = async (classId) => {
    try {
      const response = await apiClient.listSections(classId)
      setSections(response?.data || [])
    } catch (error) {
      console.error('Failed to load sections:', error)
    }
  }

  const markAttendance = async (studentId, status) => {
    try {
      const existing = attendance.find(
        (record) => record.studentId === studentId && record.date === selectedDate
      )
      if (existing) {
        await apiClient.updateAttendance(existing.id, { status })
      } else {
      await apiClient.createAttendance({
        studentId,
        date: selectedDate,
        status,
      })
      }
      loadData()
    } catch (error) {
      console.error('Failed to mark attendance:', error)
    }
  }

  const deleteAttendance = async (attendanceId) => {
    const confirmed = await confirm({
      message: 'Are you sure you want to delete this attendance record?',
    })
    if (!confirmed) return
    try {
      await apiClient.deleteAttendance(attendanceId)
      loadData()
    } catch (error) {
      console.error('Failed to delete attendance:', error)
    }
  }

  const handleBulkImportDone = async () => {
    await loadData()
  }

  const attendanceTemplateHeaders = ['studentId', 'date', 'status']

  const mapAttendanceRow = (row) => {
    if (!row.studentId || !row.date || !row.status) {
      return null
    }

    return {
      studentId: Number(row.studentId),
      date: String(row.date).trim(),
      status: String(row.status).toLowerCase().trim(),
    }
  }

  const todayAttendance = attendance.filter(
    (record) => {
      const recordDate = record.date?.split('T')[0] || record.date
      return recordDate === selectedDate
    }
  )

  const filteredStudents = students.filter(student => {
    if (selectedClass && student.classId !== Number(selectedClass)) return false
    if (selectedSection && student.sectionId !== Number(selectedSection)) return false
    return true
  })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Attendance</h1>
          <p>Track daily student attendance</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </button>
          <button className="btn primary" onClick={() => setShowMarkForm(!showMarkForm)}>
            {showMarkForm ? 'Cancel' : '✓ Mark Attendance'}
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-mini">
          <span className="stat-label">Class</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
        <div className="stat-mini">
          <span className="stat-label">Section</span>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedClass}
          >
            <option value="">All Sections</option>
            {sections.map(section => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>
        <div className="stat-mini">
          <span className="stat-label">Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
        <div className="stat-mini">
          <span className="stat-label">Total Students</span>
          <span className="stat-number">{filteredStudents.length}</span>
        </div>
        <div className="stat-mini">
          <span className="stat-label">Present Today</span>
          <span className="stat-number">{todayAttendance.filter(r => r.status === 'present').length}</span>
        </div>
        <div className="stat-mini">
          <span className="stat-label">Attendance Rate</span>
          <span className="stat-number">{filteredStudents.length > 0 ? Math.round((todayAttendance.filter(r => r.status === 'present').length / filteredStudents.length) * 100) : 0}%</span>
        </div>
      </div>

      <div className="page-content-scrollable">
      {showMarkForm && filteredStudents.length > 0 && (
        <div className="form-card">
          <h3>Mark Attendance for {selectedDate}</h3>
          <div className="attendance-list">
            {filteredStudents.map((student) => {
              const record = todayAttendance.find(r => r.studentId === student.id)
              return (
                <div key={student.id} className="attendance-item">
                  <span className="student-name">
                    {student.firstName} {student.lastName}
                  </span>
                  <div className="attendance-buttons">
                    <button
                      className={`btn-status ${record?.status === 'present' ? 'active-present' : ''}`}
                      onClick={() => markAttendance(student.id, 'present')}
                    >
                      ✓ Present
                    </button>
                    <button
                      className={`btn-status ${record?.status === 'absent' ? 'active-absent' : ''}`}
                      onClick={() => markAttendance(student.id, 'absent')}
                    >
                      ✗ Absent
                    </button>
                    <button
                      className={`btn-status ${record?.status === 'late' ? 'active-late' : ''}`}
                      onClick={() => markAttendance(student.id, 'late')}
                    >
                      ⏰ Late
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {showBulkImport && (
        <BulkImportModal
          title="Attendance"
          templateHeaders={attendanceTemplateHeaders}
          mapRowToPayload={mapAttendanceRow}
          createItem={(payload) => apiClient.createAttendance(payload)}
          onClose={() => setShowBulkImport(false)}
          onDone={handleBulkImportDone}
        />
      )}

      {showMarkForm && filteredStudents.length === 0 && (
        <div className="form-card">
          <p style={{ textAlign: 'center', padding: '2rem' }}>
            No students found in the selected class/section. Please add students first from the Students page.
          </p>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading attendance...</div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {todayAttendance.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-row">
                    No attendance marked for {selectedDate}
                  </td>
                </tr>
              ) : (
                todayAttendance.map((record) => {
                  const student = students.find(s => s.id === record.studentId)
                  return (
                    <tr key={record.id}>
                      <td>{record.date}</td>
                      <td>{student?.firstName} {student?.lastName}</td>
                      <td>
                        <span className={`status-badge ${record.status}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn-icon danger" onClick={() => deleteAttendance(record.id)} aria-label="Delete attendance">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  )
}

export default AttendancePage
