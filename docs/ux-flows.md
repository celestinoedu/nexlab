# NexLab — Fluxos de UX

> Princípio geral (ver também `docs/design-system.md` § 6): o usuário nunca usou um sistema antes. Toda tela deve resolver a tarefa em **poucos cliques**, sem navegação desnecessária, com linguagem direta em português.

## Módulo Ordens de Serviço — OS (prioridade #1)

### KPIs no topo
3 cards logo abaixo do cabeçalho (antes da busca): **Em Produção** (contagem de OS com esse status), **Entregue** (contagem) e **Total a Receber** (soma do valor das OS com status financeiro Pendente, exclui Canceladas). Todos recalculam pelo filtro de **período (mês)** já existente na tela — mudou o mês, os 3 cards mudam junto. Não são afetados pela busca por texto nem pelo chip de status da lista (dão uma visão geral do período, não da busca pontual do momento). Botão com ícone de olho acima dos cards **oculta os valores** (mostra "••••" no lugar dos 3 números) — preferência salva no navegador (`localStorage`), útil quando a tela fica visível no balcão pra qualquer pessoa que passe.

### Criar/editar uma OS
Um único botão de destaque (**accent**, cor âmbar) "+ Nova OS", visível tanto na Lista quanto no Kanban, abre um **modal único** (mesmo componente `OrdemServicoFormDialog` para criar e editar), largo (`lg:max-w-5xl`) e dividido em **2 colunas no desktop** (empilha em 1 coluna no mobile, dados gerais primeiro):

- **Coluna esquerda — Dados gerais**:
  1. **Número da OS** — sugerido automaticamente (próximo disponível), mas editável (ex.: para manter numeração legada) ou deixar em branco.
  2. **Entidade** (combobox com busca por nome, badge indicando Cliente/Parceiro) — obrigatório, autofoco.
  3. **Cliente final** (consultório, opcional) e **Nome do paciente** (opcional) — dois campos separados lado a lado.
  4. **Data de recebimento** (default hoje) + **Data de entrega prevista** — a segunda é sugerida automaticamente a partir do `tempo_medio_dias` dos serviços escolhidos, sempre editável.
  5. **Status** (select — Recebido/Em Produção/Pronto para Entrega/Entregue/Cancelado, o mesmo enum do Kanban): ao escolher "Entregue", revela um campo **Data de entrega** (default hoje) — a mesma OS pode assim ser criada/editada já como entregue, sem precisar passar pelo Kanban.
  6. Botão secundário **"Informações financeiras"** (com um badge Pendente/Pago ao lado, mostrando o estado atual) abre um popup à parte (`InfoFinanceiraDialog`) com Status financeiro (toggle Pendente/Pago), Forma de pagamento e — só quando Pago — Data de pagamento. Fica fora do corpo principal do formulário pra não poluir a tela na maioria das OS (que ficam Pendente); os dados só entram no formulário ao clicar "Salvar" dentro do popup. Viram o ponto de partida da linha em Contas a Receber quando a OS é marcada como entregue (ver "Módulo Contas a Receber" abaixo).
- **Coluna direita — Serviços da OS**: uma OS pode ter vários — cada linha tem Serviço (combobox, auto-preenche valor/comissão de `tabela_precos`, com aviso quando cai no preço padrão ou falta comissão de parceiro), Cor (texto livre), Arco (Superior/Inferior/—), Quantidade (stepper), Valor e Comissão (se parceiro). Botão "+ Adicionar serviço" para novas linhas, mínimo 1.
- **Rodapé** (largura total, abaixo das duas colunas): **Desconto** (opcional) + **Total da OS** calculado em tempo real, **Observações** (opcional) e o botão único "Salvar". Fecha o modal e volta para onde o usuário estava (Lista ou Kanban), sem navegação de página.

### Visão Lista (padrão)
Tabela com busca (nº OS, cliente final/paciente, entidade, serviço), filtros rápidos por status (chips clicáveis) e por mês. Coluna "Serviços" mostra o nome do item quando a OS tem só 1, ou "N serviços" quando tem mais. Editar abre o mesmo modal de criação, sem trocar de página. Linhas de OS com status **Entregue** têm um botão de baixar o PDF da OS. Toggle Lista ⇄ Kanban fica fixo no topo do módulo e preserva os filtros ativos ao alternar.

