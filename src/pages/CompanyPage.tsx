import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowLeft, BadgeCheck, Building2, CalendarClock, Check, FileText, Globe, Link2, Mail, MapPin, PenLine, Phone, ShieldCheck, UsersRound,
} from 'lucide-react'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import type { CompanyAnalytics, CompanyDetails, Review } from '../api/types'
import { isRepresentativeOf, useAuth } from '../auth/authContext'
import { AppHeader } from '../components/AppHeader'
import { AppealDialog } from '../components/AppealDialog'
import { CriteriaComparison } from '../components/charts/CriteriaComparison'
import { DistributionChart } from '../components/charts/DistributionChart'
import { TrendChart } from '../components/charts/TrendChart'
import { CriteriaBars } from '../components/CriteriaBars'
import { ReviewCard } from '../components/ReviewCard'
import { ReviewFormDialog } from '../components/ReviewFormDialog'
import { VerifiedBadge } from '../components/VerifiedBadge'
import { formatScore, plural, reviewsLabel, scoreTone, toneLabel } from '../lib/format'
import styles from './CompanyPage.module.css'

const REVIEWS_PAGE = 6

type LoadState = 'loading' | 'ready' | 'not-found' | 'error'

export function CompanyPage() {
  const { slug = '' } = useParams()
  const { user, openLogin } = useAuth()
  const reduceMotion = useReducedMotion()

  const [state, setState] = useState<LoadState>('loading')
  const [company, setCompany] = useState<CompanyDetails | null>(null)
  const [analytics, setAnalytics] = useState<CompanyAnalytics | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [reviewsPage, setReviewsPage] = useState(0)
  const [reviewsPages, setReviewsPages] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [asTable, setAsTable] = useState(false)
  const [writeOpen, setWriteOpen] = useState(false)
  const [appealTarget, setAppealTarget] = useState<Review | null>(null)
  const [notice, setNotice] = useState('')

  const loadCompany = useCallback(async () => {
    const [details, stats] = await Promise.all([api.getCompany(slug), api.getAnalytics(slug)])
    setCompany(details)
    setAnalytics(stats)
  }, [slug])

  const loadReviews = useCallback(async () => {
    const page = await api.getReviews(slug, 0, REVIEWS_PAGE)
    setReviews(page.items)
    setReviewsTotal(page.totalItems)
    setReviewsPages(page.totalPages)
    setReviewsPage(0)
  }, [slug])

  useEffect(() => {
    let cancelled = false
    setState('loading')
    Promise.all([loadCompany(), loadReviews()])
      .then(() => { if (!cancelled) setState('ready') })
      .catch((err) => { if (!cancelled) setState(err instanceof ApiError && err.status === 404 ? 'not-found' : 'error') })
    window.scrollTo({ top: 0 })
    return () => { cancelled = true }
  }, [loadCompany, loadReviews])

  useEffect(() => {
    if (company) document.title = `${company.name} — отзывы сотрудников · Контур`
    return () => { document.title = 'Контур — проверка работодателей' }
  }, [company])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const loadMoreReviews = async () => {
    setLoadingMore(true)
    try {
      const page = await api.getReviews(slug, reviewsPage + 1, REVIEWS_PAGE)
      setReviews((current) => [...current, ...page.items.filter((r) => !current.some((x) => x.id === r.id))])
      setReviewsPage(page.page)
    } finally {
      setLoadingMore(false)
    }
  }

  const startReview = () => {
    if (!user) { openLogin('Чтобы написать отзыв, войдите или зарегистрируйтесь. Просматривать отзывы можно без входа.'); return }
    setWriteOpen(true)
  }

  const shareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setNotice('Ссылка на профиль компании скопирована')
    } catch {
      setNotice(window.location.href)
    }
  }

  if (state === 'loading') {
    return <div className={styles.page}><AppHeader /><div className={styles.loading} aria-busy="true"><span /><span /><span /></div></div>
  }

  if (state !== 'ready' || !company || !analytics) {
    return (
      <div className={styles.page}>
        <AppHeader />
        <div className={styles.stateMessage}>
          <h1>{state === 'not-found' ? 'Компания не найдена' : 'Не удалось загрузить профиль'}</h1>
          <p>{state === 'not-found' ? 'Возможно, ссылка устарела или компания ещё не добавлена в каталог.' : 'Проверьте соединение и обновите страницу.'}</p>
          <Link to="/companies">Перейти в каталог</Link>
        </div>
      </div>
    )
  }

  const canAppeal = isRepresentativeOf(user, company.id)
  const isOwnCompany = canAppeal
  const rating = company.rating
  const tone = scoreTone(rating.overall)
  // Блоки появляются при загрузке, а не по скроллу: контент не должен зависеть от IntersectionObserver
  const reveal = (delay = 0) => reduceMotion ? {} : {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
  }

  const facts: Array<{ icon: typeof MapPin; label: string; value: string | null; href?: string }> = [
    { icon: FileText, label: 'Юридическое лицо', value: company.inn ? `${company.legalName} · ИНН ${company.inn}` : company.legalName },
    { icon: Building2, label: 'Юридический адрес', value: company.legalAddress },
    { icon: MapPin, label: 'Фактический адрес', value: company.actualAddress },
    { icon: Phone, label: 'Телефон', value: company.phone, href: company.phone ? `tel:${company.phone.replace(/[^+\d]/g, '')}` : undefined },
    { icon: Mail, label: 'Email', value: company.email, href: company.email ? `mailto:${company.email}` : undefined },
    { icon: Globe, label: 'Сайт', value: company.website, href: company.website ? `https://${company.website}` : undefined },
    { icon: UsersRound, label: 'Сотрудников', value: company.employeesCount ? company.employeesCount.toLocaleString('ru-RU') : null },
    { icon: CalendarClock, label: 'На рынке с', value: company.foundedYear ? `${company.foundedYear} года` : null },
  ]

  return (
    <div className={styles.page}>
      <AppHeader />

      <div className={styles.content}>
        <Link className={styles.back} to="/companies"><ArrowLeft size={16} aria-hidden="true" /> К каталогу компаний</Link>

        {/* ---------- Шапка компании ---------- */}
        <motion.section className={styles.head} {...reveal()}>
          <div className={styles.identity}>
            <span className={styles.glyph} aria-hidden="true">{company.name.charAt(0)}</span>
            <div>
              <p className={styles.kicker}>{company.industry ?? 'Работодатель'} · {company.city}, {company.country}</p>
              <h1>{company.name}</h1>
              <p className={styles.legal}>{company.legalName}</p>
            </div>
          </div>
          <div className={styles.headActions}>
            <button className={styles.secondary} type="button" onClick={shareLink}><Link2 size={15} aria-hidden="true" /> Поделиться</button>
            {!isOwnCompany && <button className={styles.primary} type="button" onClick={startReview}><PenLine size={15} aria-hidden="true" /> Написать отзыв</button>}
          </div>
        </motion.section>

        <motion.div className={styles.representative} {...reveal(0.05)}>
          {company.representative ? (
            <>
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Официальный представитель: <strong>{company.representative.displayName}</strong>{company.representative.jobTitle && `, ${company.representative.jobTitle}`}</span>
              <VerifiedBadge jobTitle={company.representative.jobTitle} />
            </>
          ) : (
            <span className={styles.muted}>Компания пока не подтвердила представителя на платформе.</span>
          )}
        </motion.div>

        {canAppeal && (
          <p className={styles.ownerNote}>
            <BadgeCheck size={16} aria-hidden="true" />
            Вы — подтверждённый представитель {company.name}. Отзывы нельзя удалить, но можно обжаловать: заявку проверит модератор.
          </p>
        )}

        {/* ---------- Сводка ---------- */}
        <section className={styles.summary} aria-label="Сводка">
          <motion.article className={styles.scoreCard} {...reveal(0.05)}>
            <p className={styles.cardKicker}>Общая оценка</p>
            <div className={styles.scoreMain}>
              <strong>{formatScore(rating.overall)}</strong>
              <span>/5</span>
            </div>
            <p className={styles.scoreTone}>{toneLabel[tone]}</p>
            <div className={styles.scoreFoot}>
              <span>{reviewsLabel(rating.reviewsCount)}</span>
              <span>{analytics.currentCount} нынешних · {analytics.formerCount} бывших</span>
            </div>
          </motion.article>

          <motion.article className={styles.card} {...reveal(0.1)}>
            <p className={styles.cardKicker}>Оценки по критериям</p>
            <CriteriaBars criteria={rating.criteria} />
          </motion.article>

          <motion.article className={`${styles.card} ${styles.factsCard}`} {...reveal(0.15)}>
            <p className={styles.cardKicker}>Сведения о компании</p>
            <dl className={styles.facts}>
              {facts.filter((f) => f.value).map((fact) => (
                <div key={fact.label}>
                  <dt><fact.icon size={14} aria-hidden="true" /> {fact.label}</dt>
                  <dd>{fact.href ? <a href={fact.href} target={fact.label === 'Сайт' ? '_blank' : undefined} rel="noreferrer">{fact.value}</a> : fact.value}</dd>
                </div>
              ))}
            </dl>
          </motion.article>
        </section>

        {company.description && (
          <motion.section className={styles.about} {...reveal()}>
            <p className={styles.cardKicker}>О компании</p>
            <p>{company.description}</p>
          </motion.section>
        )}

        {/* ---------- Аналитика ---------- */}
        <section className={styles.section} aria-labelledby="analytics-title">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Аналитика</p>
              <h2 id="analytics-title">Как менялись оценки.</h2>
            </div>
            <div className={styles.viewSwitch} role="radiogroup" aria-label="Вид аналитики">
              <button type="button" role="radio" aria-checked={!asTable} onClick={() => setAsTable(false)}>Графики</button>
              <button type="button" role="radio" aria-checked={asTable} onClick={() => setAsTable(true)}>Таблица</button>
            </div>
          </div>

          <div className={styles.analyticsGrid}>
            <motion.article className={`${styles.card} ${styles.trendCard}`} {...reveal()}>
              <div className={styles.chartHead}>
                <div><h3>Средняя оценка по месяцам</h3><p>Последние 12 месяцев с отзывами, шкала 1–5</p></div>
              </div>
              <TrendChart points={analytics.monthlyTrend} asTable={asTable} />
            </motion.article>

            <motion.article className={styles.card} {...reveal(0.05)}>
              <div className={styles.chartHead}>
                <div><h3>Распределение оценок</h3><p>{reviewsLabel(rating.reviewsCount)}, общая оценка</p></div>
              </div>
              <DistributionChart distribution={analytics.distribution} asTable={asTable} />
            </motion.article>

            <motion.article className={styles.card} {...reveal(0.1)}>
              <div className={styles.chartHead}>
                <div><h3>Нынешние и бывшие сотрудники</h3><p>Средние по критериям</p></div>
              </div>
              <CriteriaComparison analytics={analytics} asTable={asTable} />
            </motion.article>
          </div>
        </section>

        {/* ---------- Отзывы ---------- */}
        <section className={styles.section} aria-labelledby="reviews-title">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Отзывы сотрудников</p>
              <h2 id="reviews-title">{reviewsTotal} {plural(reviewsTotal, ['голос', 'голоса', 'голосов'])} изнутри.</h2>
            </div>
            {!isOwnCompany && <button className={styles.secondary} type="button" onClick={startReview}><PenLine size={15} aria-hidden="true" /> Написать отзыв</button>}
          </div>

          {reviews.length === 0 ? (
            <div className={styles.emptyReviews}>
              <strong>Отзывов пока нет.</strong>
              <p>Станьте первым, кто расскажет о работе в {company.name}.</p>
            </div>
          ) : (
            <div className={styles.reviewList}>
              {reviews.map((review, index) => (
                <ReviewCard key={review.id} review={review} index={index} canAppeal={canAppeal} onAppeal={setAppealTarget} />
              ))}
            </div>
          )}

          {reviewsPage + 1 < reviewsPages && (
            <button className={styles.more} type="button" onClick={loadMoreReviews} disabled={loadingMore}>
              {loadingMore ? 'Загружаем…' : `Показать ещё · ${reviewsTotal - reviews.length}`}
            </button>
          )}
        </section>
      </div>

      <ReviewFormDialog
        open={writeOpen}
        companySlug={company.slug}
        companyName={company.name}
        onClose={() => setWriteOpen(false)}
        onCreated={(review) => {
          setWriteOpen(false)
          setReviews((current) => [review, ...current])
          setReviewsTotal((n) => n + 1)
          setNotice('Спасибо! Отзыв опубликован, рейтинг компании обновлён.')
          loadCompany().catch(() => undefined)
        }}
      />

      <AppealDialog
        key={appealTarget?.id ?? 'none'}
        review={appealTarget}
        onClose={() => setAppealTarget(null)}
        onSubmitted={() => {
          setAppealTarget(null)
          setNotice('Заявка отправлена модераторам. Отзыв помечен как «на проверке».')
          loadReviews().catch(() => undefined)
        }}
      />

      {notice && (
        <motion.div className={styles.toast} role="status" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Check size={15} aria-hidden="true" /> {notice}
        </motion.div>
      )}
    </div>
  )
}
