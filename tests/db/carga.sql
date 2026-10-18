-- Volume realista: 3 laboratórios, 10 mil OS cada, ~2,5 itens por OS.
set client_min_messages = warning;
insert into auth.users (id, email) select ('f' || lpad(g::text, 7, '0') || '-0000-4000-8000-000000000000')::uuid, 'carga' || g || '@t' from generate_series(1, 3) g;
insert into empresas (id, nome_fantasia, onboarding_concluido) select ('e' || lpad(g::text, 7, '0') || '-0000-4000-8000-000000000000')::uuid, 'Carga ' || g, true from generate_series(1, 3) g;
insert into profiles (id, nome, role, empresa_id) select ('f' || lpad(g::text, 7, '0') || '-0000-4000-8000-000000000000')::uuid, 'U' || g, 'admin', ('e' || lpad(g::text, 7, '0') || '-0000-4000-8000-000000000000')::uuid from generate_series(1, 3) g;
insert into servicos (nome, preco_padrao, empresa_id) select 'S' || s, 100 + s, ('e' || lpad(g::text, 7, '0') || '-0000-4000-8000-000000000000')::uuid from generate_series(1, 3) g, generate_series(1, 40) s;
insert into entidades (tipo, nome, empresa_id) select case when c % 4 = 0 then 'parceiro' else 'cliente' end::tipo_entidade, 'E' || c, ('e' || lpad(g::text, 7, '0') || '-0000-4000-8000-000000000000')::uuid from generate_series(1, 3) g, generate_series(1, 60) c;
alter table ordens_servico disable trigger user;
alter table ordem_servico_itens disable trigger user;
insert into ordens_servico (numero_os, entidade_id, status, data_recebimento, empresa_id)
select n, (select id from entidades e where e.empresa_id = emp order by e.nome limit 1 offset (n % 60)),
       (array['recebido','em_producao','pronto_entrega','entregue'])[1 + n % 4]::status_os,
       current_date - (n % 365), emp
from (select ('e' || lpad(g::text, 7, '0') || '-0000-4000-8000-000000000000')::uuid emp from generate_series(1, 3) g) x, generate_series(1, 10000) n;
insert into ordem_servico_itens (ordem_id, servico_id, quantidade, valor_unitario, empresa_id)
select o.id, (select s.id from servicos s where s.empresa_id = o.empresa_id order by s.nome limit 1 offset (o.numero_os % 40)), 1, 150, o.empresa_id
from ordens_servico o, generate_series(1, 1 + (abs(hashtext(o.id::text)) % 4)) i where o.empresa_id::text like 'e%';
alter table ordens_servico enable trigger user;
alter table ordem_servico_itens enable trigger user;
analyze;
select (select count(*) from ordens_servico) os, (select count(*) from ordem_servico_itens) itens;
