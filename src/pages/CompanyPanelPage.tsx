import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BadgeCheck, CheckCircle2, Clock3, ExternalLink, FileSearch, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { platformApi } from '../api/client'
import { ApiError } from '../api/errors'
import type { CompanyForm, CompanyPanel } from '../api/types'
import { useAuth } from '../auth/authContext'
import { CabinetLayout } from '../components/cabinet/CabinetLayout'
import { Avatar, ErrorNote, LoadingBlock, Status, StatusBadge, Tabs } from '../components/cabinet/ui'
import { errorText } from '../lib/cabinet'
import { CompanyFormEditor } from '../components/companypanel/CompanyFormEditor'
import { EMPTY_COMPANY } from '../lib/cabinet'
import { EmployeesTab } from '../components/companypanel/EmployeesTab'
import { formatScore } from '../lib/format'
import form from '../components/Form.module.css'
import styles from './Cabinet.module.css'

type Tab = 'profile' | 'representatives' | 'employees'

export function CompanyPanelPage() {
  const { token, refreshUser } = useAuth()
  const [panel, setPanel] = useState<CompanyPanel | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'none' | 'error'>('loading')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('profile')

  const load = useCallback(() => {
    platformApi.companyPanel(token)
      .then((value) => { setPanel(value); setState('ready') })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setState('none')
        else { setError(errorText(err)); setState('error') }
      })
  }, [token])
  useEffect(load, [load])

  const applyPanel = (next: CompanyPanel) => { setPanel(next); setState('ready') }

  if (state === 'loading') return <CabinetLayout kicker="Панель компании" title="Загружаем…"><LoadingBlock /></CabinetLayout>
  if (state === 'error') return <CabinetLayout kicker="Панель компании" title="Панель компании"><ErrorNote error={error} /></CabinetLayout>

  if (state === 'none' || !panel) {
    return (
      <CabinetLayout
        kicker="Панель компании"
        title="Добавьте компанию в реестр"
        subtitle="Заполните профиль организации. Модератор сверит данные с открытыми реестрами — после этого компания появится в поиске, а вы станете её подтверждённым представителем."
      >
        <ol className={styles.grid3} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {[
            [<FileSearch key="i" size={18} />, 'Заявка', 'Заполняете профиль — компания получает статус «на проверке» и не видна в поиске.'],
            [<ShieldCheck key="i" size={18} />, 'Проверка', 'Модератор сверяет ИНН/IDNO и юридические данные. При отказе вы увидите причину и сможете исправить.'],
            [<BadgeCheck key="i" size={18} />, 'Публикация', 'Компания в каталоге, вы — подтверждённый представитель: ведёте штат, оцениваете сотрудников, приглашаете HR.'],
          ].map(([icon, title, text], index) => (
            <li key={index} className={styles.card}>
              <p className={styles.kicker}>Шаг {index + 1}</p>
              <div className={styles.row}>{icon}<strong>{title}</strong></div>
              <p className={`${styles.small} ${styles.muted}`} style={{ lineHeight: 1.5, marginBottom: 0 }}>{text}</p>
            </li>
          ))}
        </ol>
        <CompanyFormEditor
          initial={EMPTY_COMPANY}
          mode="register"
          submitLabel="Отправить на проверку"
          onSubmit={async (value) => { applyPanel(await platformApi.registerCompany(token, value)); await refreshUser() }}
        />
      </CabinetLayout>
    )
  }

  const { company, stats } = panel
  return (
    <CabinetLayout
      kicker="Панель компании"
      title={company.name}
      subtitle={<>{company.legalName} · {company.city}, {company.country}</>}
      aside={company.status === 'APPROVED' ? <Link className={styles.btn} to={`/companies/${company.slug}`}><ExternalLink size={14} aria-hidden="true" /> Публичная страница</Link> : undefined}
    >
      <StatusBanner panel={panel} />

      <div className={styles.kpis}>
        <div className={styles.kpi}><span>Статус в реестре</span><strong style={{ fontSize: 16 }}><Status value={company.status} labels={{ APPROVED: 'Опубликована', PENDING: 'На проверке' }} /></strong></div>
        <div className={styles.kpi}><span>Рейтинг</span><strong>{formatScore(stats.averageRating)}</strong><small>{stats.reviewsCount} отзывов</small></div>
        <div className={styles.kpi}><span>Сотрудников в истории</span><strong>{stats.employeesTotal}</strong><small>работают сейчас: {stats.employeesCurrent}</small></div>
        <div className={`${styles.kpi} ${stats.pendingAppeals > 0 ? styles.kpiAlert : ''}`}><span>Обжалований на проверке</span><strong>{stats.pendingAppeals}</strong></div>
      </div>

      <Tabs<Tab>
        label="Разделы панели"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'profile', label: 'Профиль компании' },
          { id: 'representatives', label: 'Представители', count: panel.representatives.filter((r) => !r.verified).length },
          { id: 'employees', label: 'Сотрудники' },
        ]}
      />

      {tab === 'profile' && (
        <CompanyFormEditor
          key={company.id}
          initial={toForm(panel)}
          mode="update"
          legalLocked={company.status === 'APPROVED'}
          submitLabel={company.status === 'REJECTED' ? 'Исправить и отправить повторно' : 'Сохранить изменения'}
          onSubmit={async (value) => applyPanel(await platformApi.updateCompany(token, value))}
        />
      )}
      {tab === 'representatives' && <RepresentativesTab panel={panel} onChange={applyPanel} />}
      {tab === 'employees' && (panel.canManage
        ? <EmployeesTab />
        : <p className={styles.notice}><Clock3 size={16} aria-hidden="true" /> Вести штат можно после публикации компании и подтверждения вашего статуса модератором.</p>)}
    </CabinetLayout>
  )
}

function toForm(panel: CompanyPanel): CompanyForm {
  const c = panel.company
  return {
    name: c.name, legalName: c.legalName, inn: c.inn, country: c.country, city: c.city, legalAddress: c.legalAddress,
    actualAddress: c.actualAddress, phone: c.phone, email: c.email, website: c.website, industry: c.industry,
    employeesCount: c.employeesCount, foundedYear: c.foundedYear, description: c.description, logoUrl: c.logoUrl, bannerUrl: c.bannerUrl,
  }
}

function StatusBanner({ panel }: { panel: CompanyPanel }) {
  const { company } = panel
  const you = panel.representatives.find((r) => r.you)
  if (company.status === 'PENDING') {
    return <p className={styles.notice}><Clock3 size={16} aria-hidden="true" /> Заявка на проверке у модератора. Пока компания не видна в поиске, данные можно уточнять.</p>
  }
  if (company.status === 'REJECTED') {
    return (
      <p className={`${styles.notice} ${styles.noticeBad}`}>
        <AlertTriangle size={16} aria-hidden="true" />
        <span>Заявка отклонена{company.moderationComment ? `: «${company.moderationComment}»` : ''}. Исправьте данные — после сохранения заявка снова уйдёт на проверку.</span>
      </p>
    )
  }
  if (company.status === 'SUSPENDED') {
    return <p className={`${styles.notice} ${styles.noticeBad}`}><AlertTriangle size={16} aria-hidden="true" /> Публикация приостановлена администратором{company.moderationComment ? `: «${company.moderationComment}»` : ''}.</p>
  }
  if (you && !you.verified) {
    return <p className={styles.notice}><Clock3 size={16} aria-hidden="true" /> Ваш статус представителя проверяется модератором. До подтверждения доступен только просмотр.</p>
  }
  return <p className={`${styles.notice} ${styles.noticeGood}`}><CheckCircle2 size={16} aria-hidden="true" /> Компания проверена и опубликована. Изменения оформления применяются сразу.</p>
}

function RepresentativesTab({ panel, onChange }: { panel: CompanyPanel; onChange: (panel: CompanyPanel) => void }) {
  const { token } = useAuth()
  const [email, setEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('HR-директор')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const invite = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      onChange(await platformApi.inviteRepresentative(token, email, jobTitle))
      setEmail('')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (userId: number) => {
    setError('')
    try { onChange(await platformApi.removeRepresentative(token, userId)) } catch (err) { setError(errorText(err)) }
  }

  return (
    <div className={styles.split}>
      <section className={styles.card}>
        <div className={styles.cardHead}><div><h2>Официальные представители</h2><p>Показываются на странице компании со значком «Подтверждён».</p></div></div>
        <ul className={styles.stack} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {panel.representatives.map((r) => (
            <li key={r.id} className={styles.row} style={{ borderTop: '1px solid var(--c-line-soft)', paddingTop: 12 }}>
              <Avatar name={r.displayName} url={r.avatarUrl} size={40} />
              <span className={`${styles.cellMain} ${styles.spacer}`}><strong>{r.displayName}{r.you && ' (вы)'}</strong><small>{r.jobTitle ?? 'Представитель'} · {r.email}</small></span>
              {r.verified ? <StatusBadge tone="good">Подтверждён</StatusBadge> : <StatusBadge tone="warn">Ждёт модератора</StatusBadge>}
              {panel.canManage && !r.you && (
                <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => remove(r.id)} aria-label={`Отозвать статус у ${r.displayName}`}><Trash2 size={13} aria-hidden="true" /></button>
              )}
            </li>
          ))}
        </ul>
        {error && <ErrorNote error={error} />}
      </section>
      {panel.canManage && (
        <form className={`${styles.card} ${form.form}`} onSubmit={invite} noValidate>
          <div className={styles.cardHead}><div><h3><UserPlus size={16} aria-hidden="true" /> Пригласить коллегу</h3><p>Директор, HR или рекрутер. Статус активируется после проверки модератором.</p></div></div>
          <label className={form.field}><span className={form.label}>Email аккаунта</span><input className={form.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className={form.field}><span className={form.label}>Должность</span><input className={form.input} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={120} /></label>
          <div className={form.actions}><button className={form.primary} type="submit" disabled={busy || !email}>{busy ? 'Отправляем…' : 'Пригласить'}</button></div>
        </form>
      )}
    </div>
  )
}
