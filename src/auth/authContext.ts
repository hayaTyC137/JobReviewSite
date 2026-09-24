import { createContext, useContext } from 'react'
import type { RegisterPayload, User } from '../api/types'

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
  acceptToken: (token: string) => Promise<void>
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
