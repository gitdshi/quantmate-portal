import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import zhAnalytics from './locales/zh/analytics.json'
import zhAuth from './locales/zh/auth.json'
import zhBacktest from './locales/zh/backtest.json'
import zhCommon from './locales/zh/common.json'
import zhComposite from './locales/zh/composite.json'
import zhDashboard from './locales/zh/dashboard.json'
import zhMarket from './locales/zh/market.json'
import zhMonitoring from './locales/zh/monitoring.json'
import zhNav from './locales/zh/nav.json'
import zhPortfolio from './locales/zh/portfolio.json'
import zhSettings from './locales/zh/settings.json'
import zhSocial from './locales/zh/social.json'
import zhStrategies from './locales/zh/strategies.json'
import zhTrading from './locales/zh/trading.json'
import zhWorkbench from './locales/zh/workbench.json'

import enAnalytics from './locales/en/analytics.json'
import enAuth from './locales/en/auth.json'
import enBacktest from './locales/en/backtest.json'
import enCommon from './locales/en/common.json'
import enComposite from './locales/en/composite.json'
import enDashboard from './locales/en/dashboard.json'
import enMarket from './locales/en/market.json'
import enMonitoring from './locales/en/monitoring.json'
import enNav from './locales/en/nav.json'
import enPortfolio from './locales/en/portfolio.json'
import enSettings from './locales/en/settings.json'
import enSocial from './locales/en/social.json'
import enStrategies from './locales/en/strategies.json'
import enTrading from './locales/en/trading.json'
import enWorkbench from './locales/en/workbench.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: {
        common: zhCommon,
        nav: zhNav,
        auth: zhAuth,
        dashboard: zhDashboard,
        analytics: zhAnalytics,
        strategies: zhStrategies,
        backtest: zhBacktest,
        market: zhMarket,
        trading: zhTrading,
        portfolio: zhPortfolio,
        monitoring: zhMonitoring,
        settings: zhSettings,
        social: zhSocial,
        composite: zhComposite,
        workbench: zhWorkbench,
      },
      en: {
        common: enCommon,
        nav: enNav,
        auth: enAuth,
        dashboard: enDashboard,
        analytics: enAnalytics,
        strategies: enStrategies,
        backtest: enBacktest,
        market: enMarket,
        trading: enTrading,
        portfolio: enPortfolio,
        monitoring: enMonitoring,
        settings: enSettings,
        social: enSocial,
        composite: enComposite,
        workbench: enWorkbench,
      },
    },
    supportedLngs: ['zh', 'en'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    lng: localStorage.getItem('quantmate-lang') || 'zh',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common', 'nav', 'auth', 'dashboard', 'analytics', 'strategies', 'backtest',
      'market', 'trading', 'portfolio', 'monitoring', 'settings', 'social', 'composite', 'workbench',
    ],
    interpolation: {
      escapeValue: false,
    },
    initImmediate: false,
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'quantmate-lang',
      caches: ['localStorage'],
    },
  })

export default i18n
