import { useState, useEffect, useRef, type FormEvent } from 'react'
import { adminApi } from '@/services/api'
import { useToast } from '@/components/ToastContainer'
import SearchBar from '@/components/SearchBar'
import type { AdminUser } from '@/types'

/* ── Module definitions ────────────────────────────────────────────── */
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

// When a module is selected, these dependencies are auto-selected too
const MODULE_DEPS: Record<string, string[]> = {
  admissions:   ['students'],
  hostel:       ['students'],
  exams:        ['students', 'classes'],
  attendance:   ['students', 'classes'],
  fees:         ['students'],
  achievements: ['students'],
  sports:       ['students'],
  library:      ['students'],
  leaves:       ['teachers', 'staff'],
}

// Reverse map: which modules depend on this key (used to show tooltip)
const MODULE_DEPENDENTS: Record<string, string[]> = Object.entries(MODULE_DEPS).reduce(
  (acc, [mod, deps]) => {
    deps.forEach((dep) => {
      acc[dep] = acc[dep] ? [...acc[dep], mod] : [mod]
    })
    return acc
  },
  {} as Record<string, string[]>,
)

// Resolve full dependency chain (including transitive)
const resolveDeps = (key: string, visited = new Set<string>()): string[] => {
  if (visited.has(key)) return []
  visited.add(key)
  const direct = MODULE_DEPS[key] ?? []
  return [...direct, ...direct.flatMap((d) => resolveDeps(d, visited))]
}

const emptyForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  modulePermissions: null as string[] | null,
  mfaEmail: true,
  mfaPhone: false,
  feeCanEdit: false,
  feeCanDelete: false,
  expenseCanEdit: false,
  expenseCanDelete: false,
}
type FormData = typeof emptyForm

/* ── Status badge ────────────────────────────────────────────────── */
const StatusBadge = ({ status }: { status?: string }) => {
  const isActive = status === 'active' || !status
  return (
    <span className={`ap-status ${isActive ? 'active' : 'suspended'}`}>
      <span className="ap-status-dot" />
      {isActive ? 'Active' : 'Suspended'}
    </span>
  )
}

/* ── Verify badge ────────────────────────────────────────────────── */
const VerifyBadge = ({ ok, label }: { ok?: boolean; label: string }) => (
  <span className={`ap-verify ${ok ? 'yes' : 'no'}`}>
    {ok ? '\u2713' : '\u2717'} {label}
  </span>
)

