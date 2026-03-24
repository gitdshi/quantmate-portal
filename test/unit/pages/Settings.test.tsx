import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import i18n from '@/i18n'
import Settings from '@/pages/Settings'

vi.mock('@/components/ui/toast-service', () => ({
  showToast: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  systemAPI: {
    syncStatus: vi.fn(),
  },
}))

import { systemAPI } from '@/lib/api'

describe('Settings Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(systemAPI.syncStatus).mockResolvedValue({ data: { status: 'ok', version: 'v1.2.0' } } as never)
  })

  it('renders heading', () => {
    render(<Settings />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('shows all 6 tabs', () => {
    render(<Settings />)
    expect(screen.getByText('General Settings')).toBeInTheDocument()
    expect(screen.getByText('Data Source')).toBeInTheDocument()
    expect(screen.getByText('Trading Parameters')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('UI Settings')).toBeInTheDocument()
    expect(screen.getByText('System Info')).toBeInTheDocument()
  })

  it('shows save button', () => {
    render(<Settings />)
    expect(screen.getByText('Save Settings')).toBeInTheDocument()
  })

  it('shows general settings by default', () => {
    render(<Settings />)
    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getByText('Timezone')).toBeInTheDocument()
    expect(screen.getByText('Date Format')).toBeInTheDocument()
    expect(screen.getByText('Default Currency')).toBeInTheDocument()
    expect(screen.getByText('Auto Save')).toBeInTheDocument()
  })

  it('switches to datasource tab', () => {
    render(<Settings />)
    fireEvent.click(screen.getByText('Data Source'))
    expect(screen.getByText('Tushare Pro')).toBeInTheDocument()
    expect(screen.getByText('AkShare')).toBeInTheDocument()
  })

  it('shows trading config tab', () => {
    render(<Settings />)
    fireEvent.click(screen.getByText('Trading Parameters'))
    expect(screen.getAllByText('Trading Parameters').length).toBeGreaterThan(0)
    expect(screen.getByText('Risk Controls')).toBeInTheDocument()
  })

  it('shows notification settings tab', () => {
    render(<Settings />)
    fireEvent.click(screen.getByText('Notifications'))
    expect(screen.getByText('Strategy Status Alerts')).toBeInTheDocument()
    expect(screen.getByText('Trade Execution Alerts')).toBeInTheDocument()
    expect(screen.getByText('Risk Alerts')).toBeInTheDocument()
  })

  it('shows UI settings tab', () => {
    render(<Settings />)
    fireEvent.click(screen.getByText('UI Settings'))
    expect(screen.getByText('Theme Mode')).toBeInTheDocument()
    expect(screen.getByText('Accent Color')).toBeInTheDocument()
    expect(screen.getByText('Chart Library')).toBeInTheDocument()
  })

  it('shows system info tab with health data', async () => {
    render(<Settings />)
    fireEvent.click(screen.getByText('System Info'))
    expect(await screen.findByText('System Status')).toBeInTheDocument()
    expect(await screen.findByText('status')).toBeInTheDocument()
    expect(await screen.findByText('version')).toBeInTheDocument()
  })
})
