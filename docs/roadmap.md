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

- [x] **Impressão de canhotos de OS** (`RelatoriosPage` vira hub de ferramentas em `/relatorios`; a impressão em si mora em `CanhotosPage`, `/relatorios/canhotos`): lista de OS com busca/filtro por status/mês, seleção por checkbox e campo de **vias por OS**; botão "Imprimir canhotos" gera um único PDF com um canhoto por via numa grade fixa 2×2 (4 canhotos) por página A4 com borda tracejada de recorte — grade sempre fixa com largura, altura e overflow travados, nunca expande quando há poucas OS nem corta uma OS entre colunas/linhas ou entre páginas. Cada canhoto traz serviços com valor, total, observações e datas.
- [x] **Ajustes soltos pedidos junto**: CSV no Catálogo de Serviços e na Tabela de Preços (+ busca nesse pop-up); exclusão de despesa (admin); inversão das colunas do formulário de OS (dados gerais à esquerda, serviços à direita).
- [x] **Relatórios personalizados de OS**: extrato em PDF com filtros combináveis por período de recebimento, serviço e Cliente/Parceiro, prévia em tela, quantidade de OS listadas e valor total em R$.

## Fase 4.2 — KPIs em OS + Cliente novo herda preços ✅ concluída em 2026-08-13 (v0.11.0)

- [x] **3 cards de KPI em Ordens de Serviço** (Em Produção, Total a Receber, Entregue), respeitando o filtro de período já existente na tela.
- [x] **Cliente novo copia a tabela de preços da GRS Lab** (`preco_padrao` do catálogo) automaticamente ao cadastrar — via trigger no banco (`0009_copia_precos_cliente.sql`, precisa rodar a migration). Parceiro continua nascendo sem tabela de preços.

## Fase 4.3 — Ocultar KPIs, rodapé fixo com info da Lotus ✅ concluída em 2026-08-15 (v0.12.0)

- [x] **Ocultar valores dos KPIs** (Ordens de Serviço): toggle com ícone de olho, preferência salva no navegador.
- [x] **Rodapé da Sidebar fixo** (`AppShell` com `h-screen overflow-hidden`, só `<main>` rola) + mais informações: nº e data da atualização (`src/lib/appInfo.ts`), dados da desenvolvedora (Lotus Negócios LTDA, CNPJ, site).

## Fase 6 — Módulo Configurações ✅ concluída em 2026-08-15 (v0.13.0)

- [x] **Hub de Configurações** (`ConfiguracoesPage`, `/configuracoes`, substitui o "Em construção"): 3 cartões — Informações do Negócio (mesmo modal do atalho no Topbar), Usuários, Termos e Condições.
- [x] **Usuários** (`UsuariosPage`, `/configuracoes/usuarios`): lista `profiles` (RLS já existente desde a v0.1.0 cuida da visibilidade), editar nome/papel/ativo (só admin), e um formulário "Novo usuário" que vincula um UUID já criado no painel do Supabase a um papel — substitui o `insert` manual via SQL Editor do `SETUP.md`. Sem criação de acesso (e-mail/senha) pelo próprio NexLab — continua exigindo o painel do Supabase, decisão de arquitetura (sem backend próprio, sem expor `service_role` no navegador).
- [x] **Termos e Condições** (`TermosPage`, `/configuracoes/termos`): texto estático (Termos de Uso + tratamento de dados pessoais sob a LGPD, cobrindo nome de cliente final/paciente).

## Fase 5 — Deploy final e polish

- [ ] Domínio próprio (se o cliente quiser).
- [ ] Revisão fina de identidade visual e responsividade (mobile/tablet no balcão do laboratório).
- [ ] Code-splitting por rota (`React.lazy`) para reduzir o bundle inicial.
- [ ] Testes manuais end-to-end com o dono do GRS Lab e ajustes de usabilidade a partir do feedback real.
- [ ] `.github/workflows/release.yml` (opcional): gerar GitHub Release automaticamente a partir de tag + `CHANGELOG.md`.

## Fase 7 — Multi-tenant ✅ concluída em 2026-08-15 (v0.14.0)

