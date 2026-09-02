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

A única função server-side é uma integração operacional da própria marca, fora dos fluxos do ERP: `publish-instagram`, executada no Supabase Edge Functions pelo Cron para publicar conteúdo sem expor o token da Meta. Ela não intermedeia o navegador nem muda a arquitetura do produto; usa infraestrutura já incluída no Supabase.

## Por que essa arquitetura (restrição: 100% free tier)

O projeto tem uma restrição inegociável: **nenhuma ferramenta paga**. Isso descarta qualquer host com plano "free trial" (Vercel/Netlify continuam gratuitos indefinidamente para este uso, mas o usuário optou por GitHub Pages, que também é gratuito indefinidamente) e qualquer backend gerenciado pago. A combinação SPA estática + Supabase Free cobre 100% dos requisitos sem custo:

| Necessidade | Solução gratuita |
|---|---|
| Hospedagem do frontend | GitHub Pages (ilimitado para repositórios públicos/privados de conta pessoal) |
| Banco de dados | Supabase Postgres, plano Free (500 MB de banco, mais que suficiente para o volume de um laboratório) |
| Autenticação | Supabase Auth, plano Free (50.000 usuários ativos/mês — o GRS Lab usa poucos usuários internos) |
| Arquivos (logo, futuros anexos) | Supabase Storage, plano Free (1 GB) |
| CI/CD | GitHub Actions (2.000 minutos/mês grátis, suficiente para builds de um projeto deste porte) |
| Automação editorial | Supabase Cron + Edge Functions, dentro das cotas do plano Free |

**Atenção operacional:** o Supabase Free **pausa o projeto após ~1 semana sem nenhuma requisição**. Se o GRS Lab ficar dias sem abrir o sistema, o primeiro acesso pode demorar ~1 minuto para "acordar" o banco, ou pode ser necessário reativar manualmente pelo painel Supabase. Isso está documentado em `SETUP.md` — não é um bug do NexLab.

## Por que sem backend próprio

Um backend Node/API própria exigiria hospedagem própria (a maioria dos hosts gratuitos de backend tem cold-start ou limites mais agressivos que o Supabase) e mais uma camada para manter — contra o objetivo de simplicidade para um cliente sem equipe técnica. O Supabase já oferece: banco relacional real (Postgres), autenticação pronta, controle de acesso via RLS (equivalente a "regras de negócio de acesso" que normalmente ficariam num backend) e geração de tipos TypeScript a partir do schema. Regras de negócio que não são "quem pode acessar o quê" (ex.: numeração automática de Nota de Serviço, cálculo de `mes_referencia`) ficam em **triggers/colunas geradas do próprio Postgres** (ver migration `0001_init.sql`) — não em código de servidor.

## Por que GitHub Pages + `HashRouter` + `base: './'`

GitHub Pages serve arquivos estáticos e **não faz rewrite de URL** (ex.: acessar `/financeiro` diretamente devolveria 404, pois não existe esse arquivo). Duas formas de contornar isso: um `404.html` que redireciona para `index.html`, ou rotear com `HashRouter` (URLs como `/#/financeiro`, que o navegador nunca envia ao servidor — sempre pede só `index.html`). Optamos por `HashRouter`: mais simples, sem hacks de redirecionamento, sem risco de piscar a tela em cada navegação.

Convites e recuperações do Supabase no fluxo implícito também retornam credenciais no fragmento da URL. Como esse é o mesmo espaço usado pelo `HashRouter`, `src/features/auth/authCallback.ts` aguarda o Supabase consumir a sessão **antes** de montar o React e substitui o fragmento pela rota `/redefinir-senha`. Retornos inválidos ou expirados seguem para o login com orientação; a rota curinga impede que qualquer endereço desconhecido renderize uma tela vazia.

`vite.config.ts` usa `base: './'` (caminho relativo) em vez de `/nome-do-repo/`: isso faz os assets (JS/CSS/fontes) resolverem corretamente **independente do nome do repositório ou de estar num subpath** (`usuario.github.io/nexlab/`) ou domínio próprio no futuro — sem precisar reconfigurar nada no build.

### Cache do `index.html` no GitHub Pages — tela em branco após deploy

O GitHub Pages serve `index.html` com `Cache-Control: max-age=600` (10 min), sem forma de configurar isso (não há suporte a `_headers` como Netlify/Vercel). Cada build gera nomes de arquivo novos pro JS/CSS (hash de conteúdo) — se alguém abrir o app com um `index.html` antigo ainda em cache (comum logo depois de um deploy, e mais ainda no celular, onde o navegador/operadora costuma cachear mais agressivamente), o `<script>` vai apontar pra um arquivo que já não existe mais → falha silenciosa de carregamento → **tela em branco depois do login, sem erro visível** (foi um bug real, ver `CHANGELOG.md` v0.7.5).

Mitigado com um script inline em `index.html` (antes da tag do módulo, preservado pelo Vite no build): ele escuta falha de carregamento de `<script>` e recarrega a página com uma query string nova (`?v=<timestamp>`), que nunca está em cache — nunca mais que uma vez por sessão de aba (guard via `sessionStorage`, limpo em `main.tsx` assim que o app monta com sucesso). Não elimina o cache de 10 min do GitHub Pages, mas faz o app se recuperar sozinho em vez de precisar o usuário saber que tem que dar Ctrl+Shift+R.

