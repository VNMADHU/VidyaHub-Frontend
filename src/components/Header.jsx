import { Link } from 'react-router-dom'
import { navLinks } from '../data/content'
import useUiStore from '../store/useUiStore'

const Header = () => {
  const navOpen = useUiStore((state) => state.navOpen)
  const toggleNav = useUiStore((state) => state.toggleNav)
  const closeNav = useUiStore((state) => state.closeNav)

  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="brand">
          <span className="brand-mark">VH</span>
          <span className="brand-title">Vidya Hub</span>
        </div>
        <nav className={`nav ${navOpen ? 'open' : ''}`}>
          {navLinks.map((link) =>
            link.href === '/' ? (
              <Link key={link.href} to={link.href} onClick={closeNav}>
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} onClick={closeNav}>
                {link.label}
              </a>
            ),
          )}
        </nav>
        <button
          className="nav-toggle"
          type="button"
          aria-label="Toggle navigation"
          onClick={toggleNav}
        >
          ☰
        </button>
      </div>
    </header>
  )
}

export default Header
