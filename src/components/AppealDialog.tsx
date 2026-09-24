import { useState } from 'react'
import type { FormEvent } from 'react'
import { Flag } from 'lucide-react'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import type { Review } from '../api/types'
import { useAuth } from '../auth/authContext'
import { Dialog } from './Dialog'
import styles from './Form.module.css'

type Props = {
  review: Review | null
  onClose: () => void
  onSubmitted: (reviewId: number) => void
}

const MIN_REASON = 20

/**
 * Заявка представителя компании на обжалование отзыва. Решение принимает модератор.
 * Родитель передаёт key={review.id}, чтобы форма сбрасывалась при выборе другого отзыва.
 */
export function AppealDialog({ review, onClose, onSubmitted }: Props) {
  const { token, user } = useAuth()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!review) return
    if (reason.trim().length < MIN_REASON) { setError(`Опишите основание подробнее — минимум ${MIN_REASON} символов.`); return }
    setBusy(true)
    setError('')
    try {
      await api.createAppeal(token, review.id, reason.trim())
      onSubmitted(review.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отправить заявку. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={review !== null} onClose={onClose} title="Обжалование отзыва" subtitle={user ? `От имени ${user.companyName ?? 'компании'} · ${user.displayName}` : undefined} width={560}>
      {review && (
        <form className={styles.form} onSubmit={submit} noValidate>
          <blockquote className={styles.quote}>{review.text}</blockquote>
          <label className={styles.field}>
            <span className={styles.label}>Основание для проверки</span>
            <textarea className={styles.textarea} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} placeholder="Например: автор не работал в компании в указанный период, отзыв содержит персональные данные или оскорбления." />
            <span className={styles.hint}>Несогласие с оценкой само по себе не основание. Модератор проверит факты и может запросить документы у обеих сторон.</span>
          </label>
          <p className={styles.note}>Заявка уйдёт модераторам. До решения отзыв останется на сайте с пометкой «на проверке» — так посетители видят, что компания не согласна.</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button className={styles.secondary} type="button" onClick={onClose}>Отмена</button>
            <button className={styles.primary} type="submit" disabled={busy}><Flag size={15} aria-hidden="true" /> {busy ? 'Отправляем…' : 'Отправить модераторам'}</button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
