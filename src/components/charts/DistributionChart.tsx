import { motion, useReducedMotion } from 'motion/react'
import { Star } from 'lucide-react'
import type { CompanyAnalytics } from '../../api/types'
import { reviewsLabel } from '../../lib/format'
import styles from './Charts.module.css'

type Props = {
  distribution: CompanyAnalytics['distribution']
  asTable: boolean
}

/** Распределение общих оценок: сколько отзывов на 5, 4, … 1 звезду */
export function DistributionChart({ distribution, asTable }: Props) {
  const reduceMotion = useReducedMotion()
  const total = distribution.reduce((sum, b) => sum + b.count, 0)
  const max = Math.max(1, ...distribution.map((b) => b.count))
  const rows = [...distribution].sort((a, b) => b.stars - a.stars)
  const percent = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100))

  if (asTable) {
    return (
      <table className={styles.table}>
        <caption className="sr-only">Распределение оценок</caption>
        <thead><tr><th scope="col">Оценка</th><th scope="col">Отзывов</th><th scope="col">Доля</th></tr></thead>
        <tbody>{rows.map((b) => <tr key={b.stars}><td>{b.stars}</td><td>{b.count}</td><td>{percent(b.count)}%</td></tr>)}</tbody>
      </table>
    )
  }

  return (
    <ul className={styles.hbars} aria-label={`Распределение ${total} оценок`}>
      {rows.map((bucket, index) => (
        <li key={bucket.stars} className={styles.hbarRow} title={`${bucket.stars} из 5: ${reviewsLabel(bucket.count)} (${percent(bucket.count)}%)`}>
          <span className={styles.hbarLabel}>{bucket.stars} <Star size={11} fill="currentColor" aria-hidden="true" /></span>
          <span className={styles.hbarTrack}>
            <motion.i
              className={styles.hbar}
              style={{ width: `calc((100% - 72px) * ${bucket.count / max})` }}
              initial={reduceMotion ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.6, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
            <span className={styles.hbarValue}>{bucket.count}<small> · {percent(bucket.count)}%</small></span>
          </span>
        </li>
      ))}
    </ul>
  )
}
