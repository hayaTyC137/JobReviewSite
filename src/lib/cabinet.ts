import { ApiError } from '../api/errors'
import type { CompanyForm, OAuthProviderKey } from '../api/types'

/** Понятный текст ошибки для кабинетов */
export function errorText(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return 'Не удалось связаться с сервером. Попробуйте ещё раз.'
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

/** 27 → «2 года 3 мес.» */
export function formatTenure(months: number): string {
  const years = Math.floor(months / 12)
  const rest = months % 12
  const yearWord = years % 10 === 1 && years % 100 !== 11 ? 'год'
    : [2, 3, 4].includes(years % 10) && ![12, 13, 14].includes(years % 100) ? 'года' : 'лет'
  const y = years > 0 ? `${years} ${yearWord}` : ''
  const m = rest > 0 || years === 0 ? `${rest} мес.` : ''
  return [y, m].filter(Boolean).join(' ')
}

export const EMPTY_COMPANY: CompanyForm = {
  name: '', legalName: '', inn: null, country: 'Молдова', city: '', legalAddress: null, actualAddress: null, phone: null,
  email: null, website: null, industry: null, employeesCount: null, foundedYear: null, description: null, logoUrl: null, bannerUrl: null,
}

export const PROVIDER_NAMES: Record<OAuthProviderKey, string> = {
  google: 'Google',
  github: 'GitHub',
  facebook: 'Facebook',
  yandex: 'Яндекс ID',
  linkedin: 'LinkedIn',
}

export const PROVIDER_ORDER: OAuthProviderKey[] = ['google', 'linkedin', 'github', 'facebook', 'yandex']
