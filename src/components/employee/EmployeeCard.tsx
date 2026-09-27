import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import {
  AlertTriangle, BriefcaseBusiness, Building2, CalendarRange, ChevronDown, Flag, Info, MapPin, ShieldCheck, Table2, BarChart3,
} from 'lucide-react'
import type { EmployeeProfile, EmploymentEntry, EvaluationKey } from '../../api/types'
import { Avatar, EmptyState, Status, StatusBadge } from '../cabinet/ui'
import { formatDateTime, formatTenure } from '../../lib/cabinet'
import type { Tone } from '../cabinet/ui'
import styles from './EmployeeCard.module.css'

const METRIC_HINTS: Record<EvaluationKey, string> = {
  toxicity: 'Грубость, конфликтность, давление на коллег. Шкала обратная: 1 — не токсичен.',
  composure: 'Спокойствие под нагрузкой и в конфликтных ситуациях.',
  productivity: 'Объём и качество результата относительно ожиданий роли.',
  teamwork: 'Помощь коллегам, умение договариваться, вклад в общий результат.',
  reliability: 'Сроки, ответственность за обещания, соблюдение регламентов.',
  communication: 'Ясность, своевременность и уважительность общения.',
}

const SEVERITY_TONE: Record<string, Tone> = { REMARK: 'neutral', WARNING: 'warn', REPRIMAND: 'bad' }

type Props = {
  profile: EmployeeProfile
  /** Сотрудник может оспорить оценку работодателя — открывается жалоба на оценку */
  onDisputeEvaluation?: (entry: EmploymentEntry) => void
  /** Представитель или модератор может пожаловаться на пользователя */
  onComplainUser?: () => void
}

/**
 * Интерактивная карточка сотрудника: итоговый рейтинг с открытой формулой, метрики от работодателей
 * (гистограмма или таблица), трудовая история с причинами увольнений и дисциплинарная история.
 */
export function EmployeeCard({ profile, onDisputeEvaluation, onComplainUser }: Props) {
  const { employee, score } = profile
  const confirmed = profile.discipline.filter((d) => d.status === 'CONFIRMED').length

  return (
    <div className={styles.root}>
      <section className={styles.identity}>
        <Avatar name={employee.displayName} url={employee.avatarUrl} size={64} />
        <div>
          <h2>{employee.displayName}</h2>
          <p>
            {employee.jobTitle && <span><BriefcaseBusiness size={14} aria-hidden="true" /> {employee.jobTitle}</span>}
            {(employee.city || employee.country) && <span><MapPin size={14} aria-hidden="true" /> {[employee.city, employee.country].filter(Boolean).join(', ')}</span>}
            <span>На платформе с {formatDateTime(employee.memberSince)}</span>
          </p>
        </div>
        {onComplainUser && (
          <button type="button" className={styles.ghost} onClick={onComplainUser}><Flag size={14} aria-hidden="true" /> Пожаловаться</button>
        )}
      </section>

      <div className={styles.top}>
        <ScoreDial score={score.score} level={score.level} evaluations={score.evaluationsCount} penalty={score.disciplinePenalty} />
        <MetricsChart metrics={score.metrics} />
      </div>

      <dl className={styles.tiles}>
        <div><dt>Общий стаж</dt><dd>{profile.totalTenureMonths > 0 ? formatTenure(profile.totalTenureMonths) : '—'}</dd></div>
        <div><dt>Компаний в истории</dt><dd>{profile.companiesCount}</dd></div>
        <div><dt>Оценок работодателей</dt><dd>{score.evaluationsCount}</dd></div>
        <div><dt>Подтверждённых замечаний</dt><dd className={confirmed > 0 ? styles.alert : undefined}>{confirmed}</dd></div>
      </dl>

      <section className={styles.section} aria-labelledby="history-title">
        <h3 id="history-title"><Building2 size={17} aria-hidden="true" /> Трудовая история</h3>
        {profile.history.length === 0
          ? <EmptyState title="Записей пока нет">Трудовую историю заводят подтверждённые представители работодателей.</EmptyState>
          : <ol className={styles.timeline}>{profile.history.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} onDispute={profile.ownProfile ? onDisputeEvaluation : undefined} />
          ))}</ol>}
      </section>

      <section className={styles.section} aria-labelledby="discipline-title">
        <h3 id="discipline-title"><ShieldCheck size={17} aria-hidden="true" /> История дисциплины</h3>
        {profile.discipline.length === 0
          ? <EmptyState title="Нарушений не зафиксировано">Здесь появляются замечания работодателей и жалобы, подтверждённые модератором.</EmptyState>
          : (
            <ul className={styles.discipline}>
              {profile.discipline.map((d) => (
                <li key={d.id}>
                  <div className={styles.disciplineHead}>
                    <StatusBadge tone={SEVERITY_TONE[d.severity]}>{d.severityLabel}</StatusBadge>
                    <strong>{d.title}</strong>
                    {profile.ownProfile && <Status value={d.status} />}
                  </div>
                  <p>{d.description}</p>
                  <small>
                    {formatDateTime(d.occurredOn)} · {d.source === 'COMPLAINT' ? 'по подтверждённой жалобе' : d.companyName}
                    {d.moderatorComment && ` · Модератор: ${d.moderatorComment}`}
                  </small>
                </li>
              ))}
            </ul>
          )}
        {profile.ownProfile && profile.discipline.some((d) => d.status === 'PENDING') && (
          <p className={styles.hint}><Info size={14} aria-hidden="true" /> Записи «на проверке» видите только вы и модераторы — на рейтинг они не влияют.</p>
        )}
      </section>
    </div>
  )
}

