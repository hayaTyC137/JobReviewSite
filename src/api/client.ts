import { ApiError, BackendUnavailableError } from './errors'
import { mockApi } from './mockApi'
import type {
  Appeal, AuthResponse, AuthorCard, CompanyAnalytics, CompanyDetails, CompanySearchParams, CompanySummary,
  CreateReviewPayload, Locations, Page, RegisterPayload, Review, User,
} from './types'

// Пустая строка = тот же origin: в dev запросы проксирует Vite, в Docker — nginx
const API_BASE = import.meta.env.VITE_API_URL ?? ''
const FORCE_DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

let demoMode = FORCE_DEMO
// Бэкенд хотя бы раз ответил. После этого сбои сети — это ошибки, а не повод уходить в демо
let backendSeen = false
const demoListeners = new Set<(value: boolean) => void>()

export function isDemoMode() {
  return demoMode
}

export function onDemoModeChange(listener: (value: boolean) => void) {
  demoListeners.add(listener)
  return () => { demoListeners.delete(listener) }
}

function enableDemoMode() {
  if (demoMode) return
  demoMode = true
  demoListeners.forEach((listener) => listener(true))
}

async function request<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  } catch {
    throw new BackendUnavailableError()
  }

  const isJson = (response.headers.get('content-type') ?? '').includes('json')
  // Прокси без запущенного бэкенда отвечает 5xx без JSON — это тоже «бэкенд недоступен»
  if (!isJson && (response.status >= 500 || response.status === 404)) throw new BackendUnavailableError()
  backendSeen = true

  const body = isJson ? await response.json() : null
  if (!response.ok) {
    throw new ApiError(response.status, body?.message ?? 'Не удалось выполнить запрос', body?.fieldErrors ?? {})
  }
  return body as T
}

/**
 * Чтение данных: запрос к бэкенду, а если он недоступен с самого начала сессии — тот же вызов к демо-данным.
 * Однажды перейдя в демо-режим, дальше сразу работаем с ними, чтобы не ждать таймаутов.
 * Если бэкенд уже отвечал, временный сбой — обычная ошибка: иначе пользователь незаметно
 * оказался бы в демо-базе до перезагрузки страницы.
 */
async function withFallback<T>(real: () => Promise<T>, demo: () => Promise<T>): Promise<T> {
  if (demoMode) return demo()
  try {
    return await real()
  } catch (error) {
    if (error instanceof BackendUnavailableError && !backendSeen) {
      enableDemoMode()
      return demo()
    }
    throw error
  }
}

/**
 * Запись (вход, регистрация, отзыв, обжалование): в демо уходит, только если демо-режим уже включён.
 * Сбой бэкенда здесь всегда ошибка — нельзя «успешно» сохранить данные в память вкладки.
 */
function realOrDemo<T>(real: () => Promise<T>, demo: () => Promise<T>): Promise<T> {
  return demoMode ? demo() : real()
}

// Демо-токены выдаёт только mockApi, настоящие JWT проверяет только бэкенд
const isDemoToken = (token: string | null) => Boolean(token?.startsWith('demo:'))

function toQuery(params: CompanySearchParams): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 0) query.set(key, String(value))
  })
  const text = query.toString()
  return text ? `?${text}` : ''
}

const json = (value: unknown) => JSON.stringify(value)

export const api = {
  searchCompanies: (params: CompanySearchParams) => withFallback(
    () => request<Page<CompanySummary>>(`/api/companies${toQuery(params)}`),
    () => mockApi.searchCompanies(params)),

  getLocations: () => withFallback(
    () => request<Locations>('/api/companies/locations'),
    () => mockApi.getLocations()),

  getCompany: (slug: string) => withFallback(
    () => request<CompanyDetails>(`/api/companies/${encodeURIComponent(slug)}`),
    () => mockApi.getCompany(slug)),

  getAnalytics: (slug: string) => withFallback(
    () => request<CompanyAnalytics>(`/api/companies/${encodeURIComponent(slug)}/analytics`),
    () => mockApi.getAnalytics(slug)),

  getReviews: (slug: string, page = 0, size = 6) => withFallback(
    () => request<Page<Review>>(`/api/companies/${encodeURIComponent(slug)}/reviews?page=${page}&size=${size}`),
    () => mockApi.getReviews(slug, page, size)),

  getAuthorCard: (userId: number) => withFallback(
    () => request<AuthorCard>(`/api/users/${userId}/card`),
    () => mockApi.getAuthorCard(userId)),

  login: (email: string, password: string) => realOrDemo(
    () => request<AuthResponse>('/api/auth/login', { method: 'POST', body: json({ email, password }) }),
    () => mockApi.login(email, password)),

  register: (payload: RegisterPayload) => realOrDemo(
    () => request<AuthResponse>('/api/auth/register', { method: 'POST', body: json(payload) }),
    () => mockApi.register(payload)),

  me: (token: string) => isDemoToken(token)
    ? mockApi.me(token)
    : request<User>('/api/auth/me', { token }),

  providers: () => withFallback(
    () => request<{ password: boolean; google: boolean }>('/api/auth/providers'),
    () => mockApi.providers()),

  createReview: (token: string | null, slug: string, payload: CreateReviewPayload) => realOrDemo(
    () => request<Review>(`/api/companies/${encodeURIComponent(slug)}/reviews`, { method: 'POST', token, body: json(payload) }),
    () => mockApi.createReview(token, slug, payload)),

  createAppeal: (token: string | null, reviewId: number, reason: string) => realOrDemo(
    () => request<Appeal>(`/api/reviews/${reviewId}/appeals`, { method: 'POST', token, body: json({ reason }) }),
    () => mockApi.createAppeal(token, reviewId, reason)),
}

export const GOOGLE_LOGIN_URL = `${API_BASE}/oauth2/authorization/google`
