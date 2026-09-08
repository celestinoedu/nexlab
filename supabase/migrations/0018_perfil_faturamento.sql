-- =============================================================================
-- NexLab — Migration 0018: dados fiscais do perfil e cobrança da assinatura
-- =============================================================================

-- Nullable para migrar usuários existentes. O frontend bloqueia as demais
-- áreas até o preenchimento; a RPC aceita somente CPF (11) ou CNPJ (14).
alter table public.profiles
  add column documento_fiscal text,
  add constraint profiles_documento_fiscal_formato_check check (
    documento_fiscal is null or documento_fiscal ~ '^([0-9]{11}|[0-9]{14})$'
  );

comment on column public.profiles.documento_fiscal is
  'CPF ou CNPJ do titular, somente dígitos, usado no faturamento da assinatura.';

alter table public.empresas
  add column plano_assinatura text not null default 'Standard';

comment on column public.empresas.plano_assinatura is
  'Nome comercial do plano NexLab contratado pelo tenant.';

create type public.status_fatura_assinatura as enum ('pendente', 'paga', 'vencida', 'cancelada');

create table public.faturas_assinatura (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  competencia date not null,
  valor numeric(10, 2) not null check (valor >= 0),
  status public.status_fatura_assinatura not null default 'pendente',
  data_vencimento date not null,
  data_pagamento date,
  nota_fiscal_numero text,
  nota_fiscal_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, competencia)
);

create index idx_faturas_assinatura_empresa_competencia
  on public.faturas_assinatura (empresa_id, competencia desc);

comment on table public.faturas_assinatura is
  'Cobranças da assinatura NexLab e metadados das notas fiscais emitidas pela Lotus.';

create trigger trg_faturas_assinatura_updated_at
  before update on public.faturas_assinatura
  for each row execute function public.set_updated_at();

alter table public.faturas_assinatura enable row level security;

-- O cliente consulta apenas o próprio histórico. Inclusão e manutenção ficam
-- reservadas ao backend administrativo (service role) da futura cobrança.
create policy "faturas_assinatura_select" on public.faturas_assinatura
  for select to authenticated
  using (public.is_active_user() and empresa_id = public.current_empresa_id());

create or replace function public.update_my_profile(
  p_nome text,
  p_documento_fiscal text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_documento text := regexp_replace(coalesce(p_documento_fiscal, ''), '[^0-9]', '', 'g');
begin
  if nullif(btrim(p_nome), '') is null then
    raise exception 'Informe o nome do responsável.';
  end if;

  if length(v_documento) not in (11, 14) then
    raise exception 'Informe um CPF ou CNPJ válido.';
  end if;

  update public.profiles
     set nome = btrim(p_nome),
         documento_fiscal = v_documento
   where id = (select auth.uid())
     and ativo = true;

  if not found then
    raise exception 'Perfil ativo não encontrado.';
  end if;
end;
$$;

revoke all on function public.update_my_profile(text, text) from public, anon;
grant execute on function public.update_my_profile(text, text) to authenticated;
