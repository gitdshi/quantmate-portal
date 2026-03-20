import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { authAPI } from './lib/api'
import Analytics from './pages/Analytics'
import ChangePassword from './pages/auth/ChangePassword'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Backtest from './pages/Backtest'
import Dashboard from './pages/Dashboard'
import MarketData from './pages/MarketData'
import Portfolio from './pages/Portfolio'
import Settings from './pages/Settings'
import Strategies from './pages/Strategies'
import Trading from './pages/Trading'
import PaperTrading from './pages/PaperTrading'
import Positions from './pages/Positions'
import Monitoring from './pages/Monitoring'
import Reports from './pages/Reports'
import AccountSecurity from './pages/AccountSecurity'
import AIAssistant from './pages/AIAssistant'
import FactorLab from './pages/FactorLab'
import Marketplace from './pages/Marketplace'
import TeamSpace from './pages/TeamSpace'
import VisualExplorer from './pages/VisualExplorer'
import { useAuthStore } from './stores/auth'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuth, logout } = useAuthStore()
  const { t } = useTranslation('auth')
  const accessToken = localStorage.getItem('access_token')
  const refreshToken = localStorage.getItem('refresh_token')
  const [checking, setChecking] = useState(!!accessToken)
  const [mustChangePassword, setMustChangePassword] = useState(
    sessionStorage.getItem('force_change_password') === '1'
  )

  useEffect(() => {
    if (!accessToken) {
      if (isAuthenticated) {
        logout()
      }
      setChecking(false)
      return
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
        setChecking(false)
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
  }, [accessToken, refreshToken, isAuthenticated, setAuth, logout])

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
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="team-space" element={<TeamSpace />} />
        <Route path="visual-explorer" element={<VisualExplorer />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
