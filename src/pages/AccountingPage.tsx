// @ts-nocheck
import { useEffect, useState, useMemo, useRef } from 'react'
import { Plus, Trash2, FileDown, X, ChevronDown, ChevronRight, CalendarRange } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { format, startOfDay, endOfDay } from 'date-fns'
import 'react-day-picker/dist/style.css'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import { useAppSelector } from '@/store'
import { exportButtonStyle } from '@/utils/exportUtils'

const MONTHS_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const VOUCHER_TYPES = ['receipt', 'payment', 'journal', 'contra']
const VOUCHER_LABELS = { receipt: '💚 Receipt', payment: '🔴 Payment', journal: '🔵 Journal', contra: '🔄 Contra' }
const VOUCHER_COLORS = {
  receipt: { bg: '#d1fae5', color: '#065f46' },
  payment: { bg: '#fee2e2', color: '#991b1b' },
  journal: { bg: '#dbeafe', color: '#1d4ed8' },
  contra:  { bg: '#fef3c7', color: '#92400e' },
}
const VOUCHER_HINTS = {
  receipt: '💚 Fee/Income received → Debit: Cash or Bank  |  Credit: Income Ledger (e.g. Student Fee Income)',
  payment: '🔴 Expense paid → Debit: Expense Ledger (e.g. Electricity Expense)  |  Credit: Cash or Bank',
  journal: '🔵 Adjustment/Provision → Debit and Credit any ledgers with equal totals',
  contra:  '🔄 Cash ↔ Bank transfer → Debit the receiving account  |  Credit the paying account',
}
const LEDGER_CFG = {
  income:    { bg: '#d1fae5', color: '#065f46', icon: '📈' },
  expense:   { bg: '#fee2e2', color: '#991b1b', icon: '📉' },
  asset:     { bg: '#dbeafe', color: '#1d4ed8', icon: '🏦' },
  liability: { bg: '#fef3c7', color: '#92400e', icon: '⚖️' },
}
const EMPTY_ENTRY = { ledgerId: '', type: 'debit', amount: '' }

const AccountingPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const isSuperAdmin = useAppSelector((s) => s.auth.role) === 'super-admin'
  const userEmail = useAppSelector((s) => s.auth.user?.email) || ''

  const [activeTab, setActiveTab] = useState('ledgers')
  const [ledgers, setLedgers] = useState([])
  const [vouchers, setVouchers] = useState([])
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)

  const [qIncomes, setQIncomes] = useState([])
  const [qFees, setQFees] = useState([])
  const [qExpenses, setQExpenses] = useState([])
  const [plYear, setPlYear] = useState(new Date().getFullYear())
  const [schoolName, setSchoolName] = useState('School')

  const [dbDateRange, setDbDateRange] = useState({ from: undefined, to: undefined })
  const [showDbDatePicker, setShowDbDatePicker] = useState(false)
  const dbDatePickerRef = useRef(null)
  const [dbType, setDbType] = useState('')
  const [expandedRows, setExpandedRows] = useState(new Set())

  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [vForm, setVForm] = useState({ voucherType: 'receipt', date: new Date().toISOString().slice(0, 10), narration: '', entries: [{ ...EMPTY_ENTRY }, { ...EMPTY_ENTRY }] })
  const [saving, setSaving] = useState(false)

  const [showLedgerModal, setShowLedgerModal] = useState(false)
  const [lForm, setLForm] = useState({ name: '', type: 'income', group: '', openingBalance: 0, description: '' })
  const [editLedgerId, setEditLedgerId] = useState(null)

  useEffect(() => { loadAll() }, [])
  useEffect(() => {
    if (activeTab === 'ledgers' || activeTab === 'balance') loadBalances()
  }, [activeTab])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [lRes, vRes, iRes, fRes, eRes, sRes] = await Promise.all([
        apiClient.listLedgers(),
        apiClient.listVouchers(),
        apiClient.listIncomes(),
        apiClient.listFees(),
        apiClient.listExpenses(),
        apiClient.listSchools().catch(() => ({ data: [] })),
      ])
      setLedgers(lRes?.data || [])
      setVouchers(vRes?.data || [])
      setQIncomes(iRes?.data || [])
      setQFees((fRes?.data || []).filter((f) => f.status === 'paid' || f.status === 'partial'))
      setQExpenses(eRes?.data || [])
      const s = Array.isArray(sRes) ? sRes[0] : sRes?.data?.[0]
      if (s?.name) setSchoolName(s.name)
    } catch { toast.error('Failed to load accounting data.') }
    finally { setLoading(false) }
  }

  const loadBalances = async () => {
    try { const res = await apiClient.getLedgerBalances(); setBalances(res?.data || []) } catch {}
  }

  const handleSeedLedgers = async () => {
    try {
      const res = await apiClient.seedLedgers()
      toast.success(res?.message || 'Default ledgers seeded.')
      const lRes = await apiClient.listLedgers()
      setLedgers(lRes?.data || [])
      loadBalances()
    } catch (err) { toast.error(err?.message || 'Failed to seed.') }
  }

  const handleSaveLedger = async () => {
    if (!lForm.name.trim()) { toast.error('Ledger name is required.'); return }
    setSaving(true)
    try {
      if (editLedgerId) { await apiClient.updateLedger(editLedgerId, lForm); toast.success('Ledger updated.') }
      else { await apiClient.createLedger(lForm); toast.success('Ledger created.') }
      setShowLedgerModal(false)
      const lRes = await apiClient.listLedgers()
      setLedgers(lRes?.data || [])
    } catch (err) { toast.error(err?.response?.data?.error || err?.message || 'Failed.') }
    finally { setSaving(false) }
  }

  const handleDeleteLedger = async (id) => {
    const ok = await confirm({ message: 'Delete this ledger? This cannot be undone.' })
    if (!ok) return
    try {
      await apiClient.deleteLedger(id); toast.success('Ledger deleted.')
      const lRes = await apiClient.listLedgers(); setLedgers(lRes?.data || [])
    } catch (err) { toast.error(err?.response?.data?.error || 'Cannot delete — may have transactions.') }
  }

  const setEntry = (idx, field, value) => setVForm((prev) => { const e = [...prev.entries]; e[idx] = { ...e[idx], [field]: value }; return { ...prev, entries: e } })
  const addEntry = () => setVForm((prev) => ({ ...prev, entries: [...prev.entries, { ...EMPTY_ENTRY }] }))
  const removeEntry = (idx) => setVForm((prev) => ({ ...prev, entries: prev.entries.filter((_, i) => i !== idx) }))

  const totalDebit = vForm.entries.filter((e) => e.type === 'debit').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const totalCredit = vForm.entries.filter((e) => e.type === 'credit').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0

  const handleSaveVoucher = async () => {
    if (!isBalanced) { toast.error('Debit and Credit totals must be equal and non-zero.'); return }
    if (vForm.entries.some((e) => !e.ledgerId || !e.amount)) { toast.error('All rows must have a ledger and amount.'); return }
    setSaving(true)
    try {
      await apiClient.createVoucher({ ...vForm, entries: vForm.entries.map((e) => ({ ledgerId: parseInt(e.ledgerId), type: e.type, amount: parseFloat(e.amount) })), createdBy: userEmail })
      toast.success('Voucher posted.')
      setShowVoucherModal(false)
      const vRes = await apiClient.listVouchers(); setVouchers(vRes?.data || [])
      loadBalances()
    } catch (err) { toast.error(err?.response?.data?.error || err?.message || 'Failed.') }
    finally { setSaving(false) }
  }

  const handleDeleteVoucher = async (id) => {
    const ok = await confirm({ message: 'Delete this voucher? This will reverse the accounting entry.' })
    if (!ok) return
    try {
      await apiClient.deleteVoucher(id); toast.success('Voucher deleted.')
      const vRes = await apiClient.listVouchers(); setVouchers(vRes?.data || [])
      loadBalances()
    } catch (err) { toast.error(err?.message || 'Failed.') }
  }

  const toggleRow = (id) => setExpandedRows((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const filteredVouchers = useMemo(() => vouchers.filter((v) => {
    if (dbType && v.voucherType !== dbType) return false
    if (dbDateRange.from && new Date(v.date) < startOfDay(dbDateRange.from)) return false
    if (dbDateRange.to && new Date(v.date) > endOfDay(dbDateRange.to)) return false
    return true
  }), [vouchers, dbType, dbDateRange])

  const balanceMap = useMemo(() => { const m = {}; balances.forEach((b) => { m[b.ledger.id] = b }); return m }, [balances])

  const getYear = (d) => (d ? new Date(d.split('T')[0]).getFullYear() : -1)
  const getMonth = (d) => (d ? new Date(d.split('T')[0]).getMonth() : -1)
  const yearFees = qFees.filter((f) => getYear(f.paidDate || f.updatedAt) === plYear)
  const yearIncomes = qIncomes.filter((i) => getYear(i.date) === plYear)
  const yearExpenses = qExpenses.filter((e) => getYear(e.date) === plYear)
  const totalFeeIncome = yearFees.reduce((s, f) => s + (f.paidAmount || f.amount || 0), 0)
  const totalOtherIncome = yearIncomes.reduce((s, i) => s + (i.amount || 0), 0)
  const totalIncome = totalFeeIncome + totalOtherIncome
  const totalExpenses = yearExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const netPL = totalIncome - totalExpenses
  const expByCat = Object.entries(yearExpenses.reduce((acc, e) => { const c = e.category || 'Other'; acc[c] = (acc[c] || 0) + (e.amount || 0); return acc }, {})).sort((a, b) => b[1] - a[1])
  const monthlyPL = MONTHS_FULL.map((label, i) => {
    const mFees = yearFees.filter((f) => getMonth(f.paidDate || f.updatedAt) === i).reduce((s, f) => s + (f.paidAmount || f.amount || 0), 0)
    const mInc = yearIncomes.filter((x) => getMonth(x.date) === i).reduce((s, x) => s + (x.amount || 0), 0)
    const mExp = yearExpenses.filter((x) => getMonth(x.date) === i).reduce((s, x) => s + (x.amount || 0), 0)
    return { label, income: mFees + mInc, expense: mExp, net: mFees + mInc - mExp }
  })

  const bsAssets = balances.filter((b) => b.ledger.type === 'asset')
  const bsIncome = balances.filter((b) => b.ledger.type === 'income')
  const bsExpense = balances.filter((b) => b.ledger.type === 'expense')
  const bsLiability = balances.filter((b) => b.ledger.type === 'liability')
  const totalAssetsV = bsAssets.reduce((s, b) => s + Math.max(b.debit - b.credit, 0), 0)
  const totalLiabV = bsLiability.reduce((s, b) => s + Math.max(b.credit - b.debit, 0), 0)
  const surplusV = bsIncome.reduce((s, b) => s + Math.max(b.credit - b.debit, 0), 0) - bsExpense.reduce((s, b) => s + Math.max(b.debit - b.credit, 0), 0)

  const exportPLPdf = () => {
    const doc = new jsPDF()
    const pw = doc.internal.pageSize.getWidth()
    doc.setFillColor(30, 64, 175); doc.rect(0, 0, pw, 28, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    doc.text(`${schoolName} — Profit & Loss`, pw / 2, 11, { align: 'center' })
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
    doc.text(`Financial Year: ${plYear}–${plYear + 1}   |   Generated: ${new Date().toLocaleDateString('en-IN')}`, pw / 2, 20, { align: 'center' })
    autoTable(doc, {
      head: [['INCOME', 'Amount (Rs.)']],
      body: [['Fee Collection', `Rs. ${totalFeeIncome.toLocaleString('en-IN')}`], ['Other Income', `Rs. ${totalOtherIncome.toLocaleString('en-IN')}`], ['TOTAL INCOME', `Rs. ${totalIncome.toLocaleString('en-IN')}`]],
      startY: 34, headStyles: { fillColor: [22, 163, 74], textColor: 255 }, columnStyles: { 1: { halign: 'right' } },
      didParseCell: (d) => { if (d.row.index === 2) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [220, 252, 231] } },
    })
    autoTable(doc, {
      head: [['EXPENSES', 'Amount (Rs.)']],
      body: [...expByCat.map(([c, a]) => [c, `Rs. ${a.toLocaleString('en-IN')}`]), ['TOTAL EXPENSES', `Rs. ${totalExpenses.toLocaleString('en-IN')}`]],
      startY: doc.lastAutoTable.finalY + 8, headStyles: { fillColor: [220, 38, 38], textColor: 255 }, columnStyles: { 1: { halign: 'right' } },
      didParseCell: (d) => { if (d.row.index === expByCat.length) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [254, 226, 226] } },
    })
    autoTable(doc, {
      body: [[netPL >= 0 ? 'NET PROFIT' : 'NET LOSS', `Rs. ${Math.abs(netPL).toLocaleString('en-IN')}`]],
      startY: doc.lastAutoTable.finalY + 6,
      bodyStyles: { fillColor: netPL >= 0 ? [22, 163, 74] : [220, 38, 38], textColor: 255, fontStyle: 'bold', fontSize: 11 },
      columnStyles: { 1: { halign: 'right' } },
    })
    autoTable(doc, {
      head: [['Month', 'Income (Rs.)', 'Expenses (Rs.)', 'Net (Rs.)']],
      body: monthlyPL.map((m) => [m.label, `Rs. ${m.income.toLocaleString('en-IN')}`, `Rs. ${m.expense.toLocaleString('en-IN')}`, `${m.net >= 0 ? '+' : ''}Rs. ${m.net.toLocaleString('en-IN')}`]),
      startY: doc.lastAutoTable.finalY + 10, headStyles: { fillColor: [71, 85, 105], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] }, columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }, styles: { fontSize: 8 },
    })
    doc.save(`PL_${schoolName.replace(/ /g, '_')}_FY${plYear}.pdf`)
  }

  const tabs = [{ key: 'ledgers', label: '📒 Ledgers' }, { key: 'daybook', label: '📋 Day Book' }, { key: 'pl', label: '📊 P&L' }, { key: 'balance', label: '⚖️ Balance Sheet' }]
  const inputSty = { width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box' }

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏦 Accounting</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {activeTab === 'pl' && (
            <>
              <select value={plYear} onChange={(e) => setPlYear(Number(e.target.value))} style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>FY {y}–{y + 1}</option>)}
              </select>
              <button style={exportButtonStyle} onClick={exportPLPdf}>📥 Export P&L PDF</button>
            </>
          )}
          {activeTab === 'daybook' && isSuperAdmin && (
            <button className="btn primary" onClick={() => { setVForm({ voucherType: 'receipt', date: new Date().toISOString().slice(0, 10), narration: '', entries: [{ ...EMPTY_ENTRY }, { ...EMPTY_ENTRY }] }); setShowVoucherModal(true) }}>
              <Plus size={15} style={{ marginRight: 4 }} /> New Voucher
            </button>
          )}
          {activeTab === 'ledgers' && isSuperAdmin && (
            <button className="btn primary" onClick={() => { setEditLedgerId(null); setLForm({ name: '', type: 'income', group: '', openingBalance: 0, description: '' }); setShowLedgerModal(true) }}>
              <Plus size={15} style={{ marginRight: 4 }} /> Add Ledger
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1rem', paddingBottom: '0.4rem', flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '0.4rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', background: activeTab === t.key ? '#1e40af' : 'transparent', color: activeTab === t.key ? '#fff' : '#6b7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="page-content-scrollable">
        {loading ? <div className="loading-state">Loading accounting data…</div> : (
          <>
            {/* ══ LEDGERS ══ */}
            {activeTab === 'ledgers' && (
              <>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  {['asset', 'income', 'expense', 'liability'].map((type) => {
                    const items = ledgers.filter((l) => l.type === type); const cfg = LEDGER_CFG[type]
                    return (
                      <div key={type} style={{ flex: 1, minWidth: 130, background: cfg.bg, border: `1px solid ${cfg.color}44`, borderRadius: 10, padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: cfg.color }}>{cfg.icon} {type.toUpperCase()}S</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: cfg.color }}>{items.length}</div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>ledger accounts</div>
                      </div>
                    )
                  })}
                </div>
                {ledgers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '3rem' }}>📒</div>
                    <p style={{ fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>No ledgers yet</p>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>Seed the default chart of accounts (Cash, Bank, Fee Income, Salary Expense, etc.)</p>
                    {isSuperAdmin && <button className="btn primary" onClick={handleSeedLedgers}>⚡ Seed Default Ledgers</button>}
                  </div>
                ) : (
                  <>
                    {isSuperAdmin && <div style={{ marginBottom: '0.75rem' }}><button onClick={handleSeedLedgers} style={{ ...exportButtonStyle, fontSize: '0.8rem' }}>♻️ Add Missing Default Ledgers</button></div>}
                    <div className="data-table">
                      <table>
                        <thead><tr><th>Ledger Name</th><th>Type</th><th>Group</th><th style={{ textAlign: 'right' }}>Opening (₹)</th><th style={{ textAlign: 'right' }}>Debit (₹)</th><th style={{ textAlign: 'right' }}>Credit (₹)</th><th style={{ textAlign: 'right' }}>Balance</th><th></th></tr></thead>
                        <tbody>
                          {ledgers.map((l) => {
                            const b = balanceMap[l.id]; const cfg = LEDGER_CFG[l.type] || {}
                            const isAsset = l.type === 'asset'
                            const balance = b ? (isAsset ? (b.debit - b.credit) + (l.openingBalance || 0) : (b.credit - b.debit) + (l.openingBalance || 0)) : (l.openingBalance || 0)
                            return (
                              <tr key={l.id}>
                                <td><div style={{ fontWeight: 500 }}>{l.name}</div>{l.isSystem && <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>system</div>}</td>
                                <td><span style={{ background: cfg.bg, color: cfg.color, padding: '0.15rem 0.4rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>{cfg.icon} {l.type}</span></td>
                                <td style={{ fontSize: '0.82rem', color: '#6b7280' }}>{l.group || '—'}</td>
                                <td style={{ textAlign: 'right', fontSize: '0.85rem' }}>₹{(l.openingBalance || 0).toLocaleString('en-IN')}</td>
                                <td style={{ textAlign: 'right', color: '#16a34a', fontSize: '0.85rem' }}>₹{(b?.debit || 0).toLocaleString('en-IN')}</td>
                                <td style={{ textAlign: 'right', color: '#dc2626', fontSize: '0.85rem' }}>₹{(b?.credit || 0).toLocaleString('en-IN')}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: balance >= 0 ? '#166534' : '#991b1b' }}>₹{Math.abs(balance).toLocaleString('en-IN')}{balance < 0 && <span style={{ fontSize: '0.7rem', marginLeft: 2 }}>(Cr)</span>}</td>
                                <td>{!l.isSystem && isSuperAdmin && (<><button className="btn-icon edit" title="Edit" onClick={() => { setEditLedgerId(l.id); setLForm({ name: l.name, type: l.type, group: l.group || '', openingBalance: l.openingBalance || 0, description: l.description || '' }); setShowLedgerModal(true) }}>✏️</button><button className="btn-icon danger" title="Delete" onClick={() => handleDeleteLedger(l.id)}><Trash2 size={14} /></button></>)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ══ DAY BOOK ══ */}
            {activeTab === 'daybook' && (
              <>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                  {/* Date Range Picker */}
                  <div ref={dbDatePickerRef} style={{ position: 'relative', paddingBottom: '1.5rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Select Dates</label>
                    <button
                      onClick={() => setShowDbDatePicker((v) => !v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.5rem 1rem', border: '1px solid', borderRadius: '8px', fontSize: '0.875rem', cursor: 'pointer',
                        background: (dbDateRange.from || dbDateRange.to) ? '#f0fdf4' : '#fff',
                        color: (dbDateRange.from || dbDateRange.to) ? '#16a34a' : '#1e293b',
                        borderColor: (dbDateRange.from || dbDateRange.to) ? '#86efac' : '#e2e8f0',
                        fontWeight: (dbDateRange.from || dbDateRange.to) ? 600 : 400, whiteSpace: 'nowrap',
                      }}
                    >
                      <CalendarRange size={15} />
                      {dbDateRange.from && dbDateRange.to
                        ? `${format(dbDateRange.from, 'dd MMM')} – ${format(dbDateRange.to, 'dd MMM yyyy')}`
                        : dbDateRange.from ? `From ${format(dbDateRange.from, 'dd MMM yyyy')}` : 'Date Range'}
                    </button>
                    {showDbDatePicker && (
                      <div style={{ position: 'absolute', top: 'calc(100% - 1.4rem)', left: 0, zIndex: 1000, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.12)', padding: '0.75rem' }}>
                        <DayPicker
                          mode="range"
                          selected={dbDateRange}
                          onSelect={(r) => {
                            setDbDateRange(r || { from: undefined, to: undefined })
                            if (r?.from && r?.to) setShowDbDatePicker(false)
                          }}
                          numberOfMonths={2}
                          footer={
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', marginTop: '0.5rem' }}>
                              <button onClick={() => { setDbDateRange({ from: undefined, to: undefined }); setShowDbDatePicker(false) }} style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', background: '#fff' }}>Clear</button>
                              <button onClick={() => setShowDbDatePicker(false)} style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', border: 'none', borderRadius: '6px', cursor: 'pointer', background: '#16a34a', color: '#fff' }}>Done</button>
                            </div>
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Type filter */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Type</label>
                    <select value={dbType} onChange={(e) => setDbType(e.target.value)} style={{ padding: '0.5rem 0.6rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.875rem' }}>
                      <option value="">All Types</option>
                      {VOUCHER_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>

                  {(dbDateRange.from || dbDateRange.to || dbType) && (
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'transparent', display: 'block', marginBottom: 3 }}>_</label>
                      <button onClick={() => { setDbDateRange({ from: undefined, to: undefined }); setDbType('') }} style={{ padding: '0.5rem 0.8rem', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '0.8rem' }}>✕ Clear</button>
                    </div>
                  )}
                </div>

                {/* Selected date range label */}
                {(dbDateRange.from || dbDateRange.to) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
                    <CalendarRange size={13} />
                    <span>
                      {dbDateRange.from && dbDateRange.to
                        ? `Showing: ${format(dbDateRange.from, 'dd MMM yyyy')} → ${format(dbDateRange.to, 'dd MMM yyyy')} (${filteredVouchers.length} voucher${filteredVouchers.length !== 1 ? 's' : ''})`
                        : dbDateRange.from
                        ? `Showing: From ${format(dbDateRange.from, 'dd MMM yyyy')} (${filteredVouchers.length} voucher${filteredVouchers.length !== 1 ? 's' : ''})`
                        : `Showing: Up to ${format(dbDateRange.to, 'dd MMM yyyy')} (${filteredVouchers.length} voucher${filteredVouchers.length !== 1 ? 's' : ''})`}
                    </span>
                  </div>
                )}
                {filteredVouchers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '3rem' }}>📋</div>
                    <p style={{ fontWeight: 600, color: '#374151' }}>No vouchers found</p>
                    {isSuperAdmin && <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Click "New Voucher" to post your first accounting entry. Seed ledgers first.</p>}
                  </div>
                ) : (
                  <div className="data-table">
                    <table>
                      <thead><tr><th style={{ width: 30 }}></th><th>Voucher No.</th><th>Date</th><th>Type</th><th>Narration</th><th style={{ textAlign: 'right' }}>Debit (₹)</th><th style={{ textAlign: 'right' }}>Credit (₹)</th><th>Status</th>{isSuperAdmin && <th></th>}</tr></thead>
                      <tbody>
                        {filteredVouchers.map((v) => {
                          const cfg = VOUCHER_COLORS[v.voucherType] || {}; const isExp = expandedRows.has(v.id)
                          const totalDr = (v.entries || []).filter((e) => e.type === 'debit').reduce((s, e) => s + e.amount, 0)
                          const totalCr = (v.entries || []).filter((e) => e.type === 'credit').reduce((s, e) => s + e.amount, 0)
                          return (
                            <>
                              <tr key={v.id}>
                                <td><button onClick={() => toggleRow(v.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '0.2rem', display: 'flex', alignItems: 'center' }}>{isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button></td>
                                <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>{v.voucherNo}</td>
                                <td style={{ fontSize: '0.85rem' }}>{new Date(v.date).toLocaleDateString('en-IN')}</td>
                                <td><span style={{ ...cfg, padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600 }}>{VOUCHER_LABELS[v.voucherType] || v.voucherType}</span></td>
                                <td style={{ fontSize: '0.85rem', color: '#374151', maxWidth: 220 }}>{v.narration || '—'}</td>
                                <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>₹{totalDr.toLocaleString('en-IN')}</td>
                                <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>₹{totalCr.toLocaleString('en-IN')}</td>
                                <td><span style={{ padding: '0.15rem 0.4rem', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600, background: v.status === 'posted' ? '#d1fae5' : '#fee2e2', color: v.status === 'posted' ? '#065f46' : '#991b1b' }}>{v.status}</span></td>
                                {isSuperAdmin && <td><button className="btn-icon danger" onClick={() => handleDeleteVoucher(v.id)}><Trash2 size={14} /></button></td>}
                              </tr>
                              {isExp && (v.entries || []).map((e, ei) => (
                                <tr key={`${v.id}-${ei}`} style={{ background: '#f8fafc' }}>
                                  <td colSpan={4}></td>
                                  <td style={{ fontSize: '0.82rem', color: '#1e40af', paddingLeft: '2rem', fontStyle: 'italic' }}>{e.ledger?.name || 'Unknown'}</td>
                                  <td style={{ textAlign: 'right', color: '#16a34a', fontSize: '0.82rem', fontStyle: 'italic' }}>{e.type === 'debit' ? `₹${e.amount.toLocaleString('en-IN')} Dr` : ''}</td>
                                  <td style={{ textAlign: 'right', color: '#dc2626', fontSize: '0.82rem', fontStyle: 'italic' }}>{e.type === 'credit' ? `₹${e.amount.toLocaleString('en-IN')} Cr` : ''}</td>
                                  <td colSpan={isSuperAdmin ? 2 : 1}></td>
                                </tr>
                              ))}
                            </>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ══ P&L ══ */}
            {activeTab === 'pl' && (
              <>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  {[
                    { label: '📈 Total Income', val: totalIncome, color: '#166534', bg: '#f0fdf4', sub: `Fees: ₹${totalFeeIncome.toLocaleString('en-IN')} · Other: ₹${totalOtherIncome.toLocaleString('en-IN')}` },
                    { label: '📉 Total Expenses', val: totalExpenses, color: '#9f1239', bg: '#fff1f2', sub: `FY ${plYear}–${plYear + 1}` },
                    { label: netPL >= 0 ? '�� Net Profit' : '🔴 Net Loss', val: Math.abs(netPL), color: netPL >= 0 ? '#14532d' : '#991b1b', bg: netPL >= 0 ? '#f0fdf4' : '#fff1f2', sub: `Margin: ${totalIncome > 0 ? ((netPL / totalIncome) * 100).toFixed(1) : 0}%` },
                  ].map((c) => (
                    <div key={c.label} style={{ flex: 1, minWidth: 150, background: c.bg, borderRadius: 10, padding: '1rem 1.25rem', border: `1px solid ${c.color}33` }}>
                      <div style={{ fontSize: '0.8rem', color: c.color, fontWeight: 600 }}>{c.label}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: c.color }}>₹{c.val.toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{c.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ border: '1px solid #bbf7d0', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: '#16a34a', color: '#fff', fontWeight: 700, padding: '0.6rem 1rem', fontSize: '0.9rem' }}>📈 INCOME</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <tbody>
                        <tr style={{ background: '#f0fdf4' }}><td style={{ padding: '0.45rem 1rem' }}>Fee Collection</td><td style={{ padding: '0.45rem 1rem', textAlign: 'right', fontWeight: 600 }}>₹{totalFeeIncome.toLocaleString('en-IN')}</td></tr>
                        <tr><td style={{ padding: '0.45rem 1rem' }}>Other Income</td><td style={{ padding: '0.45rem 1rem', textAlign: 'right', fontWeight: 600 }}>₹{totalOtherIncome.toLocaleString('en-IN')}</td></tr>
                        <tr style={{ background: '#bbf7d0', fontWeight: 700 }}><td style={{ padding: '0.55rem 1rem', color: '#166534' }}>TOTAL INCOME</td><td style={{ padding: '0.55rem 1rem', textAlign: 'right', color: '#166534' }}>₹{totalIncome.toLocaleString('en-IN')}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={{ border: '1px solid #fca5a5', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: '#dc2626', color: '#fff', fontWeight: 700, padding: '0.6rem 1rem', fontSize: '0.9rem' }}>📉 EXPENSES</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <tbody>
                        {expByCat.map(([cat, amt]) => (<tr key={cat} style={{ background: '#fff5f5' }}><td style={{ padding: '0.4rem 1rem' }}>{cat}</td><td style={{ padding: '0.4rem 1rem', textAlign: 'right', fontWeight: 600 }}>₹{amt.toLocaleString('en-IN')}</td></tr>))}
                        {expByCat.length === 0 && <tr><td colSpan={2} style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af' }}>No expenses recorded</td></tr>}
                        <tr style={{ background: '#fca5a5', fontWeight: 700 }}><td style={{ padding: '0.55rem 1rem', color: '#991b1b' }}>TOTAL EXPENSES</td><td style={{ padding: '0.55rem 1rem', textAlign: 'right', color: '#991b1b' }}>₹{totalExpenses.toLocaleString('en-IN')}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#374151', marginBottom: '0.5rem' }}>📅 Month-wise P&L — FY {plYear}–{plYear + 1}</div>
                <div className="data-table">
                  <table>
                    <thead><tr><th>Month</th><th style={{ textAlign: 'right' }}>Income (₹)</th><th style={{ textAlign: 'right' }}>Expenses (₹)</th><th style={{ textAlign: 'right' }}>Net (₹)</th></tr></thead>
                    <tbody>
                      {monthlyPL.map((m, i) => (
                        <tr key={i}>
                          <td>{m.label} {plYear}</td>
                          <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 500 }}>₹{m.income.toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 500 }}>₹{m.expense.toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: m.net > 0 ? '#16a34a' : m.net < 0 ? '#dc2626' : '#6b7280' }}>{m.net > 0 ? '+' : ''}₹{m.net.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: 700, background: '#f1f5f9' }}>
                        <td>TOTAL</td>
                        <td style={{ textAlign: 'right', color: '#16a34a' }}>₹{totalIncome.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right', color: '#dc2626' }}>₹{totalExpenses.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right', color: netPL >= 0 ? '#16a34a' : '#dc2626' }}>{netPL >= 0 ? '+' : ''}₹{netPL.toLocaleString('en-IN')}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            {/* ══ BALANCE SHEET ══ */}
            {activeTab === 'balance' && (
              balances.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ fontSize: '3rem' }}>⚖️</div>
                  <p style={{ fontWeight: 600, color: '#374151' }}>No ledger entries yet</p>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Post vouchers in the Day Book to populate the Balance Sheet. Start by seeding default ledgers.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {[
                      { label: '🏦 Total Assets', val: totalAssetsV, color: '#1d4ed8', bg: '#dbeafe' },
                      { label: '⚖️ Total Liabilities', val: totalLiabV, color: '#92400e', bg: '#fef3c7' },
                      { label: surplusV >= 0 ? '🟢 Net Surplus' : '🔴 Net Deficit', val: Math.abs(surplusV), color: surplusV >= 0 ? '#166534' : '#991b1b', bg: surplusV >= 0 ? '#d1fae5' : '#fee2e2' },
                    ].map((c) => (
                      <div key={c.label} style={{ flex: 1, minWidth: 140, background: c.bg, borderRadius: 10, padding: '1rem 1.25rem', border: `1px solid ${c.color}44` }}>
                        <div style={{ fontSize: '0.8rem', color: c.color, fontWeight: 600 }}>{c.label}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: c.color }}>₹{c.val.toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div style={{ border: '1px solid #93c5fd', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: '#1d4ed8', color: '#fff', fontWeight: 700, padding: '0.6rem 1rem', fontSize: '0.9rem' }}>🏦 ASSETS</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <tbody>
                          {bsAssets.map((b) => { const bal = (b.debit - b.credit) + (b.ledger.openingBalance || 0); return bal !== 0 ? (<tr key={b.ledger.id} style={{ background: '#eff6ff' }}><td style={{ padding: '0.4rem 1rem' }}>{b.ledger.name}</td><td style={{ padding: '0.4rem 1rem', textAlign: 'right', fontWeight: 600 }}>₹{Math.abs(bal).toLocaleString('en-IN')}</td></tr>) : null })}
                          {surplusV > 0 && (<tr style={{ background: '#f0fdf4', fontStyle: 'italic' }}><td style={{ padding: '0.4rem 1rem', color: '#166534' }}>Accumulated Surplus</td><td style={{ padding: '0.4rem 1rem', textAlign: 'right', fontWeight: 600, color: '#166534' }}>₹{surplusV.toLocaleString('en-IN')}</td></tr>)}
                          <tr style={{ background: '#93c5fd', fontWeight: 700 }}><td style={{ padding: '0.55rem 1rem', color: '#1e3a8a' }}>TOTAL ASSETS</td><td style={{ padding: '0.55rem 1rem', textAlign: 'right', color: '#1e3a8a' }}>₹{(totalAssetsV + Math.max(surplusV, 0)).toLocaleString('en-IN')}</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div style={{ border: '1px solid #fcd34d', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: '#d97706', color: '#fff', fontWeight: 700, padding: '0.6rem 1rem', fontSize: '0.9rem' }}>⚖️ LIABILITIES &amp; EQUITY</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <tbody>
                          {bsLiability.map((b) => { const bal = (b.credit - b.debit) + (b.ledger.openingBalance || 0); return bal > 0 ? (<tr key={b.ledger.id} style={{ background: '#fffbeb' }}><td style={{ padding: '0.4rem 1rem' }}>{b.ledger.name}</td><td style={{ padding: '0.4rem 1rem', textAlign: 'right', fontWeight: 600 }}>₹{bal.toLocaleString('en-IN')}</td></tr>) : null })}
                          {bsIncome.filter((b) => (b.credit - b.debit) > 0).length > 0 && (
                            <><tr style={{ background: '#f9fafb' }}><td colSpan={2} style={{ padding: '0.3rem 1rem', fontSize: '0.78rem', color: '#6b7280', fontStyle: 'italic' }}>Income Accounts</td></tr>
                            {bsIncome.map((b) => { const bal = b.credit - b.debit; return bal > 0 ? (<tr key={b.ledger.id} style={{ background: '#f0fdf4' }}><td style={{ padding: '0.4rem 1rem' }}>{b.ledger.name}</td><td style={{ padding: '0.4rem 1rem', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>₹{bal.toLocaleString('en-IN')}</td></tr>) : null })}</>
                          )}
                          <tr style={{ background: '#fcd34d', fontWeight: 700 }}><td style={{ padding: '0.55rem 1rem', color: '#78350f' }}>TOTAL LIABILITIES</td><td style={{ padding: '0.55rem 1rem', textAlign: 'right', color: '#78350f' }}>₹{totalLiabV.toLocaleString('en-IN')}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )
            )}
          </>
        )}
      </div>

      {/* LEDGER MODAL */}
      {showLedgerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 480, boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#1e40af' }}>{editLedgerId ? '✏️ Edit Ledger' : '📒 New Ledger'}</h2>
              <button onClick={() => setShowLedgerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Ledger Name *</label><input style={inputSty} value={lForm.name} onChange={(e) => setLForm({ ...lForm, name: e.target.value })} placeholder="e.g., HDFC Bank, Electricity Expense" /></div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Type *</label><select style={inputSty} value={lForm.type} onChange={(e) => setLForm({ ...lForm, type: e.target.value })}><option value="income">Income</option><option value="expense">Expense</option><option value="asset">Asset</option><option value="liability">Liability</option></select></div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Group</label><input style={inputSty} value={lForm.group} onChange={(e) => setLForm({ ...lForm, group: e.target.value })} placeholder="e.g., Current Asset" /></div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Opening Balance (₹)</label><input type="number" min={0} style={inputSty} value={lForm.openingBalance} onChange={(e) => setLForm({ ...lForm, openingBalance: parseFloat(e.target.value) || 0 })} /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Description</label><input style={inputSty} value={lForm.description} onChange={(e) => setLForm({ ...lForm, description: e.target.value })} placeholder="Optional" /></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setShowLedgerModal(false)} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveLedger} disabled={saving} style={{ padding: '0.5rem 1.5rem', borderRadius: 8, border: 'none', background: '#1e40af', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : editLedgerId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* VOUCHER MODAL */}
      {showVoucherModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '1.5rem 1rem', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 780, boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#1e40af' }}>📋 New Voucher</h2>
              <button onClick={() => setShowVoucherModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {VOUCHER_TYPES.map((t) => { const active = vForm.voucherType === t; const cfg = VOUCHER_COLORS[t]; return (<button key={t} onClick={() => setVForm({ ...vForm, voucherType: t })} style={{ flex: 1, padding: '0.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', border: `2px solid ${active ? cfg.color : '#e2e8f0'}`, background: active ? cfg.bg : '#f8fafc', color: active ? cfg.color : '#6b7280' }}>{VOUCHER_LABELS[t]}</button>) })}
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.45rem 0.75rem', marginBottom: '0.85rem', fontSize: '0.78rem', color: '#475569' }}>{VOUCHER_HINTS[vForm.voucherType]}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Date *</label><input type="date" style={inputSty} value={vForm.date} onChange={(e) => setVForm({ ...vForm, date: e.target.value })} /></div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Narration</label><input style={inputSty} value={vForm.narration} onChange={(e) => setVForm({ ...vForm, narration: e.target.value })} placeholder="e.g., Fee received from Student XYZ Cl 10-A" /></div>
            </div>
            <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead><tr style={{ background: '#f1f5f9' }}><th style={{ padding: '0.4rem 0.5rem', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Ledger Account</th><th style={{ padding: '0.4rem 0.5rem', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', width: 110 }}>Dr / Cr</th><th style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', width: 130 }}>Amount (₹)</th><th style={{ width: 36, borderBottom: '1px solid #e2e8f0' }}></th></tr></thead>
                <tbody>
                  {vForm.entries.map((e, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '0.3rem 0.4rem' }}>
                        <select style={inputSty} value={e.ledgerId} onChange={(ev) => setEntry(idx, 'ledgerId', ev.target.value)}>
                          <option value="">— Select Ledger —</option>
                          {['asset', 'income', 'expense', 'liability'].map((type) => (
                            <optgroup key={type} label={type.toUpperCase() + 'S'}>
                              {ledgers.filter((l) => l.type === type).map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '0.3rem 0.4rem' }}><select style={{ ...inputSty, textAlign: 'center' }} value={e.type} onChange={(ev) => setEntry(idx, 'type', ev.target.value)}><option value="debit">Dr (Debit)</option><option value="credit">Cr (Credit)</option></select></td>
                      <td style={{ padding: '0.3rem 0.4rem' }}><input type="number" min={0} style={{ ...inputSty, textAlign: 'right' }} value={e.amount} onChange={(ev) => setEntry(idx, 'amount', ev.target.value)} placeholder="0.00" /></td>
                      <td style={{ padding: '0.3rem 0.4rem', textAlign: 'center' }}>{vForm.entries.length > 2 && (<button onClick={() => removeEntry(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><X size={15} /></button>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <button onClick={addEntry} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}><Plus size={14} /> Add Row</button>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>Total Dr: ₹{totalDebit.toLocaleString('en-IN')}</span>
                <span style={{ color: '#dc2626', fontWeight: 700 }}>Total Cr: ₹{totalCredit.toLocaleString('en-IN')}</span>
                <span style={{ color: isBalanced ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{isBalanced ? '✓ Balanced' : `⚠ Diff: ₹${Math.abs(totalDebit - totalCredit).toLocaleString('en-IN')}`}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowVoucherModal(false)} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveVoucher} disabled={saving || !isBalanced} style={{ padding: '0.5rem 1.5rem', borderRadius: 8, border: 'none', background: isBalanced ? '#1e40af' : '#94a3b8', color: '#fff', cursor: isBalanced ? 'pointer' : 'not-allowed', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>{saving ? 'Posting…' : '📋 Post Voucher'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountingPage
