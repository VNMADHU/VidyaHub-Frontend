interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
}

const Pagination = ({ currentPage, totalPages, totalItems, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null

  // Build page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 0',
      marginTop: '0.5rem',
      flexWrap: 'wrap',
      gap: '0.5rem',
    }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
        Showing page {currentPage} of {totalPages} ({totalItems} records)
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <PageBtn
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          label="‹ Prev"
        />

        {getPageNumbers().map((p, idx) =>
          p === '...' ? (
            <span key={`e${idx}`} style={{ padding: '0 0.35rem', color: 'var(--muted)' }}>…</span>
          ) : (
            <PageBtn
              key={p}
              active={p === currentPage}
              onClick={() => onPageChange(p)}
              label={String(p)}
            />
          )
        )}

        <PageBtn
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          label="Next ›"
        />
      </div>
    </div>
  )
}

const PageBtn = ({ label, onClick, disabled, active }: {
  label: string; onClick: () => void; disabled?: boolean; active?: boolean
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '0.35rem 0.65rem',
      fontSize: '0.85rem',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      background: active ? 'var(--primary)' : 'transparent',
      color: active ? '#fff' : 'var(--text)',
      fontWeight: active ? '600' : '400',
      transition: 'all 0.15s ease',
    }}
  >
    {label}
  </button>
)

export default Pagination
