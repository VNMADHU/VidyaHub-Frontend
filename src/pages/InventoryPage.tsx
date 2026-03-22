// @ts-nocheck
import { useEffect, useState } from 'react'
import { SquarePen, Trash2, Package, TrendingUp } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { exportToCSV, exportToPDF, exportButtonStyle } from '@/utils/exportUtils'
import Modal from '../components/Modal'

const CATEGORIES = [
  { value: 'computer',       label: 'Computer / Electronics' },
  { value: 'furniture',      label: 'Furniture' },
  { value: 'lab-equipment',  label: 'Lab Equipment' },
  { value: 'book',           label: 'Books / Textbooks' },
  { value: 'sports',         label: 'Sports Equipment' },
  { value: 'vehicle-parts',  label: 'Vehicle Parts' },
  { value: 'other',          label: 'Other' },
]

const CONDITIONS = ['good', 'fair', 'poor', 'damaged']
const STATUSES   = ['active', 'under-repair', 'disposed', 'lost']

const CATEGORY_COLORS = {
  'computer':      { bg: '#dbeafe', color: '#1e40af' },
  'furniture':     { bg: '#fce7f3', color: '#9d174d' },
  'lab-equipment': { bg: '#d1fae5', color: '#065f46' },
  'book':          { bg: '#fef3c7', color: '#92400e' },
  'sports':        { bg: '#ede9fe', color: '#5b21b6' },
  'vehicle-parts': { bg: '#fee2e2', color: '#991b1b' },
  'other':         { bg: '#f3f4f6', color: '#374151' },
}

const STATUS_COLORS = {
  'active':       { bg: '#d1fae5', color: '#065f46' },
  'under-repair': { bg: '#fef3c7', color: '#92400e' },
  'disposed':     { bg: '#f3f4f6', color: '#6b7280' },
  'lost':         { bg: '#fee2e2', color: '#991b1b' },
}

const CONDITION_COLORS = {
  'good':    { bg: '#d1fae5', color: '#065f46' },
  'fair':    { bg: '#dbeafe', color: '#1e40af' },
  'poor':    { bg: '#fef3c7', color: '#92400e' },
  'damaged': { bg: '#fee2e2', color: '#991b1b' },
}

const blankForm = {
  name: '', assetCode: '', category: 'computer', quantity: 1, unit: 'pieces',
  condition: 'good', location: '', purchaseDate: '', purchasePrice: '',
  vendor: '', warrantyExpiry: '', invoiceNo: '', description: '', status: 'active',
}

const InventoryPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()

  const [assets,  setAssets]  = useState([])
  const [summary, setSummary] = useState({ totalItems: 0, totalValue: 0, categories: {} })
  const [loading, setLoading] = useState(true)

  const [showForm,   setShowForm]   = useState(false)
  const [editingId,  setEditingId]  = useState(null)
  const [formData,   setFormData]   = useState({ ...blankForm })

  const [searchQuery,   setSearchQuery]   = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus,   setFilterStatus]   = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [assetsRes, summaryRes] = await Promise.all([
        apiClient.listAssets().catch(() => []),
        apiClient.getAssetSummary().catch(() => ({ totalItems: 0, totalValue: 0, categories: {} })),
      ])
      setAssets(Array.isArray(assetsRes) ? assetsRes : assetsRes?.data || [])
      setSummary(summaryRes || { totalItems: 0, totalValue: 0, categories: {} })
    } catch (err) {
      console.error('loadData error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = assets.filter((a) => {
    const q = searchQuery.toLowerCase()
    if (filterCategory && a.category !== filterCategory) return false
    if (filterStatus   && a.status   !== filterStatus)   return false
    if (!q) return true
    return (
      a.name?.toLowerCase().includes(q) ||
      a.assetCode?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q) ||
      a.vendor?.toLowerCase().includes(q)
    )
  })

  const { currentPage, totalPages, paginatedItems, setCurrentPage } = usePagination(filtered, 20)

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setFormData({ ...blankForm })
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (asset) => {
    setFormData({
      name:          asset.name         || '',
      assetCode:     asset.assetCode    || '',
      category:      asset.category     || 'computer',
      quantity:      asset.quantity     || 1,
      unit:          asset.unit         || 'pieces',
      condition:     asset.condition    || 'good',
      location:      asset.location     || '',
      purchaseDate:  asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      purchasePrice: asset.purchasePrice ?? '',
      vendor:        asset.vendor       || '',
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
      invoiceNo:     asset.invoiceNo    || '',
      description:   asset.description || '',
      status:        asset.status       || 'active',
    })
    setEditingId(asset.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.category) {
      toast.error('Name and category are required')
      return
    }
    try {
      if (editingId) {
        await apiClient.updateAsset(String(editingId), formData)
        toast.success('Asset updated')
      } else {
        await apiClient.createAsset(formData)
        toast.success('Asset added')
      }
      setShowForm(false)
      loadData()
    } catch (err) {
      toast.error(err.message || 'Failed to save asset')
    }
  }

  const handleDelete = async (asset) => {
    const ok = await confirm({
      title: 'Delete Asset',
      message: `Delete "${asset.name}"? This cannot be undone.`,
    })
    if (!ok) return
    try {
      await apiClient.deleteAsset(String(asset.id))
      toast.success('Asset deleted')
      loadData()
    } catch (err) {
      toast.error(err.message || 'Failed to delete asset')
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExportCSV = () =>
    exportToCSV(filtered, [
      { header: 'Name',          key: 'name' },
      { header: 'Code',          key: 'assetCode' },
      { header: 'Category',      key: 'category' },
      { header: 'Quantity',      key: 'quantity' },
      { header: 'Condition',     key: 'condition' },
      { header: 'Location',      key: 'location' },
      { header: 'Status',        key: 'status' },
      { header: 'Vendor',        key: 'vendor' },
      { header: 'Purchase Price',key: 'purchasePrice' },
    ], 'inventory')

  const handleExportPDF = () =>
    exportToPDF('Inventory / Assets', filtered, [
      { header: 'Name',      key: 'name' },
      { header: 'Code',      key: 'assetCode' },
      { header: 'Category',  key: 'category' },
      { header: 'Qty',       key: 'quantity' },
      { header: 'Condition', key: 'condition' },
      { header: 'Location',  key: 'location' },
      { header: 'Status',    key: 'status' },
    ])

  const f = (v) => typeof v === 'object' ? v : { bg: '#f3f4f6', color: '#374151' }

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Loading inventory…</div>

  return (
    <div style={{  fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#111827' }}>🏗️ Inventory &amp; Assets</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Track computers, furniture, lab equipment and more
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleExportCSV} style={exportButtonStyle} title="Export CSV">📄 CSV</button>
          <button onClick={handleExportPDF} style={exportButtonStyle} title="Export PDF">📥 PDF</button>
          <button
            onClick={openAdd}
            style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
          >
            + Add Asset
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <SummaryCard icon="📦" label="Total Items"  value={summary.totalItems} color="#6366f1" />
        <SummaryCard icon="💰" label="Total Value"  value={`₹${(summary.totalValue || 0).toLocaleString('en-IN')}`} color="#10b981" />
        {Object.entries(summary.categories || {}).slice(0, 4).map(([cat, data]) => (
          <SummaryCard key={cat} icon="🗂️" label={CATEGORIES.find(c => c.value === cat)?.label || cat} value={data.quantity} color="#f59e0b" />
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search name, code, location, vendor…" style={{ flex: '1 1 260px', minWidth: '200px', marginBottom: 0 }} />
        <select
          value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          style={{ flex: '0 0 auto', padding: '0.45rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', height: '40px', minWidth: '180px' }}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select
          value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ flex: '0 0 auto', padding: '0.45rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', height: '40px', minWidth: '150px' }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('-', ' ')}</option>)}
        </select>
        {(filterCategory || filterStatus || searchQuery) && (
          <button onClick={() => { setFilterCategory(''); setFilterStatus(''); setSearchQuery('') }}
            style={{ flex: '0 0 auto', padding: '0.45rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', height: '40px', cursor: 'pointer', color: '#6b7280', background: '#fff' }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--surface-alt, #f8fafc)', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                {['Asset Name', 'Code', 'Category', 'Qty', 'Condition', 'Location', 'Status', 'Vendor', 'Purchase Price', 'Actions']
                  .map(h => (
                    <th key={h} style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text, #1e293b)', fontSize: '0.9rem', borderBottom: '1px solid var(--border, #e5e7eb)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                    {assets.length === 0 ? 'No assets added yet. Click "+ Add Asset" to get started.' : 'No assets match your filters.'}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((asset, i) => {
                  const catColor  = f(CATEGORY_COLORS[asset.category])
                  const statColor = f(STATUS_COLORS[asset.status])
                  const condColor = f(CONDITION_COLORS[asset.condition])
                  return (
                    <tr key={asset.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>{asset.name}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontFamily: 'monospace' }}>{asset.assetCode || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ ...catColor, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 500 }}>
                          {CATEGORIES.find(c => c.value === asset.category)?.label || asset.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#374151' }}>{asset.quantity} {asset.unit || ''}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ ...condColor, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 500 }}>
                          {asset.condition}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#374151' }}>{asset.location || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ ...statColor, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 500 }}>
                          {asset.status.replace('-', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#374151' }}>{asset.vendor || '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#374151' }}>
                        {asset.purchasePrice != null ? `₹${Number(asset.purchasePrice).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => openEdit(asset)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: 4 }}
                            title="Edit">
                            <SquarePen size={16} />
                          </button>
                          <button onClick={() => handleDelete(asset)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}
                            title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <Modal
          title={editingId ? 'Edit Asset' : 'Add New Asset'}
          onClose={() => setShowForm(false)}
          footer={<button type="submit" form="inventory-form" className="btn primary">{editingId ? 'Update Asset' : 'Add Asset'}</button>}
        >
          <form id="inventory-form" onSubmit={e => { e.preventDefault(); handleSave() }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
              <FormField label="Asset Name *">
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. HP Laptop, Wooden Bench" style={inputStyle} />
              </FormField>
              <FormField label="Asset Code">
                <input value={formData.assetCode} onChange={e => setFormData({ ...formData, assetCode: e.target.value })}
                  placeholder="e.g. COMP-001" style={inputStyle} />
              </FormField>
              <FormField label="Category *">
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </FormField>
              <FormField label="Quantity">
                <input type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} style={inputStyle} />
              </FormField>
              <FormField label="Unit">
                <input value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="pieces, sets, kg…" style={inputStyle} />
              </FormField>
              <FormField label="Location">
                <input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Computer Lab, Room 101" style={inputStyle} />
              </FormField>
              <FormField label="Condition">
                <select value={formData.condition} onChange={e => setFormData({ ...formData, condition: e.target.value })} style={inputStyle}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </FormField>
              <FormField label="Status">
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('-', ' ')}</option>)}
                </select>
              </FormField>
              <FormField label="Purchase Date">
                <input type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} style={inputStyle} />
              </FormField>
              <FormField label="Purchase Price (₹)">
                <input type="number" min="0" value={formData.purchasePrice} onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                  placeholder="0.00" style={inputStyle} />
              </FormField>
              <FormField label="Vendor / Supplier">
                <input value={formData.vendor} onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="Vendor name" style={inputStyle} />
              </FormField>
              <FormField label="Invoice No">
                <input value={formData.invoiceNo} onChange={e => setFormData({ ...formData, invoiceNo: e.target.value })}
                  placeholder="INV-2025-001" style={inputStyle} />
              </FormField>
              <FormField label="Warranty Expiry">
                <input type="date" value={formData.warrantyExpiry} onChange={e => setFormData({ ...formData, warrantyExpiry: e.target.value })} style={inputStyle} />
              </FormField>
              <FormField label="Description" style={{ gridColumn: 'span 2' }}>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2} placeholder="Optional notes…" style={{ ...inputStyle, resize: 'vertical' }} />
              </FormField>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Small helper components ───────────────────────────────────────────────────

const SummaryCard = ({ icon, label, value, color }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{ fontSize: 28 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
    </div>
  </div>
)

const FormField = ({ label, children, style = {} }) => (
  <div style={style}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{label}</label>
    {children}
  </div>
)

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  boxSizing: 'border-box',
  outline: 'none',
}

export default InventoryPage
