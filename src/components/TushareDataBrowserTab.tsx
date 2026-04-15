import { useQuery } from '@tanstack/react-query'
import { Database, Filter, Plus, RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Pagination from './Pagination'
import Modal from './ui/Modal'
import DataTable, { type Column } from './ui/DataTable'
import FilterBar from './ui/FilterBar'
import { marketDataAPI } from '../lib/api'

type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'in'
  | 'between'
  | 'is_null'
  | 'is_not_null'

type TushareTableInfo = {
  name: string
  column_count: number
  primary_keys: string[]
}

type TushareColumn = {
  name: string
  data_type: string
  nullable: boolean
  default?: string | null
  primary_key: boolean
  indexed: boolean
}

type TushareSchema = {
  table: string
  columns: TushareColumn[]
}

type TushareRowsResponse = {
  table: string
  data: Array<Record<string, unknown>>
  meta: {
    page: number
    page_size: number
    total: number
    total_pages: number
    sort_by: string
    sort_dir: 'asc' | 'desc'
  }
}

type BrowserRequestFilter = {
  column: string
  operator: string
  value?: unknown
  values?: unknown[]
}

type DraftFilter = {
  id: string
  column: string
  operator: FilterOperator
  value: string
  valueTo: string
  values: string
}

const FILTER_OPERATORS: FilterOperator[] = [
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'in',
  'between',
  'is_null',
  'is_not_null',
]

function createDraftFilter(): DraftFilter {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    column: '',
    operator: 'eq',
    value: '',
    valueTo: '',
    values: '',
  }
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">NULL</span>
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return (
    <span className="block max-w-[260px] truncate" title={text}>
      {text}
    </span>
  )
}

function operatorNeedsValue(operator: FilterOperator) {
  return !['is_null', 'is_not_null'].includes(operator)
}

function operatorNeedsRange(operator: FilterOperator) {
  return operator === 'between'
}

function operatorNeedsList(operator: FilterOperator) {
  return operator === 'in'
}

