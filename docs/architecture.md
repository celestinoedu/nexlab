# NexLab — Arquitetura

## Visão geral

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│   Navegador (SPA estática)   │        │           Supabase            │
│                              │  HTTPS │  (plano Free)                 │
│  React + Vite, hospedado no  │◄──────►│  • Postgres (dados + RLS)     │
│  GitHub Pages                │        │  • Auth (e-mail + senha)      │
│                              │        │  • Storage (logo, anexos)     │
└─────────────────────────────┘        └──────────────────────────────┘
```

Não existe backend próprio. O navegador do usuário fala **diretamente** com o Supabase usando a chave pública (`anon key`) via `@supabase/supabase-js`; toda a segurança de acesso a dado fica a cargo do **Row Level Security (RLS)** do Postgres (ver `docs/database-schema.md`), não de um servidor intermediário.

## Por que essa arquitetura (restrição: 100% free tier)

O projeto tem uma restrição inegociável: **nenhuma ferramenta paga**. Isso descarta qualquer host com plano "free trial" (Vercel/Netlify continuam gratuitos indefinidamente para este uso, mas o usuário optou por GitHub Pages, que também é gratuito indefinidamente) e qualquer backend gerenciado pago. A combinação SPA estática + Supabase Free cobre 100% dos requisitos sem custo:

| Necessidade | Solução gratuita |
|---|---|
| Hospedagem do frontend | GitHub Pages (ilimitado para repositórios públicos/privados de conta pessoal) |
| Banco de dados | Supabase Postgres, plano Free (500 MB de banco, mais que suficiente para o volume de um laboratório) |
| Autenticação | Supabase Auth, plano Free (50.000 usuários ativos/mês — o GRS Lab usa poucos usuários internos) |
| Arquivos (logo, futuros anexos) | Supabase Storage, plano Free (1 GB) |
| CI/CD | GitHub Actions (2.000 minutos/mês grátis, suficiente para builds de um projeto deste porte) |

**Atenção operacional:** o Supabase Free **pausa o projeto após ~1 semana sem nenhuma requisição**. Se o GRS Lab ficar dias sem abrir o sistema, o primeiro acesso pode demorar ~1 minuto para "acordar" o banco, ou pode ser necessário reativar manualmente pelo painel Supabase. Isso está documentado em `SETUP.md` — não é um bug do NexLab.

## Por que sem backend próprio

Um backend Node/API própria exigiria hospedagem própria (a maioria dos hosts gratuitos de backend tem cold-start ou limites mais agressivos que o Supabase) e mais uma camada para manter — contra o objetivo de simplicidade para um cliente sem equipe técnica. O Supabase já oferece: banco relacional real (Postgres), autenticação pronta, controle de acesso via RLS (equivalente a "regras de negócio de acesso" que normalmente ficariam num backend) e geração de tipos TypeScript a partir do schema. Regras de negócio que não são "quem pode acessar o quê" (ex.: numeração automática de Nota de Serviço, cálculo de `mes_referencia`) ficam em **triggers/colunas geradas do próprio Postgres** (ver migration `0001_init.sql`) — não em código de servidor.

## Por que GitHub Pages + `HashRouter` + `base: './'`

GitHub Pages serve arquivos estáticos e **não faz rewrite de URL** (ex.: acessar `/demandas` diretamente devolveria 404, pois não existe esse arquivo). Duas formas de contornar isso: um `404.html` que redireciona para `index.html`, ou rotear com `HashRouter` (URLs como `/#/demandas`, que o navegador nunca envia ao servidor — sempre pede só `index.html`). Optamos por `HashRouter`: mais simples, sem hacks de redirecionamento, sem risco de piscar a tela em cada navegação.

`vite.config.ts` usa `base: './'` (caminho relativo) em vez de `/nome-do-repo/`: isso faz os assets (JS/CSS/fontes) resolverem corretamente **independente do nome do repositório ou de estar num subpath** (`usuario.github.io/nexlab/`) ou domínio próprio no futuro — sem precisar reconfigurar nada no build.

## Por que Supabase client direto do frontend (sem proxy)

A `anon key` do Supabase é **pública por design** (é enviada ao navegador de qualquer forma) — a segurança real está nas policies de RLS no Postgres, não em esconder a key. Isso é o modelo recomendado pelo próprio Supabase para SPAs sem backend. Ver `docs/database-schema.md` § RLS para as regras aplicadas.

## Por que shadcn/ui "copiado" em vez de uma lib de componentes pronta

O usuário pediu uma identidade visual **criada do zero**, não um tema genérico de terceiro. Bibliotecas como Chakra/Mantine/MUI trazem um sistema de tema próprio que "vaza" na aparência final. O padrão shadcn/ui usa **primitivas sem estilo** (Radix UI — acessibilidade e comportamento prontos) e o código dos componentes visuais vive dentro do próprio repo (`src/components/ui/`), estilizado 100% com os tokens de `docs/design-system.md`. Isso dá controle total da aparência sem reinventar comportamento de acessibilidade (foco, teclado, ARIA) do zero.

## Geração de PDF (Relatório de Fechamento / Nota de Serviço)

100% client-side com `@react-pdf/renderer` — sem função serverless. O navegador do usuário monta o PDF localmente a partir dos dados já carregados via Supabase e oferece para download/impressão. Consistente com "sem backend próprio" e "free tier".

## CI/CD

`.github/workflows/deploy.yml`: a cada push na branch `main`, o GitHub Actions builda o projeto (`npm run build`) injetando `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` a partir de **GitHub Secrets** (evita hardcodar no repo, mesmo sendo uma chave "pública por design" — boa prática) e publica `dist/` no GitHub Pages via `actions/deploy-pages`. Requer habilitar Settings → Pages → Source = "GitHub Actions" no repositório (passo manual, documentado em `SETUP.md`).

## Débitos técnicos conhecidos (não bloqueiam a Fase 1)

- Bundle JS inicial ~214 KB gzip — aceitável para uma ferramenta interna, mas quando os módulos de Demandas/Financeiro/Relatórios (que trazem `@dnd-kit` e `@react-pdf/renderer`) forem implementados, considerar `React.lazy` por rota para não crescer o carregamento inicial da tela de login.
- Sem modo escuro — não é requisito do usuário; os tokens de cor em `src/index.css` já estão isolados o suficiente para adicionar depois sem retrabalho, se pedido.
