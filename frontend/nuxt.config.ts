import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/main.css"],
  // debug: true,

  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
    },
    pageTransition: {
      name: "page",
      mode: "out-in"
    }
  },

  alias: {
    "@": "./app"
  },

  runtimeConfig: {
    public: {
      wsUrl: "ws://localhost:8085" // można nadpisać przez środowisko (NUXT_PUBLIC_WS_URL)
    }
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        'pixi.js',
        '@saper/contracts',
        'vue-qr'
      ]
    }
  },

  modules: [
    "@nuxt/eslint",
    "@nuxt/hints",
    "@nuxt/scripts",
    "@pinia/nuxt"
  ]
});