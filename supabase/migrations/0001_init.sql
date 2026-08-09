-- =============================================================================
-- NexLab — Migration 0001: schema inicial
-- Espelha docs/database-schema.md — qualquer mudança de schema deve ser feita
-- por uma NOVA migration (nunca editar esta depois de aplicada em produção) e
-- refletida naquele arquivo de documentação.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensões
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()
create extension if not exists "pg_trgm"; -- índices de busca por nome (ILIKE eficiente)

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type tipo_entidade as enum ('cliente', 'parceiro');

create type status_demanda as enum (
  'recebido',
  'em_producao',
  'pronto_entrega',
  'entregue',
  'cancelado'
);

create type status_fechamento as enum ('aberto', 'fechado', 'pago');

create type role_usuario as enum ('admin', 'operador');

-- -----------------------------------------------------------------------------
-- profiles — perfil interno vinculado a auth.users (não há cadastro público;
-- usuários são criados via convite/painel Supabase Auth)
-- -----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  role role_usuario not null default 'operador',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table profiles is 'Perfil interno de cada usuário do NexLab (equipe do GRS Lab).';

-- -----------------------------------------------------------------------------
-- empresa_config — linha única (singleton) com os dados do GRS Lab usados nos
-- cabeçalhos de PDF (Relatório de Fechamento / Nota de Serviço)
-- -----------------------------------------------------------------------------
create table empresa_config (
  id int primary key default 1 check (id = 1),
  nome_fantasia text not null default 'GRS Lab',
  razao_social text,
  documento text,
  telefone text,
  email text,
  endereco text,
  logo_url text,
  prefixo_nota_servico text not null default 'NS',
  proximo_numero_nota int not null default 1,
  updated_at timestamptz not null default now()
);

comment on table empresa_config is 'Configuração singleton (id sempre = 1) com os dados do laboratório.';

insert into empresa_config (id, nome_fantasia) values (1, 'GRS Lab');

