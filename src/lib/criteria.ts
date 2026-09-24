import type { CompanySearchParams, CriterionKey } from '../api/types'

export type CriterionMeta = {
  key: CriterionKey
  label: string
  short: string
  filterParam: keyof CompanySearchParams
}

// Порядок критериев одинаковый во всех местах интерфейса: фильтры, карточки, графики.
export const CRITERIA: CriterionMeta[] = [
  { key: 'climate', label: 'Психологический климат', short: 'Климат', filterParam: 'minClimate' },
  { key: 'management', label: 'Руководство', short: 'Руководство', filterParam: 'minManagement' },
  { key: 'team', label: 'Коллектив', short: 'Коллектив', filterParam: 'minTeam' },
  { key: 'office', label: 'Условия и расположение офиса', short: 'Условия и офис', filterParam: 'minOffice' },
  { key: 'clients', label: 'Работа с клиентами', short: 'Клиенты', filterParam: 'minClients' },
  { key: 'growth', label: 'Карьерный рост и обучение', short: 'Рост', filterParam: 'minGrowth' },
]
