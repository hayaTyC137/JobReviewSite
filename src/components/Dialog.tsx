import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { lockScroll } from '../lib/scrollLock'
import { AuthBackdrop } from './AuthBackdrop'
import styles from './Dialog.module.css'

// Одна кривая на всё окно: быстрый старт и мягкая посадка, без пружин и «резинки»
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]
const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1]

type Props = {
  open: boolean
  title: string
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  width?: number
  /** auth — окно входа: матовое стекло, световой контур и анимированный фон */
  variant?: 'default' | 'auth'
}

/**
 * Модальное окно: закрывается по Escape, крестику и клику по фону, возвращает фокус на кнопку,
 * которая его открыла, и не даёт табу уйти за пределы окна. Пока окно открыто, страница под ним
 * не прокручивается (включая плавную прокрутку Lenis на главной), а само окно прокручивается,
 * если не помещается по высоте.
 *
 * Анимация: фон проявляется, панель всплывает на 12–16px. При закрытии сначала уходит панель,
 * затем гаснет фон — окно не «исчезает целиком» одним кадром.
 */
export function Dialog({ open, title, subtitle, onClose, children, width = 520, variant = 'default' }: Props) {
  const auth = variant === 'auth'
  const panelRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  // Храним колбэк в ref, чтобы эффект не перезапускался (и не сбивал фокус) при каждом рендере родителя
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])
      .filter((el) => !el.hasAttribute('disabled'))
    // Фокус на первое поле формы, а не на крестик
    const first = focusable().find((el) => el.tagName !== 'BUTTON') ?? focusable()[0]
    first?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onCloseRef.current(); return }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus() }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus() }
    }
    const unlockScroll = lockScroll()
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      unlockScroll()
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={`${styles.backdrop} ${auth ? styles.backdropAuth : ''}`}
          // Колесо и тач над окном — нативная прокрутка самого окна, Lenis их не трогает
          data-lenis-prevent=""
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: reduceMotion ? 0.01 : 0.22, ease: EASE_OUT } }}
          exit={{ opacity: 0, transition: { duration: reduceMotion ? 0.01 : 0.2, delay: reduceMotion ? 0 : 0.08, ease: EASE_IN } }}
        >
          {auth && <AuthBackdrop />}
          <motion.div
            ref={panelRef}
            className={`${styles.panel} ${auth ? styles.panelAuth : ''}`}
            style={{ maxWidth: width }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: auth ? 16 : 12, scale: auth ? 0.985 : 1 }}
            animate={{
              opacity: 1, y: 0, scale: 1,
              transition: { duration: reduceMotion ? 0.01 : auth ? 0.36 : 0.28, delay: reduceMotion ? 0 : 0.04, ease: EASE_OUT },
            }}
            exit={{
              opacity: 0, y: reduceMotion ? 0 : 8, scale: reduceMotion || !auth ? 1 : 0.985,
              transition: { duration: reduceMotion ? 0.01 : 0.16, ease: EASE_IN },
            }}
          >
            <div className={styles.head}>
              <div>
                <h2 id="dialog-title">{title}</h2>
                {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
              </div>
              <button className={styles.close} type="button" onClick={onClose} aria-label="Закрыть">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.body}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
