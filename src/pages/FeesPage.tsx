// @ts-nocheck
import { useEffect, useState } from 'react'
import { Trash2, SquarePen, CreditCard, Printer, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import SearchBar from '@/components/SearchBar'
import { useToast } from '@/components/ToastContainer'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { exportToCSV, exportToPDF, exportButtonStyle, printTable } from '@/utils/exportUtils'
import Modal from '../components/Modal'
import { useAppSelector } from '@/store'

// Fee types loaded dynamically from Settings > Finance Types
const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Annual']

const FeesPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()

  // ── Permission checks ──────────────────────────────────────────────────────
  const authUser = useAppSelector((state) => state.auth.user)
  const authRole = useAppSelector((state) => state.auth.role)
  // super-admin always allowed; school-admin only if DB field is true
  const canEditFees   = authRole === 'super-admin' || authUser?.feeCanEdit === true
  const canDeleteFees = authRole === 'super-admin' || authUser?.feeCanDelete === true
  // ──────────────────────────────────────────────────────────────────────────
  const [fees, setFees] = useState([])
  const [students, setStudents] = useState([])
  const [feeTypes, setFeeTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [showPayModal, setShowPayModal] = useState(null)
  const [paymentData, setPaymentData] = useState({ paymentMode: 'online', paidAmount: '', transactionId: '' })
  const [school, setSchool] = useState(null)
  const [formData, setFormData] = useState({
    studentId: '',
    classId: '',
    sectionId: '',
    feeType: 'tuition',
    description: '',
    amount: '',
    discount: '',
    dueDate: '',
    status: 'pending',
    academicYear: '2025-2026',
    term: 'Term 1',
  })

  useEffect(() => {
    loadData()
    loadSchool()
  }, [])

  useEffect(() => {
    if (formData.classId) {
      apiClient.listSections(formData.classId)
        .then((res) => setSections(Array.isArray(res) ? res : res?.data || []))
        .catch(() => setSections([]))
    } else {
      setSections([])
    }
  }, [formData.classId])

  const loadSchool = async () => {
    try {
      const res = await apiClient.listSchools()
      const list = res?.data || res || []
      if (list.length > 0) setSchool(list[0])
    } catch { /* ignore */ }
  }

  const loadData = async () => {
    try {
      const [feesRes, studentsRes, feeTypesRes, classesRes] = await Promise.all([
        apiClient.listFees(),
        apiClient.listStudents(),
        apiClient.listMasterData('fee-types').catch(() => []),
        apiClient.listClasses().catch(() => []),
      ])
      setFees(feesRes?.data || [])
      setStudents(studentsRes?.data || [])
      setFeeTypes(Array.isArray(feeTypesRes) ? feeTypesRes : feeTypesRes?.data || [])
      setClasses(Array.isArray(classesRes) ? classesRes : classesRes?.data || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await apiClient.updateFee(editingId, formData)
      } else {
        await apiClient.createFee(formData)
      }
      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Failed to save fee:', error)
      toast.error(`Failed to save: ${error.message}`)
    }
  }

  const resetForm = () => {
    setFormData({
      studentId: '',
      classId: '',
      sectionId: '',
      feeType: 'tuition',
      description: '',
      amount: '',
      discount: '',
      dueDate: '',
      status: 'pending',
      academicYear: '2025-2026',
      term: 'Term 1',
    })
  }

  const handleAddNew = () => {
    setEditingId(null)
    resetForm()
    setShowForm(true)
  }

  const handleEdit = (fee) => {
    setEditingId(fee.id)
    setFormData({
      studentId: fee.studentId,
      classId: fee.classId ? String(fee.classId) : '',
      sectionId: fee.sectionId ? String(fee.sectionId) : '',
      feeType: fee.feeType,
      description: fee.description || '',
      amount: fee.amount,
      discount: fee.discount || '',
      dueDate: fee.dueDate?.split('T')[0] || '',
      status: fee.status,
      academicYear: fee.academicYear || '2025-2026',
      term: fee.term || 'Term 1',
      paidDate: fee.paidDate ? fee.paidDate.split('T')[0] : '',
    })
    setShowForm(true)
  }

  const handleDelete = async (feeId) => {
    const confirmed = await confirm({
      message: 'Are you sure you want to delete this fee record?',
    })
    if (!confirmed) return
    try {
      await apiClient.deleteFee(feeId)
      loadData()
    } catch (error) {
      console.error('Failed to delete fee:', error)
      toast.error(`Failed to delete: ${error.message}`)
    }
  }

  const handlePay = async (e) => {
    e.preventDefault()
    try {
      await apiClient.payFee(showPayModal.id, {
        paymentMode: paymentData.paymentMode,
        paidAmount: paymentData.paidAmount || showPayModal.amount - (showPayModal.paidAmount || 0),
        transactionId: paymentData.transactionId,
      })
      setShowPayModal(null)
      setPaymentData({ paymentMode: 'online', paidAmount: '', transactionId: '' })
      loadData()
    } catch (error) {
      console.error('Failed to process payment:', error)
      toast.error(`Payment failed: ${error.message}`)
    }
  }

  const handleReceipt = (fee) => {
    const doc = new jsPDF('portrait', 'mm', 'a5')
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 12
    let y = 0

    // Border
    doc.setDrawColor(37, 99, 235)
    doc.setLineWidth(1.2)
    doc.rect(6, 6, pageW - 12, pageH - 12, 'S')

    // Header
    y = 20
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text(school?.name || 'School Name', pageW / 2, y, { align: 'center' })
    y += 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(school?.address || '', pageW / 2, y, { align: 'center' })

    // Title bar
    y += 8
    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y - 4, pageW - 2 * margin, 8, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('FEE RECEIPT', pageW / 2, y + 1, { align: 'center' })

    // Receipt No & Date
    y += 12
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`Receipt No: RCP-${String(fee.id).padStart(5, '0')}`, margin, y)
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageW - margin, y, { align: 'right' })

    // Divider
    y += 5
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.4)
    doc.line(margin, y, pageW - margin, y)

    // Student info
    y += 8
    const studentName = `${fee.student?.firstName || ''} ${fee.student?.lastName || ''}`.trim()
    const rows = [
      ['Student Name', studentName],
      ['Admission No.', fee.student?.admissionNumber || '-'],
      ['Roll Number', fee.student?.rollNumber || '-'],
      ['Fee Type', fee.feeType ? fee.feeType.charAt(0).toUpperCase() + fee.feeType.slice(1) + ' Fee' : '-'],
      ['Academic Year', fee.academicYear || '-'],
      ['Term', fee.term || '-'],
      ['Total Amount', `\u20B9${(fee.amount || 0).toLocaleString('en-IN')}`],
      ...(fee.discount > 0 ? [['Discount', `-\u20B9${(fee.discount || 0).toLocaleString('en-IN')}`]] : []),
      ...(fee.discount > 0 ? [['Net Payable', `\u20B9${((fee.amount || 0) - (fee.discount || 0)).toLocaleString('en-IN')}`]] : []),
      ['Amount Paid', `\u20B9${(fee.status === 'paid' ? ((fee.amount || 0) - (fee.discount || 0)) : (fee.paidAmount || 0)).toLocaleString('en-IN')}`],
      ['Balance', `\u20B9${(Math.max(0, (fee.amount || 0) - (fee.discount || 0) - (fee.status === 'paid' ? ((fee.amount || 0) - (fee.discount || 0)) : (fee.paidAmount || 0)))).toLocaleString('en-IN')}`],
      ['Payment Mode', fee.paymentMode || '-'],
      ['Transaction ID', fee.transactionId || '-'],
      ['Status', (fee.status || '').toUpperCase()],
    ]

    doc.setFontSize(9)
    rows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80, 80, 80)
      doc.text(label + ':', margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(String(value), margin + 42, y)
      y += 7
    })

    // Footer
    y += 4
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageW - margin, y)
    y += 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(120, 120, 120)
    doc.text('This is a computer-generated receipt and does not require a signature.', pageW / 2, y, { align: 'center' })

    doc.save(`Fee_Receipt_${studentName.replace(/\s+/g, '_')}_${fee.id}.pdf`)
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'paid': return { background: '#dcfce7', color: '#166534' }
      case 'pending': return { background: '#fef3c7', color: '#92400e' }
      case 'overdue': return { background: '#fecaca', color: '#991b1b' }
      case 'partial': return { background: '#dbeafe', color: '#1e40af' }
      default: return {}
    }
  }

  const filteredFees = fees.filter((fee) => {
    if (filterDate && fee.dueDate?.split('T')[0] !== filterDate) return false
    if (filterClass && String(fee.student?.classId) !== filterClass) return false
    const query = searchQuery.toLowerCase()
    const studentName = `${fee.student?.firstName || ''} ${fee.student?.lastName || ''}`.toLowerCase()
    return (
      studentName.includes(query) ||
      fee.feeType?.toLowerCase().includes(query) ||
      fee.status?.toLowerCase().includes(query) ||
      fee.student?.admissionNumber?.toLowerCase().includes(query) ||
      fee.student?.rollNumber?.toLowerCase().includes(query) ||
      fee.academicYear?.toLowerCase().includes(query) ||
      fee.term?.toLowerCase().includes(query)
    )
  })

  const totalFees = filteredFees.reduce((sum, f) => sum + (f.amount - (f.discount || 0)), 0)
  const totalPaid = filteredFees.reduce((sum, f) => {
    if (f.status === 'paid') return sum + (f.amount - (f.discount || 0))
    return sum + (f.paidAmount || 0)
  }, 0)
  const totalPending = totalFees - totalPaid

  const feeExportColumns = [
    { key: 'studentName', label: 'Student Name' },
    { key: 'feeType', label: 'Fee Type' },
    { key: 'amount', label: 'Amount (₹)' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'status', label: 'Status' },
    { key: 'paidAmount', label: 'Paid (₹)' },
    { key: 'paymentMode', label: 'Payment Mode' },
  ]

  const mapFeesForExport = (data) => data.map(fee => ({
    studentName: `${fee.student?.firstName || ''} ${fee.student?.lastName || ''}`.trim(),
    feeType: fee.feeType,
    amount: fee.amount,
    dueDate: fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : '',
    status: fee.status,
    paidAmount: fee.paidAmount || 0,
    paymentMode: fee.paymentMode || '',
  }))

  const handleExportCSV = () => {
    exportToCSV(mapFeesForExport(filteredFees), 'Fees', feeExportColumns)
  }

  const handleExportPDF = () => {
    exportToPDF(mapFeesForExport(filteredFees), 'Fees', feeExportColumns, 'Fee Records', 'landscape')
  }

  const { paginatedItems: paginatedFees, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredFees)

  return (
    <div className="page">
      <div className="page-header">
        <h1>💰 Fee Management</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={exportButtonStyle} onClick={handleExportCSV} title="Export CSV">
            📄 CSV
          </button>
          <button style={exportButtonStyle} onClick={handleExportPDF} title="Export PDF">
            📥 PDF
          </button>
          <button style={exportButtonStyle} onClick={() => printTable('fees-print-area', 'Fee Records')} title="Print"><Printer size={16} /> Print</button>
          <button className="btn primary" onClick={handleAddNew}>
            + Assign Fee
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-row" style={{ marginBottom: '1rem' }}>
        <div className="stat-card">
          <span className="stat-label">Total Fees</span>
          <span className="stat-number">₹{totalFees.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Collected</span>
          <span className="stat-number" style={{ color: '#16a34a' }}>₹{totalPaid.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending</span>
          <span className="stat-number" style={{ color: '#dc2626' }}>₹{totalPending.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Records</span>
          <span className="stat-number">{filteredFees.length}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by student name, roll number, fee type, status..."
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', paddingBottom: '1.5rem' }}>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ padding: '0.75rem 0.75rem', border: '1px solid var(--border, #e2e8f0)', borderRadius: '8px', fontSize: '0.9rem', background: 'var(--card-bg, #fff)', color: 'var(--text, #1e293b)', cursor: 'pointer' }}
            title="Filter by due date"
          />
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
          {(filterDate || filterClass) && (
            <button
              onClick={() => { setFilterDate(''); setFilterClass('') }}
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
          <Modal title={editingId ? 'Edit Fee' : 'Assign New Fee'} onClose={() => setShowForm(false)} footer={<button type="submit" form="fee-form" className="btn primary">{editingId ? 'Update Fee' : 'Assign Fee'}</button>}>
            <form id="fee-form" onSubmit={handleSubmit} className="form-grid">
              <label>
                <span className="field-label">Student *</span>
                <select
                  value={formData.studentId}
                  onChange={(e) => {
                    const sid = e.target.value
                    const student = students.find((s) => String(s.id) === sid)
                    setFormData({
                      ...formData,
                      studentId: sid,
                      classId: student?.classId ? String(student.classId) : '',
                      sectionId: student?.sectionId ? String(student.sectionId) : '',
                    })
                  }}
                  required
                >
                  <option value="">Select Student *</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.admissionNumber}{s.rollNumber ? ` / Roll: ${s.rollNumber}` : ''})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">Fee Type</span>
                <select
                  value={formData.feeType}
                  onChange={(e) => setFormData({ ...formData, feeType: e.target.value })}
                  required
                >
                  {feeTypes.map(t => (
                    <option key={t.id} value={t.label}>{t.label.charAt(0).toUpperCase() + t.label.slice(1)} Fee</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">Class *</span>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value, sectionId: '' })}
                  required
                >
                  <option value="">Select Class *</option>
                  {classes.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">Section</span>
                <select
                  value={formData.sectionId}
                  onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                >
                  <option value="">Select Section (optional)</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={String(sec.id)}>{sec.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">Amount (₹) *</span>
                <input
                  type="number"
                  placeholder="Amount (₹) *"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="1"
                />
              </label>
              <label>
                <span className="field-label">Discount (₹)</span>
                <input
                  type="number"
                  placeholder="Discount amount (₹) — leave blank for none"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  min="0"
                  max={formData.amount || undefined}
                />
              </label>
              {formData.amount && Number(formData.discount) > 0 && (
                <div style={{ gridColumn: '1 / -1', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#166534', display: 'flex', gap: '1.5rem' }}>
                  <span>Original: <strong>₹{Number(formData.amount).toLocaleString()}</strong></span>
                  <span>Discount: <strong>-₹{Number(formData.discount).toLocaleString()}</strong></span>
                  <span>Net Payable: <strong>₹{(Number(formData.amount) - Number(formData.discount)).toLocaleString()}</strong></span>
                </div>
              )}
              <label>
                <span className="field-label">Due Date *</span>
                <input
                  type="date"
                  title="Due Date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </label>
              <label>
                <span className="field-label">Description</span>
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </label>
              <label>
                <span className="field-label">Academic Year</span>
                <input
                  type="text"
                  placeholder="Academic Year (e.g. 2025-2026)"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                />
              </label>
              <label>
                <span className="field-label">Term</span>
                <select
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                >
                  {TERMS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              {editingId && (
                <label>
                  <span className="field-label">Status</span>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="partial">Partial</option>
                  </select>
                </label>
              )}
            </form>
          </Modal>
        )}

        {/* Payment Modal — now a proper popup */}
        {showPayModal && (
          <Modal
            title={`💳 Record Payment — ${showPayModal.student?.firstName} ${showPayModal.student?.lastName}`}
            onClose={() => { setShowPayModal(null); setPaymentData({ paymentMode: 'online', paidAmount: '', transactionId: '' }) }}
            size="md"
            footer={
              <button type="submit" form="pay-form" className="btn primary">✓ Confirm Payment</button>
            }
          >
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px 14px', marginBottom: '1.25rem', fontSize: '13px', color: '#0369a1', lineHeight: 1.6 }}>
              <strong style={{ textTransform: 'capitalize' }}>{showPayModal.feeType} Fee</strong> &nbsp;|&nbsp;
              Amount: <strong>₹{showPayModal.amount?.toLocaleString()}</strong>
              {showPayModal.discount > 0 && <> &nbsp;(disc: <strong>-₹{showPayModal.discount.toLocaleString()}</strong>)</>}
              &nbsp;|&nbsp; Net: <strong>₹{(showPayModal.amount - (showPayModal.discount || 0)).toLocaleString()}</strong>
              &nbsp;|&nbsp; Already Paid: <strong>₹{(showPayModal.paidAmount || 0).toLocaleString()}</strong>
              &nbsp;|&nbsp; Balance: <strong>₹{(showPayModal.amount - (showPayModal.discount || 0) - (showPayModal.paidAmount || 0)).toLocaleString()}</strong>
            </div>
            <form id="pay-form" onSubmit={handlePay} className="form-grid">
              <label>
                <span className="field-label">Amount to Pay (₹)</span>
                <input
                  type="number"
                  placeholder={`Amount to pay (₹${(showPayModal.amount - (showPayModal.discount || 0) - (showPayModal.paidAmount || 0)).toLocaleString()})`}
                  value={paymentData.paidAmount}
                  onChange={(e) => setPaymentData({ ...paymentData, paidAmount: e.target.value })}
                  max={showPayModal.amount - (showPayModal.discount || 0) - (showPayModal.paidAmount || 0)}
                  min="1"
                />
              </label>
              <label>
                <span className="field-label">Payment Mode</span>
                <select
                  value={paymentData.paymentMode}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
                >
                  <option value="online">Online</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                </select>
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span className="field-label">Transaction ID / Receipt No. (optional)</span>
                <input
                  type="text"
                  placeholder="Transaction ID / Receipt No."
                  value={paymentData.transactionId}
                  onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                />
              </label>
            </form>
          </Modal>
        )}

        {loading ? (
          <div className="loading-state">Loading fees...</div>
        ) : (
           <> 
          <div className="data-table" id="fees-print-area">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No.</th>
                  <th>Fee Type</th>
                  <th>Term</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Created</th>
                  <th>Due Date</th>
                  <th>Paid Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFees.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="empty-row">
                      {searchQuery ? 'No fees match your search.' : 'No fee records found. Assign fees to students!'}
                    </td>
                  </tr>
                ) : (
                  paginatedFees.map((fee) => (
                    <tr key={fee.id}>
                      <td>{fee.student?.firstName} {fee.student?.lastName}</td>
                      <td>{fee.student?.rollNumber || '-'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{fee.feeType}</td>
                      <td>{fee.term || '-'}</td>
                      <td>
                        <div>₹{fee.amount?.toLocaleString()}</div>
                        {fee.discount > 0 && (
                          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>-₹{fee.discount.toLocaleString()} disc</div>
                        )}
                      </td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>
                        ₹{(fee.status === 'paid' ? (fee.amount - (fee.discount || 0)) : (fee.paidAmount || 0)).toLocaleString()}
                      </td>
                      <td style={{ color: (() => { const net = fee.amount - (fee.discount || 0); const paid = fee.status === 'paid' ? net : (fee.paidAmount || 0); return net - paid > 0 ? '#dc2626' : '#16a34a' })(), fontWeight: 600 }}>
                        {(() => { const net = fee.amount - (fee.discount || 0); const paid = fee.status === 'paid' ? net : (fee.paidAmount || 0); return `₹${(net - paid).toLocaleString()}` })()}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        {fee.createdAt ? new Date(fee.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td>{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                      <td>
                        {fee.paidDate
                          ? <span style={{ color: '#16a34a', fontWeight: 600 }}>{new Date(fee.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td>
                        <span
                          style={{
                            ...getStatusStyle(fee.status),
                            padding: '0.25rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        >
                          {fee.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {fee.status !== 'paid' && (
                            <button
                              className="btn-icon edit"
                              onClick={() => {
                                setShowPayModal(fee)
                                setPaymentData({ paymentMode: 'online', paidAmount: '', transactionId: '' })
                              }}
                              aria-label="Record payment"
                              title="Record Payment"
                            >
                              <CreditCard size={16} />
                            </button>
                          )}
                          {(fee.status === 'paid' || fee.status === 'partial') && (
                            <button
                              className="btn-icon edit"
                              onClick={() => handleReceipt(fee)}
                              aria-label="Download receipt"
                              title="Download Receipt PDF"
                              style={{ color: '#16a34a' }}
                            >
                              <FileText size={16} />
                            </button>
                          )}
                          {canEditFees && (
                            <button className="btn-icon edit" onClick={() => handleEdit(fee)} aria-label="Edit fee">
                              <SquarePen size={16} />
                            </button>
                          )}
                          {canDeleteFees && (
                            <button className="btn-icon danger" onClick={() => handleDelete(fee.id)} aria-label="Delete fee">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
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

export default FeesPage
