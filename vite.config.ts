import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  // Caminho relativo: funciona tanto em GitHub Pages (repo em subpasta,
  // ex. https://usuario.github.io/nexlab/) quanto em domínio próprio,
  // sem precisar saber o nome do repositório antecipadamente.
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
