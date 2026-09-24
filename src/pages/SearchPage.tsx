import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { api } from '../api/client'
import type { CompanySearchParams, CompanySort, CompanySummary, Locations } from '../api/types'
import { AppHeader } from '../components/AppHeader'
import { CompanyCard, CompanyCardSkeleton } from '../components/CompanyCard'
import { FilterPanel } from '../components/FilterPanel'
import type { Filters } from '../components/FilterPanel'
import { CRITERIA } from '../lib/criteria'
import { plural } from '../lib/format'
import { SORT_OPTIONS } from '../lib/sort'
import styles from './SearchPage.module.css'

const PAGE_SIZE = 8
const NUMERIC_KEYS = ['minRating', ...CRITERIA.map((c) => c.filterParam)] as Array<keyof Filters>

/** Фильтры живут в URL — ссылкой на поиск можно поделиться, а «Назад» возвращает к прежним фильтрам */
function readFilters(params: URLSearchParams): Filters {
  const filters: Filters = {}
  const country = params.get('country')
  const city = params.get('city')
  const sort = params.get('sort')
  if (country) filters.country = country
  if (city) filters.city = city
  if (sort && SORT_OPTIONS.some((o) => o.value === sort)) filters.sort = sort as CompanySort
  for (const key of NUMERIC_KEYS) {
    const value = Number(params.get(key))
    if (value > 0 && value <= 5) (filters as Record<string, number>)[key] = value
  }
  return filters
}

function writeParams(q: string, filters: Filters): URLSearchParams {
  const params = new URLSearchParams()
  // Пробелы по краям не обрезаем: иначе при паузе в наборе съедался бы пробел перед следующим словом
  if (q.trim()) params.set('q', q)
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && !(key === 'sort' && value === 'RATING_DESC')) params.set(key, String(value))
  })
  return params
}

