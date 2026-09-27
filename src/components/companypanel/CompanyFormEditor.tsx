import { useState } from 'react'
import type { FormEvent } from 'react'
import { Save, Send } from 'lucide-react'
import { ApiError } from '../../api/errors'
import type { CompanyForm } from '../../api/types'
import { citiesOf, useLocations } from '../../lib/useLocations'
import { ErrorNote, ImageUpload } from '../cabinet/ui'
import form from '../Form.module.css'
import styles from '../../pages/Cabinet.module.css'

type Props = {
  initial: CompanyForm
  /** Юридические поля проверенной компании меняются только через поддержку */
  legalLocked?: boolean
  submitLabel: string
  mode: 'register' | 'update'
  onSubmit: (form: CompanyForm) => Promise<void>
}

/** Пустые строки превращаем в null: бэкенд проверяет формат только у заполненных полей */
function normalize(value: CompanyForm): CompanyForm {
  const text = (v: string | null) => (v && v.trim() ? v.trim() : null)
  return {
    ...value,
    name: value.name.trim(), legalName: value.legalName.trim(), inn: text(value.inn), city: value.city.trim(),
    legalAddress: text(value.legalAddress), actualAddress: text(value.actualAddress), phone: text(value.phone),
    email: text(value.email), website: text(value.website), industry: text(value.industry), description: text(value.description),
  }
}

export function CompanyFormEditor({ initial, legalLocked, submitLabel, mode, onSubmit }: Props) {
  const locations = useLocations()
  const [value, setValue] = useState<CompanyForm>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof CompanyForm>(key: K, next: CompanyForm[K]) => { setValue((v) => ({ ...v, [key]: next })); setSaved(false) }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      await onSubmit(normalize(value))
      setSaved(true)
    } catch (err) {
      if (err instanceof ApiError) { setError(err.message); setFieldErrors(err.fieldErrors) }
      else setError('Не удалось связаться с сервером')
    } finally {
      setBusy(false)
    }
  }

  const text = (key: keyof CompanyForm, label: string, opts: { hint?: string; locked?: boolean; full?: boolean; type?: string; max?: number; required?: boolean } = {}) => (
    <label className={`${form.field} ${opts.full ? styles.full : ''}`}>
      <span className={form.label}>{label}{!opts.required && <span className={form.hint}> (необязательно)</span>}</span>
      <input
        className={form.input}
        type={opts.type ?? 'text'}
        value={(value[key] as string | number | null) ?? ''}
        onChange={(e) => set(key, (opts.type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value) as never)}
        disabled={opts.locked}
        maxLength={opts.max}
        required={opts.required}
        aria-invalid={Boolean(fieldErrors[key])}
      />
      {fieldErrors[key] ? <span className={form.fieldError}>{fieldErrors[key]}</span> : opts.hint && <span className={form.hint}>{opts.hint}</span>}
    </label>
  )

  return (
    <form className={`${styles.card} ${form.form}`} onSubmit={submit} noValidate>
      <div className={styles.grid2}>
        <ImageUpload value={value.logoUrl} onChange={(url) => set('logoUrl', url)} label="Логотип" hint="Квадратный, PNG/JPEG/WebP до 2 МБ" fallback={value.name} />
        <ImageUpload value={value.bannerUrl} onChange={(url) => set('bannerUrl', url)} label="Баннер" hint="Широкий, примерно 1600×400" shape="wide" />
      </div>

      <p className={styles.kicker}>Юридические сведения</p>
      {legalLocked && <p className={`${form.hint}`}>Компания проверена: название, юр. наименование, ИНН и адрес регистрации меняются через поддержку.</p>}
      <div className={styles.formGrid}>
        {text('name', 'Название бренда', { locked: legalLocked, max: 200, required: true })}
        {text('legalName', 'Юридическое наименование', { locked: legalLocked, max: 300, required: true, hint: 'Например, SRL «Codru Digital» или ООО «Нова Диджитал»' })}
        {text('inn', 'ИНН / IDNO', { locked: legalLocked, max: 13, hint: 'Только цифры: 9–13 знаков' })}
        {text('legalAddress', 'Юридический адрес', { locked: legalLocked, max: 400 })}
      </div>

      <p className={styles.kicker}>Профиль и контакты</p>
      <div className={styles.formGrid}>
        <label className={form.field}>
          <span className={form.label}>Страна</span>
          <select className={form.select} value={value.country} onChange={(e) => { set('country', e.target.value); set('city', '') }}>
            {(locations?.countries ?? [value.country]).map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className={form.field}>
          <span className={form.label}>Город</span>
          <select className={form.select} value={value.city} onChange={(e) => set('city', e.target.value)} required aria-invalid={Boolean(fieldErrors.city)}>
            <option value="">Выберите город</option>
            {value.city && !citiesOf(locations, value.country).includes(value.city) && <option>{value.city}</option>}
            {citiesOf(locations, value.country).map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        {text('industry', 'Отрасль', { max: 160 })}
        {text('actualAddress', 'Фактический адрес офиса', { max: 400 })}
        {text('website', 'Сайт', { max: 200, hint: 'codru.md или https://codru.md' })}
        {text('email', 'Email', { type: 'email', max: 120 })}
        {text('phone', 'Телефон', { type: 'tel', max: 25 })}
        {text('employeesCount', 'Сотрудников', { type: 'number' })}
        {text('foundedYear', 'Год основания', { type: 'number' })}
        <label className={`${form.field} ${styles.full}`}>
          <span className={form.label}>Описание <span className={form.hint}>(необязательно)</span></span>
          <textarea className={form.textarea} value={value.description ?? ''} onChange={(e) => set('description', e.target.value)} maxLength={4000} />
          <span className={form.counter}>{(value.description ?? '').length} / 4000</span>
        </label>
      </div>

      {error && <ErrorNote error={error} />}
      {saved && <p className={form.success}>{mode === 'register' ? 'Заявка отправлена модераторам.' : 'Изменения сохранены.'}</p>}
      <div className={form.actions}>
        <button className={form.primary} type="submit" disabled={busy || !value.name.trim() || !value.legalName.trim() || !value.city}>
          {mode === 'register' ? <Send size={15} aria-hidden="true" /> : <Save size={15} aria-hidden="true" />} {busy ? 'Сохраняем…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
