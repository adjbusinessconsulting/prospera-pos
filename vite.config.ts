import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Preview (dev) builds install as a SEPARATE app: plain "POS" with the muted
// dev icon, so a dev copy on the home screen is never mistaken for the real one
// sitting next to it. Vercel sets VERCEL_ENV to 'preview' for branch deploys.
const isDev = process.env.VERCEL_ENV === 'preview'
const appName = isDev ? 'POS' : 'Sterith POS'
const appIcon = isDev ? 'icon-dev-512.png' : 'icon-512.png'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icon-512.png', 'icon-dev-512.png', 'splash-logo.png'],
      manifest: {
        name: appName,
        short_name: appName,
        description: isDev ? 'POS — lingkungan pengembangan' : 'Point of Sale untuk bisnis Anda',
        theme_color: '#0D1117',
        background_color: '#0D1117',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: appIcon, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: appIcon, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: appIcon, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