Preparação pra vender o NexLab como assinatura pela landing page da Lotus, atendendo outros laboratórios além do GRS Lab.

- [x] **Isolamento de dados por empresa (tenant)**: `empresa_config` (singleton) vira `empresas` (multi-linha); toda tabela de negócio ganha `empresa_id`, preenchido automaticamente por trigger (nunca pelo payload do frontend) e travado contra alteração — RLS passa a exigir `empresa_id = current_empresa_id()` além das checagens de papel que já existiam (`0010_multi_tenant.sql`). Dado real do GRS Lab convertido em "tenant #1", sem perda.
- [x] **`numero_os` vira contador por empresa** (era sequência global) — cada cliente numera OS a partir do 1, sem vazar quantas OS os outros clientes têm.
- [x] **Runbook de provisionamento manual** (`SETUP.md` § "Provisionar uma empresa nova"): quando uma assinatura é confirmada na Lotus, criar a empresa + primeiro usuário admin via SQL Editor do Supabase — mesmo projeto Supabase compartilhado pra todos os clientes (decisão: não criar um projeto novo por cliente, esbarraria no limite de projetos gratuitos do Supabase Free).
- [ ] Landing page da Lotus com assinatura + formulário de qualificação de lead — fora deste repositório (`github.com/celestinoedu/lotus`), tratado à parte.
- [ ] Automatizar o provisionamento (ex.: Edge Function reagindo a um webhook de pagamento) — avaliado e adiado por ora, mantém "sem backend próprio".

## Fase 8 — Empresa Demonstração, canhotos legíveis e catálogo em PDF ✅ concluída em 2026-08-15 (v0.15.0)

- [x] **Empresa Demonstração**: tenant fictício (`is_demo = true`, `0011_empresa_demo.sql` + `supabase/seed_demo.sql`) com ~3 meses de dado inventado, login `teste@teste.com`/`teste123`. Toda mutação das telas operacionais (OS, Entidades, Serviços, Despesas, Contas a Receber, Tabela de Preços, Fechamento) fica só em cache do navegador nessa conta (`src/lib/demoMode.ts`) — nunca grava no banco; some ao logar de novo. Configurações fica bloqueada (toast). Link "Ver demonstração" na tela de login. Runbook em `SETUP.md`.
- [x] **Canhotos de impressão**: tipografia fixa e legível (título 18pt, corpo 12pt com negrito, rodapé 10pt, sempre preto) — grade de 4 por A4 (2×2), com dimensões físicas fixas mesmo quando há apenas uma OS.
- [x] **Catálogo de serviços em PDF**: exportação A4 com borda, por categoria, com preço, validade de 20 dias.
- [ ] Testar o provisionamento da empresa Demonstração de ponta a ponta no Supabase real (migration + seed rodados manualmente pelo responsável do projeto — feito fora deste repositório/sessão).

## Fase 9 — Módulo Estoque, Dashboard e melhorias na Lista de OS ✅ concluída em 2026-08-15 (v0.16.0)

- [x] **Lista de OS**: alinhamento fixo das tags (`align-top` nas células, nome sem quebrar linha, badges de Status da OS/Status de Pagamento sempre empilhadas na mesma posição) e linha expansível (chevron por linha, mostra itens completos/observações/forma de pagamento/data de entrega ao expandir).
- [x] **Dashboard** (`/dashboard`, item novo na Sidebar no fim antes de Configurações): indicadores reais — serviços vencendo/atrasados, produção do mês (anel de progresso), financeiro, estoque sinalizado, clientes/parceiros sem OS recente. Home continua Ordens de Serviço.
- [x] **Módulo Estoque** (`0012_estoque.sql`, `/estoque`): cadastro de insumos (quantidade, unidade, valor, local, sinalizar para compra) + ícone de Alertas no Topbar com popover dos itens sinalizados.
- [ ] Rodar `seed_demo.sql` atualizado (com os insumos fictícios da seção 5) e concluir o provisionamento do usuário `teste@teste.com` — pendente do lado do responsável do projeto (fora deste repositório/sessão).
- [x] **v0.16.1**: interface para de citar "GRS Lab" como se fosse o único cliente (login, Sidebar, Topbar, PDFs, Termos) — passa a usar o nome da própria empresa logada ou redação genérica, coerente com o multi-tenant da v0.14.0.

