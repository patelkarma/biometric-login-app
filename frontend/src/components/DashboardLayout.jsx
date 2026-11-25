import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Logo from './Logo'

const SECTIONS = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/devices', label: 'Devices' },
  { to: '/dashboard/biometrics', label: 'Biometrics' },
]

/**
 * Shell shared by the signed-in pages: green sidebar with navigation and Log out,
 * and the current page (<Outlet />) on the right. On phones the sidebar becomes a
 * top bar and the navigation becomes a row of tabs underneath it (see index.css).
 * Waits for the profile (`me`) so every page can assume it is loaded.
 */
export default function DashboardLayout() {
  const { me, logout } = useAuth()

  if (!me) {
    return (
      <div className="page-loading">
        <span className="spinner spinner--dark" />
      </div>
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__top">
          <Logo />
          <nav className="sidebar__nav" aria-label="Dashboard sections">
            {SECTIONS.map((s) => (
              <NavLink key={s.to} to={s.to} end={s.end} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                {s.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <button className="sidebar__logout" onClick={logout}>
          Log out
        </button>
      </aside>

      <main className="dash">
        <Outlet />
      </main>
    </div>
  )
}
