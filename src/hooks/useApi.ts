import { useState, useEffect, useCallback, useRef } from 'react'
import logger from '@/utils/logger'

/**
 * Custom hook for API data fetching with loading, error, and refresh.
 *
 * Usage:
 *   const { data, loading, error, refresh } = useApi(() => apiClient.listStudents())
 *   const { data, loading } = useApi(() => apiClient.getStudent(id), [id])
 */
function useApi<T>(fetchFn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      if (mountedRef.current) {
        setData(result)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      logger.error('useApi fetch failed', { error: message })
      if (mountedRef.current) {
        setError(message)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    mountedRef.current = true
    execute()
    return () => {
      mountedRef.current = false
    }
  }, [execute])

  return { data, loading, error, refresh: execute }
}

export default useApi
