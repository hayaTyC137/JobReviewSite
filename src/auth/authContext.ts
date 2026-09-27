import { createContext, useContext } from 'react'
import type { RegisterPayload, Role, User } from '../api/types'

export type AuthContextValue = {
  user: User | null
  token: string | null
  ready: boolean
  loginOpen: boolean
  loginReason: string | null
  openLogin: (reason?: string) => void
  closeLogin: () => void
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  /** Принять JWT после входа через соцсеть; возвращает пользователя, чтобы решить, нужен ли онбординг */
  acceptToken: (token: string) => Promise<User>
  /** Подменить данные пользователя после правки профиля, онбординга или регистрации компании */
  updateUser: (user: User) => void
  /** Перечитать пользователя с сервера (например, после смены роли модератором) */
  refreshUser: () => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth должен вызываться внутри AuthProvider')
  return context
}

/** Может ли пользователь обжаловать отзывы о компании */
export function isRepresentativeOf(user: User | null, companyId: number): boolean {
  return Boolean(user && user.role === 'REPRESENTATIVE' && user.representativeVerified && user.companyId === companyId)
}

export const isStaff = (user: User | null) => Boolean(user && (user.role === 'MODERATOR' || user.role === 'ADMIN'))
export const isAdmin = (user: User | null) => user?.role === 'ADMIN'
export const hasRole = (user: User | null, roles: Role[]) => Boolean(user && roles.includes(user.role))

export const ROLE_LABELS: Record<Role, string> = {
  USER: 'Сотрудник',
  REPRESENTATIVE: 'Представитель компании',
  MODERATOR: 'Модератор',
  ADMIN: 'Администратор',
}
