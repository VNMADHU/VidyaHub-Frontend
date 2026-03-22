// @ts-nocheck
import { useEffect, useState } from 'react'
import { SquarePen, Trash2, Printer } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import SearchBar from '@/components/SearchBar'
import Modal from '@/components/Modal'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { exportToCSV, exportToPDF, exportButtonStyle, printTable } from '@/utils/exportUtils'

const STATUS_BADGE = {
  active:      { bg: '#d1fae5', color: '#065f46' },
  inactive:    { bg: '#e5e7eb', color: '#374151' },
  available:   { bg: '#d1fae5', color: '#065f46' },
  occupied:    { bg: '#fee2e2', color: '#991b1b' },
  maintenance: { bg: '#fef3c7', color: '#92400e' },
  vacated:     { bg: '#e5e7eb', color: '#374151' },
}

const Badge = ({ status }) => (
  <span style={{
    padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
    background: STATUS_BADGE[status]?.bg || '#e5e7eb',
    color: STATUS_BADGE[status]?.color || '#374151',
    textTransform: 'capitalize',
  }}>{status}</span>
)

const emptyHostel = {
  name: '', type: 'boys', totalCapacity: '', numberOfRooms: '', wardenName: '', wardenPhone: '',
  wardenEmail: '', address: '', description: '', status: 'active',
}

const emptyRoom = {
  hostelId: '', roomNumber: '', floor: '', type: 'double', capacity: '2',
  amenities: '', status: 'available',
}

const emptyAllotment = {
  hostelId: '', roomId: '', studentName: '', admissionNumber: '',
  allotmentDate: new Date().toISOString().split('T')[0],
  vacatingDate: '', roomFee: '', messFee: '', emergencyContact: '', remarks: '', status: 'active',
}

const HostelPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState('hostels') // hostels | rooms | allotments
  const [hostels, setHostels] = useState([])
  const [rooms, setRooms] = useState([])
  const [allotments, setAllotments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterHostelId, setFilterHostelId] = useState('')

  const [hostelForm, setHostelForm] = useState(emptyHostel)
  const [roomForm, setRoomForm] = useState(emptyRoom)
  const [allotmentForm, setAllotmentForm] = useState(emptyAllotment)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [hRes, rRes, aRes] = await Promise.all([
        apiClient.listHostels().catch(() => ({ data: [] })),
        apiClient.listHostelRooms().catch(() => ({ data: [] })),
        apiClient.listHostelAllotments().catch(() => ({ data: [] })),
      ])
      setHostels(hRes?.data || [])
      setRooms(rRes?.data || [])
      setAllotments(aRes?.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // ── Hostel CRUD ────────────────────────────────────────
  const handleSubmitHostel = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...hostelForm, totalCapacity: parseInt(hostelForm.totalCapacity) || 0, numberOfRooms: parseInt(hostelForm.numberOfRooms) || 0 }
      if (editingId) await apiClient.updateHostel(editingId, payload)
      else await apiClient.createHostel(payload)
      toast.success(editingId ? 'Hostel updated' : 'Hostel created')
      setShowForm(false); setEditingId(null); setHostelForm(emptyHostel); loadAll()
    } catch (err) { toast.error(err?.message || 'Failed to save hostel.') }
  }

  const handleEditHostel = (h) => {
    setEditingId(h.id)
    setHostelForm({
      name: h.name || '', type: h.type || 'boys', totalCapacity: h.totalCapacity || '',
      numberOfRooms: h.numberOfRooms || '',
      wardenName: h.wardenName || '', wardenPhone: h.wardenPhone || '',
      wardenEmail: h.wardenEmail || '', address: h.address || '',
      description: h.description || '', status: h.status || 'active',
    })
    setShowForm(true);
  }

  const handleDeleteHostel = async (id) => {
    if (!await confirm({ message: 'Delete this hostel and all its rooms/allotments?' })) return
    try { await apiClient.deleteHostel(id); loadAll() } catch (err) { toast.error(err?.message || 'Failed to delete hostel.') }
  }

  // ── Room CRUD ──────────────────────────────────────────
  const handleSubmitRoom = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...roomForm, hostelId: parseInt(roomForm.hostelId), capacity: parseInt(roomForm.capacity) || 2 }
      if (editingId) await apiClient.updateHostelRoom(editingId, payload)
      else await apiClient.createHostelRoom(payload)
      toast.success(editingId ? 'Room updated' : 'Room created')
      setShowForm(false); setEditingId(null); setRoomForm(emptyRoom); loadAll()
    } catch (err) { toast.error(err?.message || 'Failed to save room.') }
  }

  const handleEditRoom = (r) => {
    setEditingId(r.id)
    setRoomForm({
      hostelId: r.hostelId || '', roomNumber: r.roomNumber || '', floor: r.floor || '',
      type: r.type || 'double', capacity: r.capacity || '2',
      amenities: r.amenities || '', status: r.status || 'available',
    })
    setShowForm(true);
  }

  const handleDeleteRoom = async (id) => {
    if (!await confirm({ message: 'Delete this room?' })) return
    try { await apiClient.deleteHostelRoom(id); loadAll() } catch (err) { toast.error(err?.message || 'Failed to delete room.') }
  }

  // ── Allotment CRUD ─────────────────────────────────────
  const handleSubmitAllotment = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...allotmentForm,
        hostelId: parseInt(allotmentForm.hostelId),
        roomId: parseInt(allotmentForm.roomId),
        roomFee: allotmentForm.roomFee ? parseFloat(allotmentForm.roomFee) : null,
        messFee: allotmentForm.messFee ? parseFloat(allotmentForm.messFee) : null,
        vacatingDate: allotmentForm.vacatingDate || null,
      }
      if (editingId) await apiClient.updateHostelAllotment(editingId, payload)
      else await apiClient.createHostelAllotment(payload)
      toast.success(editingId ? 'Allotment updated' : 'Allotment created')
      setShowForm(false); setEditingId(null); setAllotmentForm(emptyAllotment); loadAll()
    } catch (err) { toast.error(err?.message || 'Failed to save allotment.') }
  }

  const handleEditAllotment = (a) => {
    setEditingId(a.id)
    setAllotmentForm({
      hostelId: a.hostelId || '', roomId: a.roomId || '',
      studentName: a.studentName || '', admissionNumber: a.admissionNumber || '',
      allotmentDate: a.allotmentDate ? a.allotmentDate.split('T')[0] : '',
      vacatingDate: a.vacatingDate ? a.vacatingDate.split('T')[0] : '',
      roomFee: a.roomFee || '', messFee: a.messFee || '',
      emergencyContact: a.emergencyContact || '', remarks: a.remarks || '', status: a.status || 'active',
    })
    setShowForm(true);
  }

  const handleDeleteAllotment = async (id) => {
    if (!await confirm({ message: 'Delete this allotment?' })) return
    try { await apiClient.deleteHostelAllotment(id); loadAll() } catch (err) { toast.error(err?.message || 'Failed to delete allotment.') }
  }

  const handleAddNew = () => {
    setEditingId(null)
    if (activeTab === 'hostels') setHostelForm(emptyHostel)
    else if (activeTab === 'rooms') setRoomForm(emptyRoom)
    else setAllotmentForm(emptyAllotment)
    setShowForm(true);
  }

  // ── Filtering ──────────────────────────────────────────
  const q = searchQuery.toLowerCase()
  const filteredHostels = hostels.filter(h =>
    h.name?.toLowerCase().includes(q) || h.wardenName?.toLowerCase().includes(q) || h.type?.includes(q)
  )
  const filteredRooms = rooms.filter(r =>
    (!filterHostelId || String(r.hostelId) === filterHostelId) &&
    (r.roomNumber?.toLowerCase().includes(q) || r.hostel?.name?.toLowerCase().includes(q) || r.type?.includes(q))
  )
  const filteredAllotments = allotments.filter(a =>
    (!filterHostelId || String(a.hostelId) === filterHostelId) &&
    (a.studentName?.toLowerCase().includes(q) || a.admissionNumber?.toLowerCase().includes(q) ||
      a.room?.roomNumber?.toLowerCase().includes(q) || a.hostel?.name?.toLowerCase().includes(q))
  )

  const { paginatedItems: pHostels, currentPage: hPage, totalPages: hTotal, totalItems: hItems, goToPage: goToH } = usePagination(filteredHostels)
  const { paginatedItems: pRooms,   currentPage: rPage, totalPages: rTotal, totalItems: rItems, goToPage: goToR } = usePagination(filteredRooms)
  const { paginatedItems: pAllotments, currentPage: aPage, totalPages: aTotal, totalItems: aItems, goToPage: goToA } = usePagination(filteredAllotments)

  // rooms filtered by selected hostel (for allotment form)
  const roomsForHostel = rooms.filter(r => String(r.hostelId) === String(allotmentForm.hostelId))

  const totalStudents = allotments.filter(a => a.status === 'active').length
  const occupiedRooms = rooms.filter(r => r.status === 'occupied').length

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏠 Hostel Management</h1>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
            Residents: {totalStudents}
          </span>
          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
            Occupied Rooms: {occupiedRooms}
          </span>
          <button style={exportButtonStyle} onClick={() => printTable(
            activeTab === 'hostels' ? 'hostel-print-area' : activeTab === 'rooms' ? 'rooms-print-area' : 'allotments-print-area',
            activeTab === 'hostels' ? 'Hostels' : activeTab === 'rooms' ? 'Hostel Rooms' : 'Allotments'
          )} title="Print"><Printer size={16} /> Print</button>
          <button className="btn primary" onClick={handleAddNew}>
            {activeTab === 'hostels' ? '+ Add Hostel' : activeTab === 'rooms' ? '+ Add Room' : '+ Add Allotment'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className={`btn ${activeTab === 'hostels' ? 'primary' : 'outline'}`}
          onClick={() => { setActiveTab('hostels'); setShowForm(false); setEditingId(null) }}>
          🏠 Hostels ({hostels.length})
        </button>
        <button className={`btn ${activeTab === 'rooms' ? 'primary' : 'outline'}`}
          onClick={() => { setActiveTab('rooms'); setShowForm(false); setEditingId(null) }}>
          🛏 Rooms ({rooms.length})
        </button>
        <button className={`btn ${activeTab === 'allotments' ? 'primary' : 'outline'}`}
          onClick={() => { setActiveTab('allotments'); setShowForm(false); setEditingId(null) }}>
          👤 Allotments ({allotments.filter(a => a.status === 'active').length})
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <SearchBar value={searchQuery} onChange={setSearchQuery}
          placeholder={activeTab === 'hostels' ? 'Search by name, warden...' : activeTab === 'rooms' ? 'Search by room number, hostel...' : 'Search by student, room...'}
          style={{ flex: '1 1 260px', minWidth: '200px', marginBottom: 0 }}
        />
        {activeTab !== 'hostels' && (
          <select value={filterHostelId} onChange={e => setFilterHostelId(e.target.value)} className="filter-select"
            style={{ minWidth: '150px', height: '42px' }}>
            <option value="">All Hostels</option>
            {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      <div className="page-content-scrollable">

        {/* ── HOSTELS TAB ─────────────────────────────── */}
        {activeTab === 'hostels' && (
          <>
            {showForm && (
              <Modal title={editingId ? 'Edit Hostel' : 'Add Hostel'} onClose={() => setShowForm(false)} footer={<button type="submit" form="hostel-form" className="btn primary">{editingId ? 'Update Hostel' : 'Add Hostel'}</button>}>
                <form id="hostel-form" onSubmit={handleSubmitHostel} className="form-grid">
                  <label>
                    <span className="field-label">Hostel Name *</span>
                    <input placeholder="Hostel Name *" title="Hostel Name" value={hostelForm.name} onChange={e => setHostelForm({ ...hostelForm, name: e.target.value })} required />
                  </label>
                  <label>
                    <span className="field-label">Hostel Type</span>
                    <select title="Hostel Type (Boys / Girls / Mixed)" value={hostelForm.type} onChange={e => setHostelForm({ ...hostelForm, type: e.target.value })}>
                      <option value="boys">Boys</option>
                      <option value="girls">Girls</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Total Capacity</span>
                    <input type="number" placeholder="Total Capacity" title="Total bed capacity of the hostel" value={hostelForm.totalCapacity} onChange={e => setHostelForm({ ...hostelForm, totalCapacity: e.target.value })} min="0" />
                  </label>
                  <label>
                    <span className="field-label">Number of Rooms</span>
                    <input type="number" placeholder="Number of Rooms" title="Total number of rooms in this hostel" value={hostelForm.numberOfRooms} onChange={e => setHostelForm({ ...hostelForm, numberOfRooms: e.target.value })} min="0" />
                  </label>
                  <label>
                    <span className="field-label">Warden Name</span>
                    <input placeholder="Warden Name" title="Warden Full Name" value={hostelForm.wardenName} onChange={e => setHostelForm({ ...hostelForm, wardenName: e.target.value })} />
                  </label>
                  <label>
                    <span className="field-label">Warden Phone</span>
                    <input placeholder="Warden Phone" title="Warden Phone Number" value={hostelForm.wardenPhone} onChange={e => setHostelForm({ ...hostelForm, wardenPhone: e.target.value })} />
                  </label>
                  <label>
                    <span className="field-label">Warden Email</span>
                    <input type="email" placeholder="Warden Email" title="Warden Email Address" value={hostelForm.wardenEmail} onChange={e => setHostelForm({ ...hostelForm, wardenEmail: e.target.value })} />
                  </label>
                  <label>
                    <span className="field-label">Status</span>
                    <select title="Hostel Status (Active / Inactive)" value={hostelForm.status} onChange={e => setHostelForm({ ...hostelForm, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Address / Block</span>
                    <input placeholder="Address / Block" title="Address or Block location of the hostel" value={hostelForm.address} onChange={e => setHostelForm({ ...hostelForm, address: e.target.value })} />
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    <span className="field-label">Description</span>
                    <textarea placeholder="Description" title="Additional description or notes about the hostel" value={hostelForm.description} onChange={e => setHostelForm({ ...hostelForm, description: e.target.value })} rows="2" />
                  </label>
                </form>
              </Modal>
            )}

            {loading ? <div className="loading-state">Loading hostels...</div> : (
              <div className="data-table" id="hostel-print-area">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Capacity</th>
                      <th>No. of Rooms</th>
                      <th>Allotted</th>
                      <th>Warden</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHostels.length === 0 ? (
                      <tr><td colSpan="9" className="empty-row">{searchQuery ? 'No hostels match.' : 'No hostels added yet.'}</td></tr>
                    ) : pHostels.map(h => (
                      <tr key={h.id}>
                        <td style={{ fontWeight: 600 }}>{h.name}</td>
                        <td style={{ textTransform: 'capitalize' }}>{h.type}</td>
                        <td>{h.totalCapacity}</td>
                        <td>{h.numberOfRooms || 0}</td>
                        <td>{h._count?.allotments || 0}</td>
                        <td>{h.wardenName || '—'}</td>
                        <td>{h.wardenPhone || '—'}</td>
                        <td><Badge status={h.status} /></td>
                        <td>
                          <button className="btn-icon edit" onClick={() => handleEditHostel(h)}><SquarePen size={16} /></button>
                          <button className="btn-icon danger" onClick={() => handleDeleteHostel(h.id)}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination currentPage={hPage} totalPages={hTotal} totalItems={hItems} onPageChange={goToH} />
              </div>
            )}
          </>
        )}

        {/* ── ROOMS TAB ───────────────────────────────── */}
        {activeTab === 'rooms' && (
          <>
            {showForm && (
              <Modal title={editingId ? 'Edit Room' : 'Add Room'} onClose={() => setShowForm(false)} footer={<button type="submit" form="room-form" className="btn primary">{editingId ? 'Update Room' : 'Add Room'}</button>}>
                <form id="room-form" onSubmit={handleSubmitRoom} className="form-grid">
                  <label>
                    <span className="field-label">Hostel *</span>
                    <select title="Select the hostel this room belongs to" value={roomForm.hostelId} onChange={e => setRoomForm({ ...roomForm, hostelId: e.target.value })} required>
                      <option value="">Select Hostel *</option>
                      {hostels.map(h => <option key={h.id} value={h.id}>{h.name} ({h.type})</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Room Number *</span>
                    <input placeholder="Room Number *" title="Room Number (e.g. 101, A-12, G-05)" value={roomForm.roomNumber} onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })} required />
                  </label>
                  <label>
                    <span className="field-label">Floor</span>
                    <input placeholder="Floor (e.g. Ground, 1st)" title="Floor where the room is located (e.g. Ground, 1st, 2nd)" value={roomForm.floor} onChange={e => setRoomForm({ ...roomForm, floor: e.target.value })} />
                  </label>
                  <label>
                    <span className="field-label">Room Type</span>
                    <select title="Room Type (Single / Double / Triple / Dormitory)" value={roomForm.type} onChange={e => setRoomForm({ ...roomForm, type: e.target.value })}>
                      <option value="single">Single</option>
                      <option value="double">Double</option>
                      <option value="triple">Triple</option>
                      <option value="dormitory">Dormitory</option>
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Capacity *</span>
                    <input type="number" placeholder="Capacity *" title="Number of beds / students this room can accommodate" value={roomForm.capacity} onChange={e => setRoomForm({ ...roomForm, capacity: e.target.value })} required min="1" />
                  </label>
                  <label>
                    <span className="field-label">Room Status</span>
                    <select title="Room Status (Available / Occupied / Under Maintenance)" value={roomForm.status} onChange={e => setRoomForm({ ...roomForm, status: e.target.value })}>
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Under Maintenance</option>
                    </select>
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    <span className="field-label">Amenities</span>
                    <input placeholder="Amenities (comma-separated: AC, WiFi, ...)" title="List amenities separated by commas (e.g. AC, WiFi, Attached Bath, Hot Water)" value={roomForm.amenities} onChange={e => setRoomForm({ ...roomForm, amenities: e.target.value })} />
                  </label>
                </form>
              </Modal>
            )}

            {loading ? <div className="loading-state">Loading rooms...</div> : (
              <div className="data-table" id="rooms-print-area">
                <table>
                  <thead>
                    <tr>
                      <th>Hostel</th>
                      <th>Room No.</th>
                      <th>Floor</th>
                      <th>Type</th>
                      <th>Capacity</th>
                      <th>Occupied</th>
                      <th>Amenities</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.length === 0 ? (
                      <tr><td colSpan="9" className="empty-row">{searchQuery ? 'No rooms match.' : 'No rooms added yet.'}</td></tr>
                    ) : pRooms.map(r => (
                      <tr key={r.id}>
                        <td>{r.hostel?.name || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{r.roomNumber}</td>
                        <td>{r.floor || '—'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.type}</td>
                        <td>{r.capacity}</td>
                        <td>{r._count?.allotments || 0} / {r.capacity}</td>
                        <td style={{ fontSize: '0.8rem', maxWidth: 160 }}>{r.amenities || '—'}</td>
                        <td><Badge status={r.status} /></td>
                        <td>
                          <button className="btn-icon edit" onClick={() => handleEditRoom(r)}><SquarePen size={16} /></button>
                          <button className="btn-icon danger" onClick={() => handleDeleteRoom(r.id)}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination currentPage={rPage} totalPages={rTotal} totalItems={rItems} onPageChange={goToR} />
              </div>
            )}
          </>
        )}

        {/* ── ALLOTMENTS TAB ──────────────────────────── */}
        {activeTab === 'allotments' && (
          <>
            {showForm && (
              <Modal title={editingId ? 'Edit Allotment' : 'Allot Room'} onClose={() => setShowForm(false)} footer={<button type="submit" form="allotment-form" className="btn primary">{editingId ? 'Update Allotment' : 'Allot Room'}</button>}>
                <form id="allotment-form" onSubmit={handleSubmitAllotment} className="form-grid">
                  <label>
                    <span className="field-label">Student Name *</span>
                    <input placeholder="Student Name *" title="Full name of the student being allotted" value={allotmentForm.studentName} onChange={e => setAllotmentForm({ ...allotmentForm, studentName: e.target.value })} required />
                  </label>
                  <label>
                    <span className="field-label">Admission Number</span>
                    <input placeholder="Admission Number" title="Student Admission / Roll Number" value={allotmentForm.admissionNumber} onChange={e => setAllotmentForm({ ...allotmentForm, admissionNumber: e.target.value })} />
                  </label>
                  <label>
                    <span className="field-label">Hostel *</span>
                    <select title="Select the hostel to allot" value={allotmentForm.hostelId} onChange={e => setAllotmentForm({ ...allotmentForm, hostelId: e.target.value, roomId: '' })} required>
                      <option value="">Select Hostel *</option>
                      {hostels.map(h => <option key={h.id} value={h.id}>{h.name} ({h.type})</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Room *</span>
                    <select title="Select the room to allot (shows available rooms for chosen hostel)" value={allotmentForm.roomId} onChange={e => setAllotmentForm({ ...allotmentForm, roomId: e.target.value })} required>
                      <option value="">Select Room *</option>
                      {roomsForHostel.map(r => <option key={r.id} value={r.id}>Room {r.roomNumber} ({r.floor || ''}) — {r.type} — {r._count?.allotments || 0}/{r.capacity}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Allotment Date</span>
                    <input type="date" title="Allotment Date (date when student moves in)" value={allotmentForm.allotmentDate} onChange={e => setAllotmentForm({ ...allotmentForm, allotmentDate: e.target.value })} />
                  </label>
                  <label>
                    <span className="field-label">Vacating Date</span>
                    <input type="date" title="Vacating Date — leave blank if not yet decided" value={allotmentForm.vacatingDate} onChange={e => setAllotmentForm({ ...allotmentForm, vacatingDate: e.target.value })} />
                  </label>
                  <label>
                    <span className="field-label">Room Fee (₹/month)</span>
                    <input type="number" placeholder="Room Fee (₹/month)" title="Monthly room rent in rupees" value={allotmentForm.roomFee} onChange={e => setAllotmentForm({ ...allotmentForm, roomFee: e.target.value })} min="0" />
                  </label>
                  <label>
                    <span className="field-label">Mess Fee (₹/month)</span>
                    <input type="number" placeholder="Mess Fee (₹/month)" title="Monthly mess / food fee in rupees" value={allotmentForm.messFee} onChange={e => setAllotmentForm({ ...allotmentForm, messFee: e.target.value })} min="0" />
                  </label>
                  <label>
                    <span className="field-label">Emergency Contact</span>
                    <input placeholder="Emergency Contact" title="Emergency contact phone number (parent / guardian)" value={allotmentForm.emergencyContact} onChange={e => setAllotmentForm({ ...allotmentForm, emergencyContact: e.target.value })} />
                  </label>
                  <label>
                    <span className="field-label">Status</span>
                    <select title="Allotment Status (Active = currently staying, Vacated = left hostel)" value={allotmentForm.status} onChange={e => setAllotmentForm({ ...allotmentForm, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="vacated">Vacated</option>
                    </select>
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    <span className="field-label">Remarks</span>
                    <textarea placeholder="Remarks" title="Any additional remarks or special notes" value={allotmentForm.remarks} onChange={e => setAllotmentForm({ ...allotmentForm, remarks: e.target.value })} rows="2" />
                  </label>
                </form>
              </Modal>
            )}

            {loading ? <div className="loading-state">Loading allotments...</div> : (
              <div className="data-table" id="allotments-print-area">
                <table>
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Adm. No.</th>
                      <th>Hostel</th>
                      <th>Room</th>
                      <th>Allotment Date</th>
                      <th>Room Fee</th>
                      <th>Mess Fee</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllotments.length === 0 ? (
                      <tr><td colSpan="9" className="empty-row">{searchQuery ? 'No allotments match.' : 'No allotments added yet.'}</td></tr>
                    ) : pAllotments.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.studentName}</td>
                        <td>{a.admissionNumber || '—'}</td>
                        <td>{a.hostel?.name || '—'}</td>
                        <td>Room {a.room?.roomNumber}{a.room?.floor ? ` (${a.room.floor})` : ''}</td>
                        <td>{a.allotmentDate ? new Date(a.allotmentDate).toLocaleDateString('en-IN') : '—'}</td>
                        <td>{a.roomFee ? `₹${a.roomFee}` : '—'}</td>
                        <td>{a.messFee ? `₹${a.messFee}` : '—'}</td>
                        <td><Badge status={a.status} /></td>
                        <td>
                          <button className="btn-icon edit" onClick={() => handleEditAllotment(a)}><SquarePen size={16} /></button>
                          <button className="btn-icon danger" onClick={() => handleDeleteAllotment(a.id)}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination currentPage={aPage} totalPages={aTotal} totalItems={aItems} onPageChange={goToA} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default HostelPage
