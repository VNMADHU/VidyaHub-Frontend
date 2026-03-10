// @ts-nocheck
import { useEffect, useState, useMemo } from 'react'
import { SquarePen, Trash2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TimetablePage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const [timetable, setTimetable] = useState([])
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState('')

  // Date navigation — effectiveDate for which timetable to show
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10))

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    classId: '',
    day: 'Monday',
    periodId: '',
    subject: '',
    teacher: '',
    effectiveFrom: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      loadTimetable(selectedClass, effectiveDate)
    }
  }, [selectedClass, effectiveDate])

  const loadData = async () => {
    try {
      const [classesRes, teachersRes, subjectsRes, periodsRes] = await Promise.all([
        apiClient.listClasses(),
        apiClient.listTeachers(),
        apiClient.listSubjects(),
        apiClient.listPeriods(),
      ])
      const cls = classesRes?.data || []
      setClasses(cls)
      setTeachers(teachersRes?.data || [])
      setSubjects(subjectsRes?.data || [])
      setPeriods(periodsRes?.data || [])
      if (cls.length > 0) {
        setSelectedClass(String(cls[0].id))
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTimetable = async (classId, date) => {
    try {
      const res = await apiClient.listTimetables(classId, date)
      setTimetable(res?.data || [])
    } catch (error) {
      console.error('Failed to load timetable:', error)
    }
  }

  // Only teaching periods (not breaks)
  const teachingPeriods = useMemo(() => periods.filter(p => !p.isBreak), [periods])
  const allPeriodsSorted = useMemo(() => [...periods].sort((a, b) => a.sortOrder - b.sortOrder), [periods])

  // Build grid: rows = all periods (sorted), columns = days
  const grid = useMemo(() => {
    const g = {}
    for (const p of allPeriodsSorted) {
      g[p.id] = {}
      for (const day of DAYS) {
        g[p.id][day] = timetable.find(t => t.periodId === p.id && t.day === day) || null
      }
    }
    return g
  }, [allPeriodsSorted, timetable])

  const openAddModal = (day, periodId) => {
    setEditingId(null)
    setFormData({
      classId: selectedClass,
      day: day || 'Monday',
      periodId: periodId ? String(periodId) : (teachingPeriods[0]?.id ? String(teachingPeriods[0].id) : ''),
      subject: '',
      teacher: '',
      effectiveFrom: effectiveDate,
    })
    setShowModal(true)
  }

  const openEditModal = (entry) => {
    setEditingId(entry.id)
    setFormData({
      classId: String(entry.classId),
      day: entry.day,
      periodId: String(entry.periodId),
      subject: entry.subject,
      teacher: entry.teacher,
      effectiveFrom: entry.effectiveFrom ? new Date(entry.effectiveFrom).toISOString().slice(0, 10) : effectiveDate,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ message: 'Are you sure you want to delete this timetable entry? This action cannot be undone.' })
    if (!ok) return
    try {
      await apiClient.deleteTimetable(String(id))
      loadTimetable(selectedClass, effectiveDate)
      toast.success('Entry deleted')
    } catch (error) {
      toast.error(error?.message || 'Failed to delete')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        classId: Number(formData.classId),
        day: formData.day,
        periodId: Number(formData.periodId),
        subject: formData.subject,
        teacher: formData.teacher,
        effectiveFrom: formData.effectiveFrom || effectiveDate,
      }
      if (editingId) {
        await apiClient.updateTimetable(String(editingId), payload)
        toast.success('Entry updated')
      } else {
        await apiClient.createTimetable(payload)
        toast.success('Entry added')
      }
      setShowModal(false)
      loadTimetable(selectedClass, effectiveDate)
    } catch (error) {
      toast.error(error?.message || 'Failed to save')
    }
  }

  // Date navigation helpers
  const shiftDate = (days) => {
    const d = new Date(effectiveDate)
    d.setDate(d.getDate() + days)
    setEffectiveDate(d.toISOString().slice(0, 10))
  }

  const goToToday = () => setEffectiveDate(new Date().toISOString().slice(0, 10))

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  const isToday = effectiveDate === new Date().toISOString().slice(0, 10)

  if (loading) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Loading timetable...</div>
      </div>
    )
  }

  const todayDate = new Date()
  const todayDay = todayDate.getDate()
  const todayMonth = todayDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()

  return (
    <div className="page">
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
            width: '2.2rem', height: '2.4rem', borderRadius: '6px', overflow: 'hidden',
            border: '1.5px solid var(--border)', background: '#fff', lineHeight: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexShrink: 0,
          }}>
            <span style={{
              background: '#e74c3c', color: '#fff', fontSize: '0.5rem', fontWeight: 700,
              width: '100%', textAlign: 'center', padding: '1px 0', letterSpacing: '0.5px',
            }}>{todayMonth}</span>
            <span style={{
              fontSize: '1rem', fontWeight: 700, color: '#1a1a2e',
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{todayDay}</span>
          </span>
          Timetable
        </h1>
      </div>

      {/* Controls Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 500 }}>Class:</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', minWidth: '160px' }}
        >
          <option value="">-- Select --</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      {/* Date Navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem',
        padding: '0.75rem 1rem', background: 'var(--surface)', borderRadius: '10px',
        border: '1px solid var(--border)', flexWrap: 'wrap',
      }}>
        <button onClick={() => shiftDate(-7)} style={navBtnStyle} title="Previous week">
          <ChevronLeft size={18} /> Week
        </button>
        <button onClick={() => shiftDate(-1)} style={navBtnStyle} title="Previous day">
          <ChevronLeft size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} />
          <input
            type="date"
            title="Effective Date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.9rem' }}
          />
        </div>
        <button onClick={() => shiftDate(1)} style={navBtnStyle} title="Next day">
          <ChevronRight size={18} />
        </button>
        <button onClick={() => shiftDate(7)} style={navBtnStyle} title="Next week">
          Week <ChevronRight size={18} />
        </button>
        {!isToday && (
          <button onClick={goToToday} style={{ ...navBtnStyle, background: 'var(--primary)', color: '#fff' }}>
            Today
          </button>
        )}
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)', marginLeft: 'auto' }}>
          Showing: <strong>{formatDate(effectiveDate)}</strong>
        </span>
      </div>

      {/* No periods warning */}
      {periods.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '2rem', color: '#b45309', background: '#fef3c7',
          borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid #fcd34d',
        }}>
          ⚠️ No periods defined yet. Go to <strong>Settings → Periods</strong> to add your school's periods and time slots.
        </div>
      )}

      {/* Timetable Grid */}
      {!selectedClass ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          Select a class to view its timetable.
        </div>
      ) : allPeriodsSorted.length === 0 ? null : (
        <div className="data-table" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: '130px' }}>Period</th>
                {DAYS.map((day) => (
                  <th key={day} style={{ minWidth: '140px' }}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPeriodsSorted.map((period) => (
                <tr key={period.id}>
                  <td style={{ fontWeight: 600, fontSize: '0.85rem', ...(period.isBreak ? { background: '#fef3c7' } : {}) }}>
                    <div>{period.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 400 }}>
                      {period.startTime} – {period.endTime}
                    </div>
                  </td>
                  {DAYS.map((day) => {
                    if (period.isBreak) {
                      return (
                        <td key={day} style={{ textAlign: 'center', color: '#b45309', fontStyle: 'italic', fontSize: '0.85rem', background: '#fef3c7' }}>
                          ☕ Break
                        </td>
                      )
                    }
                    const entry = grid[period.id]?.[day]
                    return (
                      <td key={day} style={{ position: 'relative', cursor: entry ? 'default' : 'pointer' }}
                        onClick={() => !entry && openAddModal(day, period.id)}>
                        {entry ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>{entry.subject}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{entry.teacher}</span>
                            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.2rem' }}>
                              <button className="btn-icon edit" onClick={(e) => { e.stopPropagation(); openEditModal(entry) }} aria-label="Edit" style={{ padding: '2px' }}>
                                <SquarePen size={13} />
                              </button>
                              <button className="btn-icon danger" onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }} aria-label="Delete" style={{ padding: '2px' }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '1.2rem' }} title="Click to add">+</span>
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

      {/* ── Modal Overlay ── */}
      {showModal && (
        <div style={overlayStyle} onClick={() => setShowModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>{editingId ? '✏️ Edit Period Entry' : '➕ Add Period Entry'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Day *</label>
                  <select value={formData.day} onChange={(e) => setFormData({ ...formData, day: e.target.value })} style={inputStyle} required>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Period *</label>
                  <select value={formData.periodId} onChange={(e) => setFormData({ ...formData, periodId: e.target.value })} style={inputStyle} required>
                    <option value="">-- Select Period --</option>
                    {teachingPeriods.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.startTime}–{p.endTime})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Subject *</label>
                  <select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} style={inputStyle} required>
                    <option value="">-- Select Subject --</option>
                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name} ({s.code})</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Teacher *</label>
                  <select value={formData.teacher} onChange={(e) => setFormData({ ...formData, teacher: e.target.value })} style={inputStyle} required>
                    <option value="">-- Select Teacher --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={`${t.firstName} ${t.lastName}`}>
                        {t.firstName} {t.lastName} {t.subject ? `(${t.subject})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Effective From</label>
                  <input
                    type="date"
                    title="Effective From"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    style={inputStyle}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                    Set a future date to schedule a timetable change. Leave as today for current timetable.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn primary">{editingId ? 'Update' : 'Add Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Styles ──
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '1rem',
}

const modalStyle = {
  background: '#fff', borderRadius: '14px', padding: '1.75rem', maxWidth: '540px', width: '100%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
}

const labelStyle = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: '#374151',
}

const inputStyle = {
  width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #d1d5db',
  fontSize: '0.9rem', outline: 'none',
}

const navBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '0.15rem',
  padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)',
  background: 'var(--background)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
}

export default TimetablePage