## Fase 10 — Error Boundary e PWA instalável ✅ concluída em 2026-08-16 (v0.16.4 / v0.17.0)

Motivado por relatos de tela em branco após login no Safari/iOS em alguns aparelhos (mais frequente após a v0.16.0) e pela dúvida de como levar o NexLab pro celular — avaliado presença em loja (Google Play/App Store) vs. PWA instalável; decisão: PWA, porque o objetivo real era só "ícone na tela + funcionar bem no celular", não descoberta via loja (usuário é sempre guiado direto pro link pela Lotus) — loja custaria US$99/ano (Apple) + US$25 único (Google) e exigiria Mac/Xcode pra build iOS, sem ganho real pro modelo de vendas atual.

- [x] **`ErrorBoundary`** (`src/components/shared/ErrorBoundary.tsx`, v0.16.4): captura erro de render não tratado, mostra tela de recuperação em vez de branco — não corrige a causa raiz do bug do Safari (ainda não reproduzida com o erro real em mãos), mas evita a tela branca silenciosa e expõe a mensagem do erro pra diagnóstico.
- [x] **PWA instalável** (v0.17.0, `vite-plugin-pwa`): manifest + service worker gerados no build, ícones a partir do `favicon.svg`, "Adicionar à Tela de Início" no Android e iOS/Safari, atualização por toast (nunca troca sozinho no meio de uma tela aberta). Sem loja de apps, sem custo, mesmo deploy no GitHub Pages.
- [x] **Navegação mobile completa + Dashboard como tela inicial no celular** (v0.17.1): `MobileNav` estava sem Estoque/Dashboard desde a v0.16.0 (adicionados só na Sidebar do computador) — corrigido, e a rota "/" agora mostra o Dashboard no celular (Ordens de Serviço continua tela inicial no computador; ganhou endereço fixo `/ordens-servico` pra nunca ficar ambígua na navegação mobile).
- [ ] Reproduzir a causa raiz do bug do Safari com o Web Inspector (precisa de um Mac disponível) e corrigir de verdade — o Error Boundary só evita a tela branca, não resolve a exceção em si.

## Fase 11 — Presença da marca no Instagram 🚧 preparada em 2026-08-18

- [x] Estratégia editorial com pilares, voz, cadência e métricas conectadas ao plano de SEO da marca.
- [x] Pacote inicial com 9 publicações, 31 peças 4:5, legendas e textos alternativos no repositório da landing (`lotus/nexlab/social`).
- [x] Fila privada no Supabase + Edge Function para publicar imagens e carrosséis pela API oficial do Instagram, com trava contra concorrência, retomada e tentativas controladas (`0013_instagram_automation.sql`).
- [x] Landing preparada com seção de personalização, FAQ preciso e pontos de entrada para o Instagram.
- [x] Perfil oficial `@nexlab.br` habilitado nos links da landing e adicionado aos dados estruturados.
- [ ] Configurar aplicativo/token na Meta, aplicar a migration/seed, publicar a Edge Function e ativar o Cron no projeto real.
- [ ] Fazer uma publicação controlada de teste antes de liberar as nove datas.

## Fase 12 — Manutenção de downloads ✅ concluída em 2026-08-19 (v0.18.1)

- [x] Restaurar todos os PDFs bloqueados pela CSP: catálogo, OS, fechamento, relatório personalizado e canhotos.
- [x] Unificar downloads de Blob e adiar a liberação da URL temporária para compatibilidade com Firefox e Safari.

## Ideias para avaliar depois (fora do escopo atual, não implementar sem pedir)

- App nativo em loja (Play Store/App Store) via Capacitor, caso o modelo de vendas mude e passe a depender de descoberta pela loja — custo recorrente de US$99/ano (Apple) + build iOS exige Mac/Xcode.
- Notificações automáticas (e-mail/WhatsApp) de prazo próximo.
- Exportação de relatórios em Excel além de PDF.
