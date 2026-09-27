import { motion, useReducedMotion } from 'motion/react'
import type { Criteria } from '../api/types'
import { CRITERIA } from '../lib/criteria'
import { formatScore } from '../lib/format'
import styles from './Rating.module.css'

type Props = {
  criteria: Criteria
  columns?: 1 | 2
  compact?: boolean
  useShortLabels?: boolean
}

/** Прогресс-бары по критериям. Заполняются плавно, когда попадают в экран */
export function CriteriaBars({ criteria, columns = 1, compact = false, useShortLabels = false }: Props) {
  const reduceMotion = useReducedMotion()
  return (
    <ul className={`${styles.bars} ${columns === 2 ? styles.twoCols : ''} ${compact ? styles.compact : ''}`}>
      {CRITERIA.map((criterion, index) => {
        const value = criteria[criterion.key]
        const width = value === null ? 0 : (value / 5) * 100
        return (
          <li className={styles.barRow} key={criterion.key}>
            <div className={styles.barHead}>
              <span title={criterion.label}>{useShortLabels ? criterion.short : criterion.label}</span>
              <strong className={value === null ? styles.empty : undefined}>{formatScore(value)}</strong>
            </div>
            <span className={styles.track} aria-hidden="true">
              <motion.i
                className={styles.fill}
                style={{ width: `${width}%` }}
                initial={reduceMotion ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.7, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
              />
            </span>
          </li>
        )
      })}
    </ul>
  )
}
