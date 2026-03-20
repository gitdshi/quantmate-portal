import { useTranslation } from 'react-i18next'
import PortfolioManagement from '../components/PortfolioManagement'

export default function Portfolio() {
  const { t } = useTranslation(['portfolio', 'common'])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-gray-600">
          {t('subtitle')}
        </p>
      </div>

      <PortfolioManagement />
    </div>
  )
}
