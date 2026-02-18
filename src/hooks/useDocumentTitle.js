import { useEffect, useRef } from 'react'

/**
 * Custom hook for setting the document title per page.
 * Automatically restores the previous title on unmount.
 *
 * Usage:
 *   useDocumentTitle('Students | Vidya Hub')
 *   useDocumentTitle(`${studentName} | Vidya Hub`)
 */
const useDocumentTitle = (title) => {
  const prevTitle = useRef(document.title)

  useEffect(() => {
    document.title = title
    return () => {
      document.title = prevTitle.current
    }
  }, [title])
}

export default useDocumentTitle
