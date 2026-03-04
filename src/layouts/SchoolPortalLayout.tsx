import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store'
import { logout } from '@/store/slices/authSlice'
import usePreventBackNavigation from '@/hooks/usePreventBackNavigation'
import apiClient from '@/services/api'

const menuItems = [
  { path: '/portal/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/portal/students', icon: '👥', label: 'Students' },
  { path: '/portal/admissions', icon: '📋', label: 'Admissions' },
  { path: '/portal/teachers', icon: '👨‍🏫', label: 'Teachers' },
  { path: '/portal/staff', icon: '🧹', label: 'Staff' },
  { path: '/portal/hostel', icon: '🏠', label: 'Hostel' },
  { path: '/portal/classes', icon: '🏫', label: 'Classes' },
  { path: '/portal/exam-management', icon: '📋', label: 'Exams' },
  { path: '/portal/exams', icon: '📝', label: 'Marks' },
  { path: '/portal/attendance', icon: '✓', label: 'Attendance' },
  { path: '/portal/fees', icon: '💰', label: 'Fees' },
  { path: '/portal/events', icon: '🎉', label: 'Events' },
  { path: '/portal/announcements', icon: '📣', label: 'Announcements' },
  { path: '/portal/achievements', icon: '🏆', label: 'Awards' },
  { path: '/portal/sports', icon: '⚽', label: 'Sports' },
  { path: '/portal/library', icon: '📚', label: 'Library' },
  { path: '/portal/transport', icon: '🚌', label: 'Transport' },
  { path: '/portal/expenses', icon: '💸', label: 'Expenses' },
  { path: '/portal/holidays', icon: '🏖️', label: 'Holidays' },
  { path: '/portal/leaves', icon: '📋', label: 'Leaves' },
  { path: '/portal/about', icon: 'ℹ️', label: 'About' },
  { path: '/portal/settings', icon: '⚙️', label: 'Settings' },
   { path: '/portal/support', icon: '🛟', label: 'Support' },
] as const

const SchoolPortalLayout = () => {
  const user = useAppSelector((state) => state.auth.user)
  const role = useAppSelector((state) => state.auth.role)
  const dispatch = useAppDispatch()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [schoolName, setSchoolName] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  // Prevent back navigation when logged in
  usePreventBackNavigation()

  useEffect(() => {
    const loadSchoolName = async () => {
      try {
        const response = await apiClient.listSchools()
        const schools = Array.isArray(response) ? response : (response as any)?.data
        const school = Array.isArray(schools) ? schools[0] : schools?.[0]
        if (school?.name) setSchoolName(school.name)
      } catch {
        // fallback stays empty
      }
    }
    loadSchoolName()
  }, [])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="portal-wrapper">
      {/* Desktop Sidebar */}
      <aside className={`portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <h2>🎓 Vidya Hub</h2>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="link-icon">{item.icon}</span>
              <span className="link-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.email?.[0]?.toUpperCase()}</div>
            <div className="user-details">
              <p className="user-email">{user?.email}</p>
              <p className="user-role">{role}</p>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} type="button">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="portal-main">
        <header className="portal-header">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            type="button"
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <h1 className="portal-title">{schoolName ? `${schoolName} Portal` : 'School Portal'}</h1>
          <div className="header-user">
            <span className="header-email">{user?.email}</span>
            <div className="header-avatar">
              {user?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="portal-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default SchoolPortalLayout
