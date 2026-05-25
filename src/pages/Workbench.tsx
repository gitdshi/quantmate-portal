import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, ChevronRight, FlaskConical, Play, Save, Sparkles, TestTube2 } from 'lucide-react'
import { startTransition, useEffect, useMemo, useState } from 'react'

import { aiAPI, backtestAPI, factorAPI, paperAccountAPI, paperTradingAPI, queueAPI, strategiesAPI, workbenchAPI } from '../lib/api'

type Stage = 'factor' | 'strategy' | 'backtest' | 'paper_trade'
type SessionStatus = 'draft' | 'running_backtest' | 'paper_active' | 'archived'

type WorkbenchState = {
  stage: Stage
  selected_factors: Array<{
    id?: number
    name: string
    expression?: string
    category?: string
    ic_mean?: number | null
    ic_ir?: number | null
  }>
  strategy_draft: {
    strategy_id?: number
    name: string
    class_name: string
    description?: string
    code?: string
  } | null
  backtest: {
    job_id: string | null
    status: string | null
    summary: Record<string, unknown> | null
    ai_report_id: number | null
    symbol?: string | null
    start_date?: string | null
    end_date?: string | null
    benchmark?: string | null
  }
  paper_trade: {
    account_id: number | null
    mode: string | null
    deployment_id: number | null
    runtime_summary: Record<string, unknown> | null
  }
}

type WorkbenchSession = {
  id: number
  name: string
  user_id: number
  current_stage: Stage
  status: SessionStatus
  state_json: WorkbenchState
  created_at: string
  updated_at: string
}

type FactorItem = {
  id: number
  name: string
  category: string
  expression?: string
  ic_mean?: number
  ic_ir?: number
}

type BacktestJob = {
  job_id: string
  status: string
  symbol?: string
  strategy_name?: string
  result?: {
    statistics?: {
      total_return?: number
      annual_return?: number
      sharpe_ratio?: number
      max_drawdown?: number
      max_drawdown_percent?: number
      win_rate?: number
    }
  }
}

type PaperAccount = {
  id: number
  name: string
  market: string
  status: string
}

type AIBacktestReport = {
  job_id: string
  status: string
  report_json: {
    summary?: {
      quality?: string
      risk_level?: string
      overfit_risk?: string
    }
    sections?: Record<string, { title?: string; content?: string; actions?: Array<{ action: string; label: string }> }>
  }
}

type CopilotMessage = {
  role: 'user' | 'assistant'
  content: string
}

const EMPTY_STATE: WorkbenchState = {
  stage: 'factor',
  selected_factors: [],
  strategy_draft: null,
  backtest: {
    job_id: null,
    status: null,
    summary: null,
    ai_report_id: null,
    symbol: '600519.SH',
    start_date: '2023-01-01',
    end_date: '2024-12-31',
    benchmark: '000300.SH',
  },
  paper_trade: { account_id: null, mode: null, deployment_id: null, runtime_summary: null },
}

const STAGES: Array<{ key: Stage; label: string; icon: typeof FlaskConical }> = [
  { key: 'factor', label: 'Factor Research', icon: FlaskConical },
  { key: 'strategy', label: 'Strategy Build', icon: Sparkles },
  { key: 'backtest', label: 'Backtest Validation', icon: TestTube2 },
  { key: 'paper_trade', label: 'Paper Trading', icon: Play },
]

