import { motion, useReducedMotion } from 'motion/react'
import type { CompanyAnalytics } from '../../api/types'
import { CRITERIA } from '../../lib/criteria'
import { formatScore } from '../../lib/format'
import styles from './Charts.module.css'

type Props = {
  analytics: CompanyAnalytics
  asTable: boolean
}

/**
 * Сравнение оценок нынешних и бывших сотрудников по каждому критерию.
 * Две серии: цвет + легенда + подпись значения у каждого столбика.
 */
export function CriteriaComparison({ analytics, asTable }: Props) {
  const reduceMotion = useReducedMotion()
  const series = [
    { key: 'current' as const, label: 'Нынешние сотрудники', count: analytics.currentCount, data: analytics.currentEmployees, className: styles.seriesCurrent },
    { key: 'former' as const, label: 'Бывшие сотрудники', count: analytics.formerCount, data: analytics.formerEmployees, className: styles.seriesFormer },
  ]

  if (asTable) {
    return (
      <table className={styles.table}>
        <caption className="sr-only">Оценки нынешних и бывших сотрудников</caption>
        <thead><tr><th scope="col">Критерий</th>{series.map((s) => <th scope="col" key={s.key}>{s.label}</th>)}</tr></thead>
        <tbody>
          {CRITERIA.map((c) => <tr key={c.key}><td>{c.label}</td>{series.map((s) => <td key={s.key}>{formatScore(s.data[c.key])}</td>)}</tr>)}
        </tbody>
      </table>
    )
  }

  return (
    <div>
      <ul className={styles.legend}>
        {series.map((s) => (
          <li key={s.key}><i className={s.className} aria-hidden="true" /> {s.label} <small>({s.count})</small></li>
        ))}
      </ul>
      <dl className={styles.pairs}>
        {CRITERIA.map((criterion, index) => (
          <div key={criterion.key} className={styles.pairRow}>
            <dt>{criterion.short}</dt>
            <dd>
              {series.map((s) => {
                const value = s.data[criterion.key]
                return (
                  <span key={s.key} className={styles.pairTrack} title={`${s.label}: ${formatScore(value)}`}>
                    <motion.i
                      className={`${styles.pairBar} ${s.className}`}
                      style={{ width: `calc((100% - 34px) * ${(value ?? 0) / 5})` }}
                      initial={reduceMotion ? false : { scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ duration: 0.6, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <span className={styles.pairValue}>{formatScore(value)}</span>
                  </span>
                )
              })}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
