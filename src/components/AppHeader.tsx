import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LogIn, LogOut, ShieldCheck } from 'lucide-react'
import { isDemoMode, onDemoModeChange } from '../api/client'
import { useAuth } from '../auth/authContext'
import { initials } from '../lib/format'
import { VerifiedBadge } from './VerifiedBadge'
import styles from './AppHeader.module.css'

/** Шапка внутренних страниц: каталог и профиль компании */
export function AppHeader() {
  const { user, openLogin, logout } = useAuth()
  const [demo, setDemo] = useState(isDemoMode())

  useEffect(() => onDemoModeChange(setDemo), [])

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} to="/" aria-label="Контур — на главную">
          <span className={styles.brandMark}><ShieldCheck size={17} strokeWidth={2.3} aria-hidden="true" /></span>
          <span>контур</span>
        </Link>

        <nav className={styles.nav} aria-label="Основная навигация">
          <NavLink to="/" end className={({ isActive }) => isActive ? styles.active : undefined}>Главная</NavLink>
          <NavLink to="/companies" className={({ isActive }) => isActive ? styles.active : undefined}>Компании</NavLink>
        </nav>

        <div className={styles.actions}>
          {demo && <span className={styles.demo} title="Бэкенд недоступен — показаны демонстрационные данные. Пароль демо-аккаунтов: demo12345">Демо-данные</span>}
          {user ? (
            <div className={styles.user}>
              <span className={styles.avatar} aria-hidden="true">{initials(user.displayName)}</span>
              <span className={styles.userText}>
                <strong>{user.displayName}</strong>
                {user.role === 'REPRESENTATIVE' && user.representativeVerified
                  ? <small>{user.companyName}</small>
                  : <small>{user.role === 'MODERATOR' ? 'Модератор' : 'Автор отзывов'}</small>}
              </span>
              {user.role === 'REPRESENTATIVE' && user.representativeVerified && <VerifiedBadge jobTitle={user.jobTitle} iconOnly />}
              <button className={styles.iconButton} type="button" onClick={logout} aria-label="Выйти" title="Выйти">
                <LogOut size={17} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button className={styles.login} type="button" onClick={() => openLogin()}>
              <LogIn size={16} aria-hidden="true" /> Войти
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
