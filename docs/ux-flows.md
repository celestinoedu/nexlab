# NexLab — Fluxos de UX

> Princípio geral (ver também `docs/design-system.md` § 6): o usuário nunca usou um sistema antes. Toda tela deve resolver a tarefa em **poucos cliques**, sem navegação desnecessária, com linguagem direta em português.

## Módulo Demandas (prioridade #1)

### Criar/editar demanda
Um único botão de destaque (**accent**, cor âmbar) "+ Nova Demanda", visível tanto no Kanban quanto na Lista, abre um **modal único** (mesmo componente `DemandaForm` para criar e editar):

1. **Entidade** (combobox com busca por nome, badge indicando Cliente/Parceiro) — obrigatório, autofoco.
2. **Serviço** (combobox) — ao escolher, busca automaticamente o preço/comissão em `tabela_precos` para aquela entidade; se não houver preço específico, usa `preco_padrao` do catálogo e mostra um aviso sutil ("usando preço padrão — cadastre um preço específico se for diferente").
3. **Cliente final / Paciente** (texto livre, opcional).
4. **Quantidade** (stepper, default 1).
5. **Data prevista de entrega** (date picker, opcional).
6. Botão único "Salvar" — Enter também confirma. Fecha o modal e volta para onde o usuário estava (Kanban ou Lista), sem navegação de página.

### Visão Kanban
Colunas, na ordem: **Recebido → Em Produção → Pronto para Entrega → Entregue**. `Cancelado` fica fora do quadro (evita poluir visualmente) — acessível via filtro na Lista ou menu de contexto do card.

Card mostra: nº OS, nome da entidade, serviço (truncado se longo), cliente final, e um badge de prazo:
- 🟢 verde — dentro do prazo (`data_prevista` no futuro, folga confortável)
- 🟡 amarelo — próximo do prazo (ex.: ≤ 2 dias)
- 🔴 vermelho — atrasado (`data_prevista` no passado e ainda não `entregue`)

Arrastar e soltar (`@dnd-kit`) muda o `status` com atualização otimista (feedback visual imediato, sem "esperar carregar" — essencial para não gerar dúvida no usuário leigo se a ação funcionou). Ao soltar um card em **Entregue**: abre confirmação rápida pedindo `data_entrega` (default hoje) com botão opcional "Gerar Nota de Serviço agora" — não é obrigatório, o usuário pode pular e gerar depois pela Lista.

### Visão Lista
Tabela com busca (nº OS, cliente final, entidade), filtros rápidos por status (chips clicáveis) e por mês. Editar abre o mesmo modal de criação, sem trocar de página. Toggle Kanban ⇄ Lista fica fixo no topo do módulo e preserva os filtros ativos ao alternar.

## Módulo Clientes e Parceiros

- Lista em duas abas: "Clientes" e "Parceiros" (filtra por `entidades.tipo`).
- Cadastro simples: nome, documento, telefone, e-mail, endereço.
- Dentro do cadastro, uma seção **"Tabela de Preços"**: lista todo o catálogo de `servicos` com um campo de preço editável **inline** por linha (sem abrir outro modal); serviços ainda sem preço específico mostram o `preco_padrao` em cinza claro com um botão "usar este valor" que grava a linha em `tabela_precos`.

## Módulo Catálogo de Serviços

CRUD simples (nome, categoria, preço padrão). Pré-requisito para o módulo de Demandas funcionar — por isso semeado via `supabase/seed.sql` com os serviços já identificados nos relatórios reais.

## Módulo Contas a Receber

- Tela agrupada por entidade × mês (a partir de `vw_contas_receber`), com badges de status (`aberto` cinza, `fechado` âmbar, `pago` verde).
- Ação "Fechar mês" grava um snapshot em `fechamentos` (trava o valor).
- Ação "Marcar como pago" registra `data_pagamento`.
- Botão "Gerar Relatório de Fechamento (PDF)" por entidade/mês, no formato dos relatórios reais.

## Emissão de documentos

- **Relatório de Fechamento**: acionado a partir de Contas a Receber (por entidade + mês) ou de uma tela de Relatórios dedicada.
- **Nota de Serviço**: acionada a partir de uma demanda `entregue` (no Kanban, ao mover para "Entregue", ou na Lista via ação rápida).

## Estados vazios e erros

- Toda lista vazia (nenhuma demanda, nenhum cliente cadastrado) mostra uma frase amigável + botão de ação — nunca uma tela em branco (ver componente `EmConstrucao`/padrão equivalente para "vazio", a construir junto com cada módulo).
- Erros de formulário sempre dizem o que fazer a seguir, nunca só "campo obrigatório" (ex.: "Escolha um cliente ou parceiro antes de salvar").
- Ações destrutivas (excluir cliente, cancelar demanda) sempre pedem confirmação explícita em modal.

## Responsividade

Sidebar completa em telas médias/grandes (`md:` e acima). Em telas pequenas (celular/tablet no balcão do laboratório), uma barra de navegação horizontal simplificada substitui a sidebar (`MobileNav`). Revisão fina de responsividade fica para a Fase 5 do roadmap — a base atual já é utilizável em tablet, mas não polida.
