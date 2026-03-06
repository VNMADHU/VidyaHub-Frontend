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

const EventsPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const [events, setEvents] = useState([])
  const [eventCategories, setEventCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: '',
    eventTime: '',
    location: '',
    category: 'academic',
  })

  useEffect(() => {
    loadEvents()
    apiClient.listMasterData('event-categories').then((data) => {
      setEventCategories(Array.isArray(data) ? data : data?.data || [])
    }).catch(() => {})
  }, [])

  const loadEvents = async () => {
    try {
      const response = await apiClient.listEvents()
      setEvents(response?.data || [])
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await apiClient.updateEvent(editingId, formData)
      } else {
        await apiClient.createEvent(formData)
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({
        title: '',
        description: '',
        eventDate: '',
        eventTime: '',
        location: '',
        category: 'academic',
      })
      loadEvents()
    } catch (error) {
      console.error('Failed to create event:', error)
      toast.error(error?.message || 'Failed to save event.')
    }
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData({
      title: '',
      description: '',
      eventDate: '',
      eventTime: '',
      location: '',
      category: 'academic',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEdit = (event) => {
    setEditingId(event.id)
    setFormData({
      title: event.title || '',
      description: event.description || '',
      eventDate: (event.date || event.eventDate)?.split('T')[0] || '',
      eventTime: event.eventTime || (event.date ? new Date(event.date).toTimeString().slice(0,5) : ''),
      location: event.location || '',
      category: event.category || 'academic',
    })
    setShowForm(true)
  }

  const handleDelete = async (eventId) => {
    const confirmed = await confirm({
      message: 'Are you sure you want to delete this event?',
    })
    if (!confirmed) return
    try {
      await apiClient.deleteEvent(eventId)
      loadEvents()
    } catch (error) {
      console.error('Failed to delete event:', error)
      toast.error(error?.message || 'Failed to delete event.')
    }
  }

  const handleBulkImportDone = async () => {
    await loadEvents()
  }

  const eventTemplateHeaders = [
    'title',
    'description',
    'eventDate',
    'eventTime',
    'location',
    'category',
  ]

  const mapEventRow = (row) => {
    if (!row.title || !row.eventDate) {
      return null
    }

    return {
      title: String(row.title).trim(),
      description: row.description ? String(row.description).trim() : '',
      eventDate: String(row.eventDate).trim(),
      eventTime: row.eventTime ? String(row.eventTime).trim() : '',
      location: row.location ? String(row.location).trim() : '',
      category: row.category ? String(row.category).trim() : 'academic',
    }
  }

  const eventExportColumns = [
    { key: 'title', label: 'Title' },
    { key: 'eventDate', label: 'Date' },
    { key: 'location', label: 'Location' },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
  ]

  const handleExportCSV = () => {
    exportToCSV(filteredEvents, 'Events', eventExportColumns)
  }

  const handleExportPDF = () => {
    exportToPDF(filteredEvents, 'Events', eventExportColumns, 'Events List')
  }

  const filteredEvents = events.filter((event) => {
    const query = searchQuery.toLowerCase()
    return (
      event.title?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query) ||
      event.category?.toLowerCase().includes(query)
    )
  })

  const { paginatedItems: paginatedEvents, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredEvents)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Events</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={exportButtonStyle} onClick={handleExportCSV} title="Export CSV">
            📄 CSV
          </button>
          <button style={exportButtonStyle} onClick={handleExportPDF} title="Export PDF">
            📥 PDF
          </button>
          <button style={exportButtonStyle} onClick={() => printTable('events-print-area', 'Events List')} title="Print"><Printer size={16} /> Print</button>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </button>
          <button className="btn primary" onClick={() => showForm ? setShowForm(false) : handleAddNew()}>
            {showForm ? 'Cancel' : '+ Create Event'}
          </button>
        </div>
      </div>

      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search events by title, description, location, or category..."
      />

      <div className="page-content-scrollable">
      {showForm && (
        <div className="form-card">
          <h3>{editingId ? 'Edit Event' : 'Create New Event'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <input
              type="text"
              placeholder="Event Title *"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              style={{ gridColumn: '1 / -1' }}
            />
            <textarea
              placeholder="Event Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              style={{ gridColumn: '1 / -1' }}
            />
            <input
              type="date"
              placeholder="Event Date *"
              title="Event Date"
              value={formData.eventDate}
              onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              required
            />
            <input
              type="time"
              placeholder="Event Time"
              value={formData.eventTime}
              onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
            />
            <input
              type="text"
              placeholder="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="">-- Category --</option>
              {eventCategories.map(c => (
                <option key={c.id} value={c.label}>{c.label}</option>
              ))}
            </select>
            <button type="submit" className="btn primary" style={{ gridColumn: '1 / -1' }}>
              {editingId ? 'Update Event' : 'Create Event'}
            </button>
          </form>
        </div>
      )}

      {showBulkImport && (
        <BulkImportModal
          title="Events"
          templateHeaders={eventTemplateHeaders}
          mapRowToPayload={mapEventRow}
          createItem={(payload) => apiClient.createEvent(payload)}
          onClose={() => setShowBulkImport(false)}
          onDone={handleBulkImportDone}
        />
      )}

      {loading ? (
        <div className="loading-state">Loading events...</div>
      ) : (
        <div className="events-grid" id="events-print-area">
          {filteredEvents.length === 0 ? (
            <div className="empty-state-card">
              {searchQuery ? 'No events match your search.' : 'No events scheduled. Create your first event!'}
            </div>
          ) : (
            paginatedEvents.map((event) => (
              <div key={event.id} className="event-card">
                <div className="event-header">
                  <h3>{event.title}</h3>
                  <span className={`event-badge ${event.category}`}>
                    {event.category}
                  </span>
                </div>
                <p className="event-description">{event.description}</p>
                <div className="event-details">
                  <div className="event-info">
                    <span>📅 {(event.date || event.eventDate) ? new Date(event.date || event.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                    {(event.eventTime || event.date) && <span>🕐 {event.eventTime || new Date(event.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
                    {event.location && <span>📍 {event.location}</span>}
                  </div>
                  <div className="event-actions">
                    <button className="btn-icon edit" onClick={() => handleEdit(event)} aria-label="Edit event">
                      <SquarePen size={16} />
                    </button>
                    <button className="btn-icon danger" onClick={() => handleDelete(event.id)} aria-label="Delete event">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={goToPage} />
      </div>
    </div>
  )
}

export default EventsPage
