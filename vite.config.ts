import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const pkgJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version?: string
}
const buildTime = new Date().toISOString()

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
