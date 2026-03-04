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

const LibraryPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('books') // books | issues
  const [books, setBooks] = useState([])
  const [issues, setIssues] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'textbook',
    publisher: '',
    edition: '',
    language: 'English',
    totalCopies: 1,
    shelfLocation: '',
  })
  const [issueFormData, setIssueFormData] = useState({
    bookId: '',
    studentId: '',
    dueDate: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [booksRes, issuesRes, studentsRes] = await Promise.all([
        apiClient.listBooks().catch(() => ({ data: [] })),
        apiClient.listBookIssues().catch(() => ({ data: [] })),
        apiClient.listStudents().catch(() => ({ data: [] })),
      ])
      setBooks(booksRes?.data || [])
      setIssues(issuesRes?.data || [])
      setStudents(studentsRes?.data || studentsRes || [])
    } catch (error) {
      console.error('Failed to load library data:', error)
    } finally {
      setLoading(false)
    }
  }

  // ── Book CRUD ───────────────────────────────────────────
  const handleSubmitBook = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...formData, totalCopies: parseInt(formData.totalCopies) || 1 }
      if (editingId) {
        await apiClient.updateBook(editingId, payload)
      } else {
        await apiClient.createBook(payload)
      }
      setShowForm(false)
      setEditingId(null)
      resetBookForm()
      loadData()
    } catch (error) {
      console.error('Failed to save book:', error)
      toast.error(error?.message || 'Failed to save book.')
    }
  }

  const resetBookForm = () => {
    setFormData({ title: '', author: '', isbn: '', category: 'textbook', publisher: '', edition: '', language: 'English', totalCopies: 1, shelfLocation: '' })
  }

  const handleAddNew = () => {
    setEditingId(null)
    resetBookForm()
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEditBook = (book) => {
    setEditingId(book.id)
    setFormData({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      category: book.category || 'textbook',
      publisher: book.publisher || '',
      edition: book.edition || '',
      language: book.language || 'English',
      totalCopies: book.totalCopies || 1,
      shelfLocation: book.shelfLocation || '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteBook = async (bookId) => {
    const confirmed = await confirm({ message: 'Are you sure you want to delete this book?' })
    if (!confirmed) return
    try {
      await apiClient.deleteBook(bookId)
      loadData()
    } catch (error) {
      console.error('Failed to delete book:', error)
      toast.error(error?.message || 'Failed to delete book.')
    }
  }

  // ── Issue / Return ──────────────────────────────────────
  const handleIssueBook = async (e) => {
    e.preventDefault()
    try {
      await apiClient.issueBook({
        bookId: parseInt(issueFormData.bookId),
        studentId: parseInt(issueFormData.studentId),
        dueDate: issueFormData.dueDate,
      })
      setShowIssueForm(false)
      setIssueFormData({ bookId: '', studentId: '', dueDate: '' })
      loadData()
    } catch (error) {
      console.error('Failed to issue book:', error)
      toast.error(error.message || 'Failed to issue book.')
    }
  }

  const handleReturnBook = async (issueId) => {
    try {
      await apiClient.returnBook(issueId)
      loadData()
      toast.success('Book returned successfully!')
    } catch (error) {
      console.error('Failed to return book:', error)
      toast.error(error?.message || 'Failed to return book.')
    }
  }

  const handleDeleteIssue = async (issueId) => {
    const confirmed = await confirm({ message: 'Delete this issue record?' })
    if (!confirmed) return
    try {
      await apiClient.deleteBookIssue(issueId)
      loadData()
    } catch (error) {
      toast.error(error?.message || 'Failed to delete issue.')
    }
  }

  // ── Bulk Import ─────────────────────────────────────────
  const bookTemplateHeaders = ['title', 'author', 'isbn', 'category', 'publisher', 'totalCopies', 'shelfLocation']
  const mapBookRow = (row) => {
    if (!row.title || !row.author) return null
    return {
      title: String(row.title).trim(),
      author: String(row.author).trim(),
      isbn: row.isbn ? String(row.isbn).trim() : undefined,
      category: row.category ? String(row.category).trim() : 'textbook',
      publisher: row.publisher ? String(row.publisher).trim() : undefined,
      totalCopies: parseInt(row.totalCopies) || 1,
      shelfLocation: row.shelfLocation ? String(row.shelfLocation).trim() : undefined,
    }
  }

  // ── Export ──────────────────────────────────────────────
  const bookExportColumns = [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'category', label: 'Category' },
    { key: 'totalCopies', label: 'Total Copies' },
    { key: 'availableCopies', label: 'Available' },
    { key: 'shelfLocation', label: 'Shelf' },
  ]

  // ── Filtering ───────────────────────────────────────────
  const filteredBooks = books.filter((b) => {
    const q = searchQuery.toLowerCase()
    return b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q) || b.isbn?.toLowerCase().includes(q)
  })

  const filteredIssues = issues.filter((i) => {
    const q = searchQuery.toLowerCase()
    return (
      i.book?.title?.toLowerCase().includes(q) ||
      i.student?.firstName?.toLowerCase().includes(q) ||
      i.student?.lastName?.toLowerCase().includes(q)
    )
  })

  const { paginatedItems: paginatedBooks, currentPage: booksPage, totalPages: booksTotalPages, totalItems: booksTotalItems, goToPage: goToBooksPage } = usePagination(filteredBooks)
  const { paginatedItems: paginatedIssues, currentPage: issuesPage, totalPages: issuesTotalPages, totalItems: issuesTotalItems, goToPage: goToIssuesPage } = usePagination(filteredIssues)

  const availableBooks = books.filter((b) => b.availableCopies > 0)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Library</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={exportButtonStyle} onClick={() => exportToCSV(filteredBooks, 'Books', bookExportColumns)} title="Export CSV">📄 CSV</button>
          <button style={exportButtonStyle} onClick={() => exportToPDF(filteredBooks, 'Books', bookExportColumns, 'Library Books')} title="Export PDF">📥 PDF</button>
          <button style={exportButtonStyle} onClick={() => printTable(activeTab === 'books' ? 'library-print-area' : 'library-issues-print-area', activeTab === 'books' ? 'Library Books' : 'Library Issues')} title="Print"><Printer size={16} /> Print</button>
          {activeTab === 'books' && (
            <>
              <button className="btn outline" onClick={() => setShowBulkImport(true)}>Bulk Import</button>
              <button className="btn primary" onClick={() => showForm ? setShowForm(false) : handleAddNew()}>
                {showForm ? 'Cancel' : '+ Add Book'}
              </button>
            </>
          )}
          {activeTab === 'issues' && (
            <button className="btn primary" onClick={() => showIssueForm ? setShowIssueForm(false) : setShowIssueForm(true)}>
              {showIssueForm ? 'Cancel' : '+ Issue Book'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className={`btn ${activeTab === 'books' ? 'primary' : 'outline'}`} onClick={() => setActiveTab('books')}>📚 Books ({books.length})</button>
        <button className={`btn ${activeTab === 'issues' ? 'primary' : 'outline'}`} onClick={() => setActiveTab('issues')}>📋 Issues ({issues.filter((i) => i.status === 'issued').length})</button>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={activeTab === 'books' ? 'Search by title, author, ISBN...' : 'Search by book title or student name...'}
      />

      <div className="page-content-scrollable">
        {/* ── Books Tab ────────────────────────────────── */}
        {activeTab === 'books' && (
          <>
            {showForm && (
              <div className="form-card">
                <h3>{editingId ? 'Edit Book' : 'Add New Book'}</h3>
                <form onSubmit={handleSubmitBook} className="form-grid">
                  <input type="text" placeholder="Title *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                  <input type="text" placeholder="Author *" value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} required />
                  <input type="text" placeholder="ISBN" value={formData.isbn} onChange={(e) => setFormData({ ...formData, isbn: e.target.value })} />
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option value="textbook">Textbook</option>
                    <option value="reference">Reference</option>
                    <option value="fiction">Fiction</option>
                    <option value="non-fiction">Non-Fiction</option>
                    <option value="magazine">Magazine</option>
                  </select>
                  <input type="text" placeholder="Publisher" value={formData.publisher} onChange={(e) => setFormData({ ...formData, publisher: e.target.value })} />
                  <input type="text" placeholder="Edition" value={formData.edition} onChange={(e) => setFormData({ ...formData, edition: e.target.value })} />
                  <input type="text" placeholder="Language" value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })} />
                  <input type="number" placeholder="Total Copies" value={formData.totalCopies} onChange={(e) => setFormData({ ...formData, totalCopies: e.target.value })} min="1" />
                  <input type="text" placeholder="Shelf Location (e.g. Rack A-3)" value={formData.shelfLocation} onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })} />
                  <button type="submit" className="btn primary" style={{ gridColumn: '1 / -1' }}>
                    {editingId ? 'Update Book' : 'Add Book'}
                  </button>
                </form>
              </div>
            )}

            {loading ? (
              <div className="loading-state">Loading books...</div>
            ) : (
              <div className="data-table" id="library-print-area">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Author</th>
                      <th>Category</th>
                      <th>Copies</th>
                      <th>Available</th>
                      <th>Shelf</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.length === 0 ? (
                      <tr><td colSpan="7" className="empty-row">{searchQuery ? 'No books match your search.' : 'No books found. Add your first book!'}</td></tr>
                    ) : (
                      paginatedBooks.map((book) => (
                        <tr key={book.id}>
                          <td>{book.title}</td>
                          <td>{book.author}</td>
                          <td><span style={{ textTransform: 'capitalize' }}>{book.category || '-'}</span></td>
                          <td>{book.totalCopies}</td>
                          <td>
                            <span style={{ color: book.availableCopies > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                              {book.availableCopies}
                            </span>
                          </td>
                          <td>{book.shelfLocation || '-'}</td>
                          <td>
                            <button className="btn-icon edit" onClick={() => handleEditBook(book)} aria-label="Edit"><SquarePen size={16} /></button>
                            <button className="btn-icon danger" onClick={() => handleDeleteBook(book.id)} aria-label="Delete"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <Pagination currentPage={booksPage} totalPages={booksTotalPages} totalItems={booksTotalItems} onPageChange={goToBooksPage} />
              </div>
            )}
          </>
        )}

        {/* ── Issues Tab ───────────────────────────────── */}
        {activeTab === 'issues' && (
          <>
            {showIssueForm && (
              <div className="form-card">
                <h3>Issue a Book</h3>
                <form onSubmit={handleIssueBook} className="form-grid">
                  <select value={issueFormData.bookId} onChange={(e) => setIssueFormData({ ...issueFormData, bookId: e.target.value })} required>
                    <option value="">Select Book *</option>
                    {availableBooks.map((b) => (
                      <option key={b.id} value={b.id}>{b.title} — {b.author} ({b.availableCopies} available)</option>
                    ))}
                  </select>
                  <select value={issueFormData.studentId} onChange={(e) => setIssueFormData({ ...issueFormData, studentId: e.target.value })} required>
                    <option value="">Select Student *</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.firstName} {s.lastName} — {s.admissionNumber}</option>
                    ))}
                  </select>
                  <input type="date" title="Due Date" value={issueFormData.dueDate} onChange={(e) => setIssueFormData({ ...issueFormData, dueDate: e.target.value })} required />
                  <button type="submit" className="btn primary" style={{ gridColumn: '1 / -1' }}>Issue Book</button>
                </form>
              </div>
            )}

            {loading ? (
              <div className="loading-state">Loading issues...</div>
            ) : (
              <div className="data-table" id="library-issues-print-area">
                <table>
                  <thead>
                    <tr>
                      <th>Book</th>
                      <th>Student</th>
                      <th>Issue Date</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssues.length === 0 ? (
                      <tr><td colSpan="6" className="empty-row">No book issues found.</td></tr>
                    ) : (
                      paginatedIssues.map((issue) => (
                        <tr key={issue.id}>
                          <td>{issue.book?.title || '-'}</td>
                          <td>{issue.student ? `${issue.student.firstName} ${issue.student.lastName}` : '-'}</td>
                          <td>{issue.issueDate ? new Date(issue.issueDate).toLocaleDateString() : '-'}</td>
                          <td>{issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '-'}</td>
                          <td>
                            <span style={{
                              padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                              background: issue.status === 'returned' ? '#d1fae5' : issue.status === 'overdue' ? '#fee2e2' : '#dbeafe',
                              color: issue.status === 'returned' ? '#065f46' : issue.status === 'overdue' ? '#991b1b' : '#1e40af',
                            }}>
                              {issue.status}
                            </span>
                          </td>
                          <td>
                            {issue.status === 'issued' && (
                              <button className="btn-icon edit" onClick={() => handleReturnBook(issue.id)} aria-label="Return" title="Return Book">↩️</button>
                            )}
                            <button className="btn-icon danger" onClick={() => handleDeleteIssue(issue.id)} aria-label="Delete"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <Pagination currentPage={issuesPage} totalPages={issuesTotalPages} totalItems={issuesTotalItems} onPageChange={goToIssuesPage} />
              </div>
            )}
          </>
        )}

        {showBulkImport && (
          <BulkImportModal
            title="Books"
            templateHeaders={bookTemplateHeaders}
            mapRowToPayload={mapBookRow}
            createItem={(payload) => apiClient.createBook(payload)}
            onClose={() => setShowBulkImport(false)}
            onDone={() => loadData()}
          />
        )}
      </div>
    </div>
  )
}

export default LibraryPage
