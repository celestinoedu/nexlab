-- =============================================================================
-- NexLab — Migration 0003: Financeiro (Contas a Receber por OS, Despesas,
-- Fechamento por período, status financeiro da OS)
-- Espelha docs/database-schema.md — mantenha os dois em sincronia.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type status_pagamento_os as enum ('pendente', 'pago');
create type status_conta_receber as enum ('aberto', 'pago', 'cancelado');
create type status_fechamento_periodo as enum ('aberto', 'fechado');

-- -----------------------------------------------------------------------------
-- ordens_servico: status financeiro + forma de pagamento (editáveis no formulário)
-- -----------------------------------------------------------------------------
alter table ordens_servico add column status_pagamento status_pagamento_os not null default 'pendente';
alter table ordens_servico add column forma_pagamento text;

comment on column ordens_servico.status_pagamento is 'Snapshot editável no formulário da OS — a "verdade" operacional de cobrança fica em contas_receber uma vez que a OS é entregue.';

-- -----------------------------------------------------------------------------
-- contas_receber — uma linha por OS entregue (criada automaticamente, ver
-- trigger abaixo). Substitui a antiga vw_contas_receber (agregado por
-- entidade×mês): agora é tabela real porque precisa suportar edição de status
-- e "exclusão" com justificativa.
-- -----------------------------------------------------------------------------
create table contas_receber (
  id uuid primary key default gen_random_uuid(),
  ordem_id uuid not null references ordens_servico (id) on delete cascade,
  entidade_id uuid not null references entidades (id),
  mes_referencia date not null, -- copiado da OS no momento da criação
  valor numeric(10, 2) not null default 0,
  status status_conta_receber not null default 'aberto',
  forma_pagamento text,
  data_pagamento date,
  justificativa_cancelamento text, -- obrigatório quando status = 'cancelado' (validado na aplicação)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ordem_id)
);

create index idx_contas_receber_entidade_mes on contas_receber (entidade_id, mes_referencia);
create index idx_contas_receber_status on contas_receber (status);

comment on table contas_receber is 'Uma linha por OS entregue — ledger de Contas a Receber. Criada automaticamente quando a OS vira "entregue" (trigger trg_os_criar_conta_receber).';
comment on column contas_receber.justificativa_cancelamento is 'Obrigatório quando status = cancelado — "exclusão" é sempre soft-delete com motivo registrado.';

create trigger trg_contas_receber_updated_at before update on contas_receber
  for each row execute function set_updated_at();

-- Cria automaticamente a linha de Contas a Receber quando uma OS vira "entregue".
-- security definer: precisa funcionar independente do papel de quem move a OS
-- (qualquer usuário ativo pode entregar uma OS, não só admin).
create function trg_fn_criar_conta_receber() returns trigger as $$
declare
  v_tipo tipo_entidade;
  v_valor numeric(10, 2);
begin
  if new.status = 'entregue' and (old.status is distinct from 'entregue') then
    select tipo into v_tipo from entidades where id = new.entidade_id;

    select coalesce(
      sum(
        (case when v_tipo = 'parceiro' then coalesce(i.valor_comissao, 0) else i.valor_unitario end)
        * i.quantidade
      ),
      0
    ) - new.desconto
    into v_valor
    from ordem_servico_itens i
    where i.ordem_id = new.id;

    insert into contas_receber (ordem_id, entidade_id, mes_referencia, valor, status, forma_pagamento)
    values (
      new.id,
      new.entidade_id,
      new.mes_referencia,
      greatest(v_valor, 0),
      case when new.status_pagamento = 'pago' then 'pago' else 'aberto' end,
      new.forma_pagamento
    )
    on conflict (ordem_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_os_criar_conta_receber
  after insert or update of status on ordens_servico
  for each row execute function trg_fn_criar_conta_receber();

-- -----------------------------------------------------------------------------
-- despesas — cadastro simples de despesas do laboratório
-- -----------------------------------------------------------------------------
create table despesas (
  id uuid primary key default gen_random_uuid(),
  categoria text, -- livre, mesmo padrão de servicos.categoria
  descricao text not null,
  valor numeric(10, 2) not null,
  data_despesa date not null default current_date,
  observacoes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_despesas_data on despesas (data_despesa);

comment on table despesas is 'Despesas do laboratório — cadastro simples (categoria livre, descrição, valor, data, observações).';

create trigger trg_despesas_updated_at before update on despesas
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- fechamentos_financeiros — resultado do laboratório por mês (recebido −
-- despesas), distinto do "fechamentos" por entidade que já existe.
-- -----------------------------------------------------------------------------
create table fechamentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  mes_referencia date not null unique,
  total_receitas numeric(10, 2) not null default 0,
  total_despesas numeric(10, 2) not null default 0,
  resultado numeric(10, 2) not null default 0,
  status status_fechamento_periodo not null default 'aberto',
  data_fechamento timestamptz,
  observacoes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table fechamentos_financeiros is 'Snapshot do resultado do laboratório (receitas pagas − despesas) por mês — trava o valor ao "fechar o mês".';

-- -----------------------------------------------------------------------------
-- Views obsoletas — contas_receber agora é tabela real, a agregação por
-- entidade×mês passa a ser feita na tela (client-side, mesmo padrão já usado
-- em OrdensServicoPage). vw_relatorio_fechamento_itens continua útil.
-- -----------------------------------------------------------------------------
drop view if exists vw_contas_receber;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table contas_receber enable row level security;
alter table despesas enable row level security;
alter table fechamentos_financeiros enable row level security;

-- contas_receber: leitura para ativo; atualização para ativo, mas só admin
-- pode setar status = 'cancelado' (a "exclusão" com justificativa); inserção
-- normal acontece via trigger (security definer, ignora RLS) — a policy de
-- insert aqui é só para correção manual via SQL, restrita a admin.
create policy "contas_receber_select" on contas_receber for select using (is_active_user());
create policy "contas_receber_insert" on contas_receber for insert with check (is_admin_user());
create policy "contas_receber_update" on contas_receber for update
  using (is_active_user())
  with check (is_active_user() and (status <> 'cancelado' or is_admin_user()));

-- despesas: leitura/criação/edição para usuário ativo (operacional); exclusão só admin
create policy "despesas_select" on despesas for select using (is_active_user());
create policy "despesas_insert" on despesas for insert with check (is_active_user());
create policy "despesas_update" on despesas for update using (is_active_user());
create policy "despesas_delete" on despesas for delete using (is_admin_user());

-- fechamentos_financeiros: leitura para ativo; escrita (fechar o mês) só admin
create policy "fechamentos_financeiros_select" on fechamentos_financeiros for select using (is_active_user());
create policy "fechamentos_financeiros_insert" on fechamentos_financeiros for insert with check (is_admin_user());
create policy "fechamentos_financeiros_update" on fechamentos_financeiros for update using (is_admin_user());
