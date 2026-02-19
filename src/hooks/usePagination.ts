import { useState, useMemo } from 'react'

const PAGE_SIZE = 15

export function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  // Reset to page 1 if current page exceeds total (e.g. after a filter change)
  const safePage = currentPage > totalPages ? 1 : currentPage

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  return {
    currentPage: safePage,
    totalPages,
    totalItems: items.length,
    paginatedItems,
    goToPage,
    setCurrentPage,
  }
}
