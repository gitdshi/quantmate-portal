import { useTranslation } from 'react-i18next'

export function useIsZh() {
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  return language.startsWith('zh')
}
