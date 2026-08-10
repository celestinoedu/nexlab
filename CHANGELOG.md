# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [0.7.5] - 2026-08-10 — Corrige tela em branco após login (cache do GitHub Pages)

### Corrigido
- **Tela em branco após o login**, mais frequente no celular mas também no PC: o GitHub Pages guarda `index.html` em cache por 10 minutos (`Cache-Control: max-age=600`, sem forma de configurar). Cada deploy gera nomes novos de arquivo `.js`/`.css` — quem abria o app com um `index.html` em cache tentava carregar um arquivo que já não existia mais, e o carregamento falhava silenciosamente (nenhum erro visível, só tela em branco). Ver `docs/architecture.md` § "Cache do index.html no GitHub Pages" pra detalhe técnico.
- Mitigado com um script inline em `index.html` que detecta essa falha de carregamento e recarrega a página automaticamente com uma URL nova (nunca em cache) — no máximo uma vez por sessão de aba, pra não entrar em loop.

## [0.7.4] - 2026-08-10 — Pagamento em massa + popup financeiro na OS

### Adicionado
- **Marcar como pago em massa** em Contas a Receber: checkbox por linha (+ "selecionar todas as abertas"), barra de ação com o total selecionado, e um modal (`MarcarVariasPagoDialog`) que aplica a mesma data/forma de pagamento a todas de uma vez — pensado pra Cliente/Parceiro que paga tudo de um período junto.
- **Filtro dedicado por Cliente/Parceiro** (combobox) em Contas a Receber, ao lado do filtro de mês — essencial pro fluxo acima.
- **Popup "Informações financeiras"** no formulário de OS (`InfoFinanceiraDialog`): Status financeiro, Forma de pagamento e Data de pagamento saem do corpo principal do formulário e viram um botão secundário com badge de status, que abre um popup à parte — menos poluição visual na maioria das OS (que ficam Pendente).
- OS ganhou sua própria **Data de pagamento** (`ordens_servico.data_pagamento`, migration `0005`), preenchida no popup financeiro.

### Corrigido
- `supabase/migrations/0005_financeiro_ajustes.sql`: a trigger que cria a conta a receber gravava `status = 'pago'` mas nunca preenchia `data_pagamento` quando a OS já nascia entregue + paga — o Fechamento Financeiro soma "recebido no mês" por essa data, então essas contas nunca eram contadas. Corrigido (a trigger agora usa a `data_pagamento` da própria OS) e as linhas já afetadas foram corrigidas retroativamente na mesma migration.

### Alterado
- Base de Clientes/Parceiros e Ordens de Serviço zerada a pedido do usuário, mantendo só o parceiro Laboratório Spartan (com as 73 comissões já cadastradas) — Catálogo de Serviços, Despesas e Fechamentos não foram afetados.

## [0.7.3] - 2026-08-10 — Catálogo expandido + comissões completas do Spartan

### Adicionado
- Catálogo de serviços (`supabase/seed.sql` e banco) expandido de 43 para 98 serviços ativos, a partir da lista de comissões 2026 do parceiro Laboratório Spartan: famílias "SN1,2,3", "Contenção Fixa 3x3" e "Ativador Klammt" — genéricas demais pra ter uma comissão só — foram desmembradas em variantes específicas (SN1/SN2/SN3/SN4/SN7/SN11, 5 variantes de Contenção 3x3, Klammt CL I/II/III), e ~40 aparelhos que o Spartan cobra e não existiam no catálogo foram adicionados (APM, Frankel I/II/III, Sanders, Ativador de Rossi, várias contenções removíveis, etc.). As 3 entradas genéricas antigas foram desativadas (não apagadas — preserva o histórico de OS que já usam elas).
- Comissão do parceiro **Laboratório Spartan** preenchida para todos os 73 itens da lista fornecida (15 usando serviços já existentes, 58 usando as novas entradas do catálogo).

### Observação
- Os novos serviços entraram com `preco_padrao = R$ 0,00` — a lista usada como fonte é só a comissão do Spartan (parceiro), não o preço de venda direta da GRS Lab (Cliente) pra esses itens. Precisa ser revisado no Catálogo de Serviços quando esse preço for definido.

## [0.7.2] - 2026-08-10 — Comissão de Parceiro por %

### Adicionado
- Na Tabela de Preços, quando a entidade é Parceiro, cada linha ganhou um botão **R$ / %** para alternar a entrada: em "%", o campo aceita um percentual do preço padrão do serviço (mostra o valor em R$ calculado embaixo); o que é salvo em `tabela_precos.preco` continua sendo sempre o valor final em R$ — é só uma conveniência de digitação, não muda a regra de "valor fixo negociado por entidade × serviço" (ver `docs/business-rules.md`).
- Parceiro **Laboratório Spartan** cadastrado, com comissões preenchidas para os serviços do catálogo que batem 1-para-1 com a lista de comissões 2026 fornecida.

