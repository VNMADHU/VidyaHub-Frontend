// @ts-nocheck
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'

const TeacherLoginPage = () => {
  const navigate = useNavigate()
  const [teacherId, setTeacherId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiClient.teacherLogin(teacherId.trim())
      // Store teacher data in sessionStorage
      sessionStorage.setItem('portalUser', JSON.stringify({
        type: 'teacher',
        id: response.data.id,
        name: `${response.data.firstName} ${response.data.lastName}`,
        teacherId: response.data.teacherId,
        profilePic: response.data.profilePic,
        schoolName: response.data.school?.name,
      }))
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
        <p className="portal-login-subtitle">Enter your Teacher ID to view your profile</p>

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
