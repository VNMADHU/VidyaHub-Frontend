// @ts-nocheck
/**
 * Export utilities for CSV and PDF generation
 * Used across all table pages for data export
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Papa from 'papaparse'

// ── CSV Export ─────────────────────────────────────────────
export function exportToCSV(data: Record<string, unknown>[], filename: string, columns?: { key: string; label: string }[]) {
  if (!data.length) return

  let csvData: Record<string, unknown>[]

  if (columns) {
    // Map data to only include specified columns with friendly headers
    csvData = data.map(row => {
      const mapped: Record<string, unknown> = {}
      columns.forEach(col => {
        mapped[col.label] = row[col.key] ?? ''
      })
      return mapped
    })
  } else {
    csvData = data
  }

  const csv = Papa.unparse(csvData)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ── PDF Export (table format) ─────────────────────────────
export function exportToPDF(
  data: Record<string, unknown>[],
  filename: string,
  columns: { key: string; label: string }[],
  title?: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
) {
  if (!data.length) return

  const doc = new jsPDF({ orientation })

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title || filename, 14, 20)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 14, 28)

  // Table
  const headers = columns.map(c => c.label)
  const rows = data.map(row => columns.map(col => {
    const val = row[col.key]
    if (val instanceof Date) return val.toLocaleDateString('en-IN')
    if (val === null || val === undefined) return ''
    return String(val)
  }))

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 34,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ── Export Button Component Helper ────────────────────────
// Use this inline style object for export buttons
export const exportButtonStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  cursor: 'pointer',
  fontSize: '13px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
}

// ── Print Helper ──────────────────────────────────────────
export function printTable(elementId: string, title: string) {
  const content = document.getElementById(elementId)
  if (!content) return
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(`
    <html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h2 { text-align: center; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-size: 12px; }
      th { background: #f3f4f6; font-weight: 600; }
      .no-print, .btn-icon { display: none !important; }
      .badge, span[style] { font-size: 11px; }
      @media print { .no-print { display: none !important; } }
    </style></head><body>
    <h2>${title}</h2>
    ${content.innerHTML}
    </body></html>
  `)
  printWindow.document.close()
  printWindow.print()
}
