/**
 * Блокировка прокрутки страницы под модальными окнами.
 *
 * Одного `body { overflow: hidden }` мало: на главной прокруткой управляет Lenis, который сам
 * перехватывает колесо и тач и двигает окно программно — страница уезжала из-под открытого окна.
 * Поэтому блокировка (1) закрывает прокрутку у html и body, (2) компенсирует ширину полосы
 * прокрутки, чтобы вёрстка не прыгала, и (3) оповещает подписчиков — Lenis ставится на паузу.
 * Счётчик позволяет открыть окно поверх окна: прокрутка вернётся после закрытия последнего.
 */

type Listener = (locked: boolean) => void

let depth = 0
const listeners = new Set<Listener>()
let saved: { htmlOverflow: string; bodyOverflow: string; bodyPaddingRight: string } | null = null

export function lockScroll(): () => void {
  depth += 1
  if (depth === 1) {
    const html = document.documentElement
    const body = document.body
    const scrollbar = window.innerWidth - html.clientWidth
    saved = { htmlOverflow: html.style.overflow, bodyOverflow: body.style.overflow, bodyPaddingRight: body.style.paddingRight }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
    listeners.forEach((listener) => listener(true))
  }

  let released = false
  return () => {
    if (released) return
    released = true
    depth -= 1
    if (depth === 0 && saved) {
      document.documentElement.style.overflow = saved.htmlOverflow
      document.body.style.overflow = saved.bodyOverflow
      document.body.style.paddingRight = saved.bodyPaddingRight
      saved = null
      listeners.forEach((listener) => listener(false))
    }
  }
}

/** Подписка на блокировку (для Lenis); сразу сообщает текущее состояние */
export function onScrollLockChange(listener: Listener): () => void {
  listeners.add(listener)
  listener(depth > 0)
  return () => { listeners.delete(listener) }
}
