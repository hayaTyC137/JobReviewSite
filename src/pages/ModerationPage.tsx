import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { moderationApi } from '../api/client'
import type {
  AppealQueueItem, ChangeRequest, Complaint, CompanyProfile, DisciplineQueueItem, ModerationSummary, PendingRepresentative, Ticket, TicketStatus,
} from '../api/types'
import { useAuth } from '../auth/authContext'
import { CabinetLayout } from '../components/cabinet/CabinetLayout'
import { DecisionBar, EmptyState, ErrorNote, LoadingBlock, Status, Tabs } from '../components/cabinet/ui'
import { errorText, formatDateTime } from '../lib/cabinet'
import styles from './Cabinet.module.css'

type Tab = 'companies' | 'representatives' | 'profiles' | 'discipline' | 'complaints' | 'appeals' | 'tickets'

/**
 * Рабочее место модератора: сводка по всем очередям (мониторинг) и вкладка на каждую очередь.
 * После решения карточка исчезает из очереди, а счётчики обновляются.
 */
export function ModerationPage() {
  const { token } = useAuth()
  const [summary, setSummary] = useState<ModerationSummary | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('companies')

  const loadSummary = useCallback(() => {
    moderationApi.summary(token).then(setSummary).catch((err) => setError(errorText(err)))
  }, [token])
  useEffect(loadSummary, [loadSummary])

  const s = summary
  return (
    <CabinetLayout kicker="Модерация" title="Очереди и мониторинг" subtitle="Проверка новых компаний и представителей, изменений профилей, дисциплинарных записей, жалоб, обжалований и обращений.">
      {error && <ErrorNote error={error} />}
      {s && (
        <div className={styles.kpis} aria-label="Мониторинг">
          <Kpi label="Ждут решения всего" value={s.pendingCompanies + s.pendingRepresentatives + s.pendingProfileChanges + s.pendingDiscipline + s.openComplaints + s.pendingAppeals + s.openTickets} alert />
          <Kpi label="Отзывов за 24 часа" value={s.reviewsLast24h} hint="резкий рост — повод проверить накрутку" />
          <Kpi label="Открытых жалоб" value={s.openComplaints} alert={s.openComplaints > 0} />
          <Kpi label="Обращений в поддержку" value={s.openTickets} alert={s.openTickets > 0} />
          <Kpi label="Заблокировано пользователей" value={s.blockedUsers} />
        </div>
      )}
      <Tabs<Tab>
        label="Очереди модерации"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'companies', label: 'Компании', count: s?.pendingCompanies },
          { id: 'representatives', label: 'Представители', count: s?.pendingRepresentatives },
          { id: 'profiles', label: 'Изменения профилей', count: s?.pendingProfileChanges },
          { id: 'discipline', label: 'Дисциплина', count: s?.pendingDiscipline },
          { id: 'complaints', label: 'Жалобы', count: s?.openComplaints },
          { id: 'appeals', label: 'Обжалования', count: s?.pendingAppeals },
          { id: 'tickets', label: 'Обращения', count: s?.openTickets },
        ]}
      />
      {tab === 'companies' && <CompaniesQueue onChanged={loadSummary} />}
      {tab === 'representatives' && <RepresentativesQueue onChanged={loadSummary} />}
      {tab === 'profiles' && <ProfileQueue onChanged={loadSummary} />}
      {tab === 'discipline' && <DisciplineQueue onChanged={loadSummary} />}
      {tab === 'complaints' && <ComplaintsQueue onChanged={loadSummary} />}
      {tab === 'appeals' && <AppealsQueue onChanged={loadSummary} />}
      {tab === 'tickets' && <TicketsQueue onChanged={loadSummary} />}
    </CabinetLayout>
  )
}

function Kpi({ label, value, hint, alert }: { label: string; value: number; hint?: string; alert?: boolean }) {
  return <div className={`${styles.kpi} ${alert && value > 0 ? styles.kpiAlert : ''}`}><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>
}

/** Общая механика очереди: загрузка по статусу, «история» решений, пустое состояние */
function useQueue<T>(loader: (status: string) => Promise<T[]>, pendingStatus: string, historyStatuses: string[]) {
  const [status, setStatus] = useState(pendingStatus)
  const [loaded, setLoaded] = useState<{ status: string; items: T[]; error: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    loader(status)
      .then((items) => { if (!cancelled) setLoaded({ status, items, error: '' }) })
      .catch((err) => { if (!cancelled) setLoaded({ status, items: [], error: errorText(err) }) })
    return () => { cancelled = true }
  }, [loader, status])
  const current = loaded?.status === status ? loaded : null
  const items = current?.items ?? null
  const error = current?.error ?? ''
  const setItems = (update: (items: T[] | null) => T[] | null) =>
    setLoaded((prev) => prev && { ...prev, items: update(prev.items) ?? [] })
  const filter = (
    <select className={styles.inlineSelect} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Показать">
      <option value={pendingStatus}>Ждут решения</option>
      {historyStatuses.map((value) => <option key={value} value={value}>{STATUS_TITLES[value] ?? value}</option>)}
    </select>
  )
  return { items, error, filter, pending: status === pendingStatus, setItems }
}

const STATUS_TITLES: Record<string, string> = {
  APPROVED: 'Одобренные', REJECTED: 'Отклонённые', CONFIRMED: 'Подтверждённые', UPHELD: 'Удовлетворённые', SUSPENDED: 'Приостановленные',
}

function QueueFrame({ title, hint, filter, error, empty, children }: { title: string; hint: string; filter?: ReactNode; error: string; empty: boolean; children: ReactNode }) {
  return (
    <section className={styles.stack}>
      <div className={styles.cardHead} style={{ marginBottom: 0 }}>
        <div><h2>{title}</h2><p>{hint}</p></div>
        {filter}
      </div>
      {error && <ErrorNote error={error} />}
      {empty ? <EmptyState icon={<Inbox size={22} />} title="Очередь пуста">Новые заявки появятся здесь автоматически.</EmptyState> : <div className={styles.queue}>{children}</div>}
    </section>
  )
}

type QueueProps = { onChanged: () => void }

function CompaniesQueue({ onChanged }: QueueProps) {
  const { token } = useAuth()
  const loader = useCallback((status: string) => moderationApi.companies(token, status), [token])
  const q = useQueue<CompanyProfile>(loader, 'PENDING', ['APPROVED', 'REJECTED'])
  if (!q.items) return <LoadingBlock />
  return (
    <QueueFrame title="Заявки на добавление в реестр" hint="Сверьте ИНН/IDNO и юридическое наименование с открытым реестром. При отказе укажите причину." filter={q.filter} error={q.error} empty={q.items.length === 0}>
      {q.items.map((c) => (
        <article key={c.id} className={styles.item}>
          <div className={styles.itemHead}>
            <div><h3>{c.name}</h3><div className={styles.itemMeta}><span>{c.legalName}</span><span>{c.city}, {c.country}</span><span>подана {formatDateTime(c.createdAt)}</span></div></div>
            <Status value={c.status} />
          </div>
          <dl className={styles.facts}>
            <div><dt>ИНН / IDNO</dt><dd>{c.inn ?? '— не указан'}</dd></div>
            <div><dt>Отрасль</dt><dd>{c.industry ?? '—'}</dd></div>
            <div><dt>Сайт</dt><dd>{c.website ?? '—'}</dd></div>
            <div><dt>Контакты</dt><dd>{[c.email, c.phone].filter(Boolean).join(', ') || '—'}</dd></div>
            <div><dt>Юр. адрес</dt><dd>{c.legalAddress ?? '—'}</dd></div>
            <div><dt>Заявитель</dt><dd>{c.applicant ? `${c.applicant.displayName} (${c.applicant.jobTitle ?? 'должность не указана'}), ${c.applicant.email}` : '—'}</dd></div>
          </dl>
          {c.description && <p className={styles.itemBody}>{c.description}</p>}
          {c.moderationComment && !q.pending && <p className={styles.quote}>Комментарий: {c.moderationComment}</p>}
          {q.pending && (
            <DecisionBar requireRejectComment approveLabel="Опубликовать" onDecide={async (decision, comment) => {
              await moderationApi.decideCompany(token, c.id, { decision, comment })
              q.setItems((items) => items?.filter((x) => x.id !== c.id) ?? null)
              onChanged()
            }} />
          )}
        </article>
      ))}
    </QueueFrame>
  )
}

function RepresentativesQueue({ onChanged }: QueueProps) {
  const { token } = useAuth()
  const loader = useCallback(() => moderationApi.representatives(token), [token])
  const q = useQueue<PendingRepresentative>(loader, 'PENDING', [])
  if (!q.items) return <LoadingBlock />
  return (
    <QueueFrame title="Представители компаний" hint="Коллеги, приглашённые в уже проверенные компании. Убедитесь, что человек действительно работает директором или HR." error={q.error} empty={q.items.length === 0}>
      {q.items.map((r) => (
        <article key={r.userId} className={styles.item}>
          <div className={styles.itemHead}>
            <div><h3>{r.displayName}</h3><div className={styles.itemMeta}><span>{r.jobTitle ?? 'должность не указана'}</span><span>{r.email}</span></div></div>
            <Link className={styles.link} to={`/companies/${r.companySlug}`}>{r.companyName}</Link>
          </div>
          <DecisionBar approveLabel="Подтвердить" onDecide={async (decision, comment) => {
            await moderationApi.decideRepresentative(token, r.userId, { decision, comment })
            q.setItems((items) => items?.filter((x) => x.userId !== r.userId) ?? null)
            onChanged()
          }} />
        </article>
      ))}
    </QueueFrame>
  )
}

function ProfileQueue({ onChanged }: QueueProps) {
  const { token } = useAuth()
  const loader = useCallback((status: string) => moderationApi.profileChanges(token, status), [token])
  const q = useQueue<ChangeRequest>(loader, 'PENDING', ['APPROVED', 'REJECTED'])
  if (!q.items) return <LoadingBlock />
  return (
    <QueueFrame title="Изменения критичных данных" hint="Публичное имя, ФИО и email. Подмена имени может использоваться, чтобы выдать себя за другого сотрудника." filter={q.filter} error={q.error} empty={q.items.length === 0}>
      {q.items.map((r) => (
        <article key={r.id} className={styles.item}>
          <div className={styles.itemHead}>
            <div><h3>{r.fieldLabel}: {r.userName}</h3><div className={styles.itemMeta}><span>{r.userEmail}</span><span>{formatDateTime(r.createdAt)}</span></div></div>
            <Status value={r.status} />
          </div>
          <dl className={styles.facts}>
            <div><dt>Было</dt><dd>{r.oldValue ?? '—'}</dd></div>
            <div><dt>Станет</dt><dd><strong>{r.newValue}</strong></dd></div>
            <div><dt>Причина</dt><dd>{r.reason ?? '—'}</dd></div>
          </dl>
          {q.pending && (
            <DecisionBar onDecide={async (decision, comment) => {
              await moderationApi.decideProfileChange(token, r.id, { decision, comment })
              q.setItems((items) => items?.filter((x) => x.id !== r.id) ?? null)
              onChanged()
            }} />
          )}
        </article>
      ))}
    </QueueFrame>
  )
}

function DisciplineQueue({ onChanged }: QueueProps) {
  const { token } = useAuth()
  const loader = useCallback((status: string) => moderationApi.discipline(token, status), [token])
  const q = useQueue<DisciplineQueueItem>(loader, 'PENDING', ['CONFIRMED', 'REJECTED'])
  if (!q.items) return <LoadingBlock />
  return (
    <QueueFrame title="Замечания работодателей" hint="Подтверждённая запись видна другим работодателям и снижает рейтинг сотрудника на 5 баллов. Просите подтверждающие документы." filter={q.filter} error={q.error} empty={q.items.length === 0}>
      {q.items.map((d) => (
        <article key={d.id} className={styles.item}>
          <div className={styles.itemHead}>
            <div>
              <h3>{d.severityLabel}: {d.title}</h3>
              <div className={styles.itemMeta}>
                <span>Сотрудник: <Link className={styles.link} to={`/employees/${d.employeeId}`}>{d.employeeName}</Link></span>
                <span>{d.companyName}{d.reportedByName && ` · ${d.reportedByName}`}</span>
                <span>{formatDateTime(d.occurredOn)}</span>
              </div>
            </div>
            <Status value={d.status} />
          </div>
          <p className={styles.itemBody}>{d.description}</p>
          {q.pending && (
            <DecisionBar approveLabel="Подтвердить" onDecide={async (decision, comment) => {
              await moderationApi.decideDiscipline(token, d.id, { decision, comment })
              q.setItems((items) => items?.filter((x) => x.id !== d.id) ?? null)
              onChanged()
            }} />
          )}
        </article>
      ))}
    </QueueFrame>
  )
}

