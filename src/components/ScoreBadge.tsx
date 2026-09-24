import { formatScore, scoreTone, toneLabel } from '../lib/format'
import styles from './Rating.module.css'

type Props = {
  value: number | null
  size?: 'default' | 'large'
  label?: string
}

/** Сводная оценка компании. Цвет полоски дублируется текстовой подписью уровня */
export function ScoreBadge({ value, size = 'default', label }: Props) {
  const tone = scoreTone(value)
  return (
    <div className={`${styles.badge} ${styles[tone]} ${size === 'large' ? styles.large : ''}`} aria-label={`Общая оценка ${formatScore(value)} из 5`}>
      <span className={styles.badgeValue}><strong>{formatScore(value)}</strong>{value !== null && <small>/5</small>}</span>
      <span className={styles.badgeLabel}>{label ?? toneLabel[tone]}</span>
    </div>
  )
}
