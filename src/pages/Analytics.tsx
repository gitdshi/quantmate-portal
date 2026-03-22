import {
  BarChart3,
  Calculator,
  Eye,
  LayoutGrid,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import TabPanel from '../components/ui/TabPanel'

const TABS = [
  { key: 'tech', label: '技术分析', icon: <BarChart3 size={16} /> },
  { key: 'fundamental', label: '基本面', icon: <Calculator size={16} /> },
  { key: 'quant', label: '量化指标', icon: <Eye size={16} /> },
  { key: 'custom', label: '自定义看板', icon: <LayoutGrid size={16} /> },
]

export default function Analytics() {
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState('tech')
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">分析中心</h1>
          <p className="text-sm text-muted-foreground">技术分析 · 基本面分析 · 量化指标看板</p>
        </div>
        <button className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted">导出报表</button>
      </div>

      <TabPanel tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Tech ──────────────────────────────────────── */}
        {activeTab === 'tech' && (
          <p className="text-center text-muted-foreground py-8">暂无技术分析数据，请在行情数据页选择股票查看</p>
        )}

        {/* ── Fundamental ──────────────────────────────── */}
        {activeTab === 'fundamental' && (
          <p className="text-center text-muted-foreground py-8">暂无基本面数据</p>
        )}

        {/* ── Quant ────────────────────────────────────── */}
        {activeTab === 'quant' && (
          <p className="text-center text-muted-foreground py-8">暂无量化指标数据</p>
        )}

        {/* ── Custom Dashboard ─────────────────────────── */}
        {activeTab === 'custom' && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center text-muted-foreground">
              <LayoutGrid size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">自定义看板功能开发中</p>
              <p className="text-xs mt-1">支持: 图表 · 表格 · KPI · 自定义指标</p>
            </div>
          </div>
        )}
      </TabPanel>
    </div>
  )
}
