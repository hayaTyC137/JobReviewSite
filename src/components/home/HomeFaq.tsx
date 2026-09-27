import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Plus } from 'lucide-react'

const FAQ = [
  {
    q: 'Узнает ли работодатель, что я проверял компанию или оставил отзыв?',
    a: 'Нет. Просмотр каталога анонимен, а под отзывом видно только публичное имя (например, «Анна К.»). ФИО и email не публикуются и не передаются компаниям.',
  },
  {
    q: 'Как компания попадает в реестр?',
    a: 'Директор или HR подаёт заявку в панели компании. Модератор сверяет ИНН/IDNO и юридические данные — только после этого компания появляется в поиске, а заявитель получает значок подтверждённого представителя.',
  },
  {
    q: 'Может ли компания удалить неудобный отзыв?',
    a: 'Нет. Представитель может только обжаловать отзыв — решение принимает модератор, а сам факт обжалования виден посетителям. Скрываются отзывы с оскорблениями, раскрытием личных данных или неподтверждённым трудоустройством.',
  },
  {
    q: 'Что такое карточка сотрудника и кто её видит?',
    a: 'Это трудовая история, официальные причины увольнений и оценки работодателей (токсичность, уравновешенность, продуктивность и др.). Карточку видят сам сотрудник, подтверждённые представители компаний и модераторы — она не публичная. Любую оценку можно оспорить.',
  },
  {
    q: 'Какие страны поддерживаются?',
    a: 'Россия, Беларусь, Казахстан и Молдова — включая Кишинёв, Бельцы, Кагул, Унгены, Оргеев и другие города. Справочник городов расширяется по мере появления компаний.',
  },
  {
    q: 'Можно ли войти через Google или соцсети?',
    a: 'Да: Google, LinkedIn, GitHub, Facebook и Яндекс ID — если они включены на сервере. При первом входе аккаунт создаётся автоматически с ролью «Сотрудник», останется указать имя и город.',
  },
]

export function HomeFaq() {
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="hx-faq" aria-labelledby="hx-faq-title">
      <div className="hx-faq-head">
        <p className="section-kicker">Вопросы и ответы</p>
        <h2 id="hx-faq-title">Коротко о том,<br />как всё устроено.</h2>
        <p>Не нашли ответ? <Link to="/contact">Напишите модераторам</Link> — отвечаем в течение двух рабочих дней.</p>
      </div>
      <dl className="hx-faq-list">
        {FAQ.map((item, index) => {
          const expanded = open === index
          return (
            <div key={item.q} className={`hx-faq-item${expanded ? ' is-open' : ''}`}>
              <dt>
                <button type="button" aria-expanded={expanded} aria-controls={`faq-${index}`} onClick={() => setOpen(expanded ? null : index)}>
                  <span className="hx-faq-num">{String(index + 1).padStart(2, '0')}</span>
                  <span>{item.q}</span>
                  <Plus size={18} aria-hidden="true" className="hx-faq-icon" />
                </button>
              </dt>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.dd
                    id={`faq-${index}`}
                    initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p>{item.a}</p>
                  </motion.dd>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
