import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, MapPin, Quote } from 'lucide-react'
import type { CompanySummary } from '../api/types'
import { formatDate, reviewsLabel } from '../lib/format'
import { CriteriaBars } from './CriteriaBars'
import { ScoreBadge } from './ScoreBadge'
import styles from './CompanyCard.module.css'

type Props = {
  company: CompanySummary
  index: number
}

/**
 * Удлинённая карточка в результатах поиска: всё, чтобы решить без лишних кликов.
 * Вся карточка кликабельна через «растянутую» ссылку на названии.
 */
export function CompanyCard({ company, index }: Props) {
  const reduceMotion = useReducedMotion()
  const latest = company.latestReview

  return (
    <motion.article
      className={styles.card}
      layout={reduceMotion ? false : 'position'}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.36, delay: Math.min(index, 8) * 0.035, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.main}>
        <div className={styles.identity}>
          <span className={styles.glyph} aria-hidden="true">{company.name.charAt(0)}</span>
          <div className={styles.titleBlock}>
            <h3><Link className={styles.stretched} to={`/companies/${company.slug}`}>{company.name}</Link></h3>
            <p className={styles.location}><MapPin size={13} aria-hidden="true" /> {company.city}, {company.country}{company.industry && <><span aria-hidden="true">·</span>{company.industry}</>}</p>
          </div>
        </div>
        {company.shortDescription && <p className={styles.description}>{company.shortDescription}</p>}
      </div>

      <div className={styles.criteria}>
        {company.rating.reviewsCount > 0
          ? <CriteriaBars criteria={company.rating.criteria} columns={2} compact useShortLabels />
          : <p className={styles.noData}>Оценок пока нет — рейтинг появится после первых отзывов.</p>}
      </div>

      <div className={styles.scoreColumn}>
        <ScoreBadge value={company.rating.overall} />
        <span className={styles.reviewCount}>{reviewsLabel(company.rating.reviewsCount)}</span>
        <ArrowUpRight className={styles.arrow} size={18} aria-hidden="true" />
      </div>

      {latest && (
        <div className={styles.latest}>
          <Quote size={15} aria-hidden="true" />
          <p>
            <span className={styles.latestMeta}>
              Свежий отзыв · {latest.authorName}, {latest.position} · {latest.employmentStatus === 'CURRENT' ? 'работает сейчас' : 'бывший сотрудник'} · {formatDate(latest.createdAt)} · {latest.overall}/5
            </span>
            <span className={styles.latestText}>{latest.text}</span>
          </p>
        </div>
      )}
    </motion.article>
  )
}

export function CompanyCardSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`} aria-hidden="true">
      <div className={styles.main}><span /><span /><span /></div>
      <div className={styles.criteria}><span /><span /><span /></div>
      <div className={styles.scoreColumn}><span /></div>
    </div>
  )
}
