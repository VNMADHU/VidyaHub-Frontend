import { useEffect } from 'react'
import useAuthStore from '../store/useAuthStore'

/**
 * Hook to prevent browser back navigation when user is logged in
 * This keeps users in the portal even if they click browser back button
 */
export const usePreventBackNavigation = () => {
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    if (!token) return

    // Add a dummy entry to browser history
    window.history.pushState(null, null, window.location.href)

    // Prevent back navigation
    const handlePopState = () => {
      window.history.pushState(null, null, window.location.href)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [token])
}

export default usePreventBackNavigation
