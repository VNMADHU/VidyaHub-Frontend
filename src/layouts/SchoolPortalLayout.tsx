import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, UserPlus, School, Users, GraduationCap,
  CalendarCheck, CalendarDays, BookOpen, ClipboardCheck, ListOrdered,
  FileText, BarChart2, CircleDollarSign, TrendingUp, TrendingDown,
  Banknote, Calculator, UserCog, CalendarOff, UserCheck,
  Library, Bus, Hotel, Boxes,
  CalendarHeart, Trophy, Award, Palmtree,
  Bell, Megaphone, ScrollText,
  UserCircle, Settings, HelpCircle, Menu, LogOut, GraduationCap as BrandLogo,
  Info, ShieldCheck,
} from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store'
import { logout } from '@/store/slices/authSlice'
import usePreventBackNavigation from '@/hooks/usePreventBackNavigation'
import apiClient, { authApi } from '@/services/api'
import ChatBot from '@/components/ChatBot'

const menuItems = [
  { path: '/portal/dashboard',         Icon: LayoutDashboard,  label: 'Dashboard',        moduleKey: null },
  { path: '/portal/admissions',        Icon: UserPlus,         label: 'Admissions',       moduleKey: 'admissions' },
  { path: '/portal/classes',           Icon: School,           label: 'Classes',          moduleKey: 'classes' },
  { path: '/portal/students',          Icon: Users,            label: 'Students',         moduleKey: 'students' },
  { path: '/portal/teachers',          Icon: GraduationCap,    label: 'Teachers',         moduleKey: 'teachers' },
  { path: '/portal/attendance',        Icon: CalendarCheck,    label: 'Attendance',       moduleKey: 'attendance' },
  { path: '/portal/timetable',         Icon: CalendarDays,     label: 'Timetable',        moduleKey: 'classes' },
  { path: '/portal/homework',          Icon: BookOpen,         label: 'Homework',         moduleKey: 'students' },
  { path: '/portal/exam-management',   Icon: ClipboardCheck,   label: 'Exams',            moduleKey: 'exams' },
  { path: '/portal/exams',             Icon: ListOrdered,      label: 'Marks',            moduleKey: 'exams' },
  { path: '/portal/report-card',       Icon: FileText,         label: 'Report Card',      moduleKey: 'exams' },
  { path: '/portal/attendance-report', Icon: BarChart2,        label: 'Att. Report',      moduleKey: 'attendance' },
  { path: '/portal/fees',              Icon: CircleDollarSign, label: 'Fees',             moduleKey: 'fees' },
  { path: '/portal/income',            Icon: TrendingUp,       label: 'Income',           moduleKey: 'income' },
  { path: '/portal/expenses',          Icon: TrendingDown,     label: 'Expenses',         moduleKey: 'expenses' },
  { path: '/portal/payroll',           Icon: Banknote,         label: 'Payroll',          moduleKey: 'payroll' },
  { path: '/portal/accounting',        Icon: Calculator,       label: 'Accounting',       moduleKey: 'accounting' },
  { path: '/portal/staff',             Icon: UserCog,          label: 'Staff',            moduleKey: 'staff' },
  { path: '/portal/staff-attendance',  Icon: UserCheck,        label: 'Staff Attendance', moduleKey: 'staff-attendance' },
  { path: '/portal/leaves',            Icon: CalendarOff,      label: 'Leaves',           moduleKey: 'leaves' },
  { path: '/portal/library',           Icon: Library,          label: 'Library',          moduleKey: 'library' },
  { path: '/portal/transport',         Icon: Bus,              label: 'Transport',        moduleKey: 'transport' },
  { path: '/portal/hostel',            Icon: Hotel,            label: 'Hostel',           moduleKey: 'hostel' },
  { path: '/portal/inventory',         Icon: Boxes,            label: 'Inventory',        moduleKey: 'inventory' },
  { path: '/portal/events',            Icon: CalendarHeart,    label: 'Events',           moduleKey: 'events' },
  { path: '/portal/sports',            Icon: Trophy,           label: 'Sports',           moduleKey: 'sports' },
  { path: '/portal/achievements',      Icon: Award,            label: 'Awards',           moduleKey: 'achievements' },
  { path: '/portal/holidays',          Icon: Palmtree,         label: 'Holidays',         moduleKey: 'holidays' },
  { path: '/portal/notifications',     Icon: Bell,             label: 'Notifications',    moduleKey: 'announcements' },
  { path: '/portal/announcements',     Icon: Megaphone,        label: 'Announcements',    moduleKey: 'announcements' },
  { path: '/portal/transfer-certificate', Icon: ScrollText,    label: 'Certificates',     moduleKey: 'students' },
  { path: '/portal/about',             Icon: Info,             label: 'About',            moduleKey: null },
  { path: '/portal/settings',          Icon: Settings,         label: 'Settings',         moduleKey: null },
  { path: '/portal/support',           Icon: HelpCircle,       label: 'Support',          moduleKey: null },
]

