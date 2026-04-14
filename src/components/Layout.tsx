import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  Combine,
  Database,
  FileCode,
  FileText,
  FlaskConical,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { systemAPI } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import type { SystemVersionInfo } from '../types'
import Badge from './ui/Badge'

type NavSection = { sectionKey: string }
type NavItem = {
  nameKey: string
  href: string
  icon: LucideIcon
  badge?: string
  badgeTone?: 'count' | 'beta' | 'preview'
  match?: (pathname: string, search: string) => boolean
}
type NavEntry = NavSection | NavItem

function isSection(entry: NavEntry): entry is NavSection {
  return 'sectionKey' in entry
}

function badgeClass(tone: NavItem['badgeTone']) {
  if (tone === 'beta') {
    return 'bg-blue-100 text-blue-700'
  }
  if (tone === 'preview') {
    return 'bg-indigo-100 text-indigo-700'
  }
  return 'bg-destructive text-destructive-foreground'
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation('nav')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarPinned, setSidebarPinned] = useState(true)

  const runtimeConfig = ((window as Record<string, unknown>).__RUNTIME_CONFIG__ ?? {}) as {
    PORTAL_VERSION?: string
    PORTAL_BUILD_TIME?: string
  }

  const portalVersion = runtimeConfig.PORTAL_VERSION || import.meta.env.VITE_PORTAL_VERSION || '0.0.0'
  const portalBuildTime =
    runtimeConfig.PORTAL_BUILD_TIME || import.meta.env.VITE_PORTAL_BUILD_TIME || 'unknown'

  const { data: apiVersionData } = useQuery<SystemVersionInfo>({
    queryKey: ['system', 'version'],
    queryFn: async () => {
      const response = await systemAPI.versionInfo()
      return response.data
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })

  const environment = (apiVersionData?.environment ?? 'development').toLowerCase()
  const environmentMeta =
    environment === 'production'
      ? null
      : {
          label:
            environment === 'staging'
              ? t('environment.staging', 'Staging')
              : environment === 'testing'
                ? t('environment.testing', 'Testing')
                : t('environment.development', 'Development'),
          message:
            environment === 'staging'
              ? t(
                  'environment.stagingHint',
                  'This workspace is for verification before release. Data and workflows may still change.'
                )
              : environment === 'testing'
                ? t(
                    'environment.testingHint',
                    'This is a test environment. Data may be incomplete and trading behavior does not represent production.'
                  )
                : t(
                    'environment.developmentHint',
                    'This is a development environment. Use it for validation only and do not treat the results as production-grade.'
                  ),
        }

  const formatBuildTime = (value?: string) => {
    if (!value || value === 'unknown') return 'unknown'
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return value
    return dt.toLocaleString()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleLanguage = () => {
    const currentLanguage = i18n.resolvedLanguage ?? i18n.language
    const next = currentLanguage.startsWith('zh') ? 'en' : 'zh'
    localStorage.setItem('quantmate-lang', next)
    void i18n.changeLanguage(next)
  }

  const navigation: NavEntry[] = useMemo(
    () => [
      { sectionKey: 'sections.overview' },
      { nameKey: 'items.dashboard', href: '/dashboard', icon: LayoutDashboard },
      { sectionKey: 'sections.researchData' },
      { nameKey: 'items.strategyResearch', href: '/strategies', icon: FileCode },
      { nameKey: 'items.backtesting', href: '/backtest', icon: TrendingUp },
      { nameKey: 'items.marketData', href: '/market-data', icon: Database },
      {
        nameKey: 'items.factorLab',
        href: '/factor-lab',
        icon: FlaskConical,
        badge: t('badges.beta', 'Beta'),
        badgeTone: 'beta',
      },
      {
        nameKey: 'items.compositeStrategies',
        href: '/composite-strategies',
        icon: Combine,
        badge: t('badges.beta', 'Beta'),
        badgeTone: 'beta',
      },
      { sectionKey: 'sections.tradingPortfolio' },
      { nameKey: 'items.portfolio', href: '/portfolio', icon: Briefcase },
      { nameKey: 'items.trading', href: '/trading', icon: ArrowLeftRight },
      { nameKey: 'items.paperTrading', href: '/paper-trading', icon: Globe },
      { nameKey: 'items.analytics', href: '/analytics', icon: BarChart3 },
      { sectionKey: 'sections.opsAlerts' },
      { nameKey: 'items.alerts', href: '/monitoring', icon: Bell, badge: '3', badgeTone: 'count' },
      { nameKey: 'items.reports', href: '/reports', icon: FileText },
      { sectionKey: 'sections.aiCollaboration' },
      {
        nameKey: 'items.aiAssistant',
        href: '/ai-assistant',
        icon: Sparkles,
        badge: t('badges.preview', 'Preview'),
        badgeTone: 'preview',
      },
      {
        nameKey: 'items.autoPilot',
        href: '/auto-pilot',
        icon: Bot,
        badge: t('badges.preview', 'Preview'),
        badgeTone: 'preview',
      },
      {
        nameKey: 'items.marketplace',
        href: '/marketplace',
        icon: Store,
        badge: t('badges.beta', 'Beta'),
        badgeTone: 'beta',
      },
      {
        nameKey: 'items.sharing',
        href: '/team-space?tab=sharing',
        icon: Share2,
        badge: t('badges.preview', 'Preview'),
        badgeTone: 'preview',
        match: (pathname, search) => pathname === '/team-space' && search.includes('tab=sharing'),
      },
      {
        nameKey: 'items.workspaces',
        href: '/team-space?tab=workspaces',
        icon: Users,
        badge: t('badges.preview', 'Preview'),
        badgeTone: 'preview',
        match: (pathname, search) =>
          pathname === '/team-space' && (!search || search.includes('tab=workspaces')),
      },
      { sectionKey: 'sections.system' },
      { nameKey: 'items.settings', href: '/settings', icon: Settings },
      { nameKey: 'items.accountSecurity', href: '/account-security', icon: Shield },
    ],
    [t]
  )

  const isActive = (entry: NavItem) => {
    if (entry.match) {
      return entry.match(location.pathname, location.search)
    }
    return location.pathname === entry.href
  }

  const currentLanguage = i18n.resolvedLanguage ?? i18n.language

  return (
    <div className="min-h-screen bg-background">
      {!sidebarPinned && (
        <div
          onMouseEnter={() => setSidebarOpen(true)}
          onMouseLeave={() => {
            if (!sidebarPinned) setSidebarOpen(false)
          }}
          className="fixed left-0 top-0 z-40 h-full w-6 cursor-pointer bg-transparent hover:bg-gray-100/10"
          aria-hidden={false}
        />
      )}

      <aside
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => {
          if (!sidebarPinned) setSidebarOpen(false)
        }}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 overflow-hidden'
        }`}
      >
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nextPinned = !sidebarPinned
                  setSidebarPinned(nextPinned)
                  setSidebarOpen(nextPinned)
                }}
                className="rounded-md p-2 hover:bg-accent"
                aria-label={t('toggleSidebar')}
                aria-pressed={sidebarPinned}
              >
                <Menu className="h-5 w-5" />
              </button>
              <img src="/logo.svg" alt="QuantMate" className="h-8 w-auto" />
            </div>
            <div className="mt-2 w-full break-all text-[11px] leading-4 text-muted-foreground">
              <p>Portal Version: v{portalVersion}</p>
              <p>Portal Build: {formatBuildTime(portalBuildTime)}</p>
              <p>API Version: v{apiVersionData?.version || '-'}</p>
              <p>API Build: {formatBuildTime(apiVersionData?.build_time)}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav flex-1 space-y-0.5 overflow-y-auto p-4">
          {navigation.map((entry, idx) =>
            isSection(entry) ? (
              <div
                key={`section-${idx}`}
                className="px-4 pb-1 pt-4 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t(entry.sectionKey)}
              </div>
            ) : (
              <Link
                key={entry.href}
                to={entry.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive(entry)
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <entry.icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{t(entry.nameKey)}</span>
                {entry.badge && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[0.65rem] font-semibold leading-none ${badgeClass(entry.badgeTone)}`}
                  >
                    {entry.badge}
                  </span>
                )}
              </Link>
            )
          )}
        </nav>

        <div className="shrink-0 border-t border-border p-4">
          <div className="space-y-3 px-4 py-2">
            <div>
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={toggleLanguage}
                className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title={t('switchLang')}
              >
                <Globe className="h-4 w-4" />
                {currentLanguage.startsWith('zh') ? 'English' : '中文'}
              </button>
              <button
                onClick={handleLogout}
                className="rounded-md p-2 transition-colors hover:bg-destructive hover:text-destructive-foreground"
                title={t('logout', 'Logout')}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : ''}`}>
        {environmentMeta && (
          <header className="sticky top-0 z-30 border-b border-amber-200 bg-amber-50/95 px-6 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="warning">{environmentMeta.label}</Badge>
              <p className="text-sm text-amber-950">{environmentMeta.message}</p>
            </div>
          </header>
        )}

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
