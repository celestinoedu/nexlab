# NexLab — Fluxos de UX

> Princípio geral (ver também `docs/design-system.md` § 6): o usuário nunca usou um sistema antes. Toda tela deve resolver a tarefa em **poucos cliques**, sem navegação desnecessária, com linguagem direta em português.

## Módulo Ordens de Serviço — OS (prioridade #1)

### Criar/editar uma OS
Um único botão de destaque (**accent**, cor âmbar) "+ Nova OS", visível tanto na Lista quanto no Kanban, abre um **modal único** (mesmo componente `OrdemServicoFormDialog` para criar e editar):

1. **Número da OS** — sugerido automaticamente (próximo disponível), mas editável (ex.: para manter numeração legada) ou deixar em branco.
2. **Entidade** (combobox com busca por nome, badge indicando Cliente/Parceiro) — obrigatório, autofoco.
3. **Cliente final / Paciente** (texto livre, opcional).
4. **Data de recebimento** (default hoje) + **Data de entrega prevista** — a segunda é sugerida automaticamente a partir do `tempo_medio_dias` dos serviços escolhidos, sempre editável.
5. **Lista de serviços da OS** — uma OS pode ter vários: cada linha tem Serviço (combobox, auto-preenche valor/comissão de `tabela_precos`, com aviso quando cai no preço padrão ou falta comissão de parceiro), Cor (texto livre), Arco (Superior/Inferior/—), Quantidade (stepper), Valor e Comissão (se parceiro). Botão "+ Adicionar serviço" para novas linhas, mínimo 1. Total da OS calculado e mostrado em tempo real.
6. Botão único "Salvar". Fecha o modal e volta para onde o usuário estava (Lista ou Kanban), sem navegação de página.

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

- Lista em duas abas: "Clientes" e "Parceiros" (filtra por `entidades.tipo`).
- Cadastro simples: nome, documento, telefone, e-mail, endereço.
- Dentro do cadastro, uma seção **"Tabela de Preços"**: lista todo o catálogo de `servicos` com um campo de preço editável **inline** por linha (sem abrir outro modal); serviços ainda sem preço específico mostram o `preco_padrao` em cinza claro com um botão "usar este valor" que grava a linha em `tabela_precos`.

## Módulo Catálogo de Serviços

CRUD simples (nome, categoria, preço padrão, tempo médio de conclusão em dias). Pré-requisito para o módulo de Ordens de Serviço funcionar — por isso semeado via `supabase/seed.sql` com o catálogo real da GRS Lab.

## Módulo Contas a Receber

- Tela agrupada por entidade × mês (a partir de `vw_contas_receber`), com badges de status (`aberto` cinza, `fechado` âmbar, `pago` verde).
- Ação "Fechar mês" grava um snapshot em `fechamentos` (trava o valor).
- Ação "Marcar como pago" registra `data_pagamento`.
- Botão "Gerar Relatório de Fechamento (PDF)" por entidade/mês, no formato dos relatórios reais.

## Emissão de documentos

- **PDF da Ordem de Serviço**: disponível para OS com status `entregue`, na Lista (ação da linha) e no Kanban (ícone no card) — sempre **baixa o arquivo** (`OS-<número>.pdf`), nunca só abre para visualizar.
- **Relatório de Fechamento** (Fase 4): acionado a partir de Contas a Receber (por entidade + mês) ou de uma tela de Relatórios dedicada.
- **Nota de Serviço** (Fase 4): acionada a partir de uma OS `entregue` — documento formal numerado, diferente do PDF simples da OS.

## Estados vazios e erros

- Toda lista vazia (nenhuma OS, nenhum cliente cadastrado) mostra uma frase amigável + botão de ação — nunca uma tela em branco (ver componente `EmConstrucao`/padrão equivalente para "vazio", a construir junto com cada módulo).
- Erros de formulário sempre dizem o que fazer a seguir, nunca só "campo obrigatório" (ex.: "Escolha um cliente ou parceiro antes de salvar").
- Ações destrutivas (excluir cliente, cancelar OS) sempre pedem confirmação explícita em modal.

## Responsividade

Sidebar completa em telas médias/grandes (`md:` e acima). Em telas pequenas (celular/tablet no balcão do laboratório), uma barra de navegação horizontal simplificada substitui a sidebar (`MobileNav`). Revisão fina de responsividade fica para a Fase 5 do roadmap — a base atual já é utilizável em tablet, mas não polida.
