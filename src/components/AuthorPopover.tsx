import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CalendarDays, MapPin, MessageSquareText } from 'lucide-react'
import { api } from '../api/client'
import type { AuthorCard } from '../api/types'
import { formatDate, initials, plural } from '../lib/format'
import { VerifiedBadge } from './VerifiedBadge'
import styles from './ReviewCard.module.css'

type Props = {
  authorId: number
  authorName: string
  verified: boolean
}

// Карточки авторов кэшируем на время сессии: один автор часто встречается в ленте несколько раз
const cardCache = new Map<number, AuthorCard>()

/**
 * Имя автора-кнопка. По клику показывает краткую карточку с открытым рейтингом
 * кандидатской активности и его расшифровкой.
 */
export function AuthorPopover({ authorId, authorName, verified }: Props) {
  const [open, setOpen] = useState(false)
  const [card, setCard] = useState<AuthorCard | null>(() => cardCache.get(authorId) ?? null)
  const [failed, setFailed] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  const reduceMotion = useReducedMotion()
  const panelId = `author-card-${authorId}`

  useEffect(() => {
    if (!open || card) return
    let cancelled = false
    api.getAuthorCard(authorId)
      .then((result) => { cardCache.set(authorId, result); if (!cancelled) setCard(result) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [open, card, authorId])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span className={styles.authorRoot} ref={rootRef}>
      <button className={styles.authorButton} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
        <span className={styles.avatar} aria-hidden="true">{initials(authorName)}</span>
        <span className={styles.authorName}>{authorName}</span>
        {verified && <VerifiedBadge iconOnly />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            className={styles.popover}
            role="dialog"
            aria-label={`Карточка автора ${authorName}`}
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {!card && !failed && <div className={styles.popoverLoading}><span /><span /><span /></div>}
            {failed && <p className={styles.popoverError}>Не удалось загрузить карточку автора.</p>}
            {card && (
              <>
                <div className={styles.popoverHead}>
                  <span className={styles.avatarLarge} aria-hidden="true">{initials(card.displayName)}</span>
                  <div>
                    <strong>{card.displayName}</strong>
                    <span>{card.jobTitle ?? 'Должность не указана'}</span>
                  </div>
                </div>
                {card.verifiedRepresentative && (
                  <p className={styles.popoverVerified}><VerifiedBadge jobTitle={card.jobTitle} /> {card.representedCompany}</p>
                )}
                <ul className={styles.popoverFacts}>
                  {card.city && <li><MapPin size={13} aria-hidden="true" /> {card.city}</li>}
                  <li><CalendarDays size={13} aria-hidden="true" /> На платформе с {formatDate(card.memberSince)}</li>
                  <li><MessageSquareText size={13} aria-hidden="true" /> {card.reviewsCount} {plural(card.reviewsCount, ['отзыв', 'отзыва', 'отзывов'])} о {card.companiesCount} {plural(card.companiesCount, ['компании', 'компаниях', 'компаниях'])}</li>
                </ul>
                <div className={styles.candidate}>
                  <div className={styles.candidateHead}>
                    <span>Рейтинг кандидатской активности</span>
                    <strong>{card.candidateRating.score}<small>/100</small></strong>
                  </div>
                  <span className={styles.meter} aria-hidden="true"><i style={{ width: `${card.candidateRating.score}%` }} /></span>
                  <p className={styles.level}>{card.candidateRating.level}</p>
                  <dl className={styles.parts}>
                    {card.candidateRating.parts.map((part) => (
                      <div key={part.label}>
                        <dt>{part.label}<small>{part.hint}</small></dt>
                        <dd className={part.points < 0 ? styles.negative : undefined}>{part.points > 0 ? `+${part.points}` : part.points}<small>/{part.maxPoints}</small></dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
