import {
    BarChart3,
    Bell,
    Bot,
    Briefcase,
    Database,
    FileCode,
    FileText,
    FlaskConical,
    Globe,
    LayoutDashboard,
    LogOut,
    Menu,
    PlayCircle,
    Settings,
    ShieldCheck,
    ShoppingBag,
    ShoppingCart,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

type NavSection = { sectionKey: string }
type NavItem = { nameKey: string; href: string; icon: LucideIcon }
type NavEntry = NavSection | NavItem

function isSection(entry: NavEntry): entry is NavSection {
  return 'sectionKey' in entry
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('nav')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarPinned, setSidebarPinned] = useState(true)
  const [showHeader, setShowHeader] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleLanguage = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(next)
  }

  const navigation: NavEntry[] = [
    { sectionKey: 'sections.overview' },
    { nameKey: 'items.dashboard', href: '/dashboard', icon: LayoutDashboard },
    { sectionKey: 'sections.strategyDev' },
    { nameKey: 'items.strategies', href: '/strategies', icon: FileCode },
    { nameKey: 'items.backtest', href: '/backtest', icon: TrendingUp },
    { nameKey: 'items.paperTrading', href: '/paper-trading', icon: PlayCircle },
    { sectionKey: 'sections.liveTrading' },
    { nameKey: 'items.marketData', href: '/market-data', icon: Database },
    { nameKey: 'items.trading', href: '/trading', icon: ShoppingCart },
    { nameKey: 'items.positions', href: '/positions', icon: Wallet },
    { nameKey: 'items.portfolio', href: '/portfolio', icon: Briefcase },
    { nameKey: 'items.analytics', href: '/analytics', icon: BarChart3 },
    { nameKey: 'items.monitoring', href: '/monitoring', icon: Bell },
    { nameKey: 'items.reports', href: '/reports', icon: FileText },
    { sectionKey: 'sections.researchAI' },
    { nameKey: 'items.factorLab', href: '/factor-lab', icon: FlaskConical },
    { nameKey: 'items.aiAssistant', href: '/ai-assistant', icon: Bot },
    { nameKey: 'items.visualExplorer', href: '/visual-explorer', icon: BarChart3 },
    { sectionKey: 'sections.community' },
    { nameKey: 'items.marketplace', href: '/marketplace', icon: ShoppingBag },
    { nameKey: 'items.teamSpace', href: '/team-space', icon: Users },
    { sectionKey: 'sections.system' },
    { nameKey: 'items.accountSecurity', href: '/account-security', icon: ShieldCheck },
    { nameKey: 'items.settings', href: '/settings', icon: Settings },
  ]

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
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-3">
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
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <entry.icon className="h-5 w-5 shrink-0" />
                {t(entry.nameKey)}
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

