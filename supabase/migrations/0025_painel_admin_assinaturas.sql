-- =============================================================================
-- NexLab — Migration 0025: painel administrativo de assinaturas
-- =============================================================================
-- A Lotus controla a mensalidade de cada empresa num painel central (/#/admin).
-- Todo acesso administrativo passa pelas funções admin_* abaixo, que começam
-- verificando public.is_platform_admin(). Nenhuma policy dos tenants é
-- afrouxada: um laboratório continua enxergando só a própria assinatura.
--
-- Depois de rodar esta migration, libere o painel para a SUA conta (uma vez):
--   insert into public.platform_admins (user_id)
--   select id from auth.users where email = 'SEU_EMAIL_DE_LOGIN';

-- -----------------------------------------------------------------------------
-- Quem pode abrir o painel
-- -----------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is
  'Contas da Lotus com acesso ao painel administrativo central. Começa vazia; o papel admin de um laboratório não dá acesso.';

alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins a where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.exigir_platform_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito à administração do NexLab.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.exigir_platform_admin() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Assinatura de cada empresa
-- -----------------------------------------------------------------------------
-- Uma linha por empresa. Sem linha (ou com ativa = false) a empresa não
-- recebe avisos de cobrança — caso do piloto e de cortesias.
create table public.assinaturas (
  empresa_id uuid primary key references public.empresas (id) on delete cascade,
  valor_mensal numeric(10, 2) not null check (valor_mensal >= 0),
  proximo_vencimento date not null,
  -- Dia escolhido no cadastro. Preserva o dia 29/30/31 quando um mês mais
  -- curto obriga a cobrar antes (31/01 → 28/02 → 31/03).
  dia_vencimento smallint not null check (dia_vencimento between 1 and 31),
  dias_aviso smallint not null default 5 check (dias_aviso between 0 and 30),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.assinaturas is
  'Mensalidade NexLab por empresa: valor, próximo vencimento e antecedência dos avisos exibidos no app.';

create trigger trg_assinaturas_updated_at
  before update on public.assinaturas
  for each row execute function public.set_updated_at();

alter table public.assinaturas enable row level security;
revoke all on public.assinaturas from anon, authenticated;
grant select on public.assinaturas to authenticated;

create policy "assinaturas_select_propria" on public.assinaturas
  for select to authenticated
  using (public.is_active_user() and empresa_id = public.current_empresa_id());

-- -----------------------------------------------------------------------------
-- Funções do painel (somente platform_admins)
-- -----------------------------------------------------------------------------
create or replace function public.admin_listar_assinaturas()
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
  ultimo_pagamento date
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
           where f.empresa_id = e.id and f.status = 'paga')
    from public.empresas e
    left join public.assinaturas a on a.empresa_id = e.id
   where not e.is_demo
   order by e.nome_fantasia;
end;
$$;

create or replace function public.admin_salvar_assinatura(
  p_empresa_id uuid,
  p_valor_mensal numeric,
  p_proximo_vencimento date,
  p_dias_aviso integer,
  p_ativa boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_platform_admin();

  if p_valor_mensal is null or p_valor_mensal < 0 then
    raise exception 'Informe o valor da mensalidade.';
  end if;
  if p_proximo_vencimento is null then
    raise exception 'Informe o próximo vencimento.';
  end if;

  insert into public.assinaturas as a (
    empresa_id, valor_mensal, proximo_vencimento, dia_vencimento, dias_aviso, ativa
  )
  values (
    p_empresa_id,
    p_valor_mensal,
    p_proximo_vencimento,
    extract(day from p_proximo_vencimento)::smallint,
    coalesce(p_dias_aviso, 5),
    coalesce(p_ativa, true)
  )
  on conflict (empresa_id) do update
     set valor_mensal = excluded.valor_mensal,
         -- Só redefine o dia quando a data foi realmente trocada; salvar sem
         -- mexer num 28/02 não pode transformar um cliente "dia 31" em "dia 28".
         dia_vencimento = case
           when a.proximo_vencimento = excluded.proximo_vencimento then a.dia_vencimento
           else excluded.dia_vencimento
         end,
         proximo_vencimento = excluded.proximo_vencimento,
         dias_aviso = excluded.dias_aviso,
         ativa = excluded.ativa;
end;
$$;

-- Dá baixa no vencimento atual: grava o pagamento no histórico que o cliente
-- vê em Meu Perfil e avança o vencimento para o mês seguinte.
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
declare
  v_assinatura public.assinaturas;
  v_mes date;
  v_ultimo_dia integer;
  v_proximo date;
begin
  perform public.exigir_platform_admin();

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
    empresa_id, competencia, valor, status, data_vencimento, data_pagamento
  )
  values (
    p_empresa_id,
    date_trunc('month', v_assinatura.proximo_vencimento)::date,
    p_valor,
    'paga',
    v_assinatura.proximo_vencimento,
    coalesce(p_data_pagamento, (now() at time zone 'America/Sao_Paulo')::date)
  )
  on conflict (empresa_id, competencia) do update
     set valor = excluded.valor,
         status = 'paga',
         data_vencimento = excluded.data_vencimento,
         data_pagamento = excluded.data_pagamento;

  v_mes := (date_trunc('month', v_assinatura.proximo_vencimento) + interval '1 month')::date;
  v_ultimo_dia := extract(day from (v_mes + interval '1 month' - interval '1 day'))::integer;
  v_proximo := v_mes + (least(v_assinatura.dia_vencimento, v_ultimo_dia) - 1);

  update public.assinaturas set proximo_vencimento = v_proximo where empresa_id = p_empresa_id;
  return v_proximo;
end;
$$;

-- Corrige um pagamento registrado por engano: remove o último pagamento e
-- devolve o vencimento para a data que ele havia quitado.
create or replace function public.admin_desfazer_ultimo_pagamento(p_empresa_id uuid)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fatura public.faturas_assinatura;
begin
  perform public.exigir_platform_admin();

  select * into v_fatura from public.faturas_assinatura
   where empresa_id = p_empresa_id and status = 'paga'
   order by data_vencimento desc
   limit 1;
  if not found then
    raise exception 'Não há pagamento para desfazer.';
  end if;

  delete from public.faturas_assinatura where id = v_fatura.id;
  update public.assinaturas
     set proximo_vencimento = v_fatura.data_vencimento
   where empresa_id = p_empresa_id;
  return v_fatura.data_vencimento;
end;
$$;

create or replace function public.admin_listar_pagamentos(p_empresa_id uuid)
returns table (
  id uuid,
  competencia date,
  valor numeric,
  data_vencimento date,
  data_pagamento date
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
  select f.id, f.competencia, f.valor, f.data_vencimento, f.data_pagamento
    from public.faturas_assinatura f
   where f.empresa_id = p_empresa_id and f.status = 'paga'
   order by f.data_vencimento desc
   limit 24;
end;
$$;

revoke all on function public.admin_listar_assinaturas() from public, anon;
revoke all on function public.admin_salvar_assinatura(uuid, numeric, date, integer, boolean) from public, anon;
revoke all on function public.admin_registrar_pagamento(uuid, numeric, date) from public, anon;
revoke all on function public.admin_desfazer_ultimo_pagamento(uuid) from public, anon;
revoke all on function public.admin_listar_pagamentos(uuid) from public, anon;
grant execute on function public.admin_listar_assinaturas() to authenticated;
grant execute on function public.admin_salvar_assinatura(uuid, numeric, date, integer, boolean) to authenticated;
grant execute on function public.admin_registrar_pagamento(uuid, numeric, date) to authenticated;
grant execute on function public.admin_desfazer_ultimo_pagamento(uuid) to authenticated;
grant execute on function public.admin_listar_pagamentos(uuid) to authenticated;