export default function TushareDataBrowserTab() {
  const { t } = useTranslation(['market', 'common'])

  const [tableKeyword, setTableKeyword] = useState('')
  const [selectedTable, setSelectedTable] = useState('')
  const [draftFilters, setDraftFilters] = useState<DraftFilter[]>([createDraftFilter()])
  const [appliedFilters, setAppliedFilters] = useState<BrowserRequestFilter[]>([])
  const [filterError, setFilterError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [tableInfoOpen, setTableInfoOpen] = useState(false)
  const [schemaOpen, setSchemaOpen] = useState(false)

  const { data: tables = [], isLoading: tablesLoading, error: tablesError } = useQuery<TushareTableInfo[]>({
    queryKey: ['market', 'tushare', 'tables', tableKeyword],
    queryFn: () =>
      marketDataAPI
        .tushareTables(tableKeyword || undefined)
        .then((response) => (response.data as { data: TushareTableInfo[] }).data ?? []),
  })

  useEffect(() => {
    if (!selectedTable && tables.length > 0) {
      setSelectedTable(tables[0].name)
    }
  }, [selectedTable, tables])

  useEffect(() => {
    setDraftFilters([createDraftFilter()])
    setAppliedFilters([])
    setFilterError(null)
    setPage(1)
    setSortBy('')
    setSortDir('desc')
  }, [selectedTable])

  const { data: schema, isLoading: schemaLoading, error: schemaError } = useQuery<TushareSchema>({
    queryKey: ['market', 'tushare', 'schema', selectedTable],
    enabled: !!selectedTable,
    queryFn: () => marketDataAPI.tushareTableSchema(selectedTable).then((response) => response.data as TushareSchema),
  })

  const rowsPayload = useMemo(
    () => ({
      page,
      page_size: pageSize,
      sort_by: sortBy || undefined,
      sort_dir: sortDir,
      filters: appliedFilters,
    }),
    [appliedFilters, page, pageSize, sortBy, sortDir]
  )

  const { data: rowsData, isLoading: rowsLoading, error: rowsError } = useQuery<TushareRowsResponse>({
    queryKey: ['market', 'tushare', 'rows', selectedTable, rowsPayload],
    enabled: !!selectedTable,
    queryFn: () =>
      marketDataAPI.tushareTableRows(selectedTable, rowsPayload).then((response) => response.data as TushareRowsResponse),
  })

  const tableOptions = useMemo(
    () => tables.map((table) => ({ value: table.name, label: `${table.name} (${table.column_count})` })),
    [tables]
  )
  const selectedTableInfo = useMemo(
    () => tables.find((table) => table.name === selectedTable) ?? null,
    [selectedTable, tables]
  )

  const schemaColumns = schema?.columns ?? []
  const sortOptions = useMemo(
    () => schemaColumns.map((column) => ({ value: column.name, label: `${column.name} · ${column.data_type}` })),
    [schemaColumns]
  )

  const dataColumns = useMemo<Column<Record<string, unknown>>[]>(() => {
    if (schemaColumns.length === 0) return []
    return schemaColumns.map((column) => ({
      key: column.name,
      label: column.name,
      render: (row) => formatCellValue(row[column.name]),
      className: 'align-top whitespace-nowrap',
    }))
  }, [schemaColumns])

  const hasAnyRows = (rowsData?.data?.length ?? 0) > 0

  const buildFilters = () => {
    const normalized: BrowserRequestFilter[] = []
    for (const item of draftFilters) {
      if (!item.column) continue
      if (operatorNeedsList(item.operator)) {
        const values = item.values
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
        if (values.length === 0) {
          throw new Error(t('page.browser.errors.inValueRequired'))
        }
        normalized.push({ column: item.column, operator: item.operator, values })
        continue
      }
      if (operatorNeedsRange(item.operator)) {
        if (!item.value.trim() || !item.valueTo.trim()) {
          throw new Error(t('page.browser.errors.betweenValueRequired'))
        }
        normalized.push({ column: item.column, operator: item.operator, values: [item.value.trim(), item.valueTo.trim()] })
        continue
      }
      if (operatorNeedsValue(item.operator)) {
        if (!item.value.trim()) {
          throw new Error(t('page.browser.errors.filterValueRequired'))
        }
        normalized.push({ column: item.column, operator: item.operator, value: item.value.trim() })
        continue
      }
      normalized.push({ column: item.column, operator: item.operator })
    }
    return normalized
  }

  const handleApplyFilters = () => {
    try {
      const normalized = buildFilters()
      setAppliedFilters(normalized)
      setFilterError(null)
      setPage(1)
    } catch (error) {
      setFilterError(error instanceof Error ? error.message : t('page.browser.errors.invalidFilter'))
    }
  }

  const handleClearFilters = () => {
    setDraftFilters([createDraftFilter()])
    setAppliedFilters([])
    setFilterError(null)
    setPage(1)
  }

  const updateDraftFilter = (id: string, patch: Partial<DraftFilter>) => {
    setDraftFilters((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const popupButtonClass =
    'inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
  const modalInfoCardClass = 'rounded-lg border border-border bg-background px-4 py-3'
  const resolvedTotalRows = rowsData?.meta.total ?? t('page.browser.info.notLoaded')
  const resolvedPrimaryKeys = selectedTableInfo?.primary_keys?.length
    ? selectedTableInfo.primary_keys.join(', ')
    : t('page.browser.info.primaryKeysEmpty')
  const resolvedSort = rowsData?.meta.sort_by
    ? `${rowsData.meta.sort_by} · ${rowsData.meta.sort_dir}`
    : t('page.browser.info.notLoaded')
  const modalFooter = (
    <button
      type="button"
      onClick={() => {
        setTableInfoOpen(false)
        setSchemaOpen(false)
      }}
      className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
    >
      {t('common:cancel')}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Database size={18} className="text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('page.browser.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('page.browser.subtitle')}</p>
          </div>
        </div>

        <FilterBar
          searchValue={tableKeyword}
          onSearchChange={setTableKeyword}
          searchPlaceholder={t('page.browser.tableSearchPlaceholder')}
          filters={[
            {
              key: 'table',
              value: selectedTable,
              options: tableOptions,
              onChange: (value) => setSelectedTable(value),
              placeholder: t('page.browser.selectTable'),
            },
            {
              key: 'page-size',
              value: String(pageSize),
              options: [25, 50, 100].map((size) => ({ value: String(size), label: `${size}` })),
              onChange: (value) => {
                setPageSize(Number(value))
                setPage(1)
              },
            },
          ]}
        >
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTableInfoOpen(true)}
              disabled={!selectedTable}
              className={popupButtonClass}
              data-testid="tushare-table-info-button"
            >
              {t('page.browser.tableInfoButton')}
            </button>
            <button
              type="button"
              onClick={() => setSchemaOpen(true)}
              disabled={!selectedTable}
              className={popupButtonClass}
              data-testid="tushare-schema-button"
            >
              {t('page.browser.schemaButton')}
            </button>
            <div className="text-xs text-muted-foreground">
              {t('page.browser.tableCount', { count: tables.length })}
            </div>
          </div>
        </FilterBar>

        {tablesError && <p className="text-sm text-destructive">{t('page.browser.tableLoadFailed')}</p>}
        {tablesLoading && <p className="text-sm text-muted-foreground">{t('page.browser.loadingTables')}</p>}
      </div>

      {selectedTable && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-muted-foreground" />
              <h3 className="font-semibold text-foreground">{t('page.browser.filtersTitle')}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDraftFilters((current) => [...current, createDraftFilter()])}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
              >
                <Plus size={14} />
                {t('page.browser.addFilter')}
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
              >
                <RotateCcw size={14} />
                {t('page.browser.clearFilters')}
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
              >
                {t('page.browser.applyFilters')}
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value)
                setPage(1)
              }}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{t('page.browser.autoSort')}</option>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={sortDir}
              onChange={(event) => {
                setSortDir(event.target.value as 'asc' | 'desc')
                setPage(1)
              }}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="desc">{t('page.browser.sortDesc')}</option>
              <option value="asc">{t('page.browser.sortAsc')}</option>
            </select>
          </div>

          <div className="space-y-3">
            {draftFilters.map((filter, index) => (
              <div key={filter.id} className="grid gap-2 rounded-lg border border-border bg-background p-3 md:grid-cols-[1fr_180px_1fr_1fr_auto]">
                <select
                  value={filter.column}
                  onChange={(event) => updateDraftFilter(filter.id, { column: event.target.value })}
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <option value="">{t('page.browser.selectColumn')}</option>
                  {schemaColumns.map((column) => (
                    <option key={column.name} value={column.name}>{column.name}</option>
                  ))}
                </select>

                <select
                  value={filter.operator}
                  onChange={(event) =>
                    updateDraftFilter(filter.id, {
                      operator: event.target.value as FilterOperator,
                      value: '',
                      valueTo: '',
                      values: '',
                    })
                  }
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  {FILTER_OPERATORS.map((operator) => (
                    <option key={operator} value={operator}>{t(`page.browser.operators.${operator}`)}</option>
                  ))}
                </select>

                {operatorNeedsList(filter.operator) ? (
                  <input
                    value={filter.values}
                    onChange={(event) => updateDraftFilter(filter.id, { values: event.target.value })}
                    placeholder={t('page.browser.valuesPlaceholder')}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm md:col-span-2"
                  />
                ) : operatorNeedsRange(filter.operator) ? (
                  <>
                    <input
                      value={filter.value}
                      onChange={(event) => updateDraftFilter(filter.id, { value: event.target.value })}
                      placeholder={t('page.browser.fromPlaceholder')}
                      className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                    />
                    <input
                      value={filter.valueTo}
                      onChange={(event) => updateDraftFilter(filter.id, { valueTo: event.target.value })}
                      placeholder={t('page.browser.toPlaceholder')}
                      className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                    />
                  </>
                ) : operatorNeedsValue(filter.operator) ? (
                  <input
                    value={filter.value}
                    onChange={(event) => updateDraftFilter(filter.id, { value: event.target.value })}
                    placeholder={t('page.browser.valuePlaceholder')}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm md:col-span-2"
                  />
                ) : (
                  <div className="md:col-span-2 flex items-center text-sm text-muted-foreground">
                    {t('page.browser.noValueNeeded')}
                  </div>
                )}

                <button
                  type="button"
                  disabled={draftFilters.length === 1}
                  onClick={() => setDraftFilters((current) => current.filter((item) => item.id !== filter.id))}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t('page.browser.removeFilter')}
                  title={index === 0 ? t('page.browser.keepOneFilter') : t('page.browser.removeFilter')}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {filterError && <p className="mt-3 text-sm text-destructive">{filterError}</p>}
        </div>
      )}

      {selectedTable && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-foreground">{t('page.browser.dataTitle')}</h3>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {selectedTable}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {rowsData?.meta.sort_by
                  ? t('page.browser.dataSubtitle', { sortBy: rowsData.meta.sort_by, sortDir: rowsData.meta.sort_dir })
                  : t('page.browser.dataSubtitleEmpty')}
              </p>
            </div>
          </div>

          {rowsLoading && <p className="text-sm text-muted-foreground">{t('page.browser.loadingRows')}</p>}
          {rowsError && <p className="text-sm text-destructive">{t('page.browser.rowsLoadFailed')}</p>}

          {!rowsLoading && !rowsError && dataColumns.length > 0 && (
            <>
              <DataTable
                columns={dataColumns}
                data={rowsData?.data ?? []}
                keyField={schemaColumns.find((column) => column.primary_key)?.name || schemaColumns[0]?.name}
                emptyText={t('page.browser.noRows')}
              />
              {rowsData?.meta && hasAnyRows && (
                <Pagination
                  page={rowsData.meta.page}
                  pageSize={rowsData.meta.page_size}
                  total={rowsData.meta.total}
                  onPageChange={setPage}
                  onPageSizeChange={(nextPageSize) => {
                    setPageSize(nextPageSize)
                    setPage(1)
                  }}
                  pageSizeOptions={[25, 50, 100]}
                />
              )}
            </>
          )}
        </div>
      )}

      <Modal
        open={tableInfoOpen}
        onClose={() => setTableInfoOpen(false)}
        title={t('page.browser.tableInfoModalTitle')}
        footer={modalFooter}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={modalInfoCardClass}>
            <div className="text-xs text-muted-foreground">{t('page.browser.info.tableName')}</div>
            <div className="mt-1 text-base font-semibold text-foreground">{selectedTable || '--'}</div>
          </div>
          <div className={modalInfoCardClass}>
            <div className="text-xs text-muted-foreground">{t('page.browser.columnCount')}</div>
            <div className="mt-1 text-base font-semibold text-foreground">{selectedTableInfo?.column_count ?? schemaColumns.length}</div>
          </div>
          <div className={modalInfoCardClass}>
            <div className="text-xs text-muted-foreground">{t('page.browser.totalRows')}</div>
            <div className="mt-1 text-base font-semibold text-foreground">{resolvedTotalRows}</div>
          </div>
          <div className={modalInfoCardClass}>
            <div className="text-xs text-muted-foreground">{t('page.browser.appliedFilters')}</div>
            <div className="mt-1 text-base font-semibold text-foreground">{appliedFilters.length}</div>
          </div>
          <div className={`${modalInfoCardClass} sm:col-span-2`}>
            <div className="text-xs text-muted-foreground">{t('page.browser.info.primaryKeys')}</div>
            <div className="mt-1 text-sm font-medium text-foreground break-all">{resolvedPrimaryKeys}</div>
          </div>
          <div className={`${modalInfoCardClass} sm:col-span-2`}>
            <div className="text-xs text-muted-foreground">{t('page.browser.info.currentSort')}</div>
            <div className="mt-1 text-sm font-medium text-foreground">{resolvedSort}</div>
          </div>
        </div>
      </Modal>

      <Modal
        open={schemaOpen}
        onClose={() => setSchemaOpen(false)}
        title={t('page.browser.schemaModalTitle')}
        footer={modalFooter}
        size="lg"
      >
        {schemaLoading && <p className="text-sm text-muted-foreground">{t('page.browser.loadingSchema')}</p>}
        {schemaError && <p className="text-sm text-destructive">{t('page.browser.schemaLoadFailed')}</p>}
        {!schemaLoading && !schemaError && schemaColumns.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('page.browser.schemaEmpty')}</p>
        )}
        {!schemaLoading && !schemaError && schemaColumns.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('page.browser.schemaColumns.name')}</th>
                  <th className="px-4 py-3 font-medium">{t('page.browser.schemaColumns.type')}</th>
                  <th className="px-4 py-3 font-medium">{t('page.browser.schemaColumns.nullable')}</th>
                  <th className="px-4 py-3 font-medium">{t('page.browser.schemaColumns.default')}</th>
                  <th className="px-4 py-3 font-medium">{t('page.browser.schemaColumns.primaryKey')}</th>
                  <th className="px-4 py-3 font-medium">{t('page.browser.schemaColumns.indexed')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {schemaColumns.map((column) => (
                  <tr key={column.name}>
                    <td className="px-4 py-3 font-medium text-foreground">{column.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{column.data_type}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {column.nullable ? t('page.browser.schemaColumns.yes') : t('page.browser.schemaColumns.no')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{column.default || '--'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {column.primary_key ? t('page.browser.schemaColumns.yes') : t('page.browser.schemaColumns.no')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {column.indexed ? t('page.browser.schemaColumns.yes') : t('page.browser.schemaColumns.no')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  )
}