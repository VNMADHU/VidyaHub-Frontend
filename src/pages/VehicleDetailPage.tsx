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

const ExpiryBadge = ({ label, date }) => {
  if (!date) return <InfoField label={label} value={null} />
  const d = new Date(date)
  const now = new Date()
  const daysLeft = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
  const isExpired = daysLeft < 0
  const isWarning = daysLeft >= 0 && daysLeft <= 30
  return (
    <div>
      <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
        <p style={{ margin: 0, fontSize: '1rem' }}>{d.toLocaleDateString('en-IN')}</p>
        {isExpired && (
          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
            Expired
          </span>
        )}
        {isWarning && (
          <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
            Expires in {daysLeft}d
          </span>
        )}
      </div>
    </div>
  )
}

const VehicleDetailPage = () => {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadVehicle() }, [vehicleId])

  const loadVehicle = async () => {
    try {
      setLoading(true)
      const res = await apiClient.getVehicle(vehicleId)
      setVehicle(res?.data || res)
      setError(null)
    } catch (err) {
      setError(`Failed to load vehicle details: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="page"><div className="loading-state">Loading vehicle details...</div></div>

  if (error) return (
    <div className="page">
      <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
      <button className="btn outline" onClick={() => navigate('/portal/transport')}>← Back to Transport</button>
    </div>
  )

  if (!vehicle) return (
    <div className="page">
      <p>Vehicle not found</p>
      <button className="btn outline" onClick={() => navigate('/portal/transport')}>← Back to Transport</button>
    </div>
  )

  const statusColors = {
    active: { bg: '#d1fae5', color: '#065f46' },
    maintenance: { bg: '#fef3c7', color: '#92400e' },
    inactive: { bg: '#fee2e2', color: '#991b1b' },
  }

  const stops = vehicle.routeStops
    ? vehicle.routeStops.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn outline" onClick={() => navigate('/portal/transport')} style={{ marginBottom: '0.5rem' }}>
            ← Back to Transport
          </button>
          <h1>🚌 {vehicle.vehicleNumber}</h1>
        </div>
        <span style={{
          padding: '0.35rem 1rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600,
          background: statusColors[vehicle.status]?.bg || '#e5e7eb',
          color: statusColors[vehicle.status]?.color || '#374151',
          alignSelf: 'center',
        }}>
          {vehicle.status}
        </span>
      </div>

      <div className="page-content-scrollable">

        {/* Stats */}
        <div className="stats-row" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <span className="stat-label">Vehicle Type</span>
            <span className="stat-number" style={{ textTransform: 'capitalize' }}>{vehicle.vehicleType}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Capacity</span>
            <span className="stat-number">{vehicle.capacity}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Route</span>
            <span className="stat-number">{vehicle.routeName || '—'}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Stops</span>
            <span className="stat-number">{stops.length}</span>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="form-card" style={{ marginBottom: '2rem' }}>
          <h2>Vehicle Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <InfoField label="Vehicle Number" value={vehicle.vehicleNumber} />
            <InfoField label="Vehicle Type" value={vehicle.vehicleType?.charAt(0).toUpperCase() + vehicle.vehicleType?.slice(1)} />
            <InfoField label="Capacity" value={`${vehicle.capacity} passengers`} />
            <InfoField label="Route Name" value={vehicle.routeName} />
          </div>
        </div>

        {/* Document Expiry */}
        <div className="form-card" style={{ marginBottom: '2rem' }}>
          <h2>Document Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <ExpiryBadge label="Insurance Expiry" date={vehicle.insuranceExpiry} />
            <ExpiryBadge label="Fitness Certificate Expiry" date={vehicle.fitnessExpiry} />
            <ExpiryBadge label="Permit Expiry" date={vehicle.permitExpiry} />
          </div>
        </div>

        {/* Route Stops */}
        {stops.length > 0 && (
          <div className="form-card" style={{ marginBottom: '2rem' }}>
            <h2>Route Stops</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
              {stops.map((stop, i) => (
                <span key={i} style={{
                  background: 'var(--bg-secondary, #f3f4f6)',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  padding: '0.3rem 0.9rem',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}>
                  {i + 1}. {stop}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Driver */}
        <div className="form-card">
          <h2>Assigned Driver</h2>
          {vehicle.driver ? (
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '1rem', cursor: 'pointer', padding: '1rem', borderRadius: '8px', background: 'var(--bg-secondary, #f9fafb)', border: '1px solid var(--border)' }}
              onClick={() => navigate(`/portal/transport/drivers/${vehicle.driver.id}`)}
            >
              <InfoField label="Name" value={`${vehicle.driver.firstName} ${vehicle.driver.lastName}`} />
              <InfoField label="Phone" value={vehicle.driver.phoneNumber} />
              <InfoField label="License Number" value={vehicle.driver.licenseNumber} />
              <InfoField label="License Type" value={vehicle.driver.licenseType} />
              <div>
                <label style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>Status</label>
                <p style={{ margin: '0.25rem 0 0' }}>
                  <span style={{
                    padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                    background: vehicle.driver.status === 'active' ? '#d1fae5' : '#fef3c7',
                    color: vehicle.driver.status === 'active' ? '#065f46' : '#92400e',
                  }}>{vehicle.driver.status}</span>
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1', textAlign: 'right' }}>
                <span style={{ color: 'var(--primary, #6366f1)', fontSize: '0.85rem', fontWeight: 600 }}>View Driver Profile →</span>
              </div>
            </div>
          ) : (
            <p style={{ margin: '1rem 0', color: 'var(--muted)' }}>No driver assigned to this vehicle.</p>
          )}
        </div>

      </div>
    </div>
  )
}

export default VehicleDetailPage
