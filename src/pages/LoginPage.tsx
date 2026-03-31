import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store'
import { setActiveRole } from '@/store/slices/uiSlice'
import { login } from '@/store/slices/authSlice'
import { authApi } from '@/services/api'
import loginBg from '@/assets/login.jpg'

type Step = 'credentials' | 'otp' | 'verifyPhone'

// ── Icon components ───────────────────────────────────────
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const GroupIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const OtpIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

// ── Forgot Password Modal ─────────────────────────────────────
type FPStep = 'email' | 'code' | 'done'

const ForgotPasswordModal = ({ onClose }: { onClose: () => void }) => {
  const [fpStep, setFpStep] = useState<FPStep>('email')
  const [fpEmail, setFpEmail] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true); setMsg('')
    try {
      const res = await authApi.forgotPassword(fpEmail) as { maskedEmail: string; maskedPhone: string | null }
      setMaskedEmail(res.maskedEmail)
      setMaskedPhone(res.maskedPhone)
      setFpStep('code')
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Failed to send reset code.')
    } finally { setLoading(false) }
  }

  const handleReset = async (e: FormEvent) => {
    e.preventDefault()
    if (newPw !== confirmPw) { setMsg('Passwords do not match.'); return }
    setLoading(true); setMsg('')
    try {
      await authApi.resetPassword(fpEmail, code, newPw)
      setFpStep('done')
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Reset failed.')
    } finally { setLoading(false) }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>🔑 Forgot Password</h3>

        {fpStep === 'email' && (
          <form onSubmit={handleSendCode}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: '0 0 1rem', textAlign: 'center' }}>
              Enter your registered email. A reset code will be sent to your email and phone.
            </p>
            <div style={styles.inputGroup}>
              <span style={styles.inputIcon}><UserIcon /></span>
              <input data-lp style={styles.input} type="email" placeholder="Registered Email" value={fpEmail}
                onChange={(e) => setFpEmail(e.target.value)} required />
            </div>
            {msg && <p style={styles.errorMsg}>{msg}</p>}
            <button style={styles.loginBtn} type="submit" disabled={loading}>
              {loading ? 'SENDING...' : 'SEND RESET CODE'}
            </button>
          </form>
        )}

        {fpStep === 'code' && (
          <form onSubmit={handleReset}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: '0 0 1rem', textAlign: 'center' }}>
              Reset code sent to <strong>{maskedEmail}</strong>{maskedPhone ? ` and ${maskedPhone}` : ''}. Enter it below.
            </p>
            <div style={styles.inputGroup}>
              <span style={styles.inputIcon}><LockIcon /></span>
              <input data-lp style={{ ...styles.input, letterSpacing: '0.5rem', textAlign: 'center' }}
                type="text" inputMode="numeric" placeholder="6-digit code" maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required />
            </div>
            <div style={styles.inputGroup}>
              <span style={styles.inputIcon}><LockIcon /></span>
              <input data-lp style={styles.input} type="password" placeholder="New Password (min 8 chars)"
                autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} />
            </div>
            <div style={styles.inputGroup}>
              <span style={styles.inputIcon}><LockIcon /></span>
              <input data-lp style={styles.input} type="password" placeholder="Confirm New Password"
                autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={8} />
            </div>
            {msg && <p style={styles.errorMsg}>{msg}</p>}
            <button style={styles.loginBtn} type="submit" disabled={loading}>
              {loading ? 'RESETTING...' : 'RESET PASSWORD'}
            </button>
            <button type="button" style={{ ...styles.forgotLink, display: 'block', margin: '0.5rem auto 0', textAlign: 'center' }}
              onClick={() => setFpStep('email')}>← Try another email</button>
          </form>
        )}

        {fpStep === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</p>
            <p style={{ color: '#86efac', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Password reset successfully! You can now log in with your new password.
            </p>
            <button style={styles.loginBtn} type="button" onClick={onClose}>Back to Login</button>
          </div>
        )}

        {fpStep !== 'done' && (
          <button style={styles.cancelBtn} type="button" onClick={onClose}>Cancel</button>
        )}
      </div>
    </div>
  )
}

