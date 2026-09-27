import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Building2, CheckCircle2, Clock3, LifeBuoy, Mail, MessageSquareText, Send, ShieldCheck } from 'lucide-react'
import { platformApi } from '../api/client'
import { ApiError } from '../api/errors'
import type { Ticket, TicketTopic } from '../api/types'
import { useAuth } from '../auth/authContext'
import { AppHeader } from '../components/AppHeader'
import { EmptyState, Status } from '../components/cabinet/ui'
import { formatDateTime } from '../lib/cabinet'
import { useSupportEmail } from '../lib/usePublicSettings'
import form from '../components/Form.module.css'
import styles from './ContactPage.module.css'

const TOPICS: Array<[TicketTopic, string]> = [
  ['GENERAL', 'Общий вопрос'],
  ['ACCOUNT', 'Аккаунт и вход'],
  ['COMPANY', 'Профиль компании'],
  ['REVIEW', 'Отзывы и модерация'],
  ['PRIVACY', 'Персональные данные'],
  ['BUG', 'Ошибка на сайте'],
]

const CHANNELS = [
  { icon: <MessageSquareText size={18} />, title: 'Модерация отзывов', text: 'Спорный отзыв или оценка — используйте кнопку «Пожаловаться» рядом с ними: так заявка сразу попадёт в нужную очередь.' },
  { icon: <Building2 size={18} />, title: 'Для компаний', text: 'Регистрация в реестре, смена юридических данных, добавление представителей.' },
  { icon: <ShieldCheck size={18} />, title: 'Персональные данные', text: 'Запрос на выгрузку или удаление данных обрабатывается в течение 30 дней.' },
]

export function ContactPage() {
  const { user, token } = useAuth()
  const reduceMotion = useReducedMotion()
  const supportEmail = useSupportEmail()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState<TicketTopic>('GENERAL')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState<Ticket | null>(null)
  const [tickets, setTickets] = useState<Ticket[] | null>(null)

  useEffect(() => {
    if (!token) return
    platformApi.myTickets(token).then(setTickets).catch(() => setTickets([]))
  }, [token, sent])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      const ticket = await platformApi.createTicket(token, { name: name || user?.displayName || '', email: user?.email ?? email, topic, subject, message, website })
      setSent(ticket)
      setSubject('')
      setMessage('')
    } catch (err) {
      if (err instanceof ApiError) { setError(err.message); setFieldErrors(err.fieldErrors) }
      else setError('Не удалось отправить. Проверьте соединение или напишите на почту.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <AppHeader />
      <section className={styles.hero}>
        <p className={styles.kicker}>Связаться с нами</p>
        <h1>Напишите модераторам — <em>ответим по существу.</em></h1>
        <p>Вопросы об аккаунте, компаниях и отзывах разбирают те же люди, что проверяют данные в реестре.</p>
        <div className={styles.heroFacts}>
          <span><Clock3 size={15} aria-hidden="true" /> Ответ в течение 2 рабочих дней</span>
          <span><Mail size={15} aria-hidden="true" /> <a href={`mailto:${supportEmail}`}>{supportEmail}</a></span>
        </div>
      </section>

      <main className={styles.content}>
        <form className={`${styles.formCard} ${form.form}`} onSubmit={submit} noValidate>
          <div className={styles.formHead}>
            <LifeBuoy size={20} aria-hidden="true" />
            <div><h2>Обращение</h2><p>{user ? 'Ответ придёт на адрес вашего аккаунта, а статус появится ниже и в личном кабинете.' : 'Войдите, чтобы отслеживать статус обращения на сайте.'}</p></div>
          </div>

          <div className={styles.grid}>
            <label className={form.field}>
              <span className={form.label}>Как к вам обращаться</span>
              <input className={form.input} value={name || (user?.displayName ?? '')} onChange={(e) => setName(e.target.value)} maxLength={120} required autoComplete="name" aria-invalid={Boolean(fieldErrors.name)} />
            </label>
            <label className={form.field}>
              <span className={form.label}>Email для ответа</span>
              <input className={form.input} type="email" value={user?.email ?? email} onChange={(e) => setEmail(e.target.value)} maxLength={160} required autoComplete="email" disabled={Boolean(user)} aria-invalid={Boolean(fieldErrors.email)} />
              {fieldErrors.email && <span className={form.fieldError}>{fieldErrors.email}</span>}
            </label>
          </div>

          <fieldset className={styles.topics}>
            <legend className={form.label}>Тема</legend>
            {TOPICS.map(([value, label]) => (
              <label key={value} className={topic === value ? styles.topicActive : undefined}>
                <input type="radio" name="topic" value={value} checked={topic === value} onChange={() => setTopic(value)} />
                {label}
              </label>
            ))}
          </fieldset>

          <label className={form.field}>
            <span className={form.label}>Кратко о проблеме</span>
            <input className={form.input} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required aria-invalid={Boolean(fieldErrors.subject)} />
            {fieldErrors.subject && <span className={form.fieldError}>{fieldErrors.subject}</span>}
          </label>
          <label className={form.field}>
            <span className={form.label}>Сообщение</span>
            <textarea className={form.textarea} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} required rows={6} aria-invalid={Boolean(fieldErrors.message)} />
            <span className={`${form.counter} ${message.trim().length < 20 ? form.short : ''}`}>{message.trim().length} / 4000, минимум 20</span>
          </label>
          {/* Ловушка для ботов: скрыта от людей и скринридеров */}
          <input className={styles.honeypot} tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />

          {error && <p className={form.error} role="alert">{error}</p>}
          <AnimatePresence>
            {sent && (
              <motion.p className={form.success} role="status" initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <CheckCircle2 size={14} aria-hidden="true" /> Обращение №{sent.id} отправлено. {user ? 'Статус — ниже.' : `Ответим на ${sent.email}.`}
              </motion.p>
            )}
          </AnimatePresence>
          <div className={form.actions}>
            <button className={`${form.primary} ${styles.send}`} type="submit" disabled={busy || message.trim().length < 20 || subject.trim().length < 4}>
              <Send size={15} aria-hidden="true" /> {busy ? 'Отправляем…' : 'Отправить'}
            </button>
          </div>
        </form>

        <aside className={styles.side}>
          {CHANNELS.map((c) => (
            <div key={c.title} className={styles.channel}>
              <span>{c.icon}</span>
              <div><strong>{c.title}</strong><p>{c.text}</p></div>
            </div>
          ))}
        </aside>

        {user && (
          <section className={styles.status} aria-labelledby="status-title">
            <h2 id="status-title">Статус ваших обращений</h2>
            {tickets === null ? <p className={styles.muted}>Загружаем…</p>
              : tickets.length === 0 ? <EmptyState title="Пока пусто">Отправленные обращения появятся здесь.</EmptyState>
                : (
                  <ol className={styles.ticketList}>
                    {tickets.map((t) => (
                      <li key={t.id}>
                        <div className={styles.ticketHead}>
                          <span className={styles.ticketId}>№{t.id}</span>
                          <strong>{t.subject}</strong>
                          <Status value={t.status} />
                        </div>
                        <small>{t.topicLabel} · {formatDateTime(t.createdAt)}{t.updatedAt !== t.createdAt && ` · обновлено ${formatDateTime(t.updatedAt)}`}</small>
                        {t.response && <p className={styles.response}><strong>Ответ поддержки:</strong> {t.response}</p>}
                      </li>
                    ))}
                  </ol>
                )}
          </section>
        )}
      </main>
    </div>
  )
}