export default function Workbench() {
  const queryClient = useQueryClient()
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [draftName, setDraftName] = useState('New Workflow')
  const [draftState, setDraftState] = useState<WorkbenchState>(EMPTY_STATE)
  const [factorSearch, setFactorSearch] = useState('')
  const [strategyName, setStrategyName] = useState('')
  const [strategyClassName, setStrategyClassName] = useState('')
  const [strategyDescription, setStrategyDescription] = useState('')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [copilotConversationId, setCopilotConversationId] = useState<number | null>(null)
  const [copilotInput, setCopilotInput] = useState('')
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([
    {
      role: 'assistant',
      content:
        'I can review the current workflow context, explain the next stage, and interpret recent backtest outcomes inside Workbench.',
    },
  ])

  function buildStrategyName(factorsToUse: WorkbenchState['selected_factors']) {
    const prefix = factorsToUse
      .slice(0, 2)
      .map((factor) => factor.name.replace(/[^a-zA-Z0-9]+/g, '_'))
      .join('_')
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return `${prefix || 'Factor'}_Strategy_${date}`
  }

  function buildClassName(name: string) {
    const parts = name
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    return `${parts.join('') || 'Workbench'}Strategy`
  }

  function labelForStage(stage: Stage) {
    return STAGES.find((item) => item.key === stage)?.label ?? stage
  }

  function buildCopilotPrompt(content: string, workflowName: string, state: WorkbenchState) {
    const summary = {
      workflow: workflowName,
      stage: state.stage,
      selected_factors: state.selected_factors.map((factor) => ({
        name: factor.name,
        ic_mean: factor.ic_mean,
        ic_ir: factor.ic_ir,
      })),
      strategy_draft: state.strategy_draft,
      backtest: state.backtest,
      paper_trade: state.paper_trade,
    }
    return `You are the QuantMate Workbench Copilot. Use the workflow context below to answer the user's request.

Context:
${JSON.stringify(summary, null, 2)}

User request:
${content}`
  }

  const { data: factors = [] } = useQuery<FactorItem[]>({
    queryKey: ['workbench', 'factors'],
    queryFn: () =>
      factorAPI.list().then((response) => {
        const payload = response.data
        if (Array.isArray(payload)) {
          return payload as FactorItem[]
        }
        if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
          return (payload as { data: FactorItem[] }).data
        }
        return []
      }),
  })

  const { data: paperAccounts = [] } = useQuery<PaperAccount[]>({
    queryKey: ['workbench', 'paper-accounts'],
    queryFn: () =>
      paperAccountAPI.list({ status: 'active' }).then((response) => {
        const payload = response.data
        if (Array.isArray(payload)) {
          return payload as PaperAccount[]
        }
        if (payload && typeof payload === 'object') {
          const record = payload as { accounts?: PaperAccount[]; data?: PaperAccount[] }
          return record.accounts ?? record.data ?? []
        }
        return []
      }),
  })

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<WorkbenchSession[]>({
    queryKey: ['workbench', 'sessions'],
    queryFn: () => workbenchAPI.listSessions({ limit: 10 }).then((response) => response.data ?? []),
  })

  const resolvedActiveSessionId = activeSessionId ?? sessions[0]?.id ?? null

  const { data: activeSession } = useQuery<WorkbenchSession | null>({
    queryKey: ['workbench', 'session', resolvedActiveSessionId],
    queryFn: () => {
      if (!resolvedActiveSessionId) return Promise.resolve(null)
      return workbenchAPI.getSession(resolvedActiveSessionId).then((response) => response.data)
    },
    enabled: !!resolvedActiveSessionId,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      workbenchAPI.createSession({
        name: 'New Workflow',
        current_stage: 'factor',
        status: 'draft',
        state_json: EMPTY_STATE,
      }),
    onSuccess: (response) => {
      const created = response.data as WorkbenchSession
      queryClient.invalidateQueries({ queryKey: ['workbench', 'sessions'] })
      setActiveSessionId(created.id)
    },
  })

  useEffect(() => {
    if (!sessionsLoading && !activeSessionId && sessions.length === 0 && !createMutation.isPending) {
      createMutation.mutate()
    }
  }, [activeSessionId, createMutation, sessions.length, sessionsLoading])

  useEffect(() => {
    if (!activeSession) return
    startTransition(() => {
      setDraftName(activeSession.name)
      setDraftState(activeSession.state_json ?? EMPTY_STATE)
    })
  }, [activeSession])

  useEffect(() => {
    if (draftState.strategy_draft) {
      startTransition(() => {
        setStrategyName(draftState.strategy_draft?.name ?? '')
        setStrategyClassName(draftState.strategy_draft?.class_name ?? '')
        setStrategyDescription(draftState.strategy_draft?.description ?? '')
      })
      return
    }

    if (draftState.selected_factors.length === 0) {
      startTransition(() => {
        setStrategyName('')
        setStrategyClassName('')
        setStrategyDescription('')
      })
      return
    }

    const suggestedName = buildStrategyName(draftState.selected_factors)
    startTransition(() => {
      setStrategyName((current) => current || suggestedName)
      setStrategyClassName((current) => current || buildClassName(suggestedName))
      setStrategyDescription((current) => current || 'Generated from selected factors in Workbench.')
    })
  }, [draftState.selected_factors, draftState.strategy_draft])

  const saveMutation = useMutation({
    mutationFn: () => persistSession(draftState, draftName),
    onSuccess: (response) => {
      setActionMessage(`Saved workflow ${response.name}.`)
    },
  })

  const transitionMutation = useMutation({
    mutationFn: (targetStage: Stage) => requestStageTransition(targetStage),
    onSuccess: (session) => {
      setActionMessage(`Moved to ${labelForStage(session.current_stage)}.`)
    },
    onError: (error) => setActionMessage(error instanceof Error ? error.message : 'Failed to change stage.'),
  })

  const { data: backtestJob } = useQuery<BacktestJob | null>({
    queryKey: ['workbench', 'backtest-job', draftState.backtest.job_id],
    queryFn: () => {
      if (!draftState.backtest.job_id) return Promise.resolve(null)
      return queueAPI.getJob(draftState.backtest.job_id).then((response) => response.data as BacktestJob)
    },
    enabled: !!draftState.backtest.job_id,
    refetchInterval: (query) => {
      const status = (query.state.data as BacktestJob | null)?.status
      return status && ['completed', 'finished', 'failed', 'cancelled'].includes(status) ? false : 3000
    },
  })

  const { data: aiReport } = useQuery<AIBacktestReport | null>({
    queryKey: ['workbench', 'ai-report', draftState.backtest.job_id],
    queryFn: () => {
      if (!draftState.backtest.job_id) return Promise.resolve(null)
      return backtestAPI.getAIReport(draftState.backtest.job_id).then((response) => response.data as AIBacktestReport)
    },
    enabled: !!draftState.backtest.job_id && !!draftState.backtest.summary,
    retry: false,
  })

  const generateStrategyMutation = useMutation({
    mutationFn: () =>
      strategiesAPI.generateMultiFactorCode({
        name: strategyName,
        class_name: strategyClassName,
        factors: draftState.selected_factors.map((factor) => ({
          factor_id: factor.id,
          factor_name: factor.name,
          expression: factor.expression,
          weight: 1,
          direction: 1,
          factor_set: 'custom',
        })),
      }),
    onSuccess: (response) => {
      const code = response.data?.code ?? ''
      setDraftState((prev) => ({
        ...prev,
        strategy_draft: {
          strategy_id: prev.strategy_draft?.strategy_id,
          name: strategyName,
          class_name: strategyClassName,
          description: strategyDescription,
          code,
        },
      }))
      setActionMessage('Generated strategy code from selected factors.')
    },
    onError: (error) => setActionMessage(error instanceof Error ? error.message : 'Failed to generate strategy.'),
  })

  const saveStrategyMutation = useMutation({
    mutationFn: async () => {
      const response = await strategiesAPI.createMultiFactor({
        name: strategyName,
        class_name: strategyClassName,
        description: strategyDescription,
        factors: draftState.selected_factors.map((factor) => ({
          factor_id: factor.id,
          factor_name: factor.name,
          expression: factor.expression,
          weight: 1,
          direction: 1,
          factor_set: 'custom',
        })),
      })
      const strategy = response.data as { id: number; name: string; class_name: string; code?: string }
      const nextState: WorkbenchState = {
        ...draftState,
        strategy_draft: {
          strategy_id: strategy.id,
          name: strategy.name,
          class_name: strategy.class_name,
          description: strategyDescription,
          code: draftState.strategy_draft?.code ?? strategy.code,
        },
      }
      await persistSession(nextState, draftName)
      return requestStageTransition('backtest', nextState)
    },
    onSuccess: () => setActionMessage('Strategy saved and moved to Backtest Validation.'),
    onError: (error) => setActionMessage(error instanceof Error ? error.message : 'Failed to save strategy.'),
  })

  const submitBacktestMutation = useMutation({
    mutationFn: async () => {
      if (!draftState.strategy_draft?.strategy_id) {
        throw new Error('Save the strategy before starting a backtest.')
      }
      const response = await queueAPI.submitBacktest({
        strategy_id: draftState.strategy_draft.strategy_id,
        strategy_name: draftState.strategy_draft.name,
        symbol: draftState.backtest.symbol || '600519.SH',
        start_date: draftState.backtest.start_date || '2023-01-01',
        end_date: draftState.backtest.end_date || '2024-12-31',
        benchmark: draftState.backtest.benchmark || '000300.SH',
      })

      const nextState: WorkbenchState = {
        ...draftState,
        backtest: {
          ...draftState.backtest,
          job_id: response.data?.job_id ?? null,
          status: response.data?.status ?? 'queued',
          summary: null,
        },
      }
      await persistSession(nextState, draftName)
      return nextState
    },
    onSuccess: (nextState) => {
      setDraftState(nextState)
      setActionMessage('Backtest submitted to queue.')
    },
    onError: (error) => setActionMessage(error instanceof Error ? error.message : 'Failed to submit backtest.'),
  })

  const deployPaperMutation = useMutation({
    mutationFn: async () => {
      if (!draftState.strategy_draft?.strategy_id) {
        throw new Error('Save a strategy before deploying to paper trading.')
      }
      if (!draftState.paper_trade.account_id) {
        throw new Error('Select a paper account before deployment.')
      }
      const response = await paperTradingAPI.deployStrategy({
        strategy_id: draftState.strategy_draft.strategy_id,
        strategy_source_type: 'strategy',
        vt_symbol: draftState.backtest.symbol || undefined,
        paper_account_id: draftState.paper_trade.account_id,
        execution_mode: draftState.paper_trade.mode || 'auto',
        source_backtest_job_id: draftState.backtest.job_id || undefined,
      })

      const payload = response.data as {
        deployment_id?: number
        runtime?: Record<string, unknown>
      }
      const nextState: WorkbenchState = {
        ...draftState,
        paper_trade: {
          ...draftState.paper_trade,
          deployment_id: payload.deployment_id ?? null,
          runtime_summary: payload.runtime ?? payload,
        },
      }
      await persistSession(nextState, draftName)
      return nextState
    },
    onSuccess: (nextState) => {
      setDraftState(nextState)
      setActionMessage('Paper trading deployment created.')
    },
    onError: (error) => setActionMessage(error instanceof Error ? error.message : 'Failed to deploy to paper trading.'),
  })

  const generateAIReportMutation = useMutation({
    mutationFn: async () => {
      if (!draftState.backtest.job_id) {
        throw new Error('Run a backtest before generating an AI report.')
      }
      await backtestAPI.generateAIReport(draftState.backtest.job_id)
      await queryClient.invalidateQueries({ queryKey: ['workbench', 'ai-report', draftState.backtest.job_id] })
    },
    onSuccess: () => setActionMessage('AI backtest report generated.'),
    onError: (error) => setActionMessage(error instanceof Error ? error.message : 'Failed to generate AI report.'),
  })

  const copilotMutation = useMutation({
    mutationFn: async (content: string) => {
      const prompt = buildCopilotPrompt(content, draftName, draftState)
      if (!copilotConversationId) {
        const conversation = await aiAPI.createConversation({ title: `Workbench: ${draftName}` })
        const nextConversationId = conversation.data?.id ?? conversation.data?.data?.id
        if (!nextConversationId) {
          throw new Error('Failed to create Copilot conversation.')
        }
        setCopilotConversationId(nextConversationId)
        const response = await aiAPI.sendMessage(nextConversationId, { content: prompt })
        return response.data?.content ?? response.data?.data?.content ?? 'No response.'
      }
      const response = await aiAPI.sendMessage(copilotConversationId, { content: prompt })
      return response.data?.content ?? response.data?.data?.content ?? 'No response.'
    },
    onSuccess: (content) => {
      setCopilotMessages((prev) => [...prev, { role: 'assistant', content }])
    },
    onError: (error) => {
      const fallback = error instanceof Error ? error.message : 'Copilot request failed.'
      setCopilotMessages((prev) => [...prev, { role: 'assistant', content: fallback }])
    },
  })

  const filteredFactors = useMemo(() => {
    const query = factorSearch.trim().toLowerCase()
    if (!query) {
      return factors
    }
    return factors.filter((factor) => {
      const haystack = [factor.name, factor.category, factor.expression ?? ''].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [factorSearch, factors])

  const backtestSummary = extractBacktestSummary(backtestJob)

  const stageIndex = useMemo(
    () => STAGES.findIndex((stage) => stage.key === draftState.stage),
    [draftState.stage]
  )

  async function persistSession(state: WorkbenchState, name: string) {
    const payload = { ...state, stage: state.stage }
    const response = activeSessionId
      ? await workbenchAPI.updateSession(activeSessionId, {
          name,
          current_stage: payload.stage,
          status: activeSession?.status ?? 'draft',
          state_json: payload,
        })
      : await workbenchAPI.createSession({
          name,
          current_stage: payload.stage,
          status: 'draft',
          state_json: payload,
        })

    const session = response.data as WorkbenchSession
    setActiveSessionId(session.id)
    setDraftName(session.name)
    setDraftState(session.state_json)
    await queryClient.invalidateQueries({ queryKey: ['workbench', 'sessions'] })
    await queryClient.invalidateQueries({ queryKey: ['workbench', 'session', session.id] })
    return session
  }

  async function requestStageTransition(targetStage: Stage, sourceState?: WorkbenchState) {
    const baseState = sourceState ?? draftState
    const persisted = await persistSession(baseState, draftName)
    const response = await workbenchAPI.transitionSession(persisted.id, { target_stage: targetStage })
    const session = response.data as WorkbenchSession
    setActiveSessionId(session.id)
    setDraftName(session.name)
    setDraftState(session.state_json)
    await queryClient.invalidateQueries({ queryKey: ['workbench', 'sessions'] })
    await queryClient.invalidateQueries({ queryKey: ['workbench', 'session', session.id] })
    return session
  }

  function toggleFactor(factor: FactorItem) {
    setDraftState((prev) => {
      const alreadySelected = prev.selected_factors.some((item) => item.id === factor.id)
      return {
        ...prev,
        selected_factors: alreadySelected
          ? prev.selected_factors.filter((item) => item.id !== factor.id)
          : [
              ...prev.selected_factors,
              {
                id: factor.id,
                name: factor.name,
                expression: factor.expression,
                category: factor.category,
                ic_mean: factor.ic_mean,
                ic_ir: factor.ic_ir,
              },
            ],
      }
    })
  }

  function sendCopilotMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed) {
      return
    }
    setCopilotMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setCopilotInput('')
    copilotMutation.mutate(trimmed)
  }

  function extractBacktestSummary(job: BacktestJob | null) {
    const stats = job?.result?.statistics
    if (!stats) {
      return null
    }
    return {
      total_return: Number(stats.total_return ?? 0),
      annual_return: Number(stats.annual_return ?? 0),
      sharpe_ratio: Number(stats.sharpe_ratio ?? 0),
      max_drawdown: Number(stats.max_drawdown_percent ?? stats.max_drawdown ?? 0),
      win_rate: Number(stats.win_rate ?? 0),
    }
  }

  useEffect(() => {
    if (!backtestJob) {
      return
    }
    const nextSummary = extractBacktestSummary(backtestJob)
    startTransition(() => {
      setDraftState((prev) => {
        const sameStatus = prev.backtest.status === backtestJob.status
        const prevSummary = JSON.stringify(prev.backtest.summary ?? null)
        const incomingSummary = JSON.stringify(nextSummary ?? null)
        if (sameStatus && prevSummary === incomingSummary) {
          return prev
        }
        return {
          ...prev,
          backtest: {
            ...prev.backtest,
            status: backtestJob.status,
            summary: nextSummary,
          },
        }
      })
    })
  }, [backtestJob])

  return (
    <div className="space-y-6" data-testid="workbench-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workbench</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Guided workflow for Factor Research, Strategy Build, Backtest Validation, and Paper Trading.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            New Workflow
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save Progress
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          {actionMessage}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {STAGES.map((stage, index) => {
                const Icon = stage.icon
                const isActive = draftState.stage === stage.key
                const isDone = index < stageIndex
                return (
                  <div key={stage.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => transitionMutation.mutate(stage.key)}
                      disabled={transitionMutation.isPending}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                        isActive
                          ? 'border-primary bg-primary/10 text-primary'
                          : isDone
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {stage.label}
                    </button>
                    {index < STAGES.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">Workflow Session</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Workbench now supports persistent session state, real factor selection, and multi-factor strategy generation.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Workflow Name</label>
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Session Summary</label>
                <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  {draftState.selected_factors.length} factors selected ·{' '}
                  {draftState.strategy_draft?.strategy_id ? `strategy #${draftState.strategy_draft.strategy_id}` : 'no saved strategy yet'}
                </div>
              </div>
            </div>

            {draftState.stage === 'factor' && (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[260px] flex-1">
                    <label className="mb-1 block text-sm font-medium">Search Factors</label>
                    <input
                      value={factorSearch}
                      onChange={(event) => setFactorSearch(event.target.value)}
                      placeholder="Search by name, category, or expression"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => transitionMutation.mutate('strategy')}
                    disabled={draftState.selected_factors.length === 0 || transitionMutation.isPending}
                    className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Continue To Strategy Build
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredFactors.map((factor) => {
                    const selected = draftState.selected_factors.some((item) => item.id === factor.id)
                    return (
                      <button
                        key={factor.id}
                        type="button"
                        onClick={() => toggleFactor(factor)}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-foreground">{factor.name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{factor.category}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{selected ? 'Selected' : 'Pick'}</div>
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground">
                          {factor.expression || 'No expression preview'}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>IC {factor.ic_mean?.toFixed(3) ?? '—'}</span>
                          <span>ICIR {factor.ic_ir?.toFixed(3) ?? '—'}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {draftState.stage === 'strategy' && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Selected Factors</label>
                  <div className="flex flex-wrap gap-2">
                    {draftState.selected_factors.map((factor) => (
                      <span key={factor.id ?? factor.name} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary">
                        {factor.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Strategy Name</label>
                    <input
                      value={strategyName}
                      onChange={(event) => setStrategyName(event.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Class Name</label>
                    <input
                      value={strategyClassName}
                      onChange={(event) => setStrategyClassName(event.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <textarea
                    value={strategyDescription}
                    onChange={(event) => setStrategyDescription(event.target.value)}
                    className="min-h-[88px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => generateStrategyMutation.mutate()}
                    disabled={!strategyName || !strategyClassName || draftState.selected_factors.length === 0 || generateStrategyMutation.isPending}
                    className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
                  >
                    Generate Strategy Code
                  </button>
                  <button
                    type="button"
                    onClick={() => saveStrategyMutation.mutate()}
                    disabled={!draftState.strategy_draft?.code || saveStrategyMutation.isPending}
                    className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Save Strategy And Continue
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Generated Code Preview</label>
                  <pre className="max-h-[360px] overflow-auto rounded-md border border-border bg-slate-950 px-4 py-3 text-xs text-slate-100">
                    {draftState.strategy_draft?.code || 'Generate strategy code to preview the draft here.'}
                  </pre>
                </div>
              </div>
            )}

            {draftState.stage === 'backtest' && (
              <div className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Symbol</label>
                    <input
                      value={draftState.backtest.symbol || ''}
                      onChange={(event) =>
                        setDraftState((prev) => ({
                          ...prev,
                          backtest: { ...prev.backtest, symbol: event.target.value },
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Start Date</label>
                    <input
                      type="date"
                      value={draftState.backtest.start_date || '2023-01-01'}
                      onChange={(event) =>
                        setDraftState((prev) => ({
                          ...prev,
                          backtest: { ...prev.backtest, start_date: event.target.value },
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">End Date</label>
                    <input
                      type="date"
                      value={draftState.backtest.end_date || '2024-12-31'}
                      onChange={(event) =>
                        setDraftState((prev) => ({
                          ...prev,
                          backtest: { ...prev.backtest, end_date: event.target.value },
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Benchmark</label>
                    <input
                      value={draftState.backtest.benchmark || '000300.SH'}
                      onChange={(event) =>
                        setDraftState((prev) => ({
                          ...prev,
                          backtest: { ...prev.backtest, benchmark: event.target.value },
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => submitBacktestMutation.mutate()}
                    disabled={!draftState.strategy_draft?.strategy_id || submitBacktestMutation.isPending}
                    className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Start Backtest
                  </button>
                  {draftState.backtest.summary && (
                    <button
                      type="button"
                      onClick={() => transitionMutation.mutate('paper_trade')}
                      className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
                    >
                      Continue To Paper Trading
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-background px-4 py-4 text-sm">
                  <div className="font-medium text-foreground">Backtest Status</div>
                  <div className="mt-1 text-muted-foreground">
                    {draftState.backtest.job_id
                      ? `${draftState.backtest.status || 'queued'} · job ${draftState.backtest.job_id}`
                      : 'No backtest submitted yet.'}
                  </div>
                </div>

                {backtestSummary && (
                  <>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <MetricCard label="Total Return" value={`${backtestSummary.total_return.toFixed(2)}%`} positive={backtestSummary.total_return >= 0} />
                      <MetricCard label="Annual Return" value={`${backtestSummary.annual_return.toFixed(2)}%`} positive={backtestSummary.annual_return >= 0} />
                      <MetricCard label="Sharpe Ratio" value={backtestSummary.sharpe_ratio.toFixed(2)} positive />
                      <MetricCard label="Max Drawdown" value={`${backtestSummary.max_drawdown.toFixed(2)}%`} />
                      <MetricCard label="Win Rate" value={`${backtestSummary.win_rate.toFixed(2)}%`} positive={backtestSummary.win_rate >= 50} />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => generateAIReportMutation.mutate()}
                        disabled={generateAIReportMutation.isPending}
                        className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
                      >
                        Generate AI Interpretation
                      </button>
                    </div>

                    {aiReport?.report_json && (
                      <div className="space-y-4 rounded-xl border border-border bg-background px-4 py-4">
                        <div>
                          <div className="text-sm font-semibold text-foreground">AI Backtest Interpretation</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Quality: {aiReport.report_json.summary?.quality || 'n/a'} · Risk: {aiReport.report_json.summary?.risk_level || 'n/a'} · Overfit risk: {aiReport.report_json.summary?.overfit_risk || 'n/a'}
                          </div>
                        </div>
                        {Object.entries(aiReport.report_json.sections || {}).map(([key, section]) => (
                          <div key={key} className="rounded-lg border border-border px-4 py-3">
                            <div className="text-sm font-medium text-foreground">{section.title || key}</div>
                            <div className="mt-1 text-sm text-muted-foreground">{section.content || ''}</div>
                            {section.actions && section.actions.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {section.actions.map((action) => (
                                  <span key={action.action} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary">
                                    {action.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {draftState.stage === 'paper_trade' && (
              <div className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Paper Account</label>
                    <select
                      value={draftState.paper_trade.account_id ?? ''}
                      onChange={(event) =>
                        setDraftState((prev) => ({
                          ...prev,
                          paper_trade: {
                            ...prev.paper_trade,
                            account_id: event.target.value ? Number(event.target.value) : null,
                          },
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select an active paper account</option>
                      {paperAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} · {account.market}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Execution Mode</label>
                    <select
                      value={draftState.paper_trade.mode ?? 'auto'}
                      onChange={(event) =>
                        setDraftState((prev) => ({
                          ...prev,
                          paper_trade: {
                            ...prev.paper_trade,
                            mode: event.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="auto">Full Auto</option>
                      <option value="semi_auto">Signal Mode</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deployPaperMutation.mutate()}
                  disabled={!draftState.backtest.summary || !draftState.paper_trade.account_id || deployPaperMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                  Deploy To Paper Trading
                </button>

                {draftState.paper_trade.deployment_id && (
                  <div className="rounded-xl border border-border bg-background px-4 py-4 text-sm">
                    <div className="font-medium text-foreground">Deployment Active</div>
                    <div className="mt-1 text-muted-foreground">
                      Deployment #{draftState.paper_trade.deployment_id} · account {draftState.paper_trade.account_id} · {draftState.paper_trade.mode || 'auto'}
                    </div>
                    <pre className="mt-3 max-h-[220px] overflow-auto rounded-md bg-slate-950 px-3 py-3 text-xs text-slate-100">
                      {JSON.stringify(draftState.paper_trade.runtime_summary ?? {}, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6">
              <label className="mb-1 block text-sm font-medium">Workflow State Preview</label>
              <textarea
                value={JSON.stringify(draftState, null, 2)}
                onChange={(event) => {
                  try {
                    setDraftState(JSON.parse(event.target.value) as WorkbenchState)
                  } catch {
                    // Keep the current valid state until JSON becomes valid again.
                  }
                }}
                className="min-h-[220px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-card-foreground">Copilot Panel</h2>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => sendCopilotMessage('Review the selected factors and tell me whether I should proceed.')} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">
                  Review Factors
                </button>
                <button type="button" onClick={() => sendCopilotMessage('Explain the best next step for the current Workbench stage.')} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">
                  Explain Next Step
                </button>
                <button type="button" onClick={() => sendCopilotMessage('Interpret the current backtest result and call out the main risks.')} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">
                  Interpret Backtest
                </button>
              </div>

              <div className="max-h-[360px] space-y-3 overflow-auto rounded-xl border border-border bg-background p-3">
                {copilotMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`rounded-lg px-3 py-2 text-sm ${message.role === 'assistant' ? 'bg-muted text-foreground' : 'bg-primary text-white'}`}
                  >
                    {message.content}
                  </div>
                ))}
                {copilotMutation.isPending && (
                  <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Copilot is thinking...</div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={copilotInput}
                  onChange={(event) => setCopilotInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      sendCopilotMessage(copilotInput)
                    }
                  }}
                  placeholder="Ask Copilot about this workflow..."
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => sendCopilotMessage(copilotInput)}
                  disabled={!copilotInput.trim() || copilotMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-card-foreground">Recent Sessions</h2>
              {sessionsLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
            </div>
            <div className="space-y-3">
              {sessions.length === 0 && (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  No workflow sessions yet.
                </div>
              )}
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setActiveSessionId(session.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                    activeSessionId === session.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="font-medium text-foreground">{session.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {session.current_stage} · {session.status}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Updated {new Date(session.updated_at).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-2 text-lg font-semibold ${positive === undefined ? 'text-foreground' : positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {value}
      </div>
    </div>
  )
}