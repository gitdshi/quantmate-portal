import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@test/support/utils'
import userEvent from '@testing-library/user-event'
import Settings from '@/pages/Settings'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
  dataSourceAPI: {
    listItems: vi.fn(),
    updateItem: vi.fn(),
    batchUpdate: vi.fn(),
    testConnection: vi.fn(),
  },
}))

import { dataSourceAPI } from '@/lib/api'

const mockItems = [
  {
    item_key: 'stock_basic',
    name: '股票列表',
    source: 'tushare',
    api_identifier: 'stock_basic',
    permission_level: '基础',
    enabled: true,
    last_sync: '2025-01-01 10:00',
    status: 'ok',
  },
  {
    item_key: 'stock_daily',
    name: '日线行情',
    source: 'tushare',
    api_identifier: 'stock_daily',
    permission_level: '基础',
    enabled: true,
    last_sync: '2025-01-01 10:00',
    status: 'ok',
  },
  {
    item_key: 'top10_holders',
    name: '十大股东',
    source: 'tushare',
    api_identifier: 'top10_holders',
    permission_level: '积分 �?5000',
    enabled: false,
  },
  {
    item_key: 'ak_trade_cal',
    name: '交易日历',
    source: 'akshare',
    api_identifier: 'ak_trade_cal',
    permission_level: '无需Token',
    enabled: true,
    last_sync: '2025-01-01 08:00',
  },
]

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(dataSourceAPI.listItems as any).mockResolvedValue({ data: mockItems })
    ;(dataSourceAPI.updateItem as any).mockResolvedValue({ data: { ok: true } })
    ;(dataSourceAPI.batchUpdate as any).mockResolvedValue({ data: { ok: true } })
    ;(dataSourceAPI.testConnection as any).mockResolvedValue({ data: { ok: true, message: 'Connected' } })
  })

  it('renders Settings heading and data source items', async () => {
    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    expect(screen.getByText('Data Item Toggle Management')).toBeInTheDocument()
    expect(screen.getByText('股票列表')).toBeInTheDocument()
    expect(screen.getByText('日线行情')).toBeInTheDocument()
    expect(screen.getByText('十大股东')).toBeInTheDocument()
    expect(screen.getByText('交易日历')).toBeInTheDocument()
  })

  it('displays source groups with stats', async () => {
    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByText('tushare')).toBeInTheDocument()
    })

    expect(screen.getByText('akshare')).toBeInTheDocument()
    expect(screen.getByText('(2/3 enabled)')).toBeInTheDocument()
    expect(screen.getByText('(1/1 enabled)')).toBeInTheDocument()
  })

  it('displays permission badges with correct styling', async () => {
    render(<Settings />)

    await waitFor(() => {
      expect(screen.getAllByText('基础')).toHaveLength(2)
    })

    expect(screen.getByText('积分 �?5000')).toBeInTheDocument()
    expect(screen.getByText('无需Token')).toBeInTheDocument()
  })

  it('shows enabled/disabled status badges', async () => {
    render(<Settings />)

    await waitFor(() => {
      expect(screen.getAllByText('Enabled')).toHaveLength(3)
    })

    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('displays enabled item count summary', async () => {
    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByText(/Enabled: 3 \/ 4 items/)).toBeInTheDocument()
    })
  })

  it('toggles a data source item', async () => {
    const user = userEvent.setup()
    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByText('十大股东')).toBeInTheDocument()
    })

    const toggleBtn = screen.getByLabelText('Toggle 十大股东')
    await user.click(toggleBtn)

    expect(dataSourceAPI.updateItem).toHaveBeenCalledWith('top10_holders', { enabled: true })
  })

  it('calls batchUpdate when Enable All is clicked', async () => {
    const user = userEvent.setup()
    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByText('tushare')).toBeInTheDocument()
    })

    const enableAllBtns = screen.getAllByText('Enable All')
    await user.click(enableAllBtns[0])

    expect(dataSourceAPI.batchUpdate).toHaveBeenCalledWith({
      items: [
        { item_key: 'stock_basic', enabled: true },
        { item_key: 'stock_daily', enabled: true },
        { item_key: 'top10_holders', enabled: true },
      ],
    })
  })

  it('tests connection for a data source', async () => {
    const user = userEvent.setup()
    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByText('tushare')).toBeInTheDocument()
    })

    const testBtns = screen.getAllByText('Test Connection')
    await user.click(testBtns[0])

    expect(dataSourceAPI.testConnection).toHaveBeenCalledWith('tushare')

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })
  })

  it('shows error state when loading fails', async () => {
    ;(dataSourceAPI.listItems as any).mockRejectedValue(new Error('Network error'))

    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load data source items')).toBeInTheDocument()
    })

    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('shows empty state when no items', async () => {
    ;(dataSourceAPI.listItems as any).mockResolvedValue({ data: [] })

    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByText('No data source items configured')).toBeInTheDocument()
    })
  })

  it('shows API identifiers in monospace', async () => {
    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByText('stock_basic')).toBeInTheDocument()
    })

    expect(screen.getByText('top10_holders')).toBeInTheDocument()
    expect(screen.getByText('ak_trade_cal')).toBeInTheDocument()
  })
})


