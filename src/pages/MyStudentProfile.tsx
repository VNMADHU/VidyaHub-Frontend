// @ts-nocheck
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'
import { useToast } from '@/components/ToastContainer'
import { useAppSelector, useAppDispatch } from '@/store'
import { logout } from '@/store/slices/authSlice'

const MyStudentProfile = () => {
  const toast = useToast()
  const { studentId } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const token = useAppSelector((state) => state.auth.token)
  const role = useAppSelector((state) => state.auth.role)
  const authUser = useAppSelector((state) => state.auth.user)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [fees, setFees] = useState([])
  const [feeSummary, setFeeSummary] = useState(null)
  const [payingFeeId, setPayingFeeId] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(null)
  const [upiId, setUpiId] = useState('')
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Prevent browser back button from leaving the portal
  useEffect(() => {
    // Replace current entry and push multiple dummy entries to block back navigation
    const url = window.location.href
    window.history.replaceState({ portal: true }, '', url)
    window.history.pushState({ portal: true }, '', url)
    window.history.pushState({ portal: true }, '', url)

    const handlePopState = () => {
      window.history.pushState({ portal: true }, '', url)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    // Verify user is authenticated with a portal-student JWT
    if (!token || role !== 'portal-student' || String(authUser?.id) !== String(studentId)) {
      navigate('/student-login')
      return
    }
    loadProfile()
    loadFees()
  }, [studentId, token, role])

  const loadFees = async () => {
    try {
      const response = await apiClient.getStudentFees(studentId)
      setFees(response.data || [])
      setFeeSummary(response.summary || null)
    } catch (err) {
      console.error('Failed to load fees:', err)
    }
  }

  const loadProfile = async () => {
    try {
      const response = await apiClient.getStudentProfile(studentId)
      setData(response.data)
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/student-login')
  }

  const getAttendanceStats = () => {
    if (!data?.attendance?.length) return { total: 0, present: 0, absent: 0, late: 0, rate: 0 }
    const present = data.attendance.filter(a => a.status === 'present').length
    const absent = data.attendance.filter(a => a.status === 'absent').length
    const late = data.attendance.filter(a => a.status === 'late').length
    const total = data.attendance.length
    const rate = Math.round((present / total) * 100)
    return { total, present, absent, late, rate }
  }

  const getMonthlyAttendance = () => {
    if (!data?.attendance?.length) return []
    const months = {}
    data.attendance.forEach(a => {
      const d = new Date(a.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('default', { month: 'short', year: 'numeric' })
      if (!months[key]) months[key] = { key, label, present: 0, absent: 0, late: 0, total: 0 }
      months[key][a.status] = (months[key][a.status] || 0) + 1
      months[key].total++
    })
    return Object.values(months).sort((a, b) => a.key.localeCompare(b.key))
  }

  const calculateAverageMarks = () => {
    if (!data?.marks?.length) return 0
    const total = data.marks.reduce((sum, m) => sum + (m.score || 0), 0)
    return Math.round(total / data.marks.length)
  }

  const handlePayment = async (fee, method) => {
    setPaymentProcessing(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    const balance = fee.amount - (fee.paidAmount || 0)
    const txnId = method === 'upi' ? `UPI${Date.now()}` : `TXN${Date.now()}`
    try {
      await apiClient.payFee(fee.id, {
        paymentMode: method === 'upi' ? 'upi' : 'online',
        paidAmount: balance,
        transactionId: txnId,
      })
      setPaymentSuccess({ feeId: fee.id, method, txnId, amount: balance })
      setPayingFeeId(null)
      setPaymentMethod(null)
      setUpiId('')
      setCardDetails({ number: '', expiry: '', cvv: '', name: '' })
      loadFees()
    } catch (err) {
      toast.error(`Payment failed: ${err.message}`)
    } finally {
      setPaymentProcessing(false)
    }
  }

  if (loading) return (
    <div className="sp-app">
      <div className="sp-loading">
        <div className="sp-spinner" />
        <p>Loading your profile...</p>
      </div>
    </div>
  )

  if (!data?.student) return (
    <div className="sp-app">
      <div className="sp-loading"><p>Profile not found</p></div>
    </div>
  )

  const { student, attendance, marks, achievements, events, announcements, sports, timetable, periods, homework } = data
  const attStats = getAttendanceStats()
  const monthlyAtt = getMonthlyAttendance()

  const tabs = [
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'academics', icon: '📊', label: 'Academics' },
    { id: 'timetable', icon: '🕐', label: 'Timetable' },
    { id: 'homework', icon: '📝', label: 'Homework' },
    { id: 'attendance', icon: '📅', label: 'Attendance' },
    { id: 'reportcard', icon: '📄', label: 'Report Card' },
    { id: 'fees', icon: '💰', label: 'Fees' },
    { id: 'sports', icon: '⚽', label: 'Sports' },
    { id: 'events', icon: '🎉', label: 'Events' },
    { id: 'achievements', icon: '🏆', label: 'Awards' },
    { id: 'announcements', icon: '📢', label: 'News' },
  ]

  const switchTab = (id) => {
    setActiveTab(id)
    setSidebarOpen(false)
  }

  return (
    <div className="sp-app">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sp-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar — desktop always visible, mobile slides in */}
      <aside className={`sp-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sp-sidebar-header">
          <span className="sp-sidebar-logo">🎓</span>
          <div>
            <div className="sp-sidebar-school">{student.school?.name || 'Vidya Hub'}</div>
            <span className="sp-sidebar-badge">Student Portal</span>
          </div>
        </div>

        <div className="sp-sidebar-profile">
          {student.profilePic ? (
            <img src={student.profilePic} alt="" className="sp-sidebar-avatar" />
          ) : (
            <div className="sp-sidebar-avatar-initials">{student.firstName?.[0]}{student.lastName?.[0]}</div>
          )}
          <div className="sp-sidebar-name">{student.firstName} {student.lastName}</div>
          <div className="sp-sidebar-meta">Roll: {student.rollNumber || 'N/A'} • {student.class?.name || ''}</div>
        </div>

        <nav className="sp-sidebar-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`sp-sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => switchTab(tab.id)}
            >
              <span className="sp-sidebar-item-icon">{tab.icon}</span>
              <span className="sp-sidebar-item-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <button className="sp-sidebar-logout" onClick={handleLogout}>🚪 Logout</button>
      </aside>

      {/* Main Content Area */}
      <main className="sp-main">
        {/* Top Bar (mobile) */}
        <header className="sp-topbar">
          <button className="sp-hamburger" onClick={() => setSidebarOpen(true)}>
            <span /><span /><span />
          </button>
          <div className="sp-topbar-title">
            <span className="sp-topbar-logo">🎓</span>
            {student.school?.name || 'Vidya Hub'}
          </div>
          <button className="sp-topbar-logout" onClick={handleLogout}>🚪</button>
        </header>

        {/* Scrollable page content */}
        <div className="sp-page-scroll">
          {/* Page Title */}
          <div className="sp-page-title">
            <h2>{tabs.find(t => t.id === activeTab)?.icon} {tabs.find(t => t.id === activeTab)?.label}</h2>
          </div>

          <div className="sp-content">

        {/* PROFILE */}
        {activeTab === 'profile' && (
          <div className="sp-section">
            <div className="sp-card">
              <h3>📋 Personal Information</h3>
              <div className="sp-info-grid">
                {[
                  ['Full Name', `${student.firstName} ${student.lastName}`],
                  ['Email', student.email],
                  ['Date of Birth', student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'],
                  ['Gender', student.gender || 'N/A'],
                  ['Admission Number', student.admissionNumber],
                  ['Roll Number', student.rollNumber || 'N/A'],
                  ['Class', `${student.class?.name || 'N/A'} ${student.section?.name ? `- Section ${student.section.name}` : ''}`],
                ].map(([label, value]) => (
                  <div key={label} className="sp-info-item">
                    <span className="sp-info-label">{label}</span>
                    <span className="sp-info-value" style={label === 'Gender' ? { textTransform: 'capitalize' } : {}}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="sp-card">
              <h3>👨‍👩‍👧 Parent / Guardian</h3>
              <div className="sp-info-grid">
                {[
                  ["Father's Name", student.fatherName],
                  ["Father's Contact", student.fatherContact],
                  ["Mother's Name", student.motherName],
                  ["Mother's Contact", student.motherContact],
                  ["Guardian's Name", student.guardianName],
                  ["Guardian's Contact", student.guardianContact],
                ].map(([label, value]) => (
                  <div key={label} className="sp-info-item">
                    <span className="sp-info-label">{label}</span>
                    <span className="sp-info-value">{value || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ACADEMICS */}
        {activeTab === 'academics' && (
          <div className="sp-section">
            <div className="sp-card">
              <h3>📊 Exam Results</h3>
              {marks.length === 0 ? (
                <p className="sp-empty">No exam results available yet.</p>
              ) : (
                <div className="sp-table-wrap">
                  <table className="sp-table">
                    <thead>
                      <tr><th>Exam</th><th>Subject</th><th>Score</th><th>Max</th><th>%</th><th>Grade</th></tr>
                    </thead>
                    <tbody>
                      {marks.map(mark => {
                        const pct = Math.round((mark.score / mark.maxScore) * 100)
                        const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 35 ? 'D' : 'F'
                        return (
                          <tr key={mark.id}>
                            <td>{mark.exam?.name || 'N/A'}</td>
                            <td>{mark.subject}</td>
                            <td><strong>{mark.score}</strong></td>
                            <td>{mark.maxScore}</td>
                            <td><span className={`sp-pct-badge ${pct >= 60 ? 'good' : pct >= 35 ? 'avg' : 'low'}`}>{pct}%</span></td>
                            <td><span className={`sp-grade-badge grade-${grade.replace('+', 'plus')}`}>{grade}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TIMETABLE */}
        {activeTab === 'timetable' && (() => {
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          const activePeriods = (periods || []).filter(p => !p.isBreak).sort((a, b) => a.sortOrder - b.sortOrder)
          const breakPeriods = (periods || []).filter(p => p.isBreak)
          const allSlots = (periods || []).sort((a, b) => a.sortOrder - b.sortOrder)
          const ttMap = {}
          ;(timetable || []).forEach(t => {
            const key = `${t.day}-${t.periodId}`
            ttMap[key] = t
          })

          return (
            <div className="sp-section">
              <div className="sp-card">
                <h3>🕐 Weekly Timetable — {student.class?.name || 'My Class'}</h3>
                {allSlots.length === 0 ? (
                  <p className="sp-empty">No timetable configured yet. Check back later!</p>
                ) : (
                  <div className="sp-table-wrap">
                    <table className="sp-table sp-timetable-table">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th>Time</th>
                          {days.map(d => <th key={d}>{d.slice(0, 3)}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {allSlots.map(slot => (
                          <tr key={slot.id} className={slot.isBreak ? 'sp-tt-break-row' : ''}>
                            <td className="sp-tt-period-name">
                              {slot.isBreak ? `☕ ${slot.name}` : slot.name}
                            </td>
                            <td className="sp-tt-time">{slot.startTime} – {slot.endTime}</td>
                            {days.map(day => {
                              if (slot.isBreak) {
                                return <td key={day} className="sp-tt-break-cell">—</td>
                              }
                              const entry = ttMap[`${day}-${slot.id}`]
                              return (
                                <td key={day} className={entry ? 'sp-tt-filled' : 'sp-tt-empty'}>
                                  {entry ? (
                                    <div className="sp-tt-cell">
                                      <span className="sp-tt-subject">{entry.subject}</span>
                                      <span className="sp-tt-teacher">{entry.teacher}</span>
                                    </div>
                                  ) : '—'}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* HOMEWORK */}
        {activeTab === 'homework' && (() => {
          const now = new Date()
          const activeHw = (homework || []).filter(h => h.status === 'active' && new Date(h.dueDate) >= now)
          const pastHw = (homework || []).filter(h => h.status !== 'active' || new Date(h.dueDate) < now)

          const getDaysLeft = (dueDate) => {
            const due = new Date(dueDate)
            const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
            if (diff === 0) return 'Due today'
            if (diff === 1) return 'Due tomorrow'
            if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''} overdue`
            return `${diff} days left`
          }

          return (
            <div className="sp-section">
              {/* Active Homework */}
              <div className="sp-card">
                <h3>📝 Active Homework</h3>
                {activeHw.length === 0 ? (
                  <p className="sp-empty">No pending homework. Enjoy your free time! 🎉</p>
                ) : (
                  <div className="sp-homework-list">
                    {activeHw.map(hw => {
                      const daysLeft = getDaysLeft(hw.dueDate)
                      const isUrgent = new Date(hw.dueDate) - now < 2 * 24 * 60 * 60 * 1000
                      return (
                        <div key={hw.id} className={`sp-hw-card ${isUrgent ? 'urgent' : ''}`}>
                          <div className="sp-hw-header">
                            <span className="sp-hw-subject">{hw.subject}</span>
                            <span className={`sp-hw-due ${isUrgent ? 'urgent' : ''}`}>{daysLeft}</span>
                          </div>
                          <h4 className="sp-hw-title">{hw.title}</h4>
                          {hw.description && <p className="sp-hw-desc">{hw.description}</p>}
                          <div className="sp-hw-meta">
                            <span>📅 Due: {new Date(hw.dueDate).toLocaleDateString()}</span>
                            {hw.assignedBy && <span>🧑‍🏫 {hw.assignedBy}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Past / Completed Homework */}
              {pastHw.length > 0 && (
                <div className="sp-card">
                  <h3>✅ Past Homework</h3>
                  <div className="sp-homework-list">
                    {pastHw.map(hw => (
                      <div key={hw.id} className="sp-hw-card past">
                        <div className="sp-hw-header">
                          <span className="sp-hw-subject">{hw.subject}</span>
                          <span className={`sp-hw-status ${hw.status}`}>
                            {hw.status === 'completed' ? '✅ Done' : hw.status === 'cancelled' ? '❌ Cancelled' : '⏰ Expired'}
                          </span>
                        </div>
                        <h4 className="sp-hw-title">{hw.title}</h4>
                        <div className="sp-hw-meta">
                          <span>📅 Was due: {new Date(hw.dueDate).toLocaleDateString()}</span>
                          {hw.assignedBy && <span>🧑‍🏫 {hw.assignedBy}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* REPORT CARD */}
        {activeTab === 'reportcard' && (() => {
          // Group marks by exam
          const examGroups = {}
          ;(marks || []).forEach(m => {
            const examName = m.exam?.name || 'Unknown Exam'
            if (!examGroups[examName]) examGroups[examName] = []
            examGroups[examName].push(m)
          })
          const examNames = Object.keys(examGroups)
          const getGrade = (pct) => pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 35 ? 'D' : 'F'
          const getGradeColor = (grade) => {
            if (grade === 'A+' || grade === 'A') return '#059669'
            if (grade === 'B+' || grade === 'B') return '#2563eb'
            if (grade === 'C') return '#d97706'
            return '#dc2626'
          }

          return (
            <div className="sp-section">
              <div className="sp-rc-header-card">
                <div className="sp-rc-school-info">
                  <span className="sp-rc-school-logo">🎓</span>
                  <div>
                    <h3>{student.school?.name || 'Vidya Hub'}</h3>
                    <p>Academic Report Card</p>
                  </div>
                </div>
                <div className="sp-rc-student-info">
                  <div className="sp-rc-info-row">
                    <span>Student:</span><strong>{student.firstName} {student.lastName}</strong>
                  </div>
                  <div className="sp-rc-info-row">
                    <span>Class:</span><strong>{student.class?.name || 'N/A'} {student.section?.name ? `- ${student.section.name}` : ''}</strong>
                  </div>
                  <div className="sp-rc-info-row">
                    <span>Roll No:</span><strong>{student.rollNumber || 'N/A'}</strong>
                  </div>
                  <div className="sp-rc-info-row">
                    <span>Adm No:</span><strong>{student.admissionNumber || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {examNames.length === 0 ? (
                <div className="sp-card">
                  <p className="sp-empty">No exam results available for report card generation.</p>
                </div>
              ) : (
                examNames.map(examName => {
                  const examMarks = examGroups[examName]
                  const totalScore = examMarks.reduce((s, m) => s + (m.score || 0), 0)
                  const totalMax = examMarks.reduce((s, m) => s + (m.maxScore || 0), 0)
                  const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
                  const overallGrade = getGrade(overallPct)

                  return (
                    <div key={examName} className="sp-card sp-rc-exam-card">
                      <div className="sp-rc-exam-header">
                        <h3>📋 {examName}</h3>
                        <div className="sp-rc-overall">
                          <span className="sp-rc-overall-pct" style={{ color: getGradeColor(overallGrade) }}>{overallPct}%</span>
                          <span className="sp-rc-overall-grade" style={{ background: getGradeColor(overallGrade) }}>{overallGrade}</span>
                        </div>
                      </div>
                      <div className="sp-table-wrap">
                        <table className="sp-table">
                          <thead>
                            <tr>
                              <th>Subject</th>
                              <th>Marks Obtained</th>
                              <th>Maximum Marks</th>
                              <th>Percentage</th>
                              <th>Grade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {examMarks.map(m => {
                              const pct = Math.round((m.score / m.maxScore) * 100)
                              const grade = getGrade(pct)
                              return (
                                <tr key={m.id}>
                                  <td><strong>{m.subject}</strong></td>
                                  <td>{m.score}</td>
                                  <td>{m.maxScore}</td>
                                  <td><span className={`sp-pct-badge ${pct >= 60 ? 'good' : pct >= 35 ? 'avg' : 'low'}`}>{pct}%</span></td>
                                  <td><span className={`sp-grade-badge grade-${grade.replace('+', 'plus')}`}>{grade}</span></td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="sp-rc-total-row">
                              <td><strong>Total</strong></td>
                              <td><strong>{totalScore}</strong></td>
                              <td><strong>{totalMax}</strong></td>
                              <td><strong>{overallPct}%</strong></td>
                              <td><span className={`sp-grade-badge grade-${overallGrade.replace('+', 'plus')}`}>{overallGrade}</span></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Performance Bars */}
                      <div className="sp-rc-bars">
                        {examMarks.map(m => {
                          const pct = Math.round((m.score / m.maxScore) * 100)
                          return (
                            <div key={m.id} className="sp-rc-bar-row">
                              <span className="sp-rc-bar-label">{m.subject}</span>
                              <div className="sp-rc-bar-wrap">
                                <div className="sp-rc-bar-fill" style={{ width: `${pct}%`, background: getGradeColor(getGrade(pct)) }} />
                              </div>
                              <span className="sp-rc-bar-pct">{pct}%</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}

              {/* Attendance Summary for Report Card */}
              {attendance.length > 0 && (
                <div className="sp-card">
                  <h3>📅 Attendance Summary</h3>
                  <div className="sp-rc-att-summary">
                    <div className="sp-rc-att-item">
                      <span className="sp-rc-att-num">{attStats.total}</span>
                      <span>Working Days</span>
                    </div>
                    <div className="sp-rc-att-item present">
                      <span className="sp-rc-att-num">{attStats.present}</span>
                      <span>Days Present</span>
                    </div>
                    <div className="sp-rc-att-item">
                      <span className="sp-rc-att-num">{attStats.rate}%</span>
                      <span>Attendance Rate</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="sp-rc-print-area">
                <button className="sp-rc-print-btn" onClick={() => window.print()}>
                  🖨️ Print Report Card
                </button>
              </div>
            </div>
          )
        })()}

        {/* ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="sp-section">
            <div className="sp-att-overview">
              <div className="sp-att-card total">
                <div className="sp-att-card-icon">📋</div>
                <div className="sp-att-card-info">
                  <span className="sp-att-card-num">{attStats.total}</span>
                  <span className="sp-att-card-label">Total Days</span>
                </div>
              </div>
              <div className="sp-att-card present">
                <div className="sp-att-card-icon">✅</div>
                <div className="sp-att-card-info">
                  <span className="sp-att-card-num">{attStats.present}</span>
                  <span className="sp-att-card-label">Present</span>
                </div>
              </div>
              <div className="sp-att-card absent">
                <div className="sp-att-card-icon">❌</div>
                <div className="sp-att-card-info">
                  <span className="sp-att-card-num">{attStats.absent}</span>
                  <span className="sp-att-card-label">Absent</span>
                </div>
              </div>
              <div className="sp-att-card late">
                <div className="sp-att-card-icon">⏰</div>
                <div className="sp-att-card-info">
                  <span className="sp-att-card-num">{attStats.late}</span>
                  <span className="sp-att-card-label">Late</span>
                </div>
              </div>
            </div>

            <div className="sp-card">
              <h3>📈 Attendance Rate</h3>
              <div className="sp-att-gauge-wrap">
                <div className="sp-att-gauge">
                  <svg viewBox="0 0 200 200" className="sp-gauge-svg">
                    <circle cx="100" cy="100" r="85" fill="none" stroke="#e5e7eb" strokeWidth="16" />
                    <circle cx="100" cy="100" r="85" fill="none"
                      stroke={attStats.rate >= 75 ? '#22c55e' : attStats.rate >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="16" strokeLinecap="round"
                      strokeDasharray={`${(attStats.rate / 100) * 534} 534`}
                      transform="rotate(-90 100 100)" />
                  </svg>
                  <div className="sp-gauge-text">
                    <span className="sp-gauge-num">{attStats.rate}%</span>
                    <span className="sp-gauge-label">{attStats.rate >= 75 ? 'Excellent' : attStats.rate >= 50 ? 'Average' : 'Needs Improvement'}</span>
                  </div>
                </div>
                <div className="sp-att-note">
                  {attStats.rate >= 75 ? '🎉 Great job! Keep up the good attendance.'
                    : attStats.rate >= 50 ? '⚠️ Your attendance is average. Try to be more regular.'
                    : '🚨 Your attendance is low. Please attend classes regularly.'}
                </div>
              </div>
            </div>

            {monthlyAtt.length > 0 && (
              <div className="sp-card">
                <h3>📅 Monthly Breakdown</h3>
                <div className="sp-monthly-att">
                  {monthlyAtt.map(m => (
                    <div key={m.key} className="sp-month-row">
                      <span className="sp-month-label">{m.label}</span>
                      <div className="sp-month-bar-wrap">
                        <div className="sp-month-bar present" style={{ width: `${(m.present / m.total) * 100}%` }} title={`Present: ${m.present}`} />
                        <div className="sp-month-bar absent" style={{ width: `${(m.absent / m.total) * 100}%` }} title={`Absent: ${m.absent}`} />
                        {m.late > 0 && <div className="sp-month-bar late" style={{ width: `${(m.late / m.total) * 100}%` }} title={`Late: ${m.late}`} />}
                      </div>
                      <span className="sp-month-count">{m.present}/{m.total}</span>
                    </div>
                  ))}
                  <div className="sp-month-legend">
                    <span className="sp-legend-dot present" /> Present
                    <span className="sp-legend-dot absent" /> Absent
                    <span className="sp-legend-dot late" /> Late
                  </div>
                </div>
              </div>
            )}

            <div className="sp-card">
              <h3>📝 Attendance Log (Recent)</h3>
              {attendance.length === 0 ? (
                <p className="sp-empty">No attendance records yet.</p>
              ) : (
                <div className="sp-table-wrap">
                  <table className="sp-table">
                    <thead>
                      <tr><th>Date</th><th>Day</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {attendance.slice(0, 50).map(record => {
                        const d = new Date(record.date)
                        return (
                          <tr key={record.id}>
                            <td>{d.toLocaleDateString()}</td>
                            <td>{d.toLocaleDateString('en-US', { weekday: 'short' })}</td>
                            <td>
                              <span className={`sp-status-pill ${record.status}`}>
                                {record.status === 'present' ? '✅' : record.status === 'absent' ? '❌' : '⏰'} {record.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FEES */}
        {activeTab === 'fees' && (
          <div className="sp-section">
            {paymentSuccess && (
              <div className="sp-payment-success">
                <div className="sp-payment-success-inner">
                  <span className="sp-payment-check">✅</span>
                  <div>
                    <strong>Payment Successful!</strong>
                    <p>₹{paymentSuccess.amount?.toLocaleString()} paid via {paymentSuccess.method === 'upi' ? 'UPI' : 'Card'}</p>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Txn ID: {paymentSuccess.txnId}</p>
                  </div>
                  <button className="sp-dismiss-btn" onClick={() => setPaymentSuccess(null)}>✕</button>
                </div>
              </div>
            )}

            {feeSummary && (
              <div className="sp-fee-overview">
                <div className="sp-fee-ocard total">
                  <span className="sp-fee-ocard-icon">💰</span>
                  <span className="sp-fee-ocard-amount">₹{feeSummary.totalFees?.toLocaleString()}</span>
                  <span className="sp-fee-ocard-label">Total Fees</span>
                </div>
                <div className="sp-fee-ocard paid">
                  <span className="sp-fee-ocard-icon">✅</span>
                  <span className="sp-fee-ocard-amount">₹{feeSummary.totalPaid?.toLocaleString()}</span>
                  <span className="sp-fee-ocard-label">Paid</span>
                </div>
                <div className="sp-fee-ocard pending">
                  <span className="sp-fee-ocard-icon">⏳</span>
                  <span className="sp-fee-ocard-amount">₹{feeSummary.totalPending?.toLocaleString()}</span>
                  <span className="sp-fee-ocard-label">Pending</span>
                </div>
              </div>
            )}

            <div className="sp-card">
              <h3>💳 Fee Details</h3>
              {fees.length === 0 ? (
                <p className="sp-empty">No fee records found.</p>
              ) : (
                <div className="sp-fee-list">
                  {fees.map(fee => {
                    const balance = fee.amount - (fee.paidAmount || 0)
                    const isPaid = fee.status === 'paid'
                    const isPayingThis = payingFeeId === fee.id
                    return (
                      <div key={fee.id} className={`sp-fee-item ${fee.status}`}>
                        <div className="sp-fee-item-top">
                          <div>
                            <h4 className="sp-fee-type">{fee.feeType} Fee</h4>
                            <p className="sp-fee-meta">{fee.term || ''} {fee.academicYear ? `• ${fee.academicYear}` : ''}{fee.description ? ` • ${fee.description}` : ''}</p>
                          </div>
                          <span className={`sp-fee-badge ${fee.status}`}>{fee.status}</span>
                        </div>
                        <div className="sp-fee-amounts">
                          <div className="sp-fee-amt"><span className="sp-fee-amt-label">Amount</span><span className="sp-fee-amt-val">₹{fee.amount?.toLocaleString()}</span></div>
                          <div className="sp-fee-amt"><span className="sp-fee-amt-label">Paid</span><span className="sp-fee-amt-val paid-color">₹{(fee.paidAmount || 0).toLocaleString()}</span></div>
                          <div className="sp-fee-amt"><span className="sp-fee-amt-label">Balance</span><span className={`sp-fee-amt-val ${balance > 0 ? 'due-color' : 'paid-color'}`}>₹{balance.toLocaleString()}</span></div>
                          <div className="sp-fee-amt"><span className="sp-fee-amt-label">Due Date</span><span className="sp-fee-amt-val">{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '-'}</span></div>
                        </div>

                        {isPaid && fee.paidDate && (
                          <div className="sp-fee-paid-info">
                            ✅ Paid on {new Date(fee.paidDate).toLocaleDateString()}
                            {fee.paymentMode ? ` via ${fee.paymentMode.toUpperCase()}` : ''}
                            {fee.transactionId ? ` • Txn: ${fee.transactionId}` : ''}
                          </div>
                        )}

                        {!isPaid && !isPayingThis && (
                          <div className="sp-fee-actions">
                            <button className="sp-pay-btn" onClick={() => { setPayingFeeId(fee.id); setPaymentMethod(null) }}>
                              💰 Pay Now — ₹{balance.toLocaleString()}
                            </button>
                          </div>
                        )}

                        {!isPaid && isPayingThis && !paymentMethod && (
                          <div className="sp-payment-methods">
                            <p className="sp-payment-title">Select Payment Method</p>
                            <div className="sp-payment-options">
                              <button className="sp-payment-opt card" onClick={() => setPaymentMethod('card')}>
                                <span className="sp-pay-opt-icon">💳</span>
                                <span className="sp-pay-opt-text"><strong>Credit / Debit Card</strong><small>Visa, Mastercard, RuPay</small></span>
                              </button>
                              <button className="sp-payment-opt upi" onClick={() => setPaymentMethod('upi')}>
                                <span className="sp-pay-opt-icon">📱</span>
                                <span className="sp-pay-opt-text"><strong>UPI Payment</strong><small>GPay, PhonePe, Paytm</small></span>
                              </button>
                            </div>
                            <button className="sp-cancel-pay" onClick={() => { setPayingFeeId(null); setPaymentMethod(null) }}>Cancel</button>
                          </div>
                        )}

                        {!isPaid && isPayingThis && paymentMethod === 'card' && (
                          <div className="sp-payment-form">
                            <div className="sp-pf-header"><span>💳 Card Payment</span><span className="sp-pf-amount">₹{balance.toLocaleString()}</span></div>
                            <div className="sp-pf-fields">
                              <div className="sp-pf-field full">
                                <label>Card Number</label>
                                <input type="text" placeholder="1234 5678 9012 3456" maxLength={19}
                                  value={cardDetails.number}
                                  onChange={e => { const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim(); setCardDetails({ ...cardDetails, number: val }) }} />
                              </div>
                              <div className="sp-pf-field full">
                                <label>Cardholder Name</label>
                                <input type="text" placeholder="Name on card" value={cardDetails.name} onChange={e => setCardDetails({ ...cardDetails, name: e.target.value })} />
                              </div>
                              <div className="sp-pf-field">
                                <label>Expiry</label>
                                <input type="text" placeholder="MM/YY" maxLength={5} value={cardDetails.expiry}
                                  onChange={e => { let val = e.target.value.replace(/\D/g, ''); if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2, 4); setCardDetails({ ...cardDetails, expiry: val }) }} />
                              </div>
                              <div className="sp-pf-field">
                                <label>CVV</label>
                                <input type="password" placeholder="•••" maxLength={4} value={cardDetails.cvv} onChange={e => setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/\D/g, '') })} />
                              </div>
                            </div>
                            <div className="sp-pf-actions">
                              <button className="sp-pf-pay-btn" disabled={paymentProcessing || !cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name} onClick={() => handlePayment(fee, 'card')}>
                                {paymentProcessing ? '⏳ Processing...' : `Pay ₹${balance.toLocaleString()}`}
                              </button>
                              <button className="sp-pf-back-btn" onClick={() => setPaymentMethod(null)} disabled={paymentProcessing}>← Back</button>
                              <button className="sp-cancel-pay" onClick={() => { setPayingFeeId(null); setPaymentMethod(null) }} disabled={paymentProcessing}>Cancel</button>
                            </div>
                          </div>
                        )}

                        {!isPaid && isPayingThis && paymentMethod === 'upi' && (
                          <div className="sp-payment-form">
                            <div className="sp-pf-header"><span>📱 UPI Payment</span><span className="sp-pf-amount">₹{balance.toLocaleString()}</span></div>
                            <div className="sp-pf-fields">
                              <div className="sp-pf-field full">
                                <label>UPI ID</label>
                                <input type="text" placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} />
                              </div>
                            </div>
                            <div className="sp-upi-apps">
                              <span className="sp-upi-or">Or pay using</span>
                              <div className="sp-upi-icons">
                                <button className="sp-upi-app" onClick={() => setUpiId('gpay@upi')}><span>G</span> GPay</button>
                                <button className="sp-upi-app" onClick={() => setUpiId('phonepe@upi')}><span>P</span> PhonePe</button>
                                <button className="sp-upi-app" onClick={() => setUpiId('paytm@upi')}><span>₹</span> Paytm</button>
                              </div>
                            </div>
                            <div className="sp-pf-actions">
                              <button className="sp-pf-pay-btn upi" disabled={paymentProcessing || !upiId.trim()} onClick={() => handlePayment(fee, 'upi')}>
                                {paymentProcessing ? '⏳ Processing...' : `Pay ₹${balance.toLocaleString()}`}
                              </button>
                              <button className="sp-pf-back-btn" onClick={() => setPaymentMethod(null)} disabled={paymentProcessing}>← Back</button>
                              <button className="sp-cancel-pay" onClick={() => { setPayingFeeId(null); setPaymentMethod(null) }} disabled={paymentProcessing}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SPORTS */}
        {activeTab === 'sports' && (
          <div className="sp-section">
            <div className="sp-card">
              <h3>⚽ Sports & Activities</h3>
              {sports.length === 0 ? (
                <p className="sp-empty">No sports activities registered yet.</p>
              ) : (
                <div className="sp-sports-grid">
                  {sports.map(sport => (
                    <div key={sport.id} className="sp-sport-card">
                      <div className="sp-sport-icon">
                        {sport.name.toLowerCase().includes('cricket') ? '🏏' :
                         sport.name.toLowerCase().includes('football') ? '⚽' :
                         sport.name.toLowerCase().includes('basketball') ? '🏀' :
                         sport.name.toLowerCase().includes('tennis') ? '🎾' :
                         sport.name.toLowerCase().includes('badminton') ? '🏸' :
                         sport.name.toLowerCase().includes('swim') ? '🏊' :
                         sport.name.toLowerCase().includes('run') || sport.name.toLowerCase().includes('athletics') ? '🏃' :
                         sport.name.toLowerCase().includes('chess') ? '♟️' :
                         sport.name.toLowerCase().includes('kabaddi') ? '🤼' :
                         sport.name.toLowerCase().includes('volley') ? '🏐' :
                         sport.name.toLowerCase().includes('hockey') ? '🏑' : '🏅'}
                      </div>
                      <div className="sp-sport-info">
                        <h4>{sport.name}</h4>
                        <div className="sp-sport-details">
                          <span>🧑‍🏫 Coach: {sport.coachName}</span>
                          <span>🕐 {sport.schedule}</span>
                        </div>
                        {sport.description && <p className="sp-sport-desc">{sport.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EVENTS */}
        {activeTab === 'events' && (
          <div className="sp-section">
            <div className="sp-card">
              <h3>🎉 School Events</h3>
              {events.length === 0 ? (
                <p className="sp-empty">No events scheduled.</p>
              ) : (
                <div className="sp-events-list">
                  {events.map(event => {
                    const eventDate = new Date(event.date)
                    const isPast = eventDate < new Date()
                    return (
                      <div key={event.id} className={`sp-event-card ${isPast ? 'past' : 'upcoming'}`}>
                        <div className="sp-event-date-box">
                          <span className="sp-event-day">{eventDate.getDate()}</span>
                          <span className="sp-event-month">{eventDate.toLocaleString('default', { month: 'short' })}</span>
                          <span className="sp-event-year">{eventDate.getFullYear()}</span>
                        </div>
                        <div className="sp-event-info">
                          <h4>{event.title}</h4>
                          <p>{event.description}</p>
                          <span className={`sp-event-status ${isPast ? 'past' : 'upcoming'}`}>
                            {isPast ? '✓ Completed' : '📌 Upcoming'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACHIEVEMENTS */}
        {activeTab === 'achievements' && (
          <div className="sp-section">
            <div className="sp-card">
              <h3>🏆 Awards & Achievements</h3>
              {achievements.length === 0 ? (
                <p className="sp-empty">No achievements yet. Keep working hard! 💪</p>
              ) : (
                <div className="sp-awards-list">
                  {achievements.map(a => (
                    <div key={a.id} className="sp-award-card">
                      <div className="sp-award-icon">🏆</div>
                      <div className="sp-award-info">
                        <h4>{a.title}</h4>
                        <div className="sp-award-meta">
                          <span className="sp-award-category">{a.category}</span>
                          <span className="sp-award-date">{new Date(a.achievementDate).toLocaleDateString()}</span>
                        </div>
                        {a.description && <p className="sp-award-desc">{a.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="sp-section">
            <div className="sp-card">
              <h3>📢 Announcements</h3>
              {announcements.length === 0 ? (
                <p className="sp-empty">No announcements yet.</p>
              ) : (
                <div className="sp-announcements-list">
                  {announcements.map(a => (
                    <div key={a.id} className="sp-announcement-item">
                      <div className="sp-ann-icon">📢</div>
                      <div className="sp-ann-body">
                        <h4>{a.title}</h4>
                        <p>{a.message}</p>
                        <span className="sp-ann-date">{new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        </div>
        </div>
      </main>

    </div>
  )
}

export default MyStudentProfile
