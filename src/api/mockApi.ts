// Демо-режим: если бэкенд недоступен, интерфейс работает на тех же данных,
// которыми бэкенд заполняет пустую базу (backend/src/main/resources/demo/companies.json).
// Логика фильтров и расчётов повторяет Java-сервисы, чтобы поведение совпадало.
import demoJson from '../../backend/src/main/resources/demo/companies.json'
import { CRITERIA } from '../lib/criteria'
import type {
  AuthResponse, AuthorCard, CandidateRating, CompanyAnalytics, CompanyDetails, CompanySearchParams,
  CompanySummary, CreateReviewPayload, Criteria, CriterionKey, Locations, Page, RatingScores,
  RatingSummary, RegisterPayload, Review, User, Appeal, EmploymentStatus, Role,
} from './types'
import { ApiError } from './errors'

type DemoUser = { key: string; email: string; displayName: string; jobTitle: string; city: string; createdAt: string; role?: string; company?: string }
type DemoCompany = Omit<CompanyDetails, 'id' | 'rating' | 'representative'>
type DemoReview = { company: string; author: string; employmentStatus: string; position: string; overall: number; scores: RatingScores; text: string; createdAt: string }
type DemoFile = { users: DemoUser[]; companies: DemoCompany[]; reviews: DemoReview[] }

type MockUser = User & { password: string; createdAt: string }
type MockReview = Omit<Review, 'pendingAppeal'> & { companySlug: string }
type MockAppeal = Appeal & { representativeId: number }

const DEMO_PASSWORD = 'demo12345'
const demo = demoJson as DemoFile

// ---------- Состояние демо-базы в памяти ----------

const companies: DemoCompany[] = demo.companies
const companyIds = new Map(companies.map((c, index) => [c.slug, index + 1]))

const users: MockUser[] = demo.users.map((u, index) => ({
  id: index + 1,
  email: u.email,
  displayName: u.displayName,
  jobTitle: u.jobTitle,
  city: u.city,
  role: (u.role ?? 'USER') as Role,
  companyId: u.company ? companyIds.get(u.company) ?? null : null,
  companySlug: u.company ?? null,
  companyName: u.company ? companies.find((c) => c.slug === u.company)?.name ?? null : null,
  representativeVerified: Boolean(u.company),
  password: DEMO_PASSWORD,
  createdAt: u.createdAt,
}))
const userIdByKey = new Map(demo.users.map((u, index) => [u.key, index + 1]))

let reviews: MockReview[] = demo.reviews
  .map((r, index) => {
    const author = users[(userIdByKey.get(r.author) ?? 1) - 1]
    return {
      id: index + 1,
      companyId: companyIds.get(r.company) ?? 0,
      companySlug: r.company,
      author: { id: author.id, displayName: author.displayName, verifiedRepresentative: author.role === 'REPRESENTATIVE' && author.representativeVerified },
      employmentStatus: r.employmentStatus as EmploymentStatus,
      position: r.position,
      overall: r.overall,
      scores: r.scores,
      text: r.text,
      status: 'PUBLISHED' as const,
      createdAt: `${r.createdAt}T12:00:00`,
    }
  })

const appeals: MockAppeal[] = []

// ---------- Вспомогательные расчёты ----------

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10
}

function visibleReviews(slug: string): MockReview[] {
  return reviews
    .filter((r) => r.companySlug === slug && r.status !== 'HIDDEN')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function averageCriteria(list: MockReview[]): Criteria {
  const result = {} as Criteria
  for (const { key } of CRITERIA) result[key] = average(list.map((r) => r.scores[key]))
  return result
}

function ratingFor(slug: string): RatingSummary {
  const list = visibleReviews(slug)
  return { overall: average(list.map((r) => r.overall)), reviewsCount: list.length, criteria: averageCriteria(list) }
}

function findCompany(slug: string): DemoCompany {
  const company = companies.find((c) => c.slug === slug)
  if (!company) throw new ApiError(404, 'Компания не найдена')
  return company
}

function shorten(text: string | null): string | null {
  if (!text || text.length <= 180) return text
  const cut = text.lastIndexOf(' ', 180)
  return `${text.slice(0, cut > 0 ? cut : 180)}…`
}

function pendingAppealFor(reviewId: number): Review['pendingAppeal'] {
  const appeal = appeals.find((a) => a.reviewId === reviewId && a.status === 'PENDING')
  if (!appeal) return null
  const rep = users[appeal.representativeId - 1]
  return { id: appeal.id, representativeName: rep.displayName, representativeJobTitle: rep.jobTitle, createdAt: appeal.createdAt }
}

function paginate<T>(items: T[], page: number, size: number): Page<T> {
  return {
    items: items.slice(page * size, page * size + size),
    page,
    size,
    totalItems: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
  }
}

function userFromToken(token: string | null): MockUser {
  const id = token?.startsWith('demo:') ? Number(token.slice(5)) : NaN
  const user = users.find((u) => u.id === id)
  if (!user) throw new ApiError(401, 'Нужно войти в аккаунт')
  return user
}

function publicUser(user: MockUser): User {
  const { password: _password, createdAt: _createdAt, ...rest } = user
  return rest
}

// Небольшая задержка, чтобы в демо-режиме были видны состояния загрузки, как с реальной сетью
const delay = <T,>(value: T, ms = 220) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))

// ---------- Публичные методы (сигнатуры совпадают с client.ts) ----------

export const mockApi = {
  async searchCompanies(params: CompanySearchParams): Promise<Page<CompanySummary>> {
    const q = params.q?.trim().toLocaleLowerCase('ru-RU')
    const minimums: Array<[CriterionKey | 'overall', number | undefined]> = [
      ['overall', params.minRating],
      ...CRITERIA.map((c) => [c.key, params[c.filterParam] as number | undefined] as [CriterionKey, number | undefined]),
    ]

    let list = companies.map((c) => ({ company: c, rating: ratingFor(c.slug) }))
      .filter(({ company }) => !q || `${company.name} ${company.legalName}`.toLocaleLowerCase('ru-RU').includes(q))
      .filter(({ company }) => !params.country || company.country === params.country)
      .filter(({ company }) => !params.city || company.city === params.city)
      .filter(({ rating }) => minimums.every(([key, min]) => {
        if (!min) return true
        const value = key === 'overall' ? rating.overall : rating.criteria[key]
        return value !== null && value >= min
      }))

    const byName = (a: { company: DemoCompany }, b: { company: DemoCompany }) => a.company.name.localeCompare(b.company.name, 'ru')
    const sort = params.sort ?? 'RATING_DESC'
    list = list.sort((a, b) => {
      if (sort === 'NAME_ASC') return byName(a, b)
      if (sort === 'REVIEWS_DESC') return b.rating.reviewsCount - a.rating.reviewsCount || byName(a, b)
      const av = a.rating.overall ?? (sort === 'RATING_DESC' ? -1 : 99)
      const bv = b.rating.overall ?? (sort === 'RATING_DESC' ? -1 : 99)
      return (sort === 'RATING_DESC' ? bv - av : av - bv) || byName(a, b)
    })

    const summaries: CompanySummary[] = list.map(({ company, rating }) => {
      const latest = visibleReviews(company.slug)[0]
      return {
        id: companyIds.get(company.slug) ?? 0,
        slug: company.slug,
        name: company.name,
        country: company.country,
        city: company.city,
        industry: company.industry,
        shortDescription: shorten(company.description),
        rating,
        latestReview: latest ? {
          id: latest.id, authorId: latest.author.id, authorName: latest.author.displayName, position: latest.position,
          employmentStatus: latest.employmentStatus, overall: latest.overall, text: latest.text, createdAt: latest.createdAt,
        } : null,
      }
    })
    return delay(paginate(summaries, params.page ?? 0, params.size ?? 10))
  },

  async getLocations(): Promise<Locations> {
    const pairs = [...new Map(companies.map((c) => [`${c.country}|${c.city}`, { country: c.country, city: c.city }])).values()]
      .sort((a, b) => a.country.localeCompare(b.country, 'ru') || a.city.localeCompare(b.city, 'ru'))
    return delay({ countries: [...new Set(pairs.map((p) => p.country))], cities: pairs }, 60)
  },

  async getCompany(slug: string): Promise<CompanyDetails> {
    const company = findCompany(slug)
    const rep = users.find((u) => u.companySlug === slug && u.role === 'REPRESENTATIVE' && u.representativeVerified)
    return delay({
      ...company,
      id: companyIds.get(slug) ?? 0,
      rating: ratingFor(slug),
      representative: rep ? { id: rep.id, displayName: rep.displayName, jobTitle: rep.jobTitle } : null,
    })
  },

  async getAnalytics(slug: string): Promise<CompanyAnalytics> {
    findCompany(slug)
    const list = visibleReviews(slug)
    const lastMonth = list.length > 0 ? list[0].createdAt.slice(0, 7) : new Date().toISOString().slice(0, 7)
    const [year, month] = lastMonth.split('-').map(Number)
    const monthlyTrend: CompanyAnalytics['monthlyTrend'] = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(year, month - 1 - i, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const inMonth = list.filter((r) => r.createdAt.startsWith(key))
      monthlyTrend.push({ month: key, average: average(inMonth.map((r) => r.overall)), reviewsCount: inMonth.length })
    }
    const current = list.filter((r) => r.employmentStatus === 'CURRENT')
    const former = list.filter((r) => r.employmentStatus === 'FORMER')
    return delay({
      monthlyTrend,
      distribution: [1, 2, 3, 4, 5].map((stars) => ({ stars, count: list.filter((r) => r.overall === stars).length })),
      currentEmployees: averageCriteria(current),
      formerEmployees: averageCriteria(former),
      currentCount: current.length,
      formerCount: former.length,
    })
  },

  async getReviews(slug: string, page: number, size: number): Promise<Page<Review>> {
    findCompany(slug)
    const list = visibleReviews(slug).map(({ companySlug: _slug, ...review }) => ({ ...review, pendingAppeal: pendingAppealFor(review.id) }))
    return delay(paginate(list, page, size))
  },

  async getAuthorCard(userId: number): Promise<AuthorCard> {
    const user = users.find((u) => u.id === userId)
    if (!user) throw new ApiError(404, 'Пользователь не найден')
    const own = reviews.filter((r) => r.author.id === userId)
    const published = own.filter((r) => r.status !== 'HIDDEN')
    const hidden = own.length - published.length
    const companiesCount = new Set(published.map((r) => r.companySlug)).size
    const memberSince = user.createdAt.slice(0, 10)
    return delay({
      id: user.id,
      displayName: user.displayName,
      jobTitle: user.jobTitle ?? own[0]?.position ?? null,
      city: user.city,
      memberSince,
      reviewsCount: published.length,
      companiesCount,
      verifiedRepresentative: user.role === 'REPRESENTATIVE' && user.representativeVerified,
      representedCompany: user.role === 'REPRESENTATIVE' ? user.companyName : null,
      candidateRating: candidateRating(published.length, hidden, companiesCount, memberSince, Boolean(user.jobTitle), Boolean(user.city)),
    }, 160)
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user || user.password !== password) throw new ApiError(401, 'Неверный email или пароль')
    return delay({ token: `demo:${user.id}`, user: publicUser(user) })
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    if (users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new ApiError(409, 'Пользователь с таким email уже зарегистрирован')
    }
    const user: MockUser = {
      id: users.length + 1, email: payload.email.toLowerCase(), displayName: payload.displayName, jobTitle: payload.jobTitle || null,
      city: payload.city || null, role: 'USER', companyId: null, companySlug: null, companyName: null, representativeVerified: false,
      password: payload.password, createdAt: new Date().toISOString(),
    }
    users.push(user)
    return delay({ token: `demo:${user.id}`, user: publicUser(user) })
  },

  async me(token: string | null): Promise<User> {
    return delay(publicUser(userFromToken(token)), 40)
  },

  async providers(): Promise<{ password: boolean; google: boolean }> {
    return { password: true, google: false }
  },

  async createReview(token: string | null, slug: string, payload: CreateReviewPayload): Promise<Review> {
    const user = userFromToken(token)
    findCompany(slug)
    if (user.role === 'REPRESENTATIVE' && user.companySlug === slug) {
      throw new ApiError(403, 'Представитель компании не может оставлять отзыв о ней')
    }
    const review: MockReview = {
      id: reviews.length + 1, companyId: companyIds.get(slug) ?? 0, companySlug: slug,
      author: { id: user.id, displayName: user.displayName, verifiedRepresentative: user.role === 'REPRESENTATIVE' && user.representativeVerified },
      ...payload, status: 'PUBLISHED', createdAt: new Date().toISOString(),
    }
    reviews = [review, ...reviews]
    const { companySlug: _slug, ...rest } = review
    return delay({ ...rest, pendingAppeal: null })
  },

  async createAppeal(token: string | null, reviewId: number, reason: string): Promise<Appeal> {
    const user = userFromToken(token)
    const review = reviews.find((r) => r.id === reviewId)
    if (!review) throw new ApiError(404, 'Отзыв не найден')
    if (!(user.role === 'REPRESENTATIVE' && user.representativeVerified && user.companySlug === review.companySlug)) {
      throw new ApiError(403, 'Обжаловать отзыв может только подтверждённый представитель этой компании')
    }
    if (appeals.some((a) => a.reviewId === reviewId && a.status === 'PENDING')) {
      throw new ApiError(409, 'По этому отзыву уже есть заявка на рассмотрении')
    }
    const appeal: MockAppeal = { id: appeals.length + 1, reviewId, status: 'PENDING', reason, createdAt: new Date().toISOString(), representativeId: user.id }
    appeals.push(appeal)
    review.status = 'UNDER_APPEAL'
    const { representativeId: _rep, ...rest } = appeal
    return delay(rest)
  },
}

/** Копия правил CandidateRatingCalculator.java */
function candidateRating(published: number, hidden: number, companiesCount: number, memberSince: string, hasJobTitle: boolean, hasCity: boolean): CandidateRating {
  const since = new Date(memberSince)
  const now = new Date()
  let months = (now.getFullYear() - since.getFullYear()) * 12 + (now.getMonth() - since.getMonth())
  if (now.getDate() < since.getDate()) months -= 1
  months = Math.max(0, months)

  const parts = [
    { label: 'Опубликованные отзывы', points: Math.min(published * 10, 40), maxPoints: 40, hint: `${published} × 10 баллов` },
    { label: 'Стаж на платформе', points: Math.min(months * 2, 20), maxPoints: 20, hint: `${months} мес. × 2 балла` },
    { label: 'Заполненный профиль', points: (hasJobTitle ? 10 : 0) + (hasCity ? 10 : 0), maxPoints: 20, hint: 'должность и город' },
    { label: 'Опыт в разных компаниях', points: companiesCount >= 2 ? 10 : 0, maxPoints: 10, hint: `компаний в отзывах: ${companiesCount}` },
    { label: 'Надёжность', points: hidden === 0 ? 10 : -hidden * 15, maxPoints: 10, hint: hidden === 0 ? 'нет скрытых отзывов' : `скрыто модератором: ${hidden}` },
  ]
  const score = Math.max(0, Math.min(100, parts.reduce((sum, p) => sum + p.points, 0)))
  const level = score >= 85 ? 'Эксперт сообщества' : score >= 60 ? 'Надёжный автор' : score >= 30 ? 'Активный участник' : 'Новичок'
  return { score, level, parts }
}
