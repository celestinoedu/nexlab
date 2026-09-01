-- =============================================================================
-- NexLab — Migration 0016: onboarding inicial e edição segura do próprio nome
-- =============================================================================

-- Clientes já existentes não devem ser interrompidos. Depois desta migration,
-- toda empresa nova nasce com o onboarding pendente.
alter table public.empresas
  add column onboarding_concluido boolean not null default true;

alter table public.empresas
  alter column onboarding_concluido set default false;

comment on column public.empresas.onboarding_concluido is
  'Indica que o primeiro administrador confirmou os dados essenciais do laboratório.';

-- Permite editar somente o nome do próprio perfil, sem reabrir a possibilidade
-- de alterar role, ativo ou empresa_id que foi removida na migration 0014.
create or replace function public.update_my_profile_name(p_nome text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(p_nome), '') is null then
    raise exception 'Informe o nome do responsável.';
  end if;

  update public.profiles
     set nome = btrim(p_nome)
   where id = (select auth.uid())
     and ativo = true;

  if not found then
    raise exception 'Perfil ativo não encontrado.';
  end if;
end;
$$;

revoke all on function public.update_my_profile_name(text) from public, anon;
grant execute on function public.update_my_profile_name(text) to authenticated;

-- Salva os dados pessoais e da empresa em uma única transação. Somente o
-- administrador ativo da própria empresa consegue concluir o onboarding.
create or replace function public.complete_my_onboarding(
  p_nome_responsavel text,
  p_nome_fantasia text,
  p_telefone text,
  p_email text,
  p_endereco text default null,
  p_documento text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid;
begin
  if nullif(btrim(p_nome_responsavel), '') is null
     or nullif(btrim(p_nome_fantasia), '') is null
     or nullif(btrim(p_telefone), '') is null
     or nullif(btrim(p_email), '') is null then
    raise exception 'Preencha os campos obrigatórios.';
  end if;

  select empresa_id
    into v_empresa_id
    from public.profiles
   where id = (select auth.uid())
     and ativo = true
     and role = 'admin'::public.role_usuario;

  if v_empresa_id is null then
    raise exception 'Somente o administrador pode concluir esta configuração.';
  end if;

  update public.profiles
     set nome = btrim(p_nome_responsavel)
   where id = (select auth.uid());

  update public.empresas
     set nome_fantasia = btrim(p_nome_fantasia),
         telefone = btrim(p_telefone),
         email = lower(btrim(p_email)),
         endereco = nullif(btrim(p_endereco), ''),
         documento = nullif(btrim(p_documento), ''),
         onboarding_concluido = true,
         updated_at = now()
   where id = v_empresa_id;
end;
$$;

revoke all on function public.complete_my_onboarding(text, text, text, text, text, text) from public, anon;
grant execute on function public.complete_my_onboarding(text, text, text, text, text, text) to authenticated;
