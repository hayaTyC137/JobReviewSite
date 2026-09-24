import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ChevronDown, Clock3, Flag, ShieldAlert } from 'lucide-react'
import type { Review } from '../api/types'
import { CRITERIA } from '../lib/criteria'
import { formatDate } from '../lib/format'
import { AuthorPopover } from './AuthorPopover'
import { VerifiedBadge } from './VerifiedBadge'
import styles from './ReviewCard.module.css'

type Props = {
  review: Review
  canAppeal: boolean
  onAppeal: (review: Review) => void
  index?: number
}

export function ReviewCard({ review, canAppeal, onAppeal, index = 0 }: Props) {
  const [showScores, setShowScores] = useState(false)
  const reduceMotion = useReducedMotion()
  const underAppeal = review.pendingAppeal !== null

  return (
    <motion.article
      className={`${styles.card} ${underAppeal ? styles.underAppeal : ''}`}
      layout={reduceMotion ? false : 'position'}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index, 6) * 0.04, ease: 'easeOut' }}
    >
      <header className={styles.top}>
        <AuthorPopover authorId={review.author.id} authorName={review.author.displayName} verified={review.author.verifiedRepresentative} />
        <div className={styles.meta}>
          <span className={styles.status}>{review.employmentStatus === 'CURRENT' ? 'Работает сейчас' : 'Бывший сотрудник'}</span>
          <span>{review.position}</span>
          <span className={styles.date}><Clock3 size={12} aria-hidden="true" /> {formatDate(review.createdAt)}</span>
        </div>
        <span className={styles.score} aria-label={`Оценка ${review.overall} из 5`}>{review.overall}<small>/5</small></span>
      </header>

      {underAppeal && review.pendingAppeal && (
        <div className={styles.appealNotice} role="note">
          <ShieldAlert size={15} aria-hidden="true" />
          <span>
            <strong>Отзыв обжалуется.</strong> {review.pendingAppeal.representativeName}
            {' '}<VerifiedBadge jobTitle={review.pendingAppeal.representativeJobTitle} />{' '}
            подал(а) заявку {formatDate(review.pendingAppeal.createdAt)}. Отзыв на проверке у модераторов.
          </span>
        </div>
      )}

      <p className={styles.text}>{review.text}</p>

      <footer className={styles.bottom}>
        <button className={styles.textButton} type="button" aria-expanded={showScores} onClick={() => setShowScores((v) => !v)}>
          Оценки по критериям <ChevronDown size={14} aria-hidden="true" className={showScores ? styles.rotated : undefined} />
        </button>
        {canAppeal && !underAppeal && (
          <button className={styles.appealButton} type="button" onClick={() => onAppeal(review)}>
            <Flag size={13} aria-hidden="true" /> Обжаловать
          </button>
        )}
      </footer>

      {showScores && (
        <dl className={styles.scores}>
          {CRITERIA.map((criterion) => (
            <div key={criterion.key}>
              <dt>{criterion.short}</dt>
              <dd>
                <span className={styles.pips} aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= review.scores[criterion.key] ? styles.on : undefined} />)}
                </span>
                {review.scores[criterion.key]}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </motion.article>
  )
}
