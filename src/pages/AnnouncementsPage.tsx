// @ts-nocheck
import { useEffect, useState } from 'react'
import { SquarePen, Trash2 } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import BulkImportModal from '@/components/BulkImportModal'
import SearchBar from '@/components/SearchBar'

const AnnouncementsPage = () => {
  const { confirm } = useConfirm()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    message: '',
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
      setFormData({ title: '', message: '' })
      loadAnnouncements()
    } catch (error) {
      console.error('Failed to save announcement:', error)
    }
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData({
      title: '',
      message: '',
    })
    setShowForm(true)
  }

  const handleEdit = (announcement) => {
    setEditingId(announcement.id)
    setFormData({
      title: announcement.title || '',
      message: announcement.message || '',
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

  const filteredAnnouncements = announcements.filter((announcement) => {
    const query = searchQuery.toLowerCase()
    return (
      announcement.title?.toLowerCase().includes(query) ||
      announcement.message?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1>Announcements</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </button>
          <button className="btn primary" onClick={() => showForm ? setShowForm(false) : handleAddNew()}>
            {showForm ? 'Cancel' : '+ Add Announcement'}
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
        <div className="form-card">
          <h3>{editingId ? 'Edit Announcement' : 'Create Announcement'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <input
              type="text"
              placeholder="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              style={{ gridColumn: '1 / -1' }}
            />
            <textarea
              placeholder="Message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows="4"
              style={{ gridColumn: '1 / -1' }}
              required
            />
            <button type="submit" className="btn primary" style={{ gridColumn: '1 / -1' }}>
              {editingId ? 'Update Announcement' : 'Create Announcement'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading announcements...</div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Message</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnnouncements.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-row">
                    {searchQuery ? 'No announcements match your search.' : 'No announcements found. Create your first announcement!'}
                  </td>
                </tr>
              ) : (
                filteredAnnouncements.map((announcement) => (
                  <tr key={announcement.id}>
                    <td>{announcement.title}</td>
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
