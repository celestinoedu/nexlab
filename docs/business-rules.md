# NexLab — Regras de negócio

## Clientes vs. Parceiros

- **Cliente**: consultório/dentista atendido diretamente pelo GRS Lab. O GRS Lab cobra o **valor cheio** do serviço.
- **Parceiro**: laboratório maior para quem o GRS Lab presta serviço como subcontratado. O Parceiro paga uma **comissão** por serviço entregue (não o valor cheio).
- Mesma tabela (`entidades`), diferenciadas por `tipo`. Isso significa que a mesma demanda, dependendo da entidade vinculada, usa `valor_servico` (cliente) ou `valor_comissao` (parceiro) como o que o GRS Lab efetivamente recebe.

## Tabela de preços por entidade × serviço

Confirmado com o cliente: **não existe uma % genérica automática de comissão**. Cada Parceiro negocia um valor (fixo ou equivalente a uma % implícita) por tipo de serviço, e cada Cliente pode ter seu próprio preço de venda por serviço. Evidência real (relatórios recebidos dos parceiros — mantidos só localmente em `docs/assets/relatorios-exemplo/`, **não versionados** por conterem nomes de pacientes de terceiros; repositório é público):

- **SpartanDentalLab**: comissão em valor fixo por tipo de serviço, sem relação de % constante (ex.: PIPS R$642 → comissão R$135 ≈ 21%; Meia Mola R$29 → R$8 ≈ 27,5%).
- **MS Laboratorio**: comissão em % fixo de 37% sobre todos os itens (mas isso é uma coincidência de negociação desse parceiro específico — não uma regra do sistema).

Por isso a tabela `tabela_precos` guarda o **valor final já negociado** por `entidade_id × servico_id`, e não uma fórmula. Ao criar uma demanda, o sistema busca esse valor automaticamente; se não existir, cai no `preco_padrao` do catálogo (`servicos`) — só relevante para Clientes (Parceiros sem preço específico cadastrado não devem gerar comissão "adivinhada").

## Fechamento mensal ("mês cheio")

Todo fechamento financeiro considera o mês **completo**: do dia 1 ao último dia do mesmo mês — nunca um período parcial ou "mês móvel" (ex.: dia 15 a dia 14). A coluna `demandas.mes_referencia` já calcula isso automaticamente a partir de `data_entrega` (ou `data_entrada` se ainda não entregue). A tela de Contas a Receber sempre agrupa por esse mês cheio.

## Ordem de status de uma demanda (Kanban)

`recebido` → `em_producao` → `pronto_entrega` → `entregue`. `cancelado` é um estado terminal alternativo, fora do fluxo principal (não aparece como coluna do Kanban — ver `docs/ux-flows.md`). Só demandas com `status = 'entregue'` entram no cálculo de Contas a Receber (`vw_contas_receber`) — uma demanda em produção não é "a receber" ainda.

## Numeração

- **Nº OS** (`demandas.numero_os`): sequencial interno automático do GRS Lab, gerado pelo banco. Não é o número de OS do laboratório parceiro (esse, se precisar ser registrado, vai em `observacoes`).
- **Nota de Serviço** (`notas_servico.numero`): `prefixo_nota_servico` + sequencial, controlado por `empresa_config.proximo_numero_nota`. Documento **sem valor fiscal** — não substitui nota fiscal eletrônica.

## Contas a Receber

- Reflete o que falta receber de cada **Parceiro** (comissões) e de cada **Cliente** (venda direta), agrupado por mês cheio.
- "Fechar o mês" (ação em `fechamentos`) tira uma foto do valor total daquele momento — se uma demanda antiga daquele mês for editada depois, o valor já fechado **não muda sozinho** (evita divergência com o que já foi cobrado/comunicado ao Parceiro/Cliente).
- Um fechamento pode estar `aberto` (mês corrente, ainda somando) → `fechado` (valor travado, aguardando pagamento) → `pago` (recebido, com data de pagamento).

## Emissão de documentos

- **Relatório de Fechamento**: por entidade + mês, replica o formato dos relatórios reais recebidos dos parceiros (linha a linha: Nº OS, datas, cliente final, serviço, quantidade, valor, comissão) — serve tanto para o GRS Lab cobrar um Cliente quanto para conferir/cobrar a comissão de um Parceiro.
- **Nota de Serviço**: emitida por demanda entregue, formato cupom, sem valor fiscal — comprovante interno de entrega/cobrança.

## Perfis de usuário

- `admin`: acesso completo, incluindo editar preços/comissões (`tabela_precos`), configuração da empresa e fechar/marcar pagamento em Contas a Receber.
- `operador`: opera o dia a dia (criar/editar demandas, cadastrar Clientes/Parceiros, emitir Nota de Serviço) mas não altera preços nem fecha o financeiro — reduz risco de erro por parte de quem só usa o sistema para o fluxo operacional.
