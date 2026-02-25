// @ts-nocheck
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppSelector } from '@/store'
import apiClient from '@/services/api'

const PortalDashboard = () => {
  const user = useAppSelector((state) => state.auth.user)
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    attendance: 0,
    events: 0,
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [studentsResponse, teachersResponse, eventsResponse, announcementsResponse, homeworkResponse, achievementsResponse] =
        await Promise.all([
          apiClient.listStudents().catch(() => ({ data: [] })),
          apiClient.listTeachers().catch(() => ({ data: [] })),
          apiClient.listEvents().catch(() => ({ data: [] })),
          apiClient.listAnnouncements().catch(() => ({ data: [] })),
          apiClient.listHomework().catch(() => ({ data: [] })),
          apiClient.listAchievements().catch(() => ({ data: [] })),
        ])

      const studentsList = studentsResponse?.data || studentsResponse || []
      const teachersList = teachersResponse?.data || teachersResponse || []
      const eventsList = eventsResponse?.data || eventsResponse || []
      const announcementsList = announcementsResponse?.data || announcementsResponse || []
      const homeworkList = homeworkResponse?.data || homeworkResponse || []
      const achievementsList = achievementsResponse?.data || achievementsResponse || []

      // Count upcoming events
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const upcomingEvents = eventsList.filter((e) => new Date(e.date) >= today)

      setStats({
        students: studentsList.length,
        teachers: teachersList.length,
        attendance: 0,
        events: upcomingEvents.length,
      })

      // Build recent activity from all sources
      const activities = []

      studentsList.forEach((s) => {
        if (s.createdAt) {
          activities.push({
            type: 'student',
            icon: '👤',
            color: '#3a66ff',
            text: `New student added — ${s.firstName || ''} ${s.lastName || ''}`.trim(),
            time: new Date(s.createdAt),
          })
        }
      })

      teachersList.forEach((t) => {
        if (t.createdAt) {
          activities.push({
            type: 'teacher',
            icon: '👨‍🏫',
            color: '#10b981',
            text: `New teacher added — ${t.firstName || ''} ${t.lastName || ''}`.trim(),
            time: new Date(t.createdAt),
          })
        }
      })

      eventsList.forEach((e) => {
        if (e.createdAt) {
          activities.push({
            type: 'event',
            icon: '🎉',
            color: '#ef4444',
            text: `Event created — ${e.title || e.name || 'Untitled'}`,
            time: new Date(e.createdAt),
          })
        }
      })

      announcementsList.forEach((a) => {
        if (a.createdAt) {
          activities.push({
            type: 'announcement',
            icon: '📢',
            color: '#f59e0b',
            text: `Announcement posted — ${a.title || 'Untitled'}`,
            time: new Date(a.createdAt),
          })
        }
      })

      homeworkList.forEach((h) => {
        if (h.createdAt) {
          activities.push({
            type: 'homework',
            icon: '📝',
            color: '#8b5cf6',
            text: `Homework assigned — ${h.title || h.subject?.name || 'Untitled'}`,
            time: new Date(h.createdAt),
          })
        }
      })

      achievementsList.forEach((a) => {
        if (a.createdAt) {
          activities.push({
            type: 'achievement',
            icon: '🏆',
            color: '#f59e0b',
            text: `Achievement recorded — ${a.title || 'Untitled'}`,
            time: new Date(a.createdAt),
          })
        }
      })

      // Sort by most recent, take last 5
      activities.sort((a, b) => b.time - a.time)
      setRecentActivity(activities.slice(0, 5))
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (date) => {
    const now = new Date()
    const diff = now - date
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const statCards = [
    { title: 'Total Students', value: stats.students, icon: '👥', color: '#3a66ff', link: '/portal/students' },
    { title: 'Total Teachers', value: stats.teachers, icon: '👨‍🏫', color: '#10b981', link: '/portal/teachers' },
    { title: 'Attendance Today', value: `${stats.attendance}%`, icon: '✅', color: '#f59e0b', link: '/portal/attendance' },
    { title: 'Upcoming Events', value: stats.events, icon: '🎉', color: '#ef4444', link: '/portal/events' },
  ]

  const quickActions = [
    { label: 'Add Student', icon: '➕', link: '/portal/students' },
    { label: 'Mark Attendance', icon: '✅', link: '/portal/attendance' },
    { label: 'Create Event', icon: '🎊', link: '/portal/events' },
    { label: 'View Reports', icon: '📊', link: '/portal/exams' },
    { label: 'Send Notice', icon: '📨', link: '/portal/notifications' },
    { label: 'Homework', icon: '📝', link: '/portal/homework' },
  ]

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <div className="dashboard-header">
        <h1>Welcome back, {user?.email?.split('@')[0]}!</h1>
        <p>Here's what's happening in your school today</p>
      </div>

      {loading ? (
        <div className="loading-state">Loading dashboard...</div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="stats-grid">
            {statCards.map((stat) => (
              <Link to={stat.link} key={stat.title} className="stat-card">
                <div className="stat-icon" style={{ background: stat.color }}>
                  {stat.icon}
                </div>
                <div className="stat-content">
                  <p className="stat-label">{stat.title}</p>
                  <h2 className="stat-value">{stat.value}</h2>
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom Grid — Quick Actions + Recent Activity side by side on desktop */}
          <div className="dashboard-bottom-grid">
            <div className="dashboard-section">
              <div className="section-title">
                <h2>Quick Actions</h2>
              </div>
              <div className="quick-actions">
                {quickActions.map((action) => (
                  <Link to={action.link} key={action.label} className="action-btn">
                    <span className="action-icon">{action.icon}</span>
                    <span className="action-label">{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="dashboard-section">
              <div className="section-title">
                <h2>Recent Activity</h2>
              </div>
              <div className="activity-card">
                {recentActivity.length > 0 ? (
                  <ul className="activity-list">
                    {recentActivity.map((activity, idx) => (
                      <li key={idx} className="activity-item">
                        <span className="activity-icon" style={{ background: activity.color }}>
                          {activity.icon}
                        </span>
                        <div className="activity-info">
                          <span className="activity-text">{activity.text}</span>
                          <span className="activity-time">{formatTimeAgo(activity.time)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">
                    No recent activity. Start by adding students or creating events!
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default PortalDashboard