// ── Register modal ────────────────────────────────────────
type RegStep = 'form' | 'verifyPhone' | 'done'
const RegisterModal = ({ onClose }: { onClose: () => void }) => {
  const [regStep, setRegStep] = useState<RegStep>('form')
  const [regData, setRegData] = useState({ schoolName: '', address: '', phone: '', email: '', password: '', isFreeTrail: true })
  const [pendingEmail, setPendingEmail] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const startCooldown = () => {
    setResendCooldown(30)
    const iv = setInterval(() => {
      setResendCooldown((p) => { if (p <= 1) { clearInterval(iv); return 0 } return p - 1 })
    }, 1000)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true); setMsg('')
    try {
      const res = await authApi.register(
        regData.email, regData.password, regData.schoolName,
        regData.phone, regData.address, regData.isFreeTrail
      ) as { email: string; maskedPhone: string }
      setPendingEmail(res.email)
      setMaskedPhone(res.maskedPhone)
      setRegStep('verifyPhone')
      startCooldown()
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Registration failed.')
    } finally { setLoading(false) }
  }

  const handleVerifyPhone = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true); setMsg('')
    try {
      await authApi.verifyPhone(pendingEmail, phoneOtp)
      setRegStep('done')
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Verification failed.')
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    try {
      await authApi.resendVerification(pendingEmail, 'phone')
      startCooldown()
      setMsg('✓ New SMS OTP sent.')
    } catch { setMsg('Failed to resend. Try again.') }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>

        {/* ── Step 1: Registration Form ── */}
        {regStep === 'form' && (
          <>
            <h3 style={styles.modalTitle}>🏫 Register New School</h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.inputGroup}>
                <span style={styles.inputIcon}><UserIcon /></span>
                <input data-lp style={styles.input} type="text" placeholder="School Name"
                  value={regData.schoolName} onChange={(e) => setRegData((p) => ({ ...p, schoolName: e.target.value }))} required minLength={2} />
              </div>
              <div style={styles.inputGroup}>
                <span style={styles.inputIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                <input data-lp style={styles.input} type="text" placeholder="School Address"
                  value={regData.address} onChange={(e) => setRegData((p) => ({ ...p, address: e.target.value }))} required minLength={4} />
              </div>
              <div style={styles.inputGroup}>
                <span style={styles.inputIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.63 1.4h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.04a16 16 0 0 0 6 6l1-1a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </span>
                <input data-lp style={styles.input} type="tel" placeholder="Mobile Number (required)"
                  value={regData.phone} onChange={(e) => setRegData((p) => ({ ...p, phone: e.target.value }))} required minLength={10} />
              </div>
              <div style={styles.inputGroup}>
                <span style={styles.inputIcon}><UserIcon /></span>
                <input data-lp style={styles.input} type="email" placeholder="Admin Email"
                  value={regData.email} onChange={(e) => setRegData((p) => ({ ...p, email: e.target.value }))} required />
              </div>
              <div style={styles.inputGroup}>
                <span style={styles.inputIcon}><LockIcon /></span>
                <input data-lp style={styles.input} type="password" placeholder="Password (min 8 chars)"
                  autoComplete="new-password" value={regData.password} onChange={(e) => setRegData((p) => ({ ...p, password: e.target.value }))} required minLength={8} />
              </div>
              {/* Free Trial toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0.65rem 0.75rem', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <input type="checkbox" id="freeTrail" checked={regData.isFreeTrail}
                  onChange={(e) => setRegData((p) => ({ ...p, isFreeTrail: e.target.checked }))}
                  style={{ accentColor: '#4a90d9', width: '16px', height: '16px' }} />
                <label htmlFor="freeTrail" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', cursor: 'pointer' }}>
                  🆓 Free Trial Plan
                </label>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: regData.isFreeTrail ? '#86efac' : '#fdba74', fontWeight: 600 }}>
                  {regData.isFreeTrail ? 'FREE TRIAL' : 'PAID PLAN'}
                </span>
              </div>
              {msg && <p style={styles.errorMsg}>{msg}</p>}
              <button style={styles.loginBtn} type="submit" disabled={loading}>
                {loading ? 'REGISTERING...' : 'CREATE ACCOUNT'}
              </button>
            </form>
          </>
        )}

        {/* ── Step 2: Verify Phone ── */}
        {regStep === 'verifyPhone' && (
          <>
            <h3 style={styles.modalTitle}>📱 Verify Your Mobile</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: '0 0 1.25rem', textAlign: 'center' }}>
              An OTP was sent to <strong>{maskedPhone}</strong>. Enter it below.
            </p>
            <form onSubmit={handleVerifyPhone}>
              <div style={styles.inputGroup}>
                <span style={styles.inputIcon}><LockIcon /></span>
                <input data-lp style={{ ...styles.input, letterSpacing: '0.5rem', textAlign: 'center' }}
                  type="text" inputMode="numeric" placeholder="_ _ _ _ _ _" maxLength={6}
                  value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))} required autoFocus />
              </div>
              {msg && <p style={{ ...styles.errorMsg, color: msg.startsWith('✓') ? '#86efac' : '#fca5a5' }}>{msg}</p>}
              <button style={styles.loginBtn} type="submit" disabled={loading}>
                {loading ? 'VERIFYING...' : 'VERIFY MOBILE'}
              </button>
            </form>
            <button type="button" style={{ ...styles.forgotLink, display: 'block', margin: '0.5rem auto 0', textAlign: 'center', opacity: resendCooldown > 0 ? 0.5 : 1 }}
              onClick={() => handleResend()} disabled={resendCooldown > 0}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </>
        )}

        {/* ── Step 4: Done ── */}
        {regStep === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</p>
            <p style={{ color: '#86efac', fontWeight: 600, marginBottom: '0.5rem' }}>Verification Complete!</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Your school has been registered. You can now log in.
            </p>
            <button style={styles.loginBtn} type="button" onClick={onClose}>Go to Login</button>
          </div>
        )}

        {regStep !== 'done' && (
          <button style={styles.cancelBtn} type="button" onClick={onClose}>✕ Cancel</button>
        )}
      </div>
    </div>
  )
}

