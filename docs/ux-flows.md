# NexLab — Fluxos de UX

> Princípio geral (ver também `docs/design-system.md` § 6): o usuário nunca usou um sistema antes. Toda tela deve resolver a tarefa em **poucos cliques**, sem navegação desnecessária, com linguagem direta em português.

## Módulo Ordens de Serviço — OS (prioridade #1)

### Criar/editar uma OS
Um único botão de destaque (**accent**, cor âmbar) "+ Nova OS", visível tanto na Lista quanto no Kanban, abre um **modal único** (mesmo componente `OrdemServicoFormDialog` para criar e editar):

1. **Número da OS** — sugerido automaticamente (próximo disponível), mas editável (ex.: para manter numeração legada) ou deixar em branco.
2. **Entidade** (combobox com busca por nome, badge indicando Cliente/Parceiro) — obrigatório, autofoco.
3. **Cliente final / Paciente** (texto livre, opcional).
4. **Data de recebimento** (default hoje) + **Data de entrega prevista** — a segunda é sugerida automaticamente a partir do `tempo_medio_dias` dos serviços escolhidos, sempre editável.
5. **Status** (select — Recebido/Em Produção/Pronto para Entrega/Entregue/Cancelado, o mesmo enum do Kanban): ao escolher "Entregue", revela um campo **Data de entrega** (default hoje) — a mesma OS pode assim ser criada/editada já como entregue, sem precisar passar pelo Kanban.
6. **Status financeiro** (toggle Pendente/Pago) e **Forma de pagamento** (texto livre) — viram o ponto de partida da linha em Contas a Receber quando a OS é marcada como entregue (ver "Módulo Contas a Receber" abaixo).
7. **Lista de serviços da OS** — uma OS pode ter vários: cada linha tem Serviço (combobox, auto-preenche valor/comissão de `tabela_precos`, com aviso quando cai no preço padrão ou falta comissão de parceiro), Cor (texto livre), Arco (Superior/Inferior/—), Quantidade (stepper), Valor e Comissão (se parceiro). Botão "+ Adicionar serviço" para novas linhas, mínimo 1. Total da OS calculado e mostrado em tempo real.
8. Botão único "Salvar". Fecha o modal e volta para onde o usuário estava (Lista ou Kanban), sem navegação de página.

### Visão Lista (padrão)
Tabela com busca (nº OS, cliente final, entidade, serviço), filtros rápidos por status (chips clicáveis) e por mês. Coluna "Serviços" mostra o nome do item quando a OS tem só 1, ou "N serviços" quando tem mais. Editar abre o mesmo modal de criação, sem trocar de página. Linhas de OS com status **Entregue** têm um botão de baixar o PDF da OS. Toggle Lista ⇄ Kanban fica fixo no topo do módulo e preserva os filtros ativos ao alternar.

### Visão Kanban
Colunas, na ordem: **Recebido → Em Produção → Pronto para Entrega → Entregue**. `Cancelado` fica fora do quadro (evita poluir visualmente) — acessível via filtro na Lista.

Card mostra: nº OS, nome da entidade, descrição do(s) serviço(s) (nome do item se só 1, "N serviços" se mais), cliente final, e um badge de prazo:
- 🟢 verde — dentro do prazo (`data_prevista` no futuro, folga confortável)
- 🟡 amarelo — próximo do prazo (ex.: ≤ 2 dias)
- 🔴 vermelho — atrasado (`data_prevista` no passado e ainda não `entregue`)

Cards na coluna Entregue têm um pequeno botão de baixar o PDF da OS (ícone de download, canto superior direito).

Arrastar e soltar (`@dnd-kit`) muda o `status` com atualização otimista (feedback visual imediato, sem "esperar carregar" — essencial para não gerar dúvida no usuário leigo se a ação funcionou). Ao soltar um card em **Entregue**: abre confirmação rápida pedindo `data_entrega` (default hoje).

## Módulo Clientes e Parceiros

- Lista única (`EntidadesPage`) com busca, chips de filtro "Todos / Clientes / Parceiros" e checkbox "Mostrar inativos" (registro nunca é apagado de verdade — ver abaixo).
- **Clicar numa linha abre o Extrato** (`EntidadeExtratoPage`, `/clientes-parceiros/:id`) — não mais o cadastro direto. Cada linha também tem dois ícones à parte: lápis (edição rápida do cadastro, sem sair da lista) e carteira (Tabela de Preços).
- Botão "Novo cadastro" continua abrindo direto o modal de criação (`EntidadeFormDialog`) — não faz sentido mostrar um extrato vazio para quem ainda não existe.
- Cadastro em modal único (`EntidadeFormDialog`): tipo (Cliente/Parceiro, botões), nome, documento, telefone, e-mail, endereço, observações; checkbox "Cadastro ativo" só aparece ao editar.
- A **Tabela de Preços** (`TabelaPrecosDialog`) é um modal separado (não um passo do mesmo formulário): um campo numérico por serviço do catálogo, rotulado "Preço" (Cliente) ou "Comissão" (Parceiro); deixar em branco volta a usar o `preco_padrao` do catálogo automaticamente, sem precisar de um botão extra. Para Parceiros, um botão **R$ / %** ao lado de cada linha alterna a entrada: em "%", o campo aceita um percentual do preço padrão do serviço e mostra o valor em R$ calculado logo abaixo — o que é salvo é sempre o valor final em R$ (não uma fórmula). Escrita restrita a `admin` (operador visualiza os valores mas os campos ficam desabilitados, com aviso explicando o motivo). Acessível tanto pela lista quanto pelo Extrato.
- "Excluir" não existe como ação destrutiva — desmarcar "Cadastro ativo" desativa o registro (some dos comboboxes de nova OS, mas o histórico de OS antigas continua intacto).