// ---------- Итоговый рейтинг ----------

function ScoreDial({ score, level, evaluations, penalty }: { score: number | null; level: string; evaluations: number; penalty: number }) {
  const reduceMotion = useReducedMotion()
  const [showFormula, setShowFormula] = useState(false)
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = score === null ? 0 : score / 100

  return (
    <div className={styles.dial}>
      <p className={styles.kicker}>Итоговый рейтинг</p>
      <div className={styles.dialRow}>
        <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={score === null ? 'Оценок пока нет' : `Рейтинг ${score} из 100`}>
          <circle cx="66" cy="66" r={radius} fill="none" stroke="var(--c-dark-line)" strokeWidth="10" />
          <motion.circle
            cx="66" cy="66" r={radius} fill="none" stroke="var(--c-accent)" strokeWidth="10" strokeLinecap="round"
            transform="rotate(-90 66 66)" strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - progress) }}
            transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
          <text x="66" y="72" textAnchor="middle" className={styles.dialValue}>{score ?? '—'}</text>
          <text x="66" y="92" textAnchor="middle" className={styles.dialMax}>{score === null ? '' : 'из 100'}</text>
        </svg>
        <div>
          <strong className={styles.level}>{level}</strong>
          <span className={styles.dialNote}>{evaluations > 0 ? `по ${evaluations} ${evaluations === 1 ? 'оценке' : 'оценкам'} работодателей` : 'работодатели ещё не оценивали'}</span>
          {penalty > 0 && <span className={styles.penalty}><AlertTriangle size={13} aria-hidden="true" /> −{penalty} за подтверждённые замечания</span>}
        </div>
      </div>
      <button type="button" className={styles.formulaToggle} aria-expanded={showFormula} onClick={() => setShowFormula((v) => !v)}>
        Как считается <ChevronDown size={14} aria-hidden="true" className={showFormula ? styles.flipped : undefined} />
      </button>
      {showFormula && (
        <ol className={styles.formula}>
          <li>Каждая оценка — среднее шести метрик; токсичность считается наоборот (6 − значение).</li>
          <li>Среднее по всем видимым оценкам переводится в шкалу 0–100.</li>
          <li>Минус 5 баллов за каждое подтверждённое модератором замечание, но не больше 25.</li>
        </ol>
      )}
    </div>
  )
}

// ---------- Метрики: одна серия, гистограмма или таблица ----------

