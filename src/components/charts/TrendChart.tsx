import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { CompanyAnalytics } from '../../api/types'
import { formatMonthLong, formatMonthShort, formatScore, reviewsLabel } from '../../lib/format'
import styles from './Charts.module.css'

type Props = {
  points: CompanyAnalytics['monthlyTrend']
  asTable: boolean
}

// Ширина берётся из контейнера (1 единица = 1px), чтобы подписи осей не масштабировались вместе с графиком
const H = 220
const PAD = { top: 16, right: 44, bottom: 28, left: 30 }
const Y_MIN = 1
const Y_MAX = 5

/**
 * Динамика средней оценки по месяцам. Месяцы без отзывов — разрыв линии, а не ноль:
 * отсутствие данных не должно выглядеть как падение рейтинга.
 */
export function TrendChart({ points, asTable }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const [W, setW] = useState(640)
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))))
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [asTable])
  const reduceMotion = useReducedMotion()

  if (asTable) {
    return (
      <table className={styles.table}>
        <caption className="sr-only">Средняя оценка по месяцам</caption>
        <thead><tr><th scope="col">Месяц</th><th scope="col">Средняя оценка</th><th scope="col">Отзывов</th></tr></thead>
        <tbody>
          {points.map((p) => <tr key={p.month}><td>{formatMonthLong(p.month)}</td><td>{formatScore(p.average)}</td><td>{p.reviewsCount}</td></tr>)}
        </tbody>
      </table>
    )
  }

  // Без точек не из чего строить оси и тултип (индекс наведения ушёл бы в -1)
  if (points.length === 0) {
    return <p className={styles.noData}>Отзывов пока нет — график появится после первых оценок.</p>
  }

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (v: number) => PAD.top + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * innerH

  // Разбиваем на непрерывные участки, чтобы пропуски рисовались разрывом
  const segments: Array<Array<{ i: number; v: number }>> = []
  let current: Array<{ i: number; v: number }> = []
  points.forEach((p, i) => {
    if (p.average === null) { if (current.length) segments.push(current); current = [] }
    else current.push({ i, v: p.average })
  })
  if (current.length) segments.push(current)

  const linePath = segments.map((seg) => seg.map((pt, k) => `${k === 0 ? 'M' : 'L'} ${x(pt.i)} ${y(pt.v)}`).join(' ')).join(' ')
  const areaPaths = segments.filter((seg) => seg.length > 1).map((seg) =>
    `M ${x(seg[0].i)} ${y(Y_MIN)} ${seg.map((pt) => `L ${x(pt.i)} ${y(pt.v)}`).join(' ')} L ${x(seg[seg.length - 1].i)} ${y(Y_MIN)} Z`)

  const withData = points.filter((p) => p.average !== null)
  const first = withData[0]
  const last = withData.at(-1)
  const lastIndex = last ? points.indexOf(last) : -1

  const onPointerMove = (event: ReactPointerEvent<SVGRectElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const bounds = svg.getBoundingClientRect()
    const relX = ((event.clientX - bounds.left) / bounds.width) * W
    const index = Math.round(((relX - PAD.left) / innerW) * (points.length - 1))
    setHover(Math.max(0, Math.min(points.length - 1, index)))
  }

  const hovered = hover !== null ? points[hover] : null

  return (
    <div className={styles.chartWrap} ref={wrapRef}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={first && last ? `Средняя оценка изменилась с ${formatScore(first.average)} (${formatMonthLong(first.month)}) до ${formatScore(last.average)} (${formatMonthLong(last.month)})` : 'Недостаточно данных для графика'}
      >
        {[1, 2, 3, 4, 5].map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--c-chart-grid)" strokeWidth={1} />
            <text x={PAD.left - 10} y={y(tick) + 4} textAnchor="end" className={styles.tick}>{tick}</text>
          </g>
        ))}
        {points.map((p, i) => (i % 2 === (points.length - 1) % 2) && (
          <text key={p.month} x={x(i)} y={H - 8} textAnchor="middle" className={styles.tick}>{formatMonthShort(p.month)}</text>
        ))}

        {areaPaths.map((d) => <path key={d} d={d} fill="var(--c-chart-1)" opacity={0.1} />)}
        <motion.path
          d={linePath}
          fill="none"
          stroke="var(--c-chart-1)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
        />

        {segments.flat().map((pt) => (
          <circle key={pt.i} cx={x(pt.i)} cy={y(pt.v)} r={hover === pt.i ? 5.5 : 4} fill="var(--c-chart-1)" stroke="var(--c-surface-raised)" strokeWidth={2} className={styles.dot} />
        ))}

        {/* Подпись только у последней точки — остальное в тултипе и таблице */}
        {last && lastIndex >= 0 && (
          <text x={x(lastIndex) + 10} y={y(last.average ?? 0) + 4} className={styles.endLabel}>{formatScore(last.average)}</text>
        )}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--c-line-strong)" strokeWidth={1} />
        )}
        <rect
          x={PAD.left - 10}
          y={0}
          width={innerW + 20}
          height={H}
          fill="transparent"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>

      {hovered && hover !== null && (
        <div className={styles.tooltip} style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
          <strong>{formatMonthLong(hovered.month)}</strong>
          <span>{hovered.average === null ? 'Отзывов не было' : <>Средняя оценка <b>{formatScore(hovered.average)}</b></>}</span>
          {hovered.reviewsCount > 0 && <span>{reviewsLabel(hovered.reviewsCount)}</span>}
        </div>
      )}
    </div>
  )
}
