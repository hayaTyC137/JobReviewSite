import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Megaphone, ShieldCheck } from 'lucide-react'
import { isDemoMode, onDemoModeChange } from '../api/client'
import { useAnnouncement } from '../lib/usePublicSettings'
import { UserMenu } from './UserMenu'
import styles from './AppHeader.module.css'

/** Шапка внутренних страниц: каталог, профиль компании, кабинеты, контакты */
export function AppHeader() {
  const [demo, setDemo] = useState(isDemoMode())
  const announcement = useAnnouncement()

  useEffect(() => onDemoModeChange(setDemo), [])

  return (
    <header className={styles.header}>
      {announcement && (
        <p className={styles.announcement} role="status"><Megaphone size={14} aria-hidden="true" /> {announcement}</p>
      )}
      <div className={styles.inner}>
        <Link className={styles.brand} to="/" aria-label="Контур — на главную">
          <span className={styles.brandMark}><ShieldCheck size={17} strokeWidth={2.3} aria-hidden="true" /></span>
          <span>контур</span>
        </Link>

        <nav className={styles.nav} aria-label="Основная навигация">
          <NavLink to="/" end className={({ isActive }) => isActive ? styles.active : undefined}>Главная</NavLink>
          <NavLink to="/companies" className={({ isActive }) => isActive ? styles.active : undefined}>Компании</NavLink>
          <NavLink to="/contact" className={({ isActive }) => isActive ? styles.active : undefined}>Связаться</NavLink>
        </nav>

        <div className={styles.actions}>
          {demo && <span className={styles.demo} title="Бэкенд недоступен — показаны демонстрационные данные. Пароль демо-аккаунтов: demo12345">Демо-данные</span>}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
