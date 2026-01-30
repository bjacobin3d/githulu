// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  // Dev server port (Electron expects 3456)
  devServer: {
    port: 3456,
  },

  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vueuse/nuxt'],

  css: ['~/assets/css/main.css'],

  app: {
    baseURL: './', // For file:// protocol in Electron
    buildAssetsDir: '_nuxt/', // Relative assets path
    cdnURL: '', // No CDN
    head: {
      title: 'githulu',
      meta: [{ name: 'description', content: 'A local-first Git desktop client for macOS' }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Satoshi:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
  },

  typescript: {
    strict: true,
    typeCheck: false, // Disable in dev for faster startup
  },

  // SSR must be disabled for Electron
  ssr: false,

  // Configure for Electron file:// protocol in production
  vite: {
    build: {
      target: 'esnext',
    },
  },

  // Static generation settings
  nitro: {
    preset: 'static',
    output: {
      publicDir: '.output/public',
    },
  },

  // Use hash router for file:// protocol compatibility
  router: {
    options: {
      hashMode: true,
    },
  },

  compatibilityDate: '2024-01-15',
});
