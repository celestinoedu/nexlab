-- =============================================================================
-- NexLab — Migration 0005: data de pagamento na OS + correção da trigger
--
-- Bug: quando uma OS é criada/editada já como "entregue" + status financeiro
-- "pago" (via popup de informações financeiras no formulário), a trigger
-- trg_fn_criar_conta_receber (0003/0004) gravava status = 'pago' mas nunca
-- preenchia data_pagamento — o Fechamento Financeiro soma "recebido no mês"
-- filtrando por essa data, então uma conta paga sem ela nunca é contada.
--
-- Correção definitiva: a OS passa a guardar sua própria data_pagamento
-- (preenchida no popup financeiro do formulário), e a trigger usa esse valor
-- ao criar a linha em contas_receber.
-- =============================================================================

alter table ordens_servico add column data_pagamento date;
comment on column ordens_servico.data_pagamento is 'Preenchida no popup de informações financeiras do formulário quando status_pagamento = pago; copiada pra contas_receber na criação da linha.';

create or replace function trg_fn_criar_conta_receber() returns trigger as $$
declare
  v_tipo tipo_entidade;
  v_valor numeric(10, 2);
  v_status status_conta_receber;
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

    v_status := (case when new.status_pagamento = 'pago' then 'pago' else 'aberto' end)::status_conta_receber;

    insert into contas_receber (ordem_id, entidade_id, mes_referencia, valor, status, forma_pagamento, data_pagamento)
    values (
      new.id,
      new.entidade_id,
      new.mes_referencia,
      greatest(v_valor, 0),
      v_status,
      new.forma_pagamento,
      case when v_status = 'pago' then coalesce(new.data_pagamento, new.data_entrega, current_date) else null end
    )
    on conflict (ordem_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Corrige retroativamente linhas já pagas sem data de pagamento.
update contas_receber
set data_pagamento = current_date
where status = 'pago' and data_pagamento is null;