const SchoolPortalLayout = () => {
  const user = useAppSelector((state) => state.auth.user)
  const role = useAppSelector((state) => state.auth.role)
  const dispatch = useAppDispatch()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [schoolName, setSchoolName] = useState('')
  const [kickedOut, setKickedOut] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Prevent back navigation when logged in
  usePreventBackNavigation()

  // Session polling — every 30s check if this session is still valid
  useEffect(() => {
    const check = async () => {
      try {
        await authApi.sessionCheck()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('session') || msg.includes('terminated') || msg.includes('another device') || msg.includes('Session expired')) {
          setKickedOut(true)
          setTimeout(() => {
            dispatch(logout())
            navigate('/', { replace: true })
          }, 3000)
        }
      }
    }
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [dispatch, navigate])

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

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    dispatch(logout())
    navigate('/')
  }

  const isActive = (path: string) => location.pathname === path

  // Derive allowed modules from user.modulePermissions (null = all)
  const allowedModules: string[] | null = (() => {
    if (!user?.modulePermissions) return null
    try { return JSON.parse(user.modulePermissions) as string[] } catch { return null }
  })()

  const visibleMenuItems = menuItems.filter((item) => {
    // Dashboard/Settings/About/Support are always visible
    if (item.moduleKey === null) return true
    // super-admin sees everything
    if (role === 'super-admin') return true
    // null allowedModules = full access
    if (allowedModules === null) return true
    return allowedModules.includes(item.moduleKey)
  })

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : user?.email

  return (
    <div className="portal-wrapper">
      {/* Kicked-out notification banner */}
      {kickedOut && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#dc2626', color: '#fff', padding: '0.75rem 1.5rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
          ⚠️ You were logged in from another device. Redirecting to login...
        </div>
      )}
      {/* Desktop Sidebar */}
      <aside className={`portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <h2>🎓 Vidya Hub</h2>
        </div>

        <nav className="sidebar-nav">
          {visibleMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="link-icon"><item.Icon size={18} strokeWidth={1.75} /></span>
              <span className="link-label">{item.label}</span>
            </Link>
          ))}
          {/* Super-admin only: Manage Admins */}
          {role === 'super-admin' && (
            <Link
              to="/portal/admin-management"
              className={`sidebar-link ${isActive('/portal/admin-management') ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="link-icon"><ShieldCheck size={18} strokeWidth={1.75} /></span>
              <span className="link-label">Manage Admins</span>
            </Link>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.email?.[0]?.toUpperCase()}</div>
            <div className="user-details">
              <p className="user-email">{displayName}</p>
              <p className="user-role">{role}</p>
            </div>
          </div>
          <Link
            to="/portal/profile"
            className="btn-logout"
            style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.5rem', textDecoration: 'none' }}
            onClick={() => setSidebarOpen(false)}
          >
            <UserCircle size={15} strokeWidth={2} />My Profile
          </Link>
          <button className="btn-logout" onClick={handleLogout} type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <LogOut size={15} strokeWidth={2} />Logout
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
            <Menu size={22} strokeWidth={2} />
          </button>
          <h1 className="portal-title">{schoolName ? `${schoolName} Portal` : 'Portal'}</h1>
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

      {/* VidyaBot — floating AI chat assistant */}
      <ChatBot />
    </div>
  )
}

export default SchoolPortalLayout
