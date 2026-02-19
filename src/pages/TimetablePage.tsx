// @ts-nocheck
import { useEffect, useState } from 'react'
import { SquarePen, Trash2 } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MAX_PERIODS = 8

const EMPTY_FORM = {
  classId: '',
  day: 'Monday',
  period: '1',
  subject: '',
  teacher: '',
}

const TimetablePage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const [timetable, setTimetable] = useState([])
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedClass, setSelectedClass] = useState('')
  const [formData, setFormData] = useState({ ...EMPTY_FORM })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      loadTimetable(selectedClass)
    }
  }, [selectedClass])

  const loadData = async () => {
    try {
      const [classesRes, teachersRes, subjectsRes] = await Promise.all([
        apiClient.listClasses(),
        apiClient.listTeachers(),
        apiClient.listSubjects(),
      ])
      const cls = classesRes?.data || []
      const tchs = teachersRes?.data || []
      const subs = subjectsRes?.data || []
      setClasses(cls)
      setTeachers(tchs)
      setSubjects(subs)
      if (cls.length > 0) {
        setSelectedClass(String(cls[0].id))
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTimetable = async (classId) => {
    try {
      const res = await apiClient.listTimetables(classId)
      setTimetable(res?.data || [])
    } catch (error) {
      console.error('Failed to load timetable:', error)
    }
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData({ ...EMPTY_FORM, classId: selectedClass })
    setShowForm(true)
  }

  const handleEdit = (entry) => {
    setEditingId(entry.id)
    setFormData({
      classId: String(entry.classId),
      day: entry.day,
      period: String(entry.period),
      subject: entry.subject,
      teacher: entry.teacher,
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    const ok = await confirm('Delete this timetable entry?', 'This action cannot be undone.')
    if (!ok) return
    try {
      await apiClient.deleteTimetable(String(id))
      loadTimetable(selectedClass)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        classId: Number(formData.classId),
        day: formData.day,
        period: Number(formData.period),
        subject: formData.subject,
        teacher: formData.teacher,
      }
      if (editingId) {
        await apiClient.updateTimetable(String(editingId), payload)
      } else {
        await apiClient.createTimetable(payload)
      }
      setShowForm(false)
      setFormData({ ...EMPTY_FORM })
      loadTimetable(selectedClass)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save')
    }
  }

  // Build grid data: rows = periods, columns = days
  const grid = {}
  for (let p = 1; p <= MAX_PERIODS; p++) {
    grid[p] = {}
    for (const day of DAYS) {
      grid[p][day] = timetable.find((t) => t.period === p && t.day === day) || null
    }
  }

  // Determine how many periods are actually used
  const maxUsedPeriod = timetable.length > 0
    ? Math.max(...timetable.map((t) => t.period))
    : 6
  const displayPeriods = Math.max(maxUsedPeriod, 6)

  if (loading) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Loading timetable...</div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>📅 Timetable</h1>
        <button className="btn primary" onClick={() => showForm ? setShowForm(false) : handleAddNew()}>
          {showForm ? 'Cancel' : '+ Add Period'}
        </button>
      </div>

      {/* Class Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <label style={{ fontWeight: '500' }}>Select Class:</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', minWidth: '200px' }}
        >
          <option value="">-- Select --</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="form-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <h3>{editingId ? 'Edit Period' : 'Add New Period'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Class
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  required
                >
                  <option value="">-- Select --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Day
                <select
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  required
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label>
                Period
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  required
                >
                  {Array.from({ length: MAX_PERIODS }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>Period {p}</option>
                  ))}
                </select>
              </label>
              <label>
                Subject
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </label>
              <label>
                Teacher
                <select
                  value={formData.teacher}
                  onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                  required
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={`${t.firstName} ${t.lastName}`}>
                      {t.firstName} {t.lastName} {t.subject ? `(${t.subject})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn primary" type="submit">{editingId ? 'Update' : 'Add Period'}</button>
              <button className="btn outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Timetable Grid */}
      {!selectedClass ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          Select a class to view its timetable.
        </div>
      ) : timetable.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          No timetable entries yet. Click "+ Add Period" to get started.
        </div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Period</th>
                {DAYS.map((day) => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: displayPeriods }, (_, i) => i + 1).map((period) => (
                <tr key={period}>
                  <td style={{ fontWeight: '600', textAlign: 'center' }}>P{period}</td>
                  {DAYS.map((day) => {
                    const entry = grid[period]?.[day]
                    return (
                      <td key={day} style={{ position: 'relative', minWidth: '140px' }}>
                        {entry ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{entry.subject}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{entry.teacher}</span>
                            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                              <button className="btn-icon edit" onClick={() => handleEdit(entry)} aria-label="Edit" style={{ padding: '2px' }}>
                                <SquarePen size={14} />
                              </button>
                              <button className="btn-icon danger" onClick={() => handleDelete(entry.id)} aria-label="Delete" style={{ padding: '2px' }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TimetablePage
