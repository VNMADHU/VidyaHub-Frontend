// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SquarePen, Trash2, Printer } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import BulkImportModal from '@/components/BulkImportModal'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { exportToCSV, exportToPDF, exportButtonStyle, printTable } from '@/utils/exportUtils'

const DESIGNATIONS = [
  'Watchman', 'Security Guard', 'Cleaning Staff', 'Sweeper', 'Peon', 'Office Boy',
  'Accountant', 'Clerk', 'Receptionist', 'Lab Assistant', 'Librarian',
  'Cook', 'Kitchen Staff', 'Gardener', 'Electrician', 'Plumber',
  'IT Support', 'Nurse', 'Counsellor', 'Bus Conductor', 'Hostel Warden', 'Other',
]

const DEPARTMENTS = ['Office', 'Security', 'Housekeeping', 'Laboratory', 'Library', 'Kitchen', 'Hostel', 'Maintenance', 'Transport', 'Other']

const STATUS_OPTIONS = ['active', 'on-leave', 'inactive', 'terminated']

const STATUS_COLORS = {
  active: { bg: '#d1fae5', color: '#065f46' },
  'on-leave': { bg: '#fef3c7', color: '#92400e' },
  inactive: { bg: '#e5e7eb', color: '#374151' },
  terminated: { bg: '#fee2e2', color: '#991b1b' },
}

const EMPTY_FORM = {
  firstName: '', lastName: '', staffId: '', designation: 'Watchman', department: '',
  phoneNumber: '', email: '', dateOfBirth: '', gender: '', address: '',
  aadhaarNumber: '', joiningDate: '', salary: '', bloodGroup: '',
  emergencyContact: '', status: 'active',
}

