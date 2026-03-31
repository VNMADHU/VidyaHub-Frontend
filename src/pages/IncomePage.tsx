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
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { exportButtonStyle } from '@/utils/exportUtils'
import Modal from '../components/Modal'
import { useAppSelector } from '@/store'

const INCOME_CATEGORIES = [
  { value: 'fee_collection', label: 'Fee Collection' },
  { value: 'donation', label: 'Donation' },
  { value: 'grant', label: 'Government Grant' },
  { value: 'rental', label: 'Rental Income' },
  { value: 'sponsorship', label: 'Sponsorship' },
  { value: 'events', label: 'Events / Functions' },
  { value: 'canteen', label: 'Canteen' },
  { value: 'other', label: 'Other' },
]

const IncomePage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const authRole = useAppSelector((state) => state.auth.role)
  const authUser = useAppSelector((state) => state.auth.user)
  const isSuperAdmin = authRole === 'super-admin'
  const canEditIncome   = isSuperAdmin || authUser?.incomeCanEdit === true
  const canDeleteIncome = isSuperAdmin || authUser?.incomeCanDelete === true

  // ── State ───────────────────────────────────────────────────────────────
  const [incomes, setIncomes] = useState([])
  const [collectedFees, setCollectedFees] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all') // all | fees | other
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const datePickerRef = useRef(null)

  const [formData, setFormData] = useState({
    title: '',
    category: 'donation',
    amount: '',
    date: '',
    receivedFrom: '',
    paymentMode: 'cash',
    receiptNo: '',
    description: '',
    status: 'received',
  })

  useEffect(() => {
    loadData()
  }, [])

  // Close date picker when clicking outside
  useEffect(() => {
    if (!showDatePicker) return
    const handleOutside = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showDatePicker])

  const loadData = async () => {
    setLoading(true)
    try {
      const [incomesRes, feesRes] = await Promise.all([
        apiClient.listIncomes(),
        apiClient.listFees(),
      ])
      setIncomes(incomesRes?.data || [])
      // Only show paid/partial fees as collected income
      const allFees = feesRes?.data || []
      const paid = allFees.filter((f) => f.status === 'paid' || f.status === 'partial')
      setCollectedFees(paid)
    } catch (err) {
      toast.error('Failed to load income data.')
    } finally {
      setLoading(false)
    }
  }

  const genReceiptNo = () => Math.floor(100000000000 + Math.random() * 900000000000).toString()

  const downloadIncomeReceipt = (row) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
    const pw = doc.internal.pageSize.getWidth()
    // Header bar
    doc.setFillColor(22, 163, 74); doc.rect(0, 0, pw, 22, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    doc.text('INCOME RECEIPT', pw / 2, 10, { align: 'center' })
    doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text('School Management System', pw / 2, 16, { align: 'center' })
    // Receipt no & date
    doc.setTextColor(60, 60, 60); doc.setFontSize(8)
    doc.text(`Receipt No: ${row.receiptNo || 'N/A'}`, 10, 30)
    doc.text(`Date: ${row.date ? new Date(row.date).toLocaleDateString('en-IN') : 'N/A'}`, pw - 10, 30, { align: 'right' })
    // Divider
    doc.setDrawColor(220, 220, 220); doc.line(10, 33, pw - 10, 33)
    // Details table
    const isFee = row._type === 'fee'
    const fields = [
      ['Title', row.title || '-'],
      ['Category', row.category || '-'],
      ['Amount', `Rs. ${(row.amount || 0).toLocaleString('en-IN')}`],
      [isFee ? 'Student' : 'Received From', row.receivedFrom || '-'],
      ['Payment Mode', row.paymentMode ? row.paymentMode.charAt(0).toUpperCase() + row.paymentMode.slice(1) : '-'],
      ['Status', row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : '-'],
      ...(row.description ? [['Notes', row.description]] : []),
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
    doc.save(`Income_Receipt_${row.receiptNo || row.id}.pdf`)
  }

  const resetForm = () => {
    setFormData({ title: '', category: 'donation', amount: '', date: '', receivedFrom: '', paymentMode: 'cash', receiptNo: '', description: '', status: 'received' })
  }

  const handleAddNew = () => {
    setEditingId(null)
    resetForm()
    setFormData((prev) => ({ ...prev, receiptNo: genReceiptNo() }))
    setShowForm(true)
  }

  const handleEdit = (income) => {
    setEditingId(income.id)
    setFormData({
      title: income.title || '',
      category: income.category || 'donation',
      amount: income.amount || '',
      date: income.date ? income.date.split('T')[0] : '',
      receivedFrom: income.receivedFrom || '',
      paymentMode: income.paymentMode || 'cash',
      receiptNo: income.receiptNo || '',
      description: income.description || '',
      status: income.status || 'received',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...formData, amount: parseFloat(formData.amount) || 0 }
      if (editingId) {
        await apiClient.updateIncome(editingId, payload)
        toast.success('Income updated.')
      } else {
        await apiClient.createIncome(payload)
        toast.success('Income added.')
      }
      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadData()
    } catch (err) {
      toast.error(err?.message || 'Failed to save income.')
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ message: 'Delete this income record?' })
    if (!ok) return
    try {
      await apiClient.deleteIncome(id)
      toast.success('Income deleted.')
      loadData()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete.')
    }
  }

  // ── Date range filter helper ────────────────────────────────────────────
  const matchesDateRange = (dateStr) => {
    if (!dateRange.from && !dateRange.to) return true
    if (!dateStr) return false
    const d = startOfDay(parseISO(dateStr.split('T')[0]))
    const from = dateRange.from ? startOfDay(dateRange.from) : null
    const to = dateRange.to ? endOfDay(dateRange.to) : null
    if (from && to) return isWithinInterval(d, { start: from, end: to })
    if (from) return d >= from
    return true
  }

  // ── Derived data ────────────────────────────────────────────────────────
  // Fee rows formatted for display
  const feeRows = collectedFees
    .filter((f) => {
      const name = `${f.student?.firstName || ''} ${f.student?.lastName || ''}`.toLowerCase()
      const q = searchQuery.toLowerCase()
      return (name.includes(q) || (f.feeType || '').toLowerCase().includes(q)) && matchesDateRange(f.paidDate || f.updatedAt)
    })
    .map((f) => ({
      id: `fee-${f.id}`,
      _type: 'fee',
      title: `${f.feeType ? f.feeType.charAt(0).toUpperCase() + f.feeType.slice(1) : 'Fee'} — ${f.student ? `${f.student.firstName} ${f.student.lastName}` : 'Student'}`,
      category: 'Fee Collection',
      amount: f.paidAmount || f.amount || 0,
      date: f.paidDate || f.updatedAt,
      receivedFrom: f.student ? `${f.student.firstName} ${f.student.lastName}` : '',
      paymentMode: f.paymentMode || '-',
      receiptNo: f.receiptNo || '-',
      status: f.status,
    }))

  const otherIncomeRows = incomes
    .filter((i) => {
      const q = searchQuery.toLowerCase()
      return (
        ((i.title || '').toLowerCase().includes(q) ||
          (i.category || '').toLowerCase().includes(q) ||
          (i.receivedFrom || '').toLowerCase().includes(q)) &&
        matchesDateRange(i.date)
      )
    })
    .map((i) => ({ ...i, _type: 'income' }))

  const allRows = activeTab === 'fees'
    ? feeRows
    : activeTab === 'other'
    ? otherIncomeRows
    : [...feeRows, ...otherIncomeRows].sort((a, b) => new Date(b.date) - new Date(a.date))

  // Summary totals
  const totalFeeCollection = collectedFees.reduce((s, f) => s + (f.paidAmount || f.amount || 0), 0)
  const totalOtherIncome = incomes.reduce((s, i) => s + (i.amount || 0), 0)
  const grandTotal = totalFeeCollection + totalOtherIncome
  const filteredTotal = allRows.reduce((s, r) => s + (r.amount || 0), 0)

  // ── Category breakdown ─────────────────────────────────────────────────
  const incomeCategoryBreakdown = Object.entries(
    allRows.reduce((acc, r) => {
      const cat = r.category || 'Uncategorized'
      if (!acc[cat]) acc[cat] = { count: 0, total: 0 }
      acc[cat].count++
      acc[cat].total += r.amount || 0
      return acc
    }, {})
  ).sort((a, b) => b[1].total - a[1].total)

  const downloadIncomeCategoryPDF = () => {
    const doc = new jsPDF()
    const pageW = doc.internal.pageSize.getWidth()
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74)
    doc.text('Income Category Report', 14, 16)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
    doc.text(`Filter: ${buildFilterLabel()}`, 14, 24)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageW - 14, 24, { align: 'right' })
    autoTable(doc, {
      head: [['Category', 'No. of Records', 'Total Amount (Rs.)']],
      body: [
        ...incomeCategoryBreakdown.map(([cat, { count, total }]) => [
          cat.charAt(0).toUpperCase() + cat.slice(1),
          String(count),
          `Rs.${total.toLocaleString('en-IN')}`,
        ]),
        ['GRAND TOTAL', String(allRows.length), `Rs.${filteredTotal.toLocaleString('en-IN')}`],
      ],
      startY: 30,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      didParseCell: (data) => {
        if (data.row.index === incomeCategoryBreakdown.length) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [187, 247, 208]
          data.cell.styles.textColor = [22, 101, 52]
        }
      },
      margin: { left: 14, right: 14 },
    })
    doc.save(`Income_Category_Report_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const { paginatedItems, currentPage, totalPages, totalItems, goToPage } = usePagination(allRows)

  // ── Export helpers ──────────────────────────────────────────────────────
  const buildFilterLabel = () => {
    const parts = []
    if (dateRange.from && dateRange.to) parts.push(`${format(dateRange.from, 'dd MMM yyyy')} – ${format(dateRange.to, 'dd MMM yyyy')}`)
    else if (dateRange.from) parts.push(`From ${format(dateRange.from, 'dd MMM yyyy')}`)
    if (searchQuery) parts.push(`Search: "${searchQuery}"`)
    const tabLabel = activeTab === 'fees' ? 'Fee Collection Only' : activeTab === 'other' ? 'Other Income Only' : 'All Income'
    return [tabLabel, ...parts].join('  |  ')
  }

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    const pageW = doc.internal.pageSize.getWidth()
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74)
    doc.text('School Income Report', 14, 16)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
    doc.text(`Filter: ${buildFilterLabel()}`, 14, 24)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageW - 14, 24, { align: 'right' })
    const summaries = [
      { label: 'Fee Collection', value: `₹${totalFeeCollection.toLocaleString('en-IN')}`, color: [37, 99, 235] },
      { label: 'Other Income', value: `₹${totalOtherIncome.toLocaleString('en-IN')}`, color: [16, 185, 129] },
      { label: 'Grand Total', value: `₹${grandTotal.toLocaleString('en-IN')}`, color: [22, 163, 74] },
    ]
    const sumY = 30; const boxW = 60, boxH = 12, gap = 6
    summaries.forEach(({ label, value, color }, i) => {
      const x = 14 + i * (boxW + gap)
      doc.setFillColor(...color); doc.roundedRect(x, sumY, boxW, boxH, 2, 2, 'F')
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(255, 255, 255)
      doc.text(label, x + boxW / 2, sumY + 4, { align: 'center' })
      doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text(value, x + boxW / 2, sumY + 9.5, { align: 'center' })
    })
    autoTable(doc, {
      head: [['Title', 'Category', 'Amount (₹)', 'Date', 'Received From', 'Payment Mode', 'Status']],
      body: allRows.map((r) => [
        r.title,
        r.category,
        (r.amount || 0).toLocaleString('en-IN'),
        r.date ? new Date(r.date).toLocaleDateString('en-IN') : '-',
        r.receivedFrom || '-',
        r.paymentMode || '-',
        r.status || '-',
      ]),
      startY: sumY + boxH + 5,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { left: 14, right: 14 },
    })
    doc.save(`Income_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const handleExportCSV = () => {
    const headers = ['Title', 'Category', 'Amount', 'Date', 'Received From', 'Payment Mode', 'Status']
    const rows = allRows.map((r) => [
      r.title, r.category, r.amount || 0,
      r.date ? new Date(r.date).toLocaleDateString('en-IN') : '-',
      r.receivedFrom || '-', r.paymentMode || '-', r.status || '-',
    ])
    const csv = [
      [`School Income Report`],
      [`Filter: ${buildFilterLabel()}`],
      [`Generated: ${new Date().toLocaleDateString('en-IN')}`],
      [],
      headers,
      ...rows,
      [],
      ['TOTAL', '', filteredTotal.toLocaleString('en-IN')],
    ].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `Income_${new Date().toISOString().slice(0, 10)}.csv`
    link.click(); URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>School Income Report</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px}
        h2{color:#16a34a;margin-bottom:4px}
        .meta{font-size:12px;color:#64748b;margin-bottom:10px}
        .summary{display:flex;gap:12px;margin-bottom:14px}
        .sbox{padding:8px 16px;border-radius:6px;font-size:12px;text-align:center}
        .sbox b{display:block;font-size:15px}
        .fee{background:#eff6ff;color:#2563eb}
        .other{background:#d1fae5;color:#065f46}
        .total{background:#f0fdf4;color:#16a34a}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
        th{background:#16a34a;color:#fff;font-weight:600}
        tr:nth-child(even){background:#f8fafc}
        .fee-row td:first-child{border-left:3px solid #2563eb}
        .other-row td:first-child{border-left:3px solid #16a34a}
      </style></head><body>
      <h2>School Income Report</h2>
      <div class="meta">Filter: ${buildFilterLabel()} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-IN')}</div>
      <div class="summary">
        <div class="sbox fee"><span>Fee Collection</span><b>₹${totalFeeCollection.toLocaleString('en-IN')}</b></div>
        <div class="sbox other"><span>Other Income</span><b>₹${totalOtherIncome.toLocaleString('en-IN')}</b></div>
        <div class="sbox total"><span>Grand Total</span><b>₹${grandTotal.toLocaleString('en-IN')}</b></div>
      </div>
      <table>
        <thead><tr><th>Title</th><th>Category</th><th>Amount (₹)</th><th>Date</th><th>Received From</th><th>Payment Mode</th><th>Status</th></tr></thead>
        <tbody>
          ${allRows.map((r) => `
            <tr class="${r._type === 'fee' ? 'fee-row' : 'other-row'}">
              <td>${r.title}</td><td>${r.category}</td>
              <td style="font-weight:600">₹${(r.amount || 0).toLocaleString('en-IN')}</td>
              <td>${r.date ? new Date(r.date).toLocaleDateString('en-IN') : '-'}</td>
              <td>${r.receivedFrom || '-'}</td><td>${r.paymentMode || '-'}</td><td>${r.status || '-'}</td>
            </tr>`).join('')}
          <tr style="font-weight:bold;background:#f0fdf4;color:#16a34a">
            <td>TOTAL</td><td></td><td>₹${filteredTotal.toLocaleString('en-IN')}</td><td colspan="4"></td>
          </tr>
        </tbody>
      </table>
      </body></html>
    `)
    win.document.close(); win.print()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Income</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
            Total: ₹{grandTotal.toLocaleString('en-IN')}
          </span>
          <button style={exportButtonStyle} onClick={handleExportCSV} title="Export CSV">📄 CSV</button>
          <button style={exportButtonStyle} onClick={handleExportPDF} title="Export PDF">📥 PDF</button>
          <button style={exportButtonStyle} onClick={handlePrint} title="Print"><Printer size={16} /> Print</button>
          <button className="btn primary" onClick={handleAddNew}>+ Add Income</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1, minWidth: '160px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600, marginBottom: '0.25rem' }}>💰 Fee Collection</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e40af' }}>₹{totalFeeCollection.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>{collectedFees.length} paid records</div>
        </div>
        <div style={{ flex: 1, minWidth: '160px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, marginBottom: '0.25rem' }}>📥 Other Income</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>₹{totalOtherIncome.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>{incomes.length} entries</div>
        </div>
        <div style={{ flex: 1, minWidth: '160px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #86efac', borderRadius: '10px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600, marginBottom: '0.25rem' }}>🏦 Grand Total</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#14532d' }}>₹{grandTotal.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>{collectedFees.length + incomes.length} total records</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        {[
          { key: 'all', label: '📋 All Income' },
          { key: 'fees', label: '💰 Fee Collection' },
          { key: 'other', label: '📥 Other Income' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem',
              background: activeTab === t.key ? '#16a34a' : 'transparent',
              color: activeTab === t.key ? '#fff' : '#6b7280',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by title, category, received from…" />
        </div>
        <div ref={datePickerRef} style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${(dateRange.from || dateRange.to) ? '#86efac' : '#e2e8f0'}`, borderRadius: '8px', background: (dateRange.from || dateRange.to) ? '#f0fdf4' : '#fff', overflow: 'hidden' }}>
            <button
              onClick={() => setShowDatePicker((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.68rem 0.75rem', border: 'none', background: 'transparent',
                fontSize: '0.9rem', cursor: 'pointer',
                color: (dateRange.from || dateRange.to) ? '#16a34a' : '#1e293b',
                fontWeight: (dateRange.from || dateRange.to) ? 600 : 400, whiteSpace: 'nowrap',
              }}
            >
              <CalendarRange size={16} />
              {dateRange.from && dateRange.to
                ? `${format(dateRange.from, 'dd MMM')} – ${format(dateRange.to, 'dd MMM yyyy')}`
                : dateRange.from ? `From ${format(dateRange.from, 'dd MMM yyyy')}` : 'Date Range'}
            </button>
            {(dateRange.from || dateRange.to) && (
              <button
                onClick={(e) => { e.stopPropagation(); setDateRange({ from: undefined, to: undefined }); setShowDatePicker(false) }}
                style={{ display: 'flex', alignItems: 'center', padding: '0.68rem 0.5rem 0.68rem 0', border: 'none', background: 'transparent', cursor: 'pointer', color: '#16a34a' }}
              ><X size={14} /></button>
            )}
          </div>
          {showDatePicker && (
            <div style={{ position: 'absolute', top: 'calc(100% - 1.4rem)', right: 0, zIndex: 1000, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.12)', padding: '0.75rem' }}>
              <DayPicker
                mode="range"
                selected={dateRange}
                onSelect={(r) => {
                  setDateRange(r || { from: undefined, to: undefined })
                  if (r?.from && r?.to) setShowDatePicker(false)
                }}
                numberOfMonths={2}
                footer={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', marginTop: '0.5rem' }}>
                    <button onClick={() => { setDateRange({ from: undefined, to: undefined }); setShowDatePicker(false) }} style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', background: '#fff' }}>Clear</button>
                    <button onClick={() => setShowDatePicker(false)} style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', border: 'none', borderRadius: '6px', cursor: 'pointer', background: '#16a34a', color: '#fff' }}>Done</button>
                  </div>
                }
              />
            </div>
          )}
        </div>
        <button onClick={downloadIncomeCategoryPDF} style={exportButtonStyle} title="Download Category Report">📊 Category Report</button>
      </div>

      <div className="page-content-scrollable">
        {/* Add/Edit Income Modal */}
        {showForm && (
          <Modal
            title={editingId ? 'Edit Income' : 'Add Other Income'}
            onClose={() => setShowForm(false)}
            footer={<button type="submit" form="income-form" className="btn primary">{editingId ? 'Update' : 'Add Income'}</button>}
          >
            <form id="income-form" onSubmit={handleSubmit} className="form-grid">
              <label>
                <span className="field-label">Title *</span>
                <input type="text" placeholder="Income title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </label>
              <label>
                <span className="field-label">Category</span>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  {INCOME_CATEGORIES.filter((c) => c.value !== 'fee_collection').map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">Amount (₹) *</span>
                <input type="number" placeholder="Amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required min="0" step="0.01" />
              </label>
              <label>
                <span className="field-label">Date *</span>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </label>
              <label>
                <span className="field-label">Received From</span>
                <input type="text" placeholder="Donor / Source" value={formData.receivedFrom} onChange={(e) => setFormData({ ...formData, receivedFrom: e.target.value })} />
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
                <span className="field-label">Receipt No.</span>
                <input type="text" placeholder="Receipt No." value={formData.receiptNo} onChange={(e) => setFormData({ ...formData, receiptNo: e.target.value })} />
              </label>
              <label>
                <span className="field-label">Status</span>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="received">Received</option>
                  <option value="pending">Pending</option>
                </select>
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span className="field-label">Notes</span>
                <textarea rows={2} placeholder="Notes / Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </label>
            </form>
          </Modal>
        )}

        {loading ? (
          <div className="loading-state">Loading income data…</div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount (₹)</th>
                  <th>Date</th>
                  <th>Received From</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allRows.length === 0 ? (
                  <tr><td colSpan={8} className="empty-row">No income records found.</td></tr>
                ) : (
                  paginatedItems.map((row) => (
                    <tr key={row.id} style={{ borderLeft: row._type === 'fee' ? '3px solid #2563eb' : '3px solid #16a34a' }}>
                      <td style={{ fontWeight: 500 }}>{row.title}</td>
                      <td style={{ textTransform: 'capitalize' }}>{row.category}</td>
                      <td style={{ fontWeight: 700, color: '#166534' }}>₹{(row.amount || 0).toLocaleString('en-IN')}</td>
                      <td>{row.date ? new Date(row.date).toLocaleDateString('en-IN') : '-'}</td>
                      <td>{row.receivedFrom || '-'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{row.paymentMode || '-'}</td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                          background: row._type === 'fee' ? (row.status === 'paid' ? '#d1fae5' : '#fef3c7') : '#d1fae5',
                          color: row._type === 'fee' ? (row.status === 'paid' ? '#065f46' : '#92400e') : '#065f46',
                        }}>{row._type === 'fee' ? row.status : 'received'}</span>
                      </td>
                      <td>
                        {row._type === 'income' ? (
                            <>
                              <button className="btn-icon" onClick={() => downloadIncomeReceipt(row)} title="Download Receipt" style={{ color: '#7c3aed' }}><FileDown size={16} /></button>
                              {canEditIncome && <button className="btn-icon edit" onClick={() => handleEdit(row)} title="Edit"><SquarePen size={16} /></button>}
                              {canDeleteIncome && <button className="btn-icon danger" onClick={() => handleDelete(row.id)} title="Delete"><Trash2 size={16} /></button>}
                              {/* {!canEditIncome && !canDeleteIncome && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>View only</span>} */}
                            </>
                          ) : (
                            <button className="btn-icon" onClick={() => downloadIncomeReceipt(row)} title="Download Receipt" style={{ color: '#7c3aed' }}><FileDown size={16} /></button>
                          )}
                        </td>
                    </tr>
                  ))
                )}
              </tbody>
              {allRows.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700, background: '#f0fdf4', color: '#166534' }}>
                    <td>TOTAL ({allRows.length} records)</td>
                    <td></td>
                    <td>₹{filteredTotal.toLocaleString('en-IN')}</td>
                    <td colSpan={5}></td>
                  </tr>
                </tfoot>
              )}
            </table>
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={goToPage} />
          </div>
        )}
      </div>
    </div>
  )
}

export default IncomePage
