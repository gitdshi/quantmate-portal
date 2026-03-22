import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zhCommon from './locales/zh/common.json'
import zhNav from './locales/zh/nav.json'
import zhAuth from './locales/zh/auth.json'
import zhDashboard from './locales/zh/dashboard.json'
import zhAnalytics from './locales/zh/analytics.json'
import zhStrategies from './locales/zh/strategies.json'
import zhBacktest from './locales/zh/backtest.json'
import zhMarket from './locales/zh/market.json'
import zhTrading from './locales/zh/trading.json'
import zhPortfolio from './locales/zh/portfolio.json'
import zhMonitoring from './locales/zh/monitoring.json'
import zhSettings from './locales/zh/settings.json'
import zhSocial from './locales/zh/social.json'

import enCommon from './locales/en/common.json'
import enNav from './locales/en/nav.json'
import enAuth from './locales/en/auth.json'
import enDashboard from './locales/en/dashboard.json'
import enAnalytics from './locales/en/analytics.json'
import enStrategies from './locales/en/strategies.json'
import enBacktest from './locales/en/backtest.json'
import enMarket from './locales/en/market.json'
import enTrading from './locales/en/trading.json'
import enPortfolio from './locales/en/portfolio.json'
import enMonitoring from './locales/en/monitoring.json'
import enSettings from './locales/en/settings.json'
import enSocial from './locales/en/social.json'

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
      },
    },
    supportedLngs: ['zh', 'en'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: 'zh',
    defaultNS: 'common',
    ns: [
      'common', 'nav', 'auth', 'dashboard', 'analytics', 'strategies', 'backtest',
      'market', 'trading', 'portfolio', 'monitoring', 'settings', 'social',
    ],
    interpolation: {
      escapeValue: false,
    },
    initImmediate: false,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'quantmate-lang',
      caches: ['localStorage'],
    },
  })

export default i18n
