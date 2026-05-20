import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Plus, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import { showToast } from '../components/ui/toast-service'
import { paperAccountAPI, paperTradingAPI } from '../lib/api'
import type { PaperAccount, PaperSignal } from '../types'

const CURRENCY_MAP: Record<string, string> = { CNY: '¥', HKD: 'HK$', USD: '$' }

function formatMoney(value: number, currency: string = 'CNY') {
  const prefix = CURRENCY_MAP[currency] || '¥'
  return `${prefix}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function unwrapArray<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) {
    return value as T[]
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (Array.isArray(record[key])) {
      return record[key] as T[]
    }
    if (Array.isArray(record.data)) {
      return record.data as T[]
    }
  }
  return []
}

export default function PaperTrading() {
  const { t } = useTranslation('trading')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [newAccountModal, setNewAccountModal] = useState(false)
  const [accountForm, setAccountForm] = useState({ name: '', capital: '1000000', market: 'CN' })

  const { data: accounts = [] } = useQuery<PaperAccount[]>({
    queryKey: ['paper-accounts'],
    queryFn: () => paperAccountAPI.list().then((response) => unwrapArray<PaperAccount>(response.data, 'accounts')),
    refetchInterval: 15_000,
  })

  const { data: signals = [] } = useQuery<PaperSignal[]>({
    queryKey: ['paper-signals-overview'],
    queryFn: () => paperTradingAPI.listSignals().then((response) => unwrapArray<PaperSignal>(response.data, 'signals')),
    refetchInterval: 5_000,
  })

  const createAccountMutation = useMutation({
    mutationFn: () =>
      paperAccountAPI.create({
        name: accountForm.name || `Paper ${accountForm.market}`,
        initial_capital: Number(accountForm.capital),
        market: accountForm.market,
      }),
    onSuccess: () => {
      showToast(t('paper.accountCreated', 'Account created'), 'success')
      setNewAccountModal(false)
      setAccountForm({ name: '', capital: '1000000', market: 'CN' })
      queryClient.invalidateQueries({ queryKey: ['paper-accounts'] })
    },
    onError: () => showToast(t('paper.accountCreateFailed', 'Create failed'), 'error'),
  })

  const closeAccountMutation = useMutation({
    mutationFn: (accountId: number) => paperAccountAPI.close(accountId),
    onSuccess: () => {
      showToast(t('paper.accountClosed', 'Account closed'), 'success')
      queryClient.invalidateQueries({ queryKey: ['paper-accounts'] })
    },
  })

  const activeAccounts = accounts.filter((account) => account.status === 'active')
  const totalEquity = activeAccounts.reduce((sum, account) => sum + account.total_equity, 0)
  const totalPnl = activeAccounts.reduce((sum, account) => sum + account.total_pnl, 0)
  const pendingSignals = signals.filter((signal) => signal.status === 'pending').length

  const accountColumns: Column<PaperAccount>[] = [
    { key: 'name', label: t('paper.columns.name', 'Name') },
    {
      key: 'market',
      label: t('paper.columns.market', 'Market'),
      render: (account) => <Badge variant="primary">{account.market}</Badge>,
    },
    {
      key: 'balance',
      label: t('paper.columns.balance', 'Balance'),
      render: (account) => formatMoney(account.balance, account.currency),
    },
    {
      key: 'total_equity',
      label: t('paper.columns.equity', 'Equity'),
      render: (account) => formatMoney(account.total_equity, account.currency),
    },
    {
      key: 'return_pct',
      label: t('paper.columns.pnlPct', 'Return'),
      render: (account) => (
        <span className={account.return_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
          {account.return_pct >= 0 ? '+' : ''}
          {account.return_pct.toFixed(2)}%
        </span>
      ),
    },
    {
      key: 'status',
      label: t('paper.columns.status', 'Status'),
      render: (account) => <Badge variant={account.status === 'active' ? 'success' : 'muted'}>{account.status}</Badge>,
    },
    {
      key: 'id',
      label: t('paper.columns.actions', 'Actions'),
      render: (account) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid={`paper-account-open-${account.id}`}
            onClick={(event) => {
              event.stopPropagation()
              navigate(`/paper-trading/${account.id}`)
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80"
          >
            {t('paper.overview.openAccount', 'Open')}
            <ArrowRight size={12} />
          </button>
          {account.status === 'active' && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                closeAccountMutation.mutate(account.id)
              }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              {t('paper.account.close', 'Close')}
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6" data-testid="paper-trading-overview">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('paper.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('paper.overview.subtitle', 'Start from a total overview, then drill into a paper account for strategies, positions, and orders.')}</p>
        </div>
        <button
          type="button"
          onClick={() => setNewAccountModal(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm text-white hover:opacity-90"
        >
          <Plus size={16} />
          {t('paper.newAccount', 'New Account')}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">{t('paper.overview.title', 'Paper Trading Overview')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('paper.overview.description', 'Review total simulated capital and choose an account to inspect deployed strategies, positions, and execution details.')}</p>
          </div>
          {activeAccounts[0] && (
            <button
              type="button"
              onClick={() => navigate(`/paper-trading/${activeAccounts[0].id}`)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              {t('paper.overview.openFirst', 'Open first active account')}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t('paper.stats.accounts', 'Active Accounts')} value={activeAccounts.length} />
        <StatCard label={t('paper.stats.totalEquity', 'Total Equity')} value={formatMoney(totalEquity)} />
        <StatCard label={t('paper.stats.totalPnl', 'Total P&L')} value={formatMoney(totalPnl)} changeType={totalPnl >= 0 ? 'positive' : 'negative'} />
        <StatCard label={t('paper.stats.pendingSignals', 'Pending Signals')} value={pendingSignals} />
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('paper.overview.accountsTitle', 'Paper Accounts')}</h2>
            <p className="text-sm text-muted-foreground">{t('paper.overview.accountsSubtitle', 'Choose an account to see deployed strategies, holdings, orders, and signals.')}</p>
          </div>
        </div>
        <DataTable
          columns={accountColumns}
          data={accounts}
          emptyText={t('paper.empty.accounts', 'No paper accounts. Create one to start.')}
          onRowClick={(account) => navigate(`/paper-trading/${account.id}`)}
        />
      </section>

      <Modal
        open={newAccountModal}
        onClose={() => setNewAccountModal(false)}
        title={t('paper.modal.newAccount', 'Create Paper Account')}
        footer={(
          <>
            <button onClick={() => setNewAccountModal(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">{t('paper.modal.cancel')}</button>
            <button onClick={() => createAccountMutation.mutate()} className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:opacity-90">{t('paper.modal.submit')}</button>
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('paper.modal.accountName', 'Account Name')}</label>
            <input
              value={accountForm.name}
              onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })}
              placeholder={t('paper.modal.accountNamePlaceholder', 'e.g. A-share Test')}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('paper.modal.market', 'Market')}</label>
            <select
              value={accountForm.market}
              onChange={(event) => setAccountForm({ ...accountForm, market: event.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="CN">A股 (CN)</option>
              <option value="HK">港股 (HK)</option>
              <option value="US">美股 (US)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('paper.modal.capital')}</label>
            <input
              type="number"
              value={accountForm.capital}
              onChange={(event) => setAccountForm({ ...accountForm, capital: event.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}