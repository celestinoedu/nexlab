-- =============================================================================
-- NexLab — Migration 0012: módulo Estoque
--
-- Cadastro simples de insumos do laboratório (mesmo espírito de `despesas`,
-- migration 0003): quantidade, valor, local físico e uma opção manual de
-- "sinalizar para compra" (sem limite mínimo automático — o laboratório
-- decide quando marcar). O ícone de Alertas no Topbar conta quantos insumos
-- estão sinalizados.
-- =============================================================================

create table insumos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id),
  nome text not null,
  categoria text, -- livre, mesmo padrão de servicos.categoria / despesas.categoria
  quantidade numeric(10, 2) not null default 0,
  unidade text, -- livre, ex.: "un", "kg", "litro" — opcional
  valor_unitario numeric(10, 2) not null default 0,
  local_estoque text,
  sinalizar_compra boolean not null default false,
  observacoes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_insumos_empresa_id on insumos (empresa_id);
create index idx_insumos_sinalizar_compra on insumos (empresa_id, sinalizar_compra) where sinalizar_compra = true;

comment on table insumos is 'Cadastro simples de insumos do laboratório (Estoque) — quantidade, valor, local e sinalização manual de compra.';
comment on column insumos.sinalizar_compra is 'Marcação manual (sem limite mínimo automático) — conta pro ícone de Alertas no Topbar.';

create trigger trg_insumos_updated_at before update on insumos
  for each row execute function set_updated_at();

-- empresa_id: mesmo padrão multi-tenant das outras tabelas sem linha-pai
-- (trg_fn_set_empresa_id / trg_fn_lock_empresa_id já existem, migration 0010).
create trigger trg_insumos_set_empresa_id before insert on insumos
  for each row execute function trg_fn_set_empresa_id();
create trigger trg_insumos_lock_empresa_id before update on insumos
  for each row execute function trg_fn_lock_empresa_id();

-- RLS — mesmo padrão de despesas: qualquer usuário ativo lê/cria/edita,
-- exclusão só admin.
alter table insumos enable row level security;

create policy "insumos_select" on insumos for select using (is_active_user() and empresa_id = current_empresa_id());
create policy "insumos_insert" on insumos for insert with check (is_active_user() and empresa_id = current_empresa_id());
create policy "insumos_update" on insumos for update using (is_active_user() and empresa_id = current_empresa_id());
create policy "insumos_delete" on insumos for delete using (is_admin_user() and empresa_id = current_empresa_id());
