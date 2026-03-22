// @ts-nocheck
import { useEffect, useState } from 'react'
import { SquarePen, Trash2, Printer } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import BulkImportModal from '@/components/BulkImportModal'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { exportToCSV, exportToPDF, exportButtonStyle } from '@/utils/exportUtils'
import Modal from '../components/Modal'
import { useAppSelector } from '@/store'

const EMPLOYEE_TYPES = ['teacher', 'driver', 'staff']
// Leave types loaded dynamically from Settings > Lookups
const STATUS_OPTIONS = ['pending', 'approved', 'rejected']

const STATUS_COLORS = {
  pending: { bg: '#fef3c7', color: '#92400e' },
  approved: { bg: '#d1fae5', color: '#065f46' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
}

const LeavesPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const authRole = useAppSelector((state) => state.auth.role)
  const isSuperAdmin = authRole === 'super-admin'
  const [leaves, setLeaves] = useState([])
  const [teachers, setTeachers] = useState([])
  const [drivers, setDrivers] = useState([])
  const [staffList, setStaffList] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('') // employee type filter
  const [filterStatus, setFilterStatus] = useState('')
  const [formData, setFormData] = useState({
    employeeType: 'teacher',
    employeeId: '',
    employeeName: '',
    leaveType: 'casual',
    fromDate: '',
    toDate: '',
    days: '',
    reason: '',
    status: 'pending',
    approvedBy: '',
    remarks: '',
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [leavesRes, teachersRes, driversRes, staffRes, leaveTypesRes] = await Promise.all([
        apiClient.listLeaves().catch(() => ({ data: [] })),
        apiClient.listTeachers().catch(() => ({ data: [] })),
        apiClient.listDrivers().catch(() => ({ data: [] })),
        apiClient.listStaff().catch(() => ({ data: [] })),
        apiClient.listMasterData('leave-types').catch(() => []),
      ])
      setLeaves(leavesRes?.data || [])
      setTeachers(teachersRes?.data || teachersRes || [])
      setDrivers(driversRes?.data || driversRes || [])
      setStaffList(staffRes?.data || [])
      setLeaveTypes(Array.isArray(leaveTypesRes) ? leaveTypesRes : leaveTypesRes?.data || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-calculate days when dates change
  const calcDays = (from, to) => {
    if (!from || !to) return ''
    const d1 = new Date(from)
    const d2 = new Date(to)
    const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 1
  }

  const handleDateChange = (field, value) => {
    const updated = { ...formData, [field]: value }
    if (updated.fromDate && updated.toDate) {
      updated.days = calcDays(updated.fromDate, updated.toDate)
    }
    setFormData(updated)
  }

  // Auto-fill name from selection
  const handleEmployeeSelect = (empId) => {
    let name = ''
    const id = parseInt(empId)
    if (formData.employeeType === 'teacher') {
      const t = teachers.find((t) => t.id === id)
      name = t ? `${t.firstName} ${t.lastName}` : ''
    } else if (formData.employeeType === 'driver') {
      const d = drivers.find((d) => d.id === id)
      name = d ? `${d.firstName} ${d.lastName}` : ''
    } else if (formData.employeeType === 'staff') {
      const s = staffList.find((s) => s.id === id)
      name = s ? `${s.firstName} ${s.lastName}` : ''
    }
    setFormData({ ...formData, employeeId: empId, employeeName: name })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        days: parseInt(formData.days) || 1,
        employeeId: formData.employeeId ? parseInt(formData.employeeId) : null,
      }
      if (!payload.approvedBy) delete payload.approvedBy
      if (!payload.remarks) delete payload.remarks
      if (editingId) {
        await apiClient.updateLeave(editingId, payload)
        toast.success('Leave updated!')
      } else {
        await apiClient.createLeave(payload)
        toast.success('Leave application created!')
      }
      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadData()
    } catch (error) {
      toast.error(error?.message || 'Failed to save leave application.')
    }
  }

  const resetForm = () => {
    setFormData({ employeeType: 'teacher', employeeId: '', employeeName: '', leaveType: 'casual', fromDate: '', toDate: '', days: '', reason: '', status: 'pending', approvedBy: '', remarks: '' })
  }

  const handleAddNew = () => {
    setEditingId(null)
    resetForm()
    setShowForm(true)
  }

  const handleEdit = (leave) => {
    setEditingId(leave.id)
    setFormData({
      employeeType: leave.employeeType || 'teacher',
      employeeId: leave.employeeId || '',
      employeeName: leave.employeeName || '',
      leaveType: leave.leaveType || 'casual',
      fromDate: leave.fromDate ? leave.fromDate.split('T')[0] : '',
      toDate: leave.toDate ? leave.toDate.split('T')[0] : '',
      days: leave.days || '',
      reason: leave.reason || '',
      status: leave.status || 'pending',
      approvedBy: leave.approvedBy || '',
      remarks: leave.remarks || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ message: 'Delete this leave record?' })
    if (!ok) return
    try {
      await apiClient.deleteLeave(id)
      toast.success('Leave deleted.')
      loadData()
    } catch (error) {
      toast.error(error?.message || 'Failed to delete leave.')
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await apiClient.updateLeave(id, { status: newStatus })
      toast.success(`Leave ${newStatus}!`)
      loadData()
    } catch (error) {
      toast.error(error?.message || 'Failed to update status.')
    }
  }

  // ── Print ───────────────────────────────────────────────
  const handlePrint = () => {
    const printContent = document.getElementById('leaves-print-area')
    if (!printContent) return
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html><head><title>Leave Records</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-size: 12px; }
        th { background: #f3f4f6; font-weight: 600; }
        .badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
        @media print { button { display: none; } }
      </style></head><body>
      <h2>📋 Leave Records</h2>
      ${printContent.innerHTML}
      </body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  // ── Export ──────────────────────────────────────────────
  const exportColumns = [
    { key: 'employeeName', label: 'Employee' },
    { key: 'employeeType', label: 'Type' },
    { key: 'leaveType', label: 'Leave Type' },
    { key: 'fromDate', label: 'From' },
    { key: 'toDate', label: 'To' },
    { key: 'days', label: 'Days' },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status' },
  ]

  const templateHeaders = ['employeeType', 'employeeName', 'leaveType', 'fromDate', 'toDate', 'days', 'reason']
  const mapRow = (row) => {
    if (!row.employeeName || !row.fromDate || !row.toDate) return null
    return {
      employeeType: EMPLOYEE_TYPES.includes(row.employeeType) ? row.employeeType : 'staff',
      employeeName: String(row.employeeName).trim(),
      leaveType: row.leaveType || 'casual',
      fromDate: String(row.fromDate).trim(),
      toDate: String(row.toDate).trim(),
      days: parseInt(row.days) || 1,
      reason: row.reason || 'Leave',
    }
  }

  const filteredLeaves = leaves.filter((l) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = l.employeeName?.toLowerCase().includes(q) || l.reason?.toLowerCase().includes(q) || l.leaveType?.toLowerCase().includes(q)
    const matchesType = !filterType || l.employeeType === filterType
    const matchesStatus = !filterStatus || l.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  // ── Stats ───────────────────────────────────────────────
  const pendingCount = leaves.filter((l) => l.status === 'pending').length
  const approvedCount = leaves.filter((l) => l.status === 'approved').length

  const { paginatedItems, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredLeaves)

  // Employee options for dropdown
  const employeeOptions = formData.employeeType === 'teacher'
    ? teachers.map((t) => ({ id: t.id, name: `${t.firstName} ${t.lastName}` }))
    : formData.employeeType === 'driver'
      ? drivers.map((d) => ({ id: d.id, name: `${d.firstName} ${d.lastName}` }))
      : formData.employeeType === 'staff'
        ? staffList.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName} (${s.designation})` }))
        : []

  return (
    <div className="page">
      <div className="page-header">
        <h1>📋 Leaves</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e', background: '#fef3c7', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
            Pending: {pendingCount}
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#065f46', background: '#d1fae5', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
            Approved: {approvedCount}
          </span>
          <button style={exportButtonStyle} onClick={() => exportToCSV(filteredLeaves, 'Leaves', exportColumns)} title="Export CSV">📄 CSV</button>
          <button style={exportButtonStyle} onClick={() => exportToPDF(filteredLeaves, 'Leaves', exportColumns, 'Leave Records', 'landscape')} title="Export PDF">📥 PDF</button>
          <button style={exportButtonStyle} onClick={handlePrint} title="Print"><Printer size={16} /> Print</button>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>Bulk Import</button>
          <button className="btn primary" onClick={handleAddNew}>
            + Apply Leave
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, reason..." style={{ flex: '1 1 260px', minWidth: '200px', marginBottom: 0 }} />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ minWidth: '150px', height: '42px', padding: '0 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}>
          <option value="">All Employees</option>
          {EMPLOYEE_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}s</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ minWidth: '130px', height: '42px', padding: '0 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}>
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="page-content-scrollable">
        {showForm && (
          <Modal title={editingId ? 'Edit Leave' : 'Apply for Leave'} onClose={() => setShowForm(false)} footer={<button type="submit" form="leave-form" className="btn primary">{editingId ? 'Update Leave' : 'Submit Leave Application'}</button>}>
            <form id="leave-form" onSubmit={handleSubmit} className="form-grid">
              <label>
                <span className="field-label">Employee Type</span>
                <select value={formData.employeeType} onChange={(e) => setFormData({ ...formData, employeeType: e.target.value, employeeId: '', employeeName: '' })}>
                  {EMPLOYEE_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </label>

              {employeeOptions.length > 0 ? (
                <label>
                  <span className="field-label">Select {formData.employeeType === 'staff' ? 'Staff' : formData.employeeType.charAt(0).toUpperCase() + formData.employeeType.slice(1)}</span>
                  <select value={formData.employeeId} onChange={(e) => handleEmployeeSelect(e.target.value)}>
                    <option value="">-- Select {formData.employeeType} --</option>
                    {employeeOptions.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  <span className="field-label">Employee Name *</span>
                  <input type="text" placeholder="Employee Name *" value={formData.employeeName} onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })} required />
                </label>
              )}

              {formData.employeeType !== 'staff' && employeeOptions.length > 0 && (
                <label>
                  <span className="field-label">Employee Name</span>
                  <input type="text" placeholder="Employee Name" value={formData.employeeName} readOnly style={{ background: '#f9fafb' }} />
                </label>
              )}

              <label>
                <span className="field-label">Leave Type</span>
                <select value={formData.leaveType} onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.label}>{t.label.charAt(0).toUpperCase() + t.label.slice(1)}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="field-label">From Date *</span>
                <input type="date" title="From Date" placeholder="From Date *" value={formData.fromDate} onChange={(e) => handleDateChange('fromDate', e.target.value)} required />
              </label>
              <label>
                <span className="field-label">To Date *</span>
                <input type="date" title="To Date" placeholder="To Date *" value={formData.toDate} onChange={(e) => handleDateChange('toDate', e.target.value)} required />
              </label>
              <label>
                <span className="field-label">Days *</span>
                <input type="number" placeholder="Days *" value={formData.days} onChange={(e) => setFormData({ ...formData, days: e.target.value })} min="1" required />
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                <span className="field-label">Reason *</span>
                <textarea placeholder="Reason *" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows="2" required />
              </label>

              {editingId && (
                <>
                  <label>
                    <span className="field-label">Status {!isSuperAdmin && '🔒'}</span>
                    {isSuperAdmin ? (
                      <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                        readOnly
                        style={{ background: '#f9fafb', cursor: 'not-allowed' }}
                        title="Only Super Admin can approve or reject leave applications"
                      />
                    )}
                  </label>
                  <label>
                    <span className="field-label">Approved By</span>
                    <input type="text" placeholder="Approved By" value={formData.approvedBy} onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })} />
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    <span className="field-label">Remarks</span>
                    <textarea placeholder="Remarks" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} rows="2" />
                  </label>
                </>
              )}

            </form>
          </Modal>
        )}

        {loading ? (
          <div className="loading-state">Loading leaves...</div>
        ) : (
          <div className="data-table" id="leaves-print-area">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.length === 0 ? (
                  <tr><td colSpan="9" className="empty-row">{searchQuery ? 'No leaves match.' : 'No leave applications yet.'}</td></tr>
                ) : (
                  paginatedItems.map((leave) => {
                    const statusColor = STATUS_COLORS[leave.status] || STATUS_COLORS.pending
                    return (
                      <tr key={leave.id}>
                        <td style={{ fontWeight: 600 }}>{leave.employeeName}</td>
                        <td style={{ textTransform: 'capitalize' }}>{leave.employeeType}</td>
                        <td style={{ textTransform: 'capitalize' }}>{leave.leaveType}</td>
                        <td>{leave.fromDate ? new Date(leave.fromDate).toLocaleDateString('en-IN') : '-'}</td>
                        <td>{leave.toDate ? new Date(leave.toDate).toLocaleDateString('en-IN') : '-'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{leave.days}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.reason}>{leave.reason}</td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                            background: statusColor.bg, color: statusColor.color, textTransform: 'capitalize',
                          }}>{leave.status}</span>
                        </td>
                        <td className="no-print">
                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            {leave.status === 'pending' && isSuperAdmin && (
                              <>
                                <button className="btn-icon edit" onClick={() => handleStatusChange(leave.id, 'approved')} title="Approve" style={{ color: '#065f46' }}>✓</button>
                                <button className="btn-icon danger" onClick={() => handleStatusChange(leave.id, 'rejected')} title="Reject" style={{ color: '#991b1b' }}>✕</button>
                              </>
                            )}
                            <button className="btn-icon edit" onClick={() => handleEdit(leave)}><SquarePen size={16} /></button>
                            <button className="btn-icon danger" onClick={() => handleDelete(leave.id)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={goToPage} />
          </div>
        )}

        {showBulkImport && (
          <BulkImportModal
            title="Leaves"
            templateHeaders={templateHeaders}
            mapRowToPayload={mapRow}
            createItem={(payload) => apiClient.createLeave(payload)}
            onClose={() => setShowBulkImport(false)}
            onDone={() => loadData()}
          />
        )}
      </div>
    </div>
  )
}

export default LeavesPage
