import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { LogIn } from 'lucide-react'
import { api, GOOGLE_LOGIN_URL } from '../api/client'
import { ApiError } from '../api/errors'
import { useAuth } from '../auth/authContext'
import { Dialog } from './Dialog'
import styles from './Form.module.css'

type Mode = 'login' | 'register'

const DEMO_ACCOUNTS = [
  { email: 'anna.k@demo.ru', label: 'Автор отзывов' },
  { email: 'ceo@nova.demo', label: 'CEO NOVA Studio' },
  { email: 'moderator@demo.ru', label: 'Модератор' },
]

/**
 * Окно входа. Сама форма — отдельный компонент: окно размонтирует её при закрытии,
 * поэтому при каждом открытии поля и ошибки начинаются с чистого листа.
 */
export function LoginDialog() {
  const { loginOpen, loginReason, closeLogin } = useAuth()
  return (
    <Dialog
      open={loginOpen}
      onClose={closeLogin}
      title="Вход в Контур"
      subtitle={loginReason ?? 'Смотреть компании и отзывы можно без входа. Аккаунт нужен, чтобы писать отзывы.'}
      width={440}
    >
      <LoginForm />
    </Dialog>
  )
}

function LoginForm() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState(false)

  useEffect(() => {
    api.providers().then((p) => setGoogleEnabled(p.google)).catch(() => setGoogleEnabled(false))
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      if (mode === 'login') await login(email, password)
      else await register({ email, password, displayName, jobTitle: jobTitle || undefined })
      setPassword('')
    } catch (err) {
      if (err instanceof ApiError) { setError(err.message); setFieldErrors(err.fieldErrors) }
      else setError('Не удалось связаться с сервером. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.segmented} role="tablist" aria-label="Способ входа">
        <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => setMode('login')}>Вход</button>
        <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => setMode('register')}>Регистрация</button>
      </div>

      {mode === 'register' && (
        <label className={styles.field}>
          <span className={styles.label}>Имя для отзывов</span>
          <input className={styles.input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="nickname" placeholder="Например, Мария П." required aria-invalid={Boolean(fieldErrors.displayName)} />
          {fieldErrors.displayName && <span className={styles.fieldError}>{fieldErrors.displayName}</span>}
        </label>
      )}

      <label className={styles.field}>
        <span className={styles.label}>Email</span>
        <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required aria-invalid={Boolean(fieldErrors.email)} />
        {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Пароль</span>
        <input className={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 8 : undefined} aria-invalid={Boolean(fieldErrors.password)} />
        {mode === 'register' && <span className={styles.hint}>Не короче 8 символов.</span>}
        {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}
      </label>

      {mode === 'register' && (
        <label className={styles.field}>
          <span className={styles.label}>Должность <span className={styles.hint}>(необязательно)</span></span>
          <input className={styles.input} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} autoComplete="organization-title" />
          <span className={styles.hint}>Заполненный профиль повышает ваш рейтинг кандидатской активности.</span>
        </label>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}

      <button className={`${styles.primary} ${styles.wide}`} type="submit" disabled={busy}>
        <LogIn size={16} aria-hidden="true" /> {busy ? 'Проверяем…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
      </button>

      {googleEnabled && (
        <>
          <div className={styles.divider}>или</div>
          <a className={styles.google} href={GOOGLE_LOGIN_URL}>
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2.1 5.1-4.4 6.7v5.6h7.1c4.2-3.8 6.6-9.5 6.6-16.3z" /><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.6c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.4v5.7C8 41.1 15.4 46 24 46z" /><path fill="#FBBC05" d="M11.7 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.4C2.9 17.2 2 20.5 2 24s.9 6.8 2.4 9.8l7.3-5.7z" /><path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 8 6.9 4.4 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.3-9.1z" /></svg>
            Войти через Google
          </a>
        </>
      )}

      {mode === 'login' && (
        <div className={styles.demoAccounts}>
          <p>Демо-аккаунты (пароль <code>demo12345</code>):</p>
          <ul>
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button type="button" onClick={() => { setEmail(account.email); setPassword('demo12345') }} title={account.email}>{account.label}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  )
}
