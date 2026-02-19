// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SquarePen, Trash2 } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import BulkImportModal from '@/components/BulkImportModal'
import { useAppSelector } from '@/store'
import SearchBar from '@/components/SearchBar'
import { useToast } from '@/components/ToastContainer'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { exportToCSV, exportToPDF, exportButtonStyle } from '@/utils/exportUtils'

// Validation helpers
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TODAY = new Date().toISOString().split('T')[0]

const validateStudentForm = (data) => {
  const errors = []
  if (data.dateOfBirth && data.dateOfBirth > TODAY) {
    errors.push('Date of Birth cannot be a future date.')
  }
  if (data.email && !EMAIL_REGEX.test(data.email)) {
    errors.push('Please enter a valid email address.')
  }
  if (data.parentEmail && !EMAIL_REGEX.test(data.parentEmail)) {
    errors.push('Please enter a valid parent email address.')
  }
  if (data.fatherContact && !INDIAN_PHONE_REGEX.test(data.fatherContact)) {
    errors.push('Father Contact must be a valid 10-digit Indian mobile number.')
  }
  if (data.motherContact && !INDIAN_PHONE_REGEX.test(data.motherContact)) {
    errors.push('Mother Contact must be a valid 10-digit Indian mobile number.')
  }
  if (data.guardianContact && !INDIAN_PHONE_REGEX.test(data.guardianContact)) {
    errors.push('Guardian Contact must be a valid 10-digit Indian mobile number.')
  }
  return errors
}

