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
import { exportToCSV, exportToPDF, exportButtonStyle, printTable } from '@/utils/exportUtils'

const ExpensesPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const [expenses, setExpenses] = useState([])
  const [expenseCategories, setExpenseCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    category: 'maintenance',
    amount: '',
    date: '',
    paidTo: '',
    paymentMode: 'cash',
    receiptNo: '',
    description: '',
    approvedBy: '',
    status: 'approved',
  })

  useEffect(() => {
    loadExpenses()
    apiClient.listMasterData('expense-categories').then((data) => {
      setExpenseCategories(Array.isArray(data) ? data : data?.data || [])
    }).catch(() => {})
  }, [])

  const loadExpenses = async () => {
    try {
      const response = await apiClient.listExpenses()
      setExpenses(response?.data || [])
    } catch (error) {
      console.error('Failed to load expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...formData, amount: parseFloat(formData.amount) || 0 }
      if (editingId) {
        await apiClient.updateExpense(editingId, payload)
      } else {
        await apiClient.createExpense(payload)
      }
      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadExpenses()
    } catch (error) {
      toast.error(error?.message || 'Failed to save expense.')
    }
  }

  const resetForm = () => {
    setFormData({ title: '', category: 'maintenance', amount: '', date: '', paidTo: '', paymentMode: 'cash', receiptNo: '', description: '', approvedBy: '', status: 'approved' })
  }

  const handleAddNew = () => {
    setEditingId(null)
    resetForm()
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEdit = (expense) => {
    setEditingId(expense.id)
    setFormData({
      title: expense.title || '',
      category: expense.category || 'maintenance',
      amount: expense.amount || '',
      date: expense.date ? expense.date.split('T')[0] : '',
      paidTo: expense.paidTo || '',
      paymentMode: expense.paymentMode || 'cash',
      receiptNo: expense.receiptNo || '',
      description: expense.description || '',
      approvedBy: expense.approvedBy || '',
      status: expense.status || 'approved',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ message: 'Delete this expense record?' })
    if (!ok) return
    try {
      await apiClient.deleteExpense(id)
      loadExpenses()
    } catch (error) {
      toast.error(error?.message || 'Failed to delete expense.')
    }
  }

  // ── Summary ─────────────────────────────────────────────
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  // ── Export ──────────────────────────────────────────────
  const expenseExportColumns = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount (₹)' },
    { key: 'date', label: 'Date' },
    { key: 'paidTo', label: 'Paid To' },
    { key: 'paymentMode', label: 'Payment Mode' },
    { key: 'status', label: 'Status' },
  ]

  const templateHeaders = ['title', 'category', 'amount', 'date', 'paidTo', 'paymentMode', 'description']
  const mapRow = (row) => {
    if (!row.title || !row.amount || !row.date) return null
    return {
      title: String(row.title).trim(),
      category: row.category || 'other',
      amount: parseFloat(row.amount),
      date: String(row.date).trim(),
      paidTo: row.paidTo || '',
      paymentMode: row.paymentMode || 'cash',
      description: row.description || '',
    }
  }

  const filteredExpenses = expenses.filter((e) => {
    const q = searchQuery.toLowerCase()
    return e.title?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q) || e.paidTo?.toLowerCase().includes(q)
  })

  const { paginatedItems, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredExpenses)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Expenses</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e40af', background: '#dbeafe', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
            Total: ₹{totalExpenses.toLocaleString('en-IN')}
          </span>
          <button style={exportButtonStyle} onClick={() => exportToCSV(filteredExpenses, 'Expenses', expenseExportColumns)} title="Export CSV">📄 CSV</button>
          <button style={exportButtonStyle} onClick={() => exportToPDF(filteredExpenses, 'Expenses', expenseExportColumns, 'School Expenses')} title="Export PDF">📥 PDF</button>
          <button style={exportButtonStyle} onClick={() => printTable('expenses-print-area', 'School Expenses')} title="Print"><Printer size={16} /> Print</button>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>Bulk Import</button>
          <button className="btn primary" onClick={() => showForm ? setShowForm(false) : handleAddNew()}>
            {showForm ? 'Cancel' : '+ Add Expense'}
          </button>
        </div>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by title, category, paid to..."
      />

      <div className="page-content-scrollable">
        {showForm && (
          <div className="form-card">
            <h3>{editingId ? 'Edit Expense' : 'Add Expense'}</h3>
            <form onSubmit={handleSubmit} className="form-grid">
              <input type="text" placeholder="Title / Description *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                <option value="">-- Category --</option>
                {expenseCategories.map(c => (
                  <option key={c.id} value={c.label}>{c.label.charAt(0).toUpperCase() + c.label.slice(1)}</option>
                ))}
              </select>
              <input type="number" placeholder="Amount (₹) *" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required min="0" step="0.01" />
              <input type="date" title="Expense Date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              <input type="text" placeholder="Paid To (vendor / person)" value={formData.paidTo} onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })} />
              <select value={formData.paymentMode} onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}>
                <option value="cash">Cash</option>
                <option value="online">Online Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
              </select>
              <input type="text" placeholder="Receipt / Bill No." value={formData.receiptNo} onChange={(e) => setFormData({ ...formData, receiptNo: e.target.value })} />
              <input type="text" placeholder="Approved By" value={formData.approvedBy} onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })} />
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <textarea placeholder="Notes / Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="2" style={{ gridColumn: '1 / -1' }} />
              <button type="submit" className="btn primary" style={{ gridColumn: '1 / -1' }}>
                {editingId ? 'Update Expense' : 'Add Expense'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading expenses...</div>
        ) : (
          <div className="data-table" id="expenses-print-area">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount (₹)</th>
                  <th>Date</th>
                  <th>Paid To</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr><td colSpan="8" className="empty-row">{searchQuery ? 'No expenses match.' : 'No expenses recorded. Add your first expense!'}</td></tr>
                ) : (
                  paginatedItems.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.title}</td>
                      <td style={{ textTransform: 'capitalize' }}>{expense.category}</td>
                      <td style={{ fontWeight: 600 }}>₹{expense.amount?.toLocaleString('en-IN')}</td>
                      <td>{expense.date ? new Date(expense.date).toLocaleDateString('en-IN') : '-'}</td>
                      <td>{expense.paidTo || '-'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{expense.paymentMode || '-'}</td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                          background: expense.status === 'approved' ? '#d1fae5' : expense.status === 'pending' ? '#fef3c7' : '#fee2e2',
                          color: expense.status === 'approved' ? '#065f46' : expense.status === 'pending' ? '#92400e' : '#991b1b',
                        }}>{expense.status}</span>
                      </td>
                      <td>
                        <button className="btn-icon edit" onClick={() => handleEdit(expense)}><SquarePen size={16} /></button>
                        <button className="btn-icon danger" onClick={() => handleDelete(expense.id)}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={goToPage} />
          </div>
        )}

        {showBulkImport && (
          <BulkImportModal
            title="Expenses"
            templateHeaders={templateHeaders}
            mapRowToPayload={mapRow}
            createItem={(payload) => apiClient.createExpense(payload)}
            onClose={() => setShowBulkImport(false)}
            onDone={() => loadExpenses()}
          />
        )}
      </div>
    </div>
  )
}

export default ExpensesPage
