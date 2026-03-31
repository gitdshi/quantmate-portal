/**
 * Read-only template preview drawer / side panel.
 * Used in Marketplace and Template Library views.
 */

import { Eye, Star, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge from './ui/Badge'
import TabPanel from './ui/TabPanel'

export interface PreviewTemplate {
  id: string
  name: string
  description: string
  author?: string
  categoryLabel?: string
  templateType: string
  layer?: string
  rating?: number
  downloads?: number
  tags?: string[]
  code?: string | null
  defaultParameters?: Record<string, unknown> | null
}

interface Props {
  template: PreviewTemplate | null
  isOpen: boolean
  onClose: () => void
  isInLibrary?: boolean
  onAddToLibrary?: (template: PreviewTemplate) => void
  addToLibraryLoading?: boolean
  codeLoading?: boolean
}

type PreviewTab = 'description' | 'code' | 'parameters'

export default function TemplatePreviewDrawer({
  template,
  isOpen,
  onClose,
  isInLibrary = false,
  onAddToLibrary,
  addToLibraryLoading = false,
  codeLoading = false,
}: Props) {
  const { t } = useTranslation('social')
  const [tab, setTab] = useState<PreviewTab>('description')

  if (!isOpen || !template) return null

  const tabs = [
    { key: 'description', label: t('marketplace.preview.descriptionTab', 'Description') },
    { key: 'code', label: t('marketplace.preview.codeTab', 'Code') },
    { key: 'parameters', label: t('marketplace.preview.parametersTab', 'Parameters') },
  ]

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={12}
          className={i < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
    </div>
  )

  const parsedParameters: Record<string, unknown> | null = (() => {
    const raw = template.defaultParameters
    if (!raw) return null
    // If it's already an object, use it
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>

    // If it's a string, it might be JSON or a JSON-encoded string (double-encoded).
    if (typeof raw === 'string') {
      try {
        const first = JSON.parse(raw)
        // If first parse yields an object, return it
        if (first && typeof first === 'object' && !Array.isArray(first)) return first as Record<string, unknown>
        // If first parse yields a string, try parsing again
        if (typeof first === 'string') {
          try {
            const second = JSON.parse(first)
            if (second && typeof second === 'object' && !Array.isArray(second)) return second as Record<string, unknown>
          } catch {
            // fallthrough
          }
        }
      } catch {
        // fallthrough
      }
    }

    return null
  })()
  const paramEntries = parsedParameters ? Object.entries(parsedParameters) : []

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-card border-l border-border shadow-xl overflow-auto animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-foreground truncate">{template.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {template.categoryLabel && (
                  <Badge variant="primary">{template.categoryLabel}</Badge>
                )}
                <Badge variant="muted">{template.templateType}</Badge>
                {template.layer && <Badge variant="warning">{template.layer}</Badge>}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {template.rating != null && renderStars(template.rating)}
                {template.author && <span>{template.author}</span>}
                {template.downloads != null && (
                  <span>{template.downloads.toLocaleString()} {t('marketplace.downloadsSuffix')}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-4 space-y-4">
          <TabPanel tabs={tabs} activeTab={tab} onChange={(k) => setTab(k as PreviewTab)}>
            {tab === 'description' && (
              <div className="space-y-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {template.description || t('marketplace.preview.noDescription', 'No description available.')}
                </p>
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'code' && (
              <div>
                {codeLoading ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    {t('marketplace.preview.loadingCode', 'Loading code...')}
                  </div>
                ) : template.code ? (
                  <pre className="max-h-[60vh] overflow-auto rounded-lg border border-border bg-muted/20 p-4 text-xs font-mono leading-6 text-foreground whitespace-pre-wrap">
                    {template.code}
                  </pre>
                ) : (
                  <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    <Eye size={20} className="mx-auto mb-2 text-muted-foreground" />
                    {t('marketplace.preview.noCode', 'Code not available for preview.')}
                  </div>
                )}
              </div>
            )}

            {tab === 'parameters' && (
              <div>
                {paramEntries.length > 0 ? (
                  <pre className="max-h-[60vh] overflow-auto rounded-lg border border-border bg-muted/20 p-4 text-xs font-mono leading-6 text-foreground whitespace-pre-wrap">
                    {JSON.stringify(parsedParameters, null, 2)}
                  </pre>
                ) : (
                  <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    {t('marketplace.preview.noParams', 'No parameters defined.')}
                  </div>
                )}
              </div>
            )}
          </TabPanel>
        </div>

        {/* Footer action */}
        {onAddToLibrary && (
          <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={() => onAddToLibrary(template)}
              disabled={isInLibrary || addToLibraryLoading}
              className={`w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                isInLibrary
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-white hover:opacity-90 disabled:opacity-50'
              }`}
            >
              {isInLibrary
                ? t('marketplace.alreadyInLibrary', 'Already in Template Library')
                : addToLibraryLoading
                  ? t('marketplace.adding', 'Adding...')
                  : t('marketplace.addToLibrary', 'Add to Template Library')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