### Visão Kanban
Colunas, na ordem: **Recebido → Em Produção → Pronto para Entrega → Entregue**. `Cancelado` fica fora do quadro (evita poluir visualmente) — acessível via filtro na Lista.

Card mostra: nº OS, nome da entidade, descrição do(s) serviço(s) (nome do item se só 1, "N serviços" se mais), cliente final/paciente, e um badge de prazo:
- 🟢 verde — dentro do prazo (`data_prevista` no futuro, folga confortável)
- 🟡 amarelo — próximo do prazo (ex.: ≤ 2 dias)
- 🔴 vermelho — atrasado (`data_prevista` no passado e ainda não `entregue`)

Cards na coluna Entregue têm um pequeno botão de baixar o PDF da OS (ícone de download, canto superior direito).

Arrastar e soltar (`@dnd-kit`) muda o `status` com atualização otimista (feedback visual imediato, sem "esperar carregar" — essencial para não gerar dúvida no usuário leigo se a ação funcionou). Ao soltar um card em **Entregue**: abre confirmação rápida pedindo `data_entrega` (default hoje).

## Módulo Clientes e Parceiros

- Lista única (`EntidadesPage`) com busca, chips de filtro "Todos / Clientes / Parceiros" e checkbox "Mostrar inativos" (registro nunca é apagado de verdade — ver abaixo).
- **Clicar numa linha abre o Extrato** (`EntidadeExtratoPage`, `/clientes-parceiros/:id`) — não mais o cadastro direto. Cada linha também tem dois ícones à parte: lápis (edição rápida do cadastro, sem sair da lista) e carteira (Tabela de Preços).
- Botão "Novo cadastro" continua abrindo direto o modal de criação (`EntidadeFormDialog`) — não faz sentido mostrar um extrato vazio para quem ainda não existe.
- Cadastro em modal único (`EntidadeFormDialog`): tipo (Cliente/Parceiro, botões), nome, documento, telefone, e-mail, endereço, observações; checkbox "Cadastro ativo" só aparece ao editar. Ao salvar um **Cliente** novo, a tabela de preços dele já nasce preenchida com o `preco_padrao` do catálogo (copiado automaticamente, editável depois); um **Parceiro** novo nasce com a tabela vazia, pra preenchimento manual — não existe "comissão padrão" pra copiar.
- A **Tabela de Preços** (`TabelaPrecosDialog`) é um modal separado (não um passo do mesmo formulário), largo (~70% da tela no desktop — a lista de serviços é longa), com **busca por nome de serviço** e botão **"Baixar CSV"** (exporta exatamente as linhas visíveis com o filtro de busca atual — inclui os valores digitados na tela, mesmo antes de salvar). Para Cliente: um campo "Preço (R$)" por serviço do catálogo. Para Parceiro: **dois** campos por linha — "Preço do Parceiro" (o que ele mesmo cobra, só referência) e "Comissão" (o que o GRS Lab recebe, esse sim usado em tudo); deixar a Comissão em branco volta a usar o `preco_padrao` do catálogo automaticamente. Um botão **R$ / %** ao lado da Comissão alterna a entrada: em "%", calcula a partir do Preço do Parceiro já digitado (ou do preço padrão do catálogo, se ainda não preencheu) e mostra o valor em R$ calculado logo abaixo — o que é salvo é sempre o valor final em R$ (não uma fórmula). Escrita restrita a `admin` (operador visualiza os valores mas os campos ficam desabilitados, com aviso explicando o motivo). Acessível tanto pela lista quanto pelo Extrato.
- "Excluir" não existe como ação destrutiva — desmarcar "Cadastro ativo" desativa o registro (some dos comboboxes de nova OS, mas o histórico de OS antigas continua intacto).

### Extrato por entidade (`EntidadeExtratoPage`)

Tela dedicada, foco no **resumo de OS** daquele Cliente/Parceiro — o cadastro em si vira um botão à parte:

