import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../services/apiClient'

const StudentLoginPage = () => {
  const navigate = useNavigate()
  const [rollNumber, setRollNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiClient.studentLogin(rollNumber.trim())
      // Store student data in sessionStorage (not persistent like admin)
      sessionStorage.setItem('portalUser', JSON.stringify({
        type: 'student',
        id: response.data.id,
        name: `${response.data.firstName} ${response.data.lastName}`,
        rollNumber: response.data.rollNumber,
        profilePic: response.data.profilePic,
        schoolName: response.data.school?.name,
      }))
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
        <p className="portal-login-subtitle">Enter your Roll Number to view your profile</p>

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
