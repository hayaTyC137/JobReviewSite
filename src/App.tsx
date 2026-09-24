import { lazy, Suspense } from 'react'
import { MotionConfig } from 'motion/react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginDialog } from './components/LoginDialog'

// Страницы грузятся отдельными чанками: главной не нужен код графиков, каталогу — анимации hero
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })))
const CompanyPage = lazy(() => import('./pages/CompanyPage').then((m) => ({ default: m.CompanyPage })))
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })))

function App() {
  return (
    // reducedMotion="user" — все анимации motion уважают системную настройку «уменьшить движение»
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--c-canvas)' }} aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/companies" element={<SearchPage />} />
          <Route path="/companies/:slug" element={<CompanyPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <LoginDialog />
    </MotionConfig>
  )
}

export default App
