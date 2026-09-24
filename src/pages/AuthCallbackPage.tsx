import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'

/**
 * Сюда бэкенд возвращает браузер после входа через Google: /auth/callback#token=...
 * Токен берём из фрагмента URL, проверяем через /api/auth/me и сразу убираем из адресной строки.
 */
export function AuthCallbackPage() {
  const { acceptToken } = useAuth()
  const navigate = useNavigate()
  // Токен читаем один раз при первом рендере
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token'))
  const [failed, setFailed] = useState(token === null)
  // В StrictMode эффект вызывается дважды — токен обрабатываем только один раз
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true
    window.history.replaceState(null, '', window.location.pathname)
    if (!token) return
    acceptToken(token)
      .then(() => navigate('/companies', { replace: true }))
      .catch(() => setFailed(true))
  }, [acceptToken, navigate, token])

  return (
    <main style={{ padding: '120px 24px', textAlign: 'center' }}>
      {failed
        ? <p>Не удалось завершить вход. <Link to="/companies" style={{ color: 'var(--c-accent-ink)' }}>Вернуться в каталог</Link></p>
        : <p>Завершаем вход…</p>}
    </main>
  )
}
