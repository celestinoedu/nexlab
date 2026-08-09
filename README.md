# NexLab

Sistema de gestão de demandas e financeiro para o **GRS Lab** (laboratório de próteses dentárias). SPA em React + Supabase, hospedada no GitHub Pages, 100% em plano gratuito.

> Documentação completa do projeto: [`CLAUDE.md`](./CLAUDE.md) (índice/convenções), [`docs/architecture.md`](./docs/architecture.md), [`docs/database-schema.md`](./docs/database-schema.md), [`docs/business-rules.md`](./docs/business-rules.md), [`docs/design-system.md`](./docs/design-system.md), [`docs/ux-flows.md`](./docs/ux-flows.md), [`docs/roadmap.md`](./docs/roadmap.md).

## Stack

Vite + React + TypeScript · Tailwind CSS v4 · componentes estilo shadcn/ui sobre Radix UI · react-router-dom (`HashRouter`) · Supabase (Postgres + Auth + Storage) · TanStack Query · react-hook-form + zod · @dnd-kit · @react-pdf/renderer.

## Rodando localmente

Pré-requisitos: Node 20+ e um projeto Supabase (gratuito) já criado — veja [`SETUP.md`](./SETUP.md) para o passo a passo completo, incluindo como rodar as migrations.

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build` | Type-check (`tsc -b`) + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção localmente, para conferir antes de publicar |
| `npm run lint` | Lint com oxlint |

## Deploy

Automático: todo push na branch `main` builda e publica em GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`). Configuração inicial (secrets, habilitar Pages) em [`SETUP.md`](./SETUP.md).

## Estrutura do projeto

```
src/
├── app/            # rotas, providers, layout (Sidebar/Topbar/ProtectedRoute)
├── features/       # um módulo de negócio por pasta
├── components/ui/  # componentes visuais base (padrão shadcn/ui)
├── components/shared/
├── lib/            # supabase.ts, utils.ts, pdf/
├── hooks/
└── types/
supabase/
├── migrations/     # schema versionado (SQL)
└── seed.sql        # catálogo de serviços de exemplo
docs/               # documentação do projeto (arquitetura, schema, design system, roadmap)
```
