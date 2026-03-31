import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Building2, LogOut, Menu, X, Crown } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store'
import { logout } from '@/store/slices/authSlice'
import { authApi } from '@/services/api'

const OwnerLayout = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const user = useAppSelector((s) => s.auth.user)

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <div style={styles.shell}>
      {/* ── Sidebar ── */}
      <aside style={{ ...styles.sidebar, transform: sidebarOpen ? 'translateX(0)' : undefined }}>
        <div style={styles.sidebarHeader}>
          <Crown size={22} color="#f59e0b" strokeWidth={2} />
          <span style={styles.brandName}>Vidya Hub</span>
          <button style={styles.closeMobile} onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <p style={styles.ownerLabel}>Owner Console</p>

        <nav style={styles.nav}>
          <NavLink
            to="/owner/schools"
            style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}
            onClick={() => setSidebarOpen(false)}
          >
            <Building2 size={18} strokeWidth={1.75} />
            <span>Schools</span>
          </NavLink>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>{user?.email?.[0]?.toUpperCase()}</div>
            <div>
              <p style={styles.userEmail}>{user?.email}</p>
              <p style={styles.userRole}>owner</p>
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout} type="button">
            <LogOut size={15} strokeWidth={2} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* ── Main ── */}
      <div style={styles.main}>
        <header style={styles.header}>
          <button style={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)} type="button">
            <Menu size={22} strokeWidth={2} />
          </button>
          <h1 style={styles.headerTitle}>
            <Crown size={18} color="#f59e0b" strokeWidth={2} style={{ marginRight: 8 }} />
            Owner Console
          </h1>
          <span style={styles.headerEmail}>{user?.email}</span>
        </header>

        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: '#0f172a',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  sidebar: {
    width: 240,
    minWidth: 240,
    background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 200,
    transition: 'transform 0.25s ease',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '1.2rem 1rem 0.8rem',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  brandName: {
    color: '#f1f5f9',
    fontWeight: 700,
    fontSize: '1rem',
    flex: 1,
  },
  closeMobile: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    padding: 2,
    display: 'none',
  },
  ownerLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#f59e0b',
    padding: '0.75rem 1rem 0.25rem',
  },
  nav: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0.6rem 0.75rem',
    borderRadius: 8,
    color: 'rgba(241,245,249,0.7)',
    textDecoration: 'none',
    fontSize: '0.875rem',
    transition: 'background 0.15s',
  },
  navLinkActive: {
    background: 'rgba(245,158,11,0.15)',
    color: '#f59e0b',
  },
  sidebarFooter: {
    padding: '0.75rem 1rem 1rem',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#0f172a',
    fontWeight: 700,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userEmail: {
    color: '#f1f5f9',
    fontSize: '0.78rem',
    margin: 0,
    maxWidth: 150,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    color: '#f59e0b',
    fontSize: '0.68rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '0.5rem',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: 'rgba(241,245,249,0.6)',
    fontSize: '0.82rem',
    cursor: 'pointer',
    transition: 'background 0.15s',
    width: '100%',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 150,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    height: 56,
    background: '#1e293b',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 1.25rem',
    flexShrink: 0,
  },
  menuBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(241,245,249,0.7)',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 6,
    display: 'none',
  },
  headerTitle: {
    color: '#f1f5f9',
    fontSize: '1rem',
    fontWeight: 700,
    flex: 1,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  headerEmail: {
    color: 'rgba(241,245,249,0.45)',
    fontSize: '0.78rem',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    background: '#0f172a',
  },
}

export default OwnerLayout
