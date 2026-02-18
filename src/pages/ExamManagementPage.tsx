// @ts-nocheck
import { useEffect, useState } from 'react'
import { SquarePen, Trash2 } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import BulkImportModal from '@/components/BulkImportModal'

const ExamManagementPage = () => {
  const { confirm } = useConfirm()
  const [exams, setExams] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [formSections, setFormSections] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    classId: '',
    sectionId: '',
  })

  useEffect(() => {
    loadClasses()
  }, [])

  useEffect(() => {
    loadExams()
  }, [selectedClass, selectedSection])

  useEffect(() => {
    if (selectedClass) {
      loadSections(selectedClass)
    } else {
      setSections([])
      setSelectedSection('')
    }
  }, [selectedClass])

  useEffect(() => {
    if (formData.classId) {
      loadFormSections(formData.classId)
    } else {
      setFormSections([])
      setFormData(prev => ({ ...prev, sectionId: '' }))
    }
  }, [formData.classId])

  const loadClasses = async () => {
    try {
      const response = await apiClient.listClasses()
      setClasses(response?.data || [])
    } catch (error) {
      console.error('Failed to load classes:', error)
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

  const loadFormSections = async (classId) => {
    try {
      const response = await apiClient.listSections(classId)
      setFormSections(response?.data || [])
    } catch (error) {
      console.error('Failed to load form sections:', error)
    }
  }

  const loadExams = async () => {
    try {
      const params = {}
      if (selectedClass) params.classId = selectedClass
      if (selectedSection) params.sectionId = selectedSection
      const response = await apiClient.listExams(params)
      setExams(response?.data || [])
    } catch (error) {
      console.error('Failed to load exams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        name: formData.name,
        classId: formData.classId ? Number(formData.classId) : null,
        sectionId: formData.sectionId ? Number(formData.sectionId) : null,
      }
      if (editingId) {
        await apiClient.updateExam(editingId, payload)
      } else {
        await apiClient.createExam(payload)
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({ name: '', classId: '', sectionId: '' })
      loadExams()
    } catch (error) {
      console.error('Failed to save exam:', error)
    }
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData({ name: '', classId: '', sectionId: '' })
    setShowForm(true)
  }

  const handleEdit = (exam) => {
    setEditingId(exam.id)
    setFormData({
      name: exam.name || '',
      classId: exam.classId ? String(exam.classId) : '',
      sectionId: exam.sectionId ? String(exam.sectionId) : '',
    })
    setShowForm(true)
  }

  const handleDelete = async (examId) => {
    const confirmed = await confirm({
      message: 'Are you sure you want to delete this exam? All associated marks will be lost.',
    })
    if (!confirmed) return
    try {
      await apiClient.deleteExam(examId)
      loadExams()
    } catch (error) {
      console.error('Failed to delete exam:', error)
    }
  }

  const handleBulkImportDone = async () => {
    await loadExams()
  }

  const examTemplateHeaders = ['name', 'classId', 'sectionId']

  const mapExamRow = (row) => {
    if (!row.name) {
      return null
    }

    return {
      name: String(row.name).trim(),
      classId: row.classId ? Number(row.classId) : null,
      sectionId: row.sectionId ? Number(row.sectionId) : null,
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Exam Management</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </button>
          <button className="btn primary" onClick={() => showForm ? setShowForm(false) : handleAddNew()}>
            {showForm ? 'Cancel' : '+ Create Exam'}
          </button>
        </div>
      </div>

      <div className="stats-row" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-mini">
          <span className="stat-label">Class</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
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
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="page-content-scrollable">
      {showForm && (
        <div className="form-card">
          <h3>{editingId ? 'Edit Exam' : 'Create New Exam'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <input
              type="text"
              placeholder="Exam Name (e.g., Mid-Term 2026, Final Exam, Unit Test 1)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <select
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value, sectionId: '' })}
            >
              <option value="">Select Class (optional)</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            <select
              value={formData.sectionId}
              onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
              disabled={!formData.classId}
            >
              <option value="">Select Section (optional)</option>
              {formSections.map(sec => (
                <option key={sec.id} value={sec.id}>{sec.name}</option>
              ))}
            </select>
            <button type="submit" className="btn primary" style={{ gridColumn: '1 / -1' }}>
              {editingId ? 'Update Exam' : 'Create Exam'}
            </button>
          </form>
        </div>
      )}

      {showBulkImport && (
        <BulkImportModal
          title="Exams"
          templateHeaders={examTemplateHeaders}
          mapRowToPayload={mapExamRow}
          createItem={(payload) => apiClient.createExam(payload)}
          onClose={() => setShowBulkImport(false)}
          onDone={handleBulkImportDone}
        />
      )}

      {loading ? (
        <div className="loading-state">Loading exams...</div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Exam Name</th>
                <th>Class</th>
                <th>Section</th>
                <th>Total Marks Entries</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-row">
                    No exams found. Create your first exam!
                  </td>
                </tr>
              ) : (
                exams.map((exam) => (
                  <tr key={exam.id}>
                    <td>{exam.id}</td>
                    <td>{exam.name}</td>
                    <td>{exam.class?.name || '-'}</td>
                    <td>{exam.section?.name || '-'}</td>
                    <td>{exam.marks?.length || 0}</td>
                    <td>{exam.createdAt ? new Date(exam.createdAt).toLocaleDateString() : '-'}</td>
                    <td>
                      <button className="btn-icon edit" onClick={() => handleEdit(exam)} aria-label="Edit exam">
                        <SquarePen size={16} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDelete(exam.id)} aria-label="Delete exam">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  )
}

export default ExamManagementPage
