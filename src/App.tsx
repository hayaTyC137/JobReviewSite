import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, MouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { animate, stagger } from 'animejs'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Check,
  ChevronDown,
  Clock3,
  Database,
  ExternalLink,
  Eye,
  FileCheck2,
  Flag,
  Building2,
  MapPin,
  Menu,
  MessageSquareText,
  Search,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  UsersRound,
  X,
} from 'lucide-react'
import officeImage from './assets/office.jpg'
import trustImage from './assets/trust-handshake.jpg'
import workImage from './assets/work-station.jpg'
import './App.css'

type Mode = 'candidate' | 'hr'
type Rating = [label: string, score: string, width: number]

type CompanyReport = {
  id: string
  glyph: string
  name: string
  meta: string
  industry: string
  score: string
  recommendation: string
  reviews: string
  ratings: Rating[]
  hasData: boolean
}

type CompanyProfile = {
  id: string
  name: string
  legalName: string
  glyph: string
  city: string
  address: string
  website: string
  industry: string
  employees: string
  founded: string
  score: number
  recommendation: number
  reviews: number
  verifiedStories: number
  updated: string
  dimensions: Array<{ label: string; score: number; color: string }>
  trend: number[]
  signals: Array<{ label: string; value: string; detail: string; tone: 'positive' | 'neutral' | 'warning' }>
  sources: Array<{ label: string; detail: string; status: string }>
  reviewsList: Array<{ initials: string; role: string; date: string; score: string; text: string }>
}

const companyProfiles: CompanyProfile[] = [
  {
    id: 'nova', name: 'NOVA Studio', legalName: 'ООО «Нова Диджитал»', glyph: 'N', city: 'Москва', address: 'ул. Большая Дмитровка, 12, стр. 3', website: 'nova.studio', industry: 'Дизайн и цифровые продукты', employees: '240 сотрудников', founded: '2014', score: 88, recommendation: 82, reviews: 216, verifiedStories: 216, updated: 'сегодня, 09:42',
    dimensions: [{ label: 'Команда', score: 4.9, color: 'accent' }, { label: 'Развитие', score: 4.6, color: 'blue' }, { label: 'Условия', score: 4.4, color: 'gold' }, { label: 'Баланс', score: 4.3, color: 'ink' }],
    trend: [62, 65, 66, 72, 75, 79, 84, 88],
    signals: [{ label: 'Подтверждённый опыт', value: '98%', detail: 'данных о ролях подтверждено', tone: 'positive' }, { label: 'Стабильность команды', value: '4.6/5', detail: 'оценка за последние 12 месяцев', tone: 'neutral' }, { label: 'Риск-сигнал', value: 'низкий', detail: '2 повторяющиеся темы требуют внимания', tone: 'warning' }],
    sources: [{ label: 'Отзывы сотрудников', detail: '216 подтверждённых историй', status: 'проверено' }, { label: 'Открытые реестры', detail: 'юридические сведения и адрес', status: 'проверено' }, { label: 'Профили специалистов', detail: 'роли, сроки и динамика команды', status: 'сверено' }],
    reviewsList: [{ initials: 'АК', role: 'Бывший Product Designer', date: '12 августа 2026', score: '4.8', text: 'Сильная команда и прозрачные ожидания. Темп высокий, но решения не принимаются в отрыве от людей.' }, { initials: 'МВ', role: 'Действующий аналитик', date: '03 августа 2026', score: '4.6', text: 'Условия совпали с тем, что обсуждали на интервью. Есть пространство влиять на процессы и расти внутри продукта.' }, { initials: 'ДР', role: 'Бывший Frontend Engineer', date: '27 июля 2026', score: '4.4', text: 'Нравилась культура обратной связи. Стоит уточнять процесс согласований для задач между несколькими командами.' }],
  },
  {
    id: 'orbita', name: 'ORBITA Labs', legalName: 'ООО «Орбита Лабс»', glyph: 'O', city: 'Санкт-Петербург', address: 'Кронверкский проспект, 23', website: 'orbita-labs.ru', industry: 'Исследования и технологии', employees: '96 сотрудников', founded: '2018', score: 81, recommendation: 78, reviews: 148, verifiedStories: 148, updated: 'вчера, 18:20',
    dimensions: [{ label: 'Команда', score: 4.8, color: 'accent' }, { label: 'Развитие', score: 4.5, color: 'blue' }, { label: 'Условия', score: 4.3, color: 'gold' }, { label: 'Баланс', score: 4.2, color: 'ink' }],
    trend: [58, 61, 63, 65, 70, 73, 77, 81],
    signals: [{ label: 'Подтверждённый опыт', value: '91%', detail: 'данных о ролях подтверждено', tone: 'positive' }, { label: 'Стабильность команды', value: '4.2/5', detail: 'оценка за последние 12 месяцев', tone: 'neutral' }, { label: 'Риск-сигнал', value: 'средний', detail: 'есть вопросы к прозрачности роста', tone: 'warning' }],
    sources: [{ label: 'Отзывы сотрудников', detail: '148 подтверждённых историй', status: 'проверено' }, { label: 'Открытые реестры', detail: 'юридические сведения и адрес', status: 'проверено' }, { label: 'Профили специалистов', detail: 'роли, сроки и динамика команды', status: 'сверено' }],
    reviewsList: [{ initials: 'ЛС', role: 'Действующий исследователь', date: '05 августа 2026', score: '4.7', text: 'Много самостоятельности и сильная техническая среда. Про процессы роста лучше спрашивать заранее.' }, { initials: 'РК', role: 'Бывший инженер', date: '19 июля 2026', score: '4.2', text: 'Команда держит слово, но приоритеты могут меняться быстрее, чем успевают обновляться планы.' }],
  },
  {
    id: 'mosaic', name: 'MOSAIC Studio', legalName: 'ООО «Мозаик Креатив»', glyph: 'M', city: 'Казань', address: 'ул. Пушкина, 30', website: 'mosaic.studio', industry: 'Продуктовый дизайн', employees: '74 сотрудника', founded: '2017', score: 91, recommendation: 89, reviews: 91, verifiedStories: 91, updated: '2 дня назад',
    dimensions: [{ label: 'Команда', score: 5.0, color: 'accent' }, { label: 'Развитие', score: 4.7, color: 'blue' }, { label: 'Условия', score: 4.6, color: 'gold' }, { label: 'Баланс', score: 4.5, color: 'ink' }],
    trend: [68, 70, 74, 75, 80, 84, 87, 91],
    signals: [{ label: 'Подтверждённый опыт', value: '100%', detail: 'данных о ролях подтверждено', tone: 'positive' }, { label: 'Стабильность команды', value: '4.8/5', detail: 'оценка за последние 12 месяцев', tone: 'neutral' }, { label: 'Риск-сигнал', value: 'низкий', detail: 'одна тема требует дополнительного контекста', tone: 'warning' }],
    sources: [{ label: 'Отзывы сотрудников', detail: '91 подтверждённая история', status: 'проверено' }, { label: 'Открытые реестры', detail: 'юридические сведения и адрес', status: 'проверено' }, { label: 'Профили специалистов', detail: 'роли, сроки и динамика команды', status: 'сверено' }],
    reviewsList: [{ initials: 'ИН', role: 'Действующий арт-директор', date: '01 августа 2026', score: '5.0', text: 'Очень сильная культура обратной связи. Команда умеет обсуждать сложное без лишней политики.' }, { initials: 'АС', role: 'Бывший дизайнер', date: '22 июля 2026', score: '4.7', text: 'Хороший баланс автономии и поддержки. Важно быть готовым к высокому темпу.' }],
  },
]