1. Cabeçalho com nome, badge de tipo, dados de contato.
2. Botões **"Tabela de preços"** e **"Editar cadastro"** — abrem os mesmos modais já usados na lista, sem sair da tela.
3. Filtro de período (chips derivados dos meses com OS daquela entidade, mais "Todos os períodos").
4. Tabela de OS do período (reaproveita o mesmo componente da Lista principal de Ordens de Serviço — clicar numa linha abre o formulário de edição da OS, sem sair do extrato) e o total do período.
5. Botão **"Relatório (PDF)"** — gera e baixa um PDF com as OS do período filtrado (ver "Emissão de documentos" abaixo), pronto para enviar ao próprio Cliente/Parceiro.

## Módulo Catálogo de Serviços

Lista (`ServicosPage`) com busca, chips de categoria (derivados dos dados) e botão **"Baixar CSV"** (exporta a lista filtrada: serviço, categoria, preço padrão, tempo médio, situação). CRUD em modal único (`ServicoFormDialog`): nome, categoria, preço padrão, tempo médio de conclusão em dias; checkbox "Serviço ativo" só aparece ao editar (mesma lógica de desativação, não exclusão, do módulo de Clientes e Parceiros). Pré-requisito para o módulo de Ordens de Serviço funcionar — por isso semeado via `supabase/seed.sql` com o catálogo real da GRS Lab.

## Módulo Contas a Receber (`ContasReceberPage`, `/financeiro`)

- Uma linha por OS entregue (tabela `contas_receber`, criada automaticamente — ver `docs/business-rules.md`). Busca por cliente final/paciente/nº OS, **filtro dedicado por Cliente/Parceiro** (combobox, essencial pro fluxo de pagamento em massa abaixo), filtro de mês, chips de status (Todos/Aberto/Pago), checkbox **"Mostrar cancelados"** (desmarcado por padrão — uma linha cancelada só aparece se o usuário pedir).
- Ação **"Marcar como pago"** (ícone de check verde, uma linha por vez): abre um modal pequeno pedindo data e forma de pagamento (mesmo padrão do `EntregaConfirmDialog` de Ordens de Serviço), default hoje. Uma conta paga pode voltar para aberta (ícone de cifrão âmbar) sem exigir confirmação — é uma correção operacional simples.
- **Marcar como pago em massa**: cada linha em aberto tem um checkbox (mais um "selecionar todas as abertas" no cabeçalho da tabela); com 1+ selecionadas aparece uma barra de ação com o total selecionado e um botão que abre `MarcarVariasPagoDialog` (mesma data/forma de pagamento aplicada a todas de uma vez). Pensado pro Cliente/Parceiro que paga tudo de um período junto — filtra por entidade + mês e marca tudo de uma vez, em vez de OS por OS.
- Ação **"Cancelar"** (ícone de proibido, só visível para `admin`): abre modal com campo de justificativa **obrigatório**. Confirmar marca `status = cancelado` — a linha some da lista padrão, mas nunca é apagada de verdade, e volta a aparecer com "Mostrar cancelados" marcado.
- Total do filtro atual sempre visível no topo da tela.

## Módulo Despesas (`DespesasPage`, `/despesas`)

Cadastro simples, mesmo padrão visual do Catálogo de Serviços: busca, chips de categoria (derivados dos dados existentes), lista com total do filtro atual no topo, modal único de criar/editar (descrição, categoria opcional, valor, data, observações). Ação **"Excluir"** (ícone de lixeira, só visível para `admin`) abre um modal de confirmação simples e apaga a linha de verdade — despesas não têm soft-delete/histórico como Contas a Receber, então a exclusão aqui é definitiva.

## Módulo Fechamento Financeiro (`FechamentoFinanceiroPage`, `/fechamento`)

- Seletor de mês (`input type="month"`). Mostra três números: **Recebido no mês** (Contas a Receber pagas, pelo mês do pagamento), **Despesas no mês** e **Resultado** (recebido − despesas).
- Antes de fechado, os valores são recalculados toda vez que a tela abre. Botão **"Fechar o mês"** (só `admin`) trava um snapshot — a partir daí a tela mostra sempre esse valor travado para aquele mês, com a data em que foi fechado. Fechar de novo atualiza o snapshot (não é uma ação de uso único).
- Distinto do fechamento por entidade que já existe (`fechamentos`, sem tela própria) — este é o resultado do laboratório inteiro.

## Módulo Relatórios (`RelatoriosPage`, `/relatorios`)

**Hub de ferramentas** (`RelatoriosPage`): uma grade de cartões clicáveis, um por ferramenta — atualmente "Imprimir canhotos" e "Relatórios personalizados". Novas ferramentas de apoio ao negócio entram só adicionando um cartão, sem mudar a estrutura da tela.

### Imprimir canhotos (`CanhotosPage`, `/relatorios/canhotos`)

- Lista de todas as OS (busca por nº/cliente/serviço, filtro por status e por mês), cada linha com checkbox + checkbox "selecionar todas" no cabeçalho da tabela, e uma coluna **"Vias"** — um campo numérico por OS (padrão = soma das quantidades dos serviços da OS, mínimo 1, editável) pra controlar quantas cópias do canhoto daquela OS entram no PDF.
- Ao selecionar 1+ OS, aparece uma barra de ação com "Imprimir canhotos", que gera e baixa um PDF único (`canhotos-os-<data-hora>.pdf`) — uma via por canhoto, na quantidade escolhida por OS (mostrando "Via X de Y" quando é mais de uma).
- Cada canhoto traz: nº da OS, Cliente/Parceiro, Cliente final/Paciente, **itens de serviço com valor de cada um** (cor/arco entre parênteses, comissão em vez de valor quando é Parceiro), Total (com desconto se houver), **Observações** (truncadas se muito longas) e as datas de **Recebimento** e **Entrega** — sem o status da OS (não faz sentido num papel impresso pra ser cortado e guardado). Se a empresa tiver logo cadastrada e "Mostrar no cabeçalho" ligado (`Configurações do negócio`), ela aparece como **marca d'água** centralizada e discreta atrás do conteúdo de cada canhoto.
- Grade fixa de 2 colunas × 2 linhas (4 canhotos) por página A4, borda tracejada fazendo a marcação de recorte. A grade é sempre fixa e cada canhoto ocupa uma célula inteira com largura, altura e overflow travados — não expande quando há poucas OS, nunca fica cortado entre duas colunas/linhas nem "vaza" pra uma página solta.

### Relatórios personalizados (`RelatoriosPersonalizadosPage`, `/relatorios/personalizados`)

- Filtros combináveis e opcionais pela **data de recebimento** (data inicial/final), por serviço presente nos itens da OS e por Cliente/Parceiro. As opções vêm das próprias OS e, por isso, continuam incluindo cadastros históricos inativos.
- A tela apresenta uma prévia exata das OS filtradas, com número, recebimento, Cliente/Parceiro, Cliente final/Paciente, serviços, status e valor, além dos indicadores de **quantidade de OS** e **valor total em R$**.
- "Baixar PDF" gera o extrato `relatorio-os-<data-hora>.pdf`, com dados da empresa, filtros aplicados, os dois totais, tabela paginada e numeração de páginas.

## Módulo Configurações (`ConfiguracoesPage`, `/configuracoes`)

Hub com 3 cartões — mesmo padrão do hub de Relatórios:

### Informações do Negócio
Abre o mesmo `EmpresaConfigDialog` do atalho no Topbar (ícone de prédio, ao lado do menu do usuário) — os dois pontos de entrada abrem o mesmo modal. Campos: Nome do negócio (sempre aparece nos documentos, sem toggle), Logo (upload de imagem pro bucket público `logos` do Storage, com pré-visualização), Endereço, Telefone e E-mail — cada um dos quatro últimos com um checkbox **"Mostrar no cabeçalho"** ao lado, que controla se aquele dado aparece no cabeçalho dos PDFs (OS, Relatório de Fechamento, canhotos). Escrita restrita a `admin`; qualquer usuário ativo pode abrir e consultar, mas os campos ficam desabilitados.

### Usuários (`UsuariosPage`, `/configuracoes/usuarios`)
Lista todo mundo com login no NexLab (tabela `profiles`) — nome, papel (badge Administrador/Operador) e status (Ativo/Inativo). RLS já limita quem vê o quê: `admin` vê todos, qualquer outro usuário só vê a si mesmo (mesma regra desde a v0.1.0, sem mudança).