const exportCols = [
  { key: 'staffId', label: 'Staff ID' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'designation', label: 'Designation' },
  { key: 'department', label: 'Department' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
]

const templateHeaders = ['firstName', 'lastName', 'staffId', 'designation', 'department', 'phoneNumber', 'email', 'gender', 'joiningDate', 'salary', 'status']

const StaffPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const navigate = useNavigate()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDesignation, setFilterDesignation] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => { loadStaff() }, [])

  const loadStaff = async () => {
    try {
      const res = await apiClient.listStaff()
      setStaff(res?.data || [])
    } catch (err) {
      console.error('Failed to load staff:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        gender: formData.gender || null,
        bloodGroup: formData.bloodGroup || null,
        status: formData.status || 'active',
      }
      if (editingId) {
        await apiClient.updateStaff(editingId, payload)
        toast.success('Staff member updated successfully')
      } else {
        await apiClient.createStaff(payload)
        toast.success('Staff member added successfully')
      }
      setFormData(EMPTY_FORM)
      setEditingId(null)
      setShowForm(false)
      loadStaff()
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save staff member')
    }
  }

  const handleEdit = (member) => {
    setFormData({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      staffId: member.staffId || '',
      designation: member.designation || 'Watchman',
      department: member.department || '',
      phoneNumber: member.phoneNumber || '',
      email: member.email || '',
      dateOfBirth: member.dateOfBirth ? member.dateOfBirth.split('T')[0] : '',
      gender: member.gender || '',
      address: member.address || '',
      aadhaarNumber: member.aadhaarNumber || '',
      joiningDate: member.joiningDate ? member.joiningDate.split('T')[0] : '',
      salary: member.salary || '',
      bloodGroup: member.bloodGroup || '',
      emergencyContact: member.emergencyContact || '',
      status: member.status || 'active',
    })
    setEditingId(member.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Staff Member', message: 'Are you sure you want to delete this staff member?' })
    if (!ok) return
    try {
      await apiClient.deleteStaff(id)
      toast.success('Staff member deleted')
      loadStaff()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete staff member')
    }
  }

  const filteredStaff = staff.filter((m) => {
    const name = `${m.firstName} ${m.lastName}`.toLowerCase()
    const matchSearch = !searchQuery || name.includes(searchQuery.toLowerCase()) ||
      (m.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.staffId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.phoneNumber || '').includes(searchQuery)
    const matchDesignation = !filterDesignation || m.designation === filterDesignation
    const matchStatus = !filterStatus || m.status === filterStatus
    return matchSearch && matchDesignation && matchStatus
  })

  const { paginatedItems, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredStaff, 15)

  const activeCount = staff.filter((m) => m.status === 'active').length

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1>🧹 Staff</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
            Active: {activeCount}
          </span>
          <span style={{ background: '#e5e7eb', color: '#374151', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
            Total: {staff.length}
          </span>
          <button style={exportButtonStyle} onClick={() => exportToCSV(filteredStaff, 'Staff', exportCols)} title="Export CSV">📄 CSV</button>
          <button style={exportButtonStyle} onClick={() => exportToPDF(filteredStaff, 'Staff', exportCols, 'Staff List')} title="Export PDF">📥 PDF</button>
          <button style={exportButtonStyle} onClick={() => printTable('staff-print-area', 'Staff List')} title="Print"><Printer size={16} /> Print</button>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>Bulk Import</button>
          <button
            className="btn primary"
            onClick={() => {
              if (showForm && !editingId) { setShowForm(false) }
              else { setFormData(EMPTY_FORM); setEditingId(null); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }
            }}
          >
            {showForm && !editingId ? 'Cancel' : '+ Add Staff'}
          </button>
        </div>
      </div>

      {/* Bulk Import */}
      {showBulkImport && (
        <BulkImportModal
          title="Bulk Import Staff"
          templateHeaders={templateHeaders}
          onImport={async (rows) => {
            let ok = 0, fail = 0
            for (const row of rows) {
              try {
                await apiClient.createStaff({ ...row, salary: row.salary ? parseFloat(row.salary) : null })
                ok++
              } catch { fail++ }
            }
            toast.success(`Imported ${ok} staff members${fail ? `, ${fail} failed` : ''}`)
            loadStaff()
            setShowBulkImport(false)
          }}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingId ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <input placeholder="First Name *" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            <input placeholder="Last Name *" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
            <input placeholder="Staff ID (e.g. STF001)" value={formData.staffId} onChange={(e) => setFormData({ ...formData, staffId: e.target.value })} />

            <select value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} required>
              {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}>
              <option value="">-- Department --</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            <input placeholder="Phone Number" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
            <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />

            <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
              <option value="">-- Gender --</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>

            <input type="date" title="Date of Birth" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
            <input type="date" title="Joining Date" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} />

            <input type="number" placeholder="Salary (₹)" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} min="0" />
            <input placeholder="Aadhaar Number (12 digits)" value={formData.aadhaarNumber} onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })} maxLength={12} />
            <input placeholder="Emergency Contact" value={formData.emergencyContact} onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })} />

            <select value={formData.bloodGroup} onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}>
              <option value="">-- Blood Group --</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
            </select>

            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>

            <textarea placeholder="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows="2" style={{ gridColumn: '1 / -1' }} />

            <button type="submit" className="btn primary" style={{ gridColumn: '1 / -1' }}>
              {editingId ? 'Update Staff Member' : 'Add Staff Member'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, designation, ID..." />
        <select value={filterDesignation} onChange={(e) => setFilterDesignation(e.target.value)} className="filter-select">
          <option value="">All Designations</option>
          {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-state">Loading staff...</div>
      ) : (
        <div className="data-table" id="staff-print-area">
          <table>
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Name</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Joining Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr><td colSpan={8} className="empty-row">{searchQuery || filterDesignation || filterStatus ? 'No staff match the filters.' : 'No staff added yet. Click "+ Add Staff" to get started.'}</td></tr>
              ) : (
                paginatedItems.map((member) => (
                  <tr key={member.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/portal/staff/${member.id}`)}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{member.staffId || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{member.firstName} {member.lastName}</td>
                    <td>{member.designation}</td>
                    <td>{member.department || '-'}</td>
                    <td>{member.phoneNumber || '-'}</td>
                    <td>{member.joiningDate ? new Date(member.joiningDate).toLocaleDateString('en-IN') : '-'}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                        background: STATUS_COLORS[member.status]?.bg || '#e5e7eb',
                        color: STATUS_COLORS[member.status]?.color || '#374151',
                      }}>
                        {member.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-icon edit" onClick={(e) => { e.stopPropagation(); handleEdit(member) }} title="Edit"><SquarePen size={16} /></button>
                      <button className="btn-icon danger" onClick={(e) => { e.stopPropagation(); handleDelete(member.id) }} title="Delete"><Trash2 size={16} /></button>
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
  )
}

export default StaffPage
