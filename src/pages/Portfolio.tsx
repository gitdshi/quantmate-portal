import PortfolioManagement from '../components/PortfolioManagement'

export default function Portfolio() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio</h1>
        <p className="text-gray-600">
          Manage your positions and track trading performance
        </p>
      </div>

      <PortfolioManagement />
    </div>
  )
}
