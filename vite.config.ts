import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  // Caminho relativo: funciona tanto em GitHub Pages (repo em subpasta,
  // ex. https://usuario.github.io/nexlab/) quanto em domínio próprio,
  // sem precisar saber o nome do repositório antecipadamente.
  base: './',
  plugins: [
    react(),
    VitePWA({
      // 'prompt': o service worker novo fica esperando confirmação em vez
      // de assumir sozinho — o app mostra um toast ("Nova versão
      // disponível") via `src/lib/pwa.ts` e só troca quando o usuário
      // clicar. Evita recarregar a página no meio de alguém preenchendo
      // uma OS.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'NexLab',
        short_name: 'NexLab',
        description: 'Gestão de Ordens de Serviço e Financeiro para laboratórios de próteses dentárias.',
        lang: 'pt-BR',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0e7c79', // brand-600 (src/index.css)
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cobre os assets do build (JS/CSS/HTML/ícones) + as fontes Inter
        // locais (woff2, não incluídas no padrão do plugin) — cache do
        // "esqueleto" do app pra abrir rápido e funcionar como app
        // instalado. Chamadas ao Supabase (outra origem) nunca são
        // interceptadas pelo service worker: preciso de dado sempre
        // fresco, nunca cacheado — não existe `runtimeCaching` pra elas
        // de propósito.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
