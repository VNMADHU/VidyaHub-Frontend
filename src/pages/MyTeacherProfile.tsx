// @ts-nocheck
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'
import { useAppSelector, useAppDispatch } from '@/store'
import { logout } from '@/store/slices/authSlice'

const MyTeacherProfile = () => {
  const { teacherId } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const token = useAppSelector((state) => state.auth.token)
  const role = useAppSelector((state) => state.auth.role)
  const authUser = useAppSelector((state) => state.auth.user)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Prevent browser back button from leaving the portal
  useEffect(() => {
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
    // Verify user is authenticated with a portal-teacher JWT
    if (!token || role !== 'portal-teacher' || String(authUser?.id) !== String(teacherId)) {
      navigate('/teacher-login')
      return
    }
    loadProfile()
  }, [teacherId, token, role])

  const loadProfile = async () => {
    try {
      const response = await apiClient.getTeacherProfile(teacherId)
      setData(response.data)
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/teacher-login')
  }

  if (loading) return (
    <div className="tp-app">
      <div className="tp-loading">Loading your profile...</div>
    </div>
  )

  if (!data?.teacher) return (
    <div className="tp-app">
      <div className="tp-loading">Profile not found</div>
    </div>
  )

  const { teacher, events, announcements, sports, timetable, periods, homework, attendance } = data

  const tabs = [
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'classes', icon: '🏫', label: 'Classes' },
    { id: 'timetable', icon: '🕐', label: 'Timetable' },
    { id: 'homework', icon: '📝', label: 'Homework' },
    { id: 'attendance', icon: '📅', label: 'Attendance' },
    { id: 'events', icon: '🎉', label: 'Events' },
    { id: 'announcements', icon: '📢', label: 'News' },
    { id: 'sports', icon: '⚽', label: 'Sports' },
  ]

  const switchTab = (id) => {
    setActiveTab(id)
    setSidebarOpen(false)
  }

  return (
    <div className="tp-app">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="tp-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`tp-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="tp-sidebar-header">
          <span className="tp-sidebar-logo">🎓</span>
          <div>
            <div className="tp-sidebar-school">{teacher.school?.name || 'Vidya Hub'}</div>
            <span className="tp-sidebar-badge">Teacher Portal</span>
          </div>
        </div>

        <div className="tp-sidebar-profile">
          {teacher.profilePic ? (
            <img src={teacher.profilePic} alt="" className="tp-sidebar-avatar" />
          ) : (
            <div className="tp-sidebar-avatar-initials">{teacher.firstName?.[0]}{teacher.lastName?.[0]}</div>
          )}
          <div className="tp-sidebar-name">{teacher.firstName} {teacher.lastName}</div>
          <div className="tp-sidebar-meta">ID: {teacher.teacherId || 'N/A'} • {teacher.subject || 'General'}</div>
        </div>

        <nav className="tp-sidebar-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tp-sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => switchTab(tab.id)}
            >
              <span className="tp-sidebar-item-icon">{tab.icon}</span>
              <span className="tp-sidebar-item-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <button className="tp-sidebar-logout" onClick={handleLogout}>🚪 Logout</button>
      </aside>

      {/* Main Content */}
      <main className="tp-main">
        {/* Top Bar (mobile) */}
        <header className="tp-topbar">
          <button className="tp-hamburger" onClick={() => setSidebarOpen(true)}>
            <span /><span /><span />
          </button>
          <div className="tp-topbar-title">
            <span className="tp-topbar-logo">🎓</span>
            {teacher.school?.name || 'Vidya Hub'}
          </div>
          <button className="tp-topbar-logout" onClick={handleLogout}>🚪</button>
        </header>

        <div className="tp-page-scroll">
          <div className="tp-page-title">
            <h2>{tabs.find(t => t.id === activeTab)?.icon} {tabs.find(t => t.id === activeTab)?.label}</h2>
          </div>

          <div className="tp-content">
            {activeTab === 'profile' && (
              <div className="tp-section">
                <div className="tp-card">
                  <h3>Personal Information</h3>
                  <div className="tp-info-grid">
                    <div className="tp-info-item">
                      <span className="info-label">Full Name</span>
                      <span className="info-value">{teacher.firstName} {teacher.lastName}</span>
                    </div>
                    <div className="tp-info-item">
                      <span className="info-label">Email</span>
                      <span className="info-value">{teacher.email}</span>
                    </div>
                    <div className="tp-info-item">
                      <span className="info-label">Phone</span>
                      <span className="info-value">{teacher.phoneNumber || 'N/A'}</span>
                    </div>
                    <div className="tp-info-item">
                      <span className="info-label">Teacher ID</span>
                      <span className="info-value">{teacher.teacherId || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="tp-card">
                  <h3>Professional Information</h3>
                  <div className="tp-info-grid">
                    <div className="tp-info-item">
                      <span className="info-label">Subject</span>
                      <span className="info-value">{teacher.subject || 'N/A'}</span>
                    </div>
                    <div className="tp-info-item">
                      <span className="info-label">Qualification</span>
                      <span className="info-value">{teacher.qualification || 'N/A'}</span>
                    </div>
                    <div className="tp-info-item">
                      <span className="info-label">Experience</span>
                      <span className="info-value">{teacher.experience ? `${teacher.experience} years` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Stats Cards in Profile */}
                <div className="tp-stats-row">
                  <div className="tp-stat-card">
                    <span className="tp-stat-icon">🏫</span>
                    <span className="tp-stat-num">{teacher.classes?.length || 0}</span>
                    <span className="tp-stat-label">Classes</span>
                  </div>
                  <div className="tp-stat-card">
                    <span className="tp-stat-icon">👨‍🎓</span>
                    <span className="tp-stat-num">{teacher.classes?.reduce((sum, c) => sum + (c.students?.length || 0), 0) || 0}</span>
                    <span className="tp-stat-label">Students</span>
                  </div>
                  <div className="tp-stat-card">
                    <span className="tp-stat-icon">📅</span>
                    <span className="tp-stat-num">{teacher.experience || 0}</span>
                    <span className="tp-stat-label">Yrs Exp</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'classes' && (
              <div className="tp-section">
                {(!teacher.classes || teacher.classes.length === 0) ? (
                  <div className="tp-empty">No classes assigned yet.</div>
                ) : (
                  <div className="tp-classes-grid">
                    {teacher.classes.map(cls => (
                      <div key={cls.id} className="tp-class-card">
                        <div className="tp-class-header">
                          <span className="tp-class-icon">🏫</span>
                          <h4>{cls.name}</h4>
                        </div>
                        <div className="tp-class-body">
                          <p><strong>Sections:</strong> {cls.sections?.map(s => s.name).join(', ') || 'None'}</p>
                          <p><strong>Students:</strong> {cls.students?.length || 0}</p>
                          {cls.students && cls.students.length > 0 && (
                            <div className="tp-students-chips">
                              {cls.students.map(s => (
                                <span key={s.id} className="tp-chip">
                                  {s.firstName} {s.lastName} {s.rollNumber ? `(${s.rollNumber})` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TIMETABLE */}
            {activeTab === 'timetable' && (() => {
              const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
              const allSlots = (periods || []).sort((a, b) => a.sortOrder - b.sortOrder)
              const ttMap = {}
              ;(timetable || []).forEach(t => {
                const key = `${t.day}-${t.periodId}`
                if (!ttMap[key]) ttMap[key] = []
                ttMap[key].push(t)
              })

              // Group by class for teacher view
              const classIds = [...new Set((timetable || []).map(t => t.classId))]
              const classNames = {}
              ;(timetable || []).forEach(t => {
                if (t.class?.name) classNames[t.classId] = t.class.name
              })
              ;(teacher.classes || []).forEach(c => { classNames[c.id] = c.name })

              return (
                <div className="tp-section">
                  <div className="tp-card">
                    <h3>🕐 My Teaching Schedule</h3>
                    {allSlots.length === 0 ? (
                      <p className="tp-empty">No timetable configured yet.</p>
                    ) : (
                      <div className="tp-table-wrap">
                        <table className="tp-table tp-timetable-table">
                          <thead>
                            <tr>
                              <th>Period</th>
                              <th>Time</th>
                              {days.map(d => <th key={d}>{d.slice(0, 3)}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {allSlots.map(slot => (
                              <tr key={slot.id} className={slot.isBreak ? 'tp-tt-break-row' : ''}>
                                <td className="tp-tt-period-name">
                                  {slot.isBreak ? `☕ ${slot.name}` : slot.name}
                                </td>
                                <td className="tp-tt-time">{slot.startTime} – {slot.endTime}</td>
                                {days.map(day => {
                                  if (slot.isBreak) {
                                    return <td key={day} className="tp-tt-break-cell">—</td>
                                  }
                                  const entries = ttMap[`${day}-${slot.id}`] || []
                                  // Show entries this teacher is involved in
                                  const teacherName = `${teacher.firstName} ${teacher.lastName}`
                                  const myEntries = entries.filter(e =>
                                    e.teacher?.toLowerCase().includes(teacher.firstName?.toLowerCase()) ||
                                    e.teacher?.toLowerCase().includes(teacher.lastName?.toLowerCase())
                                  )
                                  const showEntries = myEntries.length > 0 ? myEntries : entries
                                  return (
                                    <td key={day} className={showEntries.length > 0 ? 'tp-tt-filled' : 'tp-tt-empty'}>
                                      {showEntries.length > 0 ? showEntries.map((entry, i) => (
                                        <div key={i} className="tp-tt-cell">
                                          <span className="tp-tt-subject">{entry.subject}</span>
                                          <span className="tp-tt-class">{classNames[entry.classId] || ''}</span>
                                        </div>
                                      )) : '—'}
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

              return (
                <div className="tp-section">
                  <div className="tp-card">
                    <h3>📝 Active Homework Assignments</h3>
                    {activeHw.length === 0 ? (
                      <p className="tp-empty">No active homework assignments.</p>
                    ) : (
                      <div className="tp-hw-list">
                        {activeHw.map(hw => {
                          const due = new Date(hw.dueDate)
                          const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
                          const isUrgent = diff <= 2
                          return (
                            <div key={hw.id} className={`tp-hw-card ${isUrgent ? 'urgent' : ''}`}>
                              <div className="tp-hw-header">
                                <span className="tp-hw-subject">{hw.subject}</span>
                                <span className="tp-hw-class">{hw.class?.name || ''} {hw.section?.name ? `- ${hw.section.name}` : ''}</span>
                              </div>
                              <h4 className="tp-hw-title">{hw.title}</h4>
                              {hw.description && <p className="tp-hw-desc">{hw.description}</p>}
                              <div className="tp-hw-meta">
                                <span>📅 Due: {due.toLocaleDateString()}</span>
                                <span className={`tp-hw-days ${isUrgent ? 'urgent' : ''}`}>
                                  {diff === 0 ? 'Due today' : diff === 1 ? 'Due tomorrow' : `${diff} days left`}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {pastHw.length > 0 && (
                    <div className="tp-card">
                      <h3>✅ Past Homework</h3>
                      <div className="tp-hw-list">
                        {pastHw.slice(0, 20).map(hw => (
                          <div key={hw.id} className="tp-hw-card past">
                            <div className="tp-hw-header">
                              <span className="tp-hw-subject">{hw.subject}</span>
                              <span className="tp-hw-class">{hw.class?.name || ''}</span>
                            </div>
                            <h4 className="tp-hw-title">{hw.title}</h4>
                            <div className="tp-hw-meta">
                              <span>📅 Was due: {new Date(hw.dueDate).toLocaleDateString()}</span>
                              <span className={`tp-hw-status ${hw.status}`}>
                                {hw.status === 'completed' ? '✅ Done' : hw.status === 'cancelled' ? '❌ Cancelled' : '⏰ Expired'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ATTENDANCE */}
            {activeTab === 'attendance' && (() => {
              // Group attendance by date and class
              const attByDate = {}
              ;(attendance || []).forEach(a => {
                const dateKey = new Date(a.date).toLocaleDateString()
                if (!attByDate[dateKey]) attByDate[dateKey] = []
                attByDate[dateKey].push(a)
              })
              const dateKeys = Object.keys(attByDate).sort((a, b) => new Date(b) - new Date(a))

              // Overall stats
              const totalRecords = (attendance || []).length
              const presentCount = (attendance || []).filter(a => a.status === 'present').length
              const absentCount = (attendance || []).filter(a => a.status === 'absent').length
              const lateCount = (attendance || []).filter(a => a.status === 'late').length
              const overallRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0

              return (
                <div className="tp-section">
                  {/* Stats */}
                  <div className="tp-att-stats">
                    <div className="tp-att-stat total">
                      <span className="tp-att-stat-icon">📋</span>
                      <span className="tp-att-stat-num">{totalRecords}</span>
                      <span className="tp-att-stat-label">Records</span>
                    </div>
                    <div className="tp-att-stat present">
                      <span className="tp-att-stat-icon">✅</span>
                      <span className="tp-att-stat-num">{presentCount}</span>
                      <span className="tp-att-stat-label">Present</span>
                    </div>
                    <div className="tp-att-stat absent">
                      <span className="tp-att-stat-icon">❌</span>
                      <span className="tp-att-stat-num">{absentCount}</span>
                      <span className="tp-att-stat-label">Absent</span>
                    </div>
                    <div className="tp-att-stat rate">
                      <span className="tp-att-stat-icon">📊</span>
                      <span className="tp-att-stat-num">{overallRate}%</span>
                      <span className="tp-att-stat-label">Rate</span>
                    </div>
                  </div>

                  <div className="tp-card">
                    <h3>📅 Recent Attendance (Last 30 Days)</h3>
                    {dateKeys.length === 0 ? (
                      <p className="tp-empty">No attendance records for your classes yet.</p>
                    ) : (
                      <div className="tp-att-dates">
                        {dateKeys.slice(0, 15).map(dateKey => {
                          const records = attByDate[dateKey]
                          const p = records.filter(r => r.status === 'present').length
                          const a = records.filter(r => r.status === 'absent').length
                          const l = records.filter(r => r.status === 'late').length
                          return (
                            <div key={dateKey} className="tp-att-date-row">
                              <div className="tp-att-date-label">
                                <strong>{dateKey}</strong>
                                <span>{records.length} student{records.length !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="tp-att-date-stats">
                                <span className="tp-att-pill present">✅ {p}</span>
                                <span className="tp-att-pill absent">❌ {a}</span>
                                {l > 0 && <span className="tp-att-pill late">⏰ {l}</span>}
                              </div>
                              <div className="tp-att-bar">
                                <div className="tp-att-bar-fill present" style={{ width: `${(p / records.length) * 100}%` }} />
                                <div className="tp-att-bar-fill absent" style={{ width: `${(a / records.length) * 100}%` }} />
                                {l > 0 && <div className="tp-att-bar-fill late" style={{ width: `${(l / records.length) * 100}%` }} />}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* EVENTS */}
            {activeTab === 'events' && (
              <div className="tp-section">
                <div className="tp-card">
                  <h3>🎉 School Events</h3>
                  {events.length === 0 ? (
                    <p className="tp-empty">No events scheduled.</p>
                  ) : (
                    <div className="tp-events-list">
                      {events.map(event => {
                        const eventDate = new Date(event.date)
                        const isPast = eventDate < new Date()
                        return (
                          <div key={event.id} className={`tp-event-card ${isPast ? 'past' : 'upcoming'}`}>
                            <div className="tp-event-date-box">
                              <span className="tp-event-day">{eventDate.getDate()}</span>
                              <span className="tp-event-month">{eventDate.toLocaleString('default', { month: 'short' })}</span>
                            </div>
                            <div className="tp-event-info">
                              <h4>{event.title}</h4>
                              <p>{event.description}</p>
                              <span className={`tp-event-status ${isPast ? 'past' : 'upcoming'}`}>
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

            {/* ANNOUNCEMENTS */}
            {activeTab === 'announcements' && (
              <div className="tp-section">
                <div className="tp-card">
                  <h3>📢 Announcements</h3>
                  {announcements.length === 0 ? (
                    <p className="tp-empty">No announcements yet.</p>
                  ) : (
                    <div className="tp-list">
                      {announcements.map(a => (
                        <div key={a.id} className="tp-list-item">
                          <h4>{a.title}</h4>
                          <p>{a.message}</p>
                          <span className="tp-list-date">{new Date(a.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SPORTS */}
            {activeTab === 'sports' && (
              <div className="tp-section">
                <div className="tp-card">
                  <h3>⚽ Sports & Activities</h3>
                  {sports.length === 0 ? (
                    <p className="tp-empty">No sports activities registered.</p>
                  ) : (
                    <div className="tp-sports-grid">
                      {sports.map(sport => (
                        <div key={sport.id} className="tp-sport-card">
                          <div className="tp-sport-icon">
                            {sport.name.toLowerCase().includes('cricket') ? '🏏' :
                             sport.name.toLowerCase().includes('football') ? '⚽' :
                             sport.name.toLowerCase().includes('basketball') ? '🏀' :
                             sport.name.toLowerCase().includes('tennis') ? '🎾' :
                             sport.name.toLowerCase().includes('badminton') ? '🏸' :
                             sport.name.toLowerCase().includes('swim') ? '🏊' : '🏅'}
                          </div>
                          <div className="tp-sport-info">
                            <h4>{sport.name}</h4>
                            <p>🧑‍🏫 Coach: {sport.coachName}</p>
                            <p>🕐 {sport.schedule}</p>
                            {sport.description && <p className="tp-sport-desc">{sport.description}</p>}
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

export default MyTeacherProfile
