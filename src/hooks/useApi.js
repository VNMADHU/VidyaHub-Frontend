import { useState, useEffect, useCallback, useRef } from 'react'
import logger from '../utils/logger'

/**
 * Custom hook for API data fetching with loading, error, and refresh.
 *
 * Usage:
 *   const { data, loading, error, refresh } = useApi(() => apiClient.listStudents())
 *   const { data, loading } = useApi(() => apiClient.getStudent(id), [id])
 *
 * @param {Function} fetchFn — async function that returns data
 * @param {Array} deps — re-fetch when these change (like useEffect deps)
 * @returns {{ data, loading, error, refresh }}
 */
const useApi = (fetchFn, deps = []) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      if (mountedRef.current) {
        setData(result)
      }
    } catch (err) {
      logger.error('useApi fetch failed', { error: err.message })
      if (mountedRef.current) {
        setError(err.message || 'Something went wrong')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

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
