import { useEffect, useRef } from 'react'
import { useAppSelector } from '@/store'

/**
 * Hook to prevent browser back navigation when user is logged in.
 * Keeps users in the portal even if they click browser back button.
 */
export const usePreventBackNavigation = (): void => {
  const token = useAppSelector((state) => state.auth.token)
  const tokenRef = useRef(token)

  useEffect(() => {
    tokenRef.current = token
  }, [token])

  useEffect(() => {
    if (!tokenRef.current) return

    window.history.pushState(null, '', window.location.href)

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [token])
}

export default usePreventBackNavigation
