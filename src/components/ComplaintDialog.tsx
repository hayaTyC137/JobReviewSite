import { useState } from 'react'
import type { FormEvent } from 'react'
import { Flag } from 'lucide-react'
import { platformApi } from '../api/client'
import { ApiError } from '../api/errors'
import type { ComplaintReason, ComplaintTarget } from '../api/types'
import { useAuth } from '../auth/authContext'
import { Dialog } from './Dialog'
import styles from './Form.module.css'

const COMPLAINT_REASONS: Array<[ComplaintReason, string]> = [
  ['FALSE_INFORMATION', 'Недостоверные сведения'],
  ['OFFENSIVE', 'Оскорбления'],
  ['CONFLICT_OF_INTEREST', 'Конфликт интересов'],
  ['PRIVACY', 'Раскрытие личных данных'],
  ['FRAUD', 'Мошенничество или накрутка'],
  ['SPAM', 'Спам или реклама'],
  ['OTHER', 'Другое'],
]

const TITLES: Record<ComplaintTarget, string> = {
  REVIEW: 'Пожаловаться на отзыв',
  EVALUATION: 'Оспорить оценку работодателя',
  USER: 'Пожаловаться на пользователя',
  COMPANY: 'Пожаловаться на компанию',
}

type Props = {
  target: { type: ComplaintTarget; id: number; label: string } | null
  onClose: () => void
  onSent?: () => void
}

/** Жалоба уходит в центр жалоб модераторов; статус виден в личном кабинете */
export function ComplaintDialog({ target, onClose, onSent }: Props) {
  return (
    <Dialog open={target !== null} onClose={onClose} title={target ? TITLES[target.type] : ''} subtitle={target?.label} width={520}>
      {target && <ComplaintForm target={target} onClose={onClose} onSent={onSent} />}
    </Dialog>
  )
}

function ComplaintForm({ target, onClose, onSent }: { target: NonNullable<Props['target']>; onClose: () => void; onSent?: () => void }) {
  const { token } = useAuth()
  const [reason, setReason] = useState<ComplaintReason>('FALSE_INFORMATION')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await platformApi.createComplaint(token, { targetType: target.type, targetId: target.id, reason, details })
      setDone(true)
      onSent?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отправить жалобу')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className={styles.form}>
        <p className={styles.success}>Жалоба отправлена модераторам. Статус рассмотрения — в личном кабинете, вкладка «Обращения».</p>
        <div className={styles.actions}><button className={styles.primary} type="button" onClick={onClose}>Понятно</button></div>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label className={styles.field}>
        <span className={styles.label}>Причина</span>
        <select className={styles.select} value={reason} onChange={(e) => setReason(e.target.value as ComplaintReason)}>
          {COMPLAINT_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Подробности</span>
        <textarea className={styles.textarea} value={details} onChange={(e) => setDetails(e.target.value)} minLength={20} maxLength={2000} required placeholder="Что именно не так и чем это можно подтвердить" />
        <span className={`${styles.counter} ${details.trim().length < 20 ? styles.short : ''}`}>{details.trim().length} / 2000, минимум 20</span>
      </label>
      <p className={styles.note}>Модератор проверит жалобу. Если она подтвердится, контент скрывается, а для жалоб на пользователя запись попадает в его дисциплинарную историю.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button className={styles.secondary} type="button" onClick={onClose}>Отмена</button>
        <button className={styles.primary} type="submit" disabled={busy || details.trim().length < 20}>
          <Flag size={15} aria-hidden="true" /> {busy ? 'Отправляем…' : 'Отправить'}
        </button>
      </div>
    </form>
  )
}
