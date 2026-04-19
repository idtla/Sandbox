import { NavLink } from 'react-router-dom'

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Principal">
      <NavLink
        to="/"
        className={({ isActive }) => (isActive ? 'bottom-nav__link is-active' : 'bottom-nav__link')}
        end
      >
        Medir
      </NavLink>
      <NavLink
        to="/analiticas"
        className={({ isActive }) => (isActive ? 'bottom-nav__link is-active' : 'bottom-nav__link')}
      >
        Analíticas
      </NavLink>
      <NavLink
        to="/ajustes"
        className={({ isActive }) => (isActive ? 'bottom-nav__link is-active' : 'bottom-nav__link')}
      >
        Ajustes
      </NavLink>
    </nav>
  )
}
