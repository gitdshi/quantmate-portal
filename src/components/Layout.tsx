import {
    BarChart3,
    Bell,
    Bot,
    Briefcase,
    Database,
    FileCode,
    FileText,
    FlaskConical,
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
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

type NavSection = { section: string }
type NavItem = { name: string; href: string; icon: LucideIcon }
type NavEntry = NavSection | NavItem

function isSection(entry: NavEntry): entry is NavSection {
  return 'section' in entry
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarPinned, setSidebarPinned] = useState(true)
  const [showHeader, setShowHeader] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigation: NavEntry[] = [
    { section: '概览' },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { section: '策略开发' },
    { name: '策略研究', href: '/strategies', icon: FileCode },
    { name: '回测评估', href: '/backtest', icon: TrendingUp },
    { name: '模拟交易', href: '/paper-trading', icon: PlayCircle },
    { section: '实盘交易' },
    { name: '行情数据', href: '/market-data', icon: Database },
    { name: '交易执行', href: '/trading', icon: ShoppingCart },
    { name: '持仓管理', href: '/positions', icon: Wallet },
    { name: '组合管理', href: '/portfolio', icon: Briefcase },
    { name: '分析中心', href: '/analytics', icon: BarChart3 },
    { name: '监控告警', href: '/monitoring', icon: Bell },
    { name: '报告复盘', href: '/reports', icon: FileText },
    { section: '研究 & AI' },
    { name: '因子研究', href: '/factor-lab', icon: FlaskConical },
    { name: 'AI 助手', href: '/ai-assistant', icon: Bot },
    { name: '可视化探索', href: '/visual-explorer', icon: BarChart3 },
    { section: '社区' },
    { name: '模板市场', href: '/marketplace', icon: ShoppingBag },
    { name: '团队空间', href: '/team-space', icon: Users },
    { section: '系统管理' },
    { name: '账户安全', href: '/account-security', icon: ShieldCheck },
    { name: '系统设置', href: '/settings', icon: Settings },
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
              aria-label="Toggle sidebar"
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
                {entry.section}
              </div>
            ) : (
              <Link
                key={entry.href}
                to={entry.href}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <entry.icon className="h-5 w-5 shrink-0" />
                {entry.name}
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

