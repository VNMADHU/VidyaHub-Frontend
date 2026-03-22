// @ts-nocheck
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, Calendar, Users, Printer } from 'lucide-react'
import apiClient from '@/services/api'
import { useToast } from '@/components/ToastContainer'
import { exportToCSV, exportToPDF, exportButtonStyle, printTable } from '@/utils/exportUtils'

const TABS = [
  { key: 'teacher', label: '👨‍🏫 Teachers' },
  { key: 'staff',   label: '🧑‍💼 Staff' },
  { key: 'driver',  label: '🚌 Drivers' },
]

const STATUS_OPTIONS = [
  { value: 'present',  label: 'Present',  color: '#10b981', bg: '#d1fae5' },
  { value: 'absent',   label: 'Absent',   color: '#ef4444', bg: '#fee2e2' },
  { value: 'late',     label: 'Late',     color: '#f59e0b', bg: '#fef3c7' },
  { value: 'half-day', label: 'Half Day', color: '#6366f1', bg: '#ede9fe' },
  { value: 'on-leave', label: 'On Leave', color: '#6b7280', bg: '#f3f4f6' },
]

const statusStyle = (s) => {
  const opt = STATUS_OPTIONS.find(o => o.value === s)
  return opt ? { color: opt.color, background: opt.bg } : {}
}

const today = () => new Date().toISOString().split('T')[0]
const monthName = (m) => ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1]

