import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, UserPlus, School, Users, GraduationCap,
  CalendarCheck, CalendarDays, BookOpen, FileQuestion, ListOrdered,
  FileText, BarChart2, CircleDollarSign, TrendingUp, TrendingDown,
  Banknote, Calculator, UserCog, CalendarOff, UserCheck,
  Library, Bus, Hotel, Boxes,
  CalendarHeart, Trophy, Award, Palmtree,
  Bell, Megaphone, ScrollText,
  UserCircle, Settings, HelpCircle, Menu, LogOut,
} from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store'
import { logout } from '@/store/slices/authSlice'
import usePreventBackNavigation from '../hooks/usePreventBackNavigation'
import apiClient from '@/services/api'
import ChatBot from '@/components/ChatBot'

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

  // Owner should never land in the school portal — redirect to owner console
  useEffect(() => {
    if (role === 'owner') {
      navigate('/owner/schools', { replace: true })
    }
  }, [role, navigate])

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
  { path: '/portal/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },

  // ACADEMICS
  { path: '/portal/admissions',   Icon: UserPlus,           label: 'Admissions',   module: 'admissions' },
  { path: '/portal/classes',      Icon: School,             label: 'Classes',      module: 'classes' },
  { path: '/portal/students',     Icon: Users,              label: 'Students',     module: 'students' },
  { path: '/portal/teachers',     Icon: GraduationCap,      label: 'Teachers',     module: 'teachers' },
  { path: '/portal/attendance',   Icon: CalendarCheck,      label: 'Attendance',   module: 'attendance' },
  { path: '/portal/timetable',    Icon: CalendarDays,       label: 'Timetable',    module: 'classes' },
  { path: '/portal/homework',     Icon: BookOpen,           label: 'Homework',     module: 'students' },

  // EXAMINATION
  { path: '/portal/exam-management', Icon: FileQuestion, label: 'Exams',       module: 'exams' },
  { path: '/portal/exams',           Icon: ListOrdered,  label: 'Marks',       module: 'exams' },
  { path: '/portal/report-card',     Icon: FileText,     label: 'Report Card', module: 'exams' },
  { path: '/portal/attendance-report', Icon: BarChart2,  label: 'Att. Report', module: 'attendance' },

  // FINANCE
  { path: '/portal/fees',       Icon: CircleDollarSign, label: 'Fees',       module: 'fees' },
  { path: '/portal/income',     Icon: TrendingUp,       label: 'Income',     moduleKey: 'income' },
  { path: '/portal/expenses',   Icon: TrendingDown,     label: 'Expenses',   module: 'expenses' },
  { path: '/portal/payroll',    Icon: Banknote,         label: 'Payroll',    moduleKey: 'payroll' },
  { path: '/portal/accounting', Icon: Calculator,       label: 'Accounting', moduleKey: 'accounting' },

  // STAFF / HR
  { path: '/portal/staff',            Icon: UserCog,   label: 'Staff',            module: 'staff' },
  { path: '/portal/staff-attendance', Icon: UserCheck, label: 'Staff Attendance', module: 'staff' },
  { path: '/portal/leaves',           Icon: CalendarOff, label: 'Leaves',         module: 'leaves' },

  // FACILITIES
  { path: '/portal/library',   Icon: Library,  label: 'Library',   module: 'library' },
  { path: '/portal/transport', Icon: Bus,      label: 'Transport', module: 'transport' },
  { path: '/portal/hostel',    Icon: Hotel,    label: 'Hostel',    module: 'hostel' },
  { path: '/portal/inventory', Icon: Boxes,    label: 'Inventory', module: 'inventory' },

  // ACTIVITIES
  { path: '/portal/events',       Icon: CalendarHeart, label: 'Events',   module: 'events' },
  { path: '/portal/sports',       Icon: Trophy,        label: 'Sports',   module: 'sports' },
  { path: '/portal/achievements', Icon: Award,         label: 'Awards',   module: 'achievements' },
  { path: '/portal/holidays',     Icon: Palmtree,      label: 'Holidays', module: 'holidays' },

  // COMMUNICATION
  { path: '/portal/notifications',       Icon: Bell,       label: 'Notifications', module: 'announcements' },
  { path: '/portal/announcements',       Icon: Megaphone,  label: 'Announcements', module: 'announcements' },
  { path: '/portal/transfer-certificate', Icon: ScrollText, label: 'Certificates', module: 'students' },

  // ADMIN
  ...(role === 'super-admin'
    ? [{ path: '/portal/admin-profiles', Icon: UserCircle, label: 'Admin Profiles' }]
    : []),

  // SYSTEM
  { path: '/portal/settings', Icon: Settings,   label: 'Settings' },
  { path: '/portal/support',  Icon: HelpCircle, label: 'Support' },
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
              <span className="link-icon"><item.Icon size={18} strokeWidth={1.75} /></span>
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
        {/* VidyaBot — floating AI chat assistant */}
      <ChatBot />
    </div>
  )
}

export default SchoolPortalLayout
