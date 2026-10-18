-- =============================================================================
-- NexLab — diagnóstico: quais migrations recentes já estão aplicadas?
--
-- Só LEITURA: pode rodar no SQL Editor do Supabase quantas vezes quiser.
-- Cada linha diz se a mudança característica da migration já existe no banco.
-- "aplicada = false" → rodar o arquivo correspondente de supabase/migrations/.
-- =============================================================================
select migration, aplicada, observacao
from (values
  ('0024_copia_precos_cliente_tenant',
   pg_get_functiondef('public.trg_fn_copiar_precos_cliente'::regproc) ilike '%s.empresa_id = new.empresa_id%',
   'Cópia de preços do Cliente novo restrita à própria empresa. Pode rodar de novo sem problema.'),

  ('0025_painel_admin_assinaturas',
   to_regclass('public.platform_admins') is not null,
   'Painel administrativo da Lotus.'),

  ('0026_mercado_pago',
   to_regclass('public.pagamentos_mercadopago') is not null,
   'Mensalidade pelo Mercado Pago.'),

  ('0027_bloqueio_inadimplencia',
   exists (select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'assinaturas' and column_name = 'dias_tolerancia')
   and to_regprocedure('public.is_account_member()') is not null
   and pg_get_functiondef('public.is_active_user'::regproc) ilike '%empresa_bloqueada%',
   'Bloqueio por inadimplência. NÃO rode de novo se já estiver aplicada (dá erro de coluna existente).'),

  ('0028_integridade_financeira_tenant',
   exists (select 1 from pg_constraint where conname = 'fechamentos_financeiros_empresa_mes_key')
   and not has_function_privilege('authenticated', 'public.sincronizar_conta_receber_ordem(uuid)', 'execute'),
   'Fechamento por empresa + mês e contas a receber preservadas. Pode rodar de novo sem problema.'),

  ('0029_despesas_tipo_status',
   exists (select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'despesas' and column_name = 'status'),
   'Despesas: Fixa/Variável e Pago/Pendente. Pode rodar de novo sem problema.'),

  ('0030_rls_desempenho',
   not exists (select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
                where c.relnamespace = 'public'::regnamespace
                  and (pg_get_expr(p.polqual, p.polrelid) ~ '(?<![Ss][Ee][Ll][Ee][Cc][Tt] )(?<![.a-z_])is_active_user\(\)'
                    or pg_get_expr(p.polqual, p.polrelid) ~ '(?<![Ss][Ee][Ll][Ee][Cc][Tt] )(?<![.a-z_])current_empresa_id\(\)')),
   'Desempenho das regras de acesso. Pode rodar de novo sem problema.')
) as t (migration, aplicada, observacao)
order by migration;
