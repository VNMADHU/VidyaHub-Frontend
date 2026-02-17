import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useUiStore from '../store/useUiStore'
import useAuthStore from '../store/useAuthStore'
import apiClient from '../services/apiClient'

const AuthSection = () => {
  const navigate = useNavigate()
  const activeRole = useUiStore((state) => state.activeRole)
  const setActiveRole = useUiStore((state) => state.setActiveRole)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const login = useAuthStore((state) => state.login)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await apiClient.login(
        formData.email,
        formData.password,
        activeRole,
      )

      // Store user info and redirect to portal dashboard
      login(
        { email: formData.email, role: activeRole },
        'demo-token-123',
        activeRole,
        '1',
      )

      setMessage('✓ Login successful! Redirecting...')
      setTimeout(() => {
        navigate('/portal/dashboard')
      }, 500)
    } catch (error) {
      setMessage(`✗ Login failed: ${error.message}`)
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
                onChange={(event) => setActiveRole(event.target.value)}
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
              <p className="helper" style={{ color: message.includes('✓') ? '#10b981' : '#ef4444' }}>
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
