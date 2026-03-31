// @ts-nocheck
import { useEffect, useState, useRef } from 'react'
import { SquarePen, Trash2, Printer, CalendarRange, X, FileDown } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns'
import 'react-day-picker/dist/style.css'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import BulkImportModal from '@/components/BulkImportModal'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { exportToCSV, exportToPDF, exportButtonStyle, printTable } from '@/utils/exportUtils'
import Modal from '../components/Modal'
import { useAppSelector } from '@/store'

const ExpensesPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const authRole = useAppSelector((state) => state.auth.role)
  const authUser = useAppSelector((state) => state.auth.user)
  const isSuperAdmin = authRole === 'super-admin'
  const canEditExpenses   = isSuperAdmin || authUser?.expenseCanEdit === true
  const canDeleteExpenses = isSuperAdmin || authUser?.expenseCanDelete === true
  const [expenses, setExpenses] = useState([])
  const [expenseCategories, setExpenseCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const datePickerRef = useRef(null)
  const [formData, setFormData] = useState({
    title: '',
    category: 'maintenance',
    amount: '',
    date: '',
    paidTo: '',
    paymentMode: 'cash',
    receiptNo: '',
    description: '',
    approvedBy: '',
    status: 'pending',
  })

  useEffect(() => {
    loadExpenses()
    apiClient.listMasterData('expense-categories').then((data) => {
      setExpenseCategories(Array.isArray(data) ? data : data?.data || [])
    }).catch(() => {})
  }, [])

  const loadExpenses = async () => {
    try {
      const response = await apiClient.listExpenses()
      setExpenses(response?.data || [])
    } catch (error) {
      console.error('Failed to load expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...formData, amount: parseFloat(formData.amount) || 0 }
      if (editingId) {
        await apiClient.updateExpense(editingId, payload)
      } else {
        await apiClient.createExpense(payload)
      }
      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadExpenses()
    } catch (error) {
      toast.error(error?.message || 'Failed to save expense.')
    }
  }

  const genReceiptNo = () => Math.floor(100000000000 + Math.random() * 900000000000).toString()

  const downloadExpenseReceipt = (expense) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
    const pw = doc.internal.pageSize.getWidth()
    // Header bar
    doc.setFillColor(239, 68, 68); doc.rect(0, 0, pw, 22, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    doc.text('EXPENSE RECEIPT', pw / 2, 10, { align: 'center' })
    doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text('School Management System', pw / 2, 16, { align: 'center' })
    // Receipt no & date
    doc.setTextColor(60, 60, 60); doc.setFontSize(8)
    doc.text(`Receipt No: ${expense.receiptNo || 'N/A'}`, 10, 30)
    doc.text(`Date: ${expense.date ? new Date(expense.date).toLocaleDateString('en-IN') : 'N/A'}`, pw - 10, 30, { align: 'right' })
    // Divider
    doc.setDrawColor(220, 220, 220); doc.line(10, 33, pw - 10, 33)
    // Details table
    const fields = [
      ['Title', expense.title || '-'],
      ['Category', expense.category ? expense.category.charAt(0).toUpperCase() + expense.category.slice(1) : '-'],
      ['Amount', `Rs. ${(expense.amount || 0).toLocaleString('en-IN')}`],
      ['Paid To', expense.paidTo || '-'],
      ['Payment Mode', expense.paymentMode ? expense.paymentMode.charAt(0).toUpperCase() + expense.paymentMode.slice(1) : '-'],
      ['Approved By', expense.approvedBy || '-'],
      ['Status', expense.status ? expense.status.charAt(0).toUpperCase() + expense.status.slice(1) : '-'],
      ['Description', expense.description || '-'],
    ]
    let y = 40
    fields.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100)
      doc.text(label, 12, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30)
      const lines = doc.splitTextToSize(String(value), pw - 60)
      doc.text(lines, 60, y)
      y += Math.max(7, lines.length * 5)
      doc.setDrawColor(240, 240, 240); doc.line(10, y - 2, pw - 10, y - 2)
    })
    // Footer
    doc.setFillColor(248, 248, 248); doc.rect(0, doc.internal.pageSize.getHeight() - 14, pw, 14, 'F')
    doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'italic')
    doc.text('This is a computer-generated receipt.', pw / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' })
    doc.save(`Expense_Receipt_${expense.receiptNo || expense.id}.pdf`)
  }

  const resetForm = () => {
    setFormData({ title: '', category: 'maintenance', amount: '', date: '', paidTo: '', paymentMode: 'cash', receiptNo: '', description: '', approvedBy: '', status: 'pending' })
  }

  const handleAddNew = () => {
    setEditingId(null)
    resetForm()
    setFormData((prev) => ({ ...prev, receiptNo: genReceiptNo() }))
    setShowForm(true)
  }

  const handleEdit = (expense) => {
    setEditingId(expense.id)
    setFormData({
      title: expense.title || '',
      category: expense.category || 'maintenance',
      amount: expense.amount || '',
      date: expense.date ? expense.date.split('T')[0] : '',
      paidTo: expense.paidTo || '',
      paymentMode: expense.paymentMode || 'cash',
      receiptNo: expense.receiptNo || '',
      description: expense.description || '',
      approvedBy: expense.approvedBy || '',
      status: expense.status || 'pending',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ message: 'Delete this expense record?' })
    if (!ok) return
    try {
      await apiClient.deleteExpense(id)
      loadExpenses()
    } catch (error) {
      toast.error(error?.message || 'Failed to delete expense.')
    }
  }

  // ── Summary ─────────────────────────────────────────────

  // ── Export ──────────────────────────────────────────────
  const expenseExportColumns = [
    { key: 'title',       label: 'Title' },
    { key: 'category',    label: 'Category' },
    { key: 'amount',      label: 'Amount (Rs.)' },
    { key: 'date',        label: 'Date' },
    { key: 'paidTo',      label: 'Paid To' },
    { key: 'paymentMode', label: 'Payment Mode' },
    { key: 'receiptNo',   label: 'Receipt No.' },
    { key: 'approvedBy',  label: 'Approved By' },
    { key: 'status',      label: 'Status' },
  ]

  const mapExpensesForExport = (data) => data.map((e) => ({
    title:       e.title || '',
    category:    e.category || '',
    amount:      e.amount || 0,
    date:        e.date ? new Date(e.date).toLocaleDateString('en-IN') : '',
    paidTo:      e.paidTo || '',
    paymentMode: e.paymentMode || '',
    receiptNo:   e.receiptNo || '',
    approvedBy:  e.approvedBy || '',
    status:      e.status || '',
  }))

  const buildExpenseFilterLabel = () => {
    const parts = []
    if (dateRange.from && dateRange.to) {
      parts.push(`Date: ${format(dateRange.from, 'dd MMM yyyy')} – ${format(dateRange.to, 'dd MMM yyyy')}`)
    } else if (dateRange.from) {
      parts.push(`Date: from ${format(dateRange.from, 'dd MMM yyyy')}`)
    }
    if (searchQuery) parts.push(`Search: "${searchQuery}"`)
    return parts.length ? parts.join('  |  ') : 'All Records'
  }

  const handleExportCSV = () => {
    const rows = mapExpensesForExport(filteredExpenses)
    const filterLabel = buildExpenseFilterLabel()
    const headers = expenseExportColumns.map((c) => c.label)
    const dataRows = rows.map((r) => expenseExportColumns.map((c) => r[c.key] ?? ''))
    const totalsRow = expenseExportColumns.map((c) =>
      c.key === 'title' ? 'TOTAL' : c.key === 'amount' ? totalExpenses : ''
    )
    const csvLines = [
      [`School Expenses`],
      [`Filter: ${filterLabel}`],
      [`Generated: ${new Date().toLocaleDateString('en-IN')}`],
      [],
      headers,
      ...dataRows,
      [],
      totalsRow,
    ]
    const csv = csvLines.map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Expenses_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    const rows = mapExpensesForExport(filteredExpenses)
    const filterLabel = buildExpenseFilterLabel()
    const doc = new jsPDF({ orientation: 'landscape' })
    const pageW = doc.internal.pageSize.getWidth()

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text('School Expenses', 14, 16)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Filter: ${filterLabel}`, 14, 24)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageW - 14, 24, { align: 'right' })

    // Summary boxes
    const summaryY = 30
    const boxW = 60, boxH = 12, gap = 6
    const summaries = [
      { label: 'Total Expenses', value: `Rs.${totalExpenses.toLocaleString('en-IN')}`, color: [37, 99, 235] },
      { label: 'Records',        value: String(filteredExpenses.length),               color: [100, 116, 139] },
    ]
    summaries.forEach(({ label, value, color }, i) => {
      const x = 14 + i * (boxW + gap)
      doc.setFillColor(color[0], color[1], color[2])
      doc.roundedRect(x, summaryY, boxW, boxH, 2, 2, 'F')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(255, 255, 255)
      doc.text(label, x + boxW / 2, summaryY + 4, { align: 'center' })
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(value, x + boxW / 2, summaryY + 9.5, { align: 'center' })
    })

    const headers = expenseExportColumns.map((c) => c.label)
    const dataRows = rows.map((r) => expenseExportColumns.map((c) => String(r[c.key] ?? '')))
    const totalsRow = expenseExportColumns.map((c) =>
      c.key === 'title' ? 'TOTAL' : c.key === 'amount' ? `Rs.${totalExpenses.toLocaleString('en-IN')}` : ''
    )

    autoTable(doc, {
      head: [headers],
      body: [...dataRows, totalsRow],
      startY: summaryY + boxH + 5,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      didParseCell: (data) => {
        if (data.row.index === dataRows.length) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [239, 246, 255]
          data.cell.styles.textColor = [37, 99, 235]
        }
      },
      margin: { left: 14, right: 14 },
    })

    doc.save(`Expenses_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const handlePrint = () => {
    const filterLabel = buildExpenseFilterLabel()
    const rows = mapExpensesForExport(filteredExpenses)
    const headers = expenseExportColumns.map((c) => c.label)
    const dataRows = rows.map((r) =>
      `<tr>${expenseExportColumns.map((c) => `<td>${r[c.key] ?? ''}</td>`).join('')}</tr>`
    ).join('')
    const totalsRow = `<tr style="font-weight:bold;background:#eff6ff;color:#2563eb;">` +
      expenseExportColumns.map((c) =>
        c.key === 'title'  ? `<td>TOTAL</td>` :
        c.key === 'amount' ? `<td>₹${totalExpenses.toLocaleString('en-IN')}</td>` : `<td></td>`
      ).join('') + `</tr>`

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>School Expenses</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { margin: 0 0 4px; color: #1e293b; }
        .meta { font-size: 12px; color: #64748b; margin-bottom: 10px; }
        .summary { display: flex; gap: 16px; margin-bottom: 14px; }
        .summary-box { padding: 8px 16px; border-radius: 6px; font-size: 12px; }
        .summary-box b { display: block; font-size: 15px; }
        .box-total   { background: #eff6ff; color: #2563eb; }
        .box-records { background: #f8fafc; color: #475569; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
        th { background: #2563eb; color: white; font-weight: 600; }
        tr:nth-child(even) { background: #f8fafc; }
      </style></head><body>
      <h2>School Expenses</h2>
      <div class="meta">Filter: ${filterLabel} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-IN')}</div>
      <div class="summary">
        <div class="summary-box box-total"><span>Total Expenses</span><b>₹${totalExpenses.toLocaleString('en-IN')}</b></div>
        <div class="summary-box box-records"><span>Records</span><b>${filteredExpenses.length}</b></div>
      </div>
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${dataRows}${totalsRow}</tbody>
      </table>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const templateHeaders = ['title', 'category', 'amount', 'date', 'paidTo', 'paymentMode', 'receiptNo', 'approvedBy', 'status', 'description']
  const mapRow = (row) => {
    if (!row.title || !row.amount || !row.date) return null
    return {
      title: String(row.title).trim(),
      category: row.category || 'other',
      amount: parseFloat(row.amount),
      date: String(row.date).trim(),
      paidTo: row.paidTo || '',
      paymentMode: row.paymentMode || 'cash',
      receiptNo: row.receiptNo || '',
      approvedBy: row.approvedBy || '',
      status: row.status || 'approved',
      description: row.description || '',
    }
  }

  const filteredExpenses = expenses.filter((e) => {
    if (dateRange.from || dateRange.to) {
      if (!e.date) return false
      const expDate = startOfDay(parseISO(e.date.split('T')[0]))
      const from = dateRange.from ? startOfDay(dateRange.from) : null
      const to   = dateRange.to   ? endOfDay(dateRange.to)   : null
      if (from && to) {
        if (!isWithinInterval(expDate, { start: from, end: to })) return false
      } else if (from) {
        if (expDate < from) return false
      }
    }
    const q = searchQuery.toLowerCase()
    return e.title?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q) || e.paidTo?.toLowerCase().includes(q)
  })

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  // ── Category breakdown ─────────────────────────────────────────────────
  const expenseCategoryBreakdown = Object.entries(
    filteredExpenses.reduce((acc, e) => {
      const cat = e.category || 'Uncategorized'
      if (!acc[cat]) acc[cat] = { count: 0, total: 0 }
      acc[cat].count++
      acc[cat].total += e.amount || 0
      return acc
    }, {})
  ).sort((a, b) => b[1].total - a[1].total)

  const downloadExpenseCategoryPDF = () => {
    const doc = new jsPDF()
    const pageW = doc.internal.pageSize.getWidth()
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235)
    doc.text('Expense Category Report', 14, 16)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
    doc.text(`Filter: ${buildExpenseFilterLabel()}`, 14, 24)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageW - 14, 24, { align: 'right' })
    autoTable(doc, {
      head: [['Category', 'No. of Records', 'Total Amount (Rs.)']],
      body: [
        ...expenseCategoryBreakdown.map(([cat, { count, total }]) => [
          cat.charAt(0).toUpperCase() + cat.slice(1),
          String(count),
          `Rs.${total.toLocaleString('en-IN')}`,
        ]),
        ['GRAND TOTAL', String(filteredExpenses.length), `Rs.${totalExpenses.toLocaleString('en-IN')}`],
      ],
      startY: 30,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      didParseCell: (data) => {
        if (data.row.index === expenseCategoryBreakdown.length) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [219, 234, 254]
          data.cell.styles.textColor = [37, 99, 235]
        }
      },
      margin: { left: 14, right: 14 },
    })
    doc.save(`Expense_Category_Report_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const { paginatedItems, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredExpenses)

  // Close date picker when clicking outside
  useEffect(() => {
    if (!showDatePicker) return
    const handleOutsideClick = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showDatePicker])

  return (
    <div className="page">
      <div className="page-header">
        <h1>Expenses</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e40af', background: '#dbeafe', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
            Total: ₹{totalExpenses.toLocaleString('en-IN')}
          </span>
          <button style={exportButtonStyle} onClick={handleExportCSV} title="Export CSV">📄 CSV</button>
          <button style={exportButtonStyle} onClick={handleExportPDF} title="Export PDF">📥 PDF</button>
          <button style={exportButtonStyle} onClick={handlePrint} title="Print"><Printer size={16} /> Print</button>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>Bulk Import</button>
          <button className="btn primary" onClick={handleAddNew}>
            + Add Expense
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by title, category, paid to..."
          />
        </div>
        <div ref={datePickerRef} style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${(dateRange.from || dateRange.to) ? '#93c5fd' : 'var(--border, #e2e8f0)'}`, borderRadius: '8px', background: (dateRange.from || dateRange.to) ? '#eff6ff' : 'var(--card-bg, #fff)', overflow: 'hidden' }}>
            <button
              onClick={() => setShowDatePicker((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.68rem 0.75rem', border: 'none', background: 'transparent',
                fontSize: '0.9rem',
                color: (dateRange.from || dateRange.to) ? '#2563eb' : 'var(--text, #1e293b)',
                cursor: 'pointer', fontWeight: (dateRange.from || dateRange.to) ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
              title="Filter by date range"
            >
              <CalendarRange size={16} />
              {dateRange.from && dateRange.to
                ? `${format(dateRange.from, 'dd MMM')} – ${format(dateRange.to, 'dd MMM yyyy')}`
                : dateRange.from
                ? `From ${format(dateRange.from, 'dd MMM yyyy')}`
                : 'Date Range'}
            </button>
            {(dateRange.from || dateRange.to) && (
              <button
                onClick={(e) => { e.stopPropagation(); setDateRange({ from: undefined, to: undefined }); setShowDatePicker(false) }}
                style={{ display: 'flex', alignItems: 'center', padding: '0.68rem 0.5rem 0.68rem 0', border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb' }}
                title="Clear date filter"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {showDatePicker && (
            <div
              style={{
                position: 'absolute', top: 'calc(100% - 1.4rem)', right: 0, zIndex: 1000,
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.12)', padding: '0.75rem',
              }}
            >
              <DayPicker
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range || { from: undefined, to: undefined })
                  if (range?.from && range?.to) setShowDatePicker(false)
                }}
                numberOfMonths={2}
                styles={{
                  caption: { color: '#1e293b' },
                  day_selected: { backgroundColor: '#2563eb' },
                  day_range_middle: { backgroundColor: '#eff6ff', color: '#1d4ed8' },
                }}
                footer={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => { setDateRange({ from: undefined, to: undefined }); setShowDatePicker(false) }}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', background: '#fff' }}
                    >Clear</button>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', border: 'none', borderRadius: '6px', cursor: 'pointer', background: '#2563eb', color: '#fff' }}
                    >Done</button>
                  </div>
                }
              />
            </div>
          )}
        </div>
        <button onClick={downloadExpenseCategoryPDF} style={exportButtonStyle} title="Download Category Report">📊 Category Report</button>
      </div>

      <div className="page-content-scrollable">
        {showForm && (
          <Modal title={editingId ? 'Edit Expense' : 'Add Expense'} onClose={() => setShowForm(false)} footer={<button type="submit" form="expense-form" className="btn primary">{editingId ? 'Update Expense' : 'Add Expense'}</button>}>
            <form id="expense-form" onSubmit={handleSubmit} className="form-grid">
              <label>
                <span className="field-label">Title / Description *</span>
                <input type="text" placeholder="Title / Description *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </label>
              <label>
                <span className="field-label">Category</span>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <option value="">-- Category --</option>
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.label}>{c.label.charAt(0).toUpperCase() + c.label.slice(1)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">Amount (₹) *</span>
                <input type="number" placeholder="Amount (₹) *" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required min="0" step="0.01" />
              </label>
              <label>
                <span className="field-label">Expense Date</span>
                <input type="date" title="Expense Date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </label>
              <label>
                <span className="field-label">Paid To</span>
                <input type="text" placeholder="Paid To (vendor / person)" value={formData.paidTo} onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })} />
              </label>
              <label>
                <span className="field-label">Payment Mode</span>
                <select value={formData.paymentMode} onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}>
                  <option value="cash">Cash</option>
                  <option value="online">Online Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                </select>
              </label>
              <label>
                <span className="field-label">Receipt / Bill No.</span>
                <input type="text" placeholder="Receipt / Bill No." value={formData.receiptNo} onChange={(e) => setFormData({ ...formData, receiptNo: e.target.value })} />
              </label>
              <label>
                <span className="field-label">Approved By</span>
                <input type="text" placeholder="Approved By" value={formData.approvedBy} onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })} />
              </label>
              <label>
                <span className="field-label">Status {!isSuperAdmin && '🔒'}</span>
                {isSuperAdmin ? (
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                    readOnly
                    style={{ background: '#f9fafb', cursor: 'not-allowed' }}
                    title="Only Super Admin can approve or reject expenses"
                  />
                )}
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span className="field-label">Notes / Description</span>
                <textarea placeholder="Notes / Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="2" />
              </label>
            </form>
          </Modal>
        )}

        {loading ? (
          <div className="loading-state">Loading expenses...</div>
        ) : (
          <div className="data-table" id="expenses-print-area">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount (₹)</th>
                  <th>Date</th>
                  <th>Paid To</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr><td colSpan="8" className="empty-row">{searchQuery ? 'No expenses match.' : 'No expenses recorded. Add your first expense!'}</td></tr>
                ) : (
                  paginatedItems.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.title}</td>
                      <td style={{ textTransform: 'capitalize' }}>{expense.category}</td>
                      <td style={{ fontWeight: 600 }}>₹{expense.amount?.toLocaleString('en-IN')}</td>
                      <td>{expense.date ? new Date(expense.date).toLocaleDateString('en-IN') : '-'}</td>
                      <td>{expense.paidTo || '-'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{expense.paymentMode || '-'}</td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                          background: expense.status === 'approved' ? '#d1fae5' : expense.status === 'pending' ? '#fef3c7' : '#fee2e2',
                          color: expense.status === 'approved' ? '#065f46' : expense.status === 'pending' ? '#92400e' : '#991b1b',
                        }}>{expense.status}</span>
                      </td>
                      <td>
                        <button className="btn-icon" onClick={() => downloadExpenseReceipt(expense)} title="Download Receipt" style={{ color: '#7c3aed' }}><FileDown size={16} /></button>
                        {canEditExpenses && (
                          <button className="btn-icon edit" onClick={() => handleEdit(expense)}><SquarePen size={16} /></button>
                        )}
                        {canDeleteExpenses && (
                          <button className="btn-icon danger" onClick={() => handleDelete(expense.id)}><Trash2 size={16} /></button>
                        )}
                        {/* {!canEditExpenses && !canDeleteExpenses && (
                          <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>View only</span>
                        )} */}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={goToPage} />
          </div>
        )}

        {showBulkImport && (
          <BulkImportModal
            title="Expenses"
            templateHeaders={templateHeaders}
            mapRowToPayload={mapRow}
            createItem={(payload) => apiClient.createExpense(payload)}
            onClose={() => setShowBulkImport(false)}
            onDone={() => loadExpenses()}
          />
        )}
      </div>
    </div>
  )
}

export default ExpensesPage
