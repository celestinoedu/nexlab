-- =============================================================================
-- NexLab — Migration 0030: desempenho das políticas RLS
--
-- As políticas chamavam is_active_user(), is_admin_user() e
-- current_empresa_id() diretamente. O Postgres pode reavaliar essas funções
-- para CADA linha lida (cada chamada consulta profiles e assinaturas). Envolver
-- a chamada em "(select ...)" vira um InitPlan avaliado uma vez por consulta —
-- recomendação oficial do Supabase para RLS
-- (https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).
--
-- Medido em Postgres local com 30 mil OS / 74 mil itens (3 laboratórios):
-- ver docs/testes.md. A regra de acesso não muda: só a forma de avaliar.
-- Seguro para rodar mais de uma vez (não envolve de novo o que já está).
-- =============================================================================

do $$
declare
  pol record;
  v_qual text;
  v_check text;
  f text;
begin
  for pol in
    select c.relname as tabela, p.polname as nome,
           pg_get_expr(p.polqual, p.polrelid) as qual,
           pg_get_expr(p.polwithcheck, p.polrelid) as withcheck
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
  loop
    v_qual := pol.qual;
    v_check := pol.withcheck;
    foreach f in array array['is_active_user', 'is_admin_user', 'current_empresa_id', 'is_platform_admin', 'auth.uid'] loop
      -- Envolve só chamadas que ainda não estão dentro de "(select ...)"; o
      -- Postgres devolve a expressão já envolvida como "( SELECT f() AS f)".
      v_qual := regexp_replace(v_qual, '(?<![Ss][Ee][Ll][Ee][Cc][Tt] )(?<![.a-z_])' || replace(f, '.', '\.') || '\(\)', '(select ' || f || '())', 'g');
      v_check := regexp_replace(v_check, '(?<![Ss][Ee][Ll][Ee][Cc][Tt] )(?<![.a-z_])' || replace(f, '.', '\.') || '\(\)', '(select ' || f || '())', 'g');
    end loop;

    if v_qual is distinct from pol.qual then
      execute format('alter policy %I on public.%I using (%s)', pol.nome, pol.tabela, v_qual);
    end if;
    if v_check is distinct from pol.withcheck then
      execute format('alter policy %I on public.%I with check (%s)', pol.nome, pol.tabela, v_check);
    end if;
  end loop;
end $$;