const reviewData = [
  {
    initials: 'АК',
    role: 'Бывший Product Designer',
    date: '12 августа 2026',
    text: 'Сильная команда и прозрачные ожидания. Темп высокий, но решения не принимаются в отрыве от людей.',
    score: '4.8',
  },
  {
    initials: 'МВ',
    role: 'Действующий аналитик',
    date: '03 августа 2026',
    text: 'Условия совпали с тем, что обсуждали на интервью. Есть пространство влиять на процессы и расти внутри продукта.',
    score: '4.6',
  },
  {
    initials: 'ДР',
    role: 'Бывший Frontend Engineer',
    date: '27 июля 2026',
    text: 'Нравилась культура обратной связи. Стоит уточнять процесс согласований для задач между несколькими командами.',
    score: '4.4',
  },
]

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
}

const fragmentReveal = {
  hidden: { opacity: 0, y: 34, clipPath: 'inset(16% 0 0 0)' },
  visible: { opacity: 1, y: 0, clipPath: 'inset(0 0 0 0)' },
}

const faithLines = ['НЕ ВЕРИШЬ ИМ', 'ПОВЕРЬ НАМ', 'НЕ ВЕРИШЬ ИМ', 'ПОВЕРЬ НАМ']
const searchExamples = ['Northline Digital', 'ORBITA Labs', 'MOSAIC Studio', 'RADIUS Systems']

