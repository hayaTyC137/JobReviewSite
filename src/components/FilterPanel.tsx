import type { CSSProperties } from 'react'
import { RotateCcw } from 'lucide-react'
import type { CompanySearchParams, Locations } from '../api/types'
import { CRITERIA } from '../lib/criteria'
import { SORT_OPTIONS } from '../lib/sort'
import styles from './FilterPanel.module.css'

export type Filters = Omit<CompanySearchParams, 'page' | 'size' | 'q'>

type Props = {
  filters: Filters
  locations: Locations | null
  activeCount: number
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
}

function RangeFilter({ id, label, value, onChange }: { id: string; label: string; value: number | undefined; onChange: (value: number | undefined) => void }) {
  const current = value ?? 0
  return (
    <div className={styles.range}>
      <div className={styles.rangeHead}>
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className={current > 0 ? styles.rangeActive : undefined}>{current > 0 ? `от ${current.toFixed(1)}` : 'любая'}</output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={5}
        step={0.5}
        value={current}
        style={{ '--fill': `${(current / 5) * 100}%` } as CSSProperties}
        aria-valuetext={current > 0 ? `не ниже ${current}` : 'без ограничения'}
        onChange={(event) => {
          const next = Number(event.target.value)
          onChange(next > 0 ? next : undefined)
        }}
      />
    </div>
  )
}

/** Панель фильтров каталога: местоположение, сортировка, минимальные оценки по критериям */
export function FilterPanel({ filters, locations, activeCount, onChange, onReset }: Props) {
  const cities = (locations?.cities ?? []).filter((c) => !filters.country || c.country === filters.country)

  return (
    <div className={styles.panel}>
      <div className={styles.group}>
        <h2 className={styles.groupTitle}>Местоположение</h2>
        <label className={styles.selectField}>
          <span>Страна</span>
          <select value={filters.country ?? ''} onChange={(e) => onChange({ country: e.target.value || undefined, city: undefined })}>
            <option value="">Все страны</option>
            {locations?.countries.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
        </label>
        <label className={styles.selectField}>
          <span>Город</span>
          <select value={filters.city ?? ''} onChange={(e) => onChange({ city: e.target.value || undefined })}>
            <option value="">Все города</option>
            {cities.map((c) => <option key={`${c.country}-${c.city}`} value={c.city}>{c.city}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.group}>
        <h2 className={styles.groupTitle}>Сортировка</h2>
        <div className={styles.sortList} role="radiogroup" aria-label="Сортировка результатов">
          {SORT_OPTIONS.map((option) => (
            <label key={option.value} className={styles.sortOption}>
              <input type="radio" name="sort" value={option.value} checked={(filters.sort ?? 'RATING_DESC') === option.value} onChange={() => onChange({ sort: option.value })} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <h2 className={styles.groupTitle}>Минимальная оценка</h2>
        <RangeFilter id="filter-overall" label="Общая оценка" value={filters.minRating} onChange={(v) => onChange({ minRating: v })} />
        <p className={styles.subTitle}>По критериям, шкала 0–5</p>
        {CRITERIA.map((criterion) => (
          <RangeFilter
            key={criterion.key}
            id={`filter-${criterion.key}`}
            label={criterion.label}
            value={filters[criterion.filterParam as keyof Filters] as number | undefined}
            onChange={(v) => onChange({ [criterion.filterParam]: v })}
          />
        ))}
      </div>

      <button className={styles.reset} type="button" onClick={onReset} disabled={activeCount === 0}>
        <RotateCcw size={14} aria-hidden="true" /> Сбросить фильтры{activeCount > 0 ? ` (${activeCount})` : ''}
      </button>
    </div>
  )
}
