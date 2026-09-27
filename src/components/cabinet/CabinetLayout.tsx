import type { ReactNode } from 'react'
import { AppHeader } from '../AppHeader'
import styles from './CabinetLayout.module.css'

type Props = {
  kicker: string
  title: ReactNode
  subtitle?: ReactNode
  aside?: ReactNode
  children: ReactNode
}

/** Каркас кабинета: общая шапка сайта, тёмная полоса с заголовком раздела и рабочая область */
export function CabinetLayout({ kicker, title, subtitle, aside, children }: Props) {
  return (
    <div className={styles.page}>
      <AppHeader />
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.kicker}>{kicker}</p>
          <h1>{title}</h1>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
        {aside && <div className={styles.aside}>{aside}</div>}
      </section>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