function App() {
  const prefersReducedMotion = useReducedMotion() ?? false
  const [view, setView] = useState<'home' | 'dashboard' | 'directory'>('home')
  const [mode, setMode] = useState<Mode>('candidate')
  const [query, setQuery] = useState('')
  const [company, setCompany] = useState('NOVA Studio')
  const [selectedProfile, setSelectedProfile] = useState<CompanyProfile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [validationError, setValidationError] = useState('')
  const [savedCompanies, setSavedCompanies] = useState<string[]>([])
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [placeholderText, setPlaceholderText] = useState('')
  const [heroInView, setHeroInView] = useState(!prefersReducedMotion)
  const [marqueeInView, setMarqueeInView] = useState(!prefersReducedMotion)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const heroSectionRef = useRef<HTMLElement>(null)
  const marqueeRef = useRef<HTMLDivElement>(null)
  const marqueeInViewRef = useRef(marqueeInView)
  const marqueeOffsetRef = useRef(0)
  const marqueeMomentumRef = useRef(0)
  const marqueeLoopWidthRef = useRef(0)
  const marqueeDragRef = useRef({ active: false, pointerId: null as number | null, lastX: 0, lastTime: 0, velocity: 0 })
  useEffect(() => {
    if (prefersReducedMotion) return

    const scanAnimation = animate('.hero-scan-rule', {
      scaleX: [0, 1],
      opacity: [0, 0.85],
      duration: 1300,
      delay: 380,
      ease: 'outExpo',
    })

    const tickerAnimation = animate('.trust-ticker > div', {
      y: [12, 0],
      opacity: [0, 1],
      delay: stagger(100, { start: 650 }),
      duration: 850,
      ease: 'outExpo',
    })
    return () => {
      scanAnimation.pause()
      tickerAnimation.pause()
    }
  }, [prefersReducedMotion])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    if (prefersReducedMotion) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroSectionRef.current) setHeroInView(entry.isIntersecting)
        if (entry.target === marqueeRef.current) setMarqueeInView(entry.isIntersecting)
      })
    }, { threshold: 0.1 })

    if (heroSectionRef.current) observer.observe(heroSectionRef.current)
    if (marqueeRef.current) observer.observe(marqueeRef.current)

    return () => observer.disconnect()
  }, [prefersReducedMotion])

  useEffect(() => {
    marqueeInViewRef.current = marqueeInView
  }, [marqueeInView])

  const measureMarqueeLoop = () => {
    const track = marqueeRef.current
    const group = track?.querySelector<HTMLElement>('.report-marquee-group')
    if (!track || !group) return 0

    const gap = Number.parseFloat(window.getComputedStyle(track).gap) || 0
    marqueeLoopWidthRef.current = group.getBoundingClientRect().width + gap
    return marqueeLoopWidthRef.current
  }

  const wrapMarqueeOffset = (offset: number) => {
    const loopWidth = marqueeLoopWidthRef.current || measureMarqueeLoop()
    if (!loopWidth) return offset

    const wrapped = offset % loopWidth
    return wrapped > 0 ? wrapped - loopWidth : wrapped
  }

  const renderMarqueeOffset = () => {
    if (!marqueeRef.current) return
    marqueeRef.current.style.transform = `translate3d(${marqueeOffsetRef.current}px, 0, 0)`
  }

  useEffect(() => {
    const track = marqueeRef.current
    if (!track) return

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      measureMarqueeLoop()
      marqueeOffsetRef.current = wrapMarqueeOffset(marqueeOffsetRef.current)
      renderMarqueeOffset()
    })
    resizeObserver?.observe(track)
    measureMarqueeLoop()
    renderMarqueeOffset()

    if (prefersReducedMotion || !marqueeInView) {
      return () => resizeObserver?.disconnect()
    }

    let frameId = 0
    let previousTime = performance.now()
    const tick = (time: number) => {
      const delta = Math.min(time - previousTime, 50)
      previousTime = time
      const drag = marqueeDragRef.current

      if (!drag.active && marqueeInViewRef.current) {
        if (Math.abs(marqueeMomentumRef.current) > 0.012) {
          marqueeOffsetRef.current = wrapMarqueeOffset(marqueeOffsetRef.current + marqueeMomentumRef.current * delta)
          marqueeMomentumRef.current *= Math.pow(0.9, delta / 16)
        } else {
          marqueeMomentumRef.current = 0
          marqueeOffsetRef.current = wrapMarqueeOffset(marqueeOffsetRef.current - 0.018 * delta)
        }
        renderMarqueeOffset()
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
    }
  }, [marqueeInView, prefersReducedMotion])

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) return

    const lenis = new Lenis({
      anchors: true,
      autoRaf: true,
      infinite: false,
      // A lower lerp and wheel multiplier keep the page deliberately calm;
      // reveal effects can then replay naturally when the user scrolls back.
      lerp: 0.045,
      smoothWheel: true,
      syncTouch: true,
      syncTouchLerp: 0.038,
      touchMultiplier: 0.72,
      wheelMultiplier: 0.48,
    })

    return () => lenis.destroy()
  }, [prefersReducedMotion])

  useEffect(() => {
    if (prefersReducedMotion) {
      return
    }

    let phraseIndex = 0
    let characterIndex = 0
    let removing = false
    let timerId = 0

    const tick = () => {
      const phrase = searchExamples[phraseIndex]

      if (removing) {
        characterIndex -= 1
        setPlaceholderText(phrase.slice(0, characterIndex))
        if (characterIndex === 0) {
          removing = false
          phraseIndex = (phraseIndex + 1) % searchExamples.length
        }
      } else {
        characterIndex += 1
        setPlaceholderText(phrase.slice(0, characterIndex))
        if (characterIndex === phrase.length) {
          removing = true
          timerId = window.setTimeout(tick, 1350)
          return
        }
      }

      timerId = window.setTimeout(tick, removing ? 42 : 82)
    }

    tick()
    return () => window.clearTimeout(timerId)
  }, [prefersReducedMotion])

  const showNotice = (message: string) => {
    setNotice(message)
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 2600)
  }

  const matchingProfiles = companyProfiles.filter((profile) => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
    if (!normalizedQuery) return false
    return `${profile.name} ${profile.legalName} ${profile.city}`.toLocaleLowerCase('ru-RU').includes(normalizedQuery)
  }).slice(0, 5)

  const openDashboard = (profile: CompanyProfile) => {
    setSelectedProfile(profile)
    setCompany(profile.name)
    setQuery(profile.name)
    setSearchOpen(false)
    setView('dashboard')
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }

  const openDirectory = () => {
    setView('directory')
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextCompany = query.trim()
    if (!nextCompany) {
      setValidationError('Введите название компании или ИНН.')
      searchInputRef.current?.focus()
      return
    }
    setValidationError('')
    const matchedProfile = companyProfiles.find((profile) => profile.name.toLocaleLowerCase('ru-RU') === nextCompany.toLocaleLowerCase('ru-RU'))
    if (!matchedProfile) {
      setSearchOpen(true)
      showNotice('Выберите компанию из подсказок, чтобы открыть полный профиль.')
      return
    }
    openDashboard(matchedProfile)
  }

  const handleQuickSearch = (nextCompany: string) => {
    setQuery(nextCompany)
    setValidationError('')
    const matchedProfile = companyProfiles.find((profile) => profile.name.toLocaleLowerCase('ru-RU') === nextCompany.toLocaleLowerCase('ru-RU'))
    if (matchedProfile) openDashboard(matchedProfile)
    else showNotice('Для этой компании пока нет демонстрационного профиля.')
  }

  const handleTilt = (event: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return

    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    setTilt({ x: -y * 5, y: x * 6 })
  }

  const scrollToReviews = () => {
    document.querySelector('#reviews')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }

  const handleMarqueePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button, a, input, select, textarea'))) return

    const now = performance.now()
    marqueeMomentumRef.current = 0
    marqueeDragRef.current = { active: true, pointerId: event.pointerId, lastX: event.clientX, lastTime: now, velocity: 0 }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.classList.add('is-dragging')
    event.preventDefault()
  }

  const handleMarqueePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = marqueeDragRef.current
    if (!drag.active || drag.pointerId !== event.pointerId) return

    const now = performance.now()
    const deltaTime = Math.max(now - drag.lastTime, 1)
    const deltaX = event.clientX - drag.lastX
    drag.velocity = deltaX / deltaTime
    drag.lastX = event.clientX
    drag.lastTime = now
    marqueeOffsetRef.current = wrapMarqueeOffset(marqueeOffsetRef.current + deltaX)
    renderMarqueeOffset()
    event.preventDefault()
  }

  const handleMarqueePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = marqueeDragRef.current
    if (!drag.active || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    event.currentTarget.classList.remove('is-dragging')
    marqueeMomentumRef.current = prefersReducedMotion ? 0 : Math.max(-1.2, Math.min(1.2, drag.velocity))
    marqueeDragRef.current = { active: false, pointerId: null, lastX: event.clientX, lastTime: performance.now(), velocity: 0 }
  }

  const hasCompanyData = company === 'NOVA Studio'
  const carouselCompanies: CompanyReport[] = [
    {
      id: 'nova',
      glyph: hasCompanyData ? 'N' : company.trim().charAt(0).toUpperCase() || '?',
      name: company,
      meta: hasCompanyData ? 'Москва · основана в 2014 · 240 сотрудников' : 'Профиль найден · данные проверяются',
      industry: hasCompanyData ? 'Дизайн и цифровые продукты' : 'Отрасль пока не подтверждена',
      score: hasCompanyData ? '4.7' : '—',
      recommendation: hasCompanyData ? 'Рекомендуют 82%' : 'Недостаточно данных',
      reviews: hasCompanyData ? '216 отзывов' : '0 подтверждённых отзывов',
      ratings: hasCompanyData ? [['Команда', '4.9', 98], ['Развитие', '4.6', 92], ['Условия', '4.4', 88], ['Баланс', '4.3', 86]] : [],
      hasData: hasCompanyData,
    },
    {
      id: 'orbita',
      glyph: 'O',
      name: 'ORBITA Labs',
      meta: 'Санкт-Петербург · основана в 2018 · 96 сотрудников',
      industry: 'Исследования и технологии',
      score: '4.5',
      recommendation: 'Рекомендуют 78%',
      reviews: '148 отзывов',
      ratings: [['Команда', '4.8', 96], ['Развитие', '4.5', 90], ['Условия', '4.3', 86], ['Баланс', '4.2', 84]],
      hasData: true,
    },
    {
      id: 'mosaic',
      glyph: 'M',
      name: 'MOSAIC Studio',
      meta: 'Казань · основана в 2017 · 74 сотрудника',
      industry: 'Продуктовый дизайн',
      score: '4.8',
      recommendation: 'Рекомендуют 89%',
      reviews: '91 отзыв',
      ratings: [['Команда', '5.0', 100], ['Развитие', '4.7', 94], ['Условия', '4.6', 92], ['Баланс', '4.5', 90]],
      hasData: true,
    },
  ]

  if (view === 'dashboard' && selectedProfile) {
    return <CompanyDashboard profile={selectedProfile} prefersReducedMotion={prefersReducedMotion} onBack={() => { setView('home'); setSelectedProfile(null); window.scrollTo({ top: 0, behavior: 'auto' }) }} onNotice={showNotice} />
  }

  if (view === 'directory') {
    return <CompanyDirectoryPreview prefersReducedMotion={prefersReducedMotion} onBack={() => { setView('home'); window.scrollTo({ top: 0, behavior: 'auto' }) }} />
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Контур - на главную">
          <span className="brand-mark"><ShieldCheck size={18} strokeWidth={2.3} /></span>
          <span>контур</span>
        </a>

        <nav className="desktop-nav" aria-label="Основная навигация">
          <a href="#report">Компании</a>
          <a href="#reviews">Отзывы</a>
          <a href="#for-hr">Для HR</a>
        </nav>

        <div className="header-actions">
          <button className="icon-button notification-button" type="button" aria-label="Уведомления" onClick={() => showNotice('Новых уведомлений нет')}>
            <Bell size={18} aria-hidden="true" />
          </button>
          <button className="profile-button" type="button" aria-label="Профиль пользователя" onClick={() => showNotice('Профиль пользователя скоро будет доступен')}>
            <span>АН</span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          <button
            className="icon-button mobile-menu-button"
            type="button"
            aria-controls="mobile-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            title={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              className="mobile-nav"
              id="mobile-navigation"
              aria-label="Мобильная навигация"
              initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            >
              <a onClick={() => setMenuOpen(false)} href="#report">Компании</a>
              <a onClick={() => setMenuOpen(false)} href="#reviews">Отзывы</a>
              <a onClick={() => setMenuOpen(false)} href="#for-hr">Для HR</a>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <section className={`hero-section ${heroInView ? 'faith-playing' : 'faith-paused'}`} id="top" ref={heroSectionRef}>
        <div className="kinetic-backdrop" aria-hidden="true">
          <div className="kinetic-lines">
            {faithLines.map((line, index) => (
              <div className={`faith-line-row ${index % 2 === 1 ? 'hollow' : ''}`} key={`${line}-${index}`}>
                <div className="faith-line-track">
                  <span className="faith-line">{line}</span>
                  <span className="faith-line" aria-hidden="true">{line}</span>
                  <span className="faith-line" aria-hidden="true">{line}</span>
                  <span className="faith-line" aria-hidden="true">{line}</span>
                  <span className="faith-line" aria-hidden="true">{line}</span>
                  <span className="faith-line" aria-hidden="true">{line}</span>
                </div>
              </div>
            ))}
          </div>
          <span className="hero-scan-rule" />
        </div>
        <div className="hero-inner">
          <motion.div
            className="hero-copy"
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
            transition={prefersReducedMotion ? { duration: 0 } : { staggerChildren: 0.11, delayChildren: 0.12 }}
          >
            <motion.div className="eyebrow" variants={reveal}>
              <span className="live-dot" />
              Независимый реестр работодателей
            </motion.div>
            <motion.h1 variants={reveal}><span className="hero-title-accent"><span className="hero-title-word">Знайте</span><svg className="hero-title-loop" viewBox="0 0 220 76" aria-hidden="true"><path pathLength="1" d="M 110 8 C 174 5, 217 18, 211 39 C 205 62, 161 70, 105 68 C 48 67, 9 57, 9 38 C 9 17, 50 8, 110 8 C 150 7, 186 13, 203 26" /></svg></span>, куда<br />вы устраиваетесь.</motion.h1>
            <motion.p className="hero-lede" variants={reveal}>
              Отзывы сотрудников, сигналы культуры и проверенная история компании в одном честном отчёте.
            </motion.p>

            <motion.form className="search-panel" onSubmit={handleSearch} variants={reveal}>
              <Search size={20} aria-hidden="true" />
              <label className="sr-only" htmlFor="company-search">Название компании или ИНН</label>
              <input
                id="company-search"
                ref={searchInputRef}
                aria-describedby={validationError ? 'company-search-error' : undefined}
                aria-invalid={Boolean(validationError)}
                autoComplete="organization"
                maxLength={120}
                aria-required="true"
                value={query}
                aria-label="Введите название компании"
                placeholder={prefersReducedMotion ? searchExamples[0] : placeholderText ? placeholderText + '▍' : 'Компания или ИНН'}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => { setQuery(event.target.value); setSearchOpen(true) }}
              />
              <motion.button type="submit" whileHover={prefersReducedMotion ? undefined : { y: -2 }} whileTap={prefersReducedMotion ? undefined : { y: 1 }}>Проверить <ArrowRight size={17} /></motion.button>
            </motion.form>
            {searchOpen && query.trim() && (
              <div className="search-suggestions" role="listbox" aria-label="Подсказки компаний">
                {matchingProfiles.length > 0 ? matchingProfiles.map((profile) => (
                  <button key={profile.id} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => openDashboard(profile)}>
                    <span className="suggestion-glyph">{profile.glyph}</span>
                    <span><strong>{profile.name}</strong><small>{profile.city} · {profile.industry}</small></span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>
                )) : <p className="suggestions-empty">Компания не найдена в демонстрационном реестре.</p>}
              </div>
            )}
            {validationError && <p className="search-error" id="company-search-error" role="alert">{validationError}</p>}

            <motion.div className="quick-searches" variants={reveal}>
              <span>Популярное:</span>
              {['NOVA Studio', 'ORBITA Labs', 'MOSAIC Studio'].map((item) => (
                <motion.button key={item} type="button" whileHover={prefersReducedMotion ? undefined : { y: -2 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }} onClick={() => handleQuickSearch(item)}>
                  {item}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="hero-stage"
            initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.7, delay: prefersReducedMotion ? 0 : 0.25 }}
          >
            <div className="stage-image-wrap">
              <img src={officeImage} decoding="async" alt="Рабочее пространство компании" />
              <div className="stage-image-label">
                <span>Внутри компании</span>
                <strong>Не только вакансии</strong>
              </div>
            </div>

            <motion.div
              className="report-float"
              onMouseMove={handleTilt}
              onMouseLeave={() => setTilt({ x: 0, y: 0 })}
              animate={prefersReducedMotion ? { rotateX: 0, rotateY: 0, y: 0 } : { rotateX: tilt.x, rotateY: tilt.y, y: heroInView ? [0, -7, 0] : 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { y: { repeat: Infinity, duration: 4.4, ease: 'easeInOut' }, rotateX: { duration: 0.2 }, rotateY: { duration: 0.2 } }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="report-card-top">
                <span className="report-orbit"><Activity size={18} /></span>
                <span>{hasCompanyData ? 'Профиль проверен' : 'Нужны подтверждения'}</span>
                {hasCompanyData && <BadgeCheck size={19} className="verified-icon" aria-hidden="true" />}
              </div>
              <div className="report-company">
                <span className="company-glyph">{hasCompanyData ? 'N' : company.trim().charAt(0).toUpperCase() || '?'}</span>
                <div>
                  <strong>{company}</strong>
                  <span>{hasCompanyData ? 'Дизайн и цифровые продукты' : 'Отрасль пока не подтверждена'}</span>
                </div>
              </div>
              <div className="score-row">
                <div className="score-ring"><span>{hasCompanyData ? '88' : '—'}</span><small>{hasCompanyData ? '/100' : ''}</small></div>
                <div>
                  <span className="muted-label">Индекс доверия</span>
                  <strong>{hasCompanyData ? 'Выше рынка' : 'Ожидает проверки'}</strong>
                  <span className="score-growth">{hasCompanyData ? <><ArrowUpRight size={14} aria-hidden="true" /> +12 за квартал</> : 'Данные собираются'}</span>
                </div>
              </div>
              <div className={`signal-bars${hasCompanyData ? '' : ' is-empty'}`} role={hasCompanyData ? 'img' : undefined} aria-label={hasCompanyData ? 'Динамика доверия по семи периодам: 39, 55, 46, 71, 64, 91 и 78 процентов.' : undefined}>
                {hasCompanyData ? <>
                  <span style={{ height: '39%' }} />
                  <span style={{ height: '55%' }} />
                  <span style={{ height: '46%' }} />
                  <span style={{ height: '71%' }} />
                  <span style={{ height: '64%' }} />
                  <span className="active-bar" style={{ height: '91%' }} />
                  <span className="active-bar" style={{ height: '78%' }} />
                </> : <span className="signal-bars-empty">Нет подтверждённой динамики</span>}
              </div>
              <div className="report-foot"><Users size={14} aria-hidden="true" /> {hasCompanyData ? '216 подтверждённых историй' : 'Истории ещё не подтверждены'}</div>
            </motion.div>

            <motion.div
              className="stage-callout"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.35, delay: prefersReducedMotion ? 0 : 0.9 }}
            >
              <span className="callout-icon"><FileCheck2 size={16} /></span>
              <div><strong>{hasCompanyData ? 'Факты сверены' : 'Проверка нужна'}</strong><span>{hasCompanyData ? 'по 11 источникам' : 'данные ещё не сверены'}</span></div>
            </motion.div>
          </motion.div>
        </div>

        <div className="trust-ticker">
          <div><span>01</span><strong>46 000+</strong><small>проверенных компаний</small></div>
          <div><span>02</span><strong>1.8 млн</strong><small>сигналов и отзывов</small></div>
          <div><span>03</span><strong>89%</strong><small>данных подтверждено</small></div>
          <div className="ticker-seal"><ShieldCheck size={25} /><span>Ваш следующий выбор<br />должен быть осознанным</span></div>
        </div>
      </section>

      <section className="report-section" id="report">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Отчёт компании</p>
            <h2>Картина, которую не видно в вакансии.</h2>
          </div>
          <div className="mode-switch" role="group" aria-label="Выбор сценария">
            <button className={mode === 'candidate' ? 'active' : ''} aria-pressed={mode === 'candidate'} type="button" onClick={() => setMode('candidate')}>Соискатель</button>
            <button className={mode === 'hr' ? 'active' : ''} aria-pressed={mode === 'hr'} type="button" onClick={() => setMode('hr')}>HR</button>
          </div>
        </div>

        <div className="report-showcase">
          <motion.div
            className="report-marquee"
            data-lenis-prevent-horizontal
            initial={prefersReducedMotion ? false : 'hidden'}
            whileInView={prefersReducedMotion ? undefined : 'visible'}
            variants={fragmentReveal}
            transition={{ duration: prefersReducedMotion ? 0 : 0.65, ease: 'easeOut' }}
            viewport={{ once: false, amount: 0.2 }}
          >
            <div
              className="report-marquee-track"
              ref={marqueeRef}
              onPointerDown={handleMarqueePointerDown}
              onPointerMove={handleMarqueePointerMove}
              onPointerUp={handleMarqueePointerUp}
              onPointerCancel={handleMarqueePointerUp}
            >
              {[0, 1].map((loop) => (
                <div className="report-marquee-group" aria-hidden={loop === 1} inert={loop === 1 ? true : undefined} key={loop}>
                  {carouselCompanies.map((entry) => (
          <article className="company-report carousel-report" key={entry.id}>
            <div className="company-report-head">
              <div className="company-id">
                <span className="company-glyph large">{entry.glyph}</span>
                <div><h3>{entry.name}</h3><p>{entry.meta}</p></div>
              </div>
              <button
                className="icon-button pale"
                type="button"
                aria-label={savedCompanies.includes(entry.id) ? 'Удалить компанию из сохранённых' : 'Сохранить компанию'}
                aria-pressed={savedCompanies.includes(entry.id)}
                title={savedCompanies.includes(entry.id) ? 'Удалить из сохранённых' : 'Сохранить компанию'}
                onClick={() => setSavedCompanies((current) => current.includes(entry.id) ? current.filter((id) => id !== entry.id) : [...current, entry.id])}
              ><Star size={18} fill={savedCompanies.includes(entry.id) ? 'currentColor' : 'none'} /></button>
            </div>

            <div className="report-tabs" aria-hidden="true">
              <span className="selected">Обзор</span>
              <span>Культура</span>
              <span>Интервью</span>
              <span>Зарплаты</span>
            </div>

            <div className="report-overview">
              <div className="overall-score">
                <ScoreRing value={entry.score} suffix={entry.hasData ? '/ 5' : ''} />
                <div><p>Общая оценка</p><strong>{entry.recommendation}</strong><span>на основе {entry.reviews}</span></div>
              </div>
              <div className="rating-list">
                {entry.hasData ? entry.ratings.map(([label, score, width]) => (
                  <div className="rating-line" key={label}>
                    <div><span>{label}</span><strong>{score}</strong></div>
                    <span className="rating-track"><i style={{ width: String(width) + '%' }} /></span>
                  </div>
                )) : <p className="rating-empty">Рейтинг появится после подтверждения данных.</p>}
              </div>
            </div>

            <div className="insight-row">
              <Sparkles size={19} aria-hidden="true" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={`${entry.id}-${mode}-${entry.hasData}`}
                  aria-live="polite"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -7 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: 'easeOut' }}
                >
                  {entry.hasData ? (mode === 'candidate' ? 'Чаще всего отмечают самостоятельность, сильную экспертизу команды и честный фидбек.' : 'У 73% сотрудников опыт подтверждён в профилях и открытых источниках.') : 'Для этой компании пока недостаточно подтверждённых данных для вывода.'}
                </motion.p>
              </AnimatePresence>
              <span className="insight-arrow" aria-hidden="true"><ArrowUpRight size={17} /></span>
            </div>
          </article>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.aside
            className="evidence-panel"
            initial={prefersReducedMotion ? false : 'hidden'}
            whileInView={prefersReducedMotion ? undefined : 'visible'}
            variants={fragmentReveal}
            transition={{ duration: prefersReducedMotion ? 0 : 0.65, delay: prefersReducedMotion ? 0 : 0.12, ease: 'easeOut' }}
            viewport={{ once: false, amount: 0.25 }}
          >
            <div className="evidence-image"><img src={workImage} loading="lazy" decoding="async" alt="Специалист за рабочим местом" /></div>
            <div className="evidence-copy">
              <span className="evidence-label"><Eye size={15} /> Взгляд изнутри</span>
              <blockquote>«На интервью называют реальные рамки задач. После выхода не было неприятных сюрпризов».</blockquote>
              <div className="quote-person"><span>ЕК</span><p>Елена К.<small>Product Designer · 2 года в компании</small></p></div>
            </div>
          </motion.aside>
        </div>
      </section>

      <section className="signals-section" id="for-hr">
        <div className="signals-intro">
          <p className="section-kicker">Проверка с контекстом</p>
          <h2>Факты важнее<br />впечатлений.</h2>
          <p>Контур связывает опыт, отзывы и репутационные сигналы в одну понятную линию.</p>
          <button className="text-action" type="button" onClick={scrollToReviews}>Смотреть отзывы <ArrowRight size={17} /></button>
        </div>
        <div className="signals-list">
          <motion.article className="signal-item" initial={prefersReducedMotion ? false : 'hidden'} whileInView={prefersReducedMotion ? undefined : 'visible'} variants={fragmentReveal} viewport={{ once: false, amount: 0.45 }}>
            <span className="signal-number">01</span>
            <div><BadgeCheck size={22} /><h3>Подтверждённый опыт</h3><p>Видно, где информация подтверждена и на что можно опереться.</p></div>
            <ArrowUpRight size={19} aria-hidden="true" />
          </motion.article>
          <motion.article className="signal-item" initial={prefersReducedMotion ? false : 'hidden'} whileInView={prefersReducedMotion ? undefined : 'visible'} variants={fragmentReveal} viewport={{ once: false, amount: 0.45 }}>
            <span className="signal-number">02</span>
            <div><MessageSquareText size={22} /><h3>Отзывы с весом</h3><p>Мнение сотрудника показано вместе с его ролью, сроком работы и свежестью данных.</p></div>
            <ArrowUpRight size={19} aria-hidden="true" />
          </motion.article>
          <motion.article className="signal-item" initial={prefersReducedMotion ? false : 'hidden'} whileInView={prefersReducedMotion ? undefined : 'visible'} variants={fragmentReveal} viewport={{ once: false, amount: 0.45 }}>
            <span className="signal-number">03</span>
            <div><Flag size={22} /><h3>Риск-сигналы</h3><p>Повторяющиеся темы в отзывах не теряются между яркими обещаниями.</p></div>
            <ArrowUpRight size={19} aria-hidden="true" />
          </motion.article>
        </div>
        <div className="handshake-panel">
          <img src={trustImage} loading="lazy" decoding="async" alt="Рукопожатие как знак доверия" />
          <div><span>Доверие начинается с прозрачности</span><strong>Никаких догадок.<br />Только контекст.</strong></div>
          <div className="handshake-stamp"><Check size={20} /> Проверено</div>
        </div>
      </section>

      <section className="reviews-section" id="reviews">
        <div className="reviews-head">
          <div><p className="section-kicker">Живые отзывы</p><h2>Голоса тех, кто был внутри.</h2></div>
          <span className="filter-label"><SlidersHorizontal size={18} aria-hidden="true" /> Все отзывы</span>
        </div>
        <div className="review-list">
          {reviewData.map((review, index) => (
            <motion.article
              className="review-card"
              key={review.initials}
              initial={prefersReducedMotion ? false : 'hidden'}
              whileInView={prefersReducedMotion ? undefined : 'visible'}
              variants={fragmentReveal}
              transition={{ duration: prefersReducedMotion ? 0 : 0.35, delay: prefersReducedMotion ? 0 : index * 0.08 }}
              viewport={{ once: false, amount: 0.3 }}
            >
              <div className="review-top"><span className="avatar">{review.initials}</span><div><strong>{review.role}</strong><small><Clock3 size={13} /> {review.date}</small></div><span className="review-score">{review.score} <Star size={13} fill="currentColor" /></span></div>
              <p>{review.text}</p>
              <div className="review-bottom"><span><Check size={14} /> Опыт подтверждён</span><span className="review-link">Фрагмент отзыва</span></div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div><span className="cta-index">Контур / 01</span><h2>Следующая работа<br />должна быть вашей.</h2></div>
        <div className="cta-action"><p>Проверьте компанию до первого собеседования. Бесплатно и без следов для работодателя.</p><motion.button type="button" whileHover={prefersReducedMotion ? undefined : { y: -2 }} whileTap={prefersReducedMotion ? undefined : { y: 1 }} onClick={() => document.querySelector('#top')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' })}>Начать проверку <ArrowRight size={18} /></motion.button></div>
      </section>

      <section className="directory-cta" aria-labelledby="directory-cta-title">
        <div className="directory-cta-copy"><span className="cta-index">Контур / 02</span><h2 id="directory-cta-title">Есть кого<br /><em>проверить?</em></h2><p>Откройте полный список компаний и найдите следующую точку для проверки — по отрасли, городу, размеру команды и уровню доверия.</p></div>
        <motion.button className="directory-cta-button" type="button" whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.015 }} whileTap={prefersReducedMotion ? undefined : { scale: .98 }} onClick={openDirectory}><span>Полный список компаний</span><ArrowUpRight size={23} /></motion.button>
      </section>

      <footer className="site-footer">
        <a className="brand" href="#top"><span className="brand-mark"><ShieldCheck size={17} strokeWidth={2.3} /></span><span>контур</span></a>
        <p>Рынок труда, в котором выбор основан на фактах.</p>
        <span>© 2026 Контур</span>
      </footer>

      <AnimatePresence>
        {notice && <motion.div className="search-notice" role="status" aria-live="polite" initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }} transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}>{notice}</motion.div>}
      </AnimatePresence>
    </main>
  )
}

type DashboardProps = {
  profile: CompanyProfile
  prefersReducedMotion: boolean
  onBack: () => void
  onNotice: (message: string) => void
}

function ScoreRing({ value, suffix, className = 'large-ring' }: { value: string; suffix: string; className?: string }) {
  const numericValue = Number.parseFloat(value)
  const progress = Number.isFinite(numericValue) ? Math.min(100, Math.max(0, numericValue / 5 * 100)) : 0
  return <div className={`score-ring ${className}`} style={{ '--score-progress': `${progress}%` } as CSSProperties}><span>{value}</span><small>{suffix}</small></div>
}

function CompanyDirectoryPreview({ prefersReducedMotion, onBack }: { prefersReducedMotion: boolean; onBack: () => void }) {
  return (
    <main className="directory-preview">
      <header className="dashboard-header"><button className="dashboard-back" type="button" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" /> Вернуться на главную</button><div className="dashboard-header-meta"><span>Контур / каталог компаний</span><span>Скоро</span></div></header>
      <section className="directory-preview-hero">
        <div><span className="section-kicker">Каталог компаний</span><h1>Найдите компанию<br /><em>по своим критериям.</em></h1><p>Отдельная страница поиска с фильтрами по отрасли, городу, размеру команды и индексу доверия появится следующим этапом.</p></div>
        <div className="directory-filter-preview" aria-label="Предпросмотр фильтров"><div><Search size={19} aria-hidden="true" /><span>Название или ИНН</span></div><div><SlidersHorizontal size={17} aria-hidden="true" /><span>Фильтры каталога</span></div><button type="button" onClick={onBack}>{prefersReducedMotion ? 'Вернуться к поиску' : 'Пока вернуться к поиску'}</button></div>
      </section>
    </main>
  )
}

function CompanyDashboard({ profile, prefersReducedMotion, onBack, onNotice }: DashboardProps) {
  const trendPoints = profile.trend.map((value, index) => `${index * 56 + 12} ${118 - value}`).join(' L ')

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <button className="dashboard-back" type="button" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" /> Вернуться к поиску</button>
        <div className="dashboard-header-meta"><span>Контур / company intelligence</span><span className="dashboard-live"><i /> Данные обновлены {profile.updated}</span></div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-demo-note dashboard-reveal reveal-from-top"><Activity size={15} aria-hidden="true" /> Демонстрационный профиль: показатели подготовлены для интерфейсного прототипа и будут заменены данными реестра.</div>

        <section className="dashboard-company-head dashboard-reveal reveal-from-bottom" aria-labelledby="dashboard-title">
          <div className="dashboard-company-identity">
            <span className="dashboard-company-glyph">{profile.glyph}</span>
            <div>
              <p className="section-kicker">Профиль работодателя</p>
              <h1 id="dashboard-title">{profile.name}</h1>
              <p className="dashboard-legal">{profile.legalName} · {profile.industry}</p>
            </div>
          </div>
          <div className="dashboard-actions">
            <button className="dashboard-action secondary" type="button" onClick={() => onNotice('Ссылка на отчёт скопирована')}><ExternalLink size={16} aria-hidden="true" /> Поделиться</button>
            <button className="dashboard-action primary" type="button" onClick={() => onNotice('Компания добавлена в сохранённые')}><Star size={16} aria-hidden="true" /> Сохранить</button>
          </div>
        </section>

        <nav className="dashboard-tabs dashboard-reveal reveal-from-top" aria-label="Разделы профиля компании">
          <a className="active" href="#dashboard-overview">Обзор</a>
          <a href="#dashboard-signals">Сигналы</a>
          <a href="#dashboard-reviews">Отзывы ({profile.reviews})</a>
          <a href="#dashboard-sources">Источники</a>
        </nav>

        <section className="dashboard-summary-grid dashboard-reveal reveal-from-bottom" aria-label="Ключевые показатели">
          <motion.article className="dashboard-score-card" initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion ? 0 : .55, ease: 'easeOut' }}>
            <div className="dashboard-card-kicker"><ShieldCheck size={15} aria-hidden="true" /> Индекс доверия</div>
            <div className="dashboard-score-main"><div className="dashboard-score-ring"><svg viewBox="0 0 130 130" aria-hidden="true"><circle className="score-ring-track" cx="65" cy="65" r="56" /><motion.circle className="score-ring-progress" cx="65" cy="65" r="56" initial={prefersReducedMotion ? { pathLength: profile.score / 100 } : { pathLength: 0 }} whileInView={{ pathLength: profile.score / 100 }} viewport={{ once: false, amount: .55 }} transition={{ duration: prefersReducedMotion ? 0 : 1.25, delay: prefersReducedMotion ? 0 : .15, ease: 'easeOut' }} /></svg><div className="score-ring-content"><span>{profile.score}</span><small>/100</small></div></div><div><strong>Выше рынка</strong><p>+12 пунктов за квартал</p><span>Рекомендуют {profile.recommendation}%</span></div></div>
            <div className="dashboard-score-foot"><span>Высокая уверенность</span><span>Обновлено сегодня</span></div>
          </motion.article>

          <motion.article className="dashboard-facts-card" initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion ? 0 : .55, delay: prefersReducedMotion ? 0 : .08, ease: 'easeOut' }}>
            <div className="dashboard-card-kicker"><Building2 size={15} aria-hidden="true" /> Основные сведения</div>
            <div className="facts-grid">
              <div><MapPin size={16} aria-hidden="true" /><span>Адрес</span><strong>{profile.city}, {profile.address}</strong></div>
              <div><ExternalLink size={16} aria-hidden="true" /><span>Сайт</span><strong>{profile.website}</strong></div>
              <div><UsersRound size={16} aria-hidden="true" /><span>Размер команды</span><strong>{profile.employees}</strong></div>
              <div><Clock3 size={16} aria-hidden="true" /><span>На рынке с</span><strong>{profile.founded} года</strong></div>
            </div>
          </motion.article>
        </section>

        <section className="dashboard-section dashboard-reveal reveal-from-top" id="dashboard-overview" aria-labelledby="overview-title">
          <div className="dashboard-section-head"><div><p className="section-kicker">Динамика доверия</p><h2 id="overview-title">Что изменилось за год.</h2></div><span className="dashboard-period"><span className="period-active">12 месяцев</span><span>3 года</span></span></div>
          <div className="dashboard-charts-grid">
            <article className="dashboard-chart-card">
              <div className="chart-heading"><div><strong>Индекс доверия</strong><span>Помесячная динамика, баллы</span></div><b>{profile.score}<small>/100</small></b></div>
              <svg className="trust-chart" viewBox="0 0 404 140" role="img" aria-label={`Индекс доверия вырос с ${profile.trend[0]} до ${profile.score} баллов`} preserveAspectRatio="none">
                <defs><linearGradient id="trust-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ff5a1f" stopOpacity=".28" /><stop offset="1" stopColor="#ff5a1f" stopOpacity="0" /></linearGradient></defs>
                <motion.path className="chart-area" d={`M 12 118 L ${trendPoints} L 404 118 Z`} fill="url(#trust-fill)" initial={{ opacity: prefersReducedMotion ? .7 : 0 }} whileInView={{ opacity: .7 }} viewport={{ once: false, amount: .35 }} transition={{ duration: prefersReducedMotion ? 0 : .7, delay: prefersReducedMotion ? 0 : 1.05 }} />
                <motion.path className="chart-line" pathLength="1" d={`M ${trendPoints}`} fill="none" stroke="#ff5a1f" strokeWidth="3" strokeLinecap="square" initial={prefersReducedMotion ? { pathLength: 1 } : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: false, amount: .35 }} transition={{ duration: prefersReducedMotion ? 0 : 1.5, delay: prefersReducedMotion ? 0 : .2, ease: 'easeInOut' }} />
                {profile.trend.map((value, index) => <motion.circle className="chart-point" key={value + index} cx={index * 56 + 12} cy={118 - value} r="3.5" fill="#fff8f0" stroke="#ff5a1f" strokeWidth="2" initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: .35 }} transition={{ duration: prefersReducedMotion ? 0 : .3, delay: prefersReducedMotion ? 0 : 1.1 + index * .09, ease: 'backOut' }} />)}
                {[0, 25, 50, 75, 100].map((line) => <line key={line} x1="12" x2="404" y1={118 - line} y2={118 - line} stroke="#d7c5b5" strokeDasharray="2 5" opacity=".65" />)}
              </svg>
              <div className="chart-axis"><span>Авг 25</span><span>Ноя 25</span><span>Фев 26</span><span>Май 26</span><span>Авг 26</span></div>
            </article>
            <article className="dashboard-chart-card dimensions-card">
              <div className="chart-heading"><div><strong>Состав оценки</strong><span>По отзывам сотрудников</span></div><BadgeCheck size={21} className="chart-check" aria-hidden="true" /></div>
              <div className="dimension-list">{profile.dimensions.map((dimension, index) => <div className="dimension-row" key={dimension.label}><div><span>{String(index + 1).padStart(2, '0')}</span><strong>{dimension.label}</strong><b>{dimension.score.toFixed(1)}</b></div><div className="dimension-track"><i className={dimension.color} style={{ width: `${dimension.score / 5 * 100}%`, animationDelay: `${index * 80}ms` }} /></div></div>)}</div>
            </article>
          </div>
        </section>

        <section className="dashboard-section dashboard-reveal reveal-from-bottom" id="dashboard-signals" aria-labelledby="signals-title">
          <div className="dashboard-section-head"><div><p className="section-kicker">Сигналы культуры</p><h2 id="signals-title">Факты рядом с впечатлениями.</h2></div><span className="section-count">03 ключевых сигнала</span></div>
          <div className="dashboard-signal-grid">{profile.signals.map((signal, index) => <motion.article className={`dashboard-signal-card ${signal.tone}`} key={signal.label} initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .4 }} transition={{ duration: prefersReducedMotion ? 0 : .35, delay: prefersReducedMotion ? 0 : index * .08 }}><div className="signal-card-top"><span>0{index + 1}</span>{signal.tone === 'warning' ? <ShieldAlert size={18} aria-hidden="true" /> : <BadgeCheck size={18} aria-hidden="true" />}</div><h3>{signal.label}</h3><strong>{signal.value}</strong><p>{signal.detail}</p></motion.article>)}</div>
        </section>

        <section className="dashboard-section dashboard-reviews-section dashboard-reveal reveal-from-top" id="dashboard-reviews" aria-labelledby="dashboard-reviews-title">
          <div className="dashboard-section-head"><div><p className="section-kicker">Подтверждённые голоса</p><h2 id="dashboard-reviews-title">Отзывы с контекстом.</h2></div><button className="dashboard-text-action" type="button" onClick={() => onNotice('Фильтры отзывов будут доступны после подключения реестра')}>Фильтровать <SlidersHorizontal size={16} aria-hidden="true" /></button></div>
          <div className="dashboard-review-grid">{profile.reviewsList.map((review, index) => <motion.article className="dashboard-review-card" key={review.initials} initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: prefersReducedMotion ? 0 : .35, delay: prefersReducedMotion ? 0 : index * .08 }}><div className="review-top"><span className="avatar">{review.initials}</span><div><strong>{review.role}</strong><small><Clock3 size={12} aria-hidden="true" /> {review.date}</small></div><span className="review-score">{review.score} <Star size={12} fill="currentColor" aria-hidden="true" /></span></div><p>{review.text}</p><div className="review-bottom"><span><Check size={13} aria-hidden="true" /> Опыт подтверждён</span><span className="review-link">Полный контекст</span></div></motion.article>)}</div>
        </section>

        <section className="dashboard-section dashboard-reveal reveal-from-bottom" id="dashboard-sources" aria-labelledby="sources-title">
          <div className="dashboard-section-head"><div><p className="section-kicker">Прозрачность отчёта</p><h2 id="sources-title">Откуда взялись данные.</h2></div><span className="section-count"><Database size={15} aria-hidden="true" /> {profile.verifiedStories} историй</span></div>
          <div className="source-list">{profile.sources.map((source) => <div className="source-row" key={source.label}><span className="source-icon"><Check size={15} aria-hidden="true" /></span><div><strong>{source.label}</strong><span>{source.detail}</span></div><b>{source.status}</b><ChevronDown size={16} aria-hidden="true" /></div>)}</div>
        </section>

        <div className="dashboard-next-step"><div><p className="section-kicker">Следующий шаг</p><h2>Соберите свой список вопросов.</h2><p>Используйте сигналы отчёта, чтобы подготовиться к интервью и уточнить важное до выхода на работу.</p></div><button className="dashboard-action primary" type="button" onClick={() => onNotice('Список вопросов сохранён в демо-профиле')}><Check size={16} aria-hidden="true" /> Сохранить вопросы</button></div>
      </div>
    </main>
  )
}

export default App
