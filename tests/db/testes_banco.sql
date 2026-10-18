-- Testes de banco do NexLab: isolamento entre empresas (RLS), privilégios,
-- triggers financeiros e regras de negócio. Roda sobre um banco recém-criado
-- por aplicar.sh. Cada verificação grava PASS/FAIL em teste.resultado.
\set ON_ERROR_STOP 0
\set QUIET 1
set client_min_messages = warning;

create schema teste;
create table teste.resultado (n serial, nome text, ok boolean, detalhe text);
grant usage on schema teste to anon, authenticated;
create function teste.ok(p_nome text, p_ok boolean, p_detalhe text default null) returns void
language sql security definer set search_path = '' as
$$ insert into teste.resultado (nome, ok, detalhe) values (p_nome, coalesce(p_ok, false), p_detalhe) $$;
grant execute on function teste.ok(text, boolean, text) to anon, authenticated;

-- Executa SQL como o papel atual e devolve a mensagem de erro (ou null).
create function teste.erro(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return null;
exception when others then
  return sqlerrm;
end $$;
grant execute on function teste.erro(text) to anon, authenticated;

-- ---------------------------------------------------------------- dados
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-00000000000a', 'admin-a@teste'),
  ('a0000000-0000-4000-8000-00000000000b', 'oper-a@teste'),
  ('b0000000-0000-4000-8000-00000000000a', 'admin-b@teste'),
  ('c0000000-0000-4000-8000-00000000000c', 'inativo-a@teste'),
  ('d0000000-0000-4000-8000-00000000000d', 'sem-perfil@teste');
insert into empresas (id, nome_fantasia, onboarding_concluido) values
  ('aaaaaaaa-0000-4000-8000-000000000000', 'Lab A', true),
  ('bbbbbbbb-0000-4000-8000-000000000000', 'Lab B', true);
insert into profiles (id, nome, role, empresa_id, ativo) values
  ('a0000000-0000-4000-8000-00000000000a', 'Admin A', 'admin', 'aaaaaaaa-0000-4000-8000-000000000000', true),
  ('a0000000-0000-4000-8000-00000000000b', 'Operador A', 'operador', 'aaaaaaaa-0000-4000-8000-000000000000', true),
  ('b0000000-0000-4000-8000-00000000000a', 'Admin B', 'admin', 'bbbbbbbb-0000-4000-8000-000000000000', true),
  ('c0000000-0000-4000-8000-00000000000c', 'Inativo A', 'operador', 'aaaaaaaa-0000-4000-8000-000000000000', false);
insert into servicos (id, nome, preco_padrao, empresa_id) values
  ('5a000000-0000-4000-8000-000000000001', 'Coroa A', 100, 'aaaaaaaa-0000-4000-8000-000000000000'),
  ('5a000000-0000-4000-8000-000000000002', 'Placa A', 50, 'aaaaaaaa-0000-4000-8000-000000000000'),
  ('5b000000-0000-4000-8000-000000000001', 'Coroa B', 300, 'bbbbbbbb-0000-4000-8000-000000000000');
insert into entidades (id, tipo, nome, empresa_id) values
  ('e0000000-0000-4000-8000-0000000000b1', 'cliente', 'Cliente B', 'bbbbbbbb-0000-4000-8000-000000000000');
insert into ordens_servico (id, numero_os, entidade_id, status, empresa_id) values
  ('0b000000-0000-4000-8000-000000000001', 1, 'e0000000-0000-4000-8000-0000000000b1', 'recebido', 'bbbbbbbb-0000-4000-8000-000000000000');
insert into ordem_servico_itens (ordem_id, servico_id, quantidade, valor_unitario) values
  ('0b000000-0000-4000-8000-000000000001', '5b000000-0000-4000-8000-000000000001', 1, 300);
insert into despesas (descricao, valor, empresa_id) values ('Aluguel B', 1000, 'bbbbbbbb-0000-4000-8000-000000000000');

-- ------------------------------------------------- catálogo / privilégios
select teste.ok('Catálogo: todas as tabelas públicas têm RLS ligada',
  not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  (select string_agg(c.relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity));
select teste.ok('Catálogo: toda função security definer fixa search_path',
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.prosecdef and p.proconfig is null));
select teste.ok('Catálogo: nenhuma view pública legível por anon/authenticated sem security_invoker',
  not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'public' and c.relkind = 'v'
                 and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select'))
                 and not coalesce('security_invoker=true' = any (c.reloptions), false)));
select teste.ok('Catálogo: funções security definer que não são trigger não executáveis por anon',
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
                 and has_function_privilege('anon', p.oid, 'execute')
                 and p.proname not in ('current_empresa_id', 'is_active_user', 'is_admin_user')),
  (select string_agg(p.proname, ', ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
      and has_function_privilege('anon', p.oid, 'execute')
      and p.proname not in ('current_empresa_id', 'is_active_user', 'is_admin_user')));
