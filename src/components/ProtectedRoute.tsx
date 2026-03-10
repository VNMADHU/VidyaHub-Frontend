import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: string | null
}

const ProtectedRoute = ({ children, requiredRole = null }: ProtectedRouteProps) => {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const role = useAppSelector((state) => state.auth.role)
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
      if (!token || !role) {
        // Redirect to the correct login page based on the required role
        if (requiredRole === 'portal-student') {
          navigate('/student-login')
        } else if (requiredRole === 'portal-teacher') {
          navigate('/teacher-login')
        } else {
          navigate('/login')
        }
        return
      }

      if (requiredRole && role !== requiredRole) {
        navigate('/unauthorized')
      }
    }
  }, [token, role, requiredRole, navigate, isChecking])

  if (isChecking) return null
  if (!token) return null

  return <>{children}</>
}

export default ProtectedRoute
