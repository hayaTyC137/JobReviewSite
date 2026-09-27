import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Eye, EyeOff, RefreshCw, Save, Search, ShieldCheck, Unlock } from 'lucide-react'
import { adminApi } from '../api/client'
import type { AdminDashboard, AdminReview, AdminUser, CompanyProfile, CompanyStatus, Page, ReviewStatus, Role, Setting } from '../api/types'
import { ROLE_LABELS, useAuth } from '../auth/authContext'
import { CabinetLayout } from '../components/cabinet/CabinetLayout'
import { ErrorNote, LoadingBlock, Status, StatusBadge, Tabs } from '../components/cabinet/ui'
import { errorText, formatDateTime } from '../lib/cabinet'
import { ColumnChart, LoadSparkline } from '../components/charts/MiniCharts'
import { formatMonthShort, formatScore } from '../lib/format'
import styles from './Cabinet.module.css'

type Tab = 'dashboard' | 'users' | 'reviews' | 'companies' | 'settings'

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  return (
    <CabinetLayout kicker="Администрирование" title="Управление платформой" subtitle="Сквозная аналитика, пользователи и роли, база отзывов, реестр компаний и системные настройки. Модерационные очереди — в разделе «Модерация».">
      <div className={styles.row}>
        <Tabs<Tab>
          label="Разделы администрирования"
          value={tab}
          onChange={setTab}
          items={[{ id: 'dashboard', label: 'Дашборд' }, { id: 'users', label: 'Пользователи' }, { id: 'reviews', label: 'Отзывы' }, { id: 'companies', label: 'Компании' }, { id: 'settings', label: 'Настройки' }]}
        />
        <span className={styles.spacer} />
        <Link to="/moderation" className={styles.btn}><ShieldCheck size={14} aria-hidden="true" /> Очереди модерации</Link>
      </div>
      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'reviews' && <ReviewsTab />}
      {tab === 'companies' && <CompaniesTab />}
      {tab === 'settings' && <SettingsTab />}
    </CabinetLayout>
  )
}

// ---------- Дашборд ----------

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return d > 0 ? `${d} д ${h} ч` : h > 0 ? `${h} ч ${m} мин` : `${m} мин`
}

function DashboardTab() {
  const { token } = useAuth()
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    adminApi.dashboard(token).then(setData).catch((err) => setError(errorText(err)))
  }, [token])
  useEffect(load, [load])

  if (error) return <ErrorNote error={error} />
  if (!data) return <LoadingBlock />
  const { totals, monthly, load: server, topCompanies } = data
  const queues = totals.openComplaints + totals.openTickets + totals.pendingAppeals + totals.pendingProfileChanges + totals.pendingDiscipline + totals.companiesPending
  const maxTop = Math.max(...topCompanies.map((c) => c.reviewsLast90Days), 1)

  return (
    <div className={styles.stack} style={{ gap: 22 }}>
      <div className={styles.kpis}>
        <div className={styles.kpi}><span>Пользователи</span><strong>{totals.users}</strong><small>входов за сутки: {totals.loginsLast24h} · заблокировано: {totals.blockedUsers}</small></div>
        <div className={styles.kpi}><span>Команда</span><strong>{totals.representatives}</strong><small>представителей · {totals.moderators} мод. · {totals.admins} адм.</small></div>
        <div className={styles.kpi}><span>Компании в реестре</span><strong>{totals.companiesApproved}</strong><small>на проверке: {totals.companiesPending} · приостановлено: {totals.companiesSuspended}</small></div>
        <div className={styles.kpi}><span>Отзывы</span><strong>{totals.reviewsPublished + totals.reviewsUnderAppeal}</strong><small>обжалуется: {totals.reviewsUnderAppeal} · скрыто: {totals.reviewsHidden}</small></div>
        <div className={`${styles.kpi} ${queues > 0 ? styles.kpiAlert : ''}`}><span>В очередях модерации</span><strong>{queues}</strong><small>жалоб: {totals.openComplaints} · обращений: {totals.openTickets}</small></div>
      </div>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div><h2>Динамика за 12 месяцев</h2><p>Три показателя разного масштаба — отдельными графиками с собственной шкалой, а не на двух осях.</p></div>
          <button type="button" className={styles.btn} onClick={load}><RefreshCw size={13} aria-hidden="true" /> Обновить</button>
        </div>
        <div className={styles.grid3}>
          <ColumnChart title="Новые отзывы" points={monthly.map((m) => ({ label: formatMonthShort(m.month), value: m.newReviews }))} />
          <ColumnChart title="Новые пользователи" points={monthly.map((m) => ({ label: formatMonthShort(m.month), value: m.newUsers }))} />
          <ColumnChart title="Заявки компаний" points={monthly.map((m) => ({ label: formatMonthShort(m.month), value: m.newCompanies }))} />
        </div>
        <details style={{ marginTop: 14 }}>
          <summary className={`${styles.small} ${styles.muted}`} style={{ cursor: 'pointer' }}>Показать таблицей</summary>
          <div className={styles.tableWrap}>
            <table className={styles.table} style={{ minWidth: 480 }}>
              <thead><tr><th>Месяц</th><th>Отзывы</th><th>Пользователи</th><th>Компании</th></tr></thead>
              <tbody>{monthly.map((m) => <tr key={m.month}><td>{m.month}</td><td>{m.newReviews}</td><td>{m.newUsers}</td><td>{m.newCompanies}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      </section>

      <div className={styles.split}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><h2>Нагрузка API</h2><p>Запросы к /api за последний час, по минутам (метрики экземпляра бэкенда).</p></div></div>
          <LoadSparkline title="Запросов в минуту" values={server.requestsPerMinute} />
          <dl className={styles.facts} style={{ marginTop: 16 }}>
            <div><dt>Запросов за час</dt><dd>{server.requestsLastHour}</dd></div>
            <div><dt>Ошибок 5xx</dt><dd>{server.errorsLastHour}</dd></div>
            <div><dt>Среднее время ответа</dt><dd>{server.averageLatencyMs} мс</dd></div>
            <div><dt>Память JVM</dt><dd>{server.heapUsedMb} / {server.heapMaxMb} МБ</dd></div>
            <div><dt>Аптайм</dt><dd>{formatUptime(server.uptimeSeconds)}</dd></div>
          </dl>
        </section>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><h2>Активность компаний</h2><p>Больше всего отзывов за 90 дней.</p></div></div>
          {topCompanies.length === 0 ? <p className={styles.muted}>Нет отзывов за период.</p> : (
            <ol className={styles.stack} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {topCompanies.map((c) => (
                <li key={c.slug} style={{ display: 'grid', gap: 6 }}>
                  <div className={styles.row}><Link className={styles.link} to={`/companies/${c.slug}`}>{c.name}</Link><span className={styles.spacer} /><span className={styles.small}>рейтинг {formatScore(c.rating)}</span></div>
                  <div className={styles.row} style={{ flexWrap: 'nowrap' }}>
                    <span style={{ background: 'var(--c-chart-1)', borderRadius: '0 4px 4px 0', display: 'block', height: 10, width: `${(c.reviewsLast90Days / maxTop) * 100}%` }} aria-hidden="true" />
                    <strong className={styles.small}>{c.reviewsLast90Days}</strong>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

// ---------- Пользователи ----------

function Pager<T>({ page, onPage }: { page: Page<T>; onPage: (page: number) => void }) {
  if (page.totalPages <= 1) return null
  return (
    <div className={styles.pager}>
      <span>стр. {page.page + 1} из {page.totalPages} · всего {page.totalItems}</span>
      <button type="button" className={styles.btn} disabled={page.page === 0} onClick={() => onPage(page.page - 1)}>Назад</button>
      <button type="button" className={styles.btn} disabled={page.page + 1 >= page.totalPages} onClick={() => onPage(page.page + 1)}>Вперёд</button>
    </div>
  )
}

function UsersTab() {
  const { token, user: me } = useAuth()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [blocked, setBlocked] = useState<'' | 'true' | 'false'>('')
  const [pageNo, setPageNo] = useState(0)
  const [page, setPage] = useState<Page<AdminUser> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      adminApi.users(token, { q: query, role, blocked: blocked === '' ? '' : blocked === 'true', page: pageNo })
        .then(setPage).catch((err) => setError(errorText(err)))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [token, query, role, blocked, pageNo])

  const replace = (next: AdminUser) => setPage((p) => p && { ...p, items: p.items.map((u) => u.id === next.id ? next : u) })

  const changeRole = async (target: AdminUser, nextRole: Role) => {
    setError('')
    let companyId: number | null = null
    if (nextRole === 'REPRESENTATIVE') {
      const raw = window.prompt('ID компании, которую будет представлять пользователь:', String(target.companyId ?? ''))
      if (!raw) return
      companyId = Number(raw)
    }
    try { replace(await adminApi.changeRole(token, target.id, nextRole, companyId)) } catch (err) { setError(errorText(err)) }
  }

  const toggleBlock = async (target: AdminUser) => {
    setError('')
    let reason: string | undefined
    if (!target.blocked) {
      reason = window.prompt(`Причина блокировки ${target.displayName}:`) ?? undefined
      if (!reason) return
    }
    try { replace(await adminApi.changeBlock(token, target.id, !target.blocked, reason)) } catch (err) { setError(errorText(err)) }
  }

  return (
    <section className={styles.card}>
      <div className={styles.toolbar}>
        <Search size={16} aria-hidden="true" className={styles.muted} />
        <input value={query} onChange={(e) => { setQuery(e.target.value); setPageNo(0) }} placeholder="Email или имя" aria-label="Поиск пользователей" />
        <select value={role} onChange={(e) => { setRole(e.target.value as Role | ''); setPageNo(0) }} aria-label="Роль">
          <option value="">Все роли</option>
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={blocked} onChange={(e) => { setBlocked(e.target.value as '' | 'true' | 'false'); setPageNo(0) }} aria-label="Блокировка">
          <option value="">Все</option>
          <option value="false">Активные</option>
          <option value="true">Заблокированные</option>
        </select>
      </div>
      {error && <ErrorNote error={error} />}
      {!page ? <LoadingBlock /> : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Пользователь</th><th>Роль</th><th>Вход</th><th>Статус</th><th>Последний вход</th><th /></tr></thead>
              <tbody>
                {page.items.map((u) => {
                  const self = u.id === me?.id
                  return (
                    <tr key={u.id}>
                      <td><span className={styles.cellMain}><strong>{u.displayName}{self && ' (вы)'}</strong><small>{u.email}{u.companyName && ` · ${u.companyName}`}</small></span></td>
                      <td>
                        <select className={styles.inlineSelect} value={u.role} disabled={self} onChange={(e) => changeRole(u, e.target.value as Role)} aria-label={`Роль ${u.displayName}`}>
                          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      </td>
                      <td className={styles.small}>{u.authProvider === 'LOCAL' ? 'пароль' : u.authProvider.toLowerCase()}</td>
                      <td>{u.blocked ? <span title={u.blockedReason ?? ''}><StatusBadge tone="bad">Заблокирован</StatusBadge></span> : <StatusBadge tone="good">Активен</StatusBadge>}</td>
                      <td className={styles.small}>{formatDateTime(u.lastLoginAt)}</td>
                      <td>
                        {!self && (
                          <button type="button" className={`${styles.btn} ${u.blocked ? '' : styles.btnDanger}`} onClick={() => toggleBlock(u)}>
                            {u.blocked ? <><Unlock size={13} aria-hidden="true" /> Разблокировать</> : <><Ban size={13} aria-hidden="true" /> Заблокировать</>}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pager page={page} onPage={setPageNo} />
        </>
      )}
      <p className={`${styles.small} ${styles.muted}`}>Роли и блокировки действуют сразу: права проверяются по базе при каждом запросе, повторный вход не нужен.</p>
    </section>
  )
}

// ---------- Отзывы ----------

function ReviewsTab() {
  const { token } = useAuth()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ReviewStatus | ''>('')
  const [pageNo, setPageNo] = useState(0)
  const [page, setPage] = useState<Page<AdminReview> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      adminApi.reviews(token, { q: query, status, page: pageNo }).then(setPage).catch((err) => setError(errorText(err)))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [token, query, status, pageNo])

  const toggle = async (review: AdminReview) => {
    setError('')
    try {
      const next = await adminApi.changeReviewStatus(token, review.id, review.status === 'HIDDEN' ? 'PUBLISHED' : 'HIDDEN')
      setPage((p) => p && { ...p, items: p.items.map((r) => r.id === next.id ? next : r) })
    } catch (err) { setError(errorText(err)) }
  }

  return (
    <section className={styles.card}>
      <div className={styles.toolbar}>
        <Search size={16} aria-hidden="true" className={styles.muted} />
        <input value={query} onChange={(e) => { setQuery(e.target.value); setPageNo(0) }} placeholder="Текст, компания или автор" aria-label="Поиск отзывов" />
        <select value={status} onChange={(e) => { setStatus(e.target.value as ReviewStatus | ''); setPageNo(0) }} aria-label="Статус">
          <option value="">Все статусы</option>
          <option value="PUBLISHED">Опубликованные</option>
          <option value="UNDER_APPEAL">Обжалуются</option>
          <option value="HIDDEN">Скрытые</option>
        </select>
      </div>
      {error && <ErrorNote error={error} />}
      {!page ? <LoadingBlock /> : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Компания</th><th>Автор</th><th>Оценка</th><th>Текст</th><th>Статус</th><th /></tr></thead>
              <tbody>
                {page.items.map((r) => (
                  <tr key={r.id}>
                    <td><span className={styles.cellMain}><Link className={styles.link} to={`/companies/${r.companySlug}`}>{r.companyName}</Link><small>{formatDateTime(r.createdAt)}</small></span></td>
                    <td><span className={styles.cellMain}><strong>{r.authorName}</strong><small>{r.position}</small></span></td>
                    <td><strong>{r.overall}</strong>/5</td>
                    <td><span className={styles.clamp}>{r.text}</span></td>
                    <td><Status value={r.status} /></td>
                    <td>
                      {r.status !== 'UNDER_APPEAL' && (
                        <button type="button" className={`${styles.btn} ${r.status === 'HIDDEN' ? '' : styles.btnDanger}`} onClick={() => toggle(r)}>
                          {r.status === 'HIDDEN' ? <><Eye size={13} aria-hidden="true" /> Вернуть</> : <><EyeOff size={13} aria-hidden="true" /> Скрыть</>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} onPage={setPageNo} />
        </>
      )}
    </section>
  )
}

// ---------- Компании ----------

const COMPANY_STATUSES: Array<[CompanyStatus, string]> = [['APPROVED', 'Опубликована'], ['PENDING', 'На проверке'], ['REJECTED', 'Отклонена'], ['SUSPENDED', 'Приостановлена']]

function CompaniesTab() {
  const { token } = useAuth()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<CompanyStatus | ''>('')
  const [pageNo, setPageNo] = useState(0)
  const [page, setPage] = useState<Page<CompanyProfile> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      adminApi.companies(token, { q: query, status, page: pageNo }).then(setPage).catch((err) => setError(errorText(err)))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [token, query, status, pageNo])

  const change = async (company: CompanyProfile, next: CompanyStatus) => {
    setError('')
    const comment = next === 'SUSPENDED' || next === 'REJECTED' ? window.prompt('Причина (увидит представитель компании):') ?? undefined : undefined
    if ((next === 'SUSPENDED' || next === 'REJECTED') && !comment) return
    try {
      const updated = await adminApi.changeCompanyStatus(token, company.id, next, comment)
      setPage((p) => p && { ...p, items: p.items.map((c) => c.id === updated.id ? updated : c) })
    } catch (err) { setError(errorText(err)) }
  }

  return (
    <section className={styles.card}>
      <div className={styles.toolbar}>
        <Search size={16} aria-hidden="true" className={styles.muted} />
        <input value={query} onChange={(e) => { setQuery(e.target.value); setPageNo(0) }} placeholder="Название или юр. наименование" aria-label="Поиск компаний" />
        <select value={status} onChange={(e) => { setStatus(e.target.value as CompanyStatus | ''); setPageNo(0) }} aria-label="Статус">
          <option value="">Все статусы</option>
          {COMPANY_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {error && <ErrorNote error={error} />}
      {!page ? <LoadingBlock /> : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>ID</th><th>Компания</th><th>Локация</th><th>Рейтинг</th><th>Статус</th><th>Изменить статус</th></tr></thead>
              <tbody>
                {page.items.map((c) => (
                  <tr key={c.id}>
                    <td className={styles.small}>{c.id}</td>
                    <td><span className={styles.cellMain}>{c.status === 'APPROVED' ? <Link className={styles.link} to={`/companies/${c.slug}`}>{c.name}</Link> : <strong>{c.name}</strong>}<small>{c.legalName} · ИНН {c.inn ?? '—'}</small></span></td>
                    <td className={styles.small}>{c.city}, {c.country}</td>
                    <td>{formatScore(c.rating.overall)} <span className={styles.small}>({c.rating.reviewsCount})</span></td>
                    <td><Status value={c.status} labels={{ APPROVED: 'Опубликована', PENDING: 'На проверке' }} /></td>
                    <td>
                      <select className={styles.inlineSelect} value={c.status} onChange={(e) => change(c, e.target.value as CompanyStatus)} aria-label={`Статус ${c.name}`}>
                        {COMPANY_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} onPage={setPageNo} />
        </>
      )}
    </section>
  )
}

// ---------- Настройки ----------

function SettingsTab() {
  const { token } = useAuth()
  const [settings, setSettings] = useState<Setting[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.settings(token).then(setSettings).catch((err) => setError(errorText(err)))
  }, [token])

  if (error && !settings) return <ErrorNote error={error} />
  if (!settings) return <LoadingBlock />
  return (
    <div className={styles.grid2}>
      {settings.map((s) => <SettingCard key={s.key} setting={s} onSaved={(next) => setSettings((list) => list?.map((x) => x.key === next.key ? next : x) ?? null)} />)}
    </div>
  )
}

function SettingCard({ setting, onSaved }: { setting: Setting; onSaved: (setting: Setting) => void }) {
  const { token } = useAuth()
  const [value, setValue] = useState(setting.value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const boolean = setting.defaultValue === 'true' || setting.defaultValue === 'false'

  const save = async () => {
    setBusy(true)
    setError('')
    try { onSaved(await adminApi.changeSetting(token, setting.key, value)) } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }

  return (
    <div className={styles.card}>
      <p className={styles.kicker}>{setting.key}</p>
      <strong style={{ fontSize: 14 }}>{setting.description}</strong>
      <div className={styles.row} style={{ marginTop: 12 }}>
        {boolean
          ? <select className={styles.inlineSelect} value={value} onChange={(e) => setValue(e.target.value)} aria-label={setting.description}><option value="true">Включено</option><option value="false">Выключено</option></select>
          : <input className={styles.inlineSelect} style={{ flex: 1 }} value={value} onChange={(e) => setValue(e.target.value)} aria-label={setting.description} />}
        <button type="button" className={`${styles.btn} ${styles.btnDark}`} disabled={busy || value === setting.value} onClick={save}><Save size={13} aria-hidden="true" /> Сохранить</button>
      </div>
      <p className={`${styles.small} ${styles.muted}`} style={{ marginBottom: 0 }}>
        По умолчанию: «{setting.defaultValue || 'пусто'}»{setting.updatedAt && ` · изменено ${formatDateTime(setting.updatedAt)}`}
      </p>
      {error && <span className={styles.small} style={{ color: 'var(--c-bad)' }}>{error}</span>}
    </div>
  )
}
