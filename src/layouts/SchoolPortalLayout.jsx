import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store'
import { logout } from '@/store/slices/authSlice'
import usePreventBackNavigation from '../hooks/usePreventBackNavigation'
import apiClient from '@/services/api'

const SchoolPortalLayout = () => {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const role = useAppSelector((state) => state.auth.role)
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
        const school = response?.data?.[0]
        if (school?.name) setSchoolName(school.name)
      } catch {
        // fallback stays empty
      }
    }
    loadSchoolName()
  }, [])

  // Parse module permissions for school-admin filtering
  const allowedModules = Array.isArray(user?.modulePermissions)
    ? user.modulePermissions
    : (typeof user?.modulePermissions === 'string' && user.modulePermissions)
      ? JSON.parse(user.modulePermissions)
      : null // null = full access
const menuItems = [
  // Dashboard
  { path: '/portal/dashboard', icon: '📊', label: 'Dashboard' },

  // ACADEMICS
  { path: '/portal/admissions', icon: '📋', label: 'Admissions', module: 'admissions' },
  { path: '/portal/classes', icon: '🏫', label: 'Classes', module: 'classes' },
  { path: '/portal/students', icon: '👥', label: 'Students', module: 'students' },
  { path: '/portal/teachers', icon: '👨‍🏫', label: 'Teachers', module: 'teachers' },
  { path: '/portal/attendance', icon: '✅', label: 'Attendance', module: 'attendance' },
  { path: '/portal/timetable', icon: '📅', label: 'Timetable', module: 'classes' },
  { path: '/portal/homework', icon: '📝', label: 'Homework', module: 'students' },

  // ATTENDANCE

  // EXAMINATION
  { path: '/portal/exam-management', icon: '📋', label: 'Exams', module: 'exams' },
  { path: '/portal/exams', icon: '📝', label: 'Marks', module: 'exams' },
  { path: '/portal/report-card', icon: '📄', label: 'Report Card', module: 'exams' },
  { path: '/portal/attendance-report', icon: '📊', label: 'Att. Report', module: 'attendance' },

  // FINANCE
  { path: '/portal/fees', icon: '💰', label: 'Fees', module: 'fees' },
  { path: '/portal/expenses', icon: '💸', label: 'Expenses', module: 'expenses' },

  // STAFF / HR
  { path: '/portal/staff', icon: '🧑‍💼', label: 'Staff', module: 'staff' },
  { path: '/portal/leaves', icon: '📋', label: 'Leaves', module: 'leaves' },

  // FACILITIES
  { path: '/portal/library', icon: '📚', label: 'Library', module: 'library' },
  { path: '/portal/transport', icon: '🚌', label: 'Transport', module: 'transport' },
  { path: '/portal/hostel', icon: '🏠', label: 'Hostel', module: 'hostel' },

  // ACTIVITIES
  { path: '/portal/events', icon: '🎉', label: 'Events', module: 'events' },
  { path: '/portal/sports', icon: '⚽', label: 'Sports', module: 'sports' },
  { path: '/portal/achievements', icon: '🏆', label: 'Awards', module: 'achievements' },
  { path: '/portal/holidays', icon: '🏖️', label: 'Holidays', module: 'holidays' },

  // COMMUNICATION
  { path: '/portal/notifications', icon: '📨', label: 'Notifications', module: 'announcements' },
  { path: '/portal/announcements', icon: '📣', label: 'Announcements', module: 'announcements' },
  { path: '/portal/transfer-certificate', icon: '📜', label: 'Certificates', module: 'students' },
  // ADMIN
  ...(role === 'super-admin'
    ? [{ path: '/portal/admin-profiles', icon: '👤', label: 'Admin Profiles' }]
    : []),

  // SYSTEM
  { path: '/portal/settings', icon: '⚙️', label: 'Settings' },
  { path: '/portal/support', icon: 'ℹ️', label: 'Support' }
  ].filter((item) => {
    // super-admin always sees everything
    if (role === 'super-admin') return true
    // items with no module key are always visible (dashboard, timetable, etc.)
    if (!item.module) return true
    // null allowedModules = full access (no restriction set)
    if (allowedModules === null) return true
    return allowedModules.includes(item.module)
  })

  const handleLogout = async () => {
    try {
      await apiClient.logout()
    } catch {
      // session may already be gone — still clear locally
    } finally {
      dispatch(logout())
      navigate('/login')
    }
  }

  const isActive = (path) => location.pathname === path

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
          <h1 className="portal-title">{schoolName ? (/school/i.test(schoolName) ? `${schoolName} Portal` : `${schoolName} Portal`) : 'Portal'}</h1>
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
