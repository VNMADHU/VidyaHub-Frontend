// @ts-nocheck
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'
import { useAppDispatch } from '@/store'
import { login } from '@/store/slices/authSlice'

const StudentLoginPage = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [rollNumber, setRollNumber] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiClient.studentLogin(rollNumber.trim(), dateOfBirth)

      // Store JWT token in Redux auth store (same as admin login)
      dispatch(
        login({
          user: {
            id: response.data.id,
            email: response.data.email || '',
            role: 'portal-student',
            schoolId: response.data.schoolId,
          },
          token: response.token,
          role: 'portal-student',
          schoolId: String(response.data.schoolId || ''),
        }),
      )

      navigate(`/my/student/${response.data.id}`)
    } catch (err) {
      setError(err.message || 'Invalid Roll Number. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="portal-login-page">
      <div className="portal-login-card">
        <div className="portal-login-icon">🎓</div>
        <h1>Student Portal</h1>
        <p className="portal-login-subtitle">Enter your Roll Number and Date of Birth to access your profile</p>

        <form onSubmit={handleLogin} className="portal-login-form">
          <div className="portal-input-group">
            <label htmlFor="rollNumber">Roll Number</label>
            <input
              id="rollNumber"
              type="text"
              placeholder="e.g. S001"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              required
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="portal-input-group">
            <label htmlFor="dateOfBirth">Date of Birth</label>
            <input
              id="dateOfBirth"
              type="date"
              title="Date of Birth"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
            />
          </div>

          {error && <div className="portal-login-error">{error}</div>}

          <button type="submit" className="btn primary portal-login-btn" disabled={loading}>
            {loading ? 'Verifying...' : 'View My Profile'}
          </button>
        </form>

        <button className="portal-login-back" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </div>
    </div>
  )
}

export default StudentLoginPage
