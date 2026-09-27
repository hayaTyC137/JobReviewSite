import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock, ShieldX } from 'lucide-react'
import type { Role } from '../api/types'
import { hasRole, useAuth } from '../auth/authContext'
import { AppHeader } from './AppHeader'
import { EmptyState, LoadingBlock } from './cabinet/ui'

/**
 * Защита маршрута на клиенте. Это только удобство интерфейса: настоящая проверка прав —
 * на бэкенде (SecurityConfig + @PreAuthorize), без неё данные всё равно не отдаются.
 */
export function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, ready, openLogin } = useAuth()

  useEffect(() => {
    if (ready && !user) openLogin('Войдите, чтобы открыть этот раздел.')
  }, [ready, user, openLogin])

  if (!ready) return <Shell><LoadingBlock /></Shell>
  if (!user) {
    return (
      <Shell>
        <EmptyState icon={<Lock size={24} />} title="Нужен вход">
          Раздел доступен после входа. <button type="button" className="linkButton" onClick={() => openLogin()}>Войти</button>
        </EmptyState>
      </Shell>
    )
  }
  if (roles && !hasRole(user, roles)) {
    return (
      <Shell>
        <EmptyState icon={<ShieldX size={24} />} title="Недостаточно прав">
          У вашей роли нет доступа к этому разделу. <Link to="/me">Перейти в личный кабинет</Link>
        </EmptyState>
      </Shell>
    )
  }
  return <>{children}</>
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--c-canvas)', minHeight: '100vh' }}>
      <AppHeader />
      <div style={{ padding: '48px var(--gutter)' }}>{children}</div>
    </div>
  )
}
