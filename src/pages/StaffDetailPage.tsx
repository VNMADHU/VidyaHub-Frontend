// @ts-nocheck
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'

const InfoField = ({ label, value }) => (
  <div>
    <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>{label}</label>
    <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{value || 'N/A'}</p>
  </div>
)

const STATUS_COLORS = {
  active: { bg: '#d1fae5', color: '#065f46' },
  'on-leave': { bg: '#fef3c7', color: '#92400e' },
  inactive: { bg: '#e5e7eb', color: '#374151' },
  terminated: { bg: '#fee2e2', color: '#991b1b' },
}

const StaffDetailPage = () => {
  const { staffId } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadStaff() }, [staffId])

  const loadStaff = async () => {
    try {
      setLoading(true)
      const res = await apiClient.getStaff(staffId)
      setMember(res?.data || res)
      setError(null)
    } catch (err) {
      setError(`Failed to load staff details: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="page"><div className="loading-state">Loading staff details...</div></div>

  if (error) return (
    <div className="page">
      <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
      <button className="btn outline" onClick={() => navigate('/portal/staff')}>← Back to Staff</button>
    </div>
  )

  if (!member) return (
    <div className="page">
      <p>Staff member not found</p>
      <button className="btn outline" onClick={() => navigate('/portal/staff')}>← Back to Staff</button>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn outline" onClick={() => navigate('/portal/staff')} style={{ marginBottom: '0.5rem' }}>
            ← Back to Staff
          </button>
          <h1>🧹 Staff Profile</h1>
        </div>
        <span style={{
          padding: '0.35rem 1rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600,
          background: STATUS_COLORS[member.status]?.bg || '#e5e7eb',
          color: STATUS_COLORS[member.status]?.color || '#374151',
          alignSelf: 'center',
        }}>
          {member.status}
        </span>
      </div>

      <div className="page-content-scrollable">

        {/* Stats row */}
        <div className="stats-row" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <span className="stat-label">Staff ID</span>
            <span className="stat-number" style={{ fontSize: '1rem' }}>{member.staffId || '—'}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Designation</span>
            <span className="stat-number" style={{ fontSize: '1rem' }}>{member.designation}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Department</span>
            <span className="stat-number" style={{ fontSize: '1rem' }}>{member.department || '—'}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Blood Group</span>
            <span className="stat-number">{member.bloodGroup || '—'}</span>
          </div>
        </div>

        {/* Personal Information */}
        <div className="form-card" style={{ marginBottom: '2rem' }}>
          <h2>Personal Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <InfoField label="Full Name" value={`${member.firstName} ${member.lastName}`} />
            <InfoField label="Staff ID" value={member.staffId} />
            <InfoField label="Gender" value={member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : null} />
            <InfoField label="Date of Birth" value={member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString('en-IN') : null} />
            <InfoField label="Blood Group" value={member.bloodGroup} />
            <InfoField label="Aadhaar Number" value={member.aadhaarNumber} />
          </div>
        </div>

        {/* Employment Information */}
        <div className="form-card" style={{ marginBottom: '2rem' }}>
          <h2>Employment Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <InfoField label="Designation" value={member.designation} />
            <InfoField label="Department" value={member.department} />
            <InfoField label="Joining Date" value={member.joiningDate ? new Date(member.joiningDate).toLocaleDateString('en-IN') : null} />
            <InfoField label="Salary" value={member.salary ? `₹${Number(member.salary).toLocaleString('en-IN')}` : null} />
          </div>
        </div>

        {/* Contact Information */}
        <div className="form-card" style={{ marginBottom: '2rem' }}>
          <h2>Contact Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <InfoField label="Phone Number" value={member.phoneNumber} />
            <InfoField label="Email" value={member.email} />
            <InfoField label="Emergency Contact" value={member.emergencyContact} />
            {member.address && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Address</label>
                <p style={{ margin: '0.25rem 0 0', fontSize: '1rem', lineHeight: 1.6 }}>{member.address}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default StaffDetailPage
