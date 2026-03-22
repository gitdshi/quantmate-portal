import { useQuery } from '@tanstack/react-query'
import { Download, Search, Star, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge from '../components/ui/Badge'
import { templateAPI } from '../lib/api'

interface Template {
  id: string
  name: string
  description: string
  author: string
  category: string
  rating: number
  downloads: number
  tags: string[]
  featured?: boolean
}

const CATEGORY_KEYS = ['all', 'trend', 'meanReversion', 'multiFactor', 'arbitrage', 'hft', 'ml'] as const

export default function Marketplace() {
  const { t } = useTranslation('social')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORY_KEYS)[number]>('all')
  const [page, setPage] = useState(1)

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ['marketplace-templates'],
    queryFn: () =>
      templateAPI.listMarketplace().then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
  })

  const featured = templates.find((item) => item.featured) || templates[0]
  const filtered = useMemo(
    () =>
      templates.filter(
        (item) =>
          (category === 'all' || item.category === t(`marketplace.categories.${category}`)) &&
          (!search || item.name.includes(search) || item.description.includes(search))
      ),
    [category, search, t, templates]
  )

  const pageSize = 6
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={12}
          className={index < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating}</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('marketplace.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('marketplace.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder={t('marketplace.search')}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-background"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORY_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => {
                setCategory(key)
                setPage(1)
              }}
              className={`px-3 py-1.5 text-sm rounded-md ${category === key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {t(`marketplace.categories.${key}`)}
            </button>
          ))}
        </div>
      </div>

      {featured && category === 'all' && !search && (
        <div className="rounded-lg border border-primary/30 bg-gradient-to-r from-primary/5 to-card p-6 flex items-center gap-6">
          <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp size={32} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="primary">{t('marketplace.featured')}</Badge>
              <h2 className="text-lg font-bold text-foreground">{featured.name}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{featured.description}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {renderStars(featured.rating)}
              <span>
                <Download size={12} className="inline mr-1" />
                {featured.downloads.toLocaleString()} {t('marketplace.downloadsSuffix')}
              </span>
              <span>
                {t('marketplace.by')} {featured.author}
              </span>
            </div>
          </div>
          <button className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 whitespace-nowrap">
            {t('marketplace.useTemplate')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paged.map((item) => (
          <div key={item.id} className="rounded-lg border border-border bg-card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="primary">{item.category}</Badge>
              {renderStars(item.rating)}
            </div>
            <h3 className="font-semibold text-card-foreground mb-1">{item.name}</h3>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {item.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t('marketplace.by')} {item.author}
              </span>
              <span>
                <Download size={10} className="inline mr-0.5" />
                {item.downloads.toLocaleString()}
              </span>
            </div>
            <button className="w-full mt-3 px-3 py-1.5 text-sm rounded-md border border-primary text-primary hover:bg-primary/10">
              {t('marketplace.useTemplate')}
            </button>
          </div>
        ))}
      </div>

      {paged.length === 0 && <p className="text-center text-muted-foreground py-8">{t('marketplace.noTemplates')}</p>}

      {totalPages > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              onClick={() => setPage(index + 1)}
              className={`w-8 h-8 text-sm rounded-md ${page === index + 1 ? 'bg-primary text-white' : 'border border-border hover:bg-muted'}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
