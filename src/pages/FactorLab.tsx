import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Library,
  LineChart as LineChartIcon,
  GitCompare,
  Plus,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import Modal from '../components/ui/Modal'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/Toast'
import { factorAPI } from '../lib/api'

interface Factor {
  id: string
  name: string
  category: string
  ic: number
  icir: number
  turnover: number
  coverage: number
  status: string
  formula?: string
}

const TABS = [
  { key: 'library', label: '因子库', icon: <Library size={16} /> },
  { key: 'icir', label: 'IC/IR 分析', icon: <LineChartIcon size={16} /> },
  { key: 'combine', label: '因子合成', icon: <GitCompare size={16} /> },
  { key: 'backtest', label: '因子回测', icon: <TrendingUp size={16} /> },
]

export default function FactorLab() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('library')
  const [newFactorModal, setNewFactorModal] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedFactor, setSelectedFactor] = useState<string | null>(null)

  const { data: factors = [] } = useQuery<Factor[]>({
    queryKey: ['factors'],
    queryFn: () => factorAPI.list().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; category: string; formula: string }) => factorAPI.create(data),
    onSuccess: () => {
      showToast('因子已创建', 'success')
      setNewFactorModal(false)
      queryClient.invalidateQueries({ queryKey: ['factors'] })
    },
    onError: () => showToast('创建失败', 'error'),
  })

  const filtered = factors.filter(
    (f) => !search || f.name.includes(search) || f.category.includes(search),
  )

  const factorCols: Column<Factor>[] = [
    { key: 'name', label: '因子名称', render: (f) => <span className="font-medium cursor-pointer text-primary hover:underline" onClick={() => { setSelectedFactor(f.name); setActiveTab('icir') }}>{f.name}</span> },
    { key: 'category', label: '分类', render: (f) => <Badge variant="primary">{f.category}</Badge> },
    { key: 'ic', label: 'IC', render: (f) => <span className={f.ic >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{f.ic.toFixed(3)}</span> },
    { key: 'icir', label: 'ICIR', render: (f) => <span className={f.icir >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{f.icir.toFixed(2)}</span> },
    { key: 'turnover', label: '换手率', render: (f) => `${(f.turnover * 100).toFixed(0)}%` },
    { key: 'coverage', label: '覆盖率', render: (f) => `${f.coverage}%` },
    { key: 'status', label: '状态', render: (f) => <Badge variant={f.status === 'active' ? 'success' : 'warning'}>{f.status === 'active' ? '生效中' : '测试中'}</Badge> },
  ]





  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">因子研究</h1>
          <p className="text-sm text-muted-foreground">因子库 · IC/IR 分析 · 因子合成 · 因子回测</p>
        </div>
        <button onClick={() => setNewFactorModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"><Plus size={16} />新建因子</button>
      </div>

      <TabPanel tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Library ──────────────────────────────────── */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FilterBar
                filters={[{ key: 'search', label: '搜索因子', type: 'search' as const }]}
                values={{ search }}
                onChange={(v) => setSearch((v.search as string) || '')}
              />
              <div className="text-sm text-muted-foreground">共 {filtered.length} 个因子</div>
            </div>
            <DataTable columns={factorCols} data={filtered} emptyText="暂无因子" />
          </div>
        )}

        {/* ── IC/IR Analysis ──────────────────────────── */}
        {activeTab === 'icir' && (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground py-8">选择因子后查看 IC/IR 分析结果，暂无评估数据</p>
          </div>
        )}

        {/* ── Combine ─────────────────────────────────── */}
        {activeTab === 'combine' && (
          <p className="text-center text-muted-foreground py-8">暂无因子合成数据</p>
        )}

        {/* ── Backtest ────────────────────────────────── */}
        {activeTab === 'backtest' && (
          <p className="text-center text-muted-foreground py-8">暂无因子回测数据</p>
        )}
      </TabPanel>

      {/* New Factor Modal */}
      <Modal open={newFactorModal} onClose={() => setNewFactorModal(false)} title="新建因子" footer={
        <>
          <button onClick={() => setNewFactorModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">取消</button>
          <button onClick={() => createMutation.mutate({ name: '新因子', category: '自定义', formula: '' })} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">创建因子</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <div><label className="block text-sm font-medium mb-1">因子名称</label><input className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" placeholder="例如: Alpha01" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">分类</label>
              <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option>技术</option><option>基本面</option><option>风格</option><option>自定义</option>
              </select></div>
            <div><label className="block text-sm font-medium mb-1">频率</label>
              <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option>日频</option><option>周频</option><option>月频</option>
              </select></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">因子公式</label><textarea className="w-full h-24 px-3 py-2 text-sm rounded-md border border-border bg-background font-mono resize-none" placeholder="rank(ts_delta(close, 20)) * -1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">回看窗口</label><input type="number" defaultValue={20} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" /></div>
            <div><label className="block text-sm font-medium mb-1">标准化</label>
              <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option>Z-Score</option><option>Rank</option><option>MinMax</option><option>无</option>
              </select></div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