## [0.7.1] - 2026-08-10 — Corrige erro ao entregar OS

### Corrigido
- `supabase/migrations/0004_fix_trigger_conta_receber.sql`: a trigger que cria a linha de Contas a Receber (`trg_fn_criar_conta_receber`, adicionada na `0003`) falhava com `column "status" is of type status_conta_receber but expression is of type text` sempre que uma OS era movida para "Entregue" — o `CASE` que decide o status inicial (`aberto`/`pago`) devolvia texto puro, e o Postgres não faz esse cast automático dentro de um `CASE` usado num `INSERT`. Corrigido com um cast explícito (`::status_conta_receber`).

## [0.7.0] - 2026-08-10 — Gestão financeira: Contas a Receber, Despesas, Fechamento, extrato por entidade

### Adicionado
- **Contas a Receber real por OS** (`contas_receber`, migration `0003_financeiro.sql`): toda OS marcada como "Entregue" gera automaticamente uma linha a receber (trigger no banco, `security definer`). Nova tela `ContasReceberPage` (`/financeiro`): marcar como pago/pendente, e "excluir" uma linha — sempre soft-delete, exige justificativa, restrito a admin, a linha some da lista padrão mas continua no banco como `cancelado` e só reaparece se o usuário marcar "Mostrar cancelados".
- **Status financeiro na Ordem de Serviço**: novo campo **Status** editável direto no formulário (antes só mudava pelo Kanban), mais **Status financeiro** (Pendente/Pago) e **Forma de pagamento**. Badge de status financeiro na Lista e no Kanban.
- **Extrato de OS por Cliente/Parceiro** (`EntidadeExtratoPage`, `/clientes-parceiros/:id`): resumo das OS de uma entidade num período, com total e botão para baixar um **Relatório de Fechamento em PDF** (sempre download real) — pronto para enviar ao próprio Cliente/Parceiro. Clicar numa linha em Clientes e Parceiros agora abre esse extrato em vez do cadastro direto; "Editar cadastro" e "Tabela de preços" viram botões dentro da tela (a lista também ganhou um ícone de edição rápida).
- **Despesas** (`despesas`, `DespesasPage`, `/despesas`): cadastro simples — categoria (livre), descrição, valor, data, observações. Novo item na Sidebar.
- **Fechamento Financeiro** (`fechamentos_financeiros`, `FechamentoFinanceiroPage`, `/fechamento`): resultado do laboratório por mês (recebido − despesas), calculado ao vivo até ser fechado; botão "Fechar o mês" (só admin) trava um snapshot. Novo item na Sidebar.
- `useProfile` passa a ser usado também nas novas telas financeiras para restringir ações sensíveis (cancelar conta a receber, fechar o mês) a `admin`.

### Alterado
- `supabase/migrations/0003_financeiro.sql`: novas tabelas `contas_receber`, `despesas`, `fechamentos_financeiros`; novos enums `status_pagamento_os`, `status_conta_receber`, `status_fechamento_periodo`; `ordens_servico` ganha `status_pagamento`/`forma_pagamento`; remove a view `vw_contas_receber` (obsoleta — `contas_receber` agora é tabela real).

## [0.6.0] - 2026-08-10 — Clientes/Parceiros + Catálogo de Serviços

### Adicionado
- Módulo **Clientes e Parceiros** (`EntidadesPage`): lista com busca, filtro por tipo (Todos/Clientes/Parceiros) e checkbox "Mostrar inativos"; cadastro em modal único (`EntidadeFormDialog`) com tipo, nome, documento, telefone, e-mail, endereço e observações.
- **Tabela de Preços por entidade** (`TabelaPrecosDialog`), acessada pelo ícone de carteira em cada linha da lista: um campo por serviço do catálogo — "Preço" para Cliente, "Comissão" para Parceiro. Em branco, a OS volta a usar o preço padrão do catálogo automaticamente. Escrita restrita a `admin`; operador visualiza os valores com os campos desabilitados.
- Módulo **Catálogo de Serviços** (`ServicosPage`): lista com busca e chips de categoria (derivados dos dados); cadastro em modal único (`ServicoFormDialog`) com nome, categoria, preço padrão e tempo médio de conclusão.
- `useProfile`: hook que expõe `role`/`nome` do usuário logado (tabela `profiles`), usado para liberar ações de admin na interface.
- `useEntidades`/`useServicos`: ganharam parâmetro para incluir registros inativos (usado só nas telas de cadastro; os comboboxes de OS continuam mostrando só ativos).