// ── Main Login Page ───────────────────────────────────────
const LoginPage = () => {
  const navigate = useNavigate()
  const activeRole = useAppSelector((s) => s.ui.activeRole)
  const dispatch = useAppDispatch()

  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpInfo, setOtpInfo] = useState({ maskedEmail: '', maskedPhone: null as string | null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
// const [showRegister, setShowRegister] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null)
  const [lockCountdown, setLockCountdown] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [sessionConflict, setSessionConflict] = useState<{
    pendingEmail: string
    pendingPassword: string
    maskedEmail: string
    maskedPhone: string | null
  } | null>(null)

  // ── Account verification ──────────────────────────────────
  const [verifyPhoneOtp, setVerifyPhoneOtp]     = useState(['', '', '', '', '', ''])
  const [verifyMaskedPhone, setVerifyMaskedPhone] = useState('')
  const [verifyCooldown, setVerifyCooldown]     = useState(0)
  const otpBoxRefs = useRef<(HTMLInputElement | null)[]>([])

  const startCooldown = () => {
    setResendCooldown(60)
    const iv = setInterval(() => {
      setResendCooldown((p) => { if (p <= 1) { clearInterval(iv); return 0 } return p - 1 })
    }, 1000)
  }

  // Live countdown for account lockout
  useEffect(() => {
    if (!lockedUntil) { setLockCountdown(''); return }
    const tick = () => {
      const diff = lockedUntil.getTime() - Date.now()
      if (diff <= 0) { setLockedUntil(null); setLockCountdown(''); return }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setLockCountdown(`${mins}m ${secs.toString().padStart(2, '0')}s`)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [lockedUntil])

  const startVerifyCooldown = () => {
    setVerifyCooldown(60)
    const iv = setInterval(() => {
      setVerifyCooldown((p) => { if (p <= 1) { clearInterval(iv); return 0 } return p - 1 })
    }, 1000)
  }

  const handleOtpBoxChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...verifyPhoneOtp]
    next[index] = value.slice(-1)
    setVerifyPhoneOtp(next)
    if (value && index < 5) otpBoxRefs.current[index + 1]?.focus()
  }

  const handleOtpBoxKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verifyPhoneOtp[index] && index > 0) {
      otpBoxRefs.current[index - 1]?.focus()
    }
  }

  // Core login call — used by handleLogin, handleVerifyEmail, handleVerifyPhone
  const doLogin = async () => {
    const res = await authApi.login(email, password, activeRole) as unknown as Record<string, unknown>
    if ('token' in res && res.token && res.user) {
      // Direct login — MFA disabled, token issued immediately
      const userRole = (res.user as any).role
      dispatch(login({ user: res.user as any, token: res.token as string, role: userRole, schoolId: String((res.user as any).schoolId || '') }))
      navigate(userRole === 'owner' ? '/owner/schools' : '/portal/dashboard', { replace: true })
    } else if (res.sessionConflict) {
      setSessionConflict({
        pendingEmail: email,
        pendingPassword: password,
        maskedEmail: res.maskedEmail as string,
        maskedPhone: (res.maskedPhone as string | null) ?? null,
      })
    } else if (res.otpSent) {
      setOtpInfo({ maskedEmail: res.maskedEmail as string, maskedPhone: (res.maskedPhone as string | null) ?? null })
      setStep('otp')
      startCooldown()
    }
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await doLogin()
    } catch (err: unknown) {
      const raw = err as Record<string, unknown>
      if (raw?.needsPhoneVerification) {
        setVerifyMaskedPhone((raw.maskedPhone as string) || '')
        setStep('verifyPhone')
        startVerifyCooldown()
      } else {
        setError(err instanceof Error ? err.message : 'Invalid credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyPhone = async (e: FormEvent) => {
    e.preventDefault()
    const otpValue = verifyPhoneOtp.join('')
    if (otpValue.length !== 6) { setError('Enter all 6 digits.'); return }
    setLoading(true)
    setError('')
    try {
      await authApi.verifyPhone(email, otpValue)
      setVerifyPhoneOtp(['', '', '', '', '', ''])
      await doLogin()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async (type: 'email' | 'phone') => {
    if (verifyCooldown > 0) return
    try {
      await authApi.resendVerification(email, type)
      startVerifyCooldown()
      setError('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend.')
    }
  }

  const handleForceLogin = async () => {
    if (!sessionConflict) return
    setLoading(true)
    setError('')
    try {
      const res = await authApi.forceLogin(sessionConflict.pendingEmail, sessionConflict.pendingPassword) as unknown as Record<string, unknown>
      setSessionConflict(null)
      if ('token' in res && res.token && res.user) {
        // Direct login — MFA disabled
        const forceRole = (res.user as any).role
        dispatch(login({ user: res.user as any, token: res.token as string, role: forceRole, schoolId: String((res.user as any).schoolId || '') }))
        navigate(forceRole === 'owner' ? '/owner/schools' : '/portal/dashboard', { replace: true })
      } else if (res.otpSent) {
        setOtpInfo({ maskedEmail: res.maskedEmail as string, maskedPhone: res.maskedPhone as string | null })
        setStep('otp')
        startCooldown()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed.')
      setSessionConflict(null)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await authApi.verifyOtp(email, otp)
      const otpRole = res.user.role
      dispatch(login({ user: res.user, token: res.token, role: otpRole, schoolId: String(res.user.schoolId || '') }))
      navigate(otpRole === 'owner' ? '/owner/schools' : '/portal/dashboard', { replace: true })
    } catch (err: unknown) {
      const raw = err as Record<string, unknown>
      if (raw?.accountLocked) {
        setLockedUntil(raw.lockedUntil ? new Date(raw.lockedUntil as string) : new Date(Date.now() + 60 * 60 * 1000))
        setError('')
        setAttemptsLeft(null)
      } else {
        if (typeof raw?.attemptsLeft === 'number') setAttemptsLeft(raw.attemptsLeft)
        setError(err instanceof Error ? err.message : 'Invalid or expired OTP.')
      }
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || lockedUntil) return
    try {
      await authApi.resendOtp(email)
      startCooldown()
      setError('')
      setAttemptsLeft(null)
    } catch (err: unknown) {
      const raw = err as Record<string, unknown>
      if (raw?.accountLocked) {
        setLockedUntil(raw.lockedUntil ? new Date(raw.lockedUntil as string) : new Date(Date.now() + 60 * 60 * 1000))
        setError('')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to resend OTP.')
      }
    }
  }

  return (
    <div className="login-page" style={styles.page}>
      {/* Background image */}
      <div style={{ ...styles.bg, backgroundImage: `url(${loginBg})` }} />
      {/* Dark overlay for contrast */}
      <div style={styles.overlay} />

      {/* Content wrapper */}
      <div style={styles.wrapper}>
        {/* Left — branding */}
        <div style={styles.leftPane} className="lp-left">
          <div style={styles.brandBlock}>
            <span style={styles.brandIcon}>🎓</span>
            <h1 style={styles.brandName}>Vidya Hub</h1>
            <p style={styles.brandTagline}>The Complete School Management Platform</p>
          </div>
          <div style={styles.divider} />
          
        </div>

        {/* Right — form panel */}
        <div style={styles.rightPane}>
          <div style={styles.formCard}>
            {/* Top icon */}
            <div style={styles.iconCircle}>
              {step === 'credentials' ? <GroupIcon /> : <OtpIcon />}
            </div>

            {step === 'credentials' ? (
              <>
                {/* Portal navigation tabs */}
                <div style={styles.roleTabs}>
                  <button
                    type="button"
                    style={styles.studentTab}
                    onClick={() => navigate('/student-login')}
                  >
                    🎓 Student Portal
                  </button>
                  <button
                    type="button"
                    style={styles.teacherTab}
                    onClick={() => navigate('/teacher-login')}
                  >
                    � Employee Portal
                  </button>
                </div>

                <form onSubmit={handleLogin} style={{ width: '100%' }}>
                  {/* Email */}
                  <div style={styles.inputGroup}>
                    <span style={styles.inputIcon}><UserIcon /></span>
                    <input
                      data-lp
                      style={styles.input}
                      type="email"
                      placeholder="Username / Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  {/* Password */}
                  <div style={styles.inputGroup}>
                    <span style={styles.inputIcon}><LockIcon /></span>
                    <input
                      data-lp
                      style={styles.input}
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  {error && <p style={styles.errorMsg}>{error}</p>}

                  {/* Remember me + forgot password */}
                  <div style={styles.rowBetween}>
                    <label style={styles.rememberLabel}>
                      <input type="checkbox" style={{ marginRight: '0.4rem', accentColor: '#4a90d9' }} />
                      Remember me
                    </label>
                    <button type="button" style={styles.forgotLink} onClick={() => setShowForgotPassword(true)}>
                      Forgot Password?
                    </button>
                  </div>

                  <button style={styles.loginBtn} type="submit" disabled={loading}>
                    {loading ? 'SIGNING IN...' : 'LOGIN'}
                  </button>
                   {/* Register school link */}
                  {/* <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>New school? </span>
                    <button type="button" style={{ ...styles.forgotLink, textDecoration: 'underline' }} onClick={() => setShowRegister(true)}>
                      Register here
                    </button>
                  </div> */}
                </form>

                <Link to="/" style={styles.backLink}>← Back to Home</Link>
              </>
            ) : step === 'verifyPhone' ? (
              /* ── Phone OTP Verification step ── */
              <>
                <p style={styles.otpHint}>
                  📱 Enter the 6-digit OTP sent to <strong>{verifyMaskedPhone || 'your mobile'}</strong>
                </p>
                <form onSubmit={handleVerifyPhone} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    {verifyPhoneOtp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpBoxRefs.current[i] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpBoxChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpBoxKeyDown(i, e)}
                        autoFocus={i === 0}
                        style={{
                          width: '44px',
                          height: '54px',
                          textAlign: 'center',
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          border: `2px solid ${digit ? 'rgba(74,144,217,0.8)' : 'rgba(255,255,255,0.25)'}`,
                          borderRadius: '10px',
                          background: 'rgba(255,255,255,0.1)',
                          color: '#ffffff',
                          outline: 'none',
                          caretColor: '#4a90d9',
                          transition: 'border-color 0.15s',
                        }}
                      />
                    ))}
                  </div>
                  {error && <p style={styles.errorMsg}>{error}</p>}
                  <button style={styles.loginBtn} type="submit" disabled={loading}>
                    {loading ? 'VERIFYING...' : 'VERIFY MOBILE'}
                  </button>
                </form>
                <div style={styles.rowBetween}>
                  <button type="button" style={styles.forgotLink}
                    onClick={() => { setStep('credentials'); setVerifyPhoneOtp(['', '', '', '', '', '']); setError('') }}>
                    ← Back
                  </button>
                  <button type="button"
                    style={{ ...styles.forgotLink, opacity: verifyCooldown > 0 ? 0.4 : 1 }}
                    onClick={() => handleResendVerification('phone')} disabled={verifyCooldown > 0}>
                    {verifyCooldown > 0 ? `Resend in ${verifyCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </>
            ) : (
              /* ── OTP (2FA login) step ── */
              <>
                <p style={styles.otpHint}>
                  OTP sent to <strong>{otpInfo.maskedPhone || 'your registered phone'}</strong>
                </p>

                {/* Account locked banner */}
                {lockedUntil && (
                  <div style={{
                    background: 'rgba(220,38,38,0.18)',
                    border: '1px solid rgba(248,113,113,0.5)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    textAlign: 'center',
                  }}>
                    <p style={{ color: '#fca5a5', fontWeight: 700, margin: '0 0 0.25rem', fontSize: '0.9rem' }}>🔒 Account Temporarily Locked</p>
                    <p style={{ color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: '0.82rem' }}>
                      Too many failed attempts. Try again in{' '}
                      <strong style={{ color: '#f87171' }}>{lockCountdown}</strong>
                    </p>
                  </div>
                )}

                {/* Attempts remaining warning */}
                {!lockedUntil && attemptsLeft !== null && attemptsLeft <= 2 && (
                  <div style={{
                    background: 'rgba(245,158,11,0.15)',
                    border: '1px solid rgba(251,191,36,0.4)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    marginBottom: '0.75rem',
                    textAlign: 'center',
                  }}>
                    <p style={{ color: '#fbbf24', margin: 0, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                      <ShieldAlert size={14} /> <strong>{attemptsLeft}</strong> attempt{attemptsLeft === 1 ? '' : 's'} remaining before 1-hour lockout
                    </p>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} style={{ width: '100%' }}>
                  <div style={styles.inputGroup}>
                    <span style={styles.inputIcon}><LockIcon /></span>
                    <input
                      data-lp
                      style={{ ...styles.input, letterSpacing: '0.6rem', fontSize: '1.2rem', textAlign: 'center' }}
                      type="text"
                      inputMode="numeric"
                      placeholder="_ _ _ _ _ _"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); if (error) setError('') }}
                      required
                      autoFocus
                      disabled={!!lockedUntil}
                    />
                  </div>

                  {error && <p style={styles.errorMsg}>{error}</p>}

                  <button style={{ ...styles.loginBtn, opacity: lockedUntil ? 0.5 : 1 }} type="submit" disabled={loading || !!lockedUntil}>
                    {loading ? 'VERIFYING...' : 'VERIFY OTP'}
                  </button>
                </form>

                <div style={styles.rowBetween}>
                  <button type="button" style={styles.forgotLink} onClick={() => { setStep('credentials'); setOtp(''); setError(''); setLockedUntil(null); setAttemptsLeft(null) }}>
                    ← Back
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.forgotLink, opacity: (resendCooldown > 0 || !!lockedUntil) ? 0.4 : 1 }}
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || !!lockedUntil}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Register modal */}
      {/* {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />} */}
      {/* Forgot Password modal */}
      {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}

      {/* Session Conflict modal */}
      {sessionConflict && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalBox, maxWidth: '360px', textAlign: 'center' }}>
            <ShieldAlert size={32} color="#fbbf24" style={{ marginBottom: '0.5rem' }} />
            <h3 style={{ color: '#fbbf24', margin: '0 0 0.75rem', fontSize: '1.1rem' }}>Already Logged In</h3>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              You are already logged in on another device (<strong>{sessionConflict.maskedEmail}</strong>).
              Continuing will log you out there.
            </p>
            <button style={{ ...styles.loginBtn, marginBottom: '0.5rem' }} type="button" onClick={handleForceLogin} disabled={loading}>
              {loading ? 'CONNECTING...' : 'YES, CONTINUE HERE'}
            </button>
            <button style={styles.cancelBtn} type="button" onClick={() => setSessionConflict(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  bg: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(10, 30, 70, 0.45)',
  },
  wrapper: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Left pane — branding
  leftPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    height: '100%',
  },
  brandBlock: {
    textAlign: 'center',
  },
  brandIcon: {
    fontSize: '4rem',
    display: 'block',
    marginBottom: '0.75rem',
    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
  },
  brandName: {
    fontSize: '2.8rem',
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 0.5rem 0',
    textShadow: '0 2px 12px rgba(0,0,0,0.5)',
    letterSpacing: '0.02em',
  },
  brandTagline: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.75)',
    margin: 0,
    maxWidth: '280px',
    lineHeight: 1.5,
  },
  divider: {
    width: '60px',
    height: '2px',
    background: 'rgba(255,255,255,0.3)',
    margin: '2rem auto',
    borderRadius: '2px',
  },
  portalLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  portalLink: {
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    transition: 'background 0.2s',
    textAlign: 'center',
  },
  // Right pane — form
  rightPane: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    height: '100%',
  },
  formCard: {
    width: '100%',
    maxWidth: '380px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0',
  },
  iconCircle: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.75rem',
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(8px)',
  },
  roleTabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    width: '100%',
  },
  roleTab: {
    flex: 1,
    padding: '0.55rem 0.5rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  roleTabActive: {
    background: 'rgba(74,144,217,0.6)',
    border: '1px solid rgba(74,144,217,0.8)',
    color: '#ffffff',
  },
  studentTab: {
    flex: 1,
    padding: '0.55rem 0.5rem',
    borderRadius: '8px',
    border: '1px solid rgba(34,197,94,0.6)',
    background: 'rgba(34,197,94,0.2)',
    color: '#86efac',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  teacherTab: {
    flex: 1,
    padding: '0.55rem 0.5rem',
    borderRadius: '8px',
    border: '1px solid rgba(251,146,60,0.6)',
    background: 'rgba(251,146,60,0.2)',
    color: '#fdba74',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '8px',
    marginBottom: '1rem',
    width: '100%',
    overflow: 'hidden',
  },
  inputIcon: {
    padding: '0 0.75rem',
    color: 'rgba(255,255,255,0.75)',
    display: 'flex',
    alignItems: 'center',
    borderRight: '1px solid rgba(255,255,255,0.2)',
    minWidth: '44px',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: '0.85rem 1rem',
    color: '#ffffff',
    fontSize: '0.95rem',
  },
  rowBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: '1.25rem',
  },
  rememberLabel: {
    display: 'flex',
    alignItems: 'center',
    color: 'rgba(255,255,255,0.75)',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  loginBtn: {
    width: '100%',
    padding: '0.9rem',
    background: 'rgba(74,144,217,0.7)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(74,144,217,0.9)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginBottom: '0.75rem',
  },
  errorMsg: {
    color: '#fca5a5',
    fontSize: '0.85rem',
    margin: '-0.25rem 0 0.75rem 0',
    textAlign: 'center',
    width: '100%',
  },
  backLink: {
    marginTop: '0.5rem',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.85rem',
    textDecoration: 'none',
  },
  otpHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.9rem',
    textAlign: 'center',
    marginBottom: '1.25rem',
    lineHeight: 1.5,
  },
  // Register modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  modalBox: {
    background: 'rgba(15,35,80,0.95)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '16px',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
  },
  modalTitle: {
    color: '#ffffff',
    margin: '0 0 1.5rem 0',
    fontSize: '1.2rem',
    textAlign: 'center',
  },
  cancelBtn: {
    width: '100%',
    padding: '0.65rem',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginTop: '0.25rem',
  },
}

// Inject placeholder colour + responsive styles once at module load
if (typeof document !== 'undefined' && !document.getElementById('login-page-style')) {
  const s = document.createElement('style')
  s.id = 'login-page-style'
  s.textContent = `
    input[data-lp]::placeholder { color: rgba(255,255,255,0.55) !important; }
    input[data-lp]:focus { outline: none; }
    @media (max-width: 640px) {
      .lp-left { display: none !important; }
      .lp-divider { display: none !important; }
    }
  `
  document.head.appendChild(s)
}

export default LoginPage
