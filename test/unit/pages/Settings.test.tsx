import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import i18n from '@/i18n'
import Settings from '@/pages/Settings'

vi.mock('@/components/ui/toast-service', () => ({
  showToast: vi.fn(),
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({
    can: (feature: string) => feature === 'admin.system-config',
    hasPermission: (permission: string) => permission === 'system.manage',
    isAdmin: () => true,
    role: 'admin',
  }),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  dataSourceAPI: {
    listConfigs: vi.fn(),
    listItems: vi.fn(),
    updateConfig: vi.fn(),
    updateItem: vi.fn(),
    testConnection: vi.fn(),
  },
  systemAPI: {
    syncStatus: vi.fn(),
  },
}))

import { dataSourceAPI, systemAPI } from '@/lib/api'

describe('Settings Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')

    vi.mocked(dataSourceAPI.listConfigs).mockResolvedValue({
      data: {
        data: [
          { source_key: 'tushare', display_name: 'Tushare Pro', enabled: 1, config_json: null, requires_token: 1 },
          { source_key: 'akshare', display_name: 'AkShare', enabled: 1, config_json: null, requires_token: 0 },
        ],
      },
    } as never)
    vi.mocked(dataSourceAPI.listItems).mockResolvedValue({
      data: {
        data: [
          {
            source: 'tushare',
            item_key: 'stock_daily',
            display_name: 'Stock Daily',
            enabled: 1,
            target_database: 'quantmate',
            target_table: 'stock_daily',
            table_created: 1,
            sync_priority: 1,
          },
        ],
      },
    } as never)
    vi.mocked(systemAPI.syncStatus).mockResolvedValue({ data: { status: 'ok', version: 'v1.2.0' } } as never)
  })

  it('renders heading', () => {
    render(<Settings />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('shows the current tab set', () => {
    render(<Settings />)
    expect(screen.getByRole('button', { name: 'Personal Settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trading Preferences' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'System Management' })).toBeInTheDocument()
  })

  it('shows save button', () => {
    render(<Settings />)
    expect(screen.getByText('Save Settings')).toBeInTheDocument()
  })

  it('shows personal settings by default', () => {
    render(<Settings />)
    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getByText('Timezone')).toBeInTheDocument()
    expect(screen.getByText('Date Format')).toBeInTheDocument()
    expect(screen.getByText('Default Currency')).toBeInTheDocument()
    expect(screen.getByText('Auto Save')).toBeInTheDocument()
  })

  it('switches to system management tab and shows datasource config', async () => {
    render(<Settings />)
    fireEvent.click(screen.getByRole('button', { name: 'System Management' }))
    expect(await screen.findByText('Tushare Pro')).toBeInTheDocument()
    expect(await screen.findByText('AkShare')).toBeInTheDocument()
  })

  it('shows trading preferences tab', () => {
    render(<Settings />)
    fireEvent.click(screen.getByRole('button', { name: 'Trading Preferences' }))
    expect(screen.getByText('Trading Parameters')).toBeInTheDocument()
    expect(screen.getByText('Risk Controls')).toBeInTheDocument()
  })

  it('shows system status cards with health data', async () => {
    render(<Settings />)
    fireEvent.click(screen.getByRole('button', { name: 'System Management' }))
    expect(await screen.findByText('System status')).toBeInTheDocument()
    expect(await screen.findByText('status')).toBeInTheDocument()
    expect(await screen.findByText('version')).toBeInTheDocument()
  })
})
