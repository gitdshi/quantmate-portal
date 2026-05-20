import { useTranslation } from 'react-i18next'

interface AuthBrandBannerProps {
  className?: string
}

export default function AuthBrandBanner({ className = '' }: AuthBrandBannerProps) {
  const { t, i18n } = useTranslation('auth')
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language
  const bannerSrc = currentLanguage.startsWith('zh') ? '/banner-zh.svg' : '/banner-en.svg'

  return (
    <div className={`overflow-hidden rounded-lg shadow-md ${className}`.trim()}>
      <img src={bannerSrc} alt={t('brandAlt')} className="h-auto w-full" />
    </div>
  )
}