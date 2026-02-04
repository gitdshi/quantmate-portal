import { useQuery } from '@tanstack/react-query'
import { DollarSign, Search, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { marketDataAPI } from '../lib/api'

interface SymbolSearchProps {
  onSelect: (symbol: string) => void
}

export default function SymbolSearch({ onSelect }: SymbolSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMarket, setSelectedMarket] = useState<string>('')

  const { data: symbolsData, isLoading } = useQuery({
    queryKey: ['symbols', selectedMarket],
    queryFn: () => marketDataAPI.symbols(selectedMarket || undefined),
  })

  const symbols = symbolsData?.data || []
  const filteredSymbols = symbols.filter((symbol: { symbol: string; name?: string }) =>
    symbol.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (symbol.name && symbol.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 20)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search symbols (e.g., AAPL, MSFT)..."
            className="w-full pl-10 pr-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={selectedMarket}
          onChange={(e) => setSelectedMarket(e.target.value)}
          className="px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Markets</option>
          <option value="US">US Markets</option>
          <option value="CN">China Markets</option>
          <option value="HK">Hong Kong</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading symbols...</div>
      ) : searchTerm ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
          {filteredSymbols.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No symbols found matching "{searchTerm}"
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredSymbols.map((symbol: { symbol: string; name?: string; market?: string }) => (
                <button
                  key={symbol.symbol}
                  onClick={() => {
                    onSelect(symbol.symbol)
                    setSearchTerm('')
                  }}
                  className="w-full p-4 hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">{symbol.symbol}</div>
                        {symbol.name && (
                          <div className="text-sm text-muted-foreground">{symbol.name}</div>
                        )}
                      </div>
                    </div>
                    {symbol.market && (
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {symbol.market}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <DollarSign className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Search for a symbol to view market data</p>
          <p className="text-sm text-muted-foreground mt-1">Try: AAPL, MSFT, TSLA, etc.</p>
        </div>
      )}
    </div>
  )
}