const StudentsPage = () => {
  const navigate = useNavigate()
  const { confirm } = useConfirm()
  const toast = useToast()
  const { schoolId } = useAppSelector((state) => state.auth.user) || {}
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formErrors, setFormErrors] = useState([])
const EMPTY_STUDENT_FORM = {
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    gender: 'male',
    admissionNumber: '',
    rollNumber: '',
    profilePic: '',
    classId: '',
    sectionId: '',
    // Indian school fields
    aadhaarNumber: '',
    bloodGroup: '',
    category: '',
    religion: '',
    nationality: 'Indian',
    address: '',
    permanentAddress: '',
    transportMode: '',
    busRoute: '',
    previousSchool: '',
    tcNumber: '',
    // Parent/Guardian
    fatherName: '',
    motherName: '',
    guardianName: '',
    fatherContact: '',
    motherContact: '',
    guardianContact: '',
    parentEmail: '',
  }
  const [formData, setFormData] = useState(EMPTY_STUDENT_FORM)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Load sections when class changes
    if (formData.classId) {
      loadSections(formData.classId)
    }
  }, [formData.classId])

  const loadData = async () => {
    try {
      const [studentsRes, classesRes] = await Promise.all([
        apiClient.listStudents(),
        apiClient.listClasses(),
      ])
      setStudents(studentsRes?.data || [])
      setClasses(classesRes?.data || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validateStudentForm(formData)
    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors([])
    try {
      const dataToSubmit = {
        ...formData,
        schoolId: schoolId,
        classId: formData.classId ? Number(formData.classId) : null,
        sectionId: formData.sectionId ? Number(formData.sectionId) : null,
      }
      if (editingId) {
        await apiClient.updateStudent(editingId, dataToSubmit)
      } else {
        await apiClient.createStudent(dataToSubmit)
      }
      setShowForm(false)
      setEditingId(null)
      setFormData(EMPTY_STUDENT_FORM)
      loadData()
    } catch (error) {
      console.error('Failed to create student:', error)
      toast.error('Failed to save student. Please try again.')
    }
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData(EMPTY_STUDENT_FORM)
    setShowForm(true)
  }

  const handleEdit = (student) => {
    setEditingId(student.id)
    setFormData({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      email: student.email || '',
      dateOfBirth: student.dateOfBirth?.split('T')[0] || student.dateOfBirth || '',
      gender: student.gender || 'male',
      admissionNumber: student.admissionNumber || '',
      rollNumber: student.rollNumber || '',
      profilePic: student.profilePic || '',
      classId: student.classId || '',
      sectionId: student.sectionId || '',
      aadhaarNumber: student.aadhaarNumber || '',
      bloodGroup: student.bloodGroup || '',
      category: student.category || '',
      religion: student.religion || '',
      nationality: student.nationality || 'Indian',
      address: student.address || '',
      permanentAddress: student.permanentAddress || '',
      transportMode: student.transportMode || '',
      busRoute: student.busRoute || '',
      previousSchool: student.previousSchool || '',
      tcNumber: student.tcNumber || '',
      fatherName: student.fatherName || '',
      motherName: student.motherName || '',
      guardianName: student.guardianName || '',
      fatherContact: student.fatherContact || '',
      motherContact: student.motherContact || '',
      guardianContact: student.guardianContact || '',
      parentEmail: student.parentEmail || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (studentId) => {
    try {
      const confirmed = await confirm({
        message: 'Are you sure you want to delete this student? This action cannot be undone.',
      })
      if (!confirmed) return
      
      await apiClient.deleteStudent(studentId)
      await loadData()
    } catch (error) {
      console.error('Failed to delete student:', error)
      toast.error(`Failed to delete student: ${error.message}`)
    }
  }

  const handleBulkImportDone = async () => {
    await loadData()
  }

  const studentTemplateHeaders = [
    'firstName',
    'lastName',
    'email',
    'dateOfBirth',
    'gender',
    'admissionNumber',
    'classId',
    'sectionId',
    'fatherName',
    'motherName',
    'guardianName',
    'fatherContact',
    'motherContact',
    'guardianContact',
    'parentEmail',
  ]

  const mapStudentRow = (row) => {
    if (!row.firstName || !row.lastName || !row.email || !row.admissionNumber) {
      return null
    }

    const email = String(row.email).trim()
    if (!EMAIL_REGEX.test(email)) return null

    const parentEmail = row.parentEmail ? String(row.parentEmail).trim() : ''
    if (parentEmail && !EMAIL_REGEX.test(parentEmail)) return null

    const fatherContact = row.fatherContact ? String(row.fatherContact).trim() : ''
    if (fatherContact && !INDIAN_PHONE_REGEX.test(fatherContact)) return null

    const motherContact = row.motherContact ? String(row.motherContact).trim() : ''
    if (motherContact && !INDIAN_PHONE_REGEX.test(motherContact)) return null

    const guardianContact = row.guardianContact ? String(row.guardianContact).trim() : ''
    if (guardianContact && !INDIAN_PHONE_REGEX.test(guardianContact)) return null

    const dateOfBirth = row.dateOfBirth ? String(row.dateOfBirth).trim() : ''
    if (dateOfBirth && dateOfBirth > TODAY) return null

    return {
      schoolId: schoolId,
      firstName: String(row.firstName).trim(),
      lastName: String(row.lastName).trim(),
      email,
      dateOfBirth,
      gender: row.gender ? String(row.gender).toLowerCase().trim() : 'male',
      admissionNumber: String(row.admissionNumber).trim(),
      classId: row.classId ? Number(row.classId) : undefined,
      sectionId: row.sectionId ? Number(row.sectionId) : undefined,
      fatherName: row.fatherName ? String(row.fatherName).trim() : '',
      motherName: row.motherName ? String(row.motherName).trim() : '',
      guardianName: row.guardianName ? String(row.guardianName).trim() : '',
      fatherContact,
      motherContact,
      guardianContact,
      parentEmail,
    }
  }

  const studentExportColumns = [
    { key: 'rollNumber', label: 'Roll No' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'gender', label: 'Gender' },
    { key: 'admissionNumber', label: 'Admission No' },
    { key: 'dateOfBirth', label: 'DOB' },
    { key: 'fatherName', label: 'Father' },
    { key: 'motherName', label: 'Mother' },
    { key: 'category', label: 'Category' },
  ]

  const handleExportCSV = () => {
    exportToCSV(filteredStudents, 'Students', studentExportColumns)
  }

  const handleExportPDF = () => {
    exportToPDF(filteredStudents, 'Students', studentExportColumns, 'Students List', 'landscape')
  }

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase()
    return (
      student.firstName?.toLowerCase().includes(query) ||
      student.lastName?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      student.admissionNumber?.toLowerCase().includes(query) ||
      student.fatherName?.toLowerCase().includes(query) ||
      student.motherName?.toLowerCase().includes(query) ||
      student.guardianName?.toLowerCase().includes(query) ||
      student.parentEmail?.toLowerCase().includes(query)
    )
  })

  const { paginatedItems: paginatedStudents, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredStudents)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Students</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={exportButtonStyle} onClick={handleExportCSV} title="Export CSV">
            📄 CSV
          </button>
          <button style={exportButtonStyle} onClick={handleExportPDF} title="Export PDF">
            📥 PDF
          </button>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </button>
          <button className="btn primary" onClick={() => showForm ? setShowForm(false) : handleAddNew()}>
            {showForm ? 'Cancel' : '+ Add Student'}
          </button>
        </div>
      </div>

      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search students by name, email, admission number, or parent details..."
      />

      <div className="page-content-scrollable">
      {showForm && (
        <div className="form-card">
          <h3>{editingId ? 'Edit Student' : 'Add New Student'}</h3>
          {formErrors.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              {formErrors.map((err, i) => (
                <p key={i} style={{ color: '#dc2626', margin: '0.25rem 0', fontSize: '0.875rem' }}>✗ {err}</p>
              ))}
            </div>
          )}
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
              type="date"
              placeholder="Date of Birth"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              max={TODAY}
              required
            />
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <input
              type="text"
              placeholder="Admission Number"
              value={formData.admissionNumber}
              onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Roll Number"
              value={formData.rollNumber}
              onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
            />
            <select
              value={formData.classId}
              onChange={(e) => {
                setFormData({ ...formData, classId: e.target.value, sectionId: '' })
              }}
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  Class {cls.name}
                </option>
              ))}
            </select>
            <select
              value={formData.sectionId}
              onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
              disabled={!formData.classId}
            >
              <option value="">Select Section</option>
              {sections.map(section => (
                <option key={section.id} value={section.id}>
                  Section {section.name}
                </option>
              ))}
            </select>

            {/* Indian School Fields */}
            <h4 style={{ gridColumn: '1 / -1', margin: '0.5rem 0 0', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              📋 Additional Details
            </h4>
            <input
              type="text"
              placeholder="Aadhaar Number (12 digits)"
              value={formData.aadhaarNumber}
              onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
              maxLength={12}
              pattern="\d{12}"
              title="Enter 12-digit Aadhaar number"
            />
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
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="">Category</option>
              <option value="General">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="EWS">EWS</option>
            </select>
            <input
              type="text"
              placeholder="Religion"
              value={formData.religion}
              onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
            />
            <input
              type="text"
              placeholder="Nationality"
              value={formData.nationality}
              onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
            />
            <textarea
              placeholder="Current Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows="2"
              style={{ gridColumn: '1 / -1' }}
            />
            <textarea
              placeholder="Permanent Address"
              value={formData.permanentAddress}
              onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
              rows="2"
              style={{ gridColumn: '1 / -1' }}
            />
            <select
              value={formData.transportMode}
              onChange={(e) => setFormData({ ...formData, transportMode: e.target.value })}
            >
              <option value="">Transport Mode</option>
              <option value="School Bus">School Bus</option>
              <option value="Auto">Auto</option>
              <option value="Walk">Walk</option>
              <option value="Private Vehicle">Private Vehicle</option>
              <option value="Bicycle">Bicycle</option>
              <option value="Public Transport">Public Transport</option>
            </select>
            <input
              type="text"
              placeholder="Bus Route (if applicable)"
              value={formData.busRoute}
              onChange={(e) => setFormData({ ...formData, busRoute: e.target.value })}
            />
            <input
              type="text"
              placeholder="Previous School"
              value={formData.previousSchool}
              onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
            />
            <input
              type="text"
              placeholder="TC Number (Transfer Certificate)"
              value={formData.tcNumber}
              onChange={(e) => setFormData({ ...formData, tcNumber: e.target.value })}
            />

            <h4 style={{ gridColumn: '1 / -1', margin: '0.5rem 0 0', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              👨‍👩‍👧 Parent / Guardian Details
            </h4>
            <input
              type="text"
              placeholder="Father Name"
              value={formData.fatherName}
              onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
            />
            <input
              type="text"
              placeholder="Mother Name"
              value={formData.motherName}
              onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
            />
            <input
              type="text"
              placeholder="Guardian Name"
              value={formData.guardianName}
              onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
            />
            <input
              type="tel"
              placeholder="Father Contact (10 digits)"
              value={formData.fatherContact}
              onChange={(e) => setFormData({ ...formData, fatherContact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              pattern="[6-9][0-9]{9}"
              title="Enter a valid 10-digit Indian mobile number starting with 6-9"
              maxLength={10}
            />
            <input
              type="tel"
              placeholder="Mother Contact (10 digits)"
              value={formData.motherContact}
              onChange={(e) => setFormData({ ...formData, motherContact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              pattern="[6-9][0-9]{9}"
              title="Enter a valid 10-digit Indian mobile number starting with 6-9"
              maxLength={10}
            />
            <input
              type="tel"
              placeholder="Guardian Contact (10 digits)"
              value={formData.guardianContact}
              onChange={(e) => setFormData({ ...formData, guardianContact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              pattern="[6-9][0-9]{9}"
              title="Enter a valid 10-digit Indian mobile number starting with 6-9"
              maxLength={10}
            />
            <input
              type="email"
              placeholder="Parent Email"
              value={formData.parentEmail}
              onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
            />
            <button type="submit" className="btn primary">
              {editingId ? 'Update Student' : 'Add Student'}
            </button>
          </form>
        </div>
      )}

      {showBulkImport && (
        <BulkImportModal
          title="Students"
          templateHeaders={studentTemplateHeaders}
          mapRowToPayload={mapStudentRow}
          createItem={(payload) => apiClient.createStudent(payload)}
          onClose={() => setShowBulkImport(false)}
          onDone={handleBulkImportDone}
        />
      )}

      {loading ? (
        <div className="loading-state">Loading students...</div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Admission No.</th>
                <th>Roll No.</th>
                <th>Name</th>
                <th>Email</th>
                <th>DOB</th>
                <th>Gender</th>
                <th>Parent Contact</th>
                <th>Parent Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-row">
                    {searchQuery ? 'No students match your search.' : 'No students found. Add your first student!'}
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    onClick={() => navigate(`/portal/students/${student.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{student.admissionNumber}</td>
                    <td>{student.rollNumber || '-'}</td>
                    <td>{student.firstName} {student.lastName}</td>
                    <td>{student.email}</td>
                    <td>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                    <td>{student.gender}</td>
                    <td>{student.fatherContact || student.motherContact || student.guardianContact || '-'}</td>
                    <td>{student.parentEmail || '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="btn-icon edit" onClick={() => handleEdit(student)} aria-label="Edit student">
                        <SquarePen size={16} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDelete(student.id)} aria-label="Delete student">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={goToPage} />
        </div>
      )}
      </div>
    </div>
  )
}

export default StudentsPage
