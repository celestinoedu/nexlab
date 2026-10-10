-- =============================================================================
-- NexLab — Migration 0027: bloqueio por falta de pagamento e assinante não pagante
-- =============================================================================
-- Passados `dias_tolerancia` dias do vencimento sem pagamento, a empresa perde
-- o acesso operacional. O bloqueio é aplicado nas próprias funções usadas por
-- todas as policies (is_active_user / is_admin_user), então vale também para
-- chamadas diretas à API, não só para a tela.
--
-- Continuam liberados durante o bloqueio: o próprio perfil, os dados da
-- empresa, a assinatura e as faturas (tela de pagamento) — via
-- is_account_member(). O desbloqueio é automático quando o pagamento é
-- registrado (webhook do Mercado Pago ou painel), pois o vencimento avança.
--
-- Nunca bloqueia: empresa sem linha em `assinaturas`, cobrança pausada
-- (ativa = false) e a Demonstração (não tem assinatura).

alter table public.assinaturas
  add column dias_tolerancia smallint not null default 5 check (dias_tolerancia between 0 and 60);

comment on column public.assinaturas.dias_tolerancia is
  'Dias de atraso tolerados antes do bloqueio do acesso. Bloqueia quando hoje > proximo_vencimento + dias_tolerancia.';

-- Tipo de assinatura: `ativa` = true é assinante PAGANTE; false é NÃO PAGANTE
-- (parceria, cortesia, piloto) — sem cobrança, sem aviso e sem bloqueio.
alter table public.assinaturas
  add column motivo_nao_pagante text check (length(motivo_nao_pagante) <= 120);

comment on column public.assinaturas.ativa is
  'true = assinante pagante (cobrança, avisos e bloqueio); false = não pagante (parceria/cortesia).';
comment on column public.assinaturas.motivo_nao_pagante is
  'Anotação interna da Lotus (ex.: "Parceria 100% OFF"). Não é exposta ao cliente.';

-- O cliente lê a própria assinatura, menos a anotação interna da Lotus.
revoke select on public.assinaturas from authenticated;
grant select (
  empresa_id, valor_mensal, proximo_vencimento, dia_vencimento, dias_aviso, ativa,
  dias_tolerancia, mp_preapproval_id, mp_preapproval_status, created_at, updated_at
) on public.assinaturas to authenticated;

-- -----------------------------------------------------------------------------
-- Regra do bloqueio
-- -----------------------------------------------------------------------------
create or replace function public.empresa_bloqueada(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assinaturas a
     where a.empresa_id = p_empresa_id
       and a.ativa
       and a.proximo_vencimento + a.dias_tolerancia < (now() at time zone 'America/Sao_Paulo')::date
  );
$$;

revoke all on function public.empresa_bloqueada(uuid) from public, anon, authenticated;

-- Usuário ativo de uma empresa SEM bloqueio — base de todas as policies de negócio.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.ativo
       and not public.empresa_bloqueada(p.empresa_id)
  );
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.ativo and p.role = 'admin'
       and not public.empresa_bloqueada(p.empresa_id)
  );
$$;

-- Usuário ativo, mesmo com a empresa bloqueada: só para o que a tela de
-- pagamento precisa ler.
create or replace function public.is_account_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.ativo);
$$;

revoke all on function public.is_account_member() from public, anon;
grant execute on function public.is_account_member() to authenticated;

drop policy "empresas_select" on public.empresas;
create policy "empresas_select" on public.empresas for select
  using (public.is_account_member() and id = public.current_empresa_id());

drop policy "assinaturas_select_propria" on public.assinaturas;
create policy "assinaturas_select_propria" on public.assinaturas for select to authenticated
  using (public.is_account_member() and empresa_id = public.current_empresa_id());

drop policy "faturas_assinatura_select" on public.faturas_assinatura;
create policy "faturas_assinatura_select" on public.faturas_assinatura for select to authenticated
  using (public.is_account_member() and empresa_id = public.current_empresa_id());

-- -----------------------------------------------------------------------------
-- Painel: tolerância por cliente (mudar parâmetros/colunas exige recriar)
-- -----------------------------------------------------------------------------
drop function public.admin_salvar_assinatura(uuid, numeric, date, integer, boolean);
create function public.admin_salvar_assinatura(
  p_empresa_id uuid,
  p_valor_mensal numeric,
  p_proximo_vencimento date,
  p_dias_aviso integer,
  p_ativa boolean,
  p_dias_tolerancia integer,
  p_motivo_nao_pagante text
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
    empresa_id, valor_mensal, proximo_vencimento, dia_vencimento, dias_aviso, ativa, dias_tolerancia,
    motivo_nao_pagante
  )
  values (
    p_empresa_id,
    p_valor_mensal,
    p_proximo_vencimento,
    extract(day from p_proximo_vencimento)::smallint,
    coalesce(p_dias_aviso, 5),
    coalesce(p_ativa, true),
    coalesce(p_dias_tolerancia, 5),
    case when coalesce(p_ativa, true) then null else nullif(btrim(p_motivo_nao_pagante), '') end
  )
  on conflict (empresa_id) do update
     set valor_mensal = excluded.valor_mensal,
         -- Só redefine o dia quando a data foi realmente trocada (ver 0025).
         dia_vencimento = case
           when a.proximo_vencimento = excluded.proximo_vencimento then a.dia_vencimento
           else excluded.dia_vencimento
         end,
         proximo_vencimento = excluded.proximo_vencimento,
         dias_aviso = excluded.dias_aviso,
         ativa = excluded.ativa,
         dias_tolerancia = excluded.dias_tolerancia,
         motivo_nao_pagante = excluded.motivo_nao_pagante;
end;
$$;

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
  debito_automatico text,
  dias_tolerancia smallint,
  motivo_nao_pagante text
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
         a.mp_preapproval_status,
         a.dias_tolerancia,
         a.motivo_nao_pagante
    from public.empresas e
    left join public.assinaturas a on a.empresa_id = e.id
   where not e.is_demo
   order by e.nome_fantasia;
end;
$$;

revoke all on function public.admin_salvar_assinatura(uuid, numeric, date, integer, boolean, integer, text) from public, anon;
revoke all on function public.admin_listar_assinaturas() from public, anon;
grant execute on function public.admin_salvar_assinatura(uuid, numeric, date, integer, boolean, integer, text) to authenticated;
grant execute on function public.admin_listar_assinaturas() to authenticated;
