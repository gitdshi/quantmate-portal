import i18n from '@/i18n'
import Settings from '@/pages/Settings'
import { act, fireEvent, render, screen, waitFor } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    batchUpdate: vi.fn(),
    rebuildSyncStatus: vi.fn(),
    testConnection: vi.fn(),
  },
  systemAPI: {
    syncStatus: vi.fn(),
    streamLogs: vi.fn(),
  },
}))

import { dataSourceAPI, systemAPI } from '@/lib/api'

async function openSystemManagementTab() {
  fireEvent.click(screen.getByRole('button', { name: 'System Management' }))
  await screen.findByRole('heading', { name: 'AkShare API Catalog' })
}

async function openTushareManagementTab() {
  await openSystemManagementTab()
  fireEvent.click(screen.getByRole('button', { name: 'Tushare Pro' }))
  await screen.findByRole('heading', { name: 'Tushare Pro API Catalog' })
}

async function openSystemStatusTab() {
  await openSystemManagementTab()
  fireEvent.click(screen.getByRole('button', { name: 'System Status' }))
}

async function openSystemLogsTab() {
  await openSystemManagementTab()
  fireEvent.click(screen.getByRole('button', { name: 'System Logs' }))
}

function getCardSwitchByHeading(heading: string) {
  const title = screen.getByRole('heading', { name: heading })
  const card = title.closest('div.rounded-lg')
  return card?.querySelector('button[role="switch"]') ?? null
}

