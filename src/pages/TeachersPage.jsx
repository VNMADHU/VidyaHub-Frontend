import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SquarePen, Trash2 } from 'lucide-react'
import apiClient from '../services/apiClient'
import { useConfirm } from '../components/ConfirmDialog'
import BulkImportModal from '../components/BulkImportModal'
import SearchBar from '../components/SearchBar'

const TeachersPage = () => {
  const navigate = useNavigate()
  const { confirm } = useConfirm()
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    subject: '',
    qualification: '',
    experience: '',
  })

  useEffect(() => {
    loadTeachers()
  }, [])

  const loadTeachers = async () => {
    try {
      const response = await apiClient.listTeachers()
      setTeachers(response?.data || [])
    } catch (error) {
      console.error('Failed to load teachers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await apiClient.updateTeacher(editingId, formData)
      } else {
        await apiClient.createTeacher(formData)
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        subject: '',
        qualification: '',
        experience: '',
      })
      loadTeachers()
    } catch (error) {
      console.error('Failed to create teacher:', error)
    }
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      subject: '',
      qualification: '',
      experience: '',
    })
    setShowForm(true)
  }

  const handleEdit = (teacher) => {
    setEditingId(teacher.id)
    setFormData({
      firstName: teacher.firstName || '',
      lastName: teacher.lastName || '',
      email: teacher.email || '',
      phoneNumber: teacher.phoneNumber || '',
      subject: teacher.subject || '',
      qualification: teacher.qualification || '',
      experience: teacher.experience || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (teacherId) => {
    const confirmed = await confirm({
      message: 'Are you sure you want to delete this teacher? This action cannot be undone.',
    })
    if (!confirmed) return
    try {
      await apiClient.deleteTeacher(teacherId)
      loadTeachers()
    } catch (error) {
      console.error('Failed to delete teacher:', error)
    }
  }

  const handleBulkImportDone = async () => {
    await loadTeachers()
  }

  const teacherTemplateHeaders = [
    'firstName',
    'lastName',
    'email',
    'phoneNumber',
    'subject',
    'qualification',
    'experience',
  ]

  const mapTeacherRow = (row) => {
    if (!row.firstName || !row.lastName || !row.email) {
      return null
    }

    return {
      firstName: String(row.firstName).trim(),
      lastName: String(row.lastName).trim(),
      email: String(row.email).trim(),
      phoneNumber: row.phoneNumber ? String(row.phoneNumber).trim() : '',
      subject: row.subject ? String(row.subject).trim() : '',
      qualification: row.qualification ? String(row.qualification).trim() : '',
      experience: row.experience ? String(row.experience).trim() : '',
    }
  }

  const filteredTeachers = teachers.filter((teacher) => {
    const query = searchQuery.toLowerCase()
    return (
      teacher.firstName?.toLowerCase().includes(query) ||
      teacher.lastName?.toLowerCase().includes(query) ||
      teacher.email?.toLowerCase().includes(query) ||
      teacher.phoneNumber?.toLowerCase().includes(query) ||
      teacher.subject?.toLowerCase().includes(query) ||
      teacher.qualification?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1>Teachers</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </button>
          <button className="btn primary" onClick={() => showForm ? setShowForm(false) : handleAddNew()}>
            {showForm ? 'Cancel' : '+ Add Teacher'}
          </button>
        </div>
      </div>

      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search teachers by name, email, phone, subject, or qualification..."
      />

      <div className="page-content-scrollable">
      {showForm && (
        <div className="form-card">
          <h3>{editingId ? 'Edit Teacher' : 'Add New Teacher'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <input
              type="text"
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
            <input
              type="text"
              placeholder="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
            <input
              type="text"
              placeholder="Qualification"
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
            />
            <input
              type="number"
              placeholder="Years of Experience"
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
            />
            <button type="submit" className="btn primary">
              {editingId ? 'Update Teacher' : 'Add Teacher'}
            </button>
          </form>
        </div>
      )}

      {showBulkImport && (
        <BulkImportModal
          title="Teachers"
          templateHeaders={teacherTemplateHeaders}
          mapRowToPayload={mapTeacherRow}
          createItem={(payload) => apiClient.createTeacher(payload)}
          onClose={() => setShowBulkImport(false)}
          onDone={handleBulkImportDone}
        />
      )}

      {loading ? (
        <div className="loading-state">Loading teachers...</div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Subject</th>
                <th>Qualification</th>
                <th>Experience</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-row">
                    {searchQuery ? 'No teachers match your search.' : 'No teachers found. Add your first teacher!'}
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr 
                    key={teacher.id}
                    onClick={() => navigate(`/portal/teachers/${teacher.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{teacher.firstName} {teacher.lastName}</td>
                    <td>{teacher.email}</td>
                    <td>{teacher.phoneNumber}</td>
                    <td>{teacher.subject}</td>
                    <td>{teacher.qualification}</td>
                    <td>{teacher.experience} years</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="btn-icon edit" onClick={() => handleEdit(teacher)} aria-label="Edit teacher">
                        <SquarePen size={16} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDelete(teacher.id)} aria-label="Delete teacher">
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

export default TeachersPage
