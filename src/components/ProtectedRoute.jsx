import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const role = useAuthStore((state) => state.role)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Allow a small delay for store to hydrate from localStorage
    const timer = setTimeout(() => {
      setIsChecking(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isChecking) {
      // Check token instead of user object (user object might not persist)
      if (!token || !role) {
        navigate('/')
        return
      }

      if (requiredRole && role !== requiredRole) {
        navigate('/unauthorized')
      }
    }
  }, [token, role, requiredRole, navigate, isChecking])

  // Show nothing while checking auth state
  if (isChecking) {
    return null
  }

  if (!token) {
    return null
  }

  return children
}

export default ProtectedRoute
