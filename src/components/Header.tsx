import { Link } from 'react-router-dom'
import { navLinks } from '@/data/content'
import { useAppSelector, useAppDispatch } from '@/store'
import { toggleNav, closeNav } from '@/store/slices/uiSlice'

const Header = () => {
  const navOpen = useAppSelector((state) => state.ui.navOpen)
  const dispatch = useAppDispatch()

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
              <Link key={link.href} to={link.href} onClick={() => dispatch(closeNav())}>
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} onClick={() => dispatch(closeNav())}>
                {link.label}
              </a>
            ),
          )}
        </nav>
        <button
          className="nav-toggle"
          type="button"
          aria-label="Toggle navigation"
          onClick={() => dispatch(toggleNav())}
        >
          ☰
        </button>
      </div>
    </header>
  )
}

export default Header
