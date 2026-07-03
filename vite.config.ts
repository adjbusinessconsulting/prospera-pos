import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'app-banner-reference.png'],
      manifest: {
        name: 'Sterith POS',
        short_name: 'Sterith POS',
        description: 'Point of Sale untuk bisnis Anda',
        theme_color: '#0B1129',
        background_color: '#0D0D0D',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'app-banner-reference.png', sizes: '192x192', type: 'image/png' },
          { src: 'app-banner-reference.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
