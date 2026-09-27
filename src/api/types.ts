// Типы ответов REST API. Повторяют DTO бэкенда (com.jobreview.dto).

export type CriterionKey = 'climate' | 'management' | 'team' | 'office' | 'clients' | 'growth'

export type Criteria = Record<CriterionKey, number | null>
export type RatingScores = Record<CriterionKey, number>

export type EmploymentStatus = 'CURRENT' | 'FORMER'
export type ReviewStatus = 'PUBLISHED' | 'UNDER_APPEAL' | 'HIDDEN'
export type Role = 'USER' | 'REPRESENTATIVE' | 'MODERATOR' | 'ADMIN'
export type CompanyStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
export type AuthProviderId = 'LOCAL' | 'GOOGLE' | 'GITHUB' | 'FACEBOOK' | 'YANDEX' | 'LINKEDIN'
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
  logoUrl?: string | null
  shortDescription: string | null
  rating: RatingSummary
  latestReview: ReviewPreview | null
}

export type Representative = {
  id: number
  displayName: string
  jobTitle: string | null
  avatarUrl?: string | null
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
  logoUrl?: string | null
  bannerUrl?: string | null
  rating: RatingSummary
  representative: Representative | null
  representatives?: Representative[]
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
  author: { id: number; displayName: string; avatarUrl?: string | null; verifiedRepresentative: boolean }
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
  avatarUrl?: string | null
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
  fullName?: string | null
  jobTitle: string | null
  city: string | null
  country?: string | null
  bio?: string | null
  avatarUrl?: string | null
  role: Role
  authProvider?: AuthProviderId
  companyId: number | null
  companySlug: string | null
  companyName: string | null
  companyStatus?: CompanyStatus | null
  representativeVerified: boolean
  profileCompleted?: boolean
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
  cities: Array<{ country: string; city: string; companiesCount?: number }>
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

// ---------- Вход через соцсети ----------

export type OAuthProviderKey = 'google' | 'github' | 'facebook' | 'yandex' | 'linkedin'
export type Providers = { password: boolean } & Partial<Record<OAuthProviderKey, boolean>>

export type OnboardingPayload = {
  displayName: string
  jobTitle?: string
  country: string
  city: string
  email?: string
  acceptTerms: boolean
}

// ---------- Статистика и настройки ----------

export type PublicStats = {
  companies: number
  reviews: number
  users: number
  averageRating: number | null
  countries: number
  cities: number
  reviewsLast30Days: number
  verifiedCompanies: number
  resolvedDisputes: number
}

export type PublicSettings = Record<string, string>

// ---------- Карточка сотрудника ----------

export type EvaluationKey = 'toxicity' | 'composure' | 'productivity' | 'teamwork' | 'reliability' | 'communication'
export type EvaluationScores = Record<EvaluationKey, number>
export type DismissalReason = 'OWN_WISH' | 'MUTUAL_AGREEMENT' | 'CONTRACT_END' | 'REDUNDANCY' | 'RELOCATION' | 'PROBATION_FAILED' | 'DISCIPLINARY' | 'OTHER'
export type DisciplineSeverity = 'REMARK' | 'WARNING' | 'REPRIMAND'
export type DisciplineStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED'

export type EmployeeScore = {
  score: number | null
  level: string
  evaluationsCount: number
  metrics: Array<{ key: EvaluationKey; label: string; average: number | null; inverted: boolean }>
  disciplinePenalty: number
}

export type EmploymentEntry = {
  id: number
  companyId: number
  companyName: string
  companySlug: string | null
  companyLogoUrl: string | null
  position: string
  startDate: string
  endDate: string | null
  tenureMonths: number
  dismissalReason: DismissalReason | null
  dismissalReasonLabel: string | null
  dismissalNote: string | null
  evaluation: {
    id: number
    scores: EvaluationScores
    comment: string | null
    authorName: string
    authorJobTitle: string | null
    updatedAt: string
  } | null
}

export type DisciplineEntry = {
  id: number
  companyName: string | null
  source: 'EMPLOYER' | 'COMPLAINT'
  severity: DisciplineSeverity
  severityLabel: string
  title: string
  description: string
  occurredOn: string
  status: DisciplineStatus
  moderatorComment: string | null
}

export type EmployeeProfile = {
  employee: { id: number; displayName: string; jobTitle: string | null; city: string | null; country: string | null; avatarUrl: string | null; memberSince: string }
  score: EmployeeScore
  totalTenureMonths: number
  companiesCount: number
  history: EmploymentEntry[]
  discipline: DisciplineEntry[]
  ownProfile: boolean
}

// ---------- Личный кабинет ----------

export type ProfileField = 'DISPLAY_NAME' | 'FULL_NAME' | 'EMAIL'
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type ProfileUpdate = {
  jobTitle: string | null
  country: string | null
  city: string | null
  bio: string | null
  avatarUrl: string | null
}

export type ChangeRequest = {
  id: number
  userId: number
  userName: string
  userEmail: string
  field: ProfileField
  fieldLabel: string
  oldValue: string | null
  newValue: string
  reason: string | null
  status: RequestStatus
  moderatorComment: string | null
  createdAt: string
  resolvedAt: string | null
}

// ---------- Поддержка ----------

export type TicketTopic = 'GENERAL' | 'ACCOUNT' | 'COMPANY' | 'REVIEW' | 'PRIVACY' | 'BUG'
export type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

export type TicketPayload = {
  name: string
  email: string
  topic: TicketTopic
  subject: string
  message: string
  /** Поле-ловушка для ботов: человек его не видит */
  website?: string
}

export type Ticket = {
  id: number
  name: string
  email: string
  topic: TicketTopic
  topicLabel: string
  subject: string
  message: string
  status: TicketStatus
  response: string | null
  handledByName: string | null
  fromRegisteredUser: boolean
  createdAt: string
  updatedAt: string
}

// ---------- Жалобы ----------

export type ComplaintTarget = 'REVIEW' | 'EVALUATION' | 'USER' | 'COMPANY'
export type ComplaintReason = 'SPAM' | 'OFFENSIVE' | 'FALSE_INFORMATION' | 'CONFLICT_OF_INTEREST' | 'PRIVACY' | 'FRAUD' | 'OTHER'
export type ComplaintStatus = 'OPEN' | 'UPHELD' | 'REJECTED'

export type Complaint = {
  id: number
  targetType: ComplaintTarget
  targetId: number
  targetPreview: string
  targetLink: string | null
  reason: ComplaintReason
  reasonLabel: string
  details: string
  status: ComplaintStatus
  resolution: string | null
  authorId: number
  authorName: string
  createdAt: string
  resolvedAt: string | null
}

// ---------- Панель компании ----------

export type CompanyForm = {
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
  logoUrl: string | null
  bannerUrl: string | null
}

export type CompanyProfile = CompanyForm & {
  id: number
  slug: string
  status: CompanyStatus
  moderationComment: string | null
  createdAt: string | null
  reviewedAt: string | null
  rating: RatingSummary
  applicant: { id: number; displayName: string; email: string; jobTitle: string | null } | null
}

export type CompanyPanel = {
  company: CompanyProfile
  representatives: Array<{ id: number; displayName: string; jobTitle: string | null; email: string; avatarUrl: string | null; verified: boolean; you: boolean }>
  canManage: boolean
  stats: { reviewsCount: number; averageRating: number | null; employeesTotal: number; employeesCurrent: number; pendingAppeals: number }
}

export type CompanyEmployee = {
  recordId: number
  employeeId: number
  displayName: string
  jobTitle: string | null
  avatarUrl: string | null
  position: string
  startDate: string
  endDate: string | null
  dismissalReason: DismissalReason | null
  dismissalNote: string | null
  evaluation: EvaluationScores | null
  evaluationComment: string | null
}

export type EmploymentPayload = {
  position: string
  startDate: string
  endDate: string | null
  dismissalReason: DismissalReason | null
  dismissalNote: string | null
}

// ---------- Модерация ----------

export type Decision = { decision: 'APPROVE' | 'REJECT'; comment?: string }

export type ModerationSummary = {
  pendingCompanies: number
  pendingProfileChanges: number
  pendingRepresentatives: number
  pendingDiscipline: number
  openComplaints: number
  pendingAppeals: number
  openTickets: number
  reviewsLast24h: number
  blockedUsers: number
}

export type PendingRepresentative = {
  userId: number
  displayName: string
  email: string
  jobTitle: string | null
  companyId: number
  companyName: string
  companySlug: string
}

export type DisciplineQueueItem = {
  id: number
  employeeId: number
  employeeName: string
  companyName: string | null
  reportedByName: string | null
  source: 'EMPLOYER' | 'COMPLAINT'
  severity: DisciplineSeverity
  severityLabel: string
  title: string
  description: string
  occurredOn: string
  status: DisciplineStatus
  moderatorComment: string | null
  createdAt: string
}

export type AppealQueueItem = {
  id: number
  reviewId: number
  reviewText: string
  reviewOverall: number
  companyName: string
  companySlug: string
  representativeId: number
  representativeName: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  moderatorComment: string | null
  createdAt: string
  resolvedAt: string | null
}

// ---------- Администрирование ----------

export type AdminUser = {
  id: number
  email: string
  displayName: string
  fullName: string | null
  role: Role
  authProvider: AuthProviderId
  companyId: number | null
  companyName: string | null
  representativeVerified: boolean
  blocked: boolean
  blockedReason: string | null
  createdAt: string
  lastLoginAt: string | null
}

export type AdminReview = {
  id: number
  companyId: number
  companyName: string
  companySlug: string
  authorId: number
  authorName: string
  position: string
  overall: number
  text: string
  status: ReviewStatus
  createdAt: string
}

export type Setting = { key: string; value: string; defaultValue: string; description: string; updatedAt: string | null }

export type AdminDashboard = {
  totals: {
    users: number; blockedUsers: number; representatives: number; moderators: number; admins: number; loginsLast24h: number
    companiesApproved: number; companiesPending: number; companiesSuspended: number
    reviewsPublished: number; reviewsUnderAppeal: number; reviewsHidden: number
    openComplaints: number; openTickets: number; pendingAppeals: number; pendingProfileChanges: number; pendingDiscipline: number
  }
  monthly: Array<{ month: string; newUsers: number; newReviews: number; newCompanies: number }>
  topCompanies: Array<{ slug: string; name: string; reviewsLast90Days: number; rating: number | null }>
  load: { uptimeSeconds: number; heapUsedMb: number; heapMaxMb: number; requestsLastHour: number; errorsLastHour: number; averageLatencyMs: number; requestsPerMinute: number[] }
}
