import { useTranslation } from 'react-i18next'

interface AuthBrandBannerProps {
  className?: string
}

export default function AuthBrandBanner({ className = '' }: AuthBrandBannerProps) {
  const { t } = useTranslation('auth')

  return (
    <div className={`relative overflow-hidden rounded-lg shadow-md ${className}`.trim()}>
      <img src="/banner.svg" alt={t('brandAlt')} className="h-auto w-full" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 via-blue-950/35 to-emerald-900/30" />

      <div className="absolute inset-0 flex flex-col justify-center px-6 py-6 text-white md:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100/90 md:text-sm">
          {t('bannerEyebrow')}
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-5xl">{t('brandName')}</h2>
        <p className="mt-3 max-w-xl text-sm font-medium text-blue-50 md:text-lg">{t('bannerTitle')}</p>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-blue-100/90 md:text-sm">
          {t('bannerSubtitle')}
        </p>
      </div>
    </div>
  )
}