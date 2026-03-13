// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'
import { useAppSelector } from '@/store'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

/* ─── colour palette ─── */
const CARD_COLORS = [
  { bg: 'linear-gradient(135deg,#6366f1,#818cf8)', icon: '#c7d2fe' },
  { bg: 'linear-gradient(135deg,#f59e0b,#fcd34d)', icon: '#fef3c7' },
  { bg: 'linear-gradient(135deg,#10b981,#34d399)', icon: '#d1fae5' },
  { bg: 'linear-gradient(135deg,#ef4444,#f87171)', icon: '#fee2e2' },
  { bg: 'linear-gradient(135deg,#8b5cf6,#a78bfa)', icon: '#ede9fe' },
  { bg: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', icon: '#e0f2fe' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const AdminDashboard = () => {
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const [stats, setStats] = useState({
    students: 0, teachers: 0, classes: 0, events: 0,
    announcements: 0, staff: 0,
    fees: { total: 0, collected: 0, pending: 0 },
    attendance: { rate: 0 },
    boys: 0, girls: 0,
  })
  const [recentEvents, setRecentEvents] = useState([])
  const [recentAnnouncements, setRecentAnnouncements] = useState([])
  const [attendanceWeek, setAttendanceWeek] = useState([])
  const [classCounts, setClassCounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboardData() }, [])

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
        apiClient.listStaff(),
      ])

      const extract = (r) => r.status === 'fulfilled' ? (r.value?.data || []) : []

      const students    = extract(results[0])
      const teachers    = extract(results[1])
      const classes     = extract(results[2])
      const events      = extract(results[3])
      const announcements = extract(results[4])
      const fees        = extract(results[5])
      const attendance  = extract(results[6])
      const staffList   = extract(results[7])

      // Fee stats
      const totalFees     = fees.reduce((s, f) => s + (f.amount || 0), 0)
      const collectedFees = fees.reduce((s, f) => s + (f.paidAmount || 0), 0)

      // Today's attendance rate
      const today = new Date().toISOString().split('T')[0]
      const todayAtt  = attendance.filter(a => a.date?.split('T')[0] === today)
      const presentToday = todayAtt.filter(a => a.status === 'present' || a.status === 'late').length
      const attendanceRate = todayAtt.length > 0 ? Math.round((presentToday / todayAtt.length) * 100) : 0

      // Boys / Girls split
      const boys  = students.filter(s => (s.gender || '').toLowerCase() === 'male').length
      const girls = students.filter(s => (s.gender || '').toLowerCase() === 'female').length

      setStats({
        students: students.length, teachers: teachers.length,
        classes: classes.length, events: events.length,
        announcements: announcements.length, staff: staffList.length,
        fees: { total: totalFees, collected: collectedFees, pending: totalFees - collectedFees },
        attendance: { rate: attendanceRate },
        boys, girls,
      })

      setRecentEvents(events.slice(-3).reverse())
      setRecentAnnouncements(announcements.slice(-3).reverse())

      // ── Attendance by weekday (last 30 days) ──
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
      const recentAtt = attendance.filter(a => new Date(a.date) >= cutoff)
      const weekMap = {}
      DAYS.forEach(d => { weekMap[d] = { day: d, present: 0, absent: 0, late: 0 } })
      recentAtt.forEach(a => {
        const d = new Date(a.date); const day = DAYS[d.getDay() === 0 ? 5 : d.getDay() - 1]
        if (!day) return
        if (a.status === 'present') weekMap[day].present++
        else if (a.status === 'absent') weekMap[day].absent++
        else if (a.status === 'late') weekMap[day].late++
      })
      setAttendanceWeek(Object.values(weekMap))

      // ── Students per class ──
      const cMap = {}
      students.forEach(s => {
        const name = s.className || s.class?.name || `Class ${s.classId}` || 'Unknown'
        cMap[name] = (cMap[name] || 0) + 1
      })
      setClassCounts(Object.entries(cMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8))

    } catch (err) {
      console.error('Dashboard load error:', err)
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

  // Derived chart data
  const genderData = [
    { name: 'Boys',  value: stats.boys  || 0 },
    { name: 'Girls', value: stats.girls || 0 },
    { name: 'Other', value: Math.max(0, stats.students - stats.boys - stats.girls) },
  ].filter(d => d.value > 0)

  const GENDER_COLORS = ['#6366f1', '#f472b6', '#a3e635']

  const attendancePie = [
    { name: 'Present', value: stats.attendance.rate },
    { name: 'Absent',  value: 100 - stats.attendance.rate },
  ]

  const statCards = [
    { ...CARD_COLORS[0], icon: '👨‍🎓', value: stats.students,      label: 'Total Students',  path: '/portal/students'      },
    { ...CARD_COLORS[1], icon: '👩‍🏫', value: stats.teachers,      label: 'Total Teachers',  path: '/portal/teachers'      },
    { ...CARD_COLORS[2], icon: '🏫',   value: stats.classes,       label: 'Total Classes',   path: '/portal/classes'       },
    { ...CARD_COLORS[3], icon: '👷',   value: stats.staff,         label: 'Total Staff',     path: '/portal/staff'         },
    { ...CARD_COLORS[4], icon: '🎉',   value: stats.events,        label: 'Events',          path: '/portal/events'        },
    { ...CARD_COLORS[5], icon: '📢',   value: stats.announcements, label: 'Announcements',   path: '/portal/announcements' },
  ]

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.email?.split('@')[0] || 'Admin'} 👋</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Here's an overview of your school portal</p>
        </div>
      </div>

      {/* ── Colored Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {statCards.map((card) => (
          <div
            key={card.label}
            onClick={() => navigate(card.path)}
            style={{
              background: card.bg,
              borderRadius: '16px',
              padding: '1.1rem 1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              transition: 'transform 0.18s, box-shadow 0.18s',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              overflow: 'hidden', minWidth: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
              {card.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{card.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.88)', marginTop: '2px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row 1: Boys/Girls + Today's Attendance ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>

        {/* Boys vs Girls Donut */}
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontWeight: 700 }}>👦👧 Students Gender Split</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={genderData.length ? genderData : [{ name: 'No data', value: 1 }]}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={78}
                  paddingAngle={3} dataKey="value">
                  {(genderData.length ? genderData : [{ name: 'No data', value: 1 }]).map((_, i) => (
                    <Cell key={i} fill={genderData.length ? GENDER_COLORS[i % GENDER_COLORS.length] : '#e5e7eb'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => v} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {[
                { label: 'Boys',  value: stats.boys,  color: '#6366f1' },
                { label: 'Girls', value: stats.girls, color: '#f472b6' },
                { label: 'Other', value: Math.max(0, stats.students - stats.boys - stats.girls), color: '#a3e635' },
              ].filter(d => d.value > 0).map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.65rem' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem', flex: 1 }}>{d.label}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{d.value}</span>
                </div>
              ))}
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                Total: <strong style={{ color: 'var(--text)' }}>{stats.students}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Attendance Donut */}
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontWeight: 700 }}>✅ Today's Attendance</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={attendancePie} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                    <Cell fill="#10b981" />
                    <Cell fill="#f3f4f6" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{stats.attendance.rate}%</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Present</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { label: 'Present', value: stats.attendance.rate, color: '#10b981' },
                { label: 'Absent',  value: 100 - stats.attendance.rate, color: '#ef4444' },
              ].map(d => (
                <div key={d.label} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{d.label}</span>
                    <span style={{ fontWeight: 700, color: d.color }}>{d.value}%</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: '#f3f4f6', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${d.value}%`, background: d.color, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Charts Row 2: Weekly Attendance Bar + Students per Class ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>

        {/* Weekly Attendance Bar Chart */}
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontWeight: 700 }}>📊 Weekly Attendance</h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attendanceWeek} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="present" name="Present" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="absent"  name="Absent"  fill="#fbbf24" radius={[6, 6, 0, 0]} />
              <Bar dataKey="late"    name="Late"    fill="#34d399" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Students Per Class Bar */}
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontWeight: 700 }}>🏫 Students per Class</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={classCounts.length ? classCounts : [{ name: 'No data', count: 0 }]} layout="vertical" barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={72} />
              <Tooltip />
              <Bar dataKey="count" name="Students" radius={[0, 6, 6, 0]}>
                {classCounts.map((_, i) => (
                  <Cell key={i} fill={['#6366f1','#f472b6','#10b981','#f59e0b','#0ea5e9','#8b5cf6','#ef4444','#a3e635'][i % 8]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Recent Events + Announcements ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        {/* Recent Events + Announcements */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <div className="form-card" style={{ padding: '1.25rem', flex: 1, overflow: 'hidden', minWidth: 0 }}>
            <h3 style={{ margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: '0.95rem' }}>
              🎉 Recent Events
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate('/portal/events')}>View All →</span>
            </h3>
            {recentEvents.length === 0
              ? <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>No events yet</p>
              : recentEvents.map((ev) => (
                <div key={ev.id} style={{ padding: '0.45rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>📅 {ev.date ? new Date(ev.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}</div>
                </div>
              ))}
          </div>
          <div className="form-card" style={{ padding: '1.25rem', flex: 1, overflow: 'hidden', minWidth: 0 }}>
            <h3 style={{ margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: '0.95rem' }}>
              📢 Announcements
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate('/portal/announcements')}>View All →</span>
            </h3>
            {recentAnnouncements.length === 0
              ? <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>No announcements yet</p>
              : recentAnnouncements.map((ann) => (
                <div key={ann.id} style={{ padding: '0.45rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ann.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ann.message}</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="form-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontWeight: 700 }}>⚡ Quick Actions</h3>
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

export default AdminDashboard

