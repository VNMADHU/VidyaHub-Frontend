// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SquarePen, Trash2, Printer } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import BulkImportModal from '@/components/BulkImportModal'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { useToast } from '@/components/ToastContainer'
import { exportToCSV, exportToPDF, exportButtonStyle, printTable } from '@/utils/exportUtils'
import Modal from '../components/Modal'

// Validation helpers
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validateTeacherForm = (data) => {
  const errors = []
  if (!data.teacherId) {
    errors.push('Teacher ID is required.')
  }
  if (!data.gender) {
    errors.push('Gender is required.')
  }
  if (!data.dateOfBirth) {
    errors.push('Date of Birth is required.')
  }
  if (!data.joiningDate) {
    errors.push('Joining Date is required.')
  }
  if (data.email && !EMAIL_REGEX.test(data.email)) {
    errors.push('Please enter a valid email address.')
  }
  if (data.phoneNumber && !INDIAN_PHONE_REGEX.test(data.phoneNumber)) {
    errors.push('Phone Number must be a valid 10-digit Indian mobile number (starting with 6-9).')
  }
  return errors
}

const TeachersPage = () => {
  const navigate = useNavigate()
  const { confirm } = useConfirm()
  const toast = useToast()
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formErrors, setFormErrors] = useState([])
  const EMPTY_TEACHER_FORM = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    subject: '',
    qualification: '',
    experience: '',
    teacherId: '',
    profilePic: '',
    dateOfBirth: '',
    designation: '',
    department: '',
    joiningDate: '',
    address: '',
    aadhaarNumber: '',
    panNumber: '',
    gender: '',
    bloodGroup: '',
    salary: '',
  }
  const [formData, setFormData] = useState(EMPTY_TEACHER_FORM)
  const [subjects, setSubjects] = useState([])
  const [teacherDesignations, setTeacherDesignations] = useState([])

  useEffect(() => {
    loadTeachers()
  }, [])

  const loadTeachers = async () => {
    try {
      const [response, subjectsRes, designationsRes] = await Promise.all([
        apiClient.listTeachers(),
        apiClient.listSubjects(),
        apiClient.listMasterData('teacher-designations').catch(() => []),
      ])
      setTeachers(response?.data || [])
      setSubjects(subjectsRes?.data || [])
      setTeacherDesignations(Array.isArray(designationsRes) ? designationsRes : designationsRes?.data || [])
    } catch (error) {
      console.error('Failed to load teachers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validateTeacherForm(formData)
    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors([])
    try {
      if (editingId) {
        await apiClient.updateTeacher(editingId, formData)
      } else {
        await apiClient.createTeacher(formData)
      }
      setShowForm(false)
      setEditingId(null)
      setFormData(EMPTY_TEACHER_FORM)
      loadTeachers()
    } catch (error) {
      console.error('Failed to create teacher:', error)
      toast.error(error?.message || 'Failed to save teacher.')
    }
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData(EMPTY_TEACHER_FORM)
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
      teacherId: teacher.teacherId || '',
      profilePic: teacher.profilePic || '',
      dateOfBirth: teacher.dateOfBirth?.split('T')[0] || '',
      designation: teacher.designation || '',
      department: teacher.department || '',
      joiningDate: teacher.joiningDate?.split('T')[0] || '',
      address: teacher.address || '',
      aadhaarNumber: teacher.aadhaarNumber || '',
      panNumber: teacher.panNumber || '',
      gender: teacher.gender || '',
      bloodGroup: teacher.bloodGroup || '',
      salary: teacher.salary || '',
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
      toast.error(error?.message || 'Failed to delete teacher.')
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

    const email = String(row.email).trim()
    if (!EMAIL_REGEX.test(email)) return null

    const phoneNumber = row.phoneNumber ? String(row.phoneNumber).trim() : ''
    if (phoneNumber && !INDIAN_PHONE_REGEX.test(phoneNumber)) return null

    return {
      firstName: String(row.firstName).trim(),
      lastName: String(row.lastName).trim(),
      email,
      phoneNumber,
      subject: row.subject ? String(row.subject).trim() : '',
      qualification: row.qualification ? String(row.qualification).trim() : '',
      experience: row.experience ? String(row.experience).trim() : '',
    }
  }

  const teacherExportColumns = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'subject', label: 'Subject' },
    { key: 'designation', label: 'Designation' },
    { key: 'department', label: 'Department' },
    { key: 'phoneNumber', label: 'Phone' },
  ]

  const handleExportCSV = () => {
    exportToCSV(filteredTeachers, 'Teachers', teacherExportColumns)
  }

  const handleExportPDF = () => {
    exportToPDF(filteredTeachers, 'Teachers', teacherExportColumns, 'Teachers List')
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

  const { paginatedItems: paginatedTeachers, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredTeachers)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Teachers</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={exportButtonStyle} onClick={handleExportCSV} title="Export CSV">
            📄 CSV
          </button>
          <button style={exportButtonStyle} onClick={handleExportPDF} title="Export PDF">
            📥 PDF
          </button>
          <button style={exportButtonStyle} onClick={() => printTable('teachers-print-area', 'Teachers List')} title="Print"><Printer size={16} /> Print</button>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </button>
          <button className="btn primary" onClick={handleAddNew}>
            + Add Teacher
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
        <Modal title={editingId ? 'Edit Teacher' : 'Add New Teacher'} onClose={() => setShowForm(false)} footer={<button type="submit" form="teacher-form" className="btn primary">{editingId ? 'Update Teacher' : 'Add Teacher'}</button>}>
          {formErrors.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              {formErrors.map((err, i) => (
                <p key={i} style={{ color: '#dc2626', margin: '0.25rem 0', fontSize: '0.875rem' }}>✗ {err}</p>
              ))}
            </div>
          )}
          <form id="teacher-form" onSubmit={handleSubmit} className="form-grid">
            <label>
              <span className="field-label">First Name *</span>
              <input
                type="text"
                placeholder="First Name *"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </label>
            <label>
              <span className="field-label">Last Name *</span>
              <input
                type="text"
                placeholder="Last Name *"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </label>
            <label>
              <span className="field-label">Email *</span>
              <input
                type="email"
                placeholder="Email *"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </label>
            <label>
              <span className="field-label">Phone Number</span>
              <input
                type="tel"
                placeholder="Phone Number (10 digits)"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                pattern="[6-9][0-9]{9}"
                title="Enter a valid 10-digit Indian mobile number starting with 6-9"
                maxLength={10}
              />
            </label>
            <label>
              <span className="field-label">Subject</span>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              >
                <option value="">-- Select Subject --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Qualification</span>
              <input
                type="text"
                placeholder="Qualification"
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Years of Experience</span>
              <input
                type="number"
                placeholder="Years of Experience"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Teacher ID *</span>
              <input
                type="text"
                placeholder="Teacher ID (for teacher login) *"
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                required
              />
            </label>
            <label>
              <span className="field-label">Date of Birth *</span>
              <input
                type="date"
                title="Date of Birth"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                required
              />
            </label>
            <label>
              <span className="field-label">Gender *</span>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                required
              >
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              <span className="field-label">Designation</span>
              <select
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              >
                <option value="">Designation</option>
                {teacherDesignations.map((d) => (
                  <option key={d.id} value={d.label}>{d.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Department</span>
              <input
                type="text"
                placeholder="Department (Science, Commerce, Arts...)"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Joining Date *</span>
              <input
                type="date"
                title="Joining Date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                required
              />
            </label>
            <label>
              <span className="field-label">Blood Group</span>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              >
                <option value="">Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </label>
            <label>
              <span className="field-label">Aadhaar Number</span>
              <input
                type="text"
                placeholder="Aadhaar Number (12 digits)"
                value={formData.aadhaarNumber}
                onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                maxLength={12}
              />
            </label>
            <label>
              <span className="field-label">PAN Number</span>
              <input
                type="text"
                placeholder="PAN Number (e.g., ABCDE1234F)"
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase().slice(0, 10) })}
                maxLength={10}
              />
            </label>
            <label>
              <span className="field-label">Salary (₹)</span>
              <input
                type="number"
                placeholder="Monthly Salary (₹)"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                min="0"
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span className="field-label">Address</span>
              <textarea
                placeholder="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows="2"
              />
            </label>
          </form>
        </Modal>
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
            <> 
        <div className="data-table" id="teachers-print-area">
          <table>
            <thead>
              <tr>
                <th>Teacher ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Designation</th>
                <th>Subject</th>
                <th>Qualification</th>
                <th>Experience</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty-row">
                    {searchQuery ? 'No teachers match your search.' : 'No teachers found. Add your first teacher!'}
                  </td>
                </tr>
              ) : (
                paginatedTeachers.map((teacher) => (
                  <tr 
                    key={teacher.id}
                    onClick={() => navigate(`/portal/teachers/${teacher.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{teacher.teacherId || '-'}</td>
                    <td>{teacher.firstName} {teacher.lastName}</td>
                    <td>{teacher.email}</td>
                    <td>{teacher.phoneNumber || '-'}</td>
                    <td>{teacher.designation || '-'}</td>
                    <td>{teacher.subject || '-'}</td>
                    <td>{teacher.qualification}</td>
                    <td>{teacher.experience ? `${String(teacher.experience).replace(/\s*years?$/i, '')} years` : '-'}</td>
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
     <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={goToPage} /></>
      )}
      </div>
    </div>
  )
}

export default TeachersPage
