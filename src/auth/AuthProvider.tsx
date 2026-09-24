import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import type { User } from '../api/types'
import { AuthContext } from './authContext'
import type { AuthContextValue } from './authContext'

const TOKEN_KEY = 'kontur.token'

function readToken(): string | null {
  try { return window.localStorage.getItem(TOKEN_KEY) } catch { return null }
}

function writeToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch { /* приватный режим браузера — просто не запоминаем вход */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readToken())
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(() => readToken() === null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginReason, setLoginReason] = useState<string | null>(null)

  // При загрузке страницы проверяем сохранённый токен и получаем актуальную роль
  useEffect(() => {
    if (!token || user) return
    let cancelled = false
    api.me(token)
      .then((me) => { if (!cancelled) setUser(me) })
      .catch((error) => {
        // Забываем токен, только если сервер его отверг. При сбое сети токен остаётся —
        // после перезагрузки страницы вход восстановится сам
        if (!cancelled && error instanceof ApiError && error.status < 500) { writeToken(null); setToken(null) }
      })
      .finally(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [token, user])

  const applySession = useCallback((nextToken: string, nextUser: User) => {
    writeToken(nextToken)
    setToken(nextToken)
    setUser(nextUser)
    setReady(true)
    setLoginOpen(false)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    ready,
    loginOpen,
    loginReason,
    openLogin: (reason) => { setLoginReason(reason ?? null); setLoginOpen(true) },
    closeLogin: () => setLoginOpen(false),
    login: async (email, password) => {
      const response = await api.login(email, password)
      applySession(response.token, response.user)
    },
    register: async (payload) => {
      const response = await api.register(payload)
      applySession(response.token, response.user)
    },
    acceptToken: async (nextToken) => {
      const me = await api.me(nextToken)
      applySession(nextToken, me)
    },
    logout: () => {
      writeToken(null)
      setToken(null)
      setUser(null)
    },
  }), [user, token, ready, loginOpen, loginReason, applySession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
