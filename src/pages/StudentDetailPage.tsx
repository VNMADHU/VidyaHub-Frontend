// @ts-nocheck
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'

const StudentDetailPage = () => {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [marks, setMarks] = useState([])
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadStudentDetails()
  }, [studentId])

  const loadStudentDetails = async () => {
    try {
      setLoading(true)
      const [studentRes, attendanceRes, marksRes, achievementsRes] = await Promise.all([
        apiClient.request(`/students/${studentId}`),
        apiClient.listAttendance(),
        apiClient.listMarks(),
        apiClient.listAchievements(),
      ])

      setStudent(studentRes)
      
      // Filter data for this student
      setAttendance((attendanceRes?.data || []).filter(a => a.studentId === parseInt(studentId)))
      setMarks((marksRes?.data || []).filter(m => m.studentId === parseInt(studentId)))
      setAchievements((achievementsRes?.data || []).filter(a => a.studentId === parseInt(studentId)))
      
      setError(null)
    } catch (err) {
      setError(`Failed to load student details: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const calculateAttendanceRate = () => {
    if (attendance.length === 0) return 0
    const present = attendance.filter(a => a.status === 'present').length
    return Math.round((present / attendance.length) * 100)
  }

  const calculateAverageMarks = () => {
    if (marks.length === 0) return 0
    const total = marks.reduce((sum, m) => sum + (m.score || m.marks || 0), 0)
    return Math.round(total / marks.length)
  }

  if (loading) return <div className="page">Loading student details...</div>

  if (error) return (
    <div className="page">
      <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
      <button className="btn outline" onClick={() => navigate('/portal/students')}>
        ← Back to Students
      </button>
    </div>
  )

  if (!student) return (
    <div className="page">
      <p>Student not found</p>
      <button className="btn outline" onClick={() => navigate('/portal/students')}>
        ← Back to Students
      </button>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn outline" onClick={() => navigate('/portal/students')} style={{ marginBottom: '0.5rem' }}>
            ← Back to Students
          </button>
          <h1>Student Profile</h1>
        </div>
      </div>

      <div className="page-content-scrollable">
      {/* Profile Picture */}
      {student.profilePic && (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src={student.profilePic} alt="Profile" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)' }} />
        </div>
      )}

      {/* Personal Information */}
      <div className="form-card" style={{ marginBottom: '2rem' }}>
        <h2>Personal Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Full Name</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{student.firstName} {student.lastName}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Admission Number</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{student.admissionNumber}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Roll Number</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{student.rollNumber || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Email</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{student.email}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Date of Birth</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>
              {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Gender</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{student.gender || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Class</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>
              {student.class?.name || 'N/A'} {student.section?.name ? `- Section ${student.section.name}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Parent/Guardian Information */}
      <div className="form-card" style={{ marginBottom: '2rem' }}>
        <h2>Parent/Guardian Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Father's Name</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{student.fatherName || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Father's Contact</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{student.fatherContact || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Mother's Name</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{student.motherName || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Mother's Contact</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{student.motherContact || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Guardian's Name</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{student.guardianName || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Guardian's Contact</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{student.guardianContact || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-row" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <span className="stat-label">Total Attendance Records</span>
          <span className="stat-number">{attendance.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Attendance Rate</span>
          <span className="stat-number">{calculateAttendanceRate()}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Exams</span>
          <span className="stat-number">{marks.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Average Marks</span>
          <span className="stat-number">{calculateAverageMarks()}</span>
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="form-card" style={{ marginBottom: '2rem' }}>
          <h2>Achievements</h2>
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            {achievements.map((achievement) => (
              <div key={achievement.id} style={{ padding: '1rem', backgroundColor: 'var(--surface-alt)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem' }}>{achievement.title}</h3>
                    <p style={{ margin: 0, color: 'var(--muted)' }}>
                      {achievement.category} • {new Date(achievement.achievementDate).toLocaleDateString()}
                    </p>
                    {achievement.description && (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>{achievement.description}</p>
                    )}
                  </div>
                  <span style={{ fontSize: '2rem' }}>🏆</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Attendance */}
      <div className="form-card" style={{ marginBottom: '2rem' }}>
        <h2>Recent Attendance</h2>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.slice(0, 10).map((record) => (
                <tr key={record.id}>
                  <td>{new Date(record.date).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${record.status}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan="2" className="empty-row">No attendance records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exam Marks */}
      <div className="form-card">
        <h2>Exam Marks</h2>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Exam</th>
                <th>Subject</th>
                <th>Marks</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((mark) => (
                <tr key={mark.id}>
                  <td>{mark.exam?.name || 'N/A'}</td>
                  <td>{mark.subject || 'N/A'}</td>
                  <td>{mark.score || mark.marks || 'N/A'}</td>
                </tr>
              ))}
              {marks.length === 0 && (
                <tr>
                  <td colSpan="3" className="empty-row">No marks records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  )
}

export default StudentDetailPage
