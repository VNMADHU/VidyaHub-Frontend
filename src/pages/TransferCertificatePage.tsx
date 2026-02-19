// @ts-nocheck
import { useEffect, useState } from 'react'
import apiClient from '@/services/api'
import { useToast } from '@/components/ToastContainer'
import jsPDF from 'jspdf'

const TransferCertificatePage = () => {
  const toast = useToast()
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [studentData, setStudentData] = useState(null)
  const [tcDetails, setTcDetails] = useState({
    reason: 'Parent Transfer',
    conduct: 'Good',
    lastAttendanceDate: new Date().toISOString().slice(0, 10),
    issueDate: new Date().toISOString().slice(0, 10),
    tcSerialNo: `TC-${Date.now().toString().slice(-6)}`,
    remarks: '',
    nccNss: 'N/A',
    gamesPlayed: '',
    extraActivities: '',
  })
  const [school, setSchool] = useState(null)

  useEffect(() => {
    loadClasses()
    loadSchool()
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

  const loadSchool = async () => {
    try {
      const res = await apiClient.listSchools()
      const schools = res.data || res || []
      if (schools.length > 0) setSchool(schools[0])
    } catch { /* ignore */ }
  }

  const loadStudents = async () => {
    try {
      const res = await apiClient.listStudents()
      const all = res.data || res || []
      setStudents(all.filter(s => String(s.classId) === selectedClass))
    } catch { /* ignore */ }
  }

  const selectStudent = (id) => {
    setSelectedStudent(id)
    const s = students.find(st => String(st.id) === id)
    setStudentData(s || null)
  }

  const generateTC = () => {
    if (!studentData || !school) {
      toast.error('Please select a student first')
      return
    }

    const s = studentData
    const doc = new jsPDF('portrait', 'mm', 'a4')
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 15
    let y = 0

    // ── Decorative Border ──
    doc.setDrawColor(37, 99, 235)
    doc.setLineWidth(1.5)
    doc.rect(8, 8, pageW - 16, 280, 'S')
    doc.setLineWidth(0.5)
    doc.rect(10, 10, pageW - 20, 276, 'S')

    // ── Header ──
    y = 25
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text(school.name || 'School Name', pageW / 2, y, { align: 'center' })

    y += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(school.address || '', pageW / 2, y, { align: 'center' })

    y += 6
    doc.text(`Affiliated to ${school.boardType || 'CBSE'} | School Code: ${school.schoolCode || 'N/A'}`, pageW / 2, y, { align: 'center' })

    // ── Title ──
    y += 12
    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y - 5, pageW - 2 * margin, 10, 'F')
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('TRANSFER CERTIFICATE', pageW / 2, y + 2, { align: 'center' })

    // ── TC Number & Date ──
    y += 16
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`TC No: ${tcDetails.tcSerialNo}`, margin, y)
    doc.text(`Date: ${new Date(tcDetails.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageW - margin, y, { align: 'right' })

    // ── Student Details (numbered list — CBSE standard format) ──
    y += 12
    const items = [
      ['Name of the Student', `${s.firstName} ${s.lastName}`],
      ["Father's Name", s.fatherName || 'N/A'],
      ["Mother's Name", s.motherName || 'N/A'],
      ['Date of Birth', s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'],
      ['Nationality', s.nationality || 'Indian'],
      ['Category', s.category || 'N/A'],
      ['Aadhaar Number', s.aadhaarNumber ? s.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : 'N/A'],
      ['Admission Number', s.admissionNumber || 'N/A'],
      ['Roll Number', s.rollNumber || 'N/A'],
      ['Class in which studying', s.class?.name || 'N/A'],
      ['Academic Year', school.academicYear || '2025-26'],
      ['Date of Admission', s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'],
      ['Previous School', s.previousSchool || 'N/A'],
      ['TC Number (if any)', s.tcNumber || 'N/A'],
      ['Date of Last Attendance', new Date(tcDetails.lastAttendanceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
      ['Reason for Leaving', tcDetails.reason],
      ['Conduct & Character', tcDetails.conduct],
      ['NCC/NSS/Scouts/Guides', tcDetails.nccNss],
      ['Games & Sports', tcDetails.gamesPlayed || 'N/A'],
      ['Extra-Curricular Activities', tcDetails.extraActivities || 'N/A'],
      ['Remarks', tcDetails.remarks || 'Nil'],
    ]

    doc.setFontSize(10)
    items.forEach((item, i) => {
      if (y > 260) {
        doc.addPage()
        y = 20
        // Re-draw border on new page
        doc.setDrawColor(37, 99, 235)
        doc.setLineWidth(1.5)
        doc.rect(8, 8, pageW - 16, 280, 'S')
        doc.setLineWidth(0.5)
        doc.rect(10, 10, pageW - 20, 276, 'S')
      }

      const num = `${i + 1}.`
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(num, margin, y)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(item[0], margin + 8, y)

      doc.setFont('helvetica', 'normal')
      doc.text(`:  ${item[1]}`, margin + 70, y)

      y += 9
    })

    // ── Certificate Statement ──
    y += 6
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(80, 80, 80)
    const certText = `Certified that the above information is in accordance with the school records. This Transfer Certificate is issued on the request of the parent/guardian of the student.`
    const lines = doc.splitTextToSize(certText, pageW - 2 * margin)
    doc.text(lines, margin, y)

    // ── Signatures ──
    y += 25
    if (y > 265) { doc.addPage(); y = 20 }
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text('_________________________', margin, y)
    doc.text('_________________________', pageW - margin - 50, y)
    doc.text('Class Teacher', margin, y + 6)
    doc.text('Principal', pageW - margin - 50, y + 6)

    // ── Footer ──
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text('Computer generated Transfer Certificate | Vidya Hub School Management System', pageW / 2, 284, { align: 'center' })

    doc.save(`TC_${s.firstName}_${s.lastName}_${tcDetails.tcSerialNo}.pdf`)
    toast.success('Transfer Certificate PDF downloaded!')
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="page">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>📜 Transfer Certificate</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>Class</label>
          <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudent(''); setStudentData(null) }}
            style={selectStyle}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Student</label>
          <select value={selectedStudent} onChange={e => selectStudent(e.target.value)}
            style={{ ...selectStyle, minWidth: '220px' }} disabled={!selectedClass}>
            <option value="">Select Student</option>
            {students.map(s => (
              <option key={s.id} value={String(s.id)}>
                {s.rollNumber ? `[${s.rollNumber}] ` : ''}{s.firstName} {s.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TC Details Form */}
      {studentData && (
        <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1.5rem', maxWidth: '800px', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>TC Details for {studentData.firstName} {studentData.lastName}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>TC Serial No</label>
              <input value={tcDetails.tcSerialNo} onChange={e => setTcDetails({...tcDetails, tcSerialNo: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Issue Date</label>
              <input type="date" value={tcDetails.issueDate} onChange={e => setTcDetails({...tcDetails, issueDate: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Last Attendance Date</label>
              <input type="date" value={tcDetails.lastAttendanceDate} onChange={e => setTcDetails({...tcDetails, lastAttendanceDate: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Reason for Leaving</label>
              <select value={tcDetails.reason} onChange={e => setTcDetails({...tcDetails, reason: e.target.value})} style={inputStyle}>
                <option>Parent Transfer</option>
                <option>Seeking Admission Elsewhere</option>
                <option>Relocation</option>
                <option>Passed Out</option>
                <option>Discontinuation</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Conduct & Character</label>
              <select value={tcDetails.conduct} onChange={e => setTcDetails({...tcDetails, conduct: e.target.value})} style={inputStyle}>
                <option>Excellent</option>
                <option>Very Good</option>
                <option>Good</option>
                <option>Satisfactory</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>NCC/NSS/Scouts</label>
              <input value={tcDetails.nccNss} onChange={e => setTcDetails({...tcDetails, nccNss: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Games & Sports</label>
              <input value={tcDetails.gamesPlayed} onChange={e => setTcDetails({...tcDetails, gamesPlayed: e.target.value})} style={inputStyle} placeholder="e.g., Cricket, Football" />
            </div>
            <div>
              <label style={labelStyle}>Extra-Curricular Activities</label>
              <input value={tcDetails.extraActivities} onChange={e => setTcDetails({...tcDetails, extraActivities: e.target.value})} style={inputStyle} placeholder="e.g., Debate, Art" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Remarks</label>
              <input value={tcDetails.remarks} onChange={e => setTcDetails({...tcDetails, remarks: e.target.value})} style={inputStyle} placeholder="Any additional remarks" />
            </div>
          </div>

          <button onClick={generateTC} style={{
            marginTop: '1.5rem', padding: '10px 24px', borderRadius: '6px',
            border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer',
            fontWeight: 600, fontSize: '14px',
          }}>
            📥 Generate & Download TC
          </button>
        </div>
      )}
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }
const selectStyle = { padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', minWidth: '160px', width: '100%' }
const inputStyle = { padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', width: '100%' }

export default TransferCertificatePage