- **Criar um usuário é sempre 2 passos**, porque o NexLab não tem backend próprio e nunca expõe a chave `service_role` no navegador (ver `CLAUDE.md` § restrições): **1.** o admin cria o acesso (e-mail/senha) direto no painel do Supabase (Authentication → Users → Add user) — isso não tem como sair do painel; **2.** volta no NexLab, clica em "Novo usuário" e cola o UUID gerado lá, junto com nome e papel — isso grava a linha em `profiles`, substituindo o `insert` manual via SQL Editor que antes era o único jeito (documentado no `SETUP.md`).
- **Editar** (só `admin`): nome, papel (Administrador/Operador) e ativo/inativo — desativar bloqueia o acesso sem apagar o cadastro nem o histórico de OS/ações daquele usuário. Um admin não consegue alterar o próprio papel nem se autodesativar por essa tela (trava de segurança, evita se trancar fora do sistema sem querer).

### Termos e Condições (`TermosPage`, `/configuracoes/termos`)
Texto estático (sem tabela nova no banco) com Termos de Uso + tratamento de dados pessoais sob a LGPD — cobre especificamente o nome de cliente final/paciente que trafega pelas Ordens de Serviço (base legal, quem acessa, onde fica armazenado, retenção, direitos do titular). Editar o conteúdo é editar o arquivo `TermosPage.tsx` diretamente.

## Emissão de documentos

- **PDF da Ordem de Serviço**: disponível para OS com status `entregue`, na Lista (ação da linha) e no Kanban (ícone no card) — sempre **baixa o arquivo** (`OS-<número>.pdf`), nunca só abre para visualizar.
- **Relatório de Fechamento**: baixado a partir do Extrato de um Cliente/Parceiro (`EntidadeExtratoPage`), com as OS do período filtrado — sempre baixa o arquivo (`Fechamento-<nome>.pdf`), pronto para enviar ao próprio Cliente/Parceiro.
- **Nota de Serviço** (Fase 4, ainda não implementada): acionada a partir de uma OS `entregue` — documento formal numerado, diferente do PDF simples da OS.
- **Canhotos de OS**: a partir de Relatórios (`/relatorios`), com 1+ OS selecionadas — sempre baixa um único arquivo (`canhotos-os-<data-hora>.pdf`) com um canhoto por OS numa grade impressa, nunca abre só para visualizar.
- **Relatório personalizado de OS**: a partir de Relatórios (`/relatorios/personalizados`), após aplicar qualquer combinação de período, serviço e Cliente/Parceiro — baixa um extrato (`relatorio-os-<data-hora>.pdf`) com todas as OS listadas e seus totais.

## Estados vazios e erros

- Toda lista vazia (nenhuma OS, nenhum cliente cadastrado) mostra uma frase amigável + botão de ação — nunca uma tela em branco (ver componente `EmConstrucao`/padrão equivalente para "vazio", a construir junto com cada módulo).
- Erros de formulário sempre dizem o que fazer a seguir, nunca só "campo obrigatório" (ex.: "Escolha um cliente ou parceiro antes de salvar").
- Ações destrutivas (excluir cliente, cancelar OS) sempre pedem confirmação explícita em modal.

## Responsividade

Sidebar completa em telas médias/grandes (`md:` e acima). Em telas pequenas (celular/tablet no balcão do laboratório), uma barra de navegação horizontal simplificada substitui a sidebar (`MobileNav`). Revisão fina de responsividade fica para a Fase 5 do roadmap — a base atual já é utilizável em tablet, mas não polida.

## Layout geral (`AppShell`)

Sidebar e Topbar ficam **fixos** na viewport (`AppShell` usa `h-screen overflow-hidden`, só o `<main>` rola) — o rodapé da Sidebar (versão, data de atualização, dados da Lotus Negócios) fica sempre visível, mesmo com a página de conteúdo tendo uma lista longa. `APP_VERSION`/`APP_ATUALIZADO_EM` ficam centralizados em `src/lib/appInfo.ts`, atualizados a cada release junto com `package.json`.