### Extrato por entidade (`EntidadeExtratoPage`)

Tela dedicada, foco no **resumo de OS** daquele Cliente/Parceiro — o cadastro em si vira um botão à parte:

1. Cabeçalho com nome, badge de tipo, dados de contato.
2. Botões **"Tabela de preços"** e **"Editar cadastro"** — abrem os mesmos modais já usados na lista, sem sair da tela.
3. Filtro de período (chips derivados dos meses com OS daquela entidade, mais "Todos os períodos").
4. Tabela de OS do período (reaproveita o mesmo componente da Lista principal de Ordens de Serviço — clicar numa linha abre o formulário de edição da OS, sem sair do extrato) e o total do período.
5. Botão **"Relatório (PDF)"** — gera e baixa um PDF com as OS do período filtrado (ver "Emissão de documentos" abaixo), pronto para enviar ao próprio Cliente/Parceiro.

## Módulo Catálogo de Serviços

Lista (`ServicosPage`) com busca e chips de categoria (derivados dos dados). CRUD em modal único (`ServicoFormDialog`): nome, categoria, preço padrão, tempo médio de conclusão em dias; checkbox "Serviço ativo" só aparece ao editar (mesma lógica de desativação, não exclusão, do módulo de Clientes e Parceiros). Pré-requisito para o módulo de Ordens de Serviço funcionar — por isso semeado via `supabase/seed.sql` com o catálogo real da GRS Lab.

## Módulo Contas a Receber (`ContasReceberPage`, `/financeiro`)

- Uma linha por OS entregue (tabela `contas_receber`, criada automaticamente — ver `docs/business-rules.md`). Busca por entidade/cliente final/nº OS, chips de status (Todos/Aberto/Pago), filtro de mês, checkbox **"Mostrar cancelados"** (desmarcado por padrão — uma linha cancelada só aparece se o usuário pedir).
- Ação **"Marcar como pago"** (ícone de check verde): abre um modal pequeno pedindo data e forma de pagamento (mesmo padrão do `EntregaConfirmDialog` de Ordens de Serviço), default hoje. Uma conta paga pode voltar para aberta (ícone de cifrão âmbar) sem exigir confirmação — é uma correção operacional simples.
- Ação **"Cancelar"** (ícone de proibido, só visível para `admin`): abre modal com campo de justificativa **obrigatório**. Confirmar marca `status = cancelado` — a linha some da lista padrão, mas nunca é apagada de verdade, e volta a aparecer com "Mostrar cancelados" marcado.
- Total do filtro atual sempre visível no topo da tela.

## Módulo Despesas (`DespesasPage`, `/despesas`)

Cadastro simples, mesmo padrão visual do Catálogo de Serviços: busca, chips de categoria (derivados dos dados existentes), lista com total do filtro atual no topo, modal único de criar/editar (descrição, categoria opcional, valor, data, observações).

## Módulo Fechamento Financeiro (`FechamentoFinanceiroPage`, `/fechamento`)

- Seletor de mês (`input type="month"`). Mostra três números: **Recebido no mês** (Contas a Receber pagas, pelo mês do pagamento), **Despesas no mês** e **Resultado** (recebido − despesas).
- Antes de fechado, os valores são recalculados toda vez que a tela abre. Botão **"Fechar o mês"** (só `admin`) trava um snapshot — a partir daí a tela mostra sempre esse valor travado para aquele mês, com a data em que foi fechado. Fechar de novo atualiza o snapshot (não é uma ação de uso único).
- Distinto do fechamento por entidade que já existe (`fechamentos`, sem tela própria) — este é o resultado do laboratório inteiro.

## Emissão de documentos

- **PDF da Ordem de Serviço**: disponível para OS com status `entregue`, na Lista (ação da linha) e no Kanban (ícone no card) — sempre **baixa o arquivo** (`OS-<número>.pdf`), nunca só abre para visualizar.
- **Relatório de Fechamento**: baixado a partir do Extrato de um Cliente/Parceiro (`EntidadeExtratoPage`), com as OS do período filtrado — sempre baixa o arquivo (`Fechamento-<nome>.pdf`), pronto para enviar ao próprio Cliente/Parceiro.
- **Nota de Serviço** (Fase 4, ainda não implementada): acionada a partir de uma OS `entregue` — documento formal numerado, diferente do PDF simples da OS.

## Estados vazios e erros

- Toda lista vazia (nenhuma OS, nenhum cliente cadastrado) mostra uma frase amigável + botão de ação — nunca uma tela em branco (ver componente `EmConstrucao`/padrão equivalente para "vazio", a construir junto com cada módulo).
- Erros de formulário sempre dizem o que fazer a seguir, nunca só "campo obrigatório" (ex.: "Escolha um cliente ou parceiro antes de salvar").
- Ações destrutivas (excluir cliente, cancelar OS) sempre pedem confirmação explícita em modal.

## Responsividade

Sidebar completa em telas médias/grandes (`md:` e acima). Em telas pequenas (celular/tablet no balcão do laboratório), uma barra de navegação horizontal simplificada substitui a sidebar (`MobileNav`). Revisão fina de responsividade fica para a Fase 5 do roadmap — a base atual já é utilizável em tablet, mas não polida.
