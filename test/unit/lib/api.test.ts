import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyticsAPI, authAPI, backtestAPI, marketDataAPI, optimizationAPI, paperTradingAPI, portfolioAPI, qlibAPI, queueAPI, strategiesAPI, tradingAPI } from '@/lib/api'

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}))

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Auth API', () => {
    it('has login endpoint', () => {
      expect(authAPI.login).toBeDefined()
    })

    it('has register endpoint', () => {
      expect(authAPI.register).toBeDefined()
    })

    it('has me endpoint', () => {
      expect(authAPI.me).toBeDefined()
    })

    it('has refresh endpoint', () => {
      expect(authAPI.refresh).toBeDefined()
    })
  })

  describe('Strategies API', () => {
    it('has list endpoint', () => {
      expect(strategiesAPI.list).toBeDefined()
    })

    it('has get endpoint', () => {
      expect(strategiesAPI.get).toBeDefined()
    })

    it('has create endpoint', () => {
      expect(strategiesAPI.create).toBeDefined()
    })

    it('has update endpoint', () => {
      expect(strategiesAPI.update).toBeDefined()
    })

    it('has delete endpoint', () => {
      expect(strategiesAPI.delete).toBeDefined()
    })

    it('has listBuiltin endpoint', () => {
      expect(strategiesAPI.listBuiltin).toBeDefined()
    })
  })

  describe('Backtest API', () => {
    it('has submit endpoint', () => {
      expect(backtestAPI.submit).toBeDefined()
    })

    it('has submitBatch endpoint', () => {
      expect(backtestAPI.submitBatch).toBeDefined()
    })

    it('has getStatus endpoint', () => {
      expect(backtestAPI.getStatus).toBeDefined()
    })

    it('has getHistory endpoint', () => {
      expect(backtestAPI.getHistory).toBeDefined()
    })

    it('has cancel endpoint', () => {
      expect(backtestAPI.cancel).toBeDefined()
    })
  })

  describe('Queue API', () => {
    it('has getStats endpoint', () => {
      expect(queueAPI.getStats).toBeDefined()
    })

    it('has listJobs endpoint', () => {
      expect(queueAPI.listJobs).toBeDefined()
    })

    it('has getJob endpoint', () => {
      expect(queueAPI.getJob).toBeDefined()
    })

    it('has cancelJob endpoint', () => {
      expect(queueAPI.cancelJob).toBeDefined()
    })

    it('has deleteJob endpoint', () => {
      expect(queueAPI.deleteJob).toBeDefined()
    })
  })

  describe('Market Data API', () => {
    it('has symbols endpoint', () => {
      expect(marketDataAPI.symbols).toBeDefined()
    })

    it('has history endpoint', () => {
      expect(marketDataAPI.history).toBeDefined()
    })

    it('has indicators endpoint', () => {
      expect(marketDataAPI.indicators).toBeDefined()
    })

    it('has overview endpoint', () => {
      expect(marketDataAPI.overview).toBeDefined()
    })

    it('has sectors endpoint', () => {
      expect(marketDataAPI.sectors).toBeDefined()
    })
  })

  describe('Analytics API', () => {
    it('has dashboard endpoint', () => {
      expect(analyticsAPI.dashboard).toBeDefined()
    })

    it('has riskMetrics endpoint', () => {
      expect(analyticsAPI.riskMetrics).toBeDefined()
    })

    it('has compare endpoint', () => {
      expect(analyticsAPI.compare).toBeDefined()
    })
  })

  describe('Portfolio API', () => {
    it('has positions endpoint', () => {
      expect(portfolioAPI.positions).toBeDefined()
    })

    it('has close endpoint', () => {
      expect(portfolioAPI.close).toBeDefined()
    })

    it('has transactions endpoint', () => {
      expect(portfolioAPI.transactions).toBeDefined()
    })

    it('has snapshots endpoint', () => {
      expect(portfolioAPI.snapshots).toBeDefined()
    })
  })

  describe('Optimization API', () => {
    it('has submit endpoint', () => {
      expect(optimizationAPI.submit).toBeDefined()
    })

    it('has getStatus endpoint', () => {
      expect(optimizationAPI.getStatus).toBeDefined()
    })

    it('has getHistory endpoint', () => {
      expect(optimizationAPI.getHistory).toBeDefined()
    })

    it('has cancel endpoint', () => {
      expect(optimizationAPI.cancel).toBeDefined()
    })
  })

  describe('Trading API', () => {
    it('has createOrder endpoint', () => {
      expect(tradingAPI.createOrder).toBeDefined()
    })

    it('has listOrders endpoint', () => {
      expect(tradingAPI.listOrders).toBeDefined()
    })

    it('has connectGateway endpoint', () => {
      expect(tradingAPI.connectGateway).toBeDefined()
    })

    it('has disconnectGateway endpoint', () => {
      expect(tradingAPI.disconnectGateway).toBeDefined()
    })

    it('has listGateways endpoint', () => {
      expect(tradingAPI.listGateways).toBeDefined()
    })

    it('has startAutoStrategy endpoint', () => {
      expect(tradingAPI.startAutoStrategy).toBeDefined()
    })

    it('has stopAutoStrategy endpoint', () => {
      expect(tradingAPI.stopAutoStrategy).toBeDefined()
    })

    it('has listAutoStrategies endpoint', () => {
      expect(tradingAPI.listAutoStrategies).toBeDefined()
    })
  })

  describe('Paper Trading API', () => {
    it('has deployStrategy endpoint', () => {
      expect(paperTradingAPI.deployStrategy).toBeDefined()
    })

    it('has listDeployments endpoint', () => {
      expect(paperTradingAPI.listDeployments).toBeDefined()
    })

    it('has stopDeployment endpoint', () => {
      expect(paperTradingAPI.stopDeployment).toBeDefined()
    })

    it('has listPaperOrders endpoint', () => {
      expect(paperTradingAPI.listPaperOrders).toBeDefined()
    })

    it('has createPaperOrder endpoint', () => {
      expect(paperTradingAPI.createPaperOrder).toBeDefined()
    })

    it('has cancelPaperOrder endpoint', () => {
      expect(paperTradingAPI.cancelPaperOrder).toBeDefined()
    })

    it('has getPaperPositions endpoint', () => {
      expect(paperTradingAPI.getPaperPositions).toBeDefined()
    })

    it('has getPaperPerformance endpoint', () => {
      expect(paperTradingAPI.getPaperPerformance).toBeDefined()
    })
  })

  describe('Qlib API', () => {
    it('has status endpoint', () => {
      expect(qlibAPI.status).toBeDefined()
    })

    it('has supportedModels endpoint', () => {
      expect(qlibAPI.supportedModels).toBeDefined()
    })

    it('has supportedDatasets endpoint', () => {
      expect(qlibAPI.supportedDatasets).toBeDefined()
    })

    it('has train endpoint', () => {
      expect(qlibAPI.train).toBeDefined()
    })

    it('has listTrainingRuns endpoint', () => {
      expect(qlibAPI.listTrainingRuns).toBeDefined()
    })

    it('has getTrainingRun endpoint', () => {
      expect(qlibAPI.getTrainingRun).toBeDefined()
    })

    it('has getPredictions endpoint', () => {
      expect(qlibAPI.getPredictions).toBeDefined()
    })

    it('has convertData endpoint', () => {
      expect(qlibAPI.convertData).toBeDefined()
    })

    it('has listFactorSets endpoint', () => {
      expect(qlibAPI.listFactorSets).toBeDefined()
    })

    it('has computeFactors endpoint', () => {
      expect(qlibAPI.computeFactors).toBeDefined()
    })
  })
})

