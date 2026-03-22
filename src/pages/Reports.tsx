import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  FileText,
  List,
  Plus,
  PieChart as PieChartIcon,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/Toast'
import { reportsAPI } from '../lib/api'
import type { Report } from '../types'

const TABS = [
  { key: 'perf', label: '绩效报告', icon: <TrendingUp size={16} /> },
  { key: 'review', label: '交易复盘', icon: <FileText size={16} /> },
  { key: 'attribution', label: '归因分析', icon: <PieChartIcon size={16} /> },
  { key: 'list', label: '报告列表', icon: <List size={16} /> },
]

export default function Reports() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('perf')
  const [newReportModal, setNewReportModal] = useState(false)

  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ['reports'],
    queryFn: () => reportsAPI.list().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: activeTab === 'list',
  })

  const generateMutation = useMutation({
    mutationFn: (data: { report_type: string; title: string }) => reportsAPI.generate({ report_type: data.report_type, title: data.title }),
    onSuccess: () => {
      showToast('报告生成中...', 'success')
      setNewReportModal(false)
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: () => showToast('生成失败', 'error'),
  })

  const reportColumns: Column<Report>[] = [
    { key: 'title', label: '报告名称' },
    { key: 'report_type', label: '类型', render: (r) => <Badge variant="primary">{r.report_type}</Badge> },
    { key: 'created_at', label: '生成时间', render: (r) => new Date(r.created_at).toLocaleString() },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">报告复盘</h1>
          <p className="text-sm text-muted-foreground">绩效报告 · 交易复盘 · 策略归因分析</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted"><Download size={14} className="inline mr-1" />导出 PDF</button>
          <button onClick={() => setNewReportModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"><Plus size={16} />生成报告</button>
        </div>
      </div>

      <TabPanel tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Performance ──────────────────────────────── */}
        {activeTab === 'perf' && (
          <p className="text-center text-muted-foreground py-8">暂无绩效报告数据，请先生成报告</p>
        )}

        {/* ── Review ───────────────────────────────────── */}
        {activeTab === 'review' && (
          <p className="text-center text-muted-foreground py-8">暂无交易复盘数据</p>
        )}

        {/* ── Attribution ──────────────────────────────── */}
        {activeTab === 'attribution' && (
          <p className="text-center text-muted-foreground py-8">暂无归因分析数据</p>
        )}

        {/* ── List ─────────────────────────────────────── */}
        {activeTab === 'list' && (
          <DataTable columns={reportColumns} data={reports} emptyText="暂无报告" />
        )}
      </TabPanel>

      {/* New Report Modal */}
      <Modal open={newReportModal} onClose={() => setNewReportModal(false)} title="生成报告" footer={
        <>
          <button onClick={() => setNewReportModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">取消</button>
          <button onClick={() => generateMutation.mutate({ report_type: 'monthly', title: '月度绩效报告' })} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">生成报告</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">报告类型</label>
            <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option>月度绩效</option>
              <option>周报</option>
              <option>策略对比</option>
              <option>归因分析</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">开始日期</label>
              <input type="date" className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">结束日期</label>
              <input type="date" className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">包含策略</label>
            <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option>全部策略</option>
              <option>DualMA_Cross</option>
              <option>RSI_Reversal</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
