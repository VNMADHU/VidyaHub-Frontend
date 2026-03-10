// @ts-nocheck
import { useEffect, useState, useMemo } from 'react'
import apiClient from '@/services/api'
import { useAppSelector } from '@/store'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import { usePagination } from '@/hooks/usePagination'
import Pagination from '@/components/Pagination'
import SearchBar from '@/components/SearchBar'
import { exportToCSV, exportToPDF, exportButtonStyle } from '@/utils/exportUtils'
import Modal from '../components/Modal'

const HomeworkPage = () => {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [homework, setHomework] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    classId: '', sectionId: '', subject: '', title: '', description: '', dueDate: '', assignedBy: '',
  })

  useEffect(() => {
    loadInitial()
  }, [])

  useEffect(() => {
    loadHomework()
  }, [selectedClass])

  const loadInitial = async () => {
    try {
      const [cRes, subRes, tRes] = await Promise.all([
        apiClient.listClasses(),
        apiClient.listSubjects(),
        apiClient.listTeachers(),
      ])
      setClasses(cRes.data || cRes || [])
      setSubjects(subRes.data || subRes || [])
      setTeachers(tRes.data || tRes || [])
    } catch (err) {
      console.error(err)
    }
  }

  const loadHomework = async () => {
    try {
      const res = await apiClient.listHomework(selectedClass || null)
      setHomework(res.data || res || [])
    } catch (err) {
      console.error(err)
    }
  }

  const loadSections = async (classId) => {
    try {
      const res = await apiClient.listSections(classId)
      setSections(res.data || res || [])
    } catch { setSections([]) }
  }

  const filteredHomework = useMemo(() => {
    if (!search) return homework
    const q = search.toLowerCase()
    return homework.filter(h =>
      h.title?.toLowerCase().includes(q) ||
      h.subject?.toLowerCase().includes(q) ||
      h.assignedBy?.toLowerCase().includes(q)
    )
  }, [homework, search])

  const { paginatedItems: paginatedHomework, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredHomework)

  const resetForm = () => {
    setFormData({ classId: '', sectionId: '', subject: '', title: '', description: '', dueDate: '', assignedBy: '' })
    setEditingId(null)
    setShowForm(false)
    setSections([])
  }

  const handleEdit = (h) => {
    setFormData({
      classId: String(h.classId || ''),
      sectionId: String(h.sectionId || ''),
      subject: h.subject || '',
      title: h.title || '',
      description: h.description || '',
      dueDate: h.dueDate ? new Date(h.dueDate).toISOString().slice(0, 10) : '',
      assignedBy: h.assignedBy || '',
    })
    if (h.classId) loadSections(String(h.classId))
    setEditingId(h.id)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        classId: parseInt(formData.classId),
        sectionId: formData.sectionId ? parseInt(formData.sectionId) : undefined,
        subject: formData.subject,
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        assignedBy: formData.assignedBy,
      }

      if (editingId) {
        await apiClient.updateHomework(String(editingId), payload)
        toast.success('Homework updated!')
      } else {
        await apiClient.createHomework(payload)
        toast.success('Homework assigned!')
      }
      resetForm()
      loadHomework()
    } catch (err) {
      toast.error(err?.message || 'Failed to save homework.')
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ message: 'Are you sure you want to delete this homework assignment? This action cannot be undone.' })
    if (!ok) return
    try {
      await apiClient.deleteHomework(String(id))
      toast.success('Homework deleted')
      loadHomework()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete homework.')
      console.error(err)
    }
  }

  const isOverdue = (dueDate) => new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  const isDueToday = (dueDate) => new Date(dueDate).toDateString() === new Date().toDateString()

  const handleExportCSV = () => {
    exportToCSV(filteredHomework.map(h => ({
      ...h,
      className: h.class?.name || '',
      dueDate: h.dueDate ? new Date(h.dueDate).toLocaleDateString('en-IN') : '',
    })), 'Homework', [
      { key: 'title', label: 'Title' },
      { key: 'subject', label: 'Subject' },
      { key: 'className', label: 'Class' },
      { key: 'assignedBy', label: 'Assigned By' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'description', label: 'Description' },
    ])
    toast.success('CSV downloaded!')
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>📝 Homework / Assignments</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleExportCSV} style={exportButtonStyle}>📄 CSV</button>
          <button onClick={() => { resetForm(); setShowForm(true) }} style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600,
          }}>
            + Assign Homework
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
          style={{ padding: '0.75rem 12px', borderRadius: '8px', border: '1px solid #ddd', minWidth: '160px', fontSize: '1rem', background: 'var(--surface)', height: '46px' }}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        <div style={{ flex: 1, minWidth: '200px', maxWidth: '320px' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search homework..." />
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Modal title={editingId ? 'Edit Homework' : 'Assign New Homework'} onClose={() => setShowForm(false)} footer={<button type="submit" form="homework-form" className="btn primary">{editingId ? '💾 Update' : '✅ Assign'}</button>}>
          <form id="homework-form" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Class *</label>
              <select value={formData.classId} onChange={e => { setFormData({...formData, classId: e.target.value, sectionId: ''}); if (e.target.value) loadSections(e.target.value) }} style={inputStyle} required>
                <option value="">Select</option>
                {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Section</label>
              <select value={formData.sectionId} onChange={e => setFormData({...formData, sectionId: e.target.value})} style={inputStyle}>
                <option value="">All Sections</option>
                {sections.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Subject *</label>
              <select value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} style={inputStyle} required>
                <option value="">Select</option>
                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Title *</label>
              <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={inputStyle} required placeholder="e.g., Chapter 5 Exercises" />
            </div>
            <div>
              <label style={labelStyle}>Due Date *</label>
              <input type="date" title="Due Date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Assigned By</label>
              <select value={formData.assignedBy} onChange={e => setFormData({...formData, assignedBy: e.target.value})} style={inputStyle}>
                <option value="">Select Teacher</option>
                {teachers.map(t => <option key={t.id} value={`${t.firstName} ${t.lastName}`}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Detailed instructions..." />
            </div>
          </div>
          </form>
        </Modal>
      )}

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {paginatedHomework.map(h => {
          const overdue = isOverdue(h.dueDate)
          const dueToday = isDueToday(h.dueDate)
          return (
            <div key={h.id} style={{
              background: 'var(--surface)', borderRadius: '10px', border: `1px solid ${overdue ? '#fca5a5' : dueToday ? '#fde68a' : 'var(--border)'}`,
              padding: '1rem', position: 'relative',
            }}>
              {/* Badge */}
              {overdue && <span style={{ ...badgeStyle, background: '#fee2e2', color: '#dc2626' }}>Overdue</span>}
              {dueToday && <span style={{ ...badgeStyle, background: '#fef3c7', color: '#d97706' }}>Due Today</span>}
              {!overdue && !dueToday && <span style={{ ...badgeStyle, background: '#dcfce7', color: '#16a34a' }}>Active</span>}

              <h4 style={{ fontSize: '1rem', marginBottom: '4px', paddingRight: '70px' }}>{h.title}</h4>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{h.subject}</span>
                {' · '}
                {h.class?.name || ''}
                {h.section ? ` - ${h.section.name}` : ''}
              </div>
              {h.description && <p style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--text)' }}>{h.description}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                <div>
                  📅 Due: {h.dueDate ? new Date(h.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  {h.assignedBy && <span> · 👨‍🏫 {h.assignedBy}</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleEdit(h)} title="Edit" style={iconBtnStyle}>✏️</button>
                  <button onClick={() => handleDelete(h.id)} title="Delete" style={iconBtnStyle}>🗑️</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredHomework.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
          No homework assignments found. Click "Assign Homework" to create one.
        </p>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={goToPage} />
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }
const inputStyle = { padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', width: '100%' }
const badgeStyle = { position: 'absolute', top: '10px', right: '10px', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px' }

export default HomeworkPage
