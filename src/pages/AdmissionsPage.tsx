// @ts-nocheck
import { useEffect, useState } from 'react'
import { SquarePen, Trash2, Printer } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { exportToCSV, exportToPDF, exportButtonStyle, printTable } from '@/utils/exportUtils'

// ── Constants ─────────────────────────────────────────────────────────────────
const CLASS_OPTIONS = [
  'Nursery', 'LKG', 'UKG',
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
  'Class 11', 'Class 12',
]

const CATEGORY_OPTIONS = ['General', 'OBC', 'SC', 'ST', 'EWS']

const STATUS_OPTIONS = ['pending', 'shortlisted', 'approved', 'rejected', 'enrolled']

const STATUS_COLORS = {
  pending:     { bg: '#fef3c7', color: '#92400e' },
  shortlisted: { bg: '#dbeafe', color: '#1e40af' },
  approved:    { bg: '#d1fae5', color: '#065f46' },
  rejected:    { bg: '#fee2e2', color: '#991b1b' },
  enrolled:    { bg: '#ede9fe', color: '#5b21b6' },
}

const EMPTY_FORM = {
  applicantName:    '',
  dateOfBirth:      '',
  gender:           '',
  applyingForClass: 'Class 1',
  academicYear:     '2025-26',
  guardianName:     '',
  guardianPhone:    '',
  guardianEmail:    '',
  address:          '',
  previousSchool:   '',
  previousClass:    '',
  category:         '',
  status:           'pending',
  interviewDate:    '',
  remarks:          '',
}

const exportCols = [
  { key: 'applicationNo',    label: 'App. No.' },
  { key: 'applicantName',    label: 'Applicant' },
  { key: 'applyingForClass', label: 'Class' },
  { key: 'academicYear',     label: 'Academic Year' },
  { key: 'guardianName',     label: 'Guardian' },
  { key: 'guardianPhone',    label: 'Phone' },
  { key: 'category',         label: 'Category' },
  { key: 'status',           label: 'Status' },
]

