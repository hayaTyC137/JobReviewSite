import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'

const ERRORS: Record<string, string> = {
  oauth: 'Провайдер не подтвердил вход. Попробуйте ещё раз или войдите по email.',
  blocked: 'Аккаунт заблокирован. Если это ошибка — напишите нам на странице «Связаться с нами».',
  registration_closed: 'Регистрация новых пользователей временно закрыта.',
}

/**
 * Сюда бэкенд возвращает браузер после входа через соцсеть: /auth/callback#token=...[&onboarding=1]
 * или /auth/callback#error=код. Токен берём из фрагмента URL, проверяем через /api/auth/me
 * и сразу убираем из адресной строки. Новому пользователю предлагаем дозаполнить профиль.
 */
export function AuthCallbackPage() {
  const { acceptToken } = useAuth()
  const navigate = useNavigate()
  // Параметры читаем один раз при первом рендере
  const [params] = useState(() => new URLSearchParams(window.location.hash.slice(1)))
  const token = params.get('token')
  const [error, setError] = useState(() => {
    const code = params.get('error')
    if (code) return ERRORS[code] ?? ERRORS.oauth
    return token ? '' : 'Не удалось завершить вход.'
  })
  // В StrictMode эффект вызывается дважды — токен обрабатываем только один раз
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true
    window.history.replaceState(null, '', window.location.pathname)
    if (!token) return
    acceptToken(token)
      .then((user) => navigate(user.profileCompleted === false || params.get('onboarding') ? '/welcome' : '/me', { replace: true }))
      .catch(() => setError('Не удалось завершить вход.'))
  }, [acceptToken, navigate, params, token])

  return (
    <main style={{ padding: '120px 24px', textAlign: 'center' }}>
      {error
        ? <p role="alert">{error} <Link to="/companies" style={{ color: 'var(--c-accent-ink)' }}>Вернуться в каталог</Link></p>
        : <p aria-busy="true">Завершаем вход…</p>}
    </main>
  )
}
