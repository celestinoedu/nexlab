# CLAUDE.md — Convenções do projeto NexLab

Este arquivo orienta qualquer sessão futura (IA ou humana) trabalhando neste repositório. Leia também `docs/architecture.md`, `docs/database-schema.md`, `docs/business-rules.md`, `docs/design-system.md` e `docs/roadmap.md` antes de implementar algo novo — eles são a fonte de verdade, este arquivo é só o resumo/índice.

## O que é o NexLab

ERP simples para o **GRS Lab**, laboratório de próteses dentárias. Dois módulos centrais: **Demandas** (Kanban/Lista das ordens de serviço) e **Financeiro** (Contas a Receber, fechamento mensal, comissões de Parceiros). Usuário final é leigo em tecnologia — **prioridade #1 é sempre simplicidade de uso**, não sofisticação técnica.

## Restrições inegociáveis (não reabrir sem o usuário pedir)

1. **100% free tier.** Supabase (plano gratuito) + GitHub Pages. Nenhuma dependência, serviço ou API paga — nem mesmo "free trial que vira pago depois". Antes de adicionar qualquer serviço externo novo, confirme que ele tem uso gratuito permanente compatível com o volume de um laboratório pequeno/médio.
2. **Sem backend próprio.** O frontend (SPA estática) fala direto com o Supabase (Postgres + Auth + Storage) via `@supabase/supabase-js`. Não criar servidor Node/API própria.
3. **Hospedagem: GitHub Pages.** `vite.config.ts` usa `base: './'` (caminho relativo) de propósito — não trocar para caminho absoluto sem necessidade, e roteamento é `HashRouter` (não `BrowserRouter`) porque GitHub Pages não faz rewrite de rotas SPA.
4. **Autenticação: e-mail + código de 6 dígitos (OTP), sem senha**, via Supabase Auth (`signInWithOtp`/`verifyOtp`, `shouldCreateUser: false`), sessão persistente no navegador. Sem cadastro público — usuários são criados via convite/painel Supabase (perfil interno em `profiles`). Decisão tomada em 2026-08-09 (substituiu e-mail+senha da v0.1.x) por ser mais simples para o usuário leigo: sem senha para lembrar, sem fluxo de "esqueci a senha". Requer customizar o template de e-mail "Magic Link" no painel Supabase para exibir `{{ .Token }}` em vez do link — ver `SETUP.md`.
5. **Preços/comissão por entidade × serviço** (tabela `tabela_precos`), nunca uma regra de % genérica automática — cada Cliente/Parceiro tem sua própria tabela negociada (ver `docs/business-rules.md`).
6. **Fechamento financeiro = mês cheio**, sempre dia 1 ao último dia do mês (coluna `mes_referencia` calculada em `demandas`).

## Stack

Vite + React 18 + TypeScript · Tailwind CSS v4 (config CSS-first, tokens em `src/index.css`) · componentes estilo shadcn/ui feitos à mão sobre Radix UI (`src/components/ui/`) · react-router-dom v6 (`HashRouter`) · @supabase/supabase-js v2 · TanStack Query v5 · react-hook-form + zod · @dnd-kit (Kanban) · @react-pdf/renderer (PDFs) · lucide-react · sonner.

Detalhes e justificativas em `docs/architecture.md`.

## Estrutura de pastas

```
src/
├── app/            # bootstrap: rotas, providers, layout (Sidebar/Topbar/ProtectedRoute)
├── features/       # um módulo de negócio por pasta (auth, demandas, entidades, servicos, financeiro, relatorios)
├── components/ui/  # primitivas visuais reutilizáveis (padrão shadcn/ui)
├── components/shared/  # componentes compostos reutilizáveis entre features (Logo, EmConstrucao...)
├── lib/            # supabase.ts, utils.ts, pdf/
├── hooks/          # hooks de dados por entidade (useDemandas, useEntidades...)
└── types/          # supabase.ts (tipos gerados do banco)
```

Toda tela nova de negócio entra em `src/features/<modulo>/`, não direto em `src/app/`.

## Identidade visual

**Nunca** usar cor solta (hex direto) em componente — sempre a classe utilitária do token correspondente (`bg-brand-600`, `text-danger-500`, etc., definidos em `src/index.css` @theme). Regras completas de cor, tipografia, tom de voz e componentes em `docs/design-system.md`. Idioma da interface: português direto, sem jargão técnico, verbos de ação claros nos botões.

## Banco de dados

Schema completo versionado em `supabase/migrations/`. Nunca editar uma migration já aplicada — sempre criar uma nova (`0002_*.sql` etc.) e atualizar `docs/database-schema.md` junto. `supabase/seed.sql` tem o catálogo de serviços de exemplo (extraído dos relatórios reais dos parceiros, mantidos só localmente em `docs/assets/relatorios-exemplo/` — **não versionados**, pois contêm nomes de pacientes de terceiros e o repositório é público; ver `.gitignore`).

## Versionamento

- SemVer no `package.json` (`0.1.0`, `0.2.0`...). Cada marco relevante = nova entrada no `CHANGELOG.md` (formato Keep a Changelog) + bump de versão + `git tag vX.Y.Z`.
- Commits em português, diretos, no padrão `tipo: descrição` (`feat:`, `fix:`, `docs:`, `chore:`).
- Antes de finalizar uma sessão de trabalho, atualizar `docs/roadmap.md` com o que foi concluído.

## Comandos

```bash
npm run dev       # servidor local
npm run build     # type-check (tsc -b) + build de produção em dist/
npm run preview   # serve o build de produção localmente
npm run lint       # oxlint
```

## Setup local / deploy

Passo a passo completo (criar projeto Supabase, variáveis de ambiente, GitHub Pages) em `SETUP.md`. Resumo: copiar `.env.example` para `.env.local`, preencher `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, rodar as migrations de `supabase/migrations/` no projeto Supabase.

## O que NÃO fazer

- Não trocar GitHub Pages por Vercel/Netlify/outro host sem o usuário pedir explicitamente (já foi decidido e confirmado).
- Não introduzir um backend/API própria "para simplificar" — vai contra a decisão de arquitetura.
- Não usar bibliotecas de UI de tema fechado (Chakra, Mantine, MUI) — a identidade visual é própria, construída sobre Radix.
- Não adicionar telas com múltiplos passos/wizards para operações simples (criar/editar demanda deve ser sempre 1 modal, 1 tela).
