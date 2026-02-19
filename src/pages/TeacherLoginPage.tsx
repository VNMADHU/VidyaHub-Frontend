// @ts-nocheck
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'
import { useAppDispatch } from '@/store'
import { login } from '@/store/slices/authSlice'

const TeacherLoginPage = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [teacherId, setTeacherId] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiClient.teacherLogin(teacherId.trim(), dateOfBirth)

      // Store JWT token in Redux auth store (same as admin login)
      dispatch(
        login({
          user: {
            id: response.data.id,
            email: response.data.email || '',
            role: 'portal-teacher',
            schoolId: response.data.schoolId,
          },
          token: response.token,
          role: 'portal-teacher',
          schoolId: String(response.data.schoolId || ''),
        }),
      )

      navigate(`/my/teacher/${response.data.id}`)
    } catch (err) {
      setError(err.message || 'Invalid Teacher ID. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="portal-login-page">
      <div className="portal-login-card">
        <div className="portal-login-icon">👨‍🏫</div>
        <h1>Teacher Portal</h1>
        <p className="portal-login-subtitle">Enter your Teacher ID and Date of Birth to access your profile</p>

        <form onSubmit={handleLogin} className="portal-login-form">
          <div className="portal-input-group">
            <label htmlFor="teacherId">Teacher ID</label>
            <input
              id="teacherId"
              type="text"
              placeholder="e.g. T001"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
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

export default TeacherLoginPage
