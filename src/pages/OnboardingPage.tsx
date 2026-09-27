import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { platformApi } from '../api/client'
import { ApiError } from '../api/errors'
import { useAuth } from '../auth/authContext'
import { CabinetLayout } from '../components/cabinet/CabinetLayout'
import { ErrorNote } from '../components/cabinet/ui'
import { citiesOf, useLocations } from '../lib/useLocations'
import form from '../components/Form.module.css'
import styles from './Cabinet.module.css'

/**
 * Первый вход через соцсеть: аккаунт уже создан с ролью «Сотрудник», осталось указать
 * минимальные данные — публичное имя, страну и город (и email, если провайдер его не передал).
 */
export function OnboardingPage() {
  const { user, token, updateUser } = useAuth()
  const navigate = useNavigate()
  const locations = useLocations()
  const needsEmail = Boolean(user?.email.endsWith('.invalid'))
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '')
  const [country, setCountry] = useState(user?.country ?? 'Молдова')
  const [city, setCity] = useState(user?.city ?? '')
  const [email, setEmail] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  if (user && user.profileCompleted !== false) return <Navigate to="/me" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      const updated = await platformApi.onboarding(token, {
        displayName, jobTitle: jobTitle || undefined, country, city, email: needsEmail ? email : undefined, acceptTerms,
      })
      updateUser(updated)
      navigate('/me', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) { setError(err.message); setFieldErrors(err.fieldErrors) }
      else setError('Не удалось связаться с сервером')
      setBusy(false)
    }
  }

  return (
    <CabinetLayout kicker="Добро пожаловать" title="Пара деталей — и готово" subtitle="Аккаунт создан с ролью «Сотрудник». Эти данные нужны, чтобы работодатели могли узнать вас в трудовой истории, а читатели — доверять вашим отзывам.">
      <form className={`${styles.card} ${form.form}`} onSubmit={submit} noValidate style={{ maxWidth: 720 }}>
        <div className={styles.formGrid}>
          <label className={form.field}>
            <span className={form.label}>Публичное имя</span>
            <input className={form.input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={120} aria-invalid={Boolean(fieldErrors.displayName)} />
            <span className={form.hint}>Так вы будете подписаны в отзывах, например «Мария П.»</span>
          </label>
          <label className={form.field}>
            <span className={form.label}>Должность <span className={form.hint}>(необязательно)</span></span>
            <input className={form.input} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={120} />
          </label>
          <label className={form.field}>
            <span className={form.label}>Страна</span>
            <select className={form.select} value={country} onChange={(e) => { setCountry(e.target.value); setCity('') }}>
              {(locations?.countries ?? ['Молдова']).map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className={form.field}>
            <span className={form.label}>Город</span>
            <select className={form.select} value={city} onChange={(e) => setCity(e.target.value)} required aria-invalid={Boolean(fieldErrors.city)}>
              <option value="">Выберите город</option>
              {citiesOf(locations, country).map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          {needsEmail && (
            <label className={`${form.field} ${styles.full}`}>
              <span className={form.label}>Email</span>
              <input className={form.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" aria-invalid={Boolean(fieldErrors.email)} />
              <span className={form.hint}>Провайдер не передал подтверждённый адрес. На него придут ответы поддержки.</span>
            </label>
          )}
        </div>
        <label className={styles.row} style={{ fontSize: 13, lineHeight: 1.5 }}>
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
          <span>Согласен(на) с правилами платформы и обработкой персональных данных. ФИО и email не публикуются.</span>
        </label>
        {fieldErrors.acceptTerms && <span className={form.fieldError}>{fieldErrors.acceptTerms}</span>}
        {error && <ErrorNote error={error} />}
        <div className={form.actions}>
          <button className={form.primary} type="submit" disabled={busy || !acceptTerms}>
            <Sparkles size={16} aria-hidden="true" /> {busy ? 'Сохраняем…' : 'Сохранить и продолжить'} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </form>
    </CabinetLayout>
  )
}
