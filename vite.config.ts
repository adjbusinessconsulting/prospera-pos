import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Preview (dev) builds install as a SEPARATE app: plain "POS" with the muted
// dev icon, so a dev copy on the home screen is never mistaken for the real one
// sitting next to it. Vercel sets VERCEL_ENV to 'preview' for branch deploys.
const isDev = process.env.VERCEL_ENV === 'preview'
const appName = isDev ? 'POS' : 'Sterith POS'
// Same 2.0 mark either way — the dev build wears it in slate rather than gold, so
// which app it is and which environment it is are both readable at a glance.
const appIcon = isDev ? 'icon-dev-v2-512.png' : 'icon-v2-512.png'
// Maskable needs a FULL-BLEED square: the OS applies its own mask and assumes the
// art reaches the edges. Feeding it the rounded badge crops inside its own corners
// and leaves transparent slivers, so both point at purpose-built files.
const maskIcon = isDev ? 'icon-dev-v2-maskable-512.png' : 'icon-v2-maskable-512.png'
// 192px for the tab: a 512 favicon is downscaled by the browser every paint.
const favIcon = isDev ? 'icon-dev-v2-192.png' : 'icon-v2-192.png'

export default defineConfig({
  // Lets the app itself know it's a dev build — used to expose the store
  // switcher, which must never appear in a customer's POS.
  define: { __STERITH_DEV__: JSON.stringify(isDev) },
  plugins: [
    react(),
    // iOS ignores the manifest icons for "Add to Home Screen" and uses
    // apple-touch-icon instead — so an iPhone kept installing the OLD icon no
    // matter what the manifest said. index.html is static and cannot branch on
    // VERCEL_ENV, so the tag is rewritten at build time to match the manifest.
    {
      name: 'sterith-apple-touch-icon',
      transformIndexHtml(html: string) {
        return html
          .replace(
            /<link rel="apple-touch-icon"[^>]*>/,
            `<link rel="apple-touch-icon" href="/${appIcon}" />`,
          )
          // The browser-tab favicon was still Vite's default purple lightning
          // bolt — POS never got its own, so every tab and taskbar entry showed
          // the starter template's logo next to the name "Sterith POS".
          .replace(
            /<link rel="icon"[^>]*>/,
            `<link rel="icon" type="image/png" href="/${favIcon}" />`,
          )
      },
    },
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icon-512.png', 'icon-dev-512.png', 'icon-v2-512.png', 'icon-v2-maskable-512.png', 'icon-dev-v2-512.png', 'icon-dev-v2-maskable-512.png', 'icon-v2-192.png', 'icon-dev-v2-192.png', 'splash-logo.png'],
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
          { src: maskIcon, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
