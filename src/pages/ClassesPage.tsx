// @ts-nocheck
import { useState, useEffect } from 'react'
import { SquarePen, Trash2 } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import BulkImportModal from '@/components/BulkImportModal'
import SearchBar from '@/components/SearchBar'
import Modal from '../components/Modal'

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
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredClasses = classes.filter((cls) => {
    const query = searchQuery.toLowerCase()
    const hasSectionMatch = sections[cls.id]?.some(section => 
      section.name?.toLowerCase().includes(query)
    )
    return (
      cls.name?.toLowerCase().includes(query) ||
      hasSectionMatch
    )
  })

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
          <button className="btn primary" onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '' }) }}>
            + Add Class
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'red', margin: '1rem 0' }}>{error}</div>}

      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search classes or sections..."
      />

      <div className="page-content-scrollable">
        {showForm && (
        <Modal title={editingId ? 'Edit Class' : 'Add New Class'} onClose={() => setShowForm(false)} footer={<button type="submit" form="class-form" className="btn primary">{editingId ? 'Update Class' : 'Add Class'}</button>}>
          <form id="class-form" onSubmit={handleSubmitClass} className="form-grid">
            <label>
              <span className="field-label">Class Name *</span>
              <input
                type="text"
                placeholder="Class Name * (e.g., LKG, UKG, 1, 2, etc.)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </label>
          </form>
        </Modal>
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
        <Modal
          title={editingSectionId ? 'Edit Section' : 'Add Section'}
          onClose={() => { setShowSectionForm(false); setSectionForm({ classId: null, name: '' }); setEditingSectionId(null) }}
          footer={
            <button type="submit" form="section-form" className="btn primary">
              {editingSectionId ? 'Update Section' : 'Add Section'}
            </button>
          }
        >
          <form id="section-form" onSubmit={handleSubmitSection} className="form-grid">
            <label>
              <span className="field-label">Class *</span>
              <select
                value={sectionForm.classId || ''}
                onChange={(e) => setSectionForm({ ...sectionForm, classId: Number(e.target.value) })}
                required
                disabled={editingSectionId}
              >
                <option value="">Select Class *</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    Class {cls.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Section Name *</span>
              <input
                type="text"
                placeholder="Section Name * (e.g., A, B, C)"
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                required
              />
            </label>
          </form>
        </Modal>
      )}

      {filteredClasses.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          {searchQuery ? 'No classes or sections match your search.' : 'No classes found. Add your first class!'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
          {filteredClasses.map((cls) => (
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
      )}
      </div>
    </div>
  )
}

export default ClassesPage
