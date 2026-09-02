-- =============================================================================
-- NexLab — Migration 0017: mantém Contas a Receber sincronizado com a OS
--
-- A trigger anterior era executada logo após salvar o cabeçalho da OS. Em uma
-- criação já como "entregue", os itens ainda não existiam e a conta nascia em
-- R$ 0. Em uma edição que entregava a OS, ela lia os itens antigos, pois o
-- frontend só os substituía depois. Edições posteriores também não atualizavam
-- valor, entidade ou mês da conta.
--
-- Esta migration centraliza o cálculo, sincroniza após alterações no cabeçalho
-- e nos itens e corrige retroativamente todas as OS entregues. Estado de baixa
-- (aberto/pago/cancelado) e dados de pagamento já administrados no Financeiro
-- são preservados quando a conta já existe.
-- =============================================================================

create or replace function sincronizar_conta_receber_ordem(p_ordem_id uuid)
returns void as $$
declare
  v_ordem ordens_servico%rowtype;
  v_tipo tipo_entidade;
  v_valor numeric(10, 2);
  v_status status_conta_receber;
begin
  select * into v_ordem
  from ordens_servico
  where id = p_ordem_id;

  if not found or v_ordem.status <> 'entregue' then
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
      valor = excluded.valor;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function trg_fn_sincronizar_conta_receber_os()
returns trigger as $$
begin
  perform sincronizar_conta_receber_ordem(new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function trg_fn_sincronizar_conta_receber_item()
returns trigger as $$
begin
  if tg_op = 'DELETE' then
    perform sincronizar_conta_receber_ordem(old.ordem_id);
    return old;
  end if;

  perform sincronizar_conta_receber_ordem(new.ordem_id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_os_criar_conta_receber on ordens_servico;
drop trigger if exists trg_os_sincronizar_conta_receber on ordens_servico;
create trigger trg_os_sincronizar_conta_receber
  after insert or update of status, entidade_id, data_recebimento, data_entrega, desconto
  on ordens_servico
  for each row execute function trg_fn_sincronizar_conta_receber_os();

drop trigger if exists trg_os_item_sincronizar_conta_receber on ordem_servico_itens;
create trigger trg_os_item_sincronizar_conta_receber
  after insert or update or delete on ordem_servico_itens
  for each row execute function trg_fn_sincronizar_conta_receber_item();

-- Repara contas zeradas/desatualizadas e cria alguma linha histórica faltante.
do $$
declare
  v_ordem_id uuid;
begin
  for v_ordem_id in
    select id from ordens_servico where status = 'entregue'
  loop
    perform sincronizar_conta_receber_ordem(v_ordem_id);
  end loop;
end;
$$;

comment on function sincronizar_conta_receber_ordem(uuid) is
  'Recalcula valor, entidade e mês da Conta a Receber de uma OS entregue, preservando o estado de baixa já administrado no Financeiro.';