// ── Component ─────────────────────────────────────────────────────────────────
const AdmissionsPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()

  const [admissions, setAdmissions]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus]   = useState('')
  const [filterClass, setFilterClass]     = useState('')
  const [formData, setFormData]       = useState(EMPTY_FORM)

  useEffect(() => { loadAdmissions() }, [])

  const loadAdmissions = async () => {
    try {
      const res = await apiClient.listAdmissions()
      setAdmissions(res?.data || [])
    } catch (err) {
      console.error('Failed to load admissions:', err)
      toast.error('Failed to load admissions')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        dateOfBirth:   formData.dateOfBirth   || null,
        interviewDate: formData.interviewDate  || null,
        gender:        formData.gender         || null,
        guardianEmail: formData.guardianEmail  || null,
        address:       formData.address        || null,
        previousSchool:formData.previousSchool || null,
        previousClass: formData.previousClass  || null,
        category:      formData.category       || null,
        remarks:       formData.remarks        || null,
      }
      if (editingId) {
        await apiClient.updateAdmission(editingId, payload)
        toast.success('Admission updated successfully')
      } else {
        await apiClient.createAdmission(payload)
        toast.success('Admission application created')
      }
      setFormData(EMPTY_FORM)
      setEditingId(null)
      setShowForm(false)
      loadAdmissions()
    } catch (err) {
      toast.error(err?.message || 'Failed to save admission')
    }
  }

  const handleEdit = (record) => {
    setFormData({
      applicantName:    record.applicantName    || '',
      dateOfBirth:      record.dateOfBirth      ? record.dateOfBirth.split('T')[0]    : '',
      gender:           record.gender           || '',
      applyingForClass: record.applyingForClass || 'Class 1',
      academicYear:     record.academicYear     || '2025-26',
      guardianName:     record.guardianName     || '',
      guardianPhone:    record.guardianPhone    || '',
      guardianEmail:    record.guardianEmail    || '',
      address:          record.address          || '',
      previousSchool:   record.previousSchool   || '',
      previousClass:    record.previousClass    || '',
      category:         record.category         || '',
      status:           record.status           || 'pending',
      interviewDate:    record.interviewDate    ? record.interviewDate.split('T')[0]  : '',
      remarks:          record.remarks          || '',
    })
    setEditingId(record.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Admission',
      message: 'Are you sure you want to delete this admission record?',
    })
    if (!ok) return
    try {
      await apiClient.deleteAdmission(id)
      toast.success('Admission deleted')
      loadAdmissions()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete admission')
    }
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = admissions.filter((a) => {
    const matchSearch =
      !searchQuery ||
      a.applicantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.applicationNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.guardianName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.guardianPhone?.includes(searchQuery)
    const matchStatus = !filterStatus || a.status === filterStatus
    const matchClass  = !filterClass  || a.applyingForClass === filterClass
    return matchSearch && matchStatus && matchClass
  })

  const { paginatedItems, currentPage, totalPages, totalItems, goToPage } = usePagination(filtered, 15)

  // ── Stats ──────────────────────────────────────────────────────────────────
  const countByStatus = (s) => admissions.filter((a) => a.status === s).length
  const pendingCount  = countByStatus('pending')
  const approvedCount = countByStatus('approved')
  const enrolledCount = countByStatus('enrolled')

  const field = (key, label, type = 'text', required = false, placeholder = '') => (
    <div className="form-group" key={key}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>{label}{required && <span style={{ color: 'red' }}>*</span>}</label>
      <input
        type={type}
        value={formData[key]}
        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
        required={required}
        placeholder={placeholder}
      />
    </div>
  )

  const selectField = (key, label, options, required = false) => (
    <div className="form-group" key={key}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>{label}{required && <span style={{ color: 'red' }}>*</span>}</label>
      <select value={formData[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}>
        {!required && <option value="">— Select —</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div className="page-header">
        <h1>📋 Admissions</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
            Pending: {pendingCount}
          </span>
          <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
            Approved: {approvedCount}
          </span>
          <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
            Enrolled: {enrolledCount}
          </span>
          <button style={exportButtonStyle} onClick={() => exportToCSV(filtered, 'Admissions', exportCols)} title="Export CSV">📄 CSV</button>
          <button style={exportButtonStyle} onClick={() => exportToPDF(filtered, 'Admissions', exportCols, 'Admissions List')} title="Export PDF">📥 PDF</button>
          <button style={exportButtonStyle} onClick={() => printTable('admissions-print-area', 'Admissions List')} title="Print"><Printer size={16} /> Print</button>
          <button
            className="btn primary"
            onClick={() => {
              if (showForm && !editingId) { setShowForm(false) }
              else { setFormData(EMPTY_FORM); setEditingId(null); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }
            }}
          >
            {showForm && !editingId ? 'Cancel' : '+ New Application'}
          </button>
        </div>
      </div>

      {/* ── Form ── */}
      {showForm && (
        <div className="form-card">
          <h3>{editingId ? '✏️ Edit Admission' : '📋 New Admission Application'}</h3>
          <form onSubmit={handleSubmit}>

            {/* Section: Applicant */}
            <h4 style={{ marginBottom: '0.5rem', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.4rem' }}>
              Applicant Details
            </h4>
            <div className="form-grid">
              {field('applicantName', 'Applicant Name', 'text', true, 'Full name of student')}
              {field('dateOfBirth', 'Date of Birth', 'date', false)}
              {selectField('gender', 'Gender', ['Male', 'Female', 'Other'])}
              {selectField('applyingForClass', 'Applying For Class', CLASS_OPTIONS, true)}
              {field('academicYear', 'Academic Year', 'text', false, '2025-26')}
              {selectField('category', 'Category', CATEGORY_OPTIONS)}
            </div>

            {/* Section: Guardian */}
            <h4 style={{ margin: '1rem 0 0.5rem', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.4rem' }}>
              Guardian / Parent Details
            </h4>
            <div className="form-grid">
              {field('guardianName', 'Guardian Name', 'text', true, 'Father / Mother / Guardian')}
              {field('guardianPhone', 'Phone Number', 'tel', true, '9876543210')}
              {field('guardianEmail', 'Email', 'email', false, 'optional')}
              {field('address', 'Address', 'text', false)}
            </div>

            {/* Section: Previous School */}
            <h4 style={{ margin: '1rem 0 0.5rem', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.4rem' }}>
              Previous School (if any)
            </h4>
            <div className="form-grid">
              {field('previousSchool', 'Previous School Name', 'text', false)}
              {field('previousClass', 'Previous Class', 'text', false, 'e.g. Class 5')}
            </div>

            {/* Section: Status */}
            <h4 style={{ margin: '1rem 0 0.5rem', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.4rem' }}>
              Application Status
            </h4>
            <div className="form-grid">
              {selectField('status', 'Status', STATUS_OPTIONS, true)}
              {field('interviewDate', 'Interview Date', 'date', false)}
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Remarks</label>
              <textarea
                rows={3}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Any additional notes..."
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="submit" className="btn primary">{editingId ? 'Update' : 'Submit Application'}</button>
              <button type="button" className="btn outline" onClick={() => { setShowForm(false); setEditingId(null); setFormData(EMPTY_FORM) }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, app. no., phone..." />
 
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', height: '40px', marginTop: '0.4rem' }}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', height: '40px', marginTop: '0.4rem' }}>
          <option value="">All Classes</option>
          {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="loading-spinner">Loading admissions…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No admission applications found.</p>
          <button className="btn primary" onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setShowForm(true) }}>
            + New Application
          </button>
        </div>
      ) : (
        <div id="admissions-print-area">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>App. No.</th>
                  <th>Applicant Name</th>
                  <th>Applying For</th>
                  <th>Academic Year</th>
                  <th>Guardian</th>
                  <th>Phone</th>
                  <th>Category</th>
                  <th>Interview Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((record) => {
                  const sc = STATUS_COLORS[record.status] || STATUS_COLORS.pending
                  return (
                    <tr key={record.id}>
                      <td><code style={{ fontSize: '0.8rem' }}>{record.applicationNo}</code></td>
                      <td style={{ fontWeight: 500 }}>{record.applicantName}</td>
                      <td>{record.applyingForClass}</td>
                      <td>{record.academicYear}</td>
                      <td>{record.guardianName}</td>
                      <td>{record.guardianPhone}</td>
                      <td>{record.category || '—'}</td>
                      <td>
                        {record.interviewDate
                          ? new Date(record.interviewDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td>
                        <span style={{ background: sc.bg, color: sc.color, padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize' }}>
                          {record.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="icon-btn" title="Edit" onClick={() => handleEdit(record)}><SquarePen size={16} /></button>
                          <button className="icon-btn danger" title="Delete" onClick={() => handleDelete(record.id)}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={goToPage}
          />
        </div>
      )}
    </div>
  )
}

export default AdmissionsPage
