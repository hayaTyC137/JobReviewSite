import { ApiError, BackendUnavailableError } from './errors'

/**
 * Демо-база (JSON с компаниями и отзывами) нужна только без бэкенда — грузим её отдельным чанком
 * по первому обращению, а не в основном бандле: так первая загрузка сайта легче на ~150 КБ.
 */
let mockModule: Promise<typeof import('./mockApi')> | null = null
const mock = () => (mockModule ??= import('./mockApi')).then((m) => m.mockApi)
import type {
  AdminDashboard, AdminReview, AdminUser, Appeal, AppealQueueItem, AuthResponse, AuthorCard, ChangeRequest, CompanyAnalytics,
  CompanyDetails, CompanyEmployee, CompanyForm, CompanyPanel, CompanyProfile, CompanySearchParams, CompanyStatus, CompanySummary,
  Complaint, ComplaintReason, ComplaintTarget, CreateReviewPayload, Decision, DisciplineEntry, DisciplineQueueItem,
  DisciplineSeverity, EmployeeProfile, EmploymentPayload, EvaluationScores, Locations, ModerationSummary, OAuthProviderKey,
  OnboardingPayload, Page, PendingRepresentative, ProfileField, ProfileUpdate, Providers, PublicSettings, PublicStats,
  RegisterPayload, Review, ReviewStatus, Role, Setting, Ticket, TicketPayload, TicketStatus, User,
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
  // FormData (загрузка файлов) браузер оформляет сам, с boundary — заголовок не трогаем
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json')
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
    () => mock().then((m) => m.searchCompanies(params))),

  getLocations: () => withFallback(
    () => request<Locations>('/api/companies/locations'),
    () => mock().then((m) => m.getLocations())),

  getCompany: (slug: string) => withFallback(
    () => request<CompanyDetails>(`/api/companies/${encodeURIComponent(slug)}`),
    () => mock().then((m) => m.getCompany(slug))),

  getAnalytics: (slug: string) => withFallback(
    () => request<CompanyAnalytics>(`/api/companies/${encodeURIComponent(slug)}/analytics`),
    () => mock().then((m) => m.getAnalytics(slug))),

  getReviews: (slug: string, page = 0, size = 6) => withFallback(
    () => request<Page<Review>>(`/api/companies/${encodeURIComponent(slug)}/reviews?page=${page}&size=${size}`),
    () => mock().then((m) => m.getReviews(slug, page, size))),

  getAuthorCard: (userId: number) => withFallback(
    () => request<AuthorCard>(`/api/users/${userId}/card`),
    () => mock().then((m) => m.getAuthorCard(userId))),

  login: (email: string, password: string) => realOrDemo(
    () => request<AuthResponse>('/api/auth/login', { method: 'POST', body: json({ email, password }) }),
    () => mock().then((m) => m.login(email, password))),

  register: (payload: RegisterPayload) => realOrDemo(
    () => request<AuthResponse>('/api/auth/register', { method: 'POST', body: json(payload) }),
    () => mock().then((m) => m.register(payload))),

  me: (token: string) => isDemoToken(token)
    ? mock().then((m) => m.me(token))
    : request<User>('/api/auth/me', { token }),

  providers: () => withFallback(
    () => request<Providers>('/api/auth/providers'),
    () => mock().then((m) => m.providers())),

  createReview: (token: string | null, slug: string, payload: CreateReviewPayload) => realOrDemo(
    () => request<Review>(`/api/companies/${encodeURIComponent(slug)}/reviews`, { method: 'POST', token, body: json(payload) }),
    () => mock().then((m) => m.createReview(token, slug, payload))),

  createAppeal: (token: string | null, reviewId: number, reason: string) => realOrDemo(
    () => request<Appeal>(`/api/reviews/${reviewId}/appeals`, { method: 'POST', token, body: json({ reason }) }),
    () => mock().then((m) => m.createAppeal(token, reviewId, reason))),
}


/** Адрес, с которого начинается вход через соцсеть (редирект на провайдера делает бэкенд) */
export const oauthLoginUrl = (provider: OAuthProviderKey) => `${API_BASE}/oauth2/authorization/${provider}`

/** Кабинеты работают только с настоящим бэкендом: в демо-режиме объясняем, как его запустить */
const DEMO_UNAVAILABLE = 'Этот раздел работает с запущенным бэкендом. Запустите docker compose up и обновите страницу.'
const demoUnavailable = <T,>(): Promise<T> => Promise.reject(new ApiError(503, DEMO_UNAVAILABLE))

/** Запрос кабинета: с бэкендом — как обычно, в демо — понятная ошибка вместо «вечной загрузки» */
function cabinet<T>(real: () => Promise<T>): Promise<T> {
  return demoMode ? demoUnavailable<T>() : real()
}

const q = (params: Record<string, string | number | boolean | undefined | null>) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  const text = query.toString()
  return text ? `?${text}` : ''
}

export const platformApi = {
  stats: () => withFallback(() => request<PublicStats>('/api/stats'), () => mock().then((m) => m.stats())),
  publicSettings: () => withFallback(() => request<PublicSettings>('/api/settings/public'), () => mock().then((m) => m.publicSettings())),

  onboarding: (token: string, payload: OnboardingPayload) =>
    request<User>('/api/auth/onboarding', { method: 'POST', token, body: json(payload) }),

  uploadImage: (token: string | null, file: File) => cabinet(() => {
    const form = new FormData()
    form.append('file', file)
    return request<{ url: string }>('/api/files', { method: 'POST', token, body: form })
  }),

  // ---------- Личный кабинет ----------
  myEmployeeProfile: (token: string | null) => realOrDemo(
    () => request<EmployeeProfile>('/api/me/employee-profile', { token }),
    () => mock().then((m) => m.employeeProfile(token, null))),
  employeeProfile: (token: string | null, userId: number) => realOrDemo(
    () => request<EmployeeProfile>(`/api/employees/${userId}`, { token }),
    () => mock().then((m) => m.employeeProfile(token, userId))),
  updateProfile: (token: string | null, payload: ProfileUpdate) =>
    cabinet(() => request<User>('/api/me/profile', { method: 'PATCH', token, body: json(payload) })),
  requestProfileChange: (token: string | null, payload: { field: ProfileField; newValue: string; reason?: string }) =>
    cabinet(() => request<ChangeRequest>('/api/me/profile/change-requests', { method: 'POST', token, body: json(payload) })),
  myChangeRequests: (token: string | null) =>
    cabinet(() => request<ChangeRequest[]>('/api/me/profile/change-requests', { token })),

  // ---------- Поддержка и жалобы ----------
  createTicket: (token: string | null, payload: TicketPayload) => realOrDemo(
    () => request<Ticket>('/api/support/tickets', { method: 'POST', token, body: json(payload) }),
    () => mock().then((m) => m.createTicket(token, payload))),
  myTickets: (token: string | null) => realOrDemo(
    () => request<Ticket[]>('/api/support/tickets/mine', { token }),
    () => mock().then((m) => m.myTickets(token))),
  createComplaint: (token: string | null, payload: { targetType: ComplaintTarget; targetId: number; reason: ComplaintReason; details: string }) =>
    cabinet(() => request<Complaint>('/api/complaints', { method: 'POST', token, body: json(payload) })),
  myComplaints: (token: string | null) => cabinet(() => request<Complaint[]>('/api/complaints/mine', { token })),

  // ---------- Панель компании ----------
  companyPanel: (token: string | null) => cabinet(() => request<CompanyPanel>('/api/company-panel', { token })),
  registerCompany: (token: string | null, form: CompanyForm) =>
    cabinet(() => request<CompanyPanel>('/api/company-panel/company', { method: 'POST', token, body: json(form) })),
  updateCompany: (token: string | null, form: CompanyForm) =>
    cabinet(() => request<CompanyPanel>('/api/company-panel/company', { method: 'PUT', token, body: json(form) })),
  inviteRepresentative: (token: string | null, email: string, jobTitle: string) =>
    cabinet(() => request<CompanyPanel>('/api/company-panel/representatives', { method: 'POST', token, body: json({ email, jobTitle }) })),
  removeRepresentative: (token: string | null, userId: number) =>
    cabinet(() => request<CompanyPanel>(`/api/company-panel/representatives/${userId}`, { method: 'DELETE', token })),
  companyEmployees: (token: string | null) => cabinet(() => request<CompanyEmployee[]>('/api/company-panel/employees', { token })),
  addEmployment: (token: string | null, payload: EmploymentPayload & { email: string }) =>
    cabinet(() => request<CompanyEmployee>('/api/company-panel/employees', { method: 'POST', token, body: json(payload) })),
  updateEmployment: (token: string | null, recordId: number, payload: EmploymentPayload) =>
    cabinet(() => request<CompanyEmployee>(`/api/company-panel/employees/${recordId}`, { method: 'PUT', token, body: json(payload) })),
  evaluate: (token: string | null, recordId: number, scores: EvaluationScores, comment: string) =>
    cabinet(() => request<CompanyEmployee>(`/api/company-panel/employees/${recordId}/evaluation`, { method: 'PUT', token, body: json({ scores, comment }) })),
  reportDiscipline: (token: string | null, recordId: number, payload: { severity: DisciplineSeverity; title: string; description: string; occurredOn: string }) =>
    cabinet(() => request<DisciplineEntry>(`/api/company-panel/employees/${recordId}/discipline`, { method: 'POST', token, body: json(payload) })),
}

export const moderationApi = {
  summary: (token: string | null) => cabinet(() => request<ModerationSummary>('/api/moderation/summary', { token })),
  companies: (token: string | null, status = 'PENDING') => cabinet(() => request<CompanyProfile[]>(`/api/moderation/companies${q({ status })}`, { token })),
  decideCompany: (token: string | null, id: number, decision: Decision) =>
    cabinet(() => request<CompanyProfile>(`/api/moderation/companies/${id}/decision`, { method: 'POST', token, body: json(decision) })),
  profileChanges: (token: string | null, status = 'PENDING') => cabinet(() => request<ChangeRequest[]>(`/api/moderation/profile-changes${q({ status })}`, { token })),
  decideProfileChange: (token: string | null, id: number, decision: Decision) =>
    cabinet(() => request<ChangeRequest>(`/api/moderation/profile-changes/${id}/decision`, { method: 'POST', token, body: json(decision) })),
  representatives: (token: string | null) => cabinet(() => request<PendingRepresentative[]>('/api/moderation/representatives', { token })),
  decideRepresentative: (token: string | null, userId: number, decision: Decision) =>
    cabinet(() => request<PendingRepresentative>(`/api/moderation/representatives/${userId}/decision`, { method: 'POST', token, body: json(decision) })),
  discipline: (token: string | null, status = 'PENDING') => cabinet(() => request<DisciplineQueueItem[]>(`/api/moderation/discipline${q({ status })}`, { token })),
  decideDiscipline: (token: string | null, id: number, decision: Decision) =>
    cabinet(() => request<DisciplineQueueItem>(`/api/moderation/discipline/${id}/decision`, { method: 'POST', token, body: json(decision) })),
  complaints: (token: string | null, status = 'OPEN') => cabinet(() => request<Complaint[]>(`/api/moderation/complaints${q({ status })}`, { token })),
  decideComplaint: (token: string | null, id: number, decision: Decision) =>
    cabinet(() => request<Complaint>(`/api/moderation/complaints/${id}/decision`, { method: 'POST', token, body: json(decision) })),
  appeals: (token: string | null, status = 'PENDING') => cabinet(() => request<AppealQueueItem[]>(`/api/moderation/appeals${q({ status })}`, { token })),
  decideAppeal: (token: string | null, id: number, decision: Decision) =>
    cabinet(() => request<AppealQueueItem>(`/api/moderation/appeals/${id}/decision`, { method: 'POST', token, body: json(decision) })),
  tickets: (token: string | null, onlyOpen = true) => cabinet(() => request<Ticket[]>(`/api/moderation/tickets${q({ onlyOpen })}`, { token })),
  updateTicket: (token: string | null, id: number, status: TicketStatus, response: string) =>
    cabinet(() => request<Ticket>(`/api/moderation/tickets/${id}`, { method: 'PUT', token, body: json({ status, response }) })),
}

export const adminApi = {
  dashboard: (token: string | null) => cabinet(() => request<AdminDashboard>('/api/admin/dashboard', { token })),
  users: (token: string | null, params: { q?: string; role?: Role | ''; blocked?: boolean | ''; page?: number }) =>
    cabinet(() => request<Page<AdminUser>>(`/api/admin/users${q({ ...params, size: 20 })}`, { token })),
  changeRole: (token: string | null, userId: number, role: Role, companyId?: number | null) =>
    cabinet(() => request<AdminUser>(`/api/admin/users/${userId}/role`, { method: 'PUT', token, body: json({ role, companyId }) })),
  changeBlock: (token: string | null, userId: number, blocked: boolean, reason?: string) =>
    cabinet(() => request<AdminUser>(`/api/admin/users/${userId}/block`, { method: 'PUT', token, body: json({ blocked, reason }) })),
  reviews: (token: string | null, params: { q?: string; status?: ReviewStatus | ''; page?: number }) =>
    cabinet(() => request<Page<AdminReview>>(`/api/admin/reviews${q({ ...params, size: 20 })}`, { token })),
  changeReviewStatus: (token: string | null, reviewId: number, status: ReviewStatus) =>
    cabinet(() => request<AdminReview>(`/api/admin/reviews/${reviewId}/status`, { method: 'PUT', token, body: json({ status }) })),
  companies: (token: string | null, params: { q?: string; status?: CompanyStatus | ''; page?: number }) =>
    cabinet(() => request<Page<CompanyProfile>>(`/api/admin/companies${q({ ...params, size: 20 })}`, { token })),
  changeCompanyStatus: (token: string | null, companyId: number, status: CompanyStatus, comment?: string) =>
    cabinet(() => request<CompanyProfile>(`/api/admin/companies/${companyId}/status`, { method: 'PUT', token, body: json({ status, comment }) })),
  settings: (token: string | null) => cabinet(() => request<Setting[]>('/api/admin/settings', { token })),
  changeSetting: (token: string | null, key: string, value: string) =>
    cabinet(() => request<Setting>(`/api/admin/settings/${encodeURIComponent(key)}`, { method: 'PUT', token, body: json({ value }) })),
}
