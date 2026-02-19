// @ts-nocheck
import { useEffect, useState } from 'react'
import { Trash2, SquarePen } from 'lucide-react'
import apiClient from '@/services/api'
import { useToast } from '@/components/ToastContainer'
import { useConfirm } from '@/components/ConfirmDialog'
import { useAppSelector } from '@/store'

const SettingsPage = () => {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [activeTab, setActiveTab] = useState('school')
  const user = useAppSelector((state) => state.auth.user)

  // School settings
  const [school, setSchool] = useState(null)
  const [schoolForm, setSchoolForm] = useState({ name: '', boardType: '', schoolCode: '', academicYear: '' })
  const [schoolMsg, setSchoolMsg] = useState('')

  // Password change
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordMsg, setPasswordMsg] = useState('')

  // Subject management
  const [subjects, setSubjects] = useState([])
  const [newSubject, setNewSubject] = useState({ name: '', code: '' })
  const [editingSubjectId, setEditingSubjectId] = useState(null)
  const [subjectMsg, setSubjectMsg] = useState('')

  // Period management
  const [periods, setPeriods] = useState([])
  const [newPeriod, setNewPeriod] = useState({ name: '', startTime: '', endTime: '', sortOrder: 0, isBreak: false })
  const [editingPeriodId, setEditingPeriodId] = useState(null)
  const [periodMsg, setPeriodMsg] = useState('')

  useEffect(() => {
    loadSchool()
    loadSubjects()
    loadPeriods()
  }, [])

  const loadSchool = async () => {
    try {
      const res = await apiClient.listSchools()
      const schools = res?.data || []
      if (schools.length > 0) {
        setSchool(schools[0])
        setSchoolForm({
          name: schools[0].name || '',
          boardType: schools[0].boardType || 'CBSE',
          schoolCode: schools[0].schoolCode || '',
          academicYear: schools[0].academicYear || '2025-26',
        })
      }
    } catch (error) {
      console.error('Failed to load school:', error)
    }
  }

  const loadSubjects = async () => {
    try {
      const res = await apiClient.listSubjects()
      setSubjects(res?.data || [])
    } catch (error) {
      console.error('Failed to load subjects:', error)
    }
  }

  const handleSchoolUpdate = async (e) => {
    e.preventDefault()
    try {
      await apiClient.updateSchool(String(school.id), schoolForm)
      setSchoolMsg('✅ School settings updated!')
      setTimeout(() => setSchoolMsg(''), 3000)
    } catch (error) {
      setSchoolMsg('❌ Failed to update: ' + (error?.response?.data?.message || error.message))
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg('❌ New passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMsg('❌ Password must be at least 8 characters')
      return
    }
    try {
      await apiClient.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      setPasswordMsg('✅ Password changed successfully!')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setPasswordMsg(''), 3000)
    } catch (error) {
      setPasswordMsg('❌ ' + (error?.response?.data?.message || 'Failed to change password'))
    }
  }

  const handleAddSubject = async (e) => {
    e.preventDefault()
    if (!newSubject.name || !newSubject.code) return
    try {
      if (editingSubjectId) {
        await apiClient.updateSubject(String(editingSubjectId), newSubject)
        setSubjectMsg('✅ Subject updated!')
        setEditingSubjectId(null)
      } else {
        await apiClient.createSubject(newSubject)
        setSubjectMsg('✅ Subject added!')
      }
      setNewSubject({ name: '', code: '' })
      loadSubjects()
      setTimeout(() => setSubjectMsg(''), 3000)
    } catch (error) {
      setSubjectMsg('❌ ' + (error?.message || 'Failed to save subject'))
    }
  }

  const handleEditSubject = (s) => {
    setEditingSubjectId(s.id)
    setNewSubject({ name: s.name, code: s.code })
  }

  const handleDeleteSubject = async (id) => {
    const ok = await confirm('Delete this subject?')
    if (!ok) return
    try {
      await apiClient.deleteSubject(String(id))
      loadSubjects()
    } catch (error) {
      toast.error('Failed to delete: ' + (error?.response?.data?.message || error.message))
    }
  }

  // ── Periods ──
  const loadPeriods = async () => {
    try {
      const res = await apiClient.listPeriods()
      setPeriods(res?.data || [])
    } catch (error) {
      console.error('Failed to load periods:', error)
    }
  }

  const handleAddPeriod = async (e) => {
    e.preventDefault()
    if (!newPeriod.name || !newPeriod.startTime || !newPeriod.endTime) return
    try {
      if (editingPeriodId) {
        await apiClient.updatePeriod(String(editingPeriodId), newPeriod)
        setPeriodMsg('✅ Period updated!')
        setEditingPeriodId(null)
      } else {
        await apiClient.createPeriod(newPeriod)
        setPeriodMsg('✅ Period added!')
      }
      setNewPeriod({ name: '', startTime: '', endTime: '', sortOrder: periods.length + 1, isBreak: false })
      loadPeriods()
      setTimeout(() => setPeriodMsg(''), 3000)
    } catch (error) {
      setPeriodMsg('❌ ' + (error?.response?.data?.message || error?.message || 'Failed to save period'))
    }
  }

  const handleEditPeriod = (p) => {
    setEditingPeriodId(p.id)
    setNewPeriod({ name: p.name, startTime: p.startTime, endTime: p.endTime, sortOrder: p.sortOrder, isBreak: p.isBreak })
  }

  const handleDeletePeriod = async (id) => {
    const ok = await confirm('Delete this period?')
    if (!ok) return
    try {
      await apiClient.deletePeriod(String(id))
      loadPeriods()
    } catch (error) {
      toast.error('Failed to delete: ' + (error?.response?.data?.message || error.message))
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>⚙️ Settings</h1>
      </div>

      <div className="settings-tabs">
        {['school', 'subjects', 'periods', 'security'].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'school' ? '🏫 School' : tab === 'subjects' ? '📚 Subjects' : tab === 'periods' ? '🕐 Periods' : '🔒 Security'}
          </button>
        ))}
      </div>

      <div className="settings-content">
        {/* ── School Settings ── */}
        {activeTab === 'school' && (
          <div className="settings-card">
            <h3>School Information</h3>
            {schoolMsg && <div style={{ padding: '0.5rem', marginBottom: '1rem', borderRadius: '8px', background: schoolMsg.startsWith('✅') ? '#d1fae5' : '#fee2e2' }}>{schoolMsg}</div>}
            <form onSubmit={handleSchoolUpdate}>
            <div className="form-grid">
              <label>
                School Name
                <input
                  type="text"
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Board
                <select
                  value={schoolForm.boardType}
                  onChange={(e) => setSchoolForm({ ...schoolForm, boardType: e.target.value })}
                >
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="State">State Board</option>
                  <option value="IB">IB</option>
                  <option value="IGCSE">IGCSE</option>
                </select>
              </label>
              <label>
                School Code
                <input
                  type="text"
                  value={schoolForm.schoolCode}
                  onChange={(e) => setSchoolForm({ ...schoolForm, schoolCode: e.target.value })}
                  placeholder="e.g. AFFILIATION123"
                />
              </label>
              <label>
                Academic Year
                <input
                  type="text"
                  value={schoolForm.academicYear}
                  onChange={(e) => setSchoolForm({ ...schoolForm, academicYear: e.target.value })}
                  placeholder="e.g. 2025-26"
                />
              </label>
            </div>
            <div style={{ marginTop: '1.25rem' }}>
              <button type="submit" className="btn primary">Update School</button>
            </div>
            </form>

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--surface)', borderRadius: '8px' }}>
              <h4>Account Info</h4>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Role:</strong> {user?.role || 'school-admin'}</p>
            </div>
          </div>
        )}

        {/* ── Subject Management ── */}
        {activeTab === 'subjects' && (
          <div className="settings-card">
            <h3>📚 Subject Master</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
              Manage subjects available across Marks, Timetable, and Teacher assignment.
            </p>

            {subjectMsg && <div style={{ padding: '0.5rem', marginBottom: '1rem', borderRadius: '8px', background: subjectMsg.startsWith('✅') ? '#d1fae5' : '#fee2e2' }}>{subjectMsg}</div>}

            <form onSubmit={handleAddSubject} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Subject Name"
                value={newSubject.name}
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                required
                style={{ flex: 1, minWidth: '150px' }}
              />
              <input
                type="text"
                placeholder="Code (e.g. MAT)"
                value={newSubject.code}
                onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase().slice(0, 10) })}
                required
                style={{ width: '120px' }}
              />
              <button type="submit" className="btn primary">{editingSubjectId ? '✓ Update' : '+ Add Subject'}</button>
              {editingSubjectId && (
                <button type="button" className="btn outline" onClick={() => { setEditingSubjectId(null); setNewSubject({ name: '', code: '' }) }}>Cancel</button>
              )}
            </form>

            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Subject Name</th>
                    <th>Code</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.length === 0 ? (
                    <tr><td colSpan="4" className="empty-row">No subjects found. Add your first subject!</td></tr>
                  ) : (
                    subjects.map((s, idx) => (
                      <tr key={s.id}>
                        <td>{idx + 1}</td>
                        <td>{s.name}</td>
                        <td><code>{s.code}</code></td>
                        <td style={{ display: 'flex', gap: '0.35rem' }}>
                          <button className="btn-icon edit" onClick={() => handleEditSubject(s)} aria-label="Edit subject" style={{ padding: '4px' }}>
                            <SquarePen size={16} />
                          </button>
                          <button className="btn-icon danger" onClick={() => handleDeleteSubject(s.id)} aria-label="Delete subject">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Period Management ── */}
        {activeTab === 'periods' && (
          <div className="settings-card">
            <h3>🕐 Period / Time Slots</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
              Define periods with times for your school. These are used in the Timetable. Mark breaks like Lunch/Recess.
            </p>

            {periodMsg && <div style={{ padding: '0.5rem', marginBottom: '1rem', borderRadius: '8px', background: periodMsg.startsWith('✅') ? '#d1fae5' : '#fee2e2' }}>{periodMsg}</div>}

            <form onSubmit={handleAddPeriod} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Period 1"
                  value={newPeriod.name}
                  onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ width: '110px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Start Time *</label>
                <input
                  type="time"
                  value={newPeriod.startTime}
                  onChange={(e) => setNewPeriod({ ...newPeriod, startTime: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ width: '110px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>End Time *</label>
                <input
                  type="time"
                  value={newPeriod.endTime}
                  onChange={(e) => setNewPeriod({ ...newPeriod, endTime: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ width: '80px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Order</label>
                <input
                  type="number"
                  value={newPeriod.sortOrder}
                  onChange={(e) => setNewPeriod({ ...newPeriod, sortOrder: parseInt(e.target.value) || 0 })}
                  min="0"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingBottom: '0.35rem' }}>
                <input
                  type="checkbox"
                  id="isBreak"
                  checked={newPeriod.isBreak}
                  onChange={(e) => setNewPeriod({ ...newPeriod, isBreak: e.target.checked })}
                />
                <label htmlFor="isBreak" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>Break</label>
              </div>
              <button type="submit" className="btn primary">{editingPeriodId ? '✓ Update' : '+ Add Period'}</button>
              {editingPeriodId && (
                <button type="button" className="btn outline" onClick={() => { setEditingPeriodId(null); setNewPeriod({ name: '', startTime: '', endTime: '', sortOrder: periods.length + 1, isBreak: false }) }}>Cancel</button>
              )}
            </form>

            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Name</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.length === 0 ? (
                    <tr><td colSpan="6" className="empty-row">No periods defined. Add your school periods above!</td></tr>
                  ) : (
                    periods.map((p) => (
                      <tr key={p.id} style={p.isBreak ? { background: '#fef3c7' } : {}}>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{p.sortOrder}</td>
                        <td>{p.name}</td>
                        <td>{p.startTime}</td>
                        <td>{p.endTime}</td>
                        <td>{p.isBreak ? <span style={{ color: '#d97706', fontWeight: 600 }}>☕ Break</span> : 'Class'}</td>
                        <td style={{ display: 'flex', gap: '0.35rem' }}>
                          <button className="btn-icon edit" onClick={() => handleEditPeriod(p)} aria-label="Edit period" style={{ padding: '4px' }}>
                            ✏️
                          </button>
                          <button className="btn-icon danger" onClick={() => handleDeletePeriod(p.id)} aria-label="Delete period">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Security (Change Password) ── */}
        {activeTab === 'security' && (
          <div className="settings-card">
            <h3>🔒 Change Password</h3>
            {passwordMsg && <div style={{ padding: '0.5rem', marginBottom: '1rem', borderRadius: '8px', background: passwordMsg.startsWith('✅') ? '#d1fae5' : '#fee2e2' }}>{passwordMsg}</div>}
            <form onSubmit={handlePasswordChange}>
            <div className="form-grid">
              <label>
                Current Password
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </label>
              <label>
                New Password
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength={8}
                />
              </label>
              <label>
                Confirm New Password
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                />
              </label>
            </div>
            <div style={{ marginTop: '1.25rem' }}>
              <button type="submit" className="btn primary">Change Password</button>
            </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
