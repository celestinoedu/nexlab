-- =============================================================================
-- NexLab — Migration 0019: reabertura e consistência do status financeiro
--
-- A sincronização de valor da migration 0017 preserva corretamente a baixa
-- feita no Financeiro durante edições comuns da OS. Porém, ela também acabava
-- ignorando uma alteração financeira explícita feita no formulário da OS.
-- Estes triggers sincronizam somente quando os campos financeiros mudam e
-- mantêm OS e Conta a Receber coerentes nos dois sentidos.
-- =============================================================================

create or replace function trg_fn_sincronizar_baixa_conta_da_os()
returns trigger as $$
begin
  if new.status <> 'entregue' then
    return new;
  end if;

  update contas_receber
  set status = (
        case when new.status_pagamento = 'pago' then 'pago' else 'aberto' end
      )::status_conta_receber,
      forma_pagamento = new.forma_pagamento,
      data_pagamento = case
        when new.status_pagamento = 'pago'
          then coalesce(new.data_pagamento, new.data_entrega, current_date)
        else null
      end,
      justificativa_cancelamento = null
  where ordem_id = new.id
    and status <> 'cancelado';

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_os_sincronizar_baixa_conta on ordens_servico;
create trigger trg_os_sincronizar_baixa_conta
  after update of status_pagamento, forma_pagamento, data_pagamento
  on ordens_servico
  for each row
  when (
    old.status_pagamento is distinct from new.status_pagamento
    or old.forma_pagamento is distinct from new.forma_pagamento
    or old.data_pagamento is distinct from new.data_pagamento
  )
  execute function trg_fn_sincronizar_baixa_conta_da_os();

create or replace function trg_fn_sincronizar_baixa_os_da_conta()
returns trigger as $$
begin
  -- Cancelamento não possui equivalente no status financeiro da OS.
  if new.status = 'cancelado' then
    return new;
  end if;

  update ordens_servico
  set status_pagamento = (
        case when new.status = 'pago' then 'pago' else 'pendente' end
      )::status_pagamento_os,
      forma_pagamento = new.forma_pagamento,
      data_pagamento = case when new.status = 'pago' then new.data_pagamento else null end
  where id = new.ordem_id;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_conta_sincronizar_baixa_os on contas_receber;
create trigger trg_conta_sincronizar_baixa_os
  after update of status, forma_pagamento, data_pagamento
  on contas_receber
  for each row
  when (
    old.status is distinct from new.status
    or old.forma_pagamento is distinct from new.forma_pagamento
    or old.data_pagamento is distinct from new.data_pagamento
  )
  execute function trg_fn_sincronizar_baixa_os_da_conta();

-- Corrige contas históricas (como a OS #4857) que ficaram abertas apesar de
-- a OS já estar explicitamente marcada como paga. Cancelamentos são preservados.
update contas_receber c
set status = 'pago'::status_conta_receber,
    forma_pagamento = coalesce(o.forma_pagamento, c.forma_pagamento),
    data_pagamento = coalesce(o.data_pagamento, o.data_entrega, c.data_pagamento, current_date),
    justificativa_cancelamento = null
from ordens_servico o
where c.ordem_id = o.id
  and o.status = 'entregue'
  and o.status_pagamento = 'pago'
  and c.status = 'aberto';

comment on function trg_fn_sincronizar_baixa_conta_da_os() is
  'Propaga para a Conta a Receber uma alteração financeira explícita feita na OS.';

comment on function trg_fn_sincronizar_baixa_os_da_conta() is
  'Mantém o status financeiro da OS coerente com baixas feitas em Contas a Receber.';
