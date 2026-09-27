import { useId, useState } from 'react'
import type { PointerEvent } from 'react'
import styles from './MiniCharts.module.css'

type Point = { label: string; value: number }

function niceMax(value: number): number {
  if (value <= 4) return 4
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => value / s <= 4) ?? magnitude * 10
  return Math.ceil(value / step) * step
}

/**
 * Столбчатая диаграмма одной серии (малые кратные на дашборде вместо двух осей).
 * Столбцы ≤ 24px со скруглением 4px только сверху, волосяная сетка, подпись значения —
 * только у последнего столбца, остальные значения — в подсказке и табличном виде.
 */
export function ColumnChart({ points, title, unit = '' }: { points: Point[]; title: string; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const width = 360
  const height = 150
  const pad = { top: 16, right: 6, bottom: 22, left: 28 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const max = niceMax(Math.max(...points.map((p) => p.value), 0))
  const slot = innerW / points.length
  const barW = Math.min(24, slot - 2)
  const ticks = [0, max / 2, max]
  const last = points.length - 1
  const y = (v: number) => pad.top + innerH - (v / max) * innerH

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>{title}</figcaption>
      <div className={styles.wrap}>
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} role="img" aria-label={`${title}: ${points.map((p) => `${p.label} — ${p.value}`).join(', ')}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className={styles.grid} />
              <text x={pad.left - 6} y={y(t) + 3} className={styles.tick} textAnchor="end">{Math.round(t)}</text>
            </g>
          ))}
          {points.map((p, i) => {
            const x = pad.left + i * slot + (slot - barW) / 2
            const h = Math.max((p.value / max) * innerH, p.value > 0 ? 2 : 0)
            const top = pad.top + innerH - h
            const r = Math.min(4, h)
            return (
              <g key={p.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                {/* Невидимая зона наведения шире столбца */}
                <rect x={pad.left + i * slot} y={pad.top} width={slot} height={innerH} fill="transparent" />
                {h > 0 && (
                  <path
                    className={`${styles.bar} ${hover !== null && hover !== i ? styles.dim : ''}`}
                    d={`M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`}
                  />
                )}
                {(i === 0 || i === last || i === Math.floor(last / 2)) && (
                  <text x={x + barW / 2} y={height - 6} className={styles.tick} textAnchor="middle">{p.label}</text>
                )}
                {i === last && p.value > 0 && <text x={x + barW / 2} y={top - 5} className={styles.value} textAnchor="middle">{p.value}</text>}
              </g>
            )
          })}
        </svg>
        {hover !== null && (
          <div className={styles.tooltip} style={{ left: `${((pad.left + hover * slot + slot / 2) / width) * 100}%` }}>
            <strong>{points[hover].label}</strong><span>{points[hover].value}{unit}</span>
          </div>
        )}
      </div>
    </figure>
  )
}

/** Линия нагрузки за последний час: 2px, заливка 10%, перекрестие и подсказка по наведению */
export function LoadSparkline({ values, title }: { values: number[]; title: string }) {
  const gradientId = useId()
  const [hover, setHover] = useState<number | null>(null)
  const width = 600
  const height = 120
  const pad = { top: 12, right: 8, bottom: 20, left: 30 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const max = niceMax(Math.max(...values, 0))
  const x = (i: number) => pad.left + (i / Math.max(values.length - 1, 1)) * innerW
  const y = (v: number) => pad.top + innerH - (v / max) * innerH
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(values.length - 1)},${pad.top + innerH} L${x(0)},${pad.top + innerH} Z`

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const relative = ((event.clientX - box.left) / box.width) * width
    const index = Math.round(((relative - pad.left) / innerW) * (values.length - 1))
    setHover(Math.max(0, Math.min(values.length - 1, index)))
  }

  const minutesAgo = (i: number) => values.length - 1 - i

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>{title}</figcaption>
      <div className={styles.wrap}>
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`${title}: максимум ${Math.max(...values, 0)} запросов в минуту`}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--c-chart-1)" stopOpacity=".16" />
              <stop offset="100%" stopColor="var(--c-chart-1)" stopOpacity=".02" />
            </linearGradient>
          </defs>
          {[0, max / 2, max].map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className={styles.grid} />
              <text x={pad.left - 6} y={y(t) + 3} className={styles.tick} textAnchor="end">{Math.round(t)}</text>
            </g>
          ))}
          <text x={pad.left} y={height - 4} className={styles.tick}>60 мин назад</text>
          <text x={width - pad.right} y={height - 4} className={styles.tick} textAnchor="end">сейчас</text>
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} className={styles.line} />
          <circle cx={x(values.length - 1)} cy={y(values[values.length - 1] ?? 0)} r="4" className={styles.dot} />
          {hover !== null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} className={styles.crosshair} />
              <circle cx={x(hover)} cy={y(values[hover])} r="4" className={styles.dot} />
            </>
          )}
        </svg>
        {hover !== null && (
          <div className={styles.tooltip} style={{ left: `${(x(hover) / width) * 100}%` }}>
            <strong>{minutesAgo(hover) === 0 ? 'Текущая минута' : `${minutesAgo(hover)} мин назад`}</strong><span>{values[hover]} запросов</span>
          </div>
        )}
      </div>
    </figure>
  )
}