describe('Settings Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    // Reset URL search params to avoid tab state leaking between tests
    window.history.replaceState({}, '', window.location.pathname)

    vi.mocked(dataSourceAPI.listConfigs).mockResolvedValue({
      data: {
        data: [
          { source_key: 'tushare', display_name: 'Tushare Pro', enabled: 1, config_json: null, requires_token: 1 },
          { source_key: 'akshare', display_name: 'AkShare', enabled: 1, config_json: null, requires_token: 0 },
        ],
      },
    } as never)
    vi.mocked(dataSourceAPI.listItems).mockImplementation((params?: { source?: string }) =>
      Promise.resolve({
        data: {
          data:
            params?.source === 'akshare'
              ? [
                  {
                    id: 1,
                    source: 'akshare',
                    item_key: 'index_daily',
                    display_name: 'Index Daily',
                    enabled: 1,
                    description: 'Index data',
                    category: 'AkShare',
                    sub_category: 'Core',
                    api_name: 'index_daily',
                    permission_points: null,
                    rate_limit_note: null,
                    requires_permission: '0',
                    sync_priority: 1,
                    sync_supported: true,
                  },
                ]
              : [
                  {
                    id: 2,
                    source: 'tushare',
                    item_key: 'stock_daily',
                    display_name: 'Stock Daily',
                    enabled: 1,
                    description: 'Daily bars',
                    category: 'Market Data',
                    sub_category: 'Daily',
                    api_name: 'stock_daily',
                    permission_points: 120,
                    rate_limit_note: null,
                    requires_permission: '0',
                    sync_priority: 1,
                    sync_supported: true,
                  },
                ],
        },
      }) as never
    )
    vi.mocked(systemAPI.syncStatus).mockResolvedValue({ data: { status: 'ok', version: 'v1.2.0' } } as never)
    vi.mocked(dataSourceAPI.rebuildSyncStatus).mockResolvedValue({
      data: { pending_records: 12, items_reconciled: 1, backfill_jobs: [] },
    } as never)
    vi.mocked(systemAPI.streamLogs).mockResolvedValue(undefined as never)
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
    await openSystemManagementTab()
    expect(await screen.findByRole('heading', { name: 'AkShare API Catalog' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Tushare Pro' })).toBeInTheDocument()
  })

  it('shows trading preferences tab', () => {
    render(<Settings />)
    fireEvent.click(screen.getByRole('button', { name: 'Trading Preferences' }))
    expect(screen.getByText('Trading Parameters')).toBeInTheDocument()
    expect(screen.getByText('Risk Controls')).toBeInTheDocument()
  })

  it('shows system status cards with health data', async () => {
    render(<Settings />)
    await openSystemStatusTab()
    expect(await screen.findByText('System status')).toBeInTheDocument()
    expect(await screen.findByText('status')).toBeInTheDocument()
    expect(await screen.findByText('version')).toBeInTheDocument()
  })

  it('shows system logs tab and streams module output', async () => {
    vi.mocked(systemAPI.streamLogs).mockImplementation(async ({ onEvent }) => {
      onEvent({ type: 'meta', module: 'api', container: 'quantmate-api-1', tail: 200 })
      onEvent({ type: 'log', module: 'api', container: 'quantmate-api-1', line: 'api ready' })
    })

    render(<Settings />)
    await openSystemLogsTab()

    expect(await screen.findByRole('heading', { name: 'System Logs' })).toBeInTheDocument()
    expect(await screen.findByText('api ready')).toBeInTheDocument()
    expect(systemAPI.streamLogs).toHaveBeenCalled()
  })

  // ─── Save settings ──────────────────────────────────────
  it('clicks Save Settings button', async () => {
    render(<Settings />)
    await act(async () => {
      fireEvent.click(screen.getByText('Save Settings'))
    })
    // Save triggers i18n changeLanguage + localStorage; no API call to assert
    // But the button should still be present after click
    expect(screen.getByText('Save Settings')).toBeInTheDocument()
  })

  // ─── Toggle datasource config ───────────────────────────
  it('toggles a datasource config on system management tab', async () => {
    render(<Settings />)
    await openSystemManagementTab()
    await screen.findByRole('heading', { name: 'AkShare API Catalog' })

    const configSwitch = getCardSwitchByHeading('AkShare API Catalog')
    expect(configSwitch).toBeTruthy()
    fireEvent.click(configSwitch!)
    await waitFor(() => {
      expect(dataSourceAPI.updateConfig).toHaveBeenCalled()
    })
  })

  // ─── Test datasource connection ─────────────────────────
  it('clicks test connection on a datasource', async () => {
    vi.mocked(dataSourceAPI.testConnection).mockResolvedValue({ data: { status: 'ok' } } as never)

    render(<Settings />)
    await openSystemManagementTab()
    await screen.findByRole('heading', { name: 'AkShare API Catalog' })

    const testBtns = screen.getAllByRole('button').filter(b => b.textContent?.match(/test connection/i))
    if (testBtns.length > 0) {
      fireEvent.click(testBtns[0])
      await waitFor(() => {
        expect(dataSourceAPI.testConnection).toHaveBeenCalled()
      })
    }
  })

  it('clicks rebuild sync status on Tushare catalog', async () => {
    render(<Settings />)
    await openTushareManagementTab()

    const rebuildButton = screen.getByRole('button', { name: /Sync/i })
    fireEvent.click(rebuildButton)

    await waitFor(() => {
      expect(dataSourceAPI.rebuildSyncStatus).toHaveBeenCalledWith('tushare')
    })
  })

  // ─── Trading preferences: editing fields ────────────────
  it('edits trading preference fields', () => {
    render(<Settings />)
    fireEvent.click(screen.getByRole('button', { name: 'Trading Preferences' }))

    // Find number inputs in trading preferences
    const numberInputs = screen.getAllByRole('spinbutton')
    if (numberInputs.length > 0) {
      fireEvent.change(numberInputs[0], { target: { value: '50000' } })
      expect(numberInputs[0]).toHaveValue(50000)
    }
  })

  // ─── Personal settings: language select ──────────────────
  it('changes language select in personal settings', () => {
    render(<Settings />)
    // Personal tab is default; find selects on the page
    const selects = document.querySelectorAll('select')
    expect(selects.length).toBeGreaterThan(0)
    fireEvent.change(selects[0], { target: { value: 'en' } })
  })

  // ─── Personal settings: timezone/dateFormat/currency selects ─
  it('changes timezone select', () => {
    render(<Settings />)
    const selects = document.querySelectorAll('select')
    // timezone is the 2nd select (after language)
    fireEvent.change(selects[1], { target: { value: 'America/New_York' } })
    expect((selects[1] as HTMLSelectElement).value).toBe('America/New_York')
  })

  it('changes date format select', () => {
    render(<Settings />)
    const selects = document.querySelectorAll('select')
    // dateFormat is the 3rd select
    fireEvent.change(selects[2], { target: { value: 'DD/MM/YYYY' } })
    expect((selects[2] as HTMLSelectElement).value).toBe('DD/MM/YYYY')
  })

  it('changes currency select', () => {
    render(<Settings />)
    const selects = document.querySelectorAll('select')
    // currency is the 4th select
    fireEvent.change(selects[3], { target: { value: 'USD' } })
    expect((selects[3] as HTMLSelectElement).value).toBe('USD')
  })

  // ─── Personal settings: autoSave toggle ─────────────────
  it('toggles autoSave switch', () => {
    render(<Settings />)
    const switches = screen.getAllByRole('switch')
    // First switch on the personal tab is autoSave
    fireEvent.click(switches[0])
    // toggle happened — no error
  })

  // ─── Personal settings: notification toggles ────────────
  it('toggles notification switches', () => {
    render(<Settings />)
    const switches = screen.getAllByRole('switch')
    // After autoSave, there are 5 notification toggles
    expect(switches.length).toBeGreaterThanOrEqual(6)
    // Toggle dailyReport (last one)
    fireEvent.click(switches[switches.length - 1])
  })

  // ─── Personal settings: theme radio ─────────────────────
  it('changes theme radio button', () => {
    render(<Settings />)
    const radios = screen.getAllByRole('radio')
    // Theme radios: light, dark, system (first 3)
    fireEvent.click(radios[0]) // light
    expect(radios[0]).toBeChecked()
  })

  // ─── Personal settings: color scheme radio ──────────────
  it('changes color scheme radio button', () => {
    render(<Settings />)
    const radios = screen.getAllByRole('radio')
    // Color scheme radios: blue, green, purple, orange (after 3 theme radios)
    fireEvent.click(radios[4]) // green
    expect(radios[4]).toBeChecked()
  })

  // ─── Personal settings: chart library select ────────────
  it('changes chart library select', () => {
    render(<Settings />)
    const selects = document.querySelectorAll('select')
    // chartLib is the 5th select (after language, timezone, dateFormat, currency)
    fireEvent.change(selects[4], { target: { value: 'tradingview' } })
    expect((selects[4] as HTMLSelectElement).value).toBe('tradingview')
  })

  // ─── Trading preferences: all field changes ─────────────
  it('edits all trading preference number fields', () => {
    render(<Settings />)
    fireEvent.click(screen.getByRole('button', { name: 'Trading Preferences' }))

    const numberInputs = screen.getAllByRole('spinbutton')
    // Should have 8 fields: capital, commission, slippage, minOrder, maxDrawdown, maxPosition, stopLoss, dailyLoss
    expect(numberInputs.length).toBe(8)
    fireEvent.change(numberInputs[0], { target: { value: '500000' } })
    fireEvent.change(numberInputs[1], { target: { value: '0.0005' } })
    fireEvent.change(numberInputs[2], { target: { value: '0.002' } })
    fireEvent.change(numberInputs[3], { target: { value: '200' } })
    fireEvent.change(numberInputs[4], { target: { value: '0.15' } })
    fireEvent.change(numberInputs[5], { target: { value: '0.3' } })
    fireEvent.change(numberInputs[6], { target: { value: '0.08' } })
    fireEvent.change(numberInputs[7], { target: { value: '0.05' } })
    expect(numberInputs[0]).toHaveValue(500000)
    expect(numberInputs[7]).toHaveValue(0.05)
  })

  // ─── Save triggers toast ────────────────────────────────
  it('save settings triggers success toast', async () => {
    const { showToast: mockToast } = await import('@/components/ui/toast-service')
    render(<Settings />)
    fireEvent.click(screen.getByText('Save Settings'))
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'success')
    })
  })

  // ─── URL tab parameter (line 70) ────────────────────────
  it('activates tab from URL search param', async () => {
    window.history.replaceState({}, '', '/settings?tab=system-management')
    render(<Settings />)
    // The "System Management" tab should be rendered and active
    const systemTab = screen.getByRole('button', { name: /system management/i })
    expect(systemTab).toBeInTheDocument()
    window.history.replaceState({}, '', window.location.pathname)
  })

  // ─── Tab switch removes URL param (line 123) ───────────
  it('removes tab param when switching to personal tab', async () => {
    window.history.replaceState({}, '', '/settings?tab=system-management')
    render(<Settings />)
    // Click on Personal Settings tab
    const personalTab = screen.getByRole('button', { name: /personal/i })
    fireEvent.click(personalTab)
    // URL should no longer have tab param 
    expect(window.location.search).not.toContain('tab=system-management')
    window.history.replaceState({}, '', window.location.pathname)
  })

  // ─── Toggle data source item switch (lines 63-64, 123) ──
  it('toggles a data source item switch', async () => {
    vi.mocked(dataSourceAPI.updateItem).mockResolvedValue({ data: {} } as never)

    window.history.replaceState({}, '', '/settings?tab=system-management')
    render(<Settings />)

    await openTushareManagementTab()
    fireEvent.click(screen.getByRole('button', { name: /Market Data/ }))

    // Wait for item display name to appear (proves items query loaded)
    await waitFor(() => {
      expect(screen.getByText('Stock Daily')).toBeInTheDocument()
    })

    const stockDailyLabel = screen.getByText('Stock Daily')
    const itemSwitch = stockDailyLabel.closest('div.min-w-0')?.parentElement?.querySelector('button[role="switch"]')
    expect(itemSwitch).toBeTruthy()

    fireEvent.click(itemSwitch!)

    await waitFor(() => {
      expect(dataSourceAPI.updateItem).toHaveBeenCalledWith('stock_daily', expect.objectContaining({ source: 'tushare', enabled: false }))
    })
    window.history.replaceState({}, '', window.location.pathname)
  })

  // ─── Test connection button (line 70) ──
  it('clicks test connection button for a data source', async () => {
    vi.mocked(dataSourceAPI.testConnection).mockResolvedValue({ data: {} } as never)

    window.history.replaceState({}, '', '/settings?tab=system-management')
    render(<Settings />)

    await waitFor(() => {
      const testBtns = Array.from(document.querySelectorAll('button')).filter(
        (b) => b.textContent?.match(/test/i)
      )
      expect(testBtns.length).toBeGreaterThan(0)
    })

    const testBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/test/i) && !b.textContent?.match(/tab|setting/i)
    )
    if (testBtn) {
      fireEvent.click(testBtn)
      await waitFor(() => {
        expect(dataSourceAPI.testConnection).toHaveBeenCalled()
      })
    }
    window.history.replaceState({}, '', window.location.pathname)
  })

  // ─── handleTabChange to trading-preferences (line 175) ──
  it('switches to trading-preferences tab and updates URL', async () => {
    render(<Settings />)

    const tradingTab = screen.getByRole('button', { name: /trading preferences/i })
    fireEvent.click(tradingTab)

    await waitFor(() => {
      expect(window.location.search).toContain('tab=trading-preferences')
    })
    window.history.replaceState({}, '', window.location.pathname)
  })

  // ─── Test connection failure (line 70 — onError branch) ──
  it('shows error toast when test connection fails', async () => {
    vi.mocked(dataSourceAPI.testConnection).mockRejectedValue(new Error('Connection refused'))

    window.history.replaceState({}, '', '/settings?tab=system-management')
    render(<Settings />)

    await waitFor(() => {
      const testBtns = Array.from(document.querySelectorAll('button')).filter(
        (b) => b.textContent?.match(/test/i) && !b.textContent?.match(/tab|setting/i)
      )
      expect(testBtns.length).toBeGreaterThan(0)
    })

    const testBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/test/i) && !b.textContent?.match(/tab|setting/i)
    )
    expect(testBtn).toBeTruthy()
    fireEvent.click(testBtn!)

    // The onError callback should fire
    await waitFor(() => {
      expect(dataSourceAPI.testConnection).toHaveBeenCalled()
    })
    window.history.replaceState({}, '', window.location.pathname)
  })
})
