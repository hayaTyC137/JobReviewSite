import { useState } from 'react'
import type { FormEvent } from 'react'
import { Send } from 'lucide-react'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import type { CriterionKey, EmploymentStatus, RatingScores, Review } from '../api/types'
import { useAuth } from '../auth/authContext'
import { CRITERIA } from '../lib/criteria'
import { Dialog } from './Dialog'
import styles from './Form.module.css'

type Props = {
  open: boolean
  companySlug: string
  companyName: string
  onClose: () => void
  onCreated: (review: Review) => void
}

const MIN_TEXT = 30

function ScaleInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className={styles.field} role="radiogroup" aria-label={label}>
      <span className={styles.label}>{label}</span>
      <div className={styles.scale}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} onClick={() => onChange(n)}>{n}</button>
        ))}
      </div>
    </div>
  )
}

export function ReviewFormDialog({ open, companySlug, companyName, onClose, onCreated }: Props) {
  const { token } = useAuth()
  const [status, setStatus] = useState<EmploymentStatus>('CURRENT')
  const [position, setPosition] = useState('')
  const [overall, setOverall] = useState(0)
  const [scores, setScores] = useState<Record<CriterionKey, number>>({ climate: 0, management: 0, team: 0, office: 0, clients: 0, growth: 0 })
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const missingScores = overall === 0 || Object.values(scores).some((v) => v === 0)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (missingScores) { setError('Поставьте общую оценку и оценку по каждому критерию.'); return }
    if (text.trim().length < MIN_TEXT) { setError(`Опишите опыт подробнее — минимум ${MIN_TEXT} символов.`); return }
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      const review = await api.createReview(token, companySlug, { employmentStatus: status, position, overall, scores: scores as RatingScores, text })
      onCreated(review)
      setText('')
      setPosition('')
      setOverall(0)
      setScores({ climate: 0, management: 0, team: 0, office: 0, clients: 0, growth: 0 })
    } catch (err) {
      if (err instanceof ApiError) { setError(err.message); setFieldErrors(err.fieldErrors) }
      else setError('Не удалось отправить отзыв. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  const length = text.trim().length

  return (
    <Dialog open={open} onClose={onClose} title="Новый отзыв" subtitle={`О компании ${companyName}. Отзыв публикуется под вашим именем для отзывов.`} width={640}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <span className={styles.label}>Ваш статус</span>
          <div className={styles.segmented} role="radiogroup" aria-label="Статус в компании">
            <button type="button" role="radio" aria-checked={status === 'CURRENT'} onClick={() => setStatus('CURRENT')}>Работаю сейчас</button>
            <button type="button" role="radio" aria-checked={status === 'FORMER'} onClick={() => setStatus('FORMER')}>Бывший сотрудник</button>
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Должность</span>
          <input className={styles.input} value={position} onChange={(e) => setPosition(e.target.value)} maxLength={160} required placeholder="Например, Frontend Engineer" aria-invalid={Boolean(fieldErrors.position)} />
          {fieldErrors.position && <span className={styles.fieldError}>{fieldErrors.position}</span>}
        </label>

        <ScaleInput label="Общая оценка" value={overall} onChange={setOverall} />

        <div className={styles.criteriaGrid}>
          {CRITERIA.map((criterion) => (
            <ScaleInput key={criterion.key} label={criterion.label} value={scores[criterion.key]} onChange={(value) => setScores((current) => ({ ...current, [criterion.key]: value }))} />
          ))}
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Расскажите об опыте</span>
          <textarea className={styles.textarea} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Что было хорошо, что стоит знать кандидату заранее?" aria-invalid={Boolean(fieldErrors.text)} />
          <span className={`${styles.counter} ${length < MIN_TEXT ? styles.short : ''}`}>{length < MIN_TEXT ? `ещё ${MIN_TEXT - length} симв.` : `${length} / 4000`}</span>
        </label>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.actions}>
          <button className={styles.secondary} type="button" onClick={onClose}>Отмена</button>
          <button className={styles.primary} type="submit" disabled={busy}><Send size={15} aria-hidden="true" /> {busy ? 'Публикуем…' : 'Опубликовать отзыв'}</button>
        </div>
      </form>
    </Dialog>
  )
}