function filterLabel(key: keyof Filters, value: string | number): string {
  if (key === 'country' || key === 'city') return String(value)
  if (key === 'sort') return SORT_OPTIONS.find((o) => o.value === value)?.label ?? String(value)
  if (key === 'minRating') return `Общая от ${value}`
  const criterion = CRITERIA.find((c) => c.filterParam === key)
  return `${criterion?.short ?? key} от ${value}`
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const reduceMotion = useReducedMotion()
  const filters = useMemo(() => readFilters(searchParams), [searchParams])
  const urlQuery = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(urlQuery)
  const [syncedUrlQuery, setSyncedUrlQuery] = useState(urlQuery)
  const [locations, setLocations] = useState<Locations | null>(null)
  const [items, setItems] = useState<CompanySummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const requestId = useRef(0)

  useEffect(() => { api.getLocations().then(setLocations).catch(() => setLocations(null)) }, [])

  // Синхронизация поля поиска, если URL поменяли кнопкой «Назад» (обновление состояния во время рендера)
  if (urlQuery !== syncedUrlQuery) {
    setSyncedUrlQuery(urlQuery)
    setQuery(urlQuery)
  }

  // Поиск по названию срабатывает после паузы в наборе, чтобы не слать запрос на каждую букву
  useEffect(() => {
    if (query === urlQuery) return
    const timer = window.setTimeout(() => setSearchParams(writeParams(query, filters), { replace: true }), 280)
    return () => window.clearTimeout(timer)
  }, [query, urlQuery, filters, setSearchParams])

  const baseParams: CompanySearchParams = useMemo(() => ({ ...filters, q: urlQuery.trim() || undefined, size: PAGE_SIZE }), [filters, urlQuery])

  useEffect(() => {
    const id = ++requestId.current
    setLoading(true)
    setError('')
    api.searchCompanies({ ...baseParams, page: 0 })
      .then((result) => {
        if (id !== requestId.current) return // пришёл ответ на устаревший запрос
        setItems(result.items)
        setTotal(result.totalItems)
        setTotalPages(result.totalPages)
        setPage(0)
      })
      .catch(() => { if (id === requestId.current) setError('Не удалось загрузить компании. Проверьте соединение и попробуйте ещё раз.') })
      .finally(() => { if (id === requestId.current) setLoading(false) })
  }, [baseParams])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const result = await api.searchCompanies({ ...baseParams, page: page + 1 })
      setItems((current) => [...current, ...result.items.filter((c) => !current.some((x) => x.id === c.id))])
      setPage(result.page)
    } catch {
      setError('Не удалось загрузить следующую страницу.')
    } finally {
      setLoadingMore(false)
    }
  }

  const updateFilters = (patch: Partial<Filters>) => setSearchParams(writeParams(query, { ...filters, ...patch }))
  const resetFilters = () => setSearchParams(writeParams(query, {}))

  const activeEntries = (Object.entries(filters) as Array<[keyof Filters, string | number]>)
    .filter(([key, value]) => value !== undefined && !(key === 'sort'))

  return (
    <div className={styles.page}>
      <AppHeader />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>Каталог работодателей</p>
          <h1>Найдите компанию <span>по своим критериям.</span></h1>
          <label className={styles.searchField}>
            <Search size={20} aria-hidden="true" />
            <span className="sr-only">Название компании</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Название или юридическое наименование"
              autoComplete="off"
              maxLength={120}
            />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск"><X size={16} aria-hidden="true" /></button>}
          </label>
        </div>
      </section>

      <div className={styles.layout}>
        <aside className={`${styles.sidebar} ${filtersOpen ? styles.sidebarOpen : ''}`} aria-label="Фильтры">
          <div className={styles.sidebarHead}>
            <strong>Фильтры</strong>
            <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Скрыть фильтры"><X size={18} aria-hidden="true" /></button>
          </div>
          <FilterPanel filters={filters} locations={locations} activeCount={activeEntries.length} onChange={updateFilters} onReset={resetFilters} />
          <button className={styles.applyMobile} type="button" onClick={() => setFiltersOpen(false)}>
            Показать {total} {plural(total, ['компанию', 'компании', 'компаний'])}
          </button>
        </aside>

        <main className={styles.results}>
          <div className={styles.resultsHead}>
            <p aria-live="polite">
              {loading ? 'Ищем…' : <>Найдено <strong>{total}</strong> {plural(total, ['компания', 'компании', 'компаний'])}</>}
            </p>
            <button className={styles.filtersToggle} type="button" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal size={16} aria-hidden="true" /> Фильтры{activeEntries.length > 0 ? ` · ${activeEntries.length}` : ''}
            </button>
          </div>

          {activeEntries.length > 0 && (
            <ul className={styles.chips} aria-label="Активные фильтры">
              <AnimatePresence initial={false}>
                {activeEntries.map(([key, value]) => (
                  <motion.li key={key} layout={!reduceMotion} initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }} transition={{ duration: 0.16 }}>
                    <button type="button" onClick={() => updateFilters({ [key]: undefined, ...(key === 'country' ? { city: undefined } : {}) })} aria-label={`Убрать фильтр: ${filterLabel(key, value)}`}>
                      {filterLabel(key, value)} <X size={12} aria-hidden="true" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.list} aria-busy={loading}>
            {loading && items.length === 0
              ? Array.from({ length: 3 }, (_, i) => <CompanyCardSkeleton key={i} />)
              : (
                <AnimatePresence mode="popLayout" initial={false}>
                  {items.map((company, index) => <CompanyCard key={company.id} company={company} index={index} />)}
                </AnimatePresence>
              )}
          </div>

          {!loading && items.length === 0 && !error && (
            <div className={styles.empty}>
              <strong>Под эти условия пока не подходит ни одна компания.</strong>
              <p>Попробуйте снизить минимальные оценки или убрать часть фильтров.</p>
              <button type="button" onClick={() => { setQuery(''); setSearchParams(new URLSearchParams()) }}>Сбросить поиск и фильтры</button>
            </div>
          )}

          {!loading && page + 1 < totalPages && (
            <button className={styles.more} type="button" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Загружаем…' : `Показать ещё · ${total - items.length}`}
            </button>
          )}
        </main>
      </div>
    </div>
  )
}
