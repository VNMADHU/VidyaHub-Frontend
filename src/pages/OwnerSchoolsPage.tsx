import { useState, useEffect, type FormEvent } from 'react'
import {
  Building2, Plus, ChevronDown, ChevronRight, Edit2, Trash2, Key,
  Users, Settings, Info, CheckCircle, XCircle, RefreshCw, Save,
  UserPlus, ToggleLeft, ToggleRight, Eye, EyeOff, X
} from 'lucide-react'
import { adminApi, schoolApi } from '@/services/api'
import type { AdminUser } from '@/types'

// ── Types ─────────────────────────────────────────────────
interface OwnerSchool {
  id: number
  name: string
  address: string
  contact: string
  principal: string
  boardType: string
  isFreeTrail: boolean
  status: string
  createdAt: string
}

interface SchoolConfig {
  smsLimit: number
  freeTrialLimit: number
  totalSmsUsed: number
  totalChatCalls: number
  geminiApiKey?: string
}

// ── Reusable pill ──────────────────────────────────────────
const StatusPill = ({ active, label }: { active: boolean; label?: string }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 10px', borderRadius: 99,
    fontSize: '0.72rem', fontWeight: 600,
    background: active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
    color: active ? '#22c55e' : '#ef4444',
    border: `1px solid ${active ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
  }}>
    {active ? <CheckCircle size={11} /> : <XCircle size={11} />}
    {label ?? (active ? 'Active' : 'Inactive')}
  </span>
)

// ── Modal wrapper ─────────────────────────────────────────
const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div style={{
        background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, width: '100%', maxWidth: 680,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem 0.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1rem', margin: 0 }}>{title}</p>
          <button
            type="button" onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, color: 'rgba(241,245,249,0.6)', cursor: 'pointer',
              padding: '4px 6px', lineHeight: 1, display: 'flex', alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '1.1rem 1.25rem 1.25rem', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── School Form ────────────────────────────────────────────
interface SchoolFormProps {
  initial?: Partial<OwnerSchool>
  onSave: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}
const SchoolForm = ({ initial, onSave, onCancel }: SchoolFormProps) => {
  const isCreate = !initial

  const [schoolForm, setSchoolForm] = useState({
    name: initial?.name ?? '',
    address: initial?.address ?? '',
    contact: initial?.contact ?? '',
    principal: initial?.principal ?? '',
    boardType: initial?.boardType ?? '',
    isFreeTrail: initial?.isFreeTrail ?? true,
    status: initial?.status ?? 'active',
  })
  const [adminForm, setAdminForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', mfaPhone: false,
  })
  const [configForm, setConfigForm] = useState({
    smsLimit: 1000, freeTrialLimit: 0, geminiApiKey: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const setS = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setSchoolForm((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const setA = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAdminForm((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const setC = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setConfigForm((p) => ({ ...p, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true); setErr('')
    try {
      if (isCreate) {
        await onSave({ ...schoolForm, admin: adminForm, config: configForm })
      } else {
        await onSave(schoolForm)
      }
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Failed to save school.')
    } finally { setLoading(false) }
  }

  const sectionStyle: React.CSSProperties = {
    borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14, marginTop: 2,
  }
  const sectionTitle: React.CSSProperties = {
    color: '#f59e0b', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase',
    letterSpacing: '0.06em', margin: '0 0 10px',
  }

  return (
    <form onSubmit={handleSubmit} style={formStyles.form}>
      {/* ── School Details ── */}
      <div style={formStyles.grid2}>
        {(['name', 'principal', 'contact', 'boardType'] as const).map((field) => (
          <div key={field} style={formStyles.field}>
            <label style={formStyles.label}>{fieldLabel(field)}</label>
            <input style={formStyles.input} value={schoolForm[field]}
              onChange={setS(field)} required placeholder={fieldLabel(field)} />
          </div>
        ))}
      </div>
      <div style={formStyles.field}>
        <label style={formStyles.label}>Address</label>
        <input style={formStyles.input} value={schoolForm.address}
          onChange={setS('address')} required placeholder="Full school address" />
      </div>
      <div style={formStyles.grid2}>
        <div style={formStyles.field}>
          <label style={formStyles.label}>Status</label>
          <select style={formStyles.input} value={schoolForm.status} onChange={setS('status')}>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div style={formStyles.field}>
          <label style={formStyles.label}>Plan</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingTop: 8 }}>
            <input type="checkbox" checked={schoolForm.isFreeTrail} onChange={setS('isFreeTrail')}
              style={{ accentColor: '#f59e0b', width: 16, height: 16 }} />
            <span style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>Free Trial</span>
          </label>
        </div>
      </div>

      {/* ── Super Admin Account (create only) ── */}
      {isCreate && (
        <div style={sectionStyle}>
          <p style={sectionTitle}>👤 Super Admin Account</p>
          <div style={formStyles.grid2}>
            <div style={formStyles.field}><label style={formStyles.label}>First Name</label>
              <input style={formStyles.input} value={adminForm.firstName} onChange={setA('firstName')} required /></div>
            <div style={formStyles.field}><label style={formStyles.label}>Last Name</label>
              <input style={formStyles.input} value={adminForm.lastName} onChange={setA('lastName')} required /></div>
            <div style={formStyles.field}><label style={formStyles.label}>Email</label>
              <input style={formStyles.input} type="email" value={adminForm.email} onChange={setA('email')} required /></div>
            <div style={formStyles.field}><label style={formStyles.label}>Phone (10-digit)</label>
              <input style={formStyles.input} type="tel" value={adminForm.phone} onChange={setA('phone')} required minLength={10} maxLength={10} /></div>
          </div>
          <div style={formStyles.field}>
            <label style={formStyles.label}>Password (min 8 chars)</label>
            <div style={{ position: 'relative' }}>
              <input style={{ ...formStyles.input, paddingRight: 38 }} type={showPw ? 'text' : 'password'}
                value={adminForm.password} onChange={setA('password')} required minLength={8} />
              <button type="button" style={formStyles.eyeBtn} onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <label style={{ ...formStyles.label, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
            <input type="checkbox" checked={adminForm.mfaPhone} onChange={setA('mfaPhone')} style={{ accentColor: '#f59e0b' }} />
            Require SMS OTP on login (MFA)
          </label>
        </div>
      )}

      {/* ── Initial Configuration (create only) ── */}
      {isCreate && (
        <div style={sectionStyle}>
          <p style={sectionTitle}>⚙️ Initial Configuration</p>
          <div style={formStyles.grid2}>
            <div style={formStyles.field}>
              <label style={formStyles.label}>SMS Limit</label>
              <input style={formStyles.input} type="number" min={0}
                value={configForm.smsLimit} onChange={setC('smsLimit')} />
            </div>
            <div style={formStyles.field}>
              <label style={formStyles.label}>
                Trial Record Limit&nbsp;
                {/* <span style={{ color: 'rgba(241,245,249,0.35)', fontWeight: 400, textTransform: 'none' }}>(0 = use env default)</span> */}
              </label>
              <input style={formStyles.input} type="number" min={0}
                value={configForm.freeTrialLimit} onChange={setC('freeTrialLimit')} />
            </div>
          </div>
          <div style={formStyles.field}>
            <label style={formStyles.label}>Gemini API Key&nbsp;
              <span style={{ color: 'rgba(241,245,249,0.35)', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
            </label>
            <input style={formStyles.input} value={configForm.geminiApiKey}
              onChange={setC('geminiApiKey')} placeholder="AIza…" />
          </div>
        </div>
      )}

      {err && <p style={formStyles.err}>{err}</p>}
      <div style={formStyles.actions}>
        <button style={formStyles.cancel} type="button" onClick={onCancel}>Cancel</button>
        <button style={formStyles.submit} type="submit" disabled={loading}>
          <Save size={14} />{loading ? 'Saving…' : isCreate ? 'Create School' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
const fieldLabel = (k: string) =>
  ({ name: 'School Name', principal: 'Principal', contact: 'Contact (10-digit)', boardType: 'Board Type' }[k] ?? k)

// ── Admin Form ────────────────────────────────────────────
interface AdminFormProps {
  schoolId: number
  onSave: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}
const AdminForm = ({ schoolId, onSave, onCancel }: AdminFormProps) => {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', mfaPhone: false,
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true); setErr('')
    try {
      await onSave({ ...form, schoolId, modulePermissions: null })
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Failed to create admin.')
    } finally { setLoading(false) }
  }
  return (
    <form onSubmit={handleSubmit} style={formStyles.form}>
      <div style={formStyles.grid2}>
        <div style={formStyles.field}><label style={formStyles.label}>First Name</label>
          <input style={formStyles.input} value={form.firstName} onChange={set('firstName')} required /></div>
        <div style={formStyles.field}><label style={formStyles.label}>Last Name</label>
          <input style={formStyles.input} value={form.lastName} onChange={set('lastName')} required /></div>
        <div style={formStyles.field}><label style={formStyles.label}>Email</label>
          <input style={formStyles.input} type="email" value={form.email} onChange={set('email')} required /></div>
        <div style={formStyles.field}><label style={formStyles.label}>Phone</label>
          <input style={formStyles.input} type="tel" value={form.phone} onChange={set('phone')} required minLength={10} /></div>
      </div>
      <div style={formStyles.field}><label style={formStyles.label}>Password (min 8 chars)</label>
        <div style={{ position: 'relative' }}>
          <input style={{ ...formStyles.input, paddingRight: 38 }} type={showPw ? 'text' : 'password'}
            value={form.password} onChange={set('password')} required minLength={8} />
          <button type="button" style={formStyles.eyeBtn} onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <label style={{ ...formStyles.label, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.mfaPhone} onChange={set('mfaPhone')} style={{ accentColor: '#f59e0b' }} />
        Require SMS OTP on login (MFA)
      </label>
      {err && <p style={formStyles.err}>{err}</p>}
      <div style={formStyles.actions}>
        <button style={formStyles.cancel} type="button" onClick={onCancel}>Cancel</button>
        <button style={formStyles.submit} type="submit" disabled={loading}>
          <UserPlus size={14} />{loading ? 'Creating…' : 'Create Admin'}
        </button>
      </div>
    </form>
  )
}

// ── Password Reset Form ────────────────────────────────────
const PasswordForm = ({ adminId, onDone }: { adminId: number; onDone: () => void }) => {
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true); setMsg('')
    try {
      await adminApi.updatePassword(adminId, pw)
      setMsg('✅ Password updated!')
      setPw('')
    } catch (ex: unknown) {
      setMsg(ex instanceof Error ? ex.message : 'Failed to update password.')
    } finally { setLoading(false) }
  }
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
        <input style={{ ...formStyles.input, margin: 0, paddingRight: 36, fontSize: '0.8rem' }}
          type={showPw ? 'text' : 'password'} placeholder="New password (min 8 chars)"
          value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} />
        <button type="button" style={formStyles.eyeBtn} onClick={() => setShowPw(!showPw)}>
          {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
      <button style={{ ...formStyles.submit, padding: '0.45rem 0.9rem', fontSize: '0.78rem' }} type="submit" disabled={loading}>
        <Key size={13} />{loading ? 'Saving…' : 'Set'}
      </button>
      <button style={{ ...formStyles.cancel, padding: '0.45rem 0.9rem', fontSize: '0.78rem' }} type="button" onClick={onDone}>✕</button>
      {msg && <span style={{ fontSize: '0.78rem', color: msg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{msg}</span>}
    </form>
  )
}

// ── Config Panel ───────────────────────────────────────────
const ConfigPanel = ({ schoolId }: { schoolId: number }) => {
  const [cfg, setCfg] = useState<SchoolConfig | null>(null)
  const [smsLimit, setSmsLimit] = useState('')
  const [freeTrialLimit, setFreeTrialLimit] = useState('')
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    schoolApi.getSchoolConfig(String(schoolId))
      .then((res: { data: SchoolConfig }) => {
        setCfg(res.data)
        setSmsLimit(String(res.data.smsLimit))
        setFreeTrialLimit(String(res.data.freeTrialLimit ?? 0))
        setGeminiApiKey(res.data.geminiApiKey ?? '')
      })
      .catch(() => setMsg('Failed to load config'))
      .finally(() => setLoading(false))
  }, [schoolId])

  const handleSave = async () => {
    setSaving(true); setMsg('')
    try {
      await schoolApi.updateSchoolConfig(String(schoolId), {
        smsLimit: parseInt(smsLimit),
        freeTrialLimit: parseInt(freeTrialLimit),
        geminiApiKey: geminiApiKey || undefined,
      })
      setMsg('✅ Saved!')
    } catch (ex: unknown) {
      setMsg(ex instanceof Error ? ex.message : 'Failed to save.')
    } finally { setSaving(false) }
  }

  if (loading) return <p style={s.dimText}>Loading config…</p>

  const limitReached = cfg && cfg.totalSmsUsed >= cfg.smsLimit
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {limitReached && (
        <div style={s.warnBanner}>
          ⚠️ SMS limit reached — school cannot send notifications until limit is increased.
        </div>
      )}
      {/* Usage stats */}
      <div style={s.cfgGrid}>
        <div style={s.cfgCard}>
          <p style={s.cfgLabel}>SMS Sent</p>
          <p style={s.cfgValue}>{cfg?.totalSmsUsed ?? 0}</p>
        </div>
        <div style={s.cfgCard}>
          <p style={s.cfgLabel}>Chat Calls</p>
          <p style={s.cfgValue}>{cfg?.totalChatCalls ?? 0}</p>
        </div>
      </div>
      {/* Editable config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={formStyles.grid2}>
          <div style={formStyles.field}>
            <label style={formStyles.label}>SMS Limit</label>
            <input style={{ ...formStyles.input, margin: 0 }} type="number" min={0}
              value={smsLimit} onChange={(e) => setSmsLimit(e.target.value)} />
          </div>
          <div style={formStyles.field}>
            <label style={formStyles.label}>
              Trial Record Limit&nbsp;
              {/* <span style={{ color: 'rgba(241,245,249,0.35)', fontWeight: 400, textTransform: 'none' }}>(0 = env default)</span> */}
            </label>
            <input style={{ ...formStyles.input, margin: 0 }} type="number" min={0}
              value={freeTrialLimit} onChange={(e) => setFreeTrialLimit(e.target.value)} />
          </div>
        </div>
        <div style={formStyles.field}>
          <label style={formStyles.label}>Gemini API Key</label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...formStyles.input, margin: 0, paddingRight: 38 }}
              type={showKey ? 'text' : 'password'}
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIza… (leave blank to clear)"
            />
            <button type="button" style={formStyles.eyeBtn} onClick={() => setShowKey(!showKey)}>
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button style={formStyles.submit} onClick={handleSave} disabled={saving} type="button">
            <Save size={13} />{saving ? 'Saving…' : 'Save Config'}
          </button>
        </div>
      </div>
      {msg && <p style={{ fontSize: '0.8rem', color: msg.startsWith('✅') ? '#22c55e' : '#ef4444', margin: 0 }}>{msg}</p>}
    </div>
  )
}

// ── Edit Contact Form ────────────────────────────────────
const EditContactForm = ({ adminId, initialEmail, initialPhone, onDone, onCancel }: {
  adminId: number
  initialEmail: string
  initialPhone: string
  onDone: () => void
  onCancel: () => void
}) => {
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState(initialPhone)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSave = async () => {
    setSaving(true); setErr('')
    try {
      await adminApi.update(adminId, { email: email.trim(), phone: phone.trim() })
      onDone()
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Failed to update contact.')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={formStyles.grid2}>
        <div style={formStyles.field}>
          <label style={formStyles.label}>Email</label>
          <input
            style={{ ...formStyles.input, margin: 0 }}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div style={formStyles.field}>
          <label style={formStyles.label}>Mobile</label>
          <input
            style={{ ...formStyles.input, margin: 0 }}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>
      {err && <p style={formStyles.err}>{err}</p>}
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={{ ...formStyles.submit, padding: '4px 12px', fontSize: '0.75rem' }}
          type="button" disabled={saving} onClick={handleSave}>
          <Save size={12} />{saving ? 'Saving…' : 'Save Contact'}
        </button>
        <button style={{ ...formStyles.cancel, padding: '4px 10px', fontSize: '0.75rem' }}
          type="button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Role Pill ──────────────────────────────────────────────
const RolePill = ({ role }: { role?: string }) => {
  const isSuperAdmin = role === 'super-admin'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700,
      background: isSuperAdmin ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
      color: isSuperAdmin ? '#a78bfa' : '#60a5fa',
      border: `1px solid ${isSuperAdmin ? 'rgba(139,92,246,0.3)' : 'rgba(59,130,246,0.3)'}`,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {isSuperAdmin ? '★ Super Admin' : 'Admin'}
    </span>
  )
}

// ── Admins Panel ───────────────────────────────────────────
const AdminsPanel = ({ schoolId, allAdmins, onRefresh }: {
  schoolId: number; allAdmins: AdminUser[]; onRefresh: () => void
}) => {
  const admins = allAdmins.filter((a) => String(a.schoolId) === String(schoolId))
  const [showCreate, setShowCreate] = useState(false)
  const [pwAdminId, setPwAdminId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [toggling, setToggling] = useState<number | null>(null)
  const [roleChanges, setRoleChanges] = useState<Record<number, string>>({})
  const [savingRole, setSavingRole] = useState<number | null>(null)
  const [editContactId, setEditContactId] = useState<number | null>(null)

  const handleCreate = async (data: Record<string, unknown>) => {
    await adminApi.create(data as Parameters<typeof adminApi.create>[0])
    setShowCreate(false)
    onRefresh()
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this admin? This cannot be undone.')) return
    setDeleting(id)
    try { await adminApi.delete(Number(id)); onRefresh() } catch { /* ignore */ }
    setDeleting(null)
  }

  const handleToggle = async (id: number) => {
    setToggling(id)
    try { await adminApi.toggleStatus(Number(id)); onRefresh() } catch { /* ignore */ }
    setToggling(null)
  }

  const handleRoleSave = async (admin: AdminUser) => {
    const newRole = roleChanges[Number(admin.id)]
    if (!newRole || newRole === admin.role) return
    setSavingRole(Number(admin.id))
    try {
      await adminApi.update(Number(admin.id), { role: newRole })
      setRoleChanges((p) => { const n = { ...p }; delete n[Number(admin.id)]; return n })
      onRefresh()
    } catch { /* ignore */ }
    setSavingRole(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ ...s.dimText, margin: 0 }}>{admins.length} user{admins.length !== 1 ? 's' : ''}</p>
        <button style={formStyles.submit} type="button" onClick={() => setShowCreate(!showCreate)}>
          <UserPlus size={13} />Add Admin
        </button>
      </div>

      {showCreate && (
        <div style={s.innerCard}>
          <AdminForm schoolId={schoolId} onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      {admins.length === 0 && !showCreate && (
        <p style={s.dimText}>No users yet for this school.</p>
      )}

      {admins.map((admin) => {
        const name = admin.profile
          ? `${admin.profile.firstName} ${admin.profile.lastName}`
          : admin.email
        const isActive = admin.accountStatus === 'active'
        const pendingRole = roleChanges[Number(admin.id)]
        const roleChanged = pendingRole !== undefined && pendingRole !== admin.role
        return (
          <div key={admin.id} style={s.adminRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <p style={{ ...s.adminName, margin: 0 }}>{name}</p>
                <RolePill role={admin.role} />
              </div>
              <p style={s.adminEmail}>{admin.email} {admin.phone ? `· ${admin.phone}` : ''}</p>

              {/* Phone verification status + toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '2px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 600,
                  background: admin.isPhoneVerified ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  color: admin.isPhoneVerified ? '#22c55e' : '#ef4444',
                  border: `1px solid ${admin.isPhoneVerified ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>
                  📱 {admin.isPhoneVerified ? 'Phone Verified' : 'Phone Unverified'}
                </span>
                <button
                  type="button"
                  style={{
                    fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(241,245,249,0.6)',
                  }}
                  onClick={async () => {
                    try {
                      await adminApi.update(Number(admin.id), { isPhoneVerified: !admin.isPhoneVerified })
                      onRefresh()
                    } catch { /* ignore */ }
                  }}
                >
                  {admin.isPhoneVerified ? 'Revoke' : 'Mark Verified'}
                </button>
              </div>
              {/* Edit contact inline form */}
              {editContactId === Number(admin.id) && (
                <EditContactForm
                  adminId={Number(admin.id)}
                  initialEmail={admin.email}
                  initialPhone={admin.phone ?? ''}
                  onDone={() => { setEditContactId(null); onRefresh() }}
                  onCancel={() => setEditContactId(null)}
                />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <select
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 6, color: '#f1f5f9', padding: '3px 8px', fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                  value={pendingRole ?? admin.role ?? 'school-admin'}
                  onChange={(e) => setRoleChanges((p) => ({ ...p, [Number(admin.id)]: e.target.value }))}
                >
                  <option value="school-admin">School Admin</option>
                  <option value="super-admin">Super Admin</option>
                </select>
                {roleChanged && (
                  <button
                    style={{ ...formStyles.submit, padding: '3px 10px', fontSize: '0.72rem' }}
                    type="button"
                    disabled={savingRole === Number(admin.id)}
                    onClick={() => handleRoleSave(admin)}
                  >
                    <Save size={11} />{savingRole === Number(admin.id) ? 'Saving…' : 'Save Role'}
                  </button>
                )}
              </div>

              {/* Password reset */}
              {pwAdminId === Number(admin.id) && (
                <div style={{ marginTop: 8 }}>
                  <PasswordForm adminId={Number(admin.id)} onDone={() => setPwAdminId(null)} />
                </div>
              )}
            </div>
            <div style={s.adminActions}>
              <StatusPill active={isActive} />
              <button
                style={s.iconBtn}
                title={isActive ? 'Suspend' : 'Activate'}
                type="button"
                disabled={toggling === Number(admin.id)}
                onClick={() => handleToggle(Number(admin.id))}
              >
                {isActive ? <ToggleRight size={16} color="#22c55e" /> : <ToggleLeft size={16} color="#ef4444" />}
              </button>
              <button style={s.iconBtn} title="Edit Email / Phone" type="button"
                onClick={() => setEditContactId(editContactId === Number(admin.id) ? null : Number(admin.id))}>
                <Edit2 size={15} />
              </button>
              <button style={s.iconBtn} title="Reset Password" type="button"
                onClick={() => setPwAdminId(pwAdminId === Number(admin.id) ? null : Number(admin.id))}>
                <Key size={15} />
              </button>
              <button style={{ ...s.iconBtn, color: '#ef4444' }} title="Delete User" type="button"
                disabled={deleting === Number(admin.id)}
                onClick={() => handleDelete(Number(admin.id))}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── School Card ────────────────────────────────────────────
const TABS = ['Info', 'Admins', 'Config'] as const
type Tab = typeof TABS[number]

const SchoolCard = ({ school, allAdmins, onEdit, onDelete, onRefreshAdmins }: {
  school: OwnerSchool
  allAdmins: AdminUser[]
  onEdit: (school: OwnerSchool) => void
  onDelete: (id: number) => Promise<void>
  onRefreshAdmins: () => void
}) => {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<Tab>('Admins')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${school.name}"? This will remove all associated data permanently!`)) return
    setDeleting(true)
    try { await onDelete(school.id) } catch { setDeleting(false) }
  }

  return (
    <div style={s.card}>
      {/* Header row */}
      <div style={s.cardHeader} onClick={() => setExpanded(!expanded)}>
        <div style={s.cardIcon}>
          <Building2 size={18} color="#f59e0b" strokeWidth={1.75} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={s.schoolName}>{school.name}</p>
            <StatusPill active={!school.isFreeTrail} label={school.isFreeTrail ? 'Free Trial' : 'Paid'} />
          </div>
          <p style={s.schoolMeta}>{school.boardType} · {school.principal} · {school.contact}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          <button style={s.iconBtn} title="Edit School" type="button" onClick={() => onEdit(school)}>
            <Edit2 size={15} />
          </button>
          <button style={{ ...s.iconBtn, color: '#ef4444' }} title="Delete School" type="button"
            disabled={deleting} onClick={handleDelete}>
            <Trash2 size={15} />
          </button>
          <span style={s.chevron}>{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
        </div>
      </div>

      {expanded && (
        <div style={s.cardBody}>
          <>
              {/* Tabs */}
              <div style={s.tabs}>
                {TABS.map((t) => (
                  <button key={t} type="button" style={{ ...s.tabBtn, ...(tab === t ? s.tabBtnActive : {}) }}
                    onClick={() => setTab(t)}>
                    {t === 'Info' && <Info size={13} />}
                    {t === 'Admins' && <Users size={13} />}
                    {t === 'Config' && <Settings size={13} />}
                    {t}
                  </button>
                ))}
              </div>

              {tab === 'Info' && (
                <div style={s.infoGrid}>
                  {[
                    ['Name', school.name],
                    ['Board', school.boardType],
                    ['Principal', school.principal],
                    ['Contact', school.contact],
                    ['Address', school.address],
                    ['Plan', school.isFreeTrail ? 'Free Trial' : 'Paid'],
                    ['Status', school.status ?? 'active'],
                    ['Created', new Date(school.createdAt).toLocaleDateString('en-IN')],
                  ].map(([k, v]) => (
                    <div key={k} style={s.infoRow}>
                      <span style={s.infoKey}>{k}</span>
                      <span style={s.infoVal}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'Admins' && (
                <AdminsPanel schoolId={school.id} allAdmins={allAdmins} onRefresh={onRefreshAdmins} />
              )}

              {tab === 'Config' && <ConfigPanel schoolId={school.id} />}
            </>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────
const OwnerSchoolsPage = () => {
  const [schools, setSchools] = useState<OwnerSchool[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [adminsLoading, setAdminsLoading] = useState(true)
  const [err, setErr] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingSchool, setEditingSchool] = useState<OwnerSchool | null>(null)

  const openCreate = () => { setEditingSchool(null); setModalMode('create') }
  const openEdit = (school: OwnerSchool) => { setEditingSchool(school); setModalMode('edit') }
  const closeModal = () => { setModalMode(null); setEditingSchool(null) }

  const loadSchools = async () => {
    setLoading(true); setErr('')
    try {
      const res = await schoolApi.list() as unknown as { data?: OwnerSchool[] } | OwnerSchool[]
      const data = Array.isArray(res) ? res : (res as { data?: OwnerSchool[] }).data ?? []
      setSchools(data.sort((a: OwnerSchool, b: OwnerSchool) => a.name.localeCompare(b.name)))
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Failed to load schools.')
    } finally { setLoading(false) }
  }

  const loadAdmins = async () => {
    setAdminsLoading(true)
    try {
      const res = await adminApi.list()
      setAdmins(Array.isArray(res) ? (res as AdminUser[]) : [])
    } catch { /* ignore */ }
    finally { setAdminsLoading(false) }
  }

  useEffect(() => { loadSchools(); loadAdmins() }, [])

  const handleCreate = async (data: Record<string, unknown>) => {
    await schoolApi.create(data as unknown as Parameters<typeof schoolApi.create>[0])
    closeModal()
    await Promise.all([loadSchools(), loadAdmins()])
  }

  const handleUpdate = async (id: number, data: Partial<OwnerSchool>) => {
    await schoolApi.update(String(id), data as unknown as Parameters<typeof schoolApi.update>[1])
    closeModal()
    await loadSchools()
  }

  const handleDelete = async (id: number) => {
    await schoolApi.delete(String(id))
    await loadSchools()
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}><Building2 size={22} color="#f59e0b" style={{ marginRight: 8 }} />Schools</h2>
          <p style={s.pageSubtitle}>{schools.length} school{schools.length !== 1 ? 's' : ''} registered</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.refreshBtn} type="button" onClick={() => { loadSchools(); loadAdmins() }}
            title="Refresh">
            <RefreshCw size={14} />Refresh
          </button>
          <button style={s.createBtn} type="button" onClick={openCreate}>
            <Plus size={16} />Add School
          </button>
        </div>
      </div>

      {/* Create / Edit modal */}
      {modalMode && (
        <Modal
          title={modalMode === 'create' ? '🏫 New School' : `✏️ Edit — ${editingSchool?.name}`}
          onClose={closeModal}
        >
          {modalMode === 'create' ? (
            <SchoolForm onSave={handleCreate} onCancel={closeModal} />
          ) : (
            <SchoolForm
              initial={editingSchool ?? undefined}
              onSave={(data) => handleUpdate(editingSchool!.id, data as Partial<OwnerSchool>)}
              onCancel={closeModal}
            />
          )}
        </Modal>
      )}

      {err && <div style={s.errBanner}>{err}</div>}

      {loading ? (
        <div style={s.loading}>Loading schools…</div>
      ) : schools.length === 0 ? (
        <div style={s.empty}>
          <Building2 size={48} color="rgba(245,158,11,0.3)" />
          <p>No schools yet. Click "Add School" to create the first one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!adminsLoading && schools.map((school: OwnerSchool) => (
            <SchoolCard
              key={school.id}
              school={school}
              allAdmins={admins}
              onEdit={openEdit}
              onDelete={handleDelete}
              onRefreshAdmins={loadAdmins}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: '0 auto', fontFamily: "'Inter', 'Segoe UI', sans-serif" },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  pageTitle: { color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center' },
  pageSubtitle: { color: 'rgba(241,245,249,0.45)', fontSize: '0.82rem', margin: '4px 0 0' },
  createBtn: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '0.55rem 1rem',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a',
    border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem',
    cursor: 'pointer',
  },
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '0.55rem 0.9rem',
    background: 'rgba(255,255,255,0.06)', color: 'rgba(241,245,249,0.7)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.82rem', cursor: 'pointer',
  },
  card: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '1rem 1.1rem', cursor: 'pointer',
    transition: 'background 0.15s',
  },
  cardIcon: {
    width: 38, height: 38, borderRadius: 10,
    background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { padding: '0 1.1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)' },
  schoolName: { color: '#f1f5f9', fontWeight: 700, fontSize: '0.97rem', margin: 0 },
  schoolMeta: { color: 'rgba(241,245,249,0.45)', fontSize: '0.78rem', margin: '2px 0 0' },
  chevron: { color: 'rgba(241,245,249,0.4)' },
  tabs: { display: 'flex', gap: 4, padding: '0.75rem 0 0.25rem' },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '0.35rem 0.8rem', borderRadius: 7, border: 'none',
    background: 'rgba(255,255,255,0.04)', color: 'rgba(241,245,249,0.55)',
    fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500,
  },
  tabBtnActive: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 600 },
  infoGrid: { display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10 },
  infoRow: { display: 'flex', gap: 12, alignItems: 'baseline' },
  infoKey: { color: 'rgba(241,245,249,0.4)', fontSize: '0.78rem', width: 80, flexShrink: 0 },
  infoVal: { color: '#f1f5f9', fontSize: '0.87rem' },
  iconBtn: {
    background: 'none', border: 'none', color: 'rgba(241,245,249,0.55)',
    cursor: 'pointer', padding: 4, borderRadius: 6, lineHeight: 1,
    display: 'flex', alignItems: 'center',
  },
  adminRow: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '0.6rem 0', borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  adminName: { color: '#f1f5f9', fontSize: '0.87rem', fontWeight: 600, margin: 0 },
  adminEmail: { color: 'rgba(241,245,249,0.45)', fontSize: '0.77rem', margin: '2px 0 0' },
  adminActions: { display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 },
  cfgGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  cfgCard: {
    background: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: '0.75rem 1rem', border: '1px solid rgba(255,255,255,0.06)',
  },
  cfgLabel: { color: 'rgba(241,245,249,0.45)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
  cfgValue: { color: '#f1f5f9', fontSize: '1.6rem', fontWeight: 700, margin: '4px 0 0' },
  warnBanner: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, padding: '0.6rem 0.9rem', color: '#fca5a5', fontSize: '0.82rem',
  },
  innerCard: {
    background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '1rem',
    border: '1px solid rgba(255,255,255,0.08)', marginBottom: 10,
  },
  sectionHeading: { color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem', margin: '0 0 0.75rem' },
  dimText: { color: 'rgba(241,245,249,0.4)', fontSize: '0.82rem' },
  loading: { textAlign: 'center', padding: '3rem', color: 'rgba(241,245,249,0.4)' },
  empty: { textAlign: 'center', padding: '3rem', color: 'rgba(241,245,249,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  errBanner: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.85rem', marginBottom: 12,
  },
}

const formStyles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: 10 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { color: 'rgba(241,245,249,0.55)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, color: '#f1f5f9', padding: '0.5rem 0.75rem',
    fontSize: '0.875rem', outline: 'none', marginBottom: 0, width: '100%', boxSizing: 'border-box',
  },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 },
  submit: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 700,
    fontSize: '0.82rem', cursor: 'pointer',
  },
  cancel: {
    padding: '0.5rem 0.9rem',
    background: 'rgba(255,255,255,0.06)', color: 'rgba(241,245,249,0.6)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
    fontSize: '0.82rem', cursor: 'pointer',
  },
  err: { color: '#ef4444', fontSize: '0.8rem', margin: 0 },
  eyeBtn: {
    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: 'rgba(241,245,249,0.4)',
    cursor: 'pointer', padding: 2, lineHeight: 1,
  },
}

export default OwnerSchoolsPage
