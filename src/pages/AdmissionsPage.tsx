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
import Modal from '../components/Modal'

// ── Constants ─────────────────────────────────────────────────────────────────
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
  applyingForClass: '',
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
  const [classes, setClasses]         = useState([])

  useEffect(() => {
    loadAdmissions()
    apiClient.listClasses().then((res) => setClasses(res?.data || [])).catch(() => {})
  }, [])

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
      applyingForClass: record.applyingForClass || '',
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

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div className="page-header">
        <h1>Admissions</h1>
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
            + New Application
          </button>
        </div>
      </div>

      {/* ── Form ── */}
      {showForm && (
        <Modal title={editingId ? '✏️ Edit Admission' : '📋 New Admission Application'} onClose={() => { setShowForm(false); setEditingId(null); setFormData(EMPTY_FORM) }} footer={<button type="submit" form="admission-form" className="btn primary">{editingId ? 'Update' : 'Submit Application'}</button>}>
          <form id="admission-form" onSubmit={handleSubmit} className="form-grid">

            <h4 style={{ gridColumn: '1 / -1', margin: '0.5rem 0 0', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              📋 Applicant Details
            </h4>
            <label>
              <span className="field-label">Applicant Name *</span>
              <input type="text" placeholder="Full name of student" value={formData.applicantName} onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })} required />
            </label>
            <label>
              <span className="field-label">Date of Birth</span>
              <input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
            </label>
            <label>
              <span className="field-label">Gender</span>
              <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                <option value="">— Select —</option>
                {['Male', 'Female', 'Other'].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">Applying For Class *</span>
              <select value={formData.applyingForClass} onChange={(e) => setFormData({ ...formData, applyingForClass: e.target.value })} required>
                <option value="">— Select Class —</option>
                {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">Academic Year</span>
              <input type="text" placeholder="2025-26" value={formData.academicYear} onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })} />
            </label>
            <label>
              <span className="field-label">Category</span>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                <option value="">— Select —</option>
                {CATEGORY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            <h4 style={{ gridColumn: '1 / -1', margin: '0.5rem 0 0', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              👨‍👩‍👧 Guardian / Parent Details
            </h4>
            <label>
              <span className="field-label">Guardian Name *</span>
              <input type="text" placeholder="Father / Mother / Guardian" value={formData.guardianName} onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })} required />
            </label>
            <label>
              <span className="field-label">Phone Number *</span>
              <input type="tel" placeholder="9876543210" value={formData.guardianPhone} onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })} required />
            </label>
            <label>
              <span className="field-label">Email</span>
              <input type="email" placeholder="optional" value={formData.guardianEmail} onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })} />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span className="field-label">Address</span>
              <textarea rows={2} placeholder="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </label>

            <h4 style={{ gridColumn: '1 / -1', margin: '0.5rem 0 0', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              🏫 Previous School (if any)
            </h4>
            <label>
              <span className="field-label">Previous School Name</span>
              <input type="text" placeholder="Previous school name" value={formData.previousSchool} onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })} />
            </label>
            <label>
              <span className="field-label">Previous Class</span>
              <input type="text" placeholder="e.g. Class 5" value={formData.previousClass} onChange={(e) => setFormData({ ...formData, previousClass: e.target.value })} />
            </label>

            <h4 style={{ gridColumn: '1 / -1', margin: '0.5rem 0 0', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              📊 Application Status
            </h4>
            <label>
              <span className="field-label">Status *</span>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} required>
                {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">Interview Date</span>
              <input type="date" value={formData.interviewDate} onChange={(e) => setFormData({ ...formData, interviewDate: e.target.value })} />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span className="field-label">Remarks</span>
              <textarea rows={3} placeholder="Any additional notes..." value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
            </label>

          </form>
        </Modal>
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
          {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="loading-spinner">Loading admissions…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No admission applications found.</p>
         
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
