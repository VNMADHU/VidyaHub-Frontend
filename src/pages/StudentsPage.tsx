// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SquarePen, Trash2, Printer } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import BulkImportModal from '@/components/BulkImportModal'
import { useAppSelector } from '@/store'
import SearchBar from '@/components/SearchBar'
import { useToast } from '@/components/ToastContainer'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { exportButtonStyle } from '@/utils/exportUtils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Modal from '../components/Modal'

// Validation helpers
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TODAY = new Date().toISOString().split('T')[0]

const validateStudentForm = (data) => {
  const errors = []
  if (!data.rollNumber) {
    errors.push('Roll Number is required.')
  }
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
  const [filterSections, setFilterSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterSection, setFilterSection] = useState('')
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
    siblingStudentId: '',
    siblingNames: '',
    siblingRelation: '',
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

  useEffect(() => {
    // Load sections for class filter dropdown
    if (filterClass) {
      apiClient.listSections(filterClass)
        .then((res) => setFilterSections(res?.data || []))
        .catch(() => setFilterSections([]))
      setFilterSection('')
    } else {
      setFilterSections([])
      setFilterSection('')
    }
  }, [filterClass])

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
      toast.error(error?.message || 'Failed to save student.')
    }
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData({ ...EMPTY_STUDENT_FORM, rollNumber: String(Math.floor(10000000 + Math.random() * 90000000)) })
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
      siblingStudentId: student.siblingStudentId || '',
      siblingNames: student.siblingNames || '',
      siblingRelation: student.siblingRelation || '',
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
    'rollNumber',
    'admissionNumber',
    'email',
    'dateOfBirth',
    'gender',
    'classId',
    'sectionId',
    // Indian school fields
    'aadhaarNumber',
    'bloodGroup',
    'category',
    'religion',
    'nationality',
    'address',
    'permanentAddress',
    'transportMode',
    'busRoute',
    'previousSchool',
    'tcNumber',
    // Parent / Guardian
    'fatherName',
    'motherName',
    'guardianName',
    'fatherContact',
    'motherContact',
    'guardianContact',
    'parentEmail',
    // Sibling
    'siblingStudentId',
    'siblingNames',
    'siblingRelation',
  ]

  const mapStudentRow = (row) => {
    if (!row.firstName || !row.lastName) {
      return null
    }

    const email = row.email ? String(row.email).trim() : ''
    if (email && !EMAIL_REGEX.test(email)) return null

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
      rollNumber: row.rollNumber ? String(row.rollNumber).trim() : '',
      admissionNumber: row.admissionNumber ? String(row.admissionNumber).trim() : '',
      email,
      dateOfBirth,
      gender: row.gender ? String(row.gender).toLowerCase().trim() : 'male',
      classId: row.classId ? Number(row.classId) : undefined,
      sectionId: row.sectionId ? Number(row.sectionId) : undefined,
      // Indian school fields
      aadhaarNumber: row.aadhaarNumber ? String(row.aadhaarNumber).trim() : undefined,
      bloodGroup: row.bloodGroup ? String(row.bloodGroup).trim() : undefined,
      category: row.category ? String(row.category).trim() : undefined,
      religion: row.religion ? String(row.religion).trim() : undefined,
      nationality: row.nationality ? String(row.nationality).trim() : undefined,
      address: row.address ? String(row.address).trim() : undefined,
      permanentAddress: row.permanentAddress ? String(row.permanentAddress).trim() : undefined,
      transportMode: row.transportMode ? String(row.transportMode).trim() : undefined,
      busRoute: row.busRoute ? String(row.busRoute).trim() : undefined,
      previousSchool: row.previousSchool ? String(row.previousSchool).trim() : undefined,
      tcNumber: row.tcNumber ? String(row.tcNumber).trim() : undefined,
      // Parent / Guardian
      fatherName: row.fatherName ? String(row.fatherName).trim() : '',
      motherName: row.motherName ? String(row.motherName).trim() : '',
      guardianName: row.guardianName ? String(row.guardianName).trim() : '',
      fatherContact,
      motherContact,
      guardianContact,
      parentEmail,
      // Sibling
      siblingStudentId: row.siblingStudentId ? Number(row.siblingStudentId) : undefined,
      siblingNames: row.siblingNames ? String(row.siblingNames).trim() : undefined,
      siblingRelation: row.siblingRelation ? String(row.siblingRelation).trim() : undefined,
    }
  }

  const studentExportColumns = [
    { key: 'rollNumber',      label: 'Roll No' },
    { key: 'firstName',       label: 'First Name' },
    { key: 'lastName',        label: 'Last Name' },
    { key: 'email',           label: 'Email' },
    { key: 'gender',          label: 'Gender' },
    { key: 'admissionNumber', label: 'Admission No' },
    { key: 'dateOfBirth',     label: 'DOB' },
    { key: 'fatherName',      label: 'Father' },
    { key: 'motherName',      label: 'Mother' },
    { key: 'category',        label: 'Category' },
  ]

  const mapStudentsForExport = (data) => data.map((s) => ({
    rollNumber:      s.rollNumber || '',
    firstName:       s.firstName || '',
    lastName:        s.lastName || '',
    email:           s.email || '',
    gender:          s.gender || '',
    admissionNumber: s.admissionNumber || '',
    dateOfBirth:     s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-IN') : '',
    fatherName:      s.fatherName || '',
    motherName:      s.motherName || '',
    category:        s.category || '',
  }))

  const buildStudentFilterLabel = () => {
    const parts = []
    const cls = filterClass ? classes.find((c) => String(c.id) === filterClass)?.name : null
    if (cls) parts.push(`Class: ${cls}`)
    const sec = filterSection ? filterSections.find((s) => String(s.id) === filterSection)?.name : null
    if (sec) parts.push(`Section: ${sec}`)
    if (searchQuery) parts.push(`Search: "${searchQuery}"`)
    return parts.length ? parts.join('  |  ') : 'All Students'
  }

  const handleExportCSV = () => {
    const rows = mapStudentsForExport(filteredStudents)
    const filterLabel = buildStudentFilterLabel()
    const headers = studentExportColumns.map((c) => c.label)
    const dataRows = rows.map((r) => studentExportColumns.map((c) => r[c.key] ?? ''))
    const csvLines = [
      ['Students List'],
      [`Filter: ${filterLabel}`],
      [`Generated: ${new Date().toLocaleDateString('en-IN')}`],
      [],
      headers,
      ...dataRows,
      [],
      [`Total Records: ${filteredStudents.length}`],
    ]
    const csv = csvLines.map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Students_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    const rows = mapStudentsForExport(filteredStudents)
    const filterLabel = buildStudentFilterLabel()
    const doc = new jsPDF({ orientation: 'landscape' })
    const pageW = doc.internal.pageSize.getWidth()

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text('Students List', 14, 16)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Filter: ${filterLabel}`, 14, 24)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageW - 14, 24, { align: 'right' })

    // Summary box
    const summaryY = 30
    doc.setFillColor(37, 99, 235)
    doc.roundedRect(14, summaryY, 60, 12, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(255, 255, 255)
    doc.text('Total Students', 44, summaryY + 4, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(String(filteredStudents.length), 44, summaryY + 9.5, { align: 'center' })

    const headers = studentExportColumns.map((c) => c.label)
    const dataRows = rows.map((r) => studentExportColumns.map((c) => String(r[c.key] ?? '')))

    autoTable(doc, {
      head: [headers],
      body: dataRows,
      startY: summaryY + 17,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    })

    doc.save(`Students_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const handlePrint = () => {
    const filterLabel = buildStudentFilterLabel()
    const rows = mapStudentsForExport(filteredStudents)
    const headers = studentExportColumns.map((c) => c.label)
    const dataRows = rows.map((r) =>
      `<tr>${studentExportColumns.map((c) => `<td>${r[c.key] ?? ''}</td>`).join('')}</tr>`
    ).join('')
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>Students List</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { margin: 0 0 4px; color: #1e293b; }
        .meta { font-size: 12px; color: #64748b; margin-bottom: 10px; }
        .summary { display: inline-block; background: #eff6ff; color: #2563eb; padding: 8px 20px; border-radius: 6px; font-size: 12px; margin-bottom: 14px; }
        .summary b { display: block; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
        th { background: #2563eb; color: white; font-weight: 600; }
        tr:nth-child(even) { background: #f8fafc; }
      </style></head><body>
      <h2>Students List</h2>
      <div class="meta">Filter: ${filterLabel} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-IN')}</div>
      <div class="summary"><span>Total Students</span><b>${filteredStudents.length}</b></div>
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${dataRows}</tbody>
      </table>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const filteredStudents = students.filter((student) => {
    if (filterClass && String(student.classId) !== filterClass) return false
    if (filterSection && String(student.sectionId) !== filterSection) return false
    const query = searchQuery.toLowerCase()
    return (
      !query ||
      student.firstName?.toLowerCase().includes(query) ||
      student.lastName?.toLowerCase().includes(query) ||
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(query) ||
      student.rollNumber?.toLowerCase().includes(query) ||
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
          <button style={exportButtonStyle} onClick={handlePrint} title="Print"><Printer size={16} /> Print</button>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </button>
          <button className="btn primary" onClick={handleAddNew}>
            + Add Student
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '0' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, roll number, email, admission number, or parent details..."
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', paddingBottom: '1.5rem' }}>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            style={{ padding: '0.75rem 0.75rem', border: '1px solid var(--border, #e2e8f0)', borderRadius: '8px', fontSize: '0.9rem', background: 'var(--card-bg, #fff)', color: 'var(--text, #1e293b)', cursor: 'pointer', minWidth: '140px' }}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
          {filterClass && (
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              style={{ padding: '0.75rem 0.75rem', border: '1px solid var(--border, #e2e8f0)', borderRadius: '8px', fontSize: '0.9rem', background: 'var(--card-bg, #fff)', color: 'var(--text, #1e293b)', cursor: 'pointer', minWidth: '130px' }}
            >
              <option value="">All Sections</option>
              {filterSections.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
          )}
          {(filterClass || filterSection || searchQuery) && (
            <button
              onClick={() => { setFilterClass(''); setFilterSection(''); setSearchQuery('') }}
              className="btn outline"
              style={{ fontSize: '0.8rem', padding: '0.65rem 0.9rem', whiteSpace: 'nowrap' }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      <div className="page-content-scrollable">
      {showForm && (
        <Modal title={editingId ? 'Edit Student' : 'Add New Student'} onClose={() => setShowForm(false)} footer={<button type="submit" form="student-form" className="btn primary">{editingId ? 'Update Student' : 'Add Student'}</button>}>
          {formErrors.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              {formErrors.map((err, i) => (
                <p key={i} style={{ color: '#dc2626', margin: '0.25rem 0', fontSize: '0.875rem' }}>✗ {err}</p>
              ))}
            </div>
          )}
          <form id="student-form" onSubmit={handleSubmit} className="form-grid">
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
              <span className="field-label">Email</span>
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Date of Birth *</span>
              <input
                type="date"
                placeholder="Date of Birth *"
                title="Date of Birth"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                max={TODAY}
                required
              />
            </label>
            <label>
              <span className="field-label">Gender</span>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              <span className="field-label">Admission Number</span>
              <input
                type="text"
                placeholder="Admission Number"
                value={formData.admissionNumber}
                onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Roll Number *</span>
              <input
                type="text"
                placeholder="Roll Number *"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                required
              />
            </label>
            <label>
              <span className="field-label">Class *</span>
              <select
                value={formData.classId}
                onChange={(e) => {
                  setFormData({ ...formData, classId: e.target.value, sectionId: '' })
                }}
                required
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
              <span className="field-label">Section</span>
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
            </label>

            {/* Indian School Fields */}
            <h4 style={{ gridColumn: '1 / -1', margin: '0.5rem 0 0', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              📋 Additional Details
            </h4>
            <label>
              <span className="field-label">Aadhaar Number</span>
              <input
                type="text"
                placeholder="Aadhaar Number (12 digits)"
                value={formData.aadhaarNumber}
                onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                maxLength={12}
                pattern="\d{12}"
                title="Enter 12-digit Aadhaar number"
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
              <span className="field-label">Category</span>
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
            </label>
            <label>
              <span className="field-label">Religion</span>
              <input
                type="text"
                placeholder="Religion"
                value={formData.religion}
                onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Nationality</span>
              <input
                type="text"
                placeholder="Nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span className="field-label">Current Address</span>
              <textarea
                placeholder="Current Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows="2"
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span className="field-label">Permanent Address</span>
              <textarea
                placeholder="Permanent Address"
                value={formData.permanentAddress}
                onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                rows="2"
              />
            </label>
            <label>
              <span className="field-label">Transport Mode</span>
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
            </label>
            <label>
              <span className="field-label">Bus Route</span>
              <input
                type="text"
                placeholder="Bus Route (if applicable)"
                value={formData.busRoute}
                onChange={(e) => setFormData({ ...formData, busRoute: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Previous School</span>
              <input
                type="text"
                placeholder="Previous School"
                value={formData.previousSchool}
                onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">TC Number</span>
              <input
                type="text"
                placeholder="TC Number (Transfer Certificate)"
                value={formData.tcNumber}
                onChange={(e) => setFormData({ ...formData, tcNumber: e.target.value })}
              />
            </label>

            <h4 style={{ gridColumn: '1 / -1', margin: '0.5rem 0 0', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              👨‍👩‍👧 Parent / Guardian Details
            </h4>
            <label>
              <span className="field-label">Father Name</span>
              <input
                type="text"
                placeholder="Father Name"
                value={formData.fatherName}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Mother Name</span>
              <input
                type="text"
                placeholder="Mother Name"
                value={formData.motherName}
                onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Guardian Name</span>
              <input
                type="text"
                placeholder="Guardian Name"
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Father Contact</span>
              <input
                type="tel"
                placeholder="Father Contact (10 digits)"
                value={formData.fatherContact}
                onChange={(e) => setFormData({ ...formData, fatherContact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                pattern="[6-9][0-9]{9}"
                title="Enter a valid 10-digit Indian mobile number starting with 6-9"
                maxLength={10}
              />
            </label>
            <label>
              <span className="field-label">Mother Contact</span>
              <input
                type="tel"
                placeholder="Mother Contact (10 digits)"
                value={formData.motherContact}
                onChange={(e) => setFormData({ ...formData, motherContact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                pattern="[6-9][0-9]{9}"
                title="Enter a valid 10-digit Indian mobile number starting with 6-9"
                maxLength={10}
              />
            </label>
            <label>
              <span className="field-label">Guardian Contact</span>
              <input
                type="tel"
                placeholder="Guardian Contact (10 digits)"
                value={formData.guardianContact}
                onChange={(e) => setFormData({ ...formData, guardianContact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                pattern="[6-9][0-9]{9}"
                title="Enter a valid 10-digit Indian mobile number starting with 6-9"
                maxLength={10}
              />
            </label>
            <label>
              <span className="field-label">Parent Email</span>
              <input
                type="email"
                placeholder="Parent Email"
                value={formData.parentEmail}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
              />
            </label>

            <h4 style={{ gridColumn: '1 / -1', margin: '0.5rem 0 0', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              👨‍👧‍👦 Sibling / Family Relation
            </h4>
            <label>
              <span className="field-label">Sibling Student ID</span>
              <select
                value={formData.siblingStudentId}
                onChange={(e) => {
                  const sibId = e.target.value
                  const sib = students.find(s => String(s.id) === sibId)
                  setFormData({ ...formData, siblingStudentId: sibId, siblingNames: sib ? `${sib.firstName} ${sib.lastName}` : formData.siblingNames })
                }}
              >
                <option value="">— Select Sibling Student —</option>
                {students.filter(s => !editingId || s.id !== editingId).map(s => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNumber || `ID:${s.id}`})</option>
                ))}
              </select>
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span className="field-label">Sibling Name(s)</span>
              <input
                type="text"
                placeholder="e.g. Ravi Kumar, Priya Kumar"
                value={formData.siblingNames}
                onChange={(e) => setFormData({ ...formData, siblingNames: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Relation Type</span>
              <select
                value={formData.siblingRelation}
                onChange={(e) => setFormData({ ...formData, siblingRelation: e.target.value })}
              >
                <option value="">— Select Relation —</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Twin Brother">Twin Brother</option>
                <option value="Twin Sister">Twin Sister</option>
                <option value="Cousin">Cousin</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </form>
        </Modal>
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
      ) :
       (
           <>
        <div className="data-table" id="students-print-area">
          <table>
            <thead>
              <tr>
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
                  <td colSpan="8" className="empty-row">
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

        </div>
                  <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={goToPage} />
           </>
      )}
      </div>
    </div>
  )
}

export default StudentsPage
