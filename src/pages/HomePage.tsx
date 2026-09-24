import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { CSSProperties, FormEvent, MouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { animate, stagger } from 'animejs'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Clock3,
  Eye,
  FileCheck2,
  Flag,
  LogIn,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import type { CompanySummary } from '../api/types'
import { useAuth } from '../auth/authContext'
import { initials } from '../lib/format'
import officeImage from '../assets/office.jpg'
import trustImage from '../assets/trust-handshake.jpg'
import workImage from '../assets/work-station.jpg'
import './HomePage.css'

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
const popularCompanies = [
  { name: 'NOVA Studio', slug: 'nova-studio' },
  { name: 'ORBITA Labs', slug: 'orbita-labs' },
  { name: 'MOSAIC Studio', slug: 'mosaic-studio' },
]
// Карточка в hero — демонстрационный пример отчёта, а не результат поиска
const company = 'NOVA Studio'
const hasCompanyData = true

export function HomePage() {
  const prefersReducedMotion = useReducedMotion() ?? false
  const navigate = useNavigate()
  const { user, openLogin, logout } = useAuth()
  const [mode, setMode] = useState<Mode>('candidate')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<CompanySummary[]>([])
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

  // Подсказки берём из того же API, что и каталог (или из демо-данных, если бэкенд недоступен)
  useEffect(() => {
    const normalizedQuery = query.trim()
    // Пустой запрос: список подсказок и так скрыт, запрос не нужен
    if (!normalizedQuery) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      api.searchCompanies({ q: normalizedQuery, size: 5, sort: 'RATING_DESC' })
        .then((page) => { if (!cancelled) setSuggestions(page.items) })
        .catch(() => { if (!cancelled) setSuggestions([]) })
    }, 180)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query])

  const openCompany = (slug: string) => {
    setSearchOpen(false)
    navigate(`/companies/${slug}`)
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextCompany = query.trim()
    if (!nextCompany) {
      setValidationError('Введите название компании.')
      searchInputRef.current?.focus()
      return
    }
    setValidationError('')
    const exactMatch = suggestions.find((item) => item.name.toLocaleLowerCase('ru-RU') === nextCompany.toLocaleLowerCase('ru-RU'))
    // Точное совпадение — сразу в профиль, иначе в каталог с уже заполненным поиском
    if (exactMatch) openCompany(exactMatch.slug)
    else navigate(`/companies?q=${encodeURIComponent(nextCompany)}`)
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

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Контур - на главную">
          <span className="brand-mark"><ShieldCheck size={18} strokeWidth={2.3} /></span>
          <span>контур</span>
        </a>

        <nav className="desktop-nav" aria-label="Основная навигация">
          <Link to="/companies">Компании</Link>
          <a href="#reviews">Отзывы</a>
          <a href="#for-hr">Для HR</a>
        </nav>

        <div className="header-actions">
          {user ? (
            <button className="profile-button" type="button" aria-label={`Выйти из аккаунта ${user.displayName}`} title="Выйти" onClick={() => { logout(); showNotice('Вы вышли из аккаунта') }}>
              <span>{initials(user.displayName)}</span>
              <LogOut size={15} aria-hidden="true" />
            </button>
          ) : (
            <button className="profile-button login" type="button" onClick={() => openLogin()}>
              <LogIn size={15} aria-hidden="true" /> Войти
            </button>
          )}
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
              <Link onClick={() => setMenuOpen(false)} to="/companies">Компании</Link>
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
                {suggestions.length > 0 ? suggestions.map((item) => (
                  <button key={item.id} type="button" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => openCompany(item.slug)}>
                    <span className="suggestion-glyph">{item.name.charAt(0)}</span>
                    <span><strong>{item.name}</strong><small>{item.city} · {item.industry}</small></span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>
                )) : <p className="suggestions-empty">Точного совпадения нет — нажмите «Проверить», чтобы искать в каталоге.</p>}
              </div>
            )}
            {validationError && <p className="search-error" id="company-search-error" role="alert">{validationError}</p>}

            <motion.div className="quick-searches" variants={reveal}>
              <span>Популярное:</span>
              {popularCompanies.map((item) => (
                <motion.button key={item.slug} type="button" whileHover={prefersReducedMotion ? undefined : { y: -2 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }} onClick={() => openCompany(item.slug)}>
                  {item.name}
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
        <motion.button className="directory-cta-button" type="button" whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.015 }} whileTap={prefersReducedMotion ? undefined : { scale: .98 }} onClick={() => navigate('/companies')}><span>Полный список компаний</span><ArrowUpRight size={23} /></motion.button>
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

function ScoreRing({ value, suffix, className = 'large-ring' }: { value: string; suffix: string; className?: string }) {
  const numericValue = Number.parseFloat(value)
  const progress = Number.isFinite(numericValue) ? Math.min(100, Math.max(0, numericValue / 5 * 100)) : 0
  return <div className={`score-ring ${className}`} style={{ '--score-progress': `${progress}%` } as CSSProperties}><span>{value}</span><small>{suffix}</small></div>
}

