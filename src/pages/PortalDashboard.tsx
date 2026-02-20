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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const studentsResponse = await apiClient.listStudents()
      const teachersResponse = await apiClient.listTeachers()
      const eventsResponse = await apiClient.listEvents()

      const studentsList = studentsResponse?.data || studentsResponse || []
      const teachersList = teachersResponse?.data || teachersResponse || []
      const eventsList = eventsResponse?.data || eventsResponse || []

      // Count upcoming events (from today onwards)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const upcomingEvents = eventsList.filter((e) => new Date(e.date) >= today)

      setStats({
        students: studentsList.length,
        teachers: teachersList.length,
        attendance: 0,
        events: upcomingEvents.length,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
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
                <p className="empty-state">
                  No recent activity. Start by adding students or creating events!
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default PortalDashboard
