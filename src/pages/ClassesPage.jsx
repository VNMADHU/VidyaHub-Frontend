import { useState, useEffect } from 'react'
import { SquarePen, Trash2 } from 'lucide-react'
import apiClient from '../services/apiClient'
import { useConfirm } from '../components/ConfirmDialog'
import BulkImportModal from '../components/BulkImportModal'

const ClassesPage = () => {
  const { confirm } = useConfirm()
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ name: '' })
  const [sectionForm, setSectionForm] = useState({ classId: null, name: '' })
  const [showSectionForm, setShowSectionForm] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await apiClient.listClasses()
      setClasses(response?.data || [])
      
      // Load sections for each class
      const sectionsData = {}
      for (const cls of response?.data || []) {
        const sectionsRes = await apiClient.listSections(cls.id)
        sectionsData[cls.id] = sectionsRes?.data || []
      }
      setSections(sectionsData)
      setError(null)
    } catch (err) {
      setError(`Failed to load classes: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitClass = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await apiClient.updateClass(editingId, formData)
      } else {
        await apiClient.createClass(formData)
      }
      setFormData({ name: '' })
      setEditingId(null)
      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(`Failed to save class: ${err.message}`)
      console.error(err)
    }
  }

  const handleSubmitSection = async (e) => {
    e.preventDefault()
    try {
      if (editingSectionId) {
        await apiClient.updateSection(editingSectionId, sectionForm)
      } else {
        await apiClient.createSection(sectionForm)
      }
      setSectionForm({ classId: null, name: '' })
      setEditingSectionId(null)
      setShowSectionForm(false)
      await loadData()
    } catch (err) {
      setError(`Failed to save section: ${err.message}`)
      console.error(err)
    }
  }

  const handleBulkImportDone = async () => {
    await loadData()
  }

  const classTemplateHeaders = ['name']

  const mapClassRow = (row) => {
    if (!row.name) {
      return null
    }

    return {
      name: String(row.name).trim(),
    }
  }

  const handleEditClass = (cls) => {
    setFormData({ name: cls.name })
    setEditingId(cls.id)
    setShowForm(true)
  }

  const handleDeleteClass = async (id) => {
    const confirmed = await confirm({
      message: 'Delete this class? This will also remove associated sections.',
    })
    if (!confirmed) return
    try {
      await apiClient.deleteClass(id)
      await loadData()
    } catch (err) {
      setError(`Failed to delete class: ${err.message}`)
      console.error(err)
    }
  }

  const handleEditSection = (section) => {
    setSectionForm({ classId: section.classId, name: section.name })
    setEditingSectionId(section.id)
    setShowSectionForm(true)
  }

  const handleDeleteSection = async (id) => {
    const confirmed = await confirm({
      message: 'Delete this section?',
    })
    if (!confirmed) return
    try {
      await apiClient.deleteSection(id)
      await loadData()
    } catch (err) {
      setError(`Failed to delete section: ${err.message}`)
      console.error(err)
    }
  }

  const openSectionForm = (classId) => {
    setSectionForm({ classId, name: '' })
    setEditingSectionId(null)
    setShowSectionForm(true)
  }

  if (loading) return <div className="page">Loading...</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Classes & Sections</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </button>
          <button className="btn primary" onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: '' }) }}>
            {showForm ? 'Cancel' : '+ Add Class'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'red', margin: '1rem 0' }}>{error}</div>}

      {showForm && (
        <div className="form-card">
          <h3>{editingId ? 'Edit Class' : 'Add New Class'}</h3>
          <form onSubmit={handleSubmitClass} className="form-grid">
            <input
              type="text"
              placeholder="Class Name (e.g., LKG, UKG, 1, 2, etc.)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <button type="submit" className="btn primary">
              {editingId ? 'Update Class' : 'Add Class'}
            </button>
          </form>
        </div>
      )}

      {showBulkImport && (
        <BulkImportModal
          title="Classes"
          templateHeaders={classTemplateHeaders}
          mapRowToPayload={mapClassRow}
          createItem={(payload) => apiClient.createClass(payload)}
          onClose={() => setShowBulkImport(false)}
          onDone={handleBulkImportDone}
        />
      )}

      {showSectionForm && (
        <div className="modal-overlay" onClick={() => { setShowSectionForm(false); setSectionForm({ classId: null, name: '' }); setEditingSectionId(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSectionId ? 'Edit Section' : 'Add Section'}</h3>
              <button className="modal-close" onClick={() => { setShowSectionForm(false); setSectionForm({ classId: null, name: '' }); setEditingSectionId(null) }}>✕</button>
            </div>
            <form onSubmit={handleSubmitSection} className="form-grid">
              <select
                value={sectionForm.classId || ''}
                onChange={(e) => setSectionForm({ ...sectionForm, classId: Number(e.target.value) })}
                required
                disabled={editingSectionId}
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    Class {cls.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Section Name (e.g., A, B, C)"
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                required
              />
              <div style={{ display: 'flex', gap: '0.5rem', gridColumn: '1 / -1' }}>
                <button type="submit" className="btn primary">
                  {editingSectionId ? 'Update Section' : 'Add Section'}
                </button>
                <button type="button" onClick={() => { setShowSectionForm(false); setSectionForm({ classId: null, name: '' }); setEditingSectionId(null) }} className="btn outline">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        {classes.map((cls) => (
          <div key={cls.id} className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Class {cls.name}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-icon edit" onClick={() => handleEditClass(cls)} aria-label="Edit class">
                  <SquarePen size={16} />
                </button>
                <button className="btn-icon danger" onClick={() => handleDeleteClass(cls.id)} aria-label="Delete class">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginTop: 0 }}>Sections:</h4>
              {(sections[cls.id]?.length > 0) ? (
                <div>
                  {sections[cls.id]?.map(section => (
                    <div key={section.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '0.25rem', marginBottom: '0.5rem' }}>
                      <span>📚 Section {section.name}</span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn-icon edit" onClick={() => handleEditSection(section)} aria-label="Edit section">
                          <SquarePen size={16} />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDeleteSection(section.id)} aria-label="Delete section">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#666', fontSize: '0.9rem' }}>No sections yet</p>
              )}
            </div>

            <button
              className="btn secondary"
              style={{ width: '100%' }}
              onClick={() => openSectionForm(cls.id)}
            >
              + Add Section
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ClassesPage
