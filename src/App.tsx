import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LoginDialog } from './components/LoginDialog'
import { RequireRole } from './components/RequireRole'

// Страницы грузятся отдельными чанками: главной не нужен код графиков, каталогу — анимации hero
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })))
const CompanyPage = lazy(() => import('./pages/CompanyPage').then((m) => ({ default: m.CompanyPage })))
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const EmployeePage = lazy(() => import('./pages/EmployeePage').then((m) => ({ default: m.EmployeePage })))
const CompanyPanelPage = lazy(() => import('./pages/CompanyPanelPage').then((m) => ({ default: m.CompanyPanelPage })))
const ModerationPage = lazy(() => import('./pages/ModerationPage').then((m) => ({ default: m.ModerationPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })))
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })))

/**
 * Мягкий переход между страницами: старая страница уходит вверх и растворяется, новая всплывает.
 * Только opacity и transform (без filter) — после анимации у обёртки не остаётся стилей,
 * которые ломали бы position: fixed/sticky внутри страниц.
 */
function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.16, ease: 'easeIn' } }}
    >
      {children}
    </motion.div>
  )
}

const fallback = <div style={{ minHeight: '100vh', background: 'var(--c-canvas)' }} aria-busy="true" />

function App() {
  const location = useLocation()

  return (
    // reducedMotion="user" — все анимации motion уважают системную настройку «уменьшить движение»
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo({ top: 0 })}>
        <PageTransition key={location.pathname}>
          <Suspense fallback={fallback}>
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/companies" element={<SearchPage />} />
              <Route path="/companies/:slug" element={<CompanyPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/welcome" element={<RequireRole><OnboardingPage /></RequireRole>} />
              <Route path="/me" element={<RequireRole><ProfilePage /></RequireRole>} />
              <Route path="/employees/:userId" element={<RequireRole><EmployeePage /></RequireRole>} />
              <Route path="/company-panel" element={<RequireRole roles={['USER', 'REPRESENTATIVE']}><CompanyPanelPage /></RequireRole>} />
              <Route path="/moderation" element={<RequireRole roles={['MODERATOR', 'ADMIN']}><ModerationPage /></RequireRole>} />
              <Route path="/admin" element={<RequireRole roles={['ADMIN']}><AdminPage /></RequireRole>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </PageTransition>
      </AnimatePresence>
      <LoginDialog />
    </MotionConfig>
  )
}

export default App
