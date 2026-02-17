import { useEffect, useState } from 'react'
import { SquarePen, Save } from 'lucide-react'
import apiClient from '../services/apiClient'

const AboutPage = () => {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schoolId, setSchoolId] = useState(null)
  const [schoolInfo, setSchoolInfo] = useState({
    name: '',
    boardType: '',
    address: '',
    contact: '',
    principal: '',
  })

  useEffect(() => {
    loadSchool()
  }, [])

  const loadSchool = async () => {
    try {
      const response = await apiClient.listSchools()
      const school = response?.data?.[0]
      if (school) {
        setSchoolId(school.id)
        setSchoolInfo({
          name: school.name || '',
          boardType: school.boardType || '',
          address: school.address || '',
          contact: school.contact || '',
          principal: school.principal || '',
        })
      }
    } catch (error) {
      console.error('Failed to load school info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (schoolId) {
        const response = await apiClient.updateSchool(schoolId, schoolInfo)
        const updated = response?.data
        if (updated) {
          setSchoolInfo({
            name: updated.name || '',
            boardType: updated.boardType || '',
            address: updated.address || '',
            contact: updated.contact || '',
            principal: updated.principal || '',
          })
        }
      } else {
        const response = await apiClient.createSchool(schoolInfo)
        const created = response?.data
        if (created) {
          setSchoolId(created.id)
          setSchoolInfo({
            name: created.name || '',
            boardType: created.boardType || '',
            address: created.address || '',
            contact: created.contact || '',
            principal: created.principal || '',
          })
        }
      }
      setEditing(false)
    } catch (error) {
      console.error('Failed to save school info:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>About School</h1>
        <button
          className="btn primary"
          onClick={() => (editing ? handleSave() : setEditing(true))}
          disabled={loading || saving}
        >
          {editing ? (
            saving ? (
              'Saving...'
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={16} />
                Save Changes
              </span>
            )
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <SquarePen size={16} style={{ color: '#16a34a' }} />
              Edit Info
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading school information...</div>
      ) : (

      <div className="about-container">
        <div className="about-card">
          <h3>School Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>School Name</label>
              {editing ? (
                <input
                  type="text"
                  value={schoolInfo.name}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, name: e.target.value })}
                />
              ) : (
                <p>{schoolInfo.name}</p>
              )}
            </div>
            <div className="info-item">
              <label>Board</label>
              {editing ? (
                <input
                  type="text"
                  value={schoolInfo.boardType}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, boardType: e.target.value })}
                />
              ) : (
                <p>{schoolInfo.boardType}</p>
              )}
            </div>
            <div className="info-item">
              <label>Principal</label>
              {editing ? (
                <input
                  type="text"
                  value={schoolInfo.principal}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, principal: e.target.value })}
                />
              ) : (
                <p>{schoolInfo.principal}</p>
              )}
            </div>
          </div>
        </div>

        <div className="about-card">
          <h3>Contact Information</h3>
          <div className="info-grid">
            <div className="info-item" style={{ gridColumn: '1 / -1' }}>
              <label>Address</label>
              {editing ? (
                <input
                  type="text"
                  value={schoolInfo.address}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
                />
              ) : (
                <p>{schoolInfo.address}</p>
              )}
            </div>
            <div className="info-item">
              <label>Phone</label>
              {editing ? (
                <input
                  type="tel"
                  value={schoolInfo.contact}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, contact: e.target.value })}
                />
              ) : (
                <p>{schoolInfo.contact}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

export default AboutPage