function MetricsChart({ metrics }: { metrics: EmployeeProfile['score']['metrics'] }) {
  const reduceMotion = useReducedMotion()
  const [asTable, setAsTable] = useState(false)
  const [hovered, setHovered] = useState<EvaluationKey | null>(null)
  const hasData = metrics.some((m) => m.average !== null)

  return (
    <div className={styles.metrics}>
      <div className={styles.metricsHead}>
        <div>
          <p className={styles.kickerLight}>Метрики от работодателей</p>
          <span className={styles.metricsSub}>Среднее по оценкам, шкала 1–5</span>
        </div>
        {hasData && (
          <button type="button" className={styles.viewToggle} onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
            {asTable ? <><BarChart3 size={14} aria-hidden="true" /> График</> : <><Table2 size={14} aria-hidden="true" /> Таблица</>}
          </button>
        )}
      </div>

      {!hasData && <p className={styles.noData}>Метрики появятся после первой оценки работодателя.</p>}

      {hasData && asTable && (
        <table className={styles.table}>
          <thead><tr><th>Метрика</th><th>Среднее</th><th>Что значит</th></tr></thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.key}><td>{m.label}{m.inverted && ' ↓'}</td><td>{m.average?.toFixed(1) ?? '—'}</td><td>{METRIC_HINTS[m.key]}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      {hasData && !asTable && (
        <ul className={styles.bars} role="list">
          {metrics.map((m, index) => {
            const value = m.average ?? 0
            // Для токсичности «хорошо» — короткая полоса: показываем как есть и подписываем направление
            const width = `${(value / 5) * 100}%`
            return (
              <li
                key={m.key}
                className={styles.barRow}
                onMouseEnter={() => setHovered(m.key)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(m.key)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                aria-label={`${m.label}: ${m.average?.toFixed(1) ?? 'нет данных'} из 5${m.inverted ? ', меньше — лучше' : ''}`}
              >
                <span className={styles.barLabel}>{m.label}{m.inverted && <small> меньше — лучше</small>}</span>
                <span className={styles.barTrack}>
                  {[1, 2, 3, 4].map((tick) => <i key={tick} className={styles.gridline} style={{ left: `${tick * 20}%` }} aria-hidden="true" />)}
                  <motion.span
                    className={`${styles.bar} ${m.inverted ? styles.barInverted : ''}`}
                    initial={reduceMotion ? false : { width: 0 }}
                    animate={{ width }}
                    transition={{ duration: 0.7, delay: reduceMotion ? 0 : index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  />
                  {hovered === m.key && <span className={styles.tooltip} role="tooltip">{METRIC_HINTS[m.key]}</span>}
                </span>
                <span className={styles.barValue}>{m.average?.toFixed(1) ?? '—'}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---------- Место работы ----------

function HistoryItem({ entry, onDispute }: { entry: EmploymentEntry; onDispute?: (entry: EmploymentEntry) => void }) {
  const [open, setOpen] = useState(false)
  const company = entry.companySlug
    ? <Link to={`/companies/${entry.companySlug}`}>{entry.companyName}</Link>
    : <span>{entry.companyName}</span>

  return (
    <li className={styles.job}>
      <span className={styles.jobDot} aria-hidden="true" />
      <div className={styles.jobHead}>
        <div>
          <strong className={styles.jobPosition}>{entry.position}</strong>
          <span className={styles.jobCompany}>{company}</span>
        </div>
        <div className={styles.jobPeriod}>
          <span><CalendarRange size={13} aria-hidden="true" /> {formatDateTime(entry.startDate)} — {entry.endDate ? formatDateTime(entry.endDate) : 'сейчас'}</span>
          <small>{formatTenure(entry.tenureMonths)}</small>
        </div>
      </div>
      <div className={styles.jobFacts}>
        {entry.endDate
          ? <StatusBadge tone={entry.dismissalReason === 'DISCIPLINARY' || entry.dismissalReason === 'PROBATION_FAILED' ? 'bad' : 'neutral'}>{entry.dismissalReasonLabel}</StatusBadge>
          : <StatusBadge tone="good">Работает сейчас</StatusBadge>}
        {entry.dismissalNote && <span className={styles.jobNote}>{entry.dismissalNote}</span>}
      </div>
      {entry.evaluation && (
        <>
          <button type="button" className={styles.evalToggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            Оценка работодателя <ChevronDown size={14} aria-hidden="true" className={open ? styles.flipped : undefined} />
          </button>
          {open && (
            <div className={styles.evaluation}>
              <dl>
                {(Object.entries(entry.evaluation.scores) as Array<[EvaluationKey, number]>).map(([key, value]) => (
                  <div key={key}>
                    <dt>{{ toxicity: 'Токсичность', composure: 'Уравновешенность', productivity: 'Продуктивность', teamwork: 'Командная работа', reliability: 'Надёжность', communication: 'Коммуникация' }[key]}</dt>
                    <dd><span className={styles.pips} aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= value ? styles.on : undefined} />)}</span>{value}</dd>
                  </div>
                ))}
              </dl>
              {entry.evaluation.comment && <blockquote>«{entry.evaluation.comment}»</blockquote>}
              <div className={styles.evalFoot}>
                <small>{entry.evaluation.authorName}{entry.evaluation.authorJobTitle && `, ${entry.evaluation.authorJobTitle}`} · {formatDateTime(entry.evaluation.updatedAt)}</small>
                {onDispute && <button type="button" className={styles.ghost} onClick={() => onDispute(entry)}><Flag size={13} aria-hidden="true" /> Оспорить оценку</button>}
              </div>
            </div>
          )}
        </>
      )}
    </li>
  )
}
