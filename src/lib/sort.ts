import type { CompanySort } from '../api/types'

export const SORT_OPTIONS: Array<{ value: CompanySort; label: string }> = [
  { value: 'RATING_DESC', label: 'Сначала высокая оценка' },
  { value: 'RATING_ASC', label: 'Сначала низкая оценка' },
  { value: 'REVIEWS_DESC', label: 'Больше всего отзывов' },
  { value: 'NAME_ASC', label: 'По алфавиту' },
]
