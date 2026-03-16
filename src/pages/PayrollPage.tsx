// @ts-nocheck
import { useEffect, useState } from 'react'
import { FileDown } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import { useAppSelector } from '@/store'
import { exportButtonStyle } from '@/utils/exportUtils'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const fmt = (n) => (n || 0).toLocaleString('en-IN')

const PayrollPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const isSuperAdmin = useAppSelector((s) => s.auth.role) === 'super-admin'

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [payroll, setPayroll] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [schoolName, setSchoolName] = useState('School')

  useEffect(() => { loadPayroll() }, [month, year])
  useEffect(() => {
    apiClient.listSchools().then((r) => {
      const s = Array.isArray(r) ? r[0] : r?.data?.[0]
      if (s?.name) setSchoolName(s.name)
    }).catch(() => {})
  }, [])

  const loadPayroll = async () => {
    setLoading(true)
    try {
      const res = await apiClient.listPayroll({ month, year })
      setPayroll(res?.data || [])
    } catch { toast.error('Failed to load payroll.') }
    finally { setLoading(false) }
  }

  const handleGenerate = async () => {
    const ok = await confirm({
      message: `Generate payroll for ${MONTHS[month - 1]} ${year}?\n\nSalary components will be calculated as:\n• HRA: 40% of Basic\n• Conveyance: Rs.1,600\n• Medical: Rs.1,250\n• Employee PF: 12% of Basic\n• Employee ESI: 0.75% (if gross ≤ Rs.21,000)\n• Professional Tax: Slab-based\n• TDS: New Tax Regime slabs u/s 192`,
      confirmText: '⚡ Generate',
      confirmVariant: 'success',
    })
    if (!ok) return
    setGenerating(true)
    try {
      const res = await apiClient.generatePayroll({ month, year })
      toast.success(`Payroll generated for ${res?.data?.length || 0} employees.`)
      loadPayroll()
    } catch (err) { toast.error(err?.message || 'Failed to generate payroll.') }
    finally { setGenerating(false) }
  }

  const handleMarkPaid = async (id) => {
    const today = new Date().toISOString().slice(0, 10)
    try {
      await apiClient.updatePayroll(id, { status: 'paid', paymentDate: today, paymentMode: 'bank' })
      toast.success('Marked as paid.')
      loadPayroll()
    } catch (err) { toast.error(err?.message || 'Failed.') }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ message: 'Delete this payroll record?' })
    if (!ok) return
    try {
      await apiClient.deletePayroll(id)
      toast.success('Deleted.')
      loadPayroll()
    } catch (err) { toast.error(err?.message || 'Failed.') }
  }

  const downloadSlip = (p) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()

    // ── Header ───────────────────────────────────────────────────
    doc.setFillColor(30, 64, 175)
    doc.rect(0, 0, pw, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(schoolName.toUpperCase(), pw / 2, 12, { align: 'center' })
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(`SALARY SLIP — ${MONTHS[p.month - 1].toUpperCase()} ${p.year}`, pw / 2, 21, { align: 'center' })
    doc.text(`(Generated under New Tax Regime | FY ${p.year}–${p.year + 1})`, pw / 2, 27, { align: 'center' })

    // ── Employee Info ─────────────────────────────────────────────
    doc.setTextColor(30, 30, 30)
    doc.setFillColor(239, 246, 255)
    doc.rect(10, 35, pw - 20, 28, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('Employee Details', 14, 43)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
    doc.text(`Name       : ${p.employeeName}`, 14, 51)
    doc.text(`Designation: ${p.designation || '—'}`, 14, 58)
    doc.text(`Emp. Type  : ${(p.employeeType || '').charAt(0).toUpperCase() + (p.employeeType || '').slice(1)}`, pw / 2 + 4, 51)
    doc.text(`Pay Period : ${MONTHS[p.month - 1]} ${p.year}`, pw / 2 + 4, 58)

    // ── Earnings + Deductions (side by side) ──────────────────────
    const midX = pw / 2 - 2
    autoTable(doc, {
      head: [['EARNINGS', 'Amount (Rs.)']],
      body: [
        ['Basic Salary',                `Rs. ${fmt(p.basicSalary)}`],
        ['House Rent Allowance (HRA)',   `Rs. ${fmt(p.hra || Math.round((p.basicSalary || 0) * 0.4))}`],
        ['Conveyance Allowance',         `Rs. ${fmt(p.conveyance || 1600)}`],
        ['Medical Allowance',            `Rs. ${fmt(p.medicalAllowance || 1250)}`],
        ...(p.specialAllowance > 0 ? [['Special Allowance', `Rs. ${fmt(p.specialAllowance)}`]] : []),
        ['GROSS SALARY',                 `Rs. ${fmt(p.grossSalary)}`],
      ],
      startY: 68,
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right', fontStyle: 'normal' } },
      didParseCell: (d) => {
        const lastRow = p.specialAllowance > 0 ? 5 : 5
        if (d.row.index === lastRow) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [220, 252, 231] }
      },
      margin: { left: 10, right: midX + 2 },
    })

    autoTable(doc, {
      head: [['DEDUCTIONS', 'Amount (Rs.)']],
      body: [
        ['Employee PF (12% of Basic)',   `Rs. ${fmt(p.pfDeduction)}`],
        ['Employee ESI (0.75%)',          `Rs. ${fmt(p.esiDeduction)}`],
        ['Professional Tax',             `Rs. ${fmt(p.professionalTax)}`],
        ['TDS u/s 192 (New Regime)',      `Rs. ${fmt(p.tdsDeduction)}`],
        ...(p.otherDeductions > 0 ? [['Other Deductions', `Rs. ${fmt(p.otherDeductions)}`]] : []),
        ['TOTAL DEDUCTIONS',             `Rs. ${fmt(p.totalDeductions)}`],
      ],
      startY: 68,
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
      didParseCell: (d) => {
        const lastRow = p.otherDeductions > 0 ? 5 : 4
        if (d.row.index === lastRow) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [254, 226, 226] }
      },
      margin: { left: midX + 2, right: 10 },
    })

    const tableEndY = Math.max((doc as any).lastAutoTable.finalY + 6, 130)

    // ── Net Pay bar ────────────────────────────────────────────────
    doc.setFillColor(22, 163, 74)
    doc.rect(10, tableEndY, pw - 20, 14, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text('NET PAY (Take Home)', 18, tableEndY + 9.5)
    doc.text(`Rs. ${fmt(p.netSalary)}`, pw - 18, tableEndY + 9.5, { align: 'right' })

    // ── Employer Contributions (CTC info) ──────────────────────────
    const ctcY = tableEndY + 22
    doc.setFillColor(248, 250, 252)
    doc.rect(10, ctcY - 4, pw - 20, 28, 'F')
    doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
    doc.text('Employer Contributions (not deducted — CTC components)', 14, ctcY + 2)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text(`Employer PF (12% of Basic): Rs. ${fmt(p.employerPf || Math.round((p.basicSalary || 0) * 0.12))}`, 14, ctcY + 10)
    doc.text(`Employer ESI (3.25%):       Rs. ${fmt(p.employerEsi || 0)}`, 14, ctcY + 16)
    doc.setFont('helvetica', 'bold')
    doc.text(`CTC (Cost to Company):      Rs. ${fmt(p.ctc || p.grossSalary)}`, pw - 18, ctcY + 13, { align: 'right' })

    // ── Payment Details ─────────────────────────────────────────────
    const payY = ctcY + 34
    doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text(`Status: ${(p.status || '').toUpperCase()}`, 14, payY)
    if (p.paymentDate) doc.text(`Paid on: ${new Date(p.paymentDate).toLocaleDateString('en-IN')}   |   Mode: ${p.paymentMode || '—'}`, 14, payY + 7)

    // ── Footer ─────────────────────────────────────────────────────
    doc.setFillColor(248, 248, 248)
    doc.rect(0, ph - 14, pw, 14, 'F')
    doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'italic')
    doc.text('This is a computer-generated salary slip. | TDS calculated under New Tax Regime FY ' + p.year + '–' + (p.year + 1) + ' u/s 192 of Income Tax Act. No signature required.', pw / 2, ph - 6, { align: 'center' })

    doc.save(`SalarySlip_${p.employeeName.replace(/ /g, '_')}_${MONTHS[p.month - 1]}_${p.year}.pdf`)
  }

  const downloadAllSlips = () => {
    if (payroll.length === 0) return
    const doc = new jsPDF({ orientation: 'landscape' })
    const pw = doc.internal.pageSize.getWidth()
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175)
    doc.text(`Payroll Summary — ${MONTHS[month - 1]} ${year}`, 14, 16)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
    doc.text(`School: ${schoolName}   |   Generated: ${new Date().toLocaleDateString('en-IN')}   |   Tax Regime: New Regime FY ${year}–${year + 1}`, 14, 23)
    autoTable(doc, {
      head: [['Employee', 'Type', 'Designation', 'Basic', 'HRA', 'Conv.', 'Medical', 'Gross', 'Emp.PF', 'ESI', 'PT', 'TDS', 'Net Pay', 'CTC', 'Status']],
      body: payroll.map(p => [
        p.employeeName, p.employeeType, p.designation || '-',
        `Rs.${fmt(p.basicSalary)}`,
        `Rs.${fmt(p.hra)}`,
        `Rs.${fmt(p.conveyance)}`,
        `Rs.${fmt(p.medicalAllowance)}`,
        `Rs.${fmt(p.grossSalary)}`,
        `Rs.${fmt(p.pfDeduction)}`,
        `Rs.${fmt(p.esiDeduction)}`,
        `Rs.${fmt(p.professionalTax)}`,
        `Rs.${fmt(p.tdsDeduction)}`,
        `Rs.${fmt(p.netSalary)}`,
        `Rs.${fmt(p.ctc)}`,
        p.status,
      ]),
      startY: 28,
      styles: { fontSize: 6.5 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 6.5 },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      margin: { left: 10, right: 10 },
    })
    doc.save(`Payroll_${MONTHS[month - 1]}_${year}.pdf`)
  }

  const totals = payroll.reduce((acc, p) => ({
    gross: acc.gross + (p.grossSalary || 0),
    pf: acc.pf + (p.pfDeduction || 0),
    esi: acc.esi + (p.esiDeduction || 0),
    tds: acc.tds + (p.tdsDeduction || 0),
    deductions: acc.deductions + (p.totalDeductions || 0),
    net: acc.net + (p.netSalary || 0),
    ctc: acc.ctc + (p.ctc || 0),
  }), { gross: 0, pf: 0, esi: 0, tds: 0, deductions: 0, net: 0, ctc: 0 })

  const paidCount    = payroll.filter((p) => p.status === 'paid').length
  const pendingCount = payroll.filter((p) => p.status === 'pending').length

  return (
    <div className="page">
      <div className="page-header">
        <h1>💼 Payroll</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {payroll.length > 0 && (
            <button style={exportButtonStyle} onClick={downloadAllSlips} title="Download Payroll PDF">📥 Payroll PDF</button>
          )}
          {isSuperAdmin && (
            <button className="btn primary" onClick={handleGenerate} disabled={generating}>
              {generating ? '⏳ Generating…' : '⚡ Generate Payroll'}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {[
          { label: '👥 Employees', val: payroll.length, sub: `${paidCount} paid · ${pendingCount} pending`, bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', isCount: true },
          { label: '💰 Gross Salary', val: totals.gross, sub: 'Total earnings', bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
          { label: '📉 Deductions', val: totals.deductions, sub: `PF ₹${fmt(totals.pf)} · ESI ₹${fmt(totals.esi)} · TDS ₹${fmt(totals.tds)}`, bg: '#fff7ed', border: '#fed7aa', color: '#9a3412' },
          { label: '🏦 Net Pay', val: totals.net, sub: 'Take-home total', bg: '#f0fdf4', border: '#86efac', color: '#14532d' },
          { label: '📊 Total CTC', val: totals.ctc, sub: 'Gross + Employer PF/ESI', bg: '#faf5ff', border: '#d8b4fe', color: '#6b21a8' },
        ].map((c) => (
          <div key={c.label} style={{ flex: 1, minWidth: 140, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.78rem', color: c.color, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: c.color }}>{c.isCount ? c.val : `₹${fmt(c.val)}`}</div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Tax Regime Notice */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.5rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#78350f', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>📋</span>
        <span><strong>Payroll follows Indian statutory rules:</strong> HRA = 40% of Basic · Conveyance = ₹1,600 · Medical = ₹1,250 · Employee PF = 12% of Basic · ESI = 0.75% (if gross ≤ ₹21,000) · TDS = New Tax Regime FY {year}–{year + 1} u/s 192 (Rebate u/s 87A: no tax if taxable ≤ ₹12L)</span>
      </div>

      <div className="page-content-scrollable">
        {loading ? (
          <div className="loading-state">Loading payroll…</div>
        ) : payroll.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💼</div>
            <p style={{ fontWeight: 600, color: '#374151' }}>No payroll for {MONTHS[month - 1]} {year}</p>
            {isSuperAdmin && (
              <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                Click <strong>"Generate Payroll"</strong> to auto-calculate salaries. Make sure employees have a salary amount set in their profiles.
              </p>
            )}
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th style={{ textAlign: 'right' }}>Basic (₹)</th>
                  <th style={{ textAlign: 'right' }}>HRA (₹)</th>
                  <th style={{ textAlign: 'right' }}>Conv.+Med.</th>
                  <th style={{ textAlign: 'right' }}>Gross (₹)</th>
                  <th style={{ textAlign: 'right', color: '#dc2626' }}>Emp.PF</th>
                  <th style={{ textAlign: 'right', color: '#dc2626' }}>ESI</th>
                  <th style={{ textAlign: 'right', color: '#dc2626' }}>PT</th>
                  <th style={{ textAlign: 'right', color: '#dc2626' }}>TDS</th>
                  <th style={{ textAlign: 'right', color: '#166534' }}>Net Pay (₹)</th>
                  <th style={{ textAlign: 'right', color: '#6b21a8' }}>CTC (₹)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payroll.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.employeeName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{p.designation || '—'} · {p.employeeType}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>₹{fmt(p.basicSalary)}</td>
                    <td style={{ textAlign: 'right', color: '#374151' }}>₹{fmt(p.hra)}</td>
                    <td style={{ textAlign: 'right', fontSize: '0.8rem', color: '#374151' }}>₹{fmt((p.conveyance || 0) + (p.medicalAllowance || 0))}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{fmt(p.grossSalary)}</td>
                    <td style={{ textAlign: 'right', color: '#dc2626', fontSize: '0.85rem' }}>₹{fmt(p.pfDeduction)}</td>
                    <td style={{ textAlign: 'right', color: '#dc2626', fontSize: '0.85rem' }}>₹{fmt(p.esiDeduction)}</td>
                    <td style={{ textAlign: 'right', color: '#dc2626', fontSize: '0.85rem' }}>₹{fmt(p.professionalTax)}</td>
                    <td style={{ textAlign: 'right', color: '#b45309', fontSize: '0.85rem' }}>₹{fmt(p.tdsDeduction)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>₹{fmt(p.netSalary)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#6b21a8', fontSize: '0.85rem' }}>₹{fmt(p.ctc)}</td>
                    <td>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, background: p.status === 'paid' ? '#d1fae5' : '#fef3c7', color: p.status === 'paid' ? '#065f46' : '#92400e' }}>
                        {p.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn-icon" onClick={() => downloadSlip(p)} title="Download Salary Slip" style={{ color: '#7c3aed' }}>
                        <FileDown size={16} />
                      </button>
                      {p.status === 'pending' && isSuperAdmin && (
                        <button className="btn-icon edit" onClick={() => handleMarkPaid(p.id)} title="Mark as Paid" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                          ✓ Pay
                        </button>
                      )}
                      {isSuperAdmin && (
                        <button className="btn-icon danger" onClick={() => handleDelete(p.id)} title="Delete">🗑</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, background: '#eff6ff', color: '#1e40af' }}>
                  <td>TOTAL ({payroll.length})</td>
                  <td style={{ textAlign: 'right' }}>₹{fmt(payroll.reduce((s, p) => s + (p.basicSalary || 0), 0))}</td>
                  <td style={{ textAlign: 'right' }}>₹{fmt(payroll.reduce((s, p) => s + (p.hra || 0), 0))}</td>
                  <td></td>
                  <td style={{ textAlign: 'right' }}>₹{fmt(totals.gross)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>₹{fmt(totals.pf)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>₹{fmt(totals.esi)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>₹{fmt(payroll.reduce((s, p) => s + (p.professionalTax || 0), 0))}</td>
                  <td style={{ textAlign: 'right', color: '#b45309' }}>₹{fmt(totals.tds)}</td>
                  <td style={{ textAlign: 'right', color: '#166534' }}>₹{fmt(totals.net)}</td>
                  <td style={{ textAlign: 'right', color: '#6b21a8' }}>₹{fmt(totals.ctc)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default PayrollPage
