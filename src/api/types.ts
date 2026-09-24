// Типы ответов REST API. Повторяют DTO бэкенда (com.jobreview.dto).

export type CriterionKey = 'climate' | 'management' | 'team' | 'office' | 'clients' | 'growth'

export type Criteria = Record<CriterionKey, number | null>
export type RatingScores = Record<CriterionKey, number>

export type EmploymentStatus = 'CURRENT' | 'FORMER'
export type ReviewStatus = 'PUBLISHED' | 'UNDER_APPEAL' | 'HIDDEN'
export type Role = 'USER' | 'REPRESENTATIVE' | 'MODERATOR'
export type CompanySort = 'RATING_DESC' | 'RATING_ASC' | 'REVIEWS_DESC' | 'NAME_ASC'

export type RatingSummary = {
  overall: number | null
  reviewsCount: number
  criteria: Criteria
}

export type ReviewPreview = {
  id: number
  authorId: number
  authorName: string
  position: string
  employmentStatus: EmploymentStatus
  overall: number
  text: string
  createdAt: string
}

export type CompanySummary = {
  id: number
  slug: string
  name: string
  country: string
  city: string
  industry: string | null
  shortDescription: string | null
  rating: RatingSummary
  latestReview: ReviewPreview | null
}

export type Representative = {
  id: number
  displayName: string
  jobTitle: string | null
}

export type CompanyDetails = {
  id: number
  slug: string
  name: string
  legalName: string
  inn: string | null
  country: string
  city: string
  legalAddress: string | null
  actualAddress: string | null
  phone: string | null
  email: string | null
  website: string | null
  industry: string | null
  employeesCount: number | null
  foundedYear: number | null
  description: string | null
  rating: RatingSummary
  representative: Representative | null
}

export type CompanyAnalytics = {
  monthlyTrend: Array<{ month: string; average: number | null; reviewsCount: number }>
  distribution: Array<{ stars: number; count: number }>
  currentEmployees: Criteria
  formerEmployees: Criteria
  currentCount: number
  formerCount: number
}

export type Review = {
  id: number
  companyId: number
  author: { id: number; displayName: string; verifiedRepresentative: boolean }
  employmentStatus: EmploymentStatus
  position: string
  overall: number
  scores: RatingScores
  text: string
  status: ReviewStatus
  createdAt: string
  pendingAppeal: { id: number; representativeName: string; representativeJobTitle: string | null; createdAt: string } | null
}

export type CandidateRating = {
  score: number
  level: string
  parts: Array<{ label: string; points: number; maxPoints: number; hint: string }>
}

export type AuthorCard = {
  id: number
  displayName: string
  jobTitle: string | null
  city: string | null
  memberSince: string
  reviewsCount: number
  companiesCount: number
  verifiedRepresentative: boolean
  representedCompany: string | null
  candidateRating: CandidateRating
}

export type User = {
  id: number
  email: string
  displayName: string
  jobTitle: string | null
  city: string | null
  role: Role
  companyId: number | null
  companySlug: string | null
  companyName: string | null
  representativeVerified: boolean
}

export type AuthResponse = { token: string; user: User }

export type Page<T> = {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export type Locations = {
  countries: string[]
  cities: Array<{ country: string; city: string }>
}

export type CompanySearchParams = {
  q?: string
  country?: string
  city?: string
  minRating?: number
  minClimate?: number
  minManagement?: number
  minTeam?: number
  minOffice?: number
  minClients?: number
  minGrowth?: number
  sort?: CompanySort
  page?: number
  size?: number
}

export type CreateReviewPayload = {
  employmentStatus: EmploymentStatus
  position: string
  overall: number
  scores: RatingScores
  text: string
}

export type RegisterPayload = {
  email: string
  password: string
  displayName: string
  jobTitle?: string
  city?: string
}

export type Appeal = {
  id: number
  reviewId: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reason: string
  createdAt: string
}
