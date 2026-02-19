// @ts-nocheck
import { useEffect, useState } from 'react'
import apiClient from '@/services/api'
import { useToast } from '@/components/ToastContainer'
import { exportToCSV, exportToPDF, exportButtonStyle } from '@/utils/exportUtils'

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
]

const AttendanceReportPage = () => {
  const toast = useToast()
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const res = await apiClient.listClasses()
      setClasses(res.data || res || [])
    } catch { /* ignore */ }
  }

  const fetchReport = async () => {
    if (!selectedClass) return
    setLoading(true)
    try {
      const res = await apiClient.getAttendanceReport(selectedClass, month, year)
      setReport(res.data || res)
    } catch (err) {
      toast.error('Failed to load attendance report')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const className = classes.find(c => String(c.id) === selectedClass)?.name || ''
  const monthLabel = MONTHS.find(m => m.value === month)?.label || ''

  const handleExportCSV = () => {
    if (!report?.students?.length) return
    exportToCSV(report.students, `Attendance_${className}_${monthLabel}_${year}`, [
      { key: 'rollNumber', label: 'Roll No' },
      { key: 'name', label: 'Student Name' },
      { key: 'present', label: 'Present' },
      { key: 'absent', label: 'Absent' },
      { key: 'late', label: 'Late' },
      { key: 'totalMarked', label: 'Total Days' },
      { key: 'percentage', label: 'Attendance %' },
    ])
    toast.success('CSV downloaded!')
  }

  const handleExportPDF = () => {
    if (!report?.students?.length) return
    exportToPDF(
      report.students,
      `Attendance_${className}_${monthLabel}_${year}`,
      [
        { key: 'rollNumber', label: 'Roll No' },
        { key: 'name', label: 'Student Name' },
        { key: 'present', label: 'Present' },
        { key: 'absent', label: 'Absent' },
        { key: 'late', label: 'Late' },
        { key: 'totalMarked', label: 'Total Days' },
        { key: 'percentage', label: 'Attendance %' },
      ],
      `Attendance Report — ${className} | ${monthLabel} ${year} | Working Days: ${report.workingDays}`
    )
    toast.success('PDF downloaded!')
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>📊 Attendance Report</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Class</label>
          <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setReport(null) }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', minWidth: '160px' }}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Month</label>
          <select value={month} onChange={e => { setMonth(e.target.value); setReport(null) }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', minWidth: '140px' }}>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Year</label>
          <select value={year} onChange={e => { setYear(e.target.value); setReport(null) }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', minWidth: '100px' }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
        <button onClick={fetchReport} disabled={!selectedClass || loading}
          style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: !selectedClass ? 0.5 : 1 }}>
          {loading ? 'Loading...' : '📊 Generate'}
        </button>
      </div>

      {/* Report */}
      {report && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '14px' }}>
              <strong>{className}</strong> — {monthLabel} {year} | Working Days: <strong>{report.workingDays}</strong> | Students: <strong>{report.students?.length || 0}</strong>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleExportCSV} style={exportButtonStyle}>📄 CSV</button>
              <button onClick={handleExportPDF} style={exportButtonStyle}>📥 PDF</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                  <th style={thStyle}>Roll No</th>
                  <th style={thStyle}>Student Name</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Present</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Absent</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Late</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Total</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {(report.students || []).map((s, i) => (
                  <tr key={s.studentId} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                    <td style={tdStyle}>{s.rollNumber}</td>
                    <td style={tdStyle}>{s.name}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{s.present}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>{s.absent}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#d97706', fontWeight: 600 }}>{s.late}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{s.totalMarked}</td>
                    <td style={{
                      ...tdStyle, textAlign: 'center', fontWeight: 700,
                      color: s.percentage >= 75 ? '#16a34a' : '#dc2626',
                    }}>{s.percentage}%</td>
                  </tr>
                ))}
                {(!report.students || report.students.length === 0) && (
                  <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: '2rem' }}>No attendance data found for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: '12px' }
const tdStyle = { padding: '8px 12px', borderBottom: '1px solid var(--border)' }

export default AttendanceReportPage