const StaffAttendancePage = () => {
  const toast = useToast()
  const [activeTab, setActiveTab]       = useState('teacher')
  const [viewMode,  setViewMode]        = useState('daily')    // daily | monthly
  const [date,      setDate]            = useState(today())
  const [month,     setMonth]           = useState(new Date().getMonth() + 1)
  const [year,      setYear]            = useState(new Date().getFullYear())
  const [loading,   setLoading]         = useState(false)
  const [saving,    setSaving]          = useState(false)

  // employee lists
  const [teachers,  setTeachers]  = useState([])
  const [staffList, setStaffList] = useState([])
  const [drivers,   setDrivers]   = useState([])

  // attendance map: employeeId -> record { status, inTime, outTime, remarks }
  const [attendance,    setAttendance]    = useState({})
  const [monthlySummary, setMonthlySummary] = useState([])

  useEffect(() => { loadEmployees() }, [])
  useEffect(() => {
    if (viewMode === 'daily')   loadDailyAttendance()
    else                         loadMonthlySummary()
  }, [activeTab, date, month, year, viewMode])

  const loadEmployees = async () => {
    try {
      const [t, s, d] = await Promise.all([
        apiClient.listTeachers().catch(() => []),
        apiClient.listStaff().catch(() => []),
        apiClient.listDrivers().catch(() => []),
      ])
      setTeachers(Array.isArray(t) ? t : t?.data || [])
      setStaffList(Array.isArray(s) ? s : s?.data || [])
      setDrivers(Array.isArray(d) ? d : d?.data || [])
    } catch (err) { console.error(err) }
  }

  const loadDailyAttendance = async () => {
    setLoading(true)
    try {
      const records = await apiClient.listStaffAttendance({ date, employeeType: activeTab }).catch(() => [])
      const map = {}
      for (const r of (Array.isArray(records) ? records : records?.data || [])) {
        map[r.employeeId] = { id: r.id, status: r.status, inTime: r.inTime || '', outTime: r.outTime || '', remarks: r.remarks || '' }
      }
      setAttendance(map)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const loadMonthlySummary = async () => {
    setLoading(true)
    try {
      const data = await apiClient.getStaffAttendanceMonthlySummary({ month, year, employeeType: activeTab }).catch(() => [])
      setMonthlySummary(Array.isArray(data) ? data : data?.data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const currentEmployees = activeTab === 'teacher' ? teachers : activeTab === 'staff' ? staffList : drivers

  const getEmployeeName = (emp) =>
    emp.firstName ? `${emp.firstName} ${emp.lastName}`.trim() : emp.name || `Employee #${emp.id}`

  const getStatus = (empId) => attendance[empId]?.status || ''

  const setStatus = (empId, status) =>
    setAttendance(prev => ({ ...prev, [empId]: { ...(prev[empId] || { inTime: '', outTime: '', remarks: '' }), status } }))

  const setField = (empId, field, value) =>
    setAttendance(prev => ({ ...prev, [empId]: { ...(prev[empId] || { status: 'present', inTime: '', outTime: '', remarks: '' }), [field]: value } }))

  const markAll = (status) => {
    const map = {}
    for (const emp of currentEmployees) {
      map[emp.id] = { ...(attendance[emp.id] || { inTime: '', outTime: '', remarks: '' }), status }
    }
    setAttendance(prev => ({ ...prev, ...map }))
  }

  const handleSave = async () => {
    const records = currentEmployees
      .filter(emp => attendance[emp.id]?.status)
      .map(emp => ({
        employeeType: activeTab,
        employeeId:   emp.id,
        employeeName: getEmployeeName(emp),
        status:       attendance[emp.id].status,
        inTime:       attendance[emp.id].inTime  || null,
        outTime:      attendance[emp.id].outTime || null,
        remarks:      attendance[emp.id].remarks || null,
      }))

    if (records.length === 0) {
      toast.error('Please mark attendance for at least one employee')
      return
    }
    setSaving(true)
    try {
      await apiClient.bulkMarkStaffAttendance({ date, records })
      toast.success(`Attendance saved for ${records.length} employees`)
      loadDailyAttendance()
    } catch (err) {
      toast.error(err.message || 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const dailyExportCols = [
    { key: 'Name',    label: 'Name' },
    { key: 'Type',    label: 'Type' },
    { key: 'Date',    label: 'Date' },
    { key: 'Status',  label: 'Status' },
    { key: 'InTime',  label: 'In Time' },
    { key: 'OutTime', label: 'Out Time' },
    { key: 'Remarks', label: 'Remarks' },
  ]

  const monthlyExportCols = [
    { key: 'employeeName', label: 'Name' },
    { key: 'total',        label: 'Total Days' },
    { key: 'present',      label: 'Present' },
    { key: 'absent',       label: 'Absent' },
    { key: 'late',         label: 'Late' },
    { key: 'halfDay',      label: 'Half Day' },
    { key: 'onLeave',      label: 'On Leave' },
    { key: 'pct',          label: 'Attendance %' },
  ]

  const getDailyRows = () =>
    currentEmployees.map(emp => ({
      Name:    getEmployeeName(emp),
      Type:    activeTab,
      Date:    date,
      Status:  getStatus(emp.id) || 'not marked',
      InTime:  attendance[emp.id]?.inTime  || '',
      OutTime: attendance[emp.id]?.outTime || '',
      Remarks: attendance[emp.id]?.remarks || '',
    }))

  const getMonthlyRows = () =>
    monthlySummary.map(row => ({
      ...row,
      pct: row.total > 0 ? `${Math.round((row.present / row.total) * 100)}%` : '0%',
    }))

  const handleExportCSV = () => {
    if (viewMode === 'daily') {
      exportToCSV(getDailyRows(), `staff-attendance-daily-${date}`, dailyExportCols)
    } else {
      if (!monthlySummary.length) { toast.error('No monthly data to export'); return }
      exportToCSV(getMonthlyRows(), `staff-attendance-${monthName(month)}-${year}`, monthlyExportCols)
    }
  }

  const handleExportPDF = () => {
    if (viewMode === 'daily') {
      exportToPDF(
        getDailyRows(),
        `staff-attendance-daily-${date}`,
        dailyExportCols,
        `Staff Attendance — ${date} (${activeTab})`,
        'landscape'
      )
    } else {
      if (!monthlySummary.length) { toast.error('No monthly data to export'); return }
      exportToPDF(
        getMonthlyRows(),
        `staff-attendance-${monthName(month)}-${year}`,
        monthlyExportCols,
        `Staff Attendance Report — ${monthName(month)} ${year} (${activeTab})`,
        'landscape'
      )
    }
  }

  const handlePrint = () => {
    const id = viewMode === 'daily' ? 'staff-daily-table' : 'staff-monthly-table'
    const title = viewMode === 'daily'
      ? `Staff Attendance — ${date} (${activeTab})`
      : `Staff Attendance Report — ${monthName(month)} ${year} (${activeTab})`
    printTable(id, title)
  }

  // ── Summary stats for current day ─────────────────────────────────────────
  const stats = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = currentEmployees.filter(e => attendance[e.id]?.status === s.value).length
    return acc
  }, {})
  const notMarked = currentEmployees.filter(e => !attendance[e.id]?.status).length

  return (
    <div style={{ padding: 24, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#111827' }}>🧑‍💼 Staff Attendance</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>Daily attendance for teachers, staff and drivers</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={handleExportCSV} style={exportButtonStyle} title="Export CSV">📄 CSV</button>
          <button onClick={handleExportPDF} style={exportButtonStyle} title="Export PDF">📥 PDF</button>
          <button onClick={handlePrint} style={exportButtonStyle} title="Print"><Printer size={15} /> Print</button>
          {viewMode === 'daily' && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : '💾 Save Attendance'}
            </button>
          )}
        </div>
      </div>

      {/* View toggle + date controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
          {[{ key: 'daily', label: '📅 Daily' }, { key: 'monthly', label: '📊 Monthly Report' }].map(v => (
            <button key={v.key} onClick={() => setViewMode(v.key)}
              style={{ background: viewMode === v.key ? '#fff' : 'transparent', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: viewMode === v.key ? 600 : 400, cursor: 'pointer', fontSize: 13, color: viewMode === v.key ? '#111827' : '#6b7280', boxShadow: viewMode === v.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {v.label}
            </button>
          ))}
        </div>

        {viewMode === 'daily' ? (
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }} />
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
              style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
              ))}
            </select>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Employee type tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #6366f1' : '2px solid transparent', marginBottom: -2, padding: '8px 20px', fontWeight: activeTab === tab.key ? 700 : 400, cursor: 'pointer', fontSize: 14, color: activeTab === tab.key ? '#6366f1' : '#6b7280' }}>
            {tab.label}
            <span style={{ marginLeft: 6, background: '#f3f4f6', borderRadius: 10, padding: '1px 7px', fontSize: 11, color: '#374151' }}>
              {(tab.key === 'teacher' ? teachers : tab.key === 'staff' ? staffList : drivers).length}
            </span>
          </button>
        ))}
      </div>

      {/* Daily View */}
      {viewMode === 'daily' && (
        <>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(s => (
              <div key={s.value} style={{ background: s.bg, borderRadius: 8, padding: '8px 16px', minWidth: 100 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{stats[s.value]}</div>
                <div style={{ fontSize: 11, color: s.color, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
            {notMarked > 0 && (
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 16px', minWidth: 100, border: '1px dashed #d1d5db' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#9ca3af' }}>{notMarked}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Not Marked</div>
              </div>
            )}
          </div>

          {/* Bulk action */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Mark All:</span>
            {STATUS_OPTIONS.map(s => (
              <button key={s.value} onClick={() => markAll(s.value)}
                style={{ background: s.bg, color: s.color, border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {s.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
          ) : currentEmployees.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              No {activeTab}s found. Add them first from the {activeTab === 'teacher' ? 'Teachers' : activeTab === 'staff' ? 'Staff' : 'Transport'} page.
            </div>
          ) : (
            <div id="staff-daily-table" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-alt, #f8fafc)', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                    <th style={{ ...th }}>#</th>
                    <th style={{ ...th }}>Name</th>
                    <th style={{ ...th }}>Designation</th>
                    <th style={{ ...th }}>Status</th>
                    <th style={{ ...th }}>In Time</th>
                    <th style={{ ...th }}>Out Time</th>
                    <th style={{ ...th }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEmployees.map((emp, i) => {
                    const empStatus = attendance[emp.id]?.status || ''
                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ ...td, color: '#9ca3af', width: 40 }}>{i + 1}</td>
                        <td style={{ ...td, fontWeight: 500 }}>
                          {getEmployeeName(emp)}
                          {emp.teacherId || emp.employeeId ? (
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{emp.teacherId || emp.employeeId}</div>
                          ) : null}
                        </td>
                        <td style={{ ...td, color: '#6b7280', fontSize: 13 }}>
                          {emp.designation || emp.subject || emp.licenseNumber || '—'}
                        </td>
                        <td style={{ ...td }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {STATUS_OPTIONS.map(s => (
                              <button key={s.value} onClick={() => setStatus(emp.id, s.value)}
                                style={{
                                  background:  empStatus === s.value ? s.bg : '#f9fafb',
                                  color:       empStatus === s.value ? s.color : '#9ca3af',
                                  border:      empStatus === s.value ? `1.5px solid ${s.color}` : '1.5px solid #e5e7eb',
                                  borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: empStatus === s.value ? 700 : 400,
                                  cursor: 'pointer', whiteSpace: 'nowrap',
                                }}>
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td style={{ ...td, width: 90 }}>
                          <input type="time" value={attendance[emp.id]?.inTime || ''} onChange={e => setField(emp.id, 'inTime', e.target.value)}
                            style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', fontSize: 13, width: 80 }} />
                        </td>
                        <td style={{ ...td, width: 90 }}>
                          <input type="time" value={attendance[emp.id]?.outTime || ''} onChange={e => setField(emp.id, 'outTime', e.target.value)}
                            style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', fontSize: 13, width: 80 }} />
                        </td>
                        <td style={{ ...td }}>
                          <input value={attendance[emp.id]?.remarks || ''} onChange={e => setField(emp.id, 'remarks', e.target.value)}
                            placeholder="optional…"
                            style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', fontSize: 13, width: '100%', minWidth: 100 }} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Monthly Report View */}
      {viewMode === 'monthly' && (
        <div id="staff-monthly-table" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading monthly report…</div>
          ) : monthlySummary.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              No attendance data for {monthName(month)} {year}.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Name', 'Total Days', 'Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Attendance %'].map(h => (
                    <th key={h} style={{ ...th }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlySummary.map((row, i) => {
                  const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0
                  return (
                    <tr key={`${row.employeeType}-${row.employeeId}`} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ ...td, fontWeight: 500 }}>{row.employeeName}</td>
                      <td style={{ ...td }}>{row.total}</td>
                      <td style={{ ...td }}><span style={{ color: '#10b981', fontWeight: 600 }}>{row.present}</span></td>
                      <td style={{ ...td }}><span style={{ color: '#ef4444', fontWeight: 600 }}>{row.absent}</span></td>
                      <td style={{ ...td }}><span style={{ color: '#f59e0b', fontWeight: 600 }}>{row.late}</span></td>
                      <td style={{ ...td }}><span style={{ color: '#6366f1', fontWeight: 600 }}>{row.halfDay}</span></td>
                      <td style={{ ...td }}><span style={{ color: '#6b7280', fontWeight: 600 }}>{row.onLeave}</span></td>
                      <td style={{ ...td }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, minWidth: 60 }}>
                            <div style={{ height: 6, width: `${pct}%`, background: pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontWeight: 600, color: pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444', minWidth: 35, fontSize: 12 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

const th = { padding: '1rem', textAlign: 'left' as const, fontWeight: 600, color: 'var(--text, #1e293b)', fontSize: '0.9rem', borderBottom: '1px solid var(--border, #e5e7eb)', whiteSpace: 'nowrap' as const }
const td = { padding: '10px 14px', color: '#374151' }

export default StaffAttendancePage
