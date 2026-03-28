import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

const VALID_LOG_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'silent'])

const resolveClientLogLevel = (mode) => {
  const modeDefaults = {
    development: 'debug',
    production: 'warn',
    test: 'silent'
  }

  const fallbackLevel = modeDefaults[mode] ?? 'warn'
  const overrideLevel = process.env.VITE_LOG_LEVEL?.toLowerCase()
  if (overrideLevel && VALID_LOG_LEVELS.has(overrideLevel)) {
    return overrideLevel
  }

  return fallbackLevel
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const clientLogLevel = resolveClientLogLevel(mode)

  return {
    plugins: [
      tailwindcss(),
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    define: {
      __APP_LOG_LEVEL__: JSON.stringify(clientLogLevel)
    }
  }
})
