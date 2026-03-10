// @ts-nocheck
import { useState, useEffect } from 'react'
import { SquarePen, Trash2 } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import BulkImportModal from '@/components/BulkImportModal'
import SearchBar from '@/components/SearchBar'
import Modal from '../components/Modal'

const SportsPage = () => {
  const { confirm } = useConfirm()
  const [sports, setSports] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    coachName: '',
    schedule: '',
    description: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await apiClient.listSports()
      setSports(response?.data || [])
      setError(null)
    } catch (err) {
      setError(`Failed to load sports: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await apiClient.updateSport(editingId, formData)
      } else {
        await apiClient.createSport(formData)
      }
      setFormData({ name: '', coachName: '', schedule: '', description: '' })
      setEditingId(null)
      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(`Failed to save sport: ${err.message}`)
      console.error(err)
    }
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData({
      name: '',
      coachName: '',
      schedule: '',
      description: '',
    })
    setShowForm(true)
  }

  const handleEdit = (sport) => {
    setFormData({
      name: sport.name,
      coachName: sport.coachName,
      schedule: sport.schedule,
      description: sport.description,
    })
    setEditingId(sport.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      message: 'Are you sure you want to delete this sport?',
    })
    if (!confirmed) return
    try {
      await apiClient.deleteSport(id)
      await loadData()
    } catch (err) {
      setError(`Failed to delete sport: ${err.message}`)
      console.error(err)
    }
  }

  const handleBulkImportDone = async () => {
    await loadData()
  }

  const sportTemplateHeaders = ['name', 'coachName', 'schedule', 'description']

  const mapSportRow = (row) => {
    if (!row.name) {
      return null
    }

    return {
      name: String(row.name).trim(),
      coachName: row.coachName ? String(row.coachName).trim() : '',
      schedule: row.schedule ? String(row.schedule).trim() : '',
      description: row.description ? String(row.description).trim() : '',
    }
  }

  const filteredSports = sports.filter((sport) => {
    const query = searchQuery.toLowerCase()
    return (
      sport.name?.toLowerCase().includes(query) ||
      sport.coachName?.toLowerCase().includes(query) ||
      sport.schedule?.toLowerCase().includes(query) ||
      sport.description?.toLowerCase().includes(query)
    )
  })

  if (loading) return <div className="page">Loading...</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sports Activities</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </button>
          <button className="btn primary" onClick={handleAddNew}>
            + Add Sport
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'red', margin: '1rem 0' }}>{error}</div>}

      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search sports by name, coach, schedule, or description..."
      />

      <div className="page-content-scrollable">
      {showForm && (
        <Modal title={editingId ? 'Edit Sport' : 'Add New Sport'} onClose={() => setShowForm(false)} footer={<button type="submit" form="sport-form" className="btn primary">{editingId ? 'Update Sport' : 'Add Sport'}</button>}>
          <form id="sport-form" onSubmit={handleSubmit} className="form-grid">
            <label>
              <span className="field-label">Sport Name *</span>
              <input
                type="text"
                placeholder="Sport Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </label>
            <label>
              <span className="field-label">Coach Name</span>
              <input
                type="text"
                placeholder="Coach Name"
                value={formData.coachName}
                onChange={(e) => setFormData({ ...formData, coachName: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Schedule</span>
              <input
                type="text"
                placeholder="Schedule (e.g., Mon, Wed - 4PM)"
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span className="field-label">Description</span>
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="2"
              />
            </label>
          </form>
        </Modal>
      )}

      {showBulkImport && (
        <BulkImportModal
          title="Sports"
          templateHeaders={sportTemplateHeaders}
          mapRowToPayload={mapSportRow}
          createItem={(payload) => apiClient.createSport(payload)}
          onClose={() => setShowBulkImport(false)}
          onDone={handleBulkImportDone}
        />
      )}

      {filteredSports.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          {searchQuery ? 'No sports match your search.' : 'No sports found. Add your first sport!'}
        </div>
      ) : (
        <div className="sports-grid">
          {filteredSports.map((sport) => (
          <div key={sport.id} className="sport-card">
            <div className="sport-icon">⚽</div>
            <h3>{sport.name}</h3>
            <div className="sport-details">
              <p>👨‍🏫 Coach: {sport.coachName || 'N/A'}</p>
              <p>📅 {sport.schedule || 'No schedule'}</p>
              {sport.description && <p>📝 {sport.description}</p>}
            </div>
            <div className="sport-actions">
              <button className="btn-icon edit" onClick={() => handleEdit(sport)} aria-label="Edit sport">
                <SquarePen size={16} />
              </button>
              <button className="btn-icon danger" onClick={() => handleDelete(sport.id)} aria-label="Delete sport">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        </div>
      )}
      </div>
    </div>
  )
}

export default SportsPage
