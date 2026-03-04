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

const HOLIDAY_TYPES = ['national', 'regional', 'school', 'religious', 'seasonal']
const TYPE_COLORS = {
  national: { bg: '#dbeafe', color: '#1e40af' },
  regional: { bg: '#fef3c7', color: '#92400e' },
  school: { bg: '#d1fae5', color: '#065f46' },
  religious: { bg: '#ede9fe', color: '#5b21b6' },
  seasonal: { bg: '#fce7f3', color: '#9d174d' },
}

const HolidaysPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    toDate: '',
    type: 'national',
    description: '',
  })

  useEffect(() => { loadHolidays() }, [])

  const loadHolidays = async () => {
    try {
      const response = await apiClient.listHolidays()
      setHolidays(response?.data || [])
    } catch (error) {
      console.error('Failed to load holidays:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...formData }
      if (!payload.toDate) delete payload.toDate
      if (!payload.description) delete payload.description
      if (editingId) {
        await apiClient.updateHoliday(editingId, payload)
        toast.success('Holiday updated!')
      } else {
        await apiClient.createHoliday(payload)
        toast.success('Holiday added!')
      }
      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadHolidays()
    } catch (error) {
      toast.error(error?.message || 'Failed to save holiday.')
    }
  }

  const resetForm = () => {
    setFormData({ title: '', date: '', toDate: '', type: 'national', description: '' })
  }

  const handleAddNew = () => {
    setEditingId(null)
    resetForm()
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEdit = (holiday) => {
    setEditingId(holiday.id)
    setFormData({
      title: holiday.title || '',
      date: holiday.date ? holiday.date.split('T')[0] : '',
      toDate: holiday.toDate ? holiday.toDate.split('T')[0] : '',
      type: holiday.type || 'national',
      description: holiday.description || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ message: 'Delete this holiday?' })
    if (!ok) return
    try {
      await apiClient.deleteHoliday(id)
      toast.success('Holiday deleted.')
      loadHolidays()
    } catch (error) {
      toast.error(error?.message || 'Failed to delete holiday.')
    }
  }

  // ── Print ───────────────────────────────────────────────
  const handlePrint = () => {
    const printContent = document.getElementById('holidays-print-area')
    if (!printContent) return
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html><head><title>Holidays List</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-size: 13px; }
        th { background: #f3f4f6; font-weight: 600; }
        .badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
        @media print { button { display: none; } }
      </style></head><body>
      <h2>🏖️ School Holidays</h2>
      ${printContent.innerHTML}
      </body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  // ── Export ──────────────────────────────────────────────
  const exportColumns = [
    { key: 'title', label: 'Holiday' },
    { key: 'type', label: 'Type' },
    { key: 'date', label: 'From Date' },
    { key: 'toDate', label: 'To Date' },
    { key: 'description', label: 'Description' },
  ]

  const templateHeaders = ['title', 'date', 'toDate', 'type', 'description']
  const mapRow = (row) => {
    if (!row.title || !row.date) return null
    return {
      title: String(row.title).trim(),
      date: String(row.date).trim(),
      toDate: row.toDate || '',
      type: HOLIDAY_TYPES.includes(row.type) ? row.type : 'national',
      description: row.description || '',
    }
  }

  const filteredHolidays = holidays.filter((h) => {
    const q = searchQuery.toLowerCase()
    return h.title?.toLowerCase().includes(q) || h.type?.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q)
  })

  const upcomingCount = holidays.filter((h) => new Date(h.date) >= new Date()).length

  const { paginatedItems, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredHolidays)

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏖️ Holidays</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#065f46', background: '#d1fae5', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
            Total: {holidays.length} · Upcoming: {upcomingCount}
          </span>
          <button style={exportButtonStyle} onClick={() => exportToCSV(filteredHolidays, 'Holidays', exportColumns)} title="Export CSV">📄 CSV</button>
          <button style={exportButtonStyle} onClick={() => exportToPDF(filteredHolidays, 'Holidays', exportColumns, 'School Holidays')} title="Export PDF">📥 PDF</button>
          <button style={exportButtonStyle} onClick={handlePrint} title="Print"><Printer size={16} /> Print</button>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>Bulk Import</button>
          <button className="btn primary" onClick={() => showForm ? setShowForm(false) : handleAddNew()}>
            {showForm ? 'Cancel' : '+ Add Holiday'}
          </button>
        </div>
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search holidays..." />

      <div className="page-content-scrollable">
        {showForm && (
          <div className="form-card">
            <h3>{editingId ? 'Edit Holiday' : 'Add Holiday'}</h3>
            <form onSubmit={handleSubmit} className="form-grid">
              <input type="text" placeholder="Holiday Name *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                {HOLIDAY_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
              <input type="date" title="From Date" placeholder="From Date *" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              <input type="date" title="To Date (optional)" placeholder="To Date" value={formData.toDate} onChange={(e) => setFormData({ ...formData, toDate: e.target.value })} />
              <textarea placeholder="Description (optional)" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="2" style={{ gridColumn: '1 / -1' }} />
              <button type="submit" className="btn primary" style={{ gridColumn: '1 / -1' }}>
                {editingId ? 'Update Holiday' : 'Add Holiday'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading holidays...</div>
        ) : (
          <div className="data-table" id="holidays-print-area">
            <table>
              <thead>
                <tr>
                  <th>Holiday</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Description</th>
                  <th className="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHolidays.length === 0 ? (
                  <tr><td colSpan="6" className="empty-row">{searchQuery ? 'No holidays match.' : 'No holidays added yet.'}</td></tr>
                ) : (
                  paginatedItems.map((holiday) => {
                    const typeColor = TYPE_COLORS[holiday.type] || TYPE_COLORS.national
                    const isPast = new Date(holiday.date) < new Date()
                    return (
                      <tr key={holiday.id} style={isPast ? { opacity: 0.6 } : {}}>
                        <td style={{ fontWeight: 600 }}>{holiday.title}</td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                            background: typeColor.bg, color: typeColor.color, textTransform: 'capitalize',
                          }}>{holiday.type}</span>
                        </td>
                        <td>{holiday.date ? new Date(holiday.date).toLocaleDateString('en-IN') : '-'}</td>
                        <td>{holiday.toDate ? new Date(holiday.toDate).toLocaleDateString('en-IN') : '-'}</td>
                        <td>{holiday.description || '-'}</td>
                        <td className="no-print">
                          <button className="btn-icon edit" onClick={() => handleEdit(holiday)}><SquarePen size={16} /></button>
                          <button className="btn-icon danger" onClick={() => handleDelete(holiday.id)}><Trash2 size={16} /></button>
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
            title="Holidays"
            templateHeaders={templateHeaders}
            mapRowToPayload={mapRow}
            createItem={(payload) => apiClient.createHoliday(payload)}
            onClose={() => setShowBulkImport(false)}
            onDone={() => loadHolidays()}
          />
        )}
      </div>
    </div>
  )
}

export default HolidaysPage
