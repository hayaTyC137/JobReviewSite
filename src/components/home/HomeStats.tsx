import { useEffect, useRef, useState } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'
import { BadgeCheck, Building2, Globe2, MessageSquareText, Scale, Star, TrendingUp, UsersRound } from 'lucide-react'
import { platformApi } from '../../api/client'
import type { PublicStats } from '../../api/types'

/** Число «доезжает» до значения, когда блок появляется в зоне видимости */
function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduceMotion = useReducedMotion()
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!inView || reduceMotion) return
    const controls = animate(0, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1], onUpdate: setShown })
    return () => controls.stop()
  }, [inView, value, reduceMotion])

  return <span ref={ref}>{(reduceMotion ? value : shown).toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>
}

/** «Платформа в цифрах» — живые данные из /api/stats (в демо-режиме — из демо-базы) */
export function HomeStats() {
  const [stats, setStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    platformApi.stats().then(setStats).catch(() => setStats(null))
  }, [])

  const items = stats ? [
    { icon: <Building2 size={18} />, value: stats.companies, label: 'компаний прошли проверку модератором' },
    { icon: <MessageSquareText size={18} />, value: stats.reviews, label: 'опубликованных отзывов сотрудников' },
    { icon: <Star size={18} />, value: stats.averageRating ?? 0, decimals: 1, label: 'средняя оценка по всем компаниям' },
    { icon: <UsersRound size={18} />, value: stats.users, label: 'участников: сотрудники, HR и директора' },
    { icon: <Globe2 size={18} />, value: stats.cities, label: `городов в ${stats.countries} странах, включая Молдову` },
    { icon: <TrendingUp size={18} />, value: stats.reviewsLast30Days, label: 'новых отзывов за последние 30 дней' },
    { icon: <BadgeCheck size={18} />, value: stats.verifiedCompanies, label: 'компаний с подтверждённым директором или HR' },
    { icon: <Scale size={18} />, value: stats.resolvedDisputes, label: 'жалоб и обжалований разобрано публично' },
    // Нулевые показатели (например, на свежей установке) не показываем — они ничего не говорят
  ].filter((item) => item.value > 0) : []

  return (
    <section className="hx-stats" aria-labelledby="hx-stats-title">
      <div className="hx-stats-head">
        <p className="section-kicker">Платформа в цифрах</p>
        <h2 id="hx-stats-title">Считаем открыто.<br />Обновляется в реальном времени.</h2>
        <p>Эти числа приходят из той же базы, что и каталог: без округлений «для красоты» и без учёта скрытых модератором отзывов.</p>
      </div>
      <ul className="hx-stats-grid">
        {stats === null && Array.from({ length: 6 }, (_, i) => <li key={i} className="hx-stat is-skeleton" aria-hidden="true" />)}
        {items.map((item) => (
          <li key={item.label} className="hx-stat">
            <span className="hx-stat-icon" aria-hidden="true">{item.icon}</span>
            <strong><CountUp value={item.value} decimals={item.decimals} /></strong>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
