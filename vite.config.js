import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false
      },
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'REBOOT_GATE',
        short_name: 'REBOOT',
        description: 'SF密室脱出 × DJコンソール — 音を重ねてゲートを開け',
        theme_color: '#050505',
        background_color: '#050505',
        display: 'fullscreen',
        orientation: 'landscape',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        }
      }
    }
  }
});
