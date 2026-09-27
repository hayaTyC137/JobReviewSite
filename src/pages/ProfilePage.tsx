import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Building2, CheckCircle2, Inbox, KeyRound, LifeBuoy, Lock, MessageSquareWarning, Save } from 'lucide-react'
import { platformApi } from '../api/client'
import type { ChangeRequest, Complaint, EmployeeProfile, EmploymentEntry, ProfileField, Ticket } from '../api/types'
import { ROLE_LABELS, useAuth } from '../auth/authContext'
import { CabinetLayout } from '../components/cabinet/CabinetLayout'
import { EmptyState, ErrorNote, ImageUpload, LoadingBlock, Status, Tabs } from '../components/cabinet/ui'
import { errorText, formatDateTime } from '../lib/cabinet'
import { ComplaintDialog } from '../components/ComplaintDialog'
import { EmployeeCard } from '../components/employee/EmployeeCard'
import { citiesOf, useLocations } from '../lib/useLocations'
import form from '../components/Form.module.css'
import styles from './Cabinet.module.css'

type Tab = 'card' | 'profile' | 'requests'

export function ProfilePage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('card')
  if (!user) return null

  return (
    <CabinetLayout
      kicker={`Личный кабинет · ${ROLE_LABELS[user.role]}`}
      title={user.displayName}
      subtitle={user.role === 'REPRESENTATIVE'
        ? <>Вы представляете <strong>{user.companyName}</strong>. Управление компанией — в <Link className={styles.link} to="/company-panel">панели компании</Link>.</>
        : 'Ваша карточка сотрудника, данные профиля и статус обращений.'}
      aside={user.role === 'REPRESENTATIVE' ? <Link className={`${styles.btn} ${styles.btnDark}`} to="/company-panel"><Building2 size={15} aria-hidden="true" /> Панель компании</Link> : undefined}
    >
      <Tabs<Tab>
        label="Разделы кабинета"
        value={tab}
        onChange={setTab}
        items={[{ id: 'card', label: 'Карточка сотрудника' }, { id: 'profile', label: 'Профиль' }, { id: 'requests', label: 'Обращения и заявки' }]}
      />
      {tab === 'card' && <CardTab />}
      {tab === 'profile' && <ProfileTab />}
      {tab === 'requests' && <RequestsTab />}
    </CabinetLayout>
  )
}

function CardTab() {
  const { token } = useAuth()
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [error, setError] = useState('')
  const [dispute, setDispute] = useState<EmploymentEntry | null>(null)

  useEffect(() => {
    platformApi.myEmployeeProfile(token).then(setProfile).catch((err) => setError(errorText(err)))
  }, [token])

  if (error) return <ErrorNote error={error} />
  if (!profile) return <LoadingBlock />
  return (
    <>
      <EmployeeCard profile={profile} onDisputeEvaluation={setDispute} />
      <ComplaintDialog
        target={dispute?.evaluation ? { type: 'EVALUATION', id: dispute.evaluation.id, label: `${dispute.companyName}: оценка от ${dispute.evaluation.authorName}` } : null}
        onClose={() => setDispute(null)}
      />
    </>
  )
}

// ---------- Профиль ----------

const CRITICAL: Array<{ field: ProfileField; label: string; hint: string }> = [
  { field: 'DISPLAY_NAME', label: 'Публичное имя', hint: 'Подпись под отзывами' },
  { field: 'FULL_NAME', label: 'ФИО', hint: 'По нему работодатель находит вас в трудовой истории. Не публикуется.' },
  { field: 'EMAIL', label: 'Email', hint: 'Логин и адрес для ответов поддержки' },
]

function ProfileTab() {
  const { user, token, updateUser } = useAuth()
  const locations = useLocations()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null)
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '')
  const [country, setCountry] = useState(user?.country ?? '')
  const [city, setCity] = useState(user?.city ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [requests, setRequests] = useState<ChangeRequest[]>([])

  const loadRequests = useCallback(() => {
    platformApi.myChangeRequests(token).then(setRequests).catch(() => setRequests([]))
  }, [token])
  useEffect(loadRequests, [loadRequests])

  if (!user) return null

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setSaved(false)
    setError('')
    try {
      const updated = await platformApi.updateProfile(token, {
        avatarUrl, jobTitle: jobTitle || null, country: country || null, city: city || null, bio: bio || null,
      })
      updateUser(updated)
      setSaved(true)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const currentValue = (field: ProfileField) => field === 'DISPLAY_NAME' ? user.displayName : field === 'FULL_NAME' ? user.fullName ?? '' : user.email

  return (
    <div className={styles.split}>
      <form className={`${styles.card} ${form.form}`} onSubmit={save} noValidate>
        <div className={styles.cardHead}>
          <div><h2>Основные данные</h2><p>Меняются сразу, без проверки.</p></div>
        </div>
        <ImageUpload value={avatarUrl} onChange={setAvatarUrl} label="Аватар" hint="PNG, JPEG или WebP до 2 МБ" shape="round" fallback={user.displayName} />
        <div className={styles.formGrid}>
          <label className={form.field}>
            <span className={form.label}>Должность</span>
            <input className={form.input} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={120} />
          </label>
          <label className={form.field}>
            <span className={form.label}>Страна</span>
            <select className={form.select} value={country} onChange={(e) => { setCountry(e.target.value); setCity('') }}>
              <option value="">Не указана</option>
              {locations?.countries.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className={form.field}>
            <span className={form.label}>Город</span>
            <select className={form.select} value={city} onChange={(e) => setCity(e.target.value)} disabled={!country}>
              <option value="">Не указан</option>
              {city && !citiesOf(locations, country).includes(city) && <option>{city}</option>}
              {citiesOf(locations, country).map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className={`${form.field} ${styles.full}`}>
            <span className={form.label}>О себе</span>
            <textarea className={form.textarea} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={600} placeholder="Чем занимаетесь, какой опыт" />
            <span className={form.counter}>{bio.length} / 600</span>
          </label>
        </div>
        {error && <ErrorNote error={error} />}
        {saved && <p className={form.success}>Профиль сохранён.</p>}
        <div className={form.actions}>
          <button className={form.primary} type="submit" disabled={busy}><Save size={15} aria-hidden="true" /> {busy ? 'Сохраняем…' : 'Сохранить'}</button>
        </div>
      </form>

      <div className={styles.stack}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <div><h2><Lock size={16} aria-hidden="true" /> Критичные данные</h2><p>Меняются только после проверки модератором — так никто не выдаст себя за другого сотрудника.</p></div>
          </div>
          <div className={styles.stack}>
            {CRITICAL.map((item) => (
              <CriticalField
                key={item.field}
                {...item}
                current={currentValue(item.field)}
                pending={requests.find((r) => r.field === item.field && r.status === 'PENDING')}
                onRequested={loadRequests}
              />
            ))}
          </div>
        </div>
        {requests.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHead}><div><h3>История заявок</h3></div></div>
            <ul className={styles.stack} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {requests.map((r) => (
                <li key={r.id} className={styles.row}>
                  <Status value={r.status} />
                  <span className={styles.small}><strong>{r.fieldLabel}:</strong> {r.newValue}</span>
                  <span className={`${styles.small} ${styles.muted}`}>{formatDateTime(r.createdAt)}{r.moderatorComment && ` · ${r.moderatorComment}`}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function CriticalField({ field, label, hint, current, pending, onRequested }: {
  field: ProfileField; label: string; hint: string; current: string; pending?: ChangeRequest; onRequested: () => void
}) {
  const { token } = useAuth()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await platformApi.requestProfileChange(token, { field, newValue: value, reason: reason || undefined })
      setEditing(false)
      setValue('')
      setReason('')
      onRequested()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--c-line-soft)', paddingTop: 12 }}>
      <div className={styles.row}>
        <div className={styles.spacer}>
          <span className={styles.kicker}>{label}</span>
          <div style={{ fontWeight: 650, overflowWrap: 'anywhere' }}>{current || <span className={styles.muted}>не указано</span>}</div>
          <small className={styles.muted}>{hint}</small>
        </div>
        {pending
          ? <Status value="PENDING" labels={{ PENDING: `Заявка: «${pending.newValue}»` }} />
          : !editing && <button type="button" className={styles.btn} onClick={() => setEditing(true)}><KeyRound size={14} aria-hidden="true" /> Изменить</button>}
      </div>
      {editing && (
        <form className={form.form} onSubmit={submit} style={{ marginTop: 10 }} noValidate>
          <input className={form.input} value={value} onChange={(e) => setValue(e.target.value)} placeholder={`Новое значение: ${label.toLowerCase()}`} type={field === 'EMAIL' ? 'email' : 'text'} maxLength={160} required />
          <input className={form.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина изменения (поможет модератору)" maxLength={500} />
          {error && <span className={form.fieldError}>{error}</span>}
          <div className={form.actions}>
            <button type="button" className={form.secondary} onClick={() => setEditing(false)}>Отмена</button>
            <button type="submit" className={form.primary} disabled={busy || !value.trim()}>{busy ? 'Отправляем…' : 'Отправить на проверку'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

// ---------- Обращения и жалобы ----------

function RequestsTab() {
  const { token } = useAuth()
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [complaints, setComplaints] = useState<Complaint[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    platformApi.myTickets(token).then(setTickets).catch((err) => { setTickets([]); setError(errorText(err)) })
    platformApi.myComplaints(token).then(setComplaints).catch(() => setComplaints([]))
  }, [token])

  if (!tickets || !complaints) return <LoadingBlock />

  return (
    <div className={styles.grid2}>
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div><h2><LifeBuoy size={16} aria-hidden="true" /> Обращения в поддержку</h2><p>Статус и ответы модераторов.</p></div>
          <Link to="/contact" className={styles.btn}>Новое обращение</Link>
        </div>
        {error && <ErrorNote error={error} />}
        {tickets.length === 0
          ? <EmptyState icon={<Inbox size={22} />} title="Обращений нет">Если что-то пошло не так — напишите нам.</EmptyState>
          : <div className={styles.queue}>{tickets.map((t) => (
            <article key={t.id} className={styles.item}>
              <div className={styles.itemHead}><h3>{t.subject}</h3><Status value={t.status} /></div>
              <div className={styles.itemMeta}><span>{t.topicLabel}</span><span>{formatDateTime(t.createdAt)}</span></div>
              <p className={styles.itemBody}>{t.message}</p>
              {t.response && <p className={styles.quote}><CheckCircle2 size={13} aria-hidden="true" /> <strong>Ответ{t.handledByName ? ` (${t.handledByName})` : ''}:</strong> {t.response}</p>}
            </article>
          ))}</div>}
      </section>
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div><h2><MessageSquareWarning size={16} aria-hidden="true" /> Мои жалобы</h2><p>Жалобы на отзывы, оценки и пользователей.</p></div>
        </div>
        {complaints.length === 0
          ? <EmptyState title="Жалоб нет">Пожаловаться можно на странице отзыва или в карточке оценки.</EmptyState>
          : <div className={styles.queue}>{complaints.map((c) => (
            <article key={c.id} className={styles.item}>
              <div className={styles.itemHead}><h3>{c.reasonLabel}</h3><Status value={c.status} /></div>
              <p className={styles.quote}>{c.targetPreview}</p>
              <div className={styles.itemMeta}><span>{formatDateTime(c.createdAt)}</span>{c.resolution && <span>Решение: {c.resolution}</span>}</div>
            </article>
          ))}</div>}
      </section>
    </div>
  )
}
