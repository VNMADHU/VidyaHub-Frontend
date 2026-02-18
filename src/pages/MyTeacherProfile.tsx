// @ts-nocheck
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'

const MyTeacherProfile = () => {
  const { teacherId } = useParams()
  const navigate = useNavigate()
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
    const portalUser = JSON.parse(sessionStorage.getItem('portalUser') || '{}')
    if (!portalUser.id || portalUser.type !== 'teacher' || String(portalUser.id) !== String(teacherId)) {
      navigate('/teacher-login')
      return
    }
    loadProfile()
  }, [teacherId])

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
    sessionStorage.removeItem('portalUser')
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

  const { teacher, events, announcements, sports } = data

  const tabs = [
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'classes', icon: '🏫', label: 'Classes' },
    { id: 'events', icon: '📣', label: 'Updates' },
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

            {activeTab === 'events' && (
              <div className="tp-section">
                <div className="tp-card">
                  <h3>📣 Announcements</h3>
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

                <div className="tp-card">
                  <h3>🎉 Upcoming Events</h3>
                  {events.length === 0 ? (
                    <p className="tp-empty">No events scheduled.</p>
                  ) : (
                    <div className="tp-list">
                      {events.map(e => (
                        <div key={e.id} className="tp-list-item">
                          <h4>{e.title}</h4>
                          <p>{e.description}</p>
                          <span className="tp-list-date">{new Date(e.date).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {sports.length > 0 && (
                  <div className="tp-card">
                    <h3>⚽ Sports</h3>
                    <div className="tp-list">
                      {sports.map(s => (
                        <div key={s.id} className="tp-list-item">
                          <h4>{s.name}</h4>
                          <p>Coach: {s.coachName} • {s.schedule}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Tab Bar (Mobile) */}
      <nav className="tp-bottom-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tp-bottom-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => switchTab(tab.id)}
          >
            <span className="tp-bottom-icon">{tab.icon}</span>
            <span className="tp-bottom-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default MyTeacherProfile
