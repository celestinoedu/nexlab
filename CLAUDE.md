# CLAUDE.md — Convenções do projeto NexLab

Este arquivo orienta qualquer sessão futura (IA ou humana) trabalhando neste repositório. Leia também `docs/architecture.md`, `docs/database-schema.md`, `docs/business-rules.md`, `docs/design-system.md` e `docs/roadmap.md` antes de implementar algo novo — eles são a fonte de verdade, este arquivo é só o resumo/índice.

## O que é o NexLab

ERP simples para laboratórios de próteses dentárias, desenvolvido pela **Lotus Negócios LTDA** e vendido por assinatura através da landing page da Lotus (repositório separado, `github.com/celestinoedu/lotus`). O **GRS Lab** foi o primeiro cliente (piloto) e segue em produção; desde a v0.14.0 (migration `0010_multi_tenant.sql`) o sistema é **multi-tenant**: um único projeto Supabase compartilhado atende vários clientes, cada um isolado dos demais por `empresa_id` + RLS (ver `docs/database-schema.md` § Multi-tenant) — nunca um projeto Supabase por cliente (esbarraria no limite de projetos gratuitos do plano Free, violando a restrição #1 abaixo). Um cliente novo é provisionado internamente pela Lotus através da Edge Function protegida `provision-client` (ver `docs/kit-boas-vindas.md`); o procedimento SQL em `SETUP.md` permanece como contingência.

Dois módulos centrais: **Ordens de Serviço (OS)** (Kanban/Lista, uma OS pode ter vários serviços/itens) e **Financeiro** (Contas a Receber, fechamento mensal, comissões de Parceiros). Usuário final é leigo em tecnologia — **prioridade #1 é sempre simplicidade de uso**, não sofisticação técnica.

## Restrições inegociáveis (não reabrir sem o usuário pedir)

1. **100% free tier.** Supabase (plano gratuito) + GitHub Pages. Nenhuma dependência, serviço ou API paga — nem mesmo "free trial que vira pago depois". Antes de adicionar qualquer serviço externo novo, confirme que ele tem uso gratuito permanente compatível com o volume de um laboratório pequeno/médio.
2. **Sem backend próprio.** O frontend (SPA estática) fala direto com o Supabase (Postgres + Auth + Storage) via `@supabase/supabase-js`. Não criar servidor Node/API própria.
3. **Hospedagem: GitHub Pages.** `vite.config.ts` usa `base: './'` (caminho relativo) de propósito — não trocar para caminho absoluto sem necessidade, e roteamento é `HashRouter` (não `BrowserRouter`) porque GitHub Pages não faz rewrite de rotas SPA.
4. **Autenticação: e-mail + senha via Supabase Auth**, sessão persistente no navegador. Sem cadastro público — usuários são criados via convite/painel Supabase (perfil interno em `profiles`).
5. **Preços/comissão por entidade × serviço** (tabela `tabela_precos`), nunca uma regra de % genérica automática — cada Cliente/Parceiro tem sua própria tabela negociada (ver `docs/business-rules.md`).
6. **Fechamento financeiro = mês cheio**, sempre dia 1 ao último dia do mês (coluna `mes_referencia` calculada em `ordens_servico`).
7. **Terminologia: "Ordem de Serviço" (OS), nunca "demanda"** — em código, telas e docs. Uma OS pode ter vários serviços (itens), cada um com cor/arco/valor próprios (ver `docs/business-rules.md`).

## Stack

Vite + React 18 + TypeScript · Tailwind CSS v4 (config CSS-first, tokens em `src/index.css`) · componentes estilo shadcn/ui feitos à mão sobre Radix UI (`src/components/ui/`) · react-router-dom v6 (`HashRouter`) · @supabase/supabase-js v2 · TanStack Query v5 · react-hook-form + zod · @dnd-kit (Kanban) · @react-pdf/renderer (PDFs) · lucide-react · sonner.

Detalhes e justificativas em `docs/architecture.md`.

## Estrutura de pastas

```
src/
├── app/            # bootstrap: rotas, providers, layout (Sidebar/Topbar/ProtectedRoute)
├── features/       # um módulo de negócio por pasta (auth, ordens-servico, entidades, servicos, financeiro, relatorios)
├── components/ui/  # primitivas visuais reutilizáveis (padrão shadcn/ui)
├── components/shared/  # componentes compostos reutilizáveis entre features (Logo, EmConstrucao...)
├── lib/            # supabase.ts, utils.ts, pdf/
├── hooks/          # hooks de dados compartilhados (useEntidades, useServicos, useEmpresaConfig...)
└── types/          # supabase.ts (tipos gerados do banco)
```

Toda tela nova de negócio entra em `src/features/<modulo>/`, não direto em `src/app/`.

## Identidade visual

**Nunca** usar cor solta (hex direto) em componente — sempre a classe utilitária do token correspondente (`bg-brand-600`, `text-danger-500`, etc., definidos em `src/index.css` @theme). Regras completas de cor, tipografia, tom de voz e componentes em `docs/design-system.md`. Idioma da interface: português direto, sem jargão técnico, verbos de ação claros nos botões.

## Banco de dados

Schema completo versionado em `supabase/migrations/`. Nunca editar uma migration já aplicada — sempre criar uma nova (`0003_*.sql` etc.) e atualizar `docs/database-schema.md` junto. `supabase/seed.sql` tem o **catálogo real de serviços e preços da GRS Lab** (fornecido pelo cliente — PDF original mantido só localmente em `docs/assets/lista-preco/`, não versionado por ser um asset binário, mas os dados em si estão aprovados para ficar públicos no `seed.sql`). Os relatórios de comissão de exemplo dos parceiros ficam só localmente em `docs/assets/relatorios-exemplo/` — **não versionados**, pois contêm nomes de pacientes de terceiros; ver `.gitignore`.

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
- Não adicionar telas com múltiplos passos/wizards para operações simples (criar/editar OS deve ser sempre 1 modal, 1 tela — mesmo com múltiplos itens de serviço).
