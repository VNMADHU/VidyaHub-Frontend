// @ts-nocheck
import { useEffect, useState } from 'react'
import apiClient from '@/services/api'
import { useToast } from '@/components/ToastContainer'
import BulkImportModal from '@/components/BulkImportModal'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'

const AttendancePage = () => {
  const toast = useToast()
  const [attendance, setAttendance] = useState([])
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
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
      setAttendance(attendanceResponse?.data || [])
      setStudents(studentsResponse?.data || [])
      setClasses(classesResponse?.data || [])
    } catch (error) {
      console.error('Failed to load data:', error)
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
    setSaving(prev => ({ ...prev, [studentId]: true }))
    try {
      const existing = todayAttendance.find(r => r.studentId === studentId)
      if (existing) {
        await apiClient.updateAttendance(existing.id, { status })
        // Update local state immediately for responsiveness
        setAttendance(prev =>
          prev.map(r => r.id === existing.id ? { ...r, status } : r)
        )
      } else {
        const res = await apiClient.createAttendance({
          studentId,
          date: selectedDate,
          status,
        })
        setAttendance(prev => [...prev, res.data])
      }
    } catch (error) {
      console.error('Failed to mark attendance:', error)
      toast.error(error?.message || 'Failed to mark attendance.')
      loadData() // Reload on error to get accurate state
    } finally {
      setSaving(prev => ({ ...prev, [studentId]: false }))
    }
  }

  const markAllAs = async (status) => {
    const toCreate = filteredStudents
      .filter(s => !todayAttendance.find(r => r.studentId === s.id))
      .map(s => s.id)
    const toUpdate = filteredStudents
      .filter(s => {
        const record = todayAttendance.find(r => r.studentId === s.id)
        return record && record.status !== status
      })
      .map(s => todayAttendance.find(r => r.studentId === s.id).id)

    if (toCreate.length === 0 && toUpdate.length === 0) return

    const savingState = {}
    filteredStudents.forEach(s => { savingState[s.id] = true })
    setSaving(savingState)

    try {
      await apiClient.bulkAttendance({ date: selectedDate, status, toCreate, toUpdate })
      await loadData()
    } catch (error) {
      console.error('Failed to mark all:', error)
      toast.error(error?.message || 'Failed to mark all attendance.')
      await loadData()
    } finally {
      setSaving({})
    }
  }

  const handleBulkImportDone = async () => {
    await loadData()
  }

  const attendanceTemplateHeaders = ['studentId', 'date', 'status']

  const mapAttendanceRow = (row) => {
    if (!row.studentId || !row.date || !row.status) return null
    return {
      studentId: Number(row.studentId),
      date: String(row.date).trim(),
      status: String(row.status).toLowerCase().trim(),
    }
  }

  const todayAttendance = attendance.filter(record => {
    const recordDate = record.date?.split('T')[0] || record.date
    return recordDate === selectedDate
  })

  const filteredStudents = students.filter(student => {
    if (selectedClass && student.classId !== Number(selectedClass)) return false
    if (selectedSection && student.sectionId !== Number(selectedSection)) return false
    return true
  })

  const { paginatedItems: paginatedStudents, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredStudents, 20)

  const presentCount = todayAttendance.filter(r => r.status === 'present').length
  const absentCount = todayAttendance.filter(r => r.status === 'absent').length
  const lateCount = todayAttendance.filter(r => r.status === 'late').length
  const unmarkedCount = filteredStudents.length - todayAttendance.filter(r => filteredStudents.some(s => s.id === r.studentId)).length
  const attendanceRate = filteredStudents.length > 0 
    ? Math.round(((presentCount + lateCount) / filteredStudents.length) * 100) 
    : 0

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
              <option key={cls.id} value={cls.id}>{cls.name}</option>
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
              <option key={section.id} value={section.id}>{section.name}</option>
            ))}
          </select>
        </div>
        <div className="stat-mini">
          <span className="stat-label">Date</span>
          <input
            type="date"
            title="Attendance Date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
        <div className="stat-mini">
          <span className="stat-label">Total</span>
          <span className="stat-number">{filteredStudents.length}</span>
        </div>
        <div className="stat-mini">
          <span className="stat-label">Present</span>
          <span className="stat-number" style={{ color: '#10b981' }}>{presentCount}</span>
        </div>
        <div className="stat-mini">
          <span className="stat-label">Absent</span>
          <span className="stat-number" style={{ color: '#ef4444' }}>{absentCount}</span>
        </div>
        <div className="stat-mini">
          <span className="stat-label">Rate</span>
          <span className="stat-number">{attendanceRate}%</span>
        </div>
      </div>

      <div className="page-content-scrollable">
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

        {loading ? (
          <div className="loading-state">Loading attendance...</div>
        ) : (
          <>
            {/* Quick Actions Bar */}
            {filteredStudents.length > 0 && (
              <div className="attendance-actions-bar">
                <span className="attendance-actions-label">Quick Actions:</span>
                <button className="btn-mark-all present" onClick={() => markAllAs('present')}>
                  ✓ Mark All Present
                </button>
                <button className="btn-mark-all absent" onClick={() => markAllAs('absent')}>
                  ✗ Mark All Absent
                </button>
                {unmarkedCount > 0 && (
                  <span className="unmarked-badge">{unmarkedCount} unmarked</span>
                )}
              </div>
            )}

            {/* Attendance List */}
            <div className="attendance-list">
              {filteredStudents.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                  No students found. Select a class or add students first.
                </div>
              ) : (
                paginatedStudents.map((student) => {
                  const record = todayAttendance.find(r => r.studentId === student.id)
                  const isSaving = saving[student.id]
                  const cls = classes.find(c => c.id === student.classId)
                  return (
                    <div key={student.id} className={`attendance-item ${record ? '' : 'unmarked'}`}>
                      <div className="attendance-student-info">
                        <span className="student-name">
                          {student.firstName} {student.lastName}
                        </span>
                        <span className="student-meta">
                          {cls?.name || ''}{student.rollNumber ? ` • Roll: ${student.rollNumber}` : ''}
                        </span>
                      </div>
                      <div className="attendance-buttons">
                        <button
                          className={`btn-status ${record?.status === 'present' ? 'active-present' : ''}`}
                          onClick={() => markAttendance(student.id, 'present')}
                          disabled={isSaving}
                        >
                          ✓ Present
                        </button>
                        <button
                          className={`btn-status ${record?.status === 'absent' ? 'active-absent' : ''}`}
                          onClick={() => markAttendance(student.id, 'absent')}
                          disabled={isSaving}
                        >
                          ✗ Absent
                        </button>
                        <button
                          className={`btn-status ${record?.status === 'late' ? 'active-late' : ''}`}
                          onClick={() => markAttendance(student.id, 'late')}
                          disabled={isSaving}
                        >
                          ⏰ Late
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={goToPage} />
          </>
        )}
      </div>
    </div>
  )
}

export default AttendancePage