### Alterado
- **"Excluir" virou "desativar"** em Clientes/Parceiros e Catálogo de Serviços — um checkbox "Ativo" no formulário de edição, em vez de uma ação destrutiva. Preserva o histórico de OS já vinculado a um cadastro desativado.
- Rotas `/clientes-parceiros` e `/servicos` deixam de mostrar "Em construção" e passam a carregar os módulos reais.

## [0.5.0] - 2026-08-09 — Ordens de Serviço multi-item + correções de UX

### Alterado
- **Renomeado "Demanda" → "Ordem de Serviço (OS)"** em todo o sistema: banco (`demandas`→`ordens_servico`, `status_demanda`→`status_os`), pastas (`src/features/demandas`→`src/features/ordens-servico`), componentes, hooks, textos e documentação.
- **Uma OS agora pode ter vários serviços**: nova tabela `ordem_servico_itens` (cor, arco Superior/Inferior, quantidade, valor/comissão por item). O catálogo de serviços continua só com o "serviço pai" — cor e arco são escolhidos por item dentro da OS, não no catálogo.
- `OrdemServicoFormDialog` reescrito: lista dinâmica de itens (`useFieldArray`), total calculado em tempo real, campo **Número da OS** visível/editável (sugestão automática), **Data de Recebimento** exposta ao lado da **Data de entrega (prevista)** — esta última sugerida a partir do novo `servicos.tempo_medio_dias`.
- **Lista voltou a ser a visão padrão** do módulo (Kanban continua disponível pelo toggle).
- Catálogo de serviços (`supabase/seed.sql`) substituído pela **tabela de preços real da GRS Lab** (fornecida pelo cliente), com prazo padrão de 7 dias úteis.
- Bundle: `@react-pdf/renderer` isolada em chunk separado via `import()` dinâmico — só carrega quando alguém baixa um PDF, não pesa no login.

### Adicionado
- **Download do PDF da Ordem de Serviço** (`OrdemServicoPdf.tsx`) — disponível quando o status é Entregue, no Kanban (ícone no card) e na Lista (ação da linha). Sempre baixa o arquivo (`OS-<número>.pdf`), nunca só abre para visualizar.
- `supabase/migrations/0002_ordens_servico.sql`: substitui `demandas` por `ordens_servico` + `ordem_servico_itens`, adiciona `tempo_medio_dias` em `servicos`, recalcula `vw_contas_receber`/`vw_relatorio_fechamento_itens` por item.
- Ajustes de responsividade mobile no formulário de OS (grids e itens de serviço empilham em telas pequenas).

## [0.4.0] - 2026-08-09 — Módulo Demandas (Kanban + Lista) como tela inicial

### Adicionado
- Módulo completo de Demandas: criação/edição em modal único (`DemandaFormDialog`), com combobox pesquisável de Cliente/Parceiro e Serviço que auto-preenche preço/comissão a partir de `tabela_precos` (com aviso quando cai no preço padrão do catálogo ou quando falta comissão cadastrada para um parceiro).
- Visão **Kanban** com drag-and-drop (`@dnd-kit`) entre as colunas Recebido/Em Produção/Pronto para Entrega/Entregue, atualização otimista de status, badge de prazo (verde/amarelo/vermelho) e confirmação de data ao mover para "Entregue" (`EntregaConfirmDialog`).
- Visão **Lista** com busca (nº OS, cliente final, entidade, serviço), filtro por status (chips) e por mês, mesma barra de filtros compartilhada com o Kanban.
- Novos componentes de UI: `dialog.tsx`, `popover.tsx`, `command.tsx`, `textarea.tsx`, e `Combobox` reutilizável (`src/components/shared/Combobox.tsx`).
- `src/types/domain.ts`: tipos TypeScript de domínio espelhando o schema do banco.
- Dados de exemplo inseridos no banco (6 entidades, preços/comissões, 19 demandas) para testar o módulo.

### Alterado
- **Demandas é agora a tela inicial (`/`)** do sistema, substituindo o Dashboard placeholder (que fica reservado para a Fase 4, com indicadores reais). Item "Início" removido da navegação — "Demandas" passa a ser o primeiro item, apontando para `/`.

## [0.3.0] - 2026-08-09 — Volta para login e-mail + senha

### Alterado
- Revertido o login por código de e-mail (v0.2.0) de volta para **e-mail + senha**. Motivo: em 03/06/2026 o Supabase passou a bloquear a customização do template de e-mail em projetos novos do plano Free que usam o SMTP padrão deles — sem isso, não dá pra trocar o link clicável pelo código de 6 dígitos, e configurar SMTP próprio exigiria um domínio verificado (fora do escopo 100% gratuito do projeto). `AuthProvider`, `LoginPage` e `ForgotPasswordPage` voltaram ao formato de e-mail+senha da v0.1.1. Decisão documentada em `CLAUDE.md`.

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
