import { BadgeCheck } from 'lucide-react'
import styles from './Rating.module.css'

type Props = {
  /** Должность представителя: «Генеральный директор» → показываем Verified CEO */
  jobTitle?: string | null
  iconOnly?: boolean
}

function shortTitle(jobTitle?: string | null): string {
  if (!jobTitle) return 'Verified Official'
  return /генеральн|ceo|директор/i.test(jobTitle) ? 'Verified CEO' : 'Verified Official'
}

/** Значок подтверждённого представителя компании */
export function VerifiedBadge({ jobTitle, iconOnly = false }: Props) {
  const title = `Официальный представитель компании${jobTitle ? ` · ${jobTitle}` : ''}. Статус подтверждён модератором.`
  return (
    <span className={`${styles.verified} ${iconOnly ? styles.iconOnly : ''}`} title={title}>
      <BadgeCheck size={iconOnly ? 16 : 13} strokeWidth={2.2} aria-hidden="true" />
      {iconOnly ? <span className="sr-only">{title}</span> : shortTitle(jobTitle)}
    </span>
  )
}
