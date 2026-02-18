// @ts-nocheck
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'

const TeacherDetailPage = () => {
  const { teacherId } = useParams()
  const navigate = useNavigate()
  const [teacher, setTeacher] = useState(null)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadTeacherDetails()
  }, [teacherId])

  const loadTeacherDetails = async () => {
    try {
      setLoading(true)
      const [teacherRes, classesRes] = await Promise.all([
        apiClient.request(`/teachers/${teacherId}`),
        apiClient.listClasses(),
      ])

      setTeacher(teacherRes)
      
      // Filter classes assigned to this teacher
      const teacherClasses = (classesRes?.data || []).filter(
        c => c.classTeacherId === parseInt(teacherId)
      )
      setClasses(teacherClasses)
      
      setError(null)
    } catch (err) {
      setError(`Failed to load teacher details: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="page">Loading teacher details...</div>

  if (error) return (
    <div className="page">
      <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
      <button className="btn outline" onClick={() => navigate('/portal/teachers')}>
        ← Back to Teachers
      </button>
    </div>
  )

  if (!teacher) return (
    <div className="page">
      <p>Teacher not found</p>
      <button className="btn outline" onClick={() => navigate('/portal/teachers')}>
        ← Back to Teachers
      </button>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn outline" onClick={() => navigate('/portal/teachers')} style={{ marginBottom: '0.5rem' }}>
            ← Back to Teachers
          </button>
          <h1>Teacher Profile</h1>
        </div>
      </div>

      <div className="page-content-scrollable">
      {/* Profile Picture */}
      {teacher.profilePic && (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src={teacher.profilePic} alt="Profile" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)' }} />
        </div>
      )}

      {/* Personal Information */}
      <div className="form-card" style={{ marginBottom: '2rem' }}>
        <h2>Personal Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Full Name</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{teacher.firstName} {teacher.lastName}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Employee ID</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{teacher.employeeId || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Teacher ID (Login)</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{teacher.teacherId || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Email</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{teacher.email}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Phone</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{teacher.phone || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Date of Birth</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>
              {teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Gender</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{teacher.gender || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Professional Information */}
      <div className="form-card" style={{ marginBottom: '2rem' }}>
        <h2>Professional Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Subject</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{teacher.subject || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Qualification</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{teacher.qualification || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Experience</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>
              {teacher.experience ? `${teacher.experience} years` : 'N/A'}
            </p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Joining Date</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>
              {teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Department</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{teacher.department || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Designation</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{teacher.designation || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Address Information */}
      {teacher.address && (
        <div className="form-card" style={{ marginBottom: '2rem' }}>
          <h2>Contact Information</h2>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Address</label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem', lineHeight: 1.6 }}>{teacher.address}</p>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="stats-row" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <span className="stat-label">Classes Assigned</span>
          <span className="stat-number">{classes.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Years of Experience</span>
          <span className="stat-number">{teacher.experience || 0}</span>
        </div>
      </div>

      {/* Assigned Classes */}
      <div className="form-card">
        <h2>Assigned Classes</h2>
        {classes.length > 0 ? (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Class Name</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls.id}>
                    <td>{cls.name}</td>
                    <td>
                      <span className="status-badge present">Class Teacher</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ margin: '1rem 0', color: 'var(--muted)' }}>No classes assigned yet</p>
        )}
      </div>
      </div>
    </div>
  )
}

export default TeacherDetailPage
