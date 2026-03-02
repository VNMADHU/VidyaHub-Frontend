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

const DriverDetailPage = () => {
  const { driverId } = useParams()
  const navigate = useNavigate()
  const [driver, setDriver] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadDriver() }, [driverId])

  const loadDriver = async () => {
    try {
      setLoading(true)
      const res = await apiClient.getDriver(driverId)
      setDriver(res?.data || res)
      setError(null)
    } catch (err) {
      setError(`Failed to load driver details: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="page"><div className="loading-state">Loading driver details...</div></div>

  if (error) return (
    <div className="page">
      <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
      <button className="btn outline" onClick={() => navigate('/portal/transport')}>← Back to Transport</button>
    </div>
  )

  if (!driver) return (
    <div className="page">
      <p>Driver not found</p>
      <button className="btn outline" onClick={() => navigate('/portal/transport')}>← Back to Transport</button>
    </div>
  )

  const statusColors = {
    active: { bg: '#d1fae5', color: '#065f46' },
    'on-leave': { bg: '#fef3c7', color: '#92400e' },
    inactive: { bg: '#fee2e2', color: '#991b1b' },
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn outline" onClick={() => navigate('/portal/transport')} style={{ marginBottom: '0.5rem' }}>
            ← Back to Transport
          </button>
          <h1>🧑‍✈️ Driver Profile</h1>
        </div>
        <span style={{
          padding: '0.35rem 1rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600,
          background: statusColors[driver.status]?.bg || '#e5e7eb',
          color: statusColors[driver.status]?.color || '#374151',
          alignSelf: 'center',
        }}>
          {driver.status}
        </span>
      </div>

      <div className="page-content-scrollable">

        {/* Stats */}
        <div className="stats-row" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <span className="stat-label">Assigned Vehicles</span>
            <span className="stat-number">{driver.vehicles?.length || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Experience</span>
            <span className="stat-number">{driver.experience || '—'}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Blood Group</span>
            <span className="stat-number">{driver.bloodGroup || '—'}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">License Type</span>
            <span className="stat-number">{driver.licenseType || '—'}</span>
          </div>
        </div>

        {/* Personal Information */}
        <div className="form-card" style={{ marginBottom: '2rem' }}>
          <h2>Personal Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <InfoField label="Full Name" value={`${driver.firstName} ${driver.lastName}`} />
            <InfoField label="Phone Number" value={driver.phoneNumber} />
            <InfoField label="Date of Birth" value={driver.dateOfBirth ? new Date(driver.dateOfBirth).toLocaleDateString('en-IN') : null} />
            <InfoField label="Blood Group" value={driver.bloodGroup} />
            <InfoField label="Aadhaar Number" value={driver.aadhaarNumber} />
            <InfoField label="Emergency Contact" value={driver.emergencyContact} />
            {driver.address && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Address</label>
                <p style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>{driver.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* License & Professional Details */}
        <div className="form-card" style={{ marginBottom: '2rem' }}>
          <h2>License & Professional Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <InfoField label="License Number" value={driver.licenseNumber} />
            <InfoField label="License Type" value={driver.licenseType} />
            <InfoField label="License Expiry" value={driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString('en-IN') : null} />
            <InfoField label="RTO Badge Number" value={driver.badgeNumber} />
            <InfoField label="Experience" value={driver.experience} />
          </div>
        </div>

        {/* Assigned Vehicles */}
        <div className="form-card">
          <h2>Assigned Vehicles</h2>
          {driver.vehicles?.length > 0 ? (
            <div className="data-table" style={{ marginTop: '1rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Vehicle No.</th>
                    <th>Type</th>
                    <th>Capacity</th>
                    <th>Route</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {driver.vehicles.map((v) => (
                    <tr
                      key={v.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/portal/transport/vehicles/${v.id}`)}
                    >
                      <td style={{ fontWeight: 600 }}>{v.vehicleNumber}</td>
                      <td style={{ textTransform: 'capitalize' }}>{v.vehicleType}</td>
                      <td>{v.capacity}</td>
                      <td>{v.routeName || '—'}</td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                          background: v.status === 'active' ? '#d1fae5' : v.status === 'maintenance' ? '#fef3c7' : '#fee2e2',
                          color: v.status === 'active' ? '#065f46' : v.status === 'maintenance' ? '#92400e' : '#991b1b',
                        }}>{v.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ margin: '1rem 0', color: 'var(--muted)' }}>No vehicles assigned to this driver.</p>
          )}
        </div>

      </div>
    </div>
  )
}

export default DriverDetailPage
