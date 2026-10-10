-- =============================================================================
-- NexLab — Migration 0026: pagamento da mensalidade pelo Mercado Pago
-- =============================================================================
-- O cliente paga pelo Checkout Pro (Pix, cartão, boleto) ou ativa o débito
-- automático no cartão (assinatura/preapproval). A Edge Function
-- `mercadopago-webhook` confirma o pagamento na API do Mercado Pago e chama
-- `registrar_pagamento_mercadopago`, que dá a mesma baixa do botão
-- "Registrar pagamento" do painel.

alter table public.faturas_assinatura
  add column origem text not null default 'manual' check (origem in ('manual', 'mercadopago')),
  add column forma_pagamento text,
  add column mp_payment_id text;

comment on column public.faturas_assinatura.forma_pagamento is
  'Como o cliente pagou (pix, cartao_credito, cartao_debito, boleto, saldo_mercadopago). Nulo em baixas manuais.';

alter table public.assinaturas
  add column mp_preapproval_id text unique,
  add column mp_preapproval_status text;

comment on column public.assinaturas.mp_preapproval_status is
  'Situação do débito automático no Mercado Pago: pending, authorized, paused ou cancelled.';

-- Um pagamento do Mercado Pago só é processado uma vez, mesmo que o
-- webhook chegue repetido (payment.created, payment.updated, reenvios).
create table public.pagamentos_mercadopago (
  mp_payment_id text primary key,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  valor numeric(10, 2) not null,
  parcelas integer not null check (parcelas between 1 and 12),
  forma_pagamento text,
  processado_em timestamptz not null default now()
);

comment on table public.pagamentos_mercadopago is
  'Pagamentos do Mercado Pago já processados pelo webhook — garante que cada um dê baixa uma única vez.';

alter table public.pagamentos_mercadopago enable row level security;
revoke all on public.pagamentos_mercadopago from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Núcleo da baixa (sem checagem de permissão — só chamado por funções que já
-- validaram quem está chamando)
-- -----------------------------------------------------------------------------
create or replace function public.quitar_mensalidade(
  p_empresa_id uuid,
  p_valor numeric,
  p_data_pagamento date,
  p_origem text default 'manual',
  p_forma_pagamento text default null,
  p_mp_payment_id text default null
)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assinatura public.assinaturas;
  v_mes date;
  v_ultimo_dia integer;
  v_proximo date;
begin
  select * into v_assinatura from public.assinaturas
   where empresa_id = p_empresa_id
   for update;
  if not found then
    raise exception 'Configure a assinatura antes de registrar pagamentos.';
  end if;
  if p_valor is null or p_valor < 0 then
    raise exception 'Informe o valor pago.';
  end if;

  insert into public.faturas_assinatura (
    empresa_id, competencia, valor, status, data_vencimento, data_pagamento,
    origem, forma_pagamento, mp_payment_id
  )
  values (
    p_empresa_id,
    date_trunc('month', v_assinatura.proximo_vencimento)::date,
    p_valor,
    'paga',
    v_assinatura.proximo_vencimento,
    coalesce(p_data_pagamento, (now() at time zone 'America/Sao_Paulo')::date),
    p_origem,
    p_forma_pagamento,
    p_mp_payment_id
  )
  on conflict (empresa_id, competencia) do update
     set valor = excluded.valor,
         status = 'paga',
         data_vencimento = excluded.data_vencimento,
         data_pagamento = excluded.data_pagamento,
         origem = excluded.origem,
         forma_pagamento = excluded.forma_pagamento,
         mp_payment_id = excluded.mp_payment_id;

  v_mes := (date_trunc('month', v_assinatura.proximo_vencimento) + interval '1 month')::date;
  v_ultimo_dia := extract(day from (v_mes + interval '1 month' - interval '1 day'))::integer;
  v_proximo := v_mes + (least(v_assinatura.dia_vencimento, v_ultimo_dia) - 1);

  update public.assinaturas set proximo_vencimento = v_proximo where empresa_id = p_empresa_id;
  return v_proximo;
end;
$$;

revoke all on function public.quitar_mensalidade(uuid, numeric, date, text, text, text) from public, anon, authenticated;

