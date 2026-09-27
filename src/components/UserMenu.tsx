import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Building2, ChevronDown, Gauge, LifeBuoy, LogIn, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { isAdmin, isStaff, ROLE_LABELS, useAuth } from '../auth/authContext'
import { Avatar } from './cabinet/ui'
import { VerifiedBadge } from './VerifiedBadge'
import styles from './UserMenu.module.css'

/** Меню пользователя в шапке: набор пунктов зависит от роли */
export function UserMenu({ onLogout }: { onLogout?: () => void }) {
  const { user, openLogin, logout } = useAuth()
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!user) {
    return (
      <button className={styles.login} type="button" onClick={() => openLogin()}>
        <LogIn size={16} aria-hidden="true" /> Войти
      </button>
    )
  }

  const verifiedRep = user.role === 'REPRESENTATIVE' && user.representativeVerified
  const subtitle = user.role === 'REPRESENTATIVE' ? user.companyName ?? ROLE_LABELS.REPRESENTATIVE : ROLE_LABELS[user.role]
  const close = () => setOpen(false)

  return (
    <div className={styles.root} ref={rootRef}>
      <button className={styles.trigger} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Avatar name={user.displayName} url={user.avatarUrl} size={32} />
        <span className={styles.text}>
          <strong>{user.displayName}</strong>
          <small>{subtitle}</small>
        </span>
        {verifiedRep && <VerifiedBadge jobTitle={user.jobTitle} iconOnly />}
        <ChevronDown size={15} aria-hidden="true" className={open ? styles.flipped : undefined} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.menu}
            role="menu"
            initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className={styles.role}>{ROLE_LABELS[user.role]}</p>
            <Link role="menuitem" to="/me" onClick={close}><UserRound size={16} aria-hidden="true" /> Личный кабинет</Link>
            {!isStaff(user) && (
              <Link role="menuitem" to="/company-panel" onClick={close}>
                <Building2 size={16} aria-hidden="true" /> {user.role === 'REPRESENTATIVE' ? 'Панель компании' : 'Зарегистрировать компанию'}
              </Link>
            )}
            {isStaff(user) && <Link role="menuitem" to="/moderation" onClick={close}><ShieldCheck size={16} aria-hidden="true" /> Модерация</Link>}
            {isAdmin(user) && <Link role="menuitem" to="/admin" onClick={close}><Gauge size={16} aria-hidden="true" /> Администрирование</Link>}
            <Link role="menuitem" to="/contact" onClick={close}><LifeBuoy size={16} aria-hidden="true" /> Связаться с нами</Link>
            <button role="menuitem" type="button" onClick={() => { close(); logout(); onLogout?.() }}>
              <LogOut size={16} aria-hidden="true" /> Выйти
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
