// @ts-nocheck
import { useEffect, useState } from 'react'
import { SquarePen, Trash2, Printer } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import BulkImportModal from '@/components/BulkImportModal'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { exportToCSV, exportToPDF, exportButtonStyle, printTable } from '@/utils/exportUtils'

const TransportPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('vehicles') // vehicles | drivers
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const emptyVehicleForm = {
    vehicleNumber: '', vehicleType: 'bus', capacity: '', driverId: '',
    routeName: '', routeStops: '', insuranceExpiry: '', fitnessExpiry: '', permitExpiry: '', status: 'active',
  }
  const emptyDriverForm = {
    firstName: '', lastName: '', phoneNumber: '', dateOfBirth: '', address: '', experience: '',
    licenseNumber: '', licenseType: 'HMV', licenseExpiry: '', aadhaarNumber: '', badgeNumber: '',
    bloodGroup: '', emergencyContact: '', status: 'active',
  }

  const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm)
  const [driverForm, setDriverForm] = useState(emptyDriverForm)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        apiClient.listVehicles().catch(() => ({ data: [] })),
        apiClient.listDrivers().catch(() => ({ data: [] })),
      ])
      setVehicles(vRes?.data || [])
      setDrivers(dRes?.data || [])
    } catch (error) {
      console.error('Failed to load transport data:', error)
    } finally {
      setLoading(false)
    }
  }

  // ── Vehicle CRUD ────────────────────────────────────────
  const handleSubmitVehicle = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...vehicleForm, capacity: parseInt(vehicleForm.capacity) || 0 }
      if (payload.driverId) payload.driverId = parseInt(payload.driverId)
      else payload.driverId = null
      if (editingId) {
        await apiClient.updateVehicle(editingId, payload)
      } else {
        await apiClient.createVehicle(payload)
      }
      setShowForm(false)
      setEditingId(null)
      setVehicleForm(emptyVehicleForm)
      loadData()
    } catch (error) {
      toast.error('Failed to save vehicle.')
    }
  }

  const handleEditVehicle = (v) => {
    setEditingId(v.id)
    setVehicleForm({
      vehicleNumber: v.vehicleNumber || '', vehicleType: v.vehicleType || 'bus',
      capacity: v.capacity || '', driverId: v.driverId || '',
      routeName: v.routeName || '', routeStops: v.routeStops || '',
      insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.split('T')[0] : '',
      fitnessExpiry: v.fitnessExpiry ? v.fitnessExpiry.split('T')[0] : '',
      permitExpiry: v.permitExpiry ? v.permitExpiry.split('T')[0] : '',
      status: v.status || 'active',
    })
    setShowForm(true)
  }

  const handleDeleteVehicle = async (id) => {
    const ok = await confirm({ message: 'Delete this vehicle?' })
    if (!ok) return
    try { await apiClient.deleteVehicle(id); loadData() } catch { toast.error('Failed to delete vehicle.') }
  }

  // ── Driver CRUD ─────────────────────────────────────────
  const handleSubmitDriver = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await apiClient.updateDriver(editingId, driverForm)
      } else {
        await apiClient.createDriver(driverForm)
      }
      setShowForm(false)
      setEditingId(null)
      setDriverForm(emptyDriverForm)
      loadData()
    } catch (error) {
      toast.error('Failed to save driver.')
    }
  }

  const handleEditDriver = (d) => {
    setEditingId(d.id)
    setDriverForm({
      firstName: d.firstName || '', lastName: d.lastName || '', phoneNumber: d.phoneNumber || '',
      dateOfBirth: d.dateOfBirth ? d.dateOfBirth.split('T')[0] : '',
      address: d.address || '', experience: d.experience || '',
      licenseNumber: d.licenseNumber || '', licenseType: d.licenseType || 'HMV',
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.split('T')[0] : '',
      aadhaarNumber: d.aadhaarNumber || '', badgeNumber: d.badgeNumber || '',
      bloodGroup: d.bloodGroup || '', emergencyContact: d.emergencyContact || '', status: d.status || 'active',
    })
    setShowForm(true)
  }

  const handleDeleteDriver = async (id) => {
    const ok = await confirm({ message: 'Delete this driver?' })
    if (!ok) return
    try { await apiClient.deleteDriver(id); loadData() } catch { toast.error('Failed to delete driver.') }
  }

  const handleAddNew = () => {
    setEditingId(null)
    if (activeTab === 'vehicles') setVehicleForm(emptyVehicleForm)
    else setDriverForm(emptyDriverForm)
    setShowForm(true)
  }

  // ── Filtering ───────────────────────────────────────────
  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase()
    return v.vehicleNumber?.toLowerCase().includes(q) || v.routeName?.toLowerCase().includes(q) || v.driver?.firstName?.toLowerCase().includes(q)
  })

  const filteredDrivers = drivers.filter((d) => {
    const q = searchQuery.toLowerCase()
    return d.firstName?.toLowerCase().includes(q) || d.lastName?.toLowerCase().includes(q) || d.licenseNumber?.toLowerCase().includes(q) || d.phoneNumber?.includes(q)
  })

  const { paginatedItems: paginatedVehicles, currentPage: vPage, totalPages: vTotal, totalItems: vItems, goToPage: goToVPage } = usePagination(filteredVehicles)
  const { paginatedItems: paginatedDrivers, currentPage: dPage, totalPages: dTotal, totalItems: dItems, goToPage: goToDPage } = usePagination(filteredDrivers)

  // ── Export columns ──────────────────────────────────────
  const vehicleExportCols = [
    { key: 'vehicleNumber', label: 'Vehicle No.' },
    { key: 'vehicleType', label: 'Type' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'routeName', label: 'Route' },
    { key: 'status', label: 'Status' },
  ]
  const driverExportCols = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'phoneNumber', label: 'Phone' },
    { key: 'licenseNumber', label: 'License No.' },
    { key: 'licenseType', label: 'License Type' },
    { key: 'experience', label: 'Experience' },
  ]

  const vehicleTemplateHeaders = ['vehicleNumber', 'vehicleType', 'capacity', 'routeName', 'routeStops']
  const driverTemplateHeaders = ['firstName', 'lastName', 'phoneNumber', 'licenseNumber', 'licenseType', 'experience', 'address']

  return (
    <div className="page">
      <div className="page-header">
        <h1>Transport</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={exportButtonStyle} onClick={() => exportToCSV(activeTab === 'vehicles' ? filteredVehicles : filteredDrivers, activeTab === 'vehicles' ? 'Vehicles' : 'Drivers', activeTab === 'vehicles' ? vehicleExportCols : driverExportCols)} title="Export CSV">📄 CSV</button>
          <button style={exportButtonStyle} onClick={() => exportToPDF(activeTab === 'vehicles' ? filteredVehicles : filteredDrivers, activeTab === 'vehicles' ? 'Vehicles' : 'Drivers', activeTab === 'vehicles' ? vehicleExportCols : driverExportCols, activeTab === 'vehicles' ? 'Vehicles' : 'Drivers')} title="Export PDF">📥 PDF</button>
          <button style={exportButtonStyle} onClick={() => printTable(activeTab === 'vehicles' ? 'transport-print-area' : 'transport-drivers-print-area', activeTab === 'vehicles' ? 'Vehicles' : 'Drivers')} title="Print"><Printer size={16} /> Print</button>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>Bulk Import</button>
          <button className="btn primary" onClick={() => showForm ? setShowForm(false) : handleAddNew()}>
            {showForm ? 'Cancel' : activeTab === 'vehicles' ? '+ Add Vehicle' : '+ Add Driver'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className={`btn ${activeTab === 'vehicles' ? 'primary' : 'outline'}`} onClick={() => { setActiveTab('vehicles'); setShowForm(false); setEditingId(null) }}>🚌 Vehicles ({vehicles.length})</button>
        <button className={`btn ${activeTab === 'drivers' ? 'primary' : 'outline'}`} onClick={() => { setActiveTab('drivers'); setShowForm(false); setEditingId(null) }}>🧑‍✈️ Drivers ({drivers.length})</button>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={activeTab === 'vehicles' ? 'Search by vehicle number, route...' : 'Search by name, license, phone...'}
      />

      <div className="page-content-scrollable">
        {/* ── Vehicles Tab ─────────────────────────────── */}
        {activeTab === 'vehicles' && (
          <>
            {showForm && (
              <div className="form-card">
                <h3>{editingId ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
                <form onSubmit={handleSubmitVehicle} className="form-grid">
                  <input type="text" placeholder="Vehicle Number (e.g. AP 07 AB 1234) *" value={vehicleForm.vehicleNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })} required />
                  <select value={vehicleForm.vehicleType} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}>
                    <option value="bus">Bus</option>
                    <option value="van">Van</option>
                    <option value="auto">Auto</option>
                    <option value="car">Car</option>
                  </select>
                  <input type="number" placeholder="Capacity *" value={vehicleForm.capacity} onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value })} required min="1" />
                  <select value={vehicleForm.driverId} onChange={(e) => setVehicleForm({ ...vehicleForm, driverId: e.target.value })}>
                    <option value="">Assign Driver (optional)</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName} — {d.licenseNumber}</option>)}
                  </select>
                  <input type="text" placeholder="Route Name" value={vehicleForm.routeName} onChange={(e) => setVehicleForm({ ...vehicleForm, routeName: e.target.value })} />
                  <input type="text" placeholder="Route Stops (comma-separated)" value={vehicleForm.routeStops} onChange={(e) => setVehicleForm({ ...vehicleForm, routeStops: e.target.value })} style={{ gridColumn: '1 / -1' }} />
                  <input type="date" title="Insurance Expiry" value={vehicleForm.insuranceExpiry} onChange={(e) => setVehicleForm({ ...vehicleForm, insuranceExpiry: e.target.value })} />
                  <input type="date" title="Fitness Expiry" value={vehicleForm.fitnessExpiry} onChange={(e) => setVehicleForm({ ...vehicleForm, fitnessExpiry: e.target.value })} />
                  <input type="date" title="Permit Expiry" value={vehicleForm.permitExpiry} onChange={(e) => setVehicleForm({ ...vehicleForm, permitExpiry: e.target.value })} />
                  <select value={vehicleForm.status} onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="maintenance">Under Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <button type="submit" className="btn primary" style={{ gridColumn: '1 / -1' }}>{editingId ? 'Update Vehicle' : 'Add Vehicle'}</button>
                </form>
              </div>
            )}

            {loading ? <div className="loading-state">Loading vehicles...</div> : (
              <div className="data-table" id="transport-print-area">
                <table>
                  <thead>
                    <tr>
                      <th>Vehicle No.</th>
                      <th>Type</th>
                      <th>Capacity</th>
                      <th>Driver</th>
                      <th>Route</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.length === 0 ? (
                      <tr><td colSpan="7" className="empty-row">{searchQuery ? 'No vehicles match.' : 'No vehicles added yet.'}</td></tr>
                    ) : paginatedVehicles.map((v) => (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600 }}>{v.vehicleNumber}</td>
                        <td style={{ textTransform: 'capitalize' }}>{v.vehicleType}</td>
                        <td>{v.capacity}</td>
                        <td>{v.driver ? `${v.driver.firstName} ${v.driver.lastName}` : '—'}</td>
                        <td>{v.routeName || '—'}</td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                            background: v.status === 'active' ? '#d1fae5' : v.status === 'maintenance' ? '#fef3c7' : '#fee2e2',
                            color: v.status === 'active' ? '#065f46' : v.status === 'maintenance' ? '#92400e' : '#991b1b',
                          }}>{v.status}</span>
                        </td>
                        <td>
                          <button className="btn-icon edit" onClick={() => handleEditVehicle(v)}><SquarePen size={16} /></button>
                          <button className="btn-icon danger" onClick={() => handleDeleteVehicle(v.id)}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination currentPage={vPage} totalPages={vTotal} totalItems={vItems} onPageChange={goToVPage} />
              </div>
            )}
          </>
        )}

        {/* ── Drivers Tab ──────────────────────────────── */}
        {activeTab === 'drivers' && (
          <>
            {showForm && (
              <div className="form-card">
                <h3>{editingId ? 'Edit Driver' : 'Add Driver'}</h3>
                <form onSubmit={handleSubmitDriver} className="form-grid">
                  <input type="text" placeholder="First Name *" value={driverForm.firstName} onChange={(e) => setDriverForm({ ...driverForm, firstName: e.target.value })} required />
                  <input type="text" placeholder="Last Name *" value={driverForm.lastName} onChange={(e) => setDriverForm({ ...driverForm, lastName: e.target.value })} required />
                  <input type="text" placeholder="Phone Number *" value={driverForm.phoneNumber} onChange={(e) => setDriverForm({ ...driverForm, phoneNumber: e.target.value })} required />
                  <input type="date" title="Date of Birth" value={driverForm.dateOfBirth} onChange={(e) => setDriverForm({ ...driverForm, dateOfBirth: e.target.value })} />
                  <input type="text" placeholder="Driving License Number *" value={driverForm.licenseNumber} onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })} required />
                  <select value={driverForm.licenseType} onChange={(e) => setDriverForm({ ...driverForm, licenseType: e.target.value })}>
                    <option value="LMV">LMV (Light Motor Vehicle)</option>
                    <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                    <option value="HTV">HTV (Heavy Transport Vehicle)</option>
                    <option value="HGMV">HGMV (Heavy Goods Motor Vehicle)</option>
                    <option value="MCWG">MCWG (Motorcycle with Gear)</option>
                  </select>
                  <input type="date" title="License Expiry" value={driverForm.licenseExpiry} onChange={(e) => setDriverForm({ ...driverForm, licenseExpiry: e.target.value })} />
                  <input type="text" placeholder="Experience (e.g. 5 years)" value={driverForm.experience} onChange={(e) => setDriverForm({ ...driverForm, experience: e.target.value })} />
                  <input type="text" placeholder="Aadhaar Number" value={driverForm.aadhaarNumber} onChange={(e) => setDriverForm({ ...driverForm, aadhaarNumber: e.target.value })} />
                  <input type="text" placeholder="RTO Badge Number" value={driverForm.badgeNumber} onChange={(e) => setDriverForm({ ...driverForm, badgeNumber: e.target.value })} />
                  <select value={driverForm.bloodGroup} onChange={(e) => setDriverForm({ ...driverForm, bloodGroup: e.target.value })}>
                    <option value="">Blood Group</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                  <input type="text" placeholder="Emergency Contact" value={driverForm.emergencyContact} onChange={(e) => setDriverForm({ ...driverForm, emergencyContact: e.target.value })} />
                  <input type="text" placeholder="Address" value={driverForm.address} onChange={(e) => setDriverForm({ ...driverForm, address: e.target.value })} style={{ gridColumn: '1 / -1' }} />
                  <select value={driverForm.status} onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="on-leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <button type="submit" className="btn primary" style={{ gridColumn: '1 / -1' }}>{editingId ? 'Update Driver' : 'Add Driver'}</button>
                </form>
              </div>
            )}

            {loading ? <div className="loading-state">Loading drivers...</div> : (
              <div className="data-table" id="transport-drivers-print-area">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>License No.</th>
                      <th>License Type</th>
                      <th>Experience</th>
                      <th>Vehicles</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.length === 0 ? (
                      <tr><td colSpan="8" className="empty-row">{searchQuery ? 'No drivers match.' : 'No drivers added yet.'}</td></tr>
                    ) : paginatedDrivers.map((d) => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 500 }}>{d.firstName} {d.lastName}</td>
                        <td>{d.phoneNumber}</td>
                        <td>{d.licenseNumber}</td>
                        <td>{d.licenseType || '-'}</td>
                        <td>{d.experience || '-'}</td>
                        <td>{d.vehicles?.length || 0}</td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                            background: d.status === 'active' ? '#d1fae5' : d.status === 'on-leave' ? '#fef3c7' : '#fee2e2',
                            color: d.status === 'active' ? '#065f46' : d.status === 'on-leave' ? '#92400e' : '#991b1b',
                          }}>{d.status}</span>
                        </td>
                        <td>
                          <button className="btn-icon edit" onClick={() => handleEditDriver(d)}><SquarePen size={16} /></button>
                          <button className="btn-icon danger" onClick={() => handleDeleteDriver(d.id)}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination currentPage={dPage} totalPages={dTotal} totalItems={dItems} onPageChange={goToDPage} />
              </div>
            )}
          </>
        )}

        {showBulkImport && (
          <BulkImportModal
            title={activeTab === 'vehicles' ? 'Vehicles' : 'Drivers'}
            templateHeaders={activeTab === 'vehicles' ? vehicleTemplateHeaders : driverTemplateHeaders}
            mapRowToPayload={(row) => {
              if (activeTab === 'vehicles') {
                if (!row.vehicleNumber || !row.vehicleType) return null
                return { vehicleNumber: String(row.vehicleNumber).trim(), vehicleType: String(row.vehicleType).trim(), capacity: parseInt(row.capacity) || 0, routeName: row.routeName || '', routeStops: row.routeStops || '' }
              } else {
                if (!row.firstName || !row.lastName || !row.licenseNumber) return null
                return { firstName: String(row.firstName).trim(), lastName: String(row.lastName).trim(), phoneNumber: String(row.phoneNumber || '').trim(), licenseNumber: String(row.licenseNumber).trim(), licenseType: row.licenseType || 'HMV', experience: row.experience || '', address: row.address || '' }
              }
            }}
            createItem={(payload) => activeTab === 'vehicles' ? apiClient.createVehicle(payload) : apiClient.createDriver(payload)}
            onClose={() => setShowBulkImport(false)}
            onDone={() => loadData()}
          />
        )}
      </div>
    </div>
  )
}

export default TransportPage
