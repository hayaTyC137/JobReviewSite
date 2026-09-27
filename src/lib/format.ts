export function formatScore(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : value.toFixed(1)
}

export type ScoreTone = 'good' | 'mid' | 'low' | 'none'

/** Тон оценки всегда идёт вместе с текстовой подписью — цвет не единственный носитель смысла */
export function scoreTone(value: number | null | undefined): ScoreTone {
  if (value === null || value === undefined) return 'none'
  if (value >= 4) return 'good'
  if (value >= 3) return 'mid'
  return 'low'
}

export const toneLabel: Record<ScoreTone, string> = {
  good: 'Высокая оценка',
  mid: 'Средняя оценка',
  low: 'Низкая оценка',
  none: 'Нет данных',
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'short' })
const monthYearFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

/** '2026-08' → 'авг' */
export function formatMonthShort(month: string): string {
  return monthFormatter.format(new Date(`${month}-01T00:00:00`)).replace('.', '')
}

export function formatMonthLong(month: string): string {
  return monthYearFormatter.format(new Date(`${month}-01T00:00:00`))
}

/** plural(5, ['отзыв', 'отзыва', 'отзывов']) → 'отзывов' */
export function plural(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

export function reviewsLabel(count: number): string {
  return `${count} ${plural(count, ['отзыв', 'отзыва', 'отзывов'])}`
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')
}
