import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { AlertCircle, CheckCircle2, CircleDashed, Clock3, ImageUp, Loader2, XCircle } from 'lucide-react'
import { platformApi } from '../../api/client'
import { useAuth } from '../../auth/authContext'
import { errorText } from '../../lib/cabinet'
import { initials } from '../../lib/format'
import styles from './ui.module.css'

// ---------- Вкладки ----------

export type TabItem<T extends string> = { id: T; label: string; count?: number }

/** Вкладки кабинета: подчёркивание переезжает между пунктами, счётчики показывают очереди */
export function Tabs<T extends string>({ items, value, onChange, label }: { items: TabItem<T>[]; value: T; onChange: (id: T) => void; label: string }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {items.map((item) => (
        <button key={item.id} type="button" role="tab" aria-selected={value === item.id} onClick={() => onChange(item.id)}>
          <span>{item.label}</span>
          {item.count !== undefined && item.count > 0 && <span className={styles.count}>{item.count}</span>}
          {value === item.id && (
            <motion.i className={styles.underline} layoutId={`tabs-${label}`} transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }} />
          )}
        </button>
      ))}
    </div>
  )
}

// ---------- Статусы ----------

export type Tone = 'good' | 'warn' | 'bad' | 'neutral' | 'info'

const TONE_ICON: Record<Tone, ReactNode> = {
  good: <CheckCircle2 size={13} aria-hidden="true" />,
  warn: <Clock3 size={13} aria-hidden="true" />,
  bad: <XCircle size={13} aria-hidden="true" />,
  neutral: <CircleDashed size={13} aria-hidden="true" />,
  info: <AlertCircle size={13} aria-hidden="true" />,
}

/** Статус всегда = иконка + текст: цвет не единственный носитель смысла */
export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{TONE_ICON[tone]}{children}</span>
}

const STATUS_MAP: Record<string, [Tone, string]> = {
  PENDING: ['warn', 'На проверке'],
  APPROVED: ['good', 'Одобрено'],
  REJECTED: ['bad', 'Отклонено'],
  SUSPENDED: ['bad', 'Приостановлена'],
  CONFIRMED: ['good', 'Подтверждено'],
  OPEN: ['warn', 'Открыта'],
  UPHELD: ['good', 'Удовлетворена'],
  NEW: ['info', 'Новое'],
  IN_PROGRESS: ['warn', 'В работе'],
  RESOLVED: ['good', 'Решено'],
  CLOSED: ['neutral', 'Закрыто'],
  PUBLISHED: ['good', 'Опубликован'],
  UNDER_APPEAL: ['warn', 'Обжалуется'],
  HIDDEN: ['bad', 'Скрыт'],
}

export function Status({ value, labels }: { value: string; labels?: Partial<Record<string, string>> }) {
  const [tone, label] = STATUS_MAP[value] ?? ['neutral', value]
  return <StatusBadge tone={tone}>{labels?.[value] ?? label}</StatusBadge>
}

// ---------- Мелочи ----------

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  return url
    ? <img className={styles.avatar} src={url} alt="" width={size} height={size} style={{ width: size, height: size }} />
    : <span className={styles.avatar} style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }} aria-hidden="true">{initials(name)}</span>
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className={styles.empty}>
      {icon && <span className={styles.emptyIcon}>{icon}</span>}
      <strong>{title}</strong>
      {children && <div>{children}</div>}
    </div>
  )
}

export function LoadingBlock() {
  return <div className={styles.loading} aria-busy="true"><Loader2 size={20} aria-hidden="true" /> Загружаем…</div>
}

export function ErrorNote({ error }: { error: string }) {
  return <p className={styles.errorNote} role="alert"><AlertCircle size={16} aria-hidden="true" /> {error}</p>
}

// ---------- Загрузка картинок ----------

type UploadProps = {
  value: string | null
  onChange: (url: string | null) => void
  label: string
  hint?: string
  shape?: 'round' | 'square' | 'wide'
  fallback?: string
}

/** Загрузка аватара/логотипа/баннера: файл уходит на /api/files, в форму попадает только выданный адрес */
export function ImageUpload({ value, onChange, label, hint, shape = 'square', fallback = '' }: UploadProps) {
  const { token } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pick = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Файл больше 2 МБ'); return }
    setBusy(true)
    setError('')
    try {
      const { url } = await platformApi.uploadImage(token, file)
      onChange(url)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={`${styles.upload} ${styles[`upload-${shape}`]}`}>
      <div className={styles.uploadPreview}>
        {value ? <img src={value} alt="" /> : <span aria-hidden="true">{initials(fallback) || <ImageUp size={20} />}</span>}
      </div>
      <div className={styles.uploadBody}>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
        <div className={styles.uploadActions}>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
            <ImageUp size={14} aria-hidden="true" /> {busy ? 'Загружаем…' : value ? 'Заменить' : 'Загрузить'}
          </button>
          {value && <button type="button" onClick={() => onChange(null)}>Убрать</button>}
        </div>
        {error && <span className={styles.uploadError} role="alert">{error}</span>}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  )
}

// ---------- Решение модератора ----------

type DecisionProps = {
  onDecide: (decision: 'APPROVE' | 'REJECT', comment: string) => Promise<void>
  approveLabel?: string
  rejectLabel?: string
  /** Для отказа обязателен комментарий (например, заявка компании) */
  requireRejectComment?: boolean
}

export function DecisionBar({ onDecide, approveLabel = 'Одобрить', rejectLabel = 'Отклонить', requireRejectComment }: DecisionProps) {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState<'APPROVE' | 'REJECT' | null>(null)
  const [error, setError] = useState('')

  const decide = async (decision: 'APPROVE' | 'REJECT') => {
    if (decision === 'REJECT' && requireRejectComment && !comment.trim()) {
      setError('Напишите причину отказа — заявитель её увидит')
      return
    }
    setBusy(decision)
    setError('')
    try {
      await onDecide(decision, comment.trim())
    } catch (err) {
      setError(errorText(err))
      setBusy(null)
    }
  }

  return (
    <div className={styles.decision}>
      <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий к решению" aria-label="Комментарий к решению" maxLength={1000} />
      <div>
        <button type="button" className={styles.approve} onClick={() => decide('APPROVE')} disabled={busy !== null}>
          <CheckCircle2 size={15} aria-hidden="true" /> {busy === 'APPROVE' ? '…' : approveLabel}
        </button>
        <button type="button" className={styles.reject} onClick={() => decide('REJECT')} disabled={busy !== null}>
          <XCircle size={15} aria-hidden="true" /> {busy === 'REJECT' ? '…' : rejectLabel}
        </button>
      </div>
      {error && <span className={styles.decisionError} role="alert">{error}</span>}
    </div>
  )
}
