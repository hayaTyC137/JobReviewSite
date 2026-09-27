import { useEffect, useMemo, useRef, useState } from 'react'
import { animate, AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Ban, CheckCircle2, EyeOff, RotateCcw, ShieldAlert, Star } from 'lucide-react'

type Verdict = 'counted' | 'hidden' | 'blocked'

type SampleReview = {
  id: number
  author: string
  role: string
  stars: number
  text: string
  /** Что с отзывом происходит на платформе, если включить проверки */
  risk: null | { kind: 'hidden' | 'blocked'; reason: string }
}

const SAMPLE: SampleReview[] = [
  { id: 1, author: 'Ион Р.', role: 'Java Developer, 3 года', stars: 4, text: 'Сильные тимлиды, честное код-ревью.', risk: null },
  { id: 2, author: 'Елена Ч.', role: 'QA Engineer, бывшая', stars: 4, text: 'Выстроенный процесс, но поздние созвоны.', risk: null },
  { id: 3, author: 'Аноним-1', role: 'аккаунт создан вчера', stars: 5, text: 'Лучшая компания мира!!!', risk: { kind: 'blocked', reason: 'Третий отзыв за сутки — сработал суточный лимит' } },
  { id: 4, author: 'Кристина Л.', role: 'UI Designer, 3 мес.', stars: 2, text: 'Хаос на испытательном сроке.', risk: null },
  { id: 5, author: 'Директор компании', role: 'представитель', stars: 5, text: 'Отличный коллектив, всем рекомендую.', risk: { kind: 'blocked', reason: 'Конфликт интересов: представитель не оценивает свою компанию' } },
  { id: 6, author: 'Виктор Б.', role: 'не работал в компании', stars: 1, text: 'Ужасно, всех уволят.', risk: { kind: 'hidden', reason: 'Жалоба удовлетворена: трудоустройство не подтвердилось' } },
]

function AnimatedScore({ value }: { value: number | null }) {
  const reduceMotion = useReducedMotion()
  const [shown, setShown] = useState(value ?? 0)
  // Анимируем от последнего показанного значения, а не от нуля
  const lastShown = useRef(value ?? 0)
  useEffect(() => {
    if (value === null || reduceMotion) return
    const controls = animate(lastShown.current, value, {
      duration: 0.45, ease: 'easeOut', onUpdate: (v) => { lastShown.current = v; setShown(v) },
    })
    return () => controls.stop()
  }, [value, reduceMotion])
  if (value === null) return <>—</>
  return <>{(reduceMotion ? value : shown).toFixed(2).replace('.', ',')}</>
}

/**
 * Интерактивный промо-блок «Прозрачный рейтинг»: переключатель показывает, как один и тот же набор
 * отзывов превращается в оценку без проверок и с правилами платформы (лимиты, конфликт интересов, жалобы).
 */
export function RatingSimulator() {
  const reduceMotion = useReducedMotion()
  const [protectedMode, setProtectedMode] = useState(true)
  const [excluded, setExcluded] = useState<number[]>([])

  const verdict = (review: SampleReview): Verdict => {
    if (excluded.includes(review.id)) return 'hidden'
    if (!protectedMode || !review.risk) return 'counted'
    return review.risk.kind
  }

  const counted = SAMPLE.filter((r) => verdict(r) === 'counted')
  const raw = SAMPLE.reduce((sum, r) => sum + r.stars, 0) / SAMPLE.length
  const score = counted.length ? counted.reduce((sum, r) => sum + r.stars, 0) / counted.length : null
  const delta = useMemo(() => (score === null ? null : score - raw), [score, raw])

  const toggleManual = (id: number) => setExcluded((list) => list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  return (
    <section className="hx-sim" aria-labelledby="hx-sim-title">
      <div className="hx-sim-copy">
        <p className="section-kicker">Прозрачный рейтинг</p>
        <h2 id="hx-sim-title">Одна формула.<br />Никаких «платных» звёзд.</h2>
        <p>Рейтинг компании — простое среднее по видимым отзывам. Его нельзя купить, но можно накрутить — поэтому часть отзывов не доходит до публикации или скрывается после проверки.</p>
        <ul className="hx-rules">
          <li><CheckCircle2 size={16} aria-hidden="true" /> Один отзыв о компании раз в 90 дней и не больше трёх в сутки</li>
          <li><CheckCircle2 size={16} aria-hidden="true" /> Директора и HR не оценивают собственную компанию</li>
          <li><CheckCircle2 size={16} aria-hidden="true" /> Спорные отзывы разбирает модератор — решение видно всем</li>
        </ul>
      </div>

      <div className="hx-sim-panel">
        <div className="hx-sim-top">
          <div className="hx-sim-score" aria-live="polite">
            <span>Рейтинг компании</span>
            <strong><AnimatedScore value={score} /></strong>
            <small>
              {delta !== null && Math.abs(delta) >= 0.005
                ? `${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(2).replace('.', ',')} к «сырому» среднему ${raw.toFixed(2).replace('.', ',')}`
                : `по ${counted.length} из ${SAMPLE.length} отзывов`}
            </small>
          </div>
          <div className="hx-sim-switch" role="group" aria-label="Режим подсчёта">
            <button type="button" aria-pressed={!protectedMode} onClick={() => setProtectedMode(false)}>Без проверок</button>
            <button type="button" aria-pressed={protectedMode} onClick={() => setProtectedMode(true)}>С правилами Контура</button>
          </div>
        </div>

        <ul className="hx-sim-list">
          {SAMPLE.map((review) => {
            const state = verdict(review)
            return (
              <motion.li key={review.id} layout={reduceMotion ? false : 'position'} className={`hx-sim-item is-${state}`}>
                <span className="hx-sim-stars" aria-label={`${review.stars} из 5`}>
                  {review.stars}<Star size={12} fill="currentColor" aria-hidden="true" />
                </span>
                <div className="hx-sim-body">
                  <strong>{review.author} <small>· {review.role}</small></strong>
                  <span>{review.text}</span>
                  <AnimatePresence initial={false}>
                    {state !== 'counted' && (
                      <motion.em
                        initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                        transition={{ duration: 0.22 }}
                      >
                        {state === 'blocked' ? <Ban size={13} aria-hidden="true" /> : <ShieldAlert size={13} aria-hidden="true" />}
                        {excluded.includes(review.id) ? 'Вы скрыли отзыв вручную' : review.risk?.reason}
                      </motion.em>
                    )}
                  </AnimatePresence>
                </div>
                <button type="button" className="hx-sim-toggle" onClick={() => toggleManual(review.id)} aria-pressed={excluded.includes(review.id)} title="Представьте, что модератор удовлетворил жалобу">
                  {excluded.includes(review.id) ? <RotateCcw size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                  <span className="sr-only">{excluded.includes(review.id) ? 'Вернуть отзыв' : 'Скрыть отзыв'}</span>
                </button>
              </motion.li>
            )
          })}
        </ul>
        <p className="hx-sim-foot">Нажмите <EyeOff size={12} aria-hidden="true" />, чтобы «удовлетворить жалобу» и посмотреть, как изменится оценка.</p>
      </div>
    </section>
  )
}