-- -----------------------------------------------------------------------------
-- entidades — unifica Clientes (consultórios/dentistas, cobrança direta) e
-- Parceiros (laboratórios maiores, pagam comissão pelo serviço)
-- -----------------------------------------------------------------------------
create table entidades (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_entidade not null,
  nome text not null,
  documento text,
  telefone text,
  email text,
  endereco text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_entidades_tipo on entidades (tipo);
create index idx_entidades_nome on entidades using gin (nome gin_trgm_ops);

comment on table entidades is 'Clientes (venda direta) e Parceiros (comissão) — mesma tabela, diferenciados por "tipo".';

-- -----------------------------------------------------------------------------
-- servicos — catálogo de tipos de serviço do laboratório
-- -----------------------------------------------------------------------------
create table servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text,
  preco_padrao numeric(10, 2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table servicos is 'Catálogo de serviços/próteses. preco_padrao é usado para Clientes sem preço específico em tabela_precos.';

-- -----------------------------------------------------------------------------
-- tabela_precos — preço (Cliente) ou comissão (Parceiro) específico por
-- entidade × serviço. Sobrescreve servicos.preco_padrao quando existir.
-- -----------------------------------------------------------------------------
create table tabela_precos (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades (id) on delete cascade,
  servico_id uuid not null references servicos (id) on delete cascade,
  preco numeric(10, 2) not null,
  updated_at timestamptz not null default now(),
  unique (entidade_id, servico_id)
);

comment on table tabela_precos is 'Preço de venda (se entidade tipo=cliente) ou valor de comissão (se tipo=parceiro) por serviço.';

-- -----------------------------------------------------------------------------
-- demandas — núcleo do sistema: as ordens de serviço (Kanban / Lista)
-- -----------------------------------------------------------------------------
create table demandas (
  id uuid primary key default gen_random_uuid(),
  numero_os bigint generated by default as identity,
  entidade_id uuid not null references entidades (id),
  servico_id uuid not null references servicos (id),
  cliente_final text, -- paciente/consultório final (texto livre, não é FK — só referência, como nos relatórios dos parceiros)
  quantidade int not null default 1 check (quantidade > 0),
  status status_demanda not null default 'recebido',
  data_entrada date not null default current_date,
  data_prevista date,
  data_entrega date,
  valor_servico numeric(10, 2) not null default 0, -- snapshot no momento da criação (editável)
  valor_comissao numeric(10, 2), -- preenchido só quando entidade.tipo = 'parceiro'
  desconto numeric(10, 2) not null default 0,
  mes_referencia date generated always as (
    date_trunc('month', coalesce(data_entrega, data_entrada))::date
  ) stored, -- fechamento sempre mês cheio (dia 1 ao último dia)
  observacoes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (numero_os)
);

create index idx_demandas_entidade_mes on demandas (entidade_id, mes_referencia);
create index idx_demandas_status on demandas (status);
create index idx_demandas_cliente_final on demandas using gin (cliente_final gin_trgm_ops);

comment on table demandas is 'Ordens de serviço do laboratório — base do Kanban e da Lista.';
comment on column demandas.cliente_final is 'Nome do paciente/consultório final, texto livre (informativo, replica os relatórios reais dos parceiros).';
comment on column demandas.mes_referencia is 'Mês de fechamento (dia 1 ao último dia): usa data_entrega se já entregue, senão data_entrada.';

-- -----------------------------------------------------------------------------
-- fechamentos — snapshot de Contas a Receber por entidade × mês
-- -----------------------------------------------------------------------------
create table fechamentos (
  id uuid primary key default gen_random_uuid(),
  entidade_id uuid not null references entidades (id),
  mes_referencia date not null,
  valor_total numeric(10, 2) not null,
  status status_fechamento not null default 'aberto',
  data_fechamento timestamptz,
  data_pagamento date,
  observacoes text,
  created_at timestamptz not null default now(),
  unique (entidade_id, mes_referencia)
);

comment on table fechamentos is 'Controle de Contas a Receber: trava o valor do mês mesmo se demandas forem editadas depois.';

-- -----------------------------------------------------------------------------
-- notas_servico — "cupom" de serviço sem valor fiscal, emitido por demanda
-- -----------------------------------------------------------------------------
create table notas_servico (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  demanda_id uuid not null references demandas (id),
  entidade_id uuid not null references entidades (id),
  valor_total numeric(10, 2) not null,
  data_emissao timestamptz not null default now(),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table notas_servico is 'Nota de Serviço estilo cupom, sem valor fiscal — histórico de emissões por demanda.';

-- -----------------------------------------------------------------------------
-- Views
-- -----------------------------------------------------------------------------

-- Agregado por entidade × mês, para a tela de Contas a Receber
create view vw_contas_receber as
select
  d.entidade_id,
  e.tipo,
  e.nome as entidade_nome,
  d.mes_referencia,
  count(*) as qtd_itens,
  sum(
    case when e.tipo = 'parceiro' then coalesce(d.valor_comissao, 0) else d.valor_servico end
    - d.desconto
  ) as valor_total,
  coalesce(f.status, 'aberto') as status_fechamento,
  f.data_pagamento
from demandas d
join entidades e on e.id = d.entidade_id
left join fechamentos f
  on f.entidade_id = d.entidade_id and f.mes_referencia = d.mes_referencia
where d.status = 'entregue'
group by d.entidade_id, e.tipo, e.nome, d.mes_referencia, f.status, f.data_pagamento;

comment on view vw_contas_receber is 'Base da tela Contas a Receber: uma linha por entidade/mês com o total a receber.';

-- Detalhe linha a linha, no formato dos relatórios reais dos parceiros — base do PDF de Relatório de Fechamento
create view vw_relatorio_fechamento_itens as
select
  d.id as demanda_id,
  d.entidade_id,
  e.nome as entidade_nome,
  e.tipo as entidade_tipo,
  d.mes_referencia,
  d.numero_os,
  d.data_entrada,
  d.data_entrega,
  d.cliente_final,
  s.nome as servico_nome,
  d.quantidade,
  d.status,
  d.valor_servico,
  d.desconto,
  d.valor_comissao
from demandas d
join entidades e on e.id = d.entidade_id
join servicos s on s.id = d.servico_id
where d.status = 'entregue';

comment on view vw_relatorio_fechamento_itens is 'Linha a linha por demanda entregue — alimenta o PDF de Relatório de Fechamento.';

-- -----------------------------------------------------------------------------
-- Triggers utilitárias (updated_at)
-- -----------------------------------------------------------------------------
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_entidades_updated_at before update on entidades
  for each row execute function set_updated_at();

create trigger trg_demandas_updated_at before update on demandas
  for each row execute function set_updated_at();

create trigger trg_tabela_precos_updated_at before update on tabela_precos
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- Cenário: laboratório único, poucos usuários internos, sem acesso público.
-- Qualquer usuário autenticado e ativo em `profiles` pode ler/criar/editar;
-- exclusão e edição de preços/config ficam restritas a role = 'admin'.
-- -----------------------------------------------------------------------------
create function is_active_user() returns boolean as $$
  select exists (
    select 1 from profiles p where p.id = auth.uid() and p.ativo
  );
$$ language sql stable security definer set search_path = public;

create function is_admin_user() returns boolean as $$
  select exists (
    select 1 from profiles p where p.id = auth.uid() and p.ativo and p.role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

alter table profiles enable row level security;
alter table empresa_config enable row level security;
alter table entidades enable row level security;
alter table servicos enable row level security;
alter table tabela_precos enable row level security;
alter table demandas enable row level security;
alter table fechamentos enable row level security;
alter table notas_servico enable row level security;

-- profiles: cada usuário vê a si mesmo; admin vê todos
create policy "profiles_select" on profiles for select using (id = auth.uid() or is_admin_user());
create policy "profiles_update_self" on profiles for update using (id = auth.uid());
create policy "profiles_admin_all" on profiles for all using (is_admin_user()) with check (is_admin_user());

-- empresa_config: leitura para todo usuário ativo; edição só admin
create policy "empresa_config_select" on empresa_config for select using (is_active_user());
create policy "empresa_config_update" on empresa_config for update using (is_admin_user());

-- entidades: leitura/criação/edição para usuário ativo; exclusão só admin
create policy "entidades_select" on entidades for select using (is_active_user());
create policy "entidades_insert" on entidades for insert with check (is_active_user());
create policy "entidades_update" on entidades for update using (is_active_user());
create policy "entidades_delete" on entidades for delete using (is_admin_user());

-- servicos: mesma regra de entidades
create policy "servicos_select" on servicos for select using (is_active_user());
create policy "servicos_insert" on servicos for insert with check (is_active_user());
create policy "servicos_update" on servicos for update using (is_active_user());
create policy "servicos_delete" on servicos for delete using (is_admin_user());

-- tabela_precos: leitura para todo usuário ativo; escrita restrita a admin
-- (evita que um operador altere preço/comissão por engano)
create policy "tabela_precos_select" on tabela_precos for select using (is_active_user());
create policy "tabela_precos_write" on tabela_precos for insert with check (is_admin_user());
create policy "tabela_precos_update" on tabela_precos for update using (is_admin_user());
create policy "tabela_precos_delete" on tabela_precos for delete using (is_admin_user());

-- demandas: leitura/criação/edição para usuário ativo; exclusão só admin
create policy "demandas_select" on demandas for select using (is_active_user());
create policy "demandas_insert" on demandas for insert with check (is_active_user());
create policy "demandas_update" on demandas for update using (is_active_user());
create policy "demandas_delete" on demandas for delete using (is_admin_user());

-- fechamentos: leitura para usuário ativo; escrita só admin (fechamento financeiro)
create policy "fechamentos_select" on fechamentos for select using (is_active_user());
create policy "fechamentos_write" on fechamentos for insert with check (is_admin_user());
create policy "fechamentos_update" on fechamentos for update using (is_admin_user());

-- notas_servico: leitura/criação para usuário ativo (emissão faz parte do fluxo operacional)
create policy "notas_servico_select" on notas_servico for select using (is_active_user());
create policy "notas_servico_insert" on notas_servico for insert with check (is_active_user());
