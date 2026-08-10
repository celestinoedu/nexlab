-- =============================================================================
-- NexLab — Migration 0004: corrige trg_fn_criar_conta_receber (0003)
--
-- Bug: o CASE que define o status inicial da conta a receber retornava um
-- literal `text` ('pago'/'aberto'), não `status_conta_receber` — Postgres não
-- faz o cast implícito de texto para enum dentro de uma expressão CASE usada
-- num INSERT, e toda OS movida para "entregue" passava a falhar com:
--   "column "status" is of type status_conta_receber but expression is of type text"
-- Corrigido com um cast explícito ao final do CASE.
-- =============================================================================

create or replace function trg_fn_criar_conta_receber() returns trigger as $$
declare
  v_tipo tipo_entidade;
  v_valor numeric(10, 2);
begin
  if new.status = 'entregue' and (old.status is distinct from 'entregue') then
    select tipo into v_tipo from entidades where id = new.entidade_id;

    select coalesce(
      sum(
        (case when v_tipo = 'parceiro' then coalesce(i.valor_comissao, 0) else i.valor_unitario end)
        * i.quantidade
      ),
      0
    ) - new.desconto
    into v_valor
    from ordem_servico_itens i
    where i.ordem_id = new.id;

    insert into contas_receber (ordem_id, entidade_id, mes_referencia, valor, status, forma_pagamento)
    values (
      new.id,
      new.entidade_id,
      new.mes_referencia,
      greatest(v_valor, 0),
      (case when new.status_pagamento = 'pago' then 'pago' else 'aberto' end)::status_conta_receber,
      new.forma_pagamento
    )
    on conflict (ordem_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
