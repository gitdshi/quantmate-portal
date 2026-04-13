import SymbolSearch from '@/components/SymbolSearch'
import i18n from '@/i18n'
import { act, fireEvent, render, screen, waitFor } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  marketDataAPI: {
    symbols: vi.fn(),
  },
}))

import { marketDataAPI } from '@/lib/api'

const mockSymbols = [
  { symbol: '000001.SZ', name: 'Ping An Bank' },
  { symbol: '600000.SH', name: 'Shanghai Pudong Bank' },
]

describe('SymbolSearch', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(marketDataAPI.symbols).mockResolvedValue({ data: mockSymbols } as never)
  })

  it('renders search input', () => {
    render(<SymbolSearch />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders market selector', () => {
    render(<SymbolSearch />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows dropdown on typing', async () => {
    vi.useFakeTimers()
    render(<SymbolSearch />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '000001' } })
    // Advance past debounce
    act(() => { vi.advanceTimersByTime(300) })
    vi.useRealTimers()
    await waitFor(() => {
      expect(marketDataAPI.symbols).toHaveBeenCalled()
    })
  })

  it('calls onSelect when clicking a symbol', async () => {
    const onSelect = vi.fn()
    vi.useFakeTimers()
    render(<SymbolSearch onSelect={onSelect} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Ping' } })
    act(() => { vi.advanceTimersByTime(300) })
    vi.useRealTimers()
    await waitFor(() => {
      expect(screen.getByText('000001.SZ')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('000001.SZ'))
    expect(onSelect).toHaveBeenCalledWith('000001.SZ')
  })

  it('calls onChoose when provided', async () => {
    const onChoose = vi.fn()
    vi.useFakeTimers()
    render(<SymbolSearch onChoose={onChoose} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Ping' } })
    act(() => { vi.advanceTimersByTime(300) })
    vi.useRealTimers()
    await waitFor(() => {
      expect(screen.getByText('000001.SZ')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('000001.SZ'))
    expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({ symbol: '000001.SZ' }))
  })

  it('calls onToggle for multi-select mode', async () => {
    const onToggle = vi.fn()
    vi.useFakeTimers()
    render(<SymbolSearch multi onToggle={onToggle} selected={new Map()} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Ping' } })
    act(() => { vi.advanceTimersByTime(300) })
    vi.useRealTimers()
    await waitFor(() => {
      expect(screen.getByText('000001.SZ')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('000001.SZ'))
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ symbol: '000001.SZ' }))
  })

  it('shows no results when empty', async () => {
    vi.mocked(marketDataAPI.symbols).mockResolvedValue({ data: [] } as never)
    vi.useFakeTimers()
    render(<SymbolSearch />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'nonexistent' } })
    act(() => { vi.advanceTimersByTime(300) })
    vi.useRealTimers()
    await waitFor(() => {
      // The empty state text contains the search term
      expect(screen.getByText(/nonexistent/i)).toBeInTheDocument()
    })
  })

  it('renders symbol name when present', async () => {
    vi.useFakeTimers()
    render(<SymbolSearch />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Ping' } })
    act(() => { vi.advanceTimersByTime(300) })
    vi.useRealTimers()
    await waitFor(() => {
      expect(screen.getByText('Ping An Bank')).toBeInTheDocument()
    })
  })

  it('changes market filter', () => {
    render(<SymbolSearch />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'US' } })
    expect(select).toHaveValue('US')
  })

  it('closes dropdown on outside click', async () => {
    vi.useFakeTimers()
    render(<SymbolSearch />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'X' } })
    act(() => { vi.advanceTimersByTime(300) })
    vi.useRealTimers()
    // Click outside
    fireEvent.mouseDown(document.body)
    // After click outside, dropdown should close — symbols should not be shown
    await waitFor(() => {
      expect(screen.queryByText('000001.SZ')).not.toBeInTheDocument()
    })
  })
})
