import { X } from 'lucide-react'
import { useState } from 'react'
import MarketDataView from '../components/MarketDataView'
import MarketOverview from '../components/MarketOverview'
import SymbolSearch from '../components/SymbolSearch'
import TechnicalIndicators from '../components/TechnicalIndicators'

export default function MarketData() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')
  const [startDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [endDate] = useState(() => new Date().toISOString().split('T')[0])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Market Data</h1>
        <p className="text-muted-foreground mt-2">
          View real-time market data and technical indicators
        </p>
      </div>

      <MarketOverview />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Symbol Search</h2>
          <SymbolSearch onSelect={setSelectedSymbol} />
        </div>

        <div className="lg:col-span-2">
          {selectedSymbol ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{selectedSymbol}</h2>
                <button
                  onClick={() => setSelectedSymbol('')}
                  className="p-2 hover:bg-muted rounded-md transition-colors"
                  title="Clear selection"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <MarketDataView symbol={selectedSymbol} />
              <TechnicalIndicators
                symbol={selectedSymbol}
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <p className="text-muted-foreground">
                Select a symbol from the search to view market data
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
