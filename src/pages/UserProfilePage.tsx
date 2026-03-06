import { useState, useEffect, type FormEvent } from 'react'
import { useAppSelector, useAppDispatch } from '@/store'
import { setUser } from '@/store/slices/authSlice'
import { authApi } from '@/services/api'
import { useToast } from '@/components/ToastContainer'

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

const UserProfilePage = () => {
  const user = useAppSelector((state) => state.auth.user)
  const role = useAppSelector((state) => state.auth.role)
  const dispatch = useAppDispatch()
  const toast = useToast()

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' })
  const [saving, setSaving] = useState(false)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    // Hydrate form from stored user
    setForm({
      firstName: user?.firstName ?? '',
      lastName:  user?.lastName  ?? '',
      phone:     user?.phone     ?? '',
    })
  }, [user])

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await authApi.updateProfile(form)
      dispatch(setUser({ ...user!, ...updated.user }))
      toast.success('Profile updated successfully.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    setPwSaving(true)
    try {
      await authApi.changePassword(pwForm.currentPassword, pwForm.newPassword)
      toast.success('Password changed successfully.')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password.')
    } finally {
      setPwSaving(false)
    }
  }

  // Parse allowed modules
  const allowedModules: string[] | null = (() => {
    if (!user?.modulePermissions) return null
    try { return JSON.parse(user.modulePermissions) as string[] } catch { return null }
  })()

  return (
    <div className="page-container">
      <h1 className="page-title">My Profile</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>

        {/* ── Profile info card ── */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>👤 Account Information</h2>

          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '0.5rem' }}>
            <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', opacity: 0.6 }}>Email</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{user?.email}</p>
          </div>

          <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '0.5rem' }}>
            <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', opacity: 0.6 }}>Role</p>
            <p style={{ margin: 0, fontWeight: 600, textTransform: 'capitalize' }}>
              {role === 'super-admin' ? '🔑 Super Admin' : '🏫 School Admin'}
            </p>
          </div>

          <form onSubmit={handleSaveProfile}>
            <label style={{ display: 'block', marginBottom: '0.75rem' }}>
              <span style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>First Name</span>
              <input
                type="text"
                className="form-input"
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                placeholder="First name"
              />
            </label>
            <label style={{ display: 'block', marginBottom: '0.75rem' }}>
              <span style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>Last Name</span>
              <input
                type="text"
                className="form-input"
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                placeholder="Last name"
              />
            </label>
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>
                Phone <span style={{ opacity: 0.5 }}>(for OTP)</span>
              </span>
              <input
                type="tel"
                className="form-input"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+91XXXXXXXXXX"
              />
            </label>
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* ── Change password card ── */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>🔒 Change Password</h2>
          <form onSubmit={handleChangePassword}>
            <label style={{ display: 'block', marginBottom: '0.75rem' }}>
              <span style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>Current Password</span>
              <input
                type="password"
                className="form-input"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                required
                placeholder="••••••••"
              />
            </label>
            <label style={{ display: 'block', marginBottom: '0.75rem' }}>
              <span style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>New Password</span>
              <input
                type="password"
                className="form-input"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                required
                minLength={8}
                placeholder="Min 8 characters"
              />
            </label>
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>Confirm New Password</span>
              <input
                type="password"
                className="form-input"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                required
                placeholder="Repeat new password"
              />
            </label>
            <button className="btn primary" type="submit" disabled={pwSaving}>
              {pwSaving ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* ── Module permissions card (school-admin only) ── */}
        {role === 'school-admin' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>🧩 Module Access</h2>
            <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1rem' }}>
              {allowedModules === null
                ? 'You have access to all modules.'
                : 'Your access is limited to the modules below.'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {ALL_MODULES.map((mod) => {
                const hasAccess = allowedModules === null || allowedModules.includes(mod.key)
                return (
                  <span
                    key={mod.key}
                    style={{
                      padding: '0.3rem 0.75rem',
                      borderRadius: '999px',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      background: hasAccess ? 'var(--primary-light, #dcfce7)' : 'var(--surface)',
                      color: hasAccess ? 'var(--primary-dark, #166534)' : 'var(--text-muted)',
                      border: `1px solid ${hasAccess ? 'var(--primary, #22c55e)' : 'var(--border)'}`,
                    }}
                  >
                    {hasAccess ? '✓' : '✗'} {mod.label}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserProfilePage
