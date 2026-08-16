import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Gera os ícones do app (192/512/maskable/apple-touch-icon) a partir do
// mesmo favicon.svg já usado na aba do navegador — mantém a identidade
// visual consistente entre a aba e o ícone na tela inicial do celular.
// Rodar com `npx pwa-assets-generator` sempre que `public/favicon.svg`
// mudar; os arquivos gerados ficam em `public/` e são versionados.
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/favicon.svg'],
})
