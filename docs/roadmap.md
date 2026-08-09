# NexLab — Roadmap

Atualizar este arquivo ao final de cada sessão de trabalho relevante, marcando o que foi concluído.

## Fase 1 — Fundação ✅ concluída em 2026-08-09 (v0.1.0)

- [x] Scaffold Vite + React + TypeScript, Tailwind v4, estrutura de pastas por feature.
- [x] Identidade visual definida (`docs/design-system.md`) e aplicada via tokens (`src/index.css`).
- [x] Componentes base de UI (Button, Input, Label, Card, Badge, Avatar, DropdownMenu, Logo).
- [x] Schema completo do banco (`supabase/migrations/0001_init.sql`) + seed do catálogo de serviços real (`supabase/seed.sql`).
- [x] Autenticação: login (e-mail + senha), "esqueci minha senha", sessão persistente, `ProtectedRoute`.
- [x] Layout base (Sidebar desktop + navegação mobile simplificada, Topbar com menu do usuário).
- [x] Dashboard inicial (placeholder de indicadores).
- [x] Documentação completa (`CLAUDE.md`, `docs/architecture.md`, `docs/database-schema.md`, `docs/business-rules.md`, `docs/ux-flows.md`, `docs/design-system.md`).
- [x] CI/CD: `.github/workflows/deploy.yml` (build + deploy automático no GitHub Pages a cada push em `main`).
- [x] `SETUP.md` com o passo a passo manual (criar projeto Supabase, rodar migration, configurar secrets do GitHub, habilitar Pages).

**Pendente de ação do usuário** (fora do que uma sessão de código resolve sozinha): criar o projeto Supabase, rodar a migration, preencher os secrets do GitHub e habilitar GitHub Pages nas configurações do repositório — passo a passo em `SETUP.md`.

## Fase 2 — Módulo Demandas completo (próxima)

- [ ] CRUD de demandas (`DemandaForm` único para criar/editar, ver `docs/ux-flows.md`).
- [ ] Visão Kanban com drag-and-drop (`@dnd-kit`), atualização otimista de status.
- [ ] Visão Lista com busca e filtros (status, mês).
- [ ] Alertas visuais de prazo (badge verde/amarelo/vermelho).
- [ ] Confirmação rápida de entrega + atalho para gerar Nota de Serviço.

## Fase 3 — Clientes/Parceiros + Tabela de Preços

- [ ] Cadastro de Clientes e Parceiros (abas, formulário simples).
- [ ] CRUD do Catálogo de Serviços.
- [ ] Tela de Tabela de Preços por entidade (edição inline por serviço).

## Fase 4 — Contas a Receber + Relatórios + Nota de Serviço

- [ ] Tela de Contas a Receber (`vw_contas_receber`), ação "Fechar mês" / "Marcar como pago".
- [ ] Geração de PDF do Relatório de Fechamento (`@react-pdf/renderer`, layout baseado nos relatórios reais).
- [ ] Geração de PDF da Nota de Serviço (cupom, numeração automática).
- [ ] Dashboard com indicadores reais (substituir placeholders da Fase 1).

## Fase 5 — Deploy final e polish

- [ ] Domínio próprio (se o cliente quiser).
- [ ] Revisão fina de identidade visual e responsividade (mobile/tablet no balcão do laboratório).
- [ ] Code-splitting por rota (`React.lazy`) para reduzir o bundle inicial.
- [ ] Testes manuais end-to-end com o dono do GRS Lab e ajustes de usabilidade a partir do feedback real.
- [ ] `.github/workflows/release.yml` (opcional): gerar GitHub Release automaticamente a partir de tag + `CHANGELOG.md`.

## Ideias para avaliar depois (fora do escopo atual, não implementar sem pedir)

- App mobile nativo/PWA instalável.
- Notificações automáticas (e-mail/WhatsApp) de prazo próximo.
- Exportação de relatórios em Excel além de PDF.
