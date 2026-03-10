// @ts-nocheck
import { useEffect, useState } from 'react'
import { SquarePen, Trash2 } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import BulkImportModal from '@/components/BulkImportModal'
import Modal from '@/components/Modal'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { exportToCSV, exportToPDF, exportButtonStyle } from '@/utils/exportUtils'

const AnnouncementsPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetAudience: 'All',
  })

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      const response = await apiClient.listAnnouncements()
      setAnnouncements(response?.data || [])
    } catch (error) {
      console.error('Failed to load announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await apiClient.updateAnnouncement(editingId, formData)
      } else {
        await apiClient.createAnnouncement(formData)
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({ title: '', message: '', targetAudience: 'All' })
      loadAnnouncements()
    } catch (error) {
      console.error('Failed to save announcement:', error)
      toast.error(error?.message || 'Failed to save announcement.')
    }
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData({
      title: '',
      message: '',
      targetAudience: 'All',
    })
    setShowForm(true)
  }

  const handleEdit = (announcement) => {
    setEditingId(announcement.id)
    setFormData({
      title: announcement.title || '',
      message: announcement.message || '',
      targetAudience: announcement.targetAudience || 'All',
    })
    setShowForm(true)
  }

  const handleDelete = async (announcementId) => {
    const confirmed = await confirm({
      message: 'Are you sure you want to delete this announcement?',
    })
    if (!confirmed) return
    try {
      await apiClient.deleteAnnouncement(announcementId)
      loadAnnouncements()
    } catch (error) {
      console.error('Failed to delete announcement:', error)
      toast.error(error?.message || 'Failed to delete announcement.')
    }
  }

  const handleBulkImportDone = async () => {
    await loadAnnouncements()
  }

  const announcementTemplateHeaders = ['title', 'message']

  const mapAnnouncementRow = (row) => {
    if (!row.title || !row.message) {
      return null
    }

    return {
      title: String(row.title).trim(),
      message: String(row.message).trim(),
    }
  }

  const announcementExportColumns = [
    { key: 'title', label: 'Title' },
    { key: 'message', label: 'Message' },
    { key: 'createdAt', label: 'Date' },
  ]

  const handleExportCSV = () => {
    exportToCSV(filteredAnnouncements, 'Announcements', announcementExportColumns)
  }

  const handleExportPDF = () => {
    exportToPDF(filteredAnnouncements, 'Announcements', announcementExportColumns, 'Announcements')
  }

  const filteredAnnouncements = announcements.filter((announcement) => {
    const query = searchQuery.toLowerCase()
    return (
      announcement.title?.toLowerCase().includes(query) ||
      announcement.message?.toLowerCase().includes(query)
    )
  })

  const { paginatedItems: paginatedAnnouncements, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredAnnouncements)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Announcements</h1>
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
          <button className="btn primary" onClick={handleAddNew}>
            + Add Announcement
          </button>
        </div>
      </div>

      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search announcements by title or message..."
      />

      <div className="page-content-scrollable">
      {showForm && (
        <Modal title={editingId ? 'Edit Announcement' : 'Create Announcement'} onClose={() => setShowForm(false)} footer={<button type="submit" form="announcement-form" className="btn primary">{editingId ? 'Update Announcement' : 'Create Announcement'}</button>}>
          <form id="announcement-form" onSubmit={handleSubmit} className="form-grid">
            <label style={{ gridColumn: '1 / -1' }}>
              <span className="field-label">Title *</span>
              <input
                type="text"
                placeholder="Title *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span className="field-label">Message *</span>
              <textarea
                placeholder="Message *"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows="4"
                required
              />
            </label>
            <label>
              <span className="field-label">Target Audience</span>
              <select
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                title="Target Audience"
              >
                <option value="All">📢 All (Everyone)</option>
                <option value="Students">🎓 Students Only</option>
                <option value="Teachers">👩‍🏫 Teachers Only</option>
                <option value="Parents">👨‍👩‍👧 Parents Only</option>
                <option value="Staff">🏢 Staff Only</option>
              </select>
            </label>
          </form>
        </Modal>
      )}

      {loading ? (
        <div className="loading-state">Loading announcements...</div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Audience</th>
                <th>Message</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnnouncements.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-row">
                    {searchQuery ? 'No announcements match your search.' : 'No announcements found. Create your first announcement!'}
                  </td>
                </tr>
              ) : (
                paginatedAnnouncements.map((announcement) => (
                  <tr key={announcement.id}>
                    <td>{announcement.title}</td>
                    <td>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, background: '#ede9fe', color: '#5b21b6' }}>
                        {announcement.targetAudience || 'All'}
                      </span>
                    </td>
                    <td>{announcement.message}</td>
                    <td>{announcement.createdAt ? new Date(announcement.createdAt).toLocaleDateString() : '-'}</td>
                    <td>
                      <button className="btn-icon edit" onClick={() => handleEdit(announcement)} aria-label="Edit announcement">
                        <SquarePen size={16} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDelete(announcement.id)} aria-label="Delete announcement">
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

      {showBulkImport && (
        <BulkImportModal
          title="Announcements"
          templateHeaders={announcementTemplateHeaders}
          mapRowToPayload={mapAnnouncementRow}
          createItem={(payload) => apiClient.createAnnouncement(payload)}
          onClose={() => setShowBulkImport(false)}
          onDone={handleBulkImportDone}
        />
      )}
      </div>
    </div>
  )
}

export default AnnouncementsPage
