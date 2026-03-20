import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TrendingDown, TrendingUp, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePagination } from '../hooks/usePagination'
import { api } from '../lib/api'
import Pagination from './Pagination'

interface Position {
  id: number
  symbol: string
  strategy_name: string
  direction: 'long' | 'short'
  quantity: number
  entry_price: number
  current_price: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
  entry_date: string
  market_value: number
}

interface ClosedTrade {
  id: number
  symbol: string
  strategy_name: string
  direction: 'long' | 'short'
  quantity: number
  entry_price: number
  exit_price: number
  realized_pnl: number
  realized_pnl_pct: number
  entry_date: string
  exit_date: string
  holding_period: number
}

export default function PortfolioManagement() {
  const { t } = useTranslation(['portfolio', 'common'])
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const queryClient = useQueryClient()

  // Fetch open positions
  const { data: positionsData } = useQuery<{ portfolio_id: number; cash: number; positions: Position[] }>({
    queryKey: ['portfolio', 'positions'],
    queryFn: async () => {
      const { data } = await api.get('/portfolio/positions')
      return data
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  const positions = positionsData?.positions

  // Fetch transaction history (closed trades)
  const { data: closedTrades } = useQuery<ClosedTrade[]>({
    queryKey: ['portfolio', 'closed-trades'],
    queryFn: async () => {
      if (!positionsData?.portfolio_id) return []
      const { data } = await api.get(`/portfolio/${positionsData.portfolio_id}/transactions`)
      return data?.data || []
    },
    enabled: !!positionsData?.portfolio_id,
  })

  // Close position mutation
  const closePositionMutation = useMutation({
    mutationFn: async (position: Position) => {
      const { data } = await api.post('/portfolio/close', {
        symbol: position.symbol,
        quantity: position.quantity,
        price: position.current_price || position.entry_price,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      setShowCloseModal(false)
      setSelectedPosition(null)
    },
  })

  const handleClosePosition = (position: Position) => {
    setSelectedPosition(position)
    setShowCloseModal(true)
  }

  const confirmClose = () => {
    if (selectedPosition) {
      closePositionMutation.mutate(selectedPosition)
    }
  }

  const totalUnrealizedPnL = positions?.reduce((sum, pos) => sum + pos.unrealized_pnl, 0) || 0
  const totalMarketValue = positions?.reduce((sum, pos) => sum + pos.market_value, 0) || 0
  const totalRealizedPnL = closedTrades?.reduce((sum, trade) => sum + trade.realized_pnl, 0) || 0

  const closedTradesPagination = usePagination<ClosedTrade>(closedTrades || [], { initialPageSize: 10 })

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">{t('positions.totalMarketValue')}</div>
          <div className="text-2xl font-bold text-gray-900">
            ${totalMarketValue.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {t('positions.openCount', { count: positions?.length || 0 })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">{t('positions.unrealizedPnl')}</div>
          <div className={`text-2xl font-bold ${totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalUnrealizedPnL.toLocaleString()}
          </div>
          <div className={`text-sm mt-1 flex items-center gap-1 ${totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalUnrealizedPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {t('positions.openPositions')}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">{t('positions.realizedPnl')}</div>
          <div className={`text-2xl font-bold ${totalRealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalRealizedPnL.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {t('positions.closedCount', { count: closedTrades?.length || 0 })}
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('positions.openPositions')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common:symbol')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('positions.strategy')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common:direction')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common:quantity')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('positions.entryPrice')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('positions.currentPrice')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('positions.unrealizedPnl')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('positions.entryDate')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common:actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {positions?.map((position) => (
                <tr key={position.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{position.symbol}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {position.strategy_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      position.direction === 'long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {position.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {position.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    ${position.entry_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    ${position.current_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className={`text-sm font-medium ${position.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${position.unrealized_pnl.toFixed(2)}
                    </div>
                    <div className={`text-xs ${position.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({position.unrealized_pnl_pct.toFixed(2)}%)
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {position.entry_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleClosePosition(position)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      {t('common:close')}
                    </button>
                  </td>
                </tr>
              ))}
              {(!positions || positions.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    {t('positions.noOpenPositions')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Closed Trades */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('positions.closedTrades')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common:symbol')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('positions.strategy')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common:direction')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common:quantity')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('positions.entryPrice')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('positions.exitPrice')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('positions.realizedPnl')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('positions.holdingPeriod')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('positions.exitDate')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {closedTradesPagination.paginatedItems.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{trade.symbol}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {trade.strategy_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trade.direction === 'long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {trade.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    ${trade.entry_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    ${trade.exit_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className={`text-sm font-medium ${trade.realized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${trade.realized_pnl.toFixed(2)}
                    </div>
                    <div className={`text-xs ${trade.realized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({trade.realized_pnl_pct.toFixed(2)}%)
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                    {trade.holding_period} {t('positions.days')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {trade.exit_date}
                  </td>
                </tr>
              ))}
              {(!closedTrades || closedTrades.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    {t('positions.noClosedTrades')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6">
          <Pagination
            page={closedTradesPagination.page}
            pageSize={closedTradesPagination.pageSize}
            total={closedTradesPagination.total}
            onPageChange={closedTradesPagination.onPageChange}
            onPageSizeChange={closedTradesPagination.onPageSizeChange}
          />
        </div>
      </div>

      {/* Close Position Modal */}
      {showCloseModal && selectedPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{t('positions.closePosition')}</h3>
              <button
                onClick={() => setShowCloseModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('common:symbol')}:</span>
                  <span className="font-medium text-gray-900">{selectedPosition.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('common:direction')}:</span>
                  <span className={`font-medium ${selectedPosition.direction === 'long' ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedPosition.direction.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('common:quantity')}:</span>
                  <span className="font-medium text-gray-900">{selectedPosition.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('positions.currentPrice')}:</span>
                  <span className="font-medium text-gray-900">${selectedPosition.current_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600">{t('positions.unrealizedPnl')}:</span>
                  <span className={`font-medium ${selectedPosition.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${selectedPosition.unrealized_pnl.toFixed(2)} ({selectedPosition.unrealized_pnl_pct.toFixed(2)}%)
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600">
                {t('positions.closeConfirm')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common:cancel')}
              </button>
              <button
                onClick={confirmClose}
                disabled={closePositionMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
              >
                {closePositionMutation.isPending ? t('positions.closing') : t('positions.closePosition')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
