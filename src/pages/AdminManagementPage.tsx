import { useState, useEffect, type FormEvent } from 'react'
import { adminApi, schoolApi } from '@/services/api'
import { useToast } from '@/components/ToastContainer'
import type { AdminUser, School } from '@/types'

const ALL_MODULES = [
  { key: 'students',      label: 'Students' },
  { key: 'admissions',    label: 'Admissions' },
  { key: 'teachers',      label: 'Teachers' },
  { key: 'staff',         label: 'Staff' },
  { key: 'hostel',        label: 'Hostel' },
  { key: 'classes',       label: 'Classes' },
  { key: 'exams',         label: 'Exams & Marks' },
  { key: 'attendance',    label: 'Attendance' },
  { key: 'fees',          label: 'Fees' },
  { key: 'events',        label: 'Events' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'achievements',  label: 'Achievements' },
  { key: 'sports',        label: 'Sports' },
  { key: 'library',       label: 'Library' },
  { key: 'transport',     label: 'Transport' },
  { key: 'expenses',      label: 'Expenses' },
  { key: 'holidays',      label: 'Holidays' },
  { key: 'leaves',        label: 'Leaves' },
]

const emptyForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  schoolId: '',
  modulePermissions: null as string[] | null, // null = all modules
}

type FormData = typeof emptyForm

// ── Verification status badge ────────────────────────────────────────
const VerifyBadge = ({ ok, label }: { ok?: boolean; label: string }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 7px',
    borderRadius: '999px',
    fontSize: '0.72rem',
    fontWeight: 600,
    background: ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
    color: ok ? '#16a34a' : '#dc2626',
    border: `1px solid ${ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
  }}>
    {ok ? '✓' : '✗'} {label}
  </span>
)

const AdminManagementPage = () => {
  const toast = useToast()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // Change-password modal
  const [pwModal, setPwModal]     = useState<number | null>(null)
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving]   = useState(false)

  const loadAdmins = async () => {
    try {
      const data = await adminApi.list()
      setAdmins(Array.isArray(data) ? data : (data as any)?.data ?? [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load admins.')
    } finally {
      setLoading(false)
    }
  }

  const loadSchools = async () => {
    try {
      const data = await schoolApi.list()
      setSchools(Array.isArray(data) ? data : (data as any)?.data ?? [])
    } catch {
      // silent — schools list is just for the dropdown
    }
  }

  useEffect(() => {
    loadAdmins()
    loadSchools()
  }, [])

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (admin: AdminUser) => {
    setEditId(admin.id)
    const perms: string[] | null = (() => {
      if (!admin.modulePermissions) return null
      try { return JSON.parse(admin.modulePermissions) as string[] } catch { return null }
    })()
    setForm({
      email:             admin.email,
      password:          '',
      firstName:         admin.profile?.firstName ?? '',
      lastName:          admin.profile?.lastName  ?? '',
      phone:             admin.phone ?? '',
      schoolId:          admin.schoolId ? String(admin.schoolId) : '',
      modulePermissions: perms,
    })
    setShowForm(true)
  }

  const handleModuleToggle = (key: string) => {
    setForm((prev) => {
      if (prev.modulePermissions === null) {
        // was "all" → restrict to all except this one
        return { ...prev, modulePermissions: ALL_MODULES.map((m) => m.key).filter((k) => k !== key) }
      }
      const has = prev.modulePermissions.includes(key)
      const next = has
        ? prev.modulePermissions.filter((k) => k !== key)
        : [...prev.modulePermissions, key]
      return { ...prev, modulePermissions: next }
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.phone.trim()) { toast.error('Mobile number is required.'); return }
    setSaving(true)
    try {
      const payload = {
        email:             form.email,
        firstName:         form.firstName,
        lastName:          form.lastName,
        phone:             form.phone,
        schoolId:          form.schoolId ? Number(form.schoolId) : undefined,
        modulePermissions: form.modulePermissions,
        ...(form.password ? { password: form.password } : {}),
      }
      if (editId) {
        await adminApi.update(editId, payload)
        toast.success('Admin updated successfully.')
      } else {
        if (!form.password) { toast.error('Password is required for new admins.'); setSaving(false); return }
        await adminApi.create({ ...payload, password: form.password })
        toast.success('Admin created. Welcome email & verification OTP sent.')
      }
      setShowForm(false)
      loadAdmins()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save admin.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await adminApi.delete(id)
      toast.success('Admin deleted.')
      setDeleteConfirm(null)
      loadAdmins()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete admin.')
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (newPw !== confirmPw) { toast.error('Passwords do not match.'); return }
    if (pwModal === null) return
    setPwSaving(true)
    try {
      await adminApi.updatePassword(pwModal, newPw)
      toast.success('Password updated. The user will need to log in again.')
      setPwModal(null)
      setNewPw('')
      setConfirmPw('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password.')
    } finally {
      setPwSaving(false)
    }
  }

  const moduleLabel = (perms: string | null | undefined) => {
    if (!perms) return <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>● All modules</span>
    try {
      const arr: string[] = JSON.parse(perms)
      if (arr.length === 0) return <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>No access</span>
      return (
        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
          {arr.length} module{arr.length !== 1 ? 's' : ''}: {arr.join(', ')}
        </span>
      )
    } catch { return <span style={{ opacity: 0.5 }}>—</span> }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Manage School Admins</h1>
        <button className="btn primary" onClick={openCreate}>+ Add Admin</button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : admins.length === 0 ? (
        <div className="empty-state">
          <p>No school admins yet. Click <strong>+ Add Admin</strong> to create one.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>School</th>
                <th>Verified</th>
                <th>Module Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    {admin.profile?.firstName ?? '—'} {admin.profile?.lastName ?? ''}
                  </td>
                  <td>{admin.email}</td>
                  <td>{admin.phone ?? '—'}</td>
                  <td>{admin.school?.name ?? '—'}</td>
                  <td style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <VerifyBadge ok={admin.isEmailVerified} label="Email" />
                    <VerifyBadge ok={admin.isPhoneVerified} label="Phone" />
                  </td>
                  <td>{moduleLabel(admin.modulePermissions)}</td>
                  <td>
                    <button className="btn-icon" onClick={() => openEdit(admin)} title="Edit">✏️</button>
                    <button className="btn-icon" title="Change Password"
                      style={{ marginLeft: '0.4rem' }}
                      onClick={() => { setPwModal(admin.id); setNewPw(''); setConfirmPw('') }}>🔑</button>
                    {deleteConfirm === admin.id ? (
                      <span style={{ marginLeft: '0.5rem' }}>
                        <button className="btn danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                          onClick={() => handleDelete(admin.id)}>Confirm Delete</button>
                        <button className="btn outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginLeft: '0.25rem' }}
                          onClick={() => setDeleteConfirm(null)}>Cancel</button>
                      </span>
                    ) : (
                      <button className="btn-icon" onClick={() => setDeleteConfirm(admin.id)} title="Delete" style={{ marginLeft: '0.4rem' }}>🗑️</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" style={{ maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? 'Edit Admin' : 'Create Admin'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            {!editId && (
              <p style={{ padding: '0 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 0 }}>
                📧 A welcome email with credentials and a verification code will be sent automatically.
              </p>
            )}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 1.25rem 1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label>
                  <span className="field-label">First Name *</span>
                  <input className="form-input" value={form.firstName}
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} required placeholder="First name" />
                </label>
                <label>
                  <span className="field-label">Last Name *</span>
                  <input className="form-input" value={form.lastName}
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} required placeholder="Last name" />
                </label>
              </div>
              <label>
                <span className="field-label">Email *</span>
                <input className="form-input" type="email" value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required placeholder="admin@school.edu" />
              </label>
              <label>
                <span className="field-label">Mobile Number * <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(for OTP verification)</span></span>
                <input className="form-input" type="tel" value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  required placeholder="10-digit mobile number" minLength={10} />
              </label>
              <label>
                <span className="field-label">{editId ? 'New Password (leave blank to keep)' : 'Password *'}</span>
                <input className="form-input" type="password" value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required={!editId} minLength={editId ? undefined : 8} placeholder="Min 8 characters" />
              </label>
              <label>
                <span className="field-label">Assign School</span>
                <select className="form-input" value={form.schoolId}
                  onChange={(e) => setForm((p) => ({ ...p, schoolId: e.target.value }))}>
                  <option value="">— No school —</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>

              {/* ── Module Permissions ── */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="field-label">Module Permissions</span>
                  <button type="button" style={{ fontSize: '0.75rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--primary)' }}
                    onClick={() => setForm((p) => ({ ...p, modulePermissions: p.modulePermissions === null ? [] : null }))}>
                    {form.modulePermissions === null ? 'Switch to custom' : 'Grant all access'}
                  </button>
                </div>
                {form.modulePermissions === null ? (
                  <p style={{ fontSize: '0.85rem', color: '#22c55e', margin: 0 }}>✓ Full access to all modules</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {ALL_MODULES.map((mod) => {
                      const active = form.modulePermissions!.includes(mod.key)
                      return (
                        <button
                          key={mod.key}
                          type="button"
                          onClick={() => handleModuleToggle(mod.key)}
                          style={{
                            padding: '0.3rem 0.65rem',
                            borderRadius: '999px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            border: `1px solid ${active ? 'var(--primary, #22c55e)' : 'var(--border)'}`,
                            background: active ? 'var(--primary-light, #dcfce7)' : 'transparent',
                            color: active ? 'var(--primary-dark, #166534)' : 'inherit',
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          {active ? '✓ ' : ''}{mod.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button className="btn primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editId ? 'Update Admin' : 'Create Admin'}
                </button>
                <button className="btn outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Change Password modal ── */}
      {pwModal !== null && (
        <div className="modal-overlay" onClick={() => setPwModal(null)}>
          <div className="modal" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 Change Password</h2>
              <button className="modal-close" onClick={() => setPwModal(null)}>×</button>
            </div>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 1.25rem 1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                The user's active session will be terminated and they will need to log in again with the new password.
              </p>
              <label>
                <span className="field-label">New Password *</span>
                <input className="form-input" type="password" value={newPw}
                  onChange={(e) => setNewPw(e.target.value)} required minLength={8}
                  placeholder="Min 8 characters" autoComplete="new-password" />
              </label>
              <label>
                <span className="field-label">Confirm Password *</span>
                <input className="form-input" type="password" value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)} required minLength={8}
                  placeholder="Re-enter new password" autoComplete="new-password" />
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn primary" type="submit" disabled={pwSaving}>
                  {pwSaving ? 'Updating...' : 'Update Password'}
                </button>
                <button className="btn outline" type="button" onClick={() => setPwModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminManagementPage
