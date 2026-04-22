import { Suspense, lazy, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes } from 'react-router-dom'
import { authAPI } from './lib/api'
import { useAuthStore } from './stores/auth'

const Layout = lazy(() => import('./components/Layout'))
const Analytics = lazy(() => import('./pages/Analytics'))
const ChangePassword = lazy(() => import('./pages/auth/ChangePassword'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const Backtest = lazy(() => import('./pages/Backtest'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MarketData = lazy(() => import('./pages/MarketData'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const Settings = lazy(() => import('./pages/Settings'))
const Strategies = lazy(() => import('./pages/Strategies'))
const Trading = lazy(() => import('./pages/Trading'))
const PaperTrading = lazy(() => import('./pages/PaperTrading'))
const Positions = lazy(() => import('./pages/Positions'))
const Monitoring = lazy(() => import('./pages/Monitoring'))
const Reports = lazy(() => import('./pages/Reports'))
const AccountSecurity = lazy(() => import('./pages/AccountSecurity'))
const AIAssistant = lazy(() => import('./pages/AIAssistant'))
const FactorLab = lazy(() => import('./pages/FactorLab'))
const AutoPilot = lazy(() => import('./pages/AutoPilot'))
const Marketplace = lazy(() => import('./pages/Marketplace'))
const TeamSpace = lazy(() => import('./pages/TeamSpace'))
const VisualExplorer = lazy(() => import('./pages/VisualExplorer'))
const CompositeStrategies = lazy(() => import('./pages/CompositeStrategies'))

function RouteFallback() {
  const { t } = useTranslation('common')
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      {t('loading')}
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated, setAuth, logout } = useAuthStore()
  const { t } = useTranslation('auth')
  const accessToken = localStorage.getItem('access_token')
  const refreshToken = localStorage.getItem('refresh_token')
  const [checking, setChecking] = useState(!hasHydrated || (!!accessToken && !isAuthenticated))
  const [mustChangePassword, setMustChangePassword] = useState(
    sessionStorage.getItem('force_change_password') === '1'
  )

  useEffect(() => {
    if (!hasHydrated) {
      setChecking(true)
      return
    }
    if (!accessToken) {
      if (isAuthenticated) {
        logout()
      }
      setChecking(false)
      return
    }

    const shouldBlock = !isAuthenticated
    if (shouldBlock) {
      setChecking(true)
    }

    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return
      logout()
      setChecking(false)
    }, 8000)
    authAPI.me()
      .then((response) => {
        if (cancelled) {
          return
        }
        window.clearTimeout(timeoutId)
        const user = response.data
        setAuth(user, accessToken, refreshToken || '')
        setMustChangePassword(false)
        if (shouldBlock) {
          setChecking(false)
        }
      })
      .catch((err: any) => {
        if (cancelled) {
          return
        }
        window.clearTimeout(timeoutId)
        const detail = err?.response?.data?.detail
        const detailText = typeof detail === 'string' ? detail.toLowerCase() : ''
        if (err?.response?.status === 403 && detailText.includes('password change required')) {
          setMustChangePassword(true)
          setChecking(false)
          return
        }
        logout()
        setChecking(false)
      })

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [accessToken, refreshToken, hasHydrated, isAuthenticated, setAuth, logout])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t('checkingSession')}
      </div>
    )
  }

  const isChangePasswordRoute = window.location.pathname.startsWith('/change-password')
  if (mustChangePassword) {
    if (!isChangePasswordRoute) {
      return <Navigate to="/change-password" replace />
    }
    return <>{children}</>
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/change-password"
          element={
            <PrivateRoute>
              <ChangePassword />
            </PrivateRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="strategies" element={<Strategies />} />
          <Route path="backtest" element={<Backtest />} />
          <Route path="market-data" element={<MarketData />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="paper-trading" element={<PaperTrading />} />
          <Route path="trading" element={<Trading />} />
          <Route path="positions" element={<Positions />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="reports" element={<Reports />} />
          <Route path="account-security" element={<AccountSecurity />} />
          <Route path="ai-assistant" element={<AIAssistant />} />
          <Route path="factor-lab" element={<FactorLab />} />
          <Route path="auto-pilot" element={<AutoPilot />} />
          <Route path="composite-strategies" element={<CompositeStrategies />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="team-space" element={<TeamSpace />} />
          <Route path="visual-explorer" element={<VisualExplorer />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
