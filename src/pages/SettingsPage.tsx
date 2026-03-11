// @ts-nocheck
import { useEffect, useState } from 'react'
import { Trash2, SquarePen } from 'lucide-react'
import apiClient from '@/services/api'
import { useToast } from '@/components/ToastContainer'
import { useConfirm } from '@/components/ConfirmDialog'
import { useAppSelector } from '@/store'

// ── Reusable component for any MasterData category ──
const MasterDataSection = ({ category, title, description }) => {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [items, setItems] = useState([])
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    try {
      const data = await apiClient.listAllMasterData(category)
      setItems(Array.isArray(data) ? data : data?.data || [])
    } catch {}
  }

  useEffect(() => { load() }, [category])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!newLabel.trim()) return
    try {
      if (editingId) {
        await apiClient.updateMasterData(editingId, { label: newLabel })
        setMsg('✅ Updated!')
        setEditingId(null)
      } else {
        await apiClient.createMasterData(category, newLabel)
        setMsg('✅ Added!')
      }
      setNewLabel('')
      load()
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      setMsg('❌ ' + (err?.response?.data?.message || err?.message || 'Failed to save'))
      setTimeout(() => setMsg(''), 4000)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ message: 'Are you sure you want to delete this item? This action cannot be undone.' })
    if (!ok) return
    try {
      await apiClient.deleteMasterData(id)
      load()
    } catch (err) {
      toast.error('Failed to delete: ' + (err?.response?.data?.message || err?.message))
    }
  }

  const handleToggleActive = async (item) => {
    try {
      await apiClient.updateMasterData(item.id, { isActive: !item.isActive })
      load()
    } catch {}
  }

  return (
    <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
      <h4 style={{ marginBottom: '0.25rem', color: 'var(--text)' }}>{title}</h4>
      {description && (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>{description}</p>
      )}
      {msg && (
        <div style={{ padding: '0.4rem 0.75rem', marginBottom: '1rem', borderRadius: '6px', background: msg.startsWith('✅') ? '#d1fae5' : '#fee2e2', fontSize: '0.875rem' }}>
          {msg}
        </div>
      )}
      <form onSubmit={handleSave} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder={`New ${title} value...`}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          required
          style={{ flex: 1, minWidth: '200px' }}
        />
        <button type="submit" className="btn primary">
          {editingId ? '✓ Update' : '+ Add'}
        </button>
        {editingId && (
          <button type="button" className="btn outline" onClick={() => { setEditingId(null); setNewLabel('') }}>
            Cancel
          </button>
        )}
      </form>
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Label</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} className="empty-row">No items yet — add the first one above!</td></tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id} style={!item.isActive ? { opacity: 0.55 } : {}}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: 500 }}>{item.label}</td>
                  <td>
                    <span
                      onClick={() => handleToggleActive(item)}
                      title="Click to toggle active/inactive"
                      style={{ cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, padding: '2px 10px', borderRadius: '12px', background: item.isActive ? '#d1fae5' : '#f3f4f6', color: item.isActive ? '#059669' : '#6b7280' }}
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      className="btn-icon edit"
                      onClick={() => { setEditingId(item.id); setNewLabel(item.label) }}
                      style={{ padding: '4px' }}
                      aria-label="Edit"
                    >
                      <SquarePen size={16} />
                    </button>
                    <button
                      className="btn-icon danger"
                      onClick={() => handleDelete(item.id)}
                      aria-label="Delete"
                    >
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
  )
}

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

  // MFA settings
  const [mfa, setMfa] = useState({ mfaEmail: true, mfaPhone: false })
  const [mfaMsg, setMfaMsg] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)

  // SMS notification settings
  const [smsSettings, setSmsSettings] = useState({ smsEnabled: false, smsOnAbsent: false, smsOnFeeAssigned: false, smsOnLeaveApproved: false, smsOnAnnouncement: false })
  const [smsMsg, setSmsMsg] = useState('')
  const [smsLoading, setSmsLoading] = useState(false)

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
    apiClient.getMfaSettings().then((data) => {
      setMfa({ mfaEmail: data.mfaEmail ?? true, mfaPhone: data.mfaPhone ?? false })
    }).catch(() => {})
  }, [])

  // Load SMS settings whenever school is loaded
  useEffect(() => {
    if (school?.id) {
      apiClient.getSmsSettings(String(school.id)).then((res) => {
        const d = res?.data || res || {}
        setSmsSettings({
          smsEnabled: d.smsEnabled ?? false,
          smsOnAbsent: d.smsOnAbsent ?? false,
          smsOnFeeAssigned: d.smsOnFeeAssigned ?? false,
          smsOnLeaveApproved: d.smsOnLeaveApproved ?? false,
          smsOnAnnouncement: d.smsOnAnnouncement ?? false,
        })
      }).catch(() => {})
    }
  }, [school?.id])

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
    const ok = await confirm({ message: 'Are you sure you want to delete this subject? This action cannot be undone.' })
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
    const ok = await confirm({ message: 'Are you sure you want to delete this period? This action cannot be undone.' })
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
        {[
          { id: 'school', label: '🏫 School' },
          { id: 'subjects', label: '📚 Subjects' },
          { id: 'periods', label: '🕐 Periods' },
          { id: 'designations', label: '🏷️ Designations' },
          { id: 'finance', label: '💰 Finance Types' },
          { id: 'lookups', label: '📋 Lookups' },
          { id: 'security', label: '🔒 Security' },
        ].map(({ id, label }) => (
          <button
            key={id}
            className={`tab-btn ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            {label}
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

        {/* ── Designations ── */}
        {activeTab === 'designations' && (
          <div className="settings-card">
            <h3>🏷️ Designations</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
              Manage designations for teachers and staff. These appear as dropdown options across the app.
            </p>
            <MasterDataSection
              category="teacher-designations"
              title="Teacher Designations"
              description="e.g. PRT, TGT, PGT, HOD, Vice Principal, Principal"
            />
            <MasterDataSection
              category="staff-designations"
              title="Staff Designations"
              description="e.g. Watchman, Cook, Cleaning Staff, Office Boy, Peon"
            />
            <MasterDataSection
              category="staff-departments"
              title="Staff Departments"
              description="e.g. Office, Security, Housekeeping, Laboratory, Kitchen, Transport"
            />
          </div>
        )}

        {/* ── Finance Types ── */}
        {activeTab === 'finance' && (
          <div className="settings-card">
            <h3>💰 Finance Types</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
              Manage fee categories and expense types used throughout the Finance module.
            </p>
            <MasterDataSection
              category="fee-types"
              title="Fee Types"
              description="e.g. Tuition, Exam, Transport, Library, Sports, Lab"
            />
            <MasterDataSection
              category="expense-categories"
              title="Expense Categories"
              description="e.g. Maintenance, Salary, Supplies, Infrastructure, Events"
            />
          </div>
        )}

        {/* ── Other Lookups ── */}
        {activeTab === 'lookups' && (
          <div className="settings-card">
            <h3>📋 Lookups</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
              Manage leave types and library book categories used across the app.
            </p>
            <MasterDataSection
              category="leave-types"
              title="Leave Types"
              description="e.g. Sick, Casual, Annual, Maternity, Paternity, Emergency"
            />
            <MasterDataSection
              category="book-categories"
              title="Book Categories"
              description="e.g. Textbook, Reference, Fiction, Non-Fiction, Magazine"
            />
            <MasterDataSection
              category="event-categories"
              title="Event & Achievement Categories"
              description="e.g. Academic, Sports, Cultural, Other — used in Events and Achievements"
            />
          </div>
        )}

        {/* ── Security (Change Password) ── */}
        {activeTab === 'security' && (
          <div className="settings-card">

            {/* MFA Settings */}
            <h3>🔐 Two-Factor Authentication (MFA)</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
              Choose how you want to verify your identity when logging in. If both are unchecked, you will log in directly without an OTP.
            </p>
            {mfaMsg && (
              <div style={{ padding: '0.5rem 0.75rem', marginBottom: '1rem', borderRadius: '8px', background: mfaMsg.startsWith('✅') ? '#d1fae5' : '#fee2e2', fontSize: '0.875rem' }}>
                {mfaMsg}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer', padding: '1rem', borderRadius: '10px', border: `2px solid ${mfa.mfaEmail ? '#3b82f6' : 'var(--border, #e5e7eb)'}`, background: mfa.mfaEmail ? '#eff6ff' : 'var(--surface)' }}>
                <input
                  type="checkbox"
                  checked={mfa.mfaEmail}
                  onChange={(e) => setMfa({ ...mfa, mfaEmail: e.target.checked })}
                  style={{ marginTop: '2px', width: '18px', height: '18px', accentColor: '#3b82f6', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>📧 Email OTP</div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--muted)', marginTop: '2px' }}>
                    Send a one-time password to your registered email address on every login.
                  </div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer', padding: '1rem', borderRadius: '10px', border: `2px solid ${mfa.mfaPhone ? '#3b82f6' : 'var(--border, #e5e7eb)'}`, background: mfa.mfaPhone ? '#eff6ff' : 'var(--surface)' }}>
                <input
                  type="checkbox"
                  checked={mfa.mfaPhone}
                  onChange={(e) => setMfa({ ...mfa, mfaPhone: e.target.checked })}
                  style={{ marginTop: '2px', width: '18px', height: '18px', accentColor: '#3b82f6', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>📱 SMS OTP</div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--muted)', marginTop: '2px' }}>
                    Send a one-time password via SMS to your registered mobile number on every login.
                  </div>
                </div>
              </label>
              {!mfa.mfaEmail && !mfa.mfaPhone && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: '#fef9c3', border: '1px solid #fbbf24', fontSize: '0.85rem', color: '#92400e' }}>
                  ⚠️ <strong>No MFA enabled</strong> — you will log in directly without any OTP verification.
                </div>
              )}
            </div>
            <button
              className="btn primary"
              disabled={mfaLoading}
              onClick={async () => {
                setMfaLoading(true)
                try {
                  await apiClient.updateMfaSettings(mfa)
                  setMfaMsg('✅ MFA settings saved!')
                } catch (err) {
                  setMfaMsg('❌ ' + (err?.response?.data?.message || 'Failed to save'))
                } finally {
                  setMfaLoading(false)
                  setTimeout(() => setMfaMsg(''), 4000)
                }
              }}
            >
              {mfaLoading ? 'Saving…' : 'Save MFA Settings'}
            </button>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border, #e5e7eb)', margin: '2rem 0' }} />

            {/* SMS Notifications — only visible to super-admin */}
            {user?.role === 'super-admin' && (
              <>
                <h3>📲 SMS Notifications</h3>
                <p style={{ color: 'var(--muted)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                  Configure automatic SMS alerts sent to parents and staff when key events occur in the school.
                </p>
                {smsMsg && (
                  <div style={{ padding: '0.5rem 0.75rem', marginBottom: '1rem', borderRadius: '8px', background: smsMsg.startsWith('✅') ? '#d1fae5' : '#fee2e2', fontSize: '0.875rem' }}>
                    {smsMsg}
                  </div>
                )}
                {/* Master toggle */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer', padding: '1rem', borderRadius: '10px', border: `2px solid ${smsSettings.smsEnabled ? '#16a34a' : 'var(--border, #e5e7eb)'}`, background: smsSettings.smsEnabled ? '#f0fdf4' : 'var(--surface)', marginBottom: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={smsSettings.smsEnabled}
                    onChange={(e) => setSmsSettings({ ...smsSettings, smsEnabled: e.target.checked })}
                    style={{ marginTop: '2px', width: '18px', height: '18px', accentColor: '#16a34a', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>🔔 Enable SMS Notifications</div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--muted)', marginTop: '2px' }}>
                      Master switch — turn this on to allow SMS to be sent for the events below.
                    </div>
                  </div>
                </label>

                {/* Sub-toggles — only shown when master is on */}
                {smsSettings.smsEnabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
                    {[
                      { key: 'smsOnAbsent', icon: '🏫', label: 'Absent Student Alert', desc: 'Send SMS to parent when their child is marked absent.' },
                      { key: 'smsOnFeeAssigned', icon: '💳', label: 'Fee Assignment Alert', desc: 'Send SMS to parent when a fee is assigned to their child.' },
                      { key: 'smsOnLeaveApproved', icon: '📋', label: 'Leave Status Alert', desc: 'Send SMS to the employee when their leave is approved or rejected.' },
                      { key: 'smsOnAnnouncement', icon: '📢', label: 'Announcement Broadcast', desc: 'Send SMS to all parents and staff when a new announcement is created.' },
                    ].map(({ key, icon, label, desc }) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer', padding: '0.85rem 1rem', borderRadius: '10px', border: `1.5px solid ${smsSettings[key] ? '#3b82f6' : 'var(--border, #e5e7eb)'}`, background: smsSettings[key] ? '#eff6ff' : 'var(--surface)' }}>
                        <input
                          type="checkbox"
                          checked={smsSettings[key]}
                          onChange={(e) => setSmsSettings({ ...smsSettings, [key]: e.target.checked })}
                          style={{ marginTop: '2px', width: '17px', height: '17px', accentColor: '#3b82f6', flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{icon} {label}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '2px' }}>{desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <button
                  className="btn primary"
                  disabled={smsLoading || !school}
                  onClick={async () => {
                    setSmsLoading(true)
                    try {
                      await apiClient.updateSmsSettings(String(school.id), smsSettings)
                      setSmsMsg('✅ SMS settings saved!')
                    } catch (err) {
                      setSmsMsg('❌ ' + (err?.response?.data?.message || 'Failed to save'))
                    } finally {
                      setSmsLoading(false)
                      setTimeout(() => setSmsMsg(''), 4000)
                    }
                  }}
                >
                  {smsLoading ? 'Saving…' : 'Save SMS Settings'}
                </button>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border, #e5e7eb)', margin: '2rem 0' }} />
              </>
            )}

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
