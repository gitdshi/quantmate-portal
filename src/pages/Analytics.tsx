import { useState } from 'react'
import AnalyticsDashboard from '../components/AnalyticsDashboard'
import PerformanceComparison from '../components/PerformanceComparison'
import RiskMetrics from '../components/RiskMetrics'

type Tab = 'dashboard' | 'risk' | 'comparison'

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Portfolio Analytics' },
    { id: 'risk', label: 'Risk Metrics' },
    { id: 'comparison', label: 'Performance Comparison' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
        <p className="text-gray-600">
          Advanced analytics, risk metrics, and performance comparison
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'dashboard' && <AnalyticsDashboard />}
        {activeTab === 'risk' && <RiskMetrics />}
        {activeTab === 'comparison' && <PerformanceComparison />}
      </div>
    </div>
  )
}
