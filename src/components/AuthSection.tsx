import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store'
import { setActiveRole } from '@/store/slices/uiSlice'
import { login } from '@/store/slices/authSlice'
import { authApi } from '@/services/api'

type LoginStep = 'credentials' | 'otp'

const AuthSection = () => {
  const navigate = useNavigate()
  const activeRole = useAppSelector((state) => state.ui.activeRole)
  const dispatch = useAppDispatch()

  // Step 1 — credentials
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Step 2 — OTP
  const [step, setStep] = useState<LoginStep>('credentials')
  const [otp, setOtp] = useState('')
  const [otpInfo, setOtpInfo] = useState<{ maskedEmail: string; maskedPhone: string | null }>({
    maskedEmail: '',
    maskedPhone: null,
  })
  const [pendingEmail, setPendingEmail] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Registration state
  const [showRegister, setShowRegister] = useState(false)
  const [regData, setRegData] = useState({ schoolName: '', email: '', password: '' })
  const [regLoading, setRegLoading] = useState(false)
  const [regMessage, setRegMessage] = useState('')

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Step 1: submit credentials → receive OTP
  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage('')
    try {
      const response = await authApi.login(formData.email, formData.password, activeRole)
      if (response.otpSent) {
        setPendingEmail(formData.email)
        setOtpInfo({ maskedEmail: response.maskedEmail, maskedPhone: response.maskedPhone })
        setStep('otp')
        startResendCooldown()
        setMessage('')
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Login failed. Please check your credentials.'
      setMessage(`✗ ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }

  const startResendCooldown = () => {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  // Step 2: submit OTP → get token
  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault()
    if (otp.length !== 6) { setMessage('✗ Enter the 6-digit OTP.'); return }
    setOtpLoading(true)
    setMessage('')
    try {
      const response = await authApi.verifyOtp(pendingEmail, otp)
      dispatch(
        login({
          user: response.user,
          token: response.token,
          role: response.user.role,
          schoolId: String(response.user.schoolId || ''),
        }),
      )
      setMessage('✓ Login successful! Redirecting...')
      setTimeout(() => navigate('/portal/dashboard'), 500)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Invalid or expired OTP.'
      setMessage(`✗ ${msg}`)
      setOtpLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setMessage('')
    try {
      await authApi.resendOtp(pendingEmail)
      setMessage('✓ New OTP sent.')
      startResendCooldown()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to resend OTP.'
      setMessage(`✗ ${msg}`)
    }
  }

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault()
    setRegLoading(true)
    setRegMessage('')
    try {
      await authApi.register(regData.email, regData.password, regData.schoolName)
      setRegMessage('✓ Registration successful! You can now sign in.')
      setRegData({ schoolName: '', email: '', password: '' })
      setTimeout(() => { setShowRegister(false); setRegMessage('') }, 2000)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Registration failed. Please try again.'
      setRegMessage(`✗ ${msg}`)
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <section id="auth" className="section alt">
      <div className="container">
        <h2>Login</h2>
        <div className="auth-grid">
          {/* ── Login card ── */}
          <div className="card">
            {step === 'credentials' ? (
              <form onSubmit={handleLogin}>
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    placeholder="admin@vidyahub.edu"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </label>
                <label>
                  Role
                  <select
                    name="role"
                    value={activeRole}
                    onChange={(e) => dispatch(setActiveRole(e.target.value))}
                    required
                  >
                    <option value="school-admin">School Admin</option>
                    <option value="super-admin">Super Admin</option>
                  </select>
                </label>
                <button className="btn primary" type="submit" disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Sign In'}
                </button>
                {message && (
                  <p className="helper" style={{ color: message.startsWith('✓') ? '#10b981' : '#ef4444' }}>
                    {message}
                  </p>
                )}
                <p className="helper">Test: admin@vidyahub.edu / password123</p>
              </form>
            ) : (
              /* ── OTP step ── */
              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</p>
                  <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Enter your OTP</p>
                  <p className="helper" style={{ margin: 0 }}>
                    Sent to {otpInfo.maskedEmail}
                    {otpInfo.maskedPhone && ` & ${otpInfo.maskedPhone}`}
                  </p>
                </div>
                <label>
                  6-digit OTP
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="______"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    style={{ letterSpacing: '0.5rem', fontSize: '1.25rem', textAlign: 'center' }}
                    required
                    autoFocus
                  />
                </label>
                <button className="btn primary" type="submit" disabled={otpLoading}>
                  {otpLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
                {message && (
                  <p className="helper" style={{ color: message.startsWith('✓') ? '#10b981' : '#ef4444', textAlign: 'center' }}>
                    {message}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="register-cancel"
                    onClick={() => { setStep('credentials'); setOtp(''); setMessage('') }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="register-cancel"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    style={{ opacity: resendCooldown > 0 ? 0.5 : 1 }}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ── Register card ── */}
          <div className="card register-card">
            <h3>🏫 New School Registration</h3>
            {!showRegister ? (
              <>
                <p>Is your school new to Vidya Hub? Register your institution and start managing it in minutes!</p>
                <ul>
                  <li>Fill registration form</li>
                  <li>Admin account created</li>
                  <li>Start managing your school</li>
                </ul>
                <button className="btn outline" type="button" onClick={() => setShowRegister(true)}>
                  Register School
                </button>
              </>
            ) : (
              <form className="register-form" onSubmit={handleRegister}>
                <label>
                  School Name
                  <input
                    type="text"
                    placeholder="e.g. Sunrise International School"
                    value={regData.schoolName}
                    onChange={(e) => setRegData((p) => ({ ...p, schoolName: e.target.value }))}
                    required
                    minLength={2}
                  />
                </label>
                <label>
                  Admin Email
                  <input
                    type="email"
                    placeholder="admin@yourschool.edu"
                    value={regData.email}
                    onChange={(e) => setRegData((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    placeholder="Min 8 characters"
                    value={regData.password}
                    onChange={(e) => setRegData((p) => ({ ...p, password: e.target.value }))}
                    required
                    minLength={8}
                  />
                </label>
                {regMessage && (
                  <p className="helper" style={{ color: regMessage.startsWith('✓') ? '#10b981' : '#ef4444', textAlign: 'center' }}>
                    {regMessage}
                  </p>
                )}
                <button className="btn primary" type="submit" disabled={regLoading}>
                  {regLoading ? 'Registering...' : 'Create Account'}
                </button>
                <button
                  className="register-cancel"
                  type="button"
                  onClick={() => { setShowRegister(false); setRegMessage('') }}
                >
                  ← Back
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default AuthSection
