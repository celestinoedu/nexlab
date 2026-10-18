-- =============================================================================
-- NexLab — Migration 0028: integridade financeira e isolamento por empresa
--
-- Achados confirmados pelos testes de banco (Postgres local, 2026-10-18) e
-- pela auditoria docs/auditoria-logica-v0.23.0.md:
--
-- 1. sincronizar_conta_receber_ordem(uuid) é security definer e estava
--    executável por anon/authenticated via RPC: qualquer pessoa com o UUID de
--    uma OS podia recriar/recalcular a cobrança de outro laboratório. Ela só
--    é chamada pelos triggers, que rodam como dono da função.
-- 2. fechamentos_financeiros tinha UNIQUE (mes_referencia) global: o primeiro
--    laboratório a fechar um mês impedia todos os outros (F01). Passa a ser
--    único por empresa + mês. notas_servico tinha o mesmo problema no número.
-- 3. A sincronização reescrevia o valor de contas já pagas ao editar a OS,
--    alterando um recebimento histórico (F03). Contas pagas ou canceladas
--    manualmente não são mais alteradas pela sincronização.
-- 4. A cobrança aberta continuava valendo quando a OS saía de "Entregue"
--    (volta para produção ou cancelamento) (F02). Agora ela é suspensa
--    (status cancelado com justificativa automática) e reaberta se a OS for
--    entregue de novo. Recebimentos (status pago) nunca são tocados.
--
-- Seguro para rodar mais de uma vez.
-- =============================================================================

-- 1. RPC exposta ---------------------------------------------------------------
revoke all on function public.sincronizar_conta_receber_ordem(uuid) from public, anon, authenticated;

-- 2. Unicidade por empresa -----------------------------------------------------
alter table public.fechamentos_financeiros
  drop constraint if exists fechamentos_financeiros_mes_referencia_key;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fechamentos_financeiros_empresa_mes_key') then
    alter table public.fechamentos_financeiros
      add constraint fechamentos_financeiros_empresa_mes_key unique (empresa_id, mes_referencia);
  end if;
end $$;

alter table public.notas_servico drop constraint if exists notas_servico_numero_key;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'notas_servico_empresa_numero_key') then
    alter table public.notas_servico
      add constraint notas_servico_empresa_numero_key unique (empresa_id, numero);
  end if;
end $$;

-- 3 e 4. Sincronização da conta a receber --------------------------------------
create or replace function public.sincronizar_conta_receber_ordem(p_ordem_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c_suspensa constant text := 'Suspensa automaticamente: a OS saiu do status Entregue.';
  v_ordem ordens_servico%rowtype;
  v_tipo tipo_entidade;
  v_valor numeric(10, 2);
  v_status status_conta_receber;
begin
  select * into v_ordem
  from ordens_servico
  where id = p_ordem_id;

  if not found then
    return;
  end if;

  if v_ordem.status <> 'entregue' then
    update contas_receber
       set status = 'cancelado',
           justificativa_cancelamento = c_suspensa
     where ordem_id = v_ordem.id
       and status = 'aberto';
    return;
  end if;

  select tipo into v_tipo
  from entidades
  where id = v_ordem.entidade_id;

  select greatest(
    coalesce(
      sum(
        (case
          when v_tipo = 'parceiro' then coalesce(i.valor_comissao, 0)
          else i.valor_unitario
        end) * i.quantidade
      ),
      0
    ) - v_ordem.desconto,
    0
  )
  into v_valor
  from ordem_servico_itens i
  where i.ordem_id = v_ordem.id;

  v_status := (
    case when v_ordem.status_pagamento = 'pago' then 'pago' else 'aberto' end
  )::status_conta_receber;

  insert into contas_receber (
    ordem_id,
    entidade_id,
    mes_referencia,
    valor,
    status,
    forma_pagamento,
    data_pagamento
  )
  values (
    v_ordem.id,
    v_ordem.entidade_id,
    v_ordem.mes_referencia,
    v_valor,
    v_status,
    v_ordem.forma_pagamento,
    case
      when v_status = 'pago'
        then coalesce(v_ordem.data_pagamento, v_ordem.data_entrega, current_date)
      else null
    end
  )
  on conflict (ordem_id) do update
  set entidade_id = excluded.entidade_id,
      mes_referencia = excluded.mes_referencia,
      valor = excluded.valor,
      status = case
        when contas_receber.status = 'cancelado' then excluded.status
        else contas_receber.status
      end,
      forma_pagamento = case
        when contas_receber.status = 'cancelado' then excluded.forma_pagamento
        else contas_receber.forma_pagamento
      end,
      data_pagamento = case
        when contas_receber.status = 'cancelado' then excluded.data_pagamento
        else contas_receber.data_pagamento
      end,
      justificativa_cancelamento = case
        when contas_receber.status = 'cancelado' then null
        else contas_receber.justificativa_cancelamento
      end
  -- Só contas em aberto acompanham a OS; uma suspensa automaticamente é
  -- reaberta. Pagas e canceladas pelo usuário ficam como estão.
  where contas_receber.status = 'aberto'
     or (contas_receber.status = 'cancelado' and contas_receber.justificativa_cancelamento = c_suspensa);
end;
$$;

revoke all on function public.sincronizar_conta_receber_ordem(uuid) from public, anon, authenticated;

comment on function public.sincronizar_conta_receber_ordem(uuid) is
  'Mantém a conta a receber da OS em sincronia. Uso interno dos triggers; não exposta via API. Contas pagas ou canceladas manualmente não são alteradas; OS fora de Entregue suspende a cobrança aberta.';
