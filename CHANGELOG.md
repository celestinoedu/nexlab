# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [0.2.0] - 2026-08-09 — Login por código de e-mail (sem senha)

### Alterado
- Autenticação trocada de e-mail+senha para **e-mail + código de 6 dígitos (OTP)**, sem senha — mais simples para o usuário leigo (sem senha para lembrar, sem fluxo de "esqueci a senha"). `AuthProvider` agora expõe `requestLoginCode`/`verifyLoginCode` em vez de `signInWithPassword`/`requestPasswordReset`.
- `LoginPage` reescrita em 2 passos: informar e-mail → digitar código recebido, com cooldown de 30s para reenvio (protege o limite de envio de e-mail do plano Free).
- Removida a rota `/esqueci-senha` e `ForgotPasswordPage` (não fazem mais sentido sem senha).

### Adicionado
- `SETUP.md`: passo a passo para customizar o template de e-mail "Magic Link" do Supabase (exibir `{{ .Token }}`) e aviso sobre o limite de 2-4 e-mails/hora do plano Free, com recomendação de SMTP próprio (Resend, grátis) antes do uso diário por toda a equipe.
- `.gitignore`: bloqueia scripts temporários (`.tmp-*`) que possam conter chaves sensíveis.

## [0.1.1] - 2026-08-09 — Correção da migration inicial

### Corrigido
- `supabase/migrations/0001_init.sql`: coluna gerada `demandas.mes_referencia` falhava ao rodar no Supabase com o erro `42P17: generation expression is not immutable`. O Postgres resolvia `date_trunc('month', coalesce(data_entrega, data_entrada))` para a variante `timestamptz` (STABLE) em vez da variante `timestamp` (IMMUTABLE). Corrigido com um cast explícito para `timestamp` antes do `date_trunc`. Documentado em `docs/database-schema.md`.

## [0.1.0] - 2026-08-09 — Fundação do projeto

### Adicionado
- Scaffold do projeto (Vite + React + TypeScript + Tailwind CSS v4).
- Identidade visual do NexLab definida e aplicada (`docs/design-system.md`, tokens em `src/index.css`).
- Componentes base de UI no padrão shadcn/ui sobre Radix UI (Button, Input, Label, Card, Badge, Avatar, DropdownMenu, Logo).
- Schema completo do banco de dados no Supabase/Postgres (`supabase/migrations/0001_init.sql`): entidades (Clientes/Parceiros), catálogo de serviços, tabela de preços por entidade × serviço, demandas, fechamentos, notas de serviço, RLS.
- Seed do catálogo de serviços com base nos relatórios reais de exemplo (`supabase/seed.sql`).
- Autenticação com e-mail e senha via Supabase Auth, sessão persistente, fluxo de "esqueci minha senha", rota protegida.
- Layout base do app (Sidebar, navegação mobile simplificada, menu do usuário).
- Dashboard inicial (indicadores placeholder, chegam com os módulos das próximas fases).
- Documentação completa do projeto (`CLAUDE.md`, `docs/architecture.md`, `docs/database-schema.md`, `docs/business-rules.md`, `docs/ux-flows.md`, `docs/roadmap.md`).
- CI/CD: deploy automático no GitHub Pages a cada push em `main` (`.github/workflows/deploy.yml`).
- `SETUP.md` com o passo a passo manual (contas Supabase/GitHub, secrets, Pages).

### Decisões de projeto
- Hospedagem: GitHub Pages. Backend/dados: Supabase (plano Free) — 100% gratuito, sem exceções.
- Autenticação: e-mail + senha, sem cadastro público.
- Preço/comissão: tabela específica por entidade (Cliente/Parceiro) × serviço, sem % genérica automática.