/* ── Main Page ─────────────────────────────────────────────────────── */
const AdminProfilesPage = () => {
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)

  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  // Slide-over panel
  const [panelOpen, setPanelOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Password modal
  const [pwAdmin, setPwAdmin] = useState<AdminUser | null>(null)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleteTyped, setDeleteTyped] = useState('')

  // Detail view
  const [detailAdmin, setDetailAdmin] = useState<AdminUser | null>(null)

  // Search
  const [search, setSearch] = useState('')

  /* ── Data loading ─────────────────────────────────────────────── */
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

  useEffect(() => { loadAdmins() }, [])

  /* ── Filtering ────────────────────────────────────────────────── */
  const filtered = admins.filter((a) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const name = `${a.profile?.firstName ?? ''} ${a.profile?.lastName ?? ''}`.toLowerCase()
    return name.includes(q) || a.email.toLowerCase().includes(q) || (a.phone ?? '').includes(q)
  })

  /* ── Panel open/close ─────────────────────────────────────────── */
  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setPanelOpen(true)
  }

  const openEdit = (admin: AdminUser) => {
    setEditId(admin.id)
    const rawPerms = admin.modulePermissions
    const allPerms: string[] | null = Array.isArray(rawPerms)
      ? rawPerms as string[]
      : (() => { try { return JSON.parse(rawPerms as unknown as string) } catch { return null } })()
    const moduleKeys = allPerms ? allPerms.filter((p) => !p.includes(':')) : null
    setForm({
      email: admin.email,
      password: '',
      firstName: admin.profile?.firstName ?? '',
      lastName: admin.profile?.lastName ?? '',
      phone: admin.phone ?? '',
      modulePermissions: moduleKeys,
      mfaEmail: admin.mfaEmail ?? true,
      mfaPhone: admin.mfaPhone ?? false,
      feeCanEdit: admin.feeCanEdit ?? false,
      feeCanDelete: admin.feeCanDelete ?? false,
      expenseCanEdit: admin.expenseCanEdit ?? false,
      expenseCanDelete: admin.expenseCanDelete ?? false,
    })
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setTimeout(() => { setEditId(null); setForm(emptyForm) }, 300)
  }

  /* ── Module toggle ────────────────────────────────────────────── */
  const handleModuleToggle = (key: string) => {
    setForm((prev) => {
      if (prev.modulePermissions === null) {
        // Currently full-access — switching to custom: deselect clicked + keep its deps unchecked
        const without = ALL_MODULES.map((m) => m.key).filter((k) => k !== key)
        return { ...prev, modulePermissions: without }
      }
      const has = prev.modulePermissions.includes(key)
      if (has) {
        // Deselecting — just remove this key (don't forcibly remove deps, other modules may need them)
        return { ...prev, modulePermissions: prev.modulePermissions.filter((k) => k !== key) }
      } else {
        // Selecting — also pull in all dependency modules
        const deps = resolveDeps(key)
        const next = Array.from(new Set([...prev.modulePermissions, key, ...deps]))
        return { ...prev, modulePermissions: next }
      }
    })
  }

  /* ── Submit create/edit ───────────────────────────────────────── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.phone.trim()) { toast.error('Mobile number is required.'); return }
    if (!form.firstName.trim() || !form.lastName.trim()) { toast.error('First and last name are required.'); return }
    setSaving(true)
    try {
      const finalPermissions: string[] | null = (() => {
        if (form.modulePermissions === null) return null
        return [...form.modulePermissions]
      })()
      const payload = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        modulePermissions: finalPermissions,
        mfaEmail: form.mfaEmail,
        mfaPhone: form.mfaPhone,
        feeCanEdit: form.feeCanEdit,
        feeCanDelete: form.feeCanDelete,
        expenseCanEdit: form.expenseCanEdit,
        expenseCanDelete: form.expenseCanDelete,
        ...(form.password ? { password: form.password } : {}),
      }
      if (editId) {
        await adminApi.update(editId, payload)
        toast.success('Admin updated successfully.')
      } else {
        if (!form.password) { toast.error('Password is required for new admins.'); setSaving(false); return }
        await adminApi.create({ ...payload, password: form.password })
        toast.success('Admin created. Welcome email & SMS sent.')
      }
      closePanel()
      loadAdmins()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save admin.')
    } finally {
      setSaving(false)
    }
  }

  /* ── Toggle suspend/activate ──────────────────────────────────── */
  const handleToggleStatus = async (admin: AdminUser) => {
    try {
      const res = await adminApi.toggleStatus(admin.id)
      toast.success(res.message)
      loadAdmins()
      if (detailAdmin?.id === admin.id) {
        setDetailAdmin({ ...detailAdmin, accountStatus: res.accountStatus as 'active' | 'suspended' })
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status.')
    }
  }

  /* ── Delete ───────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await adminApi.delete(deleteTarget.id)
      toast.success('Admin permanently deleted.')
      setDeleteTarget(null)
      setDeleteTyped('')
      if (detailAdmin?.id === deleteTarget.id) setDetailAdmin(null)
      loadAdmins()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete admin.')
    }
  }

  /* ── Change password ──────────────────────────────────────────── */
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (!pwAdmin) return
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters.'); return }
    if (newPw !== confirmPw) { toast.error('Passwords do not match.'); return }
    setPwSaving(true)
    try {
      await adminApi.updatePassword(pwAdmin.id, newPw)
      toast.success('Password updated. User session terminated.')
      setPwAdmin(null); setNewPw(''); setConfirmPw('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password.')
    } finally {
      setPwSaving(false)
    }
  }

  /* ── Module permissions display ───────────────────────────────── */
  const renderPermissions = (perms: string[] | null | undefined) => {
    if (!perms || !Array.isArray(perms)) {
      return <span className="ap-perm-all">All modules</span>
    }
    if (perms.length === 0) return <span className="ap-perm-none">No access</span>
    return (
      <div className="ap-perm-chips">
        {perms.map((p) => {
          const mod = ALL_MODULES.find((m) => m.key === p)
          return <span key={p} className="ap-perm-chip">{mod?.label ?? p}</span>
        })}
      </div>
    )
  }

  /* ═══════════════════ RENDER ═══════════════════════════════════════ */
  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="page-header">
        <h1>Admin Profiles</h1>
        <button className="btn primary" onClick={openCreate}>+ Add Admin</button>
      </div>

      {/* ── Search bar ── */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, or phone..."
      />

      {/* ── Cards grid ── */}
      {loading ? (
        <div className="ap-loading"><div className="ap-spinner" /><p>Loading admins...</p></div>
      ) : filtered.length === 0 ? (
        <div className="ap-empty">
          {admins.length === 0 ? (
            <><div className="ap-empty-icon">&#128100;</div><h3>No admins yet</h3><p>Click <strong>+ Add Admin</strong> to create your first school administrator.</p></>
          ) : (
            <><div className="ap-empty-icon">&#128269;</div><h3>No results</h3><p>No admins match &quot;{search}&quot;.</p></>
          )}
        </div>
      ) : (
        <div className="ap-grid">
          {filtered.map((admin) => (
            <div key={admin.id} className={`ap-card ${admin.accountStatus === 'suspended' ? 'suspended' : ''}`} onClick={() => setDetailAdmin(admin)}>
              <div className="ap-card-top">
                <div className="ap-card-avatar">{(admin.profile?.firstName?.[0] ?? admin.email[0]).toUpperCase()}</div>
                <div className="ap-card-info">
                  <h3>{admin.profile?.firstName ?? '\u2014'} {admin.profile?.lastName ?? ''}</h3>
                  <p className="ap-card-email">{admin.email}</p>
                </div>
                <StatusBadge status={admin.accountStatus} />
              </div>
              <div className="ap-card-meta">
                <span>&#128241; {admin.phone ?? '\u2014'}</span>
                <span className="ap-card-badges">
                  <VerifyBadge ok={admin.isEmailVerified} label="Email" />
                  <VerifyBadge ok={admin.isPhoneVerified} label="Phone" />
                </span>
              </div>
              <div className="ap-card-perms">{renderPermissions(admin.modulePermissions as string[] | null)}</div>
              <div className="ap-card-actions" onClick={(e) => e.stopPropagation()}>
                <button className="ap-act edit" onClick={() => openEdit(admin)} title="Edit">Edit</button>
                <button className="ap-act key" onClick={() => { setPwAdmin(admin); setNewPw(''); setConfirmPw(''); setShowPw(false); setShowConfirmPw(false) }} title="Change Password">Password</button>
                <button className={`ap-act ${admin.accountStatus === 'suspended' ? 'activate' : 'suspend'}`} onClick={() => handleToggleStatus(admin)} title={admin.accountStatus === 'suspended' ? 'Activate' : 'Suspend'}>
                  {admin.accountStatus === 'suspended' ? 'Activate' : 'Suspend'}
                </button>
                <button className="ap-act delete" onClick={() => { setDeleteTarget(admin); setDeleteTyped('') }} title="Delete">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ SLIDE-OVER — Create / Edit ═══════════════════════ */}
      <div className={`ap-backdrop ${panelOpen ? 'open' : ''}`} onClick={closePanel} />
      <aside className={`ap-panel ${panelOpen ? 'open' : ''}`}>
        <div className="ap-panel-head">
          <h2>{editId ? 'Edit Admin' : 'Create Admin'}</h2>
          <button className="ap-panel-close" onClick={closePanel} type="button">{'\u2715'}</button>
        </div>

        {!editId && (
          <div className="ap-panel-notice">
            A welcome email with credentials and a verification code will be sent automatically.
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="ap-form">
          <div className="ap-form-row">
            <div className="ap-field">
              <label>First Name <span className="req">*</span></label>
              <input type="text" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} required placeholder="First name" autoComplete="off" />
            </div>
            <div className="ap-field">
              <label>Last Name <span className="req">*</span></label>
              <input type="text" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} required placeholder="Last name" autoComplete="off" />
            </div>
          </div>

          <div className="ap-field">
            <label>Email <span className="req">*</span></label>
            <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required placeholder="admin@school.edu" autoComplete="off" />
          </div>

          <div className="ap-field">
            <label>Mobile Number <span className="req">*</span> <span className="ap-hint">(for OTP verification)</span></label>
            <input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} required placeholder="10-digit mobile number" minLength={10} maxLength={10} autoComplete="off" />
          </div>

          {/* ── MFA Settings ── */}
          <div className="ap-field">
            <label>MFA / Login Verification</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${form.mfaEmail ? '#2563eb' : '#e5e7eb'}`, borderRadius: '8px', cursor: 'pointer', background: form.mfaEmail ? '#eff6ff' : '#f9fafb', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={form.mfaEmail}
                  onChange={(e) => setForm((p) => ({ ...p, mfaEmail: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>📧 Email OTP</span>
                <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>Send OTP to email on login</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${form.mfaPhone ? '#2563eb' : '#e5e7eb'}`, borderRadius: '8px', cursor: 'pointer', background: form.mfaPhone ? '#eff6ff' : '#f9fafb', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={form.mfaPhone}
                  onChange={(e) => setForm((p) => ({ ...p, mfaPhone: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>📱 SMS OTP</span>
                <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>Send OTP to mobile on login</span>
              </label>
            </div>
            {!form.mfaEmail && !form.mfaPhone && (
              <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: '6px', fontSize: '13px', color: '#92400e' }}>
                ⚠️ Both MFA methods disabled — this admin will log in without OTP verification.
              </div>
            )}
          </div>

          {/* ── Fee Permissions ── */}
          <div className="ap-field">
            <label>💰 Fee Permissions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${form.feeCanEdit ? '#2563eb' : '#e5e7eb'}`, borderRadius: '8px', cursor: 'pointer', background: form.feeCanEdit ? '#eff6ff' : '#f9fafb', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={form.feeCanEdit}
                  onChange={(e) => setForm((p) => ({ ...p, feeCanEdit: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>✏️ Edit Fees</span>
                <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>Allow modifying fee records</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${form.feeCanDelete ? '#2563eb' : '#e5e7eb'}`, borderRadius: '8px', cursor: 'pointer', background: form.feeCanDelete ? '#eff6ff' : '#f9fafb', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={form.feeCanDelete}
                  onChange={(e) => setForm((p) => ({ ...p, feeCanDelete: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>🗑️ Delete Fees</span>
                <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>Allow permanently removing fee records</span>
              </label>
            </div>
            {!form.feeCanEdit && !form.feeCanDelete && (
              <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: '6px', fontSize: '13px', color: '#92400e' }}>
                ⚠️ Both fee permissions disabled — this admin can only add fees, not edit or delete.
              </div>
            )}
          </div>

          {/* ── Expense Permissions ── */}
          <div className="ap-field">
            <label>💸 Expense Permissions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${form.expenseCanEdit ? '#2563eb' : '#e5e7eb'}`, borderRadius: '8px', cursor: 'pointer', background: form.expenseCanEdit ? '#eff6ff' : '#f9fafb', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={form.expenseCanEdit}
                  onChange={(e) => setForm((p) => ({ ...p, expenseCanEdit: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>✏️ Edit Expenses</span>
                <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>Allow modifying expense records</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${form.expenseCanDelete ? '#2563eb' : '#e5e7eb'}`, borderRadius: '8px', cursor: 'pointer', background: form.expenseCanDelete ? '#eff6ff' : '#f9fafb', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={form.expenseCanDelete}
                  onChange={(e) => setForm((p) => ({ ...p, expenseCanDelete: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>🗑️ Delete Expenses</span>
                <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>Allow permanently removing expense records</span>
              </label>
            </div>
            {!form.expenseCanEdit && !form.expenseCanDelete && (
              <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: '6px', fontSize: '13px', color: '#92400e' }}>
                ⚠️ Both expense permissions disabled — this admin can only add expenses, not edit or delete.
              </div>
            )}
          </div>

          <div className="ap-field">
            <label>{editId ? 'New Password' : 'Password'} {!editId && <span className="req">*</span>}
              {editId && <span className="ap-hint">(leave blank to keep current)</span>}
            </label>
            <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required={!editId} minLength={editId ? undefined : 8} placeholder="Min 8 characters" autoComplete="new-password" />
          </div>

          {/* ── Module Permissions ── */}
          <div className="ap-field">
            <div className="ap-perm-head">
              <label>Module Permissions</label>
              <button type="button" className="ap-perm-toggle" onClick={() => setForm((p) => ({ ...p, modulePermissions: p.modulePermissions === null ? [] : null }))}>
                {form.modulePermissions === null ? 'Customize access' : 'Grant full access'}
              </button>
            </div>
            {form.modulePermissions === null ? (
              <div className="ap-perm-full">{'\u2713'} Full access to all modules</div>
            ) : (
              <div className="ap-mod-grid">
                {ALL_MODULES.map((mod) => {
                  const active = form.modulePermissions!.includes(mod.key)
                  const deps = MODULE_DEPS[mod.key] ?? []
                  const requiredBy = MODULE_DEPENDENTS[mod.key] ?? []
                  // Is this module auto-required because another selected module depends on it?
                  const isAutoSelected = active && deps.length === 0 && requiredBy.some(
                    (r) => form.modulePermissions!.includes(r)
                  )
                  const hasDeps = deps.length > 0
                  const depLabels = deps.map((d) => ALL_MODULES.find((m) => m.key === d)?.label ?? d).join(', ')
                  const title = hasDeps
                    ? `Requires: ${depLabels}`
                    : isAutoSelected
                      ? `Auto-selected: required by ${requiredBy.map((r) => ALL_MODULES.find((m) => m.key === r)?.label ?? r).join(', ')}`
                      : undefined
                  return (
                    <button
                      key={mod.key}
                      type="button"
                      title={title}
                      className={`ap-mod-chip ${active ? 'active' : ''} ${isAutoSelected ? 'auto' : ''}`}
                      onClick={() => handleModuleToggle(mod.key)}
                    >
                      <span>{mod.label}</span>
                      {hasDeps && <span className="ap-mod-dep" title={title}>🔗</span>}
                      {active && <span className="ap-mod-check">✓</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="ap-panel-btns">
            <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update Admin' : 'Create Admin'}</button>
            <button className="btn outline" type="button" onClick={closePanel}>Cancel</button>
          </div>
        </form>
      </aside>

      {/* ═══════════ MODAL — Change Password ═════════════════════════ */}
      {pwAdmin && (
        <div className="ap-overlay" onClick={() => setPwAdmin(null)}>
          <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-head">
              <h2>Change Password</h2>
              <button className="ap-modal-close" onClick={() => setPwAdmin(null)} type="button">{'\u2715'}</button>
            </div>
            <p className="ap-modal-desc">
              Changing password for <strong>{pwAdmin.profile?.firstName} {pwAdmin.profile?.lastName}</strong> ({pwAdmin.email}).
              Their active session will be terminated.
            </p>
            <form onSubmit={handleChangePassword} className="ap-modal-form">
              <div className="ap-field">
                <label>New Password <span className="req">*</span></label>
                <div className="ap-pw-wrap">
                  <input type={showPw ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} placeholder="Min 8 characters" autoComplete="new-password" />
                  <button type="button" className="ap-pw-eye" onClick={() => setShowPw(!showPw)}>{showPw ? 'Hide' : 'Show'}</button>
                </div>
              </div>
              <div className="ap-field">
                <label>Confirm Password <span className="req">*</span></label>
                <div className="ap-pw-wrap">
                  <input type={showConfirmPw ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={8} placeholder="Re-enter password" autoComplete="new-password" />
                  <button type="button" className="ap-pw-eye" onClick={() => setShowConfirmPw(!showConfirmPw)}>{showConfirmPw ? 'Hide' : 'Show'}</button>
                </div>
                {confirmPw && newPw !== confirmPw && <span className="ap-err">Passwords do not match</span>}
              </div>
              <div className="ap-modal-btns">
                <button className="btn primary" type="submit" disabled={pwSaving || newPw !== confirmPw}>{pwSaving ? 'Updating...' : 'Update Password'}</button>
                <button className="btn outline" type="button" onClick={() => setPwAdmin(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL — Delete Confirmation ═════════════════════ */}
      {deleteTarget && (
        <div className="ap-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="ap-modal danger" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-head danger">
              <h2>Delete Admin</h2>
              <button className="ap-modal-close" onClick={() => setDeleteTarget(null)} type="button">{'\u2715'}</button>
            </div>
            <p className="ap-modal-desc">
              You are about to <strong>permanently delete</strong> the admin account for{' '}
              <strong>{deleteTarget.profile?.firstName} {deleteTarget.profile?.lastName}</strong>{' '}
              ({deleteTarget.email}). This action cannot be undone.
            </p>
            <div className="ap-field" >
              <label style={{marginLeft:'20px',marginRight:'20px'}}>Type <strong>DELETE</strong> to confirm:</label>
              <input type="text" value={deleteTyped} onChange={(e) => setDeleteTyped(e.target.value)} placeholder="DELETE" autoComplete="off" className="ap-delete-input" />
            </div>
            <div className="ap-modal-btns">
              <button className="btn danger" disabled={deleteTyped !== 'DELETE'} onClick={handleDelete}>Permanently Delete</button>
              <button className="btn outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL — Admin Detail ════════════════════════════ */}
      {detailAdmin && (
        <div className="ap-overlay" onClick={() => setDetailAdmin(null)}>
          <div className="ap-modal wide" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-head">
              <h2>Admin Details</h2>
              <button className="ap-modal-close" onClick={() => setDetailAdmin(null)} type="button">{'\u2715'}</button>
            </div>
            <div className="ap-detail">
              <div className="ap-detail-top">
                <div className="ap-detail-avatar">{(detailAdmin.profile?.firstName?.[0] ?? detailAdmin.email[0]).toUpperCase()}</div>
                <div>
                  <h3>{detailAdmin.profile?.firstName} {detailAdmin.profile?.lastName}</h3>
                  <p>{detailAdmin.email}</p>
                  <StatusBadge status={detailAdmin.accountStatus} />
                </div>
              </div>
              <div className="ap-detail-grid">
                <div className="ap-detail-item"><span className="ap-detail-lbl">Mobile</span><span>{detailAdmin.phone ?? '\u2014'}</span></div>
                <div className="ap-detail-item"><span className="ap-detail-lbl">Email Verified</span><VerifyBadge ok={detailAdmin.isEmailVerified} label={detailAdmin.isEmailVerified ? 'Yes' : 'No'} /></div>
                <div className="ap-detail-item"><span className="ap-detail-lbl">Phone Verified</span><VerifyBadge ok={detailAdmin.isPhoneVerified} label={detailAdmin.isPhoneVerified ? 'Yes' : 'No'} /></div>
                <div className="ap-detail-item"><span className="ap-detail-lbl">Created</span><span>{new Date(detailAdmin.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
              </div>
              <div className="ap-detail-perms">
                <span className="ap-detail-lbl">Module Permissions</span>
                {renderPermissions(detailAdmin.modulePermissions as string[] | null)}
              </div>
              <div className="ap-detail-actions">
                <button className="btn primary" onClick={() => { setDetailAdmin(null); openEdit(detailAdmin) }}>Edit Profile</button>
                <button className="btn outline" onClick={() => { setDetailAdmin(null); setPwAdmin(detailAdmin); setNewPw(''); setConfirmPw('') }}>Change Password</button>
                <button className={`btn ${detailAdmin.accountStatus === 'suspended' ? 'primary' : 'outline'}`} onClick={() => handleToggleStatus(detailAdmin)}>
                  {detailAdmin.accountStatus === 'suspended' ? 'Activate' : 'Suspend'}
                </button>
                <button className="btn danger" onClick={() => { setDetailAdmin(null); setDeleteTarget(detailAdmin); setDeleteTyped('') }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminProfilesPage
