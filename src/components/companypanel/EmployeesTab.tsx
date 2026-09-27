import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardPen, FileWarning, Star, UserPlus, UsersRound } from 'lucide-react'
import { platformApi } from '../../api/client'
import type { CompanyEmployee, DisciplineSeverity, DismissalReason, EvaluationKey, EvaluationScores } from '../../api/types'
import { useAuth } from '../../auth/authContext'
import { Avatar, EmptyState, ErrorNote, LoadingBlock, StatusBadge } from '../cabinet/ui'
import { errorText, formatDateTime } from '../../lib/cabinet'
import { Dialog } from '../Dialog'
import form from '../Form.module.css'
import styles from '../../pages/Cabinet.module.css'

const DISMISSAL_REASONS: Array<[DismissalReason, string]> = [
  ['OWN_WISH', 'По собственному желанию'],
  ['MUTUAL_AGREEMENT', 'По соглашению сторон'],
  ['CONTRACT_END', 'Истечение срока договора'],
  ['REDUNDANCY', 'Сокращение штата'],
  ['RELOCATION', 'Переезд или перевод'],
  ['PROBATION_FAILED', 'Не пройден испытательный срок'],
  ['DISCIPLINARY', 'Дисциплинарное нарушение'],
  ['OTHER', 'Иная причина'],
]
const REASON_LABEL = Object.fromEntries(DISMISSAL_REASONS) as Record<DismissalReason, string>

const METRICS: Array<[EvaluationKey, string, string]> = [
  ['toxicity', 'Токсичность', '1 — не токсичен, 5 — очень токсичен'],
  ['composure', 'Уравновешенность', 'Спокойствие под нагрузкой'],
  ['productivity', 'Продуктивность', 'Результат относительно роли'],
  ['teamwork', 'Командная работа', 'Помощь и договорённости'],
  ['reliability', 'Надёжность', 'Сроки и ответственность'],
  ['communication', 'Коммуникация', 'Ясность и уважительность'],
]

type Action = { kind: 'evaluate' | 'dismiss' | 'discipline'; employee: CompanyEmployee } | null