select teste.ok('Catálogo: sincronizar_conta_receber_ordem não é chamável pela API (authenticated)',
  not has_function_privilege('authenticated', 'public.sincronizar_conta_receber_ordem(uuid)', 'execute'));
select teste.ok('Catálogo: fechamento financeiro único por empresa + mês (não global)',
  not exists (select 1 from pg_constraint where conrelid = 'fechamentos_financeiros'::regclass
               and contype = 'u' and pg_get_constraintdef(oid) = 'UNIQUE (mes_referencia)')
  and exists (select 1 from pg_indexes where tablename = 'fechamentos_financeiros'
               and indexdef ilike '%unique%empresa_id%mes_referencia%'));

-- ---------------------------------------------------------------- anon
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$
declare t text; n bigint; vazou text := '';
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'v')
  loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      if n > 0 then vazou := vazou || t || '(' || n || ') '; end if;
    exception when insufficient_privilege then null;
    end;
  end loop;
  perform teste.ok('Anon: não lê nenhuma linha de nenhuma tabela/view', vazou = '', nullif(vazou, ''));
end $$;
select teste.ok('Anon: não insere despesa',
  teste.erro($q$insert into despesas (descricao, valor, empresa_id) values ('x', 1, 'aaaaaaaa-0000-4000-8000-000000000000')$q$) is not null);
reset role;

-- ------------------------------------------------- usuário sem perfil
select set_config('request.jwt.claim.sub', 'd0000000-0000-4000-8000-00000000000d', false);
set role authenticated;
select teste.ok('Sem perfil: não vê OS nem empresas',
  (select count(*) from ordens_servico) = 0 and (select count(*) from empresas) = 0);
reset role;

-- ------------------------------------------------------- operador A
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000b', false);
set role authenticated;
select teste.ok('Operador A: não vê OS, itens, entidades, serviços nem despesas do Lab B',
  (select count(*) from ordens_servico) = 0 and (select count(*) from ordem_servico_itens) = 0
  and (select count(*) from entidades where empresa_id <> current_empresa_id()) = 0
  and (select count(*) from servicos where empresa_id <> current_empresa_id()) = 0
  and (select count(*) from despesas) = 0);
select teste.ok('Operador A: vê só o próprio laboratório em empresas',
  (select array_agg(nome_fantasia) from empresas) = array['Lab A']);
select teste.erro($q$update profiles set role = 'admin', ativo = true where id = auth.uid()$q$);
select teste.erro($q$select update_my_profile('Operador A', '11144477735')$q$);
select teste.ok('Operador A: não se promove a admin (SEC-002)',
  (select role::text from profiles where id = auth.uid()) = 'operador');
select teste.ok('Operador A: não altera tabela de preços',
  teste.erro($q$insert into tabela_precos (entidade_id, servico_id, preco) select id, '5a000000-0000-4000-8000-000000000001', 1 from entidades limit 1$q$) is not null
  or not exists (select 1 from tabela_precos where preco = 1));
select teste.ok('Operador A: não grava OS em entidade do Lab B',
  teste.erro($q$insert into ordens_servico (numero_os, entidade_id) values (99, 'e0000000-0000-4000-8000-0000000000b1')$q$) is not null
  or not exists (select 1 from ordens_servico where entidade_id = 'e0000000-0000-4000-8000-0000000000b1' and empresa_id = 'aaaaaaaa-0000-4000-8000-000000000000'));
select teste.ok('Operador A: não lê assinaturas/admins da plataforma de outra empresa',
  (select count(*) from assinaturas where empresa_id <> current_empresa_id()) = 0
  and teste.erro('select count(*) from platform_admins') is not null);
select teste.ok('Operador A: não executa funções do painel Lotus',
  teste.erro('select * from admin_listar_assinaturas()') is not null);
select teste.ok('Operador A: não recalcula a cobrança de uma OS do Lab B via RPC',
  teste.erro($q$select sincronizar_conta_receber_ordem('0b000000-0000-4000-8000-000000000001')$q$) is not null);
reset role;

-- ------------------------------------------------------------ admin A
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', false);
set role authenticated;
insert into entidades (tipo, nome) values ('cliente', 'Cliente A1');
select teste.ok('Admin A: cliente novo recebe preços só do catálogo do Lab A (0024)',
  (select count(*) from tabela_precos t join entidades e on e.id = t.entidade_id where e.nome = 'Cliente A1') = 2
  and not exists (select 1 from tabela_precos t join entidades e on e.id = t.entidade_id
                   where e.nome = 'Cliente A1' and t.servico_id = '5b000000-0000-4000-8000-000000000001'));
select teste.ok('Admin A: empresa_id é forçado para o próprio laboratório no insert',
  (select empresa_id from entidades where nome = 'Cliente A1') = 'aaaaaaaa-0000-4000-8000-000000000000');
select teste.ok('Admin A: não muda empresa_id de um registro',
  teste.erro($q$update entidades set empresa_id = 'bbbbbbbb-0000-4000-8000-000000000000' where nome = 'Cliente A1'$q$) is not null
  or (select empresa_id from entidades where nome = 'Cliente A1') = 'aaaaaaaa-0000-4000-8000-000000000000');
select teste.ok('Admin A: não promove nem edita perfil do Lab B',
  (select count(*) from profiles where empresa_id <> current_empresa_id()) = 0);
update profiles set role = 'admin' where id = 'b0000000-0000-4000-8000-00000000000a';

-- OS do Lab A entregue gera conta a receber; voltar para produção (F02)
insert into ordens_servico (id, numero_os, entidade_id, status, data_entrega)
select '0a000000-0000-4000-8000-000000000001', 1, id, 'em_producao', null from entidades where nome = 'Cliente A1';
insert into ordem_servico_itens (ordem_id, servico_id, quantidade, valor_unitario)
values ('0a000000-0000-4000-8000-000000000001', '5a000000-0000-4000-8000-000000000001', 2, 100);
update ordens_servico set status = 'entregue', data_entrega = current_date where id = '0a000000-0000-4000-8000-000000000001';
select teste.ok('Financeiro: OS entregue gera conta a receber com o total dos itens',
  (select valor from contas_receber where ordem_id = '0a000000-0000-4000-8000-000000000001') = 200,
  (select valor::text from contas_receber where ordem_id = '0a000000-0000-4000-8000-000000000001'));
update ordem_servico_itens set quantidade = 3 where ordem_id = '0a000000-0000-4000-8000-000000000001';
select teste.ok('Financeiro: corrigir itens de OS entregue atualiza a conta aberta',
  (select valor from contas_receber where ordem_id = '0a000000-0000-4000-8000-000000000001') = 300);
update ordens_servico set desconto = 1000 where id = '0a000000-0000-4000-8000-000000000001';
select teste.ok('Financeiro: desconto maior que o subtotal não gera conta negativa',
  (select valor from contas_receber where ordem_id = '0a000000-0000-4000-8000-000000000001') = 0);
update ordens_servico set desconto = 0 where id = '0a000000-0000-4000-8000-000000000001';
update contas_receber set status = 'pago', data_pagamento = current_date, forma_pagamento = 'pix'
 where ordem_id = '0a000000-0000-4000-8000-000000000001';
select teste.ok('Financeiro: baixa na conta marca a OS como paga',
  (select status_pagamento::text from ordens_servico where id = '0a000000-0000-4000-8000-000000000001') = 'pago');
update ordem_servico_itens set quantidade = 5 where ordem_id = '0a000000-0000-4000-8000-000000000001';
select teste.ok('Financeiro: conta já paga mantém o valor recebido quando a OS é editada (F03)',
  (select valor from contas_receber where ordem_id = '0a000000-0000-4000-8000-000000000001') = 300,
  'valor atual: ' || (select valor::text from contas_receber where ordem_id = '0a000000-0000-4000-8000-000000000001'));
update ordens_servico set status = 'em_producao' where id = '0a000000-0000-4000-8000-000000000001';
select teste.ok('Financeiro: conta paga não some quando a OS volta para produção',
  (select status::text from contas_receber where ordem_id = '0a000000-0000-4000-8000-000000000001') = 'pago');

-- Cobrança aberta quando a OS sai de Entregue (F02)
insert into ordens_servico (id, numero_os, entidade_id, status)
select '0a000000-0000-4000-8000-000000000002', 2, id, 'em_producao' from entidades where nome = 'Cliente A1';
insert into ordem_servico_itens (ordem_id, servico_id, quantidade, valor_unitario)
values ('0a000000-0000-4000-8000-000000000002', '5a000000-0000-4000-8000-000000000002', 1, 50);
update ordens_servico set status = 'entregue', data_entrega = current_date where id = '0a000000-0000-4000-8000-000000000002';
update ordens_servico set status = 'em_producao' where id = '0a000000-0000-4000-8000-000000000002';
select teste.ok('Financeiro: OS que volta para produção suspende a cobrança aberta (F02)',
  (select status::text from contas_receber where ordem_id = '0a000000-0000-4000-8000-000000000002') = 'cancelado',
  (select status::text from contas_receber where ordem_id = '0a000000-0000-4000-8000-000000000002'));
