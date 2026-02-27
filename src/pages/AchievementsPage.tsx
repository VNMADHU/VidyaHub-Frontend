// @ts-nocheck
import { useState, useEffect } from 'react'
import { SquarePen, Trash2 } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import BulkImportModal from '@/components/BulkImportModal'
import SearchBar from '@/components/SearchBar'

const AchievementsPage = () => {
  const { confirm } = useConfirm()
  const [achievements, setAchievements] = useState([])
  const [students, setStudents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    studentId: '',
    title: '',
    category: 'academic',
    date: '',
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
      const [achievementsRes, studentsRes] = await Promise.all([
        apiClient.listAchievements(),
        apiClient.listStudents(),
      ])
      setAchievements(achievementsRes?.data || [])
      setStudents(studentsRes?.data || [])
      setError(null)
    } catch (err) {
      setError(`Failed to load data: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await apiClient.updateAchievement(editingId, formData)
      } else {
        await apiClient.createAchievement(formData)
      }
      setFormData({ studentId: '', title: '', category: 'academic', date: '', description: '' })
      setEditingId(null)
      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(`Failed to save achievement: ${err.message}`)
      console.error(err)
    }
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData({
      studentId: '',
      title: '',
      category: 'academic',
      date: '',
      description: '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEdit = (achievement) => {
    setFormData({
      studentId: achievement.studentId,
      title: achievement.title,
      category: achievement.category,
      date: achievement.achievementDate?.split('T')[0],
      description: achievement.description,
    })
    setEditingId(achievement.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      message: 'Are you sure you want to delete this achievement?',
    })
    if (!confirmed) return
    try {
      await apiClient.deleteAchievement(id)
      await loadData()
    } catch (err) {
      setError(`Failed to delete achievement: ${err.message}`)
      console.error(err)
    }
  }

  const handleBulkImportDone = async () => {
    await loadData()
  }

  const achievementTemplateHeaders = [
    'studentId',
    'title',
    'category',
    'date',
    'description',
  ]

  const mapAchievementRow = (row) => {
    if (!row.studentId || !row.title || !row.date) {
      return null
    }

    return {
      studentId: Number(row.studentId),
      title: String(row.title).trim(),
      category: row.category ? String(row.category).trim() : 'academic',
      date: String(row.date).trim(),
      description: row.description ? String(row.description).trim() : '',
    }
  }

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId)
    return student ? `${student.firstName} ${student.lastName}` : 'Unknown'
  }

  const filteredAchievements = achievements.filter((achievement) => {
    const query = searchQuery.toLowerCase()
    const studentName = getStudentName(achievement.studentId).toLowerCase()
    return (
      achievement.title?.toLowerCase().includes(query) ||
      studentName.includes(query) ||
      achievement.description?.toLowerCase().includes(query) ||
      achievement.category?.toLowerCase().includes(query)
    )
  })

  if (loading) return <div className="page">Loading...</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Achievements</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </button>
          <button className="btn primary" onClick={() => showForm ? setShowForm(false) : handleAddNew()}>
            {showForm ? 'Cancel' : '+ Add Achievement'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'red', margin: '1rem 0' }}>{error}</div>}

      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search achievements by title, student name, description, or category..."
      />

      <div className="page-content-scrollable">
      {showForm && (
        <div className="form-card">
          <h3>{editingId ? 'Edit Achievement' : 'Add New Achievement'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <select
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: Number(e.target.value) })}
              required
            >
              <option value="">Select Student *</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Achievement Title *"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="academic">Academic</option>
              <option value="sports">Sports</option>
              <option value="cultural">Cultural</option>
              <option value="other">Other</option>
            </select>
            <input
              type="date"
              title="Achievement Date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              style={{ gridColumn: '1 / -1' }}
            />
            <button type="submit" className="btn primary">
              {editingId ? 'Update Achievement' : 'Add Achievement'}
            </button>
          </form>
        </div>
      )}

      {showBulkImport && (
        <BulkImportModal
          title="Achievements"
          templateHeaders={achievementTemplateHeaders}
          mapRowToPayload={mapAchievementRow}
          createItem={(payload) => apiClient.createAchievement(payload)}
          onClose={() => setShowBulkImport(false)}
          onDone={handleBulkImportDone}
        />
      )}

      {filteredAchievements.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          {searchQuery ? 'No achievements match your search.' : 'No achievements found. Add your first achievement!'}
        </div>
      ) : (
        <div className="achievements-grid">
          {filteredAchievements.map((achievement) => (
          <div key={achievement.id} className="achievement-card">
            <div className="achievement-icon">🏆</div>
            <h3>{achievement.title}</h3>
            <p className="achievement-student">{getStudentName(achievement.studentId)}</p>
            <p className="achievement-description">{achievement.description}</p>
            <div className="achievement-footer">
              <span className="achievement-date">📅 {new Date(achievement.achievementDate).toLocaleDateString()}</span>
              <span className={`event-badge ${achievement.category?.toLowerCase()}`}>
                {achievement.category}
              </span>
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <button className="btn-icon edit" onClick={() => handleEdit(achievement)} aria-label="Edit achievement">
                <SquarePen size={16} />
              </button>
              <button className="btn-icon danger" onClick={() => handleDelete(achievement.id)} aria-label="Delete achievement">
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

export default AchievementsPage
