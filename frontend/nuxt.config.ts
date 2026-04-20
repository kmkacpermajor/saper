import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/main.css"],

  app: {
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
      wsUrl: "ws://localhost:8085"
    }
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        'pixi.js',
        '@saper/contracts',
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