import {
    ArrowLeftRight,
    BarChart3,
    Bell,
    Briefcase,
    Database,
    FileCode,
    FileText,
    FlaskConical,
    Globe,
    LayoutDashboard,
    LogOut,
    Menu,
    Shield,
    Share2,
    Settings,
    Sparkles,
    Store,
    TrendingUp,
    Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { systemAPI } from '../lib/api'
import { useAuthStore } from '../stores/auth'

type NavSection = { sectionKey: string }
type NavItem = {
  nameKey: string
  href: string
  icon: LucideIcon
  badge?: string
  match?: (pathname: string, search: string) => boolean
}
type NavEntry = NavSection | NavItem

function isSection(entry: NavEntry): entry is NavSection {
  return 'sectionKey' in entry
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation('nav')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarPinned, setSidebarPinned] = useState(true)
  const [showHeader] = useState(false)

  const runtimeConfig = ((window as any).__RUNTIME_CONFIG__ ?? {}) as {
    PORTAL_VERSION?: string
    PORTAL_BUILD_TIME?: string
  }

  const portalVersion = runtimeConfig.PORTAL_VERSION || import.meta.env.VITE_PORTAL_VERSION || '0.0.0'
  const portalBuildTime = runtimeConfig.PORTAL_BUILD_TIME || import.meta.env.VITE_PORTAL_BUILD_TIME || 'unknown'

  const { data: apiVersionData } = useQuery<{ version?: string; build_time?: string }>({
    queryKey: ['system', 'version'],
    queryFn: async () => {
      const resp = await systemAPI.versionInfo()
      return resp.data ?? {}
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })

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
    i18n.changeLanguage(next)
  }

  const navigation: NavEntry[] = [
    { sectionKey: 'sections.overview' },
    { nameKey: 'items.dashboard', href: '/dashboard', icon: LayoutDashboard },
    { sectionKey: 'sections.researchData' },
    { nameKey: 'items.strategyResearch', href: '/strategies', icon: FileCode },
    { nameKey: 'items.backtesting', href: '/backtest', icon: TrendingUp },
    { nameKey: 'items.marketData', href: '/market-data', icon: Database },
    { nameKey: 'items.factorLab', href: '/factor-lab', icon: FlaskConical },
    { sectionKey: 'sections.tradingPortfolio' },
    { nameKey: 'items.portfolio', href: '/portfolio', icon: Briefcase },
    { nameKey: 'items.trading', href: '/trading', icon: ArrowLeftRight },
    { nameKey: 'items.paperTrading', href: '/paper-trading', icon: Globe },
    { nameKey: 'items.analytics', href: '/analytics', icon: BarChart3 },
    { sectionKey: 'sections.opsAlerts' },
    { nameKey: 'items.alerts', href: '/monitoring', icon: Bell, badge: '3' },
    { nameKey: 'items.reports', href: '/reports', icon: FileText },
    { sectionKey: 'sections.aiCollaboration' },
    { nameKey: 'items.aiAssistant', href: '/ai-assistant', icon: Sparkles },
    { nameKey: 'items.marketplace', href: '/marketplace', icon: Store },
    {
      nameKey: 'items.sharing',
      href: '/team-space?tab=sharing',
      icon: Share2,
      match: (pathname, search) => pathname === '/team-space' && search.includes('tab=sharing'),
    },
    {
      nameKey: 'items.workspaces',
      href: '/team-space?tab=workspaces',
      icon: Users,
      match: (pathname, search) =>
        pathname === '/team-space' && (!search || search.includes('tab=workspaces')),
    },
    { sectionKey: 'sections.system' },
    { nameKey: 'items.settings', href: '/settings', icon: Settings },
    { nameKey: 'items.accountSecurity', href: '/account-security', icon: Shield },
  ]

  const isActive = (entry: NavItem) => {
    if (entry.match) {
      return entry.match(location.pathname, location.search)
    }
    return location.pathname === entry.href
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      {!sidebarPinned && (
        <div
          onMouseEnter={() => setSidebarOpen(true)}
          onMouseLeave={() => { if (!sidebarPinned) setSidebarOpen(false) }}
          className="fixed left-0 top-0 h-full z-40 w-6 bg-transparent hover:bg-gray-100/10 cursor-pointer"
          aria-hidden={false}
        />
      )}

      <aside
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => { if (!sidebarPinned) setSidebarOpen(false) }}
        className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border transform transition-transform duration-300 flex flex-col ${
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 overflow-hidden'
        }`}
      >
        <div className="shrink-0 px-4 py-3 border-b border-border">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newPinned = !sidebarPinned
                  setSidebarPinned(newPinned)
                  setSidebarOpen(newPinned)
                }}
                className="p-2 rounded-md hover:bg-accent"
                aria-label={t('toggleSidebar')}
                aria-pressed={sidebarPinned}
              >
                <Menu className="h-5 w-5" />
              </button>
              <img src="/logo.svg" alt="QuantMate" className="h-8 w-auto" />
            </div>
            <div className="mt-2 w-full text-[11px] text-muted-foreground leading-4 break-all">
              <p>Portal Version: v{portalVersion}</p>
              <p>Portal Build: {formatBuildTime(portalBuildTime)}</p>
              <p>API Version: v{apiVersionData?.version || '-'}</p>
              <p>API Build: {formatBuildTime(apiVersionData?.build_time)}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-0.5 sidebar-nav">
          {navigation.map((entry, idx) =>
            isSection(entry) ? (
              <div
                key={`section-${idx}`}
                className="px-4 pt-4 pb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t(entry.sectionKey)}
              </div>
            ) : (
              <Link
                key={entry.href}
                to={entry.href}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive(entry)
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <entry.icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{t(entry.nameKey)}</span>
                {entry.badge && (
                  <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[0.65rem] font-semibold leading-none text-destructive-foreground">
                    {entry.badge}
                  </span>
                )}
              </Link>
            )
          )}
        </nav>

        <div className="shrink-0 border-t border-border p-4">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="flex-1">
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="p-2 rounded-md hover:bg-accent transition-colors"
                title={t('switchLang')}
              >
                <Globe className="h-5 w-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : ''}`}>
        {/* Header (hidden by default) */}
        {showHeader && (
          <header className="h-16 border-b border-border bg-card flex items-center px-6">
            <div className="flex-1" />
          </header>
        )}

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

