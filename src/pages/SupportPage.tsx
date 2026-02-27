// @ts-nocheck
import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'

const SupportPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium',
  })

  useEffect(() => { loadTickets() }, [])

  const loadTickets = async () => {
    try {
      const response = await apiClient.listTickets()
      setTickets(response?.data || [])
    } catch (error) {
      console.error('Failed to load tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await apiClient.createTicket(formData)
      setShowForm(false)
      setFormData({ subject: '', message: '', category: 'general', priority: 'medium' })
      loadTickets()
      toast.success('Support ticket submitted! We will get back to you soon.')
    } catch (error) {
      toast.error('Failed to submit ticket.')
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ message: 'Delete this support ticket?' })
    if (!ok) return
    try {
      await apiClient.deleteTicket(id)
      loadTickets()
    } catch (error) {
      toast.error('Failed to delete ticket.')
    }
  }

  const filteredTickets = tickets.filter((t) => {
    const q = searchQuery.toLowerCase()
    return t.subject?.toLowerCase().includes(q) || t.message?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q)
  })

  const { paginatedItems, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredTickets)

  const statusColor = (status) => {
    switch (status) {
      case 'open': return { bg: '#dbeafe', color: '#1e40af' }
      case 'in-progress': return { bg: '#fef3c7', color: '#92400e' }
      case 'resolved': return { bg: '#d1fae5', color: '#065f46' }
      case 'closed': return { bg: '#f3f4f6', color: '#6b7280' }
      default: return { bg: '#f3f4f6', color: '#6b7280' }
    }
  }

  const priorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return { bg: '#fee2e2', color: '#991b1b' }
      case 'high': return { bg: '#ffedd5', color: '#9a3412' }
      case 'medium': return { bg: '#fef3c7', color: '#92400e' }
      case 'low': return { bg: '#d1fae5', color: '#065f46' }
      default: return { bg: '#f3f4f6', color: '#6b7280' }
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Support</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Ticket'}
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
        Have an issue or need help? Submit a support ticket and our team will assist you.
      </p>

      {showForm && (
        <div className="form-card" style={{ marginBottom: '1.5rem' }}>
          <h3>Submit a Support Ticket</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <input
              type="text"
              placeholder="Subject *"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              style={{ gridColumn: '1 / -1' }}
            />
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
              <option value="general">General Query</option>
              <option value="bug">Bug / Issue</option>
              <option value="feature-request">Feature Request</option>
              <option value="billing">Billing</option>
              <option value="other">Other</option>
            </select>
            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <textarea
              placeholder="Describe your issue in detail *"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows="4"
              required
              style={{ gridColumn: '1 / -1' }}
            />
            <button type="submit" className="btn primary" style={{ gridColumn: '1 / -1' }}>
              Submit Ticket
            </button>
          </form>
        </div>
      )}

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search tickets by subject, message, category..."
      />

      <div className="page-content-scrollable">
        {loading ? (
          <div className="loading-state">Loading support tickets...</div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Reply</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 ? (
                  <tr><td colSpan="7" className="empty-row">{searchQuery ? 'No tickets match.' : 'No support tickets yet. We\'re here to help!'}</td></tr>
                ) : (
                  paginatedItems.map((ticket) => {
                    const sc = statusColor(ticket.status)
                    const pc = priorityColor(ticket.priority)
                    return (
                      <tr key={ticket.id}>
                        <td>
                          <div>
                            <strong>{ticket.subject}</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ticket.message}
                            </div>
                          </div>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{ticket.category?.replace('-', ' ')}</td>
                        <td>
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, background: pc.bg, color: pc.color, textTransform: 'capitalize' }}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td>
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>
                            {ticket.status}
                          </span>
                        </td>
                        <td>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                        <td>
                          {ticket.reply ? (
                            <div style={{ maxWidth: '200px', fontSize: '0.85rem' }}>
                              <span style={{ color: '#10b981', fontWeight: 600 }}>✓</span> {ticket.reply}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Awaiting response</span>
                          )}
                        </td>
                        <td>
                          <button className="btn-icon danger" onClick={() => handleDelete(ticket.id)} aria-label="Delete"><Trash2 size={16} /></button>
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
      </div>
    </div>
  )
}

export default SupportPage
