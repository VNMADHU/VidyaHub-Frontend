// @ts-nocheck
import { useEffect, useState } from 'react'
import apiClient from '@/services/api'
import { useAppSelector } from '@/store'
import { useToast } from '@/components/ToastContainer'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const GRADES = [
  { min: 91, grade: 'A1', remark: 'Outstanding' },
  { min: 81, grade: 'A2', remark: 'Excellent' },
  { min: 71, grade: 'B1', remark: 'Very Good' },
  { min: 61, grade: 'B2', remark: 'Good' },
  { min: 51, grade: 'C1', remark: 'Above Average' },
  { min: 41, grade: 'C2', remark: 'Average' },
  { min: 33, grade: 'D', remark: 'Below Average' },
  { min: 0, grade: 'Fail', remark: 'Needs Improvement' },
]

function getGrade(pct) {
  for (const g of GRADES) {
    if (pct >= g.min) return g
  }
  return GRADES[GRADES.length - 1]
}

const ReportCardPage = () => {
  const toast = useToast()
  const { schoolId } = useAppSelector((state) => state.auth.user) || {}
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadClasses()
  }, [])

  useEffect(() => {
    if (selectedClass) loadStudents()
    else setStudents([])
  }, [selectedClass])

  const loadClasses = async () => {
    try {
      const res = await apiClient.listClasses()
      setClasses(res.data || res || [])
    } catch { /* ignore */ }
  }

  const loadStudents = async () => {
    try {
      const res = await apiClient.listStudents()
      const all = res.data || res || []
      setStudents(all.filter(s => String(s.classId) === selectedClass))
    } catch { /* ignore */ }
  }

  const fetchReport = async () => {
    if (!selectedStudent) return
    setLoading(true)
    try {
      const res = await apiClient.getReportCard(selectedStudent)
      setReportData(res.data || res)
    } catch (err) {
      toast.error('Failed to load report card')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── PDF Generation ──────────────────────────────────────
  const generatePDF = () => {
    if (!reportData) return
    const { student, school, exams, attendance } = reportData
    const doc = new jsPDF('portrait', 'mm', 'a4')
    const pageW = doc.internal.pageSize.getWidth()

    // ── Header ──
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, pageW, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(school.name || 'School Name', pageW / 2, 16, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(school.address || '', pageW / 2, 24, { align: 'center' })
    doc.text(`${school.boardType || ''} | Affiliation: ${school.schoolCode || 'N/A'} | Academic Year: ${school.academicYear || ''}`, pageW / 2, 32, { align: 'center' })

    // ── Title ──
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('REPORT CARD / MARKSHEET', pageW / 2, 50, { align: 'center' })

    // ── Student Info ──
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const y = 60
    const leftX = 14
    const rightX = pageW / 2 + 10

    doc.setFont('helvetica', 'bold')
    doc.text('Student Name:', leftX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`${student.firstName} ${student.lastName}`, leftX + 35, y)

    doc.setFont('helvetica', 'bold')
    doc.text('Class & Section:', rightX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`${student.className}${student.sectionName ? ' - ' + student.sectionName : ''}`, rightX + 35, y)

    doc.setFont('helvetica', 'bold')
    doc.text('Admission No:', leftX, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.text(student.admissionNumber || 'N/A', leftX + 35, y + 7)

    doc.setFont('helvetica', 'bold')
    doc.text('Roll Number:', rightX, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.text(student.rollNumber || 'N/A', rightX + 35, y + 7)

    doc.setFont('helvetica', 'bold')
    doc.text("Father's Name:", leftX, y + 14)
    doc.setFont('helvetica', 'normal')
    doc.text(student.fatherName || 'N/A', leftX + 35, y + 14)

    doc.setFont('helvetica', 'bold')
    doc.text("Mother's Name:", rightX, y + 14)
    doc.setFont('helvetica', 'normal')
    doc.text(student.motherName || 'N/A', rightX + 35, y + 14)

    doc.setFont('helvetica', 'bold')
    doc.text('Date of Birth:', leftX, y + 21)
    doc.setFont('helvetica', 'normal')
    doc.text(student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A', leftX + 35, y + 21)

    doc.setFont('helvetica', 'bold')
    doc.text('Category:', rightX, y + 21)
    doc.setFont('helvetica', 'normal')
    doc.text(student.category || 'N/A', rightX + 35, y + 21)

    // ── Marks Tables (one per exam) ──
    let startY = y + 32

    if (exams.length === 0) {
      doc.setFontSize(11)
      doc.text('No marks recorded for this student.', pageW / 2, startY + 10, { align: 'center' })
    }

    exams.forEach((exam, idx) => {
      // Check page break
      if (startY > 240) {
        doc.addPage()
        startY = 20
      }

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`${exam.examName}`, 14, startY)
      startY += 2

      const subjects = exam.marks.map(m => {
        const pct = m.maxScore > 0 ? Math.round((m.score / m.maxScore) * 100) : 0
        const g = getGrade(pct)
        return [m.subject, String(m.maxScore), String(m.score), `${pct}%`, g.grade, g.remark]
      })

      // Totals row
      const totalMax = exam.marks.reduce((s, m) => s + (m.maxScore || 100), 0)
      const totalScore = exam.marks.reduce((s, m) => s + m.score, 0)
      const totalPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
      const totalGrade = getGrade(totalPct)
      subjects.push(['TOTAL', String(totalMax), String(totalScore), `${totalPct}%`, totalGrade.grade, totalGrade.remark])

      autoTable(doc, {
        head: [['Subject', 'Max Marks', 'Marks Obtained', 'Percentage', 'Grade', 'Remark']],
        body: subjects,
        startY: startY,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 245, 255] },
        margin: { left: 14, right: 14 },
        didParseCell(data) {
          // Bold the TOTAL row
          if (data.row.index === subjects.length - 1) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [220, 230, 245]
          }
          // Color grade column
          if (data.column.index === 4 && data.row.index < subjects.length - 1) {
            const grade = data.cell.raw
            if (grade === 'A1' || grade === 'A2') data.cell.styles.textColor = [22, 163, 74]
            else if (grade === 'Fail') data.cell.styles.textColor = [220, 38, 38]
          }
        },
      })

      startY = doc.lastAutoTable.finalY + 10
    })

    // ── Attendance Summary ──
    if (startY > 250) { doc.addPage(); startY = 20 }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Attendance Summary', 14, startY)
    startY += 2

    autoTable(doc, {
      head: [['Total Days', 'Present Days', 'Attendance %']],
      body: [[String(attendance.totalDays), String(attendance.presentDays), `${attendance.percentage}%`]],
      startY: startY,
      styles: { fontSize: 10, cellPadding: 3, halign: 'center' },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
      tableWidth: 120,
    })

    startY = doc.lastAutoTable.finalY + 15

    // ── Signatures ──
    if (startY > 260) { doc.addPage(); startY = 20 }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('_____________________', 14, startY)
    doc.text('_____________________', pageW / 2 - 20, startY)
    doc.text('_____________________', pageW - 60, startY)
    doc.text('Class Teacher', 14, startY + 5)
    doc.text('Exam Controller', pageW / 2 - 20, startY + 5)
    doc.text('Principal', pageW - 60, startY + 5)

    // ── Footer ──
    doc.setFontSize(7)
    doc.setTextColor(128, 128, 128)
    doc.text('This is a computer-generated report card. | Powered by Vidya Hub', pageW / 2, 290, { align: 'center' })

    doc.save(`Report_Card_${student.firstName}_${student.lastName}_${student.className}.pdf`)
    toast.success('Report card PDF downloaded!')
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>📄 Report Card / Marksheet</h1>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Class</label>
          <select
            value={selectedClass}
            onChange={e => { setSelectedClass(e.target.value); setSelectedStudent(''); setReportData(null) }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', minWidth: '160px' }}
          >
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Student</label>
          <select
            value={selectedStudent}
            onChange={e => { setSelectedStudent(e.target.value); setReportData(null) }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', minWidth: '220px' }}
            disabled={!selectedClass}
          >
            <option value="">Select Student</option>
            {students.map(s => (
              <option key={s.id} value={String(s.id)}>
                {s.rollNumber ? `[${s.rollNumber}] ` : ''}{s.firstName} {s.lastName}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchReport}
          disabled={!selectedStudent || loading}
          style={{
            padding: '8px 20px', borderRadius: '6px', border: 'none',
            background: 'var(--primary)', color: '#fff', cursor: 'pointer',
            opacity: !selectedStudent ? 0.5 : 1, fontWeight: 600,
          }}
        >
          {loading ? 'Loading...' : '📊 View Report'}
        </button>
        {reportData && (
          <button
            onClick={generatePDF}
            style={{
              padding: '8px 20px', borderRadius: '6px', border: 'none',
              background: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 600,
            }}
          >
            📥 Download PDF
          </button>
        )}
      </div>

      {/* Report Preview */}
      {reportData && (
        <div style={{
          background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)',
          padding: '2rem', maxWidth: '900px',
        }}>
          {/* School Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '4px' }}>{reportData.school.name}</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{reportData.school.address}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {reportData.school.boardType} | Code: {reportData.school.schoolCode || 'N/A'} | AY: {reportData.school.academicYear}
            </p>
            <h3 style={{ marginTop: '0.8rem', fontSize: '1.1rem' }}>REPORT CARD</h3>
          </div>

          {/* Student Info Grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 2rem',
            marginBottom: '1.5rem', fontSize: '14px',
          }}>
            <div><strong>Name:</strong> {reportData.student.firstName} {reportData.student.lastName}</div>
            <div><strong>Class:</strong> {reportData.student.className}{reportData.student.sectionName ? ` - ${reportData.student.sectionName}` : ''}</div>
            <div><strong>Admission No:</strong> {reportData.student.admissionNumber}</div>
            <div><strong>Roll No:</strong> {reportData.student.rollNumber || 'N/A'}</div>
            <div><strong>Father:</strong> {reportData.student.fatherName || 'N/A'}</div>
            <div><strong>Mother:</strong> {reportData.student.motherName || 'N/A'}</div>
          </div>

          {/* Marks Tables */}
          {reportData.exams.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              No marks recorded for this student yet.
            </p>
          ) : reportData.exams.map((exam, idx) => {
            const totalMax = exam.marks.reduce((s, m) => s + (m.maxScore || 100), 0)
            const totalScore = exam.marks.reduce((s, m) => s + m.score, 0)
            const totalPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
            const totalG = getGrade(totalPct)

            return (
              <div key={idx} style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>{exam.examName}</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                      <th style={thStyle}>Subject</th>
                      <th style={thStyle}>Max</th>
                      <th style={thStyle}>Obtained</th>
                      <th style={thStyle}>%</th>
                      <th style={thStyle}>Grade</th>
                      <th style={thStyle}>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exam.marks.map((m, i) => {
                      const pct = m.maxScore > 0 ? Math.round((m.score / m.maxScore) * 100) : 0
                      const g = getGrade(pct)
                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                          <td style={tdStyle}>{m.subject}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{m.maxScore}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{m.score}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{pct}%</td>
                          <td style={{
                            ...tdStyle, textAlign: 'center', fontWeight: 700,
                            color: g.grade === 'Fail' ? '#dc2626' : g.grade.startsWith('A') ? '#16a34a' : 'inherit',
                          }}>{g.grade}</td>
                          <td style={tdStyle}>{g.remark}</td>
                        </tr>
                      )
                    })}
                    <tr style={{ background: '#e0e7ff', fontWeight: 700 }}>
                      <td style={tdStyle}>TOTAL</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{totalMax}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{totalScore}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{totalPct}%</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{totalG.grade}</td>
                      <td style={tdStyle}>{totalG.remark}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}

          {/* Attendance */}
          <div style={{
            marginTop: '1rem', padding: '1rem', background: 'var(--bg)',
            borderRadius: '8px', display: 'flex', gap: '2rem', fontSize: '14px',
          }}>
            <strong>Attendance:</strong>
            <span>Total Days: {reportData.attendance.totalDays}</span>
            <span>Present: {reportData.attendance.presentDays}</span>
            <span style={{
              fontWeight: 700,
              color: reportData.attendance.percentage >= 75 ? '#16a34a' : '#dc2626',
            }}>
              {reportData.attendance.percentage}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = { padding: '8px 10px', textAlign: 'left', fontSize: '12px' }
const tdStyle = { padding: '6px 10px', borderBottom: '1px solid var(--border)' }

export default ReportCardPage
