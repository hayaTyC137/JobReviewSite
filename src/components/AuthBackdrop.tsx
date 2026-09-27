import type { CSSProperties } from 'react'
import styles from './AuthBackdrop.module.css'

// Детерминированный «шум», чтобы частицы не прыгали между рендерами и совпадали при SSR/гидрации
function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// Немного частиц и низкая яркость: фон должен ощущаться, а не отвлекать от формы
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: `${Math.round(seeded(i, 1) * 100)}%`,
  size: `${2 + Math.round(seeded(i, 2) * 4)}px`,
  duration: `${18 + Math.round(seeded(i, 3) * 16)}s`,
  delay: `${-Math.round(seeded(i, 4) * 28)}s`,
  drift: `${Math.round((seeded(i, 5) - 0.5) * 120)}px`,
  opacity: 0.18 + seeded(i, 6) * 0.3,
}))

/**
 * Фон окна входа: три размытых градиентных пятна медленно смещаются, мелкие частицы
 * всплывают снизу вверх. Всё на CSS-анимациях (transform/opacity — без перерасчёта раскладки),
 * при «уменьшить движение» замирает. Только декор: aria-hidden и pointer-events: none.
 */
export function AuthBackdrop() {
  return (
    <div className={styles.root} aria-hidden="true">
      <span className={`${styles.blob} ${styles.blobA}`} />
      <span className={`${styles.blob} ${styles.blobB}`} />
      <span className={`${styles.blob} ${styles.blobC}`} />
      <svg className={styles.grid} width="100%" height="100%">
        <defs>
          <pattern id="auth-grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M46 0H0V46" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
          <radialGradient id="auth-grid-fade" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="auth-grid-mask"><rect width="100%" height="100%" fill="url(#auth-grid-fade)" /></mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-grid)" mask="url(#auth-grid-mask)" />
      </svg>
      {PARTICLES.map((p, index) => (
        <i
          key={index}
          className={styles.particle}
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
            '--drift': p.drift,
            '--peak': p.opacity,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}