update ordem_servico_itens set quantidade = 2 where ordem_id = '0a000000-0000-4000-8000-000000000002';
update ordens_servico set status = 'entregue' where id = '0a000000-0000-4000-8000-000000000002';
select teste.ok('Financeiro: OS entregue de novo reabre a cobrança com o valor atualizado',
  (select status::text || ' ' || valor::text from contas_receber where ordem_id = '0a000000-0000-4000-8000-000000000002') = 'aberto 100.00',
  (select status::text || ' ' || valor::text from contas_receber where ordem_id = '0a000000-0000-4000-8000-000000000002'));
update contas_receber set status = 'cancelado', justificativa_cancelamento = 'Cliente desistiu' where ordem_id = '0a000000-0000-4000-8000-000000000002';
update ordem_servico_itens set quantidade = 4 where ordem_id = '0a000000-0000-4000-8000-000000000002';
select teste.ok('Financeiro: cobrança cancelada pelo usuário não é reaberta pela sincronização',
  (select status::text || ' ' || coalesce(justificativa_cancelamento, '') from contas_receber where ordem_id = '0a000000-0000-4000-8000-000000000002') = 'cancelado Cliente desistiu');

-- Fechamento do mesmo mês por duas empresas (F01)
insert into fechamentos_financeiros (mes_referencia, status) values (date_trunc('month', current_date)::date, 'fechado');
reset role;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000a', false);
set role authenticated;
select teste.ok('Fechamento: Lab B fecha o mesmo mês que o Lab A (F01)',
  teste.erro($q$insert into fechamentos_financeiros (mes_referencia, status) values (date_trunc('month', current_date)::date, 'fechado')$q$) is null,
  teste.erro($q$insert into fechamentos_financeiros (mes_referencia, status) values (date_trunc('month', current_date)::date, 'fechado')$q$));
select teste.ok('Fechamento: Lab B não enxerga o fechamento do Lab A',
  (select count(*) from fechamentos_financeiros where empresa_id <> current_empresa_id()) = 0);
reset role;

-- --------------------------------------------------- despesas (0029)
select exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'despesas' and column_name = 'tipo') as tem_0029 \gset
\if :tem_0029
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000a', false);
set role authenticated;
select teste.ok('Despesas: lançamento antigo (sem tipo/status) continua aceito e vira pago/variável',
  (select tipo || '/' || status from despesas where descricao = 'Aluguel B') = 'variavel/pago');
select teste.ok('Despesas: app antigo consegue inserir sem os campos novos',
  teste.erro($q$insert into despesas (descricao, valor) values ('Luz', 200)$q$) is null);
select teste.ok('Despesas: aceita fixa pendente',
  teste.erro($q$insert into despesas (descricao, valor, tipo, status, data_despesa) values ('Salário', 3000, 'fixa', 'pendente', current_date)$q$) is null);
select teste.ok('Despesas: recusa tipo inválido',
  teste.erro($q$insert into despesas (descricao, valor, tipo) values ('x', 1, 'outro')$q$) is not null);
select teste.ok('Despesas: recusa pendente com data de pagamento',
  teste.erro($q$insert into despesas (descricao, valor, status, data_pagamento) values ('x', 1, 'pendente', current_date)$q$) is not null);
select teste.ok('Despesas: operador/admin de outro laboratório não vê as despesas do Lab B',
  (select count(*) from despesas where empresa_id <> current_empresa_id()) = 0);
reset role;
\endif

-- ------------------------------------------------------ usuário inativo
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-00000000000c', false);
set role authenticated;
select teste.ok('Inativo: não vê dados operacionais do próprio laboratório',
  (select count(*) from ordens_servico) = 0 and (select count(*) from entidades) = 0);
select teste.erro($q$update profiles set ativo = true where id = auth.uid()$q$);
reset role;
select teste.ok('Inativo: continua inativo após tentativa (verificado como superusuário)',
  not (select ativo from profiles where id = 'c0000000-0000-4000-8000-00000000000c'));
select teste.ok('Admin A: não alterou o papel do admin B',
  (select role::text from profiles where id = 'b0000000-0000-4000-8000-00000000000a') = 'admin');

-- ------------------------------------------------- inadimplência (0027)
insert into assinaturas (empresa_id, valor_mensal, proximo_vencimento, dia_vencimento, dias_tolerancia)
values ('aaaaaaaa-0000-4000-8000-000000000000', 100, current_date - 30, 1, 5);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', false);
set role authenticated;
select teste.ok('Bloqueio: laboratório inadimplente perde acesso às OS',
  (select count(*) from ordens_servico) = 0 and not is_active_user());
select teste.ok('Bloqueio: laboratório inadimplente ainda vê a própria assinatura (para pagar)',
  (select count(*) from assinaturas) = 1);
reset role;

\echo
select case when ok then 'PASS' else 'FAIL' end || '  ' || nome || coalesce('  — ' || detalhe, '') from teste.resultado order by n;
select (select count(*) from teste.resultado where ok) || '/' || count(*) || ' passaram' from teste.resultado;
