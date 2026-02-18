// @ts-nocheck
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'

const MyStudentProfile = () => {
  const { studentId } = useParams()
  const navigate = useNavigate()
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
    const portalUser = JSON.parse(sessionStorage.getItem('portalUser') || '{}')
    if (!portalUser.id || portalUser.type !== 'student' || String(portalUser.id) !== String(studentId)) {
      navigate('/student-login')
      return
    }
    loadProfile()
    loadFees()
  }, [studentId])

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
    sessionStorage.removeItem('portalUser')
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
      alert(`Payment failed: ${err.message}`)
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

  const { student, attendance, marks, achievements, events, announcements, sports } = data
  const attStats = getAttendanceStats()
  const monthlyAtt = getMonthlyAttendance()

  const tabs = [
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'academics', icon: '📊', label: 'Academics' },
    { id: 'attendance', icon: '📅', label: 'Attendance' },
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

      {/* Bottom Tab Bar (Mobile) */}
      <nav className="sp-bottom-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`sp-bottom-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => switchTab(tab.id)}
          >
            <span className="sp-bottom-icon">{tab.icon}</span>
            <span className="sp-bottom-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default MyStudentProfile