/** Сотрудники компании: трудовая история, оценки и замечания (всё — от имени подтверждённого представителя) */
export function EmployeesTab() {
  const { token } = useAuth()
  const [employees, setEmployees] = useState<CompanyEmployee[] | null>(null)
  const [error, setError] = useState('')
  const [action, setAction] = useState<Action>(null)

  const load = useCallback(() => {
    platformApi.companyEmployees(token).then(setEmployees).catch((err) => { setEmployees([]); setError(errorText(err)) })
  }, [token])
  useEffect(load, [load])

  const done = () => { setAction(null); load() }

  return (
    <div className={styles.stack}>
      <AddEmploymentForm onAdded={load} />
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div><h2><UsersRound size={16} aria-hidden="true" /> Сотрудники</h2><p>Записи попадают в трудовую историю сотрудника. Оценка — одна на период работы, её можно обновлять.</p></div>
        </div>
        {error && <ErrorNote error={error} />}
        {employees === null ? <LoadingBlock />
          : employees.length === 0 ? <EmptyState title="Пока никого">Добавьте первого сотрудника по email его аккаунта.</EmptyState>
            : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Сотрудник</th><th>Должность</th><th>Период</th><th>Статус</th><th>Оценка</th><th /></tr></thead>
                  <tbody>
                    {employees.map((e) => {
                      const avg = e.evaluation ? (((6 - e.evaluation.toxicity) + e.evaluation.composure + e.evaluation.productivity + e.evaluation.teamwork + e.evaluation.reliability + e.evaluation.communication) / 6) : null
                      return (
                        <tr key={e.recordId}>
                          <td>
                            <div className={styles.row}>
                              <Avatar name={e.displayName} url={e.avatarUrl} size={32} />
                              <span className={styles.cellMain}><Link className={styles.link} to={`/employees/${e.employeeId}`}>{e.displayName}</Link><small>{e.jobTitle}</small></span>
                            </div>
                          </td>
                          <td>{e.position}</td>
                          <td className={styles.small}>{formatDateTime(e.startDate)} — {e.endDate ? formatDateTime(e.endDate) : 'сейчас'}</td>
                          <td>{e.endDate ? <StatusBadge tone="neutral">{e.dismissalReason ? REASON_LABEL[e.dismissalReason] : 'Уволен'}</StatusBadge> : <StatusBadge tone="good">Работает</StatusBadge>}</td>
                          <td>{avg === null ? <span className={styles.muted}>нет</span> : <strong>{avg.toFixed(1)}</strong>}</td>
                          <td>
                            <div className={styles.row} style={{ justifyContent: 'flex-end' }}>
                              <button type="button" className={styles.btn} onClick={() => setAction({ kind: 'evaluate', employee: e })}><Star size={13} aria-hidden="true" /> Оценить</button>
                              {!e.endDate && <button type="button" className={styles.btn} onClick={() => setAction({ kind: 'dismiss', employee: e })}><ClipboardPen size={13} aria-hidden="true" /> Увольнение</button>}
                              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => setAction({ kind: 'discipline', employee: e })}><FileWarning size={13} aria-hidden="true" /> Замечание</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
      </section>

      <Dialog open={action?.kind === 'evaluate'} onClose={() => setAction(null)} title="Оценка сотрудника" subtitle={action?.employee.displayName} width={620}>
        {action?.kind === 'evaluate' && <EvaluateForm employee={action.employee} onDone={done} />}
      </Dialog>
      <Dialog open={action?.kind === 'dismiss'} onClose={() => setAction(null)} title="Зафиксировать увольнение" subtitle={action?.employee.displayName} width={520}>
        {action?.kind === 'dismiss' && <DismissForm employee={action.employee} onDone={done} />}
      </Dialog>
      <Dialog open={action?.kind === 'discipline'} onClose={() => setAction(null)} title="Зарегистрировать замечание" subtitle="Попадёт в историю сотрудника после проверки модератором" width={560}>
        {action?.kind === 'discipline' && <DisciplineForm employee={action.employee} onDone={done} />}
      </Dialog>
    </div>
  )
}

function AddEmploymentForm({ onAdded }: { onAdded: () => void }) {
  const { token } = useAuth()
  const [email, setEmail] = useState('')
  const [position, setPosition] = useState('')
  const [startDate, setStartDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await platformApi.addEmployment(token, { email, position, startDate, endDate: null, dismissalReason: null, dismissalNote: null })
      setEmail(''); setPosition(''); setStartDate('')
      onAdded()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={`${styles.card} ${form.form}`} onSubmit={submit} noValidate>
      <div className={styles.cardHead}><div><h2><UserPlus size={16} aria-hidden="true" /> Добавить сотрудника</h2><p>Сотрудник должен быть зарегистрирован на платформе — укажите email его аккаунта.</p></div></div>
      <div className={styles.grid3}>
        <input className={form.input} type="email" placeholder="Email сотрудника" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email сотрудника" required />
        <input className={form.input} placeholder="Должность" value={position} onChange={(e) => setPosition(e.target.value)} aria-label="Должность" maxLength={160} required />
        <input className={form.input} type="date" value={startDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setStartDate(e.target.value)} aria-label="Дата приёма" required />
      </div>
      {error && <ErrorNote error={error} />}
      <div className={form.actions}><button className={form.primary} type="submit" disabled={busy || !email || !position || !startDate}>{busy ? 'Добавляем…' : 'Добавить в штат'}</button></div>
    </form>
  )
}

function EvaluateForm({ employee, onDone }: { employee: CompanyEmployee; onDone: () => void }) {
  const { token } = useAuth()
  const [scores, setScores] = useState<EvaluationScores>(employee.evaluation ?? { toxicity: 1, composure: 4, productivity: 4, teamwork: 4, reliability: 4, communication: 4 })
  const [comment, setComment] = useState(employee.evaluationComment ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await platformApi.evaluate(token, employee.recordId, scores, comment)
      onDone()
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <form className={form.form} onSubmit={submit}>
      <div className={form.criteriaGrid}>
        {METRICS.map(([key, label, hint]) => (
          <div key={key} className={form.field}>
            <span className={form.label}>{label} <span className={form.hint}>· {hint}</span></span>
            <div className={form.scale} role="radiogroup" aria-label={label}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={scores[key] === n} onClick={() => setScores((s) => ({ ...s, [key]: n }))}>{n}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <label className={form.field}>
        <span className={form.label}>Комментарий <span className={form.hint}>(увидит сотрудник и другие работодатели)</span></span>
        <textarea className={form.textarea} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} placeholder="Факты о работе, без оценочных суждений о личности" />
      </label>
      <p className={form.note}>Сотрудник может оспорить оценку через жалобу — модератор проверит её обоснованность.</p>
      {error && <p className={form.error} role="alert">{error}</p>}
      <div className={form.actions}><button className={form.primary} type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить оценку'}</button></div>
    </form>
  )
}

function DismissForm({ employee, onDone }: { employee: CompanyEmployee; onDone: () => void }) {
  const { token } = useAuth()
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState<DismissalReason>('OWN_WISH')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await platformApi.updateEmployment(token, employee.recordId, { position: employee.position, startDate: employee.startDate, endDate, dismissalReason: reason, dismissalNote: note || null })
      onDone()
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <form className={form.form} onSubmit={submit}>
      <label className={form.field}>
        <span className={form.label}>Дата увольнения</span>
        <input className={form.input} type="date" value={endDate} min={employee.startDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setEndDate(e.target.value)} required />
      </label>
      <label className={form.field}>
        <span className={form.label}>Официальная причина</span>
        <select className={form.select} value={reason} onChange={(e) => setReason(e.target.value as DismissalReason)}>
          {DISMISSAL_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <span className={form.hint}>Список фиксированный, чтобы в истории не было оценочных формулировок.</span>
      </label>
      <label className={form.field}>
        <span className={form.label}>Примечание <span className={form.hint}>(необязательно)</span></span>
        <input className={form.input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      </label>
      {error && <p className={form.error} role="alert">{error}</p>}
      <div className={form.actions}><button className={form.primary} type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button></div>
    </form>
  )
}

function DisciplineForm({ employee, onDone }: { employee: CompanyEmployee; onDone: () => void }) {
  const { token } = useAuth()
  const [severity, setSeverity] = useState<DisciplineSeverity>('REMARK')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await platformApi.reportDiscipline(token, employee.recordId, { severity, title, description, occurredOn })
      onDone()
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <form className={form.form} onSubmit={submit}>
      <div className={form.segmented} role="radiogroup" aria-label="Тяжесть">
        {([['REMARK', 'Замечание'], ['WARNING', 'Предупреждение'], ['REPRIMAND', 'Выговор']] as Array<[DisciplineSeverity, string]>).map(([value, label]) => (
          <button key={value} type="button" role="radio" aria-checked={severity === value} onClick={() => setSeverity(value)}>{label}</button>
        ))}
      </div>
      <label className={form.field}>
        <span className={form.label}>Суть нарушения</span>
        <input className={form.input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required placeholder="Например, срыв сроков релиза" />
      </label>
      <label className={form.field}>
        <span className={form.label}>Описание фактов</span>
        <textarea className={form.textarea} value={description} onChange={(e) => setDescription(e.target.value)} minLength={20} maxLength={2000} required />
        <span className={`${form.counter} ${description.trim().length < 20 ? form.short : ''}`}>{description.trim().length} / 2000, минимум 20</span>
      </label>
      <label className={form.field}>
        <span className={form.label}>Дата</span>
        <input className={form.input} type="date" value={occurredOn} min={employee.startDate} max={employee.endDate ?? new Date().toISOString().slice(0, 10)} onChange={(e) => setOccurredOn(e.target.value)} required />
      </label>
      <p className={form.note}>Модератор проверит запись (например, приказ или переписку). До подтверждения её видит только сам сотрудник.</p>
      {error && <p className={form.error} role="alert">{error}</p>}
      <div className={form.actions}><button className={form.primary} type="submit" disabled={busy || !title.trim() || description.trim().length < 20}>{busy ? 'Отправляем…' : 'Отправить на проверку'}</button></div>
    </form>
  )
}