const TARGET_LABELS: Record<Complaint['targetType'], string> = { REVIEW: 'Отзыв', EVALUATION: 'Оценка работодателя', USER: 'Пользователь', COMPANY: 'Компания' }
const UPHOLD_EFFECT: Record<Complaint['targetType'], string> = {
  REVIEW: 'Отзыв будет скрыт, рейтинг компании пересчитан',
  EVALUATION: 'Оценка будет скрыта и перестанет влиять на рейтинг сотрудника',
  USER: 'Пользователю добавится подтверждённая запись в дисциплинарной истории',
  COMPANY: 'Решение будет зафиксировано; приостановить публикацию может администратор',
}

function ComplaintsQueue({ onChanged }: QueueProps) {
  const { token } = useAuth()
  const loader = useCallback((status: string) => moderationApi.complaints(token, status), [token])
  const q = useQueue<Complaint>(loader, 'OPEN', ['UPHELD', 'REJECTED'])
  if (!q.items) return <LoadingBlock />
  return (
    <QueueFrame title="Центр жалоб" hint="Арбитраж жалоб на отзывы, оценки работодателей, пользователей и компании." filter={q.filter} error={q.error} empty={q.items.length === 0}>
      {q.items.map((c) => (
        <article key={c.id} className={styles.item}>
          <div className={styles.itemHead}>
            <div><h3>{TARGET_LABELS[c.targetType]} · {c.reasonLabel}</h3><div className={styles.itemMeta}><span>от {c.authorName}</span><span>{formatDateTime(c.createdAt)}</span></div></div>
            <Status value={c.status} />
          </div>
          <p className={styles.quote}>{c.targetPreview} {c.targetLink && <Link className={styles.link} to={c.targetLink}>открыть</Link>}</p>
          <p className={styles.itemBody}>{c.details}</p>
          {c.resolution && <p className={`${styles.small} ${styles.muted}`}>Решение: {c.resolution}</p>}
          {q.pending && (
            <>
              <p className={`${styles.small} ${styles.muted}`} style={{ margin: '10px 0 0' }}>Если удовлетворить: {UPHOLD_EFFECT[c.targetType].toLowerCase()}.</p>
              <DecisionBar approveLabel="Удовлетворить" onDecide={async (decision, comment) => {
                await moderationApi.decideComplaint(token, c.id, { decision, comment })
                q.setItems((items) => items?.filter((x) => x.id !== c.id) ?? null)
                onChanged()
              }} />
            </>
          )}
        </article>
      ))}
    </QueueFrame>
  )
}

function AppealsQueue({ onChanged }: QueueProps) {
  const { token } = useAuth()
  const loader = useCallback((status: string) => moderationApi.appeals(token, status), [token])
  const q = useQueue<AppealQueueItem>(loader, 'PENDING', ['APPROVED', 'REJECTED'])
  if (!q.items) return <LoadingBlock />
  return (
    <QueueFrame title="Обжалования отзывов" hint="Заявки официальных представителей компаний. «Удовлетворить» скрывает отзыв." filter={q.filter} error={q.error} empty={q.items.length === 0}>
      {q.items.map((a) => (
        <article key={a.id} className={styles.item}>
          <div className={styles.itemHead}>
            <div><h3><Link className={styles.link} to={`/companies/${a.companySlug}`}>{a.companyName}</Link> · отзыв на {a.reviewOverall}/5</h3><div className={styles.itemMeta}><span>подал(а) {a.representativeName}</span><span>{formatDateTime(a.createdAt)}</span></div></div>
            <Status value={a.status} />
          </div>
          <p className={styles.quote}>{a.reviewText}</p>
          <p className={styles.itemBody}><strong>Довод представителя:</strong> {a.reason}</p>
          {a.moderatorComment && <p className={`${styles.small} ${styles.muted}`}>Решение: {a.moderatorComment}</p>}
          {q.pending && (
            <DecisionBar approveLabel="Скрыть отзыв" rejectLabel="Оставить" onDecide={async (decision, comment) => {
              await moderationApi.decideAppeal(token, a.id, { decision, comment })
              q.setItems((items) => items?.filter((x) => x.id !== a.id) ?? null)
              onChanged()
            }} />
          )}
        </article>
      ))}
    </QueueFrame>
  )
}

function TicketsQueue({ onChanged }: QueueProps) {
  const { token } = useAuth()
  const [onlyOpen, setOnlyOpen] = useState(true)
  const [loaded, setLoaded] = useState<{ onlyOpen: boolean; items: Ticket[]; error: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    moderationApi.tickets(token, onlyOpen)
      .then((items) => { if (!cancelled) setLoaded({ onlyOpen, items, error: '' }) })
      .catch((err) => { if (!cancelled) setLoaded({ onlyOpen, items: [], error: errorText(err) }) })
    return () => { cancelled = true }
  }, [token, onlyOpen])
  const items = loaded?.onlyOpen === onlyOpen ? loaded.items : null
  const error = loaded?.error ?? ''
  const setItems = (update: (items: Ticket[] | null) => Ticket[] | null) =>
    setLoaded((prev) => prev && { ...prev, items: update(prev.items) ?? [] })
  if (!items) return <LoadingBlock />
  const filter = (
    <select className={styles.inlineSelect} value={onlyOpen ? 'open' : 'all'} onChange={(e) => setOnlyOpen(e.target.value === 'open')} aria-label="Показать">
      <option value="open">Новые и в работе</option>
      <option value="all">Все обращения</option>
    </select>
  )
  return (
    <QueueFrame title="Обращения со страницы «Связаться с нами»" hint="Ответ увидит автор в личном кабинете; гостям отвечайте на указанный email." filter={filter} error={error} empty={items.length === 0}>
      {items.map((t) => <TicketItem key={t.id} ticket={t} onUpdated={(next) => { setItems((list) => list?.map((x) => x.id === next.id ? next : x) ?? null); onChanged() }} />)}
    </QueueFrame>
  )
}

function TicketItem({ ticket, onUpdated }: { ticket: Ticket; onUpdated: (ticket: Ticket) => void }) {
  const { token } = useAuth()
  const [response, setResponse] = useState(ticket.response ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const update = async (status: TicketStatus) => {
    setBusy(true)
    setError('')
    try { onUpdated(await moderationApi.updateTicket(token, ticket.id, status, response)) } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }

  return (
    <article className={styles.item}>
      <div className={styles.itemHead}>
        <div><h3>№{ticket.id} · {ticket.subject}</h3><div className={styles.itemMeta}><span>{ticket.topicLabel}</span><span>{ticket.name}, {ticket.email}{ticket.fromRegisteredUser ? '' : ' (гость)'}</span><span>{formatDateTime(ticket.createdAt)}</span></div></div>
        <Status value={ticket.status} />
      </div>
      <p className={styles.itemBody}>{ticket.message}</p>
      <textarea className={styles.inlineSelect} style={{ marginTop: 12, minHeight: 70, padding: 10, width: '100%' }} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Ответ пользователю" aria-label="Ответ пользователю" maxLength={4000} />
      <div className={styles.row} style={{ marginTop: 8 }}>
        <button type="button" className={styles.btn} disabled={busy} onClick={() => update('IN_PROGRESS')}>Взять в работу</button>
        <button type="button" className={`${styles.btn} ${styles.btnDark}`} disabled={busy} onClick={() => update('RESOLVED')}>Ответить и закрыть</button>
        <button type="button" className={styles.btn} disabled={busy} onClick={() => update('CLOSED')}>Закрыть без ответа</button>
        {error && <span className={styles.small} style={{ color: 'var(--c-bad)' }}>{error}</span>}
      </div>
    </article>
  )
}
