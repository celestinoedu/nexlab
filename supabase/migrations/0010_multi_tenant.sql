-- =============================================================================
-- NexLab — Migration 0010: multi-tenant (isolamento por empresa/cliente)
--
-- Até aqui o NexLab era single-tenant "por acidente": não existia nenhum
-- conceito de "empresa dona do dado" em nenhuma tabela, e a RLS liberava
-- leitura/escrita de tudo pra qualquer usuário ativo — seguro só porque
-- existia um único cliente (GRS Lab). Com a landing page da Lotus vendendo
-- assinatura do NexLab pra outros laboratórios, isso vira isolamento real:
-- cada linha de dado passa a pertencer a uma "empresa" (tenant), e a RLS
-- passa a exigir `empresa_id = current_empresa_id()` além das checagens de
-- papel que já existiam.
--
-- Decisão de arquitetura: um único projeto Supabase compartilhado (não um
-- projeto por cliente) — o plano Free do Supabase limita quantos projetos
-- gratuitos ativos dá pra ter por organização, o que inviabilizaria escalar
-- pra vários clientes sem virar pago (restrição #1 do CLAUDE.md). Ver
-- docs/database-schema.md § Multi-tenant para o desenho completo.
--
-- Dado real de produção: o GRS Lab já usa o sistema. Este arquivo CONVERTE
-- os dados existentes em "tenant #1" (nunca recria do zero).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. empresa_config (singleton) → empresas (multi-linha, uma por cliente)
-- -----------------------------------------------------------------------------
create table empresas (
  id uuid primary key default gen_random_uuid(),
  nome_fantasia text not null,
  razao_social text,
  documento text,
  telefone text,
  email text,
  endereco text,
  logo_url text,
  prefixo_nota_servico text not null default 'NS',
  proximo_numero_nota int not null default 1,
  proximo_numero_os bigint not null default 1,
  mostrar_endereco boolean not null default true,
  mostrar_telefone boolean not null default true,
  mostrar_email boolean not null default true,
  mostrar_logo boolean not null default true,
  status_assinatura text not null default 'ativa'
    check (status_assinatura in ('trial', 'ativa', 'suspensa', 'cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table empresas is 'Um cliente (tenant) do NexLab — dados usados nos cabeçalhos de PDF e limite de isolamento de todas as outras tabelas.';
comment on column empresas.status_assinatura is 'Situação da assinatura junto à Lotus — informativo por enquanto, sem automação de cobrança.';
comment on column empresas.proximo_numero_os is 'Contador do próximo número de OS desta empresa (numeração é por tenant, não mais global — ver trg_fn_ordens_servico_before_insert).';

-- -----------------------------------------------------------------------------
-- 2. empresa_id (nullable por enquanto) em toda tabela de negócio
-- -----------------------------------------------------------------------------
alter table profiles add column empresa_id uuid;
alter table entidades add column empresa_id uuid;
alter table servicos add column empresa_id uuid;
alter table tabela_precos add column empresa_id uuid;
alter table ordens_servico add column empresa_id uuid;
alter table ordem_servico_itens add column empresa_id uuid;
alter table notas_servico add column empresa_id uuid;
alter table contas_receber add column empresa_id uuid;
alter table despesas add column empresa_id uuid;
alter table fechamentos add column empresa_id uuid;
alter table fechamentos_financeiros add column empresa_id uuid;

-- -----------------------------------------------------------------------------
-- 3. Migra a linha única de empresa_config pra empresas e faz o backfill de
--    empresa_id em todo o resto — tudo vira "tenant #1" (GRS Lab).
-- -----------------------------------------------------------------------------
do $$
declare
  v_empresa_id uuid;
begin
  insert into empresas (
    nome_fantasia, razao_social, documento, telefone, email, endereco, logo_url,
    prefixo_nota_servico, proximo_numero_nota,
    mostrar_endereco, mostrar_telefone, mostrar_email, mostrar_logo,
    updated_at
  )
  select
    nome_fantasia, razao_social, documento, telefone, email, endereco, logo_url,
    prefixo_nota_servico, proximo_numero_nota,
    mostrar_endereco, mostrar_telefone, mostrar_email, mostrar_logo,
    updated_at
  from empresa_config
  where id = 1
  returning id into v_empresa_id;

  update profiles set empresa_id = v_empresa_id;
  update entidades set empresa_id = v_empresa_id;
  update servicos set empresa_id = v_empresa_id;
  update tabela_precos set empresa_id = v_empresa_id;
  update ordens_servico set empresa_id = v_empresa_id;
  update ordem_servico_itens set empresa_id = v_empresa_id;
  update notas_servico set empresa_id = v_empresa_id;
  update contas_receber set empresa_id = v_empresa_id;
  update despesas set empresa_id = v_empresa_id;
  update fechamentos set empresa_id = v_empresa_id;
  update fechamentos_financeiros set empresa_id = v_empresa_id;

  -- não reinicia a numeração de quem já está em produção
  update empresas
    set proximo_numero_os = coalesce((select max(numero_os) + 1 from ordens_servico), 1)
    where id = v_empresa_id;
end $$;

drop table empresa_config;

-- -----------------------------------------------------------------------------
-- 4. empresa_id vira obrigatório + FK + índice em cada tabela
-- -----------------------------------------------------------------------------
alter table profiles
  alter column empresa_id set not null,
  add foreign key (empresa_id) references empresas (id);
create index idx_profiles_empresa_id on profiles (empresa_id);

alter table entidades
  alter column empresa_id set not null,
  add foreign key (empresa_id) references empresas (id);
create index idx_entidades_empresa_id on entidades (empresa_id);

alter table servicos
  alter column empresa_id set not null,
  add foreign key (empresa_id) references empresas (id);
create index idx_servicos_empresa_id on servicos (empresa_id);

alter table tabela_precos
  alter column empresa_id set not null,
  add foreign key (empresa_id) references empresas (id);
create index idx_tabela_precos_empresa_id on tabela_precos (empresa_id);

alter table ordens_servico
  alter column empresa_id set not null,
  add foreign key (empresa_id) references empresas (id);
create index idx_ordens_servico_empresa_id on ordens_servico (empresa_id);

alter table ordem_servico_itens
  alter column empresa_id set not null,
  add foreign key (empresa_id) references empresas (id);
create index idx_os_itens_empresa_id on ordem_servico_itens (empresa_id);

alter table notas_servico
  alter column empresa_id set not null,
  add foreign key (empresa_id) references empresas (id);
create index idx_notas_servico_empresa_id on notas_servico (empresa_id);

alter table contas_receber
  alter column empresa_id set not null,
  add foreign key (empresa_id) references empresas (id);
create index idx_contas_receber_empresa_id on contas_receber (empresa_id);

alter table despesas
  alter column empresa_id set not null,
  add foreign key (empresa_id) references empresas (id);
create index idx_despesas_empresa_id on despesas (empresa_id);

alter table fechamentos
  alter column empresa_id set not null,
  add foreign key (empresa_id) references empresas (id);
create index idx_fechamentos_empresa_id on fechamentos (empresa_id);

alter table fechamentos_financeiros
  alter column empresa_id set not null,
  add foreign key (empresa_id) references empresas (id);
create index idx_fechamentos_financeiros_empresa_id on fechamentos_financeiros (empresa_id);

-- -----------------------------------------------------------------------------
-- 5. numero_os deixa de ser sequência global — vira contador por empresa
--    (empresas.proximo_numero_os, seedado acima com a numeração atual do GRS
--    Lab). O trigger trg_fn_ordens_servico_before_insert (seção 6) preenche o
--    valor quando o formulário não informar um número manual.
-- -----------------------------------------------------------------------------
alter table ordens_servico alter column numero_os drop identity if exists;
alter table ordens_servico drop constraint if exists ordens_servico_numero_os_key;
alter table ordens_servico add constraint ordens_servico_empresa_numero_key unique (empresa_id, numero_os);

-- -----------------------------------------------------------------------------
-- 6. Funções e triggers de isolamento
-- -----------------------------------------------------------------------------

-- current_empresa_id(): mesmo padrão de is_active_user()/is_admin_user() —
-- security definer pra evitar recursão de RLS na própria checagem.
create function current_empresa_id() returns uuid as $$
  select empresa_id from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

-- trg_fn_set_empresa_id(): before insert genérico — força empresa_id a ser o
-- do usuário autenticado que está inserindo, IGNORANDO qualquer valor que o
-- cliente tenha mandado (o frontend hoje nunca manda esse campo). Quando
-- auth.uid() é nulo (execução manual via SQL Editor/service role — usada só
-- no provisionamento de uma empresa nova, ver SETUP.md), respeita o valor
-- explícito da linha.
create function trg_fn_set_empresa_id() returns trigger as $$
begin
  if auth.uid() is not null then
    new.empresa_id := current_empresa_id();
  end if;
  if new.empresa_id is null then
    raise exception 'empresa_id não pôde ser determinado para o novo registro';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- trg_fn_lock_empresa_id(): before update genérico — empresa_id é imutável
-- depois de criado (fecha o buraco de um usuário "migrar" a própria linha,
-- ex. profiles, pra outro tenant via update).
create function trg_fn_lock_empresa_id() returns trigger as $$
begin
  new.empresa_id := old.empresa_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Variantes "deriva do pai" — pra tabelas onde empresa_id é denormalizado de
-- uma linha-mãe (mesmo padrão que o projeto já usa pra entidade_id/mes_referencia
-- em contas_receber), em vez de vir do ator que está inserindo.
create function trg_fn_empresa_id_from_ordem() returns trigger as $$
begin
  new.empresa_id := (select empresa_id from ordens_servico where id = new.ordem_id);
  if new.empresa_id is null then
    raise exception 'ordem_id inválido: não foi possível determinar empresa_id';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create function trg_fn_empresa_id_from_entidade() returns trigger as $$
begin
  new.empresa_id := (select empresa_id from entidades where id = new.entidade_id);
  if new.empresa_id is null then
    raise exception 'entidade_id inválido: não foi possível determinar empresa_id';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ordens_servico: além de fixar empresa_id (mesma regra do genérico), também
-- assume a geração do próximo numero_os por empresa quando o formulário não
-- informar um valor manual (campo continua editável, comportamento atual
-- preservado) — precisa ser uma função dedicada porque as duas coisas dependem
-- uma da outra (o contador é por empresa_id).
create function trg_fn_ordens_servico_before_insert() returns trigger as $$
begin
  if auth.uid() is not null then
    new.empresa_id := current_empresa_id();
  end if;
  if new.empresa_id is null then
    raise exception 'empresa_id não pôde ser determinado para a nova Ordem de Serviço';
  end if;

  if new.numero_os is null then
    update empresas
      set proximo_numero_os = proximo_numero_os + 1
      where id = new.empresa_id
      returning proximo_numero_os - 1 into new.numero_os;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Insert: fixa empresa_id conforme a origem de cada tabela.
create trigger trg_profiles_set_empresa_id before insert on profiles
  for each row execute function trg_fn_set_empresa_id();
create trigger trg_entidades_set_empresa_id before insert on entidades
  for each row execute function trg_fn_set_empresa_id();
create trigger trg_servicos_set_empresa_id before insert on servicos
  for each row execute function trg_fn_set_empresa_id();
create trigger trg_despesas_set_empresa_id before insert on despesas
  for each row execute function trg_fn_set_empresa_id();
create trigger trg_notas_servico_set_empresa_id before insert on notas_servico
  for each row execute function trg_fn_set_empresa_id();
create trigger trg_fechamentos_set_empresa_id before insert on fechamentos
  for each row execute function trg_fn_set_empresa_id();
create trigger trg_fechamentos_financeiros_set_empresa_id before insert on fechamentos_financeiros
  for each row execute function trg_fn_set_empresa_id();

create trigger trg_ordens_servico_before_insert before insert on ordens_servico
  for each row execute function trg_fn_ordens_servico_before_insert();

create trigger trg_os_itens_set_empresa_id before insert on ordem_servico_itens
  for each row execute function trg_fn_empresa_id_from_ordem();
create trigger trg_contas_receber_set_empresa_id before insert on contas_receber
  for each row execute function trg_fn_empresa_id_from_ordem();
create trigger trg_tabela_precos_set_empresa_id before insert on tabela_precos
  for each row execute function trg_fn_empresa_id_from_entidade();

-- Update: empresa_id nunca muda depois de criado, em nenhuma tabela.
create trigger trg_profiles_lock_empresa_id before update on profiles
  for each row execute function trg_fn_lock_empresa_id();
create trigger trg_entidades_lock_empresa_id before update on entidades
  for each row execute function trg_fn_lock_empresa_id();
create trigger trg_servicos_lock_empresa_id before update on servicos
  for each row execute function trg_fn_lock_empresa_id();
create trigger trg_tabela_precos_lock_empresa_id before update on tabela_precos
  for each row execute function trg_fn_lock_empresa_id();
create trigger trg_ordens_servico_lock_empresa_id before update on ordens_servico
  for each row execute function trg_fn_lock_empresa_id();
create trigger trg_os_itens_lock_empresa_id before update on ordem_servico_itens
  for each row execute function trg_fn_lock_empresa_id();
create trigger trg_notas_servico_lock_empresa_id before update on notas_servico
  for each row execute function trg_fn_lock_empresa_id();
create trigger trg_contas_receber_lock_empresa_id before update on contas_receber
  for each row execute function trg_fn_lock_empresa_id();
create trigger trg_despesas_lock_empresa_id before update on despesas
  for each row execute function trg_fn_lock_empresa_id();
create trigger trg_fechamentos_lock_empresa_id before update on fechamentos
  for each row execute function trg_fn_lock_empresa_id();
create trigger trg_fechamentos_financeiros_lock_empresa_id before update on fechamentos_financeiros
  for each row execute function trg_fn_lock_empresa_id();

-- -----------------------------------------------------------------------------
-- 7. Row Level Security — reescreve todas as policies existentes acrescentando
--    "empresa_id = current_empresa_id()" e habilita RLS em empresas.
-- -----------------------------------------------------------------------------
alter table empresas enable row level security;

-- profiles: is_admin_user() sozinho deixaria um admin enxergar/editar perfis
-- de outro tenant — precisa restringir ao próprio empresa_id também.
drop policy "profiles_select" on profiles;
drop policy "profiles_update_self" on profiles;
drop policy "profiles_admin_all" on profiles;

create policy "profiles_select" on profiles for select
  using (id = auth.uid() or (is_admin_user() and empresa_id = current_empresa_id()));
create policy "profiles_update_self" on profiles for update using (id = auth.uid());
create policy "profiles_admin_all" on profiles for all
  using (is_admin_user() and empresa_id = current_empresa_id())
  with check (is_admin_user() and empresa_id = current_empresa_id());

-- empresas: substitui as policies de empresa_config. Sem insert/delete pra
-- usuário comum — provisionar uma empresa nova é manual (ver SETUP.md).
create policy "empresas_select" on empresas for select
  using (is_active_user() and id = current_empresa_id());
create policy "empresas_update" on empresas for update
  using (is_admin_user() and id = current_empresa_id());

-- entidades
drop policy "entidades_select" on entidades;
drop policy "entidades_insert" on entidades;
drop policy "entidades_update" on entidades;
drop policy "entidades_delete" on entidades;
create policy "entidades_select" on entidades for select using (is_active_user() and empresa_id = current_empresa_id());
create policy "entidades_insert" on entidades for insert with check (is_active_user() and empresa_id = current_empresa_id());
create policy "entidades_update" on entidades for update using (is_active_user() and empresa_id = current_empresa_id());
create policy "entidades_delete" on entidades for delete using (is_admin_user() and empresa_id = current_empresa_id());

-- servicos
drop policy "servicos_select" on servicos;
drop policy "servicos_insert" on servicos;
drop policy "servicos_update" on servicos;
drop policy "servicos_delete" on servicos;
create policy "servicos_select" on servicos for select using (is_active_user() and empresa_id = current_empresa_id());
create policy "servicos_insert" on servicos for insert with check (is_active_user() and empresa_id = current_empresa_id());
create policy "servicos_update" on servicos for update using (is_active_user() and empresa_id = current_empresa_id());
create policy "servicos_delete" on servicos for delete using (is_admin_user() and empresa_id = current_empresa_id());

-- tabela_precos
drop policy "tabela_precos_select" on tabela_precos;
drop policy "tabela_precos_write" on tabela_precos;
drop policy "tabela_precos_update" on tabela_precos;
drop policy "tabela_precos_delete" on tabela_precos;
create policy "tabela_precos_select" on tabela_precos for select using (is_active_user() and empresa_id = current_empresa_id());
create policy "tabela_precos_write" on tabela_precos for insert with check (is_admin_user() and empresa_id = current_empresa_id());
create policy "tabela_precos_update" on tabela_precos for update using (is_admin_user() and empresa_id = current_empresa_id());
create policy "tabela_precos_delete" on tabela_precos for delete using (is_admin_user() and empresa_id = current_empresa_id());

-- ordens_servico
drop policy "os_select" on ordens_servico;
drop policy "os_insert" on ordens_servico;
drop policy "os_update" on ordens_servico;
drop policy "os_delete" on ordens_servico;
create policy "os_select" on ordens_servico for select using (is_active_user() and empresa_id = current_empresa_id());
create policy "os_insert" on ordens_servico for insert with check (is_active_user() and empresa_id = current_empresa_id());
create policy "os_update" on ordens_servico for update using (is_active_user() and empresa_id = current_empresa_id());
create policy "os_delete" on ordens_servico for delete using (is_admin_user() and empresa_id = current_empresa_id());

-- ordem_servico_itens
drop policy "os_itens_select" on ordem_servico_itens;
drop policy "os_itens_insert" on ordem_servico_itens;
drop policy "os_itens_update" on ordem_servico_itens;
drop policy "os_itens_delete" on ordem_servico_itens;
create policy "os_itens_select" on ordem_servico_itens for select using (is_active_user() and empresa_id = current_empresa_id());
create policy "os_itens_insert" on ordem_servico_itens for insert with check (is_active_user() and empresa_id = current_empresa_id());
create policy "os_itens_update" on ordem_servico_itens for update using (is_active_user() and empresa_id = current_empresa_id());
create policy "os_itens_delete" on ordem_servico_itens for delete using (is_active_user() and empresa_id = current_empresa_id());

-- notas_servico
drop policy "notas_servico_select" on notas_servico;
drop policy "notas_servico_insert" on notas_servico;
create policy "notas_servico_select" on notas_servico for select using (is_active_user() and empresa_id = current_empresa_id());
create policy "notas_servico_insert" on notas_servico for insert with check (is_active_user() and empresa_id = current_empresa_id());

-- fechamentos
drop policy "fechamentos_select" on fechamentos;
drop policy "fechamentos_write" on fechamentos;
drop policy "fechamentos_update" on fechamentos;
create policy "fechamentos_select" on fechamentos for select using (is_active_user() and empresa_id = current_empresa_id());
create policy "fechamentos_write" on fechamentos for insert with check (is_admin_user() and empresa_id = current_empresa_id());
create policy "fechamentos_update" on fechamentos for update using (is_admin_user() and empresa_id = current_empresa_id());

-- contas_receber
drop policy "contas_receber_select" on contas_receber;
drop policy "contas_receber_insert" on contas_receber;
drop policy "contas_receber_update" on contas_receber;
create policy "contas_receber_select" on contas_receber for select using (is_active_user() and empresa_id = current_empresa_id());
create policy "contas_receber_insert" on contas_receber for insert with check (is_admin_user() and empresa_id = current_empresa_id());
create policy "contas_receber_update" on contas_receber for update
  using (is_active_user() and empresa_id = current_empresa_id())
  with check (is_active_user() and empresa_id = current_empresa_id() and (status <> 'cancelado' or is_admin_user()));

-- despesas
drop policy "despesas_select" on despesas;
drop policy "despesas_insert" on despesas;
drop policy "despesas_update" on despesas;
drop policy "despesas_delete" on despesas;
create policy "despesas_select" on despesas for select using (is_active_user() and empresa_id = current_empresa_id());
create policy "despesas_insert" on despesas for insert with check (is_active_user() and empresa_id = current_empresa_id());
create policy "despesas_update" on despesas for update using (is_active_user() and empresa_id = current_empresa_id());
create policy "despesas_delete" on despesas for delete using (is_admin_user() and empresa_id = current_empresa_id());

-- fechamentos_financeiros
drop policy "fechamentos_financeiros_select" on fechamentos_financeiros;
drop policy "fechamentos_financeiros_insert" on fechamentos_financeiros;
drop policy "fechamentos_financeiros_update" on fechamentos_financeiros;
create policy "fechamentos_financeiros_select" on fechamentos_financeiros for select using (is_active_user() and empresa_id = current_empresa_id());
create policy "fechamentos_financeiros_insert" on fechamentos_financeiros for insert with check (is_admin_user() and empresa_id = current_empresa_id());
create policy "fechamentos_financeiros_update" on fechamentos_financeiros for update using (is_admin_user() and empresa_id = current_empresa_id());

-- Storage "logos": leitura continua pública (não é dado sensível, usada em
-- <img> sem header de auth nos PDFs/telas); escrita passa a exigir que o
-- primeiro segmento do caminho seja o empresa_id de quem está enviando —
-- upload do frontend grava em `${empresaId}/logo-*` em vez de solto na raiz.
drop policy "logos_insert_admin" on storage.objects;
drop policy "logos_update_admin" on storage.objects;
drop policy "logos_delete_admin" on storage.objects;
create policy "logos_insert_admin" on storage.objects for insert
  with check (bucket_id = 'logos' and is_admin_user() and (storage.foldername(name))[1] = current_empresa_id()::text);
create policy "logos_update_admin" on storage.objects for update
  using (bucket_id = 'logos' and is_admin_user() and (storage.foldername(name))[1] = current_empresa_id()::text);
create policy "logos_delete_admin" on storage.objects for delete
  using (bucket_id = 'logos' and is_admin_user() and (storage.foldername(name))[1] = current_empresa_id()::text);
