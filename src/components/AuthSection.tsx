import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store'
import { setActiveRole } from '@/store/slices/uiSlice'
import { login } from '@/store/slices/authSlice'
import apiClient from '@/services/api'

const AuthSection = () => {
  const navigate = useNavigate()
  const activeRole = useAppSelector((state) => state.ui.activeRole)
  const dispatch = useAppDispatch()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await apiClient.login(
        formData.email,
        formData.password,
        activeRole,
      )

      dispatch(
        login({
          user: response.user,
          token: response.token,
          role: response.user.role,
          schoolId: String(response.user.schoolId || ''),
        }),
      )

      setMessage('✓ Login successful! Redirecting...')
      setTimeout(() => {
        navigate('/portal/dashboard')
      }, 500)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Login failed. Please check your credentials.'
      setMessage(`✗ ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section id="auth" className="section alt">
      <div className="container">
        <h2>Login</h2>
        <div className="auth-grid">
          <form className="card" onSubmit={handleLogin}>
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
                onChange={(event) => dispatch(setActiveRole(event.target.value))}
                required
              >
                <option value="school-admin">School Admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="parent">Parent</option>
                <option value="super-admin">Super Admin</option>
              </select>
            </label>
            <button
              className="btn primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
            {message && (
              <p
                className="helper"
                style={{ color: message.includes('✓') ? '#10b981' : '#ef4444' }}
              >
                {message}
              </p>
            )}
            <p className="helper">Test: admin@vidyahub.edu / password123</p>
          </form>
          <div className="card">
            <h3>New School Registration</h3>
            <p>
              Is your school new to Vidya Hub? Contact us to register your
              institution!
            </p>
            <ul>
              <li>Fill registration form</li>
              <li>Admin account created</li>
              <li>Start managing your school</li>
            </ul>
            <button className="btn outline" type="button">
              Register School
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AuthSection
