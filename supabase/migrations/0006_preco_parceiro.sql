-- =============================================================================
-- NexLab — Migration 0006: preço do parceiro em tabela_precos
--
-- Além da comissão (coluna preco, já existente), agora dá pra registrar o
-- preço que o próprio Parceiro cobra por cada serviço na tabela dele — usado
-- só como referência pra conferir se a comissão negociada está correta (o
-- pagamento da comissão é baseado na tabela de preço do Parceiro, não na do
-- GRS Lab). Não entra em nenhum cálculo automático: Fechamento Financeiro,
-- Contas a Receber e o total da OS continuam 100% baseados na comissão.
-- =============================================================================

alter table tabela_precos add column preco_parceiro numeric(10, 2);
comment on column tabela_precos.preco_parceiro is 'Preço do serviço na tabela do próprio Parceiro — só referência (conferir a comissão), não entra em cálculo nenhum. Sem sentido quando entidades.tipo = cliente.';
