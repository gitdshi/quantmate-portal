import type { Column } from '@/components/ui/DataTable'
import DataTable from '@/components/ui/DataTable'
import i18n from '@/i18n'
import { fireEvent, render, screen } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = { id: number; name: string; value: number }

const columns: Column<Row>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'value', label: 'Value', sortable: true },
]

const data: Row[] = [
  { id: 1, name: 'Alpha', value: 30 },
  { id: 2, name: 'Beta', value: 10 },
  { id: 3, name: 'Charlie', value: 20 },
]

describe('DataTable', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
  })

  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Value')).toBeInTheDocument()
  })

  it('renders data rows', () => {
    render(<DataTable columns={columns} data={data} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('shows empty text when no data', () => {
    render(<DataTable columns={columns} data={[]} emptyText="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('sorts string column ascending', () => {
    render(<DataTable columns={columns} data={data} />)
    const nameHeader = screen.getByText('Name')
    fireEvent.click(nameHeader)
    const rows = screen.getAllByRole('row')
    // First row is header, sorted asc: Alpha, Beta, Charlie
    expect(rows[1]).toHaveTextContent('Alpha')
    expect(rows[3]).toHaveTextContent('Charlie')
  })

  it('sorts descending on second click', () => {
    render(<DataTable columns={columns} data={data} />)
    const nameHeader = screen.getByText('Name')
    fireEvent.click(nameHeader) // asc
    fireEvent.click(nameHeader) // desc
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Charlie')
  })

  it('sorts number column', () => {
    render(<DataTable columns={columns} data={data} />)
    const valueHeader = screen.getByText('Value')
    fireEvent.click(valueHeader)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('10')
  })

  it('handles onRowClick', () => {
    const onClick = vi.fn()
    render(<DataTable columns={columns} data={data} onRowClick={onClick} />)
    fireEvent.click(screen.getByText('Alpha'))
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alpha' }))
  })

  it('renders with custom render function', () => {
    const cols: Column<Row>[] = [
      { key: 'name', label: 'Name', render: (row) => <strong>{row.name}!</strong> },
    ]
    render(<DataTable columns={cols} data={data} />)
    expect(screen.getByText('Alpha!')).toBeInTheDocument()
  })
})
