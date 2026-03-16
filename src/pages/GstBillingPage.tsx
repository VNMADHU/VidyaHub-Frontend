// @ts-nocheck
import { useEffect, useState } from 'react'
import { Trash2, FileDown, Plus, X } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import { useAppSelector } from '@/store'

const GST_RATES = [0, 5, 12, 18, 28]
const STATUS_COLORS = {
  draft: { bg: '#f1f5f9', color: '#475569' },
  sent: { bg: '#dbeafe', color: '#1d4ed8' },
  paid: { bg: '#d1fae5', color: '#065f46' },
  cancelled: { bg: '#fee2e2', color: '#991b1b' },
}

const emptyItem = { description: '', sacCode: '', qty: 1, rate: 0, gstRate: 18 }

const emptyInvoice = {
  invoiceNo: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  invoiceType: 'sales',
  partyName: '',
  partyGstin: '',
  partyAddress: '',
  schoolGstin: '',
  notes: '',
  status: 'draft',
  items: [{ ...emptyItem }],
}

const calcItem = (item) => {
  const amount = (item.qty || 0) * (item.rate || 0)
  const gstAmt = (amount * (item.gstRate || 0)) / 100
  const cgst = gstAmt / 2
  const sgst = gstAmt / 2
  return { ...item, amount, cgst, sgst, igst: 0 }
}

const GstBillingPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const isSuperAdmin = useAppSelector((s) => s.auth.role) === 'super-admin'

  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyInvoice, items: [{ ...emptyItem }] })
  const [saving, setSaving] = useState(false)
  const [schoolName, setSchoolName] = useState('School')

  useEffect(() => {
    loadInvoices()
    apiClient.listSchools().then((r) => {
      const s = Array.isArray(r) ? r[0] : r?.data?.[0]
      if (s?.name) setSchoolName(s.name)
    }).catch(() => {})
  }, [])

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const res = await apiClient.listGstInvoices()
      setInvoices(res?.data || [])
    } catch {
      toast.error('Failed to load invoices.')
    } finally {
      setLoading(false)
    }
  }

  // ---- Item helpers ----
  const setItem = (idx, field, value) => {
    setForm((prev) => {
      const items = [...prev.items]
      items[idx] = calcItem({ ...items[idx], [field]: field === 'qty' || field === 'rate' || field === 'gstRate' ? Number(value) : value })
      return { ...prev, items }
    })
  }
  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, calcItem({ ...emptyItem })] }))
  const removeItem = (idx) => setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))

  // ---- Totals ----
  const calcTotals = (items = []) => {
    const subtotal = items.reduce((s, it) => s + (it.amount || 0), 0)
    const cgstAmount = items.reduce((s, it) => s + (it.cgst || 0), 0)
    const sgstAmount = items.reduce((s, it) => s + (it.sgst || 0), 0)
    const igstAmount = items.reduce((s, it) => s + (it.igst || 0), 0)
    const totalTax = cgstAmount + sgstAmount + igstAmount
    const totalAmount = subtotal + totalTax
    return { subtotal, cgstAmount, sgstAmount, igstAmount, totalTax, totalAmount }
  }
  const totals = calcTotals(form.items.map(calcItem))

  // ---- Save ----
  const openCreate = () => {
    setEditId(null)
    const num = `INV-${Date.now().toString().slice(-6)}`
    setForm({ ...emptyInvoice, invoiceNo: num, items: [calcItem({ ...emptyItem })] })
    setShowModal(true)
  }

  const openEdit = (inv) => {
    setEditId(inv.id)
    setForm({
      invoiceNo: inv.invoiceNo || '',
      invoiceDate: inv.invoiceDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      invoiceType: inv.invoiceType || 'sales',
      partyName: inv.partyName || '',
      partyGstin: inv.partyGstin || '',
      partyAddress: inv.partyAddress || '',
      schoolGstin: inv.schoolGstin || '',
      notes: inv.notes || '',
      status: inv.status || 'draft',
      items: (Array.isArray(inv.items) ? inv.items : []).map(calcItem),
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.partyName.trim()) { toast.error('Party name is required.'); return }
    if (!form.invoiceNo.trim()) { toast.error('Invoice number is required.'); return }
    if (form.items.length === 0) { toast.error('Add at least one line item.'); return }

    setSaving(true)
    const { subtotal, cgstAmount, sgstAmount, igstAmount, totalTax, totalAmount } = calcTotals(form.items.map(calcItem))
    const payload = {
      ...form,
      subtotal, cgstAmount, sgstAmount, igstAmount, totalTax, totalAmount,
      items: form.items.map(calcItem),
    }
    try {
      if (editId) {
        await apiClient.updateGstInvoice(editId, payload)
        toast.success('Invoice updated.')
      } else {
        await apiClient.createGstInvoice(payload)
        toast.success('Invoice created.')
      }
      setShowModal(false)
      loadInvoices()
    } catch (err) {
      toast.error(err?.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ message: 'Delete this GST invoice?' })
    if (!ok) return
    try {
      await apiClient.deleteGstInvoice(id)
      toast.success('Deleted.')
      loadInvoices()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete.')
    }
  }

  const downloadInvoicePDF = (inv) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.getWidth()
    const items = Array.isArray(inv.items) ? inv.items : []

    // Header
    doc.setFillColor(30, 64, 175)
    doc.rect(0, 0, pw, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(schoolName.toUpperCase(), pw / 2, 10, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`TAX INVOICE`, pw / 2, 18, { align: 'center' })
    doc.text(`GSTIN: ${inv.schoolGstin || 'Not provided'}`, pw / 2, 24, { align: 'center' })

    // Invoice meta box
    doc.setTextColor(30, 30, 30)
    doc.setFillColor(239, 246, 255)
    doc.rect(10, 33, pw - 20, 22, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(`Invoice No: ${inv.invoiceNo}`, 14, 40)
    doc.text(`Date: ${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '-'}`, 14, 47)
    doc.text(`Type: ${(inv.invoiceType || '').toUpperCase()}`, pw / 2 + 4, 40)
    doc.text(`Status: ${(inv.status || '').toUpperCase()}`, pw / 2 + 4, 47)

    // Party info
    doc.setFillColor(248, 250, 252)
    doc.rect(10, 59, pw - 20, 18, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Bill To:', 14, 66)
    doc.setFont('helvetica', 'normal')
    doc.text(inv.partyName || '-', 14, 72)
    if (inv.partyGstin) doc.text(`GSTIN: ${inv.partyGstin}`, pw / 2 + 4, 66)
    if (inv.partyAddress) doc.text(inv.partyAddress, pw / 2 + 4, 72)

    // Items table
    autoTable(doc, {
      head: [['#', 'Description', 'SAC', 'Qty', 'Rate', 'Amt', 'GST%', 'CGST', 'SGST', 'Total']],
      body: items.map((it, idx) => {
        const amount = (it.qty || 0) * (it.rate || 0)
        const cgst = (amount * (it.gstRate || 0)) / 200
        const sgst = cgst
        return [
          idx + 1,
          it.description || '-',
          it.sacCode || '-',
          it.qty || 0,
          `Rs.${(it.rate || 0).toLocaleString('en-IN')}`,
          `Rs.${amount.toLocaleString('en-IN')}`,
          `${it.gstRate || 0}%`,
          `Rs.${cgst.toLocaleString('en-IN')}`,
          `Rs.${sgst.toLocaleString('en-IN')}`,
          `Rs.${(amount + cgst + sgst).toLocaleString('en-IN')}`,
        ]
      }),
      startY: 82,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 10, right: 10 },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 6

    // Totals
    autoTable(doc, {
      body: [
        ['Sub Total', `Rs. ${(inv.subtotal || 0).toLocaleString('en-IN')}`],
        ['CGST', `Rs. ${(inv.cgstAmount || 0).toLocaleString('en-IN')}`],
        ['SGST', `Rs. ${(inv.sgstAmount || 0).toLocaleString('en-IN')}`],
        ['Total Tax', `Rs. ${(inv.totalTax || 0).toLocaleString('en-IN')}`],
        ['GRAND TOTAL', `Rs. ${(inv.totalAmount || 0).toLocaleString('en-IN')}`],
      ],
      startY: finalY,
      styles: { fontSize: 8.5 },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.row.index === 4) {
          data.cell.styles.fillColor = [30, 64, 175]
          data.cell.styles.textColor = 255
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fontSize = 10
        }
      },
      margin: { left: pw - 90, right: 10 },
    })

    if (inv.notes) {
      const noteY = (doc as any).lastAutoTable.finalY + 8
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`Notes: ${inv.notes}`, 14, noteY)
    }

    doc.save(`GSTInvoice_${inv.invoiceNo}.pdf`)
  }

  const salesTotal = invoices.filter((i) => i.invoiceType === 'sales').reduce((s, i) => s + (i.totalAmount || 0), 0)
  const purchaseTotal = invoices.filter((i) => i.invoiceType === 'purchase').reduce((s, i) => s + (i.totalAmount || 0), 0)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0',
    borderRadius: '6px', fontSize: '0.85rem',
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>🧾 GST Billing</h1>
        {isSuperAdmin && (
          <button className="btn primary" onClick={openCreate}>
            <Plus size={16} style={{ marginRight: 4 }} />
            New Invoice
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1, minWidth: 140, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600 }}>📄 Total Invoices</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e40af' }}>{invoices.length}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>📤 Sales</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>₹{salesTotal.toLocaleString('en-IN')}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#c2410c', fontWeight: 600 }}>📥 Purchases</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#9a3412' }}>₹{purchaseTotal.toLocaleString('en-IN')}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>💼 Net GST Liability</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: salesTotal - purchaseTotal >= 0 ? '#166534' : '#991b1b' }}>
            ₹{Math.abs(salesTotal - purchaseTotal).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="page-content-scrollable">
        {loading ? (
          <div className="loading-state">Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🧾</div>
            <p style={{ fontWeight: 600, color: '#374151' }}>No GST invoices yet</p>
            {isSuperAdmin && <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Click "New Invoice" to create your first GST invoice.</p>}
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Party</th>
                  <th>GSTIN</th>
                  <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600 }}>{inv.invoiceNo}</td>
                    <td>{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '-'}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                        background: inv.invoiceType === 'sales' ? '#d1fae5' : '#fee2e2',
                        color: inv.invoiceType === 'sales' ? '#065f46' : '#991b1b',
                        textTransform: 'capitalize',
                      }}>
                        {inv.invoiceType === 'sales' ? '📤 Sales' : '📥 Purchase'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{inv.partyName}</div>
                      {inv.partyAddress && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{inv.partyAddress}</div>}
                    </td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{inv.partyGstin || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{(inv.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                        background: STATUS_COLORS[inv.status]?.bg || '#f1f5f9',
                        color: STATUS_COLORS[inv.status]?.color || '#374151',
                        textTransform: 'capitalize',
                      }}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => downloadInvoicePDF(inv)} title="Download PDF" style={{ color: '#7c3aed' }}>
                        <FileDown size={16} />
                      </button>
                      {isSuperAdmin && (
                        <>
                          <button className="btn-icon edit" onClick={() => openEdit(inv)} title="Edit">✏️</button>
                          <button className="btn-icon danger" onClick={() => handleDelete(inv.id)} title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 1000, padding: '1.5rem 1rem', overflowY: 'auto',
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: '1.5rem',
            width: '100%', maxWidth: 820, boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#1e40af' }}>
                {editId ? '✏️ Edit GST Invoice' : '🧾 New GST Invoice'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={20} />
              </button>
            </div>

            {/* Form Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Invoice No. *</label>
                <input style={inputStyle} value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} placeholder="INV-001" />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Invoice Date *</label>
                <input type="date" style={inputStyle} value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Invoice Type</label>
                <select style={inputStyle} value={form.invoiceType} onChange={(e) => setForm({ ...form, invoiceType: e.target.value })}>
                  <option value="sales">Sales</option>
                  <option value="purchase">Purchase</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Party Name *</label>
                <input style={inputStyle} value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} placeholder="Company / Person Name" />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Party GSTIN</label>
                <input style={inputStyle} value={form.partyGstin} onChange={(e) => setForm({ ...form, partyGstin: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" maxLength={15} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>School GSTIN</label>
                <input style={inputStyle} value={form.schoolGstin} onChange={(e) => setForm({ ...form, schoolGstin: e.target.value.toUpperCase() })} placeholder="School GSTIN" maxLength={15} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Party Address</label>
                <input style={inputStyle} value={form.partyAddress} onChange={(e) => setForm({ ...form, partyAddress: e.target.value })} placeholder="Party address" />
              </div>
            </div>

            {/* Line Items */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>Line Items</label>
                <button
                  onClick={addItem}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Description', 'SAC Code', 'Qty', 'Rate (₹)', 'GST %', 'Amount (₹)', 'CGST', 'SGST', ''].map((h) => (
                        <th key={h} style={{ padding: '0.4rem 0.5rem', textAlign: h === '' ? 'center' : 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, idx) => {
                      const ci = calcItem(item)
                      return (
                        <tr key={idx}>
                          <td style={{ padding: '0.3rem 0.4rem' }}>
                            <input style={{ ...inputStyle, width: 160 }} value={item.description} onChange={(e) => setItem(idx, 'description', e.target.value)} placeholder="Description" />
                          </td>
                          <td style={{ padding: '0.3rem 0.4rem' }}>
                            <input style={{ ...inputStyle, width: 80 }} value={item.sacCode} onChange={(e) => setItem(idx, 'sacCode', e.target.value)} placeholder="SAC" />
                          </td>
                          <td style={{ padding: '0.3rem 0.4rem' }}>
                            <input type="number" min={0} style={{ ...inputStyle, width: 60 }} value={item.qty} onChange={(e) => setItem(idx, 'qty', e.target.value)} />
                          </td>
                          <td style={{ padding: '0.3rem 0.4rem' }}>
                            <input type="number" min={0} style={{ ...inputStyle, width: 80 }} value={item.rate} onChange={(e) => setItem(idx, 'rate', e.target.value)} />
                          </td>
                          <td style={{ padding: '0.3rem 0.4rem' }}>
                            <select style={{ ...inputStyle, width: 70 }} value={item.gstRate} onChange={(e) => setItem(idx, 'gstRate', e.target.value)}>
                              {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right', fontWeight: 600 }}>
                            ₹{ci.amount.toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right', color: '#c2410c' }}>
                            ₹{ci.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right', color: '#c2410c' }}>
                            ₹{ci.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '0.3rem 0.4rem', textAlign: 'center' }}>
                            {form.items.length > 1 && (
                              <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                                <X size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '0.75rem 1.25rem', minWidth: 260 }}>
                {[
                  ['Subtotal', totals.subtotal],
                  ['CGST', totals.cgstAmount],
                  ['SGST', totals.sgstAmount],
                  ['Total Tax', totals.totalTax],
                ].map(([label, val]) => (
                  <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#374151' }}>
                    <span>{label as string}</span>
                    <span>₹{(val as number).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: '#1e40af', borderTop: '1px solid #bfdbfe', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                  <span>Grand Total</span>
                  <span>₹{totals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Notes + Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Notes</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 56 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes…" />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Status</label>
                <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '0.5rem 1.5rem', borderRadius: 8, border: 'none', background: '#1e40af', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving…' : editId ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GstBillingPage