Esse bug de cache é diferente do que motivou o `ErrorBoundary` (`src/components/shared/ErrorBoundary.tsx`, v0.16.4): aquele é sobre a **tela de login nem carregar**; o `ErrorBoundary` cobre uma exceção de render depois do login já ter funcionado — outra causa, mesmo sintoma (tela branca), tratada à parte.

## PWA — app instalável sem loja (v0.17.0)

`vite-plugin-pwa` gera `manifest.webmanifest` + service worker no build (`vite.config.ts`), permitindo "Adicionar à Tela de Início" no Android e iOS/Safari — ícone próprio, abre em tela cheia sem barra do navegador. Decisão registrada: **PWA em vez de app nativo em loja** (Google Play/App Store via Capacitor) — o modelo de vendas do NexLab guia o cliente direto pro link pela Lotus, então não há ganho de descoberta em estar listado numa loja, só o custo recorrente (US$99/ano só de taxa da Apple) e a barreira de precisar de um Mac/Xcode pra build iOS. Ver `docs/roadmap.md` § Fase 10.

Dois pontos importantes na configuração:
- **`registerType: 'prompt'`**: o service worker novo nunca assume sozinho — o app mostra um toast ("Nova versão do NexLab disponível") via `src/lib/pwa.ts` e só troca quando o usuário clicar em "Atualizar". Evita recarregar a página no meio de alguém preenchendo uma OS.
- **Nenhum `runtimeCaching`** é configurado pro domínio do Supabase — o service worker só pré-cacheia o "esqueleto" estático do app (JS/CSS/HTML/ícones/fontes, `globPatterns` em `vite.config.ts`). Toda chamada ao Supabase (outra origem) passa direto pela rede, nunca pelo cache — dado sempre fresco, como já era antes do PWA.

Os ícones (`public/pwa-*.png`, `apple-touch-icon-180x180.png`, `maskable-icon-512x512.png`, `favicon.ico`) foram gerados a partir do `favicon.svg` já existente via `@vite-pwa/assets-generator` (config em `pwa-assets.config.ts`, raiz do projeto). Essa ferramenta não é dependência permanente do projeto — só `vite-plugin-pwa` fica no `package.json`; pra gerar os ícones de novo (se o `favicon.svg` mudar), rodar `npm install -D @vite-pwa/assets-generator && npx pwa-assets-generator` e desinstalar de novo depois.

## Por que Supabase client direto do frontend (sem proxy)

A `anon key` do Supabase é **pública por design** (é enviada ao navegador de qualquer forma) — a segurança real está nas policies de RLS no Postgres, não em esconder a key. Isso é o modelo recomendado pelo próprio Supabase para SPAs sem backend. Ver `docs/database-schema.md` § RLS para as regras aplicadas.

## Por que shadcn/ui "copiado" em vez de uma lib de componentes pronta

O usuário pediu uma identidade visual **criada do zero**, não um tema genérico de terceiro. Bibliotecas como Chakra/Mantine/MUI trazem um sistema de tema próprio que "vaza" na aparência final. O padrão shadcn/ui usa **primitivas sem estilo** (Radix UI — acessibilidade e comportamento prontos) e o código dos componentes visuais vive dentro do próprio repo (`src/components/ui/`), estilizado 100% com os tokens de `docs/design-system.md`. Isso dá controle total da aparência sem reinventar comportamento de acessibilidade (foco, teclado, ARIA) do zero.

## Geração de PDF (Relatório de Fechamento / Nota de Serviço)

100% client-side com `@react-pdf/renderer` — sem função serverless. O navegador do usuário monta o PDF localmente a partir dos dados já carregados via Supabase e oferece para download/impressão. Consistente com "sem backend próprio" e "free tier".

## CI/CD

`.github/workflows/deploy.yml`: a cada push na branch `main`, o GitHub Actions builda o projeto (`npm run build`) injetando `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` a partir de **GitHub Secrets** (evita hardcodar no repo, mesmo sendo uma chave "pública por design" — boa prática) e publica `dist/` no GitHub Pages via `actions/deploy-pages`. Requer habilitar Settings → Pages → Source = "GitHub Actions" no repositório (passo manual, documentado em `SETUP.md`).

## Débitos técnicos conhecidos (não bloqueiam a Fase 1)

- Bundle JS inicial ~257 KB gzip. `@react-pdf/renderer` (a lib mais pesada do projeto, ~471 KB gzip) já está isolada num chunk separado via `import()` dinâmico dentro de `OrdensServicoPage.tsx` — só carrega quando alguém realmente baixa um PDF, não pesa no login/carregamento inicial. Mesmo padrão vale para futuros PDFs da Fase 4 (Relatório de Fechamento, Nota de Serviço). Quando Financeiro/Relatórios forem implementados, considerar `React.lazy` por rota também para o restante do bundle.
- Sem modo escuro — não é requisito do usuário; os tokens de cor em `src/index.css` já estão isolados o suficiente para adicionar depois sem retrabalho, se pedido.
