import react from '@vitejs/plugin-react'
import process from 'node:process'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Beach Athlete',
        short_name: 'Beach Athlete',
        description: 'Dein Training und deine Beachvolleyball-Spieltage',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0c0c0c',
        theme_color: '#0c0c0c',
        lang: 'de',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
})
