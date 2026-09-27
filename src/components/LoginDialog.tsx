import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react'
import { api, oauthLoginUrl } from '../api/client'
import { ApiError } from '../api/errors'
import type { OAuthProviderKey } from '../api/types'
import { useAuth } from '../auth/authContext'
import { Dialog } from './Dialog'
import { PROVIDER_NAMES, PROVIDER_ORDER } from '../lib/cabinet'
import { SocialIcon } from './SocialIcons'
import styles from './Form.module.css'
import auth from './LoginDialog.module.css'

type Mode = 'login' | 'register'

const DEMO_ACCOUNTS = [
  { email: 'anna.k@demo.ru', label: 'Сотрудник' },
  { email: 'ceo@nova.demo', label: 'Директор NOVA' },
  { email: 'hr@codru.demo', label: 'HR Codru' },
  { email: 'moderator@demo.ru', label: 'Модератор' },
  { email: 'admin@demo.ru', label: 'Админ' },
]

/**
 * Окно входа. Сама форма — отдельный компонент: окно размонтирует её при закрытии,
 * поэтому при каждом открытии поля и ошибки начинаются с чистого листа.
 */
export function LoginDialog() {
  const { loginOpen, loginReason, closeLogin } = useAuth()
  const { pathname } = useLocation()
  // Страница, на которой окно открыли. Храним в ref, а closeLogin берём через ref: функция из контекста
  // пересоздаётся при каждом изменении авторизации, и эффект с ней в зависимостях закрывал бы окно сразу
  const openedOn = useRef<string | null>(null)
  const closeRef = useRef(closeLogin)
  useEffect(() => { closeRef.current = closeLogin }, [closeLogin])

  useEffect(() => { openedOn.current = loginOpen ? pathname : null }, [loginOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ушли с этой страницы («назад», ссылка) — окно закрывается, а не висит над новой. Если новая страница
  // сама просит войти (защищённый раздел), она откроет окно уже для себя
  useEffect(() => {
    if (openedOn.current !== null && openedOn.current !== pathname) closeRef.current()
  }, [pathname])

  return (
    <Dialog
      open={loginOpen}
      onClose={closeLogin}
      title="Вход в Контур"
      subtitle={loginReason ?? 'Смотреть компании и отзывы можно без входа. Аккаунт нужен, чтобы писать отзывы и вести карточку сотрудника.'}
      width={460}
      variant="auth"
    >
      <LoginForm />
    </Dialog>
  )
}

/**
 * Блок, который плавно раскрывается и сворачивается по высоте при смене «Вход / Регистрация».
 * Отрицательный отступ сверху компенсирует gap сетки формы — в свёрнутом виде блок не оставляет щели.
 */
function Collapse({ show, children }: { show: boolean; children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          style={{ overflow: 'hidden' }}
          initial={{ height: 0, opacity: 0, marginTop: -15 }}
          animate={{ height: 'auto', opacity: 1, marginTop: 0 }}
          exit={{ height: 0, opacity: 0, marginTop: -15 }}
          transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function LoginForm() {
  const { login, register } = useAuth()
  const reduceMotion = useReducedMotion()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [providers, setProviders] = useState<OAuthProviderKey[]>([])

  useEffect(() => {
    api.providers()
      .then((p) => setProviders(PROVIDER_ORDER.filter((key) => p[key])))
      .catch(() => setProviders([]))
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

  const inputClass = `${styles.input} ${auth.input}`

  return (
    <form className={`${styles.form} ${auth.form}`} onSubmit={submit} noValidate>
      <div className={auth.tabs} role="tablist" aria-label="Способ входа">
        {(['login', 'register'] as Mode[]).map((value) => (
          <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => { setMode(value); setError(''); setFieldErrors({}) }}>
            {mode === value && (
              <motion.span
                className={auth.tabIndicator}
                layoutId="auth-tab"
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={auth.tabLabel}>{value === 'login' ? 'Вход' : 'Регистрация'}</span>
          </button>
        ))}
      </div>

      {providers.length > 0 && (
        <>
          <div className={auth.socials} data-count={providers.length}>
            {providers.map((provider) => (
              <a key={provider} className={auth.social} href={oauthLoginUrl(provider)}>
                <SocialIcon provider={provider} />
                <span>{PROVIDER_NAMES[provider]}</span>
              </a>
            ))}
          </div>
          <div className={styles.divider}>или по email</div>
        </>
      )}

      <Collapse show={mode === 'register'}>
        <label className={styles.field}>
          <span className={styles.label}>Имя для отзывов</span>
          <input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="nickname" placeholder="Например, Мария П." required aria-invalid={Boolean(fieldErrors.displayName)} />
          {fieldErrors.displayName && <span className={styles.fieldError}>{fieldErrors.displayName}</span>}
        </label>
      </Collapse>

      <label className={styles.field}>
        <span className={styles.label}>Email</span>
        <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required aria-invalid={Boolean(fieldErrors.email)} />
        {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Пароль</span>
        <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 8 : undefined} aria-invalid={Boolean(fieldErrors.password)} />
        {mode === 'register' && <span className={styles.hint}>Не короче 8 символов.</span>}
        {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}
      </label>

      <Collapse show={mode === 'register'}>
        <label className={styles.field}>
          <span className={styles.label}>Должность <span className={styles.hint}>(необязательно)</span></span>
          <input className={inputClass} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} autoComplete="organization-title" />
          <span className={styles.hint}>Заполненный профиль повышает ваш рейтинг кандидатской активности.</span>
        </label>
      </Collapse>

      <Collapse show={Boolean(error)}>
        <p className={styles.error} role="alert">{error}</p>
      </Collapse>

      <button className={`${styles.primary} ${styles.wide} ${auth.submit}`} type="submit" disabled={busy}>
        <KeyRound size={16} aria-hidden="true" /> {busy ? 'Проверяем…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        <ArrowRight size={16} aria-hidden="true" className={auth.submitArrow} />
      </button>

      <p className={auth.trust}><ShieldCheck size={14} aria-hidden="true" /> Работодатель не узнает, что вы проверяли компанию.</p>

      <Collapse show={mode === 'login'}>
        <div className={styles.demoAccounts}>
          <p>Демо-аккаунты (пароль <code>demo12345</code>):</p>
          <ul>
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button type="button" className={auth.demo} onClick={() => { setEmail(account.email); setPassword('demo12345') }} title={account.email}>{account.label}</button>
              </li>
            ))}
          </ul>
        </div>
      </Collapse>
    </form>
  )
}
