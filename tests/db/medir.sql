-- Mesma leitura da Lista de OS (ordens + itens), como usuário autenticado do laboratório 1.
select set_config('request.jwt.claim.sub', 'f0000001-0000-4000-8000-000000000000', false);
set role authenticated;
explain (analyze, timing off, summary on) select o.*, (select json_agg(i) from ordem_servico_itens i where i.ordem_id = o.id) from ordens_servico o order by data_recebimento desc;
explain (analyze, timing off, summary on) select count(*) from ordem_servico_itens;
reset role;
