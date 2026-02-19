// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'
import { useAppSelector } from '@/store'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    events: 0,
    announcements: 0,
    fees: { total: 0, collected: 0, pending: 0 },
    attendance: { rate: 0 },
  })
  const [recentEvents, setRecentEvents] = useState([])
  const [recentAnnouncements, setRecentAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const results = await Promise.allSettled([
        apiClient.listStudents(),
        apiClient.listTeachers(),
        apiClient.listClasses(),
        apiClient.listEvents(),
        apiClient.listAnnouncements(),
        apiClient.listFees(),
        apiClient.listAttendance(),
      ])

      const extract = (r: PromiseSettledResult<any>) =>
        r.status === 'fulfilled' ? (r.value?.data || []) : []

      const students = extract(results[0])
      const teachers = extract(results[1])
      const classes = extract(results[2])
      const events = extract(results[3])
      const announcements = extract(results[4])
      const fees = extract(results[5])
      const attendance = extract(results[6])

      // Fee stats
      const totalFees = fees.reduce((sum: number, f: any) => sum + (f.amount || 0), 0)
      const collectedFees = fees.reduce((sum: number, f: any) => sum + (f.paidAmount || 0), 0)

      // Today's attendance rate
      const today = new Date().toISOString().split('T')[0]
      const todayAttendance = attendance.filter((a: any) => a.date?.split('T')[0] === today)
      const presentToday = todayAttendance.filter((a: any) => a.status === 'present' || a.status === 'late').length
      const attendanceRate = todayAttendance.length > 0
        ? Math.round((presentToday / todayAttendance.length) * 100)
        : 0

      setStats({
        students: students.length,
        teachers: teachers.length,
        classes: classes.length,
        events: events.length,
        announcements: announcements.length,
        fees: { total: totalFees, collected: collectedFees, pending: totalFees - collectedFees },
        attendance: { rate: attendanceRate },
      })

      setRecentEvents(events.slice(-3).reverse())
      setRecentAnnouncements(announcements.slice(-3).reverse())
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', color: 'var(--muted)' }}>
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.email?.split('@')[0] || 'Admin'} 👋</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>
            Here's an overview of your school portal
          </p>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard icon="👨‍🎓" value={stats.students} label="Total Students" onClick={() => navigate('/portal/students')} />
        <StatCard icon="👩‍🏫" value={stats.teachers} label="Total Teachers" onClick={() => navigate('/portal/teachers')} />
        <StatCard icon="🏫" value={stats.classes} label="Classes" onClick={() => navigate('/portal/classes')} />
        <StatCard
          icon="📊"
          value={`${stats.attendance.rate}%`}
          label="Today's Attendance"
          color={stats.attendance.rate >= 75 ? '#10b981' : '#ef4444'}
        />
      </div>

      {/* ── Fee Summary + Recent Events + Announcements ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>

        {/* Fee Collection */}
        <div className="form-card" style={{ cursor: 'pointer', padding: '1.5rem' }} onClick={() => navigate('/portal/fees')}>
          <h3 style={{ margin: '0 0 1rem' }}>💰 Fee Collection</h3>
          <FeeRow label="Total" value={stats.fees.total} />
          <FeeRow label="Collected" value={stats.fees.collected} color="#10b981" />
          <FeeRow label="Pending" value={stats.fees.pending} color="#ef4444" />
          <div style={{ background: '#f3f4f6', borderRadius: '999px', height: '8px', marginTop: '1rem', overflow: 'hidden' }}>
            <div style={{
              background: 'linear-gradient(90deg, #10b981, #34d399)',
              height: '100%',
              width: `${stats.fees.total > 0 ? (stats.fees.collected / stats.fees.total * 100) : 0}%`,
              borderRadius: '999px',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Recent Events */}
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center' }}>
            🎉 Recent Events
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/portal/events')}>View All →</span>
          </h3>
          {recentEvents.length === 0
            ? <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No events yet</p>
            : recentEvents.map((event: any) => (
              <div key={event.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: '500' }}>{event.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  📅 {event.date ? new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                  {event.category && (
                    <span style={{ marginLeft: '0.5rem', padding: '0.1rem 0.5rem', background: 'var(--primary-alpha, rgba(99,102,241,0.1))', borderRadius: '999px', fontSize: '0.75rem' }}>
                      {event.category}
                    </span>
                  )}
                </div>
              </div>
            ))
          }
        </div>

        {/* Recent Announcements */}
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center' }}>
            📢 Recent Announcements
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/portal/announcements')}>View All →</span>
          </h3>
          {recentAnnouncements.length === 0
            ? <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No announcements yet</p>
            : recentAnnouncements.map((ann: any) => (
              <div key={ann.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: '500' }}>{ann.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ann.message}
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="form-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>⚡ Quick Actions</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button className="btn primary" onClick={() => navigate('/portal/students')}>👨‍🎓 Manage Students</button>
          <button className="btn outline" onClick={() => navigate('/portal/teachers')}>👩‍🏫 Manage Teachers</button>
          <button className="btn outline" onClick={() => navigate('/portal/attendance')}>📋 Mark Attendance</button>
          <button className="btn outline" onClick={() => navigate('/portal/exams')}>📝 Enter Marks</button>
          <button className="btn outline" onClick={() => navigate('/portal/fees')}>💰 Manage Fees</button>
          <button className="btn outline" onClick={() => navigate('/portal/events')}>🎉 Add Event</button>
          <button className="btn outline" onClick={() => navigate('/portal/announcements')}>📢 Post Announcement</button>
        </div>
      </div>
    </div>
  )
}

/* ── Helper Components ── */

const StatCard = ({ icon, value, label, color, onClick }: {
  icon: string; value: string | number; label: string; color?: string; onClick?: () => void
}) => (
  <div
    className="form-card"
    style={{ cursor: onClick ? 'pointer' : 'default', textAlign: 'center', padding: '1.5rem' }}
    onClick={onClick}
  >
    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{icon}</div>
    <div style={{ fontSize: '2rem', fontWeight: '700', color: color || 'var(--primary)' }}>{value}</div>
    <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{label}</div>
  </div>
)

const FeeRow = ({ label, value, color }: { label: string; value: number; color?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
    <span style={{ color: color || 'var(--muted)' }}>{label}</span>
    <span style={{ fontWeight: '600', color: color || 'var(--text)' }}>₹{value.toLocaleString('en-IN')}</span>
  </div>
)

export default AdminDashboard
