import { useMemo, useState, type ChangeEvent } from 'react'
import Papa from 'papaparse'

const DEFAULT_BATCH_SIZE = 10

interface ImportError {
  row: number
  message: string
}

interface ImportSummary {
  total: number
  success: number
  failed: number
  errors: ImportError[]
}

interface BulkImportModalProps {
  title: string
  templateHeaders: string[]
  mapRowToPayload: (row: Record<string, string>) => Record<string, unknown> | null
  createItem: (payload: Record<string, unknown>) => Promise<unknown>
  onClose: () => void
  onDone?: (summary: ImportSummary) => void
}

const BulkImportModal = ({
  title,
  templateHeaders,
  mapRowToPayload,
  createItem,
  onClose,
  onDone,
}: BulkImportModalProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const totalRows = rows.length

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    setFile(selected || null)
    setError(null)
    setSummary(null)

    if (!selected) {
      setRows([])
      return
    }

    try {
      const text = await selected.text()
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      })

      if (result.errors?.length) {
        console.error(result.errors)
        setError('Failed to parse CSV. Please check the template format.')
        setRows([])
        return
      }

      const filtered = (result.data || []).filter((row) =>
        Object.values(row).some((value) => String(value).trim() !== ''),
      )

      setRows(filtered)
    } catch (err) {
      console.error(err)
      setError('Failed to read file. Please upload a valid CSV file.')
      setRows([])
    }
  }

  const handleDownloadTemplate = () => {
    const headerLine = templateHeaders.join(',')
    const blob = new Blob([`${headerLine}\n`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_template.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const payloads = useMemo(() => {
    return rows
      .map((row, index) => ({ index, payload: mapRowToPayload(row) }))
      .filter((item): item is { index: number; payload: Record<string, unknown> } => item.payload !== null)
  }, [rows, mapRowToPayload])

  const handleImport = async () => {
    setLoading(true)
    setError(null)
    setSummary(null)

    if (!payloads.length) {
      setLoading(false)
      setError('No valid rows found to import.')
      return
    }

    let successCount = 0
    let failureCount = 0
    const errors: ImportError[] = []

    for (let i = 0; i < payloads.length; i += DEFAULT_BATCH_SIZE) {
      const batch = payloads.slice(i, i + DEFAULT_BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(({ payload }) => createItem(payload)),
      )

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          successCount += 1
        } else {
          failureCount += 1
          errors.push({
            row: batch[idx].index + 2,
            message: result.reason?.message || 'Unknown error',
          })
        }
      })
    }

    const summaryResult: ImportSummary = {
      total: payloads.length,
      success: successCount,
      failed: failureCount,
      errors,
    }

    setSummary(summaryResult)
    setLoading(false)
    onDone?.(summaryResult)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content bulk-import-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title} - Bulk Import</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="bulk-import-body">
          <p className="bulk-import-hint">
            Upload a CSV file. Use the template to match the required columns.
          </p>

          <div className="bulk-import-actions">
            <button className="btn outline" onClick={handleDownloadTemplate}>
              Download Template
            </button>
            <label className="btn secondary">
              Choose File
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {file && (
            <div className="bulk-import-file">
              <strong>Selected:</strong> {file.name}
            </div>
          )}

          <div className="bulk-import-summary">
            <div>
              <strong>Rows detected:</strong> {totalRows}
            </div>
            <div>
              <strong>Valid rows:</strong> {payloads.length}
            </div>
          </div>

          {error && <div className="bulk-import-error">{error}</div>}

          {summary && (
            <div className="bulk-import-result">
              <p>
                Imported {summary.success} of {summary.total} rows.
              </p>
              {summary.failed > 0 && (
                <div className="bulk-import-errors">
                  <p>Failed rows:</p>
                  <ul>
                    {summary.errors.slice(0, 5).map((err) => (
                      <li key={`${err.row}-${err.message}`}>
                        Row {err.row}: {err.message}
                      </li>
                    ))}
                  </ul>
                  {summary.errors.length > 5 && (
                    <p>...and {summary.errors.length - 5} more.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bulk-import-footer">
          <button className="btn outline" onClick={onClose} disabled={loading}>
            Close
          </button>
          <button
            className="btn primary"
            onClick={handleImport}
            disabled={loading || !payloads.length}
          >
            {loading ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulkImportModal
