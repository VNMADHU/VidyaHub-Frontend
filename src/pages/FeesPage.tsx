// @ts-nocheck
import { useEffect, useState } from 'react'
import { Trash2, SquarePen, CreditCard } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import SearchBar from '@/components/SearchBar'
import { useToast } from '@/components/ToastContainer'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { exportToCSV, exportToPDF, exportButtonStyle } from '@/utils/exportUtils'

const FEE_TYPES = ['tuition', 'exam', 'transport', 'library', 'sports', 'lab', 'other']
const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Annual']

const FeesPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const [fees, setFees] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPayModal, setShowPayModal] = useState(null)
  const [paymentData, setPaymentData] = useState({ paymentMode: 'online', paidAmount: '', transactionId: '' })
  const [formData, setFormData] = useState({
    studentId: '',
    feeType: 'tuition',
    description: '',
    amount: '',
    dueDate: '',
    status: 'pending',
    academicYear: '2025-2026',
    term: 'Term 1',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [feesRes, studentsRes] = await Promise.all([
        apiClient.listFees(),
        apiClient.listStudents(),
      ])
      setFees(feesRes?.data || [])
      setStudents(studentsRes?.data || [])
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
      feeType: 'tuition',
      description: '',
      amount: '',
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
      feeType: fee.feeType,
      description: fee.description || '',
      amount: fee.amount,
      dueDate: fee.dueDate?.split('T')[0] || '',
      status: fee.status,
      academicYear: fee.academicYear || '2025-2026',
      term: fee.term || 'Term 1',
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

  const getStatusStyle = (status) => {
    switch (status) {
      case 'paid': return { background: '#dcfce7', color: '#166534' }
      case 'pending': return { background: '#fef3c7', color: '#92400e' }
      case 'overdue': return { background: '#fecaca', color: '#991b1b' }
      case 'partial': return { background: '#dbeafe', color: '#1e40af' }
      default: return {}
    }
  }

  const totalFees = fees.reduce((sum, f) => sum + f.amount, 0)
  const totalPaid = fees.reduce((sum, f) => sum + (f.paidAmount || 0), 0)
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

  const filteredFees = fees.filter((fee) => {
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
          <button className="btn primary" onClick={() => showForm ? setShowForm(false) : handleAddNew()}>
            {showForm ? 'Cancel' : '+ Assign Fee'}
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
          <span className="stat-number">{fees.length}</span>
        </div>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by student name, roll number, fee type, status..."
      />

      <div className="page-content-scrollable">
        {showForm && (
          <div className="form-card">
            <h3>{editingId ? 'Edit Fee' : 'Assign New Fee'}</h3>
            <form onSubmit={handleSubmit} className="form-grid">
              <select
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                required
              >
                <option value="">Select Student</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.admissionNumber}{s.rollNumber ? ` / Roll: ${s.rollNumber}` : ''})
                  </option>
                ))}
              </select>
              <select
                value={formData.feeType}
                onChange={(e) => setFormData({ ...formData, feeType: e.target.value })}
                required
              >
                {FEE_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} Fee</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Amount (₹)"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                min="1"
              />
              <input
                type="date"
                placeholder="Due Date"
                title="Due Date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <input
                type="text"
                placeholder="Academic Year (e.g. 2025-2026)"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              />
              <select
                value={formData.term}
                onChange={(e) => setFormData({ ...formData, term: e.target.value })}
              >
                {TERMS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {editingId && (
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="partial">Partial</option>
                </select>
              )}
              <button type="submit" className="btn primary" style={{ gridColumn: '1 / -1' }}>
                {editingId ? 'Update Fee' : 'Assign Fee'}
              </button>
            </form>
          </div>
        )}

        {/* Payment Modal */}
        {showPayModal && (
          <div className="form-card" style={{ border: '2px solid var(--primary)', marginBottom: '1.5rem' }}>
            <h3>💳 Record Payment — {showPayModal.student?.firstName} {showPayModal.student?.lastName}</h3>
            <p style={{ color: 'var(--muted)', margin: '0 0 1rem' }}>
              {showPayModal.feeType} Fee — Amount: ₹{showPayModal.amount} | Already Paid: ₹{showPayModal.paidAmount || 0} | Balance: ₹{showPayModal.amount - (showPayModal.paidAmount || 0)}
            </p>
            <form onSubmit={handlePay} className="form-grid">
              <input
                type="number"
                placeholder={`Amount to pay (₹${showPayModal.amount - (showPayModal.paidAmount || 0)})`}
                value={paymentData.paidAmount}
                onChange={(e) => setPaymentData({ ...paymentData, paidAmount: e.target.value })}
                max={showPayModal.amount - (showPayModal.paidAmount || 0)}
                min="1"
              />
              <select
                value={paymentData.paymentMode}
                onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
              >
                <option value="online">Online</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
              </select>
              <input
                type="text"
                placeholder="Transaction ID / Receipt No. (optional)"
                value={paymentData.transactionId}
                onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
              />
              <div style={{ display: 'flex', gap: '0.75rem', gridColumn: '1 / -1' }}>
                <button type="submit" className="btn primary">✓ Confirm Payment</button>
                <button type="button" className="btn outline" onClick={() => setShowPayModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading fees...</div>
        ) : (
           <> 
          <div className="data-table">
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
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFees.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="empty-row">
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
                      <td>₹{fee.amount?.toLocaleString()}</td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>₹{(fee.paidAmount || 0).toLocaleString()}</td>
                      <td style={{ color: fee.amount - (fee.paidAmount || 0) > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                        ₹{(fee.amount - (fee.paidAmount || 0)).toLocaleString()}
                      </td>
                      <td>{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '-'}</td>
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
                          <button className="btn-icon edit" onClick={() => handleEdit(fee)} aria-label="Edit fee">
                            <SquarePen size={16} />
                          </button>
                          <button className="btn-icon danger" onClick={() => handleDelete(fee.id)} aria-label="Delete fee">
                            <Trash2 size={16} />
                          </button>
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
