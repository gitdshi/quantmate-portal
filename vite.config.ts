import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'

interface TushareCatalogOrder {
  categories: string[]
  subcategories: Record<string, string[]>
  apis: string[]
}

function normalizeCsvValue(value: string | undefined): string {
  return String(value ?? '')
    .replace(/^\ufeff/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

function buildTushareCatalogOrder(): TushareCatalogOrder {
  try {
    const csvText = readFileSync(
      new URL('../quantmate-docs/reference/tushare_api_full.csv', import.meta.url),
      'utf-8'
    )
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0)
    const [headerLine, ...dataLines] = lines
    const header = parseCsvLine(headerLine)
    const categoryIndex = header.findIndex((value) => normalizeCsvValue(value) === '数据大类')
    const subCategoryIndex = header.findIndex((value) => normalizeCsvValue(value) === '数据子类')
    const apiNameIndex = header.findIndex((value) => normalizeCsvValue(value) === '接口名称')

    const categories: string[] = []
    const subcategories = new Map<string, string[]>()
    const apis: string[] = []

    for (const line of dataLines) {
      const columns = parseCsvLine(line)
      const category = normalizeCsvValue(columns[categoryIndex])
      const subCategory = normalizeCsvValue(columns[subCategoryIndex])
      const apiName = normalizeCsvValue(columns[apiNameIndex])

      if (category && !categories.includes(category)) {
        categories.push(category)
      }

      if (category && subCategory) {
        const current = subcategories.get(category) ?? []
        if (!current.includes(subCategory)) {
          current.push(subCategory)
        }
        subcategories.set(category, current)
      }

      if (apiName && !apis.includes(apiName)) {
        apis.push(apiName)
      }
    }

    return {
      categories,
      subcategories: Object.fromEntries(subcategories.entries()),
      apis,
    }
  } catch {
    return {
      categories: [],
      subcategories: {},
      apis: [],
    }
  }
}

const pkgJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version?: string
}
const buildTime = new Date().toISOString()
const tushareCatalogOrder = buildTushareCatalogOrder()

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const host = env.PORTAL_HOST || '0.0.0.0'
  const port = Number(env.PORTAL_PORT || 5173)
  const hmrHost = env.PORTAL_HMR_HOST
  const hmrPort = Number(env.PORTAL_HMR_PORT || port)

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_PORTAL_VERSION': JSON.stringify(pkgJson.version || '0.0.0'),
      'import.meta.env.VITE_PORTAL_BUILD_TIME': JSON.stringify(buildTime),
      __TUSHARE_CATALOG_ORDER__: JSON.stringify(tushareCatalogOrder),
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return
            }

            if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
              return 'editor'
            }

            if (id.includes('react-syntax-highlighter') || id.includes('/diff/')) {
              return 'code-tools'
            }

            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
              return 'react-vendor'
            }

            if (id.includes('@tanstack') || id.includes('axios') || id.includes('i18next')) {
              return 'app-vendor'
            }
          },
        },
      },
    },
    server: {
      host,
      port,
      allowedHosts: ['openclaw.xdtech.xyz'],
      watch: {
        usePolling: env.CHOKIDAR_USEPOLLING === 'true',
        interval: Number(env.CHOKIDAR_INTERVAL || 300),
      },
      hmr: hmrHost
        ? {
            host: hmrHost,
            port: hmrPort,
          }
        : undefined,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
