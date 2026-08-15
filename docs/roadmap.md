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

**Atualização**: projeto Supabase criado, migration `0001_init.sql` e `seed.sql` rodados com sucesso em 2026-08-09. Ainda falta confirmar se os secrets do GitHub e o GitHub Pages foram habilitados (`SETUP.md` § 5-6) — necessário para o deploy automático funcionar de ponta a ponta.

## Fase 2 — Módulo Demandas completo ✅ concluída em 2026-08-09 (v0.4.0)

- [x] CRUD de demandas (`DemandaFormDialog` único para criar/editar, ver `docs/ux-flows.md`).
- [x] Visão Kanban com drag-and-drop (`@dnd-kit`), atualização otimista de status.
- [x] Visão Lista com busca e filtros (status, mês).
- [x] Alertas visuais de prazo (badge verde/amarelo/vermelho) no card do Kanban.
- [x] Confirmação rápida de entrega (`EntregaConfirmDialog`) ao mover para "Entregue".
- [x] Demandas virou a tela inicial do sistema (`/`), substituindo o Dashboard placeholder.
- [x] Dados de exemplo inseridos no banco (6 entidades, preços/comissões, 19 demandas) para testar o módulo ponta a ponta.
- [ ] Atalho "gerar Nota de Serviço" ao confirmar entrega — adiado para a Fase 4 (PDF ainda não existe).

## Fase 2.1 — Ordens de Serviço multi-item + correções ✅ concluída em 2026-08-09 (v0.5.0)

Correções pedidas após o primeiro teste do módulo (era "Demandas"):

- [x] **Renomeado "Demanda" → "Ordem de Serviço (OS)"** em todo o sistema (código, telas, banco, docs).
- [x] **Uma OS pode ter vários serviços** (`ordem_servico_itens`), cada um com Cor e Arco (Superior/Inferior) próprios — catálogo continua só com o "serviço pai".
- [x] Catálogo de serviços ganhou `tempo_medio_dias`, usado para sugerir a data de entrega prevista.
- [x] Campo **Número da OS** visível e editável na criação (sugestão automática, mas pode ser sobrescrito).
- [x] Campos **Data de Recebimento** e **Data de entrega (prevista)** expostos no formulário.
- [x] **Lista voltou a ser a visão padrão** (Kanban continua disponível pelo toggle).
- [x] **Download do PDF da OS** (sempre baixa arquivo, nunca só abre pra visualizar) — disponível quando o status é Entregue, no Kanban e na Lista.
- [x] Catálogo de serviços trocado pela **tabela de preços real da GRS Lab** (fornecida pelo cliente), com prazo padrão de 7 dias úteis.
- [x] Ajustes de responsividade mobile no formulário (grids e itens empilham em telas pequenas).
- [x] Nova migration `0002_ordens_servico.sql` (substitui `demandas` por `ordens_servico` + `ordem_servico_itens`).

## Fase 3 — Clientes/Parceiros + Catálogo + Tabela de Preços ✅ concluída em 2026-08-10 (v0.6.0)

- [x] Cadastro de Clientes e Parceiros (`EntidadesPage`): lista com busca, filtro por tipo e opção "mostrar inativos"; formulário único de criar/editar (`EntidadeFormDialog`).
- [x] CRUD do Catálogo de Serviços (`ServicosPage`): lista com busca e filtro por categoria; formulário único de criar/editar (`ServicoFormDialog`), incluindo preço padrão e tempo médio.
- [x] Tela de Tabela de Preços por entidade (`TabelaPrecosDialog`), acessada a partir da lista de Clientes/Parceiros: um campo por serviço (preço para Cliente, comissão para Parceiro), em branco = usa o preço padrão do catálogo. Escrita restrita a `admin` (`useProfile`), operador só visualiza.
- [x] "Exclusão" implementada como desativação (`ativo = false`) — preserva o histórico de OS já vinculado, consistente com o filtro que os comboboxes de OS já aplicavam.

## Fase 4 — Gestão financeira ✅ concluída em 2026-08-10 (v0.7.0)

Pedido do usuário após testar o módulo de Clientes/Parceiros: gestão mínima mas real das finanças do laboratório, além do que estava previsto originalmente para a Fase 4.

- [x] **Contas a Receber real por OS** (`contas_receber`, migration `0003`): toda OS que vira "Entregue" gera automaticamente uma linha a receber (trigger `security definer`). Tela `ContasReceberPage` com marcar como pago/pendente e "excluir" (soft-delete com justificativa obrigatória, só `admin`, linha some da visão padrão a menos que filtrada).
- [x] **Status financeiro na OS**: campos de Status (editável no formulário, não só no Kanban), Status financeiro (Pendente/Pago) e Forma de pagamento.
- [x] **Extrato de OS por Cliente/Parceiro** (`EntidadeExtratoPage`, `/clientes-parceiros/:id`): resumo por período + **Relatório de Fechamento em PDF** (sempre download) para enviar ao próprio Cliente/Parceiro. Clicar numa linha de Clientes e Parceiros agora abre esse extrato; "Editar cadastro" virou um botão à parte.
- [x] **Despesas** (`despesas`, `DespesasPage`, `/despesas`): cadastro simples (categoria, descrição, valor, data, observações), novo item de Sidebar.
- [x] **Fechamento Financeiro** (`fechamentos_financeiros`, `FechamentoFinanceiroPage`, `/fechamento`): resultado do laboratório por mês (recebido − despesas), ação "Fechar o mês" (só admin), novo item de Sidebar.
- [ ] Geração de PDF da Nota de Serviço (cupom, numeração automática) — adiado, fora do pedido desta rodada.
- [ ] Dashboard com indicadores reais (substituir placeholders da Fase 1) — adiado.
- [ ] Tela própria para `fechamentos` (fechamento por entidade, existente desde a v0.1.0) — segue sem UI, não foi pedida nesta rodada.

## Fase 4.1 — Relatórios: impressão de canhotos ✅ concluída em 2026-08-13 (v0.10.0)

- [x] **Impressão de canhotos de OS** (`RelatoriosPage` vira hub de ferramentas em `/relatorios`; a impressão em si mora em `CanhotosPage`, `/relatorios/canhotos`): lista de OS com busca/filtro por status/mês, seleção por checkbox e campo de **vias por OS**; botão "Imprimir canhotos" gera um único PDF com um canhoto por via numa grade fixa 2×3 por página A4 com borda tracejada de recorte — grade sempre fixa com altura/overflow travados, nunca corta uma OS entre colunas/linhas ou entre páginas. Cada canhoto traz serviços com valor, total, observações e datas.
- [x] **Ajustes soltos pedidos junto**: CSV no Catálogo de Serviços e na Tabela de Preços (+ busca nesse pop-up); exclusão de despesa (admin); inversão das colunas do formulário de OS (dados gerais à esquerda, serviços à direita).

## Fase 4.2 — KPIs em OS + Cliente novo herda preços ✅ concluída em 2026-08-13 (v0.11.0)

- [x] **3 cards de KPI em Ordens de Serviço** (Em Produção, Total a Receber, Entregue), respeitando o filtro de período já existente na tela.
- [x] **Cliente novo copia a tabela de preços da GRS Lab** (`preco_padrao` do catálogo) automaticamente ao cadastrar — via trigger no banco (`0009_copia_precos_cliente.sql`, precisa rodar a migration). Parceiro continua nascendo sem tabela de preços.

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