-- O botão do painel passa a usar o mesmo núcleo.
create or replace function public.admin_registrar_pagamento(
  p_empresa_id uuid,
  p_valor numeric,
  p_data_pagamento date
)
returns date
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_platform_admin();
  return public.quitar_mensalidade(p_empresa_id, p_valor, p_data_pagamento);
end;
$$;

-- Chamada pela Edge Function do webhook (service role). Um pagamento pode
-- quitar várias mensalidades atrasadas de uma vez; cada uma avança um mês.
create or replace function public.registrar_pagamento_mercadopago(
  p_empresa_id uuid,
  p_mp_payment_id text,
  p_valor_total numeric,
  p_parcelas integer,
  p_data_pagamento date,
  p_forma_pagamento text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parcelas integer := greatest(1, least(coalesce(p_parcelas, 1), 12));
  v_valor_parcela numeric := round(p_valor_total / v_parcelas, 2);
begin
  insert into public.pagamentos_mercadopago (mp_payment_id, empresa_id, valor, parcelas, forma_pagamento)
  values (p_mp_payment_id, p_empresa_id, p_valor_total, v_parcelas, p_forma_pagamento)
  on conflict (mp_payment_id) do nothing;
  if not found then
    return false; -- já processado antes
  end if;

  for i in 1..v_parcelas loop
    perform public.quitar_mensalidade(
      p_empresa_id, v_valor_parcela, p_data_pagamento, 'mercadopago', p_forma_pagamento, p_mp_payment_id
    );
  end loop;
  return true;
end;
$$;

revoke all on function public.registrar_pagamento_mercadopago(uuid, text, numeric, integer, date, text) from public, anon, authenticated;
grant execute on function public.registrar_pagamento_mercadopago(uuid, text, numeric, integer, date, text) to service_role;

-- -----------------------------------------------------------------------------
-- Listagens do painel ganham débito automático e origem do pagamento
-- (mudar colunas de retorno exige recriar a função)
-- -----------------------------------------------------------------------------
drop function public.admin_listar_assinaturas();
create function public.admin_listar_assinaturas()
returns table (
  empresa_id uuid,
  nome_fantasia text,
  email text,
  telefone text,
  criada_em timestamptz,
  usuarios_ativos bigint,
  valor_mensal numeric,
  proximo_vencimento date,
  dia_vencimento smallint,
  dias_aviso smallint,
  ativa boolean,
  ultimo_pagamento date,
  debito_automatico text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.exigir_platform_admin();

  return query
  select e.id,
         e.nome_fantasia,
         e.email,
         e.telefone,
         e.created_at,
         (select count(*) from public.profiles p where p.empresa_id = e.id and p.ativo),
         a.valor_mensal,
         a.proximo_vencimento,
         a.dia_vencimento,
         a.dias_aviso,
         a.ativa,
         (select max(f.data_pagamento) from public.faturas_assinatura f
           where f.empresa_id = e.id and f.status = 'paga'),
         a.mp_preapproval_status
    from public.empresas e
    left join public.assinaturas a on a.empresa_id = e.id
   where not e.is_demo
   order by e.nome_fantasia;
end;
$$;

drop function public.admin_listar_pagamentos(uuid);
create function public.admin_listar_pagamentos(p_empresa_id uuid)
returns table (
  id uuid,
  competencia date,
  valor numeric,
  data_vencimento date,
  data_pagamento date,
  origem text,
  forma_pagamento text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.exigir_platform_admin();

  return query
  select f.id, f.competencia, f.valor, f.data_vencimento, f.data_pagamento, f.origem, f.forma_pagamento
    from public.faturas_assinatura f
   where f.empresa_id = p_empresa_id and f.status = 'paga'
   order by f.data_vencimento desc
   limit 24;
end;
$$;

revoke all on function public.admin_listar_assinaturas() from public, anon;
revoke all on function public.admin_listar_pagamentos(uuid) from public, anon;
grant execute on function public.admin_listar_assinaturas() to authenticated;
grant execute on function public.admin_listar_pagamentos(uuid) to authenticated;
